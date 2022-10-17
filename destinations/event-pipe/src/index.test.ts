import Elbwalker, { IElbwalker } from '@elbwalker/walker.js';
import { DestinationEventPipe } from '.';

describe('Destination Elbwalker EventPipe', () => {
  const w = window;
  let elbwalker: IElbwalker.Function,
    destination: DestinationEventPipe.Function,
    config: DestinationEventPipe.Config;

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
  const oldLocation = w.location;

  const projectId = 'W3BP4G3';
  const version = '3';
  const url = 'https://www.elbwalker.com/path?q=Analytics#hash';
  const referrer = 'https://www.previous.com/a?b=2&c=3#d';
  const event = 'entity action';
  const data = { foo: 'bar' };
  const api = '//moin.p.elbwalkerapis.com/lama';
  const referrerExcluded = 'https://www.previous.com/a?b=xxx&c=3#d';
  const urlExcluded = 'https://www.elbwalker.com/path?q=xxx#hash';
  const dataExcluded = { id: 'path', search: '?q=xxx' };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    Object.defineProperty(window, 'location', {
      value: new URL(url),
      writable: true,
    });

    Object.defineProperty(window, 'XMLHttpRequest', {
      value: jest.fn(() => mockXHR),
      writable: true,
    });

    config = {
      custom: { projectId },
    };

    destination = require('.').default;
    destination.config = config;

    elbwalker = Elbwalker();
    elbwalker.push('walker run');
  });

  afterEach(() => {
    window.location = oldLocation;
    window.XMLHttpRequest = oldXMLHttpRequest;
  });

  test('Init', () => {
    destination.config.custom.projectId = undefined;
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    expect(destination.config.init).toBeFalsy();

    destination.config.custom.projectId = projectId;
    elbwalker.push(event);

    expect(destination.config.init).toBeTruthy();
  });

  test('Push', () => {
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    expect(mockXHROpen).toHaveBeenCalledWith('POST', expect.any(String), true);
    expect(mockXHRHeader).toHaveBeenCalledWith(
      'Content-type',
      'text/plain; charset=utf-8',
    );

    const sentPayload = JSON.parse(mockXHRSend.mock.calls[0][0]);
    expect(sentPayload).toEqual(
      expect.objectContaining({
        projectId,
        timestamp: expect.any(Number),
        source: { type: 'web', id: url, referrer: '', version },
      }),
    );
  });

  test('Exclusion parameter referrer', () => {
    Object.defineProperty(document, 'referrer', {
      value: referrer,
      writable: true,
    });

    destination.config.custom.exclusionParameters = ['b'];
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    const sentPayload = JSON.parse(mockXHRSend.mock.calls[0][0]);
    expect(sentPayload).toEqual(
      expect.objectContaining({
        source: { type: 'web', id: url, referrer: referrerExcluded, version },
      }),
    );
  });

  test('Exclusion parameter Location', () => {
    destination.config.custom.exclusionParameters = ['q'];
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    const sentPayload = JSON.parse(mockXHRSend.mock.calls[0][0]);
    expect(sentPayload).toEqual(
      expect.objectContaining({
        source: { type: 'web', id: urlExcluded, referrer, version },
      }),
    );
  });

  test('Multiple exclusion parameters', () => {
    destination.config.custom.exclusionParameters = ['b', 'q'];
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    const sentPayload = JSON.parse(mockXHRSend.mock.calls[0][0]);
    expect(sentPayload).toEqual(
      expect.objectContaining({
        source: {
          type: 'web',
          id: urlExcluded,
          referrer: referrerExcluded,
          version,
        },
      }),
    );
  });
});
