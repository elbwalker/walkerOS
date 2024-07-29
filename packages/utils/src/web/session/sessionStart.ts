import type { WalkerOS } from '@elbwalker/types';
import type { SessionStorageConfig } from './';
import { sessionStorage } from './sessionStorage';
import { sessionWindow } from './sessionWindow';
import { elb } from '../elb';

export interface SessionConfig extends SessionStorageConfig {
  consent?: string;
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
  const sessionFn: SessionFunction = storage ? sessionStorage : sessionWindow;

  // Consent
  if (consent) {
    // require consent
    elb('walker on', 'consent', {
      [consent]: onConsentFn(config, cb),
    });
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
  const func = (instance: WalkerOS.Instance, consent: WalkerOS.Consent) => {
    let sessionFn: SessionFunction = () => sessionWindow(config); // Window by default

    if (config.consent && consent[config.consent])
      // Use storage if consent is granted
      sessionFn = () => sessionStorage(config);

    return callFuncAndCb(sessionFn(), instance, cb);
  };

  return func;
}

const defaultCb: SessionCallback = (session): WalkerOS.SessionData => {
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
