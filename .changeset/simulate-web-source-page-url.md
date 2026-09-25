---
'@walkeros/cli': minor
---

Web source simulation starts only the simulated source, so a CMP or session
example no longer gets a page view from the browser source. `--page-url` sets
the simulated page (http or https); otherwise the trigger's `options.url` or
`http://localhost` is used. Sources that declare recorded calls, such as SQS,
now list them.
