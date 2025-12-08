<p align="left">
  <a href="https://www.walkeros.io">
    <img title="elbwalker" src="https://www.walkeros.io/img/elbwalker_logo.png" width="256px"/>
  </a>
</p>

# AWS (Firehose) Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/aws)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-aws)

walkerOS follows a **source → collector → destination** architecture. This AWS
destination receives processed events from the walkerOS collector and streams
them to AWS services like Firehose, enabling real-time data ingestion into AWS
data lakes, warehouses, and analytics services for large-scale event processing
and analysis.

## Installation

```sh
npm install @walkeros/server-destination-aws
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
        "firehose": {
          "package": "@walkeros/server-destination-aws",
          "config": {
            "settings": {
              "firehose": {
                "streamName": "your-firehose-stream-name",
                "region": "eu-central-1"
              }
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
import { destinationFirehose } from '@walkeros/server-destination-aws';

const { elb } = await startFlow({
  destinations: [
    {
      destination: destinationFirehose,
      config: {
        settings: {
          firehose: {
            streamName: 'your-firehose-stream-name',
            region: 'eu-central-1',
            config: {
              credentials: {
                accessKeyId: 'your-access-key-id',
                secretAccessKey: 'your-secret-access-key',
              },
            },
          },
        },
      },
    },
  ],
});
```

## Configuration

| Name       | Type             | Description                         | Required | Example                                                |
| ---------- | ---------------- | ----------------------------------- | -------- | ------------------------------------------------------ |
| `firehose` | `FirehoseConfig` | AWS Firehose configuration settings | No       | `{ streamName: 'walker-events', region: 'us-east-1' }` |

### Firehose Configuration

The `firehose` object has the following properties:

| Name         | Type                   | Description                                       | Required | Example                           |
| ------------ | ---------------------- | ------------------------------------------------- | -------- | --------------------------------- |
| `streamName` | `string`               | Name of the Kinesis Data Firehose delivery stream | Yes      | `'walker-events'`                 |
| `client`     | `FirehoseClient`       | Pre-configured AWS Firehose client instance       | No       | `new FirehoseClient(config)`      |
| `region`     | `string`               | AWS region for the Firehose service               | No       | `'us-east-1'`                     |
| `config`     | `FirehoseClientConfig` | AWS SDK client configuration options              | No       | `{ credentials: awsCredentials }` |

## Type Definitions

See [src/types/](./src/types/) for TypeScript interfaces.

## Related

- [Website Documentation](https://www.walkeros.io/docs/destinations/server/aws/)
- [Destination Interface](../../../core/src/types/destination.ts)

## Contribute

Feel free to contribute by submitting an
[issue](https://github.com/elbwalker/walkerOS/issues), starting a
[discussion](https://github.com/elbwalker/walkerOS/discussions), or getting in
[contact](https://calendly.com/elb-alexander/30min).

## License

This project is licensed under the MIT License.
