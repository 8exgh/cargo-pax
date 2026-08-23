use std::string::ToString;
use futures::future::err;
use serde::{Deserialize, Serialize};
use crate::aggregate_roots::account_aggregate::{AccountAggregate, ShipmentTracker};
use crate::commands::base_command::BaseCommand;
use crate::events::event_apply_trait::EventApply;

#[derive(Serialize, Deserialize)]
pub struct ShipmentTrackingStartedEvent {
    pub event_name: String,
    pub aggregate_id: String,
    pub url: String
}

pub const SHIPMENT_TRACKING_STARTED_EVENT_NAME: &str = "shipment_tracking_started";

impl ShipmentTrackingStartedEvent {
    pub fn new(aggregate_id: String, url: String) -> Self {
        Self { event_name: SHIPMENT_TRACKING_STARTED_EVENT_NAME.to_string(),  aggregate_id, url }
    }
}

impl EventApply for &ShipmentTrackingStartedEvent {
    fn apply_to(&self, account: &mut AccountAggregate) -> Result<(), String> {
        println!("applying StartTrackingShipmentEvent");
        if account.aggregate_id.is_empty() {
            return Err("Aggregate does not exist".to_string());
        }

        println!("active shipment urls is {}", account.active_shipment_trackers.len());
        let url = self.url.to_string();
        if account.is_tracking_shipment_url(url.clone()){
            let error_message = format!("Error, already contains url {}", url.clone());
            eprintln!("{}", error_message);
            return Err(error_message);
        }
        println!("account.active_shipment_urls.push({url});");
        account.active_shipment_trackers.push(ShipmentTracker::new( self.url.clone()) );

        return Ok(());
    }
}