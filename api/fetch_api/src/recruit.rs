// src/recruit.rs
use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::AppState; // main.rs에 있는 AppState를 가져다 씁니다.

#[derive(Deserialize, Serialize, Debug)]
pub struct ApplicationForm {
    pub name: String,
    pub student_id: String,
    pub major: String,
    pub phone: String,
    pub email: String,
    pub message: String,
}

// 지원서 데이터를 처리하는 함수
pub async fn handle_apply(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<ApplicationForm>,
) -> Json<serde_json::Value> {
    println!("📝 새 지원서 도착: {} ({})", payload.name, payload.student_id);

    let result = sqlx::query(
        "INSERT INTO applicants (name, student_id, major, phone, email, message) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&payload.name)
    .bind(&payload.student_id)
    .bind(&payload.major)
    .bind(&payload.phone)
    .bind(&payload.email)
    .bind(&payload.message)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Json(serde_json::json!({ "status": "success", "message": "지원서 접수가 완료되었습니다." })),
        Err(e) => {
            eprintln!("DB 오류: {}", e);
            Json(serde_json::json!({ "status": "error", "message": "서버 저장 실패" }))
        }
    }
}