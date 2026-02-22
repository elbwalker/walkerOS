export interface SSEEvent {
  type: string;
  data: string;
}

export interface SSEParseResult {
  parsed: SSEEvent[];
  remainder: string;
}

export function parseSSEEvents(buffer: string): SSEParseResult {
  const events: SSEEvent[] = [];
  const blocks = buffer.split('\n\n');
  const remainder = blocks.pop() || '';

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventType = 'message'; // SSE default per spec
    const dataLines: string[] = [];

    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
      // Ignore: comments (:), id:, retry:
    }

    if (dataLines.length > 0) {
      events.push({ type: eventType, data: dataLines.join('\n') });
    }
  }

  return { parsed: events, remainder };
}
