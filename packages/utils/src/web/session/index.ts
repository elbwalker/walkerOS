import sessionStartOrg from './sessionStart';
import sessionStorageOrg from './sessionStorage';
import {
  getId,
  getMarketingParameters,
  storageRead,
  storageWrite,
  tryCatch,
} from '../../';
import type { MarketingParameters } from '../../';
import type { WalkerOS } from '@elbwalker/types';

export interface SessionData {
  id: string;
  marketing?: true;
  start: number;
}

export interface SessionStartConfig {
  data?: WalkerOS.Properties;
  domains?: string[];
  isNew?: boolean;
  parameters?: MarketingParameters;
  referrer?: string;
  url?: string;
}

export interface SessionStorageConfig extends SessionStartConfig {
  length?: number; // @TODO implement
}

export interface SessionStorageData extends SessionData {
  count: number;
  isNew: boolean;
}

export interface SessionStorage extends SessionStorageData {
  isNew: boolean;
}

export function sessionStart(config: SessionStartConfig = {}) {
  return sessionStartOrg(config, {
    getId,
    getMarketingParameters,
  });
}

export function sessionStorage(config: SessionStorageConfig = {}) {
  return sessionStorageOrg(config, {
    getId,
    getMarketingParameters,
    storageRead,
    storageWrite,
    tryCatch,
  });
}
