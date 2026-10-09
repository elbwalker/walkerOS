import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './header';
import { ButtonGroup } from './button-group';

/**
 * Header - Header component for boxes and panels
 *
 * Displays a label with optional action buttons.
 */
const meta: Meta<typeof Header> = {
  title: 'Atoms/Header',
  component: Header,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Header>;

export const Default: Story = {
  args: {
    label: 'Configuration',
    children: (
      <ButtonGroup
        buttons={[
          { label: 'Copy', value: 'copy' },
          { label: 'Reset', value: 'reset' },
        ]}
        onButtonClick={() => {}}
      />
    ),
  },
};
