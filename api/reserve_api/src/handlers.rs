use axum::{extract::State, http::{HeaderMap, StatusCode}, Json};
use sqlx::SqlitePool;
use crate::models::{AuthUser, CreateReservationRequest, Reservation}; // 아까 만든 설계도 가져오기

async fn current_user(headers: &HeaderMap, pool: &SqlitePool) -> Result<AuthUser, StatusCode> {
    let auth = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;
    let token = auth.strip_prefix("Bearer ").ok_or(StatusCode::UNAUTHORIZED)?;

    let user = sqlx::query_as::<_, AuthUser>(
        "
        SELECT users.name, users.student_id, users.major, users.phone,
               COALESCE(profiles.role, 'general') AS role
        FROM session_tokens
        JOIN users ON users.id = session_tokens.user_id
        LEFT JOIN profiles ON profiles.email = users.email
        WHERE session_tokens.token = ?
        ",
    )
    .bind(token)
    .fetch_optional(pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
    .ok_or(StatusCode::UNAUTHORIZED)?;

    if user.name.trim().is_empty()
        || user.student_id.trim().is_empty()
        || user.major.trim().is_empty()
        || user.phone.trim().is_empty()
    {
        return Err(StatusCode::UNPROCESSABLE_ENTITY);
    }

    Ok(user)
}

pub async fn list_reservations(
    State(pool): State<SqlitePool>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let reservations = sqlx::query_as::<_, Reservation>(
        "
        SELECT id, student_id, name, reserved_at, participant_count, purpose, status
        FROM reservations
        ORDER BY reserved_at ASC, id ASC
        ",
    )
    .fetch_all(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({ "data": reservations })))
}

// [POST] 새로운 예약을 만드는 함수
pub async fn create_reservation(
    State(pool): State<SqlitePool>, // DB 연결 통로를 받아옵니다.
    headers: HeaderMap,
    Json(payload): Json<CreateReservationRequest>, // 사용자가 보낸 JSON을 구조체로 자동 변환!
) -> StatusCode {
    let user = match current_user(&headers, &pool).await {
        Ok(user) => user,
        Err(status) => return status,
    };
    if user.role != "member" && user.role != "admin" {
        return StatusCode::FORBIDDEN;
    }

    // SQL 문으로 DB에 저장을 명령합니다.
    let result = sqlx::query("INSERT INTO reservations (student_id, name, reserved_at, participant_count, purpose, status) VALUES (?, ?, ?, ?, ?, 'reserved')")
    .bind(&user.student_id)
    .bind(&user.name)
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
