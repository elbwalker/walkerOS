import { isObject } from '@walkeros/core';
import { expectSimulationResolves } from '@walkeros/core/dev';
import { examples } from '../dev';

// Every example runs on a real collector in the conformance test.

it('declares simulation paths that resolve', () =>
  expectSimulationResolves(examples.env));

it('gives every example event a timestamp in milliseconds', () => {
  for (const example of Object.values(examples.step)) {
    const timestamp = isObject(example.in) ? example.in.timestamp : undefined;
    expect(timestamp).toBeGreaterThan(1e12);
  }
});
