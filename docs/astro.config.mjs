import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'walker.js docs',
      site: 'https://elbwalker.github.io',
      base: '/walker.js',
      customCss: ['/src/styles/custom.css'],
      logo: {
        src: '/public/favicon.svg',
      },
      social: {
        github: 'https://github.com/elbwalker/walker.js',
      },
      sidebar: [
        {
          label: 'Introduction',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Example Guide', link: '/introduction/basic-idea/' },
          ],
        },
        {
          label: 'Reference',
          autogenerate: { directory: 'reference' },
        },
      ],
    }),
  ],

  // Process images with sharp: https://docs.astro.build/en/guides/assets/#using-sharp
  image: { service: { entrypoint: 'astro/assets/services/sharp' } },
});
