declare global {
  interface Window {
    dataLayer: Array<unknown> | unknown;
  }
}

export interface Connector {}
