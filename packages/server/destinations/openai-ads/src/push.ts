import type {
  ActionSource,
  ContentItem,
  ConversionEvent,
  DataType,
  EventData,
  EventType,
  PushFn,
  RequestBody,
  StandardEventType,
  UserData,
} from './types';
import type { HashKey } from './hash';
import type {
  Collector,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@walkeros/core';
import {
  createMappingRoot,
  getCurrencyMinorUnits,
  getMappingValue,
  isArray,
  isObject,
  isString,
  reportCause,
  stepId,
  StepError,
} from '@walkeros/core';
import { hashUserData, sendServer } from '@walkeros/server-core';
import { getNormalizers, hashedFields, hashKeys } from './hash';

const ENDPOINT = 'https://bzr.openai.com/v1/events';

// OpenAI asks an integration that sends for advertisers to name itself with
// the same value on every request.
const INTEGRATION_SOURCE = 'walkeros';

// Each standard event type and the shape of its `data` object.
const DATA_TYPES: Record<StandardEventType, DataType> = {
  app_installed: 'customer_action',
  app_opened: 'customer_action',
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

// OpenAI takes these only from apps, with action_source mobile_app.
const APP_TYPES: readonly StandardEventType[] = ['app_installed', 'app_opened'];

const ACTION_SOURCES: readonly ActionSource[] = [
  'web',
  'mobile_app',
  'offline',
  'physical_store',
  'phone_call',
  'email',
  'other',
];

const CUSTOM_NAME = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;

// OpenAI refuses a user list with more than three values.
const MAX_VALUES = 3;

// Raw user fields that take a list, by mapped key.
const LIST_FIELDS = {
  country: 'countries',
  region: 'regions',
  city: 'cities',
  postal_code: 'postal_codes',
} as const satisfies Record<string, keyof UserData>;

// Every key the rule's data can map; any other is left out and reported.
const KEYS: readonly string[] = [
  'id',
  'action_source',
  'source_url',
  'oppref',
  ...hashKeys,
  ...Object.keys(LIST_FIELDS),
  'obref',
  'android_advertising_id',
  'user_agent',
  'ip_address',
  'amount',
  'currency',
  'contents',
  'plan_id',
];

const CONTENT_KEYS: readonly string[] = [
  'id',
  'group_id',
  'name',
  'content_type',
  'quantity',
  'amount',
  'currency',
  'variant_dict',
];

/** Mapped values a request leaves out, each with its reason. */
type LeftOut = string[];

const isEmpty = (value: unknown): boolean =>
  value === undefined || value === null || value === '';

const text = (value: unknown): string | undefined =>
  isString(value) && value.trim() !== '' ? value.trim() : undefined;

// A string, or a number written as one.
const identifier = (value: unknown): string | undefined =>
  typeof value === 'number' && Number.isFinite(value)
    ? String(value)
    : text(value);

function isStandardType(name: string): name is StandardEventType {
  return Object.hasOwn(DATA_TYPES, name);
}

function isActionSource(value: unknown): value is ActionSource {
  return ACTION_SOURCES.some((source) => source === value);
}

function unsendable(message: string): StepError {
  return new StepError(message, { code: 'missing-input' });
}

/** Keys of an object that are not in `known`. */
function unknownKeys(
  value: Record<string, unknown>,
  known: readonly string[],
): string[] {
  return Object.keys(value).filter((key) => !known.includes(key));
}

/**
 * The OpenAI type a rule names (a space becomes `_`): a standard type, or a
 * custom event under that name. An event no rule names has none.
 */
function eventType(
  ruleName: string | undefined,
  eventName: string,
  actionSource: ActionSource,
): { type: EventType; custom_event_name?: string } {
  if (ruleName === undefined)
    throw unsendable(
      `OpenAI Ads has no event type for ${eventName}: name it in a mapping rule`,
    );
  const name = ruleName.trim().replace(/ /g, '_').toLowerCase();
  if (isStandardType(name)) {
    if (APP_TYPES.includes(name) && actionSource !== 'mobile_app')
      throw unsendable(`OpenAI Ads ${name} needs action_source mobile_app`);
    return { type: name };
  }
  if (name === 'custom' || !CUSTOM_NAME.test(name))
    throw unsendable(
      `OpenAI Ads custom event name "${ruleName}" is invalid (letters, digits, _ and -, at most 64)`,
    );
  return { type: 'custom', custom_event_name: name };
}

/** An ISO 4217 code, uppercased; any other mapped value fails the event. */
function currencyOf(value: unknown, key: string): string | undefined {
  if (isEmpty(value)) return undefined;
  const currency = text(value)?.toUpperCase();
  if (currency === undefined || getCurrencyMinorUnits(currency) === undefined)
    throw unsendable(`OpenAI Ads ${key} is not an ISO 4217 currency code`);
  return currency;
}

/**
 * An amount in the integer minor unit of its currency (ISO 4217); an amount
 * that cannot be converted fails the event.
 */
function amountOf(
  value: unknown,
  currency: string | undefined,
  key: string,
): number | undefined {
  if (isEmpty(value)) return undefined;
  const amount = isString(value) ? Number(value) : value;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0)
    throw unsendable(`OpenAI Ads ${key} is not a number of at least 0`);
  const minorUnits = currency ? getCurrencyMinorUnits(currency) : undefined;
  if (minorUnits === undefined)
    throw unsendable(`OpenAI Ads ${key} needs a currency`);
  return Math.round(amount * 10 ** minorUnits);
}

/** The text values of a list or of one value, without empty ones. */
function textsOf(value: unknown, key: string, leftOut: LeftOut): string[] {
  const items = (isArray(value) ? value : [value]).filter(
    (item) => !isEmpty(item),
  );
  const texts = items.flatMap((item) => {
    const itemText = identifier(item);
    return itemText === undefined ? [] : [itemText];
  });
  if (texts.length < items.length) leftOut.push(`${key} (not text)`);
  return texts;
}

/** Without duplicates, and cut to OpenAI's three values, never silently. */
function capped(values: string[], key: string, leftOut: LeftOut): string[] {
  const unique = [...new Set(values)];
  if (unique.length > MAX_VALUES)
    leftOut.push(`${key} (more than ${MAX_VALUES} values)`);
  return unique.slice(0, MAX_VALUES);
}

/** An identifier, text or a number; any other value goes to `leftOut`. */
function idOf(
  value: unknown,
  key: string,
  leftOut: LeftOut,
): string | undefined {
  if (isEmpty(value)) return undefined;
  const id = identifier(value);
  if (id === undefined) leftOut.push(`${key} (not text)`);
  return id;
}

/** One text value; a list or any other value goes to `leftOut`. */
function textOf(
  value: unknown,
  key: string,
  leftOut: LeftOut,
): string | undefined {
  if (isEmpty(value)) return undefined;
  const valueText = text(value);
  if (valueText === undefined) leftOut.push(`${key} (not one text value)`);
  return valueText;
}

async function buildUser(
  data: Record<string, unknown>,
  doNotHash: HashKey[] | undefined,
  client: { ip?: string; userAgent?: string },
  leftOut: LeftOut,
): Promise<UserData | undefined> {
  let invalidPhone = false;
  const { userData } = await hashUserData(
    Object.fromEntries(hashKeys.map((key) => [key, data[key]])),
    getNormalizers(() => {
      invalidPhone = true;
    }),
    doNotHash,
  );
  if (invalidPhone) leftOut.push('phone (not 8 to 15 digits)');

  const user: UserData = {};
  for (const key of hashKeys) {
    const values = capped(textsOf(userData[key], key, leftOut), key, leftOut);
    if (values.length) user[hashedFields[key]] = values;
  }

  const obref = textOf(data.obref, 'obref', leftOut);
  if (obref) user.obref = obref;

  // OpenAI takes raw two-letter codes, such as US.
  const countries = textsOf(data.country, 'country', leftOut)
    .map((country) => country.toUpperCase())
    .filter((country) => {
      const valid = /^[A-Z]{2}$/.test(country);
      if (!valid) leftOut.push('country (not a two-letter code)');
      return valid;
    });
  for (const [key, values] of [
    ['country', countries],
    ['region', textsOf(data.region, 'region', leftOut)],
    ['city', textsOf(data.city, 'city', leftOut)],
    ['postal_code', textsOf(data.postal_code, 'postal_code', leftOut)],
  ] as const) {
    const list = capped(values, key, leftOut);
    if (list.length) user[LIST_FIELDS[key]] = list;
  }

  const gaid = textOf(
    data.android_advertising_id,
    'android_advertising_id',
    leftOut,
  );
  if (gaid) user.android_advertising_id = gaid;
  const userAgent =
    textOf(data.user_agent, 'user_agent', leftOut) ?? client.userAgent;
  if (userAgent) user.user_agent = userAgent;
  const ip = textOf(data.ip_address, 'ip_address', leftOut) ?? client.ip;
  if (ip) user.ip_address = ip;

  return Object.keys(user).length ? user : undefined;
}

function quantityOf(value: unknown, leftOut: LeftOut): number | undefined {
  if (isEmpty(value)) return undefined;
  const quantity = isString(value) ? Number(value) : value;
  if (
    typeof quantity === 'number' &&
    Number.isInteger(quantity) &&
    quantity >= 0
  )
    return quantity;
  leftOut.push('contents quantity (not a whole number)');
  return undefined;
}

/** Variant names to values, both text. */
function variantsOf(
  value: unknown,
  leftOut: LeftOut,
): Record<string, string> | undefined {
  if (isEmpty(value)) return undefined;
  const entries = isObject(value) ? Object.entries(value) : [];
  const texts = entries.filter((entry): entry is [string, string] =>
    isString(entry[1]),
  );
  if (!isObject(value) || texts.length < entries.length)
    leftOut.push('contents variant_dict (not text values)');
  return texts.length ? Object.fromEntries(texts) : undefined;
}

function buildContent(
  item: Record<string, unknown>,
  currency: string | undefined,
  leftOut: LeftOut,
): ContentItem {
  for (const key of unknownKeys(item, CONTENT_KEYS))
    leftOut.push(`contents ${key} (not an OpenAI key)`);

  const id = idOf(item.id, 'contents id', leftOut);
  const groupId = idOf(item.group_id, 'contents group_id', leftOut);
  const name = textOf(item.name, 'contents name', leftOut);
  const contentType = textOf(
    item.content_type,
    'contents content_type',
    leftOut,
  );
  const itemCurrency = currencyOf(item.currency, 'contents currency');
  const amount = amountOf(
    item.amount,
    itemCurrency ?? currency,
    'contents amount',
  );

  const quantity = quantityOf(item.quantity, leftOut);
  const variantDict = variantsOf(item.variant_dict, leftOut);

  return {
    ...(id !== undefined ? { id } : {}),
    ...(groupId !== undefined ? { group_id: groupId } : {}),
    ...(name !== undefined ? { name } : {}),
    ...(contentType !== undefined ? { content_type: contentType } : {}),
    ...(quantity !== undefined ? { quantity } : {}),
    ...(amount !== undefined ? { amount } : {}),
    ...(itemCurrency !== undefined ? { currency: itemCurrency } : {}),
    ...(variantDict ? { variant_dict: variantDict } : {}),
  };
}

function buildContents(
  value: unknown,
  currency: string | undefined,
  leftOut: LeftOut,
): ContentItem[] | undefined {
  if (isEmpty(value)) return undefined;
  if (!isArray(value)) {
    leftOut.push('contents (not a list)');
    return undefined;
  }
  const items = value.filter(isObject);
  if (items.length < value.length)
    leftOut.push('contents (an item is not an object)');
  // An item none of whose fields resolved has nothing to send.
  const contents = items
    .map((item) => buildContent(item, currency, leftOut))
    .filter((content) => Object.keys(content).length);
  return contents.length ? contents : undefined;
}

function buildData(
  dataType: DataType,
  data: Record<string, unknown>,
  leftOut: LeftOut,
): EventData {
  const currency = currencyOf(data.currency, 'currency');
  const amount = amountOf(data.amount, currency, 'amount');

  const takesContents = dataType !== 'customer_action';
  const contents = takesContents
    ? buildContents(data.contents, currency, leftOut)
    : undefined;
  if (!takesContents && !isEmpty(data.contents))
    leftOut.push(`contents (not on ${dataType} events)`);

  const takesPlan = dataType === 'plan_enrollment' || dataType === 'custom';
  const planId = takesPlan ? idOf(data.plan_id, 'plan_id', leftOut) : undefined;
  if (!takesPlan && !isEmpty(data.plan_id))
    leftOut.push(`plan_id (not on ${dataType} events)`);

  return {
    type: dataType,
    ...(amount !== undefined ? { amount } : {}),
    ...(currency !== undefined ? { currency } : {}),
    ...(contents ? { contents } : {}),
    ...(planId !== undefined ? { plan_id: planId } : {}),
  };
}

async function buildEvent(
  event: WalkerOS.Event,
  ruleName: string | undefined,
  data: Record<string, unknown>,
  settingsActionSource: ActionSource,
  doNotHash: HashKey[] | undefined,
  client: { ip?: string; userAgent?: string },
  leftOut: LeftOut,
): Promise<ConversionEvent> {
  for (const key of unknownKeys(data, KEYS))
    leftOut.push(`${key} (not an OpenAI key)`);

  if (!isEmpty(data.action_source) && !isActionSource(data.action_source))
    throw unsendable(
      `OpenAI Ads action_source is not one of ${ACTION_SOURCES.join(', ')}`,
    );
  const actionSource = isActionSource(data.action_source)
    ? data.action_source
    : settingsActionSource;

  const { type, custom_event_name } = eventType(
    ruleName,
    event.name,
    actionSource,
  );

  const sourceUrl =
    textOf(data.source_url, 'source_url', leftOut) ?? text(event.source?.url);
  if (actionSource === 'web' && !/^https?:\/\/[^/]+/.test(sourceUrl ?? ''))
    throw unsendable(
      'OpenAI Ads web event needs a source_url with a scheme and host',
    );

  const id = idOf(data.id, 'id', leftOut);
  const oppref = textOf(data.oppref, 'oppref', leftOut);

  const eventData = buildData(
    type === 'custom' ? 'custom' : DATA_TYPES[type],
    data,
    leftOut,
  );
  const user = await buildUser(data, doNotHash, client, leftOut);

  return {
    id: id ?? String(event.id),
    type,
    ...(custom_event_name !== undefined ? { custom_event_name } : {}),
    timestamp_ms: Math.round(Number(event.timestamp) || Date.now()),
    ...(oppref !== undefined ? { oppref } : {}),
    ...(sourceUrl !== undefined ? { source_url: sourceUrl } : {}),
    action_source: actionSource,
    ...(user ? { user } : {}),
    data: eventData,
  };
}

// A silent rule has no OpenAI Ads call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (
  event,
  { config, rule, data, ingest, env, logger, collector, id },
) {
  const settings = config.settings;
  if (!settings?.apiKey || !settings.pixelId)
    throw new StepError('OpenAI Ads settings apiKey and pixelId missing', {
      code: 'config',
    });
  const {
    apiKey,
    pixelId,
    action_source = 'web',
    validate_only,
    doNotHash,
    ip,
    userAgent,
  } = settings;

  const leftOut: LeftOut = [];
  if (!isEmpty(data) && !isObject(data))
    leftOut.push('the rule data (not an object)');

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
    rule?.name,
    isObject(data) ? data : {},
    action_source,
    doNotHash,
    client,
    leftOut,
  );

  if (leftOut.length)
    reportCause(
      collector,
      logger,
      { step: stepId('destination', id), code: 'mapping' },
      `OpenAI Ads left out ${[...new Set(leftOut)].join(', ')}`,
      { event: event.name },
    );

  const body: RequestBody = {
    ...(validate_only === true ? { validate_only: true } : {}),
    integration_source: INTEGRATION_SOURCE,
    events: [conversion],
  };

  const endpoint = `${ENDPOINT}?pid=${encodeURIComponent(pixelId)}`;

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
