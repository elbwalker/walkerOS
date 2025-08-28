import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import type { WalkerOS } from '@walkeros/core';
import type { FlowConfiguration, SimulationOptions } from './types';
import { createSimulator } from './index';

interface CliOptions {
  flowConfig: string;
  events: string;
  output?: 'json' | 'table' | 'summary';
  simulationId?: string;
  captureExternalCalls?: boolean;
  help?: boolean;
  version?: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: Partial<CliOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--flow-config':
      case '-f':
        options.flowConfig = args[++i];
        break;
      case '--events':
      case '-e':
        options.events = args[++i];
        break;
      case '--output':
      case '-o':
        options.output = args[++i] as 'json' | 'table' | 'summary';
        break;
      case '--simulation-id':
      case '-s':
        options.simulationId = args[++i];
        break;
      case '--capture-external-calls':
      case '-c':
        options.captureExternalCalls = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      case '--version':
      case '-v':
        options.version = true;
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }

  if (!options.flowConfig || !options.events) {
    if (!options.help && !options.version) {
      console.error('Error: --flow-config and --events are required');
      printUsage();
      process.exit(1);
    }
  }

  return options as CliOptions;
}

function printUsage(): void {
  console.log(`
Usage: walkeros-simulate [options]

Options:
  -f, --flow-config <file>        Path to Flow configuration JSON file (required)
  -e, --events <file>             Path to events JSON file (required)
  -o, --output <format>           Output format: json, table, summary (default: json)
  -s, --simulation-id <id>        Custom simulation ID
  -c, --capture-external-calls    Capture external function calls
  -h, --help                      Show help
  -v, --version                   Show version

Examples:
  walkeros-simulate -f flow.json -e events.json
  walkeros-simulate -f flow.json -e events.json -o table
  walkeros-simulate -f flow.json -e events.json -o summary -s my-test
`);
}

function printVersion(): void {
  try {
    const packageJson = JSON.parse(
      readFileSync(resolve(__dirname, '../package.json'), 'utf8'),
    );
    console.log(`walkeros-simulate v${packageJson.version}`);
  } catch {
    console.log('walkeros-simulate (version unknown)');
  }
}

function loadJsonFile<T>(filePath: string, description: string): T {
  const fullPath = resolve(process.cwd(), filePath);

  if (!existsSync(fullPath)) {
    console.error(`Error: ${description} file not found: ${fullPath}`);
    process.exit(1);
  }

  try {
    const content = readFileSync(fullPath, 'utf8');
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(
      `Error: Failed to parse ${description} file: ${error instanceof Error ? error.message : error}`,
    );
    process.exit(1);
  }
}

function formatOutput(result: any, format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify(result, null, 2);

    case 'table':
      return formatTableOutput(result);

    case 'summary':
      return formatSummaryOutput(result);

    default:
      return JSON.stringify(result, null, 2);
  }
}

function formatTableOutput(result: any): string {
  let output = '';

  // Summary table
  output += 'SIMULATION SUMMARY\n';
  output += '='.repeat(50) + '\n';
  output += `Total Events: ${result.summary.totalEvents}\n`;
  output += `Successful: ${result.summary.successfulEvents}\n`;
  output += `Failed: ${result.summary.failedEvents}\n`;
  output += `Nodes Processed: ${result.summary.nodesProcessed.join(', ')}\n`;
  output += '\n';

  // Traces table
  result.traces.forEach((trace: any, index: number) => {
    output += `TRACE ${index + 1}: ${trace.simulationId}\n`;
    output += '-'.repeat(50) + '\n';
    output += `Event: ${trace.inputEvent.event}\n`;

    if (trace.captures.length > 0) {
      output += 'Captures:\n';
      trace.captures.forEach((capture: any, i: number) => {
        output += `  ${i + 1}. [${capture.stage}] ${capture.nodeId}`;
        if (capture.functionName) {
          output += ` -> ${capture.functionName}()`;
        }
        output += '\n';
      });
    }

    if (trace.errors.length > 0) {
      output += 'Errors:\n';
      trace.errors.forEach((error: any, i: number) => {
        output += `  ${i + 1}. [${error.stage}] ${error.nodeId}: ${error.error.message}\n`;
      });
    }

    output += '\n';
  });

  return output;
}

function formatSummaryOutput(result: any): string {
  const summary = result.summary;
  const successRate =
    summary.totalEvents > 0
      ? ((summary.successfulEvents / summary.totalEvents) * 100).toFixed(1)
      : '0.0';

  return `
Simulation completed successfully!

Total Events: ${summary.totalEvents}
Successful: ${summary.successfulEvents}
Failed: ${summary.failedEvents}
Success Rate: ${successRate}%
Nodes Processed: ${summary.nodesProcessed.length}

${summary.nodesProcessed.map((node: string) => `  • ${node}`).join('\n')}
`;
}

async function main(): Promise<void> {
  try {
    const options = parseArgs();

    if (options.version) {
      printVersion();
      return;
    }

    if (options.help) {
      printUsage();
      return;
    }

    const flowConfig = loadJsonFile<FlowConfiguration>(
      options.flowConfig,
      'Flow configuration',
    );
    const events = loadJsonFile<readonly WalkerOS.Event[]>(
      options.events,
      'Events',
    );

    const simulationOptions: SimulationOptions = {
      simulationId: options.simulationId,
      captureExternalCalls: options.captureExternalCalls,
    };

    const simulator = createSimulator(options.simulationId);
    const result = await simulator.simulate(
      flowConfig,
      events,
      simulationOptions,
    );

    const output = formatOutput(result, options.output || 'json');
    console.log(output);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
