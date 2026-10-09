Sticky 60px site header with the walkerOS wordmark, primary nav, GitHub link and theme toggle.

Sits under the AnnouncementBar. Background is `bg` at 88% with an 8px backdrop blur and a bottom `border`. Nav links are `ui` 15px/500 in `fg`, turning `link` on hover. The toggle shows a sun in dark and a moon in light.

**Consumer provides:** `links` ({label, href}[]), `theme` ('dark' | 'light'), `onToggleTheme`, optional `githubHref`, `homeHref`.

Keep the nav to three items (Documentation, Playground, Services); GitHub always sits right.
