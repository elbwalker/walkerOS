import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { LanguageToggle } from './LanguageToggle';

const meta: Meta<typeof LanguageToggle> = {
  title: 'Shared/Molecules/LanguageToggle',
  component: LanguageToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
  args: {
    onToggle: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const English: Story = {
  args: { language: 'en' },
};

export const Elbish: Story = {
  args: { language: 'elbish' },
};
