jest.mock('@google-cloud/pubsub');

import { __getMockCalls, __resetMockCalls } from '@google-cloud/pubsub';
import type { WalkerOS, Mapping as WalkerOSMapping } from '@walkeros/core';
import { startFlow } from '@walkeros/collector';
import * as examples from '../examples';

type CallRecord = [string, ...unknown[]];

interface StepShape {
  in: WalkerOS.Event;
  mapping?: WalkerOSMapping.Rule;
  out: CallRecord[];
}

function isStepShape(value: unknown): value is StepShape {
  if (typeof value !== 'object' || value === null) return false;
  const candidate: { in?: unknown; out?: unknown } = value;
  return Boolean(candidate.in) && Array.isArray(candidate.out);
}

interface PublishMessageRecord {
  data?: Buffer;
  attributes?: Record<string, string>;
  orderingKey?: string;
}

function isBuffer(value: unknown): value is Buffer {
  return Buffer.isBuffer(value);
}

function isPublishRecord(value: unknown): value is PublishMessageRecord {
  if (typeof value !== 'object' || value === null) return false;
  return true;
}

/**
 * Normalize publishMessage's data buffer to its decoded JSON string for
 * stable comparison against the example's expected payload (also a Buffer
 * built from JSON.stringify in step.ts). Comparing Buffers directly would
 * incidentally compare byte arrays which is correct but unreadable on diff.
 */
interface DecodedPublishRecord {
  data?: string;
  attributes?: Record<string, string>;
  orderingKey?: string;
}

function decodeData(call: CallRecord): CallRecord {
  if (call[0] !== 'publishMessage') return call;
  const [, topic, raw] = call;
  if (!isPublishRecord(raw)) return call;
  if (!raw.data || !isBuffer(raw.data)) return call;
  const decoded: DecodedPublishRecord = {
    data: raw.data.toString('utf-8'),
  };
  if (raw.attributes) decoded.attributes = raw.attributes;
  if (raw.orderingKey) decoded.orderingKey = raw.orderingKey;
  const result: CallRecord = ['publishMessage', topic, decoded];
  return result;
}

function decodeExpectedData(call: CallRecord): CallRecord {
  return decodeData(call);
}

describe('Pub/Sub Step Examples', () => {
  beforeEach(() => {
    __resetMockCalls();
  });

  it.each(Object.entries(examples.step))('%s', async (_name, rawExample) => {
    if (!isStepShape(rawExample)) {
      throw new Error('example missing in/out shape');
    }
    const example = rawExample;

    const dest = jest.requireActual('../').default;
    const { elb } = await startFlow();

    const event = example.in;
    const mapping = example.mapping;
    const mappingConfig = mapping
      ? { [event.entity]: { [event.action]: mapping } }
      : undefined;

    elb(
      'walker destination',
      { ...dest },
      {
        settings: {
          projectId: 'test-project',
          topic: 'events',
        },
        mapping: mappingConfig,
      },
    );

    await elb(event);

    // Let the async publish settle.
    await new Promise((resolve) => setImmediate(resolve));

    // Strip the lazy init's PubSub.ctor; examples assert on push effects only.
    const actual: CallRecord[] = __getMockCalls()
      .filter((c) => c.method !== 'PubSub.ctor')
      .map((c): CallRecord => {
        const record: CallRecord = [c.method, ...c.args];
        return record;
      });

    const expected = example.out;

    expect(actual.map(decodeData)).toEqual(expected.map(decodeExpectedData));
  });
});
