import { validateWalkerOSReferences } from '../monaco-walkeros-markers';

describe('validateWalkerOSReferences', () => {
  it('flags dangling $var. references', () => {
    const json = '{"config": "$var.missing"}';
    const context = { variables: { existing: 'value' } };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('missing');
    expect(issues[0].severity).toBe('warning');
  });

  it('does not flag valid $var. references', () => {
    const json = '{"config": "$var.existing"}';
    const context = { variables: { existing: 'value' } };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(0);
  });

  it('does not flag valid $var. deep-path references', () => {
    const json = '{"config": "$var.api.v2.url"}';
    const context = { variables: { api: { v2: { url: 'https://x' } } } };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(0);
  });

  it('flags dangling $var. deep-path references on missing root', () => {
    const json = '{"config": "$var.missing.nested.path"}';
    const context = { variables: { existing: 'value' } };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('missing');
  });

  it('flags invalid next/before targets', () => {
    const json = '{"next": "nonexistent"}';
    const context = { stepNames: { transformers: ['validator', 'router'] } };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('nonexistent');
  });

  it('does not flag known scalar next transformer', () => {
    const json = '{"next": "validator"}';
    const context = { stepNames: { transformers: ['validator'] } };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(0);
  });

  it('flags unknown element in array form', () => {
    const json = '{"next": ["validator", "missing"]}';
    const context = { stepNames: { transformers: ['validator'] } };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('missing');
  });

  it('flags unknown inner next in Route[] form', () => {
    const json =
      '{"before": [{"match": "*", "next": "ghost"}, {"match": "x", "next": "validator"}]}';
    const context = { stepNames: { transformers: ['validator'] } };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('ghost');
  });

  it('does not emit chain-ref issues when stepNames is absent from context', () => {
    const json =
      '{"next": "missing1", "before": [{"match": "*", "next": "missing2"}]}';
    const issues = validateWalkerOSReferences(json, {});
    expect(issues).toHaveLength(0);
  });

  it('returns empty for valid references', () => {
    const json = '{"next": "validator", "config": "$var.id"}';
    const context = {
      variables: { id: '123' },
      stepNames: { transformers: ['validator'] },
    };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(0);
  });

  it('flags dangling $secret. references', () => {
    const json = '{"config": "$secret.MISSING"}';
    const context = { secrets: ['API_KEY'] };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('MISSING');
    expect(issues[0].severity).toBe('warning');
  });

  it('does not flag valid $secret. references', () => {
    const json = '{"config": "$secret.API_KEY"}';
    const context = { secrets: ['API_KEY'] };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(0);
  });

  it('flags dangling $store. references', () => {
    const json = '{"config": "$store.missing"}';
    const context = { stores: ['cache'] };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('missing');
    expect(issues[0].severity).toBe('warning');
  });

  it('does not flag valid $store. references', () => {
    const json = '{"config": "$store.cache"}';
    const context = { stores: ['cache'] };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(0);
  });

  it('does not validate $store. when stores inventory is absent', () => {
    const json = '{"config": "$store.anything"}';
    const issues = validateWalkerOSReferences(json, {});
    expect(issues).toHaveLength(0);
  });

  it('flags dangling $env. references when envNames inventory is provided', () => {
    const json = '{"config": "$env.MISSING"}';
    const context = { envNames: ['API_URL'] };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('MISSING');
    expect(issues[0].severity).toBe('warning');
  });

  it('does not flag valid $env. references', () => {
    const json = '{"config": "$env.API_URL"}';
    const context = { envNames: ['API_URL'] };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(0);
  });

  it('does not validate $env. when envNames is absent', () => {
    const json = '{"config": "$env.ANY_VAR"}';
    const issues = validateWalkerOSReferences(json, {});
    expect(issues).toHaveLength(0);
  });

  it('flags dangling $flow. references', () => {
    const json = '{"config": "$flow.missing"}';
    const context = { flows: ['web_prod'] };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('missing');
    expect(issues[0].severity).toBe('warning');
  });

  it('does not flag valid $flow. references with deep path', () => {
    const json = '{"config": "$flow.web_prod.url"}';
    const context = { flows: ['web_prod'] };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(0);
  });

  it('does not validate $flow. when flows inventory is absent', () => {
    const json = '{"config": "$flow.anything"}';
    const issues = validateWalkerOSReferences(json, {});
    expect(issues).toHaveLength(0);
  });
});
