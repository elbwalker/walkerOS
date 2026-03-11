import type { Source } from '@walkeros/core';

/** Prepares localStorage with session/device data. */
export const setup: Source.SetupFn = (input, env) => {
  if (!input || typeof input !== 'object') return;
  const data = input as Record<string, unknown>;

  if (data.sessionData && typeof data.sessionData === 'object') {
    const key =
      typeof data.sessionKey === 'string' ? data.sessionKey : 'elbSessionId';
    env.localStorage.setItem(key, JSON.stringify(data.sessionData));
  }

  if (typeof data.deviceId === 'string') {
    const key =
      typeof data.deviceKey === 'string' ? data.deviceKey : 'elbDeviceId';
    env.localStorage.setItem(key, data.deviceId);
  }
};
