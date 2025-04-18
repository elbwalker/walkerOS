import type { Elb } from '@elbwalker/types';
import type { Destination, DestinationInit, Config } from './destination';
import type { State } from './source';

export interface Fn<R = Return, D = PushData, O = PushOptions>
  extends Elb.Fn<R, D, O>,
    CommandDestination<R>,
    CommandRun<R> {}

export type CommandDestination<R = void> = (
  event: 'walker destination',
  destination: Destination | DestinationInit,
  config?: Config,
) => R;

export type CommandRun<R = void> = (event: 'walker run') => R;

export type PushData =
  | Elb.PushData
  | Destination
  | DestinationInit
  | Partial<State>;

export type PushOptions = Elb.PushOptions | Config;

export type PushResult = Elb.PushResult;

export type Return<R = Promise<PushResult>> = R;
