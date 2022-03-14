describe('index', () => {
  test('initialize elbwalker on window', () => {
    expect(window['elbwalker']).toBeUndefined();
    const elbwalker = require('../elbwalker').default;
    expect(window['elbwalker']).toEqual(elbwalker);
  });
});
