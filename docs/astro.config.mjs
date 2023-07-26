import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://elbwalker.github.io',
  base: '/walker.js',
  integrations: [
    starlight({
      title: 'walker.js docs',
      customCss: ['/src/styles/custom.css'],
      logo: {
        src: '/public/favicon.svg',
      },
      social: {
        github: 'https://github.com/elbwalker/walker.js',
      },
      sidebar: [
        {
          label: '👋 INTRODUCTION',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'What is walker.js?', link: '/introduction/what-is-walkerjs/' },
            { label: 'Basic Idea', link: '/introduction/basic-idea/' },
          ],
        },
        {
          label: '🚀 GETTING STARTED',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Installation', link: '/getting-started/installation/' },
            { label: 'Commands', link: '/getting-started/commands/' },
          ]
        },
        {
          label: '🪄 TAGGING',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'General usage', link: '/tagging/general-usage/' },
            { label: 'Triggers', link: '/tagging/triggers/' },
            { label: 'Properties', link: '/tagging/properties/' },
            { label: 'Nested Entities', link: '/tagging/nested-entities/' },
            { label: 'Context', link: '/tagging/context/' },
            { label: 'Globals', link: '/tagging/globals/' },
            { label: 'User identification', link: '/tagging/user-identification/' },
            { label: 'Using JavaScript (elb)', link: '/tagging/using-javascript/' },
            { label: 'Tagger', link: '/tagging/tagger/' },
          ],
        },
        {
          label: '🎯 DESTINATIONS',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Basics', link: '/destinations/basics/' },
            { label: 'Details', link: '/destinations/details/' },
            { label: 'API', link: '/destinations/api/' },
            { label: 'Google Ads', link: '/destinations/gads/' },
            { label: 'Google Analytics 4 (GA4)', link: '/destinations/ga4/' },
            { label: 'Google Tag Manager', link: '/destinations/gtm/' },
            { label: 'Meta Pixel', link: '/destinations/meta/' },
            { label: 'Piwik PRO', link: '/destinations/piwik/' },
            { label: 'Plausible', link: '/destinations/plausible/' },
            { label: 'Custom (create your own)', 
            items: [
              // Each item here is one entry in the navigation menu.
              { label: 'Basics', link: '/destinations/basics/' },
              { label: 'Details', link: '/destinations/details/' },
              { label: 'API', link: '/destinations/api/' },
              { label: 'Google Ads', link: '/destinations/gads/' },
              { label: 'Google Analytics 4 (GA4)', link: '/destinations/ga4/' },
              { label: 'Google Tag Manager', link: '/destinations/gtm/' },
              { label: 'Meta Pixel', link: '/destinations/meta/' },
              { label: 'Piwik PRO', link: '/destinations/piwik/' },
              { label: 'Plausible', link: '/destinations/plausible/' },
              { label: 'Custom (create your own)', link: '/destinations/custom/' },
            ] },
          ]
        },
        {
          label: '🔓 PRIVACY',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Consent', link: '/privacy/consent/' },
          ],
        },
        {
          label: '🔧 CODING',
          items: [
            // Each item here is one entry in the navigation menu.
            { label: 'Debugging', link: '/coding/debugging/' },
            { label: 'Utils', link: '/coding/utils/' },
          ]
        },
      ],
    }),
  ],  

  // Process images with sharp: https://docs.astro.build/en/guides/assets/#using-sharp
  image: { service: { entrypoint: 'astro/assets/services/sharp' } },
});
