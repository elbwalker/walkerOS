import type { PushFn } from './types';
import type { IngestEventsRequest, IngestEventsResponse } from './types';
import type { Collector, Mapping as WalkerOSMapping } from '@walkeros/core';
import {
  createMappingRoot,
  getMappingValue,
  isObject,
  StepError,
} from '@walkeros/core';
import { formatEvent, formatConsent } from './format';
import { getAccessToken } from './auth';
import { getConfig } from './config';

// A silent rule has no Data Manager call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (
  event,
  { config, data, ingest, collector, env, logger },
) {
  // Validate config and get typed settings
  const validatedConfig = getConfig(config);
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
    throw new StepError('transactionId is required', {
      code: 'missing-input',
    });
  }

  // Check if any destination is GA4 (requires eventName)
  const hasGA4Destination = destinations.some(
    (d) => d.operatingAccount?.accountType === 'GOOGLE_ANALYTICS_PROPERTY',
  );

  if (hasGA4Destination && !dataManagerEvent.eventName) {
    throw new StepError('eventName is required for GA4 destinations', {
      code: 'missing-input',
    });
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
    throw new StepError(
      'Auth client not initialized. Ensure init() was called successfully.',
      { code: 'not-ready' },
    );
  }

  // The auth error stays on `cause`; the message names only the step.
  let accessToken: string;
  try {
    accessToken = await getAccessToken(authClient);
  } catch (error) {
    throw new StepError('Data Manager authentication failed', {
      code: 'transport',
      cause: error,
    });
  }

  const fetchFn = env?.fetch || fetch;
  const endpoint = `${url}/events:ingest`;

  logger.debug('Sending to Data Manager API', {
    endpoint,
    eventCount: requestBody.events.length,
    destinations: destinations.length,
    validateOnly,
  });

  // A transport failure keeps the fetch error as `cause`, never in the message.
  let response: Response;
  try {
    response = await fetchFn(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    throw new StepError('Data Manager request failed', {
      code: 'transport',
      cause: error,
    });
  }

  if (!response.ok) {
    // The API's answer stays on the error body, never in the message.
    throw new StepError(`Data Manager API error (${response.status})`, {
      code: 'transport',
      status: response.status,
      body: await response.text(),
    });
  }

  const result: IngestEventsResponse = await response.json();

  logger.debug('API response', {
    status: response.status,
    requestId: result.requestId,
  });

  // If validation errors exist, throw them
  if (result.validationErrors && result.validationErrors.length > 0) {
    throw new StepError('Data Manager rejected the event', {
      code: 'transport',
      retryable: false,
      body: result.validationErrors,
    });
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
