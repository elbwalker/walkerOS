import { EventSchema, SourceSchema, EntitySchema } from '../schemas/walkeros';

describe('EventSchema v4', () => {
  it('rejects events with version/group/count', () => {
    const bad = {
      name: 'page view',
      version: { source: '', tagging: 0 },
    };
    expect(EventSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts source with url/referrer and no id/previous_id', () => {
    const ok = SourceSchema.safeParse({
      type: 'browser',
      platform: 'web',
      url: 'https://example.com/',
      referrer: 'https://google.com/',
      schema: '4',
    });
    expect(ok.success).toBe(true);
  });

  it('accepts entity without nested/context', () => {
    expect(
      EntitySchema.safeParse({ entity: 'product', data: { id: 'p1' } }).success,
    ).toBe(true);
  });
});
