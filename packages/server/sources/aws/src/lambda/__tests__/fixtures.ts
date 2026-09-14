import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

// Shared API Gateway event fixtures. Both envelopes describe the same logical
// request, which is what lets a test assert that v1 and v2 converge.

export function createMockEventV1(
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
export function createMockEventV2(
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
