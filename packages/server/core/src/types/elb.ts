import type { Elb } from '@walkeros/core';
import type { Destination, Init, Config } from './destination';

export type Fn<R = Return> = Elb.Fn<R> & CommandDestination<R> & CommandRun<R>;

export type CommandDestination<R = void> = (
  event: 'walker destination',
  destination: Destination | Init,
  config?: Config,
) => R;

export type CommandRun<R = void> = (event: 'walker run') => R;

export type PushData = Elb.PushData | Destination | Init;

export type PushOptions = Config;

export type PushResult = Elb.PushResult;

export type Return<R = Promise<PushResult>> = R;
