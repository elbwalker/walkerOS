import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '@iconify/react';

/**
 * Icon - Iconify icon component
 *
 * Re-exported from @iconify/react for consistent imports.
 * Use any Iconify icon name (e.g., 'mdi:home', 'lucide:settings').
 *
 * @see https://icon-sets.iconify.design/
 */
const meta: Meta<typeof Icon> = {
  title: 'Atoms/Icon',
  component: Icon,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Icon>;

export const Default: Story = {
  args: {
    icon: 'mdi:home',
    width: 24,
    height: 24,
  },
};

export const CommonIcons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Icon icon="mdi:home" width={24} />
      <Icon icon="mdi:cog" width={24} />
      <Icon icon="mdi:account" width={24} />
      <Icon icon="mdi:magnify" width={24} />
      <Icon icon="mdi:plus" width={24} />
      <Icon icon="mdi:delete" width={24} />
      <Icon icon="mdi:pencil" width={24} />
      <Icon icon="mdi:check" width={24} />
      <Icon icon="mdi:close" width={24} />
      <Icon icon="mdi:chevron-down" width={24} />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Icon icon="mdi:star" width={16} />
      <Icon icon="mdi:star" width={24} />
      <Icon icon="mdi:star" width={32} />
      <Icon icon="mdi:star" width={48} />
    </div>
  ),
};

export const CustomIcon: Story = {
  args: {
    icon: 'walkeros:piwik-pro',
    width: 48,
    height: 48,
  },
};
