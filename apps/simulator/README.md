# WalkerOS Simulator

> **Privacy-first event processing simulation for deterministic pipeline
> testing**

WalkerOS Simulator provides a comprehensive solution for simulating and testing
walkerOS event processing pipelines. It enables both interactive simulation in
graphical Flow canvas interfaces and CLI-based batch testing, ensuring
deterministic and reliable event processing analysis.

## 🎯 Vision & Purpose

The simulator was designed to address the need for **predictable event
processing analysis** in walkerOS implementations. It provides:

- **Interactive Simulation**: Real-time event processing visualization in Flow
  canvas
- **CLI Testing**: Batch processing for CI/CD pipelines and automated testing
- **Deterministic Results**: Consistent, repeatable simulation outcomes
- **Real Package Execution**: Uses actual walkerOS packages, not mocks
- **Data Flow Observation**: Captures inputs/outputs at each pipeline stage

### Key Goals

1. **Reliability**: Predict real walkerOS behavior accurately
2. **Observability**: See exactly what happens to events at each stage
3. **Integration**: Work seamlessly with Flow app and standalone environments
4. **Developer Experience**: Clear, actionable insights into event processing

## ✨ Features

### 🔍 **Event Processing Simulation**

- **Real Package Execution**: Uses `@walkeros/collector`,
  `@walkeros/web-source-browser`, `@walkeros/web-destination-gtag`,
  `@walkeros/web-destination-api`
- **Deterministic Processing**: Consistent results across runs using walkerOS
  wrapper system
- **Data Flow Observation**: Captures data at 5 key pipeline stages
- **No External Calls**: `dryRun: true` prevents actual API calls while
  capturing all function invocations

### 🎨 **Multiple Interfaces**

- **Programmatic API**: TypeScript-first library for integration
- **CLI Tool**: `walkeros-simulate` command for terminal usage
- **Flow Integration**: Service architecture for graphical canvas simulation

### 📊 **Flexible Output Formats**

- **JSON**: Complete simulation data for programmatic analysis
- **Table**: Human-readable trace visualization
- **Summary**: High-level statistics and success metrics

### 🔧 **Configuration Support**

- **Flow Configurations**: Convert visual node/edge configs to walkerOS setups
- **Event Validation**: Strict "ENTITY ACTION" format enforcement
- **Mapping Support**: Real GA4, API destination mappings

## 🚀 Quick Start

### Installation

```bash
npm install @walkeros/simulator
```

### CLI Usage with npm scripts

```bash
# Run basic simulation with default examples
npm run simulate

# Get summary output (recommended for verification)
npm run simulate:summary

# Get detailed JSON output
npm run simulate:json

# Get table format output
npm run simulate:table
```

### ✅ Verification Steps

**1. Run All Tests (33 tests should pass)**

```bash
npm test
```

**2. Verify Real Package Integration**

```bash
npm run simulate:summary
```

Expected output:

- ✅ **Total Events: 3**
- ✅ **Successful: 3** (not 0!)
- ✅ **Failed: 0**
- ✅ **Success Rate: 100.0%**
- ✅ **Nodes Processed: 4** (browser-source-1, gtag-dest-1, api-dest-1,
  collector-1)

**3. Check Real API Destination Processing**

```bash
npm run simulate:json
```

Look for real walkerOS behavior:

- ✅ Real HTTP calls captured in destination traces
- ✅ Actual API destination processing (not dummy mock data)
- ✅ Wrapper system intercepting `sendWeb` calls with dryRun

**4. Architecture Verification** The simulator now uses:

- ✅ **Real walkerOS collector** (`@walkeros/collector`)
- ✅ **Real API destination** (`@walkeros/web-destination-api`)
- ✅ **Real event processing** (Jest mocks removed from integration tests)
- ✅ **Mixed approach**: API destinations are real, gtag destinations use dummy
  (controlled rollout)

### Direct CLI Usage (Alternative)

```bash
# Build first, then run
npm run build
node dist/cli.js -f examples/flow-config.json -e examples/test-events.json -o summary
```

### Programmatic Usage

```typescript
import { createSimulator } from '@walkeros/simulator';
import type { FlowConfiguration, WalkerOS } from '@walkeros/simulator';

const simulator = createSimulator('my-simulation');

const flowConfig: FlowConfiguration = {
  nodes: [
    {
      id: 'browser-1',
      type: 'source',
      sourceType: 'browser',
      config: { prefix: 'data-elb', scope: 'body' },
    },
    {
      id: 'collector-1',
      type: 'collector',
      config: { allowed: true },
    },
    {
      id: 'gtag-1',
      type: 'destination',
      destinationType: 'gtag',
      config: {
        settings: { ga4: { measurementId: 'G-XXXXXXXXXX' } },
        mapping: {
          product: {
            view: { name: 'view_item' },
          },
        },
      },
    },
  ],
  edges: [
    { source: 'browser-1', target: 'collector-1' },
    { source: 'collector-1', target: 'gtag-1' },
  ],
};

const events: WalkerOS.Event[] = [
  {
    event: 'product view',
    data: { id: 'P123', name: 'Laptop', price: 999.99 },
    timestamp: Date.now(),
    id: 'event-1',
    entity: 'product',
    action: 'view',
  },
];

const result = await simulator.simulate(flowConfig, events);

console.log(
  `Success Rate: ${result.summary.successfulEvents}/${result.summary.totalEvents}`,
);
result.traces.forEach((trace) => {
  console.log(`Event: ${trace.inputEvent.event}`);
  trace.captures.forEach((capture) => {
    console.log(
      `  ${capture.stage}: ${capture.functionName}(${JSON.stringify(capture.args)})`,
    );
  });
});
```

## 🏗️ Technical Architecture

### Core Components

#### 1. **Interceptor System** (`src/interceptor.ts`)

Uses walkerOS's built-in wrapper system to capture function calls:

```typescript
const wrapperConfig = {
  dryRun: true, // Prevents real API calls
  onCall: (context, args) => {
    // Capture function name and arguments
    captureCallback({
      stage: 'destination_output',
      nodeId: 'gtag-1',
      functionName: context.name, // e.g., 'gtag'
      args: args, // e.g., ['event', 'view_item', {...}]
    });
  },
};
```

#### 2. **Configuration Factory** (`src/factory.ts`)

Converts Flow visual configurations into walkerOS package configurations:

```typescript
// Flow Node → walkerOS Config
{
  id: 'gtag-dest',
  type: 'destination',
  destinationType: 'gtag',
  config: { settings: {...}, mapping: {...} }
}
// ↓
{
  type: 'gtag',
  wrapper: wrapperConfig,
  settings: {...},
  mapping: {...}
}
```

#### 3. **Simulation Runner** (`src/runner.ts`)

Orchestrates real walkerOS execution:

```typescript
const { collector } = await createCollector(collectorConfig);
await collector.push(inputEvent); // Real walkerOS execution
```

#### 4. **Data Capture Pipeline**

Observes data at 5 key stages:

- `source_output`: Browser source processing events
- `collector_input`: Events entering collector
- `collector_output`: Events exiting collector
- `destination_input`: Events entering destinations
- `destination_output`: Function calls to external APIs (gtag, sendWeb, etc.)

### Package Integration

The simulator integrates with real walkerOS packages:

```typescript
// Real package dependencies
"@walkeros/core": "*",
"@walkeros/collector": "*",
"@walkeros/web-source-browser": "*",
"@walkeros/web-destination-gtag": "*",
"@walkeros/web-destination-api": "*"
```

### Data Flow

```
Flow Config → Factory → WalkerOS Config → Real Packages → Captured Data
     ↓            ↓            ↓              ↓              ↓
   Nodes/Edges   Converter   Collector    Interceptor    Simulation
                             Sources      (dryRun)        Result
                           Destinations
```

## 📋 API Reference

### Core Types

```typescript
interface FlowConfiguration {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
}

interface FlowNode {
  readonly id: string;
  readonly type: 'source' | 'collector' | 'destination';
  readonly sourceType?: string; // 'browser', 'dataLayer'
  readonly destinationType?: string; // 'gtag', 'api'
  readonly config?: Record<string, unknown>;
}

interface SimulationResult {
  readonly traces: readonly SimulationTrace[];
  readonly summary: SimulationSummary;
}

interface SimulationTrace {
  readonly simulationId: string;
  readonly inputEvent: WalkerOS.Event;
  readonly captures: readonly FlowCapture[];
  readonly errors: readonly SimulationError[];
}

interface FlowCapture {
  readonly stage:
    | 'source_output'
    | 'collector_input'
    | 'collector_output'
    | 'destination_input'
    | 'destination_output';
  readonly nodeId: string;
  readonly data: unknown;
  readonly functionName?: string;
  readonly args?: readonly unknown[];
}
```

### Main Functions

```typescript
// Create simulator instance
function createSimulator(simulationId?: string): WalkerOSSimulator;

// Run simulation
async function simulate(
  flowConfig: FlowConfiguration,
  events: readonly WalkerOS.Event[],
  options?: SimulationOptions,
): Promise<SimulationResult>;

// Validate configuration
function validateFlowConfiguration(flowConfig: FlowConfiguration): {
  isValid: boolean;
  errors: string[];
};

// Direct simulation (convenience function)
async function simulateEvents(
  flowConfig: FlowConfiguration,
  events: readonly WalkerOS.Event[],
  options?: SimulationOptions,
): Promise<SimulationResult>;
```

### CLI Commands

```bash
walkeros-simulate [options]

Options:
  -f, --flow-config <file>        Flow configuration JSON file (required)
  -e, --events <file>             Events JSON file (required)
  -o, --output <format>           Output format: json, table, summary (default: json)
  -s, --simulation-id <id>        Custom simulation ID
  -c, --capture-external-calls    Capture external function calls
  -h, --help                      Show help
  -v, --version                   Show version
```

## 📁 Project Structure

```
apps/simulator/
├── src/
│   ├── types.ts           # TypeScript interfaces
│   ├── interceptor.ts     # Wrapper system integration
│   ├── factory.ts         # Flow config → walkerOS config conversion
│   ├── runner.ts          # Simulation orchestration
│   ├── wrappers.ts        # Package wrapper functions
│   ├── index.ts           # Public API
│   ├── cli.ts             # Command-line interface
│   └── __tests__/         # Comprehensive test suite
├── examples/
│   ├── flow-config.json   # Sample Flow configuration
│   ├── test-events.json   # Sample walkerOS events
│   └── README.md          # Examples documentation
├── dist/                  # Built output (CJS, ESM, types)
├── package.json           # Package configuration
├── tsconfig.json          # TypeScript configuration
├── tsup.config.ts         # Build configuration
└── jest.config.mjs        # Test configuration
```

## 🧪 Development & Testing

### Setup

```bash
cd apps/simulator
npm install
```

### Development Commands

```bash
npm run dev      # Watch mode testing
npm run build    # Build all formats (CJS, ESM, types)
npm run test     # Run test suite (33 tests)
npm run lint     # TypeScript check + ESLint
npm run clean    # Clean all build artifacts
```

### Testing Strategy

The simulator includes **33 comprehensive tests** covering:

- **Unit Tests**: Individual component functionality
- **Integration Tests**: End-to-end simulation with example files
- **Validation Tests**: Flow configuration validation
- **Error Handling**: Graceful failure scenarios
- **CLI Tests**: Command-line interface functionality

```bash
# Run specific test suites
npm test -- interceptor.test.ts
npm test -- integration.test.ts
npm test -- --watch
```

### Code Standards

- **TypeScript Strict Mode**: No `any` types allowed
- **Event Format**: Strict "ENTITY ACTION" format (space-separated)
- **Real Configurations**: Use actual walkerOS package configurations
- **Test-Driven**: All features must have corresponding tests

## 📖 Examples

### Flow Configuration

```json
{
  "nodes": [
    {
      "id": "browser-source-1",
      "type": "source",
      "sourceType": "browser",
      "config": {
        "prefix": "data-elb",
        "scope": "body",
        "pageview": true,
        "session": true
      }
    },
    {
      "id": "collector-1",
      "type": "collector",
      "config": {
        "allowed": true,
        "dryRun": false
      }
    },
    {
      "id": "gtag-dest-1",
      "type": "destination",
      "destinationType": "gtag",
      "config": {
        "settings": {
          "ga4": { "measurementId": "G-XXXXXXXXXX" }
        },
        "mapping": {
          "product": {
            "view": {
              "name": "view_item",
              "data": {
                "map": {
                  "currency": { "value": "USD" },
                  "value": "data.price",
                  "item_id": "data.id",
                  "item_name": "data.name"
                }
              }
            }
          }
        }
      }
    }
  ],
  "edges": [
    { "source": "browser-source-1", "target": "collector-1" },
    { "source": "collector-1", "target": "gtag-dest-1" }
  ]
}
```

### WalkerOS Events

```json
[
  {
    "event": "page view",
    "data": {
      "title": "Homepage",
      "url": "https://example.com/"
    },
    "context": {
      "stage": ["development", 1]
    },
    "globals": {
      "language": "en",
      "currency": "USD"
    },
    "user": {
      "id": "user123",
      "device": "device456"
    },
    "consent": {
      "functional": true,
      "marketing": true
    },
    "id": "1647261462000-01b5e2-1",
    "timestamp": 1647261462000,
    "entity": "page",
    "action": "view"
  },
  {
    "event": "product view",
    "data": {
      "id": "P123",
      "name": "Gaming Laptop",
      "price": 999.99
    },
    "entity": "product",
    "action": "view",
    "timestamp": 1647261462001,
    "id": "1647261462001-01b5e2-2"
  }
]
```

### Expected Output

```bash
# Summary Format
walkeros-simulate -f flow-config.json -e events.json -o summary

Simulation completed successfully!

Total Events: 2
Successful: 2
Failed: 0
Success Rate: 100.0%
Nodes Processed: 4

  • browser-source-1
  • collector-1
  • gtag-dest-1
  • api-dest-1
```

```bash
# Table Format
walkeros-simulate -f flow-config.json -e events.json -o table

SIMULATION SUMMARY
==================================================
Total Events: 2
Successful: 2
Failed: 0
Nodes Processed: browser-source-1, collector-1, gtag-dest-1

TRACE 1: simulation-12345-67890
--------------------------------------------------
Event: page view
Captures:
  1. [collector_input] collector-1
  2. [collector_output] collector-1

TRACE 2: simulation-12345-67891
--------------------------------------------------
Event: product view
Captures:
  1. [collector_input] collector-1
  2. [collector_output] collector-1
```

## 🔧 Advanced Configuration

### Wrapper System Details

The simulator leverages walkerOS's built-in wrapper system:

```typescript
// Each package gets wrapped with observation capability
const wrapperConfig: Wrapper.Config = {
  dryRun: true, // Prevent real external calls
  onCall: (context: Wrapper.Fn, args: readonly unknown[]) => {
    // context.name = function name (e.g., 'gtag', 'sendWeb')
    // args = function arguments
    captureCallback({
      stage: 'destination_output',
      nodeId: destinationId,
      functionName: context.name,
      args: args,
    });
  },
};
```

### Error Handling

Simulation errors are captured and reported:

```typescript
interface SimulationError {
  readonly stage: string; // Where error occurred
  readonly nodeId: string; // Which node failed
  readonly error: Error; // Original error object
}

// Errors don't stop simulation - they're captured per-trace
result.traces[0].errors.forEach((error) => {
  console.log(`Error in ${error.nodeId}: ${error.error.message}`);
});
```

### Performance Considerations

- **Deterministic Execution**: Results are consistent across runs
- **Memory Efficient**: Captures are stored per-trace, not globally
- **No External Dependencies**: All simulation happens locally
- **Type Safety**: Full TypeScript support prevents runtime errors

## 🚧 Future Roadmap & TODOs

### Short Term

- [ ] **Enhanced Debugging**: Add detailed step-by-step execution traces
- [ ] **Server-side Support**: Extend simulation to server-side walkerOS setups
- [ ] **More Destinations**: Add support for additional destination types
- [ ] **Batch Processing**: Optimize performance for large event sets

### Medium Term

- [ ] **Flow Integration API**: RESTful API service for Flow app integration
- [ ] **Real-time Simulation**: Live event processing in Flow canvas
- [ ] **Export Formats**: CSV, Excel export for analysis
- [ ] **Simulation Snapshots**: Save/load simulation states

### Long Term

- [ ] **Multi-tenant Support**: Simulate multiple walkerOS instances
- [ ] **Performance Analytics**: Execution time analysis and optimization
- [ ] **Visual Debugger**: Step-through debugging in Flow interface
- [ ] **Collaboration Features**: Share simulation results across teams

### Integration Opportunities

- [ ] **CI/CD Integration**: Automated pipeline testing
- [ ] **Monitoring Integration**: Connect with observability tools
- [ ] **Documentation Generation**: Auto-generate implementation docs
- [ ] **Compliance Testing**: GDPR, CCPA compliance validation

## 🤝 Contributing

### Development Workflow

1. **Clone and Setup**

   ```bash
   git clone https://github.com/elbwalker/walkerOS.git
   cd walkerOS/apps/simulator
   npm install
   ```

2. **Make Changes**
   - Follow TypeScript strict mode (no `any` types)
   - Add tests for new functionality
   - Use real walkerOS configurations

3. **Test Changes**

   ```bash
   npm run test    # Run all tests
   npm run build   # Ensure it builds
   npm run lint    # Check TypeScript + ESLint
   ```

4. **Submit Pull Request**
   - Include test coverage
   - Update documentation
   - Follow existing code patterns

### Code Standards

- **Event Naming**: Always use "ENTITY ACTION" format (e.g., "page view",
  "product add")
- **Type Safety**: No `any` types - use proper TypeScript interfaces
- **Real Configs**: Use actual walkerOS package configurations, not fake ones
- **Testing**: All new features require corresponding tests
- **Documentation**: Update README for public API changes

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- **[walkerOS](https://github.com/elbwalker/walkerOS)**: Privacy-first event
  data collection
- **[Flow](https://github.com/elbwalker/walkerOS/tree/main/apps/flow)**: Visual
  pipeline editor
- **[walkerOS Packages](https://github.com/elbwalker/walkerOS/tree/main/packages)**:
  Core walkerOS components

---

**Built with ❤️ by the walkerOS team**

_For support, questions, or contributions, visit
[github.com/elbwalker/walkerOS](https://github.com/elbwalker/walkerOS)_
