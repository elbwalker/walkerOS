---
'@walkeros/mcp': minor
---

The `auth` tool logs in through the standard device authorization grant and
keeps the session refreshed.

Breaking, for anyone implementing `ToolClient`: `resolveToken` is replaced by
`credentialSource`, `deleteConfig` by an async `logout` that revokes the session
before dropping it, and `requestDeviceCode`/`pollForToken` return the CLI's
device authorization types.
