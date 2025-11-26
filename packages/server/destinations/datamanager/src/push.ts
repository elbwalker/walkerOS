import type { PushFn } from './types';
import type { IngestEventsRequest, IngestEventsResponse } from './types';
import { getMappingValue, isObject } from '@walkeros/core';
import { formatEvent, formatConsent } from './format';
import { getAccessToken } from './auth';

export const push: PushFn = async function (
  event,
  { config, mapping, data, collector, env, logger },
) {
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
    sessionAttributes,
    consentAdUserData,
    consentAdPersonalization,
  } = config.settings!;

  // Extract Settings guided helpers
  const userDataMapped = userData
    ? await getMappingValue(event, { map: userData })
    : {};
  const userIdMapped = userId
    ? await getMappingValue(event, userId)
    : undefined;
  const clientIdMapped = clientId
    ? await getMappingValue(event, clientId)
    : undefined;
  const sessionAttributesMapped = sessionAttributes
    ? await getMappingValue(event, sessionAttributes)
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

  // Build Settings helpers object
  const settingsHelpers: Record<string, unknown> = {};
  if (isObject(userDataMapped)) {
    Object.assign(settingsHelpers, userDataMapped);
  }
  if (userIdMapped !== undefined) settingsHelpers.userId = userIdMapped;
  if (clientIdMapped !== undefined) settingsHelpers.clientId = clientIdMapped;
  if (sessionAttributesMapped !== undefined)
    settingsHelpers.sessionAttributes = sessionAttributesMapped;
  if (consentAdUserDataValue !== undefined)
    settingsHelpers.adUserData = consentAdUserDataValue;
  if (consentAdPersonalizationValue !== undefined)
    settingsHelpers.adPersonalization = consentAdPersonalizationValue;

  // Get mapped data from destination config and event mapping
  const configData = config.data
    ? await getMappingValue(event, config.data)
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

  logger.debug('Processing event', {
    name: event.name,
    id: event.id,
    timestamp: event.timestamp,
  });

  // Apply event source from settings if not set
  if (!dataManagerEvent.eventSource && eventSource) {
    dataManagerEvent.eventSource = eventSource;
  }

  // Apply request-level consent if event doesn't have consent
  if (!dataManagerEvent.consent && requestConsent) {
    dataManagerEvent.consent = requestConsent;
  }

  if (!destinations || destinations.length === 0) {
    throw new Error('Destinations are required');
  }

  // Build API request
  const requestBody: IngestEventsRequest = {
    events: [dataManagerEvent],
    destinations,
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
    throw new Error(
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
    logger.error('API request failed', {
      status: response.status,
      error: errorText,
    });
    throw new Error(
      `Data Manager API error (${response.status}): ${errorText}`,
    );
  }

  const result: IngestEventsResponse = await response.json();

  logger.debug('API response', {
    status: response.status,
    requestId: result.requestId,
  });

  // If validation errors exist, throw them
  if (result.validationErrors && result.validationErrors.length > 0) {
    logger.error('Validation errors', {
      errors: result.validationErrors,
    });
    throw new Error(
      `Validation errors: ${JSON.stringify(result.validationErrors)}`,
    );
  }

  logger.info('Event processed successfully', {
    requestId: result.requestId,
  });
};
