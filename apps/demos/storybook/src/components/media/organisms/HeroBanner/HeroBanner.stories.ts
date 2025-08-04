import type { Meta, StoryObj } from '@storybook/react-vite';
import { HeroBanner } from './HeroBanner';
import { walkerOSArgTypes } from '@walkeros/storybook-addon';

const meta: Meta<typeof HeroBanner> = {
  title: 'Media/Organisms/HeroBanner',
  component: HeroBanner,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    ...walkerOSArgTypes,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const LifeInCode: Story = {
  args: {
    title: 'Life in Code',
    subtitle: 'Balancing Passion and Work',
    buttonText: 'Explore Now',
    style: 1,
  },
};
