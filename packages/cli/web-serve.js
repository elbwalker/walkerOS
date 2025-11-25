'use strict';
(() => {
  var ut = { merge: !0, shallow: !0, extend: !0 };
  function y(t, e = {}, n = {}) {
    n = { ...ut, ...n };
    let s = Object.entries(e).reduce((o, [r, a]) => {
      let i = t[r];
      return (
        n.merge && Array.isArray(i) && Array.isArray(a)
          ? (o[r] = a.reduce((c, u) => (c.includes(u) ? c : [...c, u]), [...i]))
          : (n.extend || r in t) && (o[r] = a),
        o
      );
    }, {});
    return n.shallow ? { ...t, ...s } : (Object.assign(t, s), t);
  }
  function j(t) {
    return Array.isArray(t);
  }
  function lt(t) {
    return typeof t == 'boolean';
  }
  function O(t) {
    return t !== void 0;
  }
  function G(t) {
    return typeof t == 'function';
  }
  function dt(t) {
    return typeof t == 'number' && !Number.isNaN(t);
  }
  function b(t) {
    return (
      typeof t == 'object' &&
      t !== null &&
      !j(t) &&
      Object.prototype.toString.call(t) === '[object Object]'
    );
  }
  function H(t) {
    return typeof t == 'string';
  }
  function T(t, e = new WeakMap()) {
    if (typeof t != 'object' || t === null) return t;
    if (e.has(t)) return e.get(t);
    let n = Object.prototype.toString.call(t);
    if (n === '[object Object]') {
      let s = {};
      e.set(t, s);
      for (let o in t)
        Object.prototype.hasOwnProperty.call(t, o) && (s[o] = T(t[o], e));
      return s;
    }
    if (n === '[object Array]') {
      let s = [];
      return (
        e.set(t, s),
        t.forEach((o) => {
          s.push(T(o, e));
        }),
        s
      );
    }
    if (n === '[object Date]') return new Date(t.getTime());
    if (n === '[object RegExp]') {
      let s = t;
      return new RegExp(s.source, s.flags);
    }
    return t;
  }
  function J(t, e = '', n) {
    let s = e.split('.'),
      o = t;
    for (let r = 0; r < s.length; r++) {
      let a = s[r];
      if (a === '*' && j(o)) {
        let i = s.slice(r + 1).join('.'),
          c = [];
        for (let u of o) {
          let l = J(u, i, n);
          c.push(l);
        }
        return c;
      }
      if (((o = o instanceof Object ? o[a] : void 0), !o)) break;
    }
    return O(o) ? o : n;
  }
  function z(t, e, n) {
    if (!b(t)) return t;
    let s = T(t),
      o = e.split('.'),
      r = s;
    for (let a = 0; a < o.length; a++) {
      let i = o[a];
      a === o.length - 1
        ? (r[i] = n)
        : ((i in r && typeof r[i] == 'object' && r[i] !== null) || (r[i] = {}),
          (r = r[i]));
    }
    return s;
  }
  function $(t, e = {}, n = {}) {
    let s = { ...e, ...n },
      o = {},
      r = t === void 0;
    return (
      Object.keys(s).forEach((a) => {
        s[a] && ((o[a] = !0), t && t[a] && (r = !0));
      }),
      !!r && o
    );
  }
  function L(t = 6) {
    let e = '';
    for (let n = 36; e.length < t; ) e += ((Math.random() * n) | 0).toString(n);
    return e;
  }
  function X(t, e = 1e3, n = !1) {
    let s,
      o = null,
      r = !1;
    return (...a) =>
      new Promise((i) => {
        let c = n && !r;
        (o && clearTimeout(o),
          (o = setTimeout(() => {
            ((o = null), (n && !r) || ((s = t(...a)), i(s)));
          }, e)),
          c && ((r = !0), (s = t(...a)), i(s)));
      });
  }
  function _(t) {
    return (
      lt(t) ||
      H(t) ||
      dt(t) ||
      !O(t) ||
      (j(t) && t.every(_)) ||
      (b(t) && Object.values(t).every(_))
    );
  }
  function W(t) {
    return _(t) ? t : void 0;
  }
  function D(t, e, n) {
    return function (...s) {
      try {
        return t(...s);
      } catch (o) {
        return e ? e(o) : void 0;
      } finally {
        n?.();
      }
    };
  }
  function v(t, e, n) {
    return async function (...s) {
      try {
        return await t(...s);
      } catch (o) {
        return e ? await e(o) : void 0;
      } finally {
        await n?.();
      }
    };
  }
  async function ft(t, e) {
    let [n, s] = (t.name || '').split(' ');
    if (!e || !n || !s) return {};
    let o,
      r = '',
      a = n,
      i = s,
      c = (l) => {
        if (l)
          return (l = j(l) ? l : [l]).find(
            (f) => !f.condition || f.condition(t),
          );
      };
    e[a] || (a = '*');
    let u = e[a];
    return (
      u && (u[i] || (i = '*'), (o = c(u[i]))),
      o || ((a = '*'), (i = '*'), (o = c(e[a]?.[i]))),
      o && (r = `${a} ${i}`),
      { eventMapping: o, mappingKey: r }
    );
  }
  async function E(t, e = {}, n = {}) {
    if (!O(t)) return;
    let s = (b(t) && t.consent) || n.consent || n.collector?.consent,
      o = j(e) ? e : [e];
    for (let r of o) {
      let a = await v(Q)(t, r, { ...n, consent: s });
      if (O(a)) return a;
    }
  }
  async function Q(t, e, n = {}) {
    let { collector: s, consent: o } = n;
    return (j(e) ? e : [e]).reduce(
      async (r, a) => {
        let i = await r;
        if (i) return i;
        let c = H(a) ? { key: a } : a;
        if (!Object.keys(c).length) return;
        let {
          condition: u,
          consent: l,
          fn: f,
          key: d,
          loop: g,
          map: k,
          set: x,
          validate: w,
          value: m,
        } = c;
        if (u && !(await v(u)(t, a, s))) return;
        if (l && !$(l, o)) return m;
        let p = O(m) ? m : t;
        if ((f && (p = await v(f)(t, a, n)), d && (p = J(t, d, m)), g)) {
          let [C, q] = g,
            R = C === 'this' ? [t] : await E(t, C, n);
          j(R) && (p = (await Promise.all(R.map((N) => E(N, q, n)))).filter(O));
        } else
          k
            ? (p = await Object.entries(k).reduce(async (C, [q, R]) => {
                let N = await C,
                  U = await E(t, R, n);
                return (O(U) && (N[q] = U), N);
              }, Promise.resolve({})))
            : x && (p = await Promise.all(x.map((C) => Q(t, C, n))));
        w && !(await v(w)(p)) && (p = void 0);
        let P = W(p);
        return O(P) ? P : W(m);
      },
      Promise.resolve(void 0),
    );
  }
  async function B(t, e, n) {
    e.policy &&
      (await Promise.all(
        Object.entries(e.policy).map(async ([a, i]) => {
          let c = await E(t, i, { collector: n });
          t = z(t, a, c);
        }),
      ));
    let { eventMapping: s, mappingKey: o } = await ft(t, e.mapping);
    s?.policy &&
      (await Promise.all(
        Object.entries(s.policy).map(async ([a, i]) => {
          let c = await E(t, i, { collector: n });
          t = z(t, a, c);
        }),
      ));
    let r = e.data && (await E(t, e.data, { collector: n }));
    if (s) {
      if (s.ignore)
        return { event: t, data: r, mapping: s, mappingKey: o, ignore: !0 };
      if ((s.name && (t.name = s.name), s.data)) {
        let a = s.data && (await E(t, s.data, { collector: n }));
        r = b(r) && b(a) ? y(r, a) : a;
      }
    }
    return { event: t, data: r, mapping: s, mappingKey: o, ignore: !1 };
  }
  function Y(t, e = !1) {
    e && console.dir(t, { depth: 4 });
  }
  function S(t, e, n) {
    return function (...s) {
      let o,
        r = 'post' + e,
        a = n['pre' + e],
        i = n[r];
      return (
        (o = a ? a({ fn: t }, ...s) : t(...s)),
        i && (o = i({ fn: t, result: o }, ...s)),
        o
      );
    };
  }
  var mt = {
      Action: 'action',
      Actions: 'actions',
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
    h = {
      Commands: mt,
      Utils: {
        Storage: { Cookie: 'cookie', Local: 'local', Session: 'session' },
      },
    };
  async function pt(t, e, n) {
    let { code: s, config: o = {}, env: r = {} } = e,
      a = n || o || { init: !1 },
      i = { ...s, config: a, env: M(s.env, r) },
      c = i.config.id;
    if (!c)
      do c = L(4);
      while (t.destinations[c]);
    return (
      (t.destinations[c] = i),
      i.config.queue !== !1 && (i.queue = [...t.queue]),
      V(t, void 0, { [c]: i })
    );
  }
  async function V(t, e, n) {
    let { allowed: s, consent: o, globals: r, user: a } = t;
    if (!s) return A({ ok: !1 });
    (e && t.queue.push(e), n || (n = t.destinations));
    let i = await Promise.all(
        Object.entries(n || {}).map(async ([f, d]) => {
          let g = (d.queue || []).map((m) => ({ ...m, consent: o }));
          if (((d.queue = []), e)) {
            let m = T(e);
            g.push(m);
          }
          if (!g.length) return { id: f, destination: d, skipped: !0 };
          let k = [],
            x = g.filter((m) => {
              let p = $(d.config.consent, o, m.consent);
              return !p || ((m.consent = p), k.push(m), !1);
            });
          if ((d.queue.concat(x), !k.length))
            return { id: f, destination: d, queue: g };
          if (!(await v(gt)(t, d))) return { id: f, destination: d, queue: g };
          let w = !1;
          return (
            d.dlq || (d.dlq = []),
            await Promise.all(
              k.map(
                async (m) => (
                  (m.globals = y(r, m.globals)),
                  (m.user = y(a, m.user)),
                  await v(
                    yt,
                    (p) => (
                      t.config.onError && t.config.onError(p, t),
                      (w = !0),
                      d.dlq.push([m, p]),
                      !1
                    ),
                  )(t, d, m),
                  m
                ),
              ),
            ),
            { id: f, destination: d, error: w }
          );
        }),
      ),
      c = [],
      u = [],
      l = [];
    for (let f of i) {
      if (f.skipped) continue;
      let d = f.destination,
        g = { id: f.id, destination: d };
      f.error
        ? l.push(g)
        : f.queue && f.queue.length
          ? ((d.queue = (d.queue || []).concat(f.queue)), u.push(g))
          : c.push(g);
    }
    return A({ ok: !l.length, event: e, successful: c, queued: u, failed: l });
  }
  async function gt(t, e) {
    if (e.init && !e.config.init) {
      let n = { collector: t, config: e.config, env: M(e.env, e.config.env) },
        s = await S(e.init, 'DestinationInit', t.hooks)(n);
      if (s === !1) return s;
      e.config = { ...(s || e.config), init: !0 };
    }
    return !0;
  }
  async function yt(t, e, n) {
    let { config: s } = e,
      o = await B(n, s, t);
    if (o.ignore) return !1;
    let r = {
        collector: t,
        config: s,
        data: o.data,
        mapping: o.mapping,
        env: M(e.env, s.env),
      },
      a = o.mapping;
    if (a?.batch && e.pushBatch) {
      let i = a.batched || { key: o.mappingKey || '', events: [], data: [] };
      (i.events.push(o.event),
        O(o.data) && i.data.push(o.data),
        (a.batchFn =
          a.batchFn ||
          X((c, u) => {
            let l = {
              collector: u,
              config: s,
              data: o.data,
              mapping: a,
              env: M(c.env, s.env),
            };
            (S(c.pushBatch, 'DestinationPushBatch', u.hooks)(i, l),
              (i.events = []),
              (i.data = []));
          }, a.batch)),
        (a.batched = i),
        a.batchFn?.(e, t));
    } else await S(e.push, 'DestinationPush', t.hooks)(o.event, r);
    return !0;
  }
  function A(t) {
    return y(
      { ok: !t?.failed?.length, successful: [], queued: [], failed: [] },
      t,
    );
  }
  async function ht(t, e = {}) {
    let n = {};
    for (let [s, o] of Object.entries(e)) {
      let { code: r, config: a = {}, env: i = {} } = o,
        c = { ...r.config, ...a },
        u = M(r.env, i);
      n[s] = { ...r, config: c, env: u };
    }
    return n;
  }
  function M(t, e) {
    return t || e ? (e ? (t && b(t) && b(e) ? { ...t, ...e } : e) : t) : {};
  }
  function bt(t, e, n) {
    let s = t.on,
      o = s[e] || [],
      r = j(n) ? n : [n];
    (r.forEach((a) => {
      o.push(a);
    }),
      (s[e] = o),
      I(t, e, r));
  }
  function I(t, e, n, s) {
    let o,
      r = n || [];
    switch ((n || (r = t.on[e] || []), e)) {
      case h.Commands.Consent:
        o = s || t.consent;
        break;
      case h.Commands.Session:
        o = t.session;
        break;
      case h.Commands.Ready:
      case h.Commands.Run:
      default:
        o = void 0;
    }
    if (
      (Object.values(t.sources).forEach((a) => {
        a.on && D(a.on)(e, o);
      }),
      Object.values(t.destinations).forEach((a) => {
        if (a.on) {
          let i = a.on;
          D(i)(e, o);
        }
      }),
      r.length)
    )
      switch (e) {
        case h.Commands.Consent:
          (function (a, i, c) {
            let u = c || a.consent;
            i.forEach((l) => {
              Object.keys(u)
                .filter((f) => f in l)
                .forEach((f) => {
                  D(l[f])(a, u);
                });
            });
          })(t, r, s);
          break;
        case h.Commands.Ready:
        case h.Commands.Run:
          (function (a, i) {
            a.allowed &&
              i.forEach((c) => {
                D(c)(a);
              });
          })(t, r);
          break;
        case h.Commands.Session:
          (function (a, i) {
            a.session &&
              i.forEach((c) => {
                D(c)(a, a.session);
              });
          })(t, r);
      }
  }
  async function vt(t, e) {
    let { consent: n } = t,
      s = !1,
      o = {};
    return (
      Object.entries(e).forEach(([r, a]) => {
        let i = !!a;
        ((o[r] = i), (s = s || i));
      }),
      (t.consent = y(n, o)),
      I(t, 'consent', void 0, o),
      s ? V(t) : A({ ok: !0 })
    );
  }
  async function wt(t, e, n, s) {
    let o;
    switch (e) {
      case h.Commands.Config:
        b(n) && y(t.config, n, { shallow: !1 });
        break;
      case h.Commands.Consent:
        b(n) && (o = await vt(t, n));
        break;
      case h.Commands.Custom:
        b(n) && (t.custom = y(t.custom, n));
        break;
      case h.Commands.Destination:
        b(n) && G(n.push) && (o = await pt(t, { code: n }, s));
        break;
      case h.Commands.Globals:
        b(n) && (t.globals = y(t.globals, n));
        break;
      case h.Commands.On:
        H(n) && bt(t, n, s);
        break;
      case h.Commands.Ready:
        I(t, 'ready');
        break;
      case h.Commands.Run:
        o = await xt(t, n);
        break;
      case h.Commands.Session:
        I(t, 'session');
        break;
      case h.Commands.User:
        b(n) && y(t.user, n, { shallow: !1 });
    }
    return o || { ok: !0, successful: [], queued: [], failed: [] };
  }
  function kt(t, e) {
    if (!e.name) throw new Error('Event name is required');
    let [n, s] = e.name.split(' ');
    if (!n || !s) throw new Error('Event name is invalid');
    ++t.count;
    let {
        timestamp: o = Date.now(),
        group: r = t.group,
        count: a = t.count,
      } = e,
      {
        name: i = `${n} ${s}`,
        data: c = {},
        context: u = {},
        globals: l = t.globals,
        custom: f = {},
        user: d = t.user,
        nested: g = [],
        consent: k = t.consent,
        id: x = `${o}-${r}-${a}`,
        trigger: w = '',
        entity: m = n,
        action: p = s,
        timing: P = 0,
        version: C = { source: t.version, tagging: t.config.tagging || 0 },
        source: q = { type: 'collector', id: '', previous_id: '' },
      } = e;
    return {
      name: i,
      data: c,
      context: u,
      globals: l,
      custom: f,
      user: d,
      nested: g,
      consent: k,
      id: x,
      trigger: w,
      entity: m,
      action: p,
      timestamp: o,
      timing: P,
      group: r,
      count: a,
      version: C,
      source: q,
    };
  }
  async function xt(t, e) {
    ((t.allowed = !0),
      (t.count = 0),
      (t.group = L()),
      (t.timing = Date.now()),
      e &&
        (e.consent && (t.consent = y(t.consent, e.consent)),
        e.user && (t.user = y(t.user, e.user)),
        e.globals && (t.globals = y(t.config.globalsStatic || {}, e.globals)),
        e.custom && (t.custom = y(t.custom, e.custom))),
      Object.values(t.destinations).forEach((s) => {
        s.queue = [];
      }),
      (t.queue = []),
      t.round++);
    let n = await V(t);
    return (I(t, 'run'), n);
  }
  function Ot(t, e) {
    return S(
      async (n, s = {}) =>
        await v(
          async () => {
            let o = n;
            if (s.mapping) {
              let i = await B(o, s.mapping, t);
              if (i.ignore) return A({ ok: !0 });
              if (
                s.mapping.consent &&
                !$(s.mapping.consent, t.consent, i.event.consent)
              )
                return A({ ok: !0 });
              o = i.event;
            }
            let r = e(o),
              a = kt(t, r);
            return await V(t, a);
          },
          () => A({ ok: !1 }),
        )(),
      'Push',
      t.hooks,
    );
  }
  async function jt(t) {
    let e = y(
      {
        globalsStatic: {},
        sessionStatic: {},
        tagging: 0,
        verbose: !1,
        onLog: n,
        run: !0,
      },
      t,
      { merge: !1, extend: !1 },
    );
    function n(r, a) {
      Y({ message: r }, a || e.verbose);
    }
    e.onLog = n;
    let s = { ...e.globalsStatic, ...t.globals },
      o = {
        allowed: !1,
        config: e,
        consent: t.consent || {},
        count: 0,
        custom: t.custom || {},
        destinations: {},
        globals: s,
        group: '',
        hooks: {},
        on: {},
        queue: [],
        round: 0,
        session: void 0,
        timing: Date.now(),
        user: t.user || {},
        version: '0.3.1',
        sources: {},
        push: void 0,
        command: void 0,
      };
    return (
      (o.push = Ot(o, (r) => ({
        timing: Math.round((Date.now() - o.timing) / 10) / 100,
        source: { type: 'collector', id: '', previous_id: '' },
        ...r,
      }))),
      (o.command = (function (r, a) {
        return S(
          async (i, c, u) =>
            await v(
              async () => await a(r, i, c, u),
              () => A({ ok: !1 }),
            )(),
          'Command',
          r.hooks,
        );
      })(o, wt)),
      (o.destinations = await ht(0, t.destinations || {})),
      o
    );
  }
  async function Ct(t, e = {}) {
    let n = {};
    for (let [s, o] of Object.entries(e)) {
      let { code: r, config: a = {}, env: i = {}, primary: c } = o,
        u = {
          push: (f, d = {}) => t.push(f, { ...d, mapping: a }),
          command: t.command,
          sources: t.sources,
          elb: t.sources.elb.push,
          ...i,
        },
        l = await v(r)(a, u);
      l && (c && (l.config = { ...l.config, primary: c }), (n[s] = l));
    }
    return n;
  }
  async function Z(t) {
    t = t || {};
    let e = await jt(t),
      n =
        ((s = e),
        {
          type: 'elb',
          config: {},
          push: async (d, g, k, x, w, m) => {
            if (typeof d == 'string' && d.startsWith('walker ')) {
              let P = d.replace('walker ', '');
              return s.command(P, g, k);
            }
            let p;
            if (typeof d == 'string')
              ((p = { name: d }),
                g && typeof g == 'object' && !Array.isArray(g) && (p.data = g));
            else {
              if (!d || typeof d != 'object')
                return { ok: !1, successful: [], queued: [], failed: [] };
              ((p = d),
                g &&
                  typeof g == 'object' &&
                  !Array.isArray(g) &&
                  (p.data = { ...(p.data || {}), ...g }));
            }
            return (
              x && typeof x == 'object' && (p.context = x),
              w && Array.isArray(w) && (p.nested = w),
              m && typeof m == 'object' && (p.custom = m),
              s.push(p)
            );
          },
        });
    var s;
    e.sources.elb = n;
    let o = await Ct(e, t.sources || {});
    Object.assign(e.sources, o);
    let { consent: r, user: a, globals: i, custom: c } = t;
    (r && (await e.command('consent', r)),
      a && (await e.command('user', a)),
      i && Object.assign(e.globals, i),
      c && Object.assign(e.custom, c),
      e.config.run && (await e.command('run')));
    let u = n.push,
      l = Object.values(e.sources).filter((d) => d.type !== 'elb'),
      f = l.find((d) => d.config.primary);
    return (
      f ? (u = f.push) : l.length > 0 && (u = l[0].push),
      { collector: e, elb: u }
    );
  }
  var St = Object.defineProperty,
    tt = (t, e) => {
      for (var n in e) St(t, n, { get: e[n], enumerable: !0 });
    };
  var Et = {};
  tt(Et, { env: () => et });
  var et = {};
  tt(et, { init: () => At, push: () => Pt, simulation: () => Dt });
  var F = async () => ({ ok: !0, successful: [], queued: [], failed: [] }),
    At = void 0,
    Pt = { push: F, command: F, elb: F },
    Dt = ['call:elb'],
    nt = async (t, e) => {
      let { elb: n } = e,
        s = { ...t, settings: t?.settings || { events: [] } };
      return (
        (s.settings?.events || []).forEach((o) => {
          let { delay: r, ...a } = o;
          setTimeout(() => n(a), r || 0);
        }),
        { type: 'demo', config: s, push: n }
      );
    };
  var qt = Object.defineProperty,
    ot = (t, e) => {
      for (var n in e) qt(t, n, { get: e[n], enumerable: !0 });
    };
  var Tt = {};
  ot(Tt, { env: () => st });
  var st = {};
  ot(st, { init: () => $t, push: () => Mt, simulation: () => It });
  var $t = { log: void 0 },
    Mt = { log: Object.assign(() => {}, {}) },
    It = ['call:log'],
    at = {
      type: 'demo',
      config: { settings: { name: 'demo' } },
      init({ config: t, env: e }) {
        (e?.log || console.log)(
          `[${{ name: 'demo', ...t?.settings }.name}] initialized`,
        );
      },
      push(t, { config: e, env: n }) {
        let s = n?.log || console.log,
          o = { name: 'demo', ...e?.settings },
          r = o.values
            ? (function (a, i) {
                let c = {};
                for (let u of i) {
                  let l = u.split('.').reduce((f, d) => f?.[d], a);
                  l !== void 0 && (c[u] = l);
                }
                return c;
              })(t, o.values)
            : t;
        s(`[${o.name}] ${JSON.stringify(r, null, 2)}`);
      },
    };
  var Rt = { merge: !0, shallow: !0, extend: !0 };
  function rt(t, e, n) {
    return function (...s) {
      try {
        return t(...s);
      } catch (o) {
        return e ? e(o) : void 0;
      } finally {
        n?.();
      }
    };
  }
  function K(t) {
    return t === void 0 ||
      (function (e, n) {
        return typeof e == typeof n;
      })(t, '')
      ? t
      : JSON.stringify(t);
  }
  function it(t = {}) {
    return (function (e, n = {}, s = {}) {
      s = { ...Rt, ...s };
      let o = Object.entries(n).reduce((r, [a, i]) => {
        let c = e[a];
        return (
          s.merge && Array.isArray(c) && Array.isArray(i)
            ? (r[a] = i.reduce(
                (u, l) => (u.includes(l) ? u : [...u, l]),
                [...c],
              ))
            : (s.extend || a in e) && (r[a] = i),
          r
        );
      }, {});
      return s.shallow ? { ...e, ...o } : (Object.assign(e, o), e);
    })({ 'Content-Type': 'application/json; charset=utf-8' }, t);
  }
  function Nt(t, e, n = { transport: 'fetch' }) {
    switch (n.transport || 'fetch') {
      case 'beacon':
        return (function (s, o) {
          let r = K(o),
            a = navigator.sendBeacon(s, r);
          return { ok: a, error: a ? void 0 : 'Failed to send beacon' };
        })(t, e);
      case 'xhr':
        return (function (s, o, r = {}) {
          let a = it(r.headers),
            i = r.method || 'POST',
            c = K(o);
          return rt(
            () => {
              let u = new XMLHttpRequest();
              u.open(i, s, !1);
              for (let f in a) u.setRequestHeader(f, a[f]);
              u.send(c);
              let l = u.status >= 200 && u.status < 300;
              return {
                ok: l,
                data: rt(JSON.parse, () => u.response)(u.response),
                error: l ? void 0 : `${u.status} ${u.statusText}`,
              };
            },
            (u) => ({ ok: !1, error: u.message }),
          )();
        })(t, e, n);
      default:
        return (async function (s, o, r = {}) {
          let a = it(r.headers),
            i = K(o);
          return (function (c, u, l) {
            return async function (...f) {
              try {
                return await c(...f);
              } catch (d) {
                return u ? await u(d) : void 0;
              } finally {
                await l?.();
              }
            };
          })(
            async () => {
              let c = await fetch(s, {
                  method: r.method || 'POST',
                  headers: a,
                  keepalive: !0,
                  credentials: r.credentials || 'same-origin',
                  mode: r.noCors ? 'no-cors' : 'cors',
                  body: i,
                }),
                u = r.noCors ? '' : await c.text();
              return { ok: c.ok, data: u, error: c.ok ? void 0 : c.statusText };
            },
            (c) => ({ ok: !1, error: c.message }),
          )();
        })(t, e, n);
    }
  }
  var ct = {
    type: 'api',
    config: {},
    push(t, { config: e, mapping: n, data: s, env: o }) {
      let { settings: r } = e,
        {
          url: a,
          headers: i,
          method: c,
          transform: u,
          transport: l = 'fetch',
        } = r || {};
      if (!a) return;
      let f = s !== void 0 ? s : t,
        d = u ? u(f, e, n) : JSON.stringify(f);
      (o?.sendWeb || Nt)(a, d, { headers: i, method: c, transport: l });
    },
  };
  (async () => {
    let t = typeof globalThis.window < 'u' ? globalThis.window : void 0,
      e = typeof globalThis.document < 'u' ? globalThis.document : void 0,
      n = {
        sources: {
          demo: {
            code: nt,
            config: {
              settings: {
                events: [
                  {
                    name: 'page view',
                    data: { title: 'Home', path: '/' },
                    delay: 0,
                  },
                  {
                    name: 'product view',
                    data: { id: 'P123', name: 'Test Product', price: 99.99 },
                    delay: 100,
                  },
                ],
              },
            },
          },
        },
        destinations: {
          demo: { code: at, config: { settings: { name: 'demo' } } },
          api: {
            code: ct,
            config: { settings: { url: 'http://localhost:8080/collect' } },
          },
        },
        run: !0,
        globals: { language: 'en' },
      },
      { collector: s, elb: o } = await Z(n);
    typeof t < 'u' && ((t.collector = s), (t.elb = o));
  })();
})();
