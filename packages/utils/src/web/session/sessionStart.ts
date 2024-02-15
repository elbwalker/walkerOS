// const deviceKey = config.deviceKey || 'elbDeviceId';
// Also as parameter possible like the isNew for sessionStart

import { elb, sessionStorage, sessionWindow } from '../../';
import type { SessionStorageConfig, SessionStorageData } from './';
import type { On } from '@elbwalker/types';

export interface SessionConfig extends SessionStorageConfig {
  consent?: string;
  storage?: boolean;
}

export interface SessionData extends SessionStorageData {
  storage: boolean; // If the storage was used to determine the session
}

export function sessionStart(config: SessionConfig = {}): SessionData | void {
  const func = config.storage ? sessionStorage : sessionWindow;

  // Consent
  if (config.consent) {
    // require consent
    elb('walker on', 'consent', {
      [config.consent]: [getOnConsentFunc(config)],
    });
  } else {
    // just do it
    func(config);
  }

  return;
}

function getOnConsentFunc(config: SessionConfig) {
  const onFunc: On.OnConsentFn = (instance, consent) => {
    // consent value is set by definition
    if (consent[config.consent!]) {
      return () => sessionStorage(config);
    } else {
      return () => sessionWindow(config);
    }
  };

  return onFunc;
}
