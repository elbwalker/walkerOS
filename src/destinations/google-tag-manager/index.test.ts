import elbwalker from '../../elbwalker';

const w = window;

describe('destination google-tag-manager', () => {
  test('init', () => {
    expect(w.dataLayer).toBeUndefined();
    elbwalker.go();
    expect(w.dataLayer).toBeDefined();
  });

  test('push', () => {
    elbwalker.push('entity action', { a: 1 }, 'manual');
    expect(w.dataLayer).toBeDefined();
    expect(w.dataLayer).toStrictEqual([
      {
        event: 'page view',
        data: { domain: 'localhost', id: '/', title: '' },
        globals: {},
        user: {},
        nested: [],
        id: expect.any(String),
        trigger: 'load',
        entity: 'page',
        action: 'view',
        timestamp: expect.any(Number),
        timing: expect.any(Number),
        group: expect.any(String),
        count: 1,
        walker: true,
      },
      {
        event: 'entity action',
        data: { a: 1 },
        globals: {},
        user: {},
        nested: [],
        id: expect.any(String),
        trigger: 'manual',
        entity: 'entity',
        action: 'action',
        timestamp: expect.any(Number),
        timing: expect.any(Number),
        group: expect.any(String),
        count: 2,
        walker: true,
      },
    ]);
  });
});
