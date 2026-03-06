import {
  registerJsonSchema,
  unregisterJsonSchema,
  generateModelPath,
  getRegisteredSchemaCount,
  clearAllSchemas,
  initMonacoJson,
  resetMonacoJson,
} from '../../utils/monaco-json-schema';

describe('monaco-json-schema', () => {
  const mockSetDiagnosticsOptions = jest.fn();
  const mockMonaco = {
    json: {
      jsonDefaults: {
        setDiagnosticsOptions: mockSetDiagnosticsOptions,
      },
    },
  } as unknown as typeof import('monaco-editor');

  beforeEach(() => {
    mockSetDiagnosticsOptions.mockClear();
    resetMonacoJson();
  });

  describe('before initMonacoJson', () => {
    it('registerJsonSchema queues schemas without calling setDiagnosticsOptions', () => {
      const path = generateModelPath();
      registerJsonSchema(path, { type: 'object' });
      expect(getRegisteredSchemaCount()).toBe(1);
      expect(mockSetDiagnosticsOptions).not.toHaveBeenCalled();
    });

    it('unregisterJsonSchema removes from queue without calling setDiagnosticsOptions', () => {
      const path = generateModelPath();
      registerJsonSchema(path, { type: 'object' });
      unregisterJsonSchema(path);
      expect(getRegisteredSchemaCount()).toBe(0);
      expect(mockSetDiagnosticsOptions).not.toHaveBeenCalled();
    });
  });

  describe('initMonacoJson', () => {
    it('flushes queued schemas on init', () => {
      const path = generateModelPath();
      registerJsonSchema(path, { type: 'object' });
      expect(mockSetDiagnosticsOptions).not.toHaveBeenCalled();

      initMonacoJson(mockMonaco);

      expect(mockSetDiagnosticsOptions).toHaveBeenCalledTimes(1);
      expect(mockSetDiagnosticsOptions).toHaveBeenCalledWith(
        expect.objectContaining({
          validate: true,
          schemas: expect.arrayContaining([
            expect.objectContaining({ schema: { type: 'object' } }),
          ]),
        }),
      );
    });

    it('is idempotent — second call is a no-op', () => {
      initMonacoJson(mockMonaco);
      const otherMock = {
        json: { jsonDefaults: { setDiagnosticsOptions: jest.fn() } },
      } as unknown as typeof import('monaco-editor');
      initMonacoJson(otherMock);

      registerJsonSchema(generateModelPath(), { type: 'string' });
      expect(mockSetDiagnosticsOptions).toHaveBeenCalled();
      expect(
        otherMock.json.jsonDefaults.setDiagnosticsOptions,
      ).not.toHaveBeenCalled();
    });
  });

  describe('after initMonacoJson', () => {
    beforeEach(() => {
      initMonacoJson(mockMonaco);
      mockSetDiagnosticsOptions.mockClear();
    });

    it('registerJsonSchema applies immediately', () => {
      registerJsonSchema(generateModelPath(), { type: 'object' });
      expect(mockSetDiagnosticsOptions).toHaveBeenCalledTimes(1);
    });

    it('unregisterJsonSchema applies immediately', () => {
      const path = generateModelPath();
      registerJsonSchema(path, { type: 'object' });
      mockSetDiagnosticsOptions.mockClear();

      unregisterJsonSchema(path);
      expect(mockSetDiagnosticsOptions).toHaveBeenCalledTimes(1);
      expect(getRegisteredSchemaCount()).toBe(0);
    });

    it('clearAllSchemas removes all and applies', () => {
      registerJsonSchema(generateModelPath(), { type: 'object' });
      registerJsonSchema(generateModelPath(), { type: 'string' });
      mockSetDiagnosticsOptions.mockClear();

      clearAllSchemas();
      expect(getRegisteredSchemaCount()).toBe(0);
      expect(mockSetDiagnosticsOptions).toHaveBeenCalledTimes(1);
    });
  });
});
