import { formatPreviewCreated } from '../output';

describe('formatPreviewCreated', () => {
  // activationUrl is always a server-minted, origin-bound, app-signed grant URL.
  // For the --url case, createPreview re-mints it for the target origin before
  // this formatter runs, so the formatter only echoes it. The preview response
  // carries no raw token at all, so nothing token-shaped can be printed or
  // appended to a URL.
  const grantActivationUrl =
    'https://my-site.com/?elbPreview=eyJhbGciOiJFUzI1NiJ9.gr4nt.s1g';
  const basePreview = {
    id: 'prv_abc',
    activationUrl: grantActivationUrl,
    bundleUrl: 'https://cdn.walkeros.io/preview/proj_x/walker.k9x2m4p7abcd.js',
    createdBy: 'user_alex',
    createdAt: '2026-04-21T00:00:00Z',
  };

  it('without url, echoes the server activationUrl as the stdout last line', () => {
    const { stdoutLast, stderr } = formatPreviewCreated(basePreview, {});
    expect(stdoutLast).toBe(grantActivationUrl);
    expect(stderr).toContain('prv_abc');
    // The activation URL is complete as returned; the instructions must print
    // it directly, never tell the user to append it to another URL.
    expect(stderr).toContain(`Activate:   ${grantActivationUrl}`);
    expect(stderr).not.toContain('Append https://');
    expect(stderr).toContain('user_alex');
    // The response carries no raw token, so no standalone Token line exists.
    expect(stderr).not.toContain('Token:');
  });

  it('without url and no minted grant, points at --url instead of printing null', () => {
    const { stdoutLast, stderr } = formatPreviewCreated(
      { ...basePreview, activationUrl: null },
      {},
    );
    expect(stdoutLast).toBeNull();
    expect(stderr).not.toContain('null');
    expect(stderr).toContain('--url');
  });

  it('with url, prints the server grant activation URL verbatim', () => {
    const { stdoutLast } = formatPreviewCreated(basePreview, {
      url: 'https://my-site.com',
    });
    expect(stdoutLast).toBe(grantActivationUrl);
  });

  it('with url, stderr shows the grant activation URL and an off deactivation URL', () => {
    const { stderr } = formatPreviewCreated(basePreview, {
      url: 'https://my-site.com/path?foo=1',
    });
    expect(stderr).toContain(grantActivationUrl);
    expect(stderr).toContain('https://my-site.com/path?foo=1&elbPreview=off');
  });

  it('throws on invalid URL input', () => {
    expect(() =>
      formatPreviewCreated(basePreview, { url: 'not a url' }),
    ).toThrow();
  });
});
