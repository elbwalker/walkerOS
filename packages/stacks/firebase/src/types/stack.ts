import type { NodeClient } from '@elbwalker/client-node';
import type { HttpsFunction, HttpsOptions } from 'firebase-functions/v2/https';

export interface Function {
  config: Config;
  instance: NodeClient.Function;
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

export type PrependInstance<Fn extends (...args: any) => any> = (
  instance: Function,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
