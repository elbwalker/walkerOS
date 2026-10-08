import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading } from './Heading';

const meta: Meta<typeof Heading> = {
  title: 'Shop/Atoms/Heading',
  component: Heading,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const SectionTitle: Story = {
  args: {
    level: 2,
    variant: 'title-plan',
    children: 'Recommendations',
  },
};

export const PageTitle: Story = {
  args: {
    level: 1,
    variant: 'heading-md',
    children: 'Everyday Ruck Snack',
  },
};

export const Hero: Story = {
  args: {
    level: 2,
    variant: 'heading-lg',
    children: 'Setting up tracking easily',
  },
};
