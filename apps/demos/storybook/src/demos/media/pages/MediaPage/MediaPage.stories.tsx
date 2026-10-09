import type { Meta, StoryObj } from '@storybook/react-vite';
import { MediaPage } from './MediaPage';
import { useStoryControls } from '../../../../shared/stories/useStoryControls';

const ConnectedMediaPage = () => <MediaPage controls={useStoryControls()} />;

// No autodocs: the page is one long story with a pinned consent bar.
const meta: Meta = {
  title: 'Media/Pages/Media',
  tags: ['media'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  name: 'Media',
  render: () => <ConnectedMediaPage />,
};
