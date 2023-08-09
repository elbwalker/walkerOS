import { Walker } from './walker';

export namespace Utils {
  namespace Storage {
    type Type = 'cookie' | 'local' | 'session';

    interface Value {
      e: number; // Expiration timestamp
      v: string; // Value
    }
  }

  interface SessionStart {
    data?: Walker.Properties;
    domains?: string[];
    isNew?: boolean;
    parameters?: MarketingParameters;
    referrer?: string;
    url?: string;
  }

  interface MarketingParameters {
    [key: string]: string;
  }
}
