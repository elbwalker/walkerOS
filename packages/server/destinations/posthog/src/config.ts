import type { Config, Env, PartialConfig, Settings } from './types';
import { StepError } from '@walkeros/core';
import { PostHog } from 'posthog-node';

export function getConfig(
  partialConfig: PartialConfig = {},
  env: Env | undefined,
): Config {
  const settings: Partial<Settings> = partialConfig.settings || {};
  const { apiKey } = settings;

  if (!apiKey)
    throw new StepError('Config settings apiKey missing', { code: 'config' });

  // Extract PostHog SDK options from settings
  const options: Record<string, unknown> = {};
  if (settings.host) options.host = settings.host;
  if (settings.flushAt !== undefined) options.flushAt = settings.flushAt;
  if (settings.flushInterval !== undefined)
    options.flushInterval = settings.flushInterval;
  if (settings.personalApiKey) options.personalApiKey = settings.personalApiKey;
  if (settings.featureFlagsPollingInterval !== undefined)
    options.featureFlagsPollingInterval = settings.featureFlagsPollingInterval;
  if (settings.disableGeoip !== undefined)
    options.disableGeoip = settings.disableGeoip;
  if (settings.disableCompression !== undefined)
    options.disableCompression = settings.disableCompression;
  if (settings.requestTimeout !== undefined)
    options.requestTimeout = settings.requestTimeout;
  if (settings.fetchRetryCount !== undefined)
    options.fetchRetryCount = settings.fetchRetryCount;
  if (settings.fetchRetryDelay !== undefined)
    options.fetchRetryDelay = settings.fetchRetryDelay;
  if (settings.debug !== undefined) options.debug = settings.debug;
  if (settings.disabled !== undefined) options.disabled = settings.disabled;

  // Use PostHog from env if available, otherwise use real PostHog
  const PostHogClass = env?.PostHog || PostHog;
  const client = new PostHogClass(apiKey, options);

  const settingsConfig: Settings = {
    ...settings,
    apiKey,
    client,
  };

  return { ...partialConfig, settings: settingsConfig };
}
