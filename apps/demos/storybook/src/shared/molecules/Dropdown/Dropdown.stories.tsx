import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dropdown } from './Dropdown';

const meta: Meta<typeof Dropdown> = {
  title: 'Shared/Molecules/Dropdown',
  component: Dropdown,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj;

const drinks = [
  { value: 'tea', label: 'Tea' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'water', label: 'Water' },
];

export const Default: Story = {
  render: () => {
    const [drink, setDrink] = useState('coffee');
    return (
      <Dropdown
        value={drink}
        options={drinks}
        onChange={setDrink}
        label="Drink"
      />
    );
  },
};

export const WithIcon: Story = {
  render: () => {
    const [user, setUser] = useState('anonymous');
    return (
      <Dropdown
        value={user}
        options={[
          { value: 'anonymous', label: 'Anonymous' },
          { value: 'lisa', label: 'Lisa Loyal' },
        ]}
        onChange={setUser}
        label="Demo user"
        icon="profile"
      />
    );
  },
};
