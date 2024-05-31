import {
  StorageType,
  getId,
  storageRead,
  storageWrite,
  tryCatch,
} from '../../';
import { sessionWindow } from './';
import type { SessionData, SessionWindowConfig } from './';

export interface SessionStorageConfig extends SessionWindowConfig {
  deviceKey?: string;
  deviceStorage?: StorageType;
  deviceAge?: number;
  sessionKey?: string;
  sessionStorage?: StorageType;
  sessionAge?: number;
  length?: number; // Minutes after last update to consider session as expired (default: 30)
  pulse?: boolean;
}

export function sessionStorage(config: SessionStorageConfig = {}): SessionData {
  const now = Date.now();
  const {
    length = 30, // Session length in minutes
    deviceKey = 'elbDeviceId',
    deviceStorage = 'local',
    deviceAge = 30, // Session age in days
    sessionKey = 'elbSessionId',
    sessionStorage = 'local',
    sessionAge = 30, // Session age in minutes
    pulse = false, // Handle the counting
  } = config;
  const windowSession = sessionWindow(config); // Status based on window only
  let isStart = true;

  // Check for an existing session
  const device: string | undefined = tryCatch(
    (key: string, age: number, storage: StorageType) => {
      // Get existing device Id
      let id = storageRead(key, storage);

      if (!id) {
        id = getId(8); // Create a new device Id
        storageWrite(key, id, age, storage); // Write device Id to storage
      }

      return String(id);
    },
  )(deviceKey, deviceAge, deviceStorage);

  // Check for an existing session
  const existingSession: SessionData =
    tryCatch(
      (key: string, storage?: StorageType) => {
        const existingSession = JSON.parse(String(storageRead(key, storage)));
        isStart = existingSession.isStart;

        // Only update session if it's not a pulse check
        if (pulse) return existingSession;

        // By default it's not a new session anymore
        existingSession.isNew = false;

        // A new marketing entry
        if (windowSession.marketing) {
          Object.assign(existingSession, windowSession); // Overwrite existing session with marketing data
          isStart = true; // This is a session start
        }

        // Check if session is still active
        if (isStart || existingSession.updated + length * 60 * 1000 < now) {
          // Session has expired
          delete existingSession.id; // Unset session ID
          delete existingSession.referrer; // Unset referrer
          existingSession.start = now; // Set new session start
          existingSession.count++; // Increase session count
          existingSession.runs = 1; // Reset runs
          isStart = true; // Mark expired session a as new one
        } else {
          // Session is still active
          existingSession.runs++;
          isStart = false;
        }

        return existingSession;
      },
      () => {
        // Something went wrong, start a new session
        config.isStart = true;
      },
    )(sessionKey, sessionStorage) || {};

  // Default session data
  const defaultSession: Partial<SessionData> = {
    id: getId(12),
    start: now,
    isNew: true,
    count: 1,
    runs: 1,
  };

  // Eventually update session with id, referrer and marketing parameters
  const session = Object.assign(
    defaultSession, // Default session values
    windowSession, // Basic session data based on window
    existingSession, // (Updated) existing session
    { device }, // Device Id
    { isStart, storage: true, updated: now }, // Status of the session
    config.data, // Given data has the highest priority
  );

  // Write (updated) session to storage
  storageWrite(sessionKey, JSON.stringify(session), sessionAge, sessionStorage);

  return session;
}
