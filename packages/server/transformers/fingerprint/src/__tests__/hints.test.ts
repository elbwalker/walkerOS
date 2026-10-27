import { hints } from '../hints';

describe('hints', () => {
  it('reports a bare config.ingest object as the error it is', () => {
    const text = hints['ingest-prerequisite'].text;
    expect(text).not.toContain('silently inert');
    expect(text).toContain('MAPPING_VALUE_NO_OPERATOR');
  });

  it('says a missing salt stops the flow', () => {
    const text = hints['salt-and-rotation'].text;
    expect(text).not.toContain('the transformer does not start');
    expect(text).toContain('Config settings salt missing');
  });

  it('describes where site comes from without version history', () => {
    const text = hints['site-sources'].text;
    expect(text).toContain('transformer-ga4 sets from the page URL of the hit');
    expect(text).not.toMatch(/older|upgrading/i);
  });
});
