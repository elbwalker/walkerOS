import { generateWrapEntry } from '../bundler';

describe('preview preflight script-injection swap', () => {
  it('gates the preview swap on script onload/onerror, not fetch', () => {
    const entry = generateWrapEntry('./skeleton.mjs', {
      previewOrigin: 'cdn.example.com',
      previewScope: 'proj_test',
    });
    const preflight = entry.slice(
      entry.indexOf('--- Preview mode preflight ---'),
      entry.indexOf('--- End preview mode preflight ---'),
    );
    expect(preflight).not.toContain('fetch(');
    expect(preflight).toContain('.onload');
    expect(preflight).toContain('.onerror');
    expect(preflight).toContain('__clearPreviewCookie');
  });
});
