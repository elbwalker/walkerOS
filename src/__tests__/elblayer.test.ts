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
  elbwalker = require('../elbwalker').default;
  elbwalker.go({ custom: true });
});

describe('elbLayer', () => {
  test('arguments and event pushes', () => {
    w.dataLayer = [];
    w.dataLayer.push = mockPush;
    elbwalker.go();

    walker('ingest argument', { a: 1 }, 'a', []); // Push as arguments
    w.elbLayer.push({
      event: 'ingest event',
      data: { b: 2 },
      trigger: 'e',
      nested: [],
    }); // Push as event

    // Multiple events per push
    w.elbLayer.push({ event: 'i e1' }, { event: 'i e2' });

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
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'i e1',
      }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'i e2',
      }),
    );
  });
  test('predefined stack without run', () => {
    walker('walker destination', destination);
    walker('entity action');

    expect(mockPush).not.toHaveBeenCalled();
  });

  test.skip('walker push pre and post go', () => {
    // @TODO
    walker('entity action');
    elbwalker.go();
    walker('entity action');
  });

  test.only('predefined stack with run', () => {
    walker('walker destination', destination);
    walker('entity action');
    walker('walker run');

    expect(mockPush).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'entity action',
      }),
    );
    expect(mockPush).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: 'page view',
      }),
    );
  });

  test('prioritize walker commands before run', () => {
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
