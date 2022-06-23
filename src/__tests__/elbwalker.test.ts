require('intersection-observer');
import { Elbwalker } from '@elbwalker/types';
import fs from 'fs';
import _ from 'lodash';

const w = window;
const version = { config: 0, walker: 1.4 };
let elbwalker: Elbwalker.Function;

const mockFn = jest.fn(); //.mockImplementation(console.log);

beforeEach(() => {
  // reset DOM with event listeners etc.
  document.body = document.body.cloneNode() as HTMLElement;
  jest.clearAllMocks();
  jest.resetModules();
  w.dataLayer = [];
  w.dataLayer!.push = mockFn;
  w.elbLayer = undefined as unknown as Elbwalker.ElbLayer;
  elbwalker = require('../elbwalker').default;
  elbwalker.go();
});

describe('elbwalker', () => {
  test('go', () => {
    w.elbLayer = undefined as unknown as Elbwalker.ElbLayer;
    expect(window.elbLayer).toBeUndefined();
    elbwalker.go();
    expect(window.elbLayer).toBeDefined();
  });

  test('empty push', () => {
    (elbwalker as any).push();
    elbwalker.push('');
    elbwalker.push('entity');
    expect(mockFn).toHaveBeenCalledTimes(1); // only page view
  });

  test('regular push', () => {
    elbwalker.push('walker run');
    jest.clearAllMocks(); // skip auto page view event

    elbwalker.push('entity action');
    elbwalker.push('entity action', { foo: 'bar' });

    expect(mockFn).toHaveBeenNthCalledWith(1, {
      event: 'entity action',
      data: expect.any(Object),
      globals: {},
      user: {},
      nested: [],
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 2,
      version,
      walker: true,
    });

    expect(mockFn).toHaveBeenNthCalledWith(2, {
      event: 'entity action',
      data: { foo: 'bar' },
      globals: {},
      user: {},
      nested: [],
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 3,
      version,
      walker: true,
    });
  });

  test('Global properties', () => {
    const html: string = fs
      .readFileSync(__dirname + '/html/globals.html')
      .toString();
    document.body.innerHTML = html;

    jest.clearAllMocks(); // skip auto page view event
    elbwalker.push('walker run');

    expect(mockFn).toHaveBeenNthCalledWith(1, {
      event: 'page view',
      data: expect.any(Object),
      globals: { outof: 'scope' },
      user: {},
      nested: [],
      id: expect.any(String),
      trigger: 'load',
      entity: 'page',
      action: 'view',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 1,
      version,
      walker: true,
    });

    expect(mockFn).toHaveBeenNthCalledWith(2, {
      event: 'entity action',
      data: { foo: 'bar' },
      globals: { outof: 'scope' },
      user: {},
      nested: [],
      id: expect.any(String),
      trigger: 'load',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 2,
      version,
      walker: true,
    });
  });

  test('group ids', () => {
    elbwalker.push('entity action');
    elbwalker.push('entity action');
    const groupId = mockFn.mock.calls[0][0].group;
    expect(mockFn.mock.calls[1][0].group).toEqual(groupId);

    // Start a new initialization with a new group ip
    elbwalker.push('walker run');
    expect(mockFn.mock.calls[3][0].group).not.toEqual(groupId); // page view
  });

  test('walker commands', () => {
    mockFn.mockClear();
    elbwalker.push('walker action');

    // don't push walker commands to destinations
    expect(mockFn).not.toHaveBeenCalled();
  });

  test('walker user', () => {
    elbwalker.push('walker run');

    elbwalker.push('walker user');
    elbwalker.push('entity action');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: {},
      }),
    );

    elbwalker.push('walker user', { id: 'userid' });
    elbwalker.push('entity action');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userid' },
      }),
    );

    elbwalker.push('walker user', { device: 'userid' });
    elbwalker.push('entity action');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userid', device: 'userid' },
      }),
    );

    elbwalker.push('walker user', { hash: 'hashid' });
    elbwalker.push('entity action');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userid', device: 'userid', hash: 'hashid' },
      }),
    );
  });
});
