import type { Elb, WalkerOS } from '@elbwalker/types';
import { DestinationNode, SourceNode } from '.';

export interface Fn<R = Promise<PushResult>>
  extends Elb.Fn<R>,
    Parameters<R>,
    Event<R> {}

export type Parameters<R = Promise<PushResult>> = (
  name: string,
  data?: PushData,
  options?: PushOptions,
) => R;

export type Event<R = Promise<PushResult>> = (
  event: WalkerOS.DeepPartialEvent,
  data?: PushData,
  options?: PushOptions,
) => R;

export type PushData =
  | Elb.PushData
  | DestinationNode.Destination
  | Partial<SourceNode.State>;

export type PushOptions = Elb.PushOptions | DestinationNode.Config;

export interface PushResult extends DestinationNode.PushResult {
  event?: WalkerOS.Event;
  status: SourceNode.Status;
}
