use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use bb8_postgres::bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::NoTls;
use crate::aggregate_roots::account_aggregate::AccountAggregate;
use crate::command_handlers::handle_command_trait::HandleCommand;
use crate::repositories::account_repository::{load_events, save};

pub const UPDATE_TRACKING_SHIPMENT_LABEL_COMMAND_NAME: &str = "update_tracking_shipment_label_command";

#[derive(Debug, Deserialize, Serialize)]
pub struct UpdateTrackingShipmentLabelCommand {
    pub command_name: String,
    pub aggregate_id: String,
    pub url: String,
    pub label: String,
}

pub fn factory_update_tracking_shipment_label_command(body: &[u8]) -> Result<UpdateTrackingShipmentLabelCommand,String> {
    let command_or_error = serde_json::from_slice::<UpdateTrackingShipmentLabelCommand>(body);
    return match command_or_error {
        Ok(command) => Ok(command),
        Err(e) => Err(e.to_string())
    };
}

#[async_trait]
impl HandleCommand for UpdateTrackingShipmentLabelCommand {
    async fn handle(&self, pool: Pool<PostgresConnectionManager<NoTls>>) -> Result<(), String> {
        println!("HandleCommand.UpdateTrackingShipmentLabelCommand {} {}", self.aggregate_id.clone(), self.url.clone());
        let aggregate_id = self.aggregate_id.to_string();

        let existing_events =  match load_events(aggregate_id.to_string(), pool.clone()).await {
            Ok(events) => events,
            Err(e) => return Err(e)
        };

        let mut account_aggregate = match AccountAggregate::new_via_events(aggregate_id, existing_events) {
            Ok(aggregate) => aggregate,
            Err(e) => return Err(e)
        };

        match account_aggregate.update_tracking_label(self.url.clone(), self.label.clone()) {
            Ok(()) => (),
            Err(e) => return Err(e)
        }

        return match save(account_aggregate, pool).await {
            Ok(result) => Ok(result),
            Err(e) => Err(format!("{e}"))
        }
    }
}

