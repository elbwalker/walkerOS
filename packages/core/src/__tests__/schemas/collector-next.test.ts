import { FlowSchema } from '../../schemas/flow';
import { ConfigSchema, InitConfigSchema } from '../../schemas/collector';

const gate = {
  match: { key: 'event.name', operator: 'eq', value: 'page view' },
};

describe('collector.next in the Flow collector section', () => {
  it.each([
    ['string', 'validate'],
    ['string[]', ['validate', 'enrich']],
    ['next', { next: 'validate' }],
    ['gate', { ...gate, next: 'validate' }],
    ['one', { one: [{ ...gate, next: 'a' }, { next: 'b' }] }],
    ['many', { many: ['a', { ...gate, next: 'b' }] }],
    ['unconditional stop', { stop: true }],
    ['conditional stop in a sequence', ['a', { ...gate, stop: true }, 'b']],
  ])('accepts %s', (_label, next) => {
    const result = FlowSchema.safeParse({ collector: { next } });
    expect(result.success).toBe(true);
  });

  it.each([
    ['a number', 5],
    ['stop false', { stop: false }],
    ['stop with next', { stop: true, next: 'a' }],
  ])('rejects %s', (_label, next) => {
    const result = FlowSchema.safeParse({ collector: { next } });
    expect(result.success).toBe(false);
  });

  it.each([
    ['run and globals', { run: true, globals: { language: 'en' } }],
    [
      'consent, user, globals and custom',
      {
        consent: { functional: true, marketing: false },
        user: { id: 'anonymous' },
        globals: { environment: 'demo', version: '$var.flowVersion' },
        custom: { campaign: 'flow-demo' },
      },
    ],
    [
      'code values and unknown keys',
      {
        globals: { startedAt: '$code:Date.now()' },
        tagging: 2,
        somethingNew: { nested: true },
      },
    ],
  ])('accepts a collector section with %s', (_label, collector) => {
    const result = FlowSchema.safeParse({ collector });
    expect(result.success).toBe(true);
    // Unknown keys survive parsing (the section stays open for InitConfig).
    if (result.success) expect(result.data.collector).toEqual(collector);
  });
});

describe('collector.next in Collector.Config and InitConfig', () => {
  it('accepts next on Config', () => {
    const result = ConfigSchema.safeParse({
      globalsStatic: {},
      sessionStatic: {},
      next: { many: ['a', 'b'] },
    });
    expect(result.success).toBe(true);
  });

  it('accepts next on InitConfig', () => {
    const result = InitConfigSchema.safeParse({ next: ['a', { stop: true }] });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid next on InitConfig', () => {
    const result = InitConfigSchema.safeParse({ next: { stop: 'yes' } });
    expect(result.success).toBe(false);
  });
});
