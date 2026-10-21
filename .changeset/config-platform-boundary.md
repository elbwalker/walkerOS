---
'@walkeros/config': patch
---

The presets set `lib` and `types` and enforce the platform: web and neutral code
are held to ES2020 APIs, and the new `@walkeros/config/eslint/neutral` and the
platform bans in `eslint/web` and `eslint/node` keep each package on its own
platform. `npm run check:platform` checks every package.
