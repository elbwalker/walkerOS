import { dataLayerToWalkerOS } from '../mapping';

describe('mapping', () => {
  beforeEach(() => {});

  test('init new', () => {
    expect(dataLayerToWalkerOS({ event: 'e a' })).toStrictEqual({
      event: 'e a',
    });
  });
});
