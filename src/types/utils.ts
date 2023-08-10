import type { Walker } from '.';

export namespace Utils {
  export namespace Storage {
    export type Type = 'cookie' | 'local' | 'session';

    export interface Value {
      e: number; // Expiration timestamp
      v: string; // Value
    }
  }

  export interface SessionStart {
    data?: Walker.Properties;
    domains?: string[];
    isNew?: boolean;
    parameters?: MarketingParameters;
    referrer?: string;
    url?: string;
  }

  export interface MarketingParameters {
    [key: string]: string;
  }
}
