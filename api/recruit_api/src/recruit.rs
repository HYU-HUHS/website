// src/recruit.rs
use axum::{extract::State, http::{HeaderMap, StatusCode}, Json};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use crate::AppState; // main.rs에 있는 AppState를 가져다 씁니다.

#[derive(Deserialize, Serialize, Debug)]
pub struct ApplicationForm {
    pub message: String,
}

#[derive(Debug, sqlx::FromRow)]
struct AuthUser {
    name: String,
    student_id: String,
    major: String,
    phone: String,
    email: String,
    role: String,
}

async fn current_user(headers: &HeaderMap, state: &AppState) -> Result<AuthUser, StatusCode> {
    let auth = headers
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .ok_or(StatusCode::UNAUTHORIZED)?;
    let token = auth.strip_prefix("Bearer ").ok_or(StatusCode::UNAUTHORIZED)?;

    let user = sqlx::query_as::<_, AuthUser>(
        "
        SELECT users.name, users.student_id, users.major, users.phone, users.email,
               COALESCE(profiles.role, 'general') AS role
        FROM session_tokens
        JOIN users ON users.id = session_tokens.user_id
        LEFT JOIN profiles ON profiles.email = users.email
        WHERE session_tokens.token = ?
        ",
    )
    .bind(token)
    .fetch_optional(&state.db)
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

// 지원서 데이터를 처리하는 함수
pub async fn handle_apply(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<ApplicationForm>,
) -> Result<Json<serde_json::Value>, StatusCode> {
    let user = current_user(&headers, &state).await?;
    if user.role != "general" {
        return Err(StatusCode::FORBIDDEN);
    }
    println!("📝 새 지원서 도착: {} ({})", user.name, user.student_id);

    let result = sqlx::query(
        "INSERT INTO applicants (name, student_id, major, phone, email, message) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .bind(&user.name)
    .bind(&user.student_id)
    .bind(&user.major)
    .bind(&user.phone)
    .bind(&user.email)
    .bind(&payload.message)
    .execute(&state.db)
    .await;

    match result {
        Ok(_) => Ok(Json(serde_json::json!({ "status": "success", "message": "지원서 접수가 완료되었습니다." }))),
        Err(e) => {
            eprintln!("DB 오류: {}", e);
            Err(StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}
