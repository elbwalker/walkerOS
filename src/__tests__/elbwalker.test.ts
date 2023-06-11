import Elbwalker from '../elbwalker';
import { IElbwalker } from '../';
import fs from 'fs';

describe('Elbwalker', () => {
  const w = window;
  const mockFn = jest.fn(); //.mockImplementation(console.log);
  const version = { config: 0, walker: 1.6 };

  let elbwalker: IElbwalker.Function;

  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;
    jest.clearAllMocks();
    jest.resetModules();
    w.dataLayer = [];
    w.dataLayer!.push = mockFn;
    w.elbLayer = undefined as unknown as IElbwalker.ElbLayer;

    elbwalker = Elbwalker({
      default: true,
      consent: { test: true },
      pageview: false,
    });
  });

  test('go', () => {
    w.elbLayer = undefined as unknown as IElbwalker.ElbLayer;
    expect(window.elbLayer).toBeUndefined();
    const instance = Elbwalker();
    expect(instance.config.elbLayer).toBeDefined();
  });

  test('empty push', () => {
    (elbwalker as any).push();
    elbwalker.push('');
    elbwalker.push('entity');
    expect(mockFn).toHaveBeenCalledTimes(0);
  });

  test('regular push', () => {
    elbwalker.push('walker run');

    elbwalker.push('entity action');
    elbwalker.push('entity action', { foo: 'bar' });

    expect(mockFn).toHaveBeenNthCalledWith(1, {
      event: 'entity action',
      data: expect.any(Object),
      context: {},
      globals: {},
      user: {},
      nested: [],
      consent: { test: true },
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 1,
      version,
      source: {
        type: IElbwalker.SourceType.Web,
        id: 'http://localhost/',
        previous_id: '',
      },
      walker: true,
    });

    expect(mockFn).toHaveBeenNthCalledWith(2, {
      event: 'entity action',
      data: { foo: 'bar' },
      context: {},
      globals: {},
      user: {},
      nested: [],
      consent: { test: true },
      id: expect.any(String),
      trigger: '',
      entity: 'entity',
      action: 'action',
      timestamp: expect.any(Number),
      timing: expect.any(Number),
      group: expect.any(String),
      count: 2,
      version,
      source: {
        type: IElbwalker.SourceType.Web,
        id: 'http://localhost/',
        previous_id: '',
      },
      walker: true,
    });
  });

  test('globals properties', () => {
    const html: string = fs
      .readFileSync(__dirname + '/html/globals.html')
      .toString();
    document.body.innerHTML = html;

    jest.clearAllMocks(); // skip previous init
    w.elbLayer = [];
    elbwalker = Elbwalker({
      default: true,
      pageview: false,
      globals: { outof: 'override', static: 'value' },
    });

    expect(mockFn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'entity action',
        data: { foo: 'bar' },
        globals: { outof: 'scope', static: 'value' },
      }),
    );

    jest.clearAllMocks(); // skip previous init
    elbwalker.push('walker run');
    expect(mockFn).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        event: 'entity action',
        data: { foo: 'bar' },
        globals: { outof: 'scope', static: 'value' },
      }),
    );
  });

  test('group ids', () => {
    elbwalker.push('entity action');
    elbwalker.push('entity action');
    const groupId = mockFn.mock.calls[0][0].group;
    expect(mockFn.mock.calls[1][0].group).toEqual(groupId);

    // Start a new initialization with a new group ip
    elbwalker.push('walker run');
    elbwalker.push('entity action');
    expect(mockFn.mock.calls[2][0].group).not.toEqual(groupId); // page view
  });

  test('hooks', () => {
    const preHookFn = jest.fn().mockImplementation(function (params, ...args) {
      mockFn(...args); // Custom code
      params.fn(...args); // Regular call
      return 'foo'; // Updated response
    });
    const postHookFn = jest.fn();
    elbwalker = Elbwalker({
      pageview: false,
      hooks: {
        prepush: preHookFn,
        postpush: postHookFn,
      },
    });
    elbwalker.push('walker run');
    elbwalker.push('e a', { a: 1 }, 't', { c: ['v', 0] }, []);

    expect(preHookFn).toHaveBeenCalledTimes(2);
    expect(preHookFn).toHaveBeenNthCalledWith(
      1,
      { fn: expect.any(Function) },
      'walker run',
    );
    expect(preHookFn).toHaveBeenNthCalledWith(
      2,
      { fn: expect.any(Function) },
      'e a',
      { a: 1 },
      't',
      { c: ['v', 0] },
      [],
    );

    expect(postHookFn).toHaveBeenCalledTimes(2);
    expect(postHookFn).toHaveBeenNthCalledWith(
      1,
      { fn: expect.any(Function), result: 'foo' },
      'walker run',
    );
    expect(postHookFn).toHaveBeenNthCalledWith(
      2,
      { fn: expect.any(Function), result: 'foo' },
      'e a',
      { a: 1 },
      't',
      { c: ['v', 0] },
      [],
    );
  });

  test('source', () => {
    const location = document.location;
    const referrer = document.referrer;

    const newPageId = 'https://www.elbwalker.com/source_id';
    const newPageReferrer = 'https://docs.elbwalker.com';
    Object.defineProperty(window, 'location', {
      value: new URL(newPageId),
      writable: true,
    });
    Object.defineProperty(document, 'referrer', {
      value: newPageReferrer,
      writable: true,
    });

    elbwalker.push('entity source');
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'entity source',
        source: {
          type: IElbwalker.SourceType.Web,
          id: newPageId,
          previous_id: newPageReferrer,
        },
      }),
    );

    window.location = location;
    Object.defineProperty(document, 'referrer', {
      value: referrer,
      writable: true,
    });
  });

  test('walker commands', () => {
    mockFn.mockClear();
    elbwalker.push('walker action');

    // don't push walker commands to destinations
    expect(mockFn).not.toHaveBeenCalled();
  });

  test('walker user', () => {
    elbwalker.push('walker run');

    // Missing argument
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

    elbwalker.push('walker user', { session: 'sessionid' });
    elbwalker.push('entity action');
    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'entity action',
        user: { id: 'userid', device: 'userid', session: 'sessionid' },
      }),
    );
  });

  test('walker consent', () => {
    jest.clearAllMocks();
    elbwalker = Elbwalker({
      consent: { functional: true },
      default: true,
      pageview: false,
    });

    elbwalker.push('walker run');

    expect(elbwalker.config.consent.functional).toBeTruthy();
    expect(elbwalker.config.consent.marketing).not.toBeTruthy();
    elbwalker.push('consent check');
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true },
      }),
    );

    // Missing argument
    elbwalker.push('walker consent');
    expect(elbwalker.config.consent.functional).toBeTruthy();
    expect(elbwalker.config.consent.marketing).not.toBeTruthy();

    // Grant permissions
    elbwalker.push('walker consent', { marketing: true });
    expect(elbwalker.config.consent.marketing).toBeTruthy();
    elbwalker.push('consent check');
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true, marketing: true },
      }),
    );

    // Revoke permissions
    elbwalker.push('walker consent', { marketing: false });
    expect(elbwalker.config.consent.marketing).not.toBeTruthy();
    elbwalker.push('consent check');
    expect(mockFn).toHaveBeenLastCalledWith(
      expect.objectContaining({
        event: 'consent check',
        consent: { functional: true, marketing: false },
      }),
    );
  });

  test('timing', () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.advanceTimersByTime(2500); // 2.5 sec load time
    elbwalker = Elbwalker({ elbLayer: [], default: true });

    expect(mockFn.mock.calls[0][0].timing).toEqual(2.5);

    jest.advanceTimersByTime(1000); // 1 sec to new run
    elbwalker.push('walker run');
    expect(mockFn.mock.calls[1][0].timing).toEqual(0); // Start from 0 not 3.5

    jest.advanceTimersByTime(5000); // wait 5 sec
    elbwalker.push('e a');
    expect(mockFn.mock.calls[2][0].timing).toEqual(5);
  });

  test('Element parameter', () => {
    document.body.innerHTML = `
      <div data-elbcontext="c:o">
        <div id="e" data-elb="e" data-elbaction="load">
          <p data-elb-e="k:v"></p>
        </div>
      </div>
    `;
    const elem = document.getElementById('e') as HTMLElement;

    elbwalker.push('e custom', elem, 'custom');

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e custom',
        trigger: 'custom',
        data: { k: 'v' },
        context: { c: ['o', 0] },
      }),
    );

    elbwalker.push('e context', { a: 1 }, 'custom', elem);

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'e context',
        trigger: 'custom',
        data: { a: 1 },
        context: { c: ['o', 0] },
      }),
    );
  });
});
