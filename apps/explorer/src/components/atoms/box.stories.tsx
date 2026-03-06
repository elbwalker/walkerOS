import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from './box';

/**
 * Box - Container component with header
 *
 * Basic container atom used throughout the explorer for consistent styling.
 * Provides header, optional header actions, footer, and content area.
 */
const meta: Meta<typeof Box> = {
  component: Box,
  title: 'Atoms/Box',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof Box>;

/**
 * Default box with header and content
 */
export const Default: Story = {
  args: {
    header: 'Example Box',
    children: (
      <div style={{ padding: '12px' }}>
        <p>This is the content area of the Box component.</p>
        <p>
          It provides consistent styling across all explorer components with a
          header and optional actions.
        </p>
      </div>
    ),
  },
};

/**
 * Box with tabs - uncontrolled mode
 *
 * Tabs replace the regular header. Click tabs to switch content.
 */
export const WithTabs: Story = {
  args: {
    tabs: [
      {
        id: 'overview',
        label: 'Overview',
        content: (
          <div style={{ padding: '12px' }}>
            <p>Overview content goes here.</p>
          </div>
        ),
      },
      {
        id: 'details',
        label: 'Details',
        content: (
          <div style={{ padding: '12px' }}>
            <p>Detailed information displayed here.</p>
          </div>
        ),
      },
      {
        id: 'settings',
        label: 'Settings',
        content: (
          <div style={{ padding: '12px' }}>
            <p>Settings and configuration options.</p>
          </div>
        ),
      },
    ],
  },
};

/**
 * Box with traffic lights and a single file tab
 *
 * Mac-style decoration for code editor appearance.
 */
export const WithTrafficLights: Story = {
  args: {
    showTrafficLights: true,
    tabs: [{ id: 'file', label: 'config.ts' }],
    children: (
      <div
        style={{ padding: '12px', fontFamily: 'monospace', fontSize: '14px' }}
      >
        <pre>{`export const config = {
  tracking: true,
  debug: false,
};`}</pre>
      </div>
    ),
  },
};

/**
 * Box with tabs and traffic lights
 *
 * Combines Mac decoration with multiple switchable tabs.
 */
export const TabsWithTrafficLights: Story = {
  args: {
    showTrafficLights: true,
    tabs: [
      {
        id: 'event',
        label: 'Event',
        content: (
          <div
            style={{
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          >
            <pre>{`{
  "event": "product view",
  "data": { "id": "abc123" }
}`}</pre>
          </div>
        ),
      },
      {
        id: 'mapping',
        label: 'Mapping',
        content: (
          <div
            style={{
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '14px',
            }}
          >
            <pre>{`{
  "name": "event",
  "data": { "key": "data.id" }
}`}</pre>
          </div>
        ),
      },
    ],
  },
};
