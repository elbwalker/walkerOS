# @walkeros/server-source-aws

AWS server sources for walkerOS - lightweight, single-purpose runtime adapters
for AWS services.

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
service: walkeros-collector

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

## License

MIT

## Support

- [Documentation](https://www.walkeros.io/docs)
- [GitHub Issues](https://github.com/elbwalker/walkerOS/issues)
- [Discord Community](https://discord.gg/elbwalker)
