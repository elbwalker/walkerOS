import { Destination } from '../types/destination';
import { Elbwalker } from '../types/elbwalker';

let elbwalker: Elbwalker.Function;

const mockPush = jest.fn(); //.mockImplementation(console.log);
const mockInit = jest.fn(); //.mockImplementation(console.log);

const destination: Destination.Function = {
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
      event: 'entity action',
      id: expect.any(String),
      count: 1,
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      entity: 'entity',
      action: 'action',
      data: {},
      globals: {},
      trigger: '',
      nested: [],
      group: expect.any(String),
    });
  });

  test('group ids', () => {
    elbwalker.destination(destination, {});
    elbwalker.push('entity action');
    elbwalker.push('entity action');
    const groupId = mockPush.mock.calls[0][0].group;
    expect(mockPush.mock.calls[1][0].group).toEqual(groupId);

    // Start a new initialization with a new group ip
    elbwalker.run();
    elbwalker.push('entity action');
    expect(mockPush.mock.calls[2][0].group).not.toEqual(groupId);
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
      event: 'entity action',
      id: expect.any(String),
      count: 1,
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      entity: 'entity',
      action: 'action',
      data: {},
      globals: {},
      trigger: '',
      nested: [],
      group: expect.any(String),
    });
  });

  test('preventing data manipulation', () => {
    const data = { a: 1 };
    const mockPushUpdate = jest.fn().mockImplementation((event) => {
      event.data.foo = 'bar';
    });

    const destinationUpdate: Destination.Function = {
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
      event: 'entity action',
      data,
      globals: {},
      nested: [],
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 1,
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
      event: 'entity action',
      data: {},
      globals: {},
      nested: [],
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 1,
    });
    expect(mockPushB).toHaveBeenCalledWith({
      event: 'entity action',
      data: {},
      globals: {},
      nested: [],
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 1,
    });

    jest.clearAllMocks();
    elbwalker.push('foo bar');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
    expect(mockPushA).toHaveBeenCalledWith({
      event: 'foo bar',
      data: {},
      globals: {},
      nested: [],
      id: expect.any(String),
      trigger: '',
      entity: 'foo',
      action: 'bar',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 2,
    });

    jest.clearAllMocks();
    elbwalker.push('food like');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledWith({
      event: 'food like',
      data: {},
      globals: {},
      nested: [],
      id: expect.any(String),
      trigger: '',
      entity: 'food',
      action: 'like',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 3,
    });
  });
});
