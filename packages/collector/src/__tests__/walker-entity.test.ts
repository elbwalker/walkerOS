import { startFlow } from '../flow';

describe('Walker Entity Events', () => {
  it('allows "walker" as entity name for regular events', async () => {
    const mockPush = jest.fn().mockResolvedValue(undefined);
    const mockDestination = {
      push: mockPush,
    };

    const { elb } = await startFlow({
      destinations: {
        test: {
          code: mockDestination as any,
          config: {},
        },
      },
    });

    // This should now work - "walker" as entity name
    await elb({ name: 'walker view', data: { page: 'home' } });

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'walker',
        action: 'view',
        name: 'walker view',
        data: { page: 'home' },
      }),
      expect.any(Object),
    );
  });

  it('distinguishes between walker events and walker commands', async () => {
    const mockPush = jest.fn().mockResolvedValue(undefined);
    const mockDestination = {
      push: mockPush,
    };

    const { elb, collector } = await startFlow({
      destinations: {
        test: {
          code: mockDestination as any,
          config: {},
        },
      },
    });

    // Regular walker entity event
    await elb({ name: 'walker view', data: { page: 'home' } });

    // Walker command (goes through command, not push)
    await elb('walker consent', { marketing: true });

    // Only the event should hit the destination
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'walker',
        action: 'view',
      }),
      expect.any(Object),
    );

    // Command should update collector state
    expect(collector.consent.marketing).toBe(true);
  });
});
