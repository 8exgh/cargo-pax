use std::string::ToString;
use serde::{Deserialize, Serialize};
use crate::aggregate_roots::account_aggregate::AccountAggregate;
use crate::commands::base_command::BaseCommand;
use crate::events::event_apply_trait::EventApply;

#[derive(Serialize, Deserialize)]
pub struct ShipmentTrackerRefreshRequestCompletedEvent {
    pub event_name: String,
    pub aggregate_id: String,
    pub url: String
}

pub const SHIPMENT_TRACKER_REFRESH_REQUEST_COMPLETED_EVENT_NAME: &str = "shipment_tracker_refresh_request_completed";

impl ShipmentTrackerRefreshRequestCompletedEvent {
    pub fn new(aggregate_id: String, url: String) -> Self {
        Self { event_name: SHIPMENT_TRACKER_REFRESH_REQUEST_COMPLETED_EVENT_NAME.to_string(),  aggregate_id, url }
    }
}

impl EventApply for &ShipmentTrackerRefreshRequestCompletedEvent {
    fn apply_to(&self, account: &mut AccountAggregate) -> Result<(), String> {
        println!("applying ShipmentTrackerRefreshRequestCompletedEvent");
        if account.aggregate_id.is_empty() {
            return Err("Aggregate does not exist".to_string());
        }

        let url = self.url.to_string();

        match account.active_shipment_trackers.iter().position(|tracker| tracker.url.to_lowercase() == self.url.to_lowercase()) {
            Some(found_index) => {
                if account.active_shipment_trackers[found_index].refresh_request.is_some() {
                    account.active_shipment_trackers[found_index].refresh_request = None;
                }
            },
            None => {
                let error_message = "When finding url to update, could not find it '{url}'".to_string();
                eprintln!("{}",error_message);
                return Err(error_message);
            }
        };

        return Ok(());
    }
}