import type { WalkerOS } from '@walkerOS/types';
import type { SessionStorageConfig } from './';
import { sessionStorage, sessionWindow } from './';
import { elb as elbOrg } from '../elb';
import { getGrantedConsent, isArray, isDefined } from '@walkerOS/utils';

export interface SessionConfig extends SessionStorageConfig {
  consent?: string | string[];
  storage?: boolean;
  cb?: SessionCallback | false;
  collector?: WalkerOS.Collector;
}

export type SessionFunction = typeof sessionStorage | typeof sessionWindow;
export type SessionCallback = (
  session: WalkerOS.SessionData,
  collector: WalkerOS.Collector | undefined,
  defaultCb: SessionCallback,
) => void;

export function sessionStart(
  config: SessionConfig = {},
): WalkerOS.SessionData | void {
  const { cb, consent, collector, storage } = config;
  const elb = collector?.push || elbOrg;
  const sessionFn: SessionFunction = storage ? sessionStorage : sessionWindow;

  // Consent
  if (consent) {
    const consentHandler = onConsentFn(config, cb);

    const consentConfig = (
      isArray(consent) ? consent : [consent]
    ).reduce<WalkerOS.AnyObject>(
      (acc, key) => ({ ...acc, [key]: consentHandler }),
      {},
    );
    elb('walker on', 'consent', consentConfig);
  } else {
    // just do it
    return callFuncAndCb(sessionFn(config), collector, cb);
  }
}

function callFuncAndCb(
  session: WalkerOS.SessionData,
  collector?: WalkerOS.Collector,
  cb?: SessionCallback | false,
) {
  if (cb === false) return session; // Callback is disabled
  if (!cb) cb = defaultCb; // Default callback if none is provided
  return cb(session, collector, defaultCb);
}

function onConsentFn(config: SessionConfig, cb?: SessionCallback | false) {
  // Track the last processed group to prevent duplicate processing
  let lastProcessedGroup: string | undefined;

  const func = (collector: WalkerOS.Collector, consent: WalkerOS.Consent) => {
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
): WalkerOS.SessionData => {
  const elb = collector?.push || elbOrg;
  const user: WalkerOS.User = {};

  // User.session is the session ID
  if (session.id) user.session = session.id;

  // Set device ID only in storage mode
  if (session.storage && session.device) user.device = session.device;

  // Set user IDs
  elb('walker user', user);

  if (session.isStart) elb('session start', session);

  return session;
};
