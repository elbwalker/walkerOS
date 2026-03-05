import type { Meta, StoryObj } from '@storybook/react-vite';
import { DestinationDemo } from './DestinationDemo';
import { captureDestinationPush } from '../../helpers/capture';
import { getEvent, type Destination, type Mapping } from '@walkeros/core';
import destinationGtag from '@walkeros/web-destination-gtag';
import * as examples from '@walkeros/web-destination-gtag/examples';

/**
 * DestinationDemo - Interactive destination testing component
 *
 * Tests destination implementations with real walkerOS events.
 * Automatically captures destination.push() calls and displays output.
 * Perfect for testing and debugging destination configurations.
 */
const meta: Meta<typeof DestinationDemo> = {
  component: DestinationDemo,
  title: 'Demos/DestinationDemo',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof DestinationDemo>;

// Create documentation gtag destination with examples
// Cast to generic Destination.Instance to avoid type conflicts with specific gtag types
const documentationGtag = {
  ...destinationGtag,
  examples,
} as unknown as Destination.Instance & { examples: typeof examples };

/**
 * Default destination demo with gtag GA4 purchase event
 */
export const Default: Story = {
  args: {
    destination: documentationGtag,
    event: getEvent('order complete', {
      data: {
        id: 'T12345',
        total: 99.99,
        taxes: 9.0,
        shipping: 5.99,
        currency: 'EUR',
      },
    }),
    mapping: examples.step.purchase.mapping as Mapping.Rule,
    settings: {
      ga4: {
        measurementId: 'G-XXXXXXXXXX',
      },
    },
    generic: true,
    fn: captureDestinationPush(documentationGtag, examples?.env?.push),
  },
};
