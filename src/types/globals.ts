import type { IElbwalker } from '.';

declare global {
  interface Window {
    elbwalker: IElbwalker.Function;
    elbLayer: IElbwalker.ElbLayer;
    dataLayer: unknown[];
    elb: IElbwalker.Elb;
  }
}
