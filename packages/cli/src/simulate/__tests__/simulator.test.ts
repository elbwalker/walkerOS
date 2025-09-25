import path from 'path';
import { simulate } from '../simulator';

describe('Simulate', () => {
  it('should run', async () => {
    const configPath = path.resolve(
      __dirname,
      '../../../examples/web-ecommerce.json',
    );
    const event = { name: 'product view', data: { id: 'P123' } };

    console.log('Starting simulation...');

    // Add race condition to see where it hangs
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        console.error(
          '❌ Timeout: Simulation is taking too long - likely hanging in package download',
        );
        reject(new Error('Test timeout - simulation hanging'));
      }, 25000);
    });

    const simulationPromise = simulate(configPath, event, {
      json: true,
      verbose: true,
    });

    const result = await Promise.race([simulationPromise, timeoutPromise]);

    console.log('Simulation result:', JSON.stringify(result, null, 2));

    expect(result.success).toBe(true);
  }, 30000);
});
