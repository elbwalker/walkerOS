import type { Meta, StoryObj } from '@storybook/react-vite';
import { PromotionHero } from './PromotionHero';

const meta: Meta<typeof PromotionHero> = {
  title: 'Shop/Organisms/PromotionHero',
  component: PromotionHero,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
