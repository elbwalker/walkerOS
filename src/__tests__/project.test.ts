import { Elbwalker } from '@elbwalker/types';
import fs from 'fs';

let spyGo: jest.SpyInstance;
let elbwalker: Elbwalker.Function;

const projectFileUrl = 'https://project-file.s.elbwalkerapis.com/';
const projectId = 'W3BP4G3';
const html: string = fs
  .readFileSync(__dirname + '/html/project.html')
  .toString();

describe('project', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    elbwalker = require('../elbwalker').default;
    spyGo = jest.spyOn(elbwalker, 'go');

    document.body.innerHTML = html;

    window.elbLayer = undefined as unknown as Elbwalker.ElbLayer;
  });

  test('no script tag', () => {
    document.body.innerHTML = '';

    jest.requireActual('../index');
    expect(elbwalker.go).toHaveBeenCalledTimes(1);
    expect(elbwalker.go).toHaveBeenCalledWith({ projectId: '' });
  });

  test('no custom project', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.removeAttribute('data-project');

    jest.requireActual('../index');
    expect(elbwalker.go).toHaveBeenCalledTimes(1);
    expect(elbwalker.go).toHaveBeenCalledWith({ projectId: '' });
    expect(window.document.scripts.length).toBe(1);
  });

  test('handle custom project', () => {
    expect(window.document.scripts.length).toBe(1);

    jest.requireActual('../index');
    expect(elbwalker.go).toHaveBeenCalledWith({ projectId: 'W3BP4G3' });

    expect(window.document.scripts.length).toBe(2);
    expect(
      document.querySelector(`[src="${projectFileUrl}${projectId}.js"]`),
    ).toBeInstanceOf(HTMLScriptElement);
  });
});
