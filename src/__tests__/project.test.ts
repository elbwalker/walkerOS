import { ElbLayer, Elbwalker } from '../types/elbwalker';
import fs from 'fs';

let spyGo, spyRun: jest.SpyInstance;
let elbwalker: Elbwalker;

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
    spyRun = jest.spyOn(elbwalker, 'run');

    document.body.innerHTML = html;

    window.elbLayer = undefined as unknown as ElbLayer;
  });

  test('no script tag', () => {
    document.body.innerHTML = '';

    jest.requireActual('../index');
    expect(elbwalker.go).toHaveBeenCalledTimes(1);
    expect(elbwalker.go).toHaveBeenCalledWith('');
    expect(spyRun).toHaveBeenCalled();
  });

  test('no custom project', () => {
    const elem = document.getElementsByTagName('script')[0];
    elem.removeAttribute('data-project');

    jest.requireActual('../index');
    expect(elbwalker.go).toHaveBeenCalledTimes(1);
    expect(elbwalker.go).toHaveBeenCalledWith('');
    expect(spyRun).toHaveBeenCalled();
    expect(window.document.scripts.length).toBe(1);
  });

  test('handle custom project', () => {
    expect(window.document.scripts.length).toBe(1);

    jest.requireActual('../index');
    expect(elbwalker.go).toHaveBeenCalledWith(projectId);
    expect(spyRun).not.toHaveBeenCalled();

    expect(window.document.scripts.length).toBe(2);
    expect(
      document.querySelector(`[src="${projectFileUrl}${projectId}.js"]`),
    ).toBeInstanceOf(HTMLScriptElement);
  });
});
