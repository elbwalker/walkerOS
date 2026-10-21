import {
  getMappingValue,
  isNumber,
  isObject,
  isString,
  StepError,
  stepCall,
} from '@walkeros/core';
import type { DestinationWeb } from '@walkeros/web-core';
import { getEnv, loadVendor } from '@walkeros/web-core';
import type { Destination, Lintrk, LintrkTrackData, Mapping } from './types';

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
 * Idempotent - if `lintrk` is already installed (e.g. another tag installed
 * it), leave the existing function alone.
 */
function installLintrkQueue(env?: DestinationWeb.Env): void {
  const { window } = getEnv(env);
  if (window.lintrk) return;
  const lintrk: Lintrk = Object.assign(
    (...args: unknown[]) => {
      (lintrk.q ||= []).push(args);
    },
    { q: [] },
  );
  window.lintrk = lintrk;
}

function setPartnerGlobals(
  env: DestinationWeb.Env | undefined,
  partnerId: string,
): void {
  const { window } = getEnv(env);
  window._linkedin_partner_id = partnerId;
  const ids = (window._linkedin_data_partner_ids ||= []);
  if (!ids.includes(partnerId)) ids.push(partnerId);
}

/**
 * The Insight Tag script `loadVendor` injects with `loadScript`. lintrk
 * replays its own queue, so it is called synchronously and only a failed
 * script is reported.
 */
function vendor(
  config: { loadScript?: boolean; timeout?: number },
  env?: DestinationWeb.Env,
) {
  return loadVendor(
    config.loadScript ? LINKEDIN_SCRIPT_SRC : undefined,
    () => getEnv(env).window.lintrk,
    { timeout: config.timeout, document: getEnv(env).document },
  );
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

  const { id, value, currency, eventId } = resolved;

  // id must be a truthy number (Campaign Manager conversion_id).
  // Accept numeric strings by coercion - users may supply { value: "12345" }.
  const numericId = isNumber(id)
    ? id
    : isString(id) && id !== '' && !Number.isNaN(Number(id))
      ? Number(id)
      : undefined;
  if (numericId === undefined || numericId === 0) return undefined;

  const data: LintrkTrackData = { conversion_id: numericId };

  // conversion_value - accept number or numeric string; omit if falsy/NaN.
  if (isNumber(value)) {
    data.conversion_value = value;
  } else if (isString(value) && value !== '') {
    const n = Number(value);
    if (!Number.isNaN(n)) data.conversion_value = n;
  }

  // currency - string only; omit if falsy.
  if (isString(currency) && currency !== '') {
    data.currency = currency;
  }

  // event_id - string only; omit if falsy.
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
    if (!settings?.apiKey)
      throw new StepError('LinkedIn needs settings.apiKey', { code: 'config' });

    setPartnerGlobals(env, settings.apiKey);
    installLintrkQueue(env);

    // Script injection is opt-in via config.loadScript (same default as
    // plausible / meta). Users who already embed the Insight Tag snippet in
    // their HTML should leave loadScript false - the destination only
    // installs the queue shim and mutates _linkedin_partner_id.
    vendor(config, env);

    return config;
  },

  async push(event, { config, rule, env, collector }) {
    vendor(config, env).check();

    const { lintrk } = getEnv(env).window;
    if (!lintrk)
      throw new StepError('LinkedIn Insight Tag not ready: lintrk is missing', {
        code: 'vendor-not-ready',
      });

    const mappingSettings: Mapping = rule?.settings || {};

    // Opt-in: a rule without a conversion makes no call. Honor rule-level
    // silent (core flag at packages/core/src/types/mapping.ts) the same way.
    if (rule?.silent !== true && mappingSettings.conversion !== undefined) {
      const resolved = await getMappingValue(
        event,
        mappingSettings.conversion,
        { collector },
      );

      const data = buildLintrkData(resolved);
      if (!data)
        throw new StepError(
          'LinkedIn conversion mapping resolved to no conversion id',
          { code: 'missing-input' },
        );

      await stepCall(
        () => lintrk('track', data),
        'transport',
        'LinkedIn lintrk call failed',
      );
    }
  },

  on(type, { config, data, env }) {
    if (type !== 'consent' || !isObject(data)) return;

    // LinkedIn has no vendor consent mode. The collector's config.consent gate
    // is the sole mechanism for blocking events. This handler exists for a
    // narrow case: config.loadScript was true BUT marketing consent was
    // initially denied, so init() did not run. When consent later grants
    // marketing, the script is injected; loadVendor injects it once per page.
    if (!config.loadScript) return;
    if (data.marketing !== true) return;

    vendor(config, env);
  },
};

export default destinationLinkedIn;
