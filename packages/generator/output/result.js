/*!
 * WalkerOS Bundle
 * Generated from Flow configuration
 */
(function (window) {
  'use strict';

  // 1. PACKAGES CODE
  // Clean extracted package objects
  // @walkeros/core@0.0.8 (core)

  // @walkeros/core@0.0.8 (core) - REAL PACKAGE CODE
  var walkerOSCore = (function () {
    // Create CommonJS environment
    var module = { exports: {} };
    var exports = module.exports;

    // Mock require function for cross-package dependencies
    var require = function (packageName) {
      if (packageName === '@walkeros/core') {
        return walkerOSCore || {};
      }
      if (packageName === '@walkeros/collector') {
        return walkerOSCollector || {};
      }
      if (packageName === '@walkeros/web-source-browser') {
        return walkerOSSourceBrowser || {};
      }
      if (packageName === '@walkeros/web-destination-gtag') {
        return walkerOSDestinationGtag || {};
      }
      if (packageName === '@walkeros/web-core') {
        return walkerOSWebCore || {};
      }
      // Return empty object for unknown dependencies
      return {};
    };

    // Execute the original package code
    ('use strict');
    var e,
      t,
      n = Object.defineProperty,
      r = Object.getOwnPropertyDescriptor,
      o = Object.getOwnPropertyNames,
      i = Object.prototype.hasOwnProperty,
      s =
        ((e = {
          'package.json'(e, t) {
            t.exports = {
              name: '@walkeros/core',
              description:
                'Core types and platform-agnostic utilities for walkerOS',
              version: '0.0.8',
              main: './dist/index.js',
              module: './dist/index.mjs',
              types: './dist/index.d.ts',
              license: 'MIT',
              files: ['dist/**'],
              scripts: {
                build: 'tsup --silent',
                clean: 'rm -rf .turbo && rm -rf node_modules && rm -rf dist',
                dev: 'jest --watchAll --colors',
                lint: 'tsc && eslint "**/*.ts*"',
                test: 'jest',
                update: 'npx npm-check-updates -u && npm update',
              },
              dependencies: {},
              devDependencies: {},
              repository: {
                url: 'git+https://github.com/elbwalker/walkerOS.git',
                directory: 'packages/core',
              },
              author: 'elbwalker <hello@elbwalker.com>',
              homepage: 'https://github.com/elbwalker/walkerOS#readme',
              bugs: { url: 'https://github.com/elbwalker/walkerOS/issues' },
              keywords: [
                'walker',
                'walkerOS',
                'analytics',
                'tracking',
                'data collection',
                'measurement',
                'data privacy',
                'privacy friendly',
                'web analytics',
                'product analytics',
                'core',
                'types',
                'utils',
              ],
              funding: [
                {
                  type: 'GitHub Sponsors',
                  url: 'https://github.com/sponsors/elbwalker',
                },
              ],
            };
          },
        }),
        function () {
          return (
            t || (0, e[o(e)[0]])((t = { exports: {} }).exports, t),
            t.exports
          );
        }),
      c = {};
    (((e, t) => {
      for (var r in t) n(e, r, { get: t[r], enumerable: !0 });
    })(c, {
      Collector: () => a,
      Const: () => k,
      Data: () => u,
      Destination: () => l,
      Elb: () => p,
      Handler: () => d,
      Hooks: () => g,
      Mapping: () => f,
      On: () => m,
      Request: () => y,
      Schema: () => h,
      Source: () => b,
      WalkerOS: () => w,
      Wrapper: () => v,
      anonymizeIP: () => x,
      assign: () => S,
      castToProperty: () => Y,
      castValue: () => H,
      clone: () => V,
      createDestination: () => B,
      createEvent: () => q,
      createSource: () => z,
      createWrapper: () => ve,
      debounce: () => G,
      filterValues: () => Q,
      getBrowser: () => ge,
      getBrowserVersion: () => fe,
      getByPath: () => _,
      getDeviceType: () => he,
      getEvent: () => K,
      getGrantedConsent: () => L,
      getHeaders: () => ae,
      getId: () => U,
      getMappingEvent: () => te,
      getMappingValue: () => ne,
      getMarketingParameters: () => F,
      getOS: () => me,
      getOSVersion: () => ye,
      isArguments: () => j,
      isArray: () => E,
      isBoolean: () => P,
      isCommand: () => T,
      isDefined: () => A,
      isElementOrDocument: () => M,
      isFunction: () => C,
      isNumber: () => D,
      isObject: () => $,
      isPropertyType: () => J,
      isSameType: () => I,
      isString: () => N,
      onLog: () => oe,
      parseUserAgent: () => de,
      requestToData: () => ie,
      requestToParameter: () => se,
      setByPath: () => R,
      throttle: () => X,
      throwError: () => ue,
      transformData: () => ce,
      trim: () => le,
      tryCatch: () => Z,
      tryCatchAsync: () => ee,
      useHooks: () => pe,
      validateEvent: () => be,
      validateProperty: () => we,
    }),
      (module.exports = ((e) =>
        ((e, t, s, c) => {
          if ((t && 'object' == typeof t) || 'function' == typeof t)
            for (let a of o(t))
              i.call(e, a) ||
                a === s ||
                n(e, a, {
                  get: () => t[a],
                  enumerable: !(c = r(t, a)) || c.enumerable,
                });
          return e;
        })(n({}, '__esModule', { value: !0 }), e))(c)));
    var a = {},
      u = {},
      l = {},
      p = {},
      d = {},
      g = {},
      f = {},
      m = {},
      y = {},
      h = {},
      b = {},
      w = {},
      v = {},
      k = {
        Utils: {
          Storage: { Local: 'local', Session: 'session', Cookie: 'cookie' },
        },
      };
    function x(e) {
      return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(e)
        ? e.replace(/\.\d+$/, '.0')
        : '';
    }
    var O = { merge: !0, shallow: !0, extend: !0 };
    function S(e, t = {}, n = {}) {
      n = { ...O, ...n };
      const r = Object.entries(t).reduce((t, [r, o]) => {
        const i = e[r];
        return (
          n.merge && Array.isArray(i) && Array.isArray(o)
            ? (t[r] = o.reduce(
                (e, t) => (e.includes(t) ? e : [...e, t]),
                [...i],
              ))
            : (n.extend || r in e) && (t[r] = o),
          t
        );
      }, {});
      return n.shallow ? { ...e, ...r } : (Object.assign(e, r), e);
    }
    function j(e) {
      return '[object Arguments]' === Object.prototype.toString.call(e);
    }
    function E(e) {
      return Array.isArray(e);
    }
    function P(e) {
      return 'boolean' == typeof e;
    }
    function T(e) {
      return 'walker' === e;
    }
    function A(e) {
      return void 0 !== e;
    }
    function M(e) {
      return e === document || e instanceof Element;
    }
    function C(e) {
      return 'function' == typeof e;
    }
    function D(e) {
      return 'number' == typeof e && !Number.isNaN(e);
    }
    function $(e) {
      return (
        'object' == typeof e &&
        null !== e &&
        !E(e) &&
        '[object Object]' === Object.prototype.toString.call(e)
      );
    }
    function I(e, t) {
      return typeof e == typeof t;
    }
    function N(e) {
      return 'string' == typeof e;
    }
    function V(e, t = new WeakMap()) {
      if ('object' != typeof e || null === e) return e;
      if (t.has(e)) return t.get(e);
      const n = Object.prototype.toString.call(e);
      if ('[object Object]' === n) {
        const n = {};
        t.set(e, n);
        for (const r in e)
          Object.prototype.hasOwnProperty.call(e, r) && (n[r] = V(e[r], t));
        return n;
      }
      if ('[object Array]' === n) {
        const n = [];
        return (
          t.set(e, n),
          e.forEach((e) => {
            n.push(V(e, t));
          }),
          n
        );
      }
      if ('[object Date]' === n) return new Date(e.getTime());
      if ('[object RegExp]' === n) {
        const t = e;
        return new RegExp(t.source, t.flags);
      }
      return e;
    }
    function _(e, t = '', n) {
      const r = t.split('.');
      let o = e;
      for (let e = 0; e < r.length; e++) {
        const t = r[e];
        if ('*' === t && E(o)) {
          const t = r.slice(e + 1).join('.'),
            i = [];
          for (const e of o) {
            const r = _(e, t, n);
            i.push(r);
          }
          return i;
        }
        if (((o = o instanceof Object ? o[t] : void 0), !o)) break;
      }
      return A(o) ? o : n;
    }
    function R(e, t, n) {
      const r = V(e),
        o = t.split('.');
      let i = r;
      for (let e = 0; e < o.length; e++) {
        const t = o[e];
        e === o.length - 1
          ? (i[t] = n)
          : ((t in i && 'object' == typeof i[t] && null !== i[t]) ||
              (i[t] = {}),
            (i = i[t]));
      }
      return r;
    }
    function H(e) {
      if ('true' === e) return !0;
      if ('false' === e) return !1;
      const t = Number(e);
      return e == t && '' !== e ? t : String(e);
    }
    function L(e, t = {}, n = {}) {
      const r = { ...t, ...n },
        o = {};
      let i = void 0 === e;
      return (
        Object.keys(r).forEach((t) => {
          r[t] && ((o[t] = !0), e && e[t] && (i = !0));
        }),
        !!i && o
      );
    }
    function B(e, t) {
      const n = { ...e };
      return (
        (n.config = S(e.config, t, { shallow: !0, merge: !0, extend: !0 })),
        e.config.settings &&
          t.settings &&
          (n.config.settings = S(e.config.settings, t.settings, {
            shallow: !0,
            merge: !0,
            extend: !0,
          })),
        e.config.mapping &&
          t.mapping &&
          (n.config.mapping = S(e.config.mapping, t.mapping, {
            shallow: !0,
            merge: !0,
            extend: !0,
          })),
        n
      );
    }
    function z(e, t) {
      return async (n, r) => {
        const o = S(r, t, { shallow: !0, merge: !0, extend: !0 });
        return (
          r.settings &&
            t.settings &&
            (o.settings = S(r.settings, t.settings, {
              shallow: !0,
              merge: !0,
              extend: !0,
            })),
          e(n, o)
        );
      };
    }
    var { version: W } = s();
    function q(e = {}) {
      const t = e.timestamp || new Date().setHours(0, 13, 37, 0),
        n = e.group || 'gr0up',
        r = e.count || 1,
        o = S(
          {
            event: 'entity action',
            data: {
              string: 'foo',
              number: 1,
              boolean: !0,
              array: [0, 'text', !1],
              not: void 0,
            },
            context: { dev: ['test', 1] },
            globals: { lang: 'elb' },
            custom: { completely: 'random' },
            user: { id: 'us3r', device: 'c00k13', session: 's3ss10n' },
            nested: [
              {
                type: 'child',
                data: { is: 'subordinated' },
                nested: [],
                context: { element: ['child', 0] },
              },
            ],
            consent: { functional: !0 },
            id: `${t}-${n}-${r}`,
            trigger: 'test',
            entity: 'entity',
            action: 'action',
            timestamp: t,
            timing: 3.14,
            group: n,
            count: r,
            version: { source: W, tagging: 1 },
            source: {
              type: 'web',
              id: 'https://localhost:80',
              previous_id: 'http://remotehost:9001',
            },
          },
          e,
          { merge: !1 },
        );
      if (e.event) {
        const [t, n] = e.event.split(' ') ?? [];
        t && n && ((o.entity = t), (o.action = n));
      }
      return o;
    }
    function K(e = 'entity action', t = {}) {
      const n = t.timestamp || new Date().setHours(0, 13, 37, 0),
        r = {
          data: {
            id: 'ers',
            name: 'Everyday Ruck Snack',
            color: 'black',
            size: 'l',
            price: 420,
          },
        },
        o = {
          data: { id: 'cc', name: 'Cool Cap', size: 'one size', price: 42 },
        };
      return q({
        ...{
          'cart view': {
            data: { currency: 'EUR', value: 2 * r.data.price },
            context: { shopping: ['cart', 0] },
            globals: { pagegroup: 'shop' },
            nested: [
              {
                type: 'product',
                data: { ...r.data, quantity: 2 },
                context: { shopping: ['cart', 0] },
                nested: [],
              },
            ],
            trigger: 'load',
          },
          'checkout view': {
            data: {
              step: 'payment',
              currency: 'EUR',
              value: r.data.price + o.data.price,
            },
            context: { shopping: ['checkout', 0] },
            globals: { pagegroup: 'shop' },
            nested: [
              {
                type: 'product',
                ...r,
                context: { shopping: ['checkout', 0] },
                nested: [],
              },
              {
                type: 'product',
                ...o,
                context: { shopping: ['checkout', 0] },
                nested: [],
              },
            ],
            trigger: 'load',
          },
          'order complete': {
            data: {
              id: '0rd3r1d',
              currency: 'EUR',
              shipping: 5.22,
              taxes: 73.76,
              total: 555,
            },
            context: { shopping: ['complete', 0] },
            globals: { pagegroup: 'shop' },
            nested: [
              {
                type: 'product',
                ...r,
                context: { shopping: ['complete', 0] },
                nested: [],
              },
              {
                type: 'product',
                ...o,
                context: { shopping: ['complete', 0] },
                nested: [],
              },
              {
                type: 'gift',
                data: { name: 'Surprise' },
                context: { shopping: ['complete', 0] },
                nested: [],
              },
            ],
            trigger: 'load',
          },
          'page view': {
            data: {
              domain: 'www.example.com',
              title: 'walkerOS documentation',
              referrer: 'https://www.elbwalker.com/',
              search: '?foo=bar',
              hash: '#hash',
              id: '/docs/',
            },
            globals: { pagegroup: 'docs' },
            trigger: 'load',
          },
          'product add': {
            ...r,
            context: { shopping: ['intent', 0] },
            globals: { pagegroup: 'shop' },
            nested: [],
            trigger: 'click',
          },
          'product view': {
            ...r,
            context: { shopping: ['detail', 0] },
            globals: { pagegroup: 'shop' },
            nested: [],
            trigger: 'load',
          },
          'product visible': {
            data: { ...r.data, position: 3, promo: !0 },
            context: { shopping: ['discover', 0] },
            globals: { pagegroup: 'shop' },
            nested: [],
            trigger: 'load',
          },
          'promotion visible': {
            data: { name: 'Setting up tracking easily', position: 'hero' },
            context: { ab_test: ['engagement', 0] },
            globals: { pagegroup: 'homepage' },
            trigger: 'visible',
          },
          'session start': {
            data: {
              id: 's3ss10n',
              start: n,
              isNew: !0,
              count: 1,
              runs: 1,
              isStart: !0,
              storage: !0,
              referrer: '',
              device: 'c00k13',
            },
            user: {
              id: 'us3r',
              device: 'c00k13',
              session: 's3ss10n',
              hash: 'h4sh',
              address: 'street number',
              email: 'user@example.com',
              phone: '+49 123 456 789',
              userAgent: 'Mozilla...',
              browser: 'Chrome',
              browserVersion: '90',
              deviceType: 'desktop',
              language: 'de-DE',
              country: 'DE',
              region: 'HH',
              city: 'Hamburg',
              zip: '20354',
              timezone: 'Berlin',
              os: 'walkerOS',
              osVersion: '1.0',
              screenSize: '1337x420',
              ip: '127.0.0.0',
              internal: !0,
              custom: 'value',
            },
          },
        }[e],
        ...t,
        event: e,
      });
    }
    function U(e = 6) {
      let t = '';
      for (let n = 36; t.length < e; )
        t += ((Math.random() * n) | 0).toString(n);
      return t;
    }
    function F(e, t = {}) {
      const n = 'clickId',
        r = {},
        o = {
          utm_campaign: 'campaign',
          utm_content: 'content',
          utm_medium: 'medium',
          utm_source: 'source',
          utm_term: 'term',
          dclid: n,
          fbclid: n,
          gclid: n,
          msclkid: n,
          ttclid: n,
          twclid: n,
          igshid: n,
          sclid: n,
        };
      return (
        Object.entries(S(o, t)).forEach(([t, o]) => {
          const i = e.searchParams.get(t);
          i && (o === n && ((o = t), (r[n] = t)), (r[o] = i));
        }),
        r
      );
    }
    function G(e, t = 1e3, n = !1) {
      let r,
        o = null,
        i = !1;
      return (...s) =>
        new Promise((c) => {
          const a = n && !i;
          (o && clearTimeout(o),
            (o = setTimeout(() => {
              ((o = null), (n && !i) || ((r = e(...s)), c(r)));
            }, t)),
            a && ((i = !0), (r = e(...s)), c(r)));
        });
    }
    function X(e, t = 1e3) {
      let n = null;
      return function (...r) {
        if (null === n)
          return (
            (n = setTimeout(() => {
              n = null;
            }, t)),
            e(...r)
          );
      };
    }
    function J(e) {
      return (
        P(e) ||
        N(e) ||
        D(e) ||
        !A(e) ||
        (E(e) && e.every(J)) ||
        ($(e) && Object.values(e).every(J))
      );
    }
    function Q(e) {
      return P(e) || N(e) || D(e)
        ? e
        : j(e)
          ? Q(Array.from(e))
          : E(e)
            ? e.map((e) => Q(e)).filter((e) => void 0 !== e)
            : $(e)
              ? Object.entries(e).reduce((e, [t, n]) => {
                  const r = Q(n);
                  return (void 0 !== r && (e[t] = r), e);
                }, {})
              : void 0;
    }
    function Y(e) {
      return J(e) ? e : void 0;
    }
    function Z(e, t, n) {
      return function (...r) {
        try {
          return e(...r);
        } catch (e) {
          if (!t) return;
          return t(e);
        } finally {
          n?.();
        }
      };
    }
    function ee(e, t, n) {
      return async function (...r) {
        try {
          return await e(...r);
        } catch (e) {
          if (!t) return;
          return await t(e);
        } finally {
          await n?.();
        }
      };
    }
    async function te(e, t) {
      const [n, r] = (e.event || '').split(' ');
      if (!t || !n || !r) return {};
      let o,
        i = '',
        s = n,
        c = r;
      const a = (t) => {
        if (t)
          return (t = E(t) ? t : [t]).find(
            (t) => !t.condition || t.condition(e),
          );
      };
      t[s] || (s = '*');
      const u = t[s];
      return (
        u && (u[c] || (c = '*'), (o = a(u[c]))),
        o || ((s = '*'), (c = '*'), (o = a(t[s]?.[c]))),
        o && (i = `${s} ${c}`),
        { eventMapping: o, mappingKey: i }
      );
    }
    async function ne(e, t = {}, n = {}) {
      if (!A(e)) return;
      const r = ($(e) && e.consent) || n.consent || n.collector?.consent,
        o = E(t) ? t : [t];
      for (const t of o) {
        const o = await ee(re)(e, t, { ...n, consent: r });
        if (A(o)) return o;
      }
    }
    async function re(e, t, n = {}) {
      const { collector: r, consent: o } = n;
      return (E(t) ? t : [t]).reduce(
        async (t, i) => {
          const s = await t;
          if (s) return s;
          const c = N(i) ? { key: i } : i;
          if (!Object.keys(c).length) return;
          const {
            condition: a,
            consent: u,
            fn: l,
            key: p,
            loop: d,
            map: g,
            set: f,
            validate: m,
            value: y,
          } = c;
          if (a && !(await ee(a)(e, i, r))) return;
          if (u && !L(u, o)) return y;
          let h = A(y) ? y : e;
          if ((l && (h = await ee(l)(e, i, n)), p && (h = _(e, p, y)), d)) {
            const [t, r] = d,
              o = 'this' === t ? [e] : await ne(e, t, n);
            E(o) &&
              (h = (await Promise.all(o.map((e) => ne(e, r, n)))).filter(A));
          } else
            g
              ? (h = await Object.entries(g).reduce(async (t, [r, o]) => {
                  const i = await t,
                    s = await ne(e, o, n);
                  return (A(s) && (i[r] = s), i);
                }, Promise.resolve({})))
              : f && (h = await Promise.all(f.map((t) => re(e, t, n))));
          m && !(await ee(m)(h)) && (h = void 0);
          const b = Y(h);
          return A(b) ? b : Y(y);
        },
        Promise.resolve(void 0),
      );
    }
    function oe(e, t = !1) {
      t && console.dir(e, { depth: 4 });
    }
    function ie(e) {
      const t = String(e),
        n = t.split('?')[1] || t;
      return Z(() => {
        const e = new URLSearchParams(n),
          t = {};
        return (
          e.forEach((e, n) => {
            const r = n.split(/[[\]]+/).filter(Boolean);
            let o = t;
            r.forEach((t, n) => {
              const i = n === r.length - 1;
              if (E(o)) {
                const s = parseInt(t, 10);
                i
                  ? (o[s] = H(e))
                  : ((o[s] = o[s] || (isNaN(parseInt(r[n + 1], 10)) ? {} : [])),
                    (o = o[s]));
              } else
                $(o) &&
                  (i
                    ? (o[t] = H(e))
                    : ((o[t] =
                        o[t] || (isNaN(parseInt(r[n + 1], 10)) ? {} : [])),
                      (o = o[t])));
            });
          }),
          t
        );
      })();
    }
    function se(e) {
      if (!e) return '';
      const t = [],
        n = encodeURIComponent;
      function r(e, o) {
        null != o &&
          (E(o)
            ? o.forEach((t, n) => r(`${e}[${n}]`, t))
            : $(o)
              ? Object.entries(o).forEach(([t, n]) => r(`${e}[${t}]`, n))
              : t.push(`${n(e)}=${n(String(o))}`));
      }
      return 'object' != typeof e
        ? n(e)
        : (Object.entries(e).forEach(([e, t]) => r(e, t)), t.join('&'));
    }
    function ce(e) {
      return void 0 === e || I(e, '') ? e : JSON.stringify(e);
    }
    function ae(e = {}) {
      return S({ 'Content-Type': 'application/json; charset=utf-8' }, e);
    }
    function ue(e) {
      throw new Error(String(e));
    }
    function le(e) {
      return e ? e.trim().replace(/^'|'$/g, '').trim() : '';
    }
    function pe(e, t, n) {
      return function (...r) {
        let o;
        const i = 'post' + t,
          s = n['pre' + t],
          c = n[i];
        return (
          (o = s ? s({ fn: e }, ...r) : e(...r)),
          c && (o = c({ fn: e, result: o }, ...r)),
          o
        );
      };
    }
    function de(e) {
      return e
        ? {
            userAgent: e,
            browser: ge(e),
            browserVersion: fe(e),
            os: me(e),
            osVersion: ye(e),
            deviceType: he(e),
          }
        : {};
    }
    function ge(e) {
      const t = [
        { name: 'Edge', substr: 'Edg' },
        { name: 'Chrome', substr: 'Chrome' },
        { name: 'Safari', substr: 'Safari', exclude: 'Chrome' },
        { name: 'Firefox', substr: 'Firefox' },
        { name: 'IE', substr: 'MSIE' },
        { name: 'IE', substr: 'Trident' },
      ];
      for (const n of t)
        if (e.includes(n.substr) && (!n.exclude || !e.includes(n.exclude)))
          return n.name;
    }
    function fe(e) {
      const t = [
        /Edg\/([0-9]+)/,
        /Chrome\/([0-9]+)/,
        /Version\/([0-9]+).*Safari/,
        /Firefox\/([0-9]+)/,
        /MSIE ([0-9]+)/,
        /rv:([0-9]+).*Trident/,
      ];
      for (const n of t) {
        const t = e.match(n);
        if (t) return t[1];
      }
    }
    function me(e) {
      const t = [
        { name: 'Windows', substr: 'Windows NT' },
        { name: 'macOS', substr: 'Mac OS X' },
        { name: 'Android', substr: 'Android' },
        { name: 'iOS', substr: 'iPhone OS' },
        { name: 'Linux', substr: 'Linux' },
      ];
      for (const n of t) if (e.includes(n.substr)) return n.name;
    }
    function ye(e) {
      const t = e.match(/(?:Windows NT|Mac OS X|Android|iPhone OS) ([0-9._]+)/);
      return t ? t[1].replace(/_/g, '.') : void 0;
    }
    function he(e) {
      let t = 'Desktop';
      return (
        /Tablet|iPad/i.test(e)
          ? (t = 'Tablet')
          : /Mobi|Android|iPhone|iPod|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(
              e,
            ) && (t = 'Mobile'),
        t
      );
    }
    function be(e, t = []) {
      let n, r, o;
      (I(e, {}) || ue('Invalid object'),
        I(e.event, '')
          ? ((n = e.event),
            ([r, o] = n.split(' ')),
            (r && o) || ue('Invalid event name'))
          : I(e.entity, '') && I(e.action, '')
            ? ((r = e.entity), (o = e.action), (n = `${r} ${o}`))
            : ue('Missing or invalid event, entity, or action'));
      const i = {
        event: n,
        data: {},
        context: {},
        custom: {},
        globals: {},
        user: {},
        nested: [],
        consent: {},
        id: '',
        trigger: '',
        entity: r,
        action: o,
        timestamp: 0,
        timing: 0,
        group: '',
        count: 0,
        version: { source: '', tagging: 0 },
        source: { type: '', id: '', previous_id: '' },
      };
      return [
        {
          '*': {
            '*': {
              event: { maxLength: 255 },
              user: { allowedKeys: ['id', 'device', 'session'] },
              consent: { allowedValues: [!0, !1] },
              timestamp: { min: 0 },
              timing: { min: 0 },
              count: { min: 0 },
              version: { allowedKeys: ['source', 'tagging'] },
              source: { allowedKeys: ['type', 'id', 'previous_id'] },
            },
          },
        },
      ]
        .concat(t)
        .reduce(
          (e, t) =>
            ['*', r].reduce(
              (e, n) =>
                ['*', o].reduce((e, r) => {
                  const o = t[n]?.[r];
                  return o ? e.concat([o]) : e;
                }, e),
              e,
            ),
          [],
        )
        .reduce((t, n) => {
          const r = Object.keys(n).filter((e) => {
            const t = n[e];
            return !0 === t?.required;
          });
          return [...Object.keys(e), ...r].reduce((t, r) => {
            const o = n[r];
            let i = e[r];
            return (
              o &&
                (i = Z(we, (e) => {
                  ue(String(e));
                })(t, r, i, o)),
              I(i, t[r]) && (t[r] = i),
              t
            );
          }, t);
        }, i);
    }
    function we(e, t, n, r) {
      if (
        (r.validate &&
          (n = Z(r.validate, (e) => {
            ue(String(e));
          })(n, t, e)),
        r.required && void 0 === n && ue('Missing required property'),
        I(n, ''))
      )
        r.maxLength &&
          n.length > r.maxLength &&
          (r.strict && ue('Value exceeds maxLength'),
          (n = n.substring(0, r.maxLength)));
      else if (I(n, 1))
        I(r.min, 1) && n < r.min
          ? (r.strict && ue('Value below min'), (n = r.min))
          : I(r.max, 1) &&
            n > r.max &&
            (r.strict && ue('Value exceeds max'), (n = r.max));
      else if (I(n, {})) {
        if (r.schema) {
          const e = r.schema;
          Object.keys(e).reduce((t, n) => {
            const r = e[n];
            let o = t[n];
            return (
              r &&
                (r.type &&
                  typeof o !== r.type &&
                  ue(`Type doesn't match (${n})`),
                (o = Z(we, (e) => {
                  ue(String(e));
                })(t, n, o, r))),
              o
            );
          }, n);
        }
        for (const e of Object.keys(n))
          r.allowedKeys &&
            !r.allowedKeys.includes(e) &&
            (r.strict && ue('Key not allowed'), delete n[e]);
      }
      return n;
    }
    function ve(
      e = 'unknown',
      { dryRun: t = !1, mockReturn: n, onCall: r } = {},
    ) {
      return function (o, i) {
        return 'function' != typeof i
          ? i
          : (...s) => (r && r({ name: o, type: e }, s), t ? n : i(...s));
      };
    } //# sourceMappingURL=index.js.map

    // Return the exports
    return module.exports;
  })();
  // @walkeros/web-core@0.0.8 (core)

  // @walkeros/web-core@0.0.8 (core) - REAL PACKAGE CODE
  var walkerOSWebCore = (function () {
    // Create CommonJS environment
    var module = { exports: {} };
    var exports = module.exports;

    // Mock require function for cross-package dependencies
    var require = function (packageName) {
      if (packageName === '@walkeros/core') {
        return walkerOSCore || {};
      }
      if (packageName === '@walkeros/collector') {
        return walkerOSCollector || {};
      }
      if (packageName === '@walkeros/web-source-browser') {
        return walkerOSSourceBrowser || {};
      }
      if (packageName === '@walkeros/web-destination-gtag') {
        return walkerOSDestinationGtag || {};
      }
      if (packageName === '@walkeros/web-core') {
        return walkerOSWebCore || {};
      }
      // Return empty object for unknown dependencies
      return {};
    };

    // Execute the original package code
    ('use strict');
    var e,
      t = Object.defineProperty,
      r = Object.getOwnPropertyDescriptor,
      n = Object.getOwnPropertyNames,
      o = Object.prototype.hasOwnProperty,
      s = {};
    (((e, r) => {
      for (var n in r) t(e, n, { get: r[n], enumerable: !0 });
    })(s, {
      DestinationWeb: () => $,
      Elb: () => E,
      SourceWeb: () => q,
      Walker: () => R,
      WebCollector: () => P,
      elb: () => m,
      getAttribute: () => a,
      getHashWeb: () => p,
      getLanguage: () => l,
      getScreenSize: () => f,
      getTimezone: () => g,
      isVisible: () => h,
      parseInlineConfig: () => d,
      sendWeb: () => y,
      sendWebAsBeacon: () => v,
      sendWebAsFetch: () => b,
      sendWebAsXhr: () => k,
      sessionStart: () => O,
      sessionStorage: () => H,
      sessionWindow: () => N,
      splitAttribute: () => c,
      splitKeyVal: () => u,
      storageDelete: () => D,
      storageRead: () => A,
      storageWrite: () => j,
    }),
      (module.exports =
        ((e = s),
        ((e, s, i, a) => {
          if ((s && 'object' == typeof s) || 'function' == typeof s)
            for (let c of n(s))
              o.call(e, c) ||
                c === i ||
                t(e, c, {
                  get: () => s[c],
                  enumerable: !(a = r(s, c)) || a.enumerable,
                });
          return e;
        })(t({}, '__esModule', { value: !0 }), e))));
    var i = require('@walkeros/core');
    function a(e, t) {
      return (e.getAttribute(t) || '').trim();
    }
    function c(e, t = ';') {
      if (!e) return [];
      const r = new RegExp(`(?:[^${t}']+|'[^']*')+`, 'ig');
      return e.match(r) || [];
    }
    function u(e) {
      const [t, r] = e.split(/:(.+)/, 2);
      return [(0, i.trim)(t || ''), (0, i.trim)(r || '')];
    }
    function d(e) {
      const t = {};
      return (
        c(e).forEach((e) => {
          const [r, n] = u(e);
          r &&
            ('true' === n
              ? (t[r] = !0)
              : 'false' === n
                ? (t[r] = !1)
                : n && /^\d+$/.test(n)
                  ? (t[r] = parseInt(n, 10))
                  : n && /^\d+\.\d+$/.test(n)
                    ? (t[r] = parseFloat(n))
                    : (t[r] = n || !0));
        }),
        t
      );
    }
    function l(e) {
      return e.language;
    }
    function g() {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    function f(e) {
      return `${e.screen.width}x${e.screen.height}`;
    }
    var m = function () {
        const e = window;
        (e.elbLayer = e.elbLayer || []).push(arguments);
      },
      w = require('@walkeros/core');
    async function p(e, t) {
      return (
        (await (async function (e) {
          const t =
            (0, w.isDefined)(window) && window.crypto ? window.crypto : void 0;
          if (!t || !t.subtle || !TextEncoder) return;
          const r = new TextEncoder().encode(e),
            n = await t.subtle.digest('SHA-256', r);
          return Array.from(new Uint8Array(n))
            .map((e) => e.toString(16).padStart(2, '0'))
            .join('');
        })(e)) || ''
      ).slice(0, t);
    }
    function h(e) {
      const t = getComputedStyle(e);
      if ('none' === t.display) return !1;
      if ('visible' !== t.visibility) return !1;
      if (t.opacity && Number(t.opacity) < 0.1) return !1;
      let r;
      const n = window.innerHeight,
        o = e.getBoundingClientRect(),
        s = o.height,
        i = o.y,
        a = i + s,
        c = { x: o.x + e.offsetWidth / 2, y: o.y + e.offsetHeight / 2 };
      if (s <= n) {
        if (e.offsetWidth + o.width === 0 || e.offsetHeight + o.height === 0)
          return !1;
        if (c.x < 0) return !1;
        if (c.x > (document.documentElement.clientWidth || window.innerWidth))
          return !1;
        if (c.y < 0) return !1;
        if (c.y > (document.documentElement.clientHeight || window.innerHeight))
          return !1;
        r = document.elementFromPoint(c.x, c.y);
      } else {
        const e = n / 2;
        if (i < 0 && a < e) return !1;
        if (a > n && i > e) return !1;
        r = document.elementFromPoint(c.x, n / 2);
      }
      if (r)
        do {
          if (r === e) return !0;
        } while ((r = r.parentElement));
      return !1;
    }
    var S = require('@walkeros/core');
    function y(e, t, r = { transport: 'fetch' }) {
      switch (r.transport || 'fetch') {
        case 'beacon':
          return v(e, t);
        case 'xhr':
          return k(e, t, r);
        default:
          return b(e, t, r);
      }
    }
    async function b(e, t, r = {}) {
      const n = (0, S.getHeaders)(r.headers),
        o = (0, S.transformData)(t);
      return (0, S.tryCatchAsync)(
        async () => {
          const t = await fetch(e, {
              method: r.method || 'POST',
              headers: n,
              keepalive: !0,
              credentials: r.credentials || 'same-origin',
              mode: r.noCors ? 'no-cors' : 'cors',
              body: o,
            }),
            s = r.noCors ? '' : await t.text();
          return { ok: t.ok, data: s, error: t.ok ? void 0 : t.statusText };
        },
        (e) => ({ ok: !1, error: e.message }),
      )();
    }
    function v(e, t) {
      const r = (0, S.transformData)(t),
        n = navigator.sendBeacon(e, r);
      return { ok: n, error: n ? void 0 : 'Failed to send beacon' };
    }
    function k(e, t, r = {}) {
      const n = (0, S.getHeaders)(r.headers),
        o = r.method || 'POST',
        s = (0, S.transformData)(t);
      return (0, S.tryCatch)(
        () => {
          const t = new XMLHttpRequest();
          t.open(o, e, !1);
          for (const e in n) t.setRequestHeader(e, n[e]);
          t.send(s);
          const r = t.status >= 200 && t.status < 300;
          return {
            ok: r,
            data: (0, S.tryCatch)(JSON.parse, () => t.response)(t.response),
            error: r ? void 0 : `${t.status} ${t.statusText}`,
          };
        },
        (e) => ({ ok: !1, error: e.message }),
      )();
    }
    var C = require('@walkeros/core');
    function O(e = {}) {
      const { cb: t, consent: r, collector: n, storage: o } = e,
        s = n?.push || m;
      if (!r) return x((o ? H : N)(e), n, t);
      {
        const n = (function (e, t) {
          let r;
          const n = (n, o) => {
            if ((0, C.isDefined)(r) && r === n?.group) return;
            r = n?.group;
            let s = () => N(e);
            if (e.consent) {
              const t = (
                (0, C.isArray)(e.consent) ? e.consent : [e.consent]
              ).reduce((e, t) => ({ ...e, [t]: !0 }), {});
              (0, C.getGrantedConsent)(t, o) && (s = () => H(e));
            }
            return x(s(), n, t);
          };
          return n;
        })(e, t);
        s(
          'walker on',
          'consent',
          ((0, C.isArray)(r) ? r : [r]).reduce(
            (e, t) => ({ ...e, [t]: n }),
            {},
          ),
        );
      }
    }
    function x(e, t, r) {
      return !1 === r ? e : (r || (r = U), r(e, t, U));
    }
    var U = (e, t) => {
        const r = t?.push || m,
          n = {};
        return (
          e.id && (n.session = e.id),
          e.storage && e.device && (n.device = e.device),
          r('walker user', n),
          e.isStart && r({ event: 'session start', data: e }),
          e
        );
      },
      I = require('@walkeros/core'),
      W = require('@walkeros/core');
    function D(e, t = W.Const.Utils.Storage.Session) {
      switch (t) {
        case W.Const.Utils.Storage.Cookie:
          j(e, '', 0, t);
          break;
        case W.Const.Utils.Storage.Local:
          window.localStorage.removeItem(e);
          break;
        case W.Const.Utils.Storage.Session:
          window.sessionStorage.removeItem(e);
      }
    }
    function A(e, t = W.Const.Utils.Storage.Session) {
      function r(e) {
        try {
          return JSON.parse(e || '');
        } catch (t) {
          let r = 1,
            n = '';
          return (e && ((r = 0), (n = e)), { e: r, v: n });
        }
      }
      let n, o;
      switch (t) {
        case W.Const.Utils.Storage.Cookie:
          n = decodeURIComponent(
            document.cookie
              .split('; ')
              .find((t) => t.startsWith(e + '='))
              ?.split('=')[1] || '',
          );
          break;
        case W.Const.Utils.Storage.Local:
          o = r(window.localStorage.getItem(e));
          break;
        case W.Const.Utils.Storage.Session:
          o = r(window.sessionStorage.getItem(e));
      }
      return (
        o && ((n = o.v), 0 != o.e && o.e < Date.now() && (D(e, t), (n = ''))),
        (0, W.castValue)(n || '')
      );
    }
    function j(e, t, r = 30, n = W.Const.Utils.Storage.Session, o) {
      const s = { e: Date.now() + 6e4 * r, v: String(t) },
        i = JSON.stringify(s);
      switch (n) {
        case W.Const.Utils.Storage.Cookie: {
          t = 'object' == typeof t ? JSON.stringify(t) : t;
          let n = `${e}=${encodeURIComponent(t)}; max-age=${60 * r}; path=/; SameSite=Lax; secure`;
          (o && (n += '; domain=' + o), (document.cookie = n));
          break;
        }
        case W.Const.Utils.Storage.Local:
          window.localStorage.setItem(e, i);
          break;
        case W.Const.Utils.Storage.Session:
          window.sessionStorage.setItem(e, i);
      }
      return A(e, n);
    }
    function H(e = {}) {
      const t = Date.now(),
        {
          length: r = 30,
          deviceKey: n = 'elbDeviceId',
          deviceStorage: o = 'local',
          deviceAge: s = 30,
          sessionKey: i = 'elbSessionId',
          sessionStorage: a = 'local',
          pulse: c = !1,
        } = e,
        u = N(e);
      let d = !1;
      const l = (0, I.tryCatch)((e, t, r) => {
          let n = A(e, r);
          return (
            n || ((n = (0, I.getId)(8)), j(e, n, 1440 * t, r)),
            String(n)
          );
        })(n, s, o),
        g =
          (0, I.tryCatch)(
            (e, n) => {
              const o = JSON.parse(String(A(e, n)));
              return (
                c ||
                  ((o.isNew = !1),
                  u.marketing && (Object.assign(o, u), (d = !0)),
                  d || o.updated + 6e4 * r < t
                    ? (delete o.id,
                      delete o.referrer,
                      (o.start = t),
                      o.count++,
                      (o.runs = 1),
                      (d = !0))
                    : o.runs++),
                o
              );
            },
            () => {
              d = !0;
            },
          )(i, a) || {},
        f = { id: (0, I.getId)(12), start: t, isNew: !0, count: 1, runs: 1 },
        m = Object.assign(
          f,
          u,
          g,
          { device: l },
          { isStart: d, storage: !0, updated: t },
          e.data,
        );
      return (j(i, JSON.stringify(m), 2 * r, a), m);
    }
    var L = require('@walkeros/core');
    function N(e = {}) {
      let t = e.isStart || !1;
      const r = { isStart: t, storage: !1 };
      if (!1 === e.isStart) return r;
      if (!t) {
        const [e] = performance.getEntriesByType('navigation');
        if ('navigate' !== e.type) return r;
      }
      const n = new URL(e.url || window.location.href),
        o = e.referrer || document.referrer,
        s = o && new URL(o).hostname,
        i = (0, L.getMarketingParameters)(n, e.parameters);
      if (
        (Object.keys(i).length && (i.marketing || (i.marketing = !0), (t = !0)),
        !t)
      ) {
        const r = e.domains || [];
        (r.push(n.hostname), (t = !r.includes(s)));
      }
      return t
        ? Object.assign(
            {
              isStart: t,
              storage: !1,
              start: Date.now(),
              id: (0, L.getId)(12),
              referrer: s,
            },
            i,
            e.data,
          )
        : r;
    }
    var $ = {},
      q = {},
      E = {},
      P = {},
      R = {}; //# sourceMappingURL=index.js.map

    // Return the exports
    return module.exports;
  })();
  // @walkeros/collector@0.0.8 (collector)

  // @walkeros/collector@0.0.8 (collector) - REAL PACKAGE CODE
  var walkerOSCollector = (function () {
    // Create CommonJS environment
    var module = { exports: {} };
    var exports = module.exports;

    // Mock require function for cross-package dependencies
    var require = function (packageName) {
      if (packageName === '@walkeros/core') {
        return walkerOSCore || {};
      }
      if (packageName === '@walkeros/collector') {
        return walkerOSCollector || {};
      }
      if (packageName === '@walkeros/web-source-browser') {
        return walkerOSSourceBrowser || {};
      }
      if (packageName === '@walkeros/web-destination-gtag') {
        return walkerOSDestinationGtag || {};
      }
      if (packageName === '@walkeros/web-core') {
        return walkerOSWebCore || {};
      }
      // Return empty object for unknown dependencies
      return {};
    };

    // Execute the original package code
    ('use strict');
    var e,
      t,
      n = Object.defineProperty,
      s = Object.getOwnPropertyDescriptor,
      o = Object.getOwnPropertyNames,
      i = Object.prototype.hasOwnProperty,
      a =
        ((e = {
          'package.json'(e, t) {
            t.exports = {
              name: '@walkeros/collector',
              description: 'Unified platform-agnostic collector for walkerOS',
              version: '0.0.8',
              main: './dist/index.js',
              module: './dist/index.mjs',
              types: './dist/index.d.ts',
              license: 'MIT',
              files: ['dist/**'],
              scripts: {
                build: 'tsup --silent',
                clean: 'rm -rf .turbo && rm -rf node_modules && rm -rf dist',
                dev: 'jest --watchAll --colors',
                lint: 'tsc && eslint "**/*.ts*"',
                test: 'jest',
                update: 'npx npm-check-updates -u && npm update',
              },
              dependencies: { '@walkeros/core': '0.0.8' },
              devDependencies: {},
              repository: {
                url: 'git+https://github.com/elbwalker/walkerOS.git',
                directory: 'packages/collector',
              },
              author: 'elbwalker <hello@elbwalker.com>',
              homepage: 'https://github.com/elbwalker/walkerOS#readme',
              bugs: { url: 'https://github.com/elbwalker/walkerOS/issues' },
              keywords: [
                'walker',
                'walkerOS',
                'analytics',
                'tracking',
                'data collection',
                'measurement',
                'data privacy',
                'privacy friendly',
                'collector',
                'event processing',
              ],
              funding: [
                {
                  type: 'GitHub Sponsors',
                  url: 'https://github.com/sponsors/elbwalker',
                },
              ],
            };
          },
        }),
        function () {
          return (
            t || (0, e[o(e)[0]])((t = { exports: {} }).exports, t),
            t.exports
          );
        }),
      r = {};
    (((e, t) => {
      for (var s in t) n(e, s, { get: t[s], enumerable: !0 });
    })(r, {
      Commands: () => c,
      Const: () => u,
      addDestination: () => C,
      commonHandleCommand: () => w,
      createCollector: () => H,
      createEventOrCommand: () => k,
      createPush: () => v,
      createPushResult: () => E,
      createSource: () => A,
      destinationInit: () => q,
      destinationPush: () => j,
      initDestinations: () => S,
      initSources: () => M,
      on: () => b,
      onApply: () => h,
      pushToDestinations: () => O,
      runCollector: () => y,
      setConsent: () => x,
    }),
      (module.exports = ((e) =>
        ((e, t, a, r) => {
          if ((t && 'object' == typeof t) || 'function' == typeof t)
            for (let c of o(t))
              i.call(e, c) ||
                c === a ||
                n(e, c, {
                  get: () => t[c],
                  enumerable: !(r = s(t, c)) || r.enumerable,
                });
          return e;
        })(n({}, '__esModule', { value: !0 }), e))(r)));
    var c = {
        Action: 'action',
        Config: 'config',
        Consent: 'consent',
        Context: 'context',
        Custom: 'custom',
        Destination: 'destination',
        Elb: 'elb',
        Globals: 'globals',
        Hook: 'hook',
        Init: 'init',
        Link: 'link',
        On: 'on',
        Prefix: 'data-elb',
        Ready: 'ready',
        Run: 'run',
        Session: 'session',
        User: 'user',
        Walker: 'walker',
      },
      u = {
        Commands: c,
        Utils: {
          Storage: { Cookie: 'cookie', Local: 'local', Session: 'session' },
        },
      },
      l = require('@walkeros/core'),
      d = require('@walkeros/core'),
      g = require('@walkeros/core'),
      p = require('@walkeros/core'),
      f = require('@walkeros/core'),
      m = require('@walkeros/core');
    function b(e, t, n) {
      const s = e.on,
        o = s[t] || [],
        i = (0, f.isArray)(n) ? n : [n];
      (i.forEach((e) => {
        o.push(e);
      }),
        (s[t] = o),
        h(e, t, i));
    }
    function h(e, t, n, s) {
      let o = n || [];
      if (
        (n ||
          ((o = e.on[t] || []),
          Object.values(e.destinations).forEach((e) => {
            const n = e.config.on?.[t];
            n && (o = o.concat(n));
          })),
        o.length)
      )
        switch (t) {
          case u.Commands.Consent:
            !(function (e, t, n) {
              const s = n || e.consent;
              t.forEach((t) => {
                Object.keys(s)
                  .filter((e) => e in t)
                  .forEach((n) => {
                    (0, m.tryCatch)(t[n])(e, s);
                  });
              });
            })(e, o, s);
            break;
          case u.Commands.Ready:
          case u.Commands.Run:
            !(function (e, t) {
              e.allowed &&
                t.forEach((t) => {
                  (0, m.tryCatch)(t)(e);
                });
            })(e, o);
            break;
          case u.Commands.Session:
            !(function (e, t) {
              if (!e.session) return;
              t.forEach((t) => {
                (0, m.tryCatch)(t)(e, e.session);
              });
            })(e, o);
        }
    }
    async function w(e, t, n, s) {
      let o;
      switch (t) {
        case u.Commands.Config:
          (0, p.isObject)(n) && (0, g.assign)(e.config, n, { shallow: !1 });
          break;
        case u.Commands.Consent:
          (0, p.isObject)(n) && (o = await x(e, n));
          break;
        case u.Commands.Custom:
          (0, p.isObject)(n) && (e.custom = (0, g.assign)(e.custom, n));
          break;
        case u.Commands.Destination:
          (0, p.isObject)(n) &&
            (0, g.isFunction)(n.push) &&
            (o = await C(e, n, s));
          break;
        case u.Commands.Globals:
          (0, p.isObject)(n) && (e.globals = (0, g.assign)(e.globals, n));
          break;
        case u.Commands.On:
          (0, g.isString)(n) && b(e, n, s);
          break;
        case u.Commands.Run:
          o = await y(e, n);
          break;
        case u.Commands.User:
          (0, p.isObject)(n) && (0, g.assign)(e.user, n, { shallow: !1 });
      }
      return o || { ok: !0, successful: [], queued: [], failed: [] };
    }
    function k(e, t, n = {}) {
      const s = (0, p.isSameType)(t, '')
        ? { event: t, ...n }
        : { ...n, ...(t || {}) };
      if (!s.event) throw new Error('Event name is required');
      const [o, i] = s.event.split(' ');
      if (!o || !i) throw new Error('Event name is invalid');
      if (o === c.Walker) return { command: i };
      ++e.count;
      const {
          timestamp: a = Date.now(),
          group: r = e.group,
          count: u = e.count,
        } = s,
        {
          event: l = `${o} ${i}`,
          data: d = {},
          context: g = {},
          globals: f = e.globals,
          custom: m = {},
          user: b = e.user,
          nested: h = [],
          consent: w = e.consent,
          id: k = `${a}-${r}-${u}`,
          trigger: y = '',
          entity: v = o,
          action: C = i,
          timing: O = 0,
          version: q = { source: e.version, tagging: e.config.tagging || 0 },
          source: j = { type: 'collector', id: '', previous_id: '' },
        } = s;
      return {
        event: {
          event: l,
          data: d,
          context: g,
          globals: f,
          custom: m,
          user: b,
          nested: h,
          consent: w,
          id: k,
          trigger: y,
          entity: v,
          action: C,
          timestamp: a,
          timing: O,
          group: r,
          count: u,
          version: q,
          source: j,
        },
      };
    }
    async function y(e, t) {
      ((e.allowed = !0),
        (e.count = 0),
        (e.group = (0, g.getId)()),
        (e.timing = Date.now()),
        t &&
          (t.consent && (e.consent = (0, g.assign)(e.consent, t.consent)),
          t.user && (e.user = (0, g.assign)(e.user, t.user)),
          t.globals &&
            (e.globals = (0, g.assign)(
              e.config.globalsStatic || {},
              t.globals,
            )),
          t.custom && (e.custom = (0, g.assign)(e.custom, t.custom))),
        Object.values(e.destinations).forEach((e) => {
          e.queue = [];
        }),
        (e.queue = []),
        e.round++);
      const n = await O(e);
      return (h(e, 'run'), n);
    }
    function v(e, t, n) {
      return (0, d.useHooks)(
        async (s, o, i) =>
          await (0, d.tryCatchAsync)(
            async () => {
              if ('string' == typeof s && s.startsWith('walker ')) {
                const n = s.replace('walker ', '');
                return await t(e, n, o, i);
              }
              {
                const a = n('string' == typeof s ? { event: s } : s),
                  { event: r, command: c } = k(e, a.event, a);
                return c ? await t(e, c, o, i) : await O(e, r);
              }
            },
            () => E({ ok: !1 }),
          )(),
        'Push',
        e.hooks,
      );
    }
    async function C(e, t, n) {
      const s = n || t.config || { init: !1 },
        o = { ...t, config: s };
      let i = s.id;
      if (!i)
        do {
          i = (0, d.getId)(4);
        } while (e.destinations[i]);
      return (
        (e.destinations[i] = o),
        !1 !== s.queue && (o.queue = [...e.queue]),
        O(e, void 0, { [i]: o })
      );
    }
    async function O(e, t, n) {
      const { allowed: s, consent: o, globals: i, user: a } = e;
      if (!s) return E({ ok: !1 });
      (t && e.queue.push(t), n || (n = e.destinations));
      const r = await Promise.all(
          Object.entries(n || {}).map(async ([n, s]) => {
            let r = (s.queue || []).map((e) => ({ ...e, consent: o }));
            if (((s.queue = []), t)) {
              let n = (0, d.clone)(t);
              (await Promise.all(
                Object.entries(s.config.policy || []).map(async ([s, o]) => {
                  const i = await (0, d.getMappingValue)(t, o, {
                    collector: e,
                  });
                  n = (0, d.setByPath)(n, s, i);
                }),
              ),
                r.push(n));
            }
            if (!r.length) return { id: n, destination: s, skipped: !0 };
            const c = [],
              u = r.filter((e) => {
                const t = (0, d.getGrantedConsent)(
                  s.config.consent,
                  o,
                  e.consent,
                );
                return !t || ((e.consent = t), c.push(e), !1);
              });
            if ((s.queue.concat(u), !c.length))
              return { id: n, destination: s, queue: r };
            if (!(await (0, d.tryCatchAsync)(q)(e, s)))
              return { id: n, destination: s, queue: r };
            let l = !1;
            return (
              s.dlq || (s.dlq = []),
              await Promise.all(
                c.map(
                  async (t) => (
                    (t.globals = (0, d.assign)(i, t.globals)),
                    (t.user = (0, d.assign)(a, t.user)),
                    await (0, d.tryCatchAsync)(
                      j,
                      (n) => (
                        e.config.onError && e.config.onError(n, e),
                        (l = !0),
                        s.dlq.push([t, n]),
                        !1
                      ),
                    )(e, s, t),
                    t
                  ),
                ),
              ),
              { id: n, destination: s, error: l }
            );
          }),
        ),
        c = [],
        u = [],
        l = [];
      for (const e of r) {
        if (e.skipped) continue;
        const t = e.destination,
          n = { id: e.id, destination: t };
        e.error
          ? l.push(n)
          : e.queue && e.queue.length
            ? ((t.queue = (t.queue || []).concat(e.queue)), u.push(n))
            : c.push(n);
      }
      return E({
        ok: !l.length,
        event: t,
        successful: c,
        queued: u,
        failed: l,
      });
    }
    async function q(e, t) {
      if (t.init && !t.config.init) {
        const n = { collector: e, config: t.config, wrap: D(t, e) },
          s = await (0, d.useHooks)(t.init, 'DestinationInit', e.hooks)(n);
        if (!1 === s) return s;
        t.config = { ...(s || t.config), init: !0 };
      }
      return !0;
    }
    async function j(e, t, n) {
      const { config: s } = t,
        { eventMapping: o, mappingKey: i } = await (0, d.getMappingEvent)(
          n,
          s.mapping,
        );
      let a =
        s.data && (await (0, d.getMappingValue)(n, s.data, { collector: e }));
      if (o) {
        if (o.ignore) return !1;
        if ((o.name && (n.event = o.name), o.data)) {
          const t =
            o.data &&
            (await (0, d.getMappingValue)(n, o.data, { collector: e }));
          a =
            (0, d.isObject)(a) && (0, d.isObject)(t) ? (0, d.assign)(a, t) : t;
        }
      }
      const r = { collector: e, config: s, data: a, mapping: o, wrap: D(t, e) };
      if (o?.batch && t.pushBatch) {
        const r = o.batched || { key: i || '', events: [], data: [] };
        (r.events.push(n),
          (0, d.isDefined)(a) && r.data.push(a),
          (o.batchFn =
            o.batchFn ||
            (0, d.debounce)((e, t) => {
              const n = {
                collector: t,
                config: s,
                data: a,
                mapping: o,
                wrap: D(e, t),
              };
              ((0, d.useHooks)(
                e.pushBatch,
                'DestinationPushBatch',
                t.hooks,
              )(r, n),
                (r.events = []),
                (r.data = []));
            }, o.batch)),
          (o.batched = r),
          o.batchFn?.(t, e));
      } else await (0, d.useHooks)(t.push, 'DestinationPush', e.hooks)(n, r);
      return !0;
    }
    function E(e) {
      return (0, d.assign)(
        { ok: !e?.failed?.length, successful: [], queued: [], failed: [] },
        e,
      );
    }
    function S(e) {
      return Object.entries(e).reduce(
        (e, [t, n]) => (
          (e[t] = { ...n, config: (0, d.isObject)(n.config) ? n.config : {} }),
          e
        ),
        {},
      );
    }
    function D(e, t) {
      const n = e.config.wrapper || {},
        s = e.config.dryRun ?? t?.config.dryRun;
      return (0, d.createWrapper)(e.type || 'unknown', {
        ...n,
        ...((0, d.isDefined)(s) && { dryRun: s }),
      });
    }
    async function x(e, t) {
      const { consent: n } = e;
      let s = !1;
      const o = {};
      return (
        Object.entries(t).forEach(([e, t]) => {
          const n = !!t;
          ((o[e] = n), (s = s || n));
        }),
        (e.consent = (0, l.assign)(n, o)),
        h(e, 'consent', void 0, o),
        s ? O(e) : E({ ok: !0 })
      );
    }
    var P = require('@walkeros/core'),
      R = require('@walkeros/core');
    async function A(e, t, n) {
      const s = {
        disabled: n.disabled ?? !1,
        settings: n.settings ?? {},
        onError: n.onError,
      };
      if (s.disabled) return {};
      const o = await (0, R.tryCatchAsync)(t)(e, s);
      if (!o || !o.source) return {};
      const i = s.type || o.source.type || '',
        a = n.id || `${i}_${(0, R.getId)(5)}`;
      if (o.source && o.elb) {
        o.source.elb = o.elb;
      }
      return (
        e.sources || (e.sources = {}),
        (e.sources[a] = {
          type: i,
          settings: s.settings,
          mapping: void 0,
          elb: o.elb,
        }),
        o
      );
    }
    async function M(e, t = {}) {
      for (const [n, s] of Object.entries(t)) {
        const t = { id: n },
          o = await A(e, s, t);
        if (o.source) {
          if (o.elb) {
            o.source.elb = o.elb;
          }
          e.sources[n] = {
            type: o.source.type,
            settings: o.source.config.settings,
            mapping: void 0,
            elb: o.elb,
          };
        }
      }
    }
    async function H(e = {}) {
      const t = (function (e) {
          const { version: t } = a(),
            n = {
              dryRun: !1,
              globalsStatic: {},
              sessionStatic: {},
              tagging: 0,
              verbose: !1,
              onLog: o,
              run: !0,
              destinations: {},
              consent: {},
              user: {},
              globals: {},
              custom: {},
            },
            s = (0, P.assign)(n, e, { merge: !1, extend: !1 });
          function o(e, t) {
            (0, P.onLog)({ message: e }, t || s.verbose);
          }
          s.onLog = o;
          const i = { ...s.globalsStatic, ...s.globals },
            r = {
              allowed: !1,
              config: s,
              consent: s.consent || {},
              count: 0,
              custom: s.custom || {},
              destinations: S(s.destinations || {}),
              globals: i,
              group: '',
              hooks: {},
              on: {},
              queue: [],
              round: 0,
              session: void 0,
              timing: Date.now(),
              user: s.user || {},
              version: t,
              sources: {},
              push: void 0,
            };
          return (
            (r.push = v(r, w, (e) => ({
              timing: Math.round((Date.now() - r.timing) / 10) / 100,
              source: { type: 'collector', id: '', previous_id: '' },
              ...e,
            }))),
            r
          );
        })(e),
        { consent: n, user: s, globals: o, custom: i, sources: r } = e;
      return (
        n && (await t.push('walker consent', n)),
        s && (await t.push('walker user', s)),
        o && Object.assign(t.globals, o),
        i && Object.assign(t.custom, i),
        r && (await M(t, r)),
        t.config.run && (await t.push('walker run')),
        { collector: t, elb: t.push }
      );
    } //# sourceMappingURL=index.js.map

    // Return the exports
    return module.exports;
  })();
  // @walkeros/web-source-browser@0.0.9 (source)

  // @walkeros/web-source-browser@0.0.9 (source) - REAL PACKAGE CODE
  var walkerOSSourceBrowser = (function () {
    // Create CommonJS environment
    var module = { exports: {} };
    var exports = module.exports;

    // Mock require function for cross-package dependencies
    var require = function (packageName) {
      if (packageName === '@walkeros/core') {
        return walkerOSCore || {};
      }
      if (packageName === '@walkeros/collector') {
        return walkerOSCollector || {};
      }
      if (packageName === '@walkeros/web-source-browser') {
        return walkerOSSourceBrowser || {};
      }
      if (packageName === '@walkeros/web-destination-gtag') {
        return walkerOSDestinationGtag || {};
      }
      if (packageName === '@walkeros/web-core') {
        return walkerOSWebCore || {};
      }
      // Return empty object for unknown dependencies
      return {};
    };

    // Execute the original package code
    ('use strict');
    var e,
      t,
      n,
      r = Object.defineProperty,
      o = Object.getOwnPropertyDescriptor,
      s = Object.getOwnPropertyNames,
      i = Object.prototype.hasOwnProperty,
      c = {};
    (((e, t) => {
      for (var n in t) r(e, n, { get: t[n], enumerable: !0 });
    })(c, {
      SourceBrowser: () => fe,
      createTagger: () => de,
      default: () => ge,
      getAllEvents: () => S,
      getEvents: () => E,
      getGlobals: () => $,
      sourceBrowser: () => pe,
    }),
      (module.exports =
        ((e = c),
        ((e, t, n, c) => {
          if ((t && 'object' == typeof t) || 'function' == typeof t)
            for (let a of s(t))
              i.call(e, a) ||
                a === n ||
                r(e, a, {
                  get: () => t[a],
                  enumerable: !(c = o(t, a)) || c.enumerable,
                });
          return e;
        })(r({}, '__esModule', { value: !0 }), e))));
    var a = Object.getOwnPropertyNames,
      l =
        ((t = {
          'package.json'(e, t) {
            t.exports = {
              name: '@walkeros/core',
              description:
                'Core types and platform-agnostic utilities for walkerOS',
              version: '0.0.8',
              main: './dist/index.js',
              module: './dist/index.mjs',
              types: './dist/index.d.ts',
              license: 'MIT',
              files: ['dist/**'],
              scripts: {
                build: 'tsup --silent',
                clean: 'rm -rf .turbo && rm -rf node_modules && rm -rf dist',
                dev: 'jest --watchAll --colors',
                lint: 'tsc && eslint "**/*.ts*"',
                test: 'jest',
                update: 'npx npm-check-updates -u && npm update',
              },
              dependencies: {},
              devDependencies: {},
              repository: {
                url: 'git+https://github.com/elbwalker/walkerOS.git',
                directory: 'packages/core',
              },
              author: 'elbwalker <hello@elbwalker.com>',
              homepage: 'https://github.com/elbwalker/walkerOS#readme',
              bugs: { url: 'https://github.com/elbwalker/walkerOS/issues' },
              keywords: [
                'walker',
                'walkerOS',
                'analytics',
                'tracking',
                'data collection',
                'measurement',
                'data privacy',
                'privacy friendly',
                'web analytics',
                'product analytics',
                'core',
                'types',
                'utils',
              ],
              funding: [
                {
                  type: 'GitHub Sponsors',
                  url: 'https://github.com/sponsors/elbwalker',
                },
              ],
            };
          },
        }),
        function () {
          return (
            n || (0, t[a(t)[0]])((n = { exports: {} }).exports, n),
            n.exports
          );
        }),
      u = { merge: !0, shallow: !0, extend: !0 };
    function f(e, t = {}, n = {}) {
      n = { ...u, ...n };
      const r = Object.entries(t).reduce((t, [r, o]) => {
        const s = e[r];
        return (
          n.merge && Array.isArray(s) && Array.isArray(o)
            ? (t[r] = o.reduce(
                (e, t) => (e.includes(t) ? e : [...e, t]),
                [...s],
              ))
            : (n.extend || r in e) && (t[r] = o),
          t
        );
      }, {});
      return n.shallow ? { ...e, ...r } : (Object.assign(e, r), e);
    }
    function d(e) {
      return Array.isArray(e);
    }
    function p(e) {
      return void 0 !== e;
    }
    function g(e) {
      return e === document || e instanceof Element;
    }
    function b(e) {
      return (
        'object' == typeof e &&
        null !== e &&
        !d(e) &&
        '[object Object]' === Object.prototype.toString.call(e)
      );
    }
    function m(e) {
      return 'string' == typeof e;
    }
    function h(e) {
      if ('true' === e) return !0;
      if ('false' === e) return !1;
      const t = Number(e);
      return e == t && '' !== e ? t : String(e);
    }
    var { version: y } = l();
    function w(e, t, n) {
      return function (...r) {
        try {
          return e(...r);
        } catch (e) {
          if (!t) return;
          return t(e);
        } finally {
          null == n || n();
        }
      };
    }
    function v(e) {
      return e ? e.trim().replace(/^'|'$/g, '').trim() : '';
    }
    var k = require('@walkeros/collector'),
      x = require('@walkeros/web-core'),
      j = require('@walkeros/collector'),
      C = require('@walkeros/web-core');
    function O(e, t, n = !0) {
      return e + (t = null != t ? (n ? '-' : '') + t : '');
    }
    function A(e, t, n, r = !0) {
      return H((0, C.getAttribute)(t, O(e, n, r)) || '').reduce((e, n) => {
        let [r, o] = I(n);
        if (!r) return e;
        if (
          (o || (r.endsWith(':') && (r = r.slice(0, -1)), (o = '')),
          o.startsWith('#'))
        ) {
          o = o.slice(1);
          try {
            let e = t[o];
            (e || 'selected' !== o || (e = t.options[t.selectedIndex].text),
              (o = String(e)));
          } catch (e) {
            o = '';
          }
        }
        return (
          r.endsWith('[]')
            ? ((r = r.slice(0, -2)), d(e[r]) || (e[r] = []), e[r].push(h(o)))
            : (e[r] = h(o)),
          e
        );
      }, {});
    }
    function S(e = document.body, t = j.Const.Commands.Prefix) {
      let n = [];
      const r = j.Const.Commands.Action,
        o = `[${O(t, r, !1)}]`,
        s = (e) => {
          Object.keys(A(t, e, r, !1)).forEach((r) => {
            n = n.concat(E(e, r, t));
          });
        };
      return (e !== document && e.matches(o) && s(e), M(e, o, s), n);
    }
    function E(e, t, n = j.Const.Commands.Prefix) {
      const r = [],
        o = (function (e, t, n) {
          let r = t;
          for (; r; ) {
            const t = L(
              (0, C.getAttribute)(r, O(e, j.Const.Commands.Action, !1)),
            );
            if (t[n] || 'click' !== n) return t[n];
            r = _(e, r);
          }
          return [];
        })(n, e, t);
      return o
        ? (o.forEach((o) => {
            const s = H(o.actionParams || '', ',').reduce(
                (e, t) => ((e[v(t)] = !0), e),
                {},
              ),
              i = P(n, e, s);
            if (!i.length) {
              const t = 'page',
                r = `[${O(n, t)}]`,
                [o, s] = q(e, r, n, t);
              i.push({ type: t, data: o, nested: [], context: s });
            }
            i.forEach((e) => {
              r.push({
                entity: e.type,
                action: o.action,
                data: e.data,
                trigger: t,
                context: e.context,
                nested: e.nested,
              });
            });
          }),
          r)
        : r;
    }
    function $(e = j.Const.Commands.Prefix, t = document) {
      const n = O(e, j.Const.Commands.Globals, !1);
      let r = {};
      return (
        M(t, `[${n}]`, (t) => {
          r = f(r, A(e, t, j.Const.Commands.Globals, !1));
        }),
        r
      );
    }
    function L(e) {
      const t = {};
      return (
        H(e).forEach((e) => {
          const [n, r] = I(e),
            [o, s] = T(n);
          if (!o) return;
          let [i, c] = T(r || '');
          ((i = i || o),
            t[o] || (t[o] = []),
            t[o].push({
              trigger: o,
              triggerParams: s,
              action: i,
              actionParams: c,
            }));
        }),
        t
      );
    }
    function P(e, t, n) {
      const r = [];
      let o = t;
      for (n = 0 !== Object.keys(n || {}).length ? n : void 0; o; ) {
        const s = W(e, o, t, n);
        (s && r.push(s), (o = _(e, o)));
      }
      return r;
    }
    function W(e, t, n, r) {
      const o = (0, C.getAttribute)(t, O(e));
      if (!o || (r && !r[o])) return null;
      const s = [t],
        i = `[${O(e, o)}],[${O(e, '')}]`,
        c = O(e, j.Const.Commands.Link, !1);
      let a = {};
      const l = [],
        [u, d] = q(n || t, i, e, o);
      M(t, `[${c}]`, (t) => {
        const [n, r] = I((0, C.getAttribute)(t, c));
        'parent' === r &&
          M(document.body, `[${c}="${n}:child"]`, (t) => {
            s.push(t);
            const n = W(e, t);
            n && l.push(n);
          });
      });
      const p = [];
      s.forEach((e) => {
        (e.matches(i) && p.push(e), M(e, i, (e) => p.push(e)));
      });
      let g = {};
      return (
        p.forEach((t) => {
          ((g = f(g, A(e, t, ''))), (a = f(a, A(e, t, o))));
        }),
        (a = f(f(g, a), u)),
        s.forEach((t) => {
          M(t, `[${O(e)}]`, (t) => {
            const n = W(e, t);
            n && l.push(n);
          });
        }),
        { type: o, data: a, context: d, nested: l }
      );
    }
    function _(e, t) {
      const n = O(e, j.Const.Commands.Link, !1);
      if (t.matches(`[${n}]`)) {
        const [e, r] = I((0, C.getAttribute)(t, n));
        if ('child' === r)
          return document.querySelector(`[${n}="${e}:parent"]`);
      }
      return !t.parentElement &&
        t.getRootNode &&
        t.getRootNode() instanceof ShadowRoot
        ? t.getRootNode().host
        : t.parentElement;
    }
    function q(e, t, n, r) {
      let o = {};
      const s = {};
      let i = e;
      const c = `[${O(n, j.Const.Commands.Context, !1)}]`;
      let a = 0;
      for (; i; )
        (i.matches(t) && ((o = f(A(n, i, ''), o)), (o = f(A(n, i, r), o))),
          i.matches(c) &&
            (Object.entries(A(n, i, j.Const.Commands.Context, !1)).forEach(
              ([e, t]) => {
                t && !s[e] && (s[e] = [t, a]);
              },
            ),
            ++a),
          (i = _(n, i)));
      return [o, s];
    }
    function M(e, t, n) {
      e.querySelectorAll(t).forEach(n);
    }
    function H(e, t = ';') {
      if (!e) return [];
      const n = new RegExp(`(?:[^${t}']+|'[^']*')+`, 'ig');
      return e.match(n) || [];
    }
    function I(e) {
      const [t, n] = e.split(/:(.+)/, 2);
      return [v(t), v(n)];
    }
    function T(e) {
      const [t, n] = e.split('(', 2);
      return [t, n ? n.slice(0, -1) : ''];
    }
    var V = require('@walkeros/web-core'),
      R = new WeakMap(),
      N = new WeakMap();
    function D(e) {
      const t = Date.now();
      let n = N.get(e);
      return (
        (!n || t - n.lastChecked > 500) &&
          ((n = { isVisible: (0, V.isVisible)(e), lastChecked: t }),
          N.set(e, n)),
        n.isVisible
      );
    }
    function G(e) {
      if (window.IntersectionObserver)
        return w(
          () =>
            new window.IntersectionObserver(
              (t) => {
                t.forEach((t) => {
                  !(function (e, t) {
                    var n, r;
                    const o = t.target,
                      s = e._visibilityState;
                    if (!s) return;
                    const i = s.timers.get(o);
                    if (t.intersectionRatio > 0) {
                      const r = Date.now();
                      let c = R.get(o);
                      (!c || r - c.lastChecked > 1e3) &&
                        ((c = {
                          isLarge: o.offsetHeight > window.innerHeight,
                          lastChecked: r,
                        }),
                        R.set(o, c));
                      if (t.intersectionRatio >= 0.5 || (c.isLarge && D(o))) {
                        const t =
                          null == (n = s.elementConfigs) ? void 0 : n.get(o);
                        if ((null == t ? void 0 : t.multiple) && t.blocked)
                          return;
                        if (!i) {
                          const t = window.setTimeout(async () => {
                            var t, n;
                            if (D(o)) {
                              const r =
                                  null == (t = s.elementConfigs)
                                    ? void 0
                                    : t.get(o),
                                i =
                                  (null == r ? void 0 : r.prefix) || 'data-elb';
                              await ee(e, i, o, U.Visible);
                              const c =
                                null == (n = s.elementConfigs)
                                  ? void 0
                                  : n.get(o);
                              (null == c ? void 0 : c.multiple)
                                ? (c.blocked = !0)
                                : (function (e, t) {
                                    const n = e._visibilityState;
                                    if (!n) return;
                                    n.observer && n.observer.unobserve(t);
                                    const r = n.timers.get(t);
                                    (r && (clearTimeout(r), n.timers.delete(t)),
                                      R.delete(t),
                                      N.delete(t));
                                  })(e, o);
                            }
                          }, s.duration);
                          s.timers.set(o, t);
                        }
                        return;
                      }
                    }
                    i && (clearTimeout(i), s.timers.delete(o));
                    const c =
                      null == (r = s.elementConfigs) ? void 0 : r.get(o);
                    (null == c ? void 0 : c.multiple) && (c.blocked = !1);
                  })(e, t);
                });
              },
              { rootMargin: '0px', threshold: [0, 0.5] },
            ),
          () => {},
        )();
    }
    function B(e, t, n = { multiple: !1 }) {
      var r;
      const o = e._visibilityState;
      (null == o ? void 0 : o.observer) &&
        t &&
        (o.elementConfigs || (o.elementConfigs = new WeakMap()),
        o.elementConfigs.set(t, {
          multiple: null != (r = n.multiple) && r,
          blocked: !1,
          prefix: n.prefix || 'data-elb',
        }),
        o.observer.observe(t));
    }
    function Y(e) {
      const t = e._visibilityState;
      t && (t.observer && t.observer.disconnect(), delete e._visibilityState);
    }
    var z = performance.now();
    function F(e, t = 'data-elb', n, r, o, s, i, c) {
      if (m(n) && n.startsWith('walker ')) {
        return e.push(n, r);
      }
      if (b(n)) {
        const t = n;
        return (t.source || (t.source = J()), e.push(t));
      }
      const [a] = String(b(n) ? n.event : n).split(' ');
      let l,
        u = b(r) ? r : {},
        f = {},
        d = !1;
      if (
        (g(r) && ((l = r), (d = !0)),
        g(s) ? (l = s) : b(s) && Object.keys(s).length && (f = s),
        l)
      ) {
        const e = P(t, l).find((e) => e.type === a);
        e && (d && (u = e.data), (f = e.context));
      }
      'page' === a && (u.id = u.id || window.location.pathname);
      const p = {
        event: String(n || ''),
        data: u,
        context: f,
        nested: i,
        custom: c,
        trigger: m(o) ? o : '',
        timing: Math.round((performance.now() - z) / 10) / 100,
        source: J(),
      };
      return e.push(p);
    }
    function J() {
      return {
        type: 'browser',
        id: window.location.href,
        previous_id: document.referrer,
      };
    }
    var K,
      Q = [],
      U = {
        Click: 'click',
        Custom: 'custom',
        Hover: 'hover',
        Load: 'load',
        Pulse: 'pulse',
        Scroll: 'scroll',
        Submit: 'submit',
        Visible: 'visible',
        Visibles: 'visibles',
        Wait: 'wait',
      };
    function X(e, t) {
      const { scope: n, prefix: r } = t;
      !(function (e, t, n) {
        (t.addEventListener(
          'click',
          w(function (t) {
            ne.call(this, e, t, n);
          }),
        ),
          t.addEventListener(
            'submit',
            w(function (t) {
              re.call(this, e, t, n);
            }),
          ));
      })(e, n, r);
    }
    function Z(e, t) {
      const { prefix: n, scope: r } = t;
      !(function (e, t, n) {
        ((Q = []),
          Y(e),
          (function (e, t = 1e3) {
            e._visibilityState ||
              (e._visibilityState = {
                observer: G(e),
                timers: new WeakMap(),
                duration: t,
              });
          })(e, 1e3));
        const r = O(t, k.Const.Commands.Action, !1),
          o = n || document;
        o !== document && te(e, o, r, t);
        const s = o.querySelectorAll(`[${r}]`);
        (s.forEach((n) => {
          te(e, n, r, t);
        }),
          Q.length &&
            (function (e, t, n) {
              const r = (e, t, n) =>
                e.filter(([e, r]) => {
                  const o = window.scrollY + window.innerHeight,
                    s = e.offsetTop;
                  if (o < s) return !0;
                  const i = e.clientHeight;
                  return (
                    !(100 * (1 - (s + i - o) / (i || 1)) >= r) ||
                    (ee(t, n, e, U.Scroll), !1)
                  );
                });
              K ||
                ((K = (function (e, t = 1e3) {
                  let n = null;
                  return function (...r) {
                    if (null === n)
                      return (
                        (n = setTimeout(() => {
                          n = null;
                        }, t)),
                        e(...r)
                      );
                  };
                })(function () {
                  Q = r.call(t, Q, e, n);
                })),
                t.addEventListener('scroll', K));
            })(e, o, t));
      })(e, n, r);
    }
    async function ee(e, t, n, r) {
      const o = E(n, r, t);
      return Promise.all(
        o.map((n) =>
          F(e, t, { event: `${n.entity} ${n.action}`, ...n, trigger: r }),
        ),
      );
    }
    function te(e, t, n, r) {
      const o = (0, x.getAttribute)(t, n);
      o &&
        Object.values(L(o)).forEach((n) =>
          n.forEach((n) => {
            switch (n.trigger) {
              case U.Hover:
                !(function (e, t, n) {
                  t.addEventListener(
                    'mouseenter',
                    w(function (t) {
                      t.target instanceof Element &&
                        ee(e, n, t.target, U.Hover);
                    }),
                  );
                })(e, t, r);
                break;
              case U.Load:
                !(function (e, t, n) {
                  ee(e, n, t, U.Load);
                })(e, t, r);
                break;
              case U.Pulse:
                !(function (e, t, n = '', r) {
                  setInterval(
                    () => {
                      document.hidden || ee(e, r, t, U.Pulse);
                    },
                    parseInt(n || '') || 15e3,
                  );
                })(e, t, n.triggerParams, r);
                break;
              case U.Scroll:
                !(function (e, t = '') {
                  const n = parseInt(t || '') || 50;
                  if (n < 0 || n > 100) return;
                  Q.push([e, n]);
                })(t, n.triggerParams);
                break;
              case U.Visible:
                B(e, t, { prefix: r });
                break;
              case U.Visibles:
                B(e, t, { multiple: !0, prefix: r });
                break;
              case U.Wait:
                !(function (e, t, n = '', r) {
                  setTimeout(
                    () => ee(e, r, t, U.Wait),
                    parseInt(n || '') || 15e3,
                  );
                })(e, t, n.triggerParams, r);
            }
          }),
        );
    }
    function ne(e, t, n) {
      ee(e, n, t.target, U.Click);
    }
    function re(e, t, n) {
      t.target && ee(e, n, t.target, U.Submit);
    }
    function oe(e, t = {}) {
      const n = t.name || 'elbLayer';
      window[n] || (window[n] = []);
      const r = window[n];
      ((r.push = function (...n) {
        if (ce(n[0])) {
          const r = [...Array.from(n[0])],
            o = Array.prototype.push.apply(this, [r]);
          return (ie(e, t.prefix, r), o);
        }
        const r = Array.prototype.push.apply(this, n);
        return (
          n.forEach((n) => {
            ie(e, t.prefix, n);
          }),
          r
        );
      }),
        Array.isArray(r) &&
          r.length > 0 &&
          (function (e, t = 'data-elb', n) {
            (se(e, t, n, !0), se(e, t, n, !1), (n.length = 0));
          })(e, t.prefix, r));
    }
    function se(e, t, n, r) {
      const o = [];
      let s = !0;
      (n.forEach((e) => {
        const t = ce(e)
          ? [...Array.from(e)]
          : null != (n = e) &&
              'object' == typeof n &&
              'length' in n &&
              'number' == typeof n.length
            ? Array.from(e)
            : [e];
        var n;
        if (Array.isArray(t) && 0 === t.length) return;
        if (Array.isArray(t) && 1 === t.length && !t[0]) return;
        const i = t[0],
          c = !b(i) && m(i) && i.startsWith('walker ');
        if (b(i)) {
          if ('object' == typeof i && 0 === Object.keys(i).length) return;
        } else {
          const e = Array.from(t);
          if (!m(e[0]) || '' === e[0].trim()) return;
          const n = 'walker run';
          s && e[0] === n && (s = !1);
        }
        ((r && c) || (!r && !c)) && o.push(t);
      }),
        o.forEach((n) => {
          ie(e, t, n);
        }));
    }
    function ie(e, t = 'data-elb', n) {
      w(
        () => {
          if (Array.isArray(n)) {
            const [r, ...o] = n;
            if (!r || (m(r) && '' === r.trim())) return;
            if (m(r) && r.startsWith('walker ')) return void e.push(r, o[0]);
            F(e, t, r, ...o);
          } else if (n && 'object' == typeof n) {
            if (0 === Object.keys(n).length) return;
            e.push(n);
          }
        },
        () => {},
      )();
    }
    function ce(e) {
      return (
        null != e &&
        'object' == typeof e &&
        '[object Arguments]' === Object.prototype.toString.call(e)
      );
    }
    var ae = require('@walkeros/collector'),
      le = require('@walkeros/web-core');
    function ue(e = {}) {
      return {
        prefix: 'data-elb',
        pageview: !0,
        session: !0,
        elb: 'elb',
        elbLayer: 'elbLayer',
        scope: document,
        ...e,
      };
    }
    var fe = {};
    function de(e = {}) {
      const t = e.prefix || 'data-elb';
      return function (e) {
        let n,
          r = e;
        const o = {},
          s = {},
          i = {},
          c = {},
          a = {};
        function l(e) {
          return Object.entries(e)
            .map(
              ([e, t]) =>
                `${e}:${(function (e) {
                  if (!p(e) || null === e) return 'undefined';
                  let t = String(e);
                  return (
                    (t = t.replace(/\\/g, '\\\\')),
                    (t = t.replace(/;/g, '\\;')),
                    (t = t.replace(/:/g, '\\:')),
                    (t = t.replace(/'/g, "\\'")),
                    t
                  );
                })(t)}`,
            )
            .join(';');
        }
        const u = {
          entity: (e) => ((n = e), (r = e), u),
          data(e, t) {
            const n = null != r ? r : '';
            return (
              o[n] || (o[n] = {}),
              m(e) ? (o[n][e] = t) : Object.assign(o[n], e),
              u
            );
          },
          action(e, t) {
            if (m(e))
              if (p(t)) s[e] = t;
              else if (e.includes(':')) {
                const [t, n] = e.split(':', 2);
                s[t] = n;
              } else s[e] = e;
            else Object.assign(s, e);
            return u;
          },
          context: (e, t) => (m(e) ? (i[e] = t) : Object.assign(i, e), u),
          globals: (e, t) => (m(e) ? (c[e] = t) : Object.assign(c, e), u),
          link: (e, t) => (m(e) ? (a[e] = t) : Object.assign(a, e), u),
          get() {
            const e = {};
            return (
              n && (e[t] = n),
              Object.entries(o).forEach(([n, r]) => {
                if (Object.keys(r).length > 0) {
                  e[n ? `${t}-${n}` : `${t}-`] = l(r);
                }
              }),
              Object.keys(s).length > 0 && (e[`${t}action`] = l(s)),
              Object.keys(i).length > 0 && (e[`${t}context`] = l(i)),
              Object.keys(c).length > 0 && (e[`${t}globals`] = l(c)),
              Object.keys(a).length > 0 && (e[`${t}link`] = l(a)),
              e
            );
          },
        };
        return u;
      };
    }
    var pe = async (e, t) => {
        try {
          const n = { ...t, settings: ue(t.settings) },
            r = {
              type: 'browser',
              config: n,
              collector: e,
              destroy() {
                Y(e);
              },
            };
          if (
            (!1 !== n.settings.elbLayer &&
              oe(e, {
                name: m(n.settings.elbLayer) ? n.settings.elbLayer : 'elbLayer',
                prefix: n.settings.prefix,
              }),
            n.settings.session)
          ) {
            const t =
              'boolean' == typeof n.settings.session ? {} : n.settings.session;
            !(function (e, t = {}) {
              const n = t.config || {},
                r = f(e.config.sessionStatic || {}, t.data || {});
              var o, s, i;
              ((o = le.sessionStart),
              (s = 'SessionStart'),
              (i = e.hooks),
              function (...e) {
                let t;
                const n = 'post' + s,
                  r = i['pre' + s],
                  c = i[n];
                return (
                  (t = r ? r({ fn: o }, ...e) : o(...e)),
                  c && (t = c({ fn: o, result: t }, ...e)),
                  t
                );
              })({
                ...n,
                cb: (e, t, r) => {
                  let o;
                  const s = n;
                  return (
                    !1 !== s.cb && s.cb
                      ? (o = s.cb(e, t, r))
                      : !1 !== s.cb && (o = r(e, t, r)),
                    t && ((t.session = e), (0, ae.onApply)(t, 'session')),
                    o
                  );
                },
                data: r,
                collector: e,
              });
            })(e, { config: t });
          }
          await (async function (e, t, n) {
            const r = () => {
              if ((e(t, n), null == t ? void 0 : t.on))
                try {
                  (0, k.onApply)(t, 'ready');
                } catch (e) {}
            };
            'loading' !== document.readyState
              ? r()
              : document.addEventListener('DOMContentLoaded', r);
          })(X, e, n.settings);
          const o = (e) => {
            if ((Z(e, n.settings), n.settings.pageview)) {
              const [t, r] = (function (e, t) {
                const n = window.location,
                  r = 'page',
                  o = t === document ? document.body : t,
                  [s, i] = q(o, `[${O(e, r)}]`, e, r);
                return (
                  (s.domain = n.hostname),
                  (s.title = document.title),
                  (s.referrer = document.referrer),
                  n.search && (s.search = n.search),
                  n.hash && (s.hash = n.hash),
                  [s, i]
                );
              })(n.settings.prefix || 'data-elb', n.settings.scope);
              F(e, 'page view', t, U.Load, r);
            }
          };
          await e.push('walker on', 'run', o);
          const s = e._destroy;
          e._destroy = () => {
            var e;
            (null == (e = r.destroy) || e.call(r), s && s());
          };
          const i = (...t) => {
            const [r, o, s, i, c, a] = t;
            return F(e, n.settings.prefix, r, o, s, i, c, a);
          };
          return (
            m(n.settings.elb) && (window[n.settings.elb] = i),
            { source: r, elb: i }
          );
        } catch (e) {
          throw e;
        }
      },
      ge = pe; //# sourceMappingURL=index.js.map

    // Return the exports
    return module.exports;
  })();
  // @walkeros/web-destination-gtag@0.0.8 (destination)

  // @walkeros/web-destination-gtag@0.0.8 (destination) - REAL PACKAGE CODE
  var walkerOSDestinationGtag = (function () {
    // Create CommonJS environment
    var module = { exports: {} };
    var exports = module.exports;

    // Mock require function for cross-package dependencies
    var require = function (packageName) {
      if (packageName === '@walkeros/core') {
        return walkerOSCore || {};
      }
      if (packageName === '@walkeros/collector') {
        return walkerOSCollector || {};
      }
      if (packageName === '@walkeros/web-source-browser') {
        return walkerOSSourceBrowser || {};
      }
      if (packageName === '@walkeros/web-destination-gtag') {
        return walkerOSDestinationGtag || {};
      }
      if (packageName === '@walkeros/web-core') {
        return walkerOSWebCore || {};
      }
      // Return empty object for unknown dependencies
      return {};
    };

    // Execute the original package code
    ('use strict');
    var e,
      t = Object.defineProperty,
      a = Object.getOwnPropertyDescriptor,
      n = Object.getOwnPropertyNames,
      r = Object.prototype.hasOwnProperty,
      o = (e, a) => {
        for (var n in a) t(e, n, { get: a[n], enumerable: !0 });
      },
      i = {};
    (o(i, {
      DestinationGtag: () => x,
      default: () => z,
      destinationGtag: () => P,
      examples: () => E,
    }),
      (module.exports =
        ((e = i),
        ((e, o, i, s) => {
          if ((o && 'object' == typeof o) || 'function' == typeof o)
            for (let c of n(o))
              r.call(e, c) ||
                c === i ||
                t(e, c, {
                  get: () => o[c],
                  enumerable: !(s = a(o, c)) || s.enumerable,
                });
          return e;
        })(t({}, '__esModule', { value: !0 }), e))));
    var s,
      c,
      d = new Set();
    function u(e, t = 'https://www.googletagmanager.com/gtag/js?id=') {
      if (d.has(e)) return;
      const a = document.createElement('script');
      ((a.src = t + e), document.head.appendChild(a), d.add(e));
    }
    function p() {
      const e = window;
      ((e.dataLayer = e.dataLayer || []),
        e.gtag ||
          (e.gtag = function () {
            e.dataLayer.push(arguments);
          }));
    }
    function l(e) {
      return e('gtag', window.gtag);
    }
    var g = Object.getOwnPropertyNames,
      m =
        ((s = {
          'package.json'(e, t) {
            t.exports = {
              name: '@walkeros/core',
              description:
                'Core types and platform-agnostic utilities for walkerOS',
              version: '0.0.8',
              main: './dist/index.js',
              module: './dist/index.mjs',
              types: './dist/index.d.ts',
              license: 'MIT',
              files: ['dist/**'],
              scripts: {
                build: 'tsup --silent',
                clean: 'rm -rf .turbo && rm -rf node_modules && rm -rf dist',
                dev: 'jest --watchAll --colors',
                lint: 'tsc && eslint "**/*.ts*"',
                test: 'jest',
                update: 'npx npm-check-updates -u && npm update',
              },
              dependencies: {},
              devDependencies: {},
              repository: {
                url: 'git+https://github.com/elbwalker/walkerOS.git',
                directory: 'packages/core',
              },
              author: 'elbwalker <hello@elbwalker.com>',
              homepage: 'https://github.com/elbwalker/walkerOS#readme',
              bugs: { url: 'https://github.com/elbwalker/walkerOS/issues' },
              keywords: [
                'walker',
                'walkerOS',
                'analytics',
                'tracking',
                'data collection',
                'measurement',
                'data privacy',
                'privacy friendly',
                'web analytics',
                'product analytics',
                'core',
                'types',
                'utils',
              ],
              funding: [
                {
                  type: 'GitHub Sponsors',
                  url: 'https://github.com/sponsors/elbwalker',
                },
              ],
            };
          },
        }),
        function () {
          return (
            c || (0, s[g(s)[0]])((c = { exports: {} }).exports, c),
            c.exports
          );
        }),
      y = { merge: !0, shallow: !0, extend: !0 };
    function v(e) {
      return (
        'object' == typeof e &&
        null !== e &&
        !(function (e) {
          return Array.isArray(e);
        })(e) &&
        '[object Object]' === Object.prototype.toString.call(e)
      );
    }
    var { version: h } = m();
    function w(e = {}) {
      var t;
      const a = e.timestamp || new Date().setHours(0, 13, 37, 0),
        n = e.group || 'gr0up',
        r = e.count || 1,
        o = (function (e, t = {}, a = {}) {
          a = { ...y, ...a };
          const n = Object.entries(t).reduce((t, [n, r]) => {
            const o = e[n];
            return (
              a.merge && Array.isArray(o) && Array.isArray(r)
                ? (t[n] = r.reduce(
                    (e, t) => (e.includes(t) ? e : [...e, t]),
                    [...o],
                  ))
                : (a.extend || n in e) && (t[n] = r),
              t
            );
          }, {});
          return a.shallow ? { ...e, ...n } : (Object.assign(e, n), e);
        })(
          {
            event: 'entity action',
            data: {
              string: 'foo',
              number: 1,
              boolean: !0,
              array: [0, 'text', !1],
              not: void 0,
            },
            context: { dev: ['test', 1] },
            globals: { lang: 'elb' },
            custom: { completely: 'random' },
            user: { id: 'us3r', device: 'c00k13', session: 's3ss10n' },
            nested: [
              {
                type: 'child',
                data: { is: 'subordinated' },
                nested: [],
                context: { element: ['child', 0] },
              },
            ],
            consent: { functional: !0 },
            id: `${a}-${n}-${r}`,
            trigger: 'test',
            entity: 'entity',
            action: 'action',
            timestamp: a,
            timing: 3.14,
            group: n,
            count: r,
            version: { source: h, tagging: 1 },
            source: {
              type: 'web',
              id: 'https://localhost:80',
              previous_id: 'http://remotehost:9001',
            },
          },
          e,
          { merge: !1 },
        );
      if (e.event) {
        const [a, n] = null != (t = e.event.split(' ')) ? t : [];
        a && n && ((o.entity = a), (o.action = n));
      }
      return o;
    }
    function b(e = 'entity action', t = {}) {
      const a = t.timestamp || new Date().setHours(0, 13, 37, 0),
        n = {
          data: {
            id: 'ers',
            name: 'Everyday Ruck Snack',
            color: 'black',
            size: 'l',
            price: 420,
          },
        },
        r = {
          data: { id: 'cc', name: 'Cool Cap', size: 'one size', price: 42 },
        };
      return w({
        ...{
          'cart view': {
            data: { currency: 'EUR', value: 2 * n.data.price },
            context: { shopping: ['cart', 0] },
            globals: { pagegroup: 'shop' },
            nested: [
              {
                type: 'product',
                data: { ...n.data, quantity: 2 },
                context: { shopping: ['cart', 0] },
                nested: [],
              },
            ],
            trigger: 'load',
          },
          'checkout view': {
            data: {
              step: 'payment',
              currency: 'EUR',
              value: n.data.price + r.data.price,
            },
            context: { shopping: ['checkout', 0] },
            globals: { pagegroup: 'shop' },
            nested: [
              {
                type: 'product',
                ...n,
                context: { shopping: ['checkout', 0] },
                nested: [],
              },
              {
                type: 'product',
                ...r,
                context: { shopping: ['checkout', 0] },
                nested: [],
              },
            ],
            trigger: 'load',
          },
          'order complete': {
            data: {
              id: '0rd3r1d',
              currency: 'EUR',
              shipping: 5.22,
              taxes: 73.76,
              total: 555,
            },
            context: { shopping: ['complete', 0] },
            globals: { pagegroup: 'shop' },
            nested: [
              {
                type: 'product',
                ...n,
                context: { shopping: ['complete', 0] },
                nested: [],
              },
              {
                type: 'product',
                ...r,
                context: { shopping: ['complete', 0] },
                nested: [],
              },
              {
                type: 'gift',
                data: { name: 'Surprise' },
                context: { shopping: ['complete', 0] },
                nested: [],
              },
            ],
            trigger: 'load',
          },
          'page view': {
            data: {
              domain: 'www.example.com',
              title: 'walkerOS documentation',
              referrer: 'https://www.elbwalker.com/',
              search: '?foo=bar',
              hash: '#hash',
              id: '/docs/',
            },
            globals: { pagegroup: 'docs' },
            trigger: 'load',
          },
          'product add': {
            ...n,
            context: { shopping: ['intent', 0] },
            globals: { pagegroup: 'shop' },
            nested: [],
            trigger: 'click',
          },
          'product view': {
            ...n,
            context: { shopping: ['detail', 0] },
            globals: { pagegroup: 'shop' },
            nested: [],
            trigger: 'load',
          },
          'product visible': {
            data: { ...n.data, position: 3, promo: !0 },
            context: { shopping: ['discover', 0] },
            globals: { pagegroup: 'shop' },
            nested: [],
            trigger: 'load',
          },
          'promotion visible': {
            data: { name: 'Setting up tracking easily', position: 'hero' },
            context: { ab_test: ['engagement', 0] },
            globals: { pagegroup: 'homepage' },
            trigger: 'visible',
          },
          'session start': {
            data: {
              id: 's3ss10n',
              start: a,
              isNew: !0,
              count: 1,
              runs: 1,
              isStart: !0,
              storage: !0,
              referrer: '',
              device: 'c00k13',
            },
            user: {
              id: 'us3r',
              device: 'c00k13',
              session: 's3ss10n',
              hash: 'h4sh',
              address: 'street number',
              email: 'user@example.com',
              phone: '+49 123 456 789',
              userAgent: 'Mozilla...',
              browser: 'Chrome',
              browserVersion: '90',
              deviceType: 'desktop',
              language: 'de-DE',
              country: 'DE',
              region: 'HH',
              city: 'Hamburg',
              zip: '20354',
              timezone: 'Berlin',
              os: 'walkerOS',
              osVersion: '1.0',
              screenSize: '1337x420',
              ip: '127.0.0.0',
              internal: !0,
              custom: 'value',
            },
          },
        }[e],
        ...t,
        event: e,
      });
    }
    function f(e, t, a = {}, n, r) {
      if (!t.measurementId) return;
      const o = v(n) ? n : {},
        i = (function (e, t) {
          const a = {};
          return (
            t.includes('all') &&
              (t = [
                'context',
                'data',
                'event',
                'globals',
                'source',
                'user',
                'version',
              ]),
            t.forEach((t) => {
              let n = e[t] || {};
              ('event' == t &&
                (n = {
                  id: e.id,
                  timing: e.timing,
                  trigger: e.trigger,
                  entity: e.entity,
                  action: e.action,
                  group: e.group,
                  count: e.count,
                }),
                Object.entries(n).forEach(([e, n]) => {
                  ('context' == t && (n = n[0]), (a[`${t}_${e}`] = n));
                }));
            }),
            a
          );
        })(e, a.include || t.include || ['data']),
        s = { ...i, ...o };
      let c = e.event;
      (!1 !== t.snakeCase &&
        (c = (function (e, t = !0) {
          return t ? e.replace(/\s+/g, '_').toLowerCase() : e;
        })(c)),
        (s.send_to = t.measurementId),
        t.debug && (s.debug_mode = !0));
      l(r)('event', c, s);
    }
    var _ = 'dataLayer';
    function k(e, t, a) {
      const { containerId: n, dataLayer: r, domain: o } = e,
        i = r || _,
        s = window;
      i === _ ? (s.dataLayer = s.dataLayer || []) : (s[i] = s[i] || []);
      const c = s[i];
      (t(
        'dataLayer.push',
        c.push.bind(c),
      )({ 'gtm.start': new Date().getTime(), event: 'gtm.js' }),
        a &&
          n &&
          (function (e, t, a) {
            const n = a != _ ? '&l=' + a : '',
              r = document.createElement('script');
            ((r.src = t + e + n), document.head.appendChild(r));
          })(n, o || 'https://www.googletagmanager.com/gtm.js?id=', i));
    }
    var x = {},
      E = {};
    o(E, { events: () => O, mapping: () => R });
    var O = {};
    function j() {
      const e = b('order complete');
      return [
        'event',
        'purchase',
        {
          transaction_id: e.data.id,
          value: e.data.total,
          tax: e.data.taxes,
          shipping: e.data.shipping,
          currency: 'EUR',
          items: e.nested
            .filter((e) => 'product' === e.type)
            .map((e) => ({
              item_id: e.data.id,
              item_name: e.data.name,
              quantity: 1,
            })),
          send_to: 'G-XXXXXX-1',
        },
      ];
    }
    function X() {
      const e = b('product add');
      return [
        'event',
        'add_to_cart',
        {
          currency: 'EUR',
          value: e.data.price,
          items: [
            { item_id: e.data.id, item_variant: e.data.color, quantity: 1 },
          ],
          send_to: 'G-XXXXXX-1',
        },
      ];
    }
    function I() {
      const e = b('order complete');
      return [
        'event',
        'conversion',
        {
          send_to: 'AW-XXXXXXXXX/CONVERSION_LABEL',
          currency: 'EUR',
          value: e.data.total,
          transaction_id: e.data.id,
        },
      ];
    }
    function S() {
      const e = b('product view');
      return {
        event: 'product_view',
        product_id: e.data.id,
        product_name: e.data.name,
        product_category: e.data.category,
        value: e.data.price,
        currency: 'EUR',
      };
    }
    o(O, {
      adsConversion: () => I,
      ga4AddToCart: () => X,
      ga4Purchase: () => j,
      gtmEvent: () => S,
    });
    var R = {};
    o(R, {
      adsConversion: () => U,
      combinedPurchase: () => D,
      config: () => q,
      ga4AddToCart: () => C,
      ga4Purchase: () => L,
      gtmProductView: () => A,
    });
    var L = {
        name: 'purchase',
        settings: { ga4: { include: ['data', 'context'] } },
        data: {
          map: {
            transaction_id: 'data.id',
            value: 'data.total',
            tax: 'data.taxes',
            shipping: 'data.shipping',
            currency: { key: 'data.currency', value: 'EUR' },
            items: {
              loop: [
                'nested',
                {
                  condition: (e) => v(e) && 'product' === e.type,
                  map: {
                    item_id: 'data.id',
                    item_name: 'data.name',
                    quantity: { key: 'data.quantity', value: 1 },
                  },
                },
              ],
            },
          },
        },
      },
      C = {
        name: 'add_to_cart',
        settings: { ga4: { include: ['data'] } },
        data: {
          map: {
            currency: { value: 'EUR', key: 'data.currency' },
            value: 'data.price',
            items: {
              loop: [
                'this',
                {
                  map: {
                    item_id: 'data.id',
                    item_variant: 'data.color',
                    quantity: { value: 1, key: 'data.quantity' },
                  },
                },
              ],
            },
          },
        },
      },
      U = {
        name: 'CONVERSION_LABEL',
        settings: { ads: {} },
        data: {
          map: {
            value: 'data.total',
            currency: { value: 'EUR', key: 'data.currency' },
            transaction_id: 'data.id',
          },
        },
      },
      A = {
        name: 'product_view',
        settings: { gtm: {} },
        data: {
          map: {
            product_id: 'data.id',
            product_name: 'data.name',
            product_category: 'data.category',
            value: 'data.price',
            currency: { value: 'EUR', key: 'data.currency' },
          },
        },
      },
      D = {
        name: 'purchase',
        settings: { ga4: { include: ['data'] }, ads: {}, gtm: {} },
        data: {
          map: {
            transaction_id: 'data.id',
            value: 'data.total',
            currency: { value: 'EUR', key: 'data.currency' },
            items: {
              loop: [
                'nested',
                {
                  condition: (e) => v(e) && 'product' === e.type,
                  map: {
                    item_id: 'data.id',
                    item_name: 'data.name',
                    quantity: { value: 1, key: 'data.quantity' },
                  },
                },
              ],
            },
          },
        },
      },
      q = { order: { complete: D }, product: { add: C, view: A } },
      P = {
        type: 'google-gtag',
        config: { settings: {} },
        init({ config: e, wrap: t }) {
          const { settings: a = {}, loadScript: n } = e,
            { ga4: r, ads: o, gtm: i } = a;
          return (
            (null == r ? void 0 : r.measurementId) &&
              (function (e, t, a) {
                const {
                  measurementId: n,
                  transport_url: r,
                  server_container_url: o,
                  pageview: i,
                } = e;
                if (!n) return;
                (a && u(n), p());
                const s = {};
                (r && (s.transport_url = r),
                  o && (s.server_container_url = o),
                  !1 === i && (s.send_page_view = !1));
                const c = l(t);
                (c('js', new Date()), c('config', n, s));
              })(r, t, n),
            (null == o ? void 0 : o.conversionId) &&
              (function (e, t, a) {
                const { conversionId: n } = e;
                if (!n) return;
                (e.currency || (e.currency = 'EUR'), a && u(n), p());
                const r = l(t);
                (r('js', new Date()), r('config', n));
              })(o, t, n),
            (null == i ? void 0 : i.containerId) && k(i, t, n),
            !!(
              (null == r ? void 0 : r.measurementId) ||
              (null == o ? void 0 : o.conversionId) ||
              (null == i ? void 0 : i.containerId)
            ) && e
          );
        },
        push(e, { config: t, mapping: a = {}, data: n, wrap: r }) {
          const { settings: o = {} } = t,
            { ga4: i, ads: s, gtm: c } = o,
            d = a.settings || {};
          ((null == i ? void 0 : i.measurementId) && f(e, i, d.ga4, n, r),
            (null == s ? void 0 : s.conversionId) &&
              a.name &&
              (function (e, t, a = {}, n, r, o) {
                const { conversionId: i, currency: s } = t,
                  c = v(n) ? n : {},
                  d = a.label || o;
                if (!d) return;
                const u = { send_to: `${i}/${d}`, currency: s || 'EUR', ...c };
                l(r)('event', 'conversion', u);
              })(0, s, d.ads, n, r, a.name),
            (null == c ? void 0 : c.containerId) &&
              (function (e, t, a = {}, n, r) {
                const o = window;
                r(
                  'dataLayer.push',
                  o.dataLayer.push.bind(o.dataLayer),
                )({ event: e.event, ...(v(n) ? n : e) });
              })(e, 0, d.gtm, n, r));
        },
      },
      z = P; //# sourceMappingURL=index.js.map

    // Return the exports
    return module.exports;
  })();

  // 2. CONFIGURATION VALUES
  // Direct use of Flow config
  const flowConfig = {
    _comment:
      'Full working demo with browser source and gtag destination - use this for complete testing',
    packages: [
      {
        name: '@walkeros/core',
        version: '0.0.8',
        type: 'core',
      },
      {
        name: '@walkeros/collector',
        version: '0.0.8',
        type: 'collector',
      },
      {
        name: '@walkeros/web-core',
        version: '0.0.8',
        type: 'core',
      },
      {
        name: '@walkeros/web-source-browser',
        version: '0.0.9',
        type: 'source',
      },
      {
        name: '@walkeros/web-destination-gtag',
        version: '0.0.8',
        type: 'destination',
      },
    ],
    nodes: [
      {
        id: 'collector',
        type: 'collector',
        package: '@walkeros/collector',
        config: {
          run: true,
          consent: {
            functional: true,
            marketing: false,
          },
        },
      },
      {
        id: 'browser-source',
        type: 'source',
        package: '@walkeros/web-source-browser',
        config: {
          settings: {
            pageview: true,
            session: true,
            elbLayer: 'elbLayer',
            prefix: 'data-elb',
            scope: 'body',
          },
        },
      },
      {
        id: 'gtag-destination',
        type: 'destination',
        package: '@walkeros/web-destination-gtag',
        config: {
          settings: {
            ga4: {
              measurementId: 'G-XXXXXXXXXX',
            },
          },
          mapping: {
            page: {
              view: {
                name: 'page_view',
                settings: {
                  ga4: {},
                },
              },
            },
          },
        },
      },
    ],
    edges: [
      {
        id: 'browser-to-collector',
        source: 'browser-source',
        target: 'collector',
      },
      {
        id: 'collector-to-gtag',
        source: 'collector',
        target: 'gtag-destination',
      },
    ],
    _examples: {
      _comment:
        'Alternative configurations for different testing scenarios - consolidated from basic.json and simple-demo.json',
      minimal: {
        packages: [
          {
            name: '@walkeros/core',
            version: '0.0.8',
            type: 'core',
          },
          {
            name: '@walkeros/collector',
            version: '0.0.8',
            type: 'collector',
          },
        ],
        nodes: [
          {
            id: 'collector',
            type: 'collector',
            package: '@walkeros/collector',
            config: {
              consent: {
                functional: true,
              },
            },
          },
        ],
        edges: [],
      },
      simple: {
        packages: [
          {
            name: '@walkeros/core',
            version: '0.0.8',
            type: 'core',
          },
          {
            name: '@walkeros/collector',
            version: '0.0.8',
            type: 'collector',
          },
        ],
        nodes: [
          {
            id: 'collector',
            type: 'collector',
            package: '@walkeros/collector',
            config: {
              run: true,
              consent: {
                functional: true,
              },
            },
          },
        ],
        edges: [],
      },
    },
  };

  // 3. EXECUTING CODE
  // Functions that combine packages with configuration
  async function initializeWalkerOS() {
    const collectorConfig = {};

    // Map Flow nodes to collector configuration
    flowConfig.nodes.forEach((node) => {
      if (node.type === 'source') {
        collectorConfig.sources = collectorConfig.sources || {};
        // Use real source package - extract sourceBrowser from browser source package
        var sourceFn =
          walkerOSSourceBrowser.sourceBrowser || walkerOSSourceBrowser.default;
        // Add defensive scope handling for browser sources
        var sourceConfig = { ...node.config };
        if (sourceConfig.settings && sourceConfig.settings.scope === 'body') {
          // Ensure document.body exists or fallback to document
          sourceConfig.settings.scope = document.body || document;
        }
        collectorConfig.sources[node.id] = walkerOSCore.createSource(
          sourceFn,
          sourceConfig,
        );
      } else if (node.type === 'destination') {
        collectorConfig.destinations = collectorConfig.destinations || {};
        // Use real destination package - extract destinationGtag
        var destObj =
          walkerOSDestinationGtag.destinationGtag ||
          walkerOSDestinationGtag.default;
        collectorConfig.destinations[node.id] = {
          ...destObj,
          config: node.config,
        };
      } else if (node.type === 'collector') {
        Object.assign(collectorConfig, node.config);
      }
    });

    const { collector, elb } =
      await walkerOSCollector.createCollector(collectorConfig);
    return collector;
  }

  // 4. FINAL EXECUTION
  // DOM-ready execution and direct assignment
  function initializeWhenReady() {
    initializeWalkerOS()
      .then((collector) => {
        window.walkerOS = collector; // Direct assignment
      })
      .catch((error) => {
        console.error('WalkerOS initialization failed:', error);
      });
  }

  // Ensure DOM is ready before initializing browser sources
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeWhenReady);
  } else {
    // DOM is already ready
    initializeWhenReady();
  }
})(typeof window !== 'undefined' ? window : {});
