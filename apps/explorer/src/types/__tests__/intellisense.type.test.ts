import type { IntelliSenseContext } from '../intellisense';

describe('IntelliSenseContext cursor slots', () => {
  test('accepts nodeType and subPath', () => {
    const ctx: IntelliSenseContext = {
      nodeType: 'transformer',
      subPath: ['config', 'mapping'],
    };
    expect(ctx.nodeType).toBe('transformer');
    expect(ctx.subPath).toEqual(['config', 'mapping']);
  });
});
