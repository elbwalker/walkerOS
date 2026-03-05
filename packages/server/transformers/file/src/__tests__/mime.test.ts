import { getMimeType } from '../mime';

describe('getMimeType', () => {
  it('should return application/javascript for .js', () => {
    expect(getMimeType('walker.js')).toBe('application/javascript');
  });

  it('should return application/javascript for .mjs', () => {
    expect(getMimeType('module.mjs')).toBe('application/javascript');
  });

  it('should return text/css for .css', () => {
    expect(getMimeType('style.css')).toBe('text/css');
  });

  it('should return text/html for .html', () => {
    expect(getMimeType('index.html')).toBe('text/html');
  });

  it('should return application/json for .json', () => {
    expect(getMimeType('data.json')).toBe('application/json');
  });

  it('should return application/wasm for .wasm', () => {
    expect(getMimeType('module.wasm')).toBe('application/wasm');
  });

  it('should return application/json for .map', () => {
    expect(getMimeType('bundle.js.map')).toBe('application/json');
  });

  it('should return application/octet-stream for unknown extension', () => {
    expect(getMimeType('file.xyz')).toBe('application/octet-stream');
  });

  it('should return application/octet-stream for no extension', () => {
    expect(getMimeType('Makefile')).toBe('application/octet-stream');
  });

  it('should be case-insensitive', () => {
    expect(getMimeType('FILE.JS')).toBe('application/javascript');
    expect(getMimeType('style.CSS')).toBe('text/css');
  });

  it('should use custom overrides', () => {
    expect(getMimeType('file.xyz', { '.xyz': 'text/custom' })).toBe(
      'text/custom',
    );
  });

  it('should prefer overrides over defaults', () => {
    expect(getMimeType('file.js', { '.js': 'text/plain' })).toBe('text/plain');
  });

  it('should handle paths with directories', () => {
    expect(getMimeType('js/walker.min.js')).toBe('application/javascript');
  });

  it('should return image types', () => {
    expect(getMimeType('logo.png')).toBe('image/png');
    expect(getMimeType('photo.jpg')).toBe('image/jpeg');
    expect(getMimeType('icon.svg')).toBe('image/svg+xml');
  });

  it('should return font types', () => {
    expect(getMimeType('font.woff2')).toBe('font/woff2');
  });
});
