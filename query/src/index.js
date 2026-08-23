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
var express_1 = __importDefault(require("express"));
var cors_1 = __importDefault(require("cors"));
var lodash_1 = __importDefault(require("lodash"));
var accountReadModel_1 = require("./readModels/account/accountReadModel");
var eventStoreRepository_1 = require("./repository/eventStoreRepository");
function errorMessage(message) {
    return { message: message };
}
function asyncWrapper(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
var eventStore = eventStoreRepository_1.EventStoreRepository.getInstance();
var readModel = accountReadModel_1.AccountReadModel.getInstance();
eventStore.getAllEventsAfterEventOrder(readModel.getCurrentEventOrder()).then(function (events) {
    readModel.build(events);
}).catch(function (err) {
    console.error("On startup, failed to build read model. Panicking. Error:", err);
    process.exit(1);
});
var app = (0, express_1.default)();
app.use((0, cors_1.default)(), express_1.default.json());
app.get('/', function (req, res) {
    res.send('Well done!');
});
app.get('/account/:id', asyncWrapper(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var accountId, readModel, account;
    return __generator(this, function (_a) {
        accountId = req.params.id;
        readModel = accountReadModel_1.AccountReadModel.getInstance();
        account = readModel.getAccount(accountId);
        if (lodash_1.default.isNil(account)) {
            res.status(404).json(errorMessage("Account not found"));
        }
        res.status(200).json(account);
        return [2 /*return*/];
    });
}); }));
app.get('/refresh-requests', asyncWrapper(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var readModel, refreshRequests;
    return __generator(this, function (_a) {
        readModel = accountReadModel_1.AccountReadModel.getInstance();
        refreshRequests = readModel.computeRefreshRequests();
        res.status(200).json(refreshRequests);
        return [2 /*return*/];
    });
}); }));
app.get('/read-model-version', asyncWrapper(function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var readModel, currentEventOrder, newEvents;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                readModel = accountReadModel_1.AccountReadModel.getInstance();
                currentEventOrder = readModel.getCurrentEventOrder();
                return [4 /*yield*/, eventStoreRepository_1.EventStoreRepository.getInstance().getAllEventsAfterEventOrder(currentEventOrder)];
            case 1:
                newEvents = _a.sent();
                readModel.build(newEvents);
                res.status(200).json({ event_order: readModel.getCurrentEventOrder() });
                return [2 /*return*/];
        }
    });
}); }));
app.use(function (err, req, res, next) {
    console.error(err.stack); // Log the error stack for debugging purposes
    res.status(500).json({ message: 'Internal Server Error' });
});
app.listen(3030, function () {
    console.log('The application is listening on port 3030!');
});
//# sourceMappingURL=index.js.map