import type { ElbCore } from '@walkerOS/core';
import type { Destination, Init, Config } from './destination';
import type { State } from './collector';

export interface Fn<R = Return, D = PushData, O = PushOptions>
  extends ElbCore.Fn<R, D, O>,
    CommandDestination<R>,
    CommandRun<R> {}

export type CommandDestination<R = void> = (
  event: 'walker destination',
  destination: Destination | Init,
  config?: Config,
) => R;

export type CommandRun<R = void> = (event: 'walker run') => R;

export type PushData = ElbCore.PushData | Destination | Init | Partial<State>;

export type PushOptions = ElbCore.PushOptions | Config;

export type PushResult = ElbCore.PushResult;

export type Return<R = Promise<PushResult>> = R;
