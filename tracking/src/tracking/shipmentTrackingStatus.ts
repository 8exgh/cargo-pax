
// The following is a schema definition for determining the shipment tracking status of a html page.
export interface ShipmentTrackingStatus {
    estimatedDeliveryDate: string | null;
    deliveredOnDate: string | null;
    isDelivered: boolean;
    errorMessage: string | null;
}