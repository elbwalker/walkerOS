# walkeros

Shorthand package for the walkerOS CLI: `npx walkeros` runs the `walkeros`
command of [`@walkeros/cli`](https://www.npmjs.com/package/@walkeros/cli) and
passes every argument on to it.

## Usage

Instead of typing:

```bash
npx @walkeros/cli bundle flow.json -o dist/
```

You can use:

```bash
npx walkeros bundle flow.json -o dist/
```

## Commands

All commands from `@walkeros/cli` are available:

```bash
# Bundle a flow
npx walkeros bundle flow.json -o dist/

# Push an event through the flow, destinations mocked
npx walkeros push flow.json --event '{"name":"page view"}' --simulate destination.demo

# Validate a flow
npx walkeros validate flow.json
```

The CLI builds flows; it does not run them. Start a built server flow with
`runneros` from
[`@walkeros/runner`](https://www.npmjs.com/package/@walkeros/runner).

## Installation

Use this package through npx, as above. A global install of it
(`npm install -g walkeros`) gives a `walkeros` command that prints nothing and
exits 0 for every command, because it starts the library entry of
`@walkeros/cli` instead of its command. For a global install, use the CLI
package itself:

```bash
npm install -g @walkeros/cli
```

## Documentation

For full documentation, see the
[walkerOS CLI documentation](https://www.walkeros.io/docs/apps/cli).
