import Elbwalker from '../elbwalker';
import { IElbwalker, WebDestination } from '../types';

describe('Destination', () => {
  const w = window;
  let elbwalker: IElbwalker.Function;

  const mockPush = jest.fn(); //.mockImplementation(console.log);
  const mockInit = jest.fn().mockImplementation(() => {
    return true;
  });

  const mockError = jest.fn();
  console.error = mockError;

  let destination: WebDestination.Function;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();

    elbwalker = Elbwalker();

    destination = {
      init: mockInit,
      push: mockPush,
      config: { init: false },
    };
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

    const configA = { init: false };
    const configB = { init: false };

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

  test('mapping', () => {
    jest.clearAllMocks();
    elbwalker = Elbwalker({ elbLayer: [], custom: true, pageview: false });
    elbwalker.push('walker run');

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    const destinationA: WebDestination.Function = {
      push: mockPushA,
      config: {
        mapping: {
          entity: { action: {} },
          foo: { bar: { custom: { strict: true } } },
        },
      },
    };

    const destinationB: WebDestination.Function = {
      push: mockPushB,
      config: {
        mapping: { '*': { action: {} } },
      },
    };

    const destinationC: WebDestination.Function = {
      push: mockPushC,
      config: { mapping: { entity: { '*': {} } } },
    };

    elbwalker.push('walker destination', destinationA);
    elbwalker.push('walker destination', destinationB);
    elbwalker.push('walker destination', destinationC);

    elbwalker.push('entity action');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);
    expect(mockPushA).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
      }),
    );
    expect(mockPushB).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
      }),
    );
    expect(mockPushC).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
      }),
    );

    jest.clearAllMocks();
    elbwalker.push('foo bar');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);
    expect(mockPushA).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'foo bar',
      }),
    );

    jest.clearAllMocks();
    elbwalker.push('random action');
    expect(mockPushA).toHaveBeenCalledTimes(0);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(0);
    expect(mockPushB).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'random action',
      }),
    );

    jest.clearAllMocks();
    elbwalker.push('entity random');
    expect(mockPushA).toHaveBeenCalledTimes(0);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity random',
      }),
    );

    jest.clearAllMocks();
    elbwalker.push('absolutely unacceptable');
    expect(mockPushA).toHaveBeenCalledTimes(0);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);
  });

  test.only('consent', () => {
    jest.clearAllMocks();
    elbwalker = Elbwalker({
      consent: { functional: true, marketing: false },
      custom: true,
      pageview: false,
    });
    elbwalker.push('walker run');

    const mockPushA = jest.fn();
    const mockPushB = jest.fn();
    const mockPushC = jest.fn();

    const destinationA: WebDestination.Function = {
      push: mockPushA,
      config: {}, // No consent settings
    };

    const destinationB: WebDestination.Function = {
      push: mockPushB,
      config: { consent: { functional: true } },
    };

    const destinationC: WebDestination.Function = {
      push: mockPushC,
      config: { consent: { marketing: true } },
    };

    elbwalker.push('walker destination', destinationA);
    elbwalker.push('walker destination', destinationB);
    elbwalker.push('walker destination', destinationC);

    // Init consent state
    jest.clearAllMocks();
    elbwalker.push('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(0);

    // Accepted consent
    jest.clearAllMocks();
    elbwalker.push('walker consent', { marketing: true });
    elbwalker.push('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(1);
    expect(mockPushC).toHaveBeenCalledTimes(1);

    // Revoked consent
    jest.clearAllMocks();
    elbwalker.push('walker consent', { functional: false, marketing: false });
    elbwalker.push('e a');
    expect(mockPushA).toHaveBeenCalledTimes(1);
    expect(mockPushB).toHaveBeenCalledTimes(0);
    expect(mockPushC).toHaveBeenCalledTimes(0);
  });
});
