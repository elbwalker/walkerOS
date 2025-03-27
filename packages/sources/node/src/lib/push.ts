import type { SourceNode, Elb } from '../types';
import {
  createEventOrCommand,
  createPushResult,
  pushToDestinations,
  tryCatchAsync,
  useHooks,
} from '@elbwalker/utils';
import { handleCommand } from './handle';

export function createPush(instance: SourceNode.Instance): Elb.Fn {
  const push = async (
    nameOrEvent: unknown,
    data: Elb.PushData = {},
    options?: Elb.PushOptions,
  ) => {
    let result: Elb.PushResult;

    return await tryCatchAsync(
      async (
        nameOrEvent: unknown,
        data: Elb.PushData,
        options?: Elb.PushOptions,
      ): Elb.Return => {
        const { event, command } = createEventOrCommand(instance, nameOrEvent, {
          timing: Math.round((Date.now() - instance.timing) / 10) / 100,
          source: { type: 'node', id: '', previous_id: '' },
        });

        if (command) {
          // Command event
          result = await handleCommand(instance, command, data, options);
        } else if (event) {
          // Regular event
          result = await pushToDestinations(instance, event);
        }

        return createPushResult(result);
      },
      (error) => {
        // Call custom error handling
        if (instance.config.onError) instance.config.onError(error, instance);

        return createPushResult({ ok: false });
      },
    )(nameOrEvent, data, options);
  };

  return useHooks(push, 'Push', instance.hooks);
}
