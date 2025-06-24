import type { Hooks, On } from '@walkerOS/types';
import type { WebCollector, Elb } from '../types';
import { initScopeTrigger, ready } from './trigger';
import { getState } from './state';
import { run } from './run';
import { addHook } from './hooks';
import {
  commonHandleCommand,
  Const,
  createPushResult,
  isObject,
  on,
} from '@walkerOS/utils';

export async function handleCommand(
  instance: WebCollector.Instance,
  action: string,
  data?: Elb.PushData,
  options?: Elb.PushOptions,
): Promise<Elb.PushResult> {
  let result: Elb.PushResult | undefined;

  switch (action) {
    case Const.Commands.Config:
      if (isObject(data))
        instance.config = getState(
          data as WebCollector.Config,
          instance,
        ).config;
      break;

    case Const.Commands.Hook:
      if (typeof data === 'string' && typeof options === 'function') {
        addHook(
          instance,
          data as keyof Hooks.Functions,
          options as Hooks.AnyFunction,
        );
      }
      break;

    case Const.Commands.Init:
      const elems: unknown[] = Array.isArray(data) ? data : [data || document];
      elems.forEach((elem) => {
        if (elem instanceof Element || elem instanceof Document) {
          initScopeTrigger(instance, elem);
        }
      });
      break;

    case Const.Commands.On:
      if (data && options) {
        on(instance, data as On.Types, options as On.Options);
      }
      break;

    case Const.Commands.Run:
      await ready(
        instance,
        run,
        instance,
        data as Partial<WebCollector.State>,
      );
      break;

    default:
      result = await commonHandleCommand(instance, action, data, options);
  }

  return createPushResult(result);
}
