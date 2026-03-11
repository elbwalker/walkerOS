import type { Meta, StoryObj } from '@storybook/react-vite';
import { ButtonGroup } from './button-group';
import { useState } from 'react';

/**
 * ButtonGroup - Segmented control for tab switching
 *
 * Displays multiple buttons in a grouped style. Commonly used for
 * tab navigation (HTML/CSS/JS) or view switching (Visual/Code).
 */
const meta: Meta<typeof ButtonGroup> = {
  component: ButtonGroup,
  title: 'Atoms/ButtonGroup',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ButtonGroup>;

/**
 * Default button group with tab selection
 *
 * Shows typical usage for tab switching with active state.
 */
export const Default: Story = {
  render: () => {
    const [activeTab, setActiveTab] = useState('html');

    return (
      <ButtonGroup
        buttons={[
          {
            label: 'Preview',
            value: 'preview',
            active: activeTab === 'preview',
          },
          { label: 'HTML', value: 'html', active: activeTab === 'html' },
          { label: 'CSS', value: 'css', active: activeTab === 'css' },
          { label: 'JS', value: 'js', active: activeTab === 'js' },
        ]}
        onButtonClick={setActiveTab}
      />
    );
  },
};
