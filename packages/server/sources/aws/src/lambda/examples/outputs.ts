import type { APIGatewayProxyResult } from 'aws-lambda';

/**
 * Expected Lambda response outputs.
 * Tests verify implementation produces these.
 */

// Successful event processing
// Shape from: createResponse(200, { success: true, ... }, corsHeaders, requestId)
export const successResponse: APIGatewayProxyResult = {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600',
  },
  body: JSON.stringify({ success: true }),
  isBase64Encoded: false,
};

// Health check response
// Shape from: createResponse(200, { status: 'ok', ... }, corsHeaders, requestId)
export const healthResponse: APIGatewayProxyResult = {
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600',
  },
  body: JSON.stringify({ status: 'ok' }),
  isBase64Encoded: false,
};

// Pixel tracking response
// Shape from: createPixelResponse(corsHeaders, requestId)
export const pixelResponse: APIGatewayProxyResult = {
  statusCode: 200,
  headers: {
    'Content-Type': 'image/gif',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600',
  },
  body: 'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  isBase64Encoded: true,
};

// Error responses
// Shape from: createResponse(400, { success: false, error: '...' }, corsHeaders, requestId)
export const invalidBodyResponse: APIGatewayProxyResult = {
  statusCode: 400,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600',
  },
  body: JSON.stringify({ success: false, error: 'Invalid request' }),
  isBase64Encoded: false,
};
