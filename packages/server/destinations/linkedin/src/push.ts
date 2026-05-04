import type {
  ConversionEvent,
  ConversionEventsRequest,
  ConversionValue,
  Env,
  Mapping,
  PushFn,
  UserIdentifier,
  UserInfo,
} from './types';
import { getMappingValue, isArray, isObject, isString } from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import { getHashServer } from '@walkeros/server-core';

export const push: PushFn = async function (
  event,
  { config, rule, data, env, logger, collector },
) {
  const {
    accessToken,
    conversionRuleId,
    apiVersion = '202604',
    doNotHash,
    url = 'https://api.linkedin.com/rest/',
    user_data,
  } = config.settings!;

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

  // Always try to get email from event.user.email if not already mapped
  const email = isString(userData.email)
    ? userData.email
    : isString(event.user.email)
      ? event.user.email
      : undefined;

  // Build userIds array
  const userIds: UserIdentifier[] = [];

  // SHA256_EMAIL
  if (email) {
    const normalizedEmail = email.trim().toLowerCase();
    const shouldHash = !doNotHash?.includes('email');
    const idValue = shouldHash
      ? await getHashServer(normalizedEmail)
      : normalizedEmail;

    userIds.push({
      idType: 'SHA256_EMAIL',
      idValue,
    });
  }

  // LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID from li_fat_id
  // Handle both string and context tuple [value, order] formats
  const liFatIdRaw = userData.li_fat_id;
  const liFatId = isString(liFatIdRaw)
    ? liFatIdRaw
    : isArray(liFatIdRaw) && isString(liFatIdRaw[0])
      ? liFatIdRaw[0]
      : undefined;
  if (liFatId) {
    userIds.push({
      idType: 'LINKEDIN_FIRST_PARTY_ADS_TRACKING_UUID',
      idValue: liFatId,
    });
  }

  // Skip event if no user identifiers
  if (userIds.length === 0) return;

  // Build optional userInfo
  let userInfo: UserInfo | undefined;
  const firstName = userData.firstName;
  const lastName = userData.lastName;
  if (isString(firstName) && isString(lastName) && firstName && lastName) {
    userInfo = { firstName, lastName };
    if (isString(userData.title) && userData.title)
      userInfo.title = userData.title;
    if (isString(userData.companyName) && userData.companyName)
      userInfo.companyName = userData.companyName;
    if (isString(userData.countryCode) && userData.countryCode)
      userInfo.countryCode = userData.countryCode;
  }

  // Resolve per-event conversion override
  const mappingSettings = (rule?.settings || {}) as Mapping;
  const conversionResolved = mappingSettings.conversion
    ? await getMappingValue(event, mappingSettings.conversion, { collector })
    : undefined;
  const conversionOverride = isObject(conversionResolved)
    ? conversionResolved
    : {};

  // Build conversion URN
  const ruleId = isString(conversionOverride.ruleId)
    ? conversionOverride.ruleId
    : conversionRuleId;
  const conversion = `urn:lla:llaPartnerConversion:${ruleId}`;

  // Build conversion value
  let conversionValue: ConversionValue | undefined;
  const valueRaw = conversionOverride.value;
  const currencyRaw = conversionOverride.currency;
  if (valueRaw !== undefined && valueRaw !== null) {
    conversionValue = {
      currencyCode: isString(currencyRaw) ? currencyRaw : 'USD',
      amount: String(valueRaw),
    };
  }

  // Construct the conversion event
  const conversionEvent: ConversionEvent = {
    conversion,
    conversionHappenedAt: event.timestamp,
    user: {
      userIds,
      ...(userInfo ? { userInfo } : {}),
    },
    eventId: event.id,
  };

  if (conversionValue) {
    conversionEvent.conversionValue = conversionValue;
  }

  // Construct request body
  const body: ConversionEventsRequest = {
    elements: [conversionEvent],
  };

  const endpoint = `${url}conversionEvents`;

  logger.debug('Calling LinkedIn API', {
    endpoint,
    method: 'POST',
    conversion,
    eventId: event.id,
  });

  const sendServerFn = (env as Env)?.sendServer || sendServer;
  const result = await sendServerFn(endpoint, JSON.stringify(body), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'X-RestLi-Method': 'BATCH_CREATE',
      'Linkedin-Version': apiVersion,
    },
  });

  logger.debug('LinkedIn API response', {
    ok: isObject(result) ? result.ok : true,
  });

  if (isObject(result) && result.ok === false) {
    logger.throw(`LinkedIn API error: ${JSON.stringify(result)}`);
  }
};
