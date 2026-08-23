use std::string::ToString;
use futures::future::err;
use serde::{Deserialize, Serialize};
use crate::aggregate_roots::account_aggregate::{AccountAggregate, RefreshRequest, ShipmentTracker};
use crate::commands::base_command::BaseCommand;
use crate::events::event_apply_trait::EventApply;

#[derive(Serialize, Deserialize)]
pub struct ShipmentTrackingRefreshRequestedEvent {
    pub event_name: String,
    pub aggregate_id: String,
    pub url: String,
    pub priority: u8
}

pub const SHIPMENT_TRACKING_REFRESH_REQUESTED_EVENT_NAME: &str = "shipment_tracking_refresh_requested";

impl ShipmentTrackingRefreshRequestedEvent {
    pub fn new(aggregate_id: String, url: String, priority: u8) -> Self {
        Self { event_name: SHIPMENT_TRACKING_REFRESH_REQUESTED_EVENT_NAME.to_string(),  aggregate_id, url, priority }
    }
}

impl EventApply for &ShipmentTrackingRefreshRequestedEvent {
    fn apply_to(&self, account: &mut AccountAggregate) -> Result<(), String> {
        println!("applying ShipmentTrackingRefreshRequestedEvent");
        if account.aggregate_id.is_empty() {
            return Err("Aggregate does not exist".to_string());
        }

        println!("active shipment urls is {}", account.active_shipment_trackers.len());
        let url = self.url.to_string();
        if !account.is_tracking_shipment_url(url.clone()){
            let error_message = format!("Error the url is not currently being tracked {}", url.clone());
            eprintln!("{}", error_message);
            return Err(error_message);
        }

        match account.active_shipment_trackers.iter().position(|tracker| tracker.url.to_lowercase() == self.url.to_lowercase()) {
            Some(found_index) => {
                account.active_shipment_trackers[found_index].refresh_request = Some(RefreshRequest::new(self.priority))
            },
            None => {
                let error_message =  format!("When requesting a refresh, could not find tracker '{}'", self.url);
                eprintln!("{}",error_message);
                return Err(error_message);
            }
        };

        return Ok(());
    }
}