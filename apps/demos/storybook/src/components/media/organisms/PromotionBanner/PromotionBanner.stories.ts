import type { Meta, StoryObj } from '@storybook/react-vite';
import { PromotionBanner } from './PromotionBanner';

const meta: Meta<typeof PromotionBanner> = {
  title: 'Media/Organisms/PromotionBanner',
  component: PromotionBanner,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const KidsMode: Story = {
  args: {
    headline: 'Activate Kids Mode',
    subtitle: 'Create a safe space for younger viewers.',
    buttonText: 'Activate Now',
    backgroundGradient: 'from-surface-2 to-surface',
  },
};

export const PremiumUpgrade: Story = {
  args: {
    headline: 'Upgrade to Premium',
    subtitle: 'Unlock exclusive content and ad-free viewing.',
    buttonText: 'Learn More',
    backgroundGradient: 'from-bg-2 to-surface-2',
  },
};
