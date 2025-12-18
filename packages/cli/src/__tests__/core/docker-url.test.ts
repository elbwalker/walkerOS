import { buildDockerCommand } from '../../core/docker.js';
import { isUrl, downloadFromUrl } from '../../config/utils.js';
import fs from 'fs-extra';
import os from 'os';

describe('Docker URL handling', () => {
  describe('URL utilities for Docker pre-download', () => {
    it('should detect HTTP URLs', () => {
      expect(isUrl('https://example.com/flow.json')).toBe(true);
      expect(isUrl('http://example.com/flow.json')).toBe(true);
      expect(isUrl('./local-flow.json')).toBe(false);
      expect(isUrl('/absolute/path/flow.json')).toBe(false);
    });

    it('should download URL to temp file with proper cleanup', async () => {
      // This tests the pre-download pattern that executeInDocker should use
      const testUrl =
        'https://raw.githubusercontent.com/elbwalker/walkerOS/main/packages/cli/package.json';

      // Download URL to temp file
      const tempFile = await downloadFromUrl(testUrl);

      // Verify temp file exists and is in temp directory
      expect(await fs.pathExists(tempFile)).toBe(true);
      expect(tempFile.startsWith(os.tmpdir())).toBe(true);
      expect(tempFile).toContain('walkeros-download');

      // Verify content is valid JSON
      const content = await fs.readJson(tempFile);
      expect(content.name).toBe('@walkeros/cli');

      // Cleanup
      await fs.remove(tempFile);
      expect(await fs.pathExists(tempFile)).toBe(false);
    });
  });

  describe('buildDockerCommand', () => {
    it('should mount local config file to container', () => {
      const cmd = buildDockerCommand(
        'bundle',
        ['flow.json', '--output', 'dist'],
        {},
        'flow.json',
      );

      // Should include volume mount for local file
      expect(cmd).toContainEqual('-v');
      expect(cmd.some((arg) => arg.includes('/config/flow.json:ro'))).toBe(
        true,
      );
    });

    it('should NOT mount URLs - pass them through as-is', () => {
      const url = 'https://example.com/flow.json';
      const cmd = buildDockerCommand(
        'bundle',
        [url, '--output', 'dist'],
        {},
        url,
      );

      // Should NOT include config volume mount for URLs
      const volumeArgs = cmd.filter(
        (arg) => typeof arg === 'string' && arg.includes('/config/flow.json'),
      );
      expect(volumeArgs).toHaveLength(0);

      // URL should be preserved in args (currently passed through)
      expect(cmd).toContain(url);
    });

    it('should preserve URL in args when no configFile mounting needed', () => {
      const url =
        'https://raw.githubusercontent.com/elbwalker/walkerOS/main/flow.json';
      const cmd = buildDockerCommand(
        'bundle',
        [url, '--output', 'dist'],
        {},
        url,
      );

      // URL should remain in the command args
      expect(cmd.includes(url)).toBe(true);
    });
  });
});
