import type { Flow } from '@walkeros/core';

export const lambdaPost: Flow.StepExample = {
  title: 'Lambda POST',
  description:
    'An API Gateway v2 HTTP POST with a JSON body is converted into a walker elb event.',
  trigger: { type: 'POST' },
  in: {
    version: '2.0',
    requestContext: {
      http: { method: 'POST', path: '/collect' },
      requestId: 'req-123',
    },
    body: JSON.stringify({
      event: 'page view',
      data: { title: 'Home' },
    }),
    isBase64Encoded: false,
  },
  out: [
    [
      'elb',
      {
        name: 'page view',
        data: { title: 'Home' },
      },
    ],
  ],
};

export const apiGatewayV1Post: Flow.StepExample = {
  title: 'API Gateway v1 POST',
  description:
    'A REST API Gateway v1 POST request with a JSON body is converted into a walker elb event.',
  trigger: { type: 'POST' },
  in: {
    httpMethod: 'POST',
    path: '/collect',
    requestContext: {
      requestId: 'req-789',
      identity: { sourceIp: '203.0.113.42' },
    },
    queryStringParameters: null,
    body: JSON.stringify({
      event: 'page view',
      data: { title: 'Home' },
    }),
    isBase64Encoded: false,
  },
  out: [
    [
      'elb',
      {
        name: 'page view',
        data: { title: 'Home' },
      },
    ],
  ],
};

export const lambdaGet: Flow.StepExample = {
  title: 'Lambda GET',
  description:
    'An API Gateway v2 HTTP GET with query parameters is parsed into an elb event payload.',
  trigger: { type: 'GET' },
  in: {
    version: '2.0',
    requestContext: {
      http: { method: 'GET', path: '/collect' },
      requestId: 'req-456',
    },
    rawQueryString: 'e=page+view&d=%7B%22title%22%3A%22Home%22%7D',
    isBase64Encoded: false,
  },
  out: [
    [
      'elb',
      {
        e: 'page view',
        d: '{"title":"Home"}',
      },
    ],
  ],
};
