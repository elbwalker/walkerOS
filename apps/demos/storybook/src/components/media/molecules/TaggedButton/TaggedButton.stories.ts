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
      entity: 'button',
      action: 'watch',
      data: {
        content_type: 'video',
        content_id: 'episode_123',
        position: 'hero_banner',
      },
      context: {
        section: 'media_player',
        screen: 'homepage',
      },
    },
    primary: true,
  },
};

export const LearnMore: Story = {
  args: {
    label: 'Learn More',
    dataElb: {
      entity: 'button',
      action: 'learn',
      data: {
        content_type: 'article',
        category: 'education',
        position: 'sidebar',
      },
      context: {
        section: 'content_discovery',
        screen: 'article_page',
      },
    },
  },
};
