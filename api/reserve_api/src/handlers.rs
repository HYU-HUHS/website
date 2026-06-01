use axum::{extract::State, Json, http::StatusCode};
use sqlx::SqlitePool;
use crate::models::CreateReservationRequest; // 아까 만든 설계도 가져오기

// [POST] 새로운 예약을 만드는 함수
pub async fn create_reservation(
    State(pool): State<SqlitePool>, // DB 연결 통로를 받아옵니다.
    Json(payload): Json<CreateReservationRequest>, // 사용자가 보낸 JSON을 구조체로 자동 변환!
) -> StatusCode {
    // SQL 문으로 DB에 저장을 명령합니다.
    let result = sqlx::query("INSERT INTO reservations (student_id, name, reserved_at, participant_count, purpose, status) VALUES (?, ?, ?, ?, ?, 'reserved')")
    .bind(&payload.student_id)
    .bind(&payload.name)
    .bind(&payload.reserved_at)
    .bind(payload.participant_count)
    .bind(payload.purpose.as_deref().unwrap_or(""))
    .execute(&pool)
    .await;

    match result {
        Ok(_) => StatusCode::CREATED, // 성공하면 201 응답
        Err(_) => StatusCode::INTERNAL_SERVER_ERROR, // 실패하면 500 응답
    }
}
