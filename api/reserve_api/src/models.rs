use serde::{Deserialize, Serialize};
use sqlx::FromRow;

// 1. 전체 예약 내역을 조회할 때 사용하는 틀
// DB의 한 행(Row)에서 데이터를 가져오기 때문에 FromRow가 필요합니다.
#[derive(Debug, Serialize, FromRow)]
pub struct Reservation {
    pub id: i32,
    pub student_id: String,
    pub name: String,
    pub reserved_at: String, // SQLite에서는 날짜를 TEXT로 처리하기로 했죠?
    pub participant_count: i32,
    pub purpose: Option<String>,
    pub status: Option<String>,
}

#[derive(Debug, FromRow)]
pub struct AuthUser {
    pub name: String,
    pub student_id: String,
    pub major: String,
    pub phone: String,
    pub role: String,
}

// 2. 사용자가 예약을 신청할 때(입력받을 때) 사용하는 틀
// 사용자는 id를 보내지 않으므로(DB가 자동 생성), id를 제외한 나머지만 정의합니다.
#[derive(Debug, Deserialize)]
pub struct CreateReservationRequest {
    pub reserved_at: String,
    pub participant_count: i32,
    pub purpose: Option<String>,
}
