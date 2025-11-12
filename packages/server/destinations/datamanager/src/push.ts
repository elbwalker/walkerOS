import type { PushFn } from './types';
import type { IngestEventsRequest, IngestEventsResponse } from './types';
import { getMappingValue, isObject } from '@walkeros/core';
import { formatEvent, formatConsent } from './format';
import { createLogger } from './utils';

export const push: PushFn = async function (
  event,
  { config, mapping, data, collector, env },
) {
  const {
    accessToken,
    destinations,
    eventSource,
    validateOnly = false,
    url = 'https://datamanager.googleapis.com/v1',
    consent: requestConsent,
    testEventCode,
    logLevel = 'none',
  } = config.settings!;

  const logger = createLogger(logLevel);

  // Get mapped data from destination config and event mapping
  const configData = config.data
    ? await getMappingValue(event, config.data)
    : {};
  const eventData = isObject(data) ? data : {};

  // Merge: config.data < event mapping data < event.data
  const finalData = {
    ...(event.data as Record<string, unknown>),
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

  // Send to Data Manager API
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
