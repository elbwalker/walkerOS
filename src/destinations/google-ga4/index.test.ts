import { Elbwalker } from '@elbwalker/types';
import { DestinationGA4 } from '.';

const w = window;
let elbwalker: Elbwalker.Function;
let destination: DestinationGA4;
const mockFn = jest.fn();

const event = 'entity action';
const data = { foo: 'bar' };
const trigger = 'manual';
const measurementId = 'G-XXXXXX-1';
const transport_url = 'https://collect.example.com';

describe('Destination Google GA4', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    elbwalker = require('../../elbwalker').default;
    destination = require('./index').destination;

    elbwalker.go('elb', { custom: true });
    elbwalker.push('walker run');
    w.gtag = mockFn;
  });

  test('Init', () => {
    (w.dataLayer as any) = undefined;
    (w.gtag as any) = undefined;

    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    destination.config.measurementId = measurementId;
    elbwalker.push('walker destination', destination);
    expect(w.dataLayer).not.toBeDefined();
    expect(w.gtag).not.toBeDefined();

    elbwalker.push(event);
    expect(w.dataLayer).toBeDefined();
    expect(w.gtag).toBeDefined();

    expect(w.dataLayer?.length).toBe(3);
  });

  test('Init calls', () => {
    destination.config.measurementId = measurementId;
    elbwalker.push('walker destination', destination);

    elbwalker.push(event);

    expect(mockFn).toHaveBeenNthCalledWith(1, 'config', measurementId, {});
  });

  test('Push', () => {
    destination.config.measurementId = measurementId;
    elbwalker.push('walker destination', destination);
    elbwalker.push(event, data, trigger);

    Object.assign(data, { send_to: measurementId });
    expect(mockFn).toHaveBeenCalledWith('event', event, data);
  });

  test('Settings', () => {
    destination.config.measurementId = measurementId;
    destination.config.transport_url = transport_url;
    elbwalker.push('walker destination', destination);
    elbwalker.push(event, data, trigger);

    Object.assign(data, { send_to: measurementId });
    expect(mockFn).toHaveBeenCalledWith('event', event, data);

    expect(mockFn).toHaveBeenCalledWith('config', measurementId, {
      transport_url,
    });
  });
});
