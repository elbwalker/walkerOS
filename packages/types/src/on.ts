import { WalkerOS } from './';

export type Config = Partial<{
  [key in Type]: Rules;
}>;

export type Type = 'consent';

export interface Rules {
  [key: string]: Functions;
}

export type Functions = OnConsentFn;

export type OnConsentFn = (
  instance: WalkerOS.Instance,
  type: 'consent',
  options: Options,
) => void;

export type Options = WalkerOS.Consent;
