import type {
  ActionSource,
  ConversionEvent,
  CustomData,
  PushFn,
  RequestBody,
  UserDataKey,
} from './types';
import { ACTION_SOURCES, CLICK_KEYS, USER_DATA_KEYS } from './types';
import type {
  Collector,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@walkeros/core';
import {
  createMappingRoot,
  getMappingValue,
  isArray,
  isObject,
  isString,
  reportCause,
  StepError,
  stepId,
} from '@walkeros/core';
import { hashUserData, sendServer } from '@walkeros/server-core';
import { normalizers, oneValue } from './hash';

const DEFAULT_URL = 'https://api.trygravity.com/gateway/events';

/** Mapped data keys sent in user_data, each with the user_data key it fills. */
const USER_FIELDS = {
  email: 'em',
  phone: 'ph',
  first_name: 'fn',
  last_name: 'ln',
  external_id: 'external_id',
  ip_address: 'client_ip_address',
  user_agent: 'client_user_agent',
  visitor_id: 'visitor_id',
  session_id: 'session_id',
  grclid: 'grclid',
  grcpid: 'grcpid',
  grpuid: 'grpuid',
  gradid: 'gradid',
  grsig: 'grsig',
  graid: 'graid',
  oppref: 'oppref',
} as const satisfies Record<string, UserDataKey>;

/** The other mapped data keys the destination reads. */
const EVENT_FIELDS: readonly string[] = [
  'user_data',
  'client_context',
  'event_id',
  'action_source',
  'source_url',
  'value',
  'currency',
  'order_id',
  'contents',
  'content_name',
  'content_category',
  'predicted_ltv',
];

/** user_data keys Gravity takes as a list of strings. */
const LIST_KEYS: readonly UserDataKey[] = ['em', 'ph', 'external_id'];

/** user_data keys read as text, a list or a hashed value from any source. */
const READ_KEYS: readonly UserDataKey[] = [...LIST_KEYS, 'fn', 'ln'];

/** Records a mapped value the destination leaves out, with the reason. */
type Leave = (key: string, reason: string) => void;

const blank = (value: unknown): boolean =>
  value === undefined ||
  value === null ||
  (isString(value) && value.trim() === '');

/** A string or finite number as trimmed text; anything else is undefined. */
const text = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return isString(value) && value.trim() !== '' ? value.trim() : undefined;
};

const toNumber = (value: unknown): number =>
  typeof value === 'number' ? value : isString(value) ? Number(value) : NaN;

const isUserDataKey = (key: string): key is UserDataKey =>
  USER_DATA_KEYS.some((known) => known === key);

const isActionSource = (value: unknown): value is ActionSource =>
  ACTION_SOURCES.some((source) => source === value);

/** An event Gravity cannot take: it fails before any request. */
function unsendable(message: string): StepError {
  return new StepError(message, { code: 'missing-input' });
}

function textOf(
  data: WalkerOS.AnyObject,
  key: string,
  leave: Leave,
): string | undefined {
  if (blank(data[key])) return undefined;
  const value = text(data[key]);
  if (value === undefined) leave(key, 'not text');
  return value;
}

/** A user_data value: text, a list of text for a list key, or a list to report. */
function userValue(
  key: UserDataKey,
  value: unknown,
  name: string,
  leave: Leave,
): unknown {
  if (blank(value)) return undefined;
  if (LIST_KEYS.includes(key)) {
    const items = (isArray(value) ? value : [value]).filter(
      (item) => !blank(item),
    );
    const list = items.map(text).filter(isString);
    if (list.length < items.length) leave(name, 'not text');
    return list.length ? list : undefined;
  }
  // A list under fn or ln is left out and reported by hashUserData.
  if (isArray(value) && oneValue.some((one) => one === key)) return value;
  const result = text(value);
  if (result === undefined) leave(name, 'not text');
  return result;
}

/**
 * The mapped user_data object, such as the Gravity pixel's
 * getCAPIData().user_data: Gravity's keys as they are, except the ones read
 * as text, a list or a hashed value; every other key is left out.
 */
function passedUserData(
  value: unknown,
  leave: Leave,
): Partial<Record<UserDataKey, unknown>> {
  if (blank(value)) return {};
  if (!isObject(value)) {
    leave('user_data', 'not an object');
    return {};
  }
  const passed: Partial<Record<UserDataKey, unknown>> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!isUserDataKey(key)) {
      leave(`user_data.${key}`, 'not a Gravity user_data key');
      continue;
    }
    const read = READ_KEYS.includes(key)
      ? userValue(key, item, `user_data.${key}`, leave)
      : item;
    if (read !== undefined) passed[key] = read;
  }
  return passed;
}

/**
 * user_data before hashing. A mapped key wins over the same key in a mapped
 * user_data object, which wins over the client IP and user agent settings.
 * The click parameters of a mapped user_data object win over mapped ones:
 * grsig signs them, so they go back as one set.
 */
function collectUserData(
  data: WalkerOS.AnyObject,
  client: { ip?: string; userAgent?: string },
  leave: Leave,
): Partial<Record<UserDataKey, unknown>> {
  const passed = passedUserData(data.user_data, leave);
  const mapped: Partial<Record<UserDataKey, unknown>> = {};
  for (const [field, key] of Object.entries(USER_FIELDS)) {
    const value = userValue(key, data[field], field, leave);
    if (value !== undefined) mapped[key] = value;
  }
  const clicks: Partial<Record<UserDataKey, unknown>> = {};
  for (const key of CLICK_KEYS)
    if (passed[key] !== undefined) clicks[key] = passed[key];

  const userData = { ...passed, ...mapped, ...clicks };
  if (userData.client_ip_address === undefined && client.ip)
    userData.client_ip_address = client.ip;
  if (userData.client_user_agent === undefined && client.userAgent)
    userData.client_user_agent = client.userAgent;
  return userData;
}

function customDataOf(
  data: WalkerOS.AnyObject,
  leave: Leave,
): CustomData | undefined {
  // Gravity books a value without a currency as USD, so a bad value or
  // currency refuses the event instead of dropping one of the two.
  const value = blank(data.value) ? undefined : toNumber(data.value);
  if (value !== undefined && (!Number.isFinite(value) || value < 0))
    throw unsendable('Gravity value must be a number of 0 or more');
  const currency = blank(data.currency)
    ? undefined
    : isString(data.currency)
      ? data.currency.trim().toUpperCase()
      : '';
  if (currency !== undefined && !/^[A-Z]{3}$/.test(currency))
    throw unsendable('Gravity currency must be a 3-letter ISO 4217 code');

  let contents: Record<string, unknown>[] | undefined;
  if (!blank(data.contents)) {
    if (isArray(data.contents) && data.contents.every(isObject))
      contents = data.contents;
    else leave('contents', 'not a list of objects');
  }

  let predictedLtv: number | undefined;
  if (!blank(data.predicted_ltv)) {
    const ltv = toNumber(data.predicted_ltv);
    if (Number.isFinite(ltv)) predictedLtv = ltv;
    else leave('predicted_ltv', 'not a number');
  }

  const customData: CustomData = {
    value,
    currency,
    order_id: textOf(data, 'order_id', leave),
    contents,
    content_name: textOf(data, 'content_name', leave),
    content_category: textOf(data, 'content_category', leave),
    predicted_ltv: predictedLtv,
  };
  return Object.values(customData).some((item) => item !== undefined)
    ? customData
    : undefined;
}

function clientContextOf(
  data: WalkerOS.AnyObject,
  leave: Leave,
): WalkerOS.AnyObject | undefined {
  if (blank(data.client_context)) return undefined;
  if (isObject(data.client_context)) return data.client_context;
  leave('client_context', 'not an object');
  return undefined;
}

/** Gravity answers 200 with a status per event: `error` is a rejection. */
function checkResponse(data: unknown): void {
  if (!isObject(data) || !isArray(data.results)) return;
  const result: unknown = data.results[0];
  if (isObject(result) && result.status === 'error')
    throw new StepError('Gravity rejected the event', {
      code: 'transport',
      retryable: false,
      body: data,
    });
}

// A silent rule has no Gravity call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (
  event,
  { config, data, ingest, env, logger, collector, id },
) {
  const {
    apiKey,
    action_source = 'website',
    doNotHash,
    test_event_code,
    url = DEFAULT_URL,
    ip,
    userAgent,
  } = config.settings ?? {};
  if (!apiKey)
    throw new StepError('Gravity settings missing, init() not run', {
      code: 'not-ready',
    });

  const mapped = isObject(data) ? data : {};
  const left: string[] = [];
  const leave: Leave = (key, reason) => left.push(`${key} (${reason})`);
  for (const key of Object.keys(mapped))
    if (!Object.hasOwn(USER_FIELDS, key) && !EVENT_FIELDS.includes(key))
      leave(key, 'not a Gravity field');

  const actionSource = blank(mapped.action_source)
    ? action_source
    : mapped.action_source;
  if (!isActionSource(actionSource))
    throw unsendable(
      `Gravity action_source must be one of ${ACTION_SOURCES.join(', ')}`,
    );
  const customData = customDataOf(mapped, leave);

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
  const { userData, dropped } = await hashUserData(
    collectUserData(mapped, client, leave),
    normalizers,
    doNotHash,
    oneValue,
  );
  for (const key of dropped)
    leave(`user_data.${key}`, 'a list, Gravity takes one value');

  const conversion: ConversionEvent = {
    event_name: event.name,
    event_time: Math.floor((Number(event.timestamp) || Date.now()) / 1000),
    event_id: (textOf(mapped, 'event_id', leave) ?? String(event.id)).slice(
      0,
      128,
    ),
    action_source: actionSource,
    event_source_url:
      textOf(mapped, 'source_url', leave) ?? text(event.source?.url),
    user_data: userData,
    client_context: clientContextOf(mapped, leave),
    custom_data: customData,
  };
  const body: RequestBody = {
    test_event_code: text(test_event_code),
    data: [conversion],
  };

  if (left.length)
    reportCause(
      collector,
      logger,
      { step: stepId('destination', id), code: 'mapping' },
      `Gravity left out ${left.join(', ')}`,
      { event: event.name },
    );

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
