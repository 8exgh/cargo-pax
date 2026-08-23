use bb8_postgres::bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::NoTls;
use crate::command_handlers::handle_command_trait::HandleCommand;
use crate::commands::create_account_command::{create_account_command_factory, CREATE_ACCOUNT_COMMAND_NAME};
use crate::commands::refresh_trackers_command::{factory_refresh_trackers_command, REFRESH_TRACKERS_COMMAND_NAME};
use crate::commands::start_tracking_shipment_command::{factory_start_tracking_shipment_command,  START_TRACKING_SHIPMENT_COMMAND_NAME};
use crate::commands::update_tracking_shipment_label_command::{factory_update_tracking_shipment_label_command, UPDATE_TRACKING_SHIPMENT_LABEL_COMMAND_NAME};
use crate::commands::update_tracking_shipment_status_command::{factory_update_tracking_shipment_status_command, UPDATE_TRACKING_SHIPMENT_STATUS_COMMAND_NAME};

pub async fn handle_command(command_name: &str, body: &[u8], pool: Pool<PostgresConnectionManager<NoTls>>) -> Result<(), String> {
    let result = match command_name {
        CREATE_ACCOUNT_COMMAND_NAME =>  match create_account_command_factory(body) {
            Ok(command) => command.handle(pool.clone()).await,
            Err(e) => Err(e)
        },
        START_TRACKING_SHIPMENT_COMMAND_NAME =>  match factory_start_tracking_shipment_command(body) {
            Ok(command) => command.handle(pool.clone()).await,
            Err(e) => Err(e)
        },
        UPDATE_TRACKING_SHIPMENT_STATUS_COMMAND_NAME =>  match factory_update_tracking_shipment_status_command(body) {
            Ok(command) => command.handle(pool.clone()).await,
            Err(e) => Err(e)
        },
        UPDATE_TRACKING_SHIPMENT_LABEL_COMMAND_NAME =>  match factory_update_tracking_shipment_label_command(body) {
            Ok(command) => command.handle(pool.clone()).await,
            Err(e) => Err(e)
        },
        REFRESH_TRACKERS_COMMAND_NAME =>  match factory_refresh_trackers_command(body) {
            Ok(command) => command.handle(pool.clone()).await,
            Err(e) => Err(e)
        },
        _ => Err( format!("Unknown command name: {}", command_name))
    };

    if result.is_err() {
        return Err(result.err().unwrap());
    }

    // Invoke read model to build
    // TODO: if better performance is needed an over the wire event system can be incorporated
    let url = "http://localhost:3030/read-model-version"; // TODO: make configurable
    let result = reqwest::get(url).await;
    if let Err(err) = result {
        if err.is_timeout() {
            eprintln!("Invoking read model timed out");
        } else if err.is_connect() {
            eprintln!("Invoking read model failed to connect");
        } else {
            if let Some(url) = err.url() {
                eprint!("Invoking read model. Error when calling URL: {}", url);
            }
            eprintln!("Invoking read model. Request error: {}", err);
        }
    }

    return Ok(());
}