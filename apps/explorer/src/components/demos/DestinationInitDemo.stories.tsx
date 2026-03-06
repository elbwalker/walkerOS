import type { Meta, StoryObj } from '@storybook/react-vite';
import { DestinationInitDemo } from './DestinationInitDemo';
import type { Destination } from '@walkeros/core';
import destinationGtag from '@walkeros/web-destination-gtag';
import * as examples from '@walkeros/web-destination-gtag/examples';

/**
 * DestinationInitDemo - Interactive destination initialization testing
 *
 * Tests destination.init() methods with configuration settings.
 * Automatically captures initialization calls and displays output.
 * Perfect for testing destination setup and configuration.
 */
const meta: Meta<typeof DestinationInitDemo> = {
  component: DestinationInitDemo,
  title: 'Demos/DestinationInitDemo',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof DestinationInitDemo>;

// Create documentation gtag destination with examples
// Cast to generic Destination.Instance to avoid type conflicts with specific gtag types
const documentationGtag = {
  ...destinationGtag,
  examples,
} as unknown as Destination.Instance & { examples: typeof examples };

/**
 * Default destination initialization demo with gtag GA4 settings
 */
export const Default: Story = {
  args: {
    destination: documentationGtag,
    settings: {
      ga4: {
        measurementId: 'G-XXXXXXXXXX',
      },
    },
  },
};
