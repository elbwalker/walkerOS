import { sendRequestNode } from '../../';
import * as http from 'http';

jest.mock('http');

describe('sendRequestNode', () => {
  const data = { key: 'value' };
  const dataStringified = JSON.stringify({ key: 'value' });
  const url = 'http://example.com/';

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
  });

  test('http request', async () => {
    const response = await sendRequestNode(url, data);

    expect(http.request).toHaveBeenCalledWith(
      url,
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
