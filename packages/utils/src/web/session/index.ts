import sessionStartOrg from './sessionStart';
import sessionStorageOrg from './sessionStorage';
import {
  getId,
  getMarketingParameters,
  storageRead,
  storageWrite,
  tryCatch,
} from '../../';
import type { MarketingParameters, StorageType } from '../../';
import type { WalkerOS } from '@elbwalker/types';

export interface SessionData extends WalkerOS.Properties {
  id: string; // Session ID
  start: number; // Timestamp of session start
  marketing?: true; // If the session was started by a marketing parameters
}

export interface SessionStorageData extends SessionData {
  updated: number; // Timestamp of last update
  isNew: boolean; // If a new session has started
  firstVisit: boolean; // If this is the first visit on a device
  count: number; // Total number of sessions
  runs: number; // Total number of runs (like page views)
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
  sessionKey?: string;
  sessionStorage?: StorageType; // @TODO
  deviceKey?: string;
  deviceStorage?: StorageType; // @TODO
  length?: number; // Minutes after last update to consider session as expired (default: 30)
}

export interface SessionStorage extends SessionStorageData {
  isNew: boolean;
}

// Wrapper functions with mapped utils
export function sessionStart(config: SessionStartConfig = {}) {
  return sessionStartOrg(config, {
    getId,
    getMarketingParameters,
  });
}

export function sessionStorage(config?: SessionStorageConfig) {
  return sessionStorageOrg(config, {
    getId,
    getMarketingParameters,
    storageRead,
    storageWrite,
    tryCatch,
  });
}
