/**
 * Programmatic API Usage Example
 *
 * Shows how to use @walkeros/cli programmatically in Node.js applications
 */

import { bundle, simulate, run } from '@walkeros/cli';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Example flow configuration
const flowConfig = {
  flow: {
    platform: 'server',
    sources: [{ name: 'sourceExpress' }],
    destinations: [{ name: 'destinationConsole' }],
  },
  build: {
    packages: {},
    code: '',
    output: '',
  },
};

async function main() {
  console.log('WalkerOS CLI Programmatic API Example\n');

  // Create temp directory
  const tempDir = '/tmp/walkeros-programmatic-example';
  mkdirSync(tempDir, { recursive: true });

  const flowFile = join(tempDir, 'flow.json');
  const bundleFile = join(tempDir, 'bundle.js');

  // Write flow config
  writeFileSync(flowFile, JSON.stringify(flowConfig, null, 2));
  console.log('✓ Created flow config:', flowFile);

  // Example 1: Bundle Generation
  console.log('\n--- Example 1: Bundle Generation ---');
  try {
    await bundle({
      flowFile,
      output: bundleFile,
    });
    console.log('✓ Bundle created:', bundleFile);
  } catch (error) {
    console.error('Bundle error:', error.message);
  }

  // Example 2: Event Simulation
  console.log('\n--- Example 2: Event Simulation ---');
  try {
    const event = {
      name: 'page view',
      data: {
        title: 'Programmatic Test',
        path: '/api/test',
      },
    };

    await simulate({
      bundleFile,
      event: JSON.stringify(event),
    });
    console.log('✓ Event simulated successfully');
  } catch (error) {
    console.error('Simulation error:', error.message);
  }

  // Example 3: Docker Orchestration (commented out - requires Docker)
  console.log('\n--- Example 3: Docker Orchestration (Demo) ---');
  console.log('Example command:');
  console.log(`
await run({
  mode: 'collect',
  flowFile: '${flowFile}',
  port: 3000,
  containerName: 'my-walker',
  image: 'walkeros/docker:latest',
});
  `);
  console.log('(Skipped - requires Docker image)');

  // Example 4: Error Handling
  console.log('\n--- Example 4: Error Handling ---');
  try {
    await bundle({
      flowFile: '/does/not/exist.json',
      output: '/tmp/output.js',
    });
  } catch (error) {
    console.log('✓ Error caught successfully');
    console.log('  Error type:', error.constructor.name);
    console.log('  Error message:', error.message);
  }

  // Example 5: Custom Output Paths
  console.log('\n--- Example 5: Custom Output Paths ---');
  const customBundle = join(tempDir, 'custom-walker.js');
  await bundle({
    flowFile,
    output: customBundle,
  });
  console.log('✓ Custom bundle created:', customBundle);

  // Example 6: Multiple Event Simulations
  console.log('\n--- Example 6: Multiple Event Simulations ---');
  const events = [
    { name: 'page view', data: { path: '/' } },
    { name: 'button click', data: { id: 'cta' } },
    { name: 'form submit', data: { form: 'newsletter' } },
  ];

  for (const event of events) {
    await simulate({
      bundleFile,
      event: JSON.stringify(event),
    });
    console.log(`✓ Simulated: ${event.name}`);
  }

  // Complete
  console.log('\n═════════════════════════════════════');
  console.log('All examples completed successfully!');
  console.log('═════════════════════════════════════\n');

  console.log('API Documentation:');
  console.log('  bundle(options)   - Generate bundle from flow config');
  console.log('  simulate(options) - Simulate event with bundle');
  console.log('  run(options)      - Orchestrate Docker container');
  console.log('');
  console.log('For more examples, see:');
  console.log('  packages/cli/docs/MANUAL_TESTING_GUIDE.md');
  console.log('');
}

main().catch(console.error);
