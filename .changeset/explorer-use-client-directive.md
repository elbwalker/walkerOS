---
'@walkeros/explorer': patch
---

The built bundle now preserves its leading `"use client"` directive, so Next.js
treats the package as a client boundary. The minifier could previously strip it,
which broke server components that import the package at build time.
