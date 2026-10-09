import type { Meta, StoryObj } from '@storybook/react-vite';
import { DestinationMappingViz } from './DestinationMappingViz';

const meta: Meta<typeof DestinationMappingViz> = {
  title: 'Design/Viz/DestinationMappingViz',
  component: DestinationMappingViz,
  tags: ['autodocs'],
  args: { initialEvent: 0 },
};
export default meta;

export const Default: StoryObj<typeof DestinationMappingViz> = {};
