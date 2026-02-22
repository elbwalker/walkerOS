import { parseSSEEvents } from '../../core/sse.js';

describe('parseSSEEvents', () => {
  it('parses a single complete event', () => {
    const buffer = 'event: status\ndata: {"status":"bundling"}\n\n';
    const result = parseSSEEvents(buffer);

    expect(result.parsed).toEqual([
      { type: 'status', data: '{"status":"bundling"}' },
    ]);
    expect(result.remainder).toBe('');
  });

  it('parses multiple events', () => {
    const buffer =
      'event: status\ndata: {"status":"bundling"}\n\n' +
      'event: status\ndata: {"status":"published"}\n\n' +
      'event: done\ndata: {}\n\n';

    const result = parseSSEEvents(buffer);

    expect(result.parsed).toHaveLength(3);
    expect(result.parsed[0]).toEqual({
      type: 'status',
      data: '{"status":"bundling"}',
    });
    expect(result.parsed[1]).toEqual({
      type: 'status',
      data: '{"status":"published"}',
    });
    expect(result.parsed[2]).toEqual({ type: 'done', data: '{}' });
    expect(result.remainder).toBe('');
  });

  it('keeps incomplete block as remainder', () => {
    const buffer = 'event: status\ndata: {"status":"bundling"}\n\nevent: sta';
    const result = parseSSEEvents(buffer);

    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0]).toEqual({
      type: 'status',
      data: '{"status":"bundling"}',
    });
    expect(result.remainder).toBe('event: sta');
  });

  it('defaults event type to message when no event field', () => {
    const buffer = 'data: hello world\n\n';
    const result = parseSSEEvents(buffer);

    expect(result.parsed).toEqual([{ type: 'message', data: 'hello world' }]);
  });

  it('joins multi-line data fields', () => {
    const buffer = 'event: log\ndata: line1\ndata: line2\ndata: line3\n\n';
    const result = parseSSEEvents(buffer);

    expect(result.parsed).toEqual([
      { type: 'log', data: 'line1\nline2\nline3' },
    ]);
  });

  it('ignores comment lines', () => {
    const buffer = ': heartbeat\n\n';
    const result = parseSSEEvents(buffer);

    expect(result.parsed).toHaveLength(0);
    expect(result.remainder).toBe('');
  });

  it('ignores retry and id fields', () => {
    const buffer = 'retry: 3000\n\nevent: status\nid: 1\ndata: {"ok":true}\n\n';
    const result = parseSSEEvents(buffer);

    // retry block has no data lines, so it's skipped
    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0]).toEqual({
      type: 'status',
      data: '{"ok":true}',
    });
  });

  it('returns empty parsed for empty buffer', () => {
    const result = parseSSEEvents('');
    expect(result.parsed).toHaveLength(0);
    expect(result.remainder).toBe('');
  });

  it('returns empty parsed with only whitespace blocks', () => {
    const buffer = '\n\n\n\n';
    const result = parseSSEEvents(buffer);
    expect(result.parsed).toHaveLength(0);
  });

  it('handles incremental buffer accumulation', () => {
    // Simulate streaming: first chunk is incomplete
    let buffer = 'event: status\ndata: {"st';
    let result = parseSSEEvents(buffer);
    expect(result.parsed).toHaveLength(0);
    expect(result.remainder).toBe('event: status\ndata: {"st');

    // Second chunk completes the event
    buffer = result.remainder + 'atus":"active"}\n\n';
    result = parseSSEEvents(buffer);
    expect(result.parsed).toHaveLength(1);
    expect(result.parsed[0]).toEqual({
      type: 'status',
      data: '{"status":"active"}',
    });
    expect(result.remainder).toBe('');
  });

  it('trims leading space from data values', () => {
    const buffer = 'data:  spaced value\n\n';
    const result = parseSSEEvents(buffer);
    expect(result.parsed[0]?.data).toBe('spaced value');
  });
});
