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
      "config": { "pageview": true, "session": true }
    }
  },
  "destinations": {
    "gtag": {
      "package": "@walkeros/web-destination-gtag",
      "config": { "settings": { "ga4": { "measurementId": "G-AAAA" } } }
    }
  }
}`;

const JSON_B = `{
  "sources": {
    "browser": {
      "package": "@walkeros/web-source-browser",
      "config": { "pageview": true, "session": false, "hash": true }
    }
  },
  "destinations": {
    "gtag": {
      "package": "@walkeros/web-destination-gtag",
      "config": { "settings": { "ga4": { "measurementId": "G-BBBB" } } }
    },
    "meta": {
      "package": "@walkeros/web-destination-meta",
      "config": { "settings": { "pixelId": "123" } }
    }
  }
}`;

const TS_A = `export function handlePush(event: WalkerOS.Event) {
  if (!event) return;
  const normalized = normalize(event);
  return dispatch(normalized);
}

function normalize(e: WalkerOS.Event) {
  return { ...e, timestamp: Date.now() };
}`;

const TS_B = `export async function handlePush(event: WalkerOS.Event) {
  if (!event) return;
  const normalized = await normalize(event);
  if (normalized.skip) return;
  return dispatch(normalized);
}

async function normalize(e: WalkerOS.Event) {
  const enriched = await enrich(e);
  return { ...enriched, timestamp: Date.now() };
}`;

const WALKEROS_REFS_A = `{
  "destinations": {
    "gtag": {
      "package": "@walkeros/web-destination-gtag",
      "config": {
        "settings": {
          "ga4": { "measurementId": "$var.ga4MeasurementId" }
        },
        "env": {
          "apiKey": "$secret.GTAG_API_KEY"
        }
      }
    }
  }
}`;

const WALKEROS_REFS_B = `{
  "destinations": {
    "gtag": {
      "package": "@walkeros/web-destination-gtag",
      "config": {
        "settings": {
          "ga4": { "measurementId": "$var.ga4MeasurementIdV2" }
        },
        "env": {
          "apiKey": "$secret.GTAG_API_KEY_V2",
          "region": "$var.region"
        }
      }
    }
  }
}`;

// ── Stories ─────────────────────────────────────────────────────────────────

export const JsonDefault: Story = {
  args: {
    label: 'flow.json',
    language: 'json',
    original: JSON_A,
    modified: JSON_B,
  },
};

export const TypeScript: Story = {
  args: {
    label: 'handle-push.ts',
    language: 'typescript',
    original: TS_A,
    modified: TS_B,
  },
};

export const JsonWithWalkerOSRefs: Story = {
  args: {
    label: 'flow.json (with $var. / $secret.)',
    language: 'json',
    original: WALKEROS_REFS_A,
    modified: WALKEROS_REFS_B,
  },
};
