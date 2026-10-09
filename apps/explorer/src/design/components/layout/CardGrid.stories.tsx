import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from '../atoms/Card';
import { CardGrid } from './CardGrid';

const meta: Meta<typeof CardGrid> = {
  title: 'Design/Layout/CardGrid',
  component: CardGrid,
  tags: ['autodocs'],
  args: {
    min: 280,
    children: ['01', '02', '03'].map((label) => (
      <Card key={label}>{label}</Card>
    )),
  },
};
export default meta;

export const Default: StoryObj<typeof CardGrid> = {};
