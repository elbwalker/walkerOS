# Security Policy

## Reporting a vulnerability

Please report security issues privately through GitHub's
[private vulnerability reporting](https://github.com/elbwalker/walkerOS/security/advisories/new).
Do not open a public issue, pull request or discussion for a suspected
vulnerability.

A useful report contains:

- the affected package and version (for example `@walkeros/collector@4.8.2`),
  the walker.js bundle or the Docker image
- the steps or a minimal flow config that reproduce it
- the impact you see: what an attacker can read, change or run

## What happens next

- We confirm receipt within 3 working days.
- We assess the report, keep you informed while we work on a fix, and agree on a
  disclosure date with you.
- Fixes ship in a new release of the affected packages. We publish a GitHub
  security advisory, request a CVE where it applies, and credit you unless you
  prefer not to be named.

We do not run a paid bug bounty.

## Supported versions

Security fixes go into the latest release of the current major version (4.x).
Older versions are not patched. Please upgrade to the latest release.

## Scope

In scope is everything built from this repository:

- the `@walkeros/*` packages on npm
- the walker.js browser bundle
- the `walkeros/flow` and `walkeros/cli` Docker images

Out of scope:

- vendor scripts and APIs that a destination loads or calls; please report those
  to the vendor
- a flow that is insecure by its own configuration, for example one that sends
  personal data to a destination on purpose

The hosted walkerOS app is not built from this repository. Report issues with it
through the same form, and we route them.

## Verifying releases

The npm packages are published from GitHub Actions with npm provenance
attestations. To check the signatures and attestations of the packages you
installed, run:

```bash
npm audit signatures
```
