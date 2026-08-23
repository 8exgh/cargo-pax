import dotenv from 'dotenv';
import { BrowserAutomation } from "./tracking/browserAutomation.js";
import { TrackerHtmlAnalyzer } from "./tracking/trackerHtmlAnalyzer.js";
dotenv.config();
console.log(process.env);
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
while (true) {
    const response = await fetch(`http://localhost:3030/refresh-requests`);
    let refreshRequests;
    if (response.ok) {
        refreshRequests = await response.json();
    }
    else {
        console.error(`Error occurred`);
        throw new Error('Error occured...');
    }
    if (refreshRequests.length === 0) {
        console.log("No tracker urls requiring refresh.");
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
    console.log('***result', result);
}
//# sourceMappingURL=index.js.map