import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from '../atoms/Icon';
import { CaseCard } from './CaseCard';

const meta: Meta<typeof CaseCard> = {
  title: 'Design/Molecules/CaseCard',
  component: CaseCard,
  tags: ['autodocs'],
  args: {
    label: 'Media',
    title: 'One design system. ~50 components. No hand-written tracking code.',
    children:
      'A major German media platform spent too much dev time hand-coding tracking around a single analytics vendor.',
    stats: [
      { value: '~50', label: 'components tagged once' },
      { value: 'Day 1', label: 'tracking on every new feature' },
      {
        value: <Icon name="check" size={32} />,
        label: 'Next vendor switch is a config change, not a project',
      },
    ],
  },
};
export default meta;

export const Default: StoryObj<typeof CaseCard> = {};
