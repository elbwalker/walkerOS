// const deviceKey = config.deviceKey || 'elbDeviceId';
// Also as parameter possible like the isNew for sessionStart

import { elb, sessionStorage, sessionWindow } from '../../';
import type { SessionStorageConfig } from './';
import type { On, WalkerOS } from '@elbwalker/types';

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
  instance?: WalkerOS.Instance,
) => void;

export function sessionStart(config: SessionConfig = {}): SessionData | void {
  const { cb, consent, instance, storage } = config;
  const sessionFn: SessionFunction = storage ? sessionStorage : sessionWindow;

  // Consent
  if (consent) {
    // require consent
    elb('walker on', 'consent', {
      [consent]: [onConsentFn(config, cb)],
    });
  } else {
    // just do it
    return callFuncAndCb(sessionFn(config), cb, instance);
  }
}

function callFuncAndCb(
  session: SessionData,
  cb?: SessionCallback | false,
  instance?: WalkerOS.Instance,
) {
  if (cb === false) return session; // Callback is disabled
  if (!cb) cb = defaultCb; // Default callback if none is provided
  return cb(session, instance);
}

function onConsentFn(config: SessionConfig, cb?: SessionCallback | false) {
  const func: On.OnConsentFn = (instance, consent) => {
    let sessionFn: SessionFunction = () => sessionWindow(config); // Window by default

    if (config.consent && consent[config.consent])
      // Use storage if consent is granted
      sessionFn = () => sessionStorage(config);

    return callFuncAndCb(sessionFn(), cb, instance);
  };

  return func;
}

const defaultCb: SessionCallback = (session): SessionData => {
  if (session.storage) {
    // Set user IDs
    const user: WalkerOS.User = {};
    if (session.id) user.session = session.id;
    if (session.device) user.device = session.device;

    elb('walker user', user);
  }

  if (session.isNew) elb('session new', session);
  if (session.isStart) elb('session start', session);

  return session;
};
