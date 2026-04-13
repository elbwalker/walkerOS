---
'@walkeros/cli': minor
'@walkeros/core': minor
---

**BREAKING CHANGE:** The `packages` block has moved from `flow.<name>.packages`
to `flow.<name>.bundle.packages`. Flow files using the old shape fail fast with
a migration error pointing to the new location.

Also adds `flow.<name>.bundle.overrides` — a `Record<string, string>` for
pinning transitive dependency versions, matching npm's `overrides` semantics.
Use this to resolve version conflicts when a transitive dependency's declared
range conflicts with another required version in the same tree (the original
motivating case: `@amplitude/engagement-browser` pins
`@amplitude/analytics-types@^1.0.0` while `@amplitude/analytics-browser`
transitively requires `analytics-types@2.11.1` exact — previously an
unresolvable bundler conflict).

**Migration:** move the existing `packages` block one level deeper into a new
`bundle` wrapper.

```diff
  {
    "version": 3,
    "flows": {
      "default": {
        "web": {},
-       "packages": {
-         "@walkeros/collector": {}
-       },
+       "bundle": {
+         "packages": {
+           "@walkeros/collector": {}
+         }
+       },
        "sources": { },
        "destinations": { }
      }
    }
  }
```

**Overrides example:**

```json
{
  "flows": {
    "default": {
      "web": {},
      "bundle": {
        "packages": {
          "@walkeros/web-destination-amplitude": {}
        },
        "overrides": {
          "@amplitude/analytics-types": "2.11.1"
        }
      }
    }
  }
}
```

Overrides only substitute **transitive** dependencies during resolution — direct
package specs declared in `bundle.packages` always win. Overrides targeting a
direct local-path package emit a warning and are ignored. Peer constraint
mismatches against the chosen override emit a warning but do not error (the
override is an explicit user directive).
