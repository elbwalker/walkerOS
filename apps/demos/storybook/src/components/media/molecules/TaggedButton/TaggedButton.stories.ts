import type { Meta, StoryObj } from '@storybook/react-vite';
import { TaggedButton } from './TaggedButton';
import { walkerOSArgTypes } from '@walkeros/storybook-addon';

const meta: Meta<typeof TaggedButton> = {
  title: 'Media/Molecules/TaggedButton',
  component: TaggedButton,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    ...walkerOSArgTypes,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const WatchNow: Story = {
  args: {
    label: 'Watch Now',
    elbEntity: 'page',
    primary: true,
  },
};

export const LearnMore: Story = {
  args: {
    label: 'Learn More',
    elbEntity: 'page',
  },
};
