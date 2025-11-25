# runneros

Shorthand command for walkerOS CLI.

## Usage

Instead of typing:

```bash
npx @walkeros/cli bundle
```

You can now use:

```bash
npx runneros bundle
```

## Commands

All commands from `@walkeros/cli` are available:

```bash
# Bundle walkerOS components
npx runneros bundle

# Simulate event processing
npx runneros simulate

# Run collector/server
npx runneros run collect <file>
npx runneros run serve <file>
```

## Installation

```bash
npm install -g runneros
```

Or use directly with npx:

```bash
npx runneros --help
```

## Documentation

For full documentation, see the
[walkerOS CLI documentation](https://github.com/elbwalker/walkerOS/tree/main/packages/cli).
