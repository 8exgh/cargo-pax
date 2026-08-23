use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use bb8_postgres::bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::NoTls;
use crate::aggregate_roots::account_aggregate::AccountAggregate;
use crate::command_handlers::handle_command_trait::HandleCommand;
use crate::repositories::account_repository::{load_events, save};


pub const UPDATE_TRACKING_SHIPMENT_STATUS_COMMAND_NAME: &str = "update_tracking_shipment_status_command";

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateTrackingShipmentStatusCommand {
    pub command_name: String,
    pub aggregate_id: String,
    pub url: String,
    pub estimated_delivery_date: String,
    pub delivered_on_date: String,
    pub is_delivered: bool,
    pub is_error: bool,
    pub error_message: String
}

pub fn factory_update_tracking_shipment_status_command(body: &[u8]) -> Result<UpdateTrackingShipmentStatusCommand,String> {
    let command_or_error = serde_json::from_slice::<UpdateTrackingShipmentStatusCommand>(body);
    return match command_or_error {
        Ok(command) => Ok(command),
        Err(e) => Err(e.to_string())
    };
}

#[async_trait]
impl HandleCommand for UpdateTrackingShipmentStatusCommand {
    async fn handle(&self, pool: Pool<PostgresConnectionManager<NoTls>>) -> Result<(), String> {
        println!("HandleCommand.UpdateTrackingShipmentStatusCommand {}", self.aggregate_id.clone());
        let aggregate_id = self.aggregate_id.to_string();

        let existing_events =  match load_events(aggregate_id.to_string(), pool.clone()).await {
            Ok(events) => events,
            Err(e) => return Err(e)
        };

        let mut account_aggregate = match AccountAggregate::new_via_events(aggregate_id, existing_events) {
            Ok(aggregate) => aggregate,
            Err(e) => return Err(e)
        };

        match account_aggregate.update_tracking_status(self.url.clone(), self.estimated_delivery_date.clone(), self.delivered_on_date.clone(), self.is_delivered, self.is_error, self.error_message.clone()) {
            Ok(()) => (),
            Err(e) => return Err(e)
        }

        return match save(account_aggregate, pool).await {
            Ok(result) => Ok(result),
            Err(e) => Err(format!("{e}"))
        }
    }
}

