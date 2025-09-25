import path from 'path';
import { simulate } from '../simulator';
import type { SimulationResult } from '../types';
import { Collector } from '@walkeros/core';

describe('Simulate', () => {
  it('should run', async () => {
    const configPath = path.resolve(
      __dirname,
      '../../../examples/web-ecommerce.json',
    );
    const event = { name: 'product view', data: { id: 'P123' } };

    console.log('Starting simulation...');

    const result = await simulate(configPath, event, {
      json: true,
      verbose: true,
    });

    console.log('Simulation result:', JSON.stringify(result, null, 2));

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // Verify collector state
    const collector = result.collector as Collector.Instance;
    expect(collector.queue[0]).toMatchObject(event);
    expect(collector.destinations.gtag).toBeDefined();
  }, 30000);
});
