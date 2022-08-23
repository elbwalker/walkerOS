import { Elbwalker } from ".";

declare global {
  interface Window {
    elbwalker: Elbwalker.Function;
    elbLayer: Elbwalker.ElbLayer;
  }
}
