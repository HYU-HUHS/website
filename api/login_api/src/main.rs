use chrono::{Duration, Utc};
use jsonwebtoken::{
    decode, encode,
    DecodingKey, EncodingKey,
    Header, Validation,
};
use axum::{
    extract::State,
    http::StatusCode,
    http::HeaderMap,
    routing::{get, post},
    Json, Router,
};
use sqlx::Row;
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::sync::Arc;
use uuid::Uuid;

#[derive(Clone)]
struct AppState {
    db: PgPool,
}

#[derive(Deserialize)]
struct LoginReq {
    gid: String,
}

#[derive(Serialize)]
struct LoginRes {
    uid: String,
    token: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Claims {
    uid: String,
    exp: usize,
}

#[derive(Serialize)]
struct MeRes {
    uid: String,
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let db = PgPoolOptions::new()
        .connect(&std::env::var("DATABASE_URL").unwrap())
        .await
        .unwrap();

    let state = Arc::new(AppState { db });

    let app = Router::new()
        .route("/login", post(login))
        .route("/me", get(me))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:4000")
        .await
        .unwrap();

    println!("Server running on http://localhost:4000");

    axum::serve(listener, app).await.unwrap();
}

async fn login(
    State(state): State<Arc<AppState>>,
    Json(body): Json<LoginReq>,
) -> Result<Json<LoginRes>, StatusCode> {
    let existing_user = sqlx::query(
        "SELECT uid FROM users WHERE gid = $1"
    )
    .bind(&body.gid)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let uid = if let Some(row) = existing_user {
        row.try_get::<Uuid, _>("uid")
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    } else {
        let new_uid = Uuid::new_v4();

        sqlx::query(
            "INSERT INTO users (uid, gid) VALUES ($1, $2)"
        )
        .bind(new_uid)
        .bind(&body.gid)
        .execute(&state.db)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        new_uid
    };

    let token = create_token(&uid.to_string());

    Ok(Json(LoginRes {
        uid: uid.to_string(),
        token,
    }))
}

async fn me(
    headers: HeaderMap,
) -> Result<Json<MeRes>, StatusCode> {

    let auth = headers
        .get("Authorization")
        .ok_or(StatusCode::UNAUTHORIZED)?
        .to_str()
        .map_err(|_| StatusCode::UNAUTHORIZED)?;

    let token = auth
        .strip_prefix("Bearer ")
        .ok_or(StatusCode::UNAUTHORIZED)?;

    let jwt_secret = std::env::var("JWT_SECRET")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(jwt_secret.as_bytes()),
        &Validation::default(),
    )
    .map_err(|_| StatusCode::UNAUTHORIZED)?;
    .map_err(|_| StatusCode::UNAUTHORIZED)?;

    Ok(Json(MeRes {
        uid: data.claims.uid,
    }))
}

fn create_token(uid: &str) -> String {
    let exp = (Utc::now() + Duration::days(7)).timestamp() as usize;

    let claims = Claims {
        uid: uid.to_string(),
        exp,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(
            std::env::var("JWT_SECRET")
                .unwrap()
                .as_bytes(),
        ),
    )
    .unwrap()
}