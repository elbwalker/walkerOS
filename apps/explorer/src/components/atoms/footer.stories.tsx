import type { Meta, StoryObj } from '@storybook/react-vite';
import { Footer } from './footer';
import { ButtonGroup } from './button-group';

/**
 * Footer - Footer component for boxes and panels
 *
 * Provides a fixed-height footer area at the bottom of a box.
 * Pairs with Header for consistent box structure.
 */
const meta: Meta<typeof Footer> = {
  title: 'Atoms/Footer',
  component: Footer,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Footer>;

export const Default: Story = {
  args: {
    children: (
      <ButtonGroup
        buttons={[
          { label: 'Cancel', value: 'cancel' },
          { label: 'Save', value: 'save', active: true },
        ]}
        onButtonClick={() => {}}
      />
    ),
  },
};

export const WithText: Story = {
  args: {
    children: <span>Last saved: 2 minutes ago</span>,
  },
};
