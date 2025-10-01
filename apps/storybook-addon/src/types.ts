// Import WalkerOS Property types
import type { WalkerOS } from '@walkeros/core';
import type { Walker } from '@walkeros/web-core';

export interface WalkerOSAddon {
  autoRefresh: boolean;
  prefix?: string;
  highlights?: {
    context: boolean;
    entity: boolean;
    property: boolean;
    action: boolean;
    globals: boolean;
  };
}

export interface AttributeNode {
  element: string;
  path: string;
  htmlMarkup?: string; // Store the HTML string instead of DOM reference
  attributes: {
    entity?: string;
    action?: string;
    context?: WalkerOS.Properties;
    globals?: WalkerOS.Properties;
    properties?: WalkerOS.Properties;
  };
  children: AttributeNode[];
}

// walkerOS tracking interface for clean component APIs
export interface DataElb {
  entity?: string;
  trigger?: string;
  action?: string;
  data?: WalkerOS.Properties;
  context?: WalkerOS.Properties;
  globals?: WalkerOS.Properties;
  link?: Record<string, string>;
}

// Storybook argTypes for DataElb interface
export const dataElbArgTypes = {
  dataElb: {
    name: 'walkerOS Data',
    description: 'walkerOS tracking configuration',
    control: { type: 'object' },
    table: {
      category: 'walkerOS',
    },
  },
};
