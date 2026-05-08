# @walkeros/server-source-aws

AWS server sources for walkerOS, Lambda and SQS. Lightweight, single-purpose
runtime adapters for AWS services.

## Installation

```bash
npm install @walkeros/server-source-aws @types/aws-lambda
```

## Usage

```typescript
import { sourceLambda, type SourceLambda } from '@walkeros/server-source-aws';
import { startFlow } from '@walkeros/collector';

const { elb } = await startFlow<SourceLambda.Push>({
  sources: { lambda: { code: sourceLambda } },
});

export const handler = elb;
```

---

## Lambda Source

The Lambda source provides an HTTP handler that receives walker events and
forwards them to the walkerOS collector. Works with API Gateway v1 (REST API),
v2 (HTTP API), and Lambda Function URLs.

### Basic Usage

```typescript
import { sourceLambda, type SourceLambda } from '@walkeros/server-source-aws';
import { startFlow } from '@walkeros/collector';

// Handler singleton - reused across warm invocations
let handler: SourceLambda.Push;

async function setup() {
  if (handler) return handler;

  const { elb } = await startFlow<SourceLambda.Push>({
    sources: {
      lambda: {
        code: sourceLambda,
        config: {
          settings: {
            cors: true,
            healthPath: '/health',
          },
        },
      },
    },
    destinations: {
      // Your destinations
    },
  });

  handler = elb;
  return handler;
}

export const main: SourceLambda.Push = async (event, context) => {
  const h = await setup();
  return h(event, context);
};

// Export for Lambda runtime
export { main as handler };
```

### Deployment

#### Lambda Function URL (Simplest)

```typescript
// No API Gateway needed
import * as lambda from 'aws-cdk-lib/aws-lambda';

const fn = new lambda.Function(this, 'Walker', {
  runtime: lambda.Runtime.NODEJS_20_X,
  handler: 'index.handler',
  code: lambda.Code.fromAsset('./dist'),
});

fn.addFunctionUrl({
  authType: lambda.FunctionUrlAuthType.NONE,
  cors: {
    allowedOrigins: ['*'],
    allowedMethods: [lambda.HttpMethod.GET, lambda.HttpMethod.POST],
  },
});
```

#### API Gateway HTTP API (v2) - Recommended

```yaml
# serverless.yml
service: walkeros-flow

provider:
  name: aws
  runtime: nodejs20.x
  memorySize: 256
  timeout: 30

functions:
  collector:
    handler: dist/index.handler
    events:
      - httpApi:
          path: /collect
          method: post
      - httpApi:
          path: /collect
          method: get
      - httpApi:
          path: /health
          method: get
```

#### API Gateway REST API (v1)

```yaml
# template.yaml (AWS SAM)
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Resources:
  WalkerFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: ./dist
      Handler: index.handler
      Runtime: nodejs20.x
      Architectures: [arm64]
      Events:
        CollectPost:
          Type: Api
          Properties:
            Path: /collect
            Method: POST
        CollectGet:
          Type: Api
          Properties:
            Path: /collect
            Method: GET
        Health:
          Type: Api
          Properties:
            Path: /health
            Method: GET
```

### Configuration Options

```typescript
interface Settings {
  cors?: boolean | CorsOptions; // Enable CORS (default: true)
  timeout?: number; // Request timeout (default: 30000ms, max: 900000ms)
  enablePixelTracking?: boolean; // Enable GET tracking (default: true)
  healthPath?: string; // Health check path (default: '/health')
}

interface CorsOptions {
  origin?: string | string[]; // Allowed origins
  methods?: string[]; // Allowed methods
  headers?: string[]; // Allowed headers
  credentials?: boolean; // Allow credentials
  maxAge?: number; // Preflight cache time
}
```

### Ingest Metadata

Extract request metadata from Lambda events and forward it to processors and
destinations:

```typescript
await startFlow({
  sources: {
    lambda: {
      code: sourceLambda,
      config: {
        settings: { cors: true },
        ingest: {
          // API Gateway v1 (REST API)
          ip: 'requestContext.identity.sourceIp',
          ua: 'requestContext.identity.userAgent',
          // Or API Gateway v2 (HTTP API) / Function URLs:
          // ip: 'requestContext.http.sourceIp',
          // ua: 'requestContext.http.userAgent',
        },
      },
    },
  },
});
```

**Available ingest paths (API Gateway v1):**

| Path                                | Description       |
| ----------------------------------- | ----------------- |
| `requestContext.identity.sourceIp`  | Client IP address |
| `requestContext.identity.userAgent` | User agent string |
| `headers.*`                         | HTTP headers      |
| `httpMethod`                        | HTTP method       |

**Available ingest paths (API Gateway v2 / Function URLs):**

| Path                            | Description       |
| ------------------------------- | ----------------- |
| `requestContext.http.sourceIp`  | Client IP address |
| `requestContext.http.userAgent` | User agent string |
| `requestContext.http.method`    | HTTP method       |
| `headers.*`                     | HTTP headers      |

### Request Format

**POST - Single Event:**

```json
{
  "event": "page view",
  "data": {
    "title": "Home Page",
    "path": "/"
  },
  "context": {
    "stage": ["prod", 1]
  },
  "user": {
    "id": "user-123"
  }
}
```

**GET - Pixel Tracking:**

```
GET /collect?event=page%20view&data[title]=Home&data[path]=/
```

### Response Format

**Success:**

```json
{
  "success": true,
  "id": "event-id-123",
  "requestId": "aws-request-id"
}
```

**Error:**

```json
{
  "success": false,
  "error": "Invalid request format",
  "requestId": "aws-request-id"
}
```

**Health Check:**

```json
{
  "status": "ok",
  "timestamp": 1733328000000,
  "source": "lambda",
  "requestId": "aws-request-id"
}
```

### Supported Platforms

- ✅ AWS API Gateway REST API (v1)
- ✅ AWS API Gateway HTTP API (v2)
- ✅ Lambda Function URLs
- ✅ Direct Lambda invocation

### Features

- **Auto-detection**: Automatically detects API Gateway version
- **CORS**: Configurable CORS with defaults
- **Pixel Tracking**: Optional GET requests with 1x1 GIF response
- **Base64 Decoding**: Handles base64-encoded request bodies
- **Health Checks**: Built-in health check endpoint
- **Request IDs**: AWS request ID in all responses and logs
- **Logging**: Integrated with walkerOS logger
- **Type-Safe**: Full TypeScript support

### Production Considerations

#### Cold Starts

Use handler singleton pattern (shown in Basic Usage) to reuse source instance
across warm invocations.

#### Logging

The source integrates with the walkerOS logger from `env.logger`. Configure
CloudWatch Logs:

```typescript
import { createLogger } from '@walkeros/core';

const logger = createLogger({
  level: 'info',
  // CloudWatch-friendly JSON output
  format: (level, message, meta) =>
    JSON.stringify({ level, message, ...meta, timestamp: Date.now() }),
});
```

#### Error Handling

All errors include request IDs for tracing. Configure CloudWatch Insights
queries:

```
fields @timestamp, level, message, requestId, error
| filter level = "error"
| sort @timestamp desc
```

#### Monitoring

Key metrics to track:

- Lambda Duration (p50, p99)
- Lambda Errors
- Lambda Throttles
- API Gateway 4xx/5xx responses

#### Security

- Use API Gateway with API keys or AWS IAM for authentication
- Enable AWS WAF for DDoS protection
- Set Lambda reserved concurrency to prevent runaway costs
- Validate CORS origins in production (don't use `cors: true`)

### Examples

See [examples directory](./examples/) for:

- SAM deployment
- Serverless Framework deployment
- CDK deployment
- Local testing with SAM CLI

---

## SQS source

Long-running listener that polls an AWS SQS queue and forwards each message to
the walkerOS collector. Idempotent queue provisioning via
`walkeros setup source.<id>`, optional sibling DLQ, optional SNS topic
subscription with auto-applied queue policy.

### Quickstart

```typescript
import { sourceSqs } from '@walkeros/server-source-aws';
import { startFlow } from '@walkeros/collector';

await startFlow({
  sources: {
    sqs: {
      code: sourceSqs,
      config: {
        settings: {
          queueName: 'walkeros-events',
          region: 'eu-central-1',
        },
        setup: {
          visibilityTimeoutSeconds: 30,
          messageRetentionSeconds: 345600,
          tags: { env: 'prod', team: 'data' },
        },
      },
    },
  },
  destinations: {
    // your destinations
  },
});
```

The SQS source is event-driven. `init()` validates the queue exists and starts
the long-poll loop as a background task. The source's `push()` is a deliberate
no-op stub in production. `destroy()` stops the loop, drains in-flight messages,
and force-closes after `shutdownTimeoutMs` (default 30000).

### Setup

Run `walkeros setup source.<id>` to provision the queue idempotently with
declared attributes. Optionally creates a sibling dead-letter queue, and
optionally subscribes the queue to an SNS topic, including the matching queue
policy. AWS treats identical CreateQueue inputs as success; setup never calls
SetQueueAttributes.

### Authoritative-apply

Setup writes declared state to declared resources unconditionally. Non-declared
tags or non-declared SNS subscriptions are left untouched, not detected, not
logged. On attribute conflict (`QueueNameExists`), setup hard-fails and asks the
operator to delete or rename, since AWS does not allow `CreateQueue` to
overwrite attributes.

### IAM

Separate setup vs runtime roles.

| Phase   | Permissions                                                                             |
| ------- | --------------------------------------------------------------------------------------- |
| Setup   | `sqs:CreateQueue`, `sqs:GetQueueAttributes`, `sqs:TagQueue`, optionally `sns:Subscribe` |
| Runtime | `sqs:ReceiveMessage`, `sqs:DeleteMessage`, `sqs:GetQueueUrl`, `sqs:GetQueueAttributes`  |

### DLQ defaults

When `setup.deadLetterQueue.create: true`, walkerOS provisions a sibling DLQ
named `<queueName>-dlq` (or `<queueName>-dlq.fifo` for FIFO). The DLQ inherits
the parent's `region` and `tags`, plus `walkerOS: 'dlq'`. Retention is extended
to 14 days (AWS max). Visibility timeout, max message size, and KMS default to
AWS defaults rather than inheriting. No nested DLQ-of-DLQ.

### SNS subscription

When `setup.subscribeToSnsTopic` is set, walkerOS calls `sns.SubscribeCommand`
with the queue ARN as endpoint and writes a queue policy with deterministic Sid
`walkerOSAllowSNSPublish-<sourceId>` so re-runs upsert in place. Operators who
manage policies externally should leave `subscribeToSnsTopic` unset and add the
subscription via Terraform or console.

### Decoders

| Decoder | Behavior                                                                  |
| ------- | ------------------------------------------------------------------------- |
| `json`  | Default. `JSON.parse(body)`. Throws on parse failure.                     |
| `text`  | Forwards body string under `data.payload`.                                |
| `raw`   | Forwards `Buffer.from(body, 'utf8')` base64-encoded under `data.payload`. |

### Flow control

| Setting             | Default     | Description                             |
| ------------------- | ----------- | --------------------------------------- |
| `maxMessages`       | 10 (cap 10) | Receive batch size.                     |
| `waitTimeSeconds`   | 20 (cap 20) | Long-poll duration. SQS hard cap is 20. |
| `visibilityTimeout` | queue value | Per-receive override.                   |

### Error handling

| `onPushError` | Behavior                                                                         |
| ------------- | -------------------------------------------------------------------------------- |
| `nack`        | Default. Skip `DeleteMessage` so SQS redelivers when visibility timeout expires. |
| `ack`         | Call `DeleteMessage` even on push failure. Drops the message.                    |

SQS has no explicit nack RPC; redelivery is automatic when visibility timeout
expires without a `DeleteMessage`.

### See also

- [AWS Lambda source](#lambda-source) (this package's other source).
- [AWS SNS destination](https://www.walkeros.io/docs/destinations/server/sns)
  for the standard SNS-to-SQS fan-out pattern.

## License

MIT

## Support

- [Documentation](https://www.walkeros.io/docs)
- [GitHub Issues](https://github.com/elbwalker/walkerOS/issues)
- [Discord Community](https://discord.gg/elbwalker)
