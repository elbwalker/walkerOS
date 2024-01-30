import sessionStartOrg from './sessionStart';
import { getId, getMarketingParameters } from '../../';
import type { MarketingParameters } from '../../';
import type { WalkerOS } from '@elbwalker/types';

export interface SessionStart {
  data?: WalkerOS.Properties;
  domains?: string[];
  isNew?: boolean; // @TODO
  parameters?: MarketingParameters;
  referrer?: string;
  url?: string;
}

export interface SessionStorage extends SessionStart {
  length?: number;
}

export function sessionStart(config: SessionStart = {}) {
  return sessionStartOrg(config, {
    getId,
    getMarketingParameters,
  });
}
