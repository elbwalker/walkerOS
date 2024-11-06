import { dataLayerToWalkerOS } from '../mapping';

describe('mapping', () => {
  beforeEach(() => {});

  test('init new', () => {
    expect(dataLayerToWalkerOS()).toStrictEqual({ event: 'e a' });
  });
});
