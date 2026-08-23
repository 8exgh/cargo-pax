import express from 'express';
import cors from 'cors';
import _ from "lodash";
import {AccountReadModel} from "./readModels/account/accountReadModel";
import {EventStoreRepository} from "./repository/eventStoreRepository";

type ErrorMessage = {
    message: string;
}
function errorMessage(message:string): ErrorMessage {
    return { message };
}

function asyncWrapper(fn) {
    return function(req,res,next){
        Promise.resolve(fn(req,res,next)).catch(next);
    }
}

const eventStore = EventStoreRepository.getInstance();
const readModel = AccountReadModel.getInstance();
eventStore.getAllEventsAfterEventOrder(readModel.getCurrentEventOrder()).then(events => {
    readModel.build(events);
}).catch(err => {
    console.error(`On startup, failed to build read model. Panicking. Error:`, err);
    process.exit(1);
 });



const app = express();
app.use(cors(), express.json());



app.get('/', (req, res) => {
    res.send('Well done!');
});

app.get('/account/:id',asyncWrapper(async (req, res) => {
    let accountId = req.params.id;

    const readModel = AccountReadModel.getInstance();
    const account = readModel.getAccount(accountId);

    if(_.isNil(account)) {
        res.status(404).json(errorMessage("Account not found"));
    }

    res.status(200).json(account);
}));

app.get('/refresh-requests',asyncWrapper(async (req, res) => {
    const readModel = AccountReadModel.getInstance();
    const refreshRequests = readModel.computeRefreshRequests();

    res.status(200).json(refreshRequests);
}));

app.get('/read-model-version', asyncWrapper(async (req, res) => {
    const readModel = AccountReadModel.getInstance();
    const currentEventOrder = readModel.getCurrentEventOrder();
    const newEvents = await EventStoreRepository.getInstance().getAllEventsAfterEventOrder(currentEventOrder);
    readModel.build(newEvents);

    res.status(200).json({ event_order: readModel.getCurrentEventOrder() });
}));

app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error stack for debugging purposes

    res.status(500).json({ message: 'Internal Server Error' });
});

app.listen(3030, () => {
    console.log('The application is listening on port 3030!');})