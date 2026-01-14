import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const vars = {
  github: 'https://github.com/elbwalker/walkerOS/',
  linkedin: 'https://www.linkedin.com/company/elbwalker/',
};

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
    experimental_faster: {
      swcJsLoader: true, // Use SWC instead of Babel
      swcJsMinimizer: true, // Use SWC instead of Terser (less memory)
      swcHtmlMinimizer: true, // Use SWC for HTML minification
      lightningCssMinimizer: true, // Use Lightning CSS instead of cssnano
      rspackBundler: true, // Use Rspack instead of webpack (much faster, less memory)
      mdxCrossCompilerCache: true, // Compile MDX only once
    },
  },

  // Set the production url of your site here
  url: 'https://www.walkeros.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: process.env.DOCUSAURUS_BASEURL || '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'elbwalker', // Usually your GitHub org/user name.
  projectName: 'walkerOS', // Usually your repo name.

  onBrokenLinks: 'throw',

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

  themes: ['@docusaurus/theme-live-codeblock', '@docusaurus/theme-mermaid'],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: `${vars.github}edit/main/website/`,
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
        alt: 'elbwalker logo',
        src: 'img/walkerOS_logo_new.svg',
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

  plugins: [tailwindPlugin],
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

export default config;
