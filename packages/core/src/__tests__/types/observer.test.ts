/**
 * Type-only test for ObserverFn. Compiles-or-fails-at-typecheck.
 */
import type { Collector, FlowState, ObserverFn } from '../..';

describe('ObserverFn type', () => {
  test('accepts a FlowState consumer', () => {
    const fn: ObserverFn = (state: FlowState) => {
      // touching a known field proves the structural import works
      void state.flowId;
    };
    expect(typeof fn).toBe('function');
  });
});

test('Collector.Instance carries an observers Set', () => {
  const observers = new Set<ObserverFn>();
  // If observers is missing from Instance, this assignment fails typecheck.
  const surface: Pick<Collector.Instance, 'observers'> = { observers };
  expect(surface.observers.size).toBe(0);
});
