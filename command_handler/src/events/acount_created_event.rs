use std::string::ToString;
use serde::{Deserialize, Serialize};
use crate::aggregate_roots::account_aggregate::AccountAggregate;
use crate::commands::base_command::BaseCommand;
use crate::events::event_apply_trait::EventApply;

#[derive(Serialize, Deserialize)]
pub struct AccountCreatedEvent {
    pub event_name: String,
    pub aggregate_id: String,
}

pub const ACCOUNT_CREATED_EVENT_NAME: &str = "account_created";

impl AccountCreatedEvent {
    pub fn new(aggregate_id: String) -> Self {
        Self { event_name: ACCOUNT_CREATED_EVENT_NAME.to_string(),  aggregate_id }
    }
}

impl EventApply for &AccountCreatedEvent {
    fn apply_to(&self, account: &mut AccountAggregate) -> Result<(), String>{
        println!("apply_to CreateAccountEvent");
        if account.aggregate_id != "" {
            return Err("Aggregate is already created".to_string());
        }
        return Ok(account.aggregate_id = self.aggregate_id.clone());
    }
}