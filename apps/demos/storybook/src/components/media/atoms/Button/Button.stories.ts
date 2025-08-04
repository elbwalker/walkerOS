import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { walkerOSArgTypes } from '@walkeros/storybook-addon';

const meta: Meta<typeof Button> = {
  title: 'Media/Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['media'],
  argTypes: {
    backgroundColor: { control: 'color' },
    ...walkerOSArgTypes,
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Button',
  },
};
