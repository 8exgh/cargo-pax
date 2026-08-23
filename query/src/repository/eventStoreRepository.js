"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventStoreRepository = void 0;
var lodash_1 = __importDefault(require("lodash"));
var pg_1 = require("pg");
var instance = null;
var EventStoreRepository = /** @class */ (function () {
    function EventStoreRepository() {
    }
    EventStoreRepository.prototype.getPool = function () {
        if (lodash_1.default.isNil(this.pool)) {
            throw Error("Connect to database first");
        }
        return this.pool;
    };
    EventStoreRepository.prototype.getEnvironmentVariableOrExitProcess = function (key) {
        var value = process.env[key];
        if (lodash_1.default.isNil(value)) {
            console.log("Available environment variables:");
            Object.keys(process.env).forEach(console.log);
            console.error("Could not find environment variable '".concat(key, "'. Exiting process."));
            process.exit(1);
        }
        return value;
    };
    EventStoreRepository.prototype.getAllEventsAfterEventOrder = function (eventOrder) {
        return __awaiter(this, void 0, void 0, function () {
            var sqlQuery, events, dbRows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        sqlQuery = "SELECT * FROM events where event_order > ".concat(eventOrder, " order by event_order asc");
                        return [4 /*yield*/, this.getPool().query(sqlQuery)];
                    case 1:
                        events = _a.sent();
                        dbRows = events.rows.map(function (_a) {
                            var event_id = _a.event_id, event_order = _a.event_order, aggregate_type = _a.aggregate_type, aggregate_id = _a.aggregate_id, event_type = _a.event_type, aggregate_version = _a.aggregate_version, timestamp = _a.timestamp, event_object = _a.event_object;
                            var dbRow = { event_id: event_id, event_order: event_order, aggregate_type: aggregate_type, aggregate_id: aggregate_id, event_type: event_type, aggregate_version: aggregate_version, timestamp: timestamp, event_object: event_object };
                            return dbRow;
                        });
                        return [2 /*return*/, dbRows];
                }
            });
        });
    };
    EventStoreRepository.prototype.connect = function () {
        if (!lodash_1.default.isNil(this.pool)) {
            throw new Error("Event store is already connected");
        }
        var events_database_user_name = this.getEnvironmentVariableOrExitProcess('EVENTS_DATABASE_USER_NAME');
        var events_database_host_name = this.getEnvironmentVariableOrExitProcess('EVENTS_DATABASE_HOST_NAME');
        var events_database_name = this.getEnvironmentVariableOrExitProcess('EVENTS_DATABASE_NAME');
        var events_database_password = this.getEnvironmentVariableOrExitProcess('EVENTS_DATABASE_PASSWORD');
        var events_database_port = this.getEnvironmentVariableOrExitProcess('EVENTS_DATABASE_PORT');
        this.pool = new pg_1.Pool({
            user: events_database_user_name,
            host: events_database_host_name,
            database: events_database_name,
            password: events_database_password,
            port: Number(events_database_port)
        });
        this.pool.connect(function (err) {
            if (err) {
                console.error("Error connecting to Event Store", err);
                throw err;
            }
            else {
                console.log("Connected to Event Store");
            }
        });
    };
    EventStoreRepository.getInstance = function () {
        if (lodash_1.default.isNil(instance)) {
            instance = new EventStoreRepository();
            instance.connect();
        }
        return instance;
    };
    return EventStoreRepository;
}());
exports.EventStoreRepository = EventStoreRepository;
//# sourceMappingURL=eventStoreRepository.js.map