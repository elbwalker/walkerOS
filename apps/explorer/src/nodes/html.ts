/**
 * HTML Node
 * Node for editing HTML with walkerOS data attributes
 */

import { BaseNode } from './base';
import type {
  GraphNode,
  NodeConfig,
  CodeContent,
  NodeValue,
} from '../graph/types';

export interface HTMLNodeConfig extends NodeConfig {
  enabledTabs?: ('html' | 'css' | 'js')[];
  activeTab?: 'html' | 'css' | 'js';
  editable?: boolean;
}

export class HTMLNode extends BaseNode<CodeContent, CodeContent> {
  private codes: CodeContent = { html: '', css: '', js: '' };
  private activeTab: 'html' | 'css' | 'js' = 'html';
  private enabledTabs: Set<'html' | 'css' | 'js'>;
  protected editable: boolean;

  constructor(config: {
    id: string;
    position?: { x: number; y: number };
    nodeConfig?: HTMLNodeConfig;
  }) {
    super({
      ...config,
      type: 'html',
      nodeConfig: {
        ...config.nodeConfig,
        language: 'html',
        editable: config.nodeConfig?.editable ?? true,
      },
    });

    // Configuration
    this.editable = config.nodeConfig?.editable ?? true;
    this.enabledTabs = new Set(
      config.nodeConfig?.enabledTabs || ['html', 'css', 'js'],
    );
    this.activeTab = config.nodeConfig?.activeTab || 'html';

    // Initialize with example content
    this.codes = {
      html: this.getExampleHTML(),
      css: this.getExampleCSS(),
      js: this.getExampleJS(),
    };
  }

  protected initializePorts(): GraphNode['ports'] {
    return {
      input: [], // HTML node typically has no inputs (it's a source)
      output: [
        {
          id: 'code',
          type: 'output',
          dataType: 'code',
          label: 'Code Output',
        },
      ],
    };
  }

  protected getDefaultLabel(): string {
    return 'Code Editor';
  }

  async process(input?: NodeValue): Promise<CodeContent> {
    // For HTMLNode (source node), always use own values, ignore input
    const codes = { ...this.codes };

    // Validate HTML has walkerOS attributes
    if (codes.html && !this.hasWalkerAttributes(codes.html)) {
      console.warn(
        'HTML does not contain walkerOS data attributes (data-elb*)',
      );
    }

    // Update output ports
    this.setOutputValue(codes);

    return codes;
  }

  /**
   * Check if HTML contains walkerOS attributes
   */
  private hasWalkerAttributes(html: string): boolean {
    return /data-elb/i.test(html);
  }

  /**
   * Set code for specific tab
   */
  setCode(tab: 'html' | 'css' | 'js', code: string): void {
    this.codes[tab] = code;
    this.setValue(this.codes);
    this.setOutputValue(this.codes);
  }

  /**
   * Get code for specific tab
   */
  getCode(tab: 'html' | 'css' | 'js'): string {
    return this.codes[tab] || '';
  }

  /**
   * Get all codes
   */
  getAllCodes(): CodeContent {
    return { ...this.codes };
  }

  /**
   * Set all codes at once
   */
  setAllCodes(codes: Partial<CodeContent>): void {
    this.codes = { ...this.codes, ...codes };
    this.setValue(this.codes);
    this.setOutputValue(this.codes);
  }

  /**
   * Get active tab
   */
  getActiveTab(): 'html' | 'css' | 'js' {
    return this.activeTab;
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: 'html' | 'css' | 'js'): void {
    if (this.enabledTabs.has(tab)) {
      this.activeTab = tab;
    }
  }

  /**
   * Get enabled tabs
   */
  getEnabledTabs(): ('html' | 'css' | 'js')[] {
    return Array.from(this.enabledTabs);
  }

  /**
   * Add walkerOS attributes to an element
   */
  addWalkerAttribute(attribute: string, value: string): void {
    const html = this.getCode('html');
    // This is a simplified example - in production, use proper HTML parsing
    const updatedHtml = html.replace(
      /(<[^>]+)>/,
      `$1 ${attribute}="${value}">`,
    );
    this.setCode('html', updatedHtml);
  }

  /**
   * Get example HTML with walkerOS attributes
   */
  static getExampleHTML(): string {
    return `<div data-elb="product" data-elbcontext="stage:listing">
  <h3 data-elb-product="name:#innerText">Awesome Product</h3>
  <p data-elb-product="price:29.99" class="price">$29.99</p>
  <p data-elb-product="category:electronics" class="category">Electronics</p>
  <button 
    data-elbaction="click:view"
    data-elb-product="id:PROD-123"
    class="btn btn-primary"
  >
    View Details
  </button>
  <button 
    data-elbaction="click:add"
    data-elb-product="quantity:1"
    class="btn btn-success"
  >
    Add to Cart
  </button>
</div>`;
  }

  /**
   * Get example CSS
   */
  static getExampleCSS(): string {
    return `.product {
  padding: 20px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-family: system-ui, sans-serif;
}

.price {
  font-size: 24px;
  font-weight: bold;
  color: #059669;
  margin: 10px 0;
}

.category {
  color: #6b7280;
  font-size: 14px;
  margin-bottom: 15px;
}

.btn {
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  margin-right: 8px;
  transition: all 150ms ease;
}

.btn-primary {
  background: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

.btn-success {
  background: #10b981;
  color: white;
}

.btn-success:hover {
  background: #059669;
  transform: translateY(-1px);
}`;
  }

  /**
   * Get example JavaScript
   */
  static getExampleJS(): string {
    return `// Add interactive behavior
console.log('Product page loaded');

// Add hover effects
const buttons = document.querySelectorAll('.btn');
buttons.forEach(btn => {
  btn.addEventListener('mouseenter', () => {
    console.log('Button hovered:', btn.textContent);
  });
});

// Add click tracking
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-elbaction]')) {
    const action = e.target.getAttribute('data-elbaction');
    console.log('Walker action triggered:', action);
  }
});

// Simulate dynamic content
setTimeout(() => {
  const price = document.querySelector('.price');
  if (price) {
    price.style.color = '#dc2626';
    price.textContent = '$24.99 (Sale!)';
    console.log('Price updated!');
  }
}, 2000);`;
  }

  /**
   * Get example HTML (instance method)
   */
  getExampleHTML(): string {
    return HTMLNode.getExampleHTML();
  }

  /**
   * Get example CSS (instance method)
   */
  getExampleCSS(): string {
    return HTMLNode.getExampleCSS();
  }

  /**
   * Get example JS (instance method)
   */
  getExampleJS(): string {
    return HTMLNode.getExampleJS();
  }

  /**
   * Event handler for tab changes
   */
  onTabChange?(tab: 'html' | 'css' | 'js', code: string): void;
}
