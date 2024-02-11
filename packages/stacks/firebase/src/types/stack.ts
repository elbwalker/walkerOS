import type { NodeClient } from '@elbwalker/client-node';
import type { HttpsFunction, HttpsOptions } from 'firebase-functions/v2/https';

export interface Instance {
  config: Config;
  instance: NodeClient.Instance;
  elb: NodeClient.Push;
  push: Push;
  setup?: Setup; // @TODO make this required
}

export type PartialConfig = Partial<Config>;
export interface Config {
  client: NodeClient.PartialConfig;
}

export interface Push {
  (options?: HttpsOptions): HttpsFunction;
}

export interface Setup extends NodeClient.Setup {}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PrependInstance<Fn extends (...args: any) => any> = (
  instance: Instance,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
