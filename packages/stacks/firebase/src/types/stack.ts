import type { SourceNode } from '@elbwalker/source-node';
import type { HttpsFunction, HttpsOptions } from 'firebase-functions/v2/https';

export interface Instance {
  config: Config;
  instance: SourceNode.Instance;
  elb: SourceNode.Elb;
  push: Push;
}

export type PartialConfig = Partial<Config>;
export interface Config {
  client: SourceNode.InitConfig;
}

export interface Push {
  (options?: HttpsOptions): HttpsFunction;
}

export type PrependInstance<Fn extends (...args: never) => never> = (
  instance: Instance,
  ...args: Parameters<Fn>
) => ReturnType<Fn>;
