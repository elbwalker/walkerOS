import { startFlow } from '../flow';

describe('addDestination keeps code defaults', () => {
  test('a code batch survives a settings-only config, a caller batch wins', async () => {
    const { collector } = await startFlow({ run: false });
    const code = {
      push: jest.fn(),
      config: { batch: { size: 500, age: 1000 } },
    };

    await collector.command('destination', {
      code,
      config: { id: 'defaults', settings: { streamName: 'events' } },
    });
    await collector.command('destination', {
      code,
      config: { id: 'override', settings: {}, batch: { size: 10 } },
    });

    expect(collector.destinations['defaults'].config).toMatchObject({
      batch: { size: 500, age: 1000 },
      settings: { streamName: 'events' },
    });
    expect(collector.destinations['override'].config.batch).toEqual({
      size: 10,
    });
  });
});
