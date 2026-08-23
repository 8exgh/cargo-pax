use crate::aggregate_roots::account_aggregate::AccountAggregate;

pub trait EventApply {
    fn apply_to(&self, account: &mut AccountAggregate) -> Result<(), String>;
}