import type { WalkerOS } from '@elbwalker/types';
import type { SessionCallback } from '@elbwalker/utils/web';
import { assign, isSameType, useHooks } from '@elbwalker/utils';
import { sessionStart as sessionStartOrg } from '@elbwalker/utils/web';
import { SourceWalkerjs } from '../types';
import { SessionStartOptions } from '../types/source';
import { onApply } from './on';

export function createSessionStart(instance: SourceWalkerjs.Instance) {
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
  instance: SourceWalkerjs.Instance,
  options: SessionStartOptions = {},
): void | WalkerOS.SessionData {
  const sessionConfig = assign(instance.config.session || {}, options.config);
  const sessionData = assign(instance.config.sessionStatic, options.data);

  // Track the last processed group to prevent duplicate processing
  let lastProcessedGroup: string;

  // A wrapper for the callback
  const cb: SessionCallback = (session, instance, defaultCb) => {
    // Skip if we've already processed this group
    if (instance && instance.group === lastProcessedGroup) return;

    let result: void | undefined | WalkerOS.SessionData;
    if (sessionConfig.cb !== false)
      // Run either the default callback or the provided one
      result = (sessionConfig.cb || defaultCb)(session, instance, defaultCb);

    if (isSameType(instance, {} as SourceWalkerjs.Instance)) {
      // Remember this group has been processed
      lastProcessedGroup = instance.group;

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
