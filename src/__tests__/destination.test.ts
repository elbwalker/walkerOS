import { AnyObject, Elbwalker, WebDestination } from '@elbwalker/types';

let elbwalker: Elbwalker.Function;

const mockPush = jest.fn(); //.mockImplementation(console.log);
const mockInit = jest.fn(); //.mockImplementation(console.log);

const mockError = jest.fn();
console.error = mockError;

let destination: AnyObject;

describe('destination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    elbwalker = require('../elbwalker').default;
    elbwalker.go();

    destination = {
      init: mockInit,
      push: mockPush,
      config: { init: false },
      // Typecast it once to it's original just to be (kind of) sure
    } as WebDestination.Function as unknown as AnyObject;
  });

  test('basic usage', () => {
    elbwalker.push('walker run');

    expect(mockInit).toHaveBeenCalledTimes(0);
    expect(mockPush).toHaveBeenCalledTimes(0);
    elbwalker.push('walker destination', destination);
    elbwalker.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
      }),
    );
  });

  test('init call', () => {
    elbwalker.push('walker run');

    // No init function
    elbwalker.push('walker destination', {
      push: mockPush,
    });
    elbwalker.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(0);
    expect(mockPush).toHaveBeenCalledTimes(1);

    // Init set to true and should not be called
    elbwalker.push('walker destination', {
      init: mockInit,
      push: mockPush,
      config: { init: true },
    });
    elbwalker.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(0);

    // Always trigger init since it returns false
    const mockInitFalse = jest.fn().mockImplementation(() => {
      return false;
    });
    elbwalker.push('walker destination', {
      init: mockInitFalse,
      push: mockPush,
    });
    elbwalker.push('entity action');
    expect(mockInitFalse).toHaveBeenCalledTimes(1);
    elbwalker.push('entity action');
    expect(mockInitFalse).toHaveBeenCalledTimes(2);
  });

  test('multiple destinations', () => {
    elbwalker.push('walker run');

    const configA = { a: 1 };
    const configB = { b: 2 };

    destination.config = configA;
    elbwalker.push('walker destination', destination);
    destination.config = configB;
    elbwalker.push('walker destination', destination);

    elbwalker.push('entity action');
    expect(mockInit).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledTimes(2);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
      }),
    );
  });

  test('preventing data manipulation', () => {
    const data = { a: 1 };
    const mockPushUpdate = jest.fn().mockImplementation((event) => {
      event.data.foo = 'bar';
    });

    const destinationUpdate = {
      init: mockInit,
      push: mockPushUpdate,
      config: {},
    };

    elbwalker.push('walker run');
    elbwalker.push('walker destination', destinationUpdate);
    elbwalker.push('walker destination', destination);
    elbwalker.push('entity action', data);
    expect(mockPushUpdate).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        data,
      }),
    );
  });

  test('broken destination', () => {
    elbwalker.push('walker run');

    // create invalid breaking destinations
    elbwalker.push('walker destination');
    elbwalker.push('walker destination', {
      init: () => {
        throw new Error();
      },
      push: mockPush,
    });
    elbwalker.push('walker destination', destination);
    elbwalker.push('entity action');

    expect(mockError).toHaveBeenCalled(); // error catcher
    expect(mockInit).toHaveBeenCalled(); // 2nd destination
  });

  // @TODO Mapping not active yet
  test.skip('mapping', () => {
    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    elbwalker.push('walker destination', {
      init: mockInit,
      push: mockPushA,
    });
    elbwalker.push('walker destination', {
      init: mockInit,
      push: mockPushB,
      config: { mapping: { entity: { action: true } } },
    });
    elbwalker.push('walker destination', {
      init: mockInit,
      push: mockPushC,
      config: { mapping: { food: { like: true } } },
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
      user: {},
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
      user: {},
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
      user: {},
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
      user: {},
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
