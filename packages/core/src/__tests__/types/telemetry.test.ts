import type {
  FlowState,
  FlowStatePhase,
  FlowStepType,
} from '../../types/telemetry';

describe('FlowState types', () => {
  test('compiles a literal with every optional field', () => {
    const state: FlowState = {
      flowId: 'default',
      stepId: 'destination.gtag',
      stepType: 'destination',
      phase: 'out',
      eventId: '1234567890abcdef',
      timestamp: '2026-05-26T10:00:00.000Z',
      elapsedMs: 42,
      durationMs: 5,
      inEvent: { name: 'page view' },
      outEvent: { event: 'page_view' },
      error: { name: 'Error', message: 'boom' },
      mappingKey: 'page view',
      contractRule: 'page view',
      consent: { marketing: true },
      consentApplied: { marketing: true },
      branchId: '0123456789abcdef',
      batch: { size: 10, index: 3 },
      skipReason: 'consent',
      meta: { extra: 'value' },
    };
    expect(state.flowId).toBe('default');
    expect(state.stepType).toBe('destination');
  });

  test('FlowStatePhase narrows to known phases only', () => {
    // Exhaustive list, accepted by the compiler.
    const phases: FlowStatePhase[] = [
      'init',
      'in',
      'out',
      'error',
      'skip',
      'flush',
    ];
    expect(phases).toHaveLength(6);

    // Type-level narrowing assertion: assigning the union to a tagged tuple
    // of literal types proves the union has not widened to `string`.
    const isValidPhase = (value: FlowStatePhase): boolean => {
      switch (value) {
        case 'init':
        case 'in':
        case 'out':
        case 'error':
        case 'skip':
        case 'flush':
          return true;
      }
    };
    expect(isValidPhase('init')).toBe(true);
  });

  test('FlowStepType narrows to known step kinds only', () => {
    const kinds: FlowStepType[] = [
      'source',
      'transformer',
      'collector',
      'destination',
      'store',
    ];
    expect(kinds).toHaveLength(5);

    const isValidKind = (value: FlowStepType): boolean => {
      switch (value) {
        case 'source':
        case 'transformer':
        case 'collector':
        case 'destination':
        case 'store':
          return true;
      }
    };
    expect(isValidKind('source')).toBe(true);
  });
});
