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
          label: 'Quick starts',
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
          link: {
            type: 'doc',
            id: 'getting-started/flow/index',
          },
          items: ['getting-started/flow/step-examples'],
        },
        'getting-started/event-model',
        'apps/mcp',
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
            'sources/server/express',
            'sources/server/fetch',
            'sources/server/aws',
            'sources/server/gcp',
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
          items: ['collector/commands'],
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
            'transformers/validator',
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
              label: 'Analytics Tools',
              collapsed: false,
              items: [
                'destinations/web/amplitude',
                'destinations/server/amplitude',
                'destinations/web/clarity',
                'destinations/web/gtag/ga4',
                'destinations/web/gtag/gtm',
                'destinations/web/mixpanel',
                'destinations/server/mixpanel',
                'destinations/web/piwikpro',
                'destinations/web/plausible',
                'destinations/web/posthog',
                'destinations/server/posthog',
                'destinations/web/segment',
                'destinations/server/segment',
                'destinations/web/snowplow',
              ],
            },
            {
              type: 'category',
              label: 'Marketing Tools',
              collapsed: false,
              items: [
                'destinations/web/gtag/ads',
                'destinations/web/linkedin',
                'destinations/server/linkedin',
                'destinations/web/meta-pixel',
                'destinations/server/meta-capi',
                'destinations/web/pinterest',
                'destinations/server/pinterest',
                'destinations/web/tiktok',
                'destinations/server/tiktok',
              ],
            },
            {
              type: 'category',
              label: 'Data Warehouses',
              collapsed: false,
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
                'destinations/server/aws',
                'destinations/server/datamanager',
                'destinations/server/gcp',
              ],
            },
            'destinations/create-your-own',
          ],
        },
        {
          type: 'category',
          label: 'Packages',
          items: [
            'apps/walkerjs',
            'apps/cli',
            'apps/docker',
            'core/web',
            'core/server',
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
        {
          type: 'category',
          label: 'Consent',
          link: {
            type: 'doc',
            id: 'guides/consent/index',
          },
          items: [
            { type: 'autogenerated', dirName: 'guides/consent/examples' },
          ],
        },
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
