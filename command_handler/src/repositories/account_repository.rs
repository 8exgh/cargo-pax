use actix_web::HttpRequest;
use bb8_postgres::bb8::Pool;
use bb8_postgres::PostgresConnectionManager;
use crate::aggregate_roots::account_aggregate::AccountAggregate;
use tokio_postgres::{NoTls, Error};
use crate::events::all::AllEvents;
use crate::events::base_event::BaseEvent;
use crate::events::acount_created_event::AccountCreatedEvent;
use crate::events::acount_created_event::ACCOUNT_CREATED_EVENT_NAME;
use crate::events::shipment_delivered_event::ShipmentDeliveredEvent;
use crate::events::shipment_delivered_event::SHIPMENT_DELIVERED_EVENT_NAME;
use crate::events::shipment_estimated_delivery_date_changed_event::{SHIPMENT_ESTIMATED_DELIVERY_DATE_EVENT_NAME, ShipmentEstimatedDeliveryDateChanged};
use crate::events::shipment_tracker_error_parsing_website_occurred_event::{SHIPMENT_TRACKER_ERROR_PARSING_WEBSITE_OCCURRED_EVENT_NAME, ShipmentTrackerErrorParsingWebsiteOccurredEvent};
use crate::events::shipment_tracker_refresh_request_completed_event::{SHIPMENT_TRACKER_REFRESH_REQUEST_COMPLETED_EVENT_NAME, ShipmentTrackerRefreshRequestCompletedEvent};
use crate::events::shipment_tracking_label_changed_event::{ShipmentTrackingLabelChangedEvent, SHIPMENT_TRACKING_LABEL_CHANGED_EVENT_NAME };
use crate::events::shipment_tracking_refresh_requested_event::{SHIPMENT_TRACKING_REFRESH_REQUESTED_EVENT_NAME, ShipmentTrackingRefreshRequestedEvent};
use crate::events::shipment_tracking_started_event::{SHIPMENT_TRACKING_STARTED_EVENT_NAME, ShipmentTrackingStartedEvent};


fn serialize(inner_event: AllEvents) -> Result<String, String> {
    match serde_json::to_string(&inner_event) {
        Ok(value) => {
            Ok(value)
        },
        Err(e) => {
            Err(e.to_string())
        }
    }
}

pub async fn save(account: AccountAggregate, pool: Pool<PostgresConnectionManager<NoTls>>) -> Result<(),String> {
    println!("saving events: {}", account.get_unsaved_changes().len());
    if account.get_unsaved_changes().len() == 0 {
        return Err("There are no events to save. There must be a bug.".to_string());
    }

    // Filter out no op events
    // Purpose of no op is an event should always occur if a command has no error, or there is a bug
    let unsaved_events = account.get_unsaved_changes().iter().filter(|&event|
        if let AllEvents::NoOpOccurredEvent(_) = event {
            false
        } else {
            true
        });


    let client = match pool.get().await {
        Ok(c) => c,
        Err(e) => return Err(e.to_string())
    };

    for unsaved_event in unsaved_events {
        let aggregate_type = "account"; // TODO: is hardcoded


        let aggregate_version = 1;

        let serialized_event = match unsaved_event {
            AllEvents::CreateAccountEvent(inner_event) => match serde_json::to_string(&inner_event) {
                Ok(value) => {
                    value
                },
                Err(e) => {
                    return Err(e.to_string());
                }
            },
            AllEvents::StartTrackingShipmentEvent(inner_event) => match serde_json::to_string(&inner_event) {
                Ok(value) => {
                    value
                },
                Err(e) => {
                    return Err(e.to_string());
                }
            },
            AllEvents::ShipmentDeliveredEvent(inner_event) => match serde_json::to_string(&inner_event) {
                Ok(value) => {
                    value
                },
                Err(e) => {
                    return Err(e.to_string());
                }
            },
            AllEvents::ShipmentEstimatedDeliveryDateChangedEvent(inner_event) => match serde_json::to_string(&inner_event) {
                Ok(value) => {
                    value
                },
                Err(e) => {
                    return Err(e.to_string());
                }
            },
            AllEvents::ShipmentTrackingLabelChangedEvent(inner_event) => match serde_json::to_string(&inner_event) {
                Ok(value) => {
                    value
                },
                Err(e) => {
                    return Err(e.to_string());
                }
            },
            AllEvents::ShipmentTrackingRefreshRequestedEvent(inner_event) => match serde_json::to_string(&inner_event) {
                Ok(value) => {
                    value
                },
                Err(e) => {
                    return Err(e.to_string());
                }
            },
            AllEvents::ShipmentTrackerErrorParsingWebsiteOccurredEvent(inner_event) => match serde_json::to_string(&inner_event) {
                Ok(value) => {
                    value
                },
                Err(e) => {
                    return Err(e.to_string());
                }
            },
            AllEvents::ShipmentTrackerRefreshRequestCompletedEvent(inner_event) => match serde_json::to_string(&inner_event) {
                Ok(value) => {
                    value
                },
                Err(e) => {
                    return Err(e.to_string());
                }
            },
            AllEvents::NoOpOccurredEvent(inner_event) => {
                return Err("No Op Events should have been filtered out before writing to db".to_string())
            }
        };

        let (event_name, aggregate_id) = match unsaved_event {
            AllEvents::CreateAccountEvent(event) => {
                (&event.event_name, &event.aggregate_id)
            },
            AllEvents::StartTrackingShipmentEvent(event) => {
                (&event.event_name, &event.aggregate_id)
            },
            AllEvents::ShipmentDeliveredEvent(event) => {
                (&event.event_name, &event.aggregate_id)
            },
            AllEvents::ShipmentEstimatedDeliveryDateChangedEvent(event) => {
                (&event.event_name, &event.aggregate_id)
            },
            AllEvents::ShipmentTrackingLabelChangedEvent(event) => {
                (&event.event_name, &event.aggregate_id)
            },
            AllEvents::ShipmentTrackingRefreshRequestedEvent(event) => {
                (&event.event_name, &event.aggregate_id)
            },
            AllEvents::ShipmentTrackerErrorParsingWebsiteOccurredEvent(event) => {
                (&event.event_name, &event.aggregate_id)
            },
            AllEvents::ShipmentTrackerRefreshRequestCompletedEvent(event) => {
                (&event.event_name, &event.aggregate_id)
            },
            AllEvents::NoOpOccurredEvent(event) => {
                return Err("No Op Events should have been filtered out before writing to db".to_string())
            }
        };

        match client
            .query(&format!("insert into events (aggregate_type, aggregate_id, event_type, aggregate_version, event_object) values ('{aggregate_type}', '{aggregate_id}', '{event_name}', {aggregate_version}, '{serialized_event}')"), &[])
            .await {
            Ok(r) => {
                r
            },
            Err(e) => {
                eprintln!("inserting events: {}", e.to_string());
                return Err(e.to_string())
            }
        };
    }

    return Ok(());
}

fn format_error(e: &serde_json::Error, event_name: &str, event_json: &str) -> String {
    let error_text = e.to_string();
    eprintln!("Could not parse event. event_name = {}, event_text = {}, aggregate_version = TODO, error_text = {}", event_name, event_json, error_text);
    error_text
}

fn string_to_event(event_name: &str, event_json: &str) -> Result<AllEvents, String> {
    println!("string_to_event: {}", event_name);

    match event_name {
        ACCOUNT_CREATED_EVENT_NAME => {
            println!("ACCOUNT_CREATED_EVENT_NAME, {}", event_name);
            match serde_json::from_str::<AccountCreatedEvent>(event_json) {
                Ok(event) => Ok(AllEvents::CreateAccountEvent(event)),
                Err(e) => Err(format_error(&e, event_name, event_json))
            }
        },
        SHIPMENT_TRACKING_STARTED_EVENT_NAME => {
            println!("SHIPMENT_TRACKING_STARTED_EVENT_NAME, {}", event_name);
            match serde_json::from_str::<ShipmentTrackingStartedEvent>(event_json) {
                Ok(event) => Ok(AllEvents::StartTrackingShipmentEvent(event)),
                Err(e) => Err(format_error(&e, event_name, event_json))
            }
        },
        SHIPMENT_DELIVERED_EVENT_NAME => {
            println!("SHIPMENT_DELIVERED_EVENT_NAME, {}", event_name);
            match serde_json::from_str::<ShipmentDeliveredEvent>(event_json) {
                Ok(event) => Ok(AllEvents::ShipmentDeliveredEvent(event)),
                Err(e) => Err(format_error(&e, event_name, event_json))
            }
        },
        SHIPMENT_ESTIMATED_DELIVERY_DATE_EVENT_NAME => {
            println!("SHIPMENT_ESTIMATED_DELIVERY_DATE_EVENT_NAME,  {}, {}", SHIPMENT_ESTIMATED_DELIVERY_DATE_EVENT_NAME, event_name);
            match serde_json::from_str::<ShipmentEstimatedDeliveryDateChanged>(event_json) {
                Ok(event) => Ok(AllEvents::ShipmentEstimatedDeliveryDateChangedEvent(event)),
                Err(e) => Err(format_error(&e, event_name, event_json))
            }
        },
        SHIPMENT_TRACKING_LABEL_CHANGED_EVENT_NAME => {
            println!("SHIPMENT_TRACKING_LABEL_CHANGED_EVENT_NAME, {}", event_name);
            match serde_json::from_str::<ShipmentTrackingLabelChangedEvent>(event_json) {
                Ok(event) => Ok(AllEvents::ShipmentTrackingLabelChangedEvent(event)),
                Err(e) => Err(format_error(&e, event_name, event_json))
            }
        },
        SHIPMENT_TRACKING_REFRESH_REQUESTED_EVENT_NAME => {
            println!("SHIPMENT_TRACKING_REFRESH_REQUESTED_EVENT_NAME, {}", event_name);
            match serde_json::from_str::<ShipmentTrackingRefreshRequestedEvent>(event_json) {
                Ok(event) => Ok(AllEvents::ShipmentTrackingRefreshRequestedEvent(event)),
                Err(e) => Err(format_error(&e, event_name, event_json))
            }
        },
        SHIPMENT_TRACKER_ERROR_PARSING_WEBSITE_OCCURRED_EVENT_NAME => {
            println!("SHIPMENT_TRACKER_ERROR_PARSING_WEBSITE_OCCURRED_EVENT_NAME, {}", event_name);
            match serde_json::from_str::<ShipmentTrackerErrorParsingWebsiteOccurredEvent>(event_json) {
                Ok(event) => Ok(AllEvents::ShipmentTrackerErrorParsingWebsiteOccurredEvent(event)),
                Err(e) => Err(format_error(&e, event_name, event_json))
            }
        },
        SHIPMENT_TRACKER_REFRESH_REQUEST_COMPLETED_EVENT_NAME => {
            println!("SHIPMENT_TRACKER_REFRESH_REQUEST_COMPLETED_EVENT_NAME, {}", event_name);
            match serde_json::from_str::<ShipmentTrackerRefreshRequestCompletedEvent>(event_json) {
                Ok(event) => Ok(AllEvents::ShipmentTrackerRefreshRequestCompletedEvent(event)),
                Err(e) => Err(format_error(&e, event_name, event_json))
            }
        },
        _ => Err(format!("Unknown event_name {}", event_name))
    }
}


pub async fn load_events(aggregate_id: String, pool: Pool<PostgresConnectionManager<NoTls>>) -> Result<Vec<AllEvents>, String> {
    let client = match pool.get().await {
        Ok(c) => c,
        Err(e) => return Err(e.to_string())
    };

    let mut events: Vec<AllEvents> = Vec::new();

    match client

        .query(&format!("select aggregate_type, aggregate_id, event_type, aggregate_version, event_object from events where aggregate_id = '{aggregate_id}' order by event_order asc"), &[])
        .await {
        Ok(rows) => {
            for row in &rows {
                let event_json: String = row.get("event_object");

                let base_event: BaseEvent = match serde_json::from_str(&event_json) {
                    Ok(event) => event,
                    Err(e) => return Err(e.to_string())
                };

                let event = match string_to_event(base_event.event_name.as_str(), &event_json) {
                    Ok(event) => event,
                    Err(e) => return Err(e)
                };

                events.push(event);
            }
        },
        Err(e) => {
            return Err(e.to_string())
        }
    };

    println!("Loading Aggregate events. For aggregate_id {} there are {} events", aggregate_id, events.len());

    return Ok(events);
}

