export type SuggestionTile = {
  label: string;
  description?: string;
  prompt: string;
  autoSend?: boolean;
};

export interface FlowCanvasPayload {
  flowId?: string;
  configName: string;
  platform: 'web' | 'server';
  flowConfig: Record<string, unknown>;
  highlight?: { stepAddress: string; reason: string };
  suggestions?: SuggestionTile[];
}

export interface FlowCanvasToolResult extends FlowCanvasPayload {
  kind: 'flow-canvas';
}

/**
 * Tool-result helper that marks a response as renderable as a FlowCanvas.
 * The chat UI inspects `structuredContent.kind === 'flow-canvas'` and mounts
 * a `FlowCanvasBubble` instead of the generic JSON fallback. The `content[0]`
 * text is the same JSON stringified — the LLM sees a self-describing object.
 */
export function flowCanvasResult(payload: FlowCanvasPayload) {
  const structured: FlowCanvasToolResult = { kind: 'flow-canvas', ...payload };
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(structured, null, 2),
      },
    ],
    structuredContent: structured as unknown as Record<string, unknown> & {
      kind: 'flow-canvas';
    },
  };
}

export function isFlowCanvasResult(v: unknown): v is FlowCanvasToolResult {
  return (
    typeof v === 'object' &&
    v !== null &&
    (v as { kind?: unknown }).kind === 'flow-canvas'
  );
}
