import {
  validateActionInput,
  assertParam,
  FLOW_MANAGE_REQUIREMENTS,
  DEPLOY_MANAGE_REQUIREMENTS,
  PROJECT_MANAGE_REQUIREMENTS,
} from '../action-requirements';
import type { ActionRequirementMap } from '../action-requirements';

describe('assertParam', () => {
  it('throws "<param> is required for <action> action." when undefined', () => {
    expect(() => assertParam(undefined, 'flowId', 'get')).toThrow(
      'flowId is required for get action.',
    );
  });

  it('throws when empty string', () => {
    expect(() => assertParam('', 'name', 'create')).toThrow(
      'name is required for create action.',
    );
  });

  it('does not throw and narrows when a value is present', () => {
    const value: string | undefined = 'flow_1';
    expect(() => assertParam(value, 'flowId', 'get')).not.toThrow();
    // After the assertion, value is narrowed to string.
    assertParam(value, 'flowId', 'get');
    expect(value.startsWith('flow_')).toBe(true);
  });
});

describe('validateActionInput', () => {
  const map: ActionRequirementMap = {
    get: { required: ['flowId'], hint: 'Use action "list".' },
    create: { required: ['name'] },
    preview_create: {
      required: ['flowId'],
      oneOf: [['flowName', 'flowSettingsId']],
    },
  };

  it('returns a message when a required param is missing', () => {
    const result = validateActionInput('flow_manage', 'get', {}, map);
    expect(result).not.toBeNull();
    expect(result).toContain('flowId is required for get action');
  });

  it('returns null when all required params are present', () => {
    const result = validateActionInput(
      'flow_manage',
      'get',
      { flowId: 'f1' },
      map,
    );
    expect(result).toBeNull();
  });

  it('returns a message when a oneOf group has none present', () => {
    const result = validateActionInput(
      'flow_manage',
      'preview_create',
      { flowId: 'f1' },
      map,
    );
    expect(result).not.toBeNull();
    expect(result).toContain('requires one of');
  });

  it('returns null when a oneOf group has one member present', () => {
    const result = validateActionInput(
      'flow_manage',
      'preview_create',
      { flowId: 'f1', flowName: 'demo' },
      map,
    );
    expect(result).toBeNull();
  });

  it('reports a missing required param before an unsatisfied oneOf group', () => {
    const result = validateActionInput(
      'flow_manage',
      'preview_create',
      {},
      map,
    );
    expect(result).toContain('flowId is required for preview_create action');
    expect(result).not.toContain('requires one of');
  });

  it('returns null for an unknown action with no rule', () => {
    const result = validateActionInput(
      'flow_manage',
      'unknown_action',
      {},
      map,
    );
    expect(result).toBeNull();
  });

  it('appends the hint to the message when present', () => {
    const result = validateActionInput('flow_manage', 'get', {}, map);
    expect(result).toContain('Use action "list".');
  });

  it('treats empty string and null as missing', () => {
    expect(
      validateActionInput('flow_manage', 'get', { flowId: '' }, map),
    ).toContain('flowId is required');
    expect(
      validateActionInput('flow_manage', 'get', { flowId: null }, map),
    ).toContain('flowId is required');
  });

  describe('exported maps match handler case labels', () => {
    it('FLOW_MANAGE_REQUIREMENTS covers the guarded actions', () => {
      expect(Object.keys(FLOW_MANAGE_REQUIREMENTS).sort()).toEqual(
        [
          'create',
          'delete',
          'duplicate',
          'get',
          'preview_create',
          'preview_delete',
          'preview_get',
          'preview_list',
          'update',
        ].sort(),
      );
      expect(FLOW_MANAGE_REQUIREMENTS.preview_create).toEqual({
        required: ['flowId'],
        oneOf: [['flowName', 'flowSettingsId']],
      });
    });

    it('DEPLOY_MANAGE_REQUIREMENTS covers deploy, get, delete', () => {
      expect(Object.keys(DEPLOY_MANAGE_REQUIREMENTS).sort()).toEqual(
        ['delete', 'deploy', 'get'].sort(),
      );
    });

    it('PROJECT_MANAGE_REQUIREMENTS update requires projectId and name', () => {
      expect(PROJECT_MANAGE_REQUIREMENTS.update).toEqual({
        required: ['projectId', 'name'],
        hint: 'Use action "list" to see available projects.',
      });
      expect(PROJECT_MANAGE_REQUIREMENTS.set_default).toEqual({
        required: ['projectId'],
        hint: 'Use action "list" to see available projects.',
      });
    });
  });
});
