import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from '../atoms/Button';
import { Card } from '../atoms/Card';
import { InstallCommand } from '../atoms/InstallCommand';
import { CheckList } from '../molecules/CheckList';
import { Hero } from './Hero';

const meta: Meta<typeof Hero> = {
  title: 'Design/Layout/Hero',
  component: Hero,
  tags: ['autodocs'],
  args: {
    eyebrow: 'The tracking library for design systems',
    title: 'User behavior tracking that ships',
    highlight: 'with your components.',
    lead: 'Tag a component once, and every page that uses it is tracked. No future tracking tickets, no vendor-shaped code. Switching analytics tools happens in config, not in a rebuild.',
    actions: (
      <>
        <Button href="#" arrow>
          Set up with your agent
        </Button>
        <InstallCommand />
      </>
    ),
    proof: (
      <CheckList
        align="center"
        items={[
          'MIT-licensed',
          'Works with any framework',
          'Storybook integration',
        ]}
      />
    ),
    children: <Card>Demo</Card>,
  },
};
export default meta;

export const Default: StoryObj<typeof Hero> = {};
