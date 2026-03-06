import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './header';
import { Button } from './button';
import { ButtonGroup } from './button-group';

/**
 * Header - Header component for boxes and panels
 *
 * Displays a label with optional action buttons.
 * Pairs with Footer for consistent box structure.
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
    label: 'Code Preview',
  },
};

export const WithButtons: Story = {
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

export const WithSingleButton: Story = {
  args: {
    label: 'Events',
    children: <Button>Clear</Button>,
  },
};
