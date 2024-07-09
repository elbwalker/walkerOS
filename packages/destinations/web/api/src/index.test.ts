import type { WalkerOS } from '@elbwalker/types';
import type { DestinationWebAPI } from '.';

describe('Destination API', () => {
  const mockSendWeb = jest.fn();
  jest.mock('@elbwalker/utils', () => ({
    sendWeb: mockSendWeb,
  }));

  let destination: DestinationWebAPI.Destination;
  const event = { event: 'entity action' } as WalkerOS.Event;
  const data = JSON.stringify(event);
  const url = 'https://api.example.com/';

  function push(
    event: WalkerOS.Event,
    custom: DestinationWebAPI.CustomConfig = { url },
  ) {
    destination.push(event, { custom });
  }

  beforeEach(async () => {
    destination = jest.requireActual('.').default;
  });

  test('init', () => {
    push(event, { url: '' }); // No url
    expect(mockSendWeb).not.toHaveBeenCalled();

    push(event);

    expect(mockSendWeb).toHaveBeenCalledTimes(1);
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      data,
      expect.objectContaining({
        transport: 'fetch',
      }),
    );
  });

  test('transform', () => {
    push(event, { url, transform: () => 'transformed' });
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      'transformed',
      expect.objectContaining({}),
    );
  });

  test('headers', () => {
    push(event, { url, headers: { foo: 'bar' } });
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      data,
      expect.objectContaining({
        headers: { foo: 'bar' },
      }),
    );
  });

  test('method', () => {
    push(event, { url, method: 'POST' });
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      data,
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
