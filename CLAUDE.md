# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

walkerOS is a privacy-centric event data collection platform built as a TypeScript monorepo. It provides a complete first-party tracking system with modular architecture for data collection (sources), processing (destinations), and shared utilities.

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
cd packages/web/walkerjs
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
│   ├── walkerjs/    # Browser-based event collection (source)
│   ├── google/      # Google destinations (GA4, GTM, Ads, DataLayer)
│   ├── meta/        # Meta Pixel destination
│   ├── piwikpro/    # Piwik Pro destination
│   └── plausible/   # Plausible destination
├── node/            # Node-based packages
│   ├── walkerjs/    # Server-side event collection (source)
│   ├── aws/         # AWS Firehose destination
│   ├── google/      # BigQuery destination
│   └── meta/        # Meta CAPI destination
├── tagger/          # Implementation helper
└── config/          # Shared build configurations
```

### Dependency Hierarchy
- **@walkerOS/types**: Foundation types used by all packages
- **@walkerOS/utils**: Shared utilities (depends on types)
- **@walkerOS/web**: Browser source (depends on utils)
- **@walkerOS/node**: Server source (depends on utils)
- **Web destinations**: Depend on @walkerOS/web
- **Node destinations**: Depend on @walkerOS/node

### Key Architectural Patterns

**Factory Pattern**: Each source provides factory functions
```typescript
export function Walkerjs(config: SourceWalkerjs.InitConfig = {}): SourceWalkerjs.Instance
```

**Plugin Architecture**: Destinations are pluggable modules
```typescript
export const destinationGA4: Destination = {
  type: 'google-ga4',
  init(config) { /* setup */ },
  push(event, config, mapping) { /* send data */ }
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
- Maintain clear separation between web and node environments

### Code Organization
- Check `@walkerOS/utils` before implementing new shared functionality
- Follow environment separation: web vs node packages
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
  event: string;           // Action name
  data: Properties;        // Event-specific data
  context: OrderedProperties; // Contextual information
  globals: Properties;     // Global state data
  custom: Properties;      // Custom destination data
  consent: Consent;        // Consent state
  id: string;             // Unique event ID
  timestamp: number;       // Event timestamp
  timing: number;          // Performance timing
  group: string;           // Event grouping
  count: number;           // Event sequence
  version: Version;        // Walker version info
  user: User;             // User identification
  session: SessionData;    // Session information
  source: Source;          // Source information
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