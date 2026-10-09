import type { Meta, StoryObj } from '@storybook/react-vite';
import { CodeDiffBox } from './code-diff-box';

const meta: Meta<typeof CodeDiffBox> = {
  title: 'Molecules/CodeDiffBox',
  component: CodeDiffBox,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div style={{ height: 520 }}>
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof CodeDiffBox>;

// ── Fixtures ────────────────────────────────────────────────────────────────

const JSON_A = `{
  "sources": {
    "browser": {
      "package": "@walkeros/web-source-browser",
      "config": { "settings": { "pageview": true } }
    }
  },
  "destinations": {
    "gtag": {
      "package": "@walkeros/web-destination-gtag",
      "config": { "settings": { "ga4": { "measurementId": "$var.gaId" } } }
    }
  }
}`;

const JSON_B = `{
  "sources": {
    "browser": {
      "package": "@walkeros/web-source-browser",
      "config": { "settings": { "pageview": false, "prefix": "data-track" } }
    }
  },
  "destinations": {
    "gtag": {
      "package": "@walkeros/web-destination-gtag",
      "config": { "settings": { "ga4": { "measurementId": "$var.gaIdV2" } } }
    },
    "meta": {
      "package": "@walkeros/web-destination-meta",
      "config": { "settings": { "pixelId": "$env.META_PIXEL_ID" } }
    }
  }
}`;

// ── Stories ─────────────────────────────────────────────────────────────────

/**
 * Version diff as the app's release, history and deploy views render it:
 * header with summary, split view toggle and copy, filling its container.
 */
export const JsonDefault: Story = {
  args: {
    label: 'v3 to v4',
    language: 'json',
    original: JSON_A,
    modified: JSON_B,
    showHeader: true,
    showSummary: true,
    showViewToggle: true,
    showCopy: true,
    defaultView: 'split',
    height: '100%',
  },
};
