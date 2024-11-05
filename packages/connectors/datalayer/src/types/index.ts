declare global {
  interface Window {
    dataLayer: DataLayer | undefined;
  }
}

export type DataLayer = Array<unknown>;
export interface Config {
  name?: string;
}
