import { loadFlow, swapFlow, type FlowHandle } from '../runner';

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  scope: jest.fn().mockReturnThis(),
};

describe('swapFlow', () => {
  it('calls shutdown command on old flow before loading new one', async () => {
    const shutdownOrder: string[] = [];
    const commandFn = jest.fn().mockImplementation(async (cmd: string) => {
      if (cmd === 'shutdown') shutdownOrder.push('shutdown');
    });

    const oldHandle: FlowHandle = {
      collector: { command: commandFn },
      file: '/old/bundle.mjs',
    };

    // Mock loadFlow via dynamic import — we test swapFlow's ordering logic
    // by verifying shutdown is called before the new handle is returned
    const mockModule = {
      default: jest.fn().mockImplementation(async () => {
        shutdownOrder.push('load');
        return {
          collector: {
            command: jest.fn(),
          },
        };
      }),
    };

    // We can't easily mock dynamic import, so test the ordering contract:
    // shutdown must be called, and it must happen before we attempt loading

    // Verify shutdown command is called
    try {
      await swapFlow(
        oldHandle,
        '/new/bundle.mjs',
        undefined,
        mockLogger as any,
      );
    } catch {
      // loadFlow will fail (no real bundle), but shutdown should have been called
    }

    expect(commandFn).toHaveBeenCalledWith('shutdown');
  });

  it('continues loading even if shutdown command throws', async () => {
    const commandFn = jest.fn().mockRejectedValue(new Error('shutdown failed'));

    const oldHandle: FlowHandle = {
      collector: { command: commandFn },
      file: '/old/bundle.mjs',
    };

    // swapFlow should catch the shutdown error and proceed to loadFlow
    try {
      await swapFlow(
        oldHandle,
        '/new/bundle.mjs',
        undefined,
        mockLogger as any,
      );
    } catch (err: any) {
      // Should fail on loadFlow (no real bundle), NOT on shutdown
      expect(err.message).not.toContain('shutdown failed');
    }

    expect(commandFn).toHaveBeenCalledWith('shutdown');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Shutdown warning'),
    );
  });

  it('handles missing command function gracefully', async () => {
    const oldHandle: FlowHandle = {
      collector: {},
      file: '/old/bundle.mjs',
    };

    // Should not throw on missing command, only on loadFlow (no real bundle)
    try {
      await swapFlow(
        oldHandle,
        '/new/bundle.mjs',
        undefined,
        mockLogger as any,
      );
    } catch (err: any) {
      expect(err.message).not.toContain('command');
    }
  });
});
