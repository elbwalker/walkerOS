import type { Flow, WalkerOS } from '@walkeros/core';
import { isObject, StepError } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { examples } from '../dev';
import { createFailingStore, createMockStore, serve } from './serve';

function isEvent(value: unknown): value is WalkerOS.DeepPartialEvent {
  return isObject(value) && typeof value.name === 'string';
}

/** The request an example describes: its event and, in its data, the path. */
function requestOf(example: Flow.StepExample) {
  const event = example.in;
  if (!isEvent(event) || !isObject(event.data))
    throw new Error('example in is not an event with data');
  const path = event.data.path;
  if (typeof path !== 'string') throw new Error('example has no data.path');
  return { event, path };
}

/**
 * Each example on a real collector, with the config its description names:
 * the store holds walker.js, or fails every read when the example's boundary
 * answers with an error.
 */
describe('Step Examples', () => {
  it.each(Object.entries(examples.step))('%s', async (_, example) => {
    const { event, path } = requestOf(example);
    const store = example.respond?.error
      ? createFailingStore(
          new StepError('Store read failed', { code: 'transport' }),
        )
      : createMockStore();
    store.set('walker.js', Buffer.from('console.log("walkerOS")'));

    const flow = await serve(
      {
        prefix: '/static',
        headers: { 'Cache-Control': 'public, max-age=3600' },
      },
      store,
    );
    const { result, answers } = await flow.request(path, event);

    expect(answers.map((answer) => ['respond', answer])).toMatchObject(
      example.out ?? [],
    );
    if (example.outcome) {
      expect(result.ok).toBe(false);
      expect(result.reason?.code).toBe(example.outcome.code);
    } else {
      expect(result.ok).toBe(true);
    }
  });
});

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));
