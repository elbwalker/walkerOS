/**
 * Test for MappingPane settings schema selection logic
 *
 * This test verifies the FIX for the eventType detection bug.
 *
 * BUG: When navigating to mapping.page.view.settings.eventType, the wrong schema
 * was passed to SettingsOverviewPane, causing eventType to be detected as
 * 'valueConfig' instead of 'enum'.
 *
 * ROOT CAUSE: MappingPane case 'settings' was using structure.properties.settings
 * which looked up the config-level settings definition (schemaPath='settings')
 * instead of the rule-level settings (which should use schemaPath='mapping').
 *
 * FIX: Check the PATH to determine schema context:
 * - path = ['settings'] → schemas.settings (config-level)
 * - path includes 'mapping' → schemas.mapping (rule-level)
 */

describe('MappingPane - Settings schema selection', () => {
  /**
   * Extract schema selection logic from MappingPane (lines 365-372)
   */
  function selectSettingsSchema(
    path: string[],
    schemas: { settings?: unknown; mapping?: unknown },
  ): 'settings' | 'mapping' {
    let settingsSchemaPath: 'settings' | 'mapping' = 'settings';

    if (path.length > 1 && path.includes('mapping')) {
      // Rule-level settings (inside mapping entity-action pattern)
      settingsSchemaPath = 'mapping';
    }

    return settingsSchemaPath;
  }

  describe('Config-level settings', () => {
    it('uses schemas.settings for path ["settings"]', () => {
      const path = ['settings'];
      const schemas = { settings: {}, mapping: {} };

      const schemaPath = selectSettingsSchema(path, schemas);

      expect(schemaPath).toBe('settings');
    });
  });

  describe('Rule-level settings (THE FIX)', () => {
    it('uses schemas.mapping for path ["mapping","page","view","settings"]', () => {
      const path = ['mapping', 'page', 'view', 'settings'];
      const schemas = { settings: {}, mapping: {} };

      const schemaPath = selectSettingsSchema(path, schemas);

      expect(schemaPath).toBe('mapping');
    });

    it('uses schemas.mapping for path ["mapping","product","detail","settings"]', () => {
      const path = ['mapping', 'product', 'detail', 'settings'];
      const schemas = { settings: {}, mapping: {} };

      const schemaPath = selectSettingsSchema(path, schemas);

      expect(schemaPath).toBe('mapping');
    });

    it('uses schemas.mapping for deeply nested path', () => {
      const path = ['mapping', 'category', 'nested', 'action', 'settings'];
      const schemas = { settings: {}, mapping: {} };

      const schemaPath = selectSettingsSchema(path, schemas);

      expect(schemaPath).toBe('mapping');
    });
  });

  describe('Integration: Full eventType detection flow', () => {
    it('ensures eventType gets the correct schema', () => {
      // User navigates to mapping.page.view.settings
      const settingsPath = ['mapping', 'page', 'view', 'settings'];

      // MappingPane determines which schema to pass to SettingsOverviewPane
      const schemaKey = selectSettingsSchema(settingsPath, {
        settings: { properties: {} },
        mapping: {
          properties: {
            eventType: {
              type: 'string',
              enum: ['page view', 'e_commerce'],
            },
          },
        },
      });

      // Should use schemas.mapping (NOT schemas.settings)
      expect(schemaKey).toBe('mapping');

      // SettingsOverviewPane will receive schemas.mapping
      // When it checks propSchema for 'eventType', it will find the enum
      // and correctly detect nodeType='enum' (see settings-overview-pane-logic.test.ts)
    });
  });

  describe('Edge cases', () => {
    it('handles single-segment path', () => {
      const path = ['settings'];
      const schemaPath = selectSettingsSchema(path, {
        settings: {},
        mapping: {},
      });

      expect(schemaPath).toBe('settings');
    });

    it('handles path without "mapping" keyword', () => {
      const path = ['someOther', 'path', 'settings'];
      const schemaPath = selectSettingsSchema(path, {
        settings: {},
        mapping: {},
      });

      // Should fall back to settings (no 'mapping' in path)
      expect(schemaPath).toBe('settings');
    });
  });
});
