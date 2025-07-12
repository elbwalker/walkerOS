@ -0,0 +1,240 @@
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

walkerOS is a privacy-centric event data collection platform built as a
TypeScript monorepo. It provides a complete first-party tracking system with
modular architecture for data collection (sources), processing (destinations),
and shared utilities.

## Common Development Commands

### Build & Development

```bash
# Root level (all packages)
npm run build      # Build all packages (excludes website)
npm run test       # Test all packages
npm run lint       # Lint all packages
npm run dev        # Development mode for all packages
npm run clean      # Clean all build artifacts

# Package level
cd packages/web/collector
npm run build      # Build individual package
npm run dev        # Jest watch mode for development
npm run test       # Run tests with coverage
npm run lint       # TypeScript check + ESLint
```

### Publishing

```bash
npm run publish-packages  # Build, lint, test, version, and publish
```

## Architecture Overview

### Package Structure

```
packages/
├── types/           # Core TypeScript definitions (foundation)
├── utils/           # Shared utilities (depends on types)
├── web/             # Web-based packages
│   ├── collector/   # Browser-based event collection (source)
│   └── destinations/ # GA4, GTM, Meta Pixel, etc.
├── server/          # Server-based packages
│   ├── collector/   # Server-side event collection (source)
│   └── destinations/ # AWS Firehose, BigQuery, Meta CAPI
├── tagger/          # Implementation helper
└── config/          # Shared build configurations
```

### Dependency Hierarchy

- **@walkerOS/types**: Foundation types used by all packages
- **@walkerOS/utils**: Shared utilities (depends on types)
- **@walkerOS/web-collector**: Browser source (depends on utils)
- **@walkerOS/server-collector**: Server source (depends on utils)
- **Web destinations**: Depend on @walkerOS/web-collector
- **Server destinations**: Depend on @walkerOS/server-collector

### Key Architectural Patterns

**Factory Pattern**: Each source provides factory functions

```typescript
export function webCollector(
  config: WebCollector.InitConfig = {},
): WebCollector.Instance;
```

**Plugin Architecture**: Destinations are pluggable modules

```typescript
export const destinationGA4: Destination = {
  type: 'google-ga4',
  init(config) {
    /* setup */
  },
  push(event, config, mapping) {
    /* send data */
  },
};
```

**Event-Driven State**: Central state management with hooks

```typescript
interface State {
  allowed: boolean;
  consent: Consent;
  destinations: Destinations;
  hooks: Hooks.Functions;
}
```

## Development Guidelines

### Type Safety

- Never use `any` type - explicit typing is required
- All packages must use types from `@walkerOS/types`
- Maintain clear separation between web and server environments

### Code Organization

- Check `@walkerOS/utils` before implementing new shared functionality
- Follow environment separation: web vs server packages
- Prefer vanilla implementations over external dependencies

### Testing

- Focus on package functionality rather than granular function testing
- Maintain 95%+ test coverage across packages
- Use Jest with comprehensive integration tests for destinations

### Build Configuration

- All packages use shared configurations from `packages/config/`
- Standard build outputs: CJS, ESM, and browser formats where applicable
- Consistent npm scripts pattern across all packages

## Event Model

Events follow the `WalkerOS.Event` format:

```typescript
interface Event {
  event: string; // Action name
  data: Properties; // Event-specific data
  context: OrderedProperties; // Contextual information
  globals: Properties; // Global state data
  custom: Properties; // Custom destination data
  consent: Consent; // Consent state
  id: string; // Unique event ID
  timestamp: number; // Event timestamp
  timing: number; // Performance timing
  group: string; // Event grouping
  count: number; // Event sequence
  version: Version; // Walker version info
  user: User; // User identification
  session: SessionData; // Session information
  source: Source; // Source information
}
```

## Monorepo Tools

- **Turbo**: Build orchestration and caching
- **npm workspaces**: Package management
- **Changeset**: Versioning and publishing
- **TypeScript**: Shared tsconfig via `@walkerOS/tsconfig`
- **ESLint**: Shared config via `@walkerOS/eslint`
- **Jest**: Shared config via `@walkerOS/jest`
- **tsup**: Build tool via `@walkerOS/tsup`

# Using Gemini CLI for Large Codebase Analysis

When analyzing large codebases or multiple files that might exceed context
limits, use the Gemini CLI with its massive context window. Use `gemini -p` to
leverage Google Gemini's large context capacity.

## File and Directory Inclusion Syntax

Use the `@` syntax to include files and directories in your Gemini prompts. The
paths should be relative to WHERE you run the gemini command:

### Examples:

**Single file analysis:** gemini -p "@src/main.py Explain this file's purpose
and structure"

Multiple files: gemini -p "@package.json @src/index.js Analyze the dependencies
used in the code"

Entire directory: gemini -p "@src/ Summarize the architecture of this codebase"

Multiple directories: gemini -p "@src/ @tests/ Analyze test coverage for the
source code"

Current directory and subdirectories: gemini -p "@./ Give me an overview of this
entire project"

# Or use --all_files flag:

gemini --all_files -p "Analyze the project structure and dependencies"

Implementation Verification Examples

Check if a feature is implemented: gemini -p "@src/ @lib/ Has dark mode been
implemented in this codebase? Show me the relevant files and functions"

Verify authentication implementation: gemini -p "@src/ @middleware/ Is JWT
authentication implemented? List all auth-related endpoints and middleware"

Check for specific patterns: gemini -p "@src/ Are there any React hooks that
handle WebSocket connections? List them with file paths"

Verify error handling: gemini -p "@src/ @api/ Is proper error handling
implemented for all API endpoints? Show examples of try-catch blocks"

Check for rate limiting: gemini -p "@backend/ @middleware/ Is rate limiting
implemented for the API? Show the implementation details"

Verify caching strategy: gemini -p "@src/ @lib/ @services/ Is Redis caching
implemented? List all cache-related functions and their usage"

Check for specific security measures: gemini -p "@src/ @api/ Are SQL injection
protections implemented? Show how user inputs are sanitized"

Verify test coverage for features: gemini -p "@src/payment/ @tests/ Is the
payment processing module fully tested? List all test cases"

When to Use Gemini CLI

Use gemini -p when:

- Analyzing entire codebases or large directories
- Comparing multiple large files
- Need to understand project-wide patterns or architecture
- Current context window is insufficient for the task
- Working with files totaling more than 100KB
- Verifying if specific features, patterns, or security measures are implemented
- Checking for the presence of certain coding patterns across the entire
  codebase

Important Notes

- Paths in @ syntax are relative to your current working directory when invoking
  gemini
- The CLI will include file contents directly in the context
- No need for --yolo flag for read-only analysis
- Gemini's context window can handle entire codebases that would overflow
  Claude's context
- When checking implementations, be specific about what you're looking for to
  get accurate results