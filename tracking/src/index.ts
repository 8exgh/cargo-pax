import dotenv from 'dotenv';
import {TrackerHtmlAnalyzer} from "./tracking/trackerHtmlAnalyzer.js";
import {BrowserAutomation} from "./tracking/browserAutomation.js";
import dayjs from "dayjs";


dotenv.config();

console.log(process.env);

interface TrackerRefreshRequest {
    account_id: string;
    url: string;
    priority: number;
    event_order: number;
}

interface update_tracking_shipment_status_command  {
    command_name: string;
    aggregate_id: string;
    url: string;
    estimated_delivery_date: string;
    delivered_on_date: string;
    is_delivered: boolean;
    is_error: boolean;
    error_message: string;
}



const browserAutomation = new BrowserAutomation();
const trackerHtmlAnalyzer = new TrackerHtmlAnalyzer();


// const app = express();
// app.use(cors(), express.json());



// app.get('/', (req, res) => {
//     res.send('Well done, goood sir 3!');
// });

// app.patch('/tracking',asyncWrapper(async (req, res) => {
//
//
// }));

// app.patch('/open-ai-testing-1237127323781212678',asyncWrapper(async (req, res) => {
//     const samplePath = path.join(__dirname, "tracking/stripped.txt")
//     const sampleContent = fs.readFileSync(samplePath, "utf8");
//
//     const result = await trackerHtmlAnalyzer.processPage(sampleContent);
//
//     console.log('***result', result);
//
//     res.status(200).json({ message: 'started tracking'});
// }));


// app.use((err, req, res, next) => {
//     console.error(err.stack); // Log the error stack for debugging purposes
//
//     res.status(500).json({ message: 'Internal Server Error' });
// });

// const portAsString =  getEnvironmentVariable(EnvironmentVariables.ExpressPortNumber);
//
// const port = Number(portAsString);

// app.listen(port, () => {
//     console.log(`The application is listening on port ${port}!`);})






async function doForever(): Promise<void> {
    while(true) {

        const response = await fetch(`http://localhost:3030/refresh-requests`);
        let refreshRequests: TrackerRefreshRequest[];
        if (response.ok) {
            refreshRequests = await response.json() as TrackerRefreshRequest[];
        } else {
            console.error(`Error occurred`);
            throw new Error('Error occured...');
        }

        if(refreshRequests.length === 0) {
            console.log("No tracker urls requiring refresh.")
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }

        refreshRequests.sort((a, b) => {
            if (a.priority !== b.priority) {
                return b.priority - a.priority;
            }
            return b.event_order - a.event_order;
        });


        const highestPriorityTracker = refreshRequests[0];

        if (!browserAutomation.isLaunched()) {
            await browserAutomation.launch();
        }
        const html = await browserAutomation.getHtmlFromUrl(highestPriorityTracker.url);
        //const html = await browserAutomation.getHtmlFromUrl('https://pypi.org/project/pyppeteer/');
        console.log('***html length', html.length);

        const result = await trackerHtmlAnalyzer.processPage(html);

        console.log(`***result from scraping page: ${highestPriorityTracker.account_id}, and ${highestPriorityTracker.url} \n\n`, result);

        let isError = false;
        let errorMessage = '';
        let deliveredOnDate = dayjs(result.deliveredOnDate);
        deliveredOnDate =  deliveredOnDate.year(dayjs().year()) //TODO: hack
        const deliveredOnDateFormattedYYYYMMDD =        deliveredOnDate.isValid() ? deliveredOnDate.format('YYYY-MM-DD') : '';
        const isDelivered = deliveredOnDate.isValid();

        if(result.errorMessage && result.errorMessage.length > 0 && typeof(result.errorMessage) === "string") {
            errorMessage = result.errorMessage;
        }

        let estimatedDeliveryDateFormattedYYYYMMDD: string = '';
        if(!isDelivered) {
            let estimatedDeliveryDate = dayjs(result.estimatedDeliveryDate);
            estimatedDeliveryDate =  estimatedDeliveryDate.year(dayjs().year()) //TODO: hack
            if(estimatedDeliveryDate.isValid()) {
                estimatedDeliveryDateFormattedYYYYMMDD = estimatedDeliveryDate.format('YYYY-MM-DD');
            } else {
                isError = true;
            }
        }

        if((errorMessage === null || errorMessage === '') && isError) {
            errorMessage = "Neither a delivered date or estimated delivery could be extracted."
        }

        const update_tracking_shipment_status_command_instance: update_tracking_shipment_status_command = {
            command_name: "update_tracking_shipment_status_command",
            aggregate_id: highestPriorityTracker.account_id,
            url: highestPriorityTracker.url,
            delivered_on_date: deliveredOnDateFormattedYYYYMMDD,
            estimated_delivery_date: estimatedDeliveryDateFormattedYYYYMMDD,
            is_delivered: isDelivered,
            is_error: isError,
            error_message: errorMessage
        };

        const updateTrackerStatusResponse = await fetch('http://localhost:9090/handle', {
            method: 'POST',
            body: JSON.stringify(update_tracking_shipment_status_command_instance)
        });

        if(updateTrackerStatusResponse.status === 201) {
            console.log(`Updated the tracker status for ${highestPriorityTracker.account_id}, and ${highestPriorityTracker.url}`);
        } else {
            console.error(`Error occurred invoking command handler; exiting`);
            process.exit(1);
        }


    }
}

doForever().catch((e) => console.error(`***CRASHED: ${e}`));

