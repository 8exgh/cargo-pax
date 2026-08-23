import { describe, expect, it, jest } from '@jest/globals';
import { formatLabel, TrackerHtmlAnalyzer, StructuredOutputClient } from './tracker-html-analyzer';

function fakeClient(parsed: object | null) {
  const parse = jest.fn(async (_params: any) => ({ output_parsed: parsed as any }));
  const client: StructuredOutputClient = { responses: { parse } };
  return { client, parse };
}

describe('TrackerHtmlAnalyzer.processPage', () => {
  it('sends the stripped page text with a structured output format and returns the journey', async () => {
    const { client, parse } = fakeClient({
      isTrackingPage: true, labelCreatedOn: '2026-08-20', onTheWaySince: '2026-08-21', outForDeliveryOn: null,
      estimatedDeliveryDate: '2026-08-30', isDelivered: false, deliveredOn: null, errorMessage: null
    });
    const analyzer = new TrackerHtmlAnalyzer(client);

    const result = await analyzer.processPage('<script>x</script><h1>Scheduled Delivery: Saturday 08/30</h1>', '2026-08-23');

    expect(result.estimatedDeliveryDate).toBe('2026-08-30');
    const params = parse.mock.calls[0][0] as any;
    expect(params.text.format.type).toBe('json_schema');
    expect(params.text.format.name).toBe('shipment_journey');
    expect(params.input[0].role).toBe('system');
    expect(params.input[0].content).toContain("Today's date is 2026-08-23");
    expect(params.input[1].content).toBe('Scheduled Delivery: Saturday 08/30');
  });

  it('does not call the model for an empty page', async () => {
    const { client, parse } = fakeClient(null);
    const result = await new TrackerHtmlAnalyzer(client).processPage('<div></div>');
    expect(parse).not.toHaveBeenCalled();
    expect(result.isTrackingPage).toBe(false);
    expect(result.errorMessage).toMatch(/empty/);
  });

  it('throws when the model returns nothing parseable', async () => {
    const { client } = fakeClient(null);
    await expect(new TrackerHtmlAnalyzer(client).processPage('<p>some page</p>')).rejects.toThrow(/no structured output/);
  });
});

describe('TrackerHtmlAnalyzer.computeLabel + formatLabel', () => {
  it('names the shipment from the email the way the original did', async () => {
    const { client } = fakeClient({ shippingCompanyName: 'UPS', fromCompanyName: 'Lee Valley', toCompanyName: 'Sean' });
    const label = await new TrackerHtmlAnalyzer(client).computeLabel('Your Lee Valley order has shipped via UPS');
    expect(formatLabel(label, 0, 1)).toBe('Lee Valley via UPS for Sean');
    expect(formatLabel(label, 1, 3)).toBe('Lee Valley via UPS for Sean. Package (2 of 3)');
  });

  it('is undefined without a label', () => {
    expect(formatLabel(null, 0, 1)).toBeUndefined();
  });
});
