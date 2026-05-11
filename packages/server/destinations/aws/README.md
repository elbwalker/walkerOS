<p align="left">
  <a href="https://www.walkeros.io">
    <img alt="walkerOS" title="walkerOS" src="https://www.walkeros.io/img/walkerOS_logo.svg" width="256px"/>
  </a>
</p>

# AWS Destination for walkerOS

[Source Code](https://github.com/elbwalker/walkerOS/tree/main/packages/server/destinations/aws)
&bull;
[NPM Package](https://www.npmjs.com/package/@walkeros/server-destination-aws)

walkerOS follows a **source → collector → destination** architecture. This AWS
destination receives processed events from the walkerOS collector and forwards
them to AWS services. Two sub-destinations ship in the package:

- `destinationFirehose` (default export): Kinesis Data Firehose delivery for
  high-throughput batch ingestion to data lakes.
- `destinationSNS` (named export): SNS topic publishing with native `setup()`
  lifecycle for idempotent topic provisioning, FIFO ordering, KMS encryption,
  and declared subscriptions.

## Installation

```sh
npm install @walkeros/server-destination-aws
```

## Quick Start

Configure in your Flow JSON:

```json
{
  "version": 3,
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

## SNS

Publish events to AWS SNS topics with idempotent topic provisioning, FIFO
ordering, per-event message attributes, and declared subscription fan-out.
Import the named export:

```typescript
import { destinationSNS } from '@walkeros/server-destination-aws';
```

### Required settings

| Name        | Type     | Required | Description                                                    |
| ----------- | -------- | -------- | -------------------------------------------------------------- |
| `topicName` | `string` | Yes      | Topic name (without `.fifo` suffix unless `fifoTopic: true`).  |
| `region`    | `string` | No       | AWS region. Default `eu-central-1`.                            |
| `topicArn`  | `string` | No       | Pre-resolved ARN. When set, init() skips its CreateTopic call. |

### Setup command

Provision the topic, attributes, tags, and declared subscriptions in one shot:

```bash
walkeros setup destination.sns -c flow.json
```

Setup is **authoritative-apply**: declared state is written to declared
resources via a single idempotent `CreateTopic` call (plus one `Subscribe` call
per declared subscription). Non-declared subscriptions and tags on the topic are
left untouched, never listed, never logged. Operators may freely manage
subscriptions or tags outside walkerOS without interference.

The result is JSON-stringified to stdout:

```json
{
  "topicArn": "arn:aws:sns:eu-central-1:000000000000:walkeros-events",
  "topicCreated": true,
  "tagsApplied": 2,
  "subscriptionsCreated": 1
}
```

### Example flow.json

```jsonc
{
  "destinations": {
    "sns": {
      "package": "@walkeros/server-destination-aws",
      "code": "destinationSNS",
      "config": {
        "settings": {
          "topicName": "walkeros-events",
          "region": "eu-central-1",
        },
        "setup": {
          "region": "eu-central-1",
          "displayName": "walkerOS Events",
          "tags": { "env": "prod", "team": "data" },
          "subscriptions": [
            {
              "protocol": "sqs",
              "endpoint": "arn:aws:sqs:eu-central-1:000000000000:walkeros-q",
            },
          ],
        },
      },
    },
  },
}
```

### FIFO topics

Set `setup.fifoTopic: true`. The destination auto-appends `.fifo` to the topic
name when missing and applies `FifoTopic`/`ContentBasedDeduplication` attributes
at creation. Per-event ordering is driven by `messageGroupId` and (optionally)
`messageDeduplicationId` mapped from event paths or static values:

```jsonc
"mapping": {
  "order": {
    "complete": {
      "settings": {
        "messageGroupId": "user.id",
        "messageDeduplicationId": "id"
      }
    }
  }
}
```

### IAM permissions

Setup role:

- `sns:CreateTopic`
- `sns:GetTopicAttributes` (existence probe)
- `sns:Subscribe`
- `sts:GetCallerIdentity` (account-ID resolution)

Runtime push role:

- `sns:Publish`
- `sns:CreateTopic` (init's idempotent ARN capture). Drop this if you
  pre-populate `settings.topicArn` from setup output.

Recommended: separate roles for setup and runtime. Setup runs from a provisioner
identity; runtime push uses a least-privileged role.

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
