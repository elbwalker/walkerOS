import type {
  Collector,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@walkeros/core';
import type { Hit, Input, Settings } from './types';
import { getGrantedConsent, getMappingValue } from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';

/** Auto-fill defaults. pageViewId has none: its default is the guard in resolveContext. */
export const DEFAULT_INPUTS: {
  ip: WalkerOSMapping.Value;
  userAgent: WalkerOSMapping.Value;
  language: WalkerOSMapping.Value;
  pageUrl: WalkerOSMapping.Value;
  referrer: WalkerOSMapping.Value;
  visitorId: WalkerOSMapping.Value;
  userId: WalkerOSMapping.Value;
  timestamp: WalkerOSMapping.Value;
} = {
  ip: ['ingest.ip', 'event.user.ip'],
  userAgent: ['ingest.userAgent', 'event.user.userAgent'],
  language: ['ingest.language', 'event.user.language'],
  pageUrl: 'event.source.url',
  referrer: 'event.source.referrer',
  visitorId: 'event.user.device',
  userId: 'event.user.id',
  timestamp: 'event.timestamp',
};

type InputName = keyof typeof DEFAULT_INPUTS;

export function isIdentified(
  setting: Settings['identified'],
  collector: Collector.Instance,
  event: WalkerOS.Event,
): boolean {
  if (setting === undefined || setting === true) return true;
  if (setting === false) return false;
  return getGrantedConsent(setting, collector.consent, event.consent) !== false;
}

/** A 16 hex id passes through; anything else is hashed, so walkerOS device ids always hash. */
export async function toVisitorId(value: string): Promise<string> {
  return /^[0-9a-f]{16}$/.test(value) ? value : getHashServer(value, 16);
}

/** The first 6 hex characters of a trace-like value, else a 6 hex hash. */
export async function toPageViewId(value: string): Promise<string> {
  return /^[0-9a-f]{6}/i.test(value)
    ? value.slice(0, 6).toLowerCase()
    : getHashServer(value, 6);
}

/** Context parameters in the fixed order url, urlref, cip, ua, lang, _id, uid, pv_id, cdt. Anonymous hits omit _id and uid. */
export async function resolveContext(input: {
  settings: Settings;
  event: WalkerOS.Event;
  ingest: Record<string, unknown> | undefined;
  collector: Collector.Instance;
  identified: boolean;
}): Promise<Hit> {
  const { settings, event, ingest, collector, identified } = input;
  const root = { ingest: ingest ?? {}, event };

  const resolve = async (value: Input | undefined) => {
    if (value === undefined || value === false) return undefined;
    const resolved = await getMappingValue(root, value, { collector });
    // An object or array, e.g. a path to a whole section, is no parameter value
    return resolved === undefined ||
      resolved === null ||
      resolved === '' ||
      typeof resolved === 'object'
      ? undefined
      : resolved;
  };

  const text = async (name: InputName) => {
    const value = await resolve(settings[name] ?? DEFAULT_INPUTS[name]);
    return value === undefined ? undefined : String(value);
  };

  const hit: Hit = [];
  const add = (param: string, value: string | undefined) => {
    if (value !== undefined) hit.push([param, value]);
  };

  add('url', await text('pageUrl'));
  add('urlref', await text('referrer'));
  add('cip', await text('ip'));
  add('ua', await text('userAgent'));
  add('lang', await text('language'));

  if (identified) {
    const visitorId = await text('visitorId');
    add(
      '_id',
      visitorId === undefined ? undefined : await toVisitorId(visitorId),
    );
    add('uid', await text('userId'));
  }

  const pageViewId =
    settings.pageViewId === undefined
      ? guardedTrace(event, collector)
      : await resolve(settings.pageViewId);
  if (pageViewId !== undefined)
    add('pv_id', await toPageViewId(String(pageViewId)));

  const timestamp = await resolve(
    settings.timestamp ?? DEFAULT_INPUTS.timestamp,
  );
  if (typeof timestamp === 'number' && Number.isFinite(timestamp))
    add('cdt', String(Math.round(timestamp / 1000)));

  return hit;
}

/**
 * The pageViewId default: a web event's own trace. An event without a payload
 * trace carries the server collector's run trace, constant for the process,
 * and GA4-decoded hits set platform from the hit, so both checks are needed.
 */
function guardedTrace(
  event: WalkerOS.Event,
  collector: Collector.Instance,
): string | undefined {
  const { platform, trace } = event.source;
  return platform === 'web' && trace && trace !== collector.trace
    ? trace
    : undefined;
}
