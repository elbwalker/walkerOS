import type { PushFn } from './types';
import type { IngestEventsRequest, IngestEventsResponse } from './types';
import type { Collector, Mapping as WalkerOSMapping } from '@walkeros/core';
import { createMappingRoot, getMappingValue, isObject } from '@walkeros/core';
import { formatEvent, formatConsent } from './format';
import { getAccessToken } from './auth';
import { getConfig } from './config';

export const push: PushFn = async function (
  event,
  { config, rule, data, ingest, collector, env, logger },
) {
  // Validate config and get typed settings
  const validatedConfig = getConfig(config, logger);
  const {
    destinations,
    eventSource,
    validateOnly = false,
    url = 'https://datamanager.googleapis.com/v1',
    consent: requestConsent,
    testEventCode,
    userData,
    userId,
    clientId,
    appInstanceId,
    sessionAttributes,
    consentAdUserData,
    consentAdPersonalization,
    ip,
    userAgent,
  } = validatedConfig.settings;

  // Extract Settings guided helpers
  const userDataMapped = userData
    ? await getMappingValue(event, { map: userData }, { collector })
    : {};
  const userIdMapped = userId
    ? await getMappingValue(event, userId, { collector })
    : undefined;
  const clientIdMapped = clientId
    ? await getMappingValue(event, clientId, { collector })
    : undefined;
  const appInstanceIdMapped = appInstanceId
    ? await getMappingValue(event, appInstanceId, { collector })
    : undefined;
  const sessionAttributesMapped = sessionAttributes
    ? await getMappingValue(event, sessionAttributes, { collector })
    : undefined;

  // Extract consent from Settings
  const consentAdUserDataValue =
    typeof consentAdUserData === 'boolean'
      ? consentAdUserData
      : typeof consentAdUserData === 'string' && event.consent
        ? event.consent[consentAdUserData]
        : undefined;

  const consentAdPersonalizationValue =
    typeof consentAdPersonalization === 'boolean'
      ? consentAdPersonalization
      : typeof consentAdPersonalization === 'string' && event.consent
        ? event.consent[consentAdPersonalization]
        : undefined;

  // Client IP and user agent auto-fill, overridden by any mapped value
  const root = createMappingRoot(ingest, event);
  const clientIp = await resolveClient(ip, DEFAULT_IP, root, collector);
  const clientUserAgent = await resolveClient(
    userAgent,
    DEFAULT_USER_AGENT,
    root,
    collector,
  );

  // Build Settings helpers object
  const settingsHelpers: Record<string, unknown> = {};
  if (clientIp !== undefined) settingsHelpers.ipAddress = clientIp;
  if (clientUserAgent !== undefined)
    settingsHelpers.userAgent = clientUserAgent;
  if (isObject(userDataMapped)) {
    Object.assign(settingsHelpers, userDataMapped);
  }
  if (userIdMapped !== undefined) settingsHelpers.userId = userIdMapped;
  if (clientIdMapped !== undefined) settingsHelpers.clientId = clientIdMapped;
  if (appInstanceIdMapped !== undefined)
    settingsHelpers.appInstanceId = appInstanceIdMapped;
  if (sessionAttributesMapped !== undefined)
    settingsHelpers.sessionAttributes = sessionAttributesMapped;
  if (consentAdUserDataValue !== undefined)
    settingsHelpers.adUserData = consentAdUserDataValue;
  if (consentAdPersonalizationValue !== undefined)
    settingsHelpers.adPersonalization = consentAdPersonalizationValue;

  // Get mapped data from destination config and event mapping
  const configData = validatedConfig.data
    ? await getMappingValue(event, validatedConfig.data, { collector })
    : {};
  const eventData = isObject(data) ? data : {};

  // Merge: Settings helpers < config.data < event mapping data
  const finalData = {
    ...settingsHelpers,
    ...(isObject(configData) ? configData : {}),
    ...eventData,
  };

  // Format event for Data Manager API
  const dataManagerEvent = await formatEvent(event, finalData);

  // Apply event source from settings (required)
  if (!dataManagerEvent.eventSource) {
    dataManagerEvent.eventSource = eventSource;
  }

  // Apply request-level consent if event doesn't have consent
  if (!dataManagerEvent.consent && requestConsent) {
    dataManagerEvent.consent = requestConsent;
  }

  // Validate required fields before API call
  if (!dataManagerEvent.transactionId) {
    logger.throw('transactionId is required');
  }

  // Check if any destination is GA4 (requires eventName)
  const hasGA4Destination = destinations.some(
    (d) => d.operatingAccount?.accountType === 'GOOGLE_ANALYTICS_PROPERTY',
  );

  if (hasGA4Destination && !dataManagerEvent.eventName) {
    logger.throw('eventName is required for GA4 destinations');
  }

  // Build API request. Encoding is pinned to HEX because all hashing in this
  // destination (email/phone/name) emits lowercase hex SHA-256 digests; mixing
  // BASE64 here would silently produce mismatched identifiers.
  const requestBody: IngestEventsRequest = {
    events: [dataManagerEvent],
    destinations,
    encoding: 'HEX',
  };

  // Add optional parameters
  if (requestConsent) {
    requestBody.consent = requestConsent;
  }

  if (validateOnly) {
    requestBody.validateOnly = true;
  }

  if (testEventCode) {
    requestBody.testEventCode = testEventCode;
  }

  const authClient = env?.authClient;
  if (!authClient) {
    return logger.throw(
      'Auth client not initialized. Ensure init() was called successfully.',
    );
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(authClient);
  } catch (error) {
    logger.error('Authentication failed', { error });
    throw error;
  }

  const fetchFn = env?.fetch || fetch;
  const endpoint = `${url}/events:ingest`;

  logger.debug('Sending to Data Manager API', {
    endpoint,
    eventCount: requestBody.events.length,
    destinations: destinations.length,
    validateOnly,
  });

  const response = await fetchFn(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.throw(`Data Manager API error (${response.status}): ${errorText}`);
  }

  const result: IngestEventsResponse = await response.json();

  logger.debug('API response', {
    status: response.status,
    requestId: result.requestId,
  });

  // If validation errors exist, throw them
  if (result.validationErrors && result.validationErrors.length > 0) {
    logger.throw(
      `Validation errors: ${JSON.stringify(result.validationErrors)}`,
    );
  }
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
