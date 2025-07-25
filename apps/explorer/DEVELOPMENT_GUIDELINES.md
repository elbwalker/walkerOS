# Development Guidelines

## Resource Optimization & Log Management

### 🚫 Large Log Data Policy

**During Development:**

- Avoid processing large log outputs in conversations
- Use `--silent` flag for routine test runs
- Only use verbose output when debugging specific issues
- Truncate or summarize large outputs before sharing

### ✅ Efficient Testing Practices

**Standard Commands:**

```bash
# Quick feedback (silent by default)
npm test                    # Run all tests silently
npm run test:quick         # Fast unit tests only
npm run test:foundation    # Core foundation tests

# Debugging specific issues
npm run test:verbose       # Full output when needed
npm run test:coverage      # Coverage with minimal output
```

**Development Workflow:**

1. Use `npm run test:quick` for rapid feedback during coding
2. Use `npm test` for full validation before commits
3. Use `npm run test:verbose` only when debugging failures
4. Use `npm run test:coverage` before major milestones

### 📝 Log Output Guidelines

**When Sharing Test Results:**

- ✅ Summary: "55/55 tests passing"
- ✅ Coverage: "53.62% overall coverage"
- ✅ Specific failures with context
- ❌ Full verbose test output (hundreds of lines)
- ❌ Complete coverage reports unless specifically needed

**File Exclusions (.gitignore):**

- Test logs (`*.log`)
- Coverage reports (`coverage/`)
- Test results (`test-results/`)
- Temporary test files (`test-*.html`, `debug-*.html`)
- Development artifacts

### 🔧 Performance Best Practices

**Jest Configuration:**

- Silent mode by default to reduce output noise
- Selective test patterns to run only relevant tests
- Coverage only when needed (not on every run)
- Watch mode for continuous development

**Development Artifacts:**

- Keep temporary files out of version control
- Use descriptive naming for test files
- Clean up development scripts regularly
- Document any persistent debug files

### 🎯 Communication Efficiency

**Progress Updates:**

- Focus on test pass/fail status
- Highlight specific issues that need attention
- Summarize coverage improvements
- Avoid dumping raw log data

**Error Reporting:**

- Include minimal context around failures
- Show specific error messages
- Truncate stack traces to relevant parts
- Group related issues together

This ensures efficient development cycles and effective communication without
information overload.
