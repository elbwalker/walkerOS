import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon, type IconName } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'Shared/Atoms/Icon',
  component: Icon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const names: IconName[] = [
  'star',
  'check',
  'check-circle',
  'x-circle',
  'info',
  'warning',
  'trash',
  'cart',
  'globe',
  'shield-check',
  'search',
  'profile',
  'slash',
  'facebook',
  'instagram',
  'twitter',
  'github',
  'youtube',
];

export const Star: Story = {
  args: {
    name: 'star',
    className: 'size-6 text-fg',
  },
};

export const WithLabel: Story = {
  args: {
    name: 'cart',
    label: 'Cart',
    className: 'size-6 text-fg',
  },
};

export const All: Story = {
  args: {
    name: 'star',
  },
  render: () => (
    <div className="grid grid-cols-4 gap-6 text-fg">
      {names.map((name) => (
        <div key={name} className="flex flex-col items-center gap-2">
          <Icon name={name} className="size-6" />
          <span className="text-small font-normal text-fg-2">{name}</span>
        </div>
      ))}
    </div>
  ),
};
