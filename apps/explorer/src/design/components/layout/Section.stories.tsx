import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Section } from './Section';

const meta: Meta<typeof Section> = {
  title: 'Design/Layout/Section',
  component: Section,
  tags: ['autodocs'],
  args: { tone: 'alt', children: <p>A page band on bg-2 with a top rule.</p> },
};
export default meta;

export const Default: StoryObj<typeof Section> = {};
