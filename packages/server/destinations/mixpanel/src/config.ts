import type {
  Config,
  Env,
  MixpanelClient,
  PartialConfig,
  Settings,
} from './types';
import type { Logger } from '@walkeros/core';
import Mixpanel from 'mixpanel';

export function getConfig(
  partialConfig: PartialConfig = {},
  env: Env | undefined,
  logger: Logger.Instance,
): Config {
  const settings = (partialConfig.settings || {}) as Partial<Settings>;
  const { apiKey } = settings;

  if (!apiKey) logger.throw('Config settings apiKey missing');

  // Build SDK init options from settings
  const initOptions: Record<string, unknown> = {};
  if (settings.secret !== undefined) initOptions.secret = settings.secret;
  if (settings.host !== undefined) initOptions.host = settings.host;
  if (settings.protocol !== undefined) initOptions.protocol = settings.protocol;
  if (settings.keepAlive !== undefined)
    initOptions.keepAlive = settings.keepAlive;
  if (settings.geolocate !== undefined)
    initOptions.geolocate = settings.geolocate;
  if (settings.debug !== undefined) initOptions.debug = settings.debug;
  if (settings.verbose !== undefined) initOptions.verbose = settings.verbose;
  if (settings.test !== undefined) initOptions.test = settings.test;

  // Warn if useImport without secret
  if (settings.useImport && !settings.secret) {
    logger.warn('useImport requires secret for /import authentication');
  }

  // Use Mixpanel from env if available, otherwise use real Mixpanel
  const MixpanelFactory = env?.Mixpanel || Mixpanel;
  const client = MixpanelFactory.init(
    apiKey,
    initOptions,
  ) as unknown as MixpanelClient;

  const settingsConfig: Settings = {
    ...settings,
    apiKey,
    client,
  };

  return { ...partialConfig, settings: settingsConfig };
}
