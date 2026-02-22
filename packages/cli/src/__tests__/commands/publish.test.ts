import {
  authenticatedFetch,
  requireProjectId,
  resolveBaseUrl,
} from '../../core/auth.js';
import { streamDeploymentStatus } from '../../commands/deploy/index.js';
import fs from 'fs-extra';
import { publish } from '../../commands/publish/index.js';

jest.mock('../../core/auth.js', () => ({
  ...jest.requireActual('../../core/auth.js'),
  requireProjectId: jest.fn().mockReturnValue('proj_default'),
  resolveBaseUrl: jest.fn().mockReturnValue('https://app.walkeros.io'),
  authenticatedFetch: jest.fn(),
}));
jest.mock('../../commands/deploy/index.js', () => ({
  streamDeploymentStatus: jest.fn(),
}));
jest.mock('fs-extra', () => ({
  __esModule: true,
  default: {
    readFile: jest.fn(),
  },
}));

const mockAuthFetch = jest.mocked(authenticatedFetch);
const mockStreamStatus = jest.mocked(streamDeploymentStatus);
const mockReadFile = jest.mocked(fs.readFile);

const sampleConfig = { version: 1, flows: { default: { web: {} } } };

describe('publish', () => {
  afterEach(() => jest.clearAllMocks());

  describe('publish() basic flow', () => {
    it('reads config file and POSTs to correct URL', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(sampleConfig) as never);
      mockAuthFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'bundling', deploymentId: 'dep_1' }),
          { status: 200 },
        ),
      );
      mockStreamStatus.mockResolvedValue({
        status: 'published',
        publicUrl: 'https://cdn.example.com/walker.js',
      });

      await publish({
        deployment: 'dep_1',
        config: '/tmp/flow.json',
      });

      expect(mockReadFile).toHaveBeenCalledWith(
        expect.stringContaining('flow.json'),
        'utf-8',
      );
      expect(mockAuthFetch).toHaveBeenCalledWith(
        'https://app.walkeros.io/api/projects/proj_default/deployments/dep_1/publish',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({ source: 'config', config: sampleConfig }),
        }),
      );
    });

    it('includes Idempotency-Key header when provided', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(sampleConfig) as never);
      mockAuthFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'bundling', deploymentId: 'dep_1' }),
          { status: 200 },
        ),
      );
      mockStreamStatus.mockResolvedValue({ status: 'published' });

      await publish({
        deployment: 'dep_1',
        config: '/tmp/flow.json',
        idempotencyKey: 'key-123',
      });

      expect(mockAuthFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Idempotency-Key': 'key-123',
          }),
        }),
      );
    });

    it('returns data immediately when wait=false', async () => {
      const responseData = { status: 'bundling', deploymentId: 'dep_1' };
      mockReadFile.mockResolvedValue(JSON.stringify(sampleConfig) as never);
      mockAuthFetch.mockResolvedValue(
        new Response(JSON.stringify(responseData), { status: 200 }),
      );

      const result = await publish({
        deployment: 'dep_1',
        config: '/tmp/flow.json',
        wait: false,
      });

      expect(result).toEqual(responseData);
      expect(mockStreamStatus).not.toHaveBeenCalled();
    });

    it('throws on non-ok publish response', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(sampleConfig) as never);
      mockAuthFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ error: { message: 'Deployment not found' } }),
          { status: 404 },
        ),
      );

      await expect(
        publish({
          deployment: 'dep_1',
          config: '/tmp/flow.json',
        }),
      ).rejects.toThrow('Deployment not found');
    });
  });

  describe('publish() with SSE streaming (wait=true)', () => {
    it('calls streamDeploymentStatus after POST', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(sampleConfig) as never);
      mockAuthFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'bundling', deploymentId: 'dep_1' }),
          { status: 200 },
        ),
      );
      mockStreamStatus.mockResolvedValue({
        status: 'published',
        publicUrl: 'https://cdn.example.com/walker.js',
      });

      await publish({
        deployment: 'dep_1',
        config: '/tmp/flow.json',
      });

      expect(mockStreamStatus).toHaveBeenCalledWith(
        'proj_default',
        'dep_1',
        expect.objectContaining({
          timeout: undefined,
          signal: undefined,
        }),
      );
    });

    it('merges POST data with stream result', async () => {
      const postData = { status: 'bundling', deploymentId: 'dep_1' };
      const streamResult = {
        status: 'published',
        publicUrl: 'https://cdn.example.com/walker.js',
      };
      mockReadFile.mockResolvedValue(JSON.stringify(sampleConfig) as never);
      mockAuthFetch.mockResolvedValue(
        new Response(JSON.stringify(postData), { status: 200 }),
      );
      mockStreamStatus.mockResolvedValue(streamResult);

      const result = await publish({
        deployment: 'dep_1',
        config: '/tmp/flow.json',
      });

      expect(result).toEqual({ ...postData, ...streamResult });
    });

    it('passes onStatus and signal through', async () => {
      mockReadFile.mockResolvedValue(JSON.stringify(sampleConfig) as never);
      mockAuthFetch.mockResolvedValue(
        new Response(
          JSON.stringify({ status: 'bundling', deploymentId: 'dep_1' }),
          { status: 200 },
        ),
      );
      mockStreamStatus.mockResolvedValue({ status: 'published' });

      const onStatus = jest.fn();
      const controller = new AbortController();

      await publish({
        deployment: 'dep_1',
        config: '/tmp/flow.json',
        timeout: 60000,
        signal: controller.signal,
        onStatus,
      });

      expect(mockStreamStatus).toHaveBeenCalledWith(
        'proj_default',
        'dep_1',
        expect.objectContaining({
          timeout: 60000,
          signal: controller.signal,
          onStatus,
        }),
      );
    });
  });

  describe('config file validation', () => {
    it('throws on invalid JSON in config file', async () => {
      mockReadFile.mockResolvedValue('not valid json {{{' as never);

      await expect(
        publish({
          deployment: 'dep_1',
          config: '/tmp/broken.json',
        }),
      ).rejects.toThrow(/Invalid JSON in config file/);
    });
  });
});
