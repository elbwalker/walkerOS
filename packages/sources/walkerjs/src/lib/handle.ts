import type { Hooks, WalkerOS } from '@elbwalker/types';
import type { On, SourceWalkerjs, WebDestination } from '../types';
import { Const, assign, isSameType } from '@elbwalker/utils';
import { isElementOrDocument, isObject } from './helper';
import { initScopeTrigger, ready } from './trigger';
import { getState } from './state';
import { addDestination } from './destination';
import { on } from './on';
import { run } from './run';
import { pushToDestinations } from './push';
import { addHook } from './hooks';
import { setConsent } from './consent';

export function handleCommand(
  instance: SourceWalkerjs.Instance,
  action: string,
  data?: SourceWalkerjs.PushData,
  options?: SourceWalkerjs.PushOptions,
) {
  switch (action) {
    case Const.Commands.Config:
      if (isObject(data))
        instance.config = getState(
          data as SourceWalkerjs.Config,
          instance,
        ).config;
      break;
    case Const.Commands.Consent:
      isObject(data) && setConsent(instance, data as WalkerOS.Consent);
      break;
    case Const.Commands.Custom:
      if (isObject(data)) instance.custom = assign(instance.custom, data);
      break;
    case Const.Commands.Destination:
      isObject(data) &&
        addDestination(
          instance,
          data as WebDestination.Destination,
          options as WebDestination.Config,
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
      const elems: unknown[] = Array.isArray(data) ? data : [data || document];
      elems.forEach((elem) => {
        isElementOrDocument(elem) && initScopeTrigger(instance, elem);
      });
      break;
    }
    case Const.Commands.On:
      on(instance, data as On.Types, options as On.Options);
      break;
    case Const.Commands.Run:
      ready(instance, run, instance, data as Partial<SourceWalkerjs.State>);
      break;
    case Const.Commands.User:
      if (isObject(data)) assign(instance.user, data, { shallow: false });
      break;
    default:
      break;
  }
}

export function handleEvent(
  instance: SourceWalkerjs.Instance,
  event: WalkerOS.Event,
) {
  // Check if walker is allowed to run
  if (!instance.allowed) return;

  // Add event to internal queue
  instance.queue.push(event);

  pushToDestinations(instance, instance.destinations, event);
}
