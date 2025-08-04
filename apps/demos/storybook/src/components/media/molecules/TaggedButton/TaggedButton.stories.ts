import type { Meta, StoryObj } from '@storybook/react-vite';
import { TaggedButton } from './TaggedButton';

const meta: Meta<typeof TaggedButton> = {
  title: 'Media/Molecules/TaggedButton',
  component: TaggedButton,
  parameters: {
    layout: 'centered',
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

export const WatchNow: Story = {
  args: {
    label: 'Watch Now',
    dataElb: {
      entity: 'page',
      action: 'watch',
    },
    primary: true,
  },
};

export const LearnMore: Story = {
  args: {
    label: 'Learn More',
    dataElb: {
      entity: 'page',
      action: 'learn',
    },
  },
};
