import type { Hooks, On, WalkerOS } from '@elbwalker/types';
import type { SourceWalkerjs, DestinationWeb, Elb } from '../types';
import {
  Const,
  addDestination,
  assign,
  createPushResult,
  isArray,
  isElementOrDocument,
  isObject,
  isSameType,
  on,
  pushToDestinations,
  setConsent,
} from '@elbwalker/utils';
import { initScopeTrigger, ready } from './trigger';
import { getState } from './state';
import { run } from './run';
import { addHook } from './hooks';

export async function handleCommand(
  instance: SourceWalkerjs.Instance,
  action: string,
  data?: Elb.PushData,
  options?: Elb.PushOptions,
): Promise<Elb.PushResult> {
  let result: Partial<Elb.PushResult> | undefined = {};

  switch (action) {
    case Const.Commands.Config:
      if (isObject(data))
        instance.config = getState(
          data as SourceWalkerjs.Config,
          instance,
        ).config;
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
        return await addDestination(
          instance,
          data as DestinationWeb.Destination,
          options as DestinationWeb.Config,
        );
      break;
    case Const.Commands.Globals:
      if (isObject(data)) instance.globals = assign(instance.globals, data);
      break;
    case Const.Commands.Hook:
      if (isSameType(data, '') && isSameType(options, isSameType))
        addHook(instance, data as keyof Hooks.Functions, options);
      break;
    case Const.Commands.Init: {
      const elems: unknown[] = isArray(data) ? data : [data || document];
      elems.forEach((elem) => {
        isElementOrDocument(elem) && initScopeTrigger(instance, elem);
      });
      break;
    }
    case Const.Commands.On:
      on(instance, data as On.Types, options as On.Options);
      break;
    case Const.Commands.Run:
      await ready(
        instance,
        run,
        instance,
        data as Partial<SourceWalkerjs.State>,
      );
      break;
    case Const.Commands.User:
      if (isObject(data)) assign(instance.user, data, { shallow: false });
      break;
    default:
      break;
  }

  return createPushResult(result);
}
