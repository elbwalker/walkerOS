import type { Hint } from '@walkeros/core';

export const hints: Hint.Hints = {
  'contract-resolution': {
    text: 'A $contract.* reference is resolved to a concrete JSON Schema at bundle time. The runtime transformer never sees a string: by the time push runs, settings.contract holds resolved ContractRule objects (entity-action event schemas and/or a full-event schema) or inline schemas. If you author a flow with $contract.web, the bundler inlines the matching schema before deploy.',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            transformers: {
              validate: {
                package: '@walkeros/transformer-validate',
                config: {
                  settings: {
                    contract: ['$contract.web'],
                    mode: 'strict',
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  },
  'mode-strict-vs-pass': {
    text: 'mode:"strict" drops invalid events by stopping the transformer chain (push returns false), so they never reach downstream destinations. mode:"pass" (the default) never drops: it annotates the event with the verdict and continues, and you route downstream on event.source.valid. Use strict to enforce a contract as a hard gate; use pass to observe quality without losing data.',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            transformers: {
              validate: {
                package: '@walkeros/transformer-validate',
                config: {
                  settings: { contract: ['$contract.web'], mode: 'pass' },
                },
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  },
  'output-split': {
    text: 'The verdict and the error list are written to two different places by design. The boolean verdict goes to the EVENT (default path source.valid): it is analytics-grade data that travels with the event to destinations, and source.valid stays type-clean under WalkerOS.Source. The error list goes to the INGEST (default path validation): it is observer-visible pipeline diagnostics, never analytics data, written in place so it survives even a strict-mode drop. Override either path via output.isValid / output.errors; set either to an empty string to skip that write.',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            transformers: {
              validate: {
                package: '@walkeros/transformer-validate',
                config: {
                  settings: {
                    contract: ['$contract.web'],
                    output: { isValid: 'source.valid', errors: 'validation' },
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  },
  'format-vs-contract': {
    text: 'format:true is a built-in structural check, not an authored schema. It validates the canonical WalkerOS.Event shape (correct field types, no unknown fields). All fields are optional, so it checks structure and types, not presence: a wrong-typed field or malformed structure fails, a missing field does not. It is independent of contract: turn it on to catch malformed events even when you have no contract, or alongside a contract to AND both checks. A contract is the place for your domain rules; format is the place for "is this even a well-formed event".',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            transformers: {
              validate: {
                package: '@walkeros/transformer-validate',
                config: { settings: { format: true, mode: 'pass' } },
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  },
  'gtm-filtering': {
    text: 'There is no ignore field. To filter unwanted events (for example GTM lifecycle pings like gtm.js / gtm.dom), author a contract that REJECTS them and run mode:"strict". A schema where name must NOT match ^gtm\\. fails those events, and strict mode drops them while real events pass. This keeps filtering declarative and contract-driven rather than a separate ad-hoc list.',
    code: [
      {
        lang: 'json',
        code: JSON.stringify(
          {
            type: 'object',
            properties: { name: { not: { pattern: '^gtm\\.' } } },
          },
          null,
          2,
        ),
      },
    ],
  },
  'known-limitations': {
    text: 'The errors list may contain an extra parent entry pointing at a properties wrapper per failure, a quirk of the underlying JSON Schema engine output. The isValid verdict is unaffected: a single real failure can surface as more than one error entry, but isValid is still false exactly when there is at least one failure. v1 emits level:"error" only (no warn level yet).',
  },
};
