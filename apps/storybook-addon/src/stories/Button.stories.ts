import type { Meta, StoryObj } from '@storybook/react-vite';

import { Button } from './Button';
import { fn } from 'storybook/test';
import { walkerOSArgTypes } from '../types';

// More on how to set up stories at: https://storybook.js.org/docs/react/writing-stories/introduction#default-export
const meta: Meta<typeof Button> = {
  title: 'Example/Button',
  component: Button,
  // More on argTypes: https://storybook.js.org/docs/react/api/argtypes
  argTypes: {
    backgroundColor: {
      control: 'color',
      table: { category: 'Styling' },
    },
    ...walkerOSArgTypes,
  },
  args: {
    onClick: fn(),
  },
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
The Button component demonstrates how to integrate walkerOS tagging with Storybook components.

## walkerOS Integration

This component extends the \`WalkerOSTagging\` interface to provide:
- **Entity**: What type of element this is (button, form, etc.)
- **Action**: What action is being tracked (click, submit, etc.)  
- **Context**: Additional data as key:value pairs

## Usage Example

\`\`\`tsx
import { Button } from './Button';

<Button 
  label="Add to Cart"
  elbEntity="product"
  elbAction="click:add" 
  elbContext="shopping:cart"
/>
\`\`\`

The walkerOS controls will be grouped under "🏷️ walkerOS Tagging" in the Controls panel.
        `,
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

// More on component templates: https://storybook.js.org/docs/react/writing-stories/introduction#using-args
export const Primary: Story = {
  // More on args: https://storybook.js.org/docs/react/writing-stories/args
  args: {
    primary: true,
    label: 'Submit',
    elbTrigger: 'click',
    elbData: 'cta:#innerText;type:primary',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Cancel',
    elbTrigger: 'click',
    elbData: 'cta:#innerText;type:secondary',
  },
};

export const WithoutTracking: Story = {
  name: 'Without walkerOS Tracking',
  args: {
    primary: true,
    label: 'Untracked Button',
    // No walkerOS props - shows how component works without tracking
  },
};

export const ComplexTracking: Story = {
  name: 'Add to cart',
  args: {
    primary: true,
    label: 'Add to Cart',
    elbEntity: 'product',
    elbTrigger: 'hover;click',
    elbAction: 'add',
    elbContext: 'shopping:cart',
  },
};
