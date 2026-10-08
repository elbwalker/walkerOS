import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ToggleButton } from './toggle-button';

/**
 * ToggleButton - one button that shows the option a click switches to (or,
 * with `shows="current"`, the selected one). It keeps the longest label's
 * width, so it never changes size.
 */
const meta: Meta<typeof ToggleButton> = {
  component: ToggleButton,
  title: 'Atoms/ToggleButton',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ToggleButton>;

const modes = [
  { label: 'Visual', value: 'visual' },
  { label: 'Code', value: 'code' },
];

export const Default: Story = {
  render: () => {
    const [mode, setMode] = useState('visual');

    return (
      <ToggleButton
        options={modes}
        value={mode}
        onChange={setMode}
        aria-label={mode === 'code' ? 'Show visual' : 'Show code'}
      />
    );
  },
};

// The label names the state: "English" while English.
export const ShowsCurrent: Story = {
  render: () => {
    const [language, setLanguage] = useState('en');
    const languages = [
      { label: 'English', value: 'en' },
      { label: 'Elbish', value: 'elbish' },
    ];

    return (
      <ToggleButton
        options={languages}
        value={language}
        onChange={setLanguage}
        shows="current"
        aria-label={
          language === 'en'
            ? 'Language: English. Switch to Elbish.'
            : 'Language: Elbish. Switch to English.'
        }
      />
    );
  },
};
