import type { SendDataValue, SendResponse, SendHeaders } from '../';
import { getHeaders, transformData, tryCatch } from '../';
import * as http from 'http';
import * as https from 'https';

export interface SendNodeOptions {
  headers?: SendHeaders;
  method?: string;
  timeout?: number;
}

export function sendNode(
  url: string,
  data?: SendDataValue,
  options: SendNodeOptions = {},
): Promise<SendResponse> {
  const headers = getHeaders(options.headers);
  const body = transformData(data);
  const method = options.method || 'POST';
  const timeout = options.timeout || 5000;

  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    const options: http.RequestOptions | https.RequestOptions = {
      method,
      headers,
    };

    const req = lib.request(urlObj, options, (res) => {
      const chunks: Uint8Array[] = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const ok = !!(
          res.statusCode &&
          res.statusCode >= 200 &&
          res.statusCode < 300
        );

        const responseData = Buffer.concat(chunks).toString();
        const parsedData = tryCatch(
          JSON.parse,
          () => responseData,
        )(responseData);

        resolve({
          ok,
          data: parsedData,
          error: ok ? undefined : `${res.statusCode} ${res.statusMessage}`,
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        ok: false,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        ok: false,
        error: 'Request timeout',
      });
    });

    req.setTimeout(timeout);

    if (body) req.write(body);

    req.end();
  });
}
