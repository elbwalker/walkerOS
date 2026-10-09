import type { Meta, StoryObj } from '@storybook/react-vite';
import { HighlightCard } from './HighlightCard';

const meta: Meta<typeof HighlightCard> = {
  title: 'Design/Molecules/HighlightCard',
  component: HighlightCard,
  tags: ['autodocs'],
  args: {
    label: 'Server-side pipeline',
    title: 'Replace server-side GTM.',
    children:
      'Run the same events through your own server pipeline on Express, AWS Lambda or GCP Functions.',
    cta: { label: 'Explore server-side', href: '#' },
  },
};
export default meta;

export const Default: StoryObj<typeof HighlightCard> = {};
