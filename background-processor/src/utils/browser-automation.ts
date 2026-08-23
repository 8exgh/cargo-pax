import puppeteer, { Browser } from 'puppeteer';

// Carrier tracking pages render client-side, so a real browser fetches
// them. One browser stays open across cycles; every page gets a fresh
// incognito context so no cookies or storage leak between lookups.
export class BrowserAutomation {
  private browser: Browser | null = null;

  private headless(): boolean {
    return (process.env.PUPPETEER_HEADLESS || 'true').toLowerCase() !== 'false';
  }

  async launch(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: this.headless(),
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        // Containers run as an unprivileged user without a user namespace
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });
    this.browser.on('disconnected', () => {
      this.browser = null;
    });
  }

  isLaunched(): boolean {
    return this.browser !== null && this.browser.connected;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close().catch(() => undefined);
      this.browser = null;
    }
  }

  // Returns the rendered <body> of the page after it settles
  async getHtmlFromUrl(url: string, settleMs: number = 3000): Promise<string> {
    const result = await this.getHtmlFromUrlBySelector(url, 'body', settleMs);
    return result.html ?? '';
  }

  // Returns the rendered html of one element, or null when the selector
  // never shows up (the original's getHtmlFromUrlBySelector, used for the
  // search engine's package-tracking answer box).
  async getHtmlFromUrlBySelector(
    url: string,
    cssSelector: string,
    settleMs: number = 3000,
    selectorTimeoutMs: number = 15000
  ): Promise<{ html: string | null; navigationError: string | null }> {
    if (!this.isLaunched()) {
      await this.launch();
    }
    const context = await this.browser!.createBrowserContext();
    try {
      const page = await context.newPage();
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
      );
      await page.setViewport({ width: 1280, height: 900 });
      let navigationError: string | null = null;
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 }).catch(error => {
        // A never-idle page (live chat widgets, analytics) still has content;
        // a DNS failure or refused connection does not
        const message = String(error?.message || error);
        if (/ERR_NAME_NOT_RESOLVED|ERR_CONNECTION|ERR_INVALID_URL|ERR_ABORTED/.test(message)) {
          navigationError = message;
        } else {
          console.warn(`[Browser] goto did not settle for ${url}: ${message}`);
        }
      });
      if (navigationError) {
        return { html: null, navigationError };
      }
      const element = cssSelector === 'body'
        ? await page.$('body')
        : await page.waitForSelector(cssSelector, { timeout: selectorTimeoutMs }).catch(() => null);
      if (!element) {
        return { html: null, navigationError: null };
      }
      await new Promise(resolve => setTimeout(resolve, settleMs));
      try {
        return { html: await page.evaluate(el => el.innerHTML, element), navigationError: null };
      } finally {
        await element.dispose();
      }
    } finally {
      await context.close().catch(() => undefined);
    }
  }
}
