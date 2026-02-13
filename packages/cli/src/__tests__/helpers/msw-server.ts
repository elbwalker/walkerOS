import { setupServer } from 'msw/node';
import { handlers } from './msw-handlers.js';

export const server = setupServer(...handlers);
