import type { Elb, WalkerOS } from '@elbwalker/types';
import { DestinationNode, SourceNode } from '.';

export interface Fn<R = Return, D = PushData, O = PushOptions>
  extends Elb.Fn<R, D, O>,
    CommandDestination<R>,
    CommandRun<R> {}

export type CommandDestination<R = void> = (
  event: 'walker destination',
  destination: DestinationNode.Destination | DestinationNode.DestinationInit,
  config?: DestinationNode.Config,
) => R;
export type CommandRun<R = void> = (event: 'walker run') => R;

export type PushData =
  | Elb.PushData
  | DestinationNode.Destination
  | DestinationNode.DestinationInit
  | Partial<SourceNode.State>;

export type PushOptions = Elb.PushOptions | DestinationNode.Config;

export interface PushResult extends DestinationNode.PushResult {
  event?: WalkerOS.Event;
  status: SourceNode.Status;
}

export type Return<R = Promise<PushResult>> = R;
