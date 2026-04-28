import { createEvent, getEvent } from '..';

describe('createEvent', () => {
  const timestamp = new Date().setHours(0, 13, 37, 0);

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
      },
    ],
    consent: { functional: true },
    id: expect.stringMatching(/^[0-9a-f]{16}$/),
    trigger: 'test',
    entity: 'entity',
    action: 'action',
    timestamp,
    timing: 3.14,
    source: {
      type: 'collector',
      schema: '4',
    },
  };

  test('regular', () => {
    expect(createEvent()).toStrictEqual(defaultEvent);
  });

  it('produces v4-shaped events with W3C span_id', () => {
    const ev = createEvent({ name: 'page view' });
    expect(ev.id).toMatch(/^[0-9a-f]{16}$/);
    expect(ev.source.type).toBe('collector');
    expect(ev.source.schema).toBe('4');
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
