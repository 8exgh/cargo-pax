use std::string::ToString;
use serde::{Deserialize, Serialize};
use crate::aggregate_roots::account_aggregate::AccountAggregate;
use crate::commands::base_command::BaseCommand;
use crate::events::event_apply_trait::EventApply;

#[derive(Serialize, Deserialize)]
pub struct NoOpOccuredEvent {
    pub event_name: String,
    pub aggregate_id: String
}

pub const NO_OP_EVENT_NAME: &str = "no_op";

impl NoOpOccuredEvent {
    pub fn new(aggregate_id: String) -> Self {
        Self { event_name: NO_OP_EVENT_NAME.to_string(),  aggregate_id }
    }
}

impl EventApply for &NoOpOccuredEvent {
    fn apply_to(&self, account: &mut AccountAggregate) -> Result<(), String> {
        // TO emit an event that no operation occurred.
        // These are meant to be filtered out during Save to repository

        return Ok(());
    }
}