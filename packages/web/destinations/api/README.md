<p align="left">
  <a href="https://www.walkeros.io">
    <img title="elbwalker" src="https://www.walkeros.io/img/elbwalker_logo.png" width="256px"/>
  </a>
</p>

# Web API Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/web/destinations/api)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/web-destination-api)

The API destination allows you to send events to any HTTP endpoint with
customizable data transformation and transport methods.

walkerOS follows a **source → collector → destination** architecture. This API
destination receives processed events from the walkerOS collector and sends them
to your custom API endpoint, enabling integration with internal analytics
systems, data warehouses, or custom business logic that requires real-time event
data.

## Installation

```sh
npm install @walkeros/web-destination-api
```

## Configuration

| Name        | Type                           | Description                                      | Required | Example                                                                   |
| ----------- | ------------------------------ | ------------------------------------------------ | -------- | ------------------------------------------------------------------------- |
| `url`       | `string`                       | The HTTP endpoint URL to send events to          | Yes      | `'https://api.example.com/events'`                                        |
| `headers`   | `Record<string, string>`       | Additional HTTP headers to include with requests | No       | `{ 'Authorization': 'Bearer token', 'Content-Type': 'application/json' }` |
| `method`    | `string`                       | HTTP method for the request                      | No       | `'POST'`                                                                  |
| `transform` | `function`                     | Function to transform event data before sending  | No       | `(data, config, mapping) => JSON.stringify(data)`                         |
| `transport` | `'fetch' \| 'xhr' \| 'beacon'` | Transport method for sending requests            | No       | `'fetch'`                                                                 |

## Usage

### Basic Usage

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationAPI } from '@walkeros/web-destination-api';

const { elb } = await startFlow();

elb('walker destination', destinationAPI, {
  settings: {
    url: 'https://api.example.com/events',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer your-token',
    },
  },
});
```

### Advanced Usage with Transform

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationAPI } from '@walkeros/web-destination-api';

const { elb } = await startFlow();

elb('walker destination', destinationAPI, {
  settings: {
    url: 'https://api.example.com/events',
    transport: 'fetch',
    transform: (event, config, mapping) => {
      // Custom transformation logic
      return JSON.stringify({
        timestamp: Date.now(),
        event_name: `${event.entity}_${event.action}`,
        properties: event.data,
        context: event.context,
      });
    },
  },
});
```

## Examples

### Sending to Analytics API

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationAPI } from '@walkeros/web-destination-api';

const { elb } = await startFlow();

// Configure for analytics API
elb('walker destination', destinationAPI, {
  settings: {
    url: 'https://analytics.example.com/track',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': 'your-api-key',
    },
    transform: (event) => {
      return JSON.stringify({
        event_type: `${event.entity}_${event.action}`,
        user_id: event.user?.id,
        session_id: event.user?.session,
        properties: event.data,
        timestamp: event.timing,
      });
    },
  },
});
```

### Using Beacon Transport

For critical events that need to be sent even when the page is unloading:

```typescript
elb('walker destination', destinationAPI, {
  settings: {
    url: 'https://api.example.com/critical-events',
    transport: 'beacon', // Reliable for page unload scenarios
  },
});
```

### Custom Data Mapping

Use mapping rules to control which events are sent:

```typescript
elb('walker destination', destinationAPI, {
  settings: {
    url: 'https://api.example.com/events',
  },
  mapping: {
    entity: {
      action: {
        data: 'data',
      },
    },
  },
});
```

## Transport Methods

- **fetch** (default): Modern, promise-based HTTP requests
- **xhr**: Traditional XMLHttpRequest for older browser compatibility
- **beacon**: Uses Navigator.sendBeacon() for reliable data transmission during
  page unload

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
