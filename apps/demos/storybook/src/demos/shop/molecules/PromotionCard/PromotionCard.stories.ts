import type { Meta, StoryObj } from '@storybook/react-vite';
import { PromotionCard } from './PromotionCard';
import { promotion } from '../../data';

const meta: Meta<typeof PromotionCard> = {
  title: 'Shop/Molecules/PromotionCard',
  component: PromotionCard,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs', 'shop'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: promotion,
};
