---
'@walkeros/web-core': patch
'@walkeros/web-source-session': patch
---

The session source now accepts a `domain` setting to store session and device ID
cookies on a parent domain, e.g. `example.com`, so subdomains share the same
IDs, and its settings schema accepts `cookie` as a storage type. `storageDelete`
gained a `domain` parameter (third, before `env`) to remove cookies written with
a domain attribute.
