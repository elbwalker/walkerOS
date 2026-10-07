import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextLink } from '../atoms/TextLink';
import { Cluster } from './Cluster';

const meta: Meta<typeof Cluster> = {
  title: 'Design/Layout/Cluster',
  component: Cluster,
  tags: ['autodocs'],
  args: {
    gap: 'links',
    children: [
      <TextLink key="docs" href="#" arrow>
        Learn more about mapping
      </TextLink>,
      <TextLink key="all" href="#" tone="muted" arrow>
        See all destinations
      </TextLink>,
    ],
  },
};
export default meta;

export const Default: StoryObj<typeof Cluster> = {};
