require('intersection-observer');
import fs from 'fs';
import _ from 'lodash';

import elbwalkerOrg from '../elbwalker';
import { Elbwalker } from '../types/elbwalker';

const mockFn = jest.fn(); //.mockImplementation(console.log);
const w = window;
let elbwalker: Elbwalker.Function;
w.dataLayer = [];

beforeEach(() => {
  mockFn.mockClear();
  // reset DOM with event listeners etc.
  document.body = document.body.cloneNode() as HTMLElement;
  w.elbLayer = undefined as unknown as Elbwalker.ElbLayer;
  w.dataLayer!.push = mockFn;

  elbwalker = _.cloneDeepWith(elbwalkerOrg, (value: unknown) => {
    if (_.isArray(value)) {
      value = [];
      return value;
    }
  });
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
    elbwalker.push('entity action');
    elbwalker.push('entity action', { foo: 'bar' });

    expect(mockFn).toHaveBeenNthCalledWith(1, {
      event: 'entity action',
      data: expect.any(Object),
      globals: {},
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
    expect(mockFn.mock.calls[3][0].group).not.toEqual(groupId);
  });
});
