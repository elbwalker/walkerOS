import fs from 'fs-extra';
import { Readable } from 'stream';

// Mock process.stdin to provide controlled data to readStdin()
function mockStdin(content: string) {
  const readable = new Readable({
    read() {
      this.push(Buffer.from(content));
      this.push(null);
    },
  });

  // Replace process.stdin temporarily
  const originalStdin = process.stdin;
  Object.defineProperty(process, 'stdin', {
    value: readable,
    configurable: true,
  });

  return () => {
    Object.defineProperty(process, 'stdin', {
      value: originalStdin,
      configurable: true,
    });
  };
}

describe('readStdinToTempFile', () => {
  let tmpPaths: string[] = [];

  afterEach(async () => {
    // Clean up any temp files created during tests
    for (const p of tmpPaths) {
      await fs.remove(p).catch(() => {});
    }
    tmpPaths = [];

    // Reset module cache so each test gets a fresh stdin read
    jest.resetModules();
  });

  it('writes stdin content to a temp file and returns the path', async () => {
    const restore = mockStdin('{"name":"page view"}');
    try {
      // Dynamic import after mocking stdin
      const { readStdinToTempFile } = await import('../../../core/stdin.js');

      const tmpPath = await readStdinToTempFile('test');
      tmpPaths.push(tmpPath);

      expect(tmpPath).toContain('stdin-test.json');
      const content = await fs.readFile(tmpPath, 'utf-8');
      expect(content).toBe('{"name":"page view"}');
    } finally {
      restore();
    }
  });

  it('uses the label in the filename', async () => {
    const restore = mockStdin('{"name":"product add"}');
    try {
      const { readStdinToTempFile } = await import('../../../core/stdin.js');

      const tmpPath = await readStdinToTempFile('push');
      tmpPaths.push(tmpPath);

      expect(tmpPath).toContain('stdin-push.json');
    } finally {
      restore();
    }
  });

  it('creates parent directories if needed', async () => {
    const restore = mockStdin('{"data":"test"}');
    try {
      const { readStdinToTempFile } = await import('../../../core/stdin.js');

      const tmpPath = await readStdinToTempFile('simulate');
      tmpPaths.push(tmpPath);

      expect(await fs.pathExists(tmpPath)).toBe(true);
    } finally {
      restore();
    }
  });
});
