import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { stripHtml } from './strip-html.js';

/* The language-model side of the scraper. The original asked TypeChat five
   separate questions per page (delivered? estimated date? label created?
   in transit? out for delivery?) against GPT-3.5; with structured outputs
   one call returns the whole journey. Dates are ISO and today's date is in
   the prompt, so no year guessing happens downstream. */

const ISO = 'as YYYY-MM-DD, or null';

export const ShipmentJourneySchema = z.object({
  isTrackingPage: z
    .boolean()
    .describe('True if the text is a carrier tracking result for one shipment; false for error pages, empty forms, "not found", access denied, or unrelated pages'),
  labelCreatedOn: z
    .string()
    .nullable()
    .describe(`When the shipment was created / label printed / carrier notified (the earliest event in the journey) ${ISO}`),
  onTheWaySince: z
    .string()
    .nullable()
    .describe(`When the package first started moving: picked up, in transit, departed origin, arrived at a facility ${ISO}`),
  outForDeliveryOn: z
    .string()
    .nullable()
    .describe(`The day the package was marked out for delivery / with the courier for delivery ${ISO}`),
  estimatedDeliveryDate: z
    .string()
    .nullable()
    .describe(`Estimated, scheduled or expected delivery date (first day of a window) ${ISO}; null once delivered`),
  isDelivered: z
    .boolean()
    .describe('True only if the page states the package has been delivered (not "rescheduled", "attempted", "available for pickup")'),
  deliveredOn: z
    .string()
    .nullable()
    .describe(`The delivery date when isDelivered ${ISO}`),
  errorMessage: z
    .string()
    .nullable()
    .describe('When isTrackingPage is false: a one-line reason (e.g. "Tracking number not found"); otherwise null')
});

export type ShipmentJourney = z.infer<typeof ShipmentJourneySchema>;

// The original's ShipmentTrackingLabel TypeChat schema
export const ShipmentTrackingLabelSchema = z.object({
  shippingCompanyName: z.string().describe('Best guess of the shipping carrier, such as FedEx, UPS, USPS, DHL, Canada Post, Purolator'),
  fromCompanyName: z.string().describe('Best guess at who the package is from (the vendor or store, not the carrier)'),
  toCompanyName: z.string().describe('Best guess at who the package is being sent to; the recipient name or their email domain if unsure')
});

export type ShipmentTrackingLabel = z.infer<typeof ShipmentTrackingLabelSchema>;

export function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL || 'gpt-5.4-mini';
}

// The one call the analyzer makes, so tests can hand in a fake client
export interface StructuredOutputClient {
  responses: {
    parse(params: any): Promise<{ output_parsed: any }>;
  };
}

function journeyPrompt(today: string): string {
  return [
    'You read the plain text of a parcel carrier tracking page (UPS, FedEx, USPS, DHL, Canada Post, Purolator) or of a search engine\'s package-tracking answer box, and report the shipment journey.',
    `Today's date is ${today}. Dates on the page often omit the year: resolve them to the nearest sensible date (a scheduled delivery is in the near future, an event that already happened is in the recent past).`,
    'Report each stage only if the page states it; never invent dates. A delivered shipment has isDelivered=true, deliveredOn set and estimatedDeliveryDate null.',
    'If the text is not a tracking result at all (tracking number not found, invalid, error, access denied, empty form, unrelated page), set isTrackingPage=false with a short errorMessage and every date null.'
  ].join('\n');
}

function labelPrompt(today: string): string {
  return [
    'You read the text of an email a customer forwarded because it contains shipment tracking links (an order confirmation or shipping notice).',
    `Today's date is ${today}.`,
    'Name the carrier, the vendor the package is from, and who it is for. Keep each to a few words.'
  ].join('\n');
}

export class TrackerHtmlAnalyzer {
  private client: StructuredOutputClient | null;

  constructor(client?: StructuredOutputClient) {
    this.client = client ?? null;
  }

  private getClient(): StructuredOutputClient {
    if (this.client) {
      return this.client;
    }
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not defined');
    }
    this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) as unknown as StructuredOutputClient;
    return this.client;
  }

  // Renders the page to text and asks the model for the whole journey
  async processPage(html: string, today: string = new Date().toISOString().slice(0, 10)): Promise<ShipmentJourney> {
    const text = stripHtml(html);
    console.log(`[Analyzer] page text: ${html.length} chars of html -> ${text.length} chars of text`);

    if (text.trim().length === 0) {
      return {
        isTrackingPage: false,
        labelCreatedOn: null,
        onTheWaySince: null,
        outForDeliveryOn: null,
        estimatedDeliveryDate: null,
        isDelivered: false,
        deliveredOn: null,
        errorMessage: 'The tracking page was empty'
      };
    }

    const response = await this.getClient().responses.parse({
      model: getOpenAiModel(),
      reasoning: { effort: 'low' },
      input: [
        { role: 'system', content: journeyPrompt(today) },
        { role: 'user', content: text }
      ],
      text: { format: zodTextFormat(ShipmentJourneySchema, 'shipment_journey') }
    });

    if (!response.output_parsed) {
      throw new Error('The model returned no structured output');
    }
    return response.output_parsed as ShipmentJourney;
  }

  // Names the shipment from the forwarded email (the original's compute_label)
  async computeLabel(emailText: string, today: string = new Date().toISOString().slice(0, 10)): Promise<ShipmentTrackingLabel | null> {
    const text = emailText.trim().slice(0, 15000);
    if (!text) {
      return null;
    }
    const response = await this.getClient().responses.parse({
      model: getOpenAiModel(),
      reasoning: { effort: 'low' },
      input: [
        { role: 'system', content: labelPrompt(today) },
        { role: 'user', content: text }
      ],
      text: { format: zodTextFormat(ShipmentTrackingLabelSchema, 'shipment_tracking_label') }
    });
    return (response.output_parsed as ShipmentTrackingLabel | null) ?? null;
  }
}

export function formatLabel(label: ShipmentTrackingLabel | null, index: number, total: number): string | undefined {
  if (!label) {
    return undefined;
  }
  const from = label.fromCompanyName?.trim();
  const via = label.shippingCompanyName?.trim();
  const to = label.toCompanyName?.trim();
  const parts = [from || 'Package', via ? `via ${via}` : '', to ? `for ${to}` : ''].filter(Boolean).join(' ');
  return total > 1 ? `${parts}. Package (${index + 1} of ${total})` : parts;
}
