import type { WalkerOS, Collector } from '@walkeros/core';
import type { SessionCallback } from '@walkeros/web-core';
import { assign, useHooks } from '@walkeros/core';
import { onApply } from '@walkeros/collector';
import { sessionStart as sessionStartOrg } from '@walkeros/web-core';

export interface SessionStartOptions {
  config?: unknown;
  data?: Collector.SessionData;
}

// Enhanced session configuration interface
interface SessionConfigWithCallback {
  cb?: false | SessionCallback;
  [key: string]: unknown;
}

export function createSessionStart(collector: Collector.Instance) {
  return function (
    options: SessionStartOptions = {},
  ): void | Collector.SessionData {
    const { config = {}, data, ...otherOptions } = options;
    return sessionStart(collector, {
      config: Object.assign({ pulse: true }, config),
      data: Object.assign({}, collector.session, {
        updated: Date.now(),
      }) as Collector.SessionData,
      ...otherOptions,
    });
  };
}

export function sessionStart(
  collector: Collector.Instance,
  options: SessionStartOptions = {},
): void | Collector.SessionData {
  const sessionConfig = assign(
    collector.config.session || {},
    options.config || {},
  );
  const sessionData = assign(
    collector.config.sessionStatic || {},
    options.data || {},
  );

  // A wrapper for the callback
  const cb: SessionCallback = (
    session: Collector.SessionData,
    collector: Collector.Instance | undefined,
    defaultCb: SessionCallback,
  ) => {
    let result: void | undefined | Collector.SessionData;
    const configWithCb = sessionConfig as SessionConfigWithCallback;
    if (configWithCb.cb !== false && configWithCb.cb)
      // Run either the default callback or the provided one
      result = configWithCb.cb(
        session,
        collector,
        defaultCb as SessionCallback,
      );
    else if (configWithCb.cb !== false)
      // Run default callback
      result = (defaultCb as SessionCallback)(
        session,
        collector,
        defaultCb as SessionCallback,
      );

    // Assign the session (only if collector is available)
    if (collector) {
      collector.session = session;

      // Run on session events
      onApply(collector, 'session');
    }

    return result;
  };

  const session = useHooks(
    sessionStartOrg,
    'SessionStart',
    collector.hooks,
  )({
    ...sessionConfig, // Session detection configuration
    cb: cb, // Custom wrapper callback
    data: sessionData, // Static default session data
    collector,
  });

  return session;
}
