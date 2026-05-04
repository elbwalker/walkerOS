jest.mock('kafkajs', () => ({
  __esModule: true,
  Kafka: class {
    constructor(_config: unknown) {}
    producer() {
      return {
        connect: () => Promise.resolve(),
        disconnect: () => Promise.resolve(),
        send: () => Promise.resolve([]),
      };
    }
  },
}));

import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import { examples } from '../dev';
import type {
  Env,
  KafkaClientMock,
  KafkaProducerMock,
  ProducerRecord,
  Settings,
} from '../types';

type CallRecord = [string, ...unknown[]];
type ExpectedOut = CallRecord | CallRecord[];

function flatten(out: unknown): CallRecord[] {
  if (!Array.isArray(out) || out.length === 0) return [];
  // Single call: ['producer.send', record]
  if (typeof out[0] === 'string') return [out as CallRecord];
  // Multiple calls: [['producer.send', record], ...]
  return out as CallRecord[];
}

/**
 * Recording Env -- wraps a mock kafkajs Kafka constructor whose producer.send
 * appends to a shared call log as ['producer.send', ProducerRecord].
 */
function spyEnv(): { env: Env; collected: () => CallRecord[] } {
  const calls: CallRecord[] = [];

  const producer: KafkaProducerMock = {
    connect: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    send: async (record: ProducerRecord) => {
      calls.push(['producer.send', record]);
      return [];
    },
  };

  class RecordingKafka implements KafkaClientMock {
    constructor(_config: unknown) {}
    producer(): KafkaProducerMock {
      return producer;
    }
  }

  return {
    env: {
      Kafka: {
        Kafka: RecordingKafka,
        CompressionTypes: { None: 0, GZIP: 1, Snappy: 2, LZ4: 3, ZSTD: 4 },
      },
    },
    collected: () => calls,
  };
}

/**
 * Normalize producer.send record. The message `value` is always a JSON
 * string derived from the event or the mapped data. Step examples carry
 * placeholder strings 'json:event' and 'json:data' to document intent --
 * the test verifies value parses as JSON and strips it before comparison.
 */
function normalize(record: unknown): unknown {
  if (
    !record ||
    typeof record !== 'object' ||
    !('messages' in record) ||
    !Array.isArray((record as ProducerRecord).messages)
  ) {
    return record;
  }
  const r = record as ProducerRecord;
  return {
    ...r,
    messages: r.messages.map((msg) => {
      // Replace value with a placeholder tag after verifying it's valid JSON.
      const tag = 'json:ok';
      try {
        JSON.parse(msg.value);
      } catch {
        // leave as-is -- test will fail on mismatch
      }
      return { ...msg, value: tag };
    }),
  };
}

function normalizeExpected(record: unknown): unknown {
  if (
    !record ||
    typeof record !== 'object' ||
    !('messages' in record) ||
    !Array.isArray((record as ProducerRecord).messages)
  ) {
    return record;
  }
  const r = record as ProducerRecord;
  return {
    ...r,
    messages: r.messages.map((msg) => ({ ...msg, value: 'json:ok' })),
  };
}

describe('kafka server destination -- step examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    const example = rawExample as {
      in?: unknown;
      mapping?: unknown;
      out?: unknown;
      settings?: Partial<Settings>;
    };

    const { env, collected } = spyEnv();
    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const exampleKafka = example.settings?.kafka;
    const baseSettings: Settings = {
      kafka: {
        brokers: ['localhost:9092'],
        topic: 'walkeros-events',
        ...(exampleKafka ?? {}),
      },
    };

    const event = example.in as WalkerOS.Event;
    const mapping = example.mapping as WalkerOSMapping.Rule | undefined;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest, env },
      {
        settings: baseSettings,
        mapping: mappingConfig,
      },
    );

    await elb(event);

    // Let the async push/connect settle.
    await new Promise((resolve) => setImmediate(resolve));

    const expected = flatten(example.out as ExpectedOut);
    const actual = collected();

    expect(actual.map((c) => [c[0], normalize(c[1])])).toEqual(
      expected.map((c) => [c[0], normalizeExpected(c[1])]),
    );
  });
});
