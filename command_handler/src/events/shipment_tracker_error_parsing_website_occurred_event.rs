use std::string::ToString;
use serde::{Deserialize, Serialize};
use crate::aggregate_roots::account_aggregate::AccountAggregate;
use crate::commands::base_command::BaseCommand;
use crate::events::event_apply_trait::EventApply;

#[derive(Serialize, Deserialize)]
pub struct ShipmentTrackerErrorParsingWebsiteOccurredEvent {
    pub event_name: String,
    pub aggregate_id: String,
    pub url: String,
    pub error_message: String
}

pub const SHIPMENT_TRACKER_ERROR_PARSING_WEBSITE_OCCURRED_EVENT_NAME: &str = "shipment_tracker_error_parsing_website_occurred";

impl ShipmentTrackerErrorParsingWebsiteOccurredEvent {
    pub fn new(aggregate_id: String, url: String, error_message: String) -> Self {
        Self { event_name: SHIPMENT_TRACKER_ERROR_PARSING_WEBSITE_OCCURRED_EVENT_NAME.to_string(),  aggregate_id, url, error_message }
    }
}

impl EventApply for &ShipmentTrackerErrorParsingWebsiteOccurredEvent {
    fn apply_to(&self, account: &mut AccountAggregate) -> Result<(), String> {
        println!("applying ShipmentTrackerErrorParsingWebsiteOccurred");
        if account.aggregate_id.is_empty() {
            return Err("Aggregate does not exist".to_string());
        }

        println!("active shipment urls is {}", account.active_shipment_trackers.len());
        let url = self.url.to_string();
        if !account.is_tracking_shipment_url(url){
            let error_message = "Error, this url is not being tracked '{url}'".to_string();
            eprintln!("{}",error_message);
            return Err(error_message);
        }

        match account.active_shipment_trackers.iter().position(|tracker| tracker.url.to_lowercase() == self.url.to_lowercase()) {
            Some(found_index) => {
                account.active_shipment_trackers[found_index].error_message_on_last_attempt = Some(self.error_message.clone());
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