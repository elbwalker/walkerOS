import type { Meta, StoryObj } from '@storybook/react';
import { ActionButton } from './ActionButton';
import { walkerOSArgTypes } from '@walkerOS/storybook-addon';

const meta: Meta<typeof ActionButton> = {
  title: 'Media/Molecules/ActionButton',
  component: ActionButton,
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
    elbData: 'typeasdasd:primary',
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
