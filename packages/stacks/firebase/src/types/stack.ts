import type { NodeClient } from '@elbwalker/client-node';
import type { HttpsFunction, HttpsOptions } from 'firebase-functions/v2/https';

export interface Instance {
  config: Config;
  instance: NodeClient.Instance;
  elb: NodeClient.Elb;
  push: Push;
}

export type PartialConfig = Partial<Config>;
export interface Config {
  client: NodeClient.PartialConfig;
}

export interface Push {
  (options?: HttpsOptions): HttpsFunction;
}

export type PrependInstance<Fn extends (...args: never) => never> = (
  instance: Instance,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
