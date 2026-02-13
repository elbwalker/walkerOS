import type { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Expected Lambda response outputs.
 * Tests verify implementation produces these.
 */

// Successful event processing
export const successResponse: Partial<APIGatewayProxyResult> = {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: expect.stringContaining('"success":true'),
};

// Health check response
export const healthResponse: Partial<APIGatewayProxyResult> = {
  statusCode: 200,
  body: expect.stringContaining('"status":"ok"'),
};

// Pixel tracking response
export const pixelResponse: Partial<APIGatewayProxyResult> = {
  statusCode: 200,
  headers: expect.objectContaining({
    'Content-Type': 'image/gif',
  }),
  isBase64Encoded: true,
};

// Error responses
export const invalidBodyResponse: Partial<APIGatewayProxyResult> = {
  statusCode: 400,
  body: expect.stringContaining('"success":false'),
};
