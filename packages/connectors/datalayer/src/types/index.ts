import type { WalkerOS } from '@elbwalker/types';

declare global {
  interface Window {
    [key: string]: DataLayer | undefined;
  }
}

export type DataLayer = Array<unknown>;
export interface Config {
  elb: WalkerOS.Elb;
  dataLayer: DataLayer;
  name?: string;
  processedEvents: Set<string>;
}
