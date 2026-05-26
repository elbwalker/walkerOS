---
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

The project, flow, and deployment list operations now accept optional `cursor`
and `limit` arguments and return a `nextCursor` to fetch the next page. Listing
without these arguments is unchanged and returns all results. In the MCP, the
`project_manage`, `flow_manage`, and `deploy_manage` tools expose `cursor` and
`limit` on their `list` action.
