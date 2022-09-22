import Elbwalker from '@elbwalker/walker.js';
import { DestinationGTM } from '.';

describe('destination google-tag-manager', () => {
  const w = window;
  let elbwalker;
  const version = { config: 0, walker: expect.any(Number) };

  let destination: DestinationGTM;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  const event = 'entity action';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    destination = require('./index').destination;

    w.elbLayer = [];
    w.dataLayer = [];
    w.dataLayer.push = mockFn;

    elbwalker = Elbwalker({ custom: true });
    elbwalker.push('walker run');
    elbwalker.push('walker destination', destination);
  });

  test('init', () => {
    w.dataLayer = undefined;
    expect(w.dataLayer).toBeUndefined();

    elbwalker.push(event);
    expect(w.dataLayer).toBeDefined();
  });

  test('push', () => {
    elbwalker.push(event, { a: 1 }, 'manual');
    expect(w.dataLayer).toBeDefined();
    expect(mockFn).toHaveBeenLastCalledWith({
      event,
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
    });
  });
});
