import type {
  Collector,
  Mapping as WalkerOSMapping,
  WalkerOS,
} from '@walkeros/core';
import type { Hit, Input, Settings, Target } from './types';
import { createMappingRoot, getMappingValue } from '@walkeros/core';
import { getHashServer } from '@walkeros/server-core';
import { isHttpUrl, normalizeUrl } from './config';
import { toPositiveInteger } from './items';

/**
 * Defaults of the context settings. ip, userAgent and userId have none: an
 * analytics destination sends the visitor's IP, user agent and user ID only
 * where the operator maps them.
 */
export const DEFAULT_INPUTS: {
  language: WalkerOSMapping.Value;
  pageUrl: WalkerOSMapping.Value;
  referrer: WalkerOSMapping.Value;
  visitorId: WalkerOSMapping.Value;
  screenSize: WalkerOSMapping.Value;
  timestamp: WalkerOSMapping.Value;
} = {
  language: ['ingest.language', 'event.user.language'],
  pageUrl: 'event.source.url',
  referrer: 'event.source.referrer',
  visitorId: 'event.user.device',
  screenSize: 'event.user.screenSize',
  timestamp: 'event.timestamp',
};

type InputName = keyof typeof DEFAULT_INPUTS;

const SCREEN_SIZE = /^\d+x\d+$/;

/** A 16 lowercase hex id passes through; anything else is hashed, so walkerOS device ids always hash. */
export async function toVisitorId(value: string): Promise<string> {
  return /^[0-9a-f]{16}$/.test(value) ? value : getHashServer(value, 16);
}

/** The first 6 hex characters of a trace-like value, else a 6 hex hash. */
export async function toPageViewId(value: string): Promise<string> {
  return /^[0-9a-f]{6}/i.test(value)
    ? value.slice(0, 6).toLowerCase()
    : getHashServer(value, 6);
}

/**
 * The pageViewId default: a web event's own trace. An event without a payload
 * trace carries the server collector's run trace, constant for the process,
 * and GA4-decoded hits set platform from the hit, so both checks are needed.
 */
export function guardedTrace(
  event: WalkerOS.Event,
  collector: Collector.Instance,
): string | undefined {
  const { platform, trace } = event.source;
  return platform === 'web' && trace && trace !== collector.trace
    ? trace
    : undefined;
}

/**
 * A setting resolved against `{ ingest, event }`, with the event as the
 * mapping context's event. An object or array (a path to a whole section),
 * null or '' is no parameter value.
 */
async function resolveValue(
  value: WalkerOSMapping.Value,
  root: WalkerOSMapping.Root,
  event: WalkerOS.Event,
  collector: Collector.Instance,
): Promise<string | number | boolean | undefined> {
  const resolved = await getMappingValue(root, value, { collector, event });
  if (resolved === '') return undefined;
  return typeof resolved === 'string' ||
    typeof resolved === 'number' ||
    typeof resolved === 'boolean'
    ? resolved
    : undefined;
}

/**
 * Context parameters in the fixed order url, urlref, res, lang, ua, cip, cid,
 * uid, pv_id, cdt, each setting read once. A screen size that is not WxH is
 * not sent and named in `dropped`.
 */
export async function resolveContext(input: {
  settings: Settings;
  event: WalkerOS.Event;
  ingest: Record<string, unknown> | undefined;
  collector: Collector.Instance;
}): Promise<{ hit: Hit; dropped: string[] }> {
  const { settings, event, ingest, collector } = input;
  const root = createMappingRoot(ingest, event);

  const read = async (value: Input | undefined) =>
    value === undefined || value === false
      ? undefined
      : resolveValue(value, root, event, collector);
  const text = async (value: Input | undefined) => {
    const resolved = await read(value);
    return resolved === undefined ? undefined : String(resolved);
  };
  const setting = (name: InputName): Input =>
    settings[name] ?? DEFAULT_INPUTS[name];

  const hit: Hit = [];
  const dropped: string[] = [];
  const add = (param: string, value: string | undefined) => {
    if (value !== undefined) hit.push([param, value]);
  };

  add('url', await text(setting('pageUrl')));
  add('urlref', await text(setting('referrer')));

  const screenSize = await text(setting('screenSize'));
  if (screenSize !== undefined && !SCREEN_SIZE.test(screenSize))
    dropped.push('screenSize (not WxH)');
  else add('res', screenSize);

  add('lang', await text(setting('language')));
  add('ua', await text(settings.userAgent));
  add('cip', await text(settings.ip));

  const visitorId = await text(setting('visitorId'));
  if (visitorId !== undefined) add('cid', await toVisitorId(visitorId));

  add('uid', await text(settings.userId));

  const pageViewId =
    settings.pageViewId === undefined
      ? guardedTrace(event, collector)
      : await text(settings.pageViewId);
  if (pageViewId !== undefined) add('pv_id', await toPageViewId(pageViewId));

  const timestamp = await read(setting('timestamp'));
  if (typeof timestamp === 'number' && Number.isFinite(timestamp))
    add('cdt', String(Math.round(timestamp / 1000)));

  return { hit, dropped };
}

/** An http(s) URL as the tracker endpoint `<url>matomo.php`. */
function toEndpoint(url: string): string | undefined {
  return isHttpUrl(url) ? `${normalizeUrl(url)}matomo.php` : undefined;
}

/**
 * The event's site ID and tracker endpoint: a string (or a number for
 * siteId) is the value itself, a value config resolves per event against
 * `{ ingest, event }`, so one step can serve several sites.
 */
export async function resolveTarget(
  settings: Settings,
  event: WalkerOS.Event,
  ingest: Record<string, unknown> | undefined,
  collector: Collector.Instance,
): Promise<{ endpoint: string; siteId: string } | { invalid: string }> {
  const root = createMappingRoot(ingest, event);
  const resolve = async (target: Target | number) =>
    typeof target === 'string' || typeof target === 'number'
      ? target
      : resolveValue(target, root, event, collector);

  const siteId = toPositiveInteger(await resolve(settings.siteId));
  if (siteId === undefined) return { invalid: 'siteId resolved to no site id' };

  const url = await resolve(settings.url);
  const endpoint = typeof url === 'string' ? toEndpoint(url) : undefined;
  if (endpoint === undefined)
    return { invalid: 'url resolved to no http(s) URL' };

  return { endpoint, siteId };
}
