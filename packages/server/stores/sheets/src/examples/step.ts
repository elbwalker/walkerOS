import type { Flow } from '@walkeros/core';

/** Read a JSON value with ADC (Cloud Run / GKE service account). */
export const readWithAdc: Flow.StepExample = {
  title: 'Read with ADC',
  description:
    'Read a value from the Sheets store using ADC, no credentials field needed on Cloud Run or GKE',
  in: { operation: 'get', key: 'alice' },
  out: [['get', 'alice', '{ tier: "gold" }']],
};

/** Write a JSON value with an explicit service account JSON. */
export const writeWithServiceAccount: Flow.StepExample = {
  title: 'Write with service account',
  description:
    'Append or update a JSON value in the configured sheet using an explicit service account JSON',
  in: { operation: 'set', key: 'bob', value: { tier: 'silver' } },
  out: [['set', 'bob', '{ tier: "silver" }']],
};
