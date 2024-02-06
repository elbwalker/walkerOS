import webClient, { WebClient, elb } from '..';

describe('Commands on', () => {
  const w = window;
  const mockDataLayer = jest.fn(); //.mockImplementation(console.log);

  let walkerjs: WebClient.Function;

  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;
    jest.clearAllMocks();
    jest.resetModules();
    w.dataLayer = [];
    (w.dataLayer as unknown[]).push = mockDataLayer;
    w.elbLayer = undefined as unknown as WebClient.ElbLayer;

    walkerjs = webClient({
      consent: { automatically: true },
      default: true,
    });
  });

  test('consent', () => {
    const mockFn = jest.fn();

    // Don't call on default
    elb('walker on', 'consent', { marketing: mockFn });
    expect(mockFn).not.toHaveBeenCalled();

    // Different consent group
    elb('walker consent', { functional: true });
    expect(mockFn).not.toHaveBeenCalled();

    // Granted
    elb('walker consent', { marketing: true });
    expect(mockFn).toHaveBeenCalled();

    // Denied
    elb('walker consent', { marketing: false });
    expect(mockFn).toHaveBeenCalled();
  });

  test('consent register', () => {
    const mockFn = jest.fn();
    elb('walker on', 'consent', { foo: mockFn });
    expect(walkerjs.config.on.consent?.foo).toBe(mockFn);
  });

  test('consent by start', () => {
    const mockFn = jest.fn();
    webClient({
      consent: { automatically: true, foo: false },
      on: { consent: { automatically: mockFn } },
      default: true,
    });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test('consent already granted', () => {
    const mockFn = jest.fn();
    webClient({
      consent: { automatically: true, foo: false },
      on: { consent: { automatically: mockFn } },
      default: true,
    });
    expect(mockFn).toHaveBeenCalledTimes(1);

    elb('walker on', 'consent', { automatically: mockFn });
    expect(mockFn).toHaveBeenCalled();
  });

  test.skip('consent parameters', () => {
    const mockFn = jest.fn();
    elb('walker on', 'consent', { automatically: mockFn });
    expect(mockFn).toHaveBeenCalledWith({}, walkerjs);
  });

  test.skip('consent group', () => {
    const mockFn = jest.fn();
    elb('walker consent', { foo: true, bar: true });
    elb('walker on', 'consent', { 'foo,bar': mockFn });
    expect(mockFn).toHaveBeenCalledTimes(1);
  });

  test.skip('consent multiple', () => {
    const mockA = jest.fn();
    const mockB = jest.fn();
    elb('walker on', 'consent', { 'automatically,foo': mockA });
    elb('walker on', 'consent', { 'foo,bar': mockB });
    expect(mockA).toHaveBeenCalledTimes(1);
    expect(mockB).toHaveBeenCalledTimes(0);

    jest.clearAllMocks();
    elb('walker consent', { foo: true });
    expect(mockA).toHaveBeenCalledTimes(1);
    expect(mockB).toHaveBeenCalledTimes(1);
  });
});
