# WalkerOS Simulator Examples

This directory contains example configurations and test data for the WalkerOS
simulator.

## Files

### flow-config.json

Example Flow configuration that defines a complete event processing pipeline:

- **Browser source**: Captures DOM events with standard configuration
- **Collector**: Processes events with basic settings
- **Google Analytics 4 destination**: Maps events to GA4 format
- **API destination**: Sends all events to a generic API endpoint

### test-events.json

Sample WalkerOS events in the correct "ENTITY ACTION" format:

- `page view`: Homepage visit event
- `product view`: Product page interaction
- `product add`: Add to cart action

## Usage

### CLI Usage

```bash
# Run simulation with example files
walkeros-simulate -f examples/flow-config.json -e examples/test-events.json

# Output as table format
walkeros-simulate -f examples/flow-config.json -e examples/test-events.json -o table

# Output summary only
walkeros-simulate -f examples/flow-config.json -e examples/test-events.json -o summary
```

### Programmatic Usage

```typescript
import { createSimulator } from '@walkeros/simulator';
import flowConfig from './examples/flow-config.json';
import events from './examples/test-events.json';

const simulator = createSimulator();
const result = await simulator.simulate(flowConfig, events);

console.log(result.summary);
// View captured function calls
result.traces.forEach((trace) => {
  console.log(`Event: ${trace.inputEvent.event}`);
  trace.captures.forEach((capture) => {
    console.log(`  ${capture.stage}: ${capture.functionName}`, capture.args);
  });
});
```

## Expected Output

The simulation will capture:

1. **Source output**: Browser source processing events
2. **Collector input/output**: Event transformation and routing
3. **Destination input**: Events being sent to GA4 and API destinations
4. **Destination output**: Function calls to `gtag()` and API endpoints

Since `dryRun: true` is used for destinations, no real API calls are made, but
all function calls and arguments are captured for analysis.

## Configuration Notes

- All events use proper "ENTITY ACTION" format (space-separated)
- Mapping configurations use real GA4 event names (`view_item`, `add_to_cart`)
- Consent is enabled for all events in the test data
- The Flow configuration includes realistic walkerOS package configurations
