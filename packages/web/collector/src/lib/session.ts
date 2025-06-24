import type { WalkerOS } from '@walkerOS/types';
import type { WebCollector } from '../types';
import type { SessionCallback } from '../utils';
import { assign, isSameType, onApply, useHooks } from '@walkerOS/utils';
import { sessionStart as sessionStartOrg } from '../utils';

export function createSessionStart(instance: WebCollector.Instance) {
  return function (
    options: WebCollector.SessionStartOptions = {},
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
  instance: WebCollector.Instance,
  options: WebCollector.SessionStartOptions = {},
): void | WalkerOS.SessionData {
  const sessionConfig = assign(instance.config.session || {}, options.config);
  const sessionData = assign(instance.config.sessionStatic, options.data);

  // A wrapper for the callback
  const cb: SessionCallback = (session, instance, defaultCb) => {
    let result: void | undefined | WalkerOS.SessionData;
    if (sessionConfig.cb !== false)
      // Run either the default callback or the provided one
      result = (sessionConfig.cb || defaultCb)(session, instance, defaultCb);

    if (isSameType(instance, {} as WebCollector.Instance)) {
      // Assign the session
      instance.session = session;

      // Run on session events
      onApply(instance, 'session');
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
