import type { Meta, StoryObj } from '@storybook/react-vite';
import { FormField } from './FormField';
import { Input } from '../../atoms/Input';
import { Select } from '../../atoms/Select';

const meta: Meta<typeof FormField> = {
  title: 'Shared/Molecules/FormField',
  component: FormField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs', 'shop', 'media'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TextInput: Story = {
  args: {
    label: 'Email address',
    children: (id) => (
      <Input id={id} type="email" name="email-address" autoComplete="email" />
    ),
  },
};

export const Choice: Story = {
  args: {
    label: 'Country',
    children: (id) => (
      <Select
        id={id}
        name="country"
        autoComplete="country-name"
        options={['United States', 'Canada', 'Mexico']}
      />
    ),
  },
};
