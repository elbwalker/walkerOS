import { Elbwalker, WebDestination } from '@elbwalker/types';

const w = window;
const mockPush = jest.fn(); //.mockImplementation(console.log);
const mockInit = jest.fn(); //.mockImplementation(console.log);
const destination: WebDestination.Function = {
  init: mockInit,
  push: mockPush,
  config: {},
};
let elbwalker: Elbwalker.Function;

beforeEach(() => {
  w.elbLayer = [] as unknown as Elbwalker.ElbLayer;
  elbwalker = require('../elbwalker').default;
  jest.clearAllMocks();
  jest.resetModules();
  elbwalker.go({ custom: true });
});

describe('elbLayer', () => {
  test('predefined stack without run', () => {
    w.elbLayer.push('walker destination', destination);
    w.elbLayer.push('entity action');

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('predefined stack with run', () => {
    w.elbLayer.push('walker destination', destination);
    w.elbLayer.push('entity action');
    w.elbLayer.push('walker run');

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
    w.elbLayer.push();
    w.elbLayer.push('event postponed');
    w.elbLayer.push('walker destination', destination);
    w.elbLayer.push('walker user', { id: 'userid' });
    w.elbLayer.push('walker run');
    w.elbLayer.push('event later');

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
