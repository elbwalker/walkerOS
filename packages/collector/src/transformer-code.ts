import type { Transformer } from '@walkeros/core';

export interface TransformerCodeSettings {
  init?: string;
  push?: string;
}

export const transformerCode: Transformer.Init = (context) => {
  const { config, logger } = context;
  const settings = config.settings as TransformerCodeSettings | undefined;

  // Execute init code if provided
  if (settings?.init) {
    try {
      const fn = new Function('context', settings.init);
      fn(context);
    } catch (e) {
      logger.error('Code transformer init error:', e);
    }
  }

  return {
    type: 'code',
    config,
    push(event, pushContext) {
      const pushCode = settings?.push;
      if (!pushCode) return event;

      try {
        const fn = new Function('event', 'context', pushCode);
        const result = fn(event, pushContext);
        // Return modified event, original event, or false to drop
        return result;
      } catch (e) {
        pushContext.logger.error('Code transformer push error:', e);
        return event; // Pass through on error
      }
    },
  };
};

export default transformerCode;
