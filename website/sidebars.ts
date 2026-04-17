import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    // ── Get Started ──────────────────────────────────────────────
    {
      type: 'category',
      label: 'Get Started',
      collapsed: true,
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
              collapsed: true,
              items: [
                {
                  type: 'category',
                  label: 'Amplitude',
                  items: [
                    {
                      type: 'doc',
                      id: 'destinations/web/amplitude',
                      className: 'sidebar-badge-web',
                    },
                    {
                      type: 'doc',
                      id: 'destinations/server/amplitude',
                      className: 'sidebar-badge-server',
                    },
                  ],
                },
                {
                  type: 'doc',
                  id: 'destinations/web/clarity',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/fullstory',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/gtag/ga4',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/gtag/gtm',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/heap',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/hotjar',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/matomo',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'category',
                  label: 'Mixpanel',
                  items: [
                    {
                      type: 'doc',
                      id: 'destinations/web/mixpanel',
                      className: 'sidebar-badge-web',
                    },
                    {
                      type: 'doc',
                      id: 'destinations/server/mixpanel',
                      className: 'sidebar-badge-server',
                    },
                  ],
                },
                {
                  type: 'doc',
                  id: 'destinations/server/mparticle',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/optimizely',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/piwikpro',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/plausible',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'category',
                  label: 'PostHog',
                  items: [
                    {
                      type: 'doc',
                      id: 'destinations/web/posthog',
                      className: 'sidebar-badge-web',
                    },
                    {
                      type: 'doc',
                      id: 'destinations/server/posthog',
                      className: 'sidebar-badge-server',
                    },
                  ],
                },
                {
                  type: 'doc',
                  id: 'destinations/server/rudderstack',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'category',
                  label: 'Segment',
                  items: [
                    {
                      type: 'doc',
                      id: 'destinations/web/segment',
                      className: 'sidebar-badge-web',
                    },
                    {
                      type: 'doc',
                      id: 'destinations/server/segment',
                      className: 'sidebar-badge-server',
                    },
                  ],
                },
                {
                  type: 'doc',
                  id: 'destinations/web/snowplow',
                  className: 'sidebar-badge-web',
                },
              ],
            },
            {
              type: 'category',
              label: 'Marketing Tools',
              collapsed: true,
              items: [
                {
                  type: 'doc',
                  id: 'destinations/web/gtag/ads',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/bing',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/criteo',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/customerio',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/datamanager',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/hubspot',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/klaviyo',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/linkedin',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/linkedin',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/meta-pixel',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/meta-capi',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/pinterest',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/pinterest',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/reddit',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/snapchat',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/web/tiktok',
                  className: 'sidebar-badge-web',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/tiktok',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/twitter',
                  className: 'sidebar-badge-server',
                },
              ],
            },
            {
              type: 'category',
              label: 'Data Warehouses',
              collapsed: true,
              items: [
                {
                  type: 'category',
                  label: 'API',
                  link: {
                    type: 'doc',
                    id: 'destinations/api/index',
                  },
                  items: [
                    {
                      type: 'doc',
                      id: 'destinations/api/web',
                      className: 'sidebar-badge-web',
                    },
                    {
                      type: 'doc',
                      id: 'destinations/api/server',
                      className: 'sidebar-badge-server',
                    },
                  ],
                },
                {
                  type: 'doc',
                  id: 'destinations/server/aws',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/file',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/gcp',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/kafka',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/redis',
                  className: 'sidebar-badge-server',
                },
                {
                  type: 'doc',
                  id: 'destinations/server/sqlite',
                  className: 'sidebar-badge-server',
                },
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
