use sqlx::sqlite::SqlitePool;
use std::env;

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

    pool
}
