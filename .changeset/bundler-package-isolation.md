---
'@walkeros/cli': patch
'@walkeros/core': patch
---

Fix deterministic package version resolution in bundler.

- Two-phase resolve-then-install prevents version overwrites
- peerDependencies resolved at lowest priority (not equal to deps)
- Per-build temp directories prevent cross-build interference
- Optional peerDeps (peerDependenciesMeta) correctly skipped
- Prerelease versions handled with includePrerelease flag
- Package names validated against npm naming rules
