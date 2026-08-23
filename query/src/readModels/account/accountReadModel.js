"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountReadModel = void 0;
var lodash_1 = __importDefault(require("lodash"));
var readModel = null;
var AccountReadModel = /** @class */ (function () {
    function AccountReadModel() {
        this.accounts = [];
        this.currentEventOrder = -1;
    }
    AccountReadModel.getInstance = function () {
        if (lodash_1.default.isNil(readModel)) {
            readModel = new AccountReadModel();
        }
        return readModel;
    };
    AccountReadModel.prototype.getCurrentEventOrder = function () {
        return this.currentEventOrder;
    };
    AccountReadModel.prototype.getAccount = function (accountId) {
        var matchingAccounts = this.accounts.filter(function (a) { return a.id === accountId; });
        if (matchingAccounts.length === 0) {
            return undefined;
        }
        else if (matchingAccounts.length > 1) {
            throw new Error("Expected no more than 1 account");
        }
        return matchingAccounts[0];
    };
    AccountReadModel.prototype.computeRefreshRequests = function () {
        var allowedHostnames = ["ups.com", "fedex.com"];
        var refreshRequests = [];
        this.accounts.forEach(function (account) {
            account.tracking.forEach(function (tracker) {
                if (tracker.refresh_requested) {
                    var urlCopy = tracker.url.toLowerCase().trim();
                    if (!urlCopy.startsWith("http")) {
                        urlCopy = "http://".concat(urlCopy);
                    }
                    try {
                        var urlAbstraction = new URL(urlCopy);
                        var domainName_1 = urlAbstraction.hostname;
                        if (allowedHostnames.some(function (allowedHostname) { return allowedHostname === domainName_1.toLowerCase() || domainName_1.toLowerCase().endsWith(".".concat(allowedHostname)); })) {
                            refreshRequests.push({
                                account_id: account.id,
                                url: tracker.url,
                                priority: tracker.refresh_requested.priority,
                                event_order: tracker.refresh_requested.event_order
                            });
                        }
                        else {
                            console.error("hostname unsafe: ".concat(domainName_1));
                        }
                    }
                    catch (e) {
                        console.error("checking safety of url crashed. url: ".concat(tracker.url));
                    }
                }
            });
        });
        return refreshRequests;
    };
    AccountReadModel.prototype.build = function (events) {
        var _this = this;
        events.forEach(function (e) {
            if (e.event_order <= _this.currentEventOrder) {
                throw new Error("Building read model. But an event_order is > than current event_order of read model. event_order: ".concat(e.event_order, ", current event_order: ").concat(_this.currentEventOrder));
            }
            if (e.event_type === 'account_created') {
                var newAccount = { id: e.aggregate_id, tracking: [], completed_deliveries: [] };
                _this.accounts.push(newAccount);
            }
            else if (e.event_type === 'shipment_tracking_started') {
                var event_1 = JSON.parse(e.event_object);
                var account = _this.getAccount(e.aggregate_id);
                var tracker = { url: event_1.url, estimated_delivery_date: null, delivered_on: null, is_delivered: false, label: 'Enter a description', refresh_requested: null, error_message: null };
                account.tracking.push(tracker);
            }
            else if (e.event_type === 'shipment_estimated_delivery_date_changed') {
                var event_2 = JSON.parse(e.event_object);
                var account = _this.getAccount(e.aggregate_id);
                var tracker = account.tracking.filter(function (tracker) { return tracker.url.toLowerCase() === event_2.url.toLowerCase(); })[0];
                if (lodash_1.default.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                tracker.estimated_delivery_date = event_2.date;
                tracker.error_message = null;
            }
            else if (e.event_type === 'shipment_delivered') {
                var event_3 = JSON.parse(e.event_object);
                var account = _this.getAccount(e.aggregate_id);
                var tracker = account.tracking.filter(function (tracker) { return tracker.url.toLowerCase() === event_3.url.toLowerCase(); })[0];
                if (lodash_1.default.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                account.completed_deliveries.push({ url: event_3.url, label: tracker.label, date: event_3.date });
                account.tracking = account.tracking.filter(function (tracker) { return tracker.url.toLowerCase() !== event_3.url.toLowerCase(); });
            }
            else if (e.event_type === 'shipment_tracking_label_changed') {
                var event_4 = JSON.parse(e.event_object);
                var account = _this.getAccount(e.aggregate_id);
                var tracker = account.tracking.filter(function (tracker) { return tracker.url.toLowerCase() === event_4.url.toLowerCase(); })[0];
                if (lodash_1.default.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                tracker.label = event_4.label;
            }
            else if (e.event_type === 'shipment_tracking_refresh_requested') {
                var event_5 = JSON.parse(e.event_object);
                var account = _this.getAccount(e.aggregate_id);
                var tracker = account.tracking.filter(function (tracker) { return tracker.url.toLowerCase() === event_5.url.toLowerCase(); })[0];
                if (lodash_1.default.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                tracker.refresh_requested = { priority: event_5.priority, event_order: e.event_order };
                tracker.error_message = null;
            }
            else if (e.event_type === 'shipment_tracker_refresh_request_completed') {
                var event_6 = JSON.parse(e.event_object);
                var account = _this.getAccount(e.aggregate_id);
                var tracker = account.tracking.filter(function (tracker) { return tracker.url.toLowerCase() === event_6.url.toLowerCase(); })[0];
                if (lodash_1.default.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                tracker.refresh_requested = null;
                tracker.error_message = null;
            }
            else if (e.event_type === 'shipment_tracker_error_parsing_website_occurred') {
                var event_7 = JSON.parse(e.event_object);
                var account = _this.getAccount(e.aggregate_id);
                var tracker = account.tracking.filter(function (tracker) { return tracker.url.toLowerCase() === event_7.url.toLowerCase(); })[0];
                if (lodash_1.default.isNil(tracker)) {
                    throw new Error("Tracker not found");
                }
                tracker.refresh_requested = null;
                tracker.error_message = event_7.error_message;
            }
            else {
                throw new Error("event_type not implemented ".concat(e.event_type));
            }
            _this.currentEventOrder = e.event_order;
        });
    };
    return AccountReadModel;
}());
exports.AccountReadModel = AccountReadModel;
//# sourceMappingURL=accountReadModel.js.map