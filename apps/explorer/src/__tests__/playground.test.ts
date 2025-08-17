/**
 * Playground Component Tests
 */

import { createPlayground } from '../organisms/playground';
import { createGraph } from '../graph/api';
import { HTMLNode } from '../nodes/html';
import { MappingNode } from '../nodes/mapping';

describe('Playground Component', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates playground with default configuration', () => {
    const playground = createPlayground(container);

    expect(playground).toBeDefined();
    expect(playground.execute).toBeInstanceOf(Function);
    expect(playground.setHTML).toBeInstanceOf(Function);
    expect(playground.setMapping).toBeInstanceOf(Function);
    expect(playground.getGraph).toBeInstanceOf(Function);
    expect(playground.destroy).toBeInstanceOf(Function);
  });

  it('creates graph with connected nodes', () => {
    const playground = createPlayground(container);
    const graph = playground.getGraph();

    expect(graph).toBeDefined();

    // Check that nodes are created
    const state = graph.getState();
    expect(state.nodes.size).toBeGreaterThan(0);
    expect(state.edges.size).toBeGreaterThan(0);
  });

  it('can set HTML content', () => {
    const playground = createPlayground(container);
    const testHTML = '<div data-elb="test">Test Content</div>';

    playground.setHTML(testHTML);

    const graph = playground.getGraph();
    const htmlNode = graph.getNode('html-1') as any;
    expect(htmlNode).toBeDefined();
    expect(htmlNode.getCode()).toBe(testHTML);
  });

  it('can set mapping configuration', () => {
    const playground = createPlayground(container);
    const testMapping = {
      test: {
        click: {
          name: 'test_click',
          data: {
            map: {
              test_id: 'data.id',
            },
          },
        },
      },
    };

    playground.setMapping(testMapping);

    const graph = playground.getGraph();
    const mappingNode = graph.getNode('mapping-1') as any;
    expect(mappingNode).toBeDefined();
    expect(mappingNode.getMappingRules()).toEqual(testMapping);
  });

  it('provides example HTML with walkerOS attributes', () => {
    const exampleHTML = HTMLNode.getExampleHTML();

    expect(exampleHTML).toContain('data-elb');
    expect(exampleHTML).toContain('data-elbaction');
    expect(exampleHTML).toContain('product');
  });

  it('provides example mapping configuration', () => {
    const exampleMapping = MappingNode.getExampleMapping();

    expect(exampleMapping).toBeDefined();
    expect(exampleMapping.product).toBeDefined();
    if (exampleMapping.product) {
      expect(exampleMapping.product.view).toBeDefined();
      expect(exampleMapping.product.add).toBeDefined();
    }
  });

  it('can execute the graph pipeline', async () => {
    const playground = createPlayground(container, {
      initialHTML:
        '<button data-elb="product" data-elbaction="click:add">Add</button>',
      initialMapping: {
        product: {
          add: {
            name: 'add_to_cart',
          },
        },
      },
    });

    // Execute should not throw
    await expect(playground.execute()).resolves.not.toThrow();
  });

  it('validates graph before execution', () => {
    const playground = createPlayground(container);
    const graph = playground.getGraph();

    const validation = graph.validate();

    // Graph should be valid with default setup
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('can be destroyed cleanly', () => {
    const playground = createPlayground(container);

    playground.destroy();

    // Container should be empty after destroy
    expect(container.shadowRoot?.innerHTML || container.innerHTML).toBe('');
  });
});
