import type {
  CriteoEvent,
  CriteoIdentity,
  CriteoItem,
  CriteoRequestBody,
  Env,
  PushFn,
  Settings,
} from './types';
import { getMappingValue, isObject } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import { hashEmail } from './hash';
import { DEFAULT_URL } from './config';

const INTEGRATION_VERSION = 'walkeros_criteo_1.0.0';

function toStringOrUndef(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  return undefined;
}

function toNumberOrUndef(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function toIsoTimestamp(ts: unknown): string {
  if (typeof ts === 'number' && Number.isFinite(ts)) {
    return new Date(ts).toISOString();
  }
  if (typeof ts === 'string' && ts) return ts;
  return new Date().toISOString();
}

function toItems(raw: unknown): CriteoItem[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const items: CriteoItem[] = [];
  for (const entry of raw) {
    if (!isObject(entry)) continue;
    const id = toStringOrUndef(entry.id);
    if (!id) continue;
    const item: CriteoItem = { id };
    const price = toNumberOrUndef(entry.price);
    if (price !== undefined) item.price = price;
    const quantity = toNumberOrUndef(entry.quantity);
    if (quantity !== undefined) item.quantity = quantity;
    items.push(item);
  }
  return items.length ? items : undefined;
}

export const push: PushFn = async function (
  event,
  { config, rule, data, env, logger, collector },
) {
  const {
    partnerId,
    callerId,
    siteType = 'd',
    country,
    language,
    url = DEFAULT_URL,
    user_data,
  } = config.settings as Settings;

  const eventData = isObject(data) ? data : {};
  const userDataCustom = user_data
    ? await getMappingValue(event, { map: user_data }, { collector })
    : {};
  const resolvedUserData = isObject(userDataCustom) ? userDataCustom : {};

  // Build identity block
  const identity: CriteoIdentity = { mapping_key: callerId };

  const mappedUserId = toStringOrUndef(resolvedUserData.mapped_user_id);
  if (mappedUserId) identity.mapped_user_id = mappedUserId;

  const rawEmail = toStringOrUndef(resolvedUserData.email);
  if (rawEmail) {
    const hashes = await hashEmail(rawEmail);
    if (Object.keys(hashes).length > 0) identity.email = hashes;
  }

  // Build event object
  const criteoEventName =
    (typeof rule?.name === 'string' && rule.name) || event.name;

  const criteoEvent: CriteoEvent = {
    event: criteoEventName,
    timestamp: toIsoTimestamp(event.timestamp),
  };

  const eventId = toStringOrUndef(eventData.id);
  if (eventId) criteoEvent.id = eventId;

  const items = toItems(eventData.item);
  if (items) criteoEvent.item = items;

  const dedupId = toStringOrUndef(eventData.deduplication_page_view_id);
  if (dedupId) criteoEvent.deduplication_page_view_id = dedupId;

  // Build request body
  const body: CriteoRequestBody = {
    version: INTEGRATION_VERSION,
    site_type: siteType,
    account: partnerId,
    id: identity,
    events: [criteoEvent],
  };

  if (event.source?.url) body.full_url = event.source.url;
  if (event.source?.referrer) body.previous_url = event.source.referrer;

  const retailerVisitorId = toStringOrUndef(
    resolvedUserData.retailer_visitor_id,
  );
  if (retailerVisitorId) body.retailer_visitor_id = retailerVisitorId;

  const ip = toStringOrUndef(resolvedUserData.ip);
  if (ip) body.ip = ip;

  const useragent = toStringOrUndef(resolvedUserData.useragent);
  if (useragent) body.useragent = useragent;

  if (country) body.country = country;
  if (language) body.language = language;

  logger.debug('Calling Criteo Events API', {
    url,
    method: 'POST',
    eventName: criteoEvent.event,
    eventId: criteoEvent.id,
  });

  const sendServerFn = (env as Env)?.sendServer || sendServer;
  const result = await sendServerFn(url, JSON.stringify(body));

  logger.debug('Criteo API response', {
    ok: isObject(result) ? result.ok : true,
  });

  if (isObject(result) && result.ok === false) {
    logger.throw(`Criteo API error: ${JSON.stringify(result)}`);
  }
};
