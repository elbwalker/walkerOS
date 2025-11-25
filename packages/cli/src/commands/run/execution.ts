import type { RuntimeConfig, ServeConfig } from '@walkeros/docker';
import { runFlow, runServeMode } from '@walkeros/docker';

/**
 * Execute run command locally
 *
 * @param mode - Run mode (collect | serve)
 * @param flowPath - Path to flow bundle (required for collect, optional for serve)
 * @param options - Runtime options
 */
export async function executeRunLocal(
  mode: 'collect' | 'serve',
  flowPath: string | null,
  options: {
    port?: number;
    host?: string;
    serveName?: string;
    servePath?: string;
  },
): Promise<void> {
  switch (mode) {
    case 'collect': {
      if (!flowPath) {
        throw new Error('Flow path is required for collect mode');
      }
      const config: RuntimeConfig = {
        port: options.port,
        host: options.host,
      };
      await runFlow(flowPath, config);
      break;
    }

    case 'serve': {
      const config: ServeConfig = {
        port: options.port,
        host: options.host,
        serveName: options.serveName,
        servePath: options.servePath,
        filePath: flowPath || undefined,
      };
      await runServeMode(config);
      break;
    }

    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}
