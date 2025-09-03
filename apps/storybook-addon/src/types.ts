// Import WalkerOS Property types
import type { WalkerOS } from '@walkeros/core';

export interface WalkerOSAddon {
  autoRefresh: boolean;
  prefix?: string;
  highlights?: {
    context: boolean;
    entity: boolean;
    property: boolean;
    action: boolean;
  };
}

// walkerOS tracking interface for clean component APIs
export interface DataElb {
  entity?: string;
  trigger?: string;
  action?: string;
  data?: WalkerOS.Properties;
  context?: WalkerOS.Properties;
  globals?: WalkerOS.Properties;
  link?: Record<string, string>;
}
