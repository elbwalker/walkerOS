require('intersection-observer');
import _ from 'lodash';

import elbwalkerOrg from '../elbwalker';
import { ElbLayer, Elbwalker } from '../types/elbwalker';

const mockFn = jest.fn(); //.mockImplementation(console.log);
const w = window;
let elbwalker: Elbwalker;
w.dataLayer = [];

beforeEach(() => {
  mockFn.mockClear();
  // reset DOM with event listeners etc.
  document.body = document.body.cloneNode() as HTMLElement;
  w.elbLayer = undefined as unknown as ElbLayer;
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
      nested: [],
      elbwalker: true,
    });
    expect(mockFn).toHaveBeenNthCalledWith(2, {
      event: 'entity action',
      entity: 'entity',
      action: 'action',
      data: { foo: 'bar' },
      nested: [],
      elbwalker: true,
    });
  });
});
