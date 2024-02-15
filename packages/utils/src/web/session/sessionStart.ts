// const deviceKey = config.deviceKey || 'elbDeviceId';
// Also as parameter possible like the isNew for sessionStart

import { elb, sessionStorage, sessionWindow } from '../../';
import type { SessionStorageConfig, SessionStorageData } from './';
import type { On, WalkerOS } from '@elbwalker/types';

export interface SessionConfig extends SessionStorageConfig {
  consent?: string;
  storage?: boolean;
}

export interface SessionData extends SessionStorageData {
  storage: boolean; // If the storage was used to determine the session
}

export type SessionCallback = (
  instance: WalkerOS.Instance,
  data: SessionData,
) => void;

export function sessionStart(
  config: SessionConfig = {},
  cb?: SessionCallback,
): SessionData | void {
  const func = config.storage ? sessionStorage : sessionWindow;

  // Consent
  if (config.consent) {
    // require consent
    elb('walker on', 'consent', {
      [config.consent]: [getOnConsentFunc(config, cb)],
    });
  } else {
    // just do it
    func(config);
  }

  return;
}

function getOnConsentFunc(config: SessionConfig, cb?: SessionCallback) {
  const onFunc: On.OnConsentFn = (instance, consent) => {
    let func: typeof sessionStorage | typeof sessionWindow;

    if (config.consent && consent[config.consent]) {
      func = () => sessionStorage(config);
    } else {
      func = () => sessionWindow(config);
    }

    const session = func();
    if (cb)
      cb(instance, {
        ...{ storage: config.storage },
        ...(session as SessionData),
      });
  };

  return onFunc;
}
