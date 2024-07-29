import type { WalkerOS } from '@elbwalker/types';
import type { SessionCallback } from '@elbwalker/utils';
import {
  assign,
  isSameType,
  sessionStart as sessionStartOrg,
  useHooks,
} from '@elbwalker/utils';
import { WebClient } from '../types';
import { SessionStartOptions } from '../types/client';
import { onApply } from './on';

export function createSessionStart(instance: WebClient.Instance) {
  return function (
    options: SessionStartOptions = {},
  ): void | WalkerOS.SessionData {
    const { config = {}, ...otherOptions } = options;
    return sessionStart(instance, {
      config: { pulse: true, ...config },
      data: { ...instance.session, updated: Date.now() },
      ...otherOptions,
    });
  };
}

export function sessionStart(
  instance: WebClient.Instance,
  options: SessionStartOptions = {},
): void | WalkerOS.SessionData {
  const sessionConfig = assign(instance.config.session || {}, options.config);
  const sessionData = assign(instance.config.sessionStatic, options.data);

  // A wrapper for the callback
  const cb: SessionCallback = (session, instance, defaultCb) => {
    let result: void | undefined | WalkerOS.SessionData;
    if (sessionConfig.cb !== false)
      // Run either the default callback or the provided one
      result = (sessionConfig.cb || defaultCb)(session, instance, defaultCb);

    if (isSameType(instance, {} as WebClient.Instance)) {
      // Assign the session
      instance.session = session;

      // Run on session events
      onApply(instance as WebClient.Instance, 'session');
    }

    return result;
  };

  const session = useHooks(
    sessionStartOrg,
    'SessionStart',
    instance.hooks,
  )({
    ...sessionConfig, // Session detection configuration
    cb, // Custom wrapper callback
    data: sessionData, // Static default session data
    instance,
  });

  return session;
}
