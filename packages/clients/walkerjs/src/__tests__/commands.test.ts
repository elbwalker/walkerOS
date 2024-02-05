import webClient, { WebClient, elb } from '..';

describe('Commands on', () => {
  const w = window;
  const mockFn = jest.fn(); //.mockImplementation(console.log);

  let walkerjs: WebClient.Function;

  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;
    jest.clearAllMocks();
    jest.resetModules();
    w.dataLayer = [];
    (w.dataLayer as unknown[]).push = mockFn;
    w.elbLayer = undefined as unknown as WebClient.ElbLayer;

    walkerjs = webClient({
      consent: { automatically: true },
      default: true,
    });
  });

  test('on consent', () => {
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

  test('on consent parameters', () => {
    elb('walker on', 'consent', { automatically: mockFn });
    expect(mockFn).toHaveBeenCalledWith({}, walkerjs);
  });

  test('on consent group', () => {
    elb('walker consent', { 'foo,bar': true });
    elb('walker on', 'consent', { foo: mockFn });
    expect(mockFn).toHaveBeenCalled();
  });

  test('on consent by start', () => {
    elb('walker on', 'consent', { automatically: mockFn });
    expect(mockFn).toHaveBeenCalled();
  });
});
