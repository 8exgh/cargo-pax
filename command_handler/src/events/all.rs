use serde::{Deserialize, Serialize};
use crate::events::acount_created_event::AccountCreatedEvent;
use crate::events::no_op_event::NoOpOccuredEvent;
use crate::events::shipment_delivered_event::ShipmentDeliveredEvent;
use crate::events::shipment_estimated_delivery_date_changed_event::ShipmentEstimatedDeliveryDateChanged;
use crate::events::shipment_tracker_error_parsing_website_occurred_event::ShipmentTrackerErrorParsingWebsiteOccurredEvent;
use crate::events::shipment_tracker_refresh_request_completed_event::ShipmentTrackerRefreshRequestCompletedEvent;
use crate::events::shipment_tracking_label_changed_event::ShipmentTrackingLabelChangedEvent;
use crate::events::shipment_tracking_refresh_requested_event::ShipmentTrackingRefreshRequestedEvent;
use crate::events::shipment_tracking_started_event::ShipmentTrackingStartedEvent;

#[derive(Serialize, Deserialize)]
pub enum AllEvents {
    CreateAccountEvent(AccountCreatedEvent),
    StartTrackingShipmentEvent(ShipmentTrackingStartedEvent),
    ShipmentDeliveredEvent(ShipmentDeliveredEvent),
    ShipmentEstimatedDeliveryDateChangedEvent(ShipmentEstimatedDeliveryDateChanged),
    ShipmentTrackingLabelChangedEvent(ShipmentTrackingLabelChangedEvent),
    ShipmentTrackingRefreshRequestedEvent(ShipmentTrackingRefreshRequestedEvent),
    NoOpOccurredEvent(NoOpOccuredEvent),
    ShipmentTrackerErrorParsingWebsiteOccurredEvent(ShipmentTrackerErrorParsingWebsiteOccurredEvent),
    ShipmentTrackerRefreshRequestCompletedEvent(ShipmentTrackerRefreshRequestCompletedEvent),
}