mod models;
mod handlers;
mod db;

use axum::{http::Method, routing::{get, post}, Router};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() {
    // 1. DB 연결 통로 생성
    let pool = db::establish_connection().await;

    // 2. 주소판(Router) 만들기
    let cors = CorsLayer::new()
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any)
        .allow_origin(Any);

    let app = Router::new()
        .route("/reservations", get(handlers::list_reservations))
        .route("/reservations", post(handlers::create_reservation)) // POST /reservations 주소 연결
        .layer(cors)
        .with_state(pool); // 모든 기능에서 DB를 쓸 수 있게 허락함

    // 3. 서버 실행 (8080 포트)
    let addr = SocketAddr::from(([0, 0, 0, 0], 8080));
    println!("서버가 {}에서 돌아가고 있어요!", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
