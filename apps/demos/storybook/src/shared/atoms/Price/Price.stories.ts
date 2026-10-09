import type { Meta, StoryObj } from '@storybook/react-vite';
import { Price } from './Price';

const meta: Meta<typeof Price> = {
  title: 'Shared/Atoms/Price',
  component: Price,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Whole: Story = {
  args: {
    amount: 140,
    variant: 'body-lg',
  },
};

export const WithCents: Story = {
  args: {
    amount: 220,
    fractionDigits: 2,
  },
};

export const Fraction: Story = {
  args: {
    amount: 5.52,
  },
};
