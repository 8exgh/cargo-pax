import puppeteer, {Browser} from "puppeteer";

export class BrowserAutomation {
    private browser: Browser;

    constructor() {
        this.browser = null;
    }
    async launch(): Promise<void> {
        this.browser = await puppeteer.launch({headless:false});
    }

    isLaunched():boolean {
        return this.browser !== null;
    }

    private async delay(ms: number): Promise<void>  {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async getHtmlFromUrl(url: string) {
        if(this.browser) {
            await this.browser.close();
            await this.launch();
        }
        const page = await this.browser.newPage();
        // const client = await page.target().createCDPSession();
        // await client.send('Network.clearBrowserCookies');
        // await client.send('Network.clearBrowserCache');
        await page.goto(url);
        // await this.delay(5000);
        await new Promise(resolve => setTimeout(resolve, 3000));
        const bodyHandle = await page.$('body');
        const html = await page.evaluate(body => body.innerHTML, bodyHandle);
        await bodyHandle.dispose();
        console.log(`***html ${JSON.stringify(html)}`);
        const content = html;
        // await page.close();
        return content;
    }
}