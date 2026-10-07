import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextLink } from './TextLink';

const meta: Meta<typeof TextLink> = {
  title: 'Design/Atoms/TextLink',
  component: TextLink,
  tags: ['autodocs'],
  args: {
    href: '#',
    arrow: true,
    tone: 'link',
    children: 'Learn more about tagging',
  },
};
export default meta;

export const Default: StoryObj<typeof TextLink> = {};
