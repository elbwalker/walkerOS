// const deviceKey = config.deviceKey || 'elbDeviceId';
// Also as parameter possible like the isNew for sessionStart

import { On } from '@elbwalker/types';
import { elb, sessionStorage, sessionWindow } from '../../';
import type { SessionStorageConfig, SessionStorageData } from './';

export interface SessionConfig extends SessionStorageConfig {
  consent?: string;
  storage?: boolean;
}

export interface SessionData extends SessionStorageData {
  storage: boolean; // If the storage was used to determine the session
}

export function sessionStart(config: SessionConfig = {}): SessionData | void {
  const func = config.storage ? sessionStorage : sessionWindow;

  // Start detection based on consent settings
  if (config.consent) {
    elb('walker on', 'consent', {
      [config.consent]: [getOnConsentFunc(config)],
    });
  } else {
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
