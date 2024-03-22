import type { DestinationEtag } from '.';

describe('Destination etag', () => {
  let destination: DestinationEtag.Destination;

  beforeEach(() => {
    destination = jest.requireActual('.').default;
  });

  afterEach(() => {});

  test('init', () => {
    expect(destination).not.toBe('@TODO');
  });
});
