import type { Meta, StoryObj } from '@storybook/react-vite';
import { InstallCommand } from './InstallCommand';

const meta: Meta<typeof InstallCommand> = {
  title: 'Design/Atoms/InstallCommand',
  component: InstallCommand,
  tags: ['autodocs'],
  args: { command: 'npm i -g @walkeros/cli' },
};
export default meta;

export const Default: StoryObj<typeof InstallCommand> = {};
