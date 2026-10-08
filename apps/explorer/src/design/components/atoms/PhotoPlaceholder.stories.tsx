import type { Meta, StoryObj } from '@storybook/react-vite';
import { PhotoPlaceholder } from './PhotoPlaceholder';

const meta: Meta<typeof PhotoPlaceholder> = {
  title: 'Design/Atoms/PhotoPlaceholder',
  component: PhotoPlaceholder,
  tags: ['autodocs'],
  // The atom takes its size from the caller.
  args: { label: 'photo', tone: 'theme', style: { width: 240, height: 140 } },
};
export default meta;

export const Theme: StoryObj<typeof PhotoPlaceholder> = {};

/** The demos' look, the same in both themes. */
export const Viz: StoryObj<typeof PhotoPlaceholder> = { args: { tone: 'viz' } };
