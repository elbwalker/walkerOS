/** Prepares localStorage with session/device data before source init. */
export const trigger = (input: unknown, env: Record<string, unknown>): void => {
  if (!input || typeof input !== 'object') return;
  const data = input as Record<string, unknown>;
  const localStorage = env.localStorage as Storage;

  if (data.sessionData && typeof data.sessionData === 'object') {
    const key =
      typeof data.sessionKey === 'string' ? data.sessionKey : 'elbSessionId';
    localStorage.setItem(key, JSON.stringify(data.sessionData));
  }

  if (typeof data.deviceId === 'string') {
    const key =
      typeof data.deviceKey === 'string' ? data.deviceKey : 'elbDeviceId';
    localStorage.setItem(key, data.deviceId);
  }
};
