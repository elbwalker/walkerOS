import { WalkerOS } from './';

export type Config = Partial<{
  consent?: Rules<OnConsentFn>;
}>;

export type Type = 'consent';

export interface Rules<T = Functions> {
  [key: string]: T;
}

export type Functions = OnConsentFn;

export type OnConsentFn = (
  instance: WalkerOS.Instance,
  options: WalkerOS.Consent,
) => void;

export type Options = WalkerOS.Consent;
