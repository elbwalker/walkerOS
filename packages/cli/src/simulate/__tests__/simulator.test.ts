import path from 'path';
import { simulate } from '../simulator';
import { Collector } from '@walkeros/core';

describe('Simulate', () => {
  it('should run', async () => {
    const configPath = path.resolve(
      __dirname,
      '../../../examples/web-ecommerce.json',
    );
    const event = { name: 'product view', data: { id: 'P123' } };

    const result = await simulate(configPath, event, {
      json: true,
      verbose: true,
    });

    console.log('elb push result:', result.elbResult);
    console.log('captured logs:', result.logs);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify collector state
    const collector = result.collector as Collector.Instance;
    expect(collector.queue[0]).toMatchObject(event);
    expect(collector.destinations.gtag).toBeDefined();

    // Verify console.log calls were captured
    expect(result.logs).toBeDefined();
    expect(Array.isArray(result.logs)).toBe(true);
    expect(result.logs).toContainEqual(['simulation start']);
  }, 30000);
});
