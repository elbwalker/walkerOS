---
'@walkeros/cli': minor
---

Web bundles no longer assign `window.elb`; the browser source owns that global.
The `windowElb` setting is deprecated: its value is forwarded to the browser
source's `config.settings.elb` with a warning, so custom global names keep
working.
