import type { Elbwalker } from '.';

export type StorageType = 'cookie' | 'local' | 'session';

export interface StorageValue {
  e: number; // Expiration timestamp
  v: string; // Value
}

export interface SessionStart {
  data?: Elbwalker.Properties;
  domains?: string[];
  isNew?: boolean;
  parameters?: MarketingParameters;
  referrer?: string;
  url?: string;
}

export interface MarketingParameters {
  [key: string]: string;
}
