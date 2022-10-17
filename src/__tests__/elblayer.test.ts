import Elbwalker from '../elbwalker';
import { IElbwalker, WebDestination } from '../types';

describe('ElbLayer', () => {
  const w = window;
  let elbwalker: IElbwalker.Function;

  function walker(...args: unknown[]) {
    (window.elbLayer = window.elbLayer || []).push(arguments);
  }

  const mockPush = jest.fn(); //.mockImplementation(console.log);
  const mockInit = jest.fn(); //.mockImplementation(console.log);
  const destination: WebDestination.Function = {
    init: mockInit,
    push: mockPush,
    config: { init: true },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    w.elbLayer = [];
    w.dataLayer = [];
    w.dataLayer.push = mockPush;
  });

  test('arguments and event pushes', () => {
    elbwalker = Elbwalker({ default: true });
    walker('ingest argument', { a: 1 }, 'a', []); // Push as arguments
    w.elbLayer.push('ingest event', { b: 2 }, 'e', []); // Push as event

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest argument',
        data: { a: 1 },
        trigger: 'a',
        nested: [],
      }),
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest event',
        data: { b: 2 },
        trigger: 'e',
        nested: [],
      }),
    );
  });

  test('predefined stack without run', () => {
    elbwalker = Elbwalker();
    walker('walker destination', destination);
    walker('entity action');

    expect(mockPush).not.toHaveBeenCalled();
  });

  test('walker push pre and post go', () => {
    walker('e 1');
    walker('walker destination', destination);

    elbwalker = Elbwalker();
    walker('e 2');
    walker('walker run');
    // auto call: walker('page view');
    walker('e 4');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 1',
        count: 1,
      }),
      undefined,
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 2',
        count: 2,
      }),
      undefined,
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'page view',
        count: 3,
      }),
      undefined,
    );

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e 4',
        count: 4,
      }),
      undefined,
    );
  });

  test('predefined stack with run', () => {
    elbwalker = Elbwalker();

    walker('walker destination', destination);
    walker('ingest argument', { a: 1 }, 'a', []); // Push as arguments
    w.elbLayer.push('ingest event', { b: 2 }, 'e', []); // Push as event
    walker('walker run');

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest argument',
      }),
      undefined,
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'ingest event',
      }),
      undefined,
    );
  });

  test('prioritize walker commands before run', () => {
    elbwalker = Elbwalker();

    walker();
    walker('event postponed');
    walker('walker destination', destination);
    walker('walker user', { id: 'userid' });
    walker('walker run');
    walker('event later');

    expect(mockPush).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'event postponed',
        user: { id: 'userid' },
      }),
      undefined,
    );
    expect(mockPush).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        event: 'page view',
        user: { id: 'userid' },
      }),
      undefined,
    );
    expect(mockPush).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({
        event: 'event later',
        user: { id: 'userid' },
      }),
      undefined,
    );
  });

  test('elbLayer initialization', () => {
    w.elbLayer = undefined as any;

    elbwalker = Elbwalker();

    expect(w.elbLayer).toBeDefined();
  });

  test('custom elbLayer', () => {
    w.elbLayer = undefined as any;
    w.dataLayer = [];
    const customLayer1 = [] as IElbwalker.ElbLayer;
    const customLayer2 = [] as IElbwalker.ElbLayer;
    const instance1 = Elbwalker({ elbLayer: customLayer1, default: true });
    const instance2 = Elbwalker({ elbLayer: customLayer2, default: true });

    const mockDest1 = jest.fn();
    const mockDest2 = jest.fn();
    customLayer1.push('walker destination', {
      push: mockDest1,
    });
    customLayer2.push('walker destination', {
      push: mockDest2,
    });

    customLayer1.push('e a');
    expect(mockDest1).toHaveBeenCalled();
    expect(mockDest2).not.toHaveBeenCalled();

    jest.clearAllMocks();
    customLayer2.push('e a');
    expect(mockDest1).not.toHaveBeenCalled();
    expect(mockDest2).toHaveBeenCalled();

    jest.clearAllMocks();
    instance1.push('foo bar');
    expect(mockDest1).toHaveBeenCalled();
    expect(mockDest2).not.toHaveBeenCalled();

    jest.clearAllMocks();
    instance2.push('bar foo');
    expect(mockDest1).not.toHaveBeenCalled();
    expect(mockDest2).toHaveBeenCalled();

    const length = w.dataLayer.length;
    expect(w.dataLayer[length - 1]).toEqual(
      expect.objectContaining({
        event: 'bar foo',
      }),
    );
    expect(w.dataLayer[length - 2]).toEqual(
      expect.objectContaining({
        event: 'foo bar',
      }),
    );

    jest.clearAllMocks();
    document.body.innerHTML = `<div data-elb="e" data-elbaction="load"></div>`;
    instance1.push('walker run');
    instance2.push('walker run');
    expect(mockDest1).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e load',
      }),
      undefined,
    );
    expect(mockDest2).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e load',
      }),
      undefined,
    );
  });
});
