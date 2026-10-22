import { RuleTester } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';
import noSilentReturn from '../rules/no-silent-return.mjs';

const ruleTester = new RuleTester({ languageOptions: { parser: tsParser } });
const silent = { messageId: 'silent' };

ruleTester.run('walkeros/no-silent-return', noSilentReturn, {
  valid: [
    'const d = { on(type) { if (!type) return; }, push(e) { send(e); } };',
    'const d = { push(e) { if (!e) throw new StepError("no event", { code: "missing-input" }); } };',
    'const d = { push(e) { items.forEach((item) => { if (!item) return; use(item); }); } };',
    'const d = { push(e) { return send(e); } };',
    'const d = { on(type) { if (!type) return undefined; } };',
    'const d = { init(context) { if (!context) return; } };',
    'function helper() { return; }',
  ],
  invalid: [
    {
      code: 'const d = { push(event) { if (!url) return; send(event); } };',
      errors: [silent],
    },
    {
      code: 'const d = { async pushBatch(batch) { if (!url) return; } };',
      errors: [silent],
    },
    {
      code: 'const d = { push: async (event) => { if (!url) return; } };',
      errors: [silent],
    },
    {
      code: 'export const push: PushFn = async function (event, ctx) { if (!ctx) return; };',
      errors: [silent],
    },
    {
      code: 'async function pushBatch(batch) { return; }',
      errors: [silent],
    },
    {
      code: 'const d = { push(event) { if (!url) return undefined; send(event); } };',
      errors: [silent],
    },
    {
      code: 'const d = { async push(event) { if (!url) return void log(event); } };',
      errors: [silent],
    },
    {
      code: 'class D { push(event) { if (!event) return; } }',
      errors: [silent],
    },
  ],
});
