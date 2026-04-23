---
'@walkeros/cli': patch
'@walkeros/mcp': patch
---

Add `flowId` filter to CLI `listDeployments` and redesign the MCP
`deploy_manage` tool around it.

**CLI (`@walkeros/cli`):**

- `listDeployments({ projectId?, type?, status?, flowId? })` now forwards
  `flowId` as a query parameter to `GET /api/projects/{id}/deployments`.
- New helper `deleteDeploymentByFlowId({ projectId?, flowId, slug? })` deletes
  the active deployment for a flow, surfacing a `DeploymentAmbiguityError` (code
  `MULTIPLE_DEPLOYMENTS`, with a `details[]` list) when a flow has more than one
  active deployment and no slug was supplied.

**MCP (`@walkeros/mcp`) breaking:**

- `deploy_manage`'s `get`, `delete`, and `list` actions now take
  `{ projectId?, flowId, slug? }`. The old `id` parameter has been removed.
  `flowId` is required for `get`/`delete` and optional for `list`. Soft-deleted
  deployments are always excluded.
- When a flow has multiple active deployments and `slug` is not provided,
  `get`/`delete` return a `MULTIPLE_DEPLOYMENTS` error with a `details[]` list
  of `{ slug, type, status, updatedAt }` entries so the caller can pick one.
  `deploy` action is unchanged.
