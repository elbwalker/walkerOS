import type { Flow } from '@walkeros/core';

export const lambdaPost: Flow.StepExample = {
  in: {
    version: '2.0',
    requestContext: {
      http: { method: 'POST', path: '/collect' },
      requestId: 'req-123',
    },
    body: JSON.stringify({
      name: 'page view',
      data: { title: 'Home' },
    }),
    isBase64Encoded: false,
  },
  out: {
    name: 'page view',
    data: { title: 'Home' },
    entity: 'page',
    action: 'view',
  },
};

export const apiGatewayV1Post: Flow.StepExample = {
  in: {
    httpMethod: 'POST',
    path: '/collect',
    requestContext: {
      requestId: 'req-789',
      identity: { sourceIp: '203.0.113.42' },
    },
    queryStringParameters: null,
    body: JSON.stringify({
      name: 'page view',
      data: { title: 'Home' },
    }),
    isBase64Encoded: false,
  },
  out: {
    name: 'page view',
    data: { title: 'Home' },
    entity: 'page',
    action: 'view',
  },
};

export const lambdaGet: Flow.StepExample = {
  in: {
    version: '2.0',
    requestContext: {
      http: { method: 'GET', path: '/collect' },
      requestId: 'req-456',
    },
    rawQueryString: 'e=page+view&d=%7B%22title%22%3A%22Home%22%7D',
    isBase64Encoded: false,
  },
  out: {
    name: 'page view',
    data: { title: 'Home' },
    entity: 'page',
    action: 'view',
  },
};
