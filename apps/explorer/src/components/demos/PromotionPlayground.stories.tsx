import type { Meta, StoryObj } from '@storybook/react-vite';
import { PromotionPlayground } from './PromotionPlayground';

/**
 * PromotionPlayground - Complete walkerOS demonstration
 *
 * Full-featured playground showing the complete walkerOS flow:
 * HTML → Preview → Events → Mapping → Destination output
 *
 * Features:
 * - Live HTML/CSS/JS editor with real-time preview
 * - Event capture from data attributes
 * - Interactive mapping configuration
 * - Destination output visualization
 *
 * Perfect for demonstrating the entire walkerOS ecosystem in action.
 */
const meta: Meta<typeof PromotionPlayground> = {
  component: PromotionPlayground,
  title: 'Demos/PromotionPlayground',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof PromotionPlayground>;

/**
 * Default promotion playground with product card example
 *
 * Includes a fully styled product card with walkerOS data attributes,
 * demonstrating event tracking, context switching, and destination integration.
 */
export const Default: Story = {};
