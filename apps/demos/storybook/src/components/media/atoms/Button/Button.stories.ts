import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Media/Atoms/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['media'],
  argTypes: {
    backgroundColor: { control: 'color' },
    dataElb: {
      control: { type: 'object' },
      description: 'walkerOS tracking configuration',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
    dataElb: {
      entity: 'button',
      action: 'click',
      data: { variant: 'primary' },
    },
  },
};

export const Secondary: Story = {
  args: {
    label: 'Button',
    dataElb: {
      entity: 'button',
      action: 'click',
      data: { variant: 'secondary' },
    },
  },
};
