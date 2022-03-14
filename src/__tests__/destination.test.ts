import { Destination, Elbwalker } from '../types/elbwalker';

let elbwalker: Elbwalker;

const mockPush = jest.fn(); //.mockImplementation(console.log);
const mockInit = jest.fn(); //.mockImplementation(console.log);

const destination: Destination = {
  init: mockInit,
  push: mockPush,
  mapping: false,
};

describe('destination', () => {
  beforeEach(() => {
    elbwalker = require('../elbwalker').default;
    jest.clearAllMocks();
    jest.resetModules();
  });

  test('basic usage', () => {
    expect(mockInit).toHaveBeenCalledTimes(0);
    expect(mockPush).toHaveBeenCalledTimes(0);
    elbwalker.destination(destination, {});
    elbwalker.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      entity: 'entity',
      action: 'action',
      data: {},
      trigger: undefined,
      nested: [],
    });
  });

  test('multiple destinations', () => {
    const configA = { a: 1 };
    const configB = { b: 2 };
    elbwalker.destination(destination, configA);
    elbwalker.destination(destination, configB);
    elbwalker.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(2);
    expect(mockInit).toHaveBeenNthCalledWith(1, configA);
    expect(mockInit).toHaveBeenNthCalledWith(2, configB);
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith({
      entity: 'entity',
      action: 'action',
      data: {},
      trigger: undefined,
      nested: [],
    });
  });

  test('preventing data manipulation', () => {
    const data = { a: 1 };
    const mockPushUpdate = jest.fn().mockImplementation((event) => {
      event.data.foo = 'bar';
    });

    const destinationUpdate: Destination = {
      init: mockInit,
      push: mockPushUpdate,
      mapping: false,
    };

    elbwalker.destination(destinationUpdate);
    elbwalker.destination(destination);
    elbwalker.push('entity action', data);
    expect(mockPushUpdate).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith({
      entity: 'entity',
      action: 'action',
      data,
      trigger: undefined,
      nested: [],
    });
  });

  test('mapping', () => {
    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();
    const destA = Object.assign({}, destination, { push: mockPushA });
    const destB = Object.assign({}, destination, { push: mockPushB });
    const destC = Object.assign({}, destination, { push: mockPushC });

    // Note: mapping is disabled right now. All events gets pushed
    elbwalker.destination(destA);
    elbwalker.destination(destB, {
      mapping: { entity: { action: true } },
    });
    elbwalker.destination(destC, {
      mapping: { food: { like: true } },
    });

    elbwalker.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(3);
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
    expect(mockPushA).toHaveBeenCalledWith({
      entity: 'entity',
      action: 'action',
      data: {},
      trigger: undefined,
      nested: [],
    });
    expect(mockPushB).toHaveBeenCalledWith({
      entity: 'entity',
      action: 'action',
      data: {},
      nested: [],
    });

    jest.clearAllMocks();
    elbwalker.push('foo bar');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
    expect(mockPushA).toHaveBeenCalledWith({
      entity: 'foo',
      action: 'bar',
      data: {},
      trigger: undefined,
      nested: [],
    });

    jest.clearAllMocks();
    elbwalker.push('food like');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledWith({
      entity: 'food',
      action: 'like',
      data: {},
      trigger: undefined,
      nested: [],
    });
  });
});
