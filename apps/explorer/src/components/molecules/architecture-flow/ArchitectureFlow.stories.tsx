import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ArchitectureFlow } from './ArchitectureFlow';
import type { FlowColumn } from './ArchitectureFlow';
import { Icon } from '../../atoms/icons';

const meta: Meta<typeof ArchitectureFlow> = {
  title: 'Molecules/ArchitectureFlow',
  component: ArchitectureFlow,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className="elb-explorer" style={{ padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ArchitectureFlow>;

const walkerOSSources: FlowColumn = {
  title: 'Sources',
  sections: [
    {
      title: 'Client-side',
      items: [
        { icon: <Icon icon="mdi:web" />, label: 'Browser' },
        { icon: <Icon icon="mdi:layers-outline" />, label: 'dataLayer' },
      ],
    },
    {
      title: 'Server-side',
      items: [
        { icon: <Icon icon="simple-icons:express" />, label: 'Express' },
        { icon: <Icon icon="mdi:api" />, label: 'Fetch' },
        { icon: <Icon icon="logos:aws-lambda" />, label: 'AWS Lambda' },
        { icon: <Icon icon="logos:google-cloud" />, label: 'GCP Functions' },
      ],
    },
  ],
};

const walkerOSDestinations: FlowColumn = {
  title: 'Destinations',
  sections: [
    {
      title: 'Client-side',
      items: [
        { icon: <Icon icon="logos:google-analytics" />, label: 'GA4' },
        { icon: <Icon icon="logos:google-ads" />, label: 'Google Ads' },
        { icon: <Icon icon="logos:meta-icon" />, label: 'Meta Pixel' },
        {
          icon: (
            <Icon
              icon="simple-icons:plausibleanalytics"
              style={{ color: '#5850EC' }}
            />
          ),
          label: 'Plausible',
        },
        { icon: <Icon icon="walkeros:piwik-pro" />, label: 'Piwik PRO' },
        { icon: <Icon icon="mdi:api" />, label: 'API' },
      ],
    },
    {
      title: 'Server-side',
      items: [
        { icon: <Icon icon="logos:aws" />, label: 'AWS' },
        { icon: <Icon icon="logos:google-cloud" />, label: 'BigQuery' },
        { icon: <Icon icon="logos:meta-icon" />, label: 'Meta CAPI' },
      ],
    },
  ],
};

export const Default: Story = {
  args: {
    sources: walkerOSSources,
    centerTitle: 'Collector',
    center: (
      <img
        src="/walkerOS_logo.svg"
        alt="walkerOS"
        style={{ width: '128px', height: '128px' }}
      />
    ),
    destinations: walkerOSDestinations,
  },
};
