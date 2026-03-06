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

  it('flags dangling $def. references', () => {
    const json = '{"config": "$def.missing"}';
    const context = { definitions: { existing: {} } };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
  });

  it('flags invalid next/before targets', () => {
    const json = '{"next": "nonexistent"}';
    const context = { stepNames: { transformers: ['validator', 'router'] } };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('nonexistent');
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
    const json = '{"config": "$secret.missing"}';
    const context = { secrets: ['apiKey'] };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('missing');
    expect(issues[0].severity).toBe('warning');
  });

  it('does not flag valid $secret. references', () => {
    const json = '{"config": "$secret.apiKey"}';
    const context = { secrets: ['apiKey'] };
    const issues = validateWalkerOSReferences(json, context);
    expect(issues).toHaveLength(0);
  });
});
