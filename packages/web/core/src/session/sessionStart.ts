import type { Collector, WalkerOS, On } from '@walkeros/core';
import type { SessionStorageConfig } from './';
import { sessionStorage, sessionWindow } from './';
import { elb as elbOrg } from '../elb';
import { getGrantedConsent, isArray, isDefined } from '@walkeros/core';

export interface SessionConfig extends SessionStorageConfig {
  consent?: string | string[];
  storage?: boolean;
  cb?: SessionCallback | false;
  collector?: Collector.Instance;
}

export type SessionFunction = typeof sessionStorage | typeof sessionWindow;
export type SessionCallback = (
  session: Collector.SessionData,
  collector: Collector.Instance | undefined,
  defaultCb: SessionCallback,
) => void;

export function sessionStart(
  config: SessionConfig = {},
): Collector.SessionData | void {
  const { cb, consent, collector, storage } = config;
  const elb = collector?.push || elbOrg;
  const sessionFn: SessionFunction = storage ? sessionStorage : sessionWindow;

  // Consent
  if (consent) {
    const consentHandler = onConsentFn(config, cb);

    const consentConfig = (
      isArray(consent) ? consent : [consent]
    ).reduce<On.ConsentConfig>(
      (acc, key) => ({ ...acc, [key]: consentHandler }),
      {},
    );
    // Register consent handlers with the collector
    elb('walker on', 'consent', consentConfig);
  } else {
    // just do it
    return callFuncAndCb(sessionFn(config), collector, cb);
  }
}

function callFuncAndCb(
  session: Collector.SessionData,
  collector?: Collector.Instance,
  cb?: SessionCallback | false,
) {
  if (cb === false) return session; // Callback is disabled
  if (!cb) cb = defaultCb; // Default callback if none is provided
  return cb(session, collector, defaultCb);
}

function onConsentFn(config: SessionConfig, cb?: SessionCallback | false) {
  // Track the last processed group to prevent duplicate processing
  let lastProcessedGroup: string | undefined;

  const func = (collector: Collector.Instance, consent: WalkerOS.Consent) => {
    // Skip if we've already processed this group
    if (
      isDefined(lastProcessedGroup) &&
      lastProcessedGroup === collector?.group
    )
      return;

    // Remember this group has been processed
    lastProcessedGroup = collector?.group;

    let sessionFn: SessionFunction = () => sessionWindow(config); // Window by default

    if (config.consent) {
      const consentKeys = (
        isArray(config.consent) ? config.consent : [config.consent]
      ).reduce<WalkerOS.Consent>((acc, key) => ({ ...acc, [key]: true }), {});

      if (getGrantedConsent(consentKeys, consent))
        // Use storage if consent is granted
        sessionFn = () => sessionStorage(config);
    }

    return callFuncAndCb(sessionFn(), collector, cb);
  };

  return func;
}

const defaultCb: SessionCallback = (
  session,
  collector,
): Collector.SessionData => {
  const elb = collector?.push || elbOrg;
  const user: WalkerOS.User = {};

  // User.session is the session ID
  if (session.id) user.session = session.id;

  // Set device ID only in storage mode
  if (session.storage && session.device) user.device = session.device;

  // Set user IDs - using unknown cast for type safety
  elb('walker user', user);

  if (session.isStart) {
    // Convert session start to an event object
    elb({
      name: 'session start',
      data: session,
    });
  }

  return session;
};
