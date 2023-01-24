import Elbwalker, { IElbwalker } from '@elbwalker/walker.js';
import { DestinationAPI } from '.';

describe('Destination API', () => {
  const w = window;
  let elbwalker: IElbwalker.Function,
    destination: DestinationAPI.Function,
    config: DestinationAPI.Config;

  const mockFn = jest.fn(); //.mockImplementation(console.log);
  const mockXHROpen = jest.fn();
  const mockXHRSend = jest.fn();
  const mockXHRHeader = jest.fn();
  const mockXHR = {
    open: mockXHROpen,
    send: mockXHRSend,
    setRequestHeader: mockXHRHeader,
    readyState: 4,
    responseText: JSON.stringify('demo'),
  };
  const oldXMLHttpRequest = w.XMLHttpRequest;

  const event = 'entity action';

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    destination = require('.').default;

    w.elbLayer = [];

    elbwalker = Elbwalker();
    elbwalker.push('walker run');

    Object.defineProperty(window, 'XMLHttpRequest', {
      value: jest.fn(() => mockXHR),
      writable: true,
    });
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
    window.XMLHttpRequest = oldXMLHttpRequest;
  });

  test('init', () => {
    destination.config = {
      custom: {},
    };
    elbwalker.push('walker destination', destination);

    expect(true).toBeTruthy();
  });

  test('push', () => {
    destination.config = {
      custom: { url: 'https://api.elbwalker.com/' },
    };
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    expect(mockXHROpen).toHaveBeenCalledWith('POST', expect.any(String), true);
    expect(mockXHRHeader).toHaveBeenCalledWith(
      'Content-type',
      'text/plain; charset=utf-8',
    );

    const sentPayload = JSON.parse(mockXHRSend.mock.calls[0][0]);
    expect(sentPayload).toEqual(expect.objectContaining({ event }));
  });
});
