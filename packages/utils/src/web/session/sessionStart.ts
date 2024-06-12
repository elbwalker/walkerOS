import type { On, WalkerOS } from '@elbwalker/types';
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

export interface SessionData {
  isStart: boolean; // If this is a new session or a known one
  storage: boolean; // If the storage was used to determine the session
  id?: string; // Session ID
  start?: number; // Timestamp of session start
  marketing?: true; // If the session was started by a marketing parameters
  // Storage data
  updated?: number; // Timestamp of last update
  isNew?: boolean; // If this is the first visit on a device
  device?: string; // Device ID
  count?: number; // Total number of sessions
  runs?: number; // Total number of runs (like page views)
}

export type SessionFunction = typeof sessionStorage | typeof sessionWindow;
export type SessionCallback = (
  session: SessionData,
  instance: WalkerOS.Instance | undefined,
  defaultCb: SessionCallback,
) => void;

export function sessionStart(config: SessionConfig = {}): SessionData | void {
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
  session: SessionData,
  instance?: WalkerOS.Instance,
  cb?: SessionCallback | false,
) {
  if (cb === false) return session; // Callback is disabled
  if (!cb) cb = defaultCb; // Default callback if none is provided
  return cb(session, instance, defaultCb);
}

function onConsentFn(config: SessionConfig, cb?: SessionCallback | false) {
  const func: On.ConsentFn = (instance, consent) => {
    let sessionFn: SessionFunction = () => sessionWindow(config); // Window by default

    if (config.consent && consent[config.consent])
      // Use storage if consent is granted
      sessionFn = () => sessionStorage(config);

    return callFuncAndCb(sessionFn(), instance, cb);
  };

  return func;
}

const defaultCb: SessionCallback = (session): SessionData => {
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
