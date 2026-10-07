import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlanCard } from './PlanCard';

const meta: Meta<typeof PlanCard> = {
  title: 'Design/Molecules/PlanCard',
  component: PlanCard,
  tags: ['autodocs'],
  args: {
    label: 'SLA',
    title: 'Support',
    highlight: true,
    children:
      'A contract on top of the open-source project, for teams whose tracking drives revenue reporting or ad spend.',
    features: [
      'Guaranteed response times, direct access to the people who build walkerOS',
      'Priority fixes and security patches',
      'Upgrade guidance for production setups',
    ],
    cta: { label: 'Talk to us', href: '#' },
  },
};
export default meta;

export const Default: StoryObj<typeof PlanCard> = {};
