import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';

const meta: Meta<typeof Card> = {
  title: 'Ecommerce/Molecules/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['ecommerce'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Card Title',
    description:
      'This is a simple card component that can display content with an optional action button.',
    actionLabel: 'Learn More',
    onAction: () => alert('Card action clicked!'),
  },
};

export const WithImage: Story = {
  args: {
    title: 'Beautiful Landscape',
    description:
      'A stunning view of mountains and valleys captured in this beautiful photograph.',
    imageUrl: 'https://picsum.photos/300/200?random=1',
    actionLabel: 'View Gallery',
    onAction: () => alert('Opening gallery...'),
  },
};

export const Outlined: Story = {
  args: {
    title: 'Outlined Card',
    description: 'This card uses the outlined variant with a colored border.',
    variant: 'outlined',
    actionLabel: 'Action',
    onAction: () => console.log('Outlined card action'),
  },
};

export const Elevated: Story = {
  args: {
    title: 'Elevated Card',
    description: 'This card has an elevated appearance with shadow effects.',
    variant: 'elevated',
    actionLabel: 'Click Me',
    onAction: () => console.log('Elevated card action'),
  },
};

export const NoAction: Story = {
  args: {
    title: 'Information Card',
    description: 'This card displays information without any action buttons.',
    imageUrl: 'https://picsum.photos/300/200?random=2',
  },
};
