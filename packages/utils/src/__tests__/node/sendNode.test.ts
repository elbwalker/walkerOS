import { sendNode } from '../../';
import * as http from 'http';
import * as https from 'https';

jest.mock('http');
jest.mock('https');

describe('sendNode', () => {
  const data = { key: 'value' };
  const dataStringified = JSON.stringify({ key: 'value' });
  const urlHttp = 'http://example.com/';
  const urlHttps = 'https://example.com/';
  const urlBroken = 'http://broken';
  const urlTimeout = 'http://timeout';

  const mockRequest = {
    on: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    setTimeout: jest.fn(),
    destroy: jest.fn(),
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
      } else if (url === urlTimeout) {
        req.on.mockImplementationOnce((event, handler) => {
          if (event === 'timeout') {
            handler();
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
    const response = await sendNode(urlHttp, data);

    expect(http.request).toHaveBeenCalledWith(
      urlHttp,
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
      }),
      expect.any(Function),
    );

    expect(mockRequest.write).toHaveBeenCalledWith(expect.any(String));

    expect(response).toStrictEqual({
      ok: true,
      data: dataStringified,
      error: undefined,
    });

    expect(mockRequest.end).toHaveBeenCalled();
  });

  test('https request', async () => {
    await sendNode(urlHttps, data);

    expect(https.request).toHaveBeenCalledWith(
      urlHttps,
      expect.objectContaining({
        method: 'POST',
        headers: expect.any(Object),
      }),
      expect.any(Function),
    );
  });

  test('on error', async () => {
    const response = await sendNode(urlBroken, data);

    expect(response).toStrictEqual({
      ok: false,
      error: 'Request failed',
    });
  });

  test('on timeout', async () => {
    const timeoutHandler = jest.fn();

    mockRequest.on.mockImplementation((event, handler) => {
      if (event === 'timeout') {
        timeoutHandler.mockImplementation(handler);
      }
    });

    const responsePromise = sendNode(urlTimeout, data, {
      timeout: 1000,
    });

    timeoutHandler(); // Trigger the timeout handler manually

    const response = await responsePromise;

    expect(mockRequest.setTimeout).toHaveBeenCalledWith(1000);
    expect(mockRequest.destroy).toHaveBeenCalled();

    expect(response).toStrictEqual({
      ok: false,
      error: 'Request timeout',
    });
  });
});
