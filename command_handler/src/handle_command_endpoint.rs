use actix_web::{post, web, error, Error, HttpResponse};
use futures::StreamExt;
use crate::commands::base_command::BaseCommand;
use crate::command_handlers::handle_command::{handle_command};
use crate::MyData;

#[derive(serde::Serialize, Debug)]
pub struct SuccessResponse {
    pub message: String,
}

const MAX_SIZE: usize = 262_144; // max payload size is 256k

#[post("/handle")]
pub async fn handle_command_endpoint(data: web::Data<MyData>, mut payload: web::Payload) -> Result<HttpResponse, Error> {
    let mut body_buffer = web::BytesMut::new();
    while let Some(chunk) = payload.next().await {
        let chunk = chunk?;

        if (body_buffer.len() +  chunk.len()) > MAX_SIZE {
            return Err(error::ErrorBadRequest("overflow"));
        }
        body_buffer.extend_from_slice(&chunk);
    }

    println!("attempting to parse request body");


    let base_command: BaseCommand = match serde_json::from_slice(&body_buffer) {
        Ok(command) => {
            command
        }
        Err(e) => {
            return match e.classify() {
                serde_json::error::Category::Eof => {
                    let error_message: String = format!("Invalid JSON was sent to command endpoint. See the GET /command_catalog endpoint for list of valid commands. Error was '{}'", e);
                    eprintln!("{error_message}");
                    Err(error::ErrorBadRequest(error_message))
                }
                serde_json::error::Category::Data => {
                    let raw_error_text = format!("{e}");
                    if(raw_error_text.starts_with("missing field")) {
                        let error_message: String = format!("All commands must have a \"command_name\" property. See the GET /command_catalog endpoint for list of valid commands. Error was '{}'", e);
                        eprintln!("{error_message}");
                        Err(error::ErrorBadRequest(error_message))
                    } else {
                        let error_message: String = format!("Semantic error on command payload. See the GET /command_catalog endpoint for list of valid commands. Error was '{}'", e);
                        eprintln!("{error_message}");
                        Err(error::ErrorBadRequest(error_message))
                    }
                }
                _ => {
                    let error_message: String = format!("Could not parse command. Error was '{}'", e);
                    Err(error::ErrorBadRequest(error_message))
                }
            }
        }
    };

    println!("Handling command type: {}", base_command.command_name);

    println!("Handling the following command: {:?}", body_buffer);

    match handle_command(base_command.command_name.as_str(), &body_buffer, data.pool.clone()).await {
        Ok(r) => {

        }
        Err(e) => {
            let error_message =  match &e {
               msg if msg.contains("not found") => format!("Failed to handle command. Command not found. See the GET /command_catalog endpoint for list of valid commands. Error message: '{}'", e),
                _ => format!("Failed to handle command. Error message: '{}'", e)
            };

            eprintln!("{error_message}");
            return Err(error::ErrorBadRequest(error_message))
        }
    }

    Ok(HttpResponse::Created().json(SuccessResponse { message: "Command has been applied.".to_string() }))
}