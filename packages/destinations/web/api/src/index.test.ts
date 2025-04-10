import type { WalkerOS } from '@elbwalker/types';
import type { Elb } from '@elbwalker/walker.js';
import type { DestinationWebAPI } from '.';
import { createSourceWalkerjs } from '@elbwalker/walker.js';
import { createEvent } from '@elbwalker/utils';
import { events, mapping } from './examples';

describe('Destination API', () => {
  let elb: Elb.Fn;
  const mockSendWeb = jest.fn(); //.mockImplementation(console.log);

  jest.mock('@elbwalker/utils/web', () => ({
    ...jest.requireActual('@elbwalker/utils/web'),
    sendWeb: mockSendWeb,
  }));

  let destination: DestinationWebAPI.Destination;
  let event: WalkerOS.Event;
  const url = 'https://api.example.com/';

  beforeEach(() => {
    jest.clearAllMocks();

    destination = jest.requireActual('.').default;
    event = createEvent();
    ({ elb } = createSourceWalkerjs({
      session: false,
      pageview: false,
      run: true,
    }));
  });

  test('init', async () => {
    destination.config = {};
    elb('walker destination', destination);

    await elb(event); // No url
    expect(mockSendWeb).not.toHaveBeenCalled();

    destination.config.custom = { url };
    await elb(event);
    expect(mockSendWeb).toHaveBeenCalledTimes(1);

    const [calledUrl, calledData, calledOptions] = mockSendWeb.mock.calls[0];
    expect(calledUrl).toBe(url);
    expect(JSON.parse(calledData)).toEqual(event);
    expect(calledOptions).toEqual(
      expect.objectContaining({
        transport: 'fetch',
      }),
    );
  });

  test('fn', () => {
    const fn = jest.fn();
    destination.push(event, { custom: { url }, fn });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('transform', async () => {
    elb('walker destination', destination, {
      custom: { url, transform: () => 'transformed' },
    });
    await elb(event);
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      'transformed',
      expect.objectContaining({}),
    );
  });

  test('headers', async () => {
    elb('walker destination', destination, {
      custom: { url, headers: { foo: 'bar' } },
    });
    await elb(event);
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        headers: { foo: 'bar' },
      }),
    );
  });

  test('method', async () => {
    elb('walker destination', destination, {
      custom: { url, method: 'POST' },
    });
    await elb(event);
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  test('event entity action', async () => {
    elb('walker destination', destination, {
      custom: { url },
      mapping: mapping.config,
    });
    await elb(event);

    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      events.entity_action(),
      expect.any(Object),
    );
  });
});
