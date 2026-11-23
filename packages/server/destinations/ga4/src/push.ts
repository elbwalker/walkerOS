import type { ConsentValue, PushFn, RequestBody } from './types';
import type { WalkerOS } from '@walkeros/core';
import { isObject, StepError } from '@walkeros/core';
import { getHashServer, sendServer } from '@walkeros/server-core';

const DEFAULT_URL = 'https://www.google-analytics.com/mp/collect';

// "<random>.<first visit in seconds>", as in the _ga cookie GA1.1.<random>.<seconds>
const CLIENT_ID = /^\d{1,20}\.\d{1,20}$/;
const SESSION_ID = /^\d{1,20}$/;
const EVENT_NAME = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;
// GA4 accepts events up to 72 hours old; older ones get the reception time.
const MAX_AGE_MS = 71 * 3600 * 1000;

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as T;
}

/**
 * A stable client id for an event without one (no _ga cookie): derived from
 * the event id, so a retried event keeps the same id.
 */
export async function fallbackClientId(event: WalkerOS.Event): Promise<string> {
  const digest = await getHashServer(String(event.id ?? ''));
  const random = parseInt(digest.slice(0, 8), 16);
  const seconds = Math.floor(Number(event.timestamp || Date.now()) / 1000);
  return `${random}.${seconds}`;
}

/** Event name: the mapped name with `_` for spaces. */
function eventName(name: string): string {
  const normalized = name.trim().replace(/ /g, '_');
  if (!EVENT_NAME.test(normalized))
    throw new StepError(`GA4 event name "${name}" is invalid`, {
      code: 'mapping',
      retryable: false,
    });
  return normalized;
}

export async function buildBody(
  event: WalkerOS.Event,
  data: Record<string, unknown>,
): Promise<RequestBody> {
  const params: Record<string, unknown> = withoutUndefined({
    ...(isObject(data.params) ? data.params : {}),
    session_id: SESSION_ID.test(String(data.session_id ?? ''))
      ? String(data.session_id)
      : undefined,
    engagement_time_msec: 1,
  });
  if (params.value !== undefined) {
    const value = Number(params.value);
    if (Number.isFinite(value)) params.value = value;
    else delete params.value;
  }

  const ads: ConsentValue =
    event.consent?.marketing === true ? 'GRANTED' : 'DENIED';
  const timestamp = Number(event.timestamp);
  const clientId = String(data.client_id ?? '');

  return withoutUndefined({
    client_id: CLIENT_ID.test(clientId)
      ? clientId
      : await fallbackClientId(event),
    user_id:
      typeof data.user_id === 'string' && data.user_id !== ''
        ? data.user_id
        : undefined,
    timestamp_micros:
      Number.isFinite(timestamp) && timestamp > Date.now() - MAX_AGE_MS
        ? Math.round(timestamp) * 1000
        : undefined,
    consent: { ad_user_data: ads, ad_personalization: ads },
    events: [{ name: eventName(event.name), params }],
  });
}

// A silent rule has no GA4 call of its own: nothing to send.
export const push: PushFn = async function (event, context) {
  if (!context.rule?.silent) await send(event, context);
};

const send: PushFn = async function (event, { config, data, env, logger }) {
  const { measurementId, apiSecret, url = DEFAULT_URL } = config.settings ?? {};
  if (!measurementId || !apiSecret)
    throw new StepError('GA4 settings missing, init() not run', {
      code: 'not-ready',
    });

  const body = await buildBody(event, isObject(data) ? data : {});
  const endpoint = `${url}?measurement_id=${encodeURIComponent(measurementId)}&api_secret=${encodeURIComponent(apiSecret)}`;

  logger.debug('Calling GA4 Measurement Protocol', {
    name: body.events[0].name,
    eventId: event.id,
  });

  const sendServerFn = env?.sendServer || sendServer;
  await sendServerFn(endpoint, JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  });
};
