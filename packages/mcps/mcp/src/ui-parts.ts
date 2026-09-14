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
  /**
   * Absolute link to this flow's page in the app, from `links.flow`.
   *
   * Named for the `appBaseUrl()` seam it is built from, and never `url`: that
   * is a field several app responses already use for something of their own
   * (a deployment's `url` is where it SERVES), and one key meaning one thing
   * across every tool is what keeps a link from ever landing on top of it.
   *
   * Optional because a tool that cannot name the project or the flow emits no
   * link rather than a guess, and because the in-app chat renders the canvas
   * itself and has no use for a link to the page it is already on.
   */
  appUrl?: string;
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
