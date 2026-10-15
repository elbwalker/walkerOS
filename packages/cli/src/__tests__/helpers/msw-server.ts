import { setupServer } from 'msw/node';

/** Shared msw server with no default handlers: each test adds its own. */
export const server = setupServer();
