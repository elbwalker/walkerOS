import type { Meta, StoryObj } from '@storybook/react-vite';
import { SocialLinks } from './SocialLinks';

const meta: Meta<typeof SocialLinks> = {
  title: 'Shop/Molecules/SocialLinks',
  component: SocialLinks,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
