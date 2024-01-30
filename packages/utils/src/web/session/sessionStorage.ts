import {
  getId,
  getMarketingParameters,
  storageRead,
  storageWrite,
  tryCatch,
} from '../../';
import sessionStart from './sessionStart';
import type { SessionStorageConfig, SessionStorageData } from '.';

export default function sessionStorage(
  config: SessionStorageConfig = {},
  utils: {
    getId: typeof getId;
    getMarketingParameters: typeof getMarketingParameters;
    storageRead: typeof storageRead;
    storageWrite: typeof storageWrite;
    tryCatch: typeof tryCatch;
  },
): SessionStorageData {
  // Check for an existing session
  let session: SessionStorageData | undefined = utils.tryCatch(
    (key: string) => {
      const existingSession: SessionStorageData = JSON.parse(
        String(utils.storageRead(key)),
      );

      // Check if session is still active

      // Update sessions last activity

      return existingSession;
    },
  )('session');

  // Active session, nothing new
  if (session) {
    session.isNew = false;
    return session;
  }

  // Create new session
  config.isNew = true;
  config.data = session;
  session = Object.assign(sessionStart(config, utils) || {}, {
    count: 1,
    isNew: true,
    id: utils.getId(12),
    start: Date.now(),
  });

  return session;
}
