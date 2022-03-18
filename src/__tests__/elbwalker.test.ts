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
      entity: 'entity',
      action: 'action',
      data: {},
      globals: {},
      trigger: '',
      nested: [],
      group: expect.any(String),
      elbwalker: true,
    });
    expect(mockFn).toHaveBeenNthCalledWith(2, {
      event: 'entity action',
      entity: 'entity',
      action: 'action',
      data: { foo: 'bar' },
      globals: {},
      trigger: '',
      nested: [],
      group: expect.any(String),
      elbwalker: true,
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
      entity: 'page',
      action: 'view',
      data: expect.any(Object),
      globals: { outof: 'scope' },
      trigger: 'load',
      nested: [],
      group: expect.any(String),
      elbwalker: true,
    });

    expect(mockFn).toHaveBeenNthCalledWith(2, {
      event: 'entity action',
      entity: 'entity',
      action: 'action',
      data: { foo: 'bar' },
      globals: { outof: 'scope' },
      trigger: 'load',
      nested: [],
      group: expect.any(String),
      elbwalker: true,
    });
  });
});
