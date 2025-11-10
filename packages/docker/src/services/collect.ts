import { startFlow } from '@walkeros/collector';
import type { DockerConfig } from '../config/schema';
import { resolveSources, resolveDestinations } from '../config/registry';

/**
 * Run collect mode - start event collection server
 *
 * Sources own their infrastructure (HTTP server, PubSub clients, etc.)
 * Docker just calls startFlow() and lets sources handle everything
 */
export async function runCollectMode(config: DockerConfig): Promise<void> {
  console.log('🚀 Collect mode: Starting event collector...');

  try {
    // Resolve code references: strings → functions
    const resolvedSources = resolveSources(config.sources || {});
    const resolvedDestinations = resolveDestinations(config.destinations || {});

    console.log(
      `   Sources: ${Object.keys(resolvedSources).join(', ') || 'none'}`,
    );
    console.log(
      `   Destinations: ${Object.keys(resolvedDestinations).join(', ') || 'none'}`,
    );

    // Start flow - sources own infrastructure
    const { collector, elb } = await startFlow({
      sources: resolvedSources,
      destinations: resolvedDestinations,
      ...config.collector,
    });

    console.log('✅ Collector running');
    console.log(
      `   Sources initialized: ${Object.keys(collector.sources).length}`,
    );
    console.log(
      `   Destinations initialized: ${Object.keys(collector.destinations).length}`,
    );

    // Graceful shutdown
    const gracefulShutdown = config.docker?.collect?.gracefulShutdown || 25000;

    const shutdownHandler = async (signal: string) => {
      console.log(`\n⏹️  Received ${signal}, shutting down gracefully...`);

      // Give sources time to finish processing
      setTimeout(() => {
        console.log('✅ Shutdown complete');
        process.exit(0);
      }, gracefulShutdown);

      // Stop accepting new events
      await collector.command('shutdown');
    };

    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
    process.on('SIGINT', () => shutdownHandler('SIGINT'));

    // Keep process alive
    await new Promise(() => {});
  } catch (error) {
    console.error('❌ Collector failed:', error);
    process.exit(1);
  }
}
