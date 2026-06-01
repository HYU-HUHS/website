// src/main.rs
use axum::{http::Method, routing::post, Router};
use sqlx::sqlite::SqlitePool;
use std::env;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

// 1. 내가 분리한 파일(모듈)들을 장착합니다.
mod recruit;
mod inquiry;

// 다른 파일에서 가져다 쓸 수 있도록 pub 구조체로 열어둡니다.
pub struct AppState {
    pub db: SqlitePool,
}

#[tokio::main]
async fn main() {
    // 1. 데이터베이스 연결 및 테이블 생성
    let db_path = env::var("DATABASE_PATH")
        .unwrap_or_else(|_| "../../web/server/data/huhsweb.sqlite".to_string());
    let db_url = format!("sqlite:{}", db_path);
    let pool = SqlitePool::connect(&db_url).await.expect("DB 연결에 실패했습니다.");

    sqlx::query(
        "
        CREATE TABLE IF NOT EXISTS applicants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            student_id TEXT NOT NULL,
            major TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'submitted',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS inquiries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            contact TEXT NOT NULL,
            is_answered INTEGER DEFAULT 0,
            answer TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        "
    )
    .execute(&pool)
    .await
    .unwrap();

    let state = Arc::new(AppState { db: pool });

    // 2. CORS (보안) 설정
    let cors = CorsLayer::new()
        .allow_methods([Method::POST])
        .allow_origin(Any);

    // 3. 라우터 설정 (분리한 파일의 핸들러 함수들을 매핑)
    let app = Router::new()
        .route("/apply", post(recruit::handle_apply))     // recruit.rs에서 가져옴
        .route("/inquiry", post(inquiry::handle_inquiry)) // inquiry.rs에서 가져옴
        .layer(cors)
        .with_state(state);

    // 4. 서버 실행 (Axum 0.7 최신 안정화 버전 표준 문법)
    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], 3001));
    println!("🚀 [동아리 백엔드] 지원/문의 서버가 http://localhost:3001 에서 실행 중입니다.");
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
