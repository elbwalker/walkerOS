/**
 * Preview Node Integration Test
 * Tests real walkerOS integration with shadow DOM
 */

import { PreviewNode } from '../nodes/preview';

describe('PreviewNode Integration', () => {
  let node: PreviewNode;

  beforeEach(() => {
    node = new PreviewNode({
      id: 'test-preview',
      position: { x: 0, y: 0 },
    });
  });

  afterEach(() => {
    if (node) {
      node.onDestroy();
    }
  });

  it('creates PreviewNode with shadow DOM', () => {
    expect(node).toBeDefined();
    expect(node.getId()).toBe('test-preview');
    expect(node.getType()).toBe('preview');
  });

  it('renders HTML in shadow DOM', async () => {
    const html = '<div data-elb="test">Test Content</div>';

    const result = await node.process(html);

    // Should return an array (even if empty initially)
    expect(Array.isArray(result)).toBe(true);

    // Container should be created
    const container = node.getContainer();
    expect(container).toBeDefined();
  });

  it('has correct ports configuration', () => {
    const ports = node.getPorts();

    expect(ports.input).toHaveLength(1);
    expect(ports.input[0].id).toBe('html');
    expect(ports.input[0].dataType).toBe('html');
    expect(ports.input[0].required).toBe(true);

    expect(ports.output).toHaveLength(1);
    expect(ports.output[0].id).toBe('events');
    expect(ports.output[0].dataType).toBe('events');
  });

  it('clears events when requested', () => {
    node.clearEvents();
    const events = node.getDOMEvents();
    expect(events).toEqual([]);
  });

  it('handles HTML with walkerOS attributes', async () => {
    const html = `
      <button 
        data-elb="product" 
        data-elbaction="click:add"
        data-elb-product="id:123"
      >
        Add to Cart
      </button>
    `;

    await node.process(html);

    // Should process without errors
    expect(node.getContainer()).toBeDefined();
  });

  it('can be destroyed cleanly', () => {
    const container = node.getContainer();

    node.onDestroy();

    // Events should be cleared
    expect(node.getDOMEvents()).toEqual([]);
  });
});
