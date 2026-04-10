import type { WalkerOS } from '@walkeros/core';
import { getMappingValue, isNumber, isObject, isString } from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
import { getEnv } from '@walkeros/web-core';
import type {
  Destination,
  Env,
  Lintrk,
  LintrkTrackData,
  Mapping,
} from './types';

// Types export
export * as DestinationLinkedIn from './types';

/**
 * LinkedIn Insight Tag web destination.
 *
 * Loads the LinkedIn Insight Tag script from LinkedIn's CDN and forwards
 * explicit conversions via `window.lintrk('track', ...)`. Opt-in: events
 * without `mapping.settings.conversion` produce zero calls.
 *
 * See `/workspaces/developer/docs/research/linkedin-destination-guide.md`.
 */

const LINKEDIN_SCRIPT_SRC =
  'https://snap.licdn.com/li.lms-analytics/insight.min.js';

/**
 * Install the LinkedIn `window.lintrk` queue shim. Mirrors the official
 * snippet: any call made before the CDN script loads is pushed to a queue
 * the script processes once it initializes.
 *
 * Idempotent — if `lintrk` is already installed (e.g. another tag installed
 * it), leave the existing function alone.
 */
function installLintrkQueue(env: Env | undefined): void {
  const { window } = getEnv(env);
  const w = window as Env['window'];
  if (w.lintrk) return;
  const lintrk = function (this: unknown, ...args: unknown[]) {
    (lintrk.q = lintrk.q || []).push(args);
  } as unknown as Lintrk;
  lintrk.q = [];
  w.lintrk = lintrk;
}

function setPartnerGlobals(env: Env | undefined, partnerId: string): void {
  const { window } = getEnv(env);
  const w = window as Env['window'];
  w._linkedin_partner_id = partnerId;
  w._linkedin_data_partner_ids = w._linkedin_data_partner_ids || [];
  if (!w._linkedin_data_partner_ids.includes(partnerId)) {
    w._linkedin_data_partner_ids.push(partnerId);
  }
}

function addScript(env: DestinationWeb.Env | undefined): void {
  const { document } = getEnv(env);
  const doc = document as Document;
  const script = doc.createElement('script');
  script.src = LINKEDIN_SCRIPT_SRC;
  script.async = true;
  doc.head.appendChild(script);
}

/**
 * Resolve the short-key walkerOS mapping shape into a LintrkTrackData object.
 *
 * Input (already resolved via getMappingValue):
 *   { id, value?, currency?, eventId? }
 *
 * Output (vendor API shape):
 *   { conversion_id, conversion_value?, currency?, event_id? }
 *
 * Null/falsy guards:
 *  - id must resolve to a truthy number → otherwise return undefined (skip call)
 *  - other fields are omitted when falsy
 */
function buildLintrkData(resolved: unknown): LintrkTrackData | undefined {
  if (!isObject(resolved)) return undefined;

  const { id, value, currency, eventId } = resolved as {
    id?: unknown;
    value?: unknown;
    currency?: unknown;
    eventId?: unknown;
  };

  // id must be a truthy number (Campaign Manager conversion_id).
  // Accept numeric strings by coercion — users may supply { value: "12345" }.
  const numericId = isNumber(id)
    ? id
    : isString(id) && id !== '' && !Number.isNaN(Number(id))
      ? Number(id)
      : undefined;
  if (numericId === undefined || numericId === 0) return undefined;

  const data: LintrkTrackData = { conversion_id: numericId };

  // conversion_value — accept number or numeric string; omit if falsy/NaN.
  if (isNumber(value)) {
    data.conversion_value = value;
  } else if (isString(value) && value !== '') {
    const n = Number(value);
    if (!Number.isNaN(n)) data.conversion_value = n;
  }

  // currency — string only; omit if falsy.
  if (isString(currency) && currency !== '') {
    data.currency = currency;
  }

  // event_id — string only; omit if falsy.
  if (isString(eventId) && eventId !== '') {
    data.event_id = eventId;
  }

  return data;
}

export const destinationLinkedIn: Destination = {
  type: 'linkedin',

  config: {},

  init({ config, env }) {
    const settings = config.settings;
    if (!settings?.apiKey) return false;

    setPartnerGlobals(env as Env | undefined, settings.apiKey);
    installLintrkQueue(env as Env | undefined);

    // Script injection is opt-in via config.loadScript (same default as
    // plausible / meta). Users who already embed the Insight Tag snippet in
    // their HTML should leave loadScript false — the destination only
    // installs the queue shim and mutates _linkedin_partner_id.
    if (config.loadScript) addScript(env);

    return config;
  },

  async push(event, { rule, env }) {
    const { window } = getEnv(env);
    const w = window as Env['window'];
    const lintrk = w.lintrk;
    if (!lintrk) return; // init must have run

    // Honor rule-level skip (core flag at packages/core/src/types/mapping.ts:34).
    if (rule?.skip === true) return;

    const mappingSettings = (rule?.settings || {}) as Mapping;
    if (mappingSettings.conversion === undefined) return; // opt-in: no config = no call

    const resolved = await getMappingValue(
      event as WalkerOS.Event,
      mappingSettings.conversion,
    );

    const data = buildLintrkData(resolved);
    if (!data) return;

    lintrk('track', data);
  },

  on(type, context) {
    if (type !== 'consent' || !context.data) return;

    // LinkedIn has no vendor consent mode. The collector's config.consent gate
    // is the sole mechanism for blocking events. This handler exists for a
    // narrow case: config.loadScript was true BUT marketing consent was
    // initially denied, so init() skipped addScript(). When consent later
    // grants marketing, we inject the script.
    const consent = context.data as WalkerOS.Consent;
    const config = context.config;
    if (!config?.loadScript) return;
    if (consent.marketing !== true) return;

    // Check whether the script tag is already in the DOM — addScript is not
    // idempotent, and re-injecting would load the tag twice.
    const { document } = getEnv(context.env);
    const doc = document as Document;
    const existing = doc.querySelector
      ? doc.querySelector('script[src*="snap.licdn.com"]')
      : null;
    if (existing) return;

    addScript(context.env);
  },
};

export default destinationLinkedIn;
