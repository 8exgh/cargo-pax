use chrono::NaiveDate;
use crate::commands::update_tracking_shipment_label_command::UpdateTrackingShipmentLabelCommand;
use crate::events::acount_created_event::AccountCreatedEvent;
use crate::events::all::AllEvents;
use crate::events::event_apply_trait::EventApply;
use crate::events::no_op_event::NoOpOccuredEvent;
use crate::events::shipment_delivered_event::ShipmentDeliveredEvent;
use crate::events::shipment_estimated_delivery_date_changed_event::ShipmentEstimatedDeliveryDateChanged;
use crate::events::shipment_tracker_error_parsing_website_occurred_event::ShipmentTrackerErrorParsingWebsiteOccurredEvent;
use crate::events::shipment_tracker_refresh_request_completed_event::ShipmentTrackerRefreshRequestCompletedEvent;
use crate::events::shipment_tracking_label_changed_event::ShipmentTrackingLabelChangedEvent;
use crate::events::shipment_tracking_refresh_requested_event::ShipmentTrackingRefreshRequestedEvent;
use crate::events::shipment_tracking_started_event::ShipmentTrackingStartedEvent;

pub struct RefreshRequest {
    pub priority: u8
}

impl RefreshRequest {
    pub fn new(priority: u8) -> RefreshRequest {
        RefreshRequest { priority }
    }
}

pub struct ShipmentTracker {
    pub url: String,
    pub estimated_delivery_date: Option<String>,
    pub error_message_on_last_attempt: Option<String>,
    pub label: Option<String>,
    pub refresh_request: Option<RefreshRequest>
}

impl ShipmentTracker {
    pub fn new(url:String) -> ShipmentTracker {
        ShipmentTracker { url, estimated_delivery_date: None, label: None, refresh_request: None, error_message_on_last_attempt: None }
    }

    pub fn change_estimated_delivery_date(mut self, date: String) {
        self.estimated_delivery_date = Some(date);
    }
}

pub struct AccountAggregate {
    unsaved_changes:  Vec<AllEvents>,
    pub aggregate_id: String,
    pub active_shipment_trackers: Vec<ShipmentTracker>
}

fn create_empty_instance(aggregate_id: String) -> AccountAggregate {
    let mut agg = AccountAggregate { unsaved_changes: Vec::new(), aggregate_id: "".to_string(), active_shipment_trackers: Vec::new() };
    return agg;
}

impl AccountAggregate {
    pub fn new(aggregate_id: String) -> Result<AccountAggregate, String> {
        let mut agg = create_empty_instance(aggregate_id.to_string());
        let event = AccountCreatedEvent::new(aggregate_id);
        match agg.apply_new(AllEvents::CreateAccountEvent(event)) {
            Ok(agg) => (),
            Err(e) => return Err(e)
        }
        return Ok(agg);
    }

    pub fn new_via_events(aggregate_id: String, events: Vec<AllEvents>) -> Result<AccountAggregate, String> {
        println!("new_via_events: {}", aggregate_id);
        let mut agg = create_empty_instance("".to_string());

        // for (i, event) in events.into_iter().enumerate() {
        //     println!("Handling event #{i}");
        //     match agg.common_apply_existing(event) {
        //         Ok(()) => (),
        //         Err(e) => return Err(e)
        //     }
        // }

        return match agg.load_from_history(events) {
            Ok(()) => Ok(agg),
            Err(e) => return Err(e)
        }
    }

    pub fn start_tracking_shipment(&mut self, url: String) -> Result<(), String> {
        let event = ShipmentTrackingStartedEvent::new(self.aggregate_id.to_string(), url.clone());
        return self.apply_new(AllEvents::StartTrackingShipmentEvent(event));
    }

    pub fn update_tracking_status(&mut self, url: String, estimated_delivery_date: String,  delivered_on_date: String, is_delivered: bool, is_error: bool, error_message: String) -> Result<(), String> {
        if !self.is_tracking_shipment_url(url.clone()) {
            return Err("Url currently not being tracked".to_string())
        }

        let shipment_tracker_refresh_request_completed_event = ShipmentTrackerRefreshRequestCompletedEvent::new(self.aggregate_id.clone(), url.clone());
        match self.apply_new(AllEvents::ShipmentTrackerRefreshRequestCompletedEvent(shipment_tracker_refresh_request_completed_event)) {
            Ok(event) => (),
            Err(e) => return Err(e)
        }

        if is_error {
            let shipment_tracker_error_parsing_website_occurred_event = ShipmentTrackerErrorParsingWebsiteOccurredEvent::new(self.aggregate_id.clone(), url.clone(), error_message.to_string());
            return self.apply_new(AllEvents::ShipmentTrackerErrorParsingWebsiteOccurredEvent(shipment_tracker_error_parsing_website_occurred_event));
        } else if is_delivered {
            let parsed_delivery_date = match NaiveDate::parse_from_str(&delivered_on_date, "%Y-%m-%d") {
                Ok(date) => date,
                Err(e) => return Err(format!("Could not parse delivered_on_date: '{}'", delivered_on_date))
            };

            let shipment_delivered_event = ShipmentDeliveredEvent::new(self.aggregate_id.clone(), url.clone(), parsed_delivery_date.to_string());
            return self.apply_new(AllEvents::ShipmentDeliveredEvent(shipment_delivered_event));
        } else {
            let parsed_estimated_delivery_date = match NaiveDate::parse_from_str(&estimated_delivery_date, "%Y-%m-%d") {
                Ok(date) => date,
                Err(e) => return Err(format!("Could not parse estimated_delivery_date: '{}'", estimated_delivery_date))
            };

            let index = self.active_shipment_trackers.iter().position(|current_tracker| current_tracker.url.clone().to_lowercase() == url.clone().to_lowercase());

            match index {
                Some(matching_index) => {
                    let shipment_estimated_delivery_date_changed_event = ShipmentEstimatedDeliveryDateChanged::new(self.aggregate_id.clone(), url.clone(), parsed_estimated_delivery_date.to_string());
                    return self.apply_new(AllEvents::ShipmentEstimatedDeliveryDateChangedEvent(shipment_estimated_delivery_date_changed_event));
                    // match self.active_shipment_trackers[matching_index].estimated_delivery_date.as_ref() {
                    //     Some(estimated_delivery_date_instance) => {
                    //         if estimated_delivery_date_instance.to_string() == parsed_estimated_delivery_date.to_string() {
                    //             println!("The url already has that estimated delivery date, emitting a no-op new event {}, {}", url.clone(), parsed_estimated_delivery_date.to_string().clone());
                    //             let no_op_event = NoOpOccuredEvent::new(self.aggregate_id.clone());
                    //             return self.apply_new(AllEvents::NoOpOccurredEvent(no_op_event));
                    //         }
                    //     },
                    //     None => println!("New date estimated delivery date, emitting event")
                    // }
                }
                None => return Err("The url should be in active_shipment_trackers, but could not find".to_string())
            }


        }
    }

    pub fn update_tracking_label(&mut self, url: String, new_label: String) -> Result<(), String> {
        if !self.is_tracking_shipment_url(url.clone()) {
            return Err("Url currently not being tracked".to_string())
        }

        let shipment_estimated_delivery_date_changed_event = ShipmentTrackingLabelChangedEvent::new(self.aggregate_id.clone(), url.clone(), new_label.to_string());
        return self.apply_new(AllEvents::ShipmentTrackingLabelChangedEvent(shipment_estimated_delivery_date_changed_event));

    }

    pub fn refresh_all_trackers(&mut self) -> Result<(), String> {
        if !self.active_shipment_trackers.len() == 0  {
            return Err("No urls being tracked".to_string())
        }


        let mut events: Vec<AllEvents> = Vec::new();

        for tracker in &self.active_shipment_trackers {
            let priority = 3;
            let shipment_estimated_delivery_date_changed_event = ShipmentTrackingRefreshRequestedEvent::new(self.aggregate_id.clone(), tracker.url.clone(), priority);
            events.push(AllEvents::ShipmentTrackingRefreshRequestedEvent(shipment_estimated_delivery_date_changed_event));
        }

        for event in events {
            match self.apply_new(event) {
                Ok(()) => (),
                Err(e) => return Err(e)
            };
        }

        return Ok(());
    }

    pub fn is_tracking_shipment_url(&self, url: String) -> bool {
        if self.active_shipment_trackers.iter().any(|current_shipment|  current_shipment.url.to_lowercase() == url.to_lowercase()) {
            return true;
        }

        return false;
    }

    pub fn get_aggregate_id(&self) -> &str {
        return &self.aggregate_id;
    }

    pub fn get_unsaved_changes(&self) -> &Vec<AllEvents> {
        return &self.unsaved_changes;
    }

    pub fn load_from_history(&mut self, history: Vec<AllEvents>) -> Result<(), String> {
        for event in history {
            match self.apply_existing(event) {
                Ok(()) => (),
                Err(e) => return Err(e)
            }
        }

        return Ok(())
    }

    fn apply_new(&mut self, event: AllEvents) -> Result<(), String> {
        println!("apply_new");
        return self.common_apply(event, true);
    }

    fn apply_existing(&mut self, event: AllEvents) -> Result<(), String> {
        println!("apply_existing");
        return self.common_apply(event, false);
    }



    fn common_apply(&mut self, event: AllEvents, is_new: bool) -> Result<(), String> {
        match &event {
            AllEvents::CreateAccountEvent(event) => {
                println!("common_apply CreateAccountEvent");
                match event.apply_to((self)) {
                    Ok(r) => (),
                    Err(e) => return Err(e.to_string())
                }
            },
            AllEvents::StartTrackingShipmentEvent(event) => {
                println!("common_apply StartTrackingShipmentEvent");
                match event.apply_to((self)) {
                    Ok(r) => (),
                    Err(e) => return Err(e.to_string())
                }
            },
            AllEvents::ShipmentDeliveredEvent(event) => {
                println!("common_apply ShipmentDeliveredDevent");
                match event.apply_to((self)) {
                    Ok(r) => (),
                    Err(e) => return Err(e.to_string())
                }
            },
            AllEvents::ShipmentEstimatedDeliveryDateChangedEvent(event) => {
                println!("common_apply ShipmentEstimatedDeliveryDateChangedEvent");
                match event.apply_to((self)) {
                    Ok(r) => (),
                    Err(e) => return Err(e.to_string())
                }
            },
            AllEvents::ShipmentTrackingLabelChangedEvent(event) => {
                println!("common_apply ShipmentTrackingLabelChangedEvent");
                match event.apply_to((self)) {
                    Ok(r) => (),
                    Err(e) => return Err(e.to_string())
                }
            },
            AllEvents::ShipmentTrackingRefreshRequestedEvent(event) => {
                println!("common_apply ShipmentTrackingRefreshRequestedEvent");
                match event.apply_to((self)) {
                    Ok(r) => (),
                    Err(e) => return Err(e.to_string())
                }
            },
            AllEvents::ShipmentTrackerErrorParsingWebsiteOccurredEvent(event) => {
                println!("common_apply ShipmentTrackerErrorParsingWebsiteOccurredEvent");
                match event.apply_to((self)) {
                    Ok(r) => (),
                    Err(e) => return Err(e.to_string())
                }
            },
            AllEvents::ShipmentTrackerRefreshRequestCompletedEvent(event) => {
                println!("common_apply ShipmentTrackerRefreshRequestCompletedEvent");
                match event.apply_to((self)) {
                    Ok(r) => (),
                    Err(e) => return Err(e.to_string())
                }
            },
            AllEvents::NoOpOccurredEvent(event) => {
                match event.apply_to((self)) {
                    Ok(r) => (),
                    Err(e) => return Err(e.to_string())
                }
            }
        };

        if is_new {
            self.append_event(event);
        }

        return Ok(())
    }

    fn append_event(&mut self, event: AllEvents) {
        self.unsaved_changes.push(event);
    }

    //
    // fn apply<E: EventApply>(&mut self, event: &E) -> Result<(), String> {
    //     println!("apply thing...");
    //     match event.apply_to(self) {
    //          Ok(r) => Ok(()),
    //          Err(e) => Err(e)
    //      }
    // }
}

pub async fn load_aggregate(aggregate_id: String, events: Vec<AllEvents>) -> Result<AccountAggregate, String> {
    let account_aggregate: AccountAggregate = match AccountAggregate::new_via_events(aggregate_id.to_string(), events) {
        Ok(aggregate) => aggregate,
        Err(e) => return Err(e)
    };

    return Ok(account_aggregate);
}