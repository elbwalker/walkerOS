import type { Elbwalker } from '.';

// @TODO global namespace pollution?
declare global {
  interface Window {
    elbwalker: Elbwalker.Function;
    elbLayer: Elbwalker.ElbLayer;
    dataLayer: unknown[];
    elb: Elbwalker.Elb;
  }
}
