// const deviceKey = config.deviceKey || 'elbDeviceId';
// Also as parameter possible like the isNew for sessionStart

import { elb, sessionStorage, sessionWindow } from '../../';
import type { SessionStorageConfig } from './';
import type { On, WalkerOS } from '@elbwalker/types';

export interface SessionConfig extends SessionStorageConfig {
  consent?: string;
  storage?: boolean;
}

export interface SessionData {
  isNew: boolean; // If this is a new session or a known one
  storage: boolean; // If the storage was used to determine the session
  id?: string; // Session ID
  start?: number; // Timestamp of session start
  marketing?: true; // If the session was started by a marketing parameters
  // Storage data
  updated?: number; // Timestamp of last update
  isFirst?: boolean; // If this is the first visit on a device
  count?: number; // Total number of sessions
  runs?: number; // Total number of runs (like page views)
}

export type SessionFunction = typeof sessionStorage | typeof sessionWindow;
export type SessionCallback = (
  data: SessionData,
  instance?: WalkerOS.Instance,
) => void;

export function sessionStart(
  config: SessionConfig = {},
  cb?: SessionCallback,
  instance?: WalkerOS.Instance,
): SessionData | void {
  const sessionFn: SessionFunction = config.storage
    ? sessionStorage
    : sessionWindow;

  // Consent
  if (config.consent) {
    // require consent
    elb('walker on', 'consent', {
      [config.consent]: [onConsentFn(config, cb)],
    });
  } else {
    // just do it
    callFuncAndCb(sessionFn(config), cb, instance);
  }

  return;
}

function callFuncAndCb(
  session: SessionData,
  cb?: SessionCallback,
  instance?: WalkerOS.Instance,
) {
  if (cb) cb(session, instance);
}

function onConsentFn(config: SessionConfig, cb?: SessionCallback) {
  const func: On.OnConsentFn = (instance, consent) => {
    let sessionFn: SessionFunction;

    if (config.consent && consent[config.consent]) {
      sessionFn = () => sessionStorage(config);
    } else {
      sessionFn = () => sessionWindow(config);
    }

    return callFuncAndCb(sessionFn(), cb, instance);
  };

  return func;
}

// function defaultCb(instance: WalkerOS.Instance, session: SessionData) {
//   // Set user IDs
//   elb('walker user', { session: session.id, device: session.device });
// }
