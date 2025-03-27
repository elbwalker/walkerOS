import type { WalkerOS } from '@elbwalker/types';
import type { DestinationNode, Elb, SourceNode } from '../types';
import {
  Const,
  addDestination,
  assign,
  createPushResult,
  isObject,
  pushToDestinations,
  setConsent,
} from '@elbwalker/utils';
import { run } from './run';
import { getState } from './state';

export const handleCommand: SourceNode.HandleCommand = async (
  instance,
  action,
  data?,
  options?,
) => {
  let result: Partial<Elb.PushResult> | undefined = {};

  switch (action) {
    case Const.Commands.Config:
      if (isObject(data))
        instance.config = getState(data as SourceNode.Config, instance).config;
      break;
    case Const.Commands.Consent:
      if (isObject(data))
        result = await setConsent(instance, data as WalkerOS.Consent);
      break;
    case Const.Commands.Custom:
      if (isObject(data)) instance.custom = assign(instance.custom, data);
      break;
    case Const.Commands.Destination:
      if (isObject(data))
        result = await addDestination(
          instance,
          data as DestinationNode.Destination,
          options as DestinationNode.Config,
        );
      break;
    case Const.Commands.Globals:
      if (isObject(data)) instance.globals = assign(instance.globals, data);
      break;
    case Const.Commands.Run:
      run(instance, data as Partial<SourceNode.State>);
      break;
    case Const.Commands.User:
      if (isObject(data)) assign(instance.user, data, { shallow: false });
      break;
  }

  return createPushResult(result);
};
