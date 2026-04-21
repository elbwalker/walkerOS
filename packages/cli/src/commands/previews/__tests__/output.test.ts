import { formatPreviewCreated } from '../output';

describe('formatPreviewCreated', () => {
  const basePreview = {
    id: 'prv_abc',
    token: 'k9x2m4p7abcd',
    activationUrl: '?elbPreview=k9x2m4p7abcd',
    bundleUrl: 'https://cdn.walkeros.io/preview/proj_x/walker.k9x2m4p7abcd.js',
    createdBy: 'user_alex',
    createdAt: '2026-04-21T00:00:00Z',
  };

  it('without url, activationParam is the stdout last line', () => {
    const { stdoutLast, stderr } = formatPreviewCreated(basePreview, {});
    expect(stdoutLast).toBe('?elbPreview=k9x2m4p7abcd');
    expect(stderr).toContain('prv_abc');
    expect(stderr).toContain('k9x2m4p7abcd');
    expect(stderr).toContain('user_alex');
  });

  it('with url, full activation URL is the stdout last line', () => {
    const { stdoutLast } = formatPreviewCreated(basePreview, {
      url: 'https://my-site.com',
    });
    expect(stdoutLast).toBe('https://my-site.com/?elbPreview=k9x2m4p7abcd');
  });

  it('with url, preserves existing query params', () => {
    const { stdoutLast } = formatPreviewCreated(basePreview, {
      url: 'https://my-site.com/path?foo=1',
    });
    expect(stdoutLast).toBe(
      'https://my-site.com/path?foo=1&elbPreview=k9x2m4p7abcd',
    );
  });

  it('with url, stderr includes activation and deactivation URLs', () => {
    const { stderr } = formatPreviewCreated(basePreview, {
      url: 'https://my-site.com',
    });
    expect(stderr).toContain('https://my-site.com/?elbPreview=k9x2m4p7abcd');
    expect(stderr).toContain('https://my-site.com/?elbPreview=off');
  });

  it('throws on invalid URL input', () => {
    expect(() =>
      formatPreviewCreated(basePreview, { url: 'not a url' }),
    ).toThrow();
  });
});
