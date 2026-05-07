import type { Collector, Trigger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { SyntheticMessage, SyntheticPushResult } from '../types';

/**
 * Content shape for the pull-source trigger.
 *
 * The trigger synthesizes a message from this partial input and dispatches
 * it through the source's `push()` (the same pipeline the SDK subscriber
 * callback uses). `dataString` is the user-friendly way to provide the
 * message body; the trigger encodes it to a Buffer.
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
 * Returns the recorded ack/nack as `[method, id]` entries, mirroring the
 * destination's `[method, ...args]` recording shape used elsewhere.
 */
export type Result = Array<[string, ...unknown[]]>;

interface PubSubPullSourceLike {
  type: string;
  push: (content?: SyntheticMessage) => Promise<SyntheticPushResult | void>;
}

function isPubSubPullSource(value: unknown): value is PubSubPullSourceLike {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: { type?: unknown; push?: unknown } = value;
  return (
    candidate.type === 'pubsub-pull' && typeof candidate.push === 'function'
  );
}

function findSource(
  collector: Collector.Instance,
): PubSubPullSourceLike | undefined {
  for (const source of Object.values(collector.sources ?? {})) {
    if (isPubSubPullSource(source)) return source;
  }
  return undefined;
}

/**
 * Pub/Sub pull source createTrigger.
 *
 * Boots the collector via startFlow, finds the registered pubsub-pull source,
 * and invokes its `push()` with a synthesized message. The source dispatches
 * the synthetic message through the same handler the SDK subscriber callback
 * uses, exercising the full decode / forward / ack-nack pipeline without
 * touching real Pub/Sub.
 *
 * Matches the convention used by other source triggers (express, lambda,
 * cloudfunction): find the source by type from the collector and call its
 * public `push()` interface.
 */
export const createTrigger: Trigger.CreateFn<Content, Result> = async (
  config: Collector.InitConfig,
) => {
  let flow: Trigger.FlowHandle | undefined;

  const trigger: Trigger.Fn<Content, Result> =
    () =>
    async (content: Content): Promise<Result> => {
      if (!flow) {
        const result = await startFlow(config);
        flow = { collector: result.collector, elb: result.elb };
      }

      const source = findSource(flow.collector);
      if (!source)
        throw new Error(
          'pubsub-pull source not registered in collector — ensure it is configured in sources',
        );

      const synthetic: SyntheticMessage = {
        id: content.id,
        data: Buffer.from(content.dataString, 'utf8'),
        attributes: content.attributes,
        orderingKey: content.orderingKey,
      };

      const result = await source.push(synthetic);
      const recorded: Result = [];
      if (result && typeof result === 'object') {
        if (result.acked) recorded.push(['message.ack', content.id]);
        if (result.nacked) recorded.push(['message.nack', content.id]);
      }
      return recorded;
    };

  return {
    get flow() {
      return flow;
    },
    trigger,
  };
};
