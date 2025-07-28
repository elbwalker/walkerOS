# Destination Component Usage

The Destination component in the Explorer package allows you to visualize how
walkerOS processes events through destinations with mapping configurations.

## Basic Usage

```javascript
import { createDestination } from '@walkerOS/explorer';

const explorer = createDestination('#container', {
  height: '500px',
});
```

## Using Custom Destinations

You can pass a custom destination that follows the walkerOS destination
interface:

```javascript
const customDestination = {
  type: 'custom',
  config: {},

  push(event, { data, wrap }) {
    // Use wrap to capture function calls
    const log = wrap('custom.log', console.log);

    // Process the event
    log('Event:', event);
    log('Mapped Data:', data);
  },
};

const explorer = createDestination('#container', {
  destination: customDestination,
  height: '500px',
});
```

## How It Works

1. **Event Column**: Enter a walkerOS event in JSON format
2. **Mapping Column**: Configure mapping rules to transform the event data
3. **Result Column**: See the captured output from the destination

The collector automatically:

- Processes the event with the mapping configuration
- Passes the transformed data to the destination
- Captures any wrapped function calls for display

## Mapping Configuration

The mapping follows walkerOS mapping rules structure:

```json
{
  "entity": {
    "action": {
      "data": {
        "field_name": "path.to.value",
        "another_field": "data.property"
      }
    }
  }
}
```

## Default Demo Destination

If no destination is provided, a default demo destination is used that:

- Logs the original event
- Logs the processed data (if mapping produced any)
- Uses the wrap parameter to capture these logs for display

## Example with API Destination

```javascript
const apiDestination = {
  type: 'api',
  config: {},

  push(event, { data, wrap }) {
    const sendWeb = wrap('api.sendWeb', (url, body) => {
      // Simulate API call
      return fetch(url, {
        method: 'POST',
        body: body,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const url = 'https://api.example.com/events';
    const body = JSON.stringify(data || event);

    sendWeb(url, body);
  },
};
```

The wrap function intercepts the actual function call and captures it for
display in the results column, making it easy to see what data would be sent to
external services.
