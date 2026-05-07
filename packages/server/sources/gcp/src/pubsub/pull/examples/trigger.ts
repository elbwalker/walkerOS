import type { Collector, Trigger } from '@walkeros/core';
import type { MessageLike } from '../../shared/types';
import { startFlow } from '@walkeros/collector';
import {
  __getMockCalls,
  __resetMockState,
  __triggerError,
  __triggerMessage,
} from './env';

/**
 * Content shape for the pull-source trigger.
 *
 * The trigger synthesizes a MessageLike from this partial input. `dataString`
 * is the user-friendly way to provide the message body; the trigger encodes
 * it to a Buffer.
 */
export interface Content {
  id: string;
  dataString: string;
  attributes?: Record<string, string>;
  orderingKey?: string;
}

/**
 * Result shape for the pull-source trigger.
 *
 * Returns the recorded mock calls so step examples can assert on the
 * sequence of subscriber actions (subscription/topic creation, ack/nack).
 */
export type Result = Array<[string, ...unknown[]]>;

interface MessageState {
  acked: boolean;
  nacked: boolean;
}

function buildMessage(content: Content, state: MessageState): MessageLike {
  return {
    id: content.id,
    data: Buffer.from(content.dataString, 'utf8'),
    attributes: content.attributes ?? {},
    orderingKey: content.orderingKey,
    publishTime: new Date(0),
    ack: () => {
      state.acked = true;
    },
    nack: () => {
      state.nacked = true;
    },
    modAck: () => {
      /* no-op for tests */
    },
  };
}

/**
 * Pub/Sub pull source createTrigger.
 *
 * Boots the collector via startFlow, then synthesizes a MessageLike from
 * the trigger Content and invokes the registered subscriber handler.
 * Returns the recorded mock calls plus the message ack/nack outcome,
 * collapsed into a single recorded entry (`message.ack` or `message.nack`).
 */
export const createTrigger: Trigger.CreateFn<Content, Result> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<Content, Result> =
    () =>
    async (content: Content): Promise<Result> => {
      __resetMockState();

      if (!flow) {
        const result = await startFlow(config);
        flow = { collector: result.collector, elb: result.elb };
      }

      const state: MessageState = { acked: false, nacked: false };
      const message = buildMessage(content, state);

      const handlerResult = __triggerMessage(message);
      if (handlerResult instanceof Promise) await handlerResult;

      const calls = __getMockCalls();
      const recorded: Result = calls.map((c) => [c.method, ...c.args]);
      if (state.acked) recorded.push(['message.ack', message.id]);
      if (state.nacked) recorded.push(['message.nack', message.id]);
      return recorded;
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};

/**
 * Convenience helper to fire a stream-level error against the registered
 * error handler. Used by tests covering PERMISSION_DENIED / NOT_FOUND.
 */
export function fireStreamError(err: Error): void {
  __triggerError(err);
}
