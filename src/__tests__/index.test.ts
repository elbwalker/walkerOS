import { Elbwalker } from "../types";
import fs from 'fs';

describe('index', () => {
  const w = window;
  let elbwalker: Elbwalker.Function;
  let spyGo: jest.SpyInstance;

  const projectFileUrl = 'https://project-file.s.elbwalkerapis.com/';
  const projectId = 'W3BP4G3';
  const html: string = fs
    .readFileSync(__dirname + '/html/index.html')
    .toString();

  beforeEach(() => {
    // reset DOM with event listeners etc.
    document.body = document.body.cloneNode() as HTMLElement;
    document.body.innerHTML = html;

    jest.resetModules();
    jest.clearAllMocks();

    w.elbLayer = undefined as unknown as Elbwalker.ElbLayer;
    elbwalker = require('../elbwalker').default;

    spyGo = jest.spyOn(elbwalker, 'go');
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('initialize elbwalker on window', () => {
    w.elbwalker = undefined as unknown as Elbwalker.Function;
    expect(w.elbwalker).toBeUndefined();
    jest.resetModules();
    jest.requireActual('../walker');
    const elbwalker = require('../elbwalker').default;
    expect(w.elbwalker).toEqual(elbwalker);
  });

  test('no script tag', () => {
    document.body.innerHTML = '';

    jest.requireActual('../walker');
    expect(elbwalker.go).toHaveBeenCalledTimes(1);
    expect(elbwalker.go).toHaveBeenCalledWith({});
  });

  test('default init mode', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.removeAttribute('data-project');

    jest.requireActual('../walker');
    expect(elbwalker.go).toHaveBeenCalledTimes(1);
    expect(elbwalker.go).toHaveBeenCalledWith({
      custom: false,
      version: 1,
    });
    expect(window.document.scripts.length).toBe(1);
  });

  test('managed init mode', () => {
    expect(window.document.scripts.length).toBe(1);
    const elem = document.getElementsByTagName('script')[0];
    elem.setAttribute('data-project', projectId);

    jest.requireActual('../walker');
    expect(elbwalker.go).toHaveBeenCalledWith({
      projectId,
      custom: false,
      version: 1,
    });

    expect(window.document.scripts.length).toBe(2);
    expect(
      document.querySelector(`[src="${projectFileUrl}${projectId}.js"]`),
    ).toBeInstanceOf(HTMLScriptElement);
  });

  test('custom init mode', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.setAttribute('data-custom', 'true');

    jest.requireActual('../walker');
    expect(elbwalker.go).toHaveBeenCalledWith({
      custom: true,
      version: 1,
    });
  });

  test('config version', () => {
    const mockFn = jest.fn(); //.mockImplementation(console.log);
    w.dataLayer = [];
    w.dataLayer.push = mockFn;

    const elem = document.getElementsByTagName('script')[0];
    elem.setAttribute('data-version', '42');

    jest.requireActual('../walker');
    elbwalker.push('walker run');

    expect(mockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        version: {
          walker: 1.4,
          config: 42,
        },
      }),
    );
  });

  test('custom prefix', () => {
    const prefix = 'data-prefix';
    elbwalker.go({ prefix });

    expect(elbwalker.config).toStrictEqual(
      expect.objectContaining({
        prefix: prefix,
      }),
    );
  });
});
