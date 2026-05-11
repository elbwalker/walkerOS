import type { Collector, Trigger } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import type { SyntheticMessage, SyntheticPushResult } from '../types';

/**
 * Content shape for the SQS source trigger.
 *
 * The trigger synthesizes a SyntheticMessage from this partial input and
 * dispatches it through the source's `push()` (the same pipeline the
 * long-poll loop uses).
 */
export interface Content {
  MessageId: string;
  Body: string;
  ReceiptHandle?: string;
  Attributes?: Record<string, string>;
  MessageAttributes?: Record<
    string,
    { DataType: string; StringValue?: string }
  >;
}

/**
 * Trigger result: the recorded ack/nack as `[method, MessageId]` entries.
 * Mirrors the destination's `[method, ...args]` recording shape.
 */
export type Result = Array<[string, ...unknown[]]>;

interface SqsSourceLike {
  type: string;
  push: (content?: SyntheticMessage) => Promise<SyntheticPushResult | void>;
}

function isSqsSource(value: unknown): value is SqsSourceLike {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: { type?: unknown; push?: unknown } = value;
  return candidate.type === 'sqs' && typeof candidate.push === 'function';
}

function findSource(collector: Collector.Instance): SqsSourceLike | undefined {
  for (const source of Object.values(collector.sources ?? {})) {
    if (isSqsSource(source)) return source;
  }
  return undefined;
}

/**
 * SQS source createTrigger.
 *
 * Boots the collector via startFlow, finds the registered SQS source, and
 * invokes its `push()` with a synthesized message. The source dispatches the
 * synthetic message through the same handler the long-poll loop uses,
 * exercising the full decode / forward / ack-nack pipeline without touching
 * real SQS infrastructure.
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
      if (!source) {
        throw new Error(
          'sqs source not registered in collector, ensure it is configured in sources',
        );
      }

      const synthetic: SyntheticMessage = {
        MessageId: content.MessageId,
        Body: content.Body,
        ReceiptHandle: content.ReceiptHandle,
        Attributes: content.Attributes,
        MessageAttributes: content.MessageAttributes,
      };

      const result = await source.push(synthetic);
      const recorded: Result = [];
      if (result && typeof result === 'object') {
        if (result.acked) recorded.push(['message.ack', content.MessageId]);
        if (result.nacked) recorded.push(['message.nack', content.MessageId]);
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
