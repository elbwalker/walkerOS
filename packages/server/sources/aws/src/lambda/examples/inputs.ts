import type { APIGatewayProxyEvent, APIGatewayProxyEventV2 } from 'aws-lambda';

/**
 * Real examples of Lambda events this source will receive.
 * These define the CONTRACT - implementation must handle these inputs.
 */

// API Gateway v2 (HTTP API) - POST with walker event
export const apiGatewayV2PostEvent: APIGatewayProxyEventV2 = {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/collect',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json',
    'user-agent': 'Mozilla/5.0',
  },
  body: JSON.stringify({
    event: 'page view',
    data: { title: 'Home Page', path: '/' },
    user: { id: 'user-123' },
  }),
  isBase64Encoded: false,
  requestContext: {
    accountId: '123456789012',
    apiId: 'api-id',
    domainName: 'api.example.com',
    domainPrefix: 'api',
    http: {
      method: 'POST',
      path: '/collect',
      protocol: 'HTTP/1.1',
      sourceIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    },
    requestId: 'request-123',
    routeKey: '$default',
    stage: 'prod',
    time: '01/Jan/2024:00:00:00 +0000',
    timeEpoch: 1704067200000,
  },
};

// API Gateway v2 - GET with query params (pixel tracking)
export const apiGatewayV2GetEvent: APIGatewayProxyEventV2 = {
  version: '2.0',
  routeKey: '$default',
  rawPath: '/collect',
  rawQueryString: 'event=button%20click&data[id]=cta&data[text]=Sign%20Up',
  headers: {},
  isBase64Encoded: false,
  requestContext: {
    accountId: '123456789012',
    apiId: 'api-id',
    domainName: 'api.example.com',
    domainPrefix: 'api',
    http: {
      method: 'GET',
      path: '/collect',
      protocol: 'HTTP/1.1',
      sourceIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
    },
    requestId: 'request-456',
    routeKey: '$default',
    stage: 'prod',
    time: '01/Jan/2024:00:00:01 +0000',
    timeEpoch: 1704067201000,
  },
};

// API Gateway v1 (REST API) - POST with walker event
export const apiGatewayV1PostEvent: APIGatewayProxyEvent = {
  httpMethod: 'POST',
  path: '/collect',
  body: JSON.stringify({
    event: 'product add',
    data: { id: 'P123', name: 'Laptop', price: 999 },
  }),
  headers: { 'content-type': 'application/json' },
  multiValueHeaders: {},
  isBase64Encoded: false,
  pathParameters: null,
  queryStringParameters: null,
  multiValueQueryStringParameters: null,
  stageVariables: null,
  resource: '/collect',
  requestContext: {
    accountId: '123456789012',
    apiId: 'api-id',
    protocol: 'HTTP/1.1',
    httpMethod: 'POST',
    path: '/collect',
    stage: 'prod',
    requestId: 'request-789',
    requestTimeEpoch: 1704067202000,
    resourceId: 'resource-id',
    resourcePath: '/collect',
    identity: {
      sourceIp: '1.2.3.4',
      userAgent: 'Mozilla/5.0',
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
};

// Health check request
export const healthCheckEvent: APIGatewayProxyEventV2 = {
  ...apiGatewayV2GetEvent,
  rawPath: '/health',
  rawQueryString: '',
  requestContext: {
    ...apiGatewayV2GetEvent.requestContext,
    http: {
      ...apiGatewayV2GetEvent.requestContext.http,
      path: '/health',
    },
  },
};

// Invalid event - malformed JSON
export const invalidJsonEvent: APIGatewayProxyEventV2 = {
  ...apiGatewayV2PostEvent,
  body: '{invalid json',
};

// Missing event field
export const missingEventField: APIGatewayProxyEventV2 = {
  ...apiGatewayV2PostEvent,
  body: JSON.stringify({ data: { foo: 'bar' } }),
};
