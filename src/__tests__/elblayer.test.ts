import { Elbwalker, WebDestination } from '@elbwalker/types';

const w = window;
let elbwalker: Elbwalker.Function;

function walker(...args: unknown[]) {
  (window.elbLayer = window.elbLayer || []).push(arguments);
}

const mockPush = jest.fn(); //.mockImplementation(console.log);
const mockInit = jest.fn(); //.mockImplementation(console.log);
const destination: WebDestination.Function = {
  init: mockInit,
  push: mockPush,
  config: { init: true },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();
  w.elbLayer = [];
  w.dataLayer = [];
  w.dataLayer.push = mockPush;
  elbwalker = require('../elbwalker').default;
});

describe('elbLayer', () => {
  test('arguments and event pushes', () => {
    elbwalker.go();

    walker('ingest argument', { a: 1 }, 'a', []); // Push as arguments
    w.elbLayer.push('ingest event', { b: 2 }, 'e', []); // Push as event

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest argument',
        data: { a: 1 },
        trigger: 'a',
        nested: [],
      }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest event',
        data: { b: 2 },
        trigger: 'e',
        nested: [],
      }),
    );
  });

  test('predefined stack without run', () => {
    elbwalker.go({ custom: true });
    walker('walker destination', destination);
    walker('entity action');

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('walker push pre and post go', () => {
    walker('e 1');
    walker('walker destination', destination);

    elbwalker.go({ custom: true });
    walker('e 2');
    walker('walker run');
    // auto call: walker('page view');
    walker('e 4');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 1',
        count: 1,
      }),
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 2',
        count: 2,
      }),
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
        count: 3,
      }),
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 4',
        count: 4,
      }),
    );
  });

  test('predefined stack with run', () => {
    elbwalker.go({ custom: true });

    walker('walker destination', destination);
    walker('ingest argument', { a: 1 }, 'a', []); // Push as arguments
    w.elbLayer.push('ingest event', { b: 2 }, 'e', []); // Push as event
    walker('walker run');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest argument',
      }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest event',
      }),
    );
  });

  test('prioritize walker commands before run', () => {
    elbwalker.go({ custom: true });

    walker();
    walker('event postponed');
    walker('walker destination', destination);
    walker('walker user', { id: 'userid' });
    walker('walker run');
    walker('event later');

    expect(mockPush).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'event postponed',
        user: { id: 'userid' },
      }),
    );
    expect(mockPush).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: 'page view',
        user: { id: 'userid' },
      }),
    );
    expect(mockPush).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        event: 'event later',
        user: { id: 'userid' },
      }),
    );
  });
});
