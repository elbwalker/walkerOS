import { describe, it, expect } from '@jest/globals';
import { flowCanvasResult, isFlowCanvasResult } from '../ui-parts';

describe('flowCanvasResult', () => {
  it('stamps kind: "flow-canvas" on structuredContent', () => {
    const r = flowCanvasResult({
      flowId: 'flow_a',
      configName: 'default',
      platform: 'web',
      flowConfig: { sources: {} },
    });
    expect(r.structuredContent.kind).toBe('flow-canvas');
    expect(r.structuredContent.flowId).toBe('flow_a');
    expect(r.content[0]?.type).toBe('text');
  });

  it('preserves suggestions + highlight when provided', () => {
    const r = flowCanvasResult({
      configName: 'default',
      platform: 'server',
      flowConfig: {},
      highlight: {
        stepAddress: 'web.sources.browser',
        reason: 'missing consent',
      },
      suggestions: [{ label: 'Fix it', prompt: 'Add consent', autoSend: true }],
    });
    expect(r.structuredContent.highlight).toEqual({
      stepAddress: 'web.sources.browser',
      reason: 'missing consent',
    });
    expect(r.structuredContent.suggestions).toHaveLength(1);
  });
});

describe('isFlowCanvasResult', () => {
  it('narrows by kind discriminator', () => {
    const r = flowCanvasResult({
      configName: 'default',
      platform: 'web',
      flowConfig: {},
    });
    expect(isFlowCanvasResult(r.structuredContent)).toBe(true);
    expect(isFlowCanvasResult({ random: true })).toBe(false);
    expect(isFlowCanvasResult(null)).toBe(false);
  });
});
