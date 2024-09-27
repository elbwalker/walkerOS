import type { Destination } from '../types';

describe('Node Destination Meta', () => {
  let destination: Destination;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('../').default;
    destination.config = {};
  });

  test('init', async () => {
    expect('TODO').toBeDefined();
  });

  test('push', async () => {
    expect('TODO').toBeDefined();
  });
});
