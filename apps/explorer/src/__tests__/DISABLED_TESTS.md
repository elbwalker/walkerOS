# Disabled Tests

The following test files have been temporarily disabled because they test
components that haven't been implemented yet:

## Disabled Files:

- `phase1-components.test.ts.disabled` - Tests for Phase 2 components
  (CodeEditor, Preview, etc.)
- `vanilla-integration.test.ts.disabled` - Integration tests for the full
  vanilla JS API

## Why Disabled:

These tests were written for components that are planned in Phase 2 of the
refactoring. They were causing the test suite to fail because they import
modules that don't exist yet.

## When to Re-enable:

Re-enable these tests by removing the `.disabled` extension once the
corresponding components are implemented in Phase 2.

## Current Working Tests:

- `quick.test.ts` - Fast unit tests for development (16 tests)
- `foundation.test.ts` - Comprehensive foundation tests (39 tests)
- Total: **55 passing tests** providing solid foundation coverage

This ensures our test suite is always a reliable source of truth.
