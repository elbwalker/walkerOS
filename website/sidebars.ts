import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    // ── Get Started ──────────────────────────────────────────────
    {
      type: 'category',
      label: 'Get Started',
      collapsed: false,
      items: [
        {
          type: 'doc',
          id: 'getting-started/index',
          label: 'What is walkerOS',
        },
        {
          type: 'category',
          label: 'Quickstart',
          link: {
            type: 'doc',
            id: 'getting-started/quickstart/index',
          },
          items: [
            'getting-started/quickstart/react',
            'getting-started/quickstart/nextjs',
            'getting-started/quickstart/docker',
          ],
        },
        {
          type: 'category',
          label: 'Operating modes',
          link: {
            type: 'doc',
            id: 'getting-started/modes/index',
          },
          items: [
            'getting-started/modes/bundled',
            'getting-started/modes/integrated',
          ],
        },
        {
          type: 'category',
          label: 'Flow',
          link: { type: 'doc', id: 'getting-started/flow/index' },
          items: ['getting-started/flow/step-examples'],
        },
        'getting-started/event-model',
      ],
    },

    // ── Reference ────────────────────────────────────────────────
    {
      type: 'category',
      label: 'Reference',
      collapsed: true,
      items: [
        {
          type: 'category',
          label: 'Sources',
          link: {
            type: 'doc',
            id: 'sources/index',
          },
          items: [
            {
              type: 'category',
              label: 'Browser',
              link: {
                type: 'doc',
                id: 'sources/web/browser/index',
              },
              items: [
                'sources/web/browser/commands',
                {
                  type: 'category',
                  label: 'Tagging',
                  items: [
                    'sources/web/browser/tagging/html-attributes',
                    'sources/web/browser/tagging/javascript',
                  ],
                },
                'sources/web/browser/tagger',
              ],
            },
            'sources/web/dataLayer/index',
            'sources/web/session/index',
            {
              type: 'category',
              label: 'CMPs',
              link: {
                type: 'doc',
                id: 'sources/web/cmps/index',
              },
              items: [
                'sources/web/cmps/cookiefirst/index',
                'sources/web/cmps/cookiepro/index',
                'sources/web/cmps/usercentrics/index',
              ],
            },
            {
              type: 'category',
              label: 'Server',
              link: { type: 'doc', id: 'sources/server/index' },
              items: [
                'sources/server/express',
                'sources/server/fetch',
                'sources/server/aws',
                'sources/server/gcp',
              ],
            },
            'sources/create-your-own',
          ],
        },
        {
          type: 'category',
          label: 'Collector',
          link: {
            type: 'doc',
            id: 'collector/index',
          },
          items: ['collector/commands', 'collector/logger'],
        },
        {
          type: 'category',
          label: 'Transformers & Mapping',
          link: {
            type: 'doc',
            id: 'transformers/index',
          },
          items: [
            'mapping',
            'contract',
            'transformers/validator',
            'transformers/router',
            'transformers/cache',
            'transformers/fingerprint',
            'transformers/file',
            'transformers/create-your-own',
          ],
        },
        {
          type: 'category',
          label: 'Destinations',
          link: {
            type: 'doc',
            id: 'destinations/index',
          },
          items: [
            {
              type: 'category',
              label: 'API',
              link: {
                type: 'doc',
                id: 'destinations/api/index',
              },
              items: ['destinations/api/web', 'destinations/api/server'],
            },
            {
              type: 'category',
              label: 'Google tag (gtag)',
              link: {
                type: 'doc',
                id: 'destinations/web/gtag/index',
              },
              items: [
                'destinations/web/gtag/ga4',
                'destinations/web/gtag/ads',
                'destinations/web/gtag/gtm',
              ],
            },
            'destinations/web/meta-pixel',
            'destinations/web/piwikpro',
            'destinations/web/plausible',
            'destinations/web/snowplow',
            'destinations/server/aws',
            'destinations/server/gcp',
            'destinations/server/meta-capi',
            'destinations/server/datamanager',
            'destinations/code',
            'destinations/create-your-own',
          ],
        },
        {
          type: 'category',
          label: 'Stores',
          link: {
            type: 'doc',
            id: 'stores/index',
          },
          items: [
            'stores/memory',
            'stores/server/fs',
            'stores/server/s3',
            'stores/server/gcs',
          ],
        },
        { type: 'doc', id: 'apps/mcp', label: 'MCP' },
        {
          type: 'category',
          label: 'Packages',
          items: [
            'apps/walkerjs',
            'apps/cli',
            'apps/runner',
            'apps/docker',
            'apps/storybook',
            { type: 'doc', id: 'core/web', label: 'Web Core' },
            { type: 'doc', id: 'core/server', label: 'Server Core' },
          ],
        },
      ],
    },

    // ── Guides ───────────────────────────────────────────────────
    {
      type: 'category',
      label: 'Guides',
      link: {
        type: 'doc',
        id: 'guides/index',
      },
      items: [
        'guides/consent/index',
        'guides/session',
        'guides/user-stitching',
        'guides/migration',
      ],
    },

    // ── vs. Alternatives ─────────────────────────────────────────
    {
      type: 'category',
      label: 'vs. Alternatives',
      link: {
        type: 'doc',
        id: 'comparisons/index',
      },
      items: [
        'comparisons/dataLayer',
        'comparisons/gtm',
        'comparisons/jentis',
        'comparisons/jitsu',
        'comparisons/rudderstack',
        'comparisons/segment',
        'comparisons/snowplow',
        'comparisons/stape',
      ],
    },

    'contributing',
  ],
};

export default sidebars;
