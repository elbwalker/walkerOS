import * as os from 'os';

export interface Environment {
  os: string;
  osVersion: string;
  node: string;
  language: string;
  timezone: string;
}

export function getEnvironment(): Environment {
  const locale = Intl.DateTimeFormat().resolvedOptions();
  return {
    os: process.platform,
    osVersion: os.release(),
    node: process.version,
    language: locale.locale,
    timezone: locale.timeZone,
  };
}
