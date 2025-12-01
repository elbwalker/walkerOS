# @walkeros/cli

## 0.4.2

### Patch Changes

- simulate server and local packages
- cli cache
- Updated dependencies
- Updated dependencies
- Updated dependencies
  - @walkeros/core@0.4.2
  - @walkeros/docker@0.2.2
  - @walkeros/server-core@0.4.2

## 0.4.1

### Patch Changes

- dev entry
- Updated dependencies
  - @walkeros/server-core@0.4.1
  - @walkeros/docker@0.2.1
  - @walkeros/core@0.4.1

## 0.4.0

### Minor Changes

- Consolidate schemas and examples under `/dev` export

### Patch Changes

- Updated dependencies
  - @walkeros/docker@0.2.0
  - @walkeros/core@0.4.0

## 0.3.6

### Patch Changes

- port path and name
- df4b2a1: Read CLI version dynamically from package.json instead of hardcoded
  value
- Updated dependencies
  - @walkeros/docker@0.1.5

## 0.3.5

### Patch Changes

- cli usage
- Updated dependencies
  - @walkeros/docker@0.1.4

## 0.3.4

### Patch Changes

- main module exec

## 0.3.3

### Patch Changes

- force local

## 0.3.2

### Patch Changes

- walkeros cli with docker
- Updated dependencies
  - @walkeros/docker@0.1.2

## 0.3.1

### Patch Changes

- 25f7e10: Fix bundle command template path resolution to support relative paths

  **CLI Changes:**
  - Template paths starting with `./` or `../` in config files are now resolved
    relative to the config file's directory
  - Maintains backward compatibility for other relative paths (resolved from
    cwd)
  - Enables portable flow configs that reference templates next to them

  **Docker Changes:**
  - Updated demo.json and express-console.json to include template and output
    fields
  - Flow files can now be bundled standalone using the CLI bundle command
  - Templates are referenced using `../templates/base.hbs` relative to flow file

  **Example:**

  ```bash
  # Now works from any directory
  node dist/index.mjs bundle -c packages/docker/flows/demo.json
  ```

- hello
- Updated dependencies [25f7e10]
- Updated dependencies
- Updated dependencies
  - @walkeros/docker@0.1.1
  - @walkeros/core@0.3.1

## 0.2.0

### Minor Changes

- env

### Patch Changes

- Updated dependencies
  - @walkeros/core@0.2.0
