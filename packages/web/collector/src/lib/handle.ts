import type { Hooks, On } from '@walkerOS/core';
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
} from '@walkerOS/core';

export async function handleCommand(
  collector: WebCollector.Collector,
  action: string,
  data?: Elb.PushData,
  options?: Elb.PushOptions,
): Promise<Elb.PushResult> {
  let result: Elb.PushResult | undefined;

  switch (action) {
    case Const.Commands.Config:
      if (isObject(data))
        collector.config = getState(
          data as WebCollector.Config,
          collector,
        ).config;
      break;

    case Const.Commands.Hook:
      if (typeof data === 'string' && typeof options === 'function') {
        addHook(
          collector,
          data as keyof Hooks.Functions,
          options as Hooks.AnyFunction,
        );
      }
      break;

    case Const.Commands.Init:
      const elems: unknown[] = Array.isArray(data) ? data : [data || document];
      elems.forEach((elem) => {
        if (elem instanceof Element || elem instanceof Document) {
          initScopeTrigger(collector, elem);
        }
      });
      break;

    case Const.Commands.On:
      if (data && options) {
        on(collector, data as On.Types, options as On.Options);
      }
      break;

    case Const.Commands.Run:
      await ready(
        collector,
        run,
        collector,
        data as Partial<WebCollector.State>,
      );
      break;

    default:
      result = await commonHandleCommand(collector, action, data, options);
  }

  return createPushResult(result);
}
