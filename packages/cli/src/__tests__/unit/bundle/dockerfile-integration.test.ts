import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { generateDockerfile } from '../../../commands/bundle/dockerfile.js';
import { createCLILogger } from '../../../core/cli-logger.js';

describe('generateDockerfile', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'walkeros-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('should write Dockerfile with COPY lines for included folders', async () => {
    const logger = createCLILogger({ silent: true });
    await generateDockerfile(tmpDir, 'server', logger, undefined, [
      './public',
      './credentials',
    ]);

    const content = await fs.readFile(path.join(tmpDir, 'Dockerfile'), 'utf-8');
    expect(content).toContain('COPY bundle.mjs /app/flow/bundle.mjs');
    expect(content).toContain('COPY public/ /app/flow/public/');
    expect(content).toContain('COPY credentials/ /app/flow/credentials/');
  });

  it('should write minimal Dockerfile without includes', async () => {
    const logger = createCLILogger({ silent: true });
    await generateDockerfile(tmpDir, 'server', logger);

    const content = await fs.readFile(path.join(tmpDir, 'Dockerfile'), 'utf-8');
    expect(content).toContain('COPY bundle.mjs /app/flow/bundle.mjs');
    expect(content).not.toContain('COPY public');
  });

  it('should copy custom Dockerfile when provided', async () => {
    const customContent = 'FROM node:18\nRUN echo "custom"\n';
    const customPath = path.join(tmpDir, 'Dockerfile.custom');
    await fs.writeFile(customPath, customContent);

    const outDir = path.join(tmpDir, 'dist');
    await fs.ensureDir(outDir);

    const logger = createCLILogger({ silent: true });
    await generateDockerfile(outDir, 'server', logger, customPath);

    const content = await fs.readFile(path.join(outDir, 'Dockerfile'), 'utf-8');
    expect(content).toBe(customContent);
  });

  it('should fall back to generated Dockerfile when custom file does not exist', async () => {
    const logger = createCLILogger({ silent: true });
    await generateDockerfile(tmpDir, 'web', logger, '/nonexistent/Dockerfile', [
      'public',
    ]);

    const content = await fs.readFile(path.join(tmpDir, 'Dockerfile'), 'utf-8');
    expect(content).toContain('COPY walker.js /app/flow/walker.js');
    expect(content).toContain('COPY public/ /app/flow/public/');
  });
});
