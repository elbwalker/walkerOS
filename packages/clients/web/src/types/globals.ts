import type { Elbwalker } from '.';

type WalkerEvent = Array<
  Elbwalker.Event & {
    walker: true;
  }
>;

declare global {
  interface Window {
    elbwalker: Elbwalker.Function;
    elbLayer: Elbwalker.ElbLayer;
    dataLayer: WalkerEvent;
    elb: Elbwalker.Elb;
  }
}
