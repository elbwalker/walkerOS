import type { Collector } from '@walkeros/core';
import type { SessionWindowConfig } from './sessionWindow';
import type { StorageType } from '@walkeros/core';
import { getId, tryCatch } from '@walkeros/core';
import { storageRead, storageWrite } from '@walkeros/web-core';
import { sessionWindow } from './sessionWindow';

export interface SessionStorageConfig extends SessionWindowConfig {
  deviceKey?: string;
  deviceStorage?: StorageType;
  deviceAge?: number;
  sessionKey?: string;
  sessionStorage?: StorageType;
  length?: number; // Minutes after last update to consider session as expired (default: 30)
  pulse?: boolean;
}

export function sessionStorage(
  config: SessionStorageConfig = {},
): Collector.SessionData {
  const now = Date.now();
  const {
    length = 30, // Session length in minutes
    deviceKey = 'elbDeviceId',
    deviceStorage = 'local',
    deviceAge = 30, // Device ID age in days
    sessionKey = 'elbSessionId',
    sessionStorage = 'local',
    pulse = false, // Handle the counting
  } = config;
  const windowSession = sessionWindow(config); // Status based on window only
  let isStart = false;

  // Retrieve or create device ID
  const device = tryCatch((key: string, age: number, storage: StorageType) => {
    let id = storageRead(key, storage);
    if (!id) {
      id = getId(8); // Create a new device ID
      storageWrite(key, id, age * 1440, storage); // Write device ID to storage
    }
    return String(id);
  })(deviceKey, deviceAge, deviceStorage);

  // Retrieve or initialize session data
  const existingSession: Collector.SessionData =
    tryCatch(
      (key: string, storage?: StorageType) => {
        const session = JSON.parse(String(storageRead(key, storage)));

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
        if (isStart || session.updated + length * 60000 < now) {
          // Session has expired
          delete session.id; // Unset session ID
          delete session.referrer; // Unset referrer
          session.start = now; // Set new session start
          session.count++; // Increase session count
          session.runs = 1; // Reset runs
          isStart = true; // It's a new session
        } else {
          // Session is still active
          session.runs++; // Increase number of runs
        }

        return session;
      },
      () => {
        // No existing session or something went wrong
        isStart = true; // Start a new session
      },
    )(sessionKey, sessionStorage) || {};

  // Default session data
  const defaultSession: Partial<Collector.SessionData> = {
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
  storageWrite(sessionKey, JSON.stringify(session), length * 2, sessionStorage);

  return session;
}
