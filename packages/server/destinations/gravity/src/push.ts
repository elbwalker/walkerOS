import type {
  ConversionEvent,
  CustomData,
  PushFn,
  RequestBody,
  UserData,
} from './types';
import { CLICK_KEYS } from './types';
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
import { getHashServer, sendServer } from '@walkeros/server-core';

const DEFAULT_URL = 'https://api.trygravity.com/gateway/events';
const SHA256_HEX = /^[a-f0-9]{64}$/;

const text = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return typeof value === 'string' && value.trim() !== ''
    ? value.trim()
    : undefined;
};

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

function toList(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.map(text).filter((item): item is string => !!item);
}

/** Normalised and SHA-256 hashed; an existing SHA-256 hex digest is kept. */
async function hashList(
  value: unknown,
  normalize: (value: string) => string,
): Promise<string[] | undefined> {
  const hashed = await Promise.all(
    toList(value).map(async (item) => {
      const digest = item.toLowerCase();
      if (SHA256_HEX.test(digest)) return digest;
      const normalized = normalize(item);
      return normalized ? getHashServer(normalized) : undefined;
    }),
  );
  // Values that normalise to nothing (a phone without digits) are dropped.
  const unique = [...new Set(hashed.filter((item): item is string => !!item))];
  return unique.length ? unique : undefined;
}

function inputError(message: string): StepError {
  return new StepError(message, { code: 'mapping', retryable: false });
}

async function buildEvent(
  event: WalkerOS.Event,
  data: Record<string, unknown>,
  actionSource: string,
  client: { ip?: string; userAgent?: string },
): Promise<ConversionEvent> {
  const value =
    data.value === undefined || data.value === null || data.value === ''
      ? undefined
      : Number(data.value);
  if (value !== undefined && (!Number.isFinite(value) || value < 0))
    throw inputError('Gravity value must be a positive number');
  const currency = text(data.currency)?.toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency))
    throw inputError('Gravity currency must be a 3-letter code');

  const externalIds = toList(data.external_id);
  const clicks = Object.fromEntries(
    CLICK_KEYS.map((key) => [key, text(data[key])]),
  );
  const userData: UserData = withoutUndefined({
    em: await hashList(data.email, (item) => item.trim().toLowerCase()),
    ph: await hashList(data.phone, (item) => item.replace(/\D/g, '')),
    external_id: externalIds.length ? externalIds : undefined,
    client_ip_address: text(data.ip_address) ?? client.ip,
    client_user_agent: text(data.user_agent) ?? client.userAgent,
    ...clicks,
  });

  const orderId = text(data.order_id);
  const customData: CustomData | undefined =
    value !== undefined || orderId
      ? withoutUndefined({
          value,
          currency: value !== undefined ? (currency ?? 'USD') : undefined,
          order_id: orderId,
        })
      : undefined;

  return withoutUndefined({
    event_name: event.name,
    event_time: Math.floor((Number(event.timestamp) || Date.now()) / 1000),
    event_id: String(event.id).slice(0, 128),
    action_source: actionSource,
    event_source_url: text(data.source_url) ?? text(event.source?.url),
    user_data: userData,
    client_context: isObject(data.client_context)
      ? data.client_context
      : undefined,
    custom_data: customData,
  });
}

/** Gravity answers 200 with a status per event: `error` is a rejection. */
function checkResponse(data: unknown): void {
  if (!isObject(data) || !Array.isArray(data.results)) return;
  const result: unknown = data.results[0];
  if (isObject(result) && result.status === 'error')
    throw new StepError(
      `Gravity rejected the event: ${String(result.error ?? '')}`,
      { code: 'transport', retryable: false, body: data },
    );
}

// A silent rule has no Gravity call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (
  event,
  { config, data, ingest, env, logger, collector },
) {
  const {
    apiKey,
    action_source = 'website',
    test_event_code,
    url = DEFAULT_URL,
    ip,
    userAgent,
  } = config.settings ?? {};
  if (!apiKey)
    throw new StepError('Gravity settings missing, init() not run', {
      code: 'not-ready',
    });

  const root = createMappingRoot(ingest, event);
  const client = {
    ip: await resolveClient(ip, DEFAULT_IP, root, collector, event),
    userAgent: await resolveClient(
      userAgent,
      DEFAULT_USER_AGENT,
      root,
      collector,
      event,
    ),
  };

  const conversion = await buildEvent(
    event,
    isObject(data) ? data : {},
    action_source,
    client,
  );
  const body: RequestBody = withoutUndefined({
    test_event_code: text(test_event_code),
    data: [conversion],
  });

  logger.debug('Calling Gravity Conversions API', {
    endpoint: url,
    method: 'POST',
    eventName: conversion.event_name,
    eventId: conversion.event_id,
  });

  const sendServerFn = env?.sendServer || sendServer;
  const response = await sendServerFn(url, JSON.stringify(body), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });
  checkResponse(response?.data);
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
  event: WalkerOS.Event,
): Promise<string | undefined> {
  if (setting === false) return undefined;
  // Callbacks get the event, and the event's own consent (not the
  // collector's) gates a consent-scoped mapping.
  const value = await getMappingValue(root, setting ?? fallback, {
    collector,
    event,
    consent: event.consent ?? {},
  });
  return typeof value === 'string' && value !== '' ? value : undefined;
}
