import type {
  ConversionEvent,
  ConversionsRequest,
  Env,
  Identifier,
  Mapping,
  PushFn,
  Settings,
} from './types';
import {
  getMappingValue,
  isArray,
  isNumber,
  isObject,
  isString,
} from '@walkeros/core';
import { sendServer, getHashServer } from '@walkeros/server-core';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

function normalizeString(value: unknown): string | undefined {
  if (isString(value) && value.length > 0) return value;
  if (isArray(value) && isString(value[0]) && value[0].length > 0)
    return value[0];
  return undefined;
}

export const push: PushFn = async function (
  event,
  { config, rule, data, env, logger, collector },
) {
  const {
    pixelId,
    eventId: defaultEventId,
    consumerKey,
    consumerSecret,
    accessToken,
    accessTokenSecret,
    apiVersion = '12',
    doNotHash,
    url = 'https://ads-api.x.com/',
    user_data,
  } = config.settings as Settings;

  // Resolve user data from settings-level mapping
  const userDataCustom = user_data
    ? await getMappingValue(event, { map: user_data }, { collector })
    : {};

  // Merge user data sources: config mapping + event mapping data
  const eventData = isObject(data) ? data : {};
  const userData: Record<string, unknown> = {
    ...(isObject(userDataCustom) ? userDataCustom : {}),
    ...(isObject(eventData.user_data) ? eventData.user_data : {}),
  };

  // Build identifiers array (each is a single-key object)
  const identifiers: Identifier[] = [];

  // hashed_email
  const emailRaw = isString(userData.email)
    ? userData.email
    : isString(event.user.email)
      ? event.user.email
      : undefined;
  if (emailRaw) {
    const normalizedEmail = emailRaw.trim().toLowerCase();
    const shouldHash = !doNotHash?.includes('email');
    const idValue = shouldHash
      ? await getHashServer(normalizedEmail)
      : normalizedEmail;
    identifiers.push({ hashed_email: idValue });
  }

  // hashed_phone_number
  const phoneRaw = isString(userData.phone)
    ? userData.phone
    : isString(event.user.phone)
      ? event.user.phone
      : undefined;
  if (phoneRaw) {
    const normalizedPhone = phoneRaw.trim();
    const shouldHash = !doNotHash?.includes('phone');
    const idValue = shouldHash
      ? await getHashServer(normalizedPhone)
      : normalizedPhone;
    identifiers.push({ hashed_phone_number: idValue });
  }

  // twclid (pass-through, handles context tuple [value, order])
  const twclid = normalizeString(userData.twclid);
  if (twclid) {
    identifiers.push({ twclid });
  }

  // ip_address (pass-through, secondary)
  const ipAddress = normalizeString(userData.ip_address);
  if (ipAddress) {
    identifiers.push({ ip_address: ipAddress });
  }

  // user_agent (pass-through, secondary)
  const userAgent = normalizeString(userData.user_agent);
  if (userAgent) {
    identifiers.push({ user_agent: userAgent });
  }

  // Skip event if no primary identifier is present
  const hasPrimary = identifiers.some(
    (id) =>
      'twclid' in id || 'hashed_email' in id || 'hashed_phone_number' in id,
  );
  if (!hasPrimary) return;

  // Resolve per-event mapping settings
  const mappingSettings = (rule?.settings || {}) as Mapping;
  const eventIdResolved = mappingSettings.eventId
    ? await getMappingValue(event, mappingSettings.eventId, { collector })
    : undefined;
  const valueResolved =
    mappingSettings.value !== undefined
      ? await getMappingValue(event, mappingSettings.value, { collector })
      : undefined;
  const numberItemsResolved =
    mappingSettings.number_items !== undefined
      ? await getMappingValue(event, mappingSettings.number_items, {
          collector,
        })
      : undefined;
  const descriptionResolved =
    mappingSettings.description !== undefined
      ? await getMappingValue(event, mappingSettings.description, {
          collector,
        })
      : undefined;

  const resolvedEventId = isString(eventIdResolved)
    ? eventIdResolved
    : defaultEventId;

  // Construct conversion
  const conversion: ConversionEvent = {
    conversion_time: new Date(event.timestamp).toISOString(),
    event_id: resolvedEventId,
    identifiers,
    conversion_id: event.id,
  };

  if (valueResolved !== undefined && valueResolved !== null) {
    conversion.value = String(valueResolved);
  }

  if (isNumber(numberItemsResolved)) {
    conversion.number_items = numberItemsResolved;
  }

  if (isString(descriptionResolved) && descriptionResolved.length > 0) {
    conversion.description = descriptionResolved;
  }

  const body: ConversionsRequest = {
    conversions: [conversion],
  };

  const endpoint = `${url}${apiVersion}/measurement/conversions/${pixelId}`;

  // Generate OAuth 1.0a header (stateless, safe to create per-request)
  const oauth = new OAuth({
    consumer: { key: consumerKey, secret: consumerSecret },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString: string, key: string) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64');
    },
  });

  const authHeader = oauth.toHeader(
    oauth.authorize(
      { url: endpoint, method: 'POST' },
      { key: accessToken, secret: accessTokenSecret },
    ),
  );

  logger.debug('Calling X Conversions API', {
    endpoint,
    method: 'POST',
    event_id: resolvedEventId,
    conversion_id: event.id,
  });

  const sendServerFn = (env as Env)?.sendServer || sendServer;
  const result = await sendServerFn(endpoint, JSON.stringify(body), {
    headers: {
      Authorization: authHeader.Authorization,
      'Content-Type': 'application/json',
    },
  });

  logger.debug('X Conversions API response', {
    ok: isObject(result) ? result.ok : true,
  });

  if (isObject(result) && result.ok === false) {
    logger.throw(`X Conversions API error: ${JSON.stringify(result)}`);
  }
};
