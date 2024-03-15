import type { Destination } from '../types';

describe('Node Destination Firehose', () => {
  let destination: Destination;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('../').default;
    destination.config = {};
  });

  test('setup', async () => {
    expect('TODO').toBe('TODO');
  });

  test('init', async () => {
    expect('TODO').toBe('TODO');
  });

  test('push', async () => {
    expect('TODO').toBe('TODO');
  });
});
