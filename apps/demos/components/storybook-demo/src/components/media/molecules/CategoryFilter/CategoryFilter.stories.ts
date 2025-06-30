import type { Meta, StoryObj } from '@storybook/react';
import { CategoryFilter } from './CategoryFilter';

const meta: Meta<typeof CategoryFilter> = {
  title: 'Molecules/CategoryFilter',
  component: CategoryFilter,
  parameters: {
    layout: 'centered',
  },
  tags: ['media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    activeCategory: 'all',
    onCategoryChange: (category) => console.log(`Selected category: ${category}`),
  },
};

export const NewsSelected: Story = {
  args: {
    activeCategory: 'news',
    onCategoryChange: (category) => alert(`Switched to: ${category}`),
  },
};

export const StarsSelected: Story = {
  args: {
    activeCategory: 'stars',
    onCategoryChange: (category) => console.log(`Category changed: ${category}`),
  },
};

export const LifeSelected: Story = {
  args: {
    activeCategory: 'life',
    onCategoryChange: (category) => console.log(`Category selected: ${category}`),
  },
};