import type { Meta, StoryObj } from '@storybook/react-vite';
import { ProblemCard } from './ProblemCard';

const meta: Meta<typeof ProblemCard> = {
  title: 'Design/Molecules/ProblemCard',
  component: ProblemCard,
  tags: ['autodocs'],
  args: {
    number: '01',
    title: 'Every feature needs a tracking ticket',
    children:
      'A tracking spec, a Jira ticket, and a dev hand-writing the push. Tracking always comes after shipping, and a missing event looks exactly like a quiet afternoon.',
  },
};
export default meta;

export const Default: StoryObj<typeof ProblemCard> = {};
