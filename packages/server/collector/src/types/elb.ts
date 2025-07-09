import type { Elb } from '@walkerOS/core';
import type { Destination, Init, Config } from './destination';
import type { State } from './collector';

export interface Fn<R = Return, D = PushData, O = PushOptions>
  extends Elb.Fn<R, D, O>,
    CommandDestination<R>,
    CommandRun<R> {}

export type CommandDestination<R = void> = (
  event: 'walker destination',
  destination: Destination | Init,
  config?: Config,
) => R;

export type CommandRun<R = void> = (event: 'walker run') => R;

export type PushData = Elb.PushData | Destination | Init | Partial<State>;

export type PushOptions = Elb.PushOptions | Config;

export type PushResult = Elb.PushResult;

export type Return<R = Promise<PushResult>> = R;
