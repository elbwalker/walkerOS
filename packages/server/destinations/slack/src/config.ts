import type { Logger } from '@walkeros/core';
import type { Config, PartialConfig, Settings } from './types';
import { StepError } from '@walkeros/core';

export function getConfig(
  partialConfig: PartialConfig = {},
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { token, webhookUrl, channel } = settings;

  if (!token && !webhookUrl)
    throw new StepError(
      'Slack destination requires either token or webhookUrl',
      { code: 'config' },
    );
  if (token && webhookUrl)
    throw new StepError(
      'Slack destination accepts either token or webhookUrl, not both',
      { code: 'config' },
    );
  // An advisory, not a failure: a push without a channel fails with config.
  if (token && !channel)
    logger.warn(
      'Slack destination has no default channel; every mapping rule must provide one',
    );

  return {
    ...partialConfig,
    settings: { ...settings } as Settings,
  };
}
