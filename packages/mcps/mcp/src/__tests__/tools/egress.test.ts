import { mcpError } from '@walkeros/core';
import { scrubJson } from '@walkeros/core/node';
import { scrubbedError, scrubbedPushResult } from '../../tools/egress.js';

// The real scrubber; one test forces an unparseable scrub, which no real
// input produces (`scrubJson` masks numbers before serializing).
jest.mock('@walkeros/core/node', () => {
  const actual = jest.requireActual('@walkeros/core/node');
  return { ...actual, scrubJson: jest.fn(actual.scrubJson) };
});
const mockScrubJson = jest.mocked(scrubJson);

describe('scrubbedPushResult', () => {
  it('reports the push as done when the scrubbed text does not parse', () => {
    mockScrubJson.mockReturnValueOnce('{"success":true,"account":***}');

    const response = scrubbedPushResult(
      { success: true, duration: 7, error: 'kept out' },
      ['12345678'],
    );

    expect(response).toEqual({
      content: [{ type: 'text', text: '{"success":true,"account":***}' }],
      structuredContent: { success: true, duration: 7 },
    });
  });

  it('keeps success and duration out of masking', () => {
    const response = scrubbedPushResult(
      {
        success: true,
        duration: 1234567,
        elbResult: {
          ok: true,
          done: { api: { type: 'api', data: { account: 123456 } } },
        },
      },
      ['123456'],
    );

    const masked = {
      success: true,
      duration: 1234567,
      elbResult: {
        ok: true,
        done: { api: { type: 'api', data: { account: '***' } } },
      },
    };
    expect(response.structuredContent).toEqual(masked);
    expect(JSON.parse(response.content[0].text)).toEqual(masked);
  });
});

describe('scrubbedError', () => {
  it('keeps the text valid JSON for a numeric known value in details', () => {
    const error = Object.assign(new Error('rejected'), {
      details: [{ account: 12345678 }],
    });

    const response = scrubbedError(mcpError(error), ['12345678']);

    const masked = { error: 'rejected', details: [{ account: '***' }] };
    expect(response.structuredContent).toEqual(masked);
    expect(response.content).toEqual([
      { type: 'text', text: JSON.stringify(masked) },
    ]);
    expect(response.isError).toBe(true);
  });

  it('keeps the masked text when the response has no structured copy', () => {
    const response = scrubbedError(
      {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ error: 'step is required tok-known-1234' }),
          },
        ],
        isError: true,
      },
      ['tok-known-1234'],
    );

    expect(response.content).toEqual([
      { type: 'text', text: '{"error":"step is required ***"}' },
    ]);
    expect(response.isError).toBe(true);
  });
});
