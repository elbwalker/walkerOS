<p align="left">
  <a href="https://www.walkeros.io">
    <img title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo_new.svg" width="256px"/>
  </a>
</p>

# API Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/api)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-api)

walkerOS follows a **source → collector → destination** architecture. This API
destination receives processed events from the walkerOS collector and sends them
to any HTTP(S) endpoint, enabling integration with custom APIs, webhooks, and
third-party services.

## Installation

```sh
npm install @walkeros/server-destination-api
```

## Quick Start

Configure in your Flow JSON:

```json
{
  "version": 1,
  "flows": {
    "default": {
      "server": {},
      "destinations": {
        "api": {
          "package": "@walkeros/server-destination-api",
          "config": {
            "settings": {
              "url": "https://api.example.com/events"
            }
          }
        }
      }
    }
  }
}
```

Or programmatically:

```typescript
import { startFlow } from '@walkeros/collector';
import { destinationAPI } from '@walkeros/server-destination-api';

const { elb } = await startFlow({
  destinations: [
    {
      destination: destinationAPI,
      config: {
        settings: {
          url: 'https://api.example.com/events',
          headers: {
            Authorization: 'Bearer your-api-key',
            'Content-Type': 'application/json',
          },
          method: 'POST',
          timeout: 5000,
        },
      },
    },
  ],
});
```

## Configuration

| Name        | Type                     | Description                         | Required | Default |
| ----------- | ------------------------ | ----------------------------------- | -------- | ------- |
| `url`       | `string`                 | The API endpoint URL to send events | Yes      | -       |
| `headers`   | `Record<string, string>` | Custom HTTP headers                 | No       | -       |
| `method`    | `string`                 | HTTP method                         | No       | `POST`  |
| `timeout`   | `number`                 | Request timeout in milliseconds     | No       | `5000`  |
| `transform` | `Function`               | Custom data transformation function | No       | -       |

## Features

- **Flexible URL Configuration**: Send events to any HTTP(S) endpoint
- **Custom Headers**: Add authentication tokens, API keys, or custom headers
- **HTTP Method Control**: Use POST, PUT, PATCH, or any HTTP method
- **Request Timeout**: Configure timeout for slow endpoints
- **Data Transformation**: Transform event data before sending with custom
  functions
- **Dependency Injection**: Mock the sendServer function for testing

## Advanced Usage

### Custom Transform Function

Transform event data before sending:

```typescript
import { destinationAPI } from '@walkeros/server-destination-api';

const config = {
  settings: {
    url: 'https://api.example.com/events',
    transform: (data, config, mapping) => {
      // Return custom body (string or object)
      return JSON.stringify({
        eventType: data.event,
        properties: data.data,
        timestamp: Date.now(),
      });
    },
  },
};
```

### Using with Mapping

Use walkerOS mapping to transform events:

```typescript
const config = {
  settings: { url: 'https://api.example.com/events' },
  mapping: {
    page: {
      view: {
        data: {
          map: {
            pageUrl: 'data.path',
            pageTitle: 'data.title',
          },
        },
      },
    },
  },
};
```

## Type Definitions

See [src/types/](./src/types/) for TypeScript interfaces.

## Related

- [Destination Interface](../../../core/src/types/destination.ts)

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
