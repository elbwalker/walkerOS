# Explorer Package Tests

This directory contains integration tests for the @walkeros/explorer package.

## Test Structure

- `build.test.ts` - Verifies package build and exports
- `index.test.tsx` - Tests main package exports
- `liveCode.test.tsx` - Integration tests for LiveCode component
- `tagging.test.tsx` - Integration tests for Tagging component
- `liveDestination.test.tsx` - Integration tests for destination components

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run dev

# Run specific test file
npm test -- liveCode.test.tsx
```

## Test Focus

These are integration tests that verify:

1. **Component Rendering** - Components render without crashing
2. **Basic Functionality** - Core features work as expected
3. **Error Handling** - Components handle errors gracefully
4. **User Interactions** - Basic user interactions work
5. **Package Exports** - All exports are available and functional

## Mock Strategy

- External dependencies are mocked at the module level
- Focus is on component behavior, not implementation details
- Tests verify the public API and user-facing functionality

## Dependencies

- `@testing-library/react` - Component testing utilities
- `@testing-library/jest-dom` - DOM testing matchers
- `@walkeros/jest` - Shared Jest configuration
