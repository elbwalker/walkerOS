import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const vars = {
  github: 'https://github.com/elbwalker/walkerOS/',
};

const config: Config = {
  title: 'walkerOS',
  tagline: 'Open data collection platform',
  favicon: 'img/favicon.png',

  // Set the production url of your site here
  url: 'https://your-docusaurus-site.example.com',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'elbwalker', // Usually your GitHub org/user name.
  projectName: 'walkerOS', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  markdown: {
    mermaid: true,
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
          editUrl: `${vars.github}tree/develop/website/`,
        },
        blog: {
          showReadingTime: true,
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: `${vars.github}tree/develop/website/`,
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg', // @TODO
    navbar: {
      logo: {
        alt: 'elbwalker logo',
        src: 'img/logo.png',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        { to: '/blog', label: 'Blog', position: 'left' },
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
              to: '/docs',
            },
            {
              label: 'walker.js',
              to: '/docs/clients/walkerjs',
            },
            {
              label: 'Destinations',
              to: '/docs/destinations',
            },
            {
              label: 'Stacks',
              to: '/docs/stacks',
            },
            {
              label: 'Guides',
              to: '/docs/guides',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Blog',
              to: '/blog',
            },
            {
              label: 'GitHub',
              href: vars.github,
            },
            {
              label: 'Discussions',
              href: `${vars.github}/discussions`,
            },
          ],
        },
        {
          title: 'Company',
          items: [
            {
              label: 'About us',
              to: '/company',
            },
            {
              label: 'Privacy Policy',
              to: '/legal/privacy',
            },
            {
              label: 'Terms of Services',
              to: '/legal/terms',
            },
            {
              label: 'Imprint',
              to: '/legal/imprint',
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
      darkTheme: prismThemes.oneDark,
    },
  } satisfies Preset.ThemeConfig,

  plugins: [tailwindPlugin],
};

async function tailwindPlugin(context, options) {
  return {
    name: 'docusaurus-tailwindcss-plugin',
    configurePostCss(postcssOptions) {
      // Appends TailwindCSS and AutoPrefixer.
      postcssOptions.plugins.push(require('tailwindcss'));
      postcssOptions.plugins.push(require('autoprefixer'));
      return postcssOptions;
    },
  };
}

export default config;
