import { detectMappingContext } from '../mapping-context-detector';

describe('detectMappingContext', () => {
  it('detects entity and action from JSON path segments', () => {
    const segments = [
      'flows',
      'default',
      'destinations',
      'ga4',
      'mapping',
      'order',
      'complete',
      'data',
    ];
    const result = detectMappingContext(segments);
    expect(result).toEqual({ entity: 'order', action: 'complete' });
  });

  it('detects entity and action deep inside mapping rule', () => {
    const segments = [
      'flows',
      'default',
      'destinations',
      'ga4',
      'mapping',
      'page',
      'view',
      'data',
      'map',
      'title',
    ];
    const result = detectMappingContext(segments);
    expect(result).toEqual({ entity: 'page', action: 'view' });
  });

  it('returns null when not inside mapping', () => {
    const segments = ['flows', 'default', 'sources', 'browser'];
    expect(detectMappingContext(segments)).toBeNull();
  });

  it('returns null when mapping has no entity/action yet', () => {
    const segments = ['flows', 'default', 'destinations', 'ga4', 'mapping'];
    expect(detectMappingContext(segments)).toBeNull();
  });

  it('returns null when only entity (no action yet)', () => {
    const segments = [
      'flows',
      'default',
      'destinations',
      'ga4',
      'mapping',
      'order',
    ];
    expect(detectMappingContext(segments)).toBeNull();
  });
});
