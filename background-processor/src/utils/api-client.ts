import fetch from 'node-fetch';
import type { DeliveryCompany } from './carrier.js';

function getApiUrl(): string {
  const API_URL = process.env.NEXTJS_API_URL || 'http://localhost:3000';
  return API_URL;
}

function getApiKey(): string {
  const API_KEY = process.env.NEXTJS_API_KEY || '';
  return API_KEY;
}

function headers(): Record<string, string> {
  return { 'X-API-Key': getApiKey(), 'Content-Type': 'application/json' };
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${getApiUrl()}${path}`, { headers: headers() });
  if (!response.ok) {
    throw new Error(`GET ${path} failed: ${response.status} ${response.statusText}`);
  }
  return await response.json() as T;
}

async function post(path: string, body: object): Promise<{ status: number; body: any }> {
  const response = await fetch(`${getApiUrl()}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  const text = await response.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: response.status, body: parsed };
}

function expectCreated(path: string, result: { status: number; body: any }): void {
  if (result.status !== 201) {
    throw new Error(`POST ${path} failed: ${result.status} ${JSON.stringify(result.body)}`);
  }
}

/* ---- tracker refresh ---- */

export interface TrackerRefreshRequest {
  tenantId: string;
  trackerId: string;
  url: string;
  company: DeliveryCompany;
  trackingNumber: string;
  priority: number;
  requestedAt: number;
  hasLabelCreatedValue: boolean;
  hasOnTheWayValue: boolean;
  hasOutForDeliveryValue: boolean;
}

export interface UpdateTrackingShipmentStatusCommand {
  tenantId: string;
  trackerId: string;
  estimatedDeliveryDate: string;
  labelCreatedOnDate: string;
  onTheWayDate: string;
  outForDeliveryDate: string;
  deliveredOnDate: string;
  errorMessage: string;
}

// Every tracker waiting on a refresh, across all accounts, best first
export async function getRefreshRequests(): Promise<TrackerRefreshRequest[]> {
  const data = await get<{ requests: TrackerRefreshRequest[] }>('/api/queries/refresh-requests');
  return data.requests;
}

export async function updateTrackingShipmentStatus(command: UpdateTrackingShipmentStatusCommand): Promise<void> {
  expectCreated('/api/commands/update-tracking-shipment-status', await post('/api/commands/update-tracking-shipment-status', command));
}

/* ---- inbox poll ---- */

export interface MailboxToPoll {
  tenantId: string;
  address: string;
  password: string;
  lastUid: number;
  uidValidity: number | null;
}

export interface RecordEmailMessageReceivedCommand {
  tenantId: string;
  messageId: string;
  uid: number;
  uidValidity: number;
  subject: string;
  from: string;
  to: string;
  receivedAt: number;
  text: string;
  html: string;
}

export async function getMailboxesToPoll(): Promise<MailboxToPoll[]> {
  const data = await get<{ mailboxes: MailboxToPoll[] }>('/api/queries/mailboxes-to-poll');
  return data.mailboxes;
}

export async function recordEmailMessageReceived(command: RecordEmailMessageReceivedCommand): Promise<boolean> {
  const result = await post('/api/commands/record-email-message-received', command);
  expectCreated('/api/commands/record-email-message-received', result);
  return Boolean(result.body?.recorded);
}

/* ---- email processing ---- */

export interface EmailMessageToProcess {
  tenantId: string;
  messageId: string;
  subject: string;
  from: string;
}

export interface EmailMessageContent {
  messageId: string;
  subject: string;
  from: string;
  to: string;
  receivedAt: number;
  text: string;
  html: string;
}

export interface StartTrackingShipmentCommand {
  tenantId: string;
  url: string;
  shipmentCompany: DeliveryCompany;
  trackingNumber: string;
  label?: string;
  messageId: string;
}

export async function getEmailMessagesToProcess(): Promise<EmailMessageToProcess[]> {
  const data = await get<{ messages: EmailMessageToProcess[] }>('/api/queries/email-messages-to-process');
  return data.messages;
}

export async function getEmailMessageContent(tenantId: string, messageId: string): Promise<EmailMessageContent> {
  return get<EmailMessageContent>(
    `/api/queries/email-message-content?tenantId=${encodeURIComponent(tenantId)}&messageId=${encodeURIComponent(messageId)}`
  );
}

// Returns the new tracker id, or null when the app already tracks that
// shipment (409), which is not an error for a forwarded email.
export async function startTrackingShipment(command: StartTrackingShipmentCommand): Promise<string | null> {
  const result = await post('/api/commands/start-tracking-shipment', command);
  if (result.status === 409) {
    return null;
  }
  expectCreated('/api/commands/start-tracking-shipment', result);
  return result.body?.trackerId ?? null;
}

export async function markEmailMessageAsProcessed(tenantId: string, messageId: string, trackerIds: string[], note: string): Promise<void> {
  const result = await post('/api/commands/mark-email-message-as-processed', { tenantId, messageId, trackerIds, note });
  if (result.status === 409) {
    return; // processed meanwhile
  }
  expectCreated('/api/commands/mark-email-message-as-processed', result);
}
