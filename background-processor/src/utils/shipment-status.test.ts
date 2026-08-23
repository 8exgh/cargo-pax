import { describe, expect, it } from '@jest/globals';
import { normalizeIsoDate, toStatusCommand } from './shipment-status';
import type { ShipmentJourney } from './tracker-html-analyzer';

const tenantId = '00000000-0000-4000-8000-000000000001';
const trackerId = '00000000-0000-4000-8000-000000000002';

function journey(overrides: Partial<ShipmentJourney>): ShipmentJourney {
  return {
    isTrackingPage: true,
    labelCreatedOn: null,
    onTheWaySince: null,
    outForDeliveryOn: null,
    estimatedDeliveryDate: null,
    isDelivered: false,
    deliveredOn: null,
    errorMessage: null,
    ...overrides
  };
}

describe('normalizeIsoDate', () => {
  it('accepts real YYYY-MM-DD dates', () => {
    expect(normalizeIsoDate('2026-08-30')).toBe('2026-08-30');
  });

  it('rejects anything else', () => {
    expect(normalizeIsoDate(null)).toBe('');
    expect(normalizeIsoDate('')).toBe('');
    expect(normalizeIsoDate('Aug 30')).toBe('');
    expect(normalizeIsoDate('2026-02-30')).toBe('');
    expect(normalizeIsoDate('30/08/2026')).toBe('');
  });

  it('tolerates a trailing time', () => {
    expect(normalizeIsoDate('2026-08-30T00:00:00Z')).toBe('2026-08-30');
  });
});

describe('toStatusCommand', () => {
  it('maps the whole journey', () => {
    const command = toStatusCommand(tenantId, trackerId, journey({
      labelCreatedOn: '2026-08-20',
      onTheWaySince: '2026-08-21',
      outForDeliveryOn: null,
      estimatedDeliveryDate: '2026-08-30'
    }));
    expect(command).toEqual({
      tenantId, trackerId,
      labelCreatedOnDate: '2026-08-20',
      onTheWayDate: '2026-08-21',
      outForDeliveryDate: '',
      estimatedDeliveryDate: '2026-08-30',
      deliveredOnDate: '',
      errorMessage: ''
    });
  });

  it('reports a delivery and drops any estimate', () => {
    const command = toStatusCommand(tenantId, trackerId, journey({
      estimatedDeliveryDate: '2026-08-30',
      isDelivered: true,
      deliveredOn: '2026-08-28',
      outForDeliveryOn: '2026-08-28'
    }));
    expect(command.deliveredOnDate).toBe('2026-08-28');
    expect(command.outForDeliveryDate).toBe('2026-08-28');
    expect(command.estimatedDeliveryDate).toBe('');
    expect(command.errorMessage).toBe('');
  });

  it('ignores a delivered date when the page does not say delivered', () => {
    const command = toStatusCommand(tenantId, trackerId, journey({ deliveredOn: '2026-08-28', estimatedDeliveryDate: '2026-08-30' }));
    expect(command.deliveredOnDate).toBe('');
    expect(command.estimatedDeliveryDate).toBe('2026-08-30');
  });

  it('uses the observation date when delivered without a readable date', () => {
    const command = toStatusCommand(tenantId, trackerId, journey({ isDelivered: true, deliveredOn: 'yesterday' }), '2026-08-23');
    expect(command.errorMessage).toBe('');
    expect(command.deliveredOnDate).toBe('2026-08-23');
  });

  it('is an error when no date at all could be read', () => {
    const command = toStatusCommand(tenantId, trackerId, journey({}));
    expect(command.errorMessage).toMatch(/No dates/);
  });

  it('passes the page error through and drops dates', () => {
    const command = toStatusCommand(tenantId, trackerId, journey({
      isTrackingPage: false,
      estimatedDeliveryDate: '2026-08-30',
      errorMessage: 'Tracking number not found'
    }));
    expect(command.errorMessage).toBe('Tracking number not found');
    expect(command.estimatedDeliveryDate).toBe('');
  });

  it('treats a non-tracking page without a reason as an error', () => {
    const command = toStatusCommand(tenantId, trackerId, journey({ isTrackingPage: false, estimatedDeliveryDate: '2026-08-30' }));
    expect(command.errorMessage).toMatch(/did not look like/);
  });
});
