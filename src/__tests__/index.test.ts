import { Elbwalker } from '@elbwalker/types';
import fs from 'fs';

let spyGo: jest.SpyInstance;
let elbwalker: Elbwalker.Function;

const w = window;
const projectFileUrl = 'https://project-file.s.elbwalkerapis.com/';
const projectId = 'W3BP4G3';
const html: string = fs.readFileSync(__dirname + '/html/index.html').toString();

describe('index', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    elbwalker = require('../elbwalker').default;
    spyGo = jest.spyOn(elbwalker, 'go');

    document.body.innerHTML = html;
    w.elbLayer = undefined as unknown as Elbwalker.ElbLayer;
  });

  afterEach(() => {
    document.getElementsByTagName('html')[0].innerHTML = '';
  });

  test('initialize elbwalker on window', () => {
    w.elbwalker = undefined as unknown as Elbwalker.Function;
    expect(w.elbwalker).toBeUndefined();
    jest.resetModules();
    jest.requireActual('../elbwalker');
    const elbwalker = require('../elbwalker').default;
    expect(w.elbwalker).toEqual(elbwalker);
  });

  test('no script tag', () => {
    document.body.innerHTML = '';

    jest.requireActual('../index');
    expect(elbwalker.go).toHaveBeenCalledTimes(1);
    expect(elbwalker.go).toHaveBeenCalledWith({ projectId: '', custom: false });
  });

  test('default init mode', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.removeAttribute('data-project');

    jest.requireActual('../index');
    expect(elbwalker.go).toHaveBeenCalledTimes(1);
    expect(elbwalker.go).toHaveBeenCalledWith({ projectId: '', custom: false });
    expect(window.document.scripts.length).toBe(1);
  });

  test('managed init mode', () => {
    expect(window.document.scripts.length).toBe(1);
    const elem = document.getElementsByTagName('script')[0];
    elem.setAttribute('data-project', projectId);

    jest.requireActual('../index');
    expect(elbwalker.go).toHaveBeenCalledWith({
      projectId,
      custom: false,
    });

    expect(window.document.scripts.length).toBe(2);
    expect(
      document.querySelector(`[src="${projectFileUrl}${projectId}.js"]`),
    ).toBeInstanceOf(HTMLScriptElement);
  });

  test('custom init mode', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.setAttribute('data-custom', 'true');

    jest.requireActual('../index');
    expect(elbwalker.go).toHaveBeenCalledWith({
      projectId: '',
      custom: true,
    });
  });
});
