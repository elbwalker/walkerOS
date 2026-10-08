import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { TextLink } from '../atoms/TextLink';
import { QuickstartSteps } from './QuickstartSteps';

const meta: Meta<typeof QuickstartSteps> = {
  title: 'Design/Molecules/QuickstartSteps',
  component: QuickstartSteps,
  tags: ['autodocs'],
  args: {
    steps: [
      {
        title: 'Install the script',
        text: 'Add one script tag to every page, below your GTM snippet.',
      },
      {
        title: 'Tag your components',
        text: 'Name the entities, add their data, and say which actions count.',
      },
      {
        title: 'Get rich dataLayer pushes',
        text: 'Every interaction becomes one structured push, ready for GTM triggers.',
      },
    ],
    children: (
      <TextLink href="#" arrow>
        Read full quickstart guide
      </TextLink>
    ),
  },
};
export default meta;

export const Default: StoryObj<typeof QuickstartSteps> = {};
