import { createEvent } from '../core';

describe('createEvent', () => {
  const timestamp = new Date().setHours(0, 13, 37, 0);
  const group = 'gr0up';
  const count = 1;
  const id = `${timestamp}-${group}-${count}`;

  const defaultEvent = {
    event: 'entity action',
    data: {
      string: 'foo',
      number: 1,
      boolean: true,
      array: [0, 'text', false],
      not: undefined,
    },
    context: { dev: ['test', 1] },
    globals: { lang: 'elb' },
    custom: { completely: 'random' },
    user: { id: 'us3r', device: 'c00k13', session: 's3ss10n' },
    nested: [
      {
        type: 'child',
        data: { is: 'subordinated' },
        nested: [],
        context: { element: ['child', 0] },
      },
    ],
    consent: { functional: true },
    id,
    trigger: 'test',
    entity: 'entity',
    action: 'action',
    timestamp,
    timing: 3.14,
    group,
    count,
    version: {
      client: '0.0.7',
      tagging: 1,
    },
    source: {
      type: 'web',
      id: 'https://localhost:80',
      previous_id: 'http://remotehost:9001',
    },
  };

  test('regular', () => {
    expect(createEvent()).toStrictEqual(defaultEvent);
  });
});
