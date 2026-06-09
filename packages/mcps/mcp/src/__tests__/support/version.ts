// Defines the build-time __VERSION__ global for the Jest environment
// (tsup injects it in real builds; tests need a value so module-eval-time
// reads like catalog.ts CLIENT_HEADER don't hit an undefined global).
//
// Set via Reflect.set rather than a project-wide `declare global` so it does
// not globally type `__VERSION__` (which would make other tests' guards
// redundant), and without any cast or @ts-expect-error.
Reflect.set(globalThis, '__VERSION__', '0.0.0-test');

export {};
