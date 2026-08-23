use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use bb8_postgres::bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use tokio_postgres::NoTls;
use crate::aggregate_roots::account_aggregate::AccountAggregate;
use crate::command_handlers::handle_command_trait::HandleCommand;
use crate::repositories::account_repository::{load_events, save};


pub const CREATE_ACCOUNT_COMMAND_NAME: &str = "create_account_command";

#[derive(Debug, Deserialize, Serialize)]
pub struct CreateAccountCommand {
    pub command_name: String,
    pub userId: String
}

pub fn create_account_command_factory(body: &[u8]) -> Result<CreateAccountCommand,String> {
    let command_or_error = serde_json::from_slice::<CreateAccountCommand>(body);

    match command_or_error {
        Ok(command) =>
             Ok(command),

        Err(e) =>
            Err(e.to_string()),
    }
}

#[async_trait]
impl HandleCommand for CreateAccountCommand {
    async fn handle(&self, pool: Pool<PostgresConnectionManager<NoTls>>) -> Result<(), String> {
        let aggregate_id = self.userId.to_string();
        let account_aggregate =  match load_events(aggregate_id.to_string(), pool.clone()).await {
            Ok(events) => events,
            Err(e) => return Err(e)
        };

        if account_aggregate.len() > 0 {
            return Err(format!("Error: no events should exist when creating account. aggregate_id {aggregate_id}"));
        }
        let account = match AccountAggregate::new(self.userId.to_string()) {
            Ok(agg) => agg,
            Err(e) => return Err(e)
        };

        return match save(account, pool.clone()).await {
            Ok(result) => Ok(result),
            Err(e) => Err(format!("{e}"))
        }
    }
}