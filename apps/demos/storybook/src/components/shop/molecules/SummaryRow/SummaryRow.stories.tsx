import type { Meta, StoryObj } from '@storybook/react-vite';
import { SummaryRow } from './SummaryRow';
import { checkoutSummary } from '../../data';

const meta: Meta<typeof SummaryRow> = {
  title: 'Shop/Molecules/SummaryRow',
  component: SummaryRow,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <dl className="w-(--container-xs)">
        <Story />
      </dl>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Line: Story = {
  args: {
    entity: 'checkout',
    line: checkoutSummary[1],
  },
};

export const Total: Story = {
  args: {
    entity: 'checkout',
    line: checkoutSummary[3],
  },
};
