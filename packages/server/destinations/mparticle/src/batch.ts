import type {
  CommerceEventData,
  ConsentState,
  CustomEventType,
  Environment,
  MParticleBatch,
  MParticleEvent,
  Pod,
  ScreenViewEventData,
} from './types';

/**
 * Returns the mParticle Events API endpoint for the given pod.
 * us1 resolves to the legacy host (`s2s.mparticle.com`); other pods use the
 * pod-qualified host.
 * https://docs.mparticle.com/developers/server/http/#endpoint
 */
export function buildEndpoint(pod: Pod = 'us1'): string {
  if (pod === 'us1') return 'https://s2s.mparticle.com/v2/events';
  return `https://s2s.${pod}.mparticle.com/v2/events`;
}

/**
 * Builds the HTTP Basic auth header value from an API key/secret pair.
 * Uses Buffer (Node) for base64 encoding to keep server semantics.
 */
export function buildAuthHeader(apiKey: string, apiSecret: string): string {
  const token = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64');
  return `Basic ${token}`;
}

/**
 * Builds a custom_event payload.
 */
export function buildCustomEvent(
  eventName: string,
  customEventType: CustomEventType,
  customAttributes: Record<string, unknown> | undefined,
  timestamp: number | undefined,
  sourceMessageId: string | undefined,
): MParticleEvent {
  return {
    event_type: 'custom_event',
    data: {
      event_name: eventName,
      custom_event_type: customEventType,
      ...(customAttributes && Object.keys(customAttributes).length > 0
        ? { custom_attributes: customAttributes }
        : {}),
      ...(timestamp !== undefined ? { timestamp_unixtime_ms: timestamp } : {}),
      ...(sourceMessageId ? { source_message_id: sourceMessageId } : {}),
    },
  };
}

/**
 * Builds a screen_view event payload.
 */
export function buildScreenViewEvent(
  screenName: string | undefined,
  customAttributes: Record<string, unknown> | undefined,
  timestamp: number | undefined,
  sourceMessageId: string | undefined,
): MParticleEvent {
  const data: ScreenViewEventData = {
    ...(screenName ? { screen_name: screenName } : {}),
    ...(customAttributes && Object.keys(customAttributes).length > 0
      ? { custom_attributes: customAttributes }
      : {}),
    ...(timestamp !== undefined ? { timestamp_unixtime_ms: timestamp } : {}),
    ...(sourceMessageId ? { source_message_id: sourceMessageId } : {}),
  };
  return { event_type: 'screen_view', data };
}

/**
 * Builds a commerce_event payload. Commerce data is a loosely-shaped subset
 * of {@link CommerceEventData} (product_action, currency_code, ...) resolved
 * from the per-rule commerce mapping.
 */
export function buildCommerceEvent(
  commerceData: Partial<CommerceEventData> | undefined,
  customAttributes: Record<string, unknown> | undefined,
  timestamp: number | undefined,
  sourceMessageId: string | undefined,
): MParticleEvent {
  const data: CommerceEventData = {
    ...(commerceData || {}),
    ...(customAttributes && Object.keys(customAttributes).length > 0
      ? { custom_attributes: customAttributes }
      : {}),
    ...(timestamp !== undefined ? { timestamp_unixtime_ms: timestamp } : {}),
    ...(sourceMessageId ? { source_message_id: sourceMessageId } : {}),
  };
  return { event_type: 'commerce_event', data };
}

export interface BuildBatchOptions {
  ip?: string;
  sourceRequestId?: string;
  consent?: ConsentState;
  context?: Record<string, unknown>;
}

/**
 * Assembles the batch envelope wrapping events + identity + environment.
 */
export function buildBatch(
  events: MParticleEvent[],
  userIdentities: Record<string, string | number> | undefined,
  userAttributes: Record<string, unknown> | undefined,
  environment: Environment,
  options: BuildBatchOptions = {},
): MParticleBatch {
  const batch: MParticleBatch = {
    events,
    environment,
  };
  if (userIdentities && Object.keys(userIdentities).length > 0)
    batch.user_identities = userIdentities;
  if (userAttributes && Object.keys(userAttributes).length > 0)
    batch.user_attributes = userAttributes;
  if (options.ip) batch.ip = options.ip;
  if (options.sourceRequestId)
    batch.source_request_id = options.sourceRequestId;
  if (options.consent) batch.consent_state = options.consent;
  if (options.context) batch.context = options.context;
  return batch;
}
