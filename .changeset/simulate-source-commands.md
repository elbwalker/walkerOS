---
'@walkeros/cli': minor
'@walkeros/mcp': minor
'@walkeros/web-source-session': patch
---

A source simulation now lists the walker commands the source issues itself as
`elb` calls, such as a CMP's `walker consent` or the session source's `user` and
`session`. MCP shows them without `verbose` and counts them in the summary. The
session example trigger starts one session per run and treats a page load as a
navigation.
