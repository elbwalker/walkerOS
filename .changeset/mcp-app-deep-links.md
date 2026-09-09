---
'@walkeros/mcp': minor
---

Tools now hand back an `appUrl` link to the screen they are talking about.
`flow_manage` get and create link the flow page, `deploy_manage` deploy and get
link the deployment, and `hub_manage` releases, threads and step history link
the release history or the step. Links are absolute, built from the base URL the
connected door reports, and omitted rather than guessed when the address cannot
be built. `deploy_manage` deploy now also passes an explicit `projectId` through
to the deploy itself, so it no longer deploys into the default project when one
was named.
