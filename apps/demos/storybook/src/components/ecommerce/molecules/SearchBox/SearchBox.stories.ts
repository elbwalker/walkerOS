import type { Meta, StoryObj } from '@storybook/react-vite';
import { SearchBox } from './SearchBox';

const meta: Meta<typeof SearchBox> = {
  title: 'Ecommerce/Molecules/SearchBox',
  component: SearchBox,
  parameters: {
    layout: 'centered',
  },
  tags: ['ecommerce'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: 'Search products...',
    onSearch: (query: string) => alert(`Searching for: ${query}`),
  },
};

export const Disabled: Story = {
  args: {
    placeholder: 'Search disabled...',
    disabled: true,
  },
};

export const Large: Story = {
  args: {
    placeholder: 'Large search box...',
    size: 'large',
    onSearch: (query: string) => console.log(`Searching for: ${query}`),
  },
};

export const Small: Story = {
  args: {
    placeholder: 'Small search...',
    size: 'small',
    onSearch: (query: string) => console.log(`Searching for: ${query}`),
  },
};
