---
'@walkeros/web-core': minor
---

Add optional StorageEnv parameter to storageRead, storageWrite, and
storageDelete. Enables dependency injection of window/document for testing and
simulation. Fully backwards-compatible — existing callers are unchanged.
