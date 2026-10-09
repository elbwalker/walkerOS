import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './index';

/**
 * Icon - Iconify icon component
 *
 * Re-exported from @iconify/react. Importing it from the explorer also
 * registers the custom `walkeros:*` icons. Any Iconify icon name works too
 * (e.g., 'mdi:home', 'lucide:settings').
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

/**
 * The custom `walkeros:*` icons, sized as the website integrations list
 * renders them.
 */
export const Default: Story = {
  args: {
    icon: 'walkeros:piwik-pro',
    style: { width: 28, height: 28 },
  },
  render: (args) => (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <Icon {...args} />
      <Icon {...args} icon="walkeros:snowplow" />
    </div>
  ),
};
