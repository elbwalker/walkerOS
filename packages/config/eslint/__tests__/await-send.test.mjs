import { RuleTester } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import awaitSend from '../rules/await-send.mjs';

const ruleTester = new RuleTester({ languageOptions: { parser: tsParser } });
const floating = (name) => ({ messageId: 'floating', data: { name } });

ruleTester.run('walkeros/await-send', awaitSend, {
  valid: [
    'async function push() { await sendServer(url, b); }',
    'function push() { return sendServer(url, b); }',
    'async function push() { const res = await sendWeb(url, b); }',
    'async function push() { await env.sendServer(url, b); }',
    'async function push() { await (env.sendWeb || sendWeb)(url, b); }',
    'function push() { return sendServer(url, b).then(() => undefined); }',
    "function push() { sendWeb(url, b, { transport: 'beacon' }); }",
    "function push() { sendWeb(url, b, { transport: 'xhr' }); }",
    'async function push() { await Promise.all([sendServer(a), sendServer(b)]); }',
    'function push() { send(url, b); }',
  ],
  invalid: [
    {
      code: 'async function push() { sendServer(url, b); }',
      errors: [floating('sendServer')],
    },
    {
      code: 'async function push() { env.sendServer(url, b); }',
      errors: [floating('sendServer')],
    },
    {
      code: 'async function push() { (env.sendWeb || sendWeb)(url, b); }',
      errors: [floating('sendWeb')],
    },
    {
      code: 'async function push() { const sendWebFn = env.sendWeb || sendWeb; sendWebFn(url, b); }',
      errors: [floating('sendWeb')],
    },
    {
      code: 'function send(url: string, sendWebFn: typeof sendWeb) { sendWebFn(url, b, { transport }); }',
      errors: [floating('sendWeb')],
    },
    {
      code: 'async function push() { sendServer(url, b).catch(() => undefined); }',
      errors: [floating('sendServer')],
    },
    {
      code: 'async function push() { void sendWeb(url, b); }',
      errors: [floating('sendWeb')],
    },
    {
      code: "async function push() { sendWeb(url, b, { transport: 'fetch' }); }",
      errors: [floating('sendWeb')],
    },
  ],
});
