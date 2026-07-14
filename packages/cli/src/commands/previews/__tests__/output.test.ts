import { formatPreviewCreated } from '../output';

describe('formatPreviewCreated', () => {
  // activationUrl is always a server-minted, origin-bound, app-signed grant URL.
  // For the --url case, createPreview re-mints it for the target origin before
  // this formatter runs, so the formatter only echoes it — it never
  // reconstructs a URL from the raw ingest token.
  const grantActivationUrl =
    'https://my-site.com/?elbPreview=eyJhbGciOiJFUzI1NiJ9.gr4nt.s1g';
  const basePreview = {
    id: 'prv_abc',
    token: 'k9x2m4p7abcd',
    activationUrl: grantActivationUrl,
    bundleUrl: 'https://cdn.walkeros.io/preview/proj_x/walker.k9x2m4p7abcd.js',
    createdBy: 'user_alex',
    createdAt: '2026-04-21T00:00:00Z',
  };

  it('without url, echoes the server activationUrl as the stdout last line', () => {
    const { stdoutLast, stderr } = formatPreviewCreated(basePreview, {});
    expect(stdoutLast).toBe(grantActivationUrl);
    expect(stderr).toContain('prv_abc');
    // The standalone Token info line is the owner's own secret in their own
    // terminal — allowed. It just must never end up inside a URL.
    expect(stderr).toContain('k9x2m4p7abcd');
    expect(stderr).toContain('user_alex');
  });

  it('with url, prints the server grant activation URL, never the raw token', () => {
    const { stdoutLast } = formatPreviewCreated(basePreview, {
      url: 'https://my-site.com',
    });
    expect(stdoutLast).toBe(grantActivationUrl);
    expect(stdoutLast).not.toContain(basePreview.token);
    expect(stdoutLast).not.toContain(`elbPreview=${basePreview.token}`);
  });

  it('with url, stderr shows the grant activation URL and an off deactivation URL', () => {
    const { stderr } = formatPreviewCreated(basePreview, {
      url: 'https://my-site.com/path?foo=1',
    });
    expect(stderr).toContain(grantActivationUrl);
    expect(stderr).toContain('https://my-site.com/path?foo=1&elbPreview=off');
    // The raw ingest token must never appear inside any activation URL.
    expect(stderr).not.toContain(`elbPreview=${basePreview.token}`);
  });

  it('throws on invalid URL input', () => {
    expect(() =>
      formatPreviewCreated(basePreview, { url: 'not a url' }),
    ).toThrow();
  });
});
