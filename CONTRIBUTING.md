# Contributing to walkerOS

walkerOS is open source and will remain open source. We believe companies should
own their data infrastructure. True data ownership only comes when you control
your data collection. Thanks for considering a contribution, we appreciate them
all.

## Ways to contribute

- **Report bugs** via
  [GitHub issues](https://github.com/elbwalker/walkerOS/issues) (issue templates
  available)
- **Suggest features**: open an issue first so we can discuss the approach
  before you invest time in code
- **Improve documentation**: the docs live in `website/docs/`
- **Contribute code**: fix bugs, improve packages, or create new destinations,
  sources, or transformers (the `skills/` folder has step-by-step guides)
- **Help other users**: answer questions in issues and discussions

## Getting started

The easiest setup is the devcontainer, which installs all dependencies and
tooling automatically. A manual setup works too:

```bash
npm install        # Install dependencies
npm run build      # Build all packages
npm run dev        # Watch mode
```

For the full setup guide, package structure, and verification scripts, see the
[contributing documentation](https://www.walkeros.io/docs/contributing) and
[AGENT.md](./AGENT.md), the quick reference for contributors and AI assistants.

## Development workflow

- **Test first.** walkerOS follows test-driven development with Jest. Write the
  test, watch it fail, then implement.
- **Verify the smallest scope that proves your change:**

  ```bash
  npm run verify:touched -- <package>  # One package: typecheck + lint + test
  npm run verify:affected              # Everything affected since origin/main
  ```

- **Event naming** is `"entity action"` with a space (`"page view"`, not
  `"page_view"`).
- **No `any`** in production code. If types don't fit, fix the code, not the
  types.

## Pull requests

1. For anything larger than a small fix, open an issue first and outline the
   approach.
2. Keep the PR scoped: one concern per pull request.
3. Include tests for the change and make sure verification passes.
4. Add a changeset (`npx changeset`) when the change affects published packages.
   Skip it for docs, CI, or internal refactoring.
5. CI runs typecheck, lint, and tests on every PR.

## Licensing

walkerOS is licensed under the [MIT license](./LICENSE). By submitting a
contribution, you agree that:

- your contribution is provided under the same MIT license that covers the
  project (inbound = outbound), and
- you have the right to submit the work under this license: it is your own work,
  or you are permitted to contribute it (for example by your employer, if you
  contribute in the course of your employment).

There is no CLA to sign. If your company's legal team has questions about
contributing, we are happy to talk to them directly:
[hello@elbwalker.com](mailto:hello@elbwalker.com).

## Questions

- [Open an issue](https://github.com/elbwalker/walkerOS/issues)
- [Send an email](mailto:hello@elbwalker.com)
