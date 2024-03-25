import { elb, Walkerjs } from '@elbwalker/walker.js';
import type { DestinationEtag } from '.';

describe('Destination etag', () => {
  const mockBeacon = jest.fn().mockImplementation(console.log);
  const oldBeacon = navigator.sendBeacon;
  navigator.sendBeacon = mockBeacon;

  let destination: DestinationEtag.Destination;
  const url = 'localhost';
  const config: DestinationEtag.Config = {
    custom: {
      url,
      measurementId: 'G-111',
    },
  };

  beforeEach(() => {
    Walkerjs({ pageview: false, session: false, run: true });
    destination = jest.requireActual('.').default;
  });

  afterEach(() => {
    navigator.sendBeacon = oldBeacon;
  });

  test('init', () => {
    elb('walker destination', destination, config);
    elb('foo bar');
    expect(mockBeacon).toHaveBeenCalledWith(url, expect.any(Blob));
  });
});
