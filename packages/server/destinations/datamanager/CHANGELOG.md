# Changelog

All notable changes to the @walkeros/server-destination-datamanager package will
be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2025-11-12

### Added

#### Core Features

- Initial release of Google Data Manager destination for walkerOS
- Support for events.ingest API endpoint
- Multi-platform destination support (Google Ads, DV360, GA4)
- OAuth 2.0 authentication with bearer tokens

#### Privacy & Compliance

- Automatic SHA-256 hashing of PII (email, phone, names)
- Gmail-specific email normalization (dot removal)
- E.164 phone number formatting
- Partial address hashing (names hashed, region/postal plain text)
- DMA consent management (adUserData, adPersonalization)
- Request-level and event-level consent support

#### Attribution

- GCLID extraction from context/data/globals
- Support for gbraid (iOS post-ATT attribution)
- Support for wbraid (web-to-app attribution)
- Session attributes support for privacy-safe attribution
- Automatic user identifier extraction (max 10 per event)

#### Data Transformation

- Event formatting with RFC 3339 timestamp
- Transaction ID for deduplication (max 512 chars)
- Conversion value and currency support
- Cart data support for e-commerce
- Event name mapping (max 40 chars for GA4)
- Event source specification (WEB, APP, IN_STORE, PHONE, OTHER)

#### Configuration

- Multiple destination support (max 10 per request)
- Optional batching configuration (max 2000 events)
- Validation-only mode for testing
- Custom endpoint URL support
- Test event code support for debugging
- Flexible mapping system with priority: event.data < config.data < event
  mapping

#### Type Safety

- Comprehensive TypeScript type definitions for Google Data Manager API
- Zod validation schemas for settings and configuration
- No `any` types used throughout codebase
- Full type inference support

#### Testing

- 62 comprehensive tests covering all functionality
- Component-level integration tests with mocked fetch API
- Hash function tests (email, phone, name normalization)
- Event formatting and data extraction tests
- Error handling and edge case coverage
- 100% test pass rate

#### Documentation

- Complete README with usage examples
- Inline code documentation with JSDoc
- Configuration examples (basic and advanced)
- Event mapping examples for common use cases
- Type definitions exported for IDE autocomplete

### Implementation Details

#### File Structure

- `src/index.ts` - Main destination export
- `src/push.ts` - Core push logic and API communication
- `src/config.ts` - Configuration validation
- `src/hash.ts` - PII hashing utilities
- `src/format.ts` - Event formatting and data extraction
- `src/types/index.ts` - TypeScript type definitions
- `src/schemas/` - Zod validation schemas
- `src/examples/` - Usage examples
- `src/__tests__/` - Comprehensive test suite

#### Key Dependencies

- `@walkeros/core@0.3.0` - Core types and utilities
- `@walkeros/server-core@0.3.0` - Server utilities (hashing, HTTP)

#### Known Limitations

- No automatic batching (events processed individually)
- 14-day conversion window (API restriction)
- No audience member ingestion (Phase 2 feature)
- No request status checking (Phase 2 feature)
- No AWS/GCP KMS encryption support (Phase 3 feature)
- No automatic retry on rate limit errors (Phase 2 feature)

### Technical Notes

#### Hash Implementation

- SHA-256 with HEX encoding (64 characters)
- Email: lowercase, Gmail dot removal, then hash
- Phone: E.164 format (+[country][number]), then hash
- Names: lowercase, prefix/suffix removal, then hash
- Suffix order: longest first to prevent partial matches (iii before ii)

#### Context Property Handling

- Supports walkerOS [value, scope] tuple format
- Extracts string value from tuples automatically
- Falls back to direct string values when not tuples

#### Data Merging Priority

1. event.data (lowest priority)
2. config.data from destination config
3. Event mapping data (highest priority)

### Security

- All PII automatically hashed before transmission
- No sensitive data logged in errors
- OAuth tokens passed via Authorization header
- HTTPS required for all API communication

### Performance

- Single HTTP request per event (no batching yet)
- Async/await throughout for non-blocking operations
- Efficient hash computation using Node.js crypto
- No unnecessary data copies or transformations

[0.3.0]: https://github.com/elbwalker/walkerOS/releases/tag/v0.3.0
