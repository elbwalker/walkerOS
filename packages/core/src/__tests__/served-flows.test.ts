import type { Flow } from '../types/flow';
import type { ServedFlowIssue } from '../served-flows';
import { getServedFlows } from '../served-flows';

const PLATFORMS: Record<string, Flow.Config['platform']> = {
  casamoda: 'web',
  venti: 'web',
  server: 'server',
  edge: 'server',
};

/** `Flow.Config` requires a platform; a file as written can lack one. */
function withoutPlatform(config: Flow.Config): Flow.Config {
  Reflect.deleteProperty(config, 'platform');
  return config;
}

/**
 * A flow file: web flows casamoda and venti, server flows server and edge,
 * and bare with no platform. `on` lists `listing` in its
 * `config.bundle.flows`.
 */
function file(listing: Record<string, string>, on = 'server'): Flow.Json {
  const bundle: Flow.Bundle = { flows: listing };
  const flows: Record<string, Flow> = {};
  for (const [name, platform] of Object.entries(PLATFORMS))
    flows[name] = { config: name === on ? { platform, bundle } : { platform } };
  flows.bare =
    on === 'bare'
      ? { config: withoutPlatform({ platform: 'web', bundle }) }
      : {};
  return { version: 4, flows };
}

const AT = 'flows.server.config.bundle.flows';

function invalidPath(value: string): ServedFlowIssue {
  return {
    path: `${AT}.casamoda`,
    code: 'SERVED_PATH_INVALID',
    message: `"${value}" is not a relative path of bare file names joined by "/"`,
    value,
  };
}

describe('getServedFlows', () => {
  it('answers the listed pairs in key order', () => {
    const json = file({
      venti: 'a/b/track.js',
      casamoda: 'casamoda/walker.js',
    });

    expect(getServedFlows(json, 'server')).toEqual({
      served: [
        { flow: 'venti', path: 'a/b/track.js' },
        { flow: 'casamoda', path: 'casamoda/walker.js' },
      ],
      issues: [],
    });
  });

  it.each([
    ['a flow without bundle.flows', 'edge'],
    ['an unknown flow name', 'ghost'],
  ])('answers nothing for %s', (_, flowName) => {
    const json = file({ casamoda: 'casamoda/walker.js' });

    expect(getServedFlows(json, flowName)).toEqual({ served: [], issues: [] });
  });

  it.each<[string, string, Record<string, string>, ServedFlowIssue[]]>([
    [
      'bundle.flows on a web flow',
      'casamoda',
      { venti: 'venti/walker.js' },
      [
        {
          path: 'flows.casamoda.config.bundle.flows',
          code: 'SERVED_FLOWS_NOT_SERVER',
          message:
            'Flow "casamoda" has platform "web": only a server flow serves web flows',
        },
      ],
    ],
    [
      'bundle.flows on a flow with no platform',
      'bare',
      { casamoda: 'casamoda/walker.js' },
      [
        {
          path: 'flows.bare.config.bundle.flows',
          code: 'SERVED_FLOWS_NOT_SERVER',
          message:
            'Flow "bare" has no platform: only a server flow serves web flows',
        },
      ],
    ],
    [
      'a key that is no flow',
      'server',
      { ghost: 'ghost.js' },
      [
        {
          path: `${AT}.ghost`,
          code: 'SERVED_FLOW_NOT_WEB',
          message: '"ghost" is no flow of this file',
        },
      ],
    ],
    [
      'a key that only an object prototype holds',
      'server',
      { toString: 'x.js' },
      [
        {
          path: `${AT}.toString`,
          code: 'SERVED_FLOW_NOT_WEB',
          message: '"toString" is no flow of this file',
        },
      ],
    ],
    [
      'a key that names another server flow',
      'server',
      { edge: 'edge.js' },
      [
        {
          path: `${AT}.edge`,
          code: 'SERVED_FLOW_NOT_WEB',
          message:
            'Flow "edge" has platform "server": a served flow is a web flow',
        },
      ],
    ],
    [
      'a key that names the serving flow itself',
      'server',
      { server: 'server.js' },
      [
        {
          path: `${AT}.server`,
          code: 'SERVED_FLOW_NOT_WEB',
          message:
            'Flow "server" has platform "server": a served flow is a web flow',
        },
      ],
    ],
    [
      'a key that names a flow with no platform',
      'server',
      { bare: 'bare.js' },
      [
        {
          path: `${AT}.bare`,
          code: 'SERVED_FLOW_NOT_WEB',
          message: 'Flow "bare" has no platform: a served flow is a web flow',
        },
      ],
    ],
    ...[
      '/walker.js',
      'walker.js/',
      'a//b.js',
      '../walker.js',
      '.hidden/x.js',
      'a\\b.js',
      '',
      '$var.path',
    ].map(
      (value): [string, string, Record<string, string>, ServedFlowIssue[]] => [
        `the path "${value}"`,
        'server',
        { casamoda: value },
        [invalidPath(value)],
      ],
    ),
    [
      'two keys on one path',
      'server',
      { casamoda: 'x/walker.js', venti: 'x/walker.js' },
      [
        {
          path: `${AT}.venti`,
          code: 'SERVED_PATH_CONFLICT',
          message: '"x/walker.js" is also the path of "casamoda"',
          value: 'x/walker.js',
        },
      ],
    ],
    [
      'a path inside an earlier path',
      'server',
      { casamoda: 'a', venti: 'a/walker.js' },
      [
        {
          path: `${AT}.venti`,
          code: 'SERVED_PATH_CONFLICT',
          message: '"a/walker.js" overlaps "a", the path of "casamoda"',
          value: 'a/walker.js',
        },
      ],
    ],
    [
      'a path that holds an earlier path',
      'server',
      { casamoda: 'a/walker.js', venti: 'a' },
      [
        {
          path: `${AT}.venti`,
          code: 'SERVED_PATH_CONFLICT',
          message: '"a" overlaps "a/walker.js", the path of "casamoda"',
          value: 'a',
        },
      ],
    ],
    [
      'two keys on one path in another case',
      'server',
      { casamoda: 'x/walker.js', venti: 'X/walker.js' },
      [
        {
          path: `${AT}.venti`,
          code: 'SERVED_PATH_CONFLICT',
          message: '"X/walker.js" is also the path of "casamoda"',
          value: 'X/walker.js',
        },
      ],
    ],
    [
      'a path inside an earlier path in another case',
      'server',
      { casamoda: 'a', venti: 'A/walker.js' },
      [
        {
          path: `${AT}.venti`,
          code: 'SERVED_PATH_CONFLICT',
          message: '"A/walker.js" overlaps "a", the path of "casamoda"',
          value: 'A/walker.js',
        },
      ],
    ],
    [
      'a key and its value, both refused',
      'server',
      { ghost: '../walker.js' },
      [
        {
          path: `${AT}.ghost`,
          code: 'SERVED_FLOW_NOT_WEB',
          message: '"ghost" is no flow of this file',
        },
        {
          path: `${AT}.ghost`,
          code: 'SERVED_PATH_INVALID',
          message:
            '"../walker.js" is not a relative path of bare file names joined by "/"',
          value: '../walker.js',
        },
      ],
    ],
  ])('refuses %s', (_, on, listing, issues) => {
    expect(getServedFlows(file(listing, on), on).issues).toEqual(issues);
  });
});
