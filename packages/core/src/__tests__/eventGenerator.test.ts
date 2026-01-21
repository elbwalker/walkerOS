import { createEvent, getEvent } from '..';

describe('createEvent', () => {
  const timestamp = new Date().setHours(0, 13, 37, 0);
  const group = 'gr0up';
  const count = 1;
  const id = `${timestamp}-${group}-${count}`;

  const defaultEvent = {
    name: 'entity action',
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
        entity: 'child',
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
      source: expect.stringMatching(/^\d+\.\d+\./),
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

  test('getEvent', () => {
    expect(getEvent('page view')).toStrictEqual(
      expect.objectContaining({
        name: 'page view',
        data: {
          domain: 'www.example.com',
          title: 'walkerOS documentation',
          referrer: 'https://www.walkeros.io/',
          search: '?foo=bar',
          hash: '#hash',
          id: '/docs/',
        },
        globals: { pagegroup: 'docs' },
        entity: 'page',
        action: 'view',
      }),
    );

    expect(getEvent('page view', { data: { id: '/custom' } })).toStrictEqual(
      expect.objectContaining({
        name: 'page view',
        data: { id: '/custom' },
        trigger: 'load',
        entity: 'page',
        action: 'view',
      }),
    );

    expect(getEvent('promotion visible')).toStrictEqual(
      expect.objectContaining({
        name: 'promotion visible',
        data: {
          name: 'Setting up tracking easily',
          position: 'hero',
        },
        trigger: 'visible',
      }),
    );
  });
});
