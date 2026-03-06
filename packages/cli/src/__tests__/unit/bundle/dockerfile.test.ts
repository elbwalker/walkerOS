import { buildDockerfileContent } from '../../../commands/bundle/dockerfile.js';

describe('buildDockerfileContent', () => {
  it('should include COPY lines for included folders', () => {
    const content = buildDockerfileContent('server', ['public', 'config']);
    expect(content).toContain('COPY public/ /app/flow/public/');
    expect(content).toContain('COPY config/ /app/flow/config/');
  });

  it('should generate minimal Dockerfile without includes', () => {
    const content = buildDockerfileContent('server', []);
    expect(content).toContain('COPY bundle.mjs /app/flow/bundle.mjs');
    expect(content).not.toContain('COPY public');
  });

  it('should use walker.js for web platform', () => {
    const content = buildDockerfileContent('web', ['public']);
    expect(content).toContain('COPY walker.js /app/flow/walker.js');
    expect(content).toContain('COPY public/ /app/flow/public/');
  });

  it('should strip path prefixes from folder names', () => {
    const content = buildDockerfileContent('server', [
      './public',
      './credentials',
    ]);
    expect(content).toContain('COPY public/ /app/flow/public/');
    expect(content).toContain('COPY credentials/ /app/flow/credentials/');
  });
});
