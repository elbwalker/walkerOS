import { sendRequestNode } from '../../';
import * as http from 'http';
import * as https from 'https';

jest.mock('http');
jest.mock('https');

describe('sendRequestNode', () => {
  const data = { key: 'value' };
  const dataStringified = JSON.stringify({ key: 'value' });
  const urlHttp = 'http://example.com/';
  const urlHttps = 'https://example.com/';
  const urlBroken = 'http://broken';

  const mockRequest = {
    on: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    setTimeout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    const mockResponse = {
      statusCode: 200,
      statusMessage: 'OK',
      headers: { 'content-type': 'application/json' },
      on: jest.fn((event, callback) => {
        if (event === 'data') {
          callback(Buffer.from(dataStringified));
        } else if (event === 'end') {
          callback();
        }
      }),
    };

    const mockFn = (url, options, callback) => {
      const req = mockRequest;

      if (url === urlBroken) {
        req.on.mockImplementationOnce((event, handler) => {
          if (event === 'error') {
            handler(new Error('Request failed'));
          }
        });
      } else {
        if (typeof callback === 'function') {
          callback(mockResponse);
        }
      }

      return req;
    };

    (http.request as jest.Mock).mockImplementation(mockFn);
    (https.request as jest.Mock).mockImplementation(mockFn);
  });

  test('http request', async () => {
    const response = await sendRequestNode(urlHttp, data);

    expect(http.request).toHaveBeenCalledWith(
      urlHttp,
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
      }),
      expect.any(Function),
    );

    expect(mockRequest.write).toHaveBeenCalledWith(expect.any(String));

    expect(response).toEqual({
      ok: true,
      response: dataStringified,
      error: undefined,
    });

    expect(mockRequest.end).toHaveBeenCalled();
  });

  test('https request', async () => {
    await sendRequestNode(urlHttps, data);

    expect(https.request).toHaveBeenCalledWith(
      urlHttps,
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
      }),
      expect.any(Function),
    );
  });

  test('http request with error', async () => {
    const response = await sendRequestNode(urlBroken, data);

    expect(response).toEqual({
      ok: false,
      response: undefined,
      error: 'Request failed',
    });
  });
});
