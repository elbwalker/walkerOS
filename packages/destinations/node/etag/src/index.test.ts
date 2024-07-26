import type { WalkerOS } from '@elbwalker/types';
import type { NodeClient } from '@elbwalker/client-node';
import type { DestinationNodeEtag } from '.';

describe('Destination node etag', () => {
  jest.useFakeTimers();
  const mockSend = jest.fn();
  jest.mock('@elbwalker/utils', () => ({
    ...jest.requireActual('@elbwalker/utils'),
    getId: () => 1337,
    sendNode: mockSend,
  }));

  let destination: DestinationNodeEtag.Destination;
  const url = 'https://localhost?';
  const measurementId = 'G-XXXXXXX';
  const event = { event: 'entity action', timing: 42 } as WalkerOS.Event;

  async function push(
    event: unknown,
    custom?: DestinationNodeEtag.CustomConfig,
    instance?: unknown,
  ) {
    return destination.push(
      [{ event: event as WalkerOS.Event }],
      custom ? { custom } : destination.config,
      undefined,
      instance as NodeClient.Instance,
    );
  }

  beforeEach(() => {
    destination = jest.requireActual('.').default;
    destination.config = { custom: { measurementId, url } };
  });

  test('push', async () => {
    await push(event);
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(expect.any(String), undefined, {
      headers: {},
      method: 'POST',
    });
    expect(requestedUrl(mockSend)).toContain(url);
    expect(requestedUrl(mockSend)).toContain('en=entity%20action');
    expect(requestedUrl(mockSend)).toContain('&_s=2');
  });

  test('session start', async () => {
    await push({ event: 'session start' });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(expect.any(String), undefined, {
      headers: {},
      method: 'POST',
    });
    expect(requestedUrl(mockSend)).toContain('en=session%20start');
    expect(requestedUrl(mockSend)).toContain('&_s=1');
  });

  test('page view', async () => {
    await push({ event: 'page view' });
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect(requestedUrl(mockSend)).toContain('en=page_view');
    expect(requestedUrl(mockSend, 1)).toContain('en=page%20view');
  });

  function requestedUrl(mockSend: jest.Mock, i = 0) {
    return mockSend.mock.calls[i][0];
  }
});
