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
      if (typeof callback === 'function') {
        callback(mockResponse);
      }
      return mockRequest;
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
    const response = await sendRequestNode(urlHttps, data);

    expect(https.request).toHaveBeenCalledWith(
      urlHttps,
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
});
