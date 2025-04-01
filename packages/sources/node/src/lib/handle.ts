import { commonHandleCommand, Const, createPushResult } from '@elbwalker/utils';
import type { Elb, SourceNode } from '../types';
import { getState } from './state';
import { run } from './run';

export const handleCommand = async (
  instance: SourceNode.Instance,
  action: string,
  data?: Elb.PushData,
  options?: Elb.PushOptions,
) => {
  let result: Elb.PushResult | undefined;

  switch (action) {
    case Const.Commands.Config:
      if (data) {
        instance.config = getState(data as SourceNode.Config, instance).config;
      }
      break;

    case Const.Commands.Run:
      run(instance, data as Partial<SourceNode.State>);
      break;

    default:
      result = await commonHandleCommand(instance, action, data, options);
  }

  return createPushResult(result);
};
