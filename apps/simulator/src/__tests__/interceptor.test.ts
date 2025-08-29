import { createInterceptor, createCaptureHandler } from '../interceptor';
import type { FlowCapture, CaptureCallback } from '../types';

describe('Interceptor', () => {
  const simulationId = 'test-simulation';
  const nodeId = 'test-node';

  describe('createInterceptor', () => {
    it('creates wrapper config with dryRun enabled', () => {
      const mockCallback: CaptureCallback = jest.fn();
      const interceptor = createInterceptor(simulationId, mockCallback);

      const wrapperConfig = interceptor.createWrapperConfig(
        nodeId,
        'destination_output',
      );

      expect(wrapperConfig.dryRun).toBe(true);
      expect(wrapperConfig.onCall).toBeDefined();
    });

    it('captures function calls through onCall callback', () => {
      const mockCallback: CaptureCallback = jest.fn();
      const interceptor = createInterceptor(simulationId, mockCallback);

      const wrapperConfig = interceptor.createWrapperConfig(
        nodeId,
        'destination_output',
      );
      const mockContext = { name: 'gtag' };
      const mockArgs = ['event', 'view_item', { item_id: 'P123' }];

      wrapperConfig.onCall!(mockContext, mockArgs);

      expect(mockCallback).toHaveBeenCalledWith({
        stage: 'destination_output',
        nodeId,
        data: mockArgs,
        functionName: 'gtag',
        args: mockArgs,
      });
    });

    it('creates different wrapper configs for different stages', () => {
      const mockCallback: CaptureCallback = jest.fn();
      const interceptor = createInterceptor(simulationId, mockCallback);

      const sourceConfig = interceptor.createWrapperConfig(
        'source-1',
        'source_output',
      );
      const destConfig = interceptor.createWrapperConfig(
        'dest-1',
        'destination_input',
      );

      const mockContext = { name: 'testFunction' };
      const mockArgs = ['test'];

      sourceConfig.onCall!(mockContext, mockArgs);
      destConfig.onCall!(mockContext, mockArgs);

      expect(mockCallback).toHaveBeenCalledTimes(2);
      expect(mockCallback).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          stage: 'source_output',
          nodeId: 'source-1',
        }),
      );
      expect(mockCallback).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          stage: 'destination_input',
          nodeId: 'dest-1',
        }),
      );
    });
  });

  describe('createCaptureHandler', () => {
    it('adds captures to the provided array', () => {
      const captures: FlowCapture[] = [];
      const errors: any[] = [];
      const handler = createCaptureHandler(simulationId, captures, errors);

      const testCapture: FlowCapture = {
        stage: 'collector_input',
        nodeId: 'test-collector',
        data: { test: 'data' },
      };

      handler(testCapture);

      expect(captures).toHaveLength(1);
      expect(captures[0]).toEqual(testCapture);
    });

    it('handles multiple captures', () => {
      const captures: FlowCapture[] = [];
      const errors: any[] = [];
      const handler = createCaptureHandler(simulationId, captures, errors);

      const capture1: FlowCapture = {
        stage: 'source_output',
        nodeId: 'source-1',
        data: ['data1'],
      };

      const capture2: FlowCapture = {
        stage: 'destination_output',
        nodeId: 'dest-1',
        data: ['data2'],
        functionName: 'gtag',
        args: ['event', 'view_item'],
      };

      handler(capture1);
      handler(capture2);

      expect(captures).toHaveLength(2);
      expect(captures[0]).toEqual(capture1);
      expect(captures[1]).toEqual(capture2);
    });
  });
});
