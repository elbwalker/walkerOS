import type { WalkerOS } from '@elbwalker/types';
import type { SessionStorageConfig } from './';
import { sessionStorage, sessionWindow } from './';
import { elb as elbOrg } from '../elb';
import { isArray, isDefined, isString } from '../../core/is';
import { getGrantedConsent } from '../../core';

export interface SessionConfig extends SessionStorageConfig {
  consent?: string | string[];
  storage?: boolean;
  cb?: SessionCallback | false;
  instance?: WalkerOS.Instance;
}

export type SessionFunction = typeof sessionStorage | typeof sessionWindow;
export type SessionCallback = (
  session: WalkerOS.SessionData,
  instance: WalkerOS.Instance | undefined,
  defaultCb: SessionCallback,
) => void;

export function sessionStart(
  config: SessionConfig = {},
): WalkerOS.SessionData | void {
  const { cb, consent, instance, storage } = config;
  const elb = instance?.push || elbOrg;
  const sessionFn: SessionFunction = storage ? sessionStorage : sessionWindow;

  // Consent
  if (consent) {
    const consentConfig = (isArray(consent) ? consent : [consent]).reduce<
      Record<string, ReturnType<typeof onConsentFn>>
    >((acc, key) => ({ ...acc, [key]: onConsentFn(config, cb) }), {});
    elb('walker on', 'consent', consentConfig);
  } else {
    // just do it
    return callFuncAndCb(sessionFn(config), instance, cb);
  }
}

function callFuncAndCb(
  session: WalkerOS.SessionData,
  instance?: WalkerOS.Instance,
  cb?: SessionCallback | false,
) {
  if (cb === false) return session; // Callback is disabled
  if (!cb) cb = defaultCb; // Default callback if none is provided
  return cb(session, instance, defaultCb);
}

function onConsentFn(config: SessionConfig, cb?: SessionCallback | false) {
  // Track the last processed group to prevent duplicate processing
  let lastProcessedGroup: string | undefined;

  const func = (instance: WalkerOS.Instance, consent: WalkerOS.Consent) => {
    // Skip if we've already processed this group
    if (isDefined(lastProcessedGroup) && lastProcessedGroup === instance?.group)
      return;

    // Remember this group has been processed
    lastProcessedGroup = instance?.group;

    let sessionFn: SessionFunction = () => sessionWindow(config); // Window by default

    const consentKeys = config.consent
      ? (isArray(config.consent)
          ? config.consent
          : [config.consent]
        ).reduce<WalkerOS.Consent>((acc, key) => ({ ...acc, [key]: true }), {})
      : {};

    if (getGrantedConsent(consentKeys, consent))
      // Use storage if consent is granted
      sessionFn = () => sessionStorage(config);

    return callFuncAndCb(sessionFn(), instance, cb);
  };

  return func;
}

const defaultCb: SessionCallback = (
  session,
  instance,
): WalkerOS.SessionData => {
  const elb = instance?.push || elbOrg;
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
