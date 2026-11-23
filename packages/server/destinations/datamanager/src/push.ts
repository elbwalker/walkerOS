import type { PushFn } from './types';
import type { IngestEventsRequest } from './types';
import type {
  Collector,
  SendResponse,
  WalkerOS,
  Mapping as WalkerOSMapping,
} from '@walkeros/core';
import {
  createMappingRoot,
  getMappingValue,
  isObject,
  reportCause,
  resolveDestinationTimeout,
  StepError,
  stepId,
} from '@walkeros/core';
import { sendServer } from '@walkeros/server-core';
import { formatEvent } from './format';
import { getAuthHeaders } from './auth';
import { getConfig } from './config';
import { fieldWarningsOf, refusalMessage, rpcStatusOf } from './answer';

// A silent rule has no Data Manager call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  return context.rule?.silent ? undefined : send(event, context);
};

async function send(
  event: WalkerOS.Event,
  { config, data, ingest, collector, env, logger, id }: Parameters<PushFn>[1],
): Promise<{ requestId: string } | undefined> {
  // Validate config and get typed settings
  const validatedConfig = getConfig(config);
  const {
    destinations,
    eventSource,
    validateOnly = false,
    url = 'https://datamanager.googleapis.com/v1',
    consent: requestConsent,
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

  const googleAds = destinations.some(
    (d) => d.operatingAccount?.accountType === 'GOOGLE_ADS',
  );

  // Client IP and user agent: filled by default only for Google Ads, where
  // they count as an identifier. For Google Analytics they stay home unless
  // set or mapped, privacy first. A mapped value wins.
  const root = createMappingRoot(ingest, event);
  const clientIp = await resolveClient(
    ip,
    googleAds ? DEFAULT_IP : undefined,
    root,
    collector,
  );
  const clientUserAgent = await resolveClient(
    userAgent,
    googleAds ? DEFAULT_USER_AGENT : undefined,
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
  const dropped: string[] = [];
  const dataManagerEvent = await formatEvent(event, finalData, dropped);

  // One line per push names each value not sent and why, never the value.
  // Its own code keeps the collector's `mapping` failure lines for this
  // step out of its rate limit: a delivered event never hides a lost one.
  if (dropped.length)
    reportCause(
      collector,
      logger,
      { step: stepId('destination', id), code: 'not-sent' },
      'Data Manager did not send some mapped values',
      { event: event.name, error: dropped.join(', ') },
    );

  // Apply event source from settings (required)
  if (!dataManagerEvent.eventSource) {
    dataManagerEvent.eventSource = eventSource;
  }

  // Apply request-level consent if event doesn't have consent
  if (!dataManagerEvent.consent && requestConsent) {
    dataManagerEvent.consent = requestConsent;
  }

  // Google Ads deduplicates on the transaction ID, so a Google Ads entry
  // never goes without one; an invented ID would count the event twice.
  if (googleAds && !dataManagerEvent.transactionId) {
    throw new StepError(
      'transactionId is required for a Google Ads destination: map the order ID your Google tag sends, or the event id for a conversion only the server reports',
      { code: 'missing-input' },
    );
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

  const authClient = env?.authClient;
  if (!authClient) {
    throw new StepError(
      'Auth client not initialized. Ensure init() was called successfully.',
      { code: 'not-ready' },
    );
  }

  // The auth error stays on `cause`; the message names only the step.
  let headers: Record<string, string>;
  try {
    headers = await getAuthHeaders(authClient);
  } catch (error) {
    throw new StepError('Data Manager authentication failed', {
      code: 'transport',
      cause: error,
    });
  }

  const sendServerFn = env?.sendServer || sendServer;
  const endpoint = `${url}/events:ingest`;

  logger.debug('Sending to Data Manager API', {
    endpoint,
    eventCount: requestBody.events.length,
    destinations: destinations.length,
    validateOnly,
  });

  let response: SendResponse;
  try {
    response = await sendServerFn(endpoint, JSON.stringify(requestBody), {
      headers,
      timeout: resolveDestinationTimeout(config.timeout),
    });
  } catch (error) {
    // An injected sendServer can throw anything: its message, which may echo
    // what was sent, stays on `cause`.
    if (!(error instanceof StepError))
      throw new StepError('Data Manager request failed', {
        code: 'transport',
        cause: error,
      });
    // sendServer's network error or timeout passes unchanged. A refusal
    // names Google's status, reason and field; its body stays on the error.
    if (error.status === undefined) throw error;
    const { status, body } = error;
    throw new StepError(refusalMessage(status, body), {
      code: 'transport',
      status,
      body,
      // ABORTED is a conflict a redelivery resolves, though its status is 409.
      ...(rpcStatusOf(body) === 'ABORTED' ? { retryable: true } : {}),
    });
  }

  // An empty 2xx body is an accepted request without an answer.
  const answer = response.data === '' ? {} : response.data;
  if (!isObject(answer)) {
    // Google answered 2xx: a retry would send events it already accepted.
    throw new StepError('Data Manager answered with an unreadable body', {
      code: 'transport',
      retryable: false,
      body: answer,
    });
  }

  const requestId =
    typeof answer.requestId === 'string' ? answer.requestId : undefined;
  logger.debug('API response', { requestId });

  // The event counts as delivered; the line names what Google dropped.
  const warnings = fieldWarningsOf(answer);
  if (warnings.length)
    reportCause(
      collector,
      logger,
      { step: stepId('destination', id), code: 'field-warning' },
      'Google accepted the event and dropped fields',
      { event: event.name, error: warnings.join(', ') },
    );

  return requestId !== undefined ? { requestId } : undefined;
}

const DEFAULT_IP: WalkerOSMapping.Value = ['ingest.ip', 'event.user.ip'];
const DEFAULT_USER_AGENT: WalkerOSMapping.Value = [
  'ingest.userAgent',
  'event.user.userAgent',
];

/**
 * A client IP or user agent setting resolved to a non-empty string. Without
 * a setting the fallback applies; without a fallback nothing is filled.
 */
async function resolveClient(
  setting: WalkerOSMapping.Value | false | undefined,
  fallback: WalkerOSMapping.Value | undefined,
  root: WalkerOSMapping.Root,
  collector: Collector.Instance,
): Promise<string | undefined> {
  if (setting === false) return undefined;
  const value = setting ?? fallback;
  if (value === undefined) return undefined;
  const resolved = await getMappingValue(root, value, { collector });
  return typeof resolved === 'string' && resolved !== '' ? resolved : undefined;
}
