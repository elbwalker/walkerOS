import { elb, Walkerjs } from '@elbwalker/walker.js';
import type { DestinationEtag } from '.';

describe('Destination etag', () => {
  const mockBeacon = jest.fn(); //.mockImplementation(console.log);
  const oldBeacon = navigator.sendBeacon;
  const mockBlob = jest.fn(); //.mockImplementation(console.log);
  const oldBlob = global.Blob;

  let destination: DestinationEtag.Destination;
  let config: DestinationEtag.Config;
  const url = 'localhost';

  beforeEach(() => {
    navigator.sendBeacon = mockBeacon;
    global.Blob = mockBlob;

    config = {
      custom: {
        url,
        measurementId: 'G-XXXXXXX',
      },
    };

    Walkerjs({ pageview: false, session: false, run: true });
    destination = jest.requireActual('.').default;
  });

  afterEach(() => {
    navigator.sendBeacon = oldBeacon;
    global.Blob = oldBlob;
  });

  test('init', () => {
    elb('walker destination', destination, {});
    elb('foo bar');
    expect(mockBeacon).toHaveBeenCalledTimes(0);
  });

  test('push', () => {
    elb('walker destination', destination, config);
    elb('foo bar');
    expect(mockBeacon).toHaveBeenCalledWith(url, expect.any(Blob));
    expect(mockBlob).toHaveBeenCalledWith(
      expect.arrayContaining([expect.any(String)]),
      expect.objectContaining({
        type: 'text/plain',
      }),
    );
  });

  test('custom params', () => {
    config.custom.params = { gcs: 'G222', tid: 'cust0m' };
    elb('walker destination', destination, config);
    elb('foo bar');

    expect(mockBlob).toHaveBeenCalledWith(
      expect.arrayContaining([expect.stringContaining('tid=cust0m')]),
      expect.any(Object),
    );
  });
});
