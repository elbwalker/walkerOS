import { Elbwalker, WebDestination } from '@elbwalker/types';

const w = window;
const mockPush = jest.fn().mockImplementation(console.log);
const mockInit = jest.fn(); //.mockImplementation(console.log);
const destination: WebDestination.Function = {
  init: mockInit,
  push: mockPush,
  config: {},
};
let elbwalker: Elbwalker.Function;

beforeEach(() => {
  elbwalker = require('../elbwalker').default;
  jest.clearAllMocks();
  jest.resetModules();

  w.elbLayer = [] as unknown as Elbwalker.ElbLayer;
});

describe('elbLayer', () => {
  test('predefined stack without run', () => {
    elbwalker.go({ custom: true });
    w.elbLayer.push('walker destination', destination);
    w.elbLayer.push('entity action');

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('predefined stack with run', () => {
    elbwalker.go({ custom: true });
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

  test.skip('prioritize walker commands before run', () => {
    w.elbLayer.push('entity action');
    w.elbLayer.push('walker destinattion', destination);
    w.elbLayer.push('walker user', { id: 'userid' });
    w.elbLayer.push('walker run');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userid', device: 'userid' },
      }),
    );
  });
});
