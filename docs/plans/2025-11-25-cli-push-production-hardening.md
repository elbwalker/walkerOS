# CLI Push Command - Production Hardening Plan

> **Date:** 2025-11-25 **Status:** Planning **Current Score:** 60/100 (Not
> Production Ready) **Target Score:** 85/100 (Production Ready)

## Executive Summary

The CLI push command implementation has been reviewed for production readiness.
While the core functionality works and the architecture is sound, **9 critical
issues** must be fixed before production deployment. With Phase 1 fixes applied,
the command will reach production-ready status (85/100).

### Key Findings

✅ **Strengths:**

- Core functionality works for both server and web platforms
- Clean architecture following established patterns
- Good separation of concerns
- Proper use of shared utilities

❌ **Critical Gaps:**

- No test coverage (0 tests)
- Missing essential CLI flags (--silent, --dry-run)
- Type safety violations (using `any`)
- Resource cleanup gaps
- No timeout protection for server platform

---

## Production Readiness Assessment

| Category            | Score      | Status                  |
| ------------------- | ---------- | ----------------------- |
| Core Functionality  | 90/100     | ✅ Working              |
| Code Quality        | 65/100     | ⚠️ Needs improvement    |
| Error Handling      | 70/100     | ⚠️ Gaps exist           |
| Testing             | 0/100      | ❌ No tests             |
| Documentation       | 20/100     | ❌ Minimal              |
| Resource Management | 50/100     | ⚠️ Cleanup issues       |
| Security            | 75/100     | ⚠️ Acceptable with docs |
| CLI UX              | 70/100     | ⚠️ Inconsistencies      |
| **OVERALL**         | **60/100** | **❌ Not Ready**        |

---

## Critical Issues (Must Fix Before Production)

### Issue #1: Missing --silent and --dry-run Flags

**Severity:** 🔴 Critical **Files:**

- `packages/cli/src/commands/push/types.ts` (lines 7-12)
- `packages/cli/src/index.ts` (lines 111-132)

**Problem:** The push command lacks essential flags that other commands provide:

- `--silent`: Suppress all output (needed for CI/CD)
- `--dry-run`: Preview without execution (needed for safety)

**Current Code:**

```typescript
// packages/cli/src/index.ts:111-132
program
  .command('push [file]')
  .description('Push an event through the flow with real API execution')
  .requiredOption(
    '-e, --event <source>',
    'Event to push (JSON string, file path, or URL)',
  )
  .option('--env <name>', 'Environment name (for multi-environment configs)')
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('--local', 'Execute in local Node.js instead of Docker');
// MISSING: --silent, --dry-run
```

**Fix Required:**

```typescript
program
  .command('push [file]')
  .description('Push an event through the flow with real API execution')
  .requiredOption(
    '--event <source>',
    'Event to push (JSON string, file path, or URL)',
  )
  .option(
    '-e, --env <name>',
    'Environment name (for multi-environment configs)',
  )
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Verbose output')
  .option('-s, --silent', 'Suppress output')
  .option('--dry-run', 'Validate without executing')
  .option('--local', 'Execute in local Node.js instead of Docker');
```

**Also Update Types:**

```typescript
// packages/cli/src/commands/push/types.ts
export interface PushCommandOptions extends GlobalOptions {
  config: string;
  event: string;
  env?: string;
  json?: boolean;
  dryRun?: boolean; // ADD THIS
  // silent and verbose inherited from GlobalOptions
}
```

**Impact if not fixed:** Cannot use in automated CI/CD pipelines, no safety
preview mode.

---

### Issue #2: Unsafe Type Assertions (Violates Codebase Standards)

**Severity:** 🔴 Critical **File:** `packages/cli/src/commands/push/index.ts`
(lines 145-147)

**Problem:** Using `as any` violates the codebase rule: "NEVER use any type"
(AGENT.md).

**Current Code:**

```typescript
// Lines 145-147
logger.info(`   Event ID: ${(result.elbResult as any).id}`);
logger.info(`   Entity: ${(result.elbResult as any).entity}`);
logger.info(`   Action: ${(result.elbResult as any).action}`);
```

**Why it's a problem:**

- No compile-time safety
- Runtime errors if properties don't exist
- Violates codebase standards

**Fix Required:**

```typescript
// Use proper type checking
if (result.elbResult && typeof result.elbResult === 'object') {
  const pushResult = result.elbResult as Elb.PushResult;
  if ('id' in pushResult && pushResult.id) {
    logger.info(`   Event ID: ${pushResult.id}`);
  }
  if ('entity' in pushResult && pushResult.entity) {
    logger.info(`   Entity: ${pushResult.entity}`);
  }
  if ('action' in pushResult && pushResult.action) {
    logger.info(`   Action: ${pushResult.action}`);
  }
}
```

**Impact if not fixed:** Potential runtime errors, technical debt, standard
violations.

---

### Issue #3: Missing JSDOM Cleanup

**Severity:** 🔴 Critical **File:** `packages/cli/src/commands/push/index.ts`
(lines 198-248)

**Problem:** JSDOM window instance is created but never explicitly cleaned up or
dereferenced, potentially causing memory leaks in repeated executions.

**Current Code:**

```typescript
async function executeWebPush(
  bundlePath: string,
  event: Record<string, unknown>,
  logger: Logger,
): Promise<PushResult> {
  const startTime = Date.now();

  try {
    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable',
      virtualConsole,
    });

    const { window } = dom;
    // ... execution code ...

    return { success: true, elbResult, duration };
  } catch (error) {
    return { success: false, duration, error };
  }
  // NO CLEANUP - dom and window references still exist
}
```

**Fix Required:**

```typescript
async function executeWebPush(
  bundlePath: string,
  event: Record<string, unknown>,
  logger: Logger,
): Promise<PushResult> {
  const startTime = Date.now();
  let dom: JSDOM | undefined;

  try {
    const virtualConsole = new VirtualConsole();
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable',
      virtualConsole,
    });

    const { window } = dom;
    // ... execution code ...

    return { success: true, elbResult, duration: Date.now() - startTime };
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  } finally {
    // Cleanup: dereference to allow GC
    dom = undefined;
  }
}
```

**Impact if not fixed:** Memory leaks in production with repeated executions.

---

### Issue #4: No Timeout for Server Push

**Severity:** 🔴 Critical **File:** `packages/cli/src/commands/push/index.ts`
(lines 254-298)

**Problem:** Server push has no timeout mechanism. If factory function or elb
hangs, command hangs forever.

**Current Code:**

```typescript
async function executeServerPush(
  bundlePath: string,
  event: Record<string, unknown>,
  logger: Logger,
): Promise<PushResult> {
  try {
    const flowModule = await import(bundlePath);
    // ... validation ...
    const result = await flowModule.default(); // COULD HANG FOREVER
    const { elb } = result;
    const elbResult = await elb(event.name, event.data || {}); // COULD HANG FOREVER
    return { success: true, elbResult, duration };
  } catch (error) {
    return { success: false, duration, error };
  }
}
```

**Fix Required:**

```typescript
async function executeServerPush(
  bundlePath: string,
  event: Record<string, unknown>,
  logger: Logger,
  timeout: number = 10000, // 10 second timeout
): Promise<PushResult> {
  const startTime = Date.now();

  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error(`Server push timeout after ${timeout}ms`)),
        timeout,
      );
    });

    // Execute with timeout
    const executePromise = (async () => {
      const flowModule = await import(bundlePath);

      if (!flowModule.default || typeof flowModule.default !== 'function') {
        throw new Error('Bundle does not export default factory function');
      }

      const result = await flowModule.default();

      if (!result || !result.elb || typeof result.elb !== 'function') {
        throw new Error(
          'Factory function did not return valid result with elb',
        );
      }

      const { elb } = result;
      logger.info(`Pushing event: ${event.name}`);

      const elbResult = (await elb(
        event.name,
        event.data || {},
      )) as Elb.PushResult;

      return { success: true, elbResult, duration: Date.now() - startTime };
    })();

    // Race between execution and timeout
    return await Promise.race([executePromise, timeoutPromise]);
  } catch (error) {
    return {
      success: false,
      duration: Date.now() - startTime,
      error: getErrorMessage(error),
    };
  }
}
```

**Impact if not fixed:** Production processes can hang indefinitely, blocking
CI/CD pipelines.

---

### Issue #5: Bundle Failure Not Detected

**Severity:** 🔴 Critical **File:** `packages/cli/src/commands/push/index.ts`
(lines 101-107)

**Problem:** Bundle command is awaited, but if it succeeds without creating
output file (edge case), push will try to execute non-existent file.

**Current Code:**

```typescript
// Lines 101-107
await bundle(configWithOutput, {
  cache: true,
  verbose: options.verbose,
  silent: !options.verbose,
});

logger.debug(`Bundle created: ${tempPath}`);

// Step 4: Execute based on platform
let result: PushResult;
// ... tries to use tempPath without verifying it exists
```

**Fix Required:**

```typescript
await bundle(configWithOutput, {
  cache: true,
  verbose: options.verbose,
  silent: !options.verbose,
});

// Verify bundle was created
if (!(await fs.pathExists(tempPath))) {
  throw new Error(
    `Bundle creation failed: output file not found at ${tempPath}`,
  );
}

const bundleStats = await fs.stat(tempPath);
logger.debug(
  `Bundle created: ${tempPath} (${(bundleStats.size / 1024).toFixed(2)} KB)`,
);
```

**Impact if not fixed:** Cryptic "file not found" errors instead of clear bundle
failure messages.

---

### Issue #6: Temp File Cleanup Only in Success Path

**Severity:** 🔴 Critical **File:** `packages/cli/src/commands/push/index.ts`
(lines 156-161, 162-184)

**Problem:** Cleanup only happens in success path. If error occurs, temp files
leak.

**Current Code:**

```typescript
// Lines 120-161 (success path)
if (options.json) {
  // ... output ...
} else {
  if (result.success) {
    logger.success('✅ Event pushed successfully');
    // ... more output ...
  } else {
    logger.error(`❌ Push failed: ${result.error}`);
    process.exit(1);
  }
}

// Cleanup - ONLY EXECUTES IN SUCCESS PATH
try {
  await fs.remove(tempPath);
} catch {
  // Ignore cleanup errors
}
// Lines 162-184 (error catch) - NO CLEANUP HERE
} catch (error) {
  const duration = Date.now() - startTime;
  const errorMessage = getErrorMessage(error);
  // ... error output ...
  process.exit(1);
}  // TEMP FILE NOT CLEANED UP
```

**Fix Required:**

```typescript
try {
  const startTime = Date.now();

  // ... all execution code ...

  // Step 5: Output results
  // ... output code ...
} catch (error) {
  const duration = Date.now() - startTime;
  const errorMessage = getErrorMessage(error);

  if (options.json) {
    const outputLogger = createLogger({ silent: false, json: false });
    outputLogger.log(
      'white',
      JSON.stringify(
        { success: false, error: errorMessage, duration },
        null,
        2,
      ),
    );
  } else {
    logger.error(`❌ Push command failed: ${errorMessage}`);
  }

  process.exit(1);
} finally {
  // Cleanup in ALL cases (success, failure, or interruption)
  if (tempPath) {
    try {
      await fs.remove(tempPath);
      logger.debug(`Cleaned up temp file: ${tempPath}`);
    } catch (cleanupError) {
      // Ignore cleanup errors - temp dir will be cleaned eventually
      logger.debug(`Failed to clean temp file: ${cleanupError}`);
    }
  }
}
```

**Impact if not fixed:** Temp files accumulate in `/tmp`, eventually filling
disk in production.

---

### Issue #7: No Tests

**Severity:** 🔴 Critical **Location:** Missing
`packages/cli/src/__tests__/push/`

**Problem:** Zero test coverage for production-critical functionality.

**Required Tests:**

1. **Unit Tests:**
   - `executeWebPush()` with valid event
   - `executeWebPush()` with timeout
   - `executeWebPush()` with JSDOM errors
   - `executeServerPush()` with valid event
   - `executeServerPush()` with timeout
   - `executeServerPush()` with invalid factory result
   - Event validation logic
   - Platform routing logic

2. **Integration Tests:**
   - Full server platform flow with demo destination
   - Full web platform flow with demo destination
   - Multi-environment config selection
   - Error handling paths
   - Bundle creation and cleanup

3. **E2E Tests:**
   - CLI invocation with file-based event
   - CLI invocation with JSON string event
   - CLI invocation with URL-based event (if supported)
   - --json output mode
   - --verbose output mode
   - Error scenarios

**Test Structure to Create:**

```
packages/cli/src/__tests__/push/
├── index.test.ts              # Integration tests
├── execute-web.test.ts        # Web platform unit tests
├── execute-server.test.ts     # Server platform unit tests
├── validation.test.ts         # Input validation tests
└── fixtures/
    ├── server-config.json
    ├── web-config.json
    └── test-events.json
```

**Impact if not fixed:** No confidence in production deployments, high risk of
regressions.

---

### Issue #8: No Documentation

**Severity:** 🔴 Critical **Location:** Missing
`packages/cli/docs/PUSH_COMMAND.md`

**Problem:** No user-facing documentation for the push command.

**Required Documentation:**

```markdown
# Push Command Documentation

## Overview

Push an event through a walkerOS flow configuration with real API execution.

## Usage

walkeros push <config> --event <event> [options]

## Options

- `--event <source>` (required): Event to push (JSON string, file path, or URL)
- `-e, --env <name>`: Environment name (for multi-environment configs)
- `--json`: Output results as JSON
- `-v, --verbose`: Verbose output
- `-s, --silent`: Suppress output
- `--dry-run`: Validate without executing
- `--local`: Execute in local Node.js instead of Docker

## Event Format

Events must follow the walkerOS event structure with "ENTITY ACTION" naming: {
"name": "page view", "data": { "title": "Home", "path": "/" }, "user": { "id":
"user123" }, "consent": { "functional": true, "marketing": true } }

## Platform Support

- **server**: Node.js server-side destinations (AWS, GCP, etc.)
- **web**: Browser-based destinations (gtag, Meta Pixel, etc.)

## Examples

[... include 10+ real examples ...]

## Error Handling

[... document common errors and solutions ...]

## Troubleshooting

[... provide debugging guidance ...]
```

**Impact if not fixed:** Users don't know how to use the command, support burden
increases.

---

### Issue #9: Platform Validation Too Late

**Severity:** 🟡 Important → 🔴 Critical (waste of resources) **File:**
`packages/cli/src/commands/push/index.ts` (lines 76, 112-120)

**Problem:** Platform validation happens AFTER bundling. If platform is
unsupported, resources are wasted.

**Current Code:**

```typescript
// Line 76
const platform = flowConfig.platform;

// Lines 79-105 - BUNDLE HAPPENS HERE (can take 10+ seconds)
await bundle(configWithOutput, { ... });

// Lines 112-120 - VALIDATION HAPPENS HERE (TOO LATE)
if (platform === 'web') {
  result = await executeWebPush(tempPath, event, logger);
} else if (platform === 'server') {
  result = await executeServerPush(tempPath, event, logger);
} else {
  throw new Error(`Unsupported platform: ${platform}`);  // AFTER WASTING TIME BUNDLING
}
```

**Fix Required:**

```typescript
const platform = flowConfig.platform;

// Validate platform BEFORE bundling
if (platform !== 'web' && platform !== 'server') {
  throw new Error(
    `Unsupported platform: "${platform}". Expected 'web' or 'server'.`
  );
}

// Now proceed with bundle...
logger.info('🔨 Bundling flow configuration...');
await bundle(configWithOutput, { ... });
```

**Impact if not fixed:** Wastes 10+ seconds bundling before reporting error,
poor UX.

---

## Important Issues (Should Fix for Quality)

### Issue #10: Inconsistent Error Handling

**Severity:** 🟡 Important **File:** `packages/cli/src/commands/push/index.ts`
(lines 156-184)

**Problem:**

- No stack traces even in verbose mode
- Different error format between JSON and standard output
- No error categorization (user error vs system error)

**Fix:** Add stack traces in verbose mode and consistent error structure.

---

### Issue #11: Incomplete Event Validation

**Severity:** 🟡 Important **File:** `packages/cli/src/commands/push/index.ts`
(lines 46-63)

**Problem:** Only validates `name` property exists, doesn't validate:

- `data` is object (if present)
- `nested` is array (if present)
- Event name format (warns but doesn't enforce)

**Fix:** Add comprehensive validation:

```typescript
// Validate event structure
if (!event || typeof event !== 'object') {
  throw new Error('Event must be an object');
}

if (!('name' in event) || typeof event.name !== 'string') {
  throw new Error('Event must have a "name" property of type string');
}

if ('data' in event && event.data !== undefined) {
  if (typeof event.data !== 'object' || Array.isArray(event.data)) {
    throw new Error('Event "data" must be an object if provided');
  }
}

if (
  'nested' in event &&
  event.nested !== undefined &&
  !Array.isArray(event.nested)
) {
  throw new Error('Event "nested" must be an array if provided');
}

// Warn about naming convention
if (!event.name.includes(' ')) {
  logger.warn(
    `Event name "${event.name}" should follow "ENTITY ACTION" format (e.g., "page view")`,
  );
}
```

---

### Issue #12: Duration Format Inconsistency

**Severity:** 🟡 Important **File:** `packages/cli/src/commands/push/index.ts`
(line 149)

**Problem:** Push uses milliseconds, simulate uses seconds.

**Current:**

```typescript
logger.info(`   Duration: ${duration}ms`);
```

**Fix:**

```typescript
const durationSeconds = duration / 1000;
logger.info(`   Duration: ${durationSeconds.toFixed(2)}s`);
```

---

### Issue #13: Missing Progress Indication

**Severity:** 🟡 Important **File:** `packages/cli/src/commands/push/index.ts`
(lines 79-105)

**Problem:** Bundle step can take 10+ seconds with no progress indication.

**Fix:**

```typescript
logger.info('🔨 Bundling flow configuration...');
const bundleStart = Date.now();

await bundle(configWithOutput, { ... });

const bundleTime = Date.now() - bundleStart;
logger.debug(`Bundle completed in ${(bundleTime / 1000).toFixed(2)}s`);
```

---

### Issue #14: No Signal Handler Cleanup

**Severity:** 🟡 Important **File:** `packages/cli/src/commands/push/index.ts`

**Problem:** If user presses Ctrl+C, temp file is not cleaned up.

**Fix:** Add signal handlers for graceful shutdown with cleanup.

---

### Issue #15-20: Additional UX Issues

See detailed review document for:

- CLI flag conflicts (-e used twice)
- Missing stack traces in errors
- JSON output missing metadata
- Event name warning can't be suppressed
- Inconsistent logging levels
- No --stats flag

---

## Nice to Have (Future Improvements)

1. **API Call Tracking**: Like simulate command tracks mocked calls
2. **Batch Event Support**: Push multiple events in one command
3. **Retry Logic**: Auto-retry on transient failures
4. **Environment Variable Substitution**: Use env vars in event data
5. **Event Schema Validation**: Validate against JSON schemas

---

## Implementation Plan

### Phase 1: Critical Fixes (Must Do) - 2-3 days

| Task                           | File(s)               | Estimate | Priority |
| ------------------------------ | --------------------- | -------- | -------- |
| Add --silent & --dry-run flags | index.ts, types.ts    | 1 hour   | P0       |
| Fix type assertions            | push/index.ts:145-147 | 30 min   | P0       |
| Add JSDOM cleanup              | push/index.ts:198-248 | 30 min   | P0       |
| Add server timeout             | push/index.ts:254-298 | 1 hour   | P0       |
| Move cleanup to finally        | push/index.ts:156-184 | 1 hour   | P0       |
| Verify bundle exists           | push/index.ts:101-107 | 30 min   | P0       |
| Early platform validation      | push/index.ts:76      | 15 min   | P0       |
| Create test suite              | **tests**/push/\*     | 1 day    | P0       |
| Create documentation           | docs/PUSH_COMMAND.md  | 4 hours  | P0       |

**Total Phase 1:** ~2.5 days

### Phase 2: Important Fixes (Should Do) - 1 day

| Task                        | File(s)               | Estimate | Priority |
| --------------------------- | --------------------- | -------- | -------- |
| Add stack traces in verbose | push/index.ts:162-184 | 30 min   | P1       |
| Enhanced event validation   | push/index.ts:46-63   | 1 hour   | P1       |
| Fix duration format         | push/index.ts:149     | 15 min   | P1       |
| Add bundle progress         | push/index.ts:79-105  | 30 min   | P1       |
| Add signal handlers         | push/index.ts         | 1 hour   | P1       |
| Fix CLI flag conflicts      | index.ts:111-132      | 30 min   | P1       |
| Enhance JSON output         | push/index.ts:126-139 | 1 hour   | P1       |

**Total Phase 2:** ~1 day

### Phase 3: Nice to Have (Future) - Backlog

- API call tracking
- Batch event support
- Retry logic
- Env var substitution
- Schema validation

---

## Testing Strategy

### Unit Tests (Required)

**File:** `packages/cli/src/__tests__/push/execute-web.test.ts`

```typescript
describe('executeWebPush', () => {
  it('should push event successfully', async () => {
    // Test successful web push
  });

  it('should timeout after 5 seconds', async () => {
    // Test timeout mechanism
  });

  it('should handle JSDOM errors', async () => {
    // Test error handling
  });

  it('should cleanup JSDOM resources', async () => {
    // Test cleanup
  });
});
```

**File:** `packages/cli/src/__tests__/push/execute-server.test.ts`

```typescript
describe('executeServerPush', () => {
  it('should push event successfully', async () => {
    // Test successful server push
  });

  it('should timeout after 10 seconds', async () => {
    // Test timeout mechanism
  });

  it('should validate factory function result', async () => {
    // Test validation logic
  });
});
```

### Integration Tests (Required)

**File:** `packages/cli/src/__tests__/push/integration.test.ts`

```typescript
describe('push command integration', () => {
  it('should complete full server flow', async () => {
    // End-to-end server platform test
  });

  it('should complete full web flow', async () => {
    // End-to-end web platform test
  });

  it('should cleanup temp files on success', async () => {
    // Verify cleanup
  });

  it('should cleanup temp files on error', async () => {
    // Verify cleanup in error path
  });

  it('should support multi-environment configs', async () => {
    // Test --env flag
  });
});
```

### E2E Tests (Recommended)

**File:** `packages/cli/src/__tests__/push/e2e.test.ts`

```typescript
describe('push CLI', () => {
  it('should accept file-based events', async () => {
    // Test: walkeros push config.json --event event.json
  });

  it('should accept JSON string events', async () => {
    // Test: walkeros push config.json --event '{"name":"page view"}'
  });

  it('should produce valid JSON output', async () => {
    // Test: walkeros push config.json --event event.json --json
  });

  it('should respect --silent flag', async () => {
    // Test: walkeros push config.json --event event.json --silent
  });

  it('should support --dry-run mode', async () => {
    // Test: walkeros push config.json --event event.json --dry-run
  });
});
```

---

## Documentation Requirements

### User Documentation

**File:** `packages/cli/docs/PUSH_COMMAND.md`

Required sections:

1. Overview and purpose
2. Installation and setup
3. Command syntax and options
4. Event format specification
5. Platform support (web vs server)
6. Configuration requirements
7. 10+ practical examples
8. Error messages and troubleshooting
9. Best practices
10. FAQ

### Code Documentation

Add JSDoc comments to all functions:

```typescript
/**
 * Execute push for web platform using JSDOM environment.
 *
 * @param bundlePath - Absolute path to bundled IIFE JavaScript file
 * @param event - Event object to push (must have name property)
 * @param logger - Logger instance for output
 * @param timeout - Maximum execution time in milliseconds (default: 5000)
 * @returns Push result with success status, elb result, and duration
 *
 * @throws {Error} If bundle file doesn't exist
 * @throws {Error} If JSDOM initialization fails
 * @throws {Error} If window.elb is not assigned within timeout
 * @throws {Error} If elb() call rejects
 */
async function executeWebPush(
  bundlePath: string,
  event: Record<string, unknown>,
  logger: Logger,
  timeout: number = 5000,
): Promise<PushResult>;
```

---

## Success Criteria

### Phase 1 Complete (Production Ready)

- [ ] All 9 critical issues fixed
- [ ] Test suite with >80% coverage
- [ ] User documentation complete
- [ ] CI/CD integration tested
- [ ] Manual testing on both platforms
- [ ] Code review passed
- [ ] Production readiness score: **85/100**

### Phase 2 Complete (Production Hardened)

- [ ] All 11 important issues fixed
- [ ] Test coverage >90%
- [ ] Performance testing done
- [ ] Load testing completed
- [ ] Security review passed
- [ ] Production readiness score: **95/100**

---

## Risk Assessment

| Risk                           | Likelihood | Impact | Mitigation                        |
| ------------------------------ | ---------- | ------ | --------------------------------- |
| Memory leaks in production     | Medium     | High   | Fix Issue #3 (JSDOM cleanup)      |
| Process hangs                  | Medium     | High   | Fix Issue #4 (server timeout)     |
| Disk fills with temp files     | Medium     | Medium | Fix Issue #6 (cleanup in finally) |
| Production failures undetected | High       | High   | Fix Issue #7 (add tests)          |
| User confusion/mistakes        | High       | Medium | Fix Issue #8 (documentation)      |
| Type errors at runtime         | Low        | Medium | Fix Issue #2 (type safety)        |

---

## Appendix: Detailed Code Examples

### Example 1: Complete Cleanup Implementation

```typescript
async function pushCommandWithProperCleanup(
  options: PushCommandOptions,
): Promise<void> {
  const logger = createCommandLogger(options);
  let tempPath: string | undefined;
  let cleanup: (() => Promise<void>) | undefined;

  // Setup signal handlers
  const handleSignal = async (signal: string) => {
    logger.debug(`Received ${signal}, cleaning up...`);
    if (cleanup) await cleanup();
    process.exit(signal === 'SIGINT' ? 130 : 143);
  };

  process.on('SIGINT', () => handleSignal('SIGINT'));
  process.on('SIGTERM', () => handleSignal('SIGTERM'));

  // Define cleanup function
  cleanup = async () => {
    if (tempPath) {
      try {
        await fs.remove(tempPath);
        logger.debug(`Cleaned up: ${tempPath}`);
      } catch (error) {
        logger.debug(`Cleanup failed: ${error}`);
      }
    }
  };

  try {
    // ... all push logic ...

    // Success
    await cleanup();
  } catch (error) {
    // Error
    await cleanup();
    throw error;
  } finally {
    // Remove signal handlers
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
  }
}
```

### Example 2: Enhanced Event Validation

```typescript
function validateEvent(event: unknown): asserts event is WalkerOS.Event {
  // Type check
  if (!event || typeof event !== 'object' || Array.isArray(event)) {
    throw new Error('Event must be an object');
  }

  // Name validation
  if (!('name' in event) || typeof event.name !== 'string') {
    throw new Error('Event must have a "name" property of type string');
  }

  if (event.name.trim().length === 0) {
    throw new Error('Event name cannot be empty');
  }

  // Data validation
  if ('data' in event && event.data !== undefined) {
    if (typeof event.data !== 'object' || Array.isArray(event.data)) {
      throw new Error('Event "data" must be an object if provided');
    }
  }

  // Nested validation
  if ('nested' in event && event.nested !== undefined) {
    if (!Array.isArray(event.nested)) {
      throw new Error('Event "nested" must be an array if provided');
    }
    // Validate nested items
    for (const [index, nested] of event.nested.entries()) {
      if (!nested || typeof nested !== 'object') {
        throw new Error(`Event nested[${index}] must be an object`);
      }
      if (!('type' in nested) || typeof nested.type !== 'string') {
        throw new Error(`Event nested[${index}] must have a "type" property`);
      }
    }
  }

  // User validation
  if ('user' in event && event.user !== undefined) {
    if (typeof event.user !== 'object' || Array.isArray(event.user)) {
      throw new Error('Event "user" must be an object if provided');
    }
  }

  // Context validation
  if ('context' in event && event.context !== undefined) {
    if (typeof event.context !== 'object' || Array.isArray(event.context)) {
      throw new Error('Event "context" must be an object if provided');
    }
  }
}
```

---

## Timeline Estimate

- **Phase 1 (Critical):** 2-3 days
- **Phase 2 (Important):** 1 day
- **Code Review:** 0.5 days
- **Documentation Review:** 0.5 days
- **Testing & QA:** 1 day
- **Total:** 5-6 days

---

## Conclusion

The CLI push command requires **5-6 days of focused work** to reach
production-ready status. The implementation has a solid foundation, but critical
gaps in testing, documentation, error handling, and resource management must be
addressed before production deployment.

With Phase 1 complete, the command will achieve **85/100 production readiness**
and can be safely deployed. Phase 2 improvements will harden the implementation
to **95/100** for enterprise use.
