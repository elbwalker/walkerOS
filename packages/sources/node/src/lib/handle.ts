import type { WalkerOS } from '@elbwalker/types';
import type { Elb, SourceNode } from '../types';
import {
  Const,
  assign,
  isObject,
  isSameType,
  pushToDestinations,
} from '@elbwalker/utils';
import { addDestination } from './destination';
import { createResult } from './helper';
import { run } from './run';
import { getState } from './state';
import { setConsent } from './consent';

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
      result = await setConsent(instance, data as WalkerOS.Consent);
      break;
    case Const.Commands.Custom:
      if (isSameType(data, {} as WalkerOS.Properties))
        instance.custom = assign(instance.custom, data);
      break;
    case Const.Commands.Destination:
      result = await addDestination(instance, data, options);
      break;
    case Const.Commands.Globals:
      if (isSameType(data, {} as WalkerOS.Properties))
        instance.globals = assign(instance.globals, data);
      break;
    case Const.Commands.Run:
      run(instance, data as Partial<SourceNode.State>);
      break;
    case Const.Commands.User:
      if (isObject(data)) assign(instance.user, data, { shallow: false });
      break;
  }

  return createResult(result);
};

export const handleEvent: SourceNode.HandleEvent = async (instance, event) => {
  // Check if walker is allowed to run
  if (!instance.allowed) return createResult({ status: { ok: false } });

  // Add event to internal queue
  instance.queue.push(event);

  return createResult(
    await pushToDestinations(instance, instance.destinations, event),
  );
};
