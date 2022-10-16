import { IElbwalker } from '.';

declare global {
  interface Window {
    elbwalker: IElbwalker.Function;
    elbLayer: IElbwalker.ElbLayer;
    dataLayer: unknown[];
  }
}
