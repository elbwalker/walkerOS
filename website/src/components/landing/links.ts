/** Section ids on the home page, the targets of `/#<id>` links. */
export const SECTION_ID = {
  why: 'why',
  features: 'features',
  vendor: 'vendor',
  proof: 'proof',
  moreFeatures: 'more-features',
  beyond: 'beyond',
  plans: 'plans',
  faq: 'faq',
} satisfies Record<string, string>;

/** Every internal route the landing, the navbar and the footer link to. */
export const ROUTES = {
  docs: '/docs/',
  playground: '/playground/',
  demos: '/demos/',
  services: `/#${SECTION_ID.plans}`,
  mcp: '/docs/apps/mcp',
  tagging: '/docs/sources/web/browser/tagging/html-attributes',
  mapping: '/docs/mapping',
  destinations: '/docs/destinations',
  consent: '/docs/guides/consent',
  storybook: '/docs/apps/storybook',
  session: '/docs/sources/web/session',
  dataLayer: '/docs/sources/web/dataLayer',
  flow: '/docs/getting-started/flow',
  server: '/docs/sources/server',
  warehouse: '/docs/destinations/server/gcp',
  privacy: '/legal/privacy',
  imprint: '/legal/imprint',
} satisfies Record<string, string>;

/** Every external URL the landing, the navbar, the footer and the announcement link to. */
export const EXTERNAL = {
  github: 'https://github.com/elbwalker/walkerOS',
  releases: 'https://github.com/elbwalker/walkerOS/releases',
  license: 'https://github.com/elbwalker/walkerOS/blob/main/LICENSE',
  discussions: 'https://github.com/elbwalker/walkerOS/discussions',
  npm: 'https://www.npmjs.com/package/@walkeros/core',
  linkedin: 'https://www.linkedin.com/company/elbwalker/',
  storybook: 'https://storybook.walkeros.io/',
  demo: 'https://demo.walkeros.io',
  about: 'https://www.elbwalker.com',
  services: 'https://www.elbwalker.com/services',
  contact: 'https://www.elbwalker.com/contact/',
  talk: 'https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ25Wb2VGGd0tgYcvwjx2bliKtzcI4u5cnwHoU83E0wUlulyTkldeWyt-7-NfoDj3t8k7PhSZ3ME',
} satisfies Record<string, string>;
