import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dropdown, DropdownItem, DropdownDivider } from './dropdown';

const meta: Meta<typeof Dropdown> = {
  title: 'Molecules/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {
  args: {
    trigger: <button>Open Menu</button>,
    isOpen: true,
    onToggle: () => {},
    align: 'left',
    children: (
      <>
        <DropdownItem onClick={() => {}}>Action 1</DropdownItem>
        <DropdownItem onClick={() => {}}>Action 2</DropdownItem>
        <DropdownDivider />
        <DropdownItem onClick={() => {}} variant="danger">
          Delete
        </DropdownItem>
      </>
    ),
  },
};
