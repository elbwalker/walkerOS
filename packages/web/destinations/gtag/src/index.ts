import type { WalkerOS, On, Collector, Logger } from '@walkeros/core';
import type { Settings, Destination, Env, Config } from './types';
import { initGA4, pushGA4Event } from './ga4';
import { initAds, pushAdsEvent, resolveUserData } from './ads';
import { initGTM, pushGTMEvent } from './gtm';
import { gtmVendor } from './gtm/config';
import { getData } from './shared/mapping';
import {
  buildDefaultConsent,
  hasConsentSignal,
  resolveConsentMapping,
} from './shared/consent';
import { checkGtag, initializeGtag } from './shared/gtag';
import { hasTool, TOOL_PATHS } from './shared/tools';
import {
  isObject,
  reportCause,
  stepCall,
  stepId,
  StepError,
} from '@walkeros/core';
import { getEnv } from '@walkeros/web-core';

// Types
export * as DestinationGtag from './types';

// Track whether default consent has been set
let defaultConsentSet = false;

// For testing: allow resetting consent state
export function resetConsentState(): void {
  defaultConsentSet = false;
}

// Establish the Consent Mode v2 denied baseline BEFORE any tool's config call,
// per Google's required ordering. Gated on the destination's OWN config: a
// consent signal (config.consent set, or como_advanced) and como !== false.
// Idempotent via defaultConsentSet (consent state is window-global).
function setupConsentDefault(config: Config, env: Env | undefined): unknown[] {
  const settings = config.settings || {};
  if (defaultConsentSet) return [];
  if (!hasConsentSignal(config.consent, settings)) return [];

  const defaultConsent = buildDefaultConsent(settings);
  if (!defaultConsent) return []; // como:false or no params

  const { window } = getEnv<Env>(env);
  const gtag = initializeGtag(window); // ensure stub exists before any config
  if (!gtag) return [];

  // defaultConsentSet is set by the caller once this call settled.
  return [gtag('consent', 'default', defaultConsent)];
}

/**
 * Throws `vendor-not-loaded` once a script the destination loaded failed:
 * gtag replays its stub, so events before that go out as usual.
 */
function checkScripts(config: Config): void {
  const { settings = {}, loadScript, timeout } = config;
  const { ga4, ads, gtm } = settings;
  if (!loadScript) return;
  if (ga4?.measurementId && ga4.init !== false)
    checkGtag(ga4.measurementId, ga4.scriptSrc, timeout);
  if (ads?.conversionId) checkGtag(ads.conversionId, undefined, timeout);
  if (gtm?.containerId) gtmVendor(gtm, timeout).check();
}

export const destinationGtag: Destination = {
  type: 'google-gtag',

  // Observable env callable for trace-level vendor-call capture. Mirrors the
  // dev-env simulation list (src/examples/env.ts).
  calls: ['call:window.gtag'],

  config: { settings: {} },

  async init({ config, env, logger }) {
    const { settings = {}, loadScript, timeout } = config;
    const { ga4, ads, gtm } = settings;

    // Fail if no tools are configured
    if (!hasTool(settings))
      throw new StepError(`Config settings ${TOOL_PATHS} missing`, {
        code: 'config',
      });

    // Observe gtag's origin BEFORE anything (including the consent default)
    // installs a stub, so a later `js` is only sent if walkerOS bootstrapped.
    const gtagExternal = !!getEnv<Env>(env).window.gtag;

    let defaultSent = false;
    await stepCall(
      () => {
        // Emit the denied consent default before any tool's config call.
        const defaultCall = setupConsentDefault(config, env);
        defaultSent = defaultCall.length > 0;
        return Promise.all([
          ...defaultCall,
          // Initialize GA4 if configured
          ...(ga4?.measurementId
            ? initGA4(ga4, loadScript, env, logger, gtagExternal, timeout)
            : []),
          // Initialize Google Ads if configured
          ...(ads?.conversionId
            ? initAds(ads, loadScript, env, logger, gtagExternal, timeout)
            : []),
          // Initialize GTM if configured
          ...(gtm?.containerId
            ? initGTM(gtm, loadScript, env, logger, timeout)
            : []),
        ]);
      },
      'vendor-not-ready',
      'Google tag did not take its setup calls',
    );
    // Only a default gtag took counts: a failed init sends it again.
    if (defaultSent) defaultConsentSet = true;

    return config;
  },

  async push(event, { config, rule = {}, data, env, collector, logger, id }) {
    checkScripts(config);
    const { settings = {} } = config;
    const { ga4, ads, gtm } = settings;
    const eventMapping = rule.settings || {};

    // Resolve data for each tool with proper priority
    const ga4Data = await getData(
      event,
      data as WalkerOS.AnyObject,
      config,
      ga4,
      collector,
    );
    const adsData = await getData(
      event,
      data as WalkerOS.AnyObject,
      config,
      ads,
      collector,
    );
    // Without any data mapping, GTM gets no data and pushes the event as-is.
    const gtmData =
      data === undefined && gtm?.data === undefined
        ? undefined
        : await getData(
            event,
            data as WalkerOS.AnyObject,
            config,
            gtm,
            collector,
          );

    // A silent rule sends none of the default calls below.
    const send = !rule.silent;

    // Resolve enhanced conversions user data if configured
    let adsUserData: Record<string, unknown> | undefined;
    if (send && ads?.conversionId && ads?.enhancedConversions) {
      adsUserData = await resolveUserData(event, ads, collector);
    }

    await stepCall(
      () =>
        Promise.all([
          // Push to GA4 if configured
          ...(send && ga4?.measurementId
            ? [
                pushGA4Event(event, ga4, ga4Data, env, logger, (message, key) =>
                  // One line per cause through the collector's cause log; the
                  // context names the mapping key, never its value.
                  reportCause(
                    collector,
                    logger,
                    { step: stepId('destination', id), code: 'mapping' },
                    message,
                    { event: event.name, mappingKey: key },
                  ),
                ),
              ]
            : []),
          // @TODO: Fix condition - should check for rule.settings?.ads?.label || rule.name
          // Currently requires rule.name even when label is provided via settings.ads.label
          ...(send && ads?.conversionId && rule.name
            ? pushAdsEvent(
                event,
                ads,
                eventMapping.ads,
                adsData,
                rule.name,
                env,
                logger,
                adsUserData,
              )
            : []),
          // Push to GTM if configured
          ...(send && gtm?.containerId
            ? [pushGTMEvent(event, gtm, eventMapping.gtm, gtmData, env, logger)]
            : []),
        ]),
      'transport',
      'Google tag call failed',
    );
  },

  async on(type, context) {
    // Only handle consent events
    if (type !== 'consent' || !isObject(context.data)) return;

    const consent = context.data;
    // `on` runs with the runtime (non-generic) context, so config.settings and
    // env surface as the loose base types. Narrowing them to this destination's
    // own Settings/Env needs a core-types change to make `on` generic over
    // Types; tracked as a follow-up. The two `as` casts mark that boundary.
    const settings = (context.config?.settings || {}) as Partial<Settings>;

    // Skip if consent mode is disabled (como === false)
    const mapping = resolveConsentMapping(settings);
    if (!mapping) return;

    // gtag is available after init() - on() is only called after init completes
    const { window } = getEnv<Env>(context.env as Env);
    const gtag = window.gtag;
    if (!gtag) return;

    // Safety net for setups that fire consent without init having seen a signal:
    // establish the denied default once before the first update.
    const defaultConsent = defaultConsentSet
      ? undefined
      : buildDefaultConsent(settings);

    // Build gtag consent object for update
    const gtagConsent: Record<string, 'granted' | 'denied'> = {};

    // Map walkerOS consent to gtag consent parameters for update
    Object.entries(consent).forEach(([walkerOSGroup, granted]) => {
      const gtagParams = mapping[walkerOSGroup];
      if (!gtagParams) return;

      const params = Array.isArray(gtagParams) ? gtagParams : [gtagParams];
      const consentValue = granted ? 'granted' : 'denied';

      params.forEach((param) => {
        gtagConsent[param] = consentValue;
      });
    });

    await stepCall(
      () =>
        Promise.all([
          ...(defaultConsent
            ? [gtag('consent', 'default', defaultConsent)]
            : []),
          // Always use update after the initial default, when a parameter changes
          ...(Object.keys(gtagConsent).length
            ? [gtag('consent', 'update', gtagConsent)]
            : []),
        ]),
      'consent-not-applied',
      'Google tag did not take the consent update',
    );
    defaultConsentSet = true;
  },
};

export default destinationGtag;
