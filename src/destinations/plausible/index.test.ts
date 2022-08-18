import { Elbwalker } from '@elbwalker/types';
import { DestinationPlausible } from '.';

const w = window;

let elbwalker: Elbwalker.Function;
let destination: DestinationPlausible;
const mockFn = jest.fn(); //.mockImplementation(console.log);

const event = 'entity action';

describe('destination plausible', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    elbwalker = require('../../elbwalker').default;
    destination = require('./index').destination;

    w.elbLayer = [];
    w.plausible = mockFn;

    elbwalker.go({ custom: true });
    elbwalker.push('walker run');
    elbwalker.push('walker destination', destination);
  });

  test('init', () => {
    w.plausible = undefined;
    expect(w.plausible).toBeUndefined();

    elbwalker.push(event);
    expect(w.plausible).toBeDefined();
  });

  test('push', () => {
    elbwalker.push(event, { a: 1 }, 'manual');
    expect(w.plausible).toBeDefined();
    expect(mockFn).toHaveBeenNthCalledWith(1, event);
  });
});
