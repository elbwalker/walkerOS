import type {
  ActionSource,
  ConversionEvent,
  DataType,
  PushFn,
  RequestBody,
  StandardEventType,
  UserData,
} from './types';
import type {
  Collector,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@walkeros/core';
import {
  createMappingRoot,
  getMappingValue,
  isObject,
  StepError,
} from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import {
  hashList,
  normalizeEmail,
  normalizeExternalId,
  normalizePhone,
  toList,
} from './hash';

const DEFAULT_URL = 'https://bzr.openai.com/v1/events';

// Each standard event type and the shape of its `data` object.
const STANDARD_TYPES: Record<StandardEventType, DataType> = {
  appointment_scheduled: 'customer_action',
  checkout_started: 'contents',
  contents_viewed: 'contents',
  items_added: 'contents',
  lead_created: 'customer_action',
  order_created: 'contents',
  page_viewed: 'contents',
  registration_completed: 'customer_action',
  subscription_created: 'plan_enrollment',
  trial_started: 'plan_enrollment',
};

const CUSTOM_NAME = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;

function isStandardType(name: string): name is StandardEventType {
  return Object.prototype.hasOwnProperty.call(STANDARD_TYPES, name);
}

const text = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

// Currency units to integer minor units (2 decimals for EUR/USD, 0 for JPY).
function minorUnits(amount: number, currency: string): number {
  const digits = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions().maximumFractionDigits;
  return Math.round(amount * 10 ** (digits ?? 2));
}

function inputError(message: string, code = 'mapping'): StepError {
  return new StepError(message, { code, retryable: false });
}

/**
 * The mapped event name is the OpenAI event type (spaces become `_`). A
 * name that is not a standard type is sent as a custom event.
 */
function eventType(name: string): {
  type: StandardEventType | 'custom';
  custom_event_name?: string;
} {
  const normalized = name.trim().replace(/ /g, '_').toLowerCase();
  if (isStandardType(normalized)) return { type: normalized };
  if (!CUSTOM_NAME.test(normalized))
    throw inputError(
      `OpenAI Ads custom event name "${name}" is invalid (lowercase letters, digits, _ and -)`,
    );
  return { type: 'custom', custom_event_name: normalized };
}

async function buildEvent(
  event: WalkerOS.Event,
  data: Record<string, unknown>,
  actionSource: ActionSource,
  client: { ip?: string; userAgent?: string },
): Promise<ConversionEvent> {
  const { type, custom_event_name } = eventType(event.name);
  const dataType: DataType =
    type === 'custom' ? 'custom' : STANDARD_TYPES[type];

  const sourceUrl = text(data.source_url) ?? text(event.source?.url);
  if (actionSource === 'web' && !/^https?:\/\/[^/]+/.test(sourceUrl ?? ''))
    throw inputError('OpenAI Ads web event needs a source_url');

  const currency = text(data.currency)?.toUpperCase();
  const rawAmount = data.amount;
  const amount =
    rawAmount === undefined || rawAmount === null || rawAmount === ''
      ? undefined
      : Number(rawAmount);
  if (amount !== undefined && (!Number.isFinite(amount) || amount < 0))
    throw inputError('OpenAI Ads amount must be a positive number');
  if (amount !== undefined && !currency)
    throw inputError('OpenAI Ads amount needs a currency');

  const countries = toList(data.country)
    .slice(0, 3)
    .map((country) => country.toUpperCase());

  const user: UserData = withoutUndefined({
    emails_sha256: await hashList(data.email, normalizeEmail),
    phone_numbers_sha256: await hashList(data.phone, normalizePhone),
    external_ids_sha256: await hashList(data.external_id, normalizeExternalId),
    obref: text(data.obref),
    countries: countries.length ? countries : undefined,
    user_agent: text(data.user_agent) ?? client.userAgent,
    ip_address: text(data.ip_address) ?? client.ip,
  });

  return withoutUndefined({
    id: String(event.id),
    type,
    custom_event_name,
    timestamp_ms: Math.round(Number(event.timestamp) || Date.now()),
    oppref: text(data.oppref),
    source_url: sourceUrl,
    action_source: actionSource,
    user: Object.keys(user).length ? user : undefined,
    data: withoutUndefined({
      type: dataType,
      amount:
        amount !== undefined && currency
          ? minorUnits(amount, currency)
          : undefined,
      currency: amount !== undefined ? currency : undefined,
      plan_id:
        dataType === 'plan_enrollment' || dataType === 'custom'
          ? text(data.plan_id)
          : undefined,
    }),
  });
}

// A silent rule has no OpenAI Ads call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (
  event,
  { config, data, ingest, env, logger, collector },
) {
  const {
    apiKey,
    pixelId,
    action_source = 'web',
    validate_only,
    integration_source,
    url = DEFAULT_URL,
    ip,
    userAgent,
  } = config.settings ?? {};
  if (!apiKey || !pixelId)
    throw new StepError('OpenAI Ads settings missing, init() not run', {
      code: 'not-ready',
    });

  const root = createMappingRoot(ingest, event);
  const client = {
    ip: await resolveClient(ip, DEFAULT_IP, root, collector),
    userAgent: await resolveClient(
      userAgent,
      DEFAULT_USER_AGENT,
      root,
      collector,
    ),
  };

  const conversion = await buildEvent(
    event,
    isObject(data) ? data : {},
    action_source,
    client,
  );

  const body: RequestBody = withoutUndefined({
    validate_only: validate_only === true ? true : undefined,
    integration_source: text(integration_source),
    events: [conversion],
  });

  const endpoint = `${url.replace(/\/$/, '')}?pid=${encodeURIComponent(pixelId)}`;

  logger.debug('Calling OpenAI Ads Conversions API', {
    endpoint,
    method: 'POST',
    type: conversion.type,
    eventId: conversion.id,
  });

  const sendServerFn = env?.sendServer || sendServer;
  await sendServerFn(endpoint, JSON.stringify(body), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
};

const DEFAULT_IP: WalkerOSMapping.Value = ['ingest.ip', 'event.user.ip'];
const DEFAULT_USER_AGENT: WalkerOSMapping.Value = [
  'ingest.userAgent',
  'event.user.userAgent',
];

/** A client IP or user agent setting resolved to a non-empty string. */
async function resolveClient(
  setting: WalkerOSMapping.Value | false | undefined,
  fallback: WalkerOSMapping.Value,
  root: WalkerOSMapping.Root,
  collector: Collector.Instance,
): Promise<string | undefined> {
  if (setting === false) return undefined;
  const value = await getMappingValue(root, setting ?? fallback, { collector });
  return typeof value === 'string' && value !== '' ? value : undefined;
}
