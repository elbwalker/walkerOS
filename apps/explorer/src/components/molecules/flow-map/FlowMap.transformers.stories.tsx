import type { Meta, StoryObj } from '@storybook/react-vite';
import { FlowMap } from './FlowMap';

const meta: Meta<typeof FlowMap> = {
  title: 'Molecules/FlowMap/Transformers',
  component: FlowMap,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FlowMap>;

/**
 * All three chain positions, as the transformers docs introduce them: a
 * source chain (`source.next`), a collector chain (`collector.next`) that runs
 * once for every destination, and a destination chain (`destination.before`)
 * for one destination only.
 */
export const CollectorChainWithDestinationBefore: Story = {
  args: {
    sources: { default: { label: 'Source', next: 'pre', highlight: false } },
    preTransformers: { pre: { label: 'Transformer(s)', highlight: true } },
    collector: { label: 'Collector', highlight: false },
    collectorTransformers: {
      collect: { label: 'Transformer(s)', highlight: true },
    },
    postTransformers: { post: { label: 'Transformer(s)', highlight: true } },
    destinations: {
      default: { label: 'Destination', before: 'post', highlight: false },
    },
    markers: [
      {
        position: 'pre-pre',
        id: '1',
        text: 'Source chain (source.next): after the source, before the collector',
      },
      {
        position: 'chain-collect',
        id: '2',
        text: 'Collector chain (collector.next): once per event, for every destination',
      },
      {
        position: 'post-post',
        id: '3',
        text: 'Destination chain (destination.before): for one destination only',
      },
    ],
  },
};
