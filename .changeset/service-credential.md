---
'@walkeros/core': minor
'@walkeros/server-core': minor
'@walkeros/runner': minor
'@walkeros/cli': minor
---

Runners, scripts and CI now connect to the walkerOS app with one credential in
`WALKEROS_CREDENTIAL`: pair a runner on its flow part's Self-hosted tab, or
create an automation under Account, and the auth host shows it once. The
credential itself is never sent: it buys short-lived tokens bound to its key,
and a runner signs its requests when the auth server cannot be reached, so it
keeps serving. `walkeros auth token` prints a 1-hour bearer token of an
automation for `curl`.

Migration: `WALKEROS_TOKEN` and `WALKEROS_DEPLOY_TOKEN` are gone, and so are
`runneros start`'s `--flow-id` and `--project` and its `WALKEROS_APP_URL`,
`WALKEROS_PROJECT_ID`, `WALKEROS_FLOW_ID` and `WALKEROS_DEPLOYMENT_ID`, the
CLI's `resolveAccessToken` and the runner's `resolveRunToken` and
`resolveAppUrl`; set `WALKEROS_CREDENTIAL` from a pairing or an automation.
