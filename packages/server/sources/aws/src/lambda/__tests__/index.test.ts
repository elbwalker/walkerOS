import { sourceLambda } from '../index';
import type { EventRequest, LambdaEvent, LambdaContext, Types } from '../types';
import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';
import type { Source } from '@walkeros/core';
import { createMockLogger } from '@walkeros/core';
import * as examples from '../examples';

// Mock API Gateway v1 event
function createMockEventV1(
  method = 'POST',
  body?: string,
  queryStringParameters?: Record<string, string>,
  headers?: Record<string, string>,
): APIGatewayProxyEvent {
  return {
    httpMethod: method,
    body: body ?? null,
    queryStringParameters: queryStringParameters ?? null,
    headers: headers ?? {},
    isBase64Encoded: false,
    path: '/collect',
    resource: '/collect',
    pathParameters: null,
    stageVariables: null,
    requestContext: {
      accountId: '123456789012',
      apiId: 'api-id',
      protocol: 'HTTP/1.1',
      httpMethod: method,
      path: '/collect',
      stage: 'prod',
      requestId: 'request-id',
      requestTimeEpoch: Date.now(),
      resourceId: 'resource-id',
      resourcePath: '/collect',
      identity: {
        sourceIp: '127.0.0.1',
        userAgent: 'test',
        accessKey: null,
        accountId: null,
        apiKey: null,
        apiKeyId: null,
        caller: null,
        clientCert: null,
        cognitoAuthenticationProvider: null,
        cognitoAuthenticationType: null,
        cognitoIdentityId: null,
        cognitoIdentityPoolId: null,
        principalOrgId: null,
        user: null,
        userArn: null,
      },
      authorizer: null,
    },
    multiValueHeaders: {},
    multiValueQueryStringParameters: null,
  };
}

// Mock API Gateway v2 event
function createMockEventV2(
  method = 'POST',
  body?: string,
  rawQueryString?: string,
  headers?: Record<string, string>,
): APIGatewayProxyEventV2 {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: '/collect',
    rawQueryString: rawQueryString ?? '',
    headers: headers ?? {},
    body: body ?? undefined,
    isBase64Encoded: false,
    requestContext: {
      accountId: '123456789012',
      apiId: 'api-id',
      domainName: 'api.example.com',
      domainPrefix: 'api',
      http: {
        method,
        path: '/collect',
        protocol: 'HTTP/1.1',
        sourceIp: '127.0.0.1',
        userAgent: 'test',
      },
      requestId: 'request-id',
      routeKey: '$default',
      stage: 'prod',
      time: new Date().toISOString(),
      timeEpoch: Date.now(),
    },
  };
}

// Mock Lambda context
function createMockContext(): LambdaContext {
  return {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test',
    memoryLimitInMB: '256',
    awsRequestId: 'request-id',
    logGroupName: '/aws/lambda/test',
    logStreamName: '2024/01/01/[$LATEST]abcd',
    getRemainingTimeInMillis: () => 3000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };
}

describe('sourceLambda', () => {
  let mockPush: jest.MockedFunction<(...args: unknown[]) => unknown>;
  let mockCommand: jest.MockedFunction<(...args: unknown[]) => unknown>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockPush = jest.fn().mockResolvedValue({
      event: { id: 'test-id' },
      ok: true,
    });
    mockCommand = jest.fn().mockResolvedValue({
      ok: true,
    });
    mockLogger = createMockLogger();
  });

  describe('initialization', () => {
    it('should initialize with default settings', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      expect(source.type).toBe('lambda');
      expect(source.config.settings).toEqual({
        cors: true,
        timeout: 30000,
        enablePixelTracking: true,
        healthPath: '/health',
      });
      expect(typeof source.push).toBe('function');
    });

    it('should merge custom settings with defaults', async () => {
      const config: Partial<Source.Config<Types>> = {
        settings: {
          cors: false,
          enablePixelTracking: false,
        },
      };

      const source = await sourceLambda(config, {
        push: mockPush as never,
        command: mockCommand as never,
        elb: jest.fn() as never,
        logger: mockLogger,
      });

      expect(source.config.settings).toEqual({
        cors: false,
        timeout: 30000,
        enablePixelTracking: false,
        healthPath: '/health',
      });
    });
  });

  describe('API Gateway v1 events', () => {
    it('should handle POST request with event data (v1)', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const eventRequest: EventRequest = {
        event: 'page view',
        data: { title: 'Test Page' },
      };

      const event = createMockEventV1('POST', JSON.stringify(eventRequest));
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(mockPush).toHaveBeenCalledWith({
        name: 'page view',
        data: { title: 'Test Page' },
        context: undefined,
        user: undefined,
        globals: undefined,
        consent: undefined,
      });
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toMatchObject({
        success: true,
        id: 'test-id',
        requestId: expect.any(String),
      });
    });

    it('should handle OPTIONS request (v1)', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1('OPTIONS');
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(204);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle GET request with pixel tracking (v1)', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1('GET', undefined, {
        event: 'page view',
        'data[title]': 'Test',
      });
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(mockPush).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('image/gif');
      expect(result.isBase64Encoded).toBe(true);
    });

    it('should reject GET when pixel tracking disabled (v1)', async () => {
      const source = await sourceLambda(
        { settings: { enablePixelTracking: false } },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1('GET');
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body)).toMatchObject({
        success: false,
        error: 'GET not allowed',
        requestId: expect.any(String),
      });
    });
  });

  describe('API Gateway v2 events', () => {
    it('should handle POST request with event data (v2)', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const eventRequest: EventRequest = {
        event: 'product view',
        data: { id: 'P123', name: 'Product' },
      };

      const event = createMockEventV2('POST', JSON.stringify(eventRequest));
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(mockPush).toHaveBeenCalledWith({
        name: 'product view',
        data: { id: 'P123', name: 'Product' },
        context: undefined,
        user: undefined,
        globals: undefined,
        consent: undefined,
      });
      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toMatchObject({
        success: true,
        id: 'test-id',
        requestId: expect.any(String),
      });
    });

    it('should handle OPTIONS request (v2)', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV2('OPTIONS');
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(204);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should handle GET request with query string (v2)', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV2(
        'GET',
        undefined,
        'event=page%20view&data[title]=Test',
      );
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(mockPush).toHaveBeenCalled();
      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('image/gif');
    });
  });

  describe('error handling', () => {
    it('should require request body for POST', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1('POST', null as unknown as string);
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        success: false,
        error: 'Request body is required',
        requestId: expect.any(String),
      });
    });

    it('should reject invalid event body', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1(
        'POST',
        JSON.stringify({ invalid: 'format' }),
      );
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        success: false,
        error: 'Invalid request format',
        requestId: expect.any(String),
      });
    });

    it('should handle event processing errors', async () => {
      const errorPush = jest
        .fn()
        .mockRejectedValue(new Error('Processing failed'));
      const source = await sourceLambda(
        {},
        {
          push: errorPush,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const eventRequest: EventRequest = {
        event: 'error event',
        data: { test: true },
      };

      const event = createMockEventV1('POST', JSON.stringify(eventRequest));
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(400);
      expect(JSON.parse(result.body)).toMatchObject({
        success: false,
        error: 'Processing failed',
        requestId: expect.any(String),
      });
    });

    it('should reject unsupported methods', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1('PUT');
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(405);
      expect(JSON.parse(result.body)).toMatchObject({
        success: false,
        error: 'Method not allowed',
        requestId: expect.any(String),
      });
    });
  });

  describe('CORS handling', () => {
    it('should set default CORS headers when enabled', async () => {
      const source = await sourceLambda(
        { settings: { cors: true } },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1('OPTIONS');
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
      expect(result.headers?.['Access-Control-Allow-Methods']).toBe(
        'GET, POST, OPTIONS',
      );
    });

    it('should set custom CORS headers', async () => {
      const source = await sourceLambda(
        {
          settings: {
            cors: {
              origin: ['https://example.com'],
              methods: ['POST'],
              headers: ['Content-Type'],
              credentials: true,
              maxAge: 7200,
            },
          },
        },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1('OPTIONS');
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.headers?.['Access-Control-Allow-Origin']).toBe(
        'https://example.com',
      );
      expect(result.headers?.['Access-Control-Allow-Methods']).toBe('POST');
      expect(result.headers?.['Access-Control-Allow-Credentials']).toBe('true');
      expect(result.headers?.['Access-Control-Max-Age']).toBe('7200');
    });

    it('should not set CORS headers when disabled', async () => {
      const source = await sourceLambda(
        { settings: { cors: false } },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1('OPTIONS');
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.headers?.['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });

  describe('base64 encoding', () => {
    it('should decode base64 encoded body', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const eventRequest: EventRequest = {
        event: 'test event',
        data: { encoded: true },
      };

      const encodedBody = Buffer.from(JSON.stringify(eventRequest)).toString(
        'base64',
      );
      const event = createMockEventV1('POST', encodedBody);
      event.isBase64Encoded = true;
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(mockPush).toHaveBeenCalledWith({
        name: 'test event',
        data: { encoded: true },
        context: undefined,
        user: undefined,
        globals: undefined,
        consent: undefined,
      });
      expect(result.statusCode).toBe(200);
    });
  });

  describe('example-based tests', () => {
    let env: Parameters<typeof sourceLambda>[1];

    beforeEach(() => {
      env = {
        push: mockPush as never,
        command: mockCommand as never,
        elb: jest.fn() as never,
        logger: mockLogger,
      };
    });

    it('processes v2 POST event correctly', async () => {
      const source = await sourceLambda({}, env);
      const context = createMockContext();

      const result = await source.push(
        examples.inputs.apiGatewayV2PostEvent,
        context,
      );

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('application/json');
      expect(result.headers?.['Access-Control-Allow-Origin']).toBe('*');
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });

    it('handles GET pixel tracking', async () => {
      const source = await sourceLambda({}, env);
      const context = createMockContext();

      const result = await source.push(
        examples.inputs.apiGatewayV2GetEvent,
        context,
      );

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('image/gif');
      expect(result.isBase64Encoded).toBe(true);
    });

    it('handles v1 POST event', async () => {
      const source = await sourceLambda({}, env);
      const context = createMockContext();

      const result = await source.push(
        examples.inputs.apiGatewayV1PostEvent,
        context,
      );

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body.success).toBe(true);
    });
  });

  describe('health check endpoint', () => {
    it('should respond to health check on configured path (v2)', async () => {
      const source = await sourceLambda(
        { settings: { healthPath: '/health' } },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV2('GET');
      event.rawPath = '/health';
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toMatchObject({
        status: 'ok',
        source: 'lambda',
      });
      expect(body.timestamp).toBeGreaterThan(0);
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('should respond to health check on configured path (v1)', async () => {
      const source = await sourceLambda(
        { settings: { healthPath: '/health' } },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1('GET');
      event.path = '/health';
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(200);
      const body = JSON.parse(result.body);
      expect(body).toMatchObject({
        status: 'ok',
        source: 'lambda',
      });
    });

    it('should not trigger health check on different path', async () => {
      const source = await sourceLambda(
        { settings: { healthPath: '/health' } },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV2('GET');
      event.rawPath = '/collect';
      event.rawQueryString = 'event=test';
      const context = createMockContext();

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['Content-Type']).toBe('image/gif');
    });
  });

  describe('logging', () => {
    it('should NOT log for successful requests (collector handles)', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const eventRequest: EventRequest = {
        event: 'page view',
        data: { title: 'Test' },
      };

      const event = createMockEventV1('POST', JSON.stringify(eventRequest));
      const context = createMockContext();

      await source.push(event, context);

      // NO logging for normal operations
      expect(mockLogger.debug).not.toHaveBeenCalled();
      expect(mockLogger.info).not.toHaveBeenCalled();
    });

    it('should log processing errors with context', async () => {
      const errorPush = jest
        .fn()
        .mockRejectedValue(new Error('Collector failed'));
      const source = await sourceLambda(
        {},
        {
          push: errorPush,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const eventRequest: EventRequest = {
        event: 'test event',
        data: { test: true },
      };

      const event = createMockEventV1('POST', JSON.stringify(eventRequest));
      const context = createMockContext();
      context.awsRequestId = 'req-123';

      await source.push(event, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Event processing failed',
        expect.objectContaining({
          error: expect.any(Error),
          eventName: 'test event',
          requestId: 'req-123',
        }),
      );
    });

    it('should log handler errors with context', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      // Completely invalid event structure that will cause parseEvent to throw
      const badEvent = null as any;
      const context = createMockContext();
      context.awsRequestId = 'req-456';

      await source.push(badEvent, context);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Lambda handler error',
        expect.objectContaining({
          error: expect.any(Error),
          requestId: 'req-456',
        }),
      );
    });
  });

  describe('request ID tracking', () => {
    it('should include request ID in successful response (v2)', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const eventRequest: EventRequest = {
        event: 'product view',
        data: { id: 'P123' },
      };

      const event = createMockEventV2('POST', JSON.stringify(eventRequest));
      const context = createMockContext();
      context.awsRequestId = 'test-request-id-123';

      const result = await source.push(event, context);

      expect(result.statusCode).toBe(200);
      expect(result.headers?.['X-Request-ID']).toBe('test-request-id-123');
      const body = JSON.parse(result.body);
      expect(body.requestId).toBe('test-request-id-123');
    });

    it('should include request ID in error responses', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      const event = createMockEventV1('POST', null as unknown as string);
      const context = createMockContext();
      context.awsRequestId = 'error-request-id';

      const result = await source.push(event, context);

      expect(result.headers?.['X-Request-ID']).toBe('error-request-id');
    });
  });

  describe('settings validation', () => {
    it('should reject invalid timeout value', async () => {
      await expect(
        sourceLambda(
          {
            settings: {
              timeout: 999999999, // Exceeds 900000ms Lambda limit
            },
          },
          {
            push: mockPush as never,
            command: mockCommand as never,
            elb: jest.fn() as never,
            logger: mockLogger,
          },
        ),
      ).rejects.toThrow();
    });

    it('should use default settings when none provided', async () => {
      const source = await sourceLambda(
        {},
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      expect(source.config.settings).toEqual({
        cors: true,
        timeout: 30000,
        enablePixelTracking: true,
        healthPath: '/health',
      });
    });

    it('should merge partial settings with defaults', async () => {
      const source = await sourceLambda(
        {
          settings: {
            cors: false,
          },
        },
        {
          push: mockPush as never,
          command: mockCommand as never,
          elb: jest.fn() as never,
          logger: mockLogger,
        },
      );

      expect(source.config.settings).toEqual({
        cors: false,
        timeout: 30000,
        enablePixelTracking: true,
        healthPath: '/health',
      });
    });
  });
});
