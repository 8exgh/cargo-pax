use serde::{Deserialize, Serialize};
use actix_web::get;
use actix_web::HttpResponse;


#[derive(Debug, Deserialize, Serialize)]
pub struct Message {
    pub message: String,
}

#[get("/hello")]
pub async fn get() -> HttpResponse {

    let message = Message { message: "hello there!".into()};

    HttpResponse::Ok()
        .content_type("application/json")
        .json(message)
}