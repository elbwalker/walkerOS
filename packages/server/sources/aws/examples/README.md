# AWS Lambda Deployment Examples

This directory contains working deployment examples for the walkerOS AWS Lambda
source.

## Files

- **`basic-handler.ts`** - Recommended Lambda handler with singleton pattern
- **`sam-template.yaml`** - AWS SAM deployment template
- **`serverless.yml`** - Serverless Framework configuration
- **`cdk-stack.ts`** - AWS CDK TypeScript stack

## Quick Start

### 1. Build Your Handler

```bash
# Use the basic handler as a starting point
cp examples/basic-handler.ts src/index.ts

# Add your destinations
# Edit src/index.ts and add destinations to startFlow()

# Build
npm run build
```

### 2. Deploy with SAM

```bash
# Copy template
cp examples/sam-template.yaml template.yaml

# Deploy
sam build
sam deploy --guided
```

### 3. Test

```bash
# Health check
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/Prod/health

# Send event
curl -X POST https://your-api-id.execute-api.us-east-1.amazonaws.com/Prod/collect \
  -H "Content-Type: application/json" \
  -d '{"event": "page view", "data": {"title": "Test"}}'
```

## Local Testing

### SAM CLI

```bash
sam local start-api
curl http://localhost:3000/collect
```

### Serverless Offline

```bash
npm install --save-dev serverless-offline
serverless offline
```

## Architecture Choices

### Lambda Function URL

- **Simplest**: No API Gateway needed
- **Lowest cost**: No API Gateway charges
- **Best for**: Internal tools, MVPs
- **Limitations**: Less control over routing/throttling

### API Gateway HTTP API (v2)

- **Recommended**: Good balance of features and cost
- **Lower cost**: ~70% cheaper than REST API
- **Best for**: Production deployments
- **Features**: JWT authorization, CORS, throttling

### API Gateway REST API (v1)

- **Most features**: WAF, API keys, usage plans
- **Higher cost**: More expensive than HTTP API
- **Best for**: Complex requirements, enterprise
- **Features**: Everything in HTTP API + more

## Production Checklist

- [ ] Configure CloudWatch log retention
- [ ] Set Lambda reserved concurrency
- [ ] Enable X-Ray tracing
- [ ] Configure CloudWatch alarms
- [ ] Set up API Gateway throttling
- [ ] Use custom domain name
- [ ] Enable AWS WAF (if using REST API)
- [ ] Configure VPC (if accessing private resources)
- [ ] Set up proper IAM roles for destinations
- [ ] Enable CloudTrail for API calls
