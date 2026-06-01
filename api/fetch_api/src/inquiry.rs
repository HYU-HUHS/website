// src/inquiry.rs
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::AppState;

#[derive(Deserialize, Serialize, Debug)]
pub struct InquiryForm {
    pub title: String,
    pub content: String,
    pub contact: String,
}

// 문의사항 데이터를 처리하는 함수
pub async fn handle_inquiry(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<InquiryForm>,
) -> Json<serde_json::Value> {
    println!("❓ 새 문의사항 도착: {}", payload.title);

    let result = sqlx::query(
        "INSERT INTO inquiries (title, content, contact) VALUES (?, ?, ?)"
    )
    .bind(&payload.title)
    .bind(&payload.content)
    .bind(&payload.contact)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({ "status": "success", "message": "문의사항이 등록되었습니다." })),
        Err(e) => {
            eprintln!("DB 오류: {}", e);
            Json(serde_json::json!({ "status": "error", "message": "서버 저장 실패" }))
        }
    }
}