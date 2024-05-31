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
    deviceAge = 30, // Device ID age in days
    sessionKey = 'elbSessionId',
    sessionStorage = 'local',
    sessionAge = 30, // Session age in minutes
    pulse = false, // Handle the counting
  } = config;
  const windowSession = sessionWindow(config); // Status based on window only
  let isStart = true;

  // Retrieve or create device ID
  const device = tryCatch((key: string, age: number, storage: StorageType) => {
    let id = storageRead(key, storage);
    if (!id) {
      id = getId(8); // Create a new device ID
      storageWrite(key, id, age, storage); // Write device ID to storage
    }
    return String(id);
  })(deviceKey, deviceAge, deviceStorage);

  // Retrieve or initialize session data
  const existingSession: SessionData =
    tryCatch(
      (key: string, storage?: StorageType) => {
        const session = JSON.parse(String(storageRead(key, storage)));
        isStart = session.isStart;

        // Only update session if it's not a pulse check
        if (pulse) return session;

        // Mark session as not new by default
        session.isNew = false;

        // Handle new marketing entry
        if (windowSession.marketing) {
          Object.assign(session, windowSession); // Overwrite existing session with marketing data
          isStart = true; // This is a session start
        }

        // Check if session is still active
        if (isStart || session.updated + length * 60 * 1000 < now) {
          // Session has expired
          delete session.id; // Unset session ID
          delete session.referrer; // Unset referrer
          session.start = now; // Set new session start
          session.count++; // Increase session count
          session.runs = 1; // Reset runs
          isStart = true; // Mark expired session as a new one
        } else {
          // Session is still active
          session.runs++;
          isStart = false;
        }

        return session;
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

  // Merge session data
  const session = Object.assign(
    defaultSession, // Default session values
    windowSession, // Basic session data based on window
    existingSession, // (Updated) existing session
    { device }, // Device ID
    { isStart, storage: true, updated: now }, // Status of the session
    config.data, // Given data has the highest priority
  );

  // Write (updated) session to storage
  storageWrite(sessionKey, JSON.stringify(session), sessionAge, sessionStorage);

  return session;
}
