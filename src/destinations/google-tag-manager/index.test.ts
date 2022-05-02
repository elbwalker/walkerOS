import { Elbwalker } from '@elbwalker/types';

const w = window;
const version = { config: 0, walker: 1.2 };

let elbwalker: Elbwalker.Function;

describe('destination google-tag-manager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    elbwalker = require('../../elbwalker').default;
    elbwalker.go();

    w.dataLayer = undefined;
  });

  test('init', () => {
    expect(w.dataLayer).toBeUndefined();
    elbwalker.push('walker run');
    expect(w.dataLayer).toBeDefined();
  });

  test('push', () => {
    elbwalker.push('walker run');
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
        version,
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
        version,
        walker: true,
      },
    ]);
  });
});
