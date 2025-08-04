import type { Meta, StoryObj } from '@storybook/react-vite';
import { HeroBanner } from './HeroBanner';

const meta: Meta<typeof HeroBanner> = {
  title: 'Media/Organisms/HeroBanner',
  component: HeroBanner,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    dataElb: {
      name: 'walkerOS Data',
      description: 'walkerOS tracking configuration',
      control: { type: 'object' },
    },
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
