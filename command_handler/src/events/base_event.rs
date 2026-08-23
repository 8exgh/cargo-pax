use serde::{Deserialize, Serialize};
use crate::aggregate_roots::account_aggregate::AccountAggregate;
use crate::commands::base_command::BaseCommand;
use crate::events::event_apply_trait::EventApply;

#[derive(Serialize, Deserialize)]
pub struct BaseEvent {
    pub event_name: String
}