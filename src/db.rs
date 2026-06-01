use sqlx::sqlite::SqlitePool;

// DB와 소통하기 위한 '통로(Pool)'를 만드는 함수입니다.
pub async fn establish_connection() -> SqlitePool {
    // DB 파일의 위치를 알려줍니다.
    let database_url = "sqlite:reservations.db";

    // 실제로 연결을 시도합니다.
    SqlitePool::connect(database_url)
        .await
        .expect("DB 연결에 실패했습니다!")
}