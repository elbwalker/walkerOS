import { Elbwalker, ElbLayer } from './elbwalker';

declare global {
  interface Window {
    elbwalker: Elbwalker;
    elbLayer: ElbLayer;
    dataLayer?: unknown[];
  }
}
