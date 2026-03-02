import sourceExpress from '../index';

const mockContext = (port: number) =>
  ({
    config: { settings: { port, status: true } },
    env: {
      push: jest.fn(),
      command: jest.fn(),
      elb: jest.fn(),
      logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
    },
    id: 'test',
    setIngest: jest.fn(),
  }) as any;

const mockDestroyContext = () =>
  ({
    id: 'test',
    config: {},
    env: {},
    logger: {
      info: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      scope: jest.fn().mockReturnThis(),
    },
  }) as any;

describe('Express source destroy', () => {
  it('closes the HTTP server when destroy() is called', async () => {
    const source = await sourceExpress(mockContext(0)); // port 0 = random
    expect(source.server).toBeDefined();
    expect(source.server!.listening).toBe(true);

    await source.destroy!(mockDestroyContext());

    expect(source.server!.listening).toBe(false);
  });

  it('destroy is a no-op when no server exists', async () => {
    const source = await sourceExpress({
      config: { settings: {} }, // no port = no server
      env: {
        push: jest.fn(),
        command: jest.fn(),
        elb: jest.fn(),
        logger: { info: jest.fn(), error: jest.fn(), debug: jest.fn() },
      },
      id: 'test',
      setIngest: jest.fn(),
    } as any);
    expect(source.server).toBeUndefined();
    expect(source.destroy).toBeDefined();
    await source.destroy!(mockDestroyContext()); // should not throw
  });
});
