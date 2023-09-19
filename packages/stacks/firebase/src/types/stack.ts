import { AppOptions } from 'firebase-admin';

export interface Function {
  config: Config;
  entry: Entry;
}

export type PartialConfig = Partial<Config>;
export interface Config {
  firebase: AppOptions;
}

export interface Entry {
  (event: string): Promise<unknown>;
}
