import type { Elb, WalkerOS } from '@elbwalker/types';
import type { Destination, DestinationInit, Config } from './destination';
import { PushResult as PushResultDest } from './destination';
import { State, Status } from './source';

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

export interface PushResult extends PushResultDest {
  event?: WalkerOS.Event;
  status: Status;
}

export type Return<R = Promise<PushResult>> = R;
