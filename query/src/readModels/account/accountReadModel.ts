import _ from "lodash";
import {EventDbRow} from "../../repository/eventStoreRepository";

let readModel: AccountReadModel = null;

interface TrackerRefreshRequest {
    account_id: string;
    url: string;
    priority: number;
    event_order: number;
}

interface RefreshRequested  {
    priority: number;
    event_order: number;
}

interface Tracking {
    url: string;
    label: string;
    estimated_delivery_date: string | null;
    delivered_on: string | null;
    is_delivered: boolean;
    refresh_requested: RefreshRequested | null;
    error_message: string | null;
}

interface CompletedDelivery {
    url: string;
    label: string;
    date: string;
}

interface Account {
    id: string;
    tracking: Tracking[];
    completed_deliveries: CompletedDelivery[]
}

interface shipment_tracking_started {
    event_name: string;
    aggregate_id: string;
    url: string;
}
interface shipment_estimated_delivery_date_changed {
    event_name: string;
    aggregate_id: string;
    url: string;
    date: string;
}

interface shipment_delivered {
    event_name: string;
    aggregate_id: string;
    url: string;
    date: string;
}

interface shipment_tracker_refresh_request_completed {
    event_name: string;
    aggregate_id: string;
    url: string;
}

interface shipment_tracker_error_parsing_website_occurred {
    event_name: string;
    aggregate_id: string;
    url: string;
    error_message: string;
}

interface shipment_tracking_label_changed {
    event_name: string;
    aggregate_id: string;
    url: string;
    label: string;
}

interface shipment_tracking_refresh_requested {
    event_name: string;
    aggregate_id: string;
    url: string;
    priority: number;
}

export class AccountReadModel {
    accounts: Account[];

    private currentEventOrder: number;

    constructor() {
        this.accounts = [];
        this.currentEventOrder = -1;
    }

    static getInstance() {
        if(_.isNil(readModel)) {
            readModel = new AccountReadModel();
        }
        return readModel;
    }

    getCurrentEventOrder(): number {
        return this.currentEventOrder;
    }

    getAccount(accountId: any): Account | undefined {
        const matchingAccounts = this.accounts.filter(a => a.id === accountId);
        if(matchingAccounts.length === 0) {
            return undefined;
        } else if(matchingAccounts.length > 1) {
            throw new Error("Expected no more than 1 account");
        }
        return matchingAccounts[0];
    }

    computeRefreshRequests(): TrackerRefreshRequest[] {
        const allowedHostnames = ["ups.com", "fedex.com"];

        const refreshRequests: TrackerRefreshRequest[] = [];
        this.accounts.forEach(account => {
            account.tracking.forEach(tracker => {

                if(tracker.refresh_requested) {
                    let urlCopy = tracker.url.toLowerCase().trim();
                    if(!urlCopy.startsWith("http")) {
                        urlCopy = `http://${urlCopy}`;
                    }
                    try {
                        const urlAbstraction = new URL(urlCopy);
                        const domainName = urlAbstraction.hostname;

                        if (allowedHostnames.some(allowedHostname => allowedHostname === domainName.toLowerCase() || domainName.toLowerCase().endsWith(`.${allowedHostname}`))) {
                            refreshRequests.push({
                                account_id: account.id,
                                url: tracker.url,
                                priority: tracker.refresh_requested.priority,
                                event_order: tracker.refresh_requested.event_order
                            });
                        } else {
                            console.error(`hostname unsafe: ${domainName}`);
                        }
                    }
                    catch (e) {
                        console.error(`checking safety of url crashed. url: ${tracker.url}`);
                    }
                }
            })
        })
        return refreshRequests;
    }

    build(events: EventDbRow[]) {
        events.forEach(e => {
            if(e.event_order <= this.currentEventOrder) {
                throw new Error(`Building read model. But an event_order is > than current event_order of read model. event_order: ${e.event_order}, current event_order: ${this.currentEventOrder}`)
            }
            if(e.event_type === 'account_created') {
                const newAccount: Account = { id: e.aggregate_id, tracking: [], completed_deliveries: []};
                this.accounts.push(newAccount);
            } else if(e.event_type === 'shipment_tracking_started') {
                const event: shipment_tracking_started = JSON.parse(e.event_object);
                const account = this.getAccount(e.aggregate_id);
                const tracker: Tracking = { url: event.url, estimated_delivery_date: null, delivered_on: null, is_delivered: false, label: 'Enter a description', refresh_requested: null, error_message: null }
                account.tracking.push(tracker);
            } else if(e.event_type === 'shipment_estimated_delivery_date_changed') {
                const event: shipment_estimated_delivery_date_changed = JSON.parse(e.event_object);
                const account = this.getAccount(e.aggregate_id);
                const tracker = account.tracking.filter(tracker => tracker.url.toLowerCase() === event.url.toLowerCase())[0];
                if(_.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                tracker.estimated_delivery_date = event.date;
                tracker.error_message = null;
            } else if(e.event_type === 'shipment_delivered') {
                const event: shipment_delivered = JSON.parse(e.event_object);
                const account = this.getAccount(e.aggregate_id);
                const tracker = account.tracking.filter(tracker => tracker.url.toLowerCase() === event.url.toLowerCase())[0];
                if(_.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                account.completed_deliveries.push({url: event.url, label: tracker.label, date: event.date});
                account.tracking = account.tracking.filter(tracker => tracker.url.toLowerCase() !== event.url.toLowerCase());
            }
            else if(e.event_type === 'shipment_tracking_label_changed') {
                const event: shipment_tracking_label_changed = JSON.parse(e.event_object);
                const account = this.getAccount(e.aggregate_id);
                const tracker = account.tracking.filter(tracker => tracker.url.toLowerCase() === event.url.toLowerCase())[0];
                if(_.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                tracker.label = event.label;
            } else if(e.event_type === 'shipment_tracking_refresh_requested') {
                const event: shipment_tracking_refresh_requested = JSON.parse(e.event_object);
                const account = this.getAccount(e.aggregate_id);
                const tracker = account.tracking.filter(tracker => tracker.url.toLowerCase() === event.url.toLowerCase())[0];
                if(_.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                tracker.refresh_requested  = { priority: event.priority, event_order: e.event_order };
                tracker.error_message = null;
            } else if(e.event_type === 'shipment_tracker_refresh_request_completed') {
                const event: shipment_tracker_refresh_request_completed = JSON.parse(e.event_object);
                const account = this.getAccount(e.aggregate_id);
                const tracker = account.tracking.filter(tracker => tracker.url.toLowerCase() === event.url.toLowerCase())[0];
                if(_.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                tracker.refresh_requested  = null;
                tracker.error_message = null;
            } else if(e.event_type === 'shipment_tracker_error_parsing_website_occurred') {
                const event: shipment_tracker_error_parsing_website_occurred = JSON.parse(e.event_object);
                const account = this.getAccount(e.aggregate_id);
                const tracker = account.tracking.filter(tracker => tracker.url.toLowerCase() === event.url.toLowerCase())[0];
                if(_.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                tracker.refresh_requested  = null;
                tracker.error_message = event.error_message;
            }
            else {
                throw new Error(`event_type not implemented ${e.event_type}`);
            }
            this.currentEventOrder = e.event_order;
        })
    }
}