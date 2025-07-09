import { commonHandleCommand, Const, createPushResult } from '@walkerOS/utils';
import type { Elb, ServerCollector } from '../types';
import { getState } from './state';
import { run } from './run';

export const handleCommand = async (
  collector: ServerCollector.Collector,
  action: string,
  data?: Elb.PushData,
  options?: Elb.PushOptions,
): Promise<Elb.PushResult> => {
  let result: Elb.PushResult | undefined;

  switch (action) {
    case Const.Commands.Config:
      if (data) {
        collector.config = getState(
          data as ServerCollector.Config,
          collector,
        ).config;
      }
      break;

    case Const.Commands.Run:
      run(collector, data as Partial<ServerCollector.State>);
      break;

    default:
      result = await commonHandleCommand(collector, action, data, options);
  }

  return createPushResult(result);
};
