import type { Meta, StoryObj } from '@storybook/react-vite';
import { BannerText } from './BannerText';

const meta: Meta<typeof BannerText> = {
  title: 'Media/Molecules/BannerText',
  component: BannerText,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TonightsHighlight: Story = {
  args: {
    headline: "Tonight's Highlight",
    subtitle: 'Balancing Work and Passion',
  },
};

export const ActivateKidsMode: Story = {
  args: {
    headline: 'Activate Kids Mode',
    subtitle: 'Create a safe space for younger viewers.',
  },
};
