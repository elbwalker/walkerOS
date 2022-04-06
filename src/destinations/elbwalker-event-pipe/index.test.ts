import { Elbwalker } from '@elbwalker/types';
import { DestinationElbwalkerEventPipe } from './index';

const w = window;
let elbwalker: Elbwalker.Function;
let destination: DestinationElbwalkerEventPipe;
const mockFn = jest.fn();
const mockXHR = {
  open: mockFn,
  send: mockFn,
  setRequestHeader: mockFn,
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

describe('Destination Elbwalker EventPipe', () => {
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

    elbwalker = require('../../elbwalker').default;
    destination = require('./index').destination;

    elbwalker.go({ custom: true });
    elbwalker.push('walker run');
    w.gtag = mockFn;
  });

  afterEach(() => {
    window.location = oldLocation;
    window.XMLHttpRequest = oldXMLHttpRequest;
  });

  test('Init', () => {
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    expect(destination.config.init).toBeFalsy();

    destination.config.projectId = projectId;
    elbwalker.push(event);

    expect(destination.config.init).toBeTruthy();
  });

  test('Push', () => {
    destination.config.projectId = projectId;
    elbwalker.push('walker destination', destination);
    elbwalker.push(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'POST', expect.any(String), true);
    expect(mockFn).toHaveBeenNthCalledWith(
      2,
      'Content-type',
      'text/plain; charset=utf-8',
    );

    let sentPayload = JSON.parse(mockFn.mock.calls[2][0]);
    expect(sentPayload).toEqual(
      expect.objectContaining({
        projectId,
        timestamp: expect.any(Number),
        source: { type: 'web', id: url, referrer: '', version },
      }),
    );
  });
});
