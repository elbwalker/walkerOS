import { formatCode } from '../format-code';

describe('formatCode', () => {
  test('formats HTML with the HTML plugin', async () => {
    const html =
      '<div data-elb="promotion" data-elbaction="visible:view"><h2 data-elb-promotion="name:#innerText">Spring sale</h2></div>';
    expect(await formatCode(html, 'html')).toBe(
      [
        '<div data-elb="promotion" data-elbaction="visible:view">',
        '  <h2 data-elb-promotion="name:#innerText">Spring sale</h2>',
        '</div>',
      ].join('\n'),
    );
  });

  test('formats CSS with the PostCSS plugin', async () => {
    expect(await formatCode('a{color:red}', 'css')).toBe(
      'a {\n  color: red;\n}',
    );
  });

  test('formats JavaScript and TypeScript', async () => {
    expect(await formatCode('const a={b:1}', 'js')).toBe('const a = { b: 1 };');
    expect(await formatCode('const a:number=1', 'ts')).toBe(
      'const a: number = 1;',
    );
  });

  test('returns an unknown language as it is', async () => {
    expect(await formatCode('a{color:red}', 'cobol')).toBe('a{color:red}');
  });
});
