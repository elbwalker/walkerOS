import type { Elb, Source } from '@walkeros/core';

export interface SourceCodeSettings {
  init?: string;
  push?: string;
}

export const sourceCode: Source.Init = async (context) => {
  const { config, env, logger } = context;
  const settings = config.settings as SourceCodeSettings | undefined;

  // Execute init code if provided
  if (settings?.init) {
    try {
      const fn = new Function('context', settings.init);
      await fn(context);
    } catch (e) {
      logger.error('Code source init error:', e);
    }
  }

  return {
    type: 'code',
    config,
    push: async (input: unknown): Promise<Elb.PushResult> => {
      const pushCode = settings?.push;
      if (!pushCode) return { ok: true };

      try {
        const fn = new Function('input', 'env', pushCode);
        await fn(input, env);
        return { ok: true };
      } catch (e) {
        env.logger.error('Code source push error:', e);
        return { ok: false };
      }
    },
  };
};

export default sourceCode;
