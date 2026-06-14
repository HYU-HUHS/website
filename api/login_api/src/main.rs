use axum::{
    extract::State,
    http::{HeaderMap, Method, StatusCode},
    routing::{get, patch, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use sqlx::{sqlite::SqlitePoolOptions, FromRow, SqlitePool};
use std::{env, sync::Arc};
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

const HANYANG_DOMAIN: &str = "hanyang.ac.kr";

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
}

#[derive(Deserialize)]
struct GoogleLoginReq {
    credential: String,
}

#[derive(Deserialize)]
struct ProfileReq {
    name: String,
    student_id: String,
    major: String,
    phone: String,
}

#[derive(Debug, Deserialize)]
struct GoogleTokenInfo {
    sub: String,
    email: String,
    email_verified: String,
    hd: Option<String>,
    aud: String,
    name: Option<String>,
    picture: Option<String>,
}

#[derive(Debug, Serialize, FromRow)]
struct User {
    id: i64,
    email: String,
    gid: Option<String>,
    name: Option<String>,
    student_id: Option<String>,
    major: Option<String>,
    phone: Option<String>,
    picture_url: Option<String>,
    role: Option<String>,
}

#[derive(Serialize)]
struct Session {
    access_token: String,
    user: User,
}

#[derive(Serialize)]
struct DataRes<T> {
    data: T,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let db_path = env::var("DATABASE_PATH")
        .unwrap_or_else(|_| "../../web/server/data/huhsweb.sqlite".to_string());
    let db = SqlitePoolOptions::new()
        .connect(&format!("sqlite:{db_path}"))
        .await
        .expect("DB 연결에 실패했습니다.");

    init_db(&db).await.expect("DB 초기화에 실패했습니다.");

    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST, Method::PATCH])
        .allow_headers(Any)
        .allow_origin(Any);

    let state = Arc::new(AppState { db });
    let app = Router::new()
        .route("/auth/google", post(google_login))
        .route("/auth/me", get(me))
        .route("/auth/profile", patch(update_profile))
        .route("/login", post(google_login))
        .route("/me", get(me))
        .layer(cors)
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4000")
        .await
        .unwrap();

    println!("로그인 API 서버가 http://localhost:4000 에서 실행 중입니다.");
    axum::serve(listener, app).await.unwrap();
}

async fn init_db(db: &SqlitePool) -> Result<(), sqlx::Error> {
    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            gid TEXT UNIQUE,
            name TEXT DEFAULT '',
            student_id TEXT DEFAULT '',
            major TEXT DEFAULT '',
            phone TEXT DEFAULT '',
            picture_url TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        ",
    )
    .execute(db)
    .await?;

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            role TEXT,
            name TEXT,
            student_id TEXT,
            major TEXT,
            phone TEXT,
            picture_url TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        ",
    )
    .execute(db)
    .await?;

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        ",
    )
    .execute(db)
    .await?;

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS session_tokens (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        ",
    )
    .execute(db)
    .await?;

    ensure_column(db, "users", "password", "TEXT").await?;
    ensure_column(db, "users", "gid", "TEXT").await?;
    ensure_column(db, "users", "name", "TEXT DEFAULT ''").await?;
    ensure_column(db, "users", "student_id", "TEXT DEFAULT ''").await?;
    ensure_column(db, "users", "major", "TEXT DEFAULT ''").await?;
    ensure_column(db, "users", "phone", "TEXT DEFAULT ''").await?;
    ensure_column(db, "users", "picture_url", "TEXT DEFAULT ''").await?;
    ensure_column(db, "profiles", "name", "TEXT").await?;
    ensure_column(db, "profiles", "student_id", "TEXT").await?;
    ensure_column(db, "profiles", "major", "TEXT").await?;
    ensure_column(db, "profiles", "phone", "TEXT").await?;
    ensure_column(db, "profiles", "picture_url", "TEXT").await?;

    Ok(())
}

async fn ensure_column(
    db: &SqlitePool,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), sqlx::Error> {
    let rows = sqlx::query(&format!("PRAGMA table_info({table})"))
        .fetch_all(db)
        .await?;

    let exists = rows.iter().any(|row| {
        use sqlx::Row;
        row.try_get::<String, _>("name")
            .map(|name| name == column)
            .unwrap_or(false)
    });

    if !exists {
        sqlx::query(&format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"))
            .execute(db)
            .await?;
    }

    Ok(())
}

async fn google_login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<GoogleLoginReq>,
) -> Result<Json<DataRes<Session>>, (StatusCode, Json<serde_json::Value>)> {
    let google_user = verify_google_token(&body.credential).await?;
    let existing = sqlx::query_as::<_, (i64,)>("SELECT id FROM users WHERE gid = ? OR email = ?")
        .bind(&google_user.sub)
        .bind(&google_user.email)
        .fetch_optional(&state.db)
        .await
        .map_err(internal_error)?;

    let user_id = if let Some((id,)) = existing {
        sqlx::query(
            "
            UPDATE users
            SET gid = COALESCE(gid, ?),
                name = CASE WHEN name IS NULL OR name = '' THEN ? ELSE name END,
                picture_url = CASE WHEN picture_url IS NULL OR picture_url = '' THEN ? ELSE picture_url END
            WHERE id = ?
            ",
        )
        .bind(&google_user.sub)
        .bind(google_user.name.as_deref().unwrap_or(""))
        .bind(google_user.picture.as_deref().unwrap_or(""))
        .bind(id)
        .execute(&state.db)
        .await
        .map_err(internal_error)?;
        id
    } else {
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM users")
            .fetch_one(&state.db)
            .await
            .map_err(internal_error)?;
        let result = sqlx::query("INSERT INTO users (email, password, gid, name, picture_url) VALUES (?, '', ?, ?, ?)")
            .bind(&google_user.email)
            .bind(&google_user.sub)
            .bind(google_user.name.as_deref().unwrap_or(""))
            .bind(google_user.picture.as_deref().unwrap_or(""))
            .execute(&state.db)
            .await
            .map_err(internal_error)?;
        let id = result.last_insert_rowid();
        let role = if count.0 == 0 { "admin" } else { "general" };
        sqlx::query("INSERT INTO profiles (id, email, role, name, picture_url) VALUES (?, ?, ?, ?, ?)")
            .bind(id)
            .bind(&google_user.email)
            .bind(role)
            .bind(google_user.name.as_deref().unwrap_or(""))
            .bind(google_user.picture.as_deref().unwrap_or(""))
            .execute(&state.db)
            .await
            .map_err(internal_error)?;
        if count.0 == 0 {
            sqlx::query("INSERT INTO admin_users (email) VALUES (?)")
                .bind(&google_user.email)
                .execute(&state.db)
                .await
                .map_err(internal_error)?;
        }
        id
    };

    let token = Uuid::new_v4().to_string();
    sqlx::query("INSERT INTO session_tokens (token, user_id) VALUES (?, ?)")
        .bind(&token)
        .bind(user_id)
        .execute(&state.db)
        .await
        .map_err(internal_error)?;

    let user = load_user(&state.db, user_id).await.map_err(internal_error)?;
    Ok(Json(DataRes {
        data: Session {
            access_token: token,
            user,
        },
    }))
}

async fn me(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
) -> Result<Json<DataRes<serde_json::Value>>, (StatusCode, Json<serde_json::Value>)> {
    let user = current_user(&state.db, &headers).await?;
    Ok(Json(DataRes {
        data: serde_json::json!({ "user": user }),
    }))
}

async fn update_profile(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(body): Json<ProfileReq>,
) -> Result<Json<DataRes<serde_json::Value>>, (StatusCode, Json<serde_json::Value>)> {
    let user = current_user(&state.db, &headers).await?;
    if body.name.trim().is_empty()
        || body.student_id.trim().is_empty()
        || body.major.trim().is_empty()
        || body.phone.trim().is_empty()
    {
        return Err((StatusCode::BAD_REQUEST, Json(serde_json::json!({ "error": "이름, 학번, 학과, 연락처를 모두 입력해주세요." }))));
    }

    sqlx::query("UPDATE users SET name = ?, student_id = ?, major = ?, phone = ? WHERE id = ?")
        .bind(body.name.trim())
        .bind(body.student_id.trim())
        .bind(body.major.trim())
        .bind(body.phone.trim())
        .bind(user.id)
        .execute(&state.db)
        .await
        .map_err(internal_error)?;

    sqlx::query("UPDATE profiles SET name = ?, student_id = ?, major = ?, phone = ? WHERE email = ?")
        .bind(body.name.trim())
        .bind(body.student_id.trim())
        .bind(body.major.trim())
        .bind(body.phone.trim())
        .bind(&user.email)
        .execute(&state.db)
        .await
        .map_err(internal_error)?;

    let updated = load_user(&state.db, user.id).await.map_err(internal_error)?;
    Ok(Json(DataRes {
        data: serde_json::json!({ "user": updated }),
    }))
}

async fn verify_google_token(
    credential: &str,
) -> Result<GoogleTokenInfo, (StatusCode, Json<serde_json::Value>)> {
    let token_info = reqwest::get(format!(
        "https://oauth2.googleapis.com/tokeninfo?id_token={}",
        credential
    ))
    .await
    .map_err(|_| (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Google 로그인 검증에 실패했습니다." }))))?
    .json::<GoogleTokenInfo>()
    .await
    .map_err(|_| (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "Google 로그인 검증에 실패했습니다." }))))?;

    if let Ok(client_id) = env::var("GOOGLE_CLIENT_ID") {
        if token_info.aud != client_id {
            return Err((StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "허용되지 않은 Google 클라이언트입니다." }))));
        }
    }

    let email = token_info.email.to_lowercase();
    let hosted_domain = token_info.hd.clone().unwrap_or_default().to_lowercase();
    if token_info.email_verified != "true"
        || !email.ends_with(&format!("@{HANYANG_DOMAIN}"))
        || hosted_domain != HANYANG_DOMAIN
    {
        return Err((StatusCode::FORBIDDEN, Json(serde_json::json!({ "error": "한양대학교 hanyang.ac.kr 계정으로만 로그인할 수 있습니다." }))));
    }

    Ok(token_info)
}

async fn current_user(
    db: &SqlitePool,
    headers: &HeaderMap,
) -> Result<User, (StatusCode, Json<serde_json::Value>)> {
    let auth = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(unauthorized)?;
    let token = auth.strip_prefix("Bearer ").ok_or_else(unauthorized)?;
    let row: (i64,) = sqlx::query_as("SELECT user_id FROM session_tokens WHERE token = ?")
        .bind(token)
        .fetch_optional(db)
        .await
        .map_err(internal_error)?
        .ok_or_else(unauthorized)?;
    load_user(db, row.0).await.map_err(internal_error)
}

async fn load_user(db: &SqlitePool, user_id: i64) -> Result<User, sqlx::Error> {
    sqlx::query_as::<_, User>(
        "
        SELECT users.id, users.email, users.gid, users.name, users.student_id, users.major,
               users.phone, users.picture_url, COALESCE(profiles.role, 'general') AS role
        FROM users
        LEFT JOIN profiles ON profiles.email = users.email
        WHERE users.id = ?
        ",
    )
    .bind(user_id)
    .fetch_one(db)
    .await
}

fn unauthorized() -> (StatusCode, Json<serde_json::Value>) {
    (StatusCode::UNAUTHORIZED, Json(serde_json::json!({ "error": "로그인이 필요합니다." })))
}

fn internal_error(error: sqlx::Error) -> (StatusCode, Json<serde_json::Value>) {
    eprintln!("DB 오류: {error}");
    (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({ "error": "서버 오류가 발생했습니다." })))
}
