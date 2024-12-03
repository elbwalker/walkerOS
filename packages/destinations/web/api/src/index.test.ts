import type { WalkerOS } from '@elbwalker/types';
import type { DestinationWebAPI } from '.';

describe('Destination API', () => {
  const mockSendWeb = jest.fn();
  jest.mock('@elbwalker/utils', () => ({
    ...jest.requireActual('@elbwalker/utils'),
    sendWeb: mockSendWeb,
  }));

  let destination: DestinationWebAPI.Destination;
  const event = { event: 'entity action' } as WalkerOS.Event;
  const data = JSON.stringify(event);
  const url = 'https://api.example.com/';

  function push(
    event: WalkerOS.Event,
    custom: DestinationWebAPI.Custom = { url },
    mapping = {},
    options = {},
  ) {
    destination.push(event, { custom }, mapping, options);
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

  test('mapping data', () => {
    push(event, { url, method: 'POST' }, {}, { data: { foo: 'bar' } });
    expect(mockSendWeb).toHaveBeenCalledWith(
      url,
      JSON.stringify({ foo: 'bar' }),
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
