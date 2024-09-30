import type { Destination } from '../types';

describe('Node Destination Meta', () => {
  let destination: Destination;

  const access_token = 's3cr3t';
  const pixel_id = 'p1x3l1d';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = jest.requireActual('../').default;
    destination.config = {};
  });

  test('init', async () => {
    await expect(destination.init({})).rejects.toThrow(
      'Error: Config custom access_token missing',
    );
    await expect(
      destination.init({ custom: { access_token } }),
    ).rejects.toThrow('Error: Config custom pixel_id missing');
    await expect(
      destination.init({ custom: { access_token, pixel_id } }),
    ).resolves.toEqual(
      expect.objectContaining({ custom: { access_token, pixel_id } }),
    );
  });

  test('push', async () => {
    expect('TODO').toBeDefined();
  });
});
