import type { Destination } from '@walkeros/core';
import type { CodeMapping, Settings } from './types/code';

export const destinationCode: Destination.Instance = {
  type: 'code',
  config: {},

  init(context) {
    const { config, logger } = context;
    const initCode = (config.settings as Settings | undefined)?.init;
    if (!initCode) return;
    try {
      const fn = new Function('context', initCode);
      fn(context);
    } catch (e) {
      logger.error('Code destination init error:', e);
    }
  },

  push(event, context) {
    const { mapping, config, logger } = context;
    const pushCode =
      (mapping as CodeMapping | undefined)?.push ??
      (config.settings as Settings | undefined)?.push;
    if (!pushCode) return;
    try {
      const fn = new Function('event', 'context', pushCode);
      fn(event, context);
    } catch (e) {
      logger.error('Code destination push error:', e);
    }
  },

  pushBatch(batch, context) {
    const { mapping, config, logger } = context;
    const pushBatchCode =
      (mapping as CodeMapping | undefined)?.pushBatch ??
      (config.settings as Settings | undefined)?.pushBatch;
    if (!pushBatchCode) return;
    try {
      const fn = new Function('batch', 'context', pushBatchCode);
      fn(batch, context);
    } catch (e) {
      logger.error('Code destination pushBatch error:', e);
    }
  },

  on(type, context) {
    const { config, logger } = context;
    const onCode = (config.settings as Settings | undefined)?.on;
    if (!onCode) return;
    try {
      const fn = new Function('type', 'context', onCode);
      fn(type, context);
    } catch (e) {
      logger.error('Code destination on error:', e);
    }
  },
};

export default destinationCode;
