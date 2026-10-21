import type {
  PushFn,
  PushBatchFn,
  Settings,
  RuntimeState,
  HubSpotClientMock,
  HubSpotEventRequest,
  Env,
  Rule,
} from './types';
import type { Collector, Destination, Logger, WalkerOS } from '@walkeros/core';
import { getMappingValue, isObject, isString, StepError } from '@walkeros/core';

/** The HubSpot batch API takes at most this many events per request. */
const MAX_BATCH = 500;

interface Prepared {
  sdk: HubSpotClientMock;
  /** The event to send; none for a silent rule. */
  request?: HubSpotEventRequest;
}

/**
 * A failed HubSpot call as a StepError. The SDK's ApiException carries the
 * HTTP status as `code` and the response body in its message, so only the
 * status travels; the original error stays the cause.
 */
function hubspotError(message: string, error: unknown): StepError {
  const status =
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'number'
      ? error.code
      : undefined;
  return new StepError(message, { code: 'transport', status, cause: error });
}

/** Run one HubSpot call; a failure throws a StepError. */
async function call(message: string, send: () => Promise<void>) {
  try {
    await send();
  } catch (error) {
    throw hubspotError(message, error);
  }
}

/**
 * Resolve one event: its identity, the contact upsert, and the event request
 * (none for a silent rule). An event without email or objectId cannot be
 * sent and fails with missing-input.
 */
async function prepare(
  event: WalkerOS.Event,
  settings: Partial<Settings> | undefined,
  env: Env | undefined,
  rule: Rule | undefined,
  collector: Collector.Instance,
  logger: Logger.Instance,
): Promise<Prepared> {
  const sdk = env?.client || settings?._client;
  if (!isReady(settings) || !sdk)
    throw new StepError('HubSpot client not initialized', {
      code: 'not-ready',
    });

  const state: RuntimeState = settings._state || {};
  settings._state = state;
  const mappingSettings = rule?.settings || {};

  // 1. Resolve identity from event
  const email = settings.email
    ? resolveString(await getMappingValue(event, settings.email, { collector }))
    : undefined;
  const objectId = settings.objectId
    ? resolveString(
        await getMappingValue(event, settings.objectId, { collector }),
      )
    : undefined;

  if (!email && !objectId)
    throw new StepError(
      'HubSpot needs an email or objectId to associate the event',
      { code: 'missing-input' },
    );

  // 2. Contact upsert -- rule-level overrides destination-level
  const identifyMapping = mappingSettings.identify ?? settings.identify;
  if (identifyMapping !== undefined) {
    const resolved = await getMappingValue(event, identifyMapping, {
      collector,
    });
    if (isObject(resolved)) await applyIdentify(sdk, resolved, state, logger);
  }

  // 3. The event (unless silent: true)
  if (rule?.silent === true) return { sdk };

  const eventName = buildEventName(
    settings.eventNamePrefix,
    mappingSettings.eventName,
    isString(rule?.name) ? rule.name : event.name,
  );

  // Build properties: defaultProperties + mapped properties, all strings
  let properties: Record<string, string> = {
    ...(settings.defaultProperties || {}),
  };

  if (mappingSettings.properties !== undefined) {
    const resolved = await getMappingValue(event, mappingSettings.properties, {
      collector,
    });
    if (isObject(resolved))
      properties = { ...properties, ...toStringProperties(resolved) };
  }

  const request: HubSpotEventRequest = {
    eventName,
    occurredAt: new Date(event.timestamp || Date.now()),
    properties,
  };

  // Attach identity
  if (email) request.email = email;
  if (objectId) request.objectId = objectId;

  return { sdk, request };
}

export const push: PushFn = async function (
  event,
  { config, rule, collector, env, logger },
) {
  const { sdk, request } = await prepare(
    event,
    config.settings,
    env,
    rule,
    collector,
    logger,
  );
  if (request)
    await call('HubSpot event send failed', () =>
      sdk.events.send.basicApi.send(request),
    );
};

/**
 * A flushed `config.batch` batch: each entry resolved in order (its contact
 * upsert included), the events sent through the batch API in chunks of 500.
 * A failed chunk fails its own entries, and an entry that cannot be resolved
 * fails alone; the rest are delivered. When nothing landed, the batch throws.
 */
export const pushBatch: PushBatchFn = async function (
  batch,
  { config, collector, env, logger },
) {
  const failed: Destination.BatchFailure[] = [];
  const sends: Array<{ index: number; request: HubSpotEventRequest }> = [];
  let sdk: HubSpotClientMock | undefined;

  for (const [index, entry] of batch.entries.entries()) {
    try {
      const prepared = await prepare(
        entry.event,
        config.settings,
        env,
        entry.rule,
        collector,
        logger,
      );
      sdk = prepared.sdk;
      if (prepared.request) sends.push({ index, request: prepared.request });
    } catch (error) {
      failed.push({ index, error });
    }
  }

  let sendError: unknown;
  for (let start = 0; sdk && start < sends.length; start += MAX_BATCH) {
    const chunk = sends.slice(start, start + MAX_BATCH);
    const client = sdk;
    try {
      await call('HubSpot batch send failed', () =>
        client.events.send.batchApi.send({
          inputs: chunk.map(({ request }) => request),
        }),
      );
    } catch (error) {
      sendError = sendError ?? error;
      for (const { index } of chunk) failed.push({ index, error });
    }
  }

  // Nothing landed: a whole-batch failure, which the breaker counts.
  if (failed.length === batch.entries.length && failed.length)
    throw sendError ?? failed[0].error;
  if (failed.length) return { failed };
};

/** Settings as init resolved them, the required ones present. */
function isReady(
  settings: Partial<Settings> | undefined,
): settings is Settings {
  return Boolean(settings?.accessToken && settings.eventNamePrefix);
}

function resolveString(value: unknown): string | undefined {
  if (isString(value) && value.length > 0) return value;
  return undefined;
}

function buildEventName(
  prefix: string,
  override: string | undefined,
  eventName: string,
): string {
  const name = override || eventName.toLowerCase().replace(/\s+/g, '_');
  return `${prefix}${name}`;
}

/**
 * Serialize all values to strings per HubSpot's API contract.
 */
export function toStringProperties(
  data: Record<string, unknown>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined && value !== null) {
      result[key] = String(value);
    }
  }
  return result;
}

function hashProperties(
  properties: Record<string, string> | undefined,
): string {
  if (!properties) return '';
  try {
    return JSON.stringify(properties);
  } catch {
    return '';
  }
}

async function applyIdentify(
  sdk: HubSpotClientMock,
  resolved: WalkerOS.AnyObject,
  state: RuntimeState,
  logger: Logger.Instance,
): Promise<void> {
  const identifyEmail = isString(resolved.email) ? resolved.email : undefined;
  if (!identifyEmail) {
    logger.warn('HubSpot identify requires email; skipping contact upsert');
    return;
  }

  const rawProperties = isObject(resolved.properties)
    ? toStringProperties(resolved.properties)
    : undefined;

  const propertiesHash = hashProperties(rawProperties);
  const last = state.lastIdentity || {};

  const emailChanged = identifyEmail !== last.email;
  const propertiesChanged = propertiesHash !== (last.propertiesHash ?? '');

  if (!emailChanged && !propertiesChanged) return;

  if (rawProperties)
    await call('HubSpot contact update failed', () =>
      sdk.crm.contacts.basicApi.update(
        identifyEmail,
        { properties: rawProperties },
        'email',
      ),
    );

  state.lastIdentity = {
    email: identifyEmail,
    propertiesHash,
  };
}
