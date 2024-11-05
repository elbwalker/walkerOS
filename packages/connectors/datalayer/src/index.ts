import type { Config, DataLayer } from './types';

export * as ConnectorDataLayer from './types';

export function elbDataLayer(config: Config = {}) {
  const { name = 'dataLayer' } = config;
  const key = name as keyof Window;

  const dataLayer = (window[key] as DataLayer | undefined) || [];

  (window[key] as DataLayer) = dataLayer;
}

export default { elbDataLayer };
