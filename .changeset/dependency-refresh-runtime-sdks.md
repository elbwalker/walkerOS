---
'@walkeros/cli': patch
'@walkeros/server-source-express': patch
'@walkeros/server-source-gcp': patch
'@walkeros/server-destination-sqlite': patch
'@walkeros/server-destination-mixpanel': patch
'@walkeros/mcp-source-browser': patch
---

Refresh runtime dependencies to their latest majors: Express 5, Commander 15,
better-sqlite3 12, @libsql/client 0.17, Google Cloud functions-framework 5,
mixpanel 0.22, and jsdom 29. No public API changes; installs now pull the
current versions of these SDKs.
