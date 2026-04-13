import type { Logger } from '@walkeros/core';
import type { Config, PartialConfig, Settings } from './types';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { token, webhookUrl, channel } = settings;

  if (!token && !webhookUrl)
    logger.throw('Slack destination requires either token or webhookUrl');
  if (token && webhookUrl)
    logger.throw(
      'Slack destination accepts either token or webhookUrl, not both',
    );
  if (token && !channel)
    logger.warn(
      'Slack destination has no default channel; every mapping rule must provide one',
    );

  return {
    ...partialConfig,
    settings: { ...settings } as Settings,
  };
}
