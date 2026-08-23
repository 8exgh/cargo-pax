import type { ShipmentJourney } from './tracker-html-analyzer.js';
import type { UpdateTrackingShipmentStatusCommand } from './api-client.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// Accepts YYYY-MM-DD only, and only if it is a real calendar date
export function normalizeIsoDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const trimmed = value.trim().slice(0, 10);
  if (!ISO_DATE.test(trimmed)) {
    return '';
  }
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || !parsed.toISOString().startsWith(trimmed)) {
    return '';
  }
  return trimmed;
}

// Turns the journey the model reported into the command the app accepts.
// Pure, so the edge cases are unit-tested without a browser or an API key.
export function toStatusCommand(
  tenantId: string,
  trackerId: string,
  journey: ShipmentJourney,
  today: string = new Date().toISOString().slice(0, 10)
): UpdateTrackingShipmentStatusCommand {
  const blank = {
    tenantId,
    trackerId,
    estimatedDeliveryDate: '',
    labelCreatedOnDate: '',
    onTheWayDate: '',
    outForDeliveryDate: '',
    deliveredOnDate: '',
    errorMessage: ''
  };

  const pageError = journey.errorMessage && journey.errorMessage.trim().length > 0 ? journey.errorMessage.trim() : '';
  if (!journey.isTrackingPage || pageError) {
    return { ...blank, errorMessage: pageError || 'The page did not look like a tracking result.' };
  }

  // Some carrier pages say "Delivered" without a date (UPS's own sample
  // number does). The delivery is certain; the day we first saw it is the
  // best date there is.
  const deliveredOnDate = journey.isDelivered ? normalizeIsoDate(journey.deliveredOn) || today : '';

  const command: UpdateTrackingShipmentStatusCommand = {
    ...blank,
    labelCreatedOnDate: normalizeIsoDate(journey.labelCreatedOn),
    onTheWayDate: normalizeIsoDate(journey.onTheWaySince),
    outForDeliveryDate: normalizeIsoDate(journey.outForDeliveryOn),
    estimatedDeliveryDate: deliveredOnDate ? '' : normalizeIsoDate(journey.estimatedDeliveryDate),
    deliveredOnDate
  };

  const anyDate = [command.labelCreatedOnDate, command.onTheWayDate, command.outForDeliveryDate, command.estimatedDeliveryDate, command.deliveredOnDate]
    .some(d => d.length > 0);
  if (!anyDate) {
    return { ...blank, errorMessage: 'No dates could be read from the tracking page.' };
  }
  return command;
}

export function errorCommand(tenantId: string, trackerId: string, message: string): UpdateTrackingShipmentStatusCommand {
  return {
    tenantId,
    trackerId,
    estimatedDeliveryDate: '',
    labelCreatedOnDate: '',
    onTheWayDate: '',
    outForDeliveryDate: '',
    deliveredOnDate: '',
    errorMessage: message
  };
}
