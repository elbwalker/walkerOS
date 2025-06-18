import { commonHandleCommand, Const, createPushResult } from '@walkerOS/utils';
import type { Elb, WalkerjsNode } from '../types';
import { getState } from './state';
import { run } from './run';

export const handleCommand = async (
  instance: WalkerjsNode.Instance,
  action: string,
  data?: Elb.PushData,
  options?: Elb.PushOptions,
): Promise<Elb.PushResult> => {
  let result: Elb.PushResult | undefined;

  switch (action) {
    case Const.Commands.Config:
      if (data) {
        instance.config = getState(data as WalkerjsNode.Config, instance).config;
      }
      break;

    case Const.Commands.Run:
      run(instance, data as Partial<WalkerjsNode.State>);
      break;

    default:
      result = await commonHandleCommand(instance, action, data, options);
  }

  return createPushResult(result);
};
