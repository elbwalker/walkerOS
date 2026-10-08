import type { Meta, StoryObj } from '@storybook/react-vite';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Shop/Atoms/Select',
  component: Select,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Country: Story = {
  args: {
    name: 'country',
    autoComplete: 'country-name',
    options: ['United States', 'Canada', 'Mexico'],
    'aria-label': 'Country',
  },
};

export const Quantity: Story = {
  args: {
    name: 'quantity',
    options: ['1', '2', '3', '4', '5', '6', '7', '8'],
    className: 'w-auto',
    'aria-label': 'Quantity',
  },
};
