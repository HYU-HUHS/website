use sqlx::sqlite::SqlitePool;
use std::env;

async fn ensure_column(pool: &SqlitePool, table: &str, column: &str, definition: &str) {
    let rows = sqlx::query(&format!("PRAGMA table_info({table})"))
        .fetch_all(pool)
        .await
        .expect("테이블 정보를 읽지 못했습니다!");

    let exists = rows.iter().any(|row| {
        use sqlx::Row;
        row.try_get::<String, _>("name")
            .map(|name| name == column)
            .unwrap_or(false)
    });

    if !exists {
        sqlx::query(&format!("ALTER TABLE {table} ADD COLUMN {column} {definition}"))
            .execute(pool)
            .await
            .expect("컬럼 추가에 실패했습니다!");
    }
}

// DB와 소통하기 위한 '통로(Pool)'를 만드는 함수입니다.
pub async fn establish_connection() -> SqlitePool {
    // DB 파일의 위치를 알려줍니다.
    let db_path = env::var("DATABASE_PATH")
        .unwrap_or_else(|_| "../../web/server/data/huhsweb.sqlite".to_string());
    let database_url = format!("sqlite:{}", db_path);

    // 실제로 연결을 시도합니다.
    let pool = SqlitePool::connect(&database_url)
        .await
        .expect("DB 연결에 실패했습니다!");

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
        "
    )
    .execute(&pool)
    .await
    .expect("사용자 테이블 생성에 실패했습니다!");

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS session_tokens (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        "
    )
    .execute(&pool)
    .await
    .expect("세션 테이블 생성에 실패했습니다!");

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
        "
    )
    .execute(&pool)
    .await
    .expect("프로필 테이블 생성에 실패했습니다!");

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT NOT NULL,
            name TEXT NOT NULL,
            reserved_at TEXT NOT NULL,
            participant_count INTEGER NOT NULL,
            purpose TEXT DEFAULT '',
            status TEXT DEFAULT 'reserved',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        "
    )
    .execute(&pool)
    .await
    .expect("예약 테이블 생성에 실패했습니다!");

    ensure_column(&pool, "users", "password", "TEXT").await;
    ensure_column(&pool, "users", "gid", "TEXT").await;
    ensure_column(&pool, "users", "name", "TEXT DEFAULT ''").await;
    ensure_column(&pool, "users", "student_id", "TEXT DEFAULT ''").await;
    ensure_column(&pool, "users", "major", "TEXT DEFAULT ''").await;
    ensure_column(&pool, "users", "phone", "TEXT DEFAULT ''").await;
    ensure_column(&pool, "users", "picture_url", "TEXT DEFAULT ''").await;
    ensure_column(&pool, "profiles", "role", "TEXT").await;
    ensure_column(&pool, "profiles", "name", "TEXT").await;
    ensure_column(&pool, "profiles", "student_id", "TEXT").await;
    ensure_column(&pool, "profiles", "major", "TEXT").await;
    ensure_column(&pool, "profiles", "phone", "TEXT").await;
    ensure_column(&pool, "profiles", "picture_url", "TEXT").await;

    pool
}
