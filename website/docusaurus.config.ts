import { themes as prismThemes } from 'prism-react-renderer';
import type { Config, Plugin } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import type { PluginOptions as LlmsTxtOptions } from '@signalwire/docusaurus-plugin-llms-txt';
import { version as coreVersion } from '../packages/core/package.json';
import restoreExpressionIndent from './src/remark/restore-expression-indent';
import normalizeExportLinks from './src/remark/normalize-export-links';
import prependExportContext from './src/remark/prepend-export-context';

const vars = {
  github: 'https://github.com/elbwalker/walkerOS/',
  linkedin: 'https://www.linkedin.com/company/elbwalker/',
  site: 'https://www.walkeros.io',
  npm: 'https://www.npmjs.com/org/walkeros',
};

// The llms.txt header is a single blockquote: the plugin writes one `> ` in
// front of `siteDescription` and nothing else, so a multi-paragraph preamble
// carries its own continuation markers.
//
// Keep it short and factual. It is the first thing a model reads about
// walkerOS, and its job is to correct the two things a training corpus gets
// wrong: the package namespace, and what category the project is in.
const llmsTxtPreamble = [
  'Privacy-first, composable event data collection (Source → Collector → Destination).',
  'Current namespace: packages are published under `@walkeros/*` and the command line binary is `walkeros`. Package names from the walker.js era are historical and should not be suggested for new work.',
  'walkerOS is not a product analytics tool, not a consent management platform, and not a business intelligence layer. It collects events and routes them to those tools.',
  `To prove an integration works without calling a real endpoint, run \`walkeros push flow.json --event '{"name":"product add"}' --simulate destination.NAME\`. It runs the flow and reports what the destination would have sent.`,
  `Canonical index: ${vars.site}/llms.txt. Generated ${new Date().toISOString().slice(0, 10)}.`,
].join('\n>\n> ');

const config: Config = {
  title: 'walkerOS',
  tagline: 'Open-source event data collection platform',
  favicon: 'img/favicon.png',

  // Build optimizations - reduces memory usage and build time significantly
  // See: https://docusaurus.io/blog/releases/3.8
  future: {
    v4: {
      removeLegacyPostBuildHeadAttribute: true,
    },
    faster: {
      swcJsLoader: true, // Use SWC instead of Babel
      swcJsMinimizer: true, // Use SWC instead of Terser (less memory)
      swcHtmlMinimizer: true, // Use SWC for HTML minification
      lightningCssMinimizer: true, // Use Lightning CSS instead of cssnano
      rspackBundler: false, // Disabled: Rspack has issues with npm workspace symlinks in dev mode
      mdxCrossCompilerCache: true, // Compile MDX only once
    },
  },

  // Set the production url of your site here.
  // Keep this a plain string literal matching `vars.site`: the LLM export guard
  // reads the value straight out of this file rather than importing the config,
  // so a reference here leaves it with no url to check links against.
  url: 'https://www.walkeros.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: process.env.DOCUSAURUS_BASEURL || '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'elbwalker', // Usually your GitHub org/user name.
  projectName: 'walkerOS', // Usually your repo name.

  onBrokenLinks: 'throw',

  customFields: {
    coreVersion,
  },

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  // Site-wide head tags. Everything here is published, machine-read copy, so it
  // states facts about the project and nothing else.
  headTags: [
    // Docusaurus emits og:title, og:description, og:image, og:url and og:locale
    // from the theme, but never og:type.
    {
      tagName: 'meta',
      attributes: {
        property: 'og:type',
        content: 'website',
      },
    },
    // llms.txt v2 discovery: the index that describes this site. The per-page
    // `rel="alternate" type="text/markdown"` half is emitted from the doc item
    // itself, since only doc routes have a Markdown companion.
    {
      tagName: 'link',
      attributes: {
        rel: 'describedby',
        href: `${vars.site}/llms.txt`,
      },
    },
    {
      tagName: 'script',
      attributes: {
        type: 'application/ld+json',
      },
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'walkerOS',
        description:
          'Open source event data collection. Sources capture events, a collector processes them, and destinations route them to analytics and marketing tools.',
        url: vars.site,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Browser, Node.js',
        license: 'https://opensource.org/licenses/MIT',
        sameAs: [vars.github, vars.npm],
      }),
    },
  ],

  themes: [
    '@docusaurus/theme-live-codeblock',
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en'],
        docsRouteBasePath: '/docs',
        indexPages: false,
        searchContextByPaths: ['docs'],
        hideSearchBarWithNoSearchContext: true,
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // MDX eats up to two leading spaces per line inside a JSX attribute
          // expression, which flattens every nested snippet written as
          // `<CodeSnippet code={`...`} />`. Put that indentation back before
          // any other plugin sees the tree.
          beforeDefaultRemarkPlugins: [restoreExpressionIndent],
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: `${vars.github}edit/main/website/`,
          admonitions: {
            keywords: ['cloud'],
            extendDefaults: true,
          },
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
    },
    autoCollapsedSidebar: true,
    docs: {
      sidebar: {
        autoCollapseCategories: true,
        hideable: true,
      },
    },
    image: 'img/elbwalker_socialcard.png',
    navbar: {
      logo: {
        alt: 'walkerOS logo',
        src: 'img/walkerOS_logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Documentation',
        },
        { to: '/playground/', label: 'Playground', position: 'left' },
        {
          type: 'docSidebar',
          sidebarId: 'skillsSidebar',
          docsPluginId: 'skills',
          position: 'left',
          label: 'Skills',
        },
        {
          href: vars.github,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {
              label: 'Documentation',
              to: '/docs/',
            },
            {
              label: 'Playground',
              to: '/playground/',
            },
            {
              label: 'Comparisons',
              to: '/docs/comparisons/',
            },
            {
              label: 'Storybook demo',
              href: 'https://storybook.walkeros.io/',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'GitHub',
              href: `${vars.github}discussions`,
            },
            {
              label: 'LinkedIn',
              href: `${vars.linkedin}`,
            },
          ],
        },
        {
          title: 'Company',
          items: [
            {
              label: 'About us',
              href: 'https://www.elbwalker.com/company',
            },
            {
              label: 'Services',
              href: 'https://www.elbwalker.com/services',
            },
            {
              label: 'Privacy Policy',
              href: 'https://www.elbwalker.com/legal/privacy',
            },
            {
              label: 'Terms of Services',
              href: 'https://www.elbwalker.com/legal/terms',
            },
            {
              label: 'Imprint',
              href: 'https://www.elbwalker.com/legal/imprint',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} elbwalker GmbH, Hamburg`,
    },
    mermaid: {
      theme: { light: 'neutral', dark: 'dark' },
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.palenight,
    },
  } satisfies Preset.ThemeConfig,

  plugins: [
    tailwindPlugin,
    devOverlayFilterPlugin,
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'skills',
        path: 'skills-generated',
        routeBasePath: 'skills',
        sidebarPath: './sidebarsSkills.ts',
        editUrl: `${vars.github}edit/main/skills/`,
      },
    ],
    [
      '@docusaurus/plugin-client-redirects',
      {
        // Inbound links from the walker.js era still arrive under the old
        // `clients/`, `collectors/`, `stacks/`, `utils/` and `consent_management/`
        // trees, forwarded here by www.elbwalker.com and docs.elbwalker.com.
        // The plugin fails the build when a `to` is not a real route, so these
        // stay honest as the docs move.
        redirects: [
          // `/contact` is the path a reader or a crawler guesses for the legal
          // contact details. Forward it to the imprint rather than growing a
          // second contact surface that then drifts from it.
          {
            from: '/contact',
            to: '/legal/imprint',
          },
          {
            from: '/docs/sources/web/session/detection',
            to: '/docs/sources/web/session',
          },
          {
            from: [
              '/docs/sources/walkerjs/installation/package',
              '/docs/clients/walkerjs/installation/npm',
              '/docs/collectors/web/installation/package',
            ],
            to: '/docs/sources/web/browser/commands#run',
          },
          {
            from: [
              '/docs/guides/consent/examples/cookiefirst',
              '/docs/consent_management/cookiefirst',
              '/docs/guides/consent_management/cookiefirst',
            ],
            to: '/docs/sources/web/cmps/cookiefirst',
          },
          {
            from: [
              '/docs/guides/consent/examples/cookiepro',
              '/docs/consent_management/cookiepro',
              '/docs/guides/consent_management/cookiepro',
            ],
            to: '/docs/sources/web/cmps/cookiepro',
          },
          {
            from: [
              '/docs/guides/consent/examples/usercentrics',
              '/docs/consent_management/usercentrics',
              '/docs/guides/consent_management/usercentrics',
            ],
            to: '/docs/sources/web/cmps/usercentrics',
          },
          {
            from: [
              '/docs/getting-started/stores',
              '/docs/stores/memory',
              '/docs/utils/storage',
            ],
            to: '/docs/stores',
          },
          {
            from: [
              '/docs/clients/walkerjs',
              '/docs/clients/walkerjs/installation',
              '/docs/clients/walkerjs/installation/cdn',
              '/docs/clients/walkerjs/installation/gtm',
              '/docs/clients/walkerjs/installation/script',
              '/docs/clients/walkerjs/versions',
              '/docs/clients/walkerjs/versions/2.1.3',
              '/docs/clients/walkerjs/versions/2.1.3/installation',
              '/docs/clients/walkerjs/versions/2.1.3/installation/gtm',
              '/docs/clients/walkerjs/versions/2.1.3/installation/npm',
              '/docs/clients/walkerjs/versions/2.1.3/installation/script',
              '/docs/sources/walkerjs',
              '/docs/sources/walkerjs/configuration',
              '/docs/sources/walkerjs/installation',
              '/docs/sources/walkerjs/installation/gtm',
              '/docs/sources/walkerjs/installation/script',
              '/docs/sources/walkerjs/versions',
              '/docs/sources/web/browser/configuration',
              '/docs/sources/web/browser/installation',
            ],
            to: '/docs/sources/web/browser',
          },
          {
            from: [
              '/docs/clients/walkerjs/commands',
              '/docs/clients/walkerjs/versions/2.1.3/commands',
              '/docs/sources/walkerjs/commands',
              '/docs/web/walkerjs/api',
            ],
            to: '/docs/sources/web/browser/commands',
          },
          {
            from: [
              '/docs/clients/walkerjs/tagging',
              '/docs/clients/walkerjs/trigger',
              '/docs/clients/walkerjs/versions/2.1.3/tagging',
              '/docs/sources/walkerjs/tagging',
              '/docs/sources/html-tagging',
              '/docs/sources/web/browser/tagging',
            ],
            to: '/docs/sources/web/browser/tagging/html-attributes',
          },
          {
            from: [
              '/docs/clients/walkerjs/using-javascript',
              '/docs/clients/walkerjs/versions/2.1.3/using-javascript',
              '/docs/sources/walkerjs/using-javascript',
              '/docs/sources/javascript-elb',
            ],
            to: '/docs/sources/web/browser/tagging/javascript',
          },
          {
            from: '/docs/utils/tagger',
            to: '/docs/sources/web/browser/tagger',
          },
          {
            from: [
              '/docs/sources/dataLayer',
              '/docs/sources/dataLayer/configration',
              '/docs/sources/dataLayer/configuration',
              '/docs/sources/dataLayer/consent_mode',
              '/docs/sources/dataLayer/installation',
              '/docs/sources/dataLayer/testing',
              '/docs/sources/datalayer',
            ],
            to: '/docs/sources/web/dataLayer',
          },
          {
            from: [
              '/docs/clients',
              '/docs/sources/overview',
              '/docs/sources/sources',
              '/docs/getting_started/sources',
            ],
            to: '/docs/sources',
          },
          {
            from: [
              '/docs/clients/node',
              '/docs/clients/node/commands',
              '/docs/clients/node/installation',
              '/docs/sources/node',
              '/docs/sources/node/commands',
              '/docs/sources/node/configuration',
              '/docs/sources/node/installation',
              '/docs/sources/node/versions',
              '/docs/stacks',
              '/docs/stacks/custom',
              '/docs/stacks/gtm',
              '/docs/stacks/gtm/tag_template',
            ],
            to: '/docs/sources/server',
          },
          {
            from: '/docs/stacks/firebase',
            to: '/docs/sources/server/gcp',
          },
          {
            from: [
              '/docs/collector/configuration',
              '/docs/collectors',
              '/docs/collectors/node-collector',
              '/docs/collectors/server',
              '/docs/collectors/server-collector',
              '/docs/collectors/server-collector/configuration',
              '/docs/collectors/server-collector/installation',
              '/docs/collectors/server/configuration',
              '/docs/collectors/server/installation',
              '/docs/collectors/web',
              '/docs/collectors/web-collector',
              '/docs/collectors/web-collector/configuration',
              '/docs/collectors/web-collector/installation/gtm',
              '/docs/collectors/web/configuration',
              '/docs/collectors/web/installation',
              '/docs/collectors/web/installation/gtm',
              '/docs/collectors/web/installation/script',
            ],
            to: '/docs/collector',
          },
          {
            from: [
              '/docs/collectors/server/commands',
              '/docs/collectors/web/commands',
              '/docs/consent_management/commands',
              '/docs/clients/walkerjs/hooks',
              '/docs/utils/hooks',
            ],
            to: '/docs/collector/commands',
          },
          {
            from: [
              '/docs/clients/walkerjs/debugging',
              '/docs/clients/walkerjs/testing',
              '/docs/collector/testing',
              '/docs/collectors/web/testing',
              '/docs/sources/node/testing',
              '/docs/sources/walkerjs/testing',
            ],
            to: '/docs/guides/debugging',
          },
          {
            from: [
              '/docs/clients/walkerjs/user-identification',
              '/docs/guides/user_stitching',
              '/docs/user_stitching',
            ],
            to: '/docs/guides/user-stitching',
          },
          {
            from: '/docs/utils/session',
            to: '/docs/guides/session',
          },
          {
            from: [
              '/docs/consent_management',
              '/docs/consent_management/configuration',
              '/docs/consent_management/overview',
              '/docs/guides/consent_management',
              '/docs/getting-started/quickstart/consent-management',
            ],
            to: '/docs/guides/consent',
          },
          {
            from: [
              '/docs/destinations/configuration',
              '/docs/destinations/overview',
              '/docs/destinations/node',
              '/docs/destinations/web',
              '/docs/getting_started/destinations',
            ],
            to: '/docs/destinations',
          },
          {
            from: [
              '/docs/destinations/custom',
              '/docs/destinations/web/custom',
              '/docs/getting-started/quickstart/custom-destination',
            ],
            to: '/docs/destinations/create-your-own',
          },
          {
            from: '/docs/destinations/web/api',
            to: '/docs/destinations/api/web',
          },
          {
            from: '/docs/destinations/node/api',
            to: '/docs/destinations/api/server',
          },
          {
            from: '/docs/web/google',
            to: '/docs/destinations/web/gtag',
          },
          {
            from: [
              '/docs/destinations/google-ga4',
              '/docs/destinations/web/ga4',
              '/docs/destinations/web/google-ga4',
              '/docs/web/google/ga4',
            ],
            to: '/docs/destinations/web/gtag/ga4',
          },
          {
            from: [
              '/docs/destinations/google-ads',
              '/docs/destinations/web/gads',
              '/docs/destinations/web/google-ads',
              '/docs/destinations/web/google_ads',
              '/docs/web/google/ads',
            ],
            to: '/docs/destinations/web/gtag/ads',
          },
          {
            from: [
              '/docs/destinations/google-gtm',
              '/docs/destinations/web/google-gtm',
              '/docs/destinations/web/gtm',
              '/docs/web/google/gtm',
            ],
            to: '/docs/destinations/web/gtag/gtm',
          },
          {
            from: [
              '/docs/destinations/meta',
              '/docs/destinations/meta-pixel',
              '/docs/destinations/web/meta',
              '/docs/web/meta',
            ],
            to: '/docs/destinations/web/meta-pixel',
          },
          {
            from: [
              '/docs/destinations/piwikpro',
              '/docs/destinations/web/piwik',
              '/docs/web/piwikpro',
            ],
            to: '/docs/destinations/web/piwikpro',
          },
          {
            from: ['/docs/destinations/plausible', '/docs/web/plausible'],
            to: '/docs/destinations/web/plausible',
          },
          {
            from: ['/docs/destinations/aws', '/docs/destinations/node/aws'],
            to: '/docs/destinations/server/aws',
          },
          {
            from: [
              '/docs/destinations/bigquery',
              '/docs/destinations/node/bigquery',
              '/docs/destinations/server/gcp/bigquery',
              '/docs/node/google',
            ],
            to: '/docs/destinations/server/gcp',
          },
          {
            from: [
              '/docs/destinations/node/meta',
              '/docs/destinations/server/meta',
              '/docs/node/meta',
            ],
            to: '/docs/destinations/server/meta-capi',
          },
          {
            from: [
              '/docs/destinations/event-mapping',
              '/docs/destinations/event_mapping',
              '/docs/destinations/mapping',
              '/docs/guides/event-mapping',
              '/docs/utils/mapping',
              '/docs/getting-started/quickstart/custom-mapping-functions',
            ],
            to: '/docs/mapping',
          },
          {
            from: '/docs/transformers/cache',
            to: '/docs/stores/cache',
          },
          {
            from: '/docs/transformers/router',
            to: '/docs/transformers',
          },
          {
            from: [
              '/docs/transformers/validator',
              '/docs/utils/validate',
              '/docs/utils/validation',
            ],
            to: '/docs/transformers/validate',
          },
          {
            from: [
              '/docs/utils',
              '/docs/utils/helper',
              '/docs/utils/installation',
              '/docs/utils/versions',
            ],
            to: '/docs/core',
          },
          {
            from: [
              '/docs/getting-started/quick-start',
              '/docs/getting-started/quickstart/cdn',
              '/docs/getting-started/quickstart/walker-with-sources',
              '/docs/getting_started/quick_start',
            ],
            to: '/docs/getting-started/quickstart',
          },
          {
            from: [
              '/docs/getting_started/event-model',
              '/docs/walkeros/event-model',
            ],
            to: '/docs/getting-started/event-model',
          },
          {
            from: [
              '/docs/getting-started/step-examples',
              '/docs/guides/interactive-examples',
            ],
            to: '/docs/getting-started/flow/step-examples',
          },
          {
            from: '/docs/contract',
            to: '/docs/getting-started/flow/contract',
          },
          {
            from: ['/docs/guides/migrations', '/docs/migrations'],
            to: '/docs/guides/migration',
          },
          {
            from: '/docs/migrations/elbwalker_to_walkeros',
            to: '/docs/migrating/v3-to-v4',
          },
          {
            from: '/docs/comparisons/comparisons',
            to: '/docs/comparisons',
          },
          {
            from: '/docs/comparisons/dataLayerGTM',
            to: '/docs/comparisons/dataLayer',
          },
          {
            from: '/docs/guides/gtm',
            to: '/docs/comparisons/gtm',
          },
          {
            from: '/docs/apps',
            to: '/docs/apps/walkerjs',
          },
          {
            from: [
              '/docs/intro',
              '/docs/walkeros',
              '/docs/walkeros/getting-started',
              '/docs/walkeros/privacy',
              '/docs/getting-started/what_is_walkeros',
              '/docs/getting_started/what_is_walkeros',
            ],
            to: '/docs/',
          },
        ],
      },
    ],
    [
      '@signalwire/docusaurus-plugin-llms-txt',
      {
        siteTitle: 'walkerOS Documentation',
        siteDescription: llmsTxtPreamble,
        // depth: 2 groups routes like /docs/destinations/web/amplitude into the
        // "docs/destinations" category, mirroring the pipeline taxonomy.
        depth: 2,
        enableDescriptions: true,
        // Order the llms.txt sections along the pipeline taxonomy.
        includeOrder: [
          '/docs/getting-started/**',
          '/docs/sources/**',
          '/docs/collector/**',
          '/docs/destinations/**',
          '/docs/transformers/**',
          '/docs/stores/**',
          '/docs/mapping/**',
          '/docs/apps/**',
          '/docs/guides/**',
        ],
        content: {
          enableMarkdownFiles: true,
          // No llms-full.txt: a multi-megabyte concatenation exceeds any
          // practical context budget, and compact context beats full docs.
          // Agents follow llms.txt links to the per-page .md exports instead.
          enableLlmsFullTxt: false,
          // llms.txt is read detached from the site: pasted into an agent's
          // context, chunked, or fetched on its own. A root-relative target has
          // nothing to resolve against there, so the production export is fully
          // qualified with the site url. Preview builds stay relative on
          // purpose: the plugin appends the baseUrl to the site url while
          // route paths already carry it, which doubles the prefix on any
          // non-root baseUrl.
          relativePaths: Boolean(process.env.DOCUSAURUS_BASEURL),
          excludeRoutes: ['/search', '/404', '/tags/**'],
          // These run on the mdast of the per-page exports only, so neither
          // touches llms.txt:
          // - The export appends `.md` to the route path, so a trailing-slash
          //   route yields `/docs/mapping/.md` while the page is written to
          //   `/docs/mapping.md`. Rewrite those targets after the export's own
          //   link handling.
          // - An export is read detached from the site, often by an agent that
          //   landed on one narrow page. Give it a pointer to the index.
          remarkPlugins: [
            normalizeExportLinks,
            [prependExportContext, { indexUrl: `${vars.site}/llms.txt` }],
          ],
        },
      } satisfies LlmsTxtOptions,
    ],
  ],
};

async function tailwindPlugin() {
  return {
    name: 'docusaurus-tailwindcss-plugin',
    configurePostCss(postcssOptions) {
      postcssOptions.plugins = [
        ...postcssOptions.plugins,
        require('@tailwindcss/postcss'),
      ];
      return postcssOptions;
    },
    configureWebpack(config) {
      return {
        module: {
          rules: [
            {
              test: /\.scss$/,
              use: ['style-loader', 'css-loader', 'sass-loader'],
            },
          ],
        },
      };
    },
  };
}

// Filter Monaco's cancelation rejection out of the webpack-dev-server
// overlay. The browser-side listener in @walkeros/explorer silences the
// raw rejection, but the overlay hooks rejections independently.
//
// webpack-dev-server stringifies this function with `.toString()` and
// eval's it in the browser, so it must be self-contained with no
// closed-over references. Logic mirrors `isMonacoCancellation` in
// @walkeros/explorer — keep the two in sync.
async function devOverlayFilterPlugin(): Promise<Plugin<unknown>> {
  return {
    name: 'walkeros-dev-overlay-filter',
    configureWebpack: () =>
      ({
        devServer: {
          client: {
            overlay: {
              runtimeErrors: (error: unknown) => {
                const seen = new Set<unknown>();
                const check = (v: unknown): boolean => {
                  if (!v || typeof v !== 'object' || seen.has(v)) return false;
                  seen.add(v);
                  const o = v as { type?: string; cause?: unknown };
                  if (o.type === 'cancelation') return true;
                  return check(o.cause);
                };
                return !check(error);
              },
            },
          },
        },
      }) as never,
  };
}

export default config;
