require('intersection-observer');
import { Elbwalker } from '@elbwalker/types';
import fs from 'fs';
import _ from 'lodash';

const mockFn = jest.fn(); //.mockImplementation(console.log);
const w = window;
let elbwalker: Elbwalker.Function;
w.dataLayer = [];

beforeEach(() => {
  elbwalker = require('../elbwalker').default;
  jest.clearAllMocks();
  jest.resetModules();

  // reset DOM with event listeners etc.
  document.body = document.body.cloneNode() as HTMLElement;
  w.elbLayer = undefined as unknown as Elbwalker.ElbLayer;
  w.dataLayer!.push = mockFn;
});

describe('elbwalker', () => {
  test('go', () => {
    expect(window.elbLayer).toBeUndefined();
    elbwalker.go();
    expect(window.elbLayer).toBeDefined();
  });

  test('empty push', () => {
    elbwalker.go();
    (elbwalker as any).push();
    elbwalker.push('');
    elbwalker.push('entity');
  });

  test('regular push', () => {
    elbwalker.go();
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
      walker: true,
    });
  });

  test('Global properties', () => {
    const html: string = fs
      .readFileSync(__dirname + '/html/globals.html')
      .toString();
    document.body.innerHTML = html;
    w.elbwalker.go();

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
      walker: true,
    });
  });

  test('group ids', () => {
    elbwalker.go();
    elbwalker.push('entity action');
    elbwalker.push('entity action');
    const groupId = mockFn.mock.calls[1][0].group;
    expect(mockFn.mock.calls[2][0].group).toEqual(groupId);

    // Start a new initialization with a new group ip
    elbwalker.run();
    elbwalker.push('entity action');
    expect(mockFn.mock.calls[4][0].group).not.toEqual(groupId);
  });

  test('walker commands', () => {
    elbwalker.go();
    mockFn.mockClear();
    elbwalker.push('walker action');

    // don't push walker commands to destinations
    expect(mockFn).not.toHaveBeenCalled();
  });

  test('walker user', () => {
    elbwalker.go();

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
