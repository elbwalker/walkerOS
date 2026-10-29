import { isObject } from '@walkeros/core';
import type { Destination, Trigger, WalkerOS } from '@walkeros/core';
import * as examples from '../examples';
import type { Content, Result } from '../examples/trigger';
import { sourceSqs } from '../index';
import type { Decoder } from '../types';

// The published SQS examples, run through the source's push() on a real
// collector: the recorded ack or nack matches, and an acknowledged JSON
// message reaches a destination instead of being rejected and deleted.

const decoders: Record<string, Decoder> = { decoderText: 'text' };

const isContent = (value: unknown): value is Content =>
  isObject(value) &&
  typeof value.MessageId === 'string' &&
  typeof value.Body === 'string';

/** The example's synthetic message, narrowed without a cast. */
const contentOf = (name: string, value: unknown): Content => {
  if (!isContent(value)) throw new Error(`${name}: in is not a message`);
  return value;
};

describe('SQS step examples', () => {
  let instance: Trigger.Instance<Content, Result> | undefined;
  let delivered: WalkerOS.Event[] = [];

  afterEach(async () => {
    await instance?.flow?.collector.command('shutdown');
    instance = undefined;
  });

  const run = async (name: string, content: Content): Promise<Result> => {
    delivered = [];
    const capture: Destination.Instance = {
      type: 'capture',
      config: {},
      push: (event) => {
        delivered.push(event);
      },
    };
    instance = await examples.createTrigger({
      logger: { handler: () => undefined },
      sources: {
        sqs: {
          code: sourceSqs,
          env: examples.env.push,
          config: {
            settings: {
              queueName: 'walkeros-events',
              decoder: decoders[name] ?? 'json',
            },
          },
        },
      },
      destinations: { capture: { code: capture } },
    });
    return instance.trigger()(content);
  };

  const rejected = (): number =>
    instance?.flow?.collector.status.sources.sqs?.rejected ?? 0;

  it.each(Object.entries(examples.step))('%s', async (name, example) => {
    const result = await run(name, contentOf(name, example.in));
    expect(result).toEqual(example.out);
  });

  it.each(['pageView', 'orderComplete'] as const)(
    '%s reaches a destination',
    async (name) => {
      const content = contentOf(name, examples.step[name].in);
      const body: unknown = JSON.parse(content.Body);
      await run(name, content);
      expect(delivered).toEqual([expect.objectContaining(body)]);
      expect(rejected()).toBe(0);
    },
  );

  it('decoderText carries no event name: acknowledged and rejected', async () => {
    const result = await run(
      'decoderText',
      contentOf('decoderText', examples.step.decoderText.in),
    );
    expect(result).toEqual([['message.ack', 'm-3']]);
    expect(delivered).toEqual([]);
    expect(rejected()).toBe(1);
  });
});
