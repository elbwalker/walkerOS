import type { NodeClient } from '../types';
import nodeClient from '../';

describe('Node Client', () => {
  const mockFn = jest.fn(); //.mockImplementation(console.log);
  const version = { config: 0, walker: 1.6 };

  let elbwalker: NodeClient.Function;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    elbwalker = nodeClient({});
  });

  test('TODO', () => {
    expect(elbwalker).toBeDefined();
  });
});
