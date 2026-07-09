// packages/core/dist/index.mjs
var e = Object.defineProperty;
var t = (t6, n4) => {
  for (var r4 in n4) e(t6, r4, { get: n4[r4], enumerable: true });
};
var r = {};
function o(e5, t6) {
  if ('collector' === e5) return 'collector';
  if (!t6) throw new Error(`stepId(${e5}) requires an id`);
  return `${e5}.${t6}`;
}
t(r, { stepId: () => o });
var i = {};
function a(e5, t6) {
  const n4 = e5.destinations[t6];
  if (!n4) throw new Error(`Destination not found: ${t6}`);
  return n4;
}
t(i, { getDestination: () => a });
var u = {};
t(u, { Level: () => l });
var l = ((e5) => (
  (e5[(e5.ERROR = 0)] = 'ERROR'),
  (e5[(e5.WARN = 1)] = 'WARN'),
  (e5[(e5.INFO = 2)] = 'INFO'),
  (e5[(e5.DEBUG = 3)] = 'DEBUG'),
  e5
))(l || {});
var m = {};
function g(e5, t6) {
  const n4 = e5.transformers[t6];
  if (!n4) throw new Error(`Transformer not found: ${t6}`);
  return n4;
}
t(m, { getTransformer: () => g });
var h = {};
function y(e5, t6) {
  const n4 = e5.sources[t6];
  if (!n4) throw new Error(`Source not found: ${t6}`);
  return n4;
}
t(h, { getSource: () => y });
var b = {};
function w(e5, t6) {
  const n4 = e5.stores[t6];
  if (!n4) throw new Error(`Store not found: ${t6}`);
  return n4;
}
async function k(e5, t6) {
  return await e5.get(t6);
}
t(b, { getStore: () => w, getStoreValue: () => k });
var E = {
  Utils: { Storage: { Local: 'local', Session: 'session', Cookie: 'cookie' } },
};
function O(e5) {
  return { _meta: { hops: 0, path: [e5] } };
}
var re = { merge: true, shallow: true, extend: true };
function oe(e5, t6 = {}, n4 = {}) {
  n4 = { ...re, ...n4 };
  const r4 = Object.entries(t6).reduce((t7, [r5, o3]) => {
    const s2 = e5[r5];
    return (
      n4.merge && Array.isArray(s2) && Array.isArray(o3)
        ? (t7[r5] = o3.reduce(
            (e6, t8) => (e6.includes(t8) ? e6 : [...e6, t8]),
            [...s2],
          ))
        : (n4.extend || r5 in e5) && (t7[r5] = o3),
      t7
    );
  }, {});
  return n4.shallow ? { ...e5, ...r4 } : (Object.assign(e5, r4), e5);
}
function ie(e5) {
  return Array.isArray(e5);
}
function ae(e5) {
  return 'boolean' == typeof e5;
}
function fe(e5) {
  return void 0 !== e5;
}
function ue(e5) {
  return !(!e5 || 'object' != typeof e5) && ('body' in e5 || 'tagName' in e5);
}
function le(e5) {
  return 'function' == typeof e5;
}
function pe(e5) {
  return 'number' == typeof e5 && !Number.isNaN(e5);
}
function de(e5) {
  return (
    'object' == typeof e5 &&
    null !== e5 &&
    !ie(e5) &&
    '[object Object]' === Object.prototype.toString.call(e5)
  );
}
function ge(e5) {
  return 'string' == typeof e5;
}
function ve(e5, t6 = /* @__PURE__ */ new WeakMap()) {
  if ('object' != typeof e5 || null === e5) return e5;
  if (t6.has(e5)) return t6.get(e5);
  const n4 = Object.prototype.toString.call(e5);
  if ('[object Object]' === n4) {
    const n5 = {};
    t6.set(e5, n5);
    for (const r4 in e5)
      Object.prototype.hasOwnProperty.call(e5, r4) && (n5[r4] = ve(e5[r4], t6));
    return n5;
  }
  if ('[object Array]' === n4) {
    const n5 = [];
    return (
      t6.set(e5, n5),
      e5.forEach((e6) => {
        n5.push(ve(e6, t6));
      }),
      n5
    );
  }
  if ('[object Date]' === n4) return new Date(e5.getTime());
  if ('[object RegExp]' === n4) {
    const t7 = e5;
    return new RegExp(t7.source, t7.flags);
  }
  return e5;
}
function he(e5, t6 = '', n4) {
  const r4 = t6.split('.');
  let o3 = e5;
  for (let e6 = 0; e6 < r4.length; e6++) {
    const t7 = r4[e6];
    if ('*' === t7 && ie(o3)) {
      const t8 = r4.slice(e6 + 1).join('.'),
        s2 = [];
      for (const e7 of o3) {
        const r5 = he(e7, t8, n4);
        s2.push(r5);
      }
      return s2;
    }
    if (((o3 = de(o3) || ie(o3) ? o3[t7] : void 0), void 0 === o3)) break;
  }
  return fe(o3) ? o3 : n4;
}
function ye(e5, t6, n4) {
  if (!de(e5)) return e5;
  const r4 = ve(e5),
    o3 = t6.split('.');
  let s2 = r4;
  for (let e6 = 0; e6 < o3.length; e6++) {
    const t7 = o3[e6];
    e6 === o3.length - 1
      ? (s2[t7] = n4)
      : ((t7 in s2 && 'object' == typeof s2[t7] && null !== s2[t7]) ||
          (s2[t7] = {}),
        (s2 = s2[t7]));
  }
  return r4;
}
function be(e5, t6) {
  if (!de(e5) && !ie(e5)) return e5;
  const n4 = ve(e5),
    r4 = t6.split('.');
  let o3 = n4;
  for (let e6 = 0; e6 < r4.length; e6++) {
    const t7 = r4[e6],
      s2 = e6 === r4.length - 1;
    if (ie(o3)) {
      const e7 = Number(t7);
      if (!Number.isInteger(e7) || e7 < 0 || e7 >= o3.length) return n4;
      if (s2) o3.splice(e7, 1);
      else {
        const t8 = o3[e7];
        if (!de(t8) && !ie(t8)) return n4;
        o3 = t8;
      }
    } else if (s2) delete o3[t7];
    else {
      const e7 = o3[t7];
      if (!de(e7) && !ie(e7)) return n4;
      o3 = e7;
    }
  }
  return n4;
}
var we = {
  data: (e5) => e5.data,
  globals: (e5) => e5.globals,
  context: (e5) => e5.context,
  user: (e5) => e5.user,
  source: (e5) => e5.source,
  event: (e5) => ({
    entity: e5.entity,
    action: e5.action,
    id: e5.id,
    timestamp: e5.timestamp,
    name: e5.name,
    trigger: e5.trigger,
    timing: e5.timing,
  }),
};
function ke(e5, t6, n4) {
  if (de(n4))
    for (const [r4, o3] of Object.entries(n4))
      void 0 !== o3 && ke(e5, `${t6}_${r4}`, o3);
  else e5[t6] = n4;
}
function $e(e5, t6) {
  const n4 = {},
    r4 = t6.includes('all') ? Object.keys(we) : t6;
  for (const t7 of r4) {
    const r5 = we[t7];
    if (!r5) continue;
    const o3 = r5(e5);
    if (de(o3))
      for (const [e6, r6] of Object.entries(o3)) {
        if (void 0 === r6) continue;
        ke(
          n4,
          `${t7}_${e6}`,
          'context' === t7 && Array.isArray(r6) ? r6[0] : r6,
        );
      }
  }
  return n4;
}
function je(e5) {
  if ('true' === e5) return true;
  if ('false' === e5) return false;
  const t6 = Number(e5);
  return e5 == t6 && '' !== e5 ? t6 : String(e5);
}
function Ae(e5, t6 = {}, n4 = {}) {
  const r4 = { ...t6, ...n4 },
    o3 = {};
  let s2 = !e5 || 0 === Object.keys(e5).length;
  return (
    Object.keys(r4).forEach((t7) => {
      r4[t7] && ((o3[t7] = true), e5 && e5[t7] && (s2 = true));
    }),
    !!s2 && o3
  );
}
function Se(e5 = 6, t6 = '0123456789abcdefghijklmnopqrstuvwxyz') {
  const n4 = t6.length;
  if (e5 <= 0 || 0 === n4) return '';
  let r4 = '';
  if (n4 <= 256) {
    const o3 = 256 - (256 % n4);
    for (; r4.length < e5; ) {
      const s2 = e5 - r4.length,
        i4 = new Uint8Array(Math.ceil(1.3 * s2) + 4);
      if (!Ee(i4)) break;
      for (let s3 = 0; s3 < i4.length && r4.length < e5; s3++)
        i4[s3] < o3 && (r4 += t6[i4[s3] % n4]);
    }
  }
  for (; r4.length < e5; ) r4 += t6[(Math.random() * n4) | 0];
  return r4;
}
function Ee(e5) {
  try {
    const t6 = globalThis.crypto;
    if (t6 && 'function' == typeof t6.getRandomValues)
      return (t6.getRandomValues(e5), true);
  } catch {}
  return false;
}
var Oe = '0123456789abcdef';
function _e(e5) {
  let t6 = Se(e5, Oe);
  for (; /^0+$/.test(t6); ) t6 = Se(e5, Oe);
  return t6;
}
function Me() {
  return _e(16);
}
function Ce() {
  return _e(32);
}
var Pe =
  /^(?<version>[0-9a-f]{2})-(?<trace>[0-9a-f]{32})-(?<span>[0-9a-f]{16})-[0-9a-f]{2}$/;
function ze(e5) {
  if ('string' != typeof e5) return;
  const t6 = Pe.exec(e5)?.groups;
  if (!t6) return;
  const { version: n4, trace: r4, span: o3 } = t6;
  return void 0 === n4 ||
    void 0 === r4 ||
    void 0 === o3 ||
    'ff' === n4 ||
    /^0+$/.test(r4) ||
    /^0+$/.test(o3)
    ? void 0
    : { trace: r4, parentSpan: o3 };
}
var Re = [
  { param: 'gclid', platform: 'google' },
  { param: 'wbraid', platform: 'google' },
  { param: 'gbraid', platform: 'google' },
  { param: 'dclid', platform: 'google' },
  { param: 'gclsrc', platform: 'google' },
  { param: 'fbclid', platform: 'meta' },
  { param: 'igshid', platform: 'meta' },
  { param: 'msclkid', platform: 'microsoft' },
  { param: 'ttclid', platform: 'tiktok' },
  { param: 'twclid', platform: 'twitter' },
  { param: 'li_fat_id', platform: 'linkedin' },
  { param: 'epik', platform: 'pinterest' },
  { param: 'sclid', platform: 'snapchat' },
  { param: 'sccid', platform: 'snapchat' },
  { param: 'rdt_cid', platform: 'reddit' },
  { param: 'qclid', platform: 'quora' },
  { param: 'yclid', platform: 'yandex' },
  { param: 'ymclid', platform: 'yandex' },
  { param: 'ysclid', platform: 'yandex' },
  { param: 'dicbo', platform: 'outbrain' },
  { param: 'obclid', platform: 'outbrain' },
  { param: 'tblci', platform: 'taboola' },
  { param: 'mc_cid', platform: 'mailchimp' },
  { param: 'mc_eid', platform: 'mailchimp' },
  { param: '_kx', platform: 'klaviyo' },
  { param: '_hsenc', platform: 'hubspot' },
  { param: '_hsmi', platform: 'hubspot' },
  { param: 's_kwcid', platform: 'adobe' },
  { param: 'ef_id', platform: 'adobe' },
  { param: 'mkt_tok', platform: 'adobe' },
  { param: 'irclickid', platform: 'impact' },
  { param: 'cjevent', platform: 'cj' },
  { param: '_branch_match_id', platform: 'branch' },
];
function Fe(e5, t6 = {}, n4 = []) {
  const r4 = {};
  Object.entries(
    oe(
      {
        utm_campaign: 'campaign',
        utm_content: 'content',
        utm_medium: 'medium',
        utm_source: 'source',
        utm_term: 'term',
      },
      t6,
    ),
  ).forEach(([t7, n5]) => {
    const o4 = e5.searchParams.get(t7);
    o4 && (r4[n5] = o4);
  });
  const o3 = n4.length
      ? (function (e6) {
          const t7 = new Map(e6.map((e7) => [e7.param, e7.platform])),
            n5 = new Set(Re.map((e7) => e7.param));
          return [
            ...Re.map((e7) =>
              t7.has(e7.param)
                ? { param: e7.param, platform: t7.get(e7.param) }
                : e7,
            ),
            ...e6.filter((e7) => !n5.has(e7.param)),
          ];
        })(n4)
      : Re,
    s2 = /* @__PURE__ */ new Map();
  e5.searchParams.forEach((e6, t7) => {
    e6 && s2.set(t7.toLowerCase(), e6);
  });
  for (const e6 of o3) {
    const t7 = s2.get(e6.param);
    t7 &&
      ((r4[e6.param] = t7),
      r4.clickId || ((r4.clickId = e6.param), (r4.platform = e6.platform)));
  }
  return r4;
}
function Ue(e5, t6) {
  return 'number' == typeof e5
    ? { wait: e5 }
    : e5
      ? { wait: e5.wait ?? t6, size: e5.size, age: e5.age }
      : { wait: t6 };
}
function De(e5, t6 = 1e3, n4 = false) {
  const { wait: r4, size: o3, age: s2 } = Ue(t6, 1e3);
  let i4,
    a4,
    c4 = null,
    f2 = null,
    u4 = false,
    l4 = [],
    p4 = 0;
  const d3 = () => {
      (c4 && (clearTimeout(c4), (c4 = null)),
        f2 && (clearTimeout(f2), (f2 = null)),
        (p4 = 0),
        (a4 = void 0));
    },
    m5 = () => {
      const t7 = a4,
        n5 = l4;
      if ((d3(), (l4 = []), t7))
        return ((i4 = e5(...t7)), n5.forEach((e6) => e6(i4)), i4);
      n5.forEach((e6) => e6(void 0));
    },
    g4 = (...t7) =>
      new Promise((d4) => {
        const g5 = n4 && !u4;
        if (
          ((a4 = t7),
          (p4 += 1),
          l4.push(d4),
          c4 && clearTimeout(c4),
          (c4 = setTimeout(() => {
            ((c4 = null), (n4 && !u4) || m5());
          }, r4)),
          void 0 === s2 ||
            f2 ||
            (f2 = setTimeout(() => {
              ((f2 = null), m5());
            }, s2)),
          void 0 !== o3 && p4 >= o3)
        )
          m5();
        else if (g5) {
          ((u4 = true), (i4 = e5(...t7)));
          const n5 = l4;
          ((l4 = []), n5.forEach((e6) => e6(i4)));
        }
      });
  return (
    (g4.flush = () =>
      a4 || 0 !== l4.length
        ? new Promise((e6) => {
            (l4.push(e6), m5());
          })
        : Promise.resolve(i4)),
    (g4.cancel = () => {
      const e6 = l4;
      ((l4 = []), d3(), (i4 = void 0), e6.forEach((e7) => e7(void 0)));
    }),
    (g4.size = () => p4),
    g4
  );
}
function qe(e5, t6 = 1e3) {
  const { wait: n4 } = Ue(t6, 1e3);
  let r4 = null;
  return function (...t7) {
    if (null === r4)
      return (
        (r4 = setTimeout(() => {
          r4 = null;
        }, n4)),
        e5(...t7)
      );
  };
}
function Ze(e5) {
  return {
    message: e5.message,
    name: e5.name,
    stack: e5.stack,
    cause: e5.cause,
  };
}
function Be(e5, t6) {
  let n4,
    r4 = {};
  return (
    e5 instanceof Error ? ((n4 = e5.message), (r4.error = Ze(e5))) : (n4 = e5),
    void 0 !== t6 &&
      (t6 instanceof Error
        ? (r4.error = Ze(t6))
        : 'object' == typeof t6 && null !== t6
          ? ((r4 = { ...r4, ...t6 }),
            'error' in r4 &&
              r4.error instanceof Error &&
              (r4.error = Ze(r4.error)))
          : (r4.value = t6)),
    { message: n4, context: r4 }
  );
}
var Ke = (e5, t6, n4, r4) => {
  const o3 = `${l[e5]}${r4.length > 0 ? ` [${r4.join(':')}]` : ''}`,
    s2 = Object.keys(n4).length > 0,
    i4 = 0 === e5 ? console.error : 1 === e5 ? console.warn : console.log;
  s2 ? i4(o3, t6, n4) : i4(o3, t6);
};
function We(e5 = {}) {
  return Ve({
    level:
      void 0 !== e5.level
        ? (function (e6) {
            return 'string' == typeof e6 ? l[e6] : e6;
          })(e5.level)
        : 0,
    handler: e5.handler,
    jsonHandler: e5.jsonHandler,
    scope: [],
  });
}
function Ve(e5) {
  const { level: t6, handler: n4, jsonHandler: r4, scope: o3 } = e5,
    s2 = (e6, r5, s3) => {
      if (e6 <= t6) {
        const t7 = Be(r5, s3);
        n4
          ? n4(e6, t7.message, t7.context, o3, Ke)
          : Ke(e6, t7.message, t7.context, o3);
      }
    };
  return {
    error: (e6, t7) => s2(0, e6, t7),
    warn: (e6, t7) => s2(1, e6, t7),
    info: (e6, t7) => s2(2, e6, t7),
    debug: (e6, t7) => s2(3, e6, t7),
    throw: (e6, t7) => {
      const r5 = Be(e6, t7);
      throw (
        n4
          ? n4(0, r5.message, r5.context, o3, Ke)
          : Ke(0, r5.message, r5.context, o3),
        new Error(r5.message)
      );
    },
    json: (e6) => {
      r4 ? r4(e6) : console.log(JSON.stringify(e6, null, 2));
    },
    scope: (e6) =>
      Ve({ level: t6, handler: n4, jsonHandler: r4, scope: [...o3, e6] }),
  };
}
function Le(e5) {
  return (
    ae(e5) ||
    ge(e5) ||
    pe(e5) ||
    !fe(e5) ||
    (ie(e5) && e5.every(Le)) ||
    (de(e5) && Object.values(e5).every(Le))
  );
}
function Je(e5) {
  return Le(e5) ? e5 : void 0;
}
function Ge(e5, t6, n4) {
  return function (...r4) {
    try {
      return e5(...r4);
    } catch (e6) {
      if (!t6) return;
      return t6(e6);
    } finally {
      n4?.();
    }
  };
}
function Xe(e5, t6, n4) {
  return async function (...r4) {
    try {
      return await e5(...r4);
    } catch (e6) {
      if (!t6) return;
      return await t6(e6);
    } finally {
      await n4?.();
    }
  };
}
var Ye = class e2 extends Error {
  constructor(t6, n4) {
    (super(t6, n4),
      (this.name = 'FatalError'),
      Object.setPrototypeOf(this, e2.prototype));
  }
};
async function Qe(e5, t6, n4) {
  const [r4, o3] = (e5.name || '').split(' ');
  if (!t6 || !r4 || !o3) return {};
  let s2,
    i4 = '',
    a4 = r4,
    c4 = o3;
  const f2 = (t7) => {
    if (!t7) return;
    return (ie(t7) ? t7 : [t7]).find((t8) => {
      if (!t8.condition) return true;
      if (!n4) return Boolean(t8.condition(e5, void 0));
      const r5 = {
        event: e5,
        mapping: t8,
        collector: n4,
        logger: n4.logger,
        consent: (de(e5) && e5.consent) || n4.consent,
      };
      return Boolean(t8.condition(e5, r5));
    });
  };
  t6[a4] || (a4 = '*');
  const u4 = t6[a4];
  return (
    u4 && (u4[c4] || (c4 = '*'), (s2 = f2(u4[c4]))),
    s2 || ((a4 = '*'), (c4 = '*'), (s2 = f2(t6[a4]?.[c4]))),
    s2 && (i4 = `${a4} ${c4}`),
    { eventMapping: s2, mappingKey: i4 }
  );
}
async function et(e5, t6 = {}, n4 = {}) {
  if (!fe(e5)) return;
  const r4 = (de(e5) && e5.consent) || n4.consent || n4.collector?.consent,
    o3 = n4.event ?? (de(e5) ? e5 : {});
  if (!n4.collector)
    throw new Error('getMappingValue: context.collector is required');
  const s2 = {
      event: o3,
      mapping: t6,
      collector: n4.collector,
      logger: n4.collector.logger,
      consent: r4,
    },
    i4 = ie(t6) ? t6 : [t6];
  for (const t7 of i4) {
    const r5 = await Xe(tt, (e6) => {
      if (e6 instanceof Ye) throw e6;
      (n4.collector && n4.collector.status.failed++,
        s2.logger.error('mapping processing failed', { event: o3, error: e6 }));
    })(e5, t7, { ...s2, mapping: t7 });
    if (fe(r5)) return r5;
  }
}
async function tt(e5, t6, n4) {
  return (ie(t6) ? t6 : [t6]).reduce(
    async (t7, r4) => {
      const o3 = await t7;
      if (o3) return o3;
      const s2 = ge(r4) ? { key: r4 } : r4;
      if (!Object.keys(s2).length) return;
      const {
          condition: i4,
          consent: a4,
          fn: c4,
          key: f2,
          loop: u4,
          map: l4,
          set: p4,
          validate: d3,
          value: m5,
        } = s2,
        g4 = { ...n4, mapping: r4 };
      if (
        i4 &&
        !(await Xe(i4, (e6) => {
          if (e6 instanceof Ye) throw e6;
          return (
            g4.logger.error('mapping condition failed', {
              event: g4.event,
              error: e6,
            }),
            false
          );
        })(e5, g4))
      )
        return;
      if (a4 && !Ae(a4, g4.consent)) return m5;
      let v3 = fe(m5) ? m5 : e5;
      if (
        (c4 &&
          (v3 = await Xe(c4, (e6) => {
            if (e6 instanceof Ye) throw e6;
            g4.logger.error('mapping fn failed', {
              event: g4.event,
              error: e6,
            });
          })(e5, g4)),
        f2 && (v3 = he(e5, f2, m5)),
        u4)
      ) {
        const [t8, n5] = u4,
          r5 = 'this' === t8 ? [e5] : await et(e5, t8, g4);
        ie(r5) &&
          (v3 = (await Promise.all(r5.map((e6) => et(e6, n5, g4)))).filter(fe));
      } else
        l4
          ? (v3 = await Object.entries(l4).reduce(async (t8, [n5, r5]) => {
              const o4 = await t8,
                s3 = await et(e5, r5, g4);
              return (fe(s3) && (o4[n5] = s3), o4);
            }, Promise.resolve({})))
          : p4 && (v3 = await Promise.all(p4.map((t8) => tt(e5, t8, g4))));
      d3 &&
        !(await Xe(d3, (e6) => {
          if (e6 instanceof Ye) throw e6;
          return (
            g4.logger.error('mapping validate failed', {
              event: g4.event,
              error: e6,
            }),
            false
          );
        })(v3, g4)) &&
        (v3 = void 0);
      const h4 = Je(v3);
      return fe(h4) ? h4 : Je(m5);
    },
    Promise.resolve(void 0),
  );
}
async function nt(e5, t6, n4) {
  t6.policy &&
    (await Promise.all(
      Object.entries(t6.policy).map(async ([t7, r5]) => {
        const o4 = await et(e5, r5, { collector: n4, event: e5 });
        e5 = ye(e5, t7, o4);
      }),
    ));
  const { eventMapping: r4, mappingKey: o3 } = await Qe(e5, t6.mapping, n4);
  r4?.policy &&
    (await Promise.all(
      Object.entries(r4.policy).map(async ([t7, r5]) => {
        const o4 = await et(e5, r5, { collector: n4, event: e5 });
        e5 = ye(e5, t7, o4);
      }),
    ));
  let s2 = t6.data && (await et(e5, t6.data, { collector: n4, event: e5 }));
  const i4 = Boolean(r4?.silent);
  if (r4) {
    if (r4.ignore)
      return {
        event: e5,
        data: s2,
        mapping: r4,
        mappingKey: o3,
        ignore: true,
        silent: i4,
      };
    if ((r4.name && (e5.name = r4.name), r4.data)) {
      const t7 =
        r4.data && (await et(e5, r4.data, { collector: n4, event: e5 }));
      s2 = de(s2) && de(t7) ? oe(s2, t7) : t7;
    }
  }
  const a4 = r4?.include ?? t6.include;
  if (a4 && a4.length > 0) {
    const t7 = $e(e5, a4);
    Object.keys(t7).length > 0 && (s2 = de(s2) ? oe(t7, s2) : (s2 ?? t7));
  }
  if (r4?.remove && de(s2)) for (const e6 of r4.remove) s2 = be(s2, e6);
  return {
    event: e5,
    data: s2,
    mapping: r4,
    mappingKey: o3,
    ignore: false,
    silent: i4,
  };
}
function mt(e5) {
  return e5 ? e5.trim().replace(/^'|'$/g, '').trim() : '';
}
function gt(e5, t6, n4, r4) {
  const o3 = e5;
  return function (...e6) {
    let s2;
    const i4 = 'pre' + t6,
      a4 = 'post' + t6,
      c4 = n4[i4],
      f2 = n4[a4],
      u4 = (e7, t7) => {
        r4 ? r4.warn(e7, { error: t7 }) : console.warn(e7, t7);
      };
    if (c4)
      try {
        s2 = c4({ fn: o3 }, ...e6);
      } catch (t7) {
        (u4(`Hook ${String(i4)} failed, falling back to original function`, t7),
          (s2 = o3(...e6)));
      }
    else s2 = o3(...e6);
    if (f2)
      try {
        s2 = f2({ fn: o3, result: s2 }, ...e6);
      } catch (e7) {
        u4(`Hook ${String(a4)} failed, keeping original result`, e7);
      }
    return s2;
  };
}
function qt(e5, t6) {
  if (0 === e5.observers.size) return;
  const n4 = Array.from(e5.observers);
  for (const e6 of n4)
    try {
      e6(t6);
    } catch {}
}
var rn = 'observe';
function on(e5) {
  if ('object' != typeof e5 || null === e5) return false;
  if (!('paths' in e5) || !('record' in e5)) return false;
  const { paths: t6, record: n4 } = e5;
  return (
    Array.isArray(t6) &&
    t6.every((e6) => 'string' == typeof e6) &&
    'function' == typeof n4
  );
}
var sn = 'call:';
function an(e5) {
  const t6 = (e5.startsWith(sn) ? e5.slice(5) : e5).split('.');
  return t6.some((e6) => '' === e6) ? [] : t6;
}
function ln(e5) {
  if (void 0 === e5 || '*' === e5) return () => true;
  if ('and' in e5) {
    const t6 = e5.and.map(ln);
    return (e6) => t6.every((t7) => t7(e6));
  }
  if ('or' in e5) {
    const t6 = e5.or.map(ln);
    return (e6) => t6.some((t7) => t7(e6));
  }
  return (function (e6) {
    const { key: t6, operator: n4, value: r4, not: o3 } = e6,
      s2 = (function (e7, t7) {
        switch (e7) {
          case 'eq':
            return (e8) => String(e8 ?? '') === t7;
          case 'contains':
            return (e8) => String(e8 ?? '').includes(t7);
          case 'prefix':
            return (e8) => String(e8 ?? '').startsWith(t7);
          case 'suffix':
            return (e8) => String(e8 ?? '').endsWith(t7);
          case 'regex': {
            const e8 = new RegExp(t7);
            return (t8) => e8.test(String(t8 ?? ''));
          }
          case 'gt': {
            const e8 = Number(t7);
            return (t8) => Number(t8) > e8;
          }
          case 'lt': {
            const e8 = Number(t7);
            return (t8) => Number(t8) < e8;
          }
          case 'exists':
            return (e8) => null != e8;
        }
      })(n4, r4);
    return (e7) => {
      const n5 = he(e7, t6),
        r5 = s2(n5);
      return o3 ? !r5 : r5;
    };
  })(e5);
}
function pn(e5) {
  return (
    'object' == typeof e5 &&
    null !== e5 &&
    !Array.isArray(e5) &&
    ('match' in e5 || 'next' in e5 || 'one' in e5 || 'many' in e5)
  );
}
function dn(e5) {
  return Array.isArray(e5) && e5.length > 0 && e5.every((e6) => pn(e6));
}
function mn(e5) {
  return e5.map((e6) => {
    if ('string' == typeof e6)
      return { match: () => true, next: { type: 'static', value: e6 } };
    if (Array.isArray(e6))
      return {
        match: () => true,
        next: gn(e6) ?? { type: 'chain', value: [] },
      };
    const t6 = e6;
    return {
      match: t6.match ? ln(t6.match) : () => true,
      next: gn(t6) ?? { type: 'chain', value: [] },
    };
  });
}
function gn(e5) {
  if (null == e5) return;
  if ('string' == typeof e5) return { type: 'static', value: e5 };
  if (Array.isArray(e5)) {
    if (0 === e5.length) return;
    if (dn(e5)) return gn({ one: e5 });
    if (e5.every((e6) => 'string' == typeof e6))
      return { type: 'chain', value: e5 };
    const t7 = [];
    for (const n4 of e5) {
      const e6 = gn(n4);
      void 0 !== e6 && t7.push(e6);
    }
    if (0 === t7.length) return;
    return { type: 'sequence', value: t7 };
  }
  const t6 = e5;
  if ('next' in t6 && void 0 !== t6.next)
    return t6.match
      ? { type: 'gate', match: ln(t6.match), next: gn(t6.next) }
      : gn(t6.next);
  if ('one' in t6 && t6.one) {
    const e6 = mn(t6.one);
    return t6.match
      ? { type: 'gate', match: ln(t6.match), next: { type: 'one', routes: e6 } }
      : { type: 'one', routes: e6 };
  }
  if ('many' in t6 && t6.many) {
    const e6 = mn(t6.many);
    return t6.match
      ? {
          type: 'gate',
          match: ln(t6.match),
          next: { type: 'many', routes: e6 },
        }
      : { type: 'many', routes: e6 };
  }
  return t6.match ? { type: 'gate', match: ln(t6.match) } : void 0;
}
var vn = /* @__PURE__ */ new WeakMap();
function hn(e5, t6 = {}) {
  if (null == e5) return [];
  let n4;
  if ('object' == typeof e5) {
    const t7 = vn.get(e5);
    t7 ? (n4 = t7) : ((n4 = gn(e5)), n4 && vn.set(e5, n4));
  } else n4 = gn(e5);
  if (!n4) return [];
  const r4 = yn(n4, t6);
  return void 0 === r4 ? [] : Array.isArray(r4) ? r4 : [r4];
}
function yn(e5, t6 = {}) {
  if (e5) {
    if ('static' === e5.type) return e5.value;
    if ('chain' === e5.type) return e5.value;
    if ('gate' === e5.type) {
      if (!e5.match(t6)) return;
      return yn(e5.next, t6);
    }
    if ('sequence' === e5.type) {
      const n4 = [];
      for (const r4 of e5.value) {
        const e6 = yn(r4, t6);
        void 0 !== e6 && (Array.isArray(e6) ? n4.push(...e6) : n4.push(e6));
      }
      return n4.length > 0 ? n4 : void 0;
    }
    if ('many' === e5.type) {
      const n4 = [];
      for (const r4 of e5.routes) {
        if (!r4.match(t6)) continue;
        const e6 = yn(r4.next, t6);
        void 0 !== e6 && (Array.isArray(e6) ? n4.push(...e6) : n4.push(e6));
      }
      return n4.length > 0 ? n4 : void 0;
    }
    for (const n4 of e5.routes) if (n4.match(t6)) return yn(n4.next, t6);
  }
}
var bn = '__walkeros_cache_v__';
var wn = '__walkeros_cache_exp__';
function kn(e5, t6, n4 = Date.now) {
  const r4 = { [bn]: e5 };
  return (void 0 !== t6 && (r4[wn] = n4() + t6), r4);
}
function $n(e5, t6 = Date.now) {
  if (void 0 === e5) return;
  if (
    null === (n4 = e5) ||
    'object' != typeof n4 ||
    Array.isArray(n4) ||
    !(bn in e5)
  )
    return { value: e5 };
  var n4;
  const r4 = e5[wn];
  return 'number' == typeof r4 && t6() > r4
    ? { expired: true }
    : { value: e5[bn] };
}
function xn(e5) {
  return null !== e5 && 'object' == typeof e5 && !Array.isArray(e5);
}
function On(e5) {
  return (
    null === e5 ||
    'string' == typeof e5 ||
    'number' == typeof e5 ||
    'boolean' == typeof e5 ||
    e5 instanceof Uint8Array ||
    (Array.isArray(e5)
      ? e5.every((e6) => void 0 === e6 || On(e6))
      : !!xn(e5) && Object.values(e5).every((e6) => void 0 === e6 || On(e6)))
  );
}
function Nn(e5, t6) {
  const n4 = { ingest: e5 ?? {} };
  return (void 0 !== t6 && (n4.event = t6), n4);
}
function Tn(e5) {
  return {
    stop: e5.stop ?? false,
    storeId: e5.store,
    namespace: e5.namespace,
    rules: e5.rules.map((e6) => ({
      match: e6.match ? ln(e6.match) : () => true,
      key: e6.key,
      ttl: e6.ttl,
      update: e6.update,
    })),
  };
}
async function Cn(e5, t6, n4, r4) {
  const o3 = e5.rules.find((e6) => e6.match(n4));
  if (!o3) return null;
  const s2 = o3.key.map((e6) => String(he(n4, e6) ?? ''));
  if (s2.every((e6) => '' === e6)) return null;
  const i4 = s2.join(':'),
    a4 = r4 ?? e5.namespace,
    c4 = a4 ? `${a4}:${i4}` : i4,
    f2 = $n(await t6.get(c4));
  if (void 0 === f2) return { status: 'MISS', key: c4, rule: o3 };
  if ('expired' in f2) {
    try {
      await t6.delete(c4);
    } catch {}
    return { status: 'MISS', key: c4, rule: o3 };
  }
  return { status: 'HIT', key: c4, value: f2.value, rule: o3 };
}
function Pn(e5, t6, n4, r4) {
  if (!On(n4)) return;
  const o3 = 1e3 * r4,
    s2 = e5.set(t6, kn(n4, o3), o3);
  s2 instanceof Promise && s2.catch(() => {});
}
async function zn(e5, t6, n4, r4) {
  if (!t6) return e5;
  let o3 = e5;
  for (const [e6, s2] of Object.entries(t6)) {
    o3 = ye(o3, e6, await et(n4, s2, { collector: r4 }));
  }
  return o3;
}
function Rn(e5) {
  return ie(e5) ? e5 : [e5];
}
async function Fn(e5, t6, n4, r4) {
  let o3 = n4;
  for (const n5 of e5)
    await Xe(
      async () => {
        const e6 = t6(n5.store);
        if (!e6) return;
        const s2 = await et(o3, n5.key, { collector: r4, event: o3 });
        if (!ge(s2)) return;
        const i4 = n5.store ? s2 : `state:${s2}`;
        if ('set' === n5.mode) {
          const t7 = await et(o3, n5.value, { collector: r4, event: o3 });
          if (!fe(t7)) return;
          await e6.set(i4, t7);
        } else {
          const t7 = ge((a4 = n5.value))
            ? a4
            : de(a4) && ge(a4.key)
              ? a4.key
              : void 0;
          if (!t7) return;
          const r5 = await e6.get(i4);
          if (!fe(r5)) return;
          o3 = ye(o3, t7, r5);
        }
        var a4;
      },
      (e6) => {
        if (e6 instanceof Ye) throw e6;
        r4.logger?.error?.('[state] operation failed', e6);
      },
    )();
  return o3;
}
var Un = {
  Source: ['code', 'package', 'import', 'before', 'next', 'cache', 'state'],
  Transformer: [
    'code',
    'package',
    'import',
    'before',
    'next',
    'cache',
    'state',
    'mapping',
  ],
  Destination: [
    'code',
    'package',
    'import',
    'before',
    'next',
    'cache',
    'state',
  ],
  Store: ['code', 'package', 'import', 'cache'],
};
var Dn = [
  'config',
  'env',
  'variables',
  'examples',
  'disabled',
  'id',
  'logger',
  'mock',
  'chainMocks',
];
var qn = { Source: ['primary'], Transformer: [], Destination: [], Store: [] };
var Zn = /^[A-Za-z_$][A-Za-z0-9_$]*$/;
function Bn(e5, t6) {
  const n4 = (function (e6) {
    return /* @__PURE__ */ new Set([...Un[e6], ...Dn, ...qn[e6]]);
  })(t6);
  for (const r5 of Object.keys(e5))
    if (!n4.has(r5))
      return {
        ok: false,
        code: 'UNKNOWN_KEY',
        key: r5,
        reason: `Unknown key "${r5}" on ${t6}. Allowed: ${[...n4].sort().join(', ')}.`,
      };
  const r4 = void 0 !== e5.package,
    o3 = void 0 !== e5.import,
    s2 = void 0 !== e5.code;
  return s2 && 'string' == typeof e5.code
    ? {
        ok: false,
        code: 'OBSOLETE_CODE_STRING',
        key: 'code',
        reason: `code: "<name>" is no longer supported. Use import: "${e5.code}" with the package field instead.`,
      }
    : s2 &&
        (('object' != typeof e5.code && 'function' != typeof e5.code) ||
          null === e5.code ||
          Array.isArray(e5.code))
      ? {
          ok: false,
          code: 'INVALID_CODE_SHAPE',
          key: 'code',
          reason:
            'code must be an object ({ push, type?, init? }) or a resolved function value.',
        }
      : s2 && r4
        ? {
            ok: false,
            code: 'CONFLICT',
            key: 'package',
            reason:
              'Cannot specify both `code` and `package`. Use one or the other.',
          }
        : s2 && o3
          ? {
              ok: false,
              code: 'CONFLICT',
              key: 'import',
              reason: 'Cannot specify both `code` and `import`.',
            }
          : o3 && !r4
            ? {
                ok: false,
                code: 'MISSING_PACKAGE',
                key: 'import',
                reason: '`import` requires `package` to be set.',
              }
            : !o3 || ('string' == typeof e5.import && Zn.test(e5.import))
              ? { ok: true }
              : {
                  ok: false,
                  code: 'INVALID_IMPORT',
                  key: 'import',
                  reason: `import must match ${Zn.source}. Got: ${JSON.stringify(e5.import)}.`,
                };
}

// packages/collector/dist/index.mjs
var t2 = {
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
  Scoped: '_',
  Session: 'session',
  Shutdown: 'shutdown',
  User: 'user',
  Walker: 'walker',
};
var n = {
  Commands: t2,
  Utils: { Storage: { Cookie: 'cookie', Local: 'local', Session: 'session' } },
};
function r2(e5, t6) {
  const n4 = {};
  return (
    Object.entries(t6).forEach(([e6, t7]) => {
      n4[e6] = !!t7;
    }),
    (e5.consent = oe(e5.consent, n4)),
    { update: n4 }
  );
}
function D(e5, t6, n4) {
  return {
    traceId: e5.source?.trace ?? t6?._meta.trace ?? n4.trace,
    sourceId: t6?._meta.path[0],
    parentEventId: t6?._meta.parentEventId,
  };
}
function A(e5, t6) {
  const n4 = e5.status.startedAt,
    o3 = {
      flowId: e5.name ?? 'default',
      stepId: t6.stepId,
      stepType: t6.stepType,
      phase: t6.phase,
      eventId: t6.eventId,
      timestamp: new Date(t6.now).toISOString(),
      elapsedMs: t6.now - n4,
    };
  return (
    t6.traceId && (o3.traceId = t6.traceId),
    t6.sourceId && (o3.sourceId = t6.sourceId),
    t6.parentEventId && (o3.parentEventId = t6.parentEventId),
    o3
  );
}
function M(e5) {
  return 'object' == typeof e5 && null !== e5;
}
function T(e5, t6, n4) {
  if (null === e5 || 'object' != typeof e5) return e5;
  if (n4 >= 8) return e5;
  const o3 = t6.get(e5);
  if (void 0 !== o3) return o3;
  if (Array.isArray(e5)) {
    const o4 = [];
    t6.set(e5, o4);
    for (const r5 of e5) o4.push(T(r5, t6, n4 + 1));
    return o4;
  }
  const r4 = {};
  t6.set(e5, r4);
  for (const [o4, s2] of Object.entries(e5))
    r4[o4] = 'function' == typeof s2 ? s2 : T(s2, t6, n4 + 1);
  return r4;
}
function _(e5) {
  const t6 = [],
    n4 = [],
    { simulation: o3, ...r4 } = e5,
    s2 = T(r4, /* @__PURE__ */ new WeakMap(), 0);
  for (const e6 of o3) {
    const o4 = an(e6);
    if (0 === o4.length) continue;
    const r5 = o4.join('.');
    if (o4.length - 1 >= 8) {
      n4.push(r5);
      continue;
    }
    let a4 = s2,
      i4 = true;
    for (let e7 = 0; e7 < o4.length - 1; e7++) {
      const t7 = a4[o4[e7]];
      if (!M(t7)) {
        i4 = false;
        break;
      }
      a4 = t7;
    }
    const c4 = o4[o4.length - 1];
    if (!i4 || !(c4 in a4)) {
      n4.push(r5);
      continue;
    }
    const u4 = a4[c4];
    'function' == typeof u4
      ? (a4[c4] = function (...e7) {
          return (
            t6.push({ fn: r5, args: e7, ts: Date.now() }),
            u4.apply(this, e7)
          );
        })
      : n4.push(r5);
  }
  return { wrappedEnv: s2, calls: t6, unresolved: n4 };
}
function P(e5, t6) {
  try {
    return e5[t6];
  } catch {
    return '[unreadable]';
  }
}
function z(e5) {
  const t6 = /* @__PURE__ */ new WeakSet(),
    n4 = (e6, o3) => {
      if (null === e6) return null;
      if ('function' == typeof e6) return '[function]';
      if ('string' == typeof e6 || 'boolean' == typeof e6) return e6;
      if ('number' == typeof e6) return Number.isFinite(e6) ? e6 : null;
      if ('bigint' == typeof e6) return String(e6);
      if ('object' != typeof e6) return;
      const r4 = e6;
      if (t6.has(r4)) return '[circular]';
      if (o3 >= 6) return '[truncated]';
      let s2;
      t6.add(r4);
      try {
        if (Array.isArray(r4)) s2 = r4.map((e7) => n4(e7, o3 + 1));
        else if (
          (function (e7) {
            const t7 = Object.getPrototypeOf(e7);
            return t7 === Object.prototype || null === t7;
          })(r4)
        ) {
          const e7 = {};
          for (const t7 of Object.keys(r4)) e7[t7] = n4(P(r4, t7), o3 + 1);
          s2 = e7;
        } else
          s2 = (function (e7) {
            try {
              return String(e7);
            } catch {
              return '[object]';
            }
          })(r4);
      } catch {
        s2 = '[unreadable]';
      }
      return (t6.delete(r4), s2);
    };
  return e5.map((e6) => n4(e6, 0));
}
function K(e5) {
  return e5.map((e6) => ({ fn: e6.fn, args: z(e6.args), ts: e6.ts }));
}
function G(e5, t6, n4, o3) {
  if (!Number.isFinite(n4.max) || n4.max <= 0)
    throw new Error(`pushBounded: max must be > 0 (got ${n4.max})`);
  if ('dropNewest' === (n4.onOverflow ?? 'dropOldest'))
    return e5.length >= n4.max
      ? (o3 && o3([t6]), { appended: false, dropped: 1 })
      : (e5.push(t6), { appended: true, dropped: 0 });
  const r4 = [];
  for (; e5.length >= n4.max; ) r4.push(e5.shift());
  return (
    e5.push(t6),
    r4.length > 0 && o3 && o3(r4),
    { appended: true, dropped: r4.length }
  );
}
var W = /* @__PURE__ */ new WeakMap();
function V(e5, t6, n4, o3) {
  W.get(e5) || (W.set(e5, true), t6.warn(n4, o3));
}
function L(e5) {
  W.delete(e5);
}
var Y = 3e4;
var J = () => Date.now();
function Q(e5) {
  if (void 0 !== e5)
    return 'number' == typeof e5
      ? { threshold: e5, cooldown: Y }
      : { threshold: e5.threshold ?? 5, cooldown: e5.cooldown ?? Y };
}
function X(e5, t6, n4, o3, r4) {
  if ('partial' === n4) return;
  const s2 = (function (e6, t7) {
    return (
      e6[t7] || (e6[t7] = { state: 'closed', consecutiveFailures: 0 }),
      e6[t7]
    );
  })(e5, t6);
  return 'success' === n4
    ? ((s2.consecutiveFailures = 0),
      (s2.state = 'closed'),
      (s2.probing = false),
      void (s2.openUntil = void 0))
    : ((s2.consecutiveFailures += 1),
      'half-open' === s2.state
        ? ((s2.state = 'open'),
          (s2.probing = false),
          void (s2.openUntil = J() + r4))
        : void (
            s2.consecutiveFailures >= o3 &&
            ((s2.state = 'open'),
            (s2.probing = false),
            (s2.openUntil = J() + r4))
          ));
}
var ee = 100;
function te(e5, t6) {
  return (
    e5.status.destinations[t6] ||
      (e5.status.destinations[t6] = {
        count: 0,
        failed: 0,
        duration: 0,
        queuePushSize: 0,
        dlqSize: 0,
      }),
    e5.status.destinations[t6]
  );
}
function ne(e5, t6, n4, o3) {
  e5.dropped[t6] || (e5.dropped[t6] = {});
  const r4 = e5.dropped[t6];
  return ((r4[n4] = (r4[n4] ?? 0) + o3), r4[n4]);
}
function oe2(e5, t6, n4, o3, r4) {
  const s2 = o(t6, n4);
  return (t7, a4) => {
    try {
      if (a4)
        return (
          r4
            ? (function (e6, t8, n5, o4, r5, s3) {
                const a5 = (t8.dlq = t8.dlq || []),
                  i4 = { max: t8.config.dlqMax ?? ee },
                  c4 = G(a5, [o4, r5], i4);
                if (c4.dropped > 0) {
                  const t9 = ne(
                    e6.status,
                    o('destination', n5),
                    'dlq',
                    c4.dropped,
                  );
                  V(
                    a5,
                    s3,
                    'destination.dlq overflow; oldest entries dropped',
                    {
                      buffer: 'dlq',
                      destination: n5,
                      cap: i4.max,
                      droppedCount: t9,
                    },
                  );
                } else a5.length < i4.max && L(a5);
                const u4 = te(e6, n5);
                (u4.failed++, (u4.dlqSize = a5.length), e6.status.failed++);
                const d3 = Q(t8.config.breaker);
                if (d3) {
                  const o5 = t8.config.id || n5;
                  X(
                    e6.status.breakers,
                    o('destination', o5),
                    'transport-failure',
                    d3.threshold,
                    d3.cooldown,
                  );
                }
              })(e5, r4, n4, a4, t7, o3)
            : e5.status.failed++,
          void o3.error('report error', {
            error: t7 instanceof Error ? t7.message : String(t7),
            event: a4.name,
          })
        );
      ((e5.status.connectionErrors[s2] =
        (e5.status.connectionErrors[s2] ?? 0) + 1),
        o3.error('connection error', {
          error: t7 instanceof Error ? t7.message : String(t7),
        }));
    } catch {}
  };
}
function Me2(e5, t6) {
  return e5.storeId && t6.stores[e5.storeId]
    ? t6.stores[e5.storeId]
    : t6.stores.__cache;
}
function Te(e5, t6) {
  return e5 ? t6.stores[e5] : t6.stores.__cache;
}
function _e2(e5) {
  const t6 = {};
  for (const [n4, o3] of Object.entries(e5)) {
    const e6 = o3.config?.next;
    'string' == typeof e6 ||
    (Array.isArray(e6) && e6.every((e7) => 'string' == typeof e7))
      ? (t6[n4] = { next: e6 })
      : (t6[n4] = {});
  }
  return t6;
}
function Pe2(e5, t6) {
  const n4 = e5.config || {},
    o3 = e5[t6];
  return void 0 !== o3
    ? { config: { ...n4, [t6]: o3 }, chainValue: o3 }
    : { config: n4, chainValue: void 0 };
}
function ze2(e5, t6 = {}) {
  if (!e5) return [];
  if (Array.isArray(e5)) return e5;
  const n4 = [],
    o3 = /* @__PURE__ */ new Set();
  let r4 = e5;
  for (; r4 && t6[r4] && !o3.has(r4); ) {
    (o3.add(r4), n4.push(r4));
    const e6 = t6[r4].next;
    if (Array.isArray(e6)) {
      n4.push(...e6);
      break;
    }
    r4 = e6;
  }
  return n4;
}
async function Ke2(e5, t6, n4) {
  if (t6.init && !t6.config.init) {
    const o3 = t6.type || 'unknown',
      r4 = e5.logger.scope(`transformer:${o3}`),
      s2 = {
        collector: e5,
        logger: r4,
        id: n4,
        ingest: O(n4),
        config: t6.config,
        env: He(t6.config.env),
        reportError: oe2(e5, 'transformer', n4, r4),
      };
    r4.debug('init');
    const a4 = await gt(t6.init, 'TransformerInit', e5.hooks, e5.logger)(s2);
    if (false === a4) return false;
    ((t6.config = {
      ...(a4 || t6.config),
      env: a4?.env || t6.config.env,
      init: true,
    }),
      r4.debug('init done'));
  }
  return true;
}
async function Fe2(e5, t6, n4, o3, r4, s2) {
  const a4 = t6.type || 'unknown',
    i4 = e5.logger.scope(`transformer:${a4}`),
    c4 = {
      collector: e5,
      logger: i4,
      id: n4,
      ingest: r4,
      config: t6.config,
      env: { ...He(t6.config.env), ...(s2 ? { respond: s2 } : {}) },
      reportError: oe2(e5, 'transformer', n4, i4),
    };
  i4.debug('push', { event: o3.name });
  const u4 = 'string' == typeof o3.id ? o3.id : '',
    { traceId: d3, sourceId: l4, parentEventId: f2 } = D(o3, r4, e5),
    p4 = Date.now(),
    g4 = A(e5, {
      stepId: o('transformer', n4),
      stepType: 'transformer',
      phase: 'in',
      eventId: u4,
      now: p4,
      traceId: d3,
      sourceId: l4,
      parentEventId: f2,
    });
  ((g4.inEvent = o3), qt(e5, g4));
  try {
    const r5 = await gt(
        t6.push,
        'TransformerPush',
        e5.hooks,
        e5.logger,
      )(o3, c4),
      s3 = Date.now(),
      a5 = A(e5, {
        stepId: o('transformer', n4),
        stepType: 'transformer',
        phase: 'out',
        eventId: u4,
        now: s3,
        traceId: d3,
        sourceId: l4,
        parentEventId: f2,
      });
    return (
      (a5.durationMs = s3 - p4),
      (a5.outEvent = r5),
      qt(e5, a5),
      i4.debug('push done'),
      r5
    );
  } catch (t7) {
    const o4 = Date.now(),
      r5 = A(e5, {
        stepId: o('transformer', n4),
        stepType: 'transformer',
        phase: 'error',
        eventId: u4,
        now: o4,
        traceId: d3,
        sourceId: l4,
        parentEventId: f2,
      });
    throw (
      (r5.durationMs = o4 - p4),
      (r5.error =
        t7 instanceof Error
          ? { name: t7.name, message: t7.message }
          : { message: String(t7) }),
      qt(e5, r5),
      t7
    );
  }
}
function Ue2(e5, t6) {
  return e5
    ? { ...e5, _meta: { ...e5._meta, path: [...e5._meta.path] } }
    : O(t6);
}
async function Be2(e5, t6, n4, o3, r4, s2, a4) {
  (r4 || (r4 = O(n4[0] ?? 'chain')),
    a4 && r4._meta && (r4._meta.chainPath = a4));
  let i4 = o3,
    c4 = s2;
  for (const o4 of n4) {
    const s3 = t6[o4];
    if (!s3) {
      e5.logger.warn(`Transformer not found: ${o4}`);
      continue;
    }
    if (r4 && r4._meta && r4._meta.path.length > 256)
      return (
        e5.logger.error(`Max path length exceeded at ${o4}`),
        { event: null, respond: c4 }
      );
    r4 && r4._meta && (r4._meta.hops++, r4._meta.path.push(o4));
    if (
      !(await Xe(Ke2, (t7) => {
        if (t7 instanceof Ye) throw t7;
        return (
          e5.status.failed++,
          e5.logger
            .scope(`transformer:${s3.type || 'unknown'}`)
            .error('transformer init failed', { transformer: o4, error: t7 }),
          false
        );
      })(e5, s3, o4))
    )
      return { event: null, respond: c4 };
    if (a4 && void 0 !== s3.config?.chainMocks?.[a4]) {
      const t7 = s3.config.chainMocks[a4];
      (e5.logger
        .scope(`transformer:${s3.type || 'unknown'}`)
        .debug('chainMock', { chain: a4 }),
        (i4 = t7));
      continue;
    }
    if (void 0 !== s3.config?.mock) {
      (e5.logger.scope(`transformer:${s3.type || 'unknown'}`).debug('mock'),
        (i4 = s3.config.mock));
      continue;
    }
    if (s3.config?.disabled) continue;
    const u4 = s3.config?.cache,
      d3 = u4 ? Tn(u4) : void 0,
      l4 = d3 ? Me2(d3, e5) : void 0,
      f2 = s3.config?.state ? Rn(s3.config.state) : void 0,
      p4 = f2?.filter((e6) => 'get' === e6.mode),
      g4 = f2?.filter((e6) => 'set' === e6.mode),
      m5 = async (t7) =>
        g4 && 0 !== g4.length ? Fn(g4, (t8) => Te(t8, e5), t7, e5) : t7;
    let h4;
    if (d3 && l4) {
      const e6 = Nn(r4, i4),
        t7 = await Cn(d3, l4, e6);
      if ('HIT' === t7?.status && t7.value) {
        if (((i4 = t7.value), d3.stop))
          return { event: i4, respond: c4, stopped: true };
        continue;
      }
      'MISS' === t7?.status && (h4 = { key: t7.key, ttl: t7.rule.ttl });
    }
    const v3 = s3.config.before;
    if (v3) {
      const n5 = hn(v3, Nn(r4, i4));
      if (1 === n5.length) {
        const o5 = ze2(n5[0], _e2(t6));
        if (o5.length > 0) {
          const n6 = await Be2(e5, t6, o5, i4, r4, c4, a4);
          if (null === n6.event)
            return { event: null, respond: n6.respond ?? c4 };
          if (n6.stopped)
            return {
              event: Array.isArray(n6.event) ? n6.event[0] : n6.event,
              respond: n6.respond ?? c4,
              stopped: true,
            };
          (n6.respond && (c4 = n6.respond),
            (i4 = Array.isArray(n6.event) ? n6.event[0] : n6.event));
        }
      } else
        n5.length > 1 &&
          (await Promise.all(
            n5.map((n6) =>
              Xe(
                Be2,
                (t7) => (
                  e5.logger
                    .scope('transformer:many')
                    .error(`many branch ${n6} failed`, { error: t7 }),
                  { event: null, respond: void 0 }
                ),
              )(e5, t6, ze2(n6, _e2(t6)), i4, Ue2(r4, n6), void 0, a4),
            ),
          ));
    }
    p4 && p4.length > 0 && (i4 = await Fn(p4, (t7) => Te(t7, e5), i4, e5));
    const y6 = await Xe(
      Fe2,
      (t7) => (
        e5.logger
          .scope(`transformer:${s3.type || 'unknown'}`)
          .error('Push failed', { error: t7 }),
        false
      ),
    )(e5, s3, o4, i4, r4, c4);
    if (false === y6) return { event: null, respond: c4 };
    if (Array.isArray(y6)) {
      const s4 = n4.slice(n4.indexOf(o4) + 1),
        u5 = await Promise.all(
          y6.map(async (n5) => {
            const o5 = await m5(n5.event || i4),
              u6 = Ue2(r4, 'unknown');
            if (n5.next) {
              const r5 = hn(n5.next, Nn(u6, o5));
              if (0 === r5.length) return { event: o5, respond: c4 };
              if (1 === r5.length) {
                const n6 = ze2(r5[0], _e2(t6));
                return n6.length > 0
                  ? Be2(e5, t6, n6, o5, u6, c4, a4)
                  : { event: o5, respond: c4 };
              }
              return (
                await Promise.all(
                  r5.map((n6) =>
                    Xe(
                      Be2,
                      (t7) => (
                        e5.logger
                          .scope('transformer:many')
                          .error(`many branch ${n6} failed`, { error: t7 }),
                        { event: null, respond: void 0 }
                      ),
                    )(e5, t6, ze2(n6, _e2(t6)), o5, Ue2(u6, n6), void 0, a4),
                  ),
                )
              ).map((e6) => ({ event: e6.event, respond: void 0 }));
            }
            return s4.length > 0
              ? Be2(e5, t6, s4, o5, u6, c4, a4)
              : { event: o5, respond: c4 };
          }),
        );
      let d4 = c4;
      const l5 = [];
      for (const e6 of u5.flat())
        if (null !== e6)
          if (e6 && 'object' == typeof e6 && 'event' in e6) {
            const t7 = e6;
            if ((t7.respond && (d4 = t7.respond), null === t7.event)) continue;
            Array.isArray(t7.event) ? l5.push(...t7.event) : l5.push(t7.event);
          } else l5.push(e6);
      return 0 === l5.length
        ? { event: null, respond: d4 }
        : 1 === l5.length
          ? { event: l5[0], respond: d4 }
          : { event: l5, respond: d4 };
    }
    if (y6 && 'object' == typeof y6) {
      const { event: n5, respond: o5, next: s4 } = y6;
      if ((o5 && (c4 = o5), void 0 !== s4)) {
        const o6 = await m5(n5 || i4),
          u5 = hn(s4, Nn(r4, o6));
        if (0 === u5.length) {
          i4 = o6;
          continue;
        }
        if (1 === u5.length) {
          const n6 = ze2(u5[0], _e2(t6));
          return n6.length > 0
            ? Be2(e5, t6, n6, o6, r4, c4, a4)
            : (e5.logger.warn(`Branch target not found: ${JSON.stringify(s4)}`),
              { event: null, respond: c4 });
        }
        return (
          await Promise.all(
            u5.map((n6) =>
              Xe(
                Be2,
                (t7) => (
                  e5.logger
                    .scope('transformer:many')
                    .error(`many branch ${n6} failed`, { error: t7 }),
                  { event: null, respond: void 0 }
                ),
              )(e5, t6, ze2(n6, _e2(t6)), o6, Ue2(r4, n6), void 0, a4),
            ),
          ),
          { event: null, respond: void 0 }
        );
      }
      n5 && (i4 = n5);
    }
    (g4 && g4.length > 0 && (i4 = await Fn(g4, (t7) => Te(t7, e5), i4, e5)),
      h4 && l4 && Pn(l4, h4.key, i4, h4.ttl));
    const w6 = s3.config.next,
      b3 =
        'string' == typeof w6 ||
        (Array.isArray(w6) && w6.every((e6) => 'string' == typeof e6)),
      k4 = void 0 !== w6 && !b3;
    if ((!y6 || ('object' == typeof y6 && !y6.next)) && k4) {
      const n5 = hn(s3.config.next, Nn(r4, i4));
      if (1 === n5.length) {
        const o5 = ze2(n5[0], _e2(t6));
        return o5.length > 0
          ? Be2(e5, t6, o5, i4, r4, c4, a4)
          : { event: i4, respond: c4 };
      }
      return n5.length > 1
        ? (await Promise.all(
            n5.map((n6) =>
              Xe(
                Be2,
                (t7) => (
                  e5.logger
                    .scope('transformer:many')
                    .error(`many branch ${n6} failed`, { error: t7 }),
                  { event: null, respond: void 0 }
                ),
              )(e5, t6, ze2(n6, _e2(t6)), i4, Ue2(r4, n6), void 0, a4),
            ),
          ),
          { event: null, respond: void 0 })
        : { event: i4, respond: c4 };
    }
  }
  return { event: i4, respond: c4 };
}
function He(e5) {
  return e5 && de(e5) ? e5 : {};
}
function Re2(e5) {
  return (
    'string' == typeof e5 ||
    !(!Array.isArray(e5) || !e5.every((e6) => 'string' == typeof e6))
  );
}
async function Ge2(e5, t6, n4) {
  if (!t6.on || !t6.queueOn?.length) return;
  const o3 = t6.queueOn;
  t6.queueOn = [];
  const r4 = n4 || t6.config?.id || 'unknown';
  for (const { type: n5, data: s2 } of o3)
    (tt2(n5) && !at(e5, t6, n5)) ||
      (await Xe(t6.on, (t7) => {
        if (t7 instanceof Ye) throw t7;
        (e5.status.failed++,
          e5.logger.scope('source').error('source on flush failed', {
            sourceId: r4,
            type: n5,
            error: t7,
          }));
      })(n5, s2),
      tt2(n5) && st(e5, t6, n5));
}
function We2(e5) {
  return Boolean(e5.config.init) && !e5.config.require?.length;
}
function Ve2(e5) {
  return 'object' == typeof e5 && null !== e5;
}
async function Le2(e5, t6, n4) {
  const {
      code: o3,
      config: r4 = {},
      env: s2 = {},
      primary: a4,
      next: i4,
      before: c4,
      cache: u4,
    } = n4,
    d3 = r4.state ?? n4.state,
    l4 = d3 ? Rn(d3) : void 0,
    f2 = u4,
    p4 = f2 ? Tn({ ...f2, stop: f2.stop ?? true }) : void 0,
    g4 = Re2(i4) ? ze2(i4, _e2(e5.transformers)) : void 0,
    m5 = Re2(c4) ? ze2(c4, _e2(e5.transformers)) : void 0,
    h4 = s2.push,
    v3 = h4 ?? e5.push,
    y6 = Boolean(h4),
    w6 = async (n5, o4, s3) => {
      let a5;
      const u5 =
        m5 ??
        (void 0 !== c4
          ? (() => {
              const t7 = hn(c4, Nn(s3.ingest));
              if (0 === t7.length) return [];
              return ze2(1 === t7.length ? t7[0] : t7, _e2(e5.transformers));
            })()
          : []);
      let d4 = [n5];
      if (
        u5.length > 0 &&
        e5.transformers &&
        Object.keys(e5.transformers).length > 0
      ) {
        const o5 = await Be2(
          e5,
          e5.transformers,
          u5,
          n5,
          s3.ingest,
          s3.respond,
          `source.${t6}.before`,
        );
        if (null === o5.event) return { ok: true };
        if (o5.stopped)
          return (o5.respond && (s3.respond = o5.respond), { ok: true });
        (o5.respond && (s3.respond = o5.respond),
          (d4 = Array.isArray(o5.event) ? o5.event : [o5.event]));
      }
      if (p4) {
        const t7 = Me2(p4, e5);
        if (t7) {
          const n6 = Nn(s3.ingest),
            o5 = await Cn(p4, t7, n6);
          if (o5) {
            if ('HIT' === o5.status && void 0 !== o5.value && p4.stop) {
              let t8 = o5.value;
              return (
                o5.rule.update &&
                  (t8 = await zn(
                    t8,
                    o5.rule.update,
                    { ...n6, cache: { status: 'HIT' } },
                    e5,
                  )),
                s3.respond?.(t8),
                { ok: true }
              );
            }
            if ('MISS' === o5.status && p4.stop && s3.respond) {
              const r5 = s3.respond,
                i5 = o5.rule.update,
                c5 = { ...n6, cache: { status: 'MISS' } },
                u6 = o5.key,
                d5 = o5.rule.ttl,
                l5 = (n7) => {
                  (Pn(t7, u6, n7, d5),
                    i5
                      ? (a5 = (async () => {
                          const t8 = await zn(n7, i5, c5, e5);
                          r5(t8);
                        })())
                      : r5(n7));
                };
              s3.respond = l5;
            }
            'MISS' !== o5.status ||
              p4.stop ||
              Pn(t7, o5.key, true, o5.rule.ttl);
          }
        }
      }
      const f3 = g4
        ? { kind: 'single', preChain: g4 }
        : void 0 !== i4
          ? (() => {
              const t7 = hn(i4, Nn(s3.ingest));
              return 0 === t7.length
                ? { kind: 'single', preChain: [] }
                : 1 === t7.length
                  ? {
                      kind: 'single',
                      preChain: ze2(t7[0], _e2(e5.transformers)),
                    }
                  : {
                      kind: 'many',
                      branches: t7.map((t8) => ze2(t8, _e2(e5.transformers))),
                    };
            })()
          : { kind: 'single', preChain: [] };
      !y6 &&
        l4 &&
        l4.length > 0 &&
        (d4 = await Promise.all(
          d4.map((t7) => Fn(l4, (t8) => Te(t8, e5), t7, e5)),
        ));
      let h5 = { ok: true };
      for (const n6 of d4)
        'many' === f3.kind
          ? (await Promise.all(
              f3.branches.map((a6, i5) =>
                Xe(
                  async () =>
                    y6
                      ? v3(n6)
                      : v3(n6, {
                          ...o4,
                          id: t6,
                          ingest: Ue2(s3.ingest, `${t6}.${i5}`),
                          respond: void 0,
                          mapping: r4,
                          preChain: a6,
                        }),
                  (t7) => (
                    e5.logger
                      .scope('source:many')
                      .error(`many branch ${i5} failed`, { error: t7 }),
                    { ok: true }
                  ),
                )(),
              ),
            ),
            (h5 = { ok: true }))
          : (h5 = y6
              ? await v3(n6)
              : await v3(n6, {
                  ...o4,
                  id: t6,
                  ingest: s3.ingest,
                  respond: s3.respond,
                  mapping: r4,
                  preChain: f3.preChain,
                }));
      return (a5 && (await a5), h5);
    },
    b3 = async (n5) => {
      const o4 = O(t6),
        s3 = ze(
          (function (e6) {
            if (!Ve2(e6)) return;
            const t7 = e6.headers;
            if (Ve2(t7)) {
              if (
                (function (e7) {
                  return 'get' in e7 && 'function' == typeof e7.get;
                })(t7)
              )
                return t7.get('traceparent') ?? void 0;
              if ('traceparent' in t7) return t7.traceparent;
              for (const e7 of Object.keys(t7))
                if ('traceparent' === e7.toLowerCase()) return t7[e7];
            }
          })(n5),
        );
      if (
        (s3 &&
          ((o4._meta.trace = s3.trace),
          (o4._meta.parentEventId = s3.parentSpan)),
        !r4.ingest || void 0 === n5)
      )
        return o4;
      const a5 = await et(n5, r4.ingest, { collector: e5 });
      return { ...o4, ...a5, _meta: o4._meta };
    },
    k4 = e5.logger.scope('source').scope(t6),
    I2 = {
      command: e5.command,
      sources: e5.sources,
      elb: e5.elb,
      logger: k4,
      ...s2,
      push: async (e6, n5 = {}) => {
        const o4 = { ingest: O(t6), respond: void 0 };
        return w6(e6, n5, o4);
      },
    },
    C2 = {
      collector: e5,
      logger: k4,
      id: t6,
      config: r4,
      env: I2,
      withScope: async (e6, t7, n5) => {
        const o4 = { ingest: await b3(e6), respond: t7 };
        return n5({
          ...I2,
          push: (e7, t8 = {}) => w6(e7, t8, o4),
          ingest: o4.ingest,
          respond: o4.respond,
        });
      },
      reportError: oe2(e5, 'source', t6, k4),
    },
    E4 = await Xe(o3, (n5) => {
      if (n5 instanceof Ye) throw n5;
      (e5.status.failed++,
        e5.logger
          .scope('source')
          .error('source factory failed', { sourceId: t6, error: n5 }));
    })(C2);
  if (!E4) return;
  const q = E4.type || 'unknown',
    S3 = e5.logger.scope(q).scope(t6);
  return (
    (I2.logger = S3),
    a4 && (E4.config = { ...E4.config, primary: a4 }),
    E4
  );
}
async function Ne(e5, t6 = {}) {
  const n4 = {};
  for (const [o3, r4] of Object.entries(t6)) {
    const t7 = await Le2(e5, o3, r4);
    if (!t7) continue;
    const s2 = r4.config?.require;
    ((t7.config = {
      ...t7.config,
      init: false,
      ...(s2 ? { require: [...s2] } : {}),
    }),
      (n4[o3] = t7));
  }
  Object.assign(e5.sources, n4);
  for (const t7 of Object.keys(n4)) {
    const n5 = e5.sources[t7];
    let o3 = false;
    (n5.init &&
      (await Xe(n5.init.bind(n5), (n6) => {
        if (n6 instanceof Ye) throw n6;
        ((o3 = true),
          e5.status.failed++,
          e5.logger
            .scope('source')
            .error('source init failed', { sourceId: t7, error: n6 }));
      })()),
      o3 || ((n5.config.init = true), We2(n5) && (await Ge2(e5, n5, t7))));
  }
  return (await Ye2(e5), n4);
}
async function Ye2(e5) {
  for (const [t6, n4] of Object.entries(e5.sources)) {
    if (We2(n4)) continue;
    const o3 = n4.config.require;
    if (!o3?.length) continue;
    const r4 = o3.filter((t7) => !ot(e5, t7));
    r4.length !== o3.length &&
      ((n4.config.require = r4), We2(n4) && (await Ge2(e5, n4, t6)));
  }
  for (const [t6, n4] of Object.entries(e5.pending.destinations)) {
    if (!e5.pending.destinations[t6] || e5.destinations[t6]) continue;
    const o3 = n4.config?.require;
    if (!o3) continue;
    const r4 = o3.filter((t7) => !ot(e5, t7));
    if ((n4.config && (n4.config.require = r4), r4.length > 0)) continue;
    delete e5.pending.destinations[t6];
    const s2 = jt(n4);
    (false !== s2.config.queue && (s2.queuePush = [...e5.queue]),
      (e5.destinations[t6] = s2));
  }
}
function Je2(e5) {
  if ('object' != typeof e5 || null === e5) return false;
  if (!('logger' in e5)) return false;
  const t6 = e5.logger;
  return (
    'object' == typeof t6 &&
    null !== t6 &&
    'scope' in t6 &&
    'function' == typeof t6.scope
  );
}
var Qe2 = false;
function Xe2() {
  Qe2 ||
    ((Qe2 = true),
    'undefined' != typeof console &&
      'function' == typeof console.warn &&
      console.warn(
        'walkerOS: ignored an on-dispatch call with a non-collector argument',
      ));
}
function Ze2(e5, t6, n4, o3) {
  if (n4 instanceof Ye) throw n4;
  e5.logger
    .scope('on')
    .error('on callback failed', { kind: t6, ...o3, error: n4 });
}
var et2 = [
  n.Commands.Consent,
  n.Commands.User,
  n.Commands.Globals,
  n.Commands.Custom,
];
function tt2(e5) {
  return et2.includes(e5);
}
function nt2(e5, t6) {
  switch (t6) {
    case n.Commands.Consent:
      return Object.keys(e5.consent).length > 0;
    case n.Commands.User:
      return Object.keys(e5.user).length > 0;
    case n.Commands.Globals:
      return Object.keys(e5.globals).length > 0;
    case n.Commands.Custom:
      return Object.keys(e5.custom).length > 0;
    default:
      return false;
  }
}
function ot(e5, t6) {
  switch (t6) {
    case n.Commands.Consent:
    case n.Commands.User:
    case n.Commands.Globals:
    case n.Commands.Custom:
      return nt2(e5, t6);
    case n.Commands.Run:
    case n.Commands.Ready:
      return true === e5.allowed;
    default:
      return e5.seenEvents.has(String(t6));
  }
}
function rt(e5, t6) {
  return e5.cellVersion[String(t6)] ?? 0;
}
function st(e5, t6, n4) {
  let o3 = e5.delivery.get(t6);
  (o3 || ((o3 = {}), e5.delivery.set(t6, o3)), (o3[String(n4)] = rt(e5, n4)));
}
function at(e5, t6, n4) {
  return (
    e5.allowed &&
    rt(e5, n4) >
      (function (e6, t7, n5) {
        const o3 = e6.delivery.get(t7),
          r4 = o3?.[String(n5)];
        return void 0 === r4 ? -1 : r4;
      })(e5, t6, n4)
  );
}
function it(e5) {
  return e5.cascade
    ? () => {}
    : ((e5.cascade = { counts: /* @__PURE__ */ new WeakMap() }),
      () => {
        e5.cascade = void 0;
      });
}
function ct(e5, t6, n4) {
  const o3 = e5.cascade;
  if (!o3) return true;
  let r4 = o3.counts.get(t6);
  r4 || ((r4 = {}), o3.counts.set(t6, r4));
  const s2 = String(n4),
    a4 = (r4[s2] || 0) + 1;
  return (
    (r4[s2] = a4),
    a4 <= 8 ||
      (9 === a4 &&
        e5.logger.error('state delivery did not converge', { type: s2 }),
      false)
  );
}
function ut(e5, t6) {
  return { collector: e5, logger: e5.logger.scope('on').scope(String(t6)) };
}
async function dt(e5, t6, n4) {
  if (!Je2(e5)) return void Xe2();
  const o3 = e5.on,
    r4 = o3[t6] || [],
    s2 = ie(n4) ? n4 : [n4];
  (s2.forEach((e6) => {
    r4.push(e6);
  }),
    (o3[t6] = r4),
    ft(e5, t6, s2));
}
function lt(e5, t6, n4, o3, r4) {
  if (!t6.on) return;
  const s2 = t6.type || 'unknown',
    a4 = e5.logger.scope(s2).scope('on').scope(o3),
    i4 = {
      collector: e5,
      logger: a4,
      id: n4,
      config: t6.config,
      data: r4,
      env: At(t6.env, t6.config.env),
      reportError: oe2(e5, 'destination', n4, a4, t6),
    };
  Ge(t6.on, (t7) => Ze2(e5, 'destination', t7, { destId: n4, type: o3 }))(
    o3,
    i4,
  );
}
function ft(e5, t6, o3, r4) {
  if (!Je2(e5)) return void Xe2();
  const s2 = pt(e5, t6, r4);
  if (o3.length)
    switch (t6) {
      case n.Commands.Consent:
        !(function (e6, t7, o4) {
          const r5 = o4 || e6.consent,
            s3 = ut(e6, n.Commands.Consent);
          t7.forEach((t8) => {
            at(e6, t8, n.Commands.Consent) &&
              ct(e6, t8, n.Commands.Consent) &&
              (Object.keys(r5)
                .filter((e7) => e7 in t8)
                .forEach((n4) => {
                  Ge(t8[n4], (t9) => Ze2(e6, 'consent', t9, { key: n4 }))(
                    r5,
                    s3,
                  );
                }),
              st(e6, t8, n.Commands.Consent));
          });
        })(e5, o3, r4);
        break;
      case n.Commands.Ready:
        !(function (e6, t7) {
          if (!e6.allowed) return;
          const o4 = ut(e6, n.Commands.Ready);
          t7.forEach((t8) => {
            Ge(t8, (t9) => Ze2(e6, 'ready', t9))(void 0, o4);
          });
        })(e5, o3);
        break;
      case n.Commands.Run:
        !(function (e6, t7) {
          if (!e6.allowed) return;
          const o4 = ut(e6, n.Commands.Run);
          t7.forEach((t8) => {
            Ge(t8, (t9) => Ze2(e6, 'run', t9))(void 0, o4);
          });
        })(e5, o3);
        break;
      case n.Commands.Session:
        !(function (e6, t7) {
          if (!e6.session) return;
          const o4 = ut(e6, n.Commands.Session);
          t7.forEach((t8) => {
            Ge(t8, (t9) => Ze2(e6, 'session', t9))(e6.session, o4);
          });
        })(e5, o3);
        break;
      default: {
        const n4 = ut(e5, t6),
          r5 = tt2(t6);
        o3.forEach((o4) => {
          'function' == typeof o4 &&
            ((r5 && !at(e5, o4, t6)) ||
              (r5 && !ct(e5, o4, t6)) ||
              (Ge(o4, (n5) => Ze2(e5, 'generic', n5, { type: t6 }))(s2, n4),
              r5 && st(e5, o4, t6)));
        });
        break;
      }
    }
}
function pt(e5, t6, o3) {
  switch (t6) {
    case n.Commands.Consent:
      return o3 || e5.consent;
    case n.Commands.Session:
      return e5.session;
    case n.Commands.User:
      return o3 || e5.user;
    case n.Commands.Custom:
      return o3 || e5.custom;
    case n.Commands.Globals:
      return o3 || e5.globals;
    case n.Commands.Config:
      return o3 || e5.config;
    default:
      return;
  }
}
async function gt2(e5, t6, n4, o3, r4) {
  if (!t6.on) return false;
  if (tt2(o3) && !at(e5, t6, o3)) return false;
  if (tt2(o3) && !ct(e5, t6, o3)) return false;
  const s2 = await Xe(t6.on, (t7) =>
    Ze2(e5, 'source', t7, { sourceId: n4, type: o3 }),
  )(o3, r4);
  return (tt2(o3) && st(e5, t6, o3), false === s2);
}
async function mt2(e5) {
  if (Je2(e5))
    for (const t6 of et2) {
      if (!nt2(e5, t6)) continue;
      const n4 = pt(e5, t6);
      ft(e5, t6, e5.on[t6] || []);
      for (const [o3, r4] of Object.entries(e5.sources))
        We2(r4) && (await gt2(e5, r4, o3, t6, n4));
    }
  else Xe2();
}
async function ht(e5, t6, n4, o3) {
  if (!Je2(e5)) return (Xe2(), true);
  e5.seenEvents.add(String(t6));
  let r4 = n4 || [];
  n4 || (r4 = e5.on[t6] || []);
  const s2 = pt(e5, t6, o3);
  let a4 = false;
  for (const [n5, o4] of Object.entries(e5.sources)) {
    if (o4.config.require?.length) {
      const e6 = o4.config.require.indexOf(t6);
      -1 !== e6 && o4.config.require.splice(e6, 1);
    }
    if (o4.on)
      if (We2(o4)) {
        (await gt2(e5, o4, n5, t6, s2)) && (a4 = true);
      } else
        ((o4.queueOn = o4.queueOn || []),
          o4.queueOn.push({ type: t6, data: s2 }));
  }
  Object.entries(e5.destinations).forEach(([n5, o4]) => {
    if (o4.on) {
      if (!o4.config.init)
        return (
          (o4.queueOn = o4.queueOn || []),
          void o4.queueOn.push({ type: t6, data: s2 })
        );
      lt(e5, o4, n5, t6, s2);
    }
  });
  for (const [t7, n5] of Object.entries(e5.sources))
    We2(n5) && n5.queueOn?.length && (await Ge2(e5, n5, t7));
  const i4 = Object.values(e5.sources).some(
    (e6) => !We2(e6) && e6.config.require?.length,
  );
  return (
    (Object.keys(e5.pending.destinations).length > 0 || i4) && (await Ye2(e5)),
    ft(e5, t6, r4, o3),
    !a4
  );
}
function vt(e5) {
  return 'number' == typeof e5 && e5 > 0 ? e5 : 1e4;
}
var yt = class extends Error {
  constructor(e5) {
    (super(e5), (this.name = 'DestinationTimeoutError'));
  }
};
function wt(e5, t6, n4) {
  let o3;
  const r4 = new Promise((e6, r5) => {
    o3 = setTimeout(() => r5(new yt(n4)), t6);
  });
  return Promise.race([e5, r4]).finally(() => {
    o3 && clearTimeout(o3);
  });
}
var bt = Object.freeze({ batched: true });
function kt(e5) {
  return e5 === bt;
}
function It(e5) {
  return void 0 === e5
    ? {}
    : 'number' == typeof e5
      ? { wait: e5 }
      : { wait: e5.wait, size: e5.size, age: e5.age };
}
function Ct(e5, t6, n4) {
  if (!e5) return [];
  if (Array.isArray(e5) && e5.every((e6) => 'string' == typeof e6))
    return ze2(e5, t6);
  if ('string' == typeof e5) return ze2(e5, t6);
  const o3 = hn(e5, Nn(n4));
  return 0 === o3.length ? [] : 1 === o3.length ? ze2(o3[0], t6) : ze2(o3, t6);
}
async function Et(e5, t6) {
  const {
    code: n4,
    config: o3 = {},
    env: r4 = {},
    before: s2,
    next: a4,
    cache: i4,
    state: c4,
  } = t6;
  if (!le(n4.push))
    return Ot({
      ok: false,
      failed: {
        invalid: {
          type: 'invalid',
          error: 'Destination code must have a push method',
        },
      },
    });
  const u4 = o3 || { init: false };
  let d3 = s2 ? { ...u4, before: s2 } : { ...u4 };
  (a4 && (d3 = { ...d3, next: a4 }),
    i4 && (d3 = { ...d3, cache: i4 }),
    void 0 !== c4 && void 0 === d3.state && (d3 = { ...d3, state: c4 }));
  let l4 = d3.id;
  if (!l4)
    do {
      l4 = Se(5, 'abcdefghijklmnopqrstuvwxyz');
    } while (e5.destinations[l4] || e5.pending.destinations[l4]);
  if (d3.require?.length) {
    ((e5.pending.destinations[l4] = t6), await Ye2(e5));
    const n5 = e5.destinations[l4];
    return n5 ? qt2(e5, void 0, {}, { [l4]: n5 }) : Ot({ ok: true });
  }
  const f2 = { ...n4, config: d3, env: At(n4.env, r4) };
  return (
    (e5.destinations[l4] = f2),
    false !== f2.config.queue && (f2.queuePush = [...e5.queue]),
    qt2(e5, void 0, {}, { [l4]: f2 })
  );
}
async function qt2(e5, t6, n4 = {}, o3) {
  const { allowed: r4, consent: s2, globals: a4, user: g4 } = e5;
  if (!r4) return Ot({ ok: false });
  if (t6) {
    const n5 = e5.config.queueMax;
    if (void 0 === n5)
      throw new Error(
        'Collector.Config.queueMax is undefined; defaults must be seeded by collector()',
      );
    const o4 = G(e5.queue, t6, { max: n5 });
    if (o4.dropped > 0) {
      const t7 = ne(e5.status, o('collector'), 'queue', o4.dropped);
      V(
        e5.queue,
        e5.logger,
        'collector.queue overflow; oldest events dropped',
        { buffer: 'queue', cap: n5, droppedCount: t7 },
      );
    } else e5.queue.length < n5 && L(e5.queue);
    e5.status.in++;
  }
  o3 || (o3 = e5.destinations);
  const h4 = e5.transformers ? _e2(e5.transformers) : {},
    y6 = await Promise.all(
      Object.entries(o3 || {}).map(async ([o4, r5]) => {
        if (r5.config.disabled)
          return { id: o4, destination: r5, skipped: true };
        const y7 = r5.config.id || o4,
          w7 = o('destination', y7),
          b4 = Q(r5.config.breaker);
        if (
          b4 &&
          (function (e6, t7, n5) {
            const o5 = e6[t7];
            if (!o5 || 'closed' === o5.state) return false;
            if ('half-open' === o5.state) return true === o5.probing;
            const r6 = J();
            return (
              (void 0 !== o5.openUntil && r6 < o5.openUntil) ||
              ((o5.state = 'half-open'),
              (o5.probing = true),
              (o5.openUntil = r6 + n5),
              false)
            );
          })(e5.status.breakers, w7, b4.cooldown)
        )
          return { id: o4, destination: r5, skipped: true };
        const k5 = (t7) => {
            b4 && X(e5.status.breakers, w7, t7, b4.threshold, b4.cooldown);
          },
          I2 = () => {
            b4 &&
              (function (e6, t7) {
                const n5 = e6[t7];
                n5 &&
                  'half-open' === n5.state &&
                  true === n5.probing &&
                  ((n5.state = 'open'), (n5.probing = false));
              })(e5.status.breakers, w7);
          };
        let C2 = (r5.queuePush || []).map((e6) => ({ ...e6, consent: s2 }));
        ((r5.queuePush = []), t6 && C2.push(ve(t6)));
        const S3 = n4.ingest
          ? {
              ...n4.ingest,
              _meta: { ...n4.ingest._meta, path: [...n4.ingest._meta.path] },
            }
          : O('unknown');
        if (!C2.length && !r5.queueOn?.length)
          return (I2(), { id: o4, destination: r5, skipped: true });
        if (!C2.length && r5.queueOn?.length) {
          if (!Ae(r5.config.consent, s2))
            return (I2(), { id: o4, destination: r5, skipped: true });
          let t7 = false;
          try {
            t7 = await St(e5, r5, o4, true);
          } catch (t8) {
            e5.status.failed++;
            const n5 = r5.type || 'unknown';
            (e5.logger.scope(n5).error('destination init failed', {
              error: t8 instanceof Error ? t8.message : String(t8),
            }),
              k5('transport-failure'));
          }
          return (I2(), { id: o4, destination: r5, skipped: !t7 });
        }
        const j2 = [],
          $2 = C2.filter((t7) => {
            const n5 = Ae(r5.config.consent, s2, t7.consent);
            if (n5) return ((t7.consent = n5), j2.push(t7), false);
            const a5 = A(e5, {
              stepId: o('destination', o4),
              stepType: 'destination',
              phase: 'skip',
              eventId: 'string' == typeof t7.id ? t7.id : '',
              now: Date.now(),
              ...D(t7, S3, e5),
            });
            return (
              (a5.skipReason = 'consent'),
              s2 && (a5.consent = { ...s2 }),
              r5.config.consent &&
                (a5.meta = { required: { ...r5.config.consent } }),
              qt(e5, a5),
              true
            );
          });
        if ($2.length > 0) {
          const t7 = r5.queuePush,
            n5 = r5.config.id || o4,
            s3 = { max: r5.config.queueMax ?? 1e3 };
          let a5 = 0;
          for (const e6 of $2) {
            a5 += G(t7, e6, s3).dropped;
          }
          if (a5 > 0) {
            te(e5, n5);
            const o5 = ne(e5.status, o('destination', n5), 'queue', a5);
            V(
              t7,
              e5.logger.scope(r5.type || 'unknown'),
              'destination.queuePush overflow; oldest events dropped',
              {
                buffer: 'queuePush',
                destination: n5,
                cap: s3.max,
                droppedCount: o5,
              },
            );
          } else t7.length < s3.max && L(t7);
        }
        if (!j2.length) return (I2(), { id: o4, destination: r5, queue: C2 });
        let M3,
          T3,
          _3 = false;
        try {
          _3 = await St(e5, r5, o4, true);
        } catch (t7) {
          e5.status.failed++;
          const n5 = r5.type || 'unknown';
          (e5.logger.scope(n5).error('destination init failed', {
            error: t7 instanceof Error ? t7.message : String(t7),
          }),
            k5('transport-failure'));
        }
        if (!_3) return (I2(), { id: o4, destination: r5, queue: C2 });
        r5.dlq || (r5.dlq = []);
        const P2 = Ct(r5.config.before, h4, S3),
          z3 = r5.config.next,
          K3 = r5.config?.cache,
          F2 = K3 ? Tn(K3) : void 0,
          U2 = F2 ? Me2(F2, e5) : void 0,
          B = r5.config?.state ? Rn(r5.config.state) : void 0,
          H = B?.filter((e6) => 'get' === e6.mode),
          R2 = B?.filter((e6) => 'set' === e6.mode);
        let W4 = 0,
          N2 = 0;
        return (
          await Promise.all(
            j2.map(async (t7) => {
              let s3;
              if (
                ((t7.globals = oe(a4, t7.globals)),
                (t7.user = oe(g4, t7.user)),
                F2?.stop && U2)
              ) {
                const e6 = Nn(S3, t7),
                  n5 = await Cn(F2, U2, e6);
                if ('HIT' === n5?.status) return t7;
                'MISS' === n5?.status &&
                  (s3 = { key: n5.key, ttl: n5.rule.ttl });
              }
              let u4 = t7,
                d3 = n4.respond;
              if (
                P2.length > 0 &&
                e5.transformers &&
                Object.keys(e5.transformers).length > 0
              ) {
                const r6 = await Be2(
                  e5,
                  e5.transformers,
                  P2,
                  t7,
                  S3,
                  n4.respond,
                  `destination.${o4}.before`,
                );
                if (null === r6.event) return t7;
                (r6.respond && (d3 = r6.respond),
                  (u4 = Array.isArray(r6.event) ? r6.event[0] : r6.event));
              }
              if (F2 && !F2.stop && U2) {
                const e6 = Nn(S3, u4),
                  n5 = await Cn(F2, U2, e6);
                if ('HIT' === n5?.status) return t7;
                'MISS' === n5?.status &&
                  (s3 = { key: n5.key, ttl: n5.rule.ttl });
              }
              H &&
                H.length > 0 &&
                u4 &&
                (u4 = await Fn(H, (t8) => Te(t8, e5), u4, e5));
              const p4 = Date.now();
              let m5 = false;
              const v3 = await Xe(xt, (t8) => {
                const n5 = r5.type || 'unknown';
                (e5.logger
                  .scope(n5)
                  .error('Push failed', { error: t8, event: u4.name }),
                  (M3 = t8),
                  (m5 = true));
                const s4 = r5.dlq,
                  a5 = r5.config.id || o4,
                  i4 = { max: r5.config.dlqMax ?? ee },
                  c4 = G(s4, [u4, t8], i4);
                if (c4.dropped > 0) {
                  te(e5, a5);
                  const t9 = ne(
                    e5.status,
                    o('destination', a5),
                    'dlq',
                    c4.dropped,
                  );
                  V(
                    s4,
                    e5.logger.scope(r5.type || 'unknown'),
                    'destination.dlq overflow; oldest entries dropped',
                    {
                      buffer: 'dlq',
                      destination: a5,
                      cap: i4.max,
                      droppedCount: t9,
                    },
                  );
                } else s4.length < i4.max && L(s4);
              })(e5, r5, o4, u4, S3, d3);
              if (
                ((W4 += Date.now() - p4),
                s3 &&
                  U2 &&
                  void 0 === r5.config.mock &&
                  Pn(U2, s3.key, v3 ?? true, s3.ttl),
                !m5 &&
                  !kt(v3) &&
                  R2 &&
                  R2.length > 0 &&
                  u4 &&
                  (u4 = await Fn(R2, (t8) => Te(t8, e5), u4, e5)),
                void 0 === v3 || kt(v3) || (T3 = v3),
                kt(v3) && N2++,
                !m5 && z3)
              ) {
                void 0 !== v3 && (S3._response = v3);
                const t8 = Ct(z3, h4, S3);
                if (
                  t8.length > 0 &&
                  e5.transformers &&
                  Object.keys(e5.transformers).length > 0
                ) {
                  const n5 = await Be2(
                    e5,
                    e5.transformers,
                    t8,
                    u4,
                    S3,
                    d3,
                    `destination.${o4}.next`,
                  );
                  n5.respond && (d3 = n5.respond);
                }
              }
              return t7;
            }),
          ),
          {
            id: o4,
            destination: r5,
            error: M3,
            response: T3,
            totalDuration: W4,
            batchedCount: N2,
            allowedCount: j2.length,
            canonicalId: y7,
            breakerConfig: b4,
          }
        );
      }),
    ),
    w6 = {},
    b3 = {},
    k4 = {};
  for (const t7 of y6) {
    if (t7.skipped) continue;
    const n5 = t7.destination,
      o4 = { type: n5.type || 'unknown', data: t7.response };
    te(e5, t7.id);
    const r5 = e5.status.destinations[t7.id],
      s3 = Date.now();
    ((r5.queuePushSize = n5.queuePush?.length ?? 0),
      (r5.dlqSize = n5.dlq?.length ?? 0));
    const a5 = t7.breakerConfig,
      i4 = t7.canonicalId ? o('destination', t7.canonicalId) : void 0,
      c4 = (t8) => {
        a5 && i4 && X(e5.status.breakers, i4, t8, a5.threshold, a5.cooldown);
      };
    if (t7.error)
      ((o4.error = t7.error),
        (k4[t7.id] = o4),
        r5.failed++,
        (r5.lastAt = s3),
        (r5.duration += t7.totalDuration || 0),
        e5.status.failed++,
        c4('transport-failure'));
    else if (t7.queue && t7.queue.length) b3[t7.id] = o4;
    else {
      const n6 = t7.batchedCount ?? 0,
        a6 = t7.allowedCount ?? 0;
      (Math.max(0, a6 - n6) > 0 || 0 === a6) &&
        ((w6[t7.id] = o4),
        r5.count++,
        (r5.lastAt = s3),
        (r5.duration += t7.totalDuration || 0),
        e5.status.out++,
        c4('success'));
    }
  }
  return Ot({
    event: t6,
    ...(Object.keys(w6).length && { done: w6 }),
    ...(Object.keys(b3).length && { queued: b3 }),
    ...(Object.keys(k4).length && { failed: k4 }),
  });
}
async function St(e5, t6, n4, o3 = false) {
  if (t6.init && !t6.config.init) {
    if (
      !o3 &&
      (function (e6) {
        const t7 = e6.config.consent;
        return !!t7 && Object.keys(t7).length > 0;
      })(t6)
    )
      return (
        e5.logger
          .scope(t6.type || 'unknown')
          .debug('init blocked: consent gate not cleared'),
        false
      );
    const r4 = t6.type || 'unknown',
      s2 = e5.logger.scope(r4),
      a4 = {
        collector: e5,
        logger: s2,
        id: n4,
        config: t6.config,
        env: At(t6.env, t6.config.env),
        reportError: oe2(e5, 'destination', n4, s2, t6),
      };
    s2.debug('init');
    const i4 = Date.now();
    let c4;
    qt(
      e5,
      A(e5, {
        stepId: o('destination', n4),
        stepType: 'destination',
        phase: 'init',
        eventId: '',
        now: i4,
      }),
    );
    try {
      c4 = await gt(t6.init, 'DestinationInit', e5.hooks, e5.logger)(a4);
    } catch (t7) {
      const o4 = Date.now(),
        r5 = A(e5, {
          stepId: o('destination', n4),
          stepType: 'destination',
          phase: 'error',
          eventId: '',
          now: o4,
        });
      throw (
        (r5.durationMs = o4 - i4),
        (r5.error =
          t7 instanceof Error
            ? { name: t7.name, message: t7.message }
            : { message: String(t7) }),
        qt(e5, r5),
        t7
      );
    }
    if (false === c4) return c4;
    if (
      ((t6.config = { ...(c4 || t6.config), init: true }), t6.queueOn?.length)
    ) {
      const o4 = t6.queueOn;
      t6.queueOn = [];
      for (const { type: r5, data: s3 } of o4) lt(e5, t6, n4, r5, s3);
    }
    s2.debug('init done');
  }
  return true;
}
async function xt(e5, t6, n4, o3, r4, s2) {
  const { config: a4 } = t6,
    i4 = await nt(o3, a4, e5);
  if (i4.ignore) return false;
  const c4 = t6.type || 'unknown',
    u4 = e5.logger.scope(c4),
    d3 = {
      collector: e5,
      logger: u4,
      id: n4,
      config: a4,
      data: i4.data,
      rule: i4.mapping,
      ingest: r4,
      env: { ...At(t6.env, a4.env), ...(s2 ? { respond: s2 } : {}) },
      reportError: oe2(e5, 'destination', n4, u4, t6),
    };
  if (void 0 !== a4.mock)
    return (u4.debug('mock', { event: i4.event.name }), a4.mock);
  const l4 = i4.mapping,
    f2 = void 0 !== l4?.batch,
    p4 = f2 ? i4.mappingKey || '* *' : ' batch-all';
  if ((f2 || void 0 !== a4.batch) && t6.pushBatch && void 0 === a4.mock) {
    if (((t6.batches = t6.batches || {}), !t6.batches[p4])) {
      const o4 = { key: p4, entries: [], events: [], data: [] },
        r5 = It(l4?.batch),
        s3 = It(a4.batch),
        i5 = r5.wait ?? s3.wait ?? 3e4,
        c6 = r5.size ?? s3.size ?? 1e3,
        d5 = r5.age ?? s3.age ?? 3e4,
        h5 = At(t6.env, a4.env),
        v4 = De(
          async () => {
            const o5 = t6.batches[p4],
              r6 = o5.batched;
            if (0 === r6.entries.length) return;
            const s4 = {
              key: r6.key,
              entries: r6.entries,
              events: r6.events,
              data: r6.data,
            };
            ((r6.entries = []), (r6.events = []), (r6.data = []));
            const i6 = s4.entries[0],
              {
                traceId: c7,
                sourceId: d6,
                parentEventId: l5,
              } = D(i6.event, i6.ingest, e5),
              f3 = {
                collector: e5,
                logger: u4,
                id: n4,
                config: a4,
                data: void 0,
                rule: o5.isDefault ? void 0 : i6.rule,
                ingest: i6.ingest,
                env: { ...h5, ...(i6.respond ? { respond: i6.respond } : {}) },
                reportError: oe2(e5, 'destination', n4, u4, t6),
              };
            u4.debug('push batch', { events: s4.entries.length });
            const g4 = t6.config.id || n4,
              v5 = te(e5, g4),
              y7 = Q(t6.config.breaker),
              w6 = o('destination', g4),
              b4 = (t7) => {
                y7 && X(e5.status.breakers, w6, t7, y7.threshold, y7.cooldown);
              },
              I3 = Date.now(),
              C3 = A(e5, {
                stepId: o('destination', n4),
                stepType: 'destination',
                phase: 'flush',
                eventId: '',
                now: I3,
                traceId: c7,
                sourceId: d6,
                parentEventId: l5,
              });
            ((C3.batch = { size: s4.entries.length, index: 0 }), qt(e5, C3));
            const x2 = (n5) => {
              const o6 = (t6.dlq = t6.dlq || []),
                r7 = { max: t6.config.dlqMax ?? ee };
              let s5 = 0;
              for (const e6 of n5) {
                s5 += G(o6, e6, r7).dropped;
              }
              if (s5 > 0) {
                const t7 = ne(e5.status, o('destination', g4), 'dlq', s5);
                V(o6, u4, 'destination.dlq overflow; oldest entries dropped', {
                  buffer: 'dlq',
                  destination: g4,
                  cap: r7.max,
                  droppedCount: t7,
                });
              } else o6.length < r7.max && L(o6);
              ((v5.failed += n5.length),
                (v5.dlqSize = o6.length),
                (e5.status.failed += n5.length));
            };
            let O4 = s4.entries.length;
            const j2 = vt(a4.timeout),
              $2 = await Xe(
                (o6, r7) =>
                  wt(
                    Promise.resolve(
                      gt(
                        t6.pushBatch,
                        'DestinationPushBatch',
                        e5.hooks,
                        e5.logger,
                      )(o6, r7),
                    ),
                    j2,
                    `Destination "${n4}" batch delivery timed out after ${j2}ms`,
                  ),
                (t7) => {
                  O4 = 0;
                  const o6 = Date.now(),
                    r7 = A(e5, {
                      stepId: o('destination', n4),
                      stepType: 'destination',
                      phase: 'error',
                      eventId: '',
                      now: o6,
                      traceId: c7,
                      sourceId: d6,
                      parentEventId: l5,
                    });
                  ((r7.durationMs = o6 - I3),
                    (r7.error =
                      t7 instanceof Error
                        ? { name: t7.name, message: t7.message }
                        : { message: String(t7) }),
                    (r7.batch = { size: s4.entries.length, index: 0 }),
                    qt(e5, r7),
                    x2(s4.entries.map((e6) => [e6.event, t7])),
                    b4('transport-failure'),
                    u4.error('Push batch failed', {
                      error: t7 instanceof Error ? t7.message : String(t7),
                      entries: s4.entries.length,
                    }));
                },
              )(s4, f3);
            if (
              de((M3 = $2)) &&
              Array.isArray(M3.failed) &&
              $2.failed.length > 0
            ) {
              const e6 = [],
                t7 = /* @__PURE__ */ new Set();
              for (const n5 of $2.failed) {
                const o6 = s4.entries[n5.index];
                o6 &&
                  !t7.has(n5.index) &&
                  (t7.add(n5.index),
                  e6.push([
                    o6.event,
                    n5.error ??
                      new Error(
                        `Push batch entry ${n5.index} failed (no per-row error provided)`,
                      ),
                  ]));
              }
              e6.length > 0 &&
                (x2(e6),
                (O4 = Math.max(0, s4.entries.length - e6.length)),
                u4.error('Push batch partial failure', {
                  failed: e6.length,
                  delivered: O4,
                  entries: s4.entries.length,
                }));
            }
            var M3;
            (u4.debug('push batch done'),
              (v5.inFlightBatch = Math.max(
                0,
                (v5.inFlightBatch ?? 0) - s4.entries.length,
              )),
              O4 > 0 &&
                ((v5.count += O4),
                (v5.lastAt = Date.now()),
                (e5.status.out += O4),
                b4('success')));
          },
          { wait: i5, size: c6, age: d5 },
        );
      t6.batches[p4] = {
        batched: o4,
        isDefault: !f2,
        batchFn: () => {
          v4();
        },
        flush: async () => {
          await v4.flush();
        },
      };
    }
    const c5 = t6.batches[p4];
    (c5.batched.entries.push({
      event: i4.event,
      ingest: r4,
      respond: s2,
      rule: l4,
      data: i4.data,
    }),
      c5.batched.events.push(i4.event),
      fe(i4.data) && c5.batched.data.push(i4.data));
    const d4 = 'string' == typeof i4.event.id ? i4.event.id : '',
      h4 = D(o3, r4, e5),
      v3 = Date.now(),
      y6 = A(e5, {
        stepId: o('destination', n4),
        stepType: 'destination',
        phase: 'in',
        eventId: d4,
        now: v3,
        traceId: h4.traceId,
        sourceId: h4.sourceId,
        parentEventId: h4.parentEventId,
      });
    (i4.mappingKey && (y6.mappingKey = i4.mappingKey),
      i4.event.consent && (y6.consent = { ...i4.event.consent }),
      (y6.inEvent = i4.event),
      qt(e5, y6));
    const b3 = A(e5, {
      stepId: o('destination', n4),
      stepType: 'destination',
      phase: 'out',
      eventId: d4,
      now: v3,
      traceId: h4.traceId,
      sourceId: h4.sourceId,
      parentEventId: h4.parentEventId,
    });
    (i4.mappingKey && (b3.mappingKey = i4.mappingKey),
      (b3.outEvent = i4.event),
      (b3.batch = {
        size: c5.batched.entries.length,
        index: c5.batched.entries.length - 1,
      }),
      qt(e5, b3));
    const I2 = t6.config.id || n4,
      C2 = te(e5, I2);
    return ((C2.inFlightBatch = (C2.inFlightBatch ?? 0) + 1), c5.batchFn(), bt);
  }
  {
    let s3;
    if (
      (u4.debug('push', { event: i4.event.name }),
      'trace' === e5.observeLevel?.() &&
        Array.isArray(t6.calls) &&
        t6.calls.length > 0)
    ) {
      const e6 = _({ ...d3.env, simulation: t6.calls });
      ((d3.env = e6.wrappedEnv),
        (s3 = e6.calls),
        e6.unresolved.length > 0 &&
          (e6.wrappedEnv[rn] = {
            paths: e6.unresolved,
            record: (t7, n5) =>
              e6.calls.push({ fn: t7, args: n5, ts: Date.now() }),
          }));
    }
    const c5 = 'string' == typeof i4.event.id ? i4.event.id : '',
      { traceId: l5, sourceId: f3, parentEventId: p5 } = D(o3, r4, e5),
      g4 = Date.now(),
      h4 = A(e5, {
        stepId: o('destination', n4),
        stepType: 'destination',
        phase: 'in',
        eventId: c5,
        now: g4,
        traceId: l5,
        sourceId: f3,
        parentEventId: p5,
      });
    (i4.mappingKey && (h4.mappingKey = i4.mappingKey),
      i4.event.consent && (h4.consent = { ...i4.event.consent }),
      (h4.inEvent = i4.event),
      qt(e5, h4));
    try {
      const o4 = vt(a4.timeout),
        r5 = await wt(
          Promise.resolve(
            gt(t6.push, 'DestinationPush', e5.hooks, e5.logger)(i4.event, d3),
          ),
          o4,
          `Destination "${n4}" delivery timed out after ${o4}ms`,
        ),
        h5 = Date.now(),
        v3 = A(e5, {
          stepId: o('destination', n4),
          stepType: 'destination',
          phase: 'out',
          eventId: c5,
          now: h5,
          traceId: l5,
          sourceId: f3,
          parentEventId: p5,
        });
      return (
        (v3.durationMs = h5 - g4),
        (v3.outEvent = i4.event),
        s3 && s3.length > 0 && (v3.calls = K(s3)),
        fe(r5) && (v3.meta = { ...v3.meta, response: r5 }),
        i4.mappingKey && (v3.mappingKey = i4.mappingKey),
        qt(e5, v3),
        u4.debug('push done'),
        r5
      );
    } catch (t7) {
      const o4 = Date.now(),
        r5 = A(e5, {
          stepId: o('destination', n4),
          stepType: 'destination',
          phase: 'error',
          eventId: c5,
          now: o4,
          traceId: l5,
          sourceId: f3,
          parentEventId: p5,
        });
      throw (
        (r5.durationMs = o4 - g4),
        (r5.error =
          t7 instanceof Error
            ? { name: t7.name, message: t7.message }
            : { message: String(t7) }),
        s3 && s3.length > 0 && (r5.calls = K(s3)),
        i4.mappingKey && (r5.mappingKey = i4.mappingKey),
        qt(e5, r5),
        t7
      );
    }
  }
}
function Ot(e5) {
  return { ok: !e5?.failed, ...e5 };
}
function jt(e5) {
  const { code: t6, config: n4 = {}, env: o3 = {}, cache: r4, state: s2 } = e5,
    { config: a4 } = Pe2(e5, 'before'),
    { config: i4 } = Pe2({ ...e5, config: a4 }, 'next'),
    c4 = { ...t6.config, ...n4, ...i4 };
  (r4 && (c4.cache = r4),
    void 0 !== s2 && void 0 === c4.state && (c4.state = s2));
  const u4 = At(t6.env, o3);
  return { ...t6, config: c4, env: u4 };
}
async function Dt(e5, t6 = {}) {
  const n4 = {};
  for (const [o3, r4] of Object.entries(t6))
    r4.config?.require?.length
      ? (e5.pending.destinations[o3] = r4)
      : (n4[o3] = jt(r4));
  return n4;
}
function At(e5, t6) {
  return e5 || t6
    ? t6
      ? e5 && de(e5) && de(t6)
        ? { ...e5, ...t6 }
        : t6
      : e5
    : {};
}
var Kt = 5e3;
async function Ft(e5) {
  const t6 = e5.logger;
  (await Ut(e5.sources, 'source', t6),
    await (async function (e6, t7) {
      const n4 = Object.entries(e6).flatMap(([e7, n5]) => {
        const o3 = n5.batches;
        if (!o3) return [];
        const r4 = t7.scope(n5.type || 'destination');
        return Object.values(o3).map(async (t8) => {
          let n6;
          try {
            await Promise.race([
              t8.flush(),
              new Promise((t9, o4) => {
                n6 = setTimeout(
                  () =>
                    o4(new Error(`destination '${e7}' batch flush timed out`)),
                  Kt,
                );
              }),
            ]);
          } catch (t9) {
            r4.error(`destination '${e7}' batch flush failed: ${t9}`);
          } finally {
            n6 && clearTimeout(n6);
          }
        });
      });
      await Promise.allSettled(n4);
    })(e5.destinations, t6),
    await Ut(e5.destinations, 'destination', t6),
    await Ut(e5.transformers, 'transformer', t6),
    await Ut(e5.stores, 'store', t6));
}
async function Ut(e5, t6, n4) {
  const o3 = Object.entries(e5).map(async ([e6, o4]) => {
    const r4 = o4.destroy;
    if (!r4) return;
    const s2 = o4.type || 'unknown',
      a4 = n4.scope(s2),
      i4 = { id: e6, config: o4.config, env: o4.env ?? {}, logger: a4 };
    let c4;
    try {
      await Promise.race([
        r4(i4),
        new Promise((n5, o5) => {
          c4 = setTimeout(
            () => o5(new Error(`${t6} '${e6}' destroy timed out`)),
            Kt,
          );
        }),
      ]);
    } catch (n5) {
      a4.error(`${t6} '${e6}' destroy failed: ${n5}`);
    } finally {
      c4 && clearTimeout(c4);
    }
  });
  await Promise.allSettled(o3);
}
function Bt(e5, t6) {
  (e5.stateVersion++, (e5.cellVersion[t6] = e5.stateVersion));
}
async function Ht(e5, t6, o3) {
  let s2,
    a4,
    i4 = false;
  const c4 = it(e5);
  try {
    return await (async function () {
      switch (t6) {
        case n.Commands.Config:
          de(o3) &&
            (oe(e5.config, o3, { shallow: false }), (a4 = o3), (i4 = true));
          break;
        case n.Commands.Consent:
          if (de(o3)) {
            const { update: t7 } = r2(e5, o3);
            (Bt(e5, n.Commands.Consent), (a4 = t7), (i4 = true));
          }
          break;
        case n.Commands.Custom:
          de(o3) &&
            ((e5.custom = oe(e5.custom, o3)),
            Bt(e5, n.Commands.Custom),
            (a4 = o3),
            (i4 = true));
          break;
        case n.Commands.Destination:
          de(o3) && 'code' in o3 && de(o3.code) && (s2 = await Et(e5, o3));
          break;
        case n.Commands.Globals:
          de(o3) &&
            ((e5.globals = oe(e5.globals, o3)),
            Bt(e5, n.Commands.Globals),
            (a4 = o3),
            (i4 = true));
          break;
        case n.Commands.Hook:
          if (de(o3) && ge(o3.name) && le(o3.fn)) {
            const { name: t7, fn: n4 } = o3;
            ((e5.hooks[t7] = n4), (a4 = o3), (i4 = true));
          }
          break;
        case n.Commands.On:
          if (de(o3) && ge(o3.type)) {
            const { type: t7, rules: n4 } = o3;
            await dt(e5, t7, n4);
          }
          break;
        case n.Commands.Ready:
          i4 = true;
          break;
        case n.Commands.Run:
          ((s2 = await Vt(e5, o3)), (i4 = true));
          break;
        case n.Commands.Session:
          i4 = true;
          break;
        case n.Commands.Shutdown:
          e5.hasShutdown || ((e5.hasShutdown = true), await Ft(e5));
          break;
        case n.Commands.User:
          de(o3) &&
            (oe(e5.user, o3, { shallow: false }),
            Bt(e5, n.Commands.User),
            (a4 = o3),
            (i4 = true));
          break;
        default:
          return (
            e5.logger.warn('unknown command', { command: t6 }),
            Ot({ ok: false })
          );
      }
      i4 && (await ht(e5, t6, void 0, a4), (s2 = await qt2(e5)));
      return s2 || Ot({ ok: true });
    })();
  } finally {
    c4();
  }
}
function Rt(e5, t6) {
  return {
    timing: Math.round((Date.now() - e5.timing) / 10) / 100,
    source: { type: 'collector', schema: '4' },
    ...t6,
  };
}
function Gt(e5, t6, n4) {
  if (!t6.name) throw new Error('Event name is required');
  const [o3, r4] = t6.name.split(' ');
  if (!o3 || !r4) throw new Error('Event name is invalid');
  const {
      timestamp: s2 = Date.now(),
      name: a4 = `${o3} ${r4}`,
      data: i4 = {},
      context: c4 = {},
      globals: u4 = e5.globals,
      custom: d3 = {},
      user: l4 = e5.user,
      nested: f2 = [],
      consent: p4 = e5.consent,
      id: g4 = Me(),
      trigger: m5 = '',
      entity: h4 = o3,
      action: v3 = r4,
      timing: y6 = 0,
      source: w6 = { type: 'collector', schema: '4' },
    } = t6,
    b3 = w6.count ?? (e5.count += 1),
    k4 = w6.trace ?? n4?._meta.trace ?? e5.trace,
    I2 = { ...w6, count: b3 };
  void 0 !== k4 && (I2.trace = k4);
  const C2 = e5.name ?? w6.platform ?? 'default',
    E4 = e5.release ?? '4.2.1';
  return (
    (I2.release = { ...w6.release, [C2]: E4 }),
    {
      name: a4,
      data: i4,
      context: c4,
      globals: u4,
      custom: d3,
      user: l4,
      nested: f2,
      consent: p4,
      id: g4,
      trigger: m5,
      entity: h4,
      action: v3,
      timestamp: s2,
      timing: y6,
      source: I2,
    }
  );
}
function Wt(e5, t6, n4) {
  return Gt(e5, Rt(e5, t6), n4);
}
async function Vt(e5, t6) {
  ((e5.allowed = true),
    (e5.timing = Date.now()),
    (e5.trace = Ce()),
    (e5.count = 0),
    t6 &&
      (t6.consent &&
        ((e5.consent = oe(e5.consent, t6.consent)), Bt(e5, n.Commands.Consent)),
      t6.user && ((e5.user = oe(e5.user, t6.user)), Bt(e5, n.Commands.User)),
      t6.globals &&
        ((e5.globals = oe(e5.config.globalsStatic || {}, t6.globals)),
        Bt(e5, n.Commands.Globals)),
      t6.custom &&
        ((e5.custom = oe(e5.custom, t6.custom)), Bt(e5, n.Commands.Custom))),
    Object.values(e5.destinations).forEach((e6) => {
      e6.queuePush = [];
    }),
    (e5.queue = []),
    e5.round++,
    await Ye2(e5),
    await mt2(e5));
  return await qt2(e5);
}
function en(e5, t6) {
  const n4 = gt(
    async (n5, o3 = {}) =>
      await Xe(
        async () => {
          const r4 = Date.now(),
            {
              id: s2,
              ingest: a4,
              respond: i4,
              mapping: c4,
              preChain: u4,
              include: d3,
              exclude: l4,
            } = o3;
          let f2 = i4,
            p4 = n5;
          const g4 =
              d3 || l4
                ? (function (e6, t7, n6) {
                    let o4 = e6;
                    return (
                      t7 &&
                        (o4 = Object.fromEntries(
                          Object.entries(o4).filter(([e7]) => t7.includes(e7)),
                        )),
                      n6 &&
                        (o4 = Object.fromEntries(
                          Object.entries(o4).filter(([e7]) => !n6.includes(e7)),
                        )),
                      o4
                    );
                  })(e5.destinations, d3, l4)
                : void 0,
            m5 = a4 ?? O(s2 || 'unknown');
          if (c4) {
            const t7 = await nt(p4, c4, e5);
            if (t7.ignore) return Ot({ ok: true });
            if (c4.consent) {
              if (!Ae(c4.consent, e5.consent, t7.event.consent))
                return Ot({ ok: true });
            }
            p4 = t7.event;
          }
          if (
            u4?.length &&
            e5.transformers &&
            Object.keys(e5.transformers).length > 0
          ) {
            const n6 = await Be2(
              e5,
              e5.transformers,
              u4,
              p4,
              m5,
              f2,
              s2 ? `source.${s2}.next` : void 0,
            );
            if (null === n6.event) return Ot({ ok: true });
            if (n6.stopped)
              return (n6.respond && (f2 = n6.respond), Ot({ ok: true }));
            if ((n6.respond && (f2 = n6.respond), Array.isArray(n6.event))) {
              const o4 = await Promise.all(
                n6.event.map(async (n7) => {
                  const o5 = t6(n7),
                    r5 = Gt(e5, o5, m5);
                  return qt2(e5, r5, { id: s2, ingest: m5, respond: f2 }, g4);
                }),
              );
              if (s2) {
                e5.status.sources[s2] ||
                  (e5.status.sources[s2] = { count: 0, duration: 0 });
                const t7 = e5.status.sources[s2];
                ((t7.count += n6.event.length),
                  (t7.lastAt = Date.now()),
                  (t7.duration += Date.now() - r4));
              }
              return o4[0] ?? Ot({ ok: true });
            }
            p4 = n6.event;
          }
          const h4 = Wt(e5, p4, m5),
            v3 = await qt2(e5, h4, { id: s2, ingest: m5, respond: f2 }, g4);
          if (s2) {
            e5.status.sources[s2] ||
              (e5.status.sources[s2] = { count: 0, duration: 0 });
            const t7 = e5.status.sources[s2];
            (t7.count++,
              (t7.lastAt = Date.now()),
              (t7.duration += Date.now() - r4));
          }
          return v3;
        },
        (t7) => {
          if (t7 instanceof Ye) throw t7;
          return (
            e5.status.failed++,
            e5.logger.error('push failed', {
              event: n5,
              ingest: o3.ingest,
              error: t7,
            }),
            Ot({ ok: false })
          );
        },
      )(),
    'Push',
    e5.hooks,
    e5.logger,
  );
  return async (t7, o3) => {
    const r4 = 'string' == typeof t7.id ? t7.id : '',
      { traceId: s2, sourceId: a4, parentEventId: i4 } = D(t7, o3?.ingest, e5),
      c4 = Date.now(),
      u4 = A(e5, {
        stepId: 'collector.push',
        stepType: 'collector',
        phase: 'in',
        eventId: r4,
        now: c4,
        traceId: s2,
        sourceId: a4,
        parentEventId: i4,
      });
    ((u4.inEvent = t7), qt(e5, u4));
    try {
      const u5 = await n4(t7, o3),
        d3 = Date.now(),
        l4 = A(e5, {
          stepId: 'collector.push',
          stepType: 'collector',
          phase: 'out',
          eventId: r4,
          now: d3,
          traceId: s2,
          sourceId: a4,
          parentEventId: i4,
        });
      return ((l4.durationMs = d3 - c4), (l4.outEvent = u5), qt(e5, l4), u5);
    } catch (t8) {
      const n5 = Date.now(),
        o4 = A(e5, {
          stepId: 'collector.push',
          stepType: 'collector',
          phase: 'error',
          eventId: r4,
          now: n5,
          traceId: s2,
          sourceId: a4,
          parentEventId: i4,
        });
      throw (
        (o4.durationMs = n5 - c4),
        (o4.error =
          t8 instanceof Error
            ? { name: t8.name, message: t8.message }
            : { message: String(t8) }),
        qt(e5, o4),
        t8
      );
    }
  };
}
function an2(e5 = {}) {
  const t6 = e5.maxEntries ?? 1e4,
    n4 = e5.lowWaterMark ?? 0.8,
    o3 = e5.sweepIntervalMs ?? 6e4,
    r4 = Math.floor(t6 * n4),
    s2 = /* @__PURE__ */ new Map(),
    a4 = {
      hits: 0,
      misses: 0,
      populates: 0,
      writes: 0,
      deletes: 0,
      evictions_entries: 0,
      evictions_ttl: 0,
    };
  let i4;
  o3 > 0 &&
    ((i4 = setInterval(function () {
      const e6 = Date.now();
      let t7 = 0;
      for (const [n5, o4] of s2)
        void 0 !== o4.expires && o4.expires <= e6 && (s2.delete(n5), t7++);
      a4.evictions_ttl += t7;
    }, o3)),
    i4 && 'function' == typeof i4.unref && i4.unref());
  return {
    type: 'memory',
    config: {},
    get(e6) {
      const t7 = s2.get(e6);
      if (t7)
        return void 0 !== t7.expires && t7.expires <= Date.now()
          ? (s2.delete(e6), a4.evictions_ttl++, void a4.misses++)
          : (s2.delete(e6), s2.set(e6, t7), a4.hits++, t7.value);
      a4.misses++;
    },
    set(e6, n5, o4) {
      const i5 = !s2.has(e6);
      (i5 || s2.delete(e6),
        s2.set(e6, {
          value: n5,
          expires: void 0 !== o4 ? Date.now() + o4 : void 0,
        }),
        a4.writes++,
        i5 && a4.populates++,
        s2.size > t6 &&
          (function () {
            if (s2.size <= t6) return;
            const e7 = s2.size - r4;
            let n6 = 0;
            for (const t7 of s2.keys()) {
              if (n6 >= e7) break;
              (s2.delete(t7), n6++);
            }
            a4.evictions_entries += n6;
          })());
    },
    delete(e6) {
      s2.delete(e6) && a4.deletes++;
    },
    get counters() {
      return { ...a4 };
    },
    destroy() {
      (void 0 !== i4 && (clearInterval(i4), (i4 = void 0)), s2.clear());
    },
  };
}
function fn(e5, t6) {
  const {
      cacheConfig: n4,
      cacheStore: o3,
      namespace: r4,
      logger: s2,
      storeId: a4,
      collector: i4,
    } = t6,
    c4 = (e6, t7) => {
      if (!i4) return;
      const n5 = A(i4, {
        stepId: `store.${a4}`,
        stepType: 'store',
        phase: 'in',
        eventId: '',
        now: Date.now(),
      });
      ((n5.meta = { op: 'cache', cached: 'hit' === t7, status: t7, key: e6 }),
        qt(i4, n5));
    },
    u4 = {
      hits: 0,
      misses: 0,
      populates: 0,
      writes: 0,
      deletes: 0,
      inflight_dedups: 0,
    },
    d3 = n4.rules.map((e6) => ({
      match: e6.match ? ln(e6.match) : () => true,
      ttl: e6.ttl,
    })),
    l4 = (e6) => `${r4}:${e6}`;
  function f2(e6, t7) {
    const n5 = void 0 === t7 ? { key: e6 } : { key: e6, value: t7 };
    return d3.find((e7) => e7.match(n5));
  }
  const p4 = /* @__PURE__ */ new Map();
  return {
    type: e5.type,
    config: e5.config,
    setup: e5.setup,
    get counters() {
      return { ...u4 };
    },
    async get(t7) {
      const n5 = l4(t7),
        r5 = await o3.get(n5),
        s3 = $n(r5);
      if (void 0 !== s3) {
        if (!('expired' in s3)) return (u4.hits++, c4(t7, 'hit'), s3.value);
        try {
          await o3.delete(n5);
        } catch (e6) {
          g4('delete', t7, e6);
        }
      }
      const a5 = p4.get(n5);
      if (a5) return (u4.inflight_dedups++, c4(t7, 'hit'), a5);
      (u4.misses++, c4(t7, 'miss'));
      const i5 = (async () => {
        try {
          const r6 = await e5.get(t7);
          if (void 0 === r6) return;
          const s4 = f2(t7, r6);
          if (s4)
            try {
              const e6 = 1e3 * s4.ttl;
              (await o3.set(n5, kn(r6, e6), e6), u4.populates++);
            } catch (e6) {
              g4('set', t7, e6);
            }
          return r6;
        } finally {
          p4.delete(n5);
        }
      })();
      return (p4.set(n5, i5), i5);
    },
    async set(t7, n5, r5) {
      (u4.writes++, await e5.set(t7, n5, r5));
      const s3 = f2(t7, n5);
      if (s3)
        try {
          const e6 = 1e3 * s3.ttl;
          await o3.set(l4(t7), kn(n5, e6), e6);
        } catch (e6) {
          g4('set', t7, e6);
        }
    },
    async delete(t7) {
      (u4.deletes++, await e5.delete(t7));
      try {
        await o3.delete(l4(t7));
      } catch (e6) {
        g4('delete', t7, e6);
      }
    },
  };
  function g4(e6, t7, n5) {
    const o4 = `store-cache(${a4}): cache ${e6} failed for "${t7}"; backing succeeded, continuing`;
    s2 ? s2.warn(o4, { error: n5 }) : console.warn(o4, n5);
  }
}
function pn2(e5, t6, n4) {
  const o3 = `store.${n4}`,
    r4 = gt(t6.get, 'StoreGet', e5.hooks, e5.logger),
    s2 = gt(t6.set, 'StoreSet', e5.hooks, e5.logger),
    a4 = gt(t6.delete, 'StoreDelete', e5.hooks, e5.logger);
  ((t6.get = async (t7) => {
    const n5 = Date.now(),
      s3 = A(e5, {
        stepId: o3,
        stepType: 'store',
        phase: 'in',
        eventId: '',
        now: n5,
      });
    ((s3.meta = { op: 'get', key: t7 }), qt(e5, s3));
    try {
      const s4 = await r4(t7),
        a5 = Date.now(),
        i4 = A(e5, {
          stepId: o3,
          stepType: 'store',
          phase: 'out',
          eventId: '',
          now: a5,
        });
      return (
        (i4.durationMs = a5 - n5),
        (i4.meta = { op: 'get', key: t7 }),
        qt(e5, i4),
        s4
      );
    } catch (r5) {
      const s4 = Date.now(),
        a5 = A(e5, {
          stepId: o3,
          stepType: 'store',
          phase: 'error',
          eventId: '',
          now: s4,
        });
      throw (
        (a5.durationMs = s4 - n5),
        (a5.meta = { op: 'get', key: t7 }),
        (a5.error =
          r5 instanceof Error
            ? { name: r5.name, message: r5.message }
            : { message: String(r5) }),
        qt(e5, a5),
        r5
      );
    }
  }),
    (t6.set = async (t7, n5, r5) => {
      const a5 = Date.now(),
        i4 = A(e5, {
          stepId: o3,
          stepType: 'store',
          phase: 'in',
          eventId: '',
          now: a5,
        });
      ((i4.meta = { op: 'set', key: t7 }), qt(e5, i4));
      try {
        await s2(t7, n5, r5);
        const i5 = Date.now(),
          c4 = A(e5, {
            stepId: o3,
            stepType: 'store',
            phase: 'out',
            eventId: '',
            now: i5,
          });
        ((c4.durationMs = i5 - a5),
          (c4.meta = { op: 'set', key: t7 }),
          qt(e5, c4));
      } catch (n6) {
        const r6 = Date.now(),
          s3 = A(e5, {
            stepId: o3,
            stepType: 'store',
            phase: 'error',
            eventId: '',
            now: r6,
          });
        throw (
          (s3.durationMs = r6 - a5),
          (s3.meta = { op: 'set', key: t7 }),
          (s3.error =
            n6 instanceof Error
              ? { name: n6.name, message: n6.message }
              : { message: String(n6) }),
          qt(e5, s3),
          n6
        );
      }
    }),
    (t6.delete = async (t7) => {
      const n5 = Date.now(),
        r5 = A(e5, {
          stepId: o3,
          stepType: 'store',
          phase: 'in',
          eventId: '',
          now: n5,
        });
      ((r5.meta = { op: 'delete', key: t7 }), qt(e5, r5));
      try {
        await a4(t7);
        const r6 = Date.now(),
          s3 = A(e5, {
            stepId: o3,
            stepType: 'store',
            phase: 'out',
            eventId: '',
            now: r6,
          });
        ((s3.durationMs = r6 - n5),
          (s3.meta = { op: 'delete', key: t7 }),
          qt(e5, s3));
      } catch (r6) {
        const s3 = Date.now(),
          a5 = A(e5, {
            stepId: o3,
            stepType: 'store',
            phase: 'error',
            eventId: '',
            now: s3,
          });
        throw (
          (a5.durationMs = s3 - n5),
          (a5.meta = { op: 'delete', key: t7 }),
          (a5.error =
            r6 instanceof Error
              ? { name: r6.name, message: r6.message }
              : { message: String(r6) }),
          qt(e5, a5),
          r6
        );
      }
    }));
}
async function gn2(e5, t6 = {}) {
  const n4 = {};
  for (const [o4, r5] of Object.entries(t6)) {
    const { code: t7, config: s2 = {}, env: a4 = {} } = r5,
      i4 = e5.logger.scope('store').scope(o4),
      c4 = {
        collector: e5,
        logger: i4,
        id: o4,
        config: s2,
        env: a4,
        reportError: oe2(e5, 'store', o4, i4),
      },
      u4 = await t7(c4);
    n4[o4] = u4;
  }
  const o3 = t6,
    r4 = (function (e6) {
      const t7 = {};
      for (const n6 of Object.keys(e6)) t7[n6] = 'WHITE';
      const n5 = [],
        o4 = [];
      function r5(s2) {
        const a4 = t7[s2];
        if ('BLACK' === a4) return;
        if ('GRAY' === a4) {
          const e7 = o4.indexOf(s2),
            t8 = o4
              .slice(-1 === e7 ? 0 : e7)
              .concat(s2)
              .join(' -> ');
          throw new Error(`Cycle in cache.store chain: ${t8}`);
        }
        ((t7[s2] = 'GRAY'), o4.push(s2));
        const i4 = e6[s2].cache?.store;
        if (void 0 !== i4) {
          if (!(i4 in e6))
            throw new Error(
              `Store "${s2}" cache.store references "${i4}", which is not declared in flow.stores`,
            );
          r5(i4);
        }
        (o4.pop(), (t7[s2] = 'BLACK'), n5.push(s2));
      }
      for (const n6 of Object.keys(e6)) 'WHITE' === t7[n6] && r5(n6);
      return n5;
    })(o3);
  for (const t7 of r4) {
    const r5 = o3[t7].cache;
    if (!r5) continue;
    let s2, a4;
    void 0 !== r5.store
      ? ((s2 = n4[r5.store]), (a4 = r5.store))
      : (n4.__cache || (n4.__cache = an2()),
        (s2 = n4.__cache),
        (a4 = '__cache'));
    const i4 = r5.namespace ?? t7;
    (e5.logger
      .scope('store-cache')
      .scope(t7)
      .info(`store "${t7}" caches with namespace "${i4}:" via ${a4}`),
      (n4[t7] = fn(n4[t7], {
        storeId: t7,
        cacheConfig: r5,
        cacheStore: s2,
        namespace: i4,
        logger: e5.logger.scope('store-cache').scope(t7),
        collector: e5,
      })));
  }
  for (const [t7, o4] of Object.entries(n4))
    '__cache' !== t7 && pn2(e5, o4, t7);
  return n4;
}
async function mn2(e5) {
  const t6 = oe(
      { globalsStatic: {}, sessionStatic: {}, run: true, queueMax: 1e3 },
      e5,
      { merge: false, extend: false },
    ),
    n4 = { level: e5.logger?.level, handler: e5.logger?.handler },
    o3 = We(n4),
    r4 = { ...t6.globalsStatic, ...e5.globals },
    i4 = {
      allowed: false,
      config: t6,
      consent: e5.consent || {},
      custom: e5.custom || {},
      destinations: {},
      transformers: {},
      stores: {},
      globals: r4,
      hooks: e5.hooks || {},
      observers: /* @__PURE__ */ new Set(),
      logger: o3,
      on: {},
      queue: [],
      round: 0,
      count: 0,
      stateVersion: 0,
      cellVersion: {},
      delivery: /* @__PURE__ */ new WeakMap(),
      session: void 0,
      status: {
        startedAt: Date.now(),
        in: 0,
        out: 0,
        failed: 0,
        sources: {},
        destinations: {},
        dropped: {},
        connectionErrors: {},
        breakers: {},
      },
      timing: Date.now(),
      user: e5.user || {},
      sources: {},
      pending: { destinations: {} },
      hasShutdown: false,
      seenEvents: /* @__PURE__ */ new Set(),
      push: void 0,
      command: void 0,
      elb: void 0,
    };
  (void 0 !== e5.name && (i4.name = e5.name),
    void 0 !== e5.release && (i4.release = e5.release),
    (i4.push = en(i4, (e6) => Rt(i4, e6))),
    (i4.command = (function (e6, t7) {
      return gt(
        async (n5, o4, r5) =>
          await Xe(
            async () => await t7(e6, n5, o4, r5),
            (t8) => {
              if (t8 instanceof Ye) throw t8;
              return (
                e6.status.failed++,
                e6.logger.error('command failed', {
                  command: n5,
                  data: o4,
                  error: t8,
                }),
                Ot({ ok: false })
              );
            },
          )(),
        'Command',
        e6.hooks,
        e6.logger,
      );
    })(i4, Ht)),
    (i4.elb = /* @__PURE__ */ (function (e6) {
      return async (t7, n5, o4, r5, s2) => {
        if ('string' == typeof t7 && t7.startsWith('walker ')) {
          const o5 = t7.replace('walker ', '');
          return e6.command(o5, n5);
        }
        let a4;
        if ('string' == typeof t7)
          ((a4 = { name: t7 }),
            n5 &&
              'object' == typeof n5 &&
              !Array.isArray(n5) &&
              (a4.data = n5));
        else {
          if (!t7 || 'object' != typeof t7 || Array.isArray(t7))
            return Ot({ ok: false });
          ((a4 = { ...t7 }),
            n5 &&
              'object' == typeof n5 &&
              !Array.isArray(n5) &&
              (a4.data = { ...(a4.data || {}), ...n5 }));
        }
        return (
          o4 && 'object' == typeof o4 && (a4.context = o4),
          r5 && Array.isArray(r5) && (a4.nested = r5),
          s2 && 'object' == typeof s2 && (a4.custom = s2),
          e6.push(a4)
        );
      };
    })(i4)));
  const c4 = e5.stores || {};
  return (
    (i4.stores = await gn2(i4, c4)),
    (function (e6, t7, n5) {
      const o4 = /* @__PURE__ */ new Map();
      for (const [n6, r6] of Object.entries(e6)) t7[n6] && o4.set(r6, t7[n6]);
      if (0 !== o4.size) {
        for (const e7 of [n5.transformers, n5.destinations, n5.sources])
          if (e7) for (const t8 of Object.values(e7)) r5(t8.env);
      }
      function r5(e7) {
        if (e7) {
          for (const [t8, n6] of Object.entries(e7))
            if ('object' == typeof n6 && null !== n6) {
              const r6 = o4.get(n6);
              r6 && (e7[t8] = r6);
            }
        }
      }
    })(c4, i4.stores, e5),
    i4.stores.__cache || (i4.stores.__cache = an2()),
    (i4.destinations = await Dt(i4, e5.destinations || {})),
    (i4.transformers = await (async function (e6, t7 = {}) {
      const n5 = {};
      for (const [o4, r5] of Object.entries(t7)) {
        const { code: t8, env: s2 = {} } = r5,
          a4 = Bn(r5, 'Transformer');
        if (!a4.ok) {
          e6.logger.warn(
            `Transformer ${o4} invalid (${a4.code}): ${a4.reason}. Skipping.`,
          );
          continue;
        }
        const { config: i5 } = Pe2(r5, 'before'),
          { config: c5 } = Pe2({ ...r5, config: i5 }, 'next'),
          u4 = Object.keys(s2).length > 0 ? { ...c5, env: s2 } : c5,
          { cache: d3 } = r5,
          l4 = d3 ? { ...u4, cache: d3 } : u4,
          f2 = r5.config?.state ?? r5.state,
          p4 = void 0 !== f2 && void 0 === l4.state ? { ...l4, state: f2 } : l4,
          g4 = e6.logger.scope('transformer').scope(o4),
          m5 = {
            collector: e6,
            logger: g4,
            id: o4,
            ingest: O(o4),
            config: p4,
            env: s2,
            reportError: oe2(e6, 'transformer', o4, g4),
          },
          h4 =
            t8 ??
            ((e7) => {
              const t9 = r5.mapping;
              if (t9) {
                const n6 = [];
                if ((void 0 !== t9.data && n6.push('data'), t9.mapping)) {
                  for (const [e8, o5] of Object.entries(t9.mapping))
                    if ('object' == typeof o5 && null !== o5)
                      for (const [t10, r6] of Object.entries(o5)) {
                        if ('object' != typeof r6 || null === r6) continue;
                        const o6 = r6;
                        (void 0 !== o6.data &&
                          n6.push(`mapping[${e8}][${t10}].data`),
                          void 0 !== o6.silent &&
                            n6.push(`mapping[${e8}][${t10}].silent`));
                      }
                }
                return (
                  n6.length > 0 &&
                    e7.collector.logger.warn(
                      `Transformer ${o4}: \`${n6.join(', ')}\` ignored at transformer position (only event-mutating fields apply).`,
                    ),
                  {
                    type: 'pass',
                    config: e7.config,
                    push: async (n7) => {
                      const o5 = await nt(n7, t9, e7.collector);
                      return !o5.ignore && { event: o5.event };
                    },
                  }
                );
              }
              return {
                type: 'pass',
                config: e7.config,
                push: (e8) => ({ event: e8 }),
              };
            }),
          v3 = await h4(m5);
        (void 0 !== r5.before &&
          void 0 === v3.config?.before &&
          (v3.config = { ...(v3.config ?? {}), before: r5.before }),
          void 0 !== r5.next &&
            void 0 === v3.config?.next &&
            (v3.config = { ...(v3.config ?? {}), next: r5.next }),
          void 0 !== f2 &&
            void 0 === v3.config?.state &&
            (v3.config = { ...(v3.config ?? {}), state: f2 }),
          (n5[o4] = v3));
      }
      return n5;
    })(i4, e5.transformers || {})),
    i4
  );
}
async function hn2(e5) {
  e5 = e5 || {};
  const t6 = await mn2(e5);
  await Ne(t6, e5.sources || {});
  const { consent: n4, user: o3, globals: r4, custom: s2 } = e5;
  (n4 && (await t6.command('consent', n4)),
    o3 && (await t6.command('user', o3)),
    r4 && (await t6.command('globals', r4)),
    s2 && (await t6.command('custom', s2)),
    t6.config.run && (await t6.command('run')));
  let a4 = t6.elb;
  const i4 = Object.values(t6.sources),
    c4 = i4.find((e6) => e6.config.primary);
  return (
    c4 ? (a4 = c4.push) : i4.length > 0 && (a4 = i4[0].push),
    { collector: t6, elb: a4 }
  );
}

// packages/web/core/dist/index.mjs
function t3(e5, t6) {
  return (e5.getAttribute(t6) || '').trim();
}
function d(e5, t6, o3, n4) {
  const r4 = /* @__PURE__ */ new Map();
  return new Proxy(e5, {
    get(e6, i4) {
      if ('string' != typeof i4) return Reflect.get(e6, i4, e6);
      const s2 = r4.get(i4);
      if (void 0 !== s2) return s2;
      if (t6.some((e7) => 1 === e7.length && e7[0] === i4)) {
        const t7 = Reflect.get(e6, i4, e6);
        if ('function' != typeof t7) return t7;
        const s3 = `${n4}.${i4}`,
          c5 = (...n5) => {
            try {
              o3(s3, n5);
            } catch {}
            return t7.apply(e6, n5);
          };
        return (r4.set(i4, c5), c5);
      }
      const c4 = t6
        .filter((e7) => e7.length > 1 && e7[0] === i4)
        .map((e7) => e7.slice(1));
      if (c4.length > 0) {
        const t7 = Reflect.get(e6, i4, e6);
        if (null === t7 || 'object' != typeof t7) return t7;
        const s3 = d(t7, c4, o3, `${n4}.${i4}`);
        return (r4.set(i4, s3), s3);
      }
      return Reflect.get(e6, i4, e6);
    },
  });
}
function w2(e5) {
  const t6 = {
      window: 'undefined' != typeof window ? window : globalThis.window,
      document: 'undefined' != typeof document ? document : globalThis.document,
      ...e5,
    },
    o3 = e5 && e5[rn];
  if (on(o3)) {
    delete t6[rn];
    const e6 = /* @__PURE__ */ new Map();
    for (const t7 of o3.paths) {
      const o4 = an(t7),
        n4 = o4[0];
      if (void 0 === n4) continue;
      const r4 = e6.get(n4) ?? [];
      (r4.push(o4.slice(1)), e6.set(n4, r4));
    }
    for (const [n4, r4] of e6) {
      const e7 = t6[n4];
      null !== e7 &&
        'object' == typeof e7 &&
        (t6[n4] = d(e7, r4, o3.record, n4));
    }
  }
  return t6;
}
function h2(e5, t6, o3) {
  let n4 = e5.elementFromPoint(t6, o3);
  for (; n4 && n4.shadowRoot; ) {
    const e6 = n4.shadowRoot.elementFromPoint(t6, o3);
    if (!e6 || e6 === n4) break;
    n4 = e6;
  }
  return n4;
}
function p(e5, t6) {
  const o3 = [];
  let n4 = e5;
  for (; n4; ) {
    let e6 = n4.parentElement;
    if (!e6) {
      const o4 = n4.getRootNode();
      o4 instanceof t6.self.ShadowRoot && (e6 = o4.host);
    }
    if (!e6) break;
    (o3.push(e6), (n4 = e6));
  }
  return o3;
}
function y2(e5, t6) {
  const o3 = [];
  let n4 = e5.getRootNode();
  for (; n4 instanceof t6.self.ShadowRoot; )
    (o3.push(n4.host), (n4 = n4.host.getRootNode()));
  return o3;
}
function S(e5, t6, o3) {
  const n4 = t6.getComputedStyle(e5);
  if ('none' === n4.display) return false;
  if ('visible' !== n4.visibility) return false;
  if (n4.opacity && Number(n4.opacity) < 0.1) return false;
  const r4 = t6.innerHeight,
    i4 = e5.getBoundingClientRect(),
    s2 = i4.height,
    c4 = i4.y,
    a4 = c4 + s2,
    u4 = { x: i4.x + e5.offsetWidth / 2, y: i4.y + e5.offsetHeight / 2 };
  let l4, f2;
  if (s2 <= r4) {
    if (e5.offsetWidth + i4.width === 0 || e5.offsetHeight + i4.height === 0)
      return false;
    if (u4.x < 0) return false;
    if (u4.x > (o3.documentElement.clientWidth || t6.innerWidth)) return false;
    if (u4.y < 0) return false;
    if (u4.y > (o3.documentElement.clientHeight || t6.innerHeight))
      return false;
    ((l4 = u4.x), (f2 = u4.y));
  } else {
    const e6 = r4 / 2;
    if (c4 < 0 && a4 < e6) return false;
    if (a4 > r4 && c4 > e6) return false;
    ((l4 = u4.x), (f2 = r4 / 2));
  }
  const d3 = h2(o3, l4, f2);
  return (
    !!d3 && (d3 === e5 || !!p(d3, t6).includes(e5) || !!y2(e5, t6).includes(d3))
  );
}
function N(e5, t6 = E.Utils.Storage.Session, o3) {
  try {
    switch (t6) {
      case E.Utils.Storage.Cookie:
        E2(e5, '', 0, t6, void 0, o3);
        break;
      case E.Utils.Storage.Local:
        (o3?.window ?? window).localStorage.removeItem(e5);
        break;
      case E.Utils.Storage.Session:
        (o3?.window ?? window).sessionStorage.removeItem(e5);
    }
  } catch (e6) {}
}
function W2(e5, t6 = E.Utils.Storage.Session, o3) {
  function n4(e6) {
    try {
      return JSON.parse(e6 || '');
    } catch (t7) {
      let o4 = 1,
        n5 = '';
      return (e6 && ((o4 = 0), (n5 = e6)), { e: o4, v: n5 });
    }
  }
  let r4, i4;
  try {
    switch (t6) {
      case E.Utils.Storage.Cookie:
        r4 = decodeURIComponent(
          (o3?.document ?? document).cookie
            .split('; ')
            .find((t7) => t7.startsWith(e5 + '='))
            ?.split('=')[1] || '',
        );
        break;
      case E.Utils.Storage.Local:
        i4 = n4((o3?.window ?? window).localStorage.getItem(e5));
        break;
      case E.Utils.Storage.Session:
        i4 = n4((o3?.window ?? window).sessionStorage.getItem(e5));
    }
  } catch (e6) {
    return je('');
  }
  return (
    i4 &&
      ((r4 = i4.v),
      0 != i4.e && i4.e < Date.now() && (N(e5, t6, o3), (r4 = ''))),
    je(r4 || '')
  );
}
function E2(e5, t6, o3 = 30, n4 = E.Utils.Storage.Session, r4, i4) {
  const s2 = { e: Date.now() + 6e4 * o3, v: String(t6) },
    c4 = JSON.stringify(s2);
  try {
    switch (n4) {
      case E.Utils.Storage.Cookie: {
        t6 = 'object' == typeof t6 ? JSON.stringify(t6) : t6;
        let n5 = `${e5}=${encodeURIComponent(t6)}; max-age=${60 * o3}; path=/; SameSite=Lax; secure`;
        (r4 && (n5 += '; domain=' + r4),
          ((i4?.document ?? document).cookie = n5));
        break;
      }
      case E.Utils.Storage.Local:
        (i4?.window ?? window).localStorage.setItem(e5, c4);
        break;
      case E.Utils.Storage.Session:
        (i4?.window ?? window).sessionStorage.setItem(e5, c4);
    }
  } catch (e6) {
    return je('');
  }
  return W2(e5, n4, i4);
}

// packages/web/sources/browser/dist/index.mjs
function m2(e5, t6, n4 = true) {
  return e5 + (t6 = null != t6 ? (n4 ? '-' : '') + t6 : '');
}
function g2(e5, t6, n4, o3 = true) {
  return x(t3(t6, m2(e5, n4, o3)) || '').reduce((e6, n5) => {
    let [o4, r4] = $(n5);
    if (!o4) return e6;
    if (
      (r4 || (o4.endsWith(':') && (o4 = o4.slice(0, -1)), (r4 = '')),
      r4.startsWith('#'))
    ) {
      r4 = r4.slice(1);
      try {
        let e7 = t6[r4];
        (e7 || 'selected' !== r4 || (e7 = t6.options[t6.selectedIndex].text),
          (r4 = String(e7)));
      } catch (e7) {
        r4 = '';
      }
    }
    return (
      o4.endsWith('[]')
        ? ((o4 = o4.slice(0, -2)),
          ie(e6[o4]) || (e6[o4] = []),
          e6[o4].push(je(r4)))
        : (e6[o4] = je(r4)),
      e6
    );
  }, {});
}
function b2(e5, t6, n4 = n.Commands.Prefix) {
  const o3 = [],
    { actions: r4, nearestOnly: s2 } = (function (e6, t7, n5) {
      let o4 = t7;
      for (; o4; ) {
        const t8 = t3(o4, m2(e6, n.Commands.Actions, false));
        if (t8) {
          const e7 = v(t8);
          if (e7[n5]) return { actions: e7[n5], nearestOnly: false };
        }
        const r5 = t3(o4, m2(e6, n.Commands.Action, false));
        if (r5) {
          const e7 = v(r5);
          if (e7[n5] || 'click' !== n5)
            return { actions: e7[n5] || [], nearestOnly: true };
        }
        o4 = k2(e6, o4);
      }
      return { actions: [], nearestOnly: false };
    })(n4, e5, t6);
  return r4.length
    ? (r4.forEach((r5) => {
        const i4 = x(r5.actionParams || '', ',').reduce(
            (e6, t7) => ((e6[mt(t7)] = true), e6),
            {},
          ),
          c4 = w3(n4, e5, i4, s2);
        if (!c4.length) {
          const t7 = 'page',
            o4 = `[${m2(n4, t7)}]`,
            [r6, s3] = E3(e5, o4, n4, t7);
          c4.push({ entity: t7, data: r6, nested: [], context: s3 });
        }
        c4.forEach((e6) => {
          var n5;
          o3.push({
            entity: e6.entity,
            action: r5.action,
            data: e6.data,
            trigger: t6,
            context: e6.context,
            nested: null != (n5 = e6.nested) ? n5 : [],
          });
        });
      }),
      o3)
    : o3;
}
function p2(e5 = n.Commands.Prefix, t6) {
  if (!t6) return {};
  const n4 = m2(e5, n.Commands.Globals, false);
  let o3 = {};
  return (
    O2(t6, `[${n4}]`, (t7) => {
      o3 = oe(o3, g2(e5, t7, n.Commands.Globals, false));
    }),
    o3
  );
}
function v(e5) {
  const t6 = {};
  return (
    x(e5).forEach((e6) => {
      const [n4, o3] = $(e6),
        [r4, s2] = j(n4);
      if (!r4) return;
      let [i4, c4] = j(o3 || '');
      ((i4 = i4 || r4),
        t6[r4] || (t6[r4] = []),
        t6[r4].push({
          trigger: r4,
          triggerParams: s2,
          action: i4,
          actionParams: c4,
        }));
    }),
    t6
  );
}
function w3(e5, t6, n4, o3 = false) {
  const r4 = [];
  let s2 = t6;
  for (n4 = 0 !== Object.keys(n4 || {}).length ? n4 : void 0; s2; ) {
    const i4 = y3(e5, s2, t6, n4);
    if (i4 && (r4.push(i4), o3)) break;
    s2 = k2(e5, s2);
  }
  return r4;
}
function y3(e5, t6, n4, o3) {
  const r4 = t3(t6, m2(e5));
  if (!r4 || (o3 && !o3[r4])) return null;
  const s2 = [t6],
    i4 = `[${m2(e5, r4)}],[${m2(e5, '')}]`,
    l4 = m2(e5, n.Commands.Link, false);
  let a4 = {};
  const u4 = [],
    [h4, b3] = E3(n4 || t6, i4, e5, r4, true);
  C(t6, `[${l4}]`, (n5) => {
    const [o4, r5] = $(t3(n5, l4));
    'parent' === r5 &&
      C(t6.ownerDocument.body, `[${l4}="${o4}:child"]`, (t7) => {
        s2.push(t7);
        const n6 = y3(e5, t7);
        n6 && u4.push(n6);
      });
  });
  const p4 = [];
  s2.forEach((e6) => {
    (e6.matches(i4) && p4.push(e6), C(e6, i4, (e7) => p4.push(e7)));
  });
  let v3 = {};
  return (
    p4.forEach((t7) => {
      ((v3 = oe(v3, g2(e5, t7, ''))), (a4 = oe(a4, g2(e5, t7, r4))));
    }),
    (a4 = oe(oe(v3, a4), h4)),
    s2.forEach((t7) => {
      C(t7, `[${m2(e5)}]`, (t8) => {
        const n5 = y3(e5, t8);
        n5 && u4.push(n5);
      });
    }),
    { entity: r4, data: a4, context: b3, nested: u4 }
  );
}
function k2(e5, t6) {
  const n4 = m2(e5, n.Commands.Link, false);
  if (t6.matches(`[${n4}]`)) {
    const [e6, o4] = $(t3(t6, n4));
    if ('child' === o4) {
      const o5 = t6.ownerDocument;
      let r4 = null;
      return (
        O2(o5, `[${n4}="${e6}:parent"]`, (e7) => {
          r4 || (r4 = e7);
        }),
        r4
      );
    }
  }
  const o3 = t6.ownerDocument.defaultView;
  return !t6.parentElement &&
    t6.getRootNode &&
    t6.getRootNode() instanceof o3.ShadowRoot
    ? t6.getRootNode().host
    : t6.parentElement;
}
function E3(e5, t6, n4, o3, r4 = false) {
  let s2 = {};
  const i4 = {};
  let l4 = e5;
  const a4 = `[${m2(n4, n.Commands.Context, false)}]`,
    u4 = n.Commands.Scoped,
    d3 = `[${m2(n4, u4, false)}]`;
  let h4 = 0;
  for (; l4; )
    (r4 && u4 && l4.matches(d3) && (s2 = oe(g2(n4, l4, u4, false), s2)),
      l4.matches(t6) &&
        ((s2 = oe(g2(n4, l4, ''), s2)), (s2 = oe(g2(n4, l4, o3), s2))),
      l4.matches(a4) &&
        (Object.entries(g2(n4, l4, n.Commands.Context, false)).forEach(
          ([e6, t7]) => {
            t7 && !i4[e6] && (i4[e6] = [t7, h4]);
          },
        ),
        ++h4),
      (l4 = k2(n4, l4)));
  return [s2, i4];
}
function O2(e5, t6, n4) {
  e5.querySelectorAll(t6).forEach(n4);
}
function C(e5, t6, n4) {
  e5.querySelectorAll(t6).forEach(n4);
  (e5 instanceof (e5.ownerDocument || e5).defaultView.Element &&
    e5.shadowRoot &&
    C(e5.shadowRoot, t6, n4),
    e5.querySelectorAll('*').forEach((e6) => {
      e6.shadowRoot && C(e6.shadowRoot, t6, n4);
    }));
}
function x(e5, t6 = ';') {
  if (!e5) return [];
  const n4 = new RegExp(`(?:[^${t6}']+|'[^']*')+`, 'ig');
  return e5.match(n4) || [];
}
function $(e5) {
  const [t6, n4] = e5.split(/:(.+)/, 2);
  return [mt(t6), mt(n4)];
}
function j(e5) {
  const [t6, n4] = e5.split('(', 2);
  return [t6, n4 ? n4.slice(0, -1) : ''];
}
var R;
var A2 = /* @__PURE__ */ new WeakMap();
var D2 = /* @__PURE__ */ new WeakMap();
var L2 = /* @__PURE__ */ new WeakMap();
function S2(e5) {
  return e5.ownerDocument || e5;
}
function T2(e5) {
  const t6 = Date.now();
  let n4 = D2.get(e5);
  if (!n4 || t6 - n4.lastChecked > 500) {
    const o3 = e5.ownerDocument.defaultView,
      r4 = e5.ownerDocument;
    ((n4 = { isVisible: S(e5, o3, r4), lastChecked: t6 }), D2.set(e5, n4));
  }
  return n4.isVisible;
}
function V2(e5, t6) {
  var n4;
  const o3 = L2.get(S2(e5));
  if (!o3) return;
  (o3.observer && o3.observer.unobserve(t6),
    null == (n4 = o3.elementConfigs) || n4.delete(t6));
  const r4 = o3.timers.get(t6);
  (r4 && (clearTimeout(r4), o3.timers.delete(t6)),
    A2.delete(t6),
    D2.delete(t6));
}
function M2(e5) {
  const t6 = (e5.ownerDocument || e5).defaultView;
  if (t6 && t6.IntersectionObserver)
    return Ge(
      () =>
        new t6.IntersectionObserver(
          (t7) => {
            t7.forEach((t8) => {
              !(function (e6, t9) {
                var n4, o3;
                const r4 = t9.target,
                  s2 = L2.get(S2(e6));
                if (!s2) return;
                const i4 = s2.timers.get(r4);
                if (t9.intersectionRatio > 0) {
                  const o4 = Date.now();
                  let c5 = A2.get(r4);
                  if (!c5 || o4 - c5.lastChecked > 1e3) {
                    const e7 = r4.ownerDocument.defaultView;
                    ((c5 = {
                      isLarge: r4.offsetHeight > e7.innerHeight,
                      lastChecked: o4,
                    }),
                      A2.set(r4, c5));
                  }
                  if (t9.intersectionRatio >= 0.5 || (c5.isLarge && T2(r4))) {
                    const t10 =
                      null == (n4 = s2.elementConfigs) ? void 0 : n4.get(r4);
                    if ((null == t10 ? void 0 : t10.multiple) && t10.blocked)
                      return;
                    if (!i4) {
                      const t11 = r4.ownerDocument.defaultView.setTimeout(
                        async () => {
                          var t12, n5;
                          if (T2(r4)) {
                            const o5 =
                              null == (t12 = s2.elementConfigs)
                                ? void 0
                                : t12.get(r4);
                            (null == o5 ? void 0 : o5.context) &&
                              (await ae2(o5.context, r4, o5.trigger));
                            const i5 =
                              null == (n5 = s2.elementConfigs)
                                ? void 0
                                : n5.get(r4);
                            (null == i5 ? void 0 : i5.multiple)
                              ? (i5.blocked = true)
                              : V2(e6, r4);
                          }
                        },
                        s2.duration,
                      );
                      s2.timers.set(r4, t11);
                    }
                    return;
                  }
                }
                i4 && (clearTimeout(i4), s2.timers.delete(r4));
                const c4 =
                  null == (o3 = s2.elementConfigs) ? void 0 : o3.get(r4);
                (null == c4 ? void 0 : c4.multiple) && (c4.blocked = false);
              })(e5, t8);
            });
          },
          { rootMargin: '0px', threshold: [0, 0.5] },
        ),
      () => {},
    )();
}
function W3(e5, t6, n4 = { multiple: false }) {
  var o3;
  const r4 = e5.settings.scope;
  if (!r4) return;
  const s2 = L2.get(S2(r4));
  (null == s2 ? void 0 : s2.observer) &&
    t6 &&
    (s2.elementConfigs || (s2.elementConfigs = /* @__PURE__ */ new WeakMap()),
    s2.elementConfigs.set(t6, {
      multiple: null != (o3 = n4.multiple) && o3,
      blocked: false,
      context: e5,
      trigger: n4.multiple ? 'visible' : 'impression',
    }),
    s2.observer.observe(t6));
}
function G2(e5, t6, n4, o3, r4, s2, i4) {
  const { elb: c4, settings: l4 } = e5;
  if (ge(t6) && t6.startsWith('walker ')) {
    if ('walker init' === t6 && e5.initScope) {
      const t7 = (function (e6, t8) {
        if (z2(e6)) return [e6];
        if (Array.isArray(e6)) {
          const t9 = [];
          for (const n5 of e6) z2(n5) && t9.push(n5);
          return t9;
        }
        if (void 0 === e6) {
          const e7 = t8.scope;
          if (z2(e7)) return [e7];
          if (void 0 !== globalThis.document) return [globalThis.document];
        }
        return [];
      })(n4, l4);
      for (const n5 of t7)
        e5.initScope({ ...e5, settings: { ...l4, scope: n5 } });
      return Promise.resolve(Ot({ ok: true }));
    }
    return c4(t6, n4);
  }
  if (de(t6)) {
    const e6 = t6;
    if (!e6.source && l4.scope) {
      const t7 = l4.scope.ownerDocument || l4.scope,
        n5 = t7.defaultView;
      e6.source = _2(n5, t7);
    }
    return (
      !e6.globals &&
        l4.scope &&
        (e6.globals = F(l4.scope) ? p2(l4.prefix, l4.scope) : {}),
      c4(e6)
    );
  }
  const [a4] = String(de(t6) ? t6.name : t6).split(' ');
  let u4,
    f2 = de(n4) ? n4 : {},
    d3 = {},
    m5 = false;
  if (
    (ue(n4) && ((u4 = n4), (m5 = true)),
    ue(r4) ? (u4 = r4) : de(r4) && Object.keys(r4).length && (d3 = r4),
    u4)
  ) {
    const e6 = w3(l4.prefix || 'data-elb', u4).find((e7) => e7.entity === a4);
    e6 && (m5 && (f2 = e6.data), e6.context && (d3 = e6.context));
  }
  const g4 = l4.scope ? l4.scope.ownerDocument || l4.scope : void 0,
    h4 = null == g4 ? void 0 : g4.defaultView;
  'page' === a4 && h4 && (f2.id = f2.id || h4.location.pathname);
  const b3 = l4.scope && F(l4.scope) ? p2(l4.prefix, l4.scope) : {};
  return c4({
    name: String(t6 || ''),
    data: f2,
    context: d3,
    globals: b3,
    nested: s2,
    custom: i4,
    trigger: ge(o3) ? o3 : '',
    source: h4 && g4 ? _2(h4, g4) : void 0,
  });
}
function _2(e5, t6) {
  return {
    type: 'browser',
    platform: 'web',
    url: e5.location.href,
    referrer: t6.referrer,
  };
}
function z2(e5) {
  if (!e5 || 'object' != typeof e5) return false;
  if ('undefined' != typeof Element && e5 instanceof Element) return true;
  if ('undefined' != typeof Document && e5 instanceof Document) return true;
  if ('undefined' != typeof ShadowRoot && e5 instanceof ShadowRoot) return true;
  if ('nodeType' in e5) {
    const t6 = e5.nodeType;
    return 1 === t6 || 9 === t6 || 11 === t6;
  }
  return false;
}
function F(e5) {
  return 11 !== e5.nodeType;
}
var J2 = /* @__PURE__ */ new Map();
var K2 = /* @__PURE__ */ new WeakMap();
function Q2(e5) {
  return K2.has(e5);
}
function U(e5) {
  var t6;
  const n4 = K2.get(e5);
  if (!n4) return;
  const o3 = J2.get(n4.scope);
  (n4.intervalIds.forEach((e6) => {
    if ((clearInterval(e6), o3)) {
      const t7 = o3.intervalIds.indexOf(e6);
      -1 !== t7 && o3.intervalIds.splice(t7, 1);
    }
  }),
    n4.timeoutIds.forEach((e6) => {
      if ((clearTimeout(e6), o3)) {
        const t7 = o3.timeoutIds.indexOf(e6);
        -1 !== t7 && o3.timeoutIds.splice(t7, 1);
      }
    }),
    null == (t6 = n4.hoverAbort) || t6.abort(),
    n4.observed && (V2(n4.scope, e5), null == o3 || o3.observed.delete(e5)),
    n4.scroll &&
      o3 &&
      (o3.scrollElements = o3.scrollElements.filter(([t7]) => t7 !== e5)),
    null == o3 || o3.registered.delete(e5),
    K2.delete(e5));
}
var X2 = 'click';
var Y2 = 'hover';
var Z = 'load';
var ee2 = 'pulse';
var te2 = 'scroll';
var ne2 = 'submit';
var oe3 = 'impression';
var re2 = 'visible';
var se = 'wait';
function ie2(e5, t6) {
  if (!t6.scope) return;
  !(function (e6, t7) {
    const n4 = t7.scope;
    if (!n4) return;
    R && R.abort();
    R = new AbortController();
    const { signal: r4 } = R;
    (n4.addEventListener(
      'click',
      Ge(function (t8) {
        de2.call(this, e6, t8);
      }),
      { signal: r4 },
    ),
      n4.addEventListener(
        'submit',
        Ge(function (t8) {
          me.call(this, e6, t8);
        }),
        { signal: r4 },
      ));
  })(e5, t6);
}
function ce(e5) {
  (R && (R.abort(), (R = void 0)),
    J2.forEach((e6, t6) => {
      (e6.abort.abort(),
        e6.mutationObservers.forEach((e7) => e7.disconnect()),
        e6.intervalIds.forEach((e7) => clearInterval(e7)),
        e6.timeoutIds.forEach((e7) => clearTimeout(e7)),
        e6.observed.forEach((e7) => V2(t6, e7)),
        [...e6.registered].forEach((e7) => U(e7)));
    }),
    J2.forEach((e6, t6) => {
      !(function (e7) {
        if (!e7) return;
        const t7 = S2(e7),
          n4 = L2.get(t7);
        n4 && (n4.observer && n4.observer.disconnect(), L2.delete(t7));
      })(t6);
    }),
    J2.clear());
}
function le2(e5, t6) {
  const n4 = e5.settings.scope;
  if (!n4) return;
  const s2 = (function (e6) {
    const t7 = J2.get(e6);
    t7 &&
      (t7.abort.abort(),
      t7.intervalIds.forEach((e7) => clearInterval(e7)),
      t7.timeoutIds.forEach((e7) => clearTimeout(e7)),
      t7.observed.forEach((t8) => V2(e6, t8)),
      [...t7.registered].forEach((e7) => U(e7)),
      t7.mutationObservers.forEach((e7) => e7.disconnect()));
    const n5 = {
      abort: new AbortController(),
      intervalIds: [],
      timeoutIds: [],
      scrollElements: [],
      observed: /* @__PURE__ */ new Set(),
      registered: /* @__PURE__ */ new Set(),
      mutationObservers: [],
    };
    return (J2.set(e6, n5), n5);
  })(n4);
  !(function (e6, t7 = 1e3) {
    const n5 = S2(e6);
    L2.has(n5) ||
      L2.set(n5, {
        observer: M2(n5),
        timers: /* @__PURE__ */ new WeakMap(),
        duration: t7,
      });
  })(n4, 1e3);
  const i4 = m2(e5.settings.prefix, n.Commands.Action, false),
    c4 = n4.ownerDocument || n4,
    l4 = c4.defaultView;
  (n4 !== c4 && l4 && n4 instanceof l4.Element && ue2(e5, n4, i4, s2, n4),
    C(n4, `[${i4}]`, (t7) => {
      ue2(e5, t7, i4, s2, n4);
    }),
    s2.scrollElements.length && ge2(e5, n4, s2),
    (function (e6, t7, n5, s3) {
      const i5 = t7.ownerDocument || t7,
        c5 = i5.defaultView;
      if (!c5 || !c5.MutationObserver) return;
      const l5 = m2(e6.settings.prefix, 'observe', false),
        a4 = [];
      t7 !== i5 &&
        t7 instanceof c5.Element &&
        t7.matches(`[${l5}]`) &&
        a4.push(t7);
      (C(t7, `[${l5}]`, (e7) => a4.push(e7)),
        a4.forEach((i6) => {
          if (a4.some((e7) => e7 !== i6 && e7.contains(i6))) return;
          const l6 = new c5.MutationObserver(
            Ge((n6) => {
              const o3 = J2.get(t7);
              o3 &&
                n6.forEach((n7) => {
                  (n7.addedNodes.forEach((n8) =>
                    (function (e7, t8, n9, o4, r4) {
                      var s4;
                      const i7 =
                        null == (s4 = t8.ownerDocument)
                          ? void 0
                          : s4.defaultView;
                      if (!(i7 && t8 instanceof i7.HTMLElement)) return;
                      (ue2(e7, t8, n9, o4, r4),
                        C(t8, `[${n9}]`, (t9) => {
                          ue2(e7, t9, n9, o4, r4);
                        }));
                    })(e6, n8, s3, o3, t7),
                  ),
                    o3.scrollElements.length && ge2(e6, t7, o3),
                    n7.removedNodes.forEach((t8) =>
                      (function (e7, t9) {
                        var n8;
                        if (1 !== t9.nodeType) return;
                        const o4 =
                          null == (n8 = t9.ownerDocument)
                            ? void 0
                            : n8.defaultView;
                        if (!(o4 && t9 instanceof o4.HTMLElement)) return;
                        const s4 = m2(
                          e7.settings.prefix,
                          n.Commands.Action,
                          false,
                        );
                        Q2(t9) && U(t9);
                        C(t9, `[${s4}]`, (e8) => {
                          e8 instanceof o4.HTMLElement && Q2(e8) && U(e8);
                        });
                      })(e6, t8),
                    ));
                });
            }),
          );
          (l6.observe(i6, { childList: true, subtree: true }),
            n5.mutationObservers.push(l6));
        }));
    })(e5, n4, s2, i4));
}
async function ae2(e5, t6, n4) {
  const o3 = b2(t6, n4, e5.settings.prefix);
  return Promise.all(
    o3.map((t7) =>
      G2(e5, { name: `${t7.entity} ${t7.action}`, ...t7, trigger: n4 }),
    ),
  );
}
function ue2(e5, t6, n4, r4, s2) {
  var c4;
  if (1 !== t6.nodeType) return;
  const l4 = null == (c4 = t6.ownerDocument) ? void 0 : c4.defaultView;
  if (!(l4 && t6 instanceof l4.HTMLElement)) return;
  if (Q2(t6)) return;
  if (!t3(t6, n4)) return;
  const a4 = {
    scope: s2,
    intervalIds: [],
    timeoutIds: [],
    scroll: false,
    observed: false,
  };
  return (
    (function (e6, t7, n5, r5, s3) {
      const c5 = t3(t7, n5);
      if (!c5) return;
      Object.values(v(c5)).forEach((n6) =>
        n6.forEach((n7) => {
          switch (n7.trigger) {
            case Y2:
              !(function (e7, t8, n8) {
                n8.hoverAbort || (n8.hoverAbort = new AbortController());
                t8.addEventListener(
                  'mouseenter',
                  Ge(function (t9) {
                    const n9 = fe2(t9);
                    n9 && ae2(e7, n9, Y2);
                  }),
                  { signal: n8.hoverAbort.signal },
                );
              })(e6, t7, s3);
              break;
            case Z:
              !(function (e7, t8) {
                ae2(e7, t8, Z);
              })(e6, t7);
              break;
            case ee2:
              !(function (e7, t8, n8, o3, r6 = '') {
                const s4 = t8.ownerDocument,
                  i4 = setInterval(
                    () => {
                      s4.hidden || ae2(e7, t8, ee2);
                    },
                    parseInt(r6 || '') || 15e3,
                  );
                (n8.intervalIds.push(i4), o3.intervalIds.push(i4));
              })(e6, t7, r5, s3, n7.triggerParams);
              break;
            case te2:
              !(function (e7, t8, n8, o3 = '') {
                const r6 = parseInt(o3 || '') || 50;
                if (r6 < 0 || r6 > 100) return;
                (t8.scrollElements.push([e7, r6]), (n8.scroll = true));
              })(t7, r5, s3, n7.triggerParams);
              break;
            case oe3:
              (W3(e6, t7), r5.observed.add(t7), (s3.observed = true));
              break;
            case re2:
              (W3(e6, t7, { multiple: true }),
                r5.observed.add(t7),
                (s3.observed = true));
              break;
            case se:
              !(function (e7, t8, n8, o3, r6 = '') {
                const s4 = setTimeout(
                  () => ae2(e7, t8, se),
                  parseInt(r6 || '') || 15e3,
                );
                (n8.timeoutIds.push(s4), o3.timeoutIds.push(s4));
              })(e6, t7, r5, s3, n7.triggerParams);
          }
        }),
      );
    })(e5, t6, n4, r4, a4),
    (function (e6, t7, n5) {
      if (K2.has(t7)) return false;
      const o3 = J2.get(e6);
      !!o3 && ((n5.scope = e6), o3.registered.add(t7), K2.set(t7, n5));
    })(s2, t6, a4),
    a4
  );
}
function fe2(e5) {
  var t6;
  const n4 = null == (t6 = e5.composedPath) ? void 0 : t6.call(e5),
    o3 = (null == n4 ? void 0 : n4.length) ? n4[0] : e5.target;
  if (o3 && 'object' == typeof o3 && 'tagName' in o3) return o3;
}
function de2(e5, t6) {
  const n4 = fe2(t6);
  n4 && ae2(e5, n4, X2);
}
function me(e5, t6) {
  const n4 = fe2(t6);
  n4 && ae2(e5, n4, ne2);
}
function ge2(e5, t6, o3) {
  const r4 = t6.ownerDocument || t6,
    s2 = r4.defaultView,
    i4 = (e6, t7) =>
      e6.filter(([e7, n4]) => {
        const o4 = e7.getBoundingClientRect();
        if (s2.innerHeight < o4.top) return true;
        const r5 = o4.height || e7.clientHeight;
        return (
          !(100 * (1 - (o4.top + r5 - s2.innerHeight) / (r5 || 1)) >= n4) ||
          (ae2(t7, e7, te2), false)
        );
      });
  if (!o3.scrollListener) {
    o3.scrollListener = qe(function () {
      o3.scrollElements = i4.call(t6, o3.scrollElements, e5);
    });
    (t6 instanceof s2.ShadowRoot ? r4 : t6).addEventListener(
      'scroll',
      o3.scrollListener,
      { signal: o3.abort.signal },
    );
  }
}
var ve2 = /* @__PURE__ */ Symbol.for(
  '@walkeros/web-source-browser:elbLayer-drained',
);
var we2 = (e5) => {
  const t6 = Reflect.get(e5, ve2);
  if (
    de((n4 = t6)) &&
    'number' == typeof n4.commands &&
    'number' == typeof n4.events
  )
    return t6;
  var n4;
  const o3 = { commands: 0, events: 0 };
  return (
    Object.defineProperty(e5, ve2, {
      value: o3,
      writable: true,
      enumerable: false,
      configurable: true,
    }),
    o3
  );
};
function ye2(e5, t6 = {}) {
  const n4 = t6.name || 'elbLayer',
    o3 = t6.window,
    r4 = t6.logger,
    s2 = () => Ot({ ok: true });
  if (!o3)
    return {
      intake: () => Promise.resolve(s2()),
      start: () => {},
      enqueue: (e6) => Promise.resolve().then(() => e6()),
      destroy: () => {},
    };
  const i4 = Reflect.get(o3, n4);
  let c4;
  Array.isArray(i4) ? (c4 = i4) : ((c4 = []), Reflect.set(o3, n4, c4));
  const l4 = we2(c4);
  let a4 = false,
    u4 = l4.commands,
    f2 = l4.events,
    d3 = Promise.resolve(s2()),
    m5 = Promise.resolve();
  const g4 = () => {
      ((l4.commands = u4), (l4.events = f2));
    },
    h4 = async (t7) => {
      try {
        return await ((t8) => {
          if (Array.isArray(t8)) {
            const [n5, ...o4] = t8;
            return G2(e5, n5, ...o4);
          }
          return G2(e5, t8);
        })(t7);
      } catch (e6) {
        return (
          null == r4 ||
            r4.warn('elbLayer entry failed', { error: e6, item: t7 }),
          Ot({ ok: false })
        );
      }
    },
    b3 = (e6) => {
      const t7 = e6[0];
      return ge(t7) && t7.startsWith('walker ');
    },
    p4 = (e6, t7) => {
      if (!a4) {
        if (b3(e6)) {
          if (t7 < u4) return Promise.resolve(s2());
          const n6 = d3.then(() => h4(e6));
          return ((d3 = n6), (u4 = t7 + 1), g4(), n6);
        }
        return Promise.resolve(s2());
      }
      const n5 = m5.then(() => h4(e6));
      return ((m5 = n5), (u4 = t7 + 1), (f2 = t7 + 1), g4(), n5);
    },
    v3 = (e6) => {
      const t7 = ke2(e6),
        n5 = c4.length;
      return ((c4[n5] = e6), t7 ? p4(t7, n5) : Promise.resolve(s2()));
    };
  c4.push = (...e6) => {
    for (const t7 of e6) v3(t7);
    return c4.length;
  };
  const w6 = c4.length;
  for (let e6 = 0; e6 < w6; e6++) {
    const t7 = ke2(c4[e6]);
    t7 && p4(t7, e6);
  }
  return {
    intake: (e6) => v3(e6),
    start: () => {
      if (!a4) {
        ((a4 = true), (m5 = d3));
        for (let e6 = f2; e6 < c4.length; e6++) {
          const t7 = ke2(c4[e6]);
          if (!t7) continue;
          if (b3(t7)) continue;
          const n5 = t7;
          m5 = m5.then(() => h4(n5));
        }
        ((f2 = c4.length), (u4 = c4.length), g4());
      }
    },
    enqueue: (e6) => {
      const t7 = m5.then(() => e6());
      return (
        (m5 = t7.then(
          () => {},
          () => {},
        )),
        t7
      );
    },
    destroy: () => {
      (Reflect.deleteProperty(c4, 'push'),
        (a4 = false),
        (u4 = 0),
        (f2 = 0),
        (d3 = Promise.resolve(s2())),
        (m5 = Promise.resolve()));
    },
  };
}
function ke2(e5) {
  const t6 =
    null != (n4 = e5) &&
    'object' == typeof n4 &&
    '[object Arguments]' === Object.prototype.toString.call(n4)
      ? [...Array.from(e5)]
      : (function (e6) {
            return (
              null != e6 &&
              'object' == typeof e6 &&
              'length' in e6 &&
              'number' == typeof e6.length
            );
          })(e5)
        ? Array.from(e5)
        : [e5];
  var n4;
  if (!Array.isArray(t6) || 0 === t6.length) return null;
  if (1 === t6.length && !t6[0]) return null;
  const o3 = t6[0];
  return (de(o3) && 0 === Object.keys(o3).length) ||
    (!de(o3) && ge(o3) && '' === o3.trim())
    ? null
    : t6;
}
function Ee2(e5 = {}, t6) {
  return {
    prefix: 'data-elb',
    pageview: true,
    elb: 'elb',
    elbLayer: 'elbLayer',
    scope: t6 || void 0,
    ...e5,
  };
}
var je2 = /* @__PURE__ */ Symbol.for('@walkeros/web-source-browser:instance');
function Pe3(e5) {
  return e5 || (void 0 !== globalThis.window ? globalThis.window : void 0);
}
var Ae2 = async (n4) => {
  const { config: o3, env: r4, logger: s2 } = n4,
    { elb: i4, command: c4, window: l4, document: a4 } = r4,
    u4 = (null == o3 ? void 0 : o3.settings) || {},
    f2 = l4 || (void 0 !== globalThis.window ? globalThis.window : void 0),
    d3 = a4 || (void 0 !== globalThis.document ? globalThis.document : void 0),
    g4 = Pe3(f2);
  if (g4) {
    if (Reflect.get(g4, je2))
      return {
        type: 'browser',
        config: { settings: Ee2({}, void 0) },
        push: (...e5) => Promise.resolve(Ot({ ok: true })),
        on: async () => {},
        init: async () => {},
        destroy: async () => {},
      };
    Object.defineProperty(g4, je2, {
      value: true,
      enumerable: false,
      configurable: true,
      writable: false,
    });
  }
  const h4 = Ee2(u4, d3),
    b3 = { elb: i4, settings: h4, initScope: le2 };
  let p4, v3;
  const w6 = (e5) => {
      if (!e5.pageview) return;
      const [t6, n5] = (function (e6, t7) {
        const n6 = t7.ownerDocument || t7,
          o4 = n6.defaultView.location,
          r5 = 'page',
          s3 = 'body' in t7 ? t7.body : t7,
          [i5, c5] = E3(s3, `[${m2(e6, r5)}]`, e6, r5);
        return (
          (i5.domain = o4.hostname),
          (i5.title = n6.title),
          (i5.referrer = n6.referrer),
          o4.search && (i5.search = o4.search),
          o4.hash && (i5.hash = o4.hash),
          [i5, c5]
        );
      })(e5.prefix || 'data-elb', e5.scope);
      return G2(b3, 'page view', t6, 'load', n5);
    },
    y6 = (...e5) => {
      const [t6, n5, o4, r5, s3, i5] = e5;
      return G2(b3, t6, n5, o4, r5, s3, i5);
    };
  return {
    type: 'browser',
    config: { settings: h4 },
    push: y6,
    on: async (e5) => {
      if ('run' === e5)
        d3 &&
          f2 &&
          (!(function (e6, t6) {
            if (!t6.scope) return;
            le2(e6);
          })(b3, h4),
          p4 ? (p4.start(), p4.enqueue(() => w6(h4)).catch(() => {})) : w6(h4));
    },
    init: async () => {
      if (!f2 || !d3) return;
      const t6 =
        false !== h4.elbLayer
          ? ye2(b3, {
              name: ge(h4.elbLayer) ? h4.elbLayer : 'elbLayer',
              window: f2,
              logger: s2,
            })
          : void 0;
      if (
        ((p4 = t6),
        await (async function (e5, t7, n5) {
          const o4 = () => {
              e5(t7, n5);
            },
            r5 = n5.scope;
          if (!r5) return void o4();
          const s3 = r5.ownerDocument || r5;
          'loading' !== s3.readyState
            ? o4()
            : s3.addEventListener('DOMContentLoaded', o4);
        })(ie2, b3, h4),
        ge(h4.elb) && h4.elb)
      ) {
        const e5 = t6 ? (...e6) => t6.intake(e6) : y6;
        ((v3 = e5), Reflect.set(f2, h4.elb, e5));
      }
    },
    destroy: async () => {
      (ce(),
        null == p4 || p4.destroy(),
        f2 &&
          ge(h4.elb) &&
          h4.elb &&
          Reflect.get(f2, h4.elb) === v3 &&
          Reflect.deleteProperty(f2, h4.elb),
        g4 && Reflect.deleteProperty(g4, je2),
        (p4 = void 0),
        (v3 = void 0));
    },
  };
};

// packages/web/sources/session/dist/index.mjs
function i2(e5 = {}) {
  var t6, n4;
  let o3 = e5.isStart || false;
  const i4 = { isStart: o3, storage: false };
  if (false === e5.isStart) return i4;
  const c4 = null != (t6 = e5.window) ? t6 : window,
    a4 = null != (n4 = e5.document) ? n4 : document;
  if (!o3) {
    const [e6] = c4.performance.getEntriesByType('navigation');
    if ('navigate' !== e6.type) return i4;
  }
  const d3 = new URL(e5.url || c4.location.href),
    u4 = e5.referrer || a4.referrer,
    l4 = u4 && new URL(u4).hostname,
    m5 = Fe(d3, e5.parameters, e5.clickIds);
  if (
    (Object.keys(m5).length &&
      (m5.marketing || (m5.marketing = true), (o3 = true)),
    !o3)
  ) {
    const t7 = e5.domains || [];
    (t7.push(d3.hostname), (o3 = !t7.includes(l4)));
  }
  return o3
    ? Object.assign(
        {
          isStart: o3,
          storage: false,
          start: Date.now(),
          id: Se(16),
          referrer: l4,
        },
        m5,
        e5.data,
      )
    : i4;
}
function c(r4 = {}) {
  const s2 = Date.now(),
    {
      length: c4 = 30,
      deviceKey: a4 = 'elbDeviceId',
      deviceStorage: d3 = 'local',
      deviceAge: u4 = 30,
      sessionKey: l4 = 'elbSessionId',
      sessionStorage: m5 = 'local',
      pulse: g4 = false,
    } = r4,
    w6 =
      r4.window || r4.document
        ? { window: r4.window, document: r4.document }
        : void 0,
    f2 = i2(r4);
  let p4 = false;
  const v3 = Ge((t6, r5, s3) => {
      let i4 = W2(t6, s3, w6);
      return (
        i4 || ((i4 = Se(16)), E2(t6, i4, 1440 * r5, s3, void 0, w6)),
        String(i4)
      );
    })(a4, u4, d3),
    S3 =
      Ge(
        (e5, t6) => {
          const o3 = JSON.parse(String(W2(e5, t6, w6)));
          return (
            g4 ||
              ((o3.isNew = false),
              f2.marketing && (Object.assign(o3, f2), (p4 = true)),
              p4 || o3.updated + 6e4 * c4 < s2
                ? (delete o3.id,
                  delete o3.referrer,
                  (o3.start = s2),
                  o3.count++,
                  (o3.runs = 1),
                  (p4 = true))
                : o3.runs++),
            o3
          );
        },
        () => {
          p4 = true;
        },
      )(l4, m5) || {},
    y6 = { id: Se(16), start: s2, isNew: true, count: 1, runs: 1 },
    b3 = Object.assign(
      y6,
      f2,
      S3,
      { device: v3 },
      { isStart: p4, storage: true, updated: s2 },
      r4.data,
    );
  return (E2(l4, JSON.stringify(b3), 2 * c4, m5, void 0, w6), b3);
}
function u2(e5 = {}) {
  const { cb: t6, consent: n4, collector: o3, storage: r4 } = e5;
  if (!n4) return l2((r4 ? c : i2)(e5), o3, t6);
  {
    const r5 = /* @__PURE__ */ (function (e6, t7) {
        const n5 = (n6, o4) => {
          const r6 = o4.collector;
          let s3 = () => i2(e6);
          if (e6.consent) {
            const t8 = (ie(e6.consent) ? e6.consent : [e6.consent]).reduce(
              (e7, t9) => ({ ...e7, [t9]: true }),
              {},
            );
            Ae(t8, n6) && (s3 = () => c(e6));
          }
          l2(s3(), r6, t7);
        };
        return n5;
      })(e5, t6),
      s2 = (ie(n4) ? n4 : [n4]).reduce((e6, t7) => ({ ...e6, [t7]: r5 }), {});
    o3 && o3.command('on', { type: 'consent', rules: s2 });
  }
}
function l2(e5, t6, n4) {
  return false === n4 ? e5 : (n4 || (n4 = m3), n4(e5, t6, m3));
}
var m3 = (e5, t6) => {
  const n4 = {};
  return (
    e5.id && (n4.session = e5.id),
    e5.storage && e5.device && (n4.device = e5.device),
    t6 && (t6.command('user', n4), t6.command('session', e5)),
    e5.isStart && t6 && t6.push({ name: 'session start', data: e5 }),
    e5
  );
};
var w4 = async (e5) => {
  const { config: t6, env: n4 } = e5,
    { elb: o3, command: r4 } = n4,
    s2 = { ...(null == t6 ? void 0 : t6.settings) },
    i4 = { push: o3, command: r4 },
    c4 = () => {
      u2({ ...s2, window: n4.window, document: n4.document, collector: i4 });
    };
  return {
    type: 'session',
    config: { settings: s2 },
    push: o3,
    init: async () => {
      s2.consent ? c4() : await r4('on', { type: 'run', rules: [() => c4()] });
    },
  };
};

// packages/web/destinations/api/dist/index.mjs
var t4 = Object.defineProperty;
var r3 = (r4, e5) => {
  for (var n4 in e5) t4(r4, n4, { get: e5[n4], enumerable: true });
};
function e3(t6, r4) {
  if ('collector' === t6) return 'collector';
  if (!r4) throw new Error(`stepId(${t6}) requires an id`);
  return `${t6}.${r4}`;
}
r3({}, { stepId: () => e3 });
function n2(t6, r4) {
  const e5 = t6.destinations[r4];
  if (!e5) throw new Error(`Destination not found: ${r4}`);
  return e5;
}
r3({}, { getDestination: () => n2 });
r3({}, { Level: () => s });
var o2;
var s =
  (((o2 = s || {})[(o2.ERROR = 0)] = 'ERROR'),
  (o2[(o2.WARN = 1)] = 'WARN'),
  (o2[(o2.INFO = 2)] = 'INFO'),
  (o2[(o2.DEBUG = 3)] = 'DEBUG'),
  o2);
function i3(t6, r4) {
  const e5 = t6.transformers[r4];
  if (!e5) throw new Error(`Transformer not found: ${r4}`);
  return e5;
}
r3({}, { getTransformer: () => i3 });
function a3(t6, r4) {
  const e5 = t6.sources[r4];
  if (!e5) throw new Error(`Source not found: ${r4}`);
  return e5;
}
r3({}, { getSource: () => a3 });
function u3(t6, r4) {
  const e5 = t6.stores[r4];
  if (!e5) throw new Error(`Store not found: ${r4}`);
  return e5;
}
async function c2(t6, r4) {
  return await t6.get(r4);
}
r3({}, { getStore: () => u3, getStoreValue: () => c2 });
var f = { merge: true, shallow: true, extend: true };
function d2(t6) {
  return void 0 !== t6;
}
function l3(t6, r4, e5) {
  return function (...n4) {
    try {
      return t6(...n4);
    } catch (t7) {
      if (!r4) return;
      return r4(t7);
    } finally {
      null == e5 || e5();
    }
  };
}
function g3(t6) {
  return void 0 === t6 ||
    /* @__PURE__ */ (function (t7, r4) {
      return typeof t7 == typeof r4;
    })(t6, '')
    ? t6
    : JSON.stringify(t6);
}
function h3(t6 = {}) {
  return (function (t7, r4 = {}, e5 = {}) {
    e5 = { ...f, ...e5 };
    const n4 = Object.entries(r4).reduce((r5, [n5, o3]) => {
      const s2 = t7[n5];
      return (
        e5.merge && Array.isArray(s2) && Array.isArray(o3)
          ? (r5[n5] = o3.reduce(
              (t8, r6) => (t8.includes(r6) ? t8 : [...t8, r6]),
              [...s2],
            ))
          : (e5.extend || n5 in t7) && (r5[n5] = o3),
        r5
      );
    }, {});
    return e5.shallow ? { ...t7, ...n4 } : (Object.assign(t7, n4), t7);
  })({ 'Content-Type': 'application/json; charset=utf-8' }, t6);
}
function m4(t6, r4, e5 = { transport: 'fetch' }) {
  switch (e5.transport || 'fetch') {
    case 'beacon':
      return (function (t7, r5) {
        const e6 = g3(r5),
          n4 = navigator.sendBeacon(t7, e6);
        return { ok: n4, error: n4 ? void 0 : 'Failed to send beacon' };
      })(t6, r4);
    case 'xhr':
      return (function (t7, r5, e6 = {}) {
        const n4 = h3(e6.headers),
          o3 = e6.method || 'POST',
          s2 = g3(r5);
        return l3(
          () => {
            const r6 = new XMLHttpRequest();
            r6.open(o3, t7, false);
            for (const t8 in n4) r6.setRequestHeader(t8, n4[t8]);
            r6.send(s2);
            const e7 = r6.status >= 200 && r6.status < 300;
            return {
              ok: e7,
              data: l3(JSON.parse, () => r6.response)(r6.response),
              error: e7 ? void 0 : `${r6.status} ${r6.statusText}`,
            };
          },
          (t8) => ({ ok: false, error: t8.message }),
        )();
      })(t6, r4, e5);
    default:
      return (async function (t7, r5, e6 = {}) {
        const n4 = h3(e6.headers),
          o3 = g3(r5),
          s2 = e6.timeout,
          i4 =
            'number' == typeof s2 && Number.isFinite(s2) && s2 > 0 ? s2 : 1e4,
          a4 = new AbortController(),
          u4 = setTimeout(() => a4.abort(), i4);
        return /* @__PURE__ */ (function (t8, r6, e7) {
          return async function (...n5) {
            try {
              return await t8(...n5);
            } catch (t9) {
              if (!r6) return;
              return await r6(t9);
            } finally {
              await (null == e7 ? void 0 : e7());
            }
          };
        })(
          async () => {
            try {
              const r6 = await fetch(t7, {
                  method: e6.method || 'POST',
                  headers: n4,
                  keepalive: true,
                  credentials: e6.credentials || 'same-origin',
                  mode: e6.noCors ? 'no-cors' : 'cors',
                  body: o3,
                  signal: a4.signal,
                }),
                s3 = e6.noCors ? '' : await r6.text();
              return {
                ok: r6.ok,
                data: s3,
                error: r6.ok ? void 0 : r6.statusText,
              };
            } finally {
              clearTimeout(u4);
            }
          },
          (t8) => (clearTimeout(u4), { ok: false, error: t8.message }),
        )();
      })(t6, r4, e5);
  }
}
function w5(t6, r4, e5) {
  const { url: n4, headers: o3, method: s2, transport: i4 = 'fetch' } = r4;
  e5(n4, t6, { headers: o3, method: s2, transport: i4 });
}
var y4 = {
  type: 'api',
  config: {},
  init({ config: t6, logger: r4 }) {
    const { url: e5 } = t6.settings || {};
    e5 || r4.throw('Config settings url missing');
  },
  push(t6, { config: r4, rule: e5, data: n4, env: o3, logger: s2 }) {
    const { settings: i4 } = r4,
      { url: a4, transform: u4 } = i4 || {};
    if (!a4) return void s2.throw('Config settings url missing');
    const c4 = d2(n4) ? n4 : t6,
      f2 = u4 ? u4(c4, r4, e5) : JSON.stringify(c4),
      l4 = (function (t7, r5) {
        var e6;
        const n5 = null == (e6 = t7.source) ? void 0 : e6.trace,
          { id: o4 } = t7,
          s3 =
            r5 &&
            Object.keys(r5).some((t8) => 'traceparent' === t8.toLowerCase());
        return n5 && o4 && !s3
          ? { ...r5, traceparent: `00-${n5}-${o4}-01` }
          : r5;
      })(t6, null == i4 ? void 0 : i4.headers);
    w5(f2, { ...i4, url: a4, headers: l4 }, o3.sendWeb || m4);
  },
  pushBatch(t6, { config: r4, rule: e5, env: n4, logger: o3 }) {
    const { settings: s2 } = r4,
      { url: i4, transform: a4 } = s2 || {};
    if (!i4) return void o3.throw('Config settings url missing');
    const u4 = t6.entries.map((t7) => (d2(t7.data) ? t7.data : t7.event)),
      c4 = a4 ? u4.map((t7) => a4(t7, r4, e5)) : u4;
    w5(JSON.stringify(c4), { ...s2, url: i4 }, n4.sendWeb || m4);
  },
};

// packages/web/destinations/gtag/dist/index.mjs
var n3 = /* @__PURE__ */ new Set();
function e4(
  e5,
  t6 = 'https://www.googletagmanager.com/gtag/js?id=',
  o3 = globalThis.document,
) {
  if (n3.has(e5)) return;
  const r4 = o3.createElement('script');
  ((r4.src = t6 + e5), o3.head.appendChild(r4), n3.add(e5));
}
function t5(n4) {
  const e5 = n4;
  return (
    (e5.dataLayer = e5.dataLayer || []),
    e5.gtag ||
      (e5.gtag = function () {
        e5.dataLayer.push(arguments);
      }),
    e5.gtag
  );
}
async function c3(n4, e5, t6, o3, r4) {
  const c4 = de(e5) ? e5 : {},
    d3 = t6.data ? await et(n4, t6.data, { collector: r4 }) : {},
    g4 = (null == o3 ? void 0 : o3.data)
      ? await et(n4, o3.data, { collector: r4 })
      : {},
    l4 = de(d3) ? d3 : {},
    u4 = de(g4) ? g4 : {};
  return oe(oe(c4, l4), u4);
}
var v2 = 'dataLayer';
function p3(n4, e5, t6, o3) {
  const { window: r4, document: a4 } = w2(t6),
    { containerId: s2, dataLayer: i4, domain: c4 } = n4,
    d3 = i4 || v2,
    g4 = r4[d3],
    l4 = ie(g4) ? g4 : [];
  ((r4[d3] = l4),
    l4.push({
      'gtm.start': /* @__PURE__ */ new Date().getTime(),
      event: 'gtm.js',
    }),
    e5 &&
      s2 &&
      (function (n5, e6, t7, o4 = globalThis.document) {
        const r5 = t7 != v2 ? '&l=' + t7 : '',
          a5 = o4.createElement('script');
        ((a5.src = e6 + n5 + r5), o4.head.appendChild(a5));
      })(s2, c4 || 'https://www.googletagmanager.com/gtm.js?id=', d3, a4));
}
var y5 = {
  marketing: ['ad_storage', 'ad_user_data', 'ad_personalization'],
  functional: ['analytics_storage'],
};
function I(n4) {
  const { como: e5 = true } = n4;
  if (false !== e5) return true === e5 ? y5 : e5;
}
function k3(n4) {
  const e5 = I(n4);
  if (!e5) return;
  const t6 = (function (n5) {
    const e6 = /* @__PURE__ */ new Set();
    return (
      Object.values(n5).forEach((n6) => {
        (Array.isArray(n6) ? n6 : [n6]).forEach((n7) => e6.add(n7));
      }),
      [...e6]
    );
  })(e5);
  if (!t6.length) return;
  const o3 = {};
  t6.forEach((n5) => (o3[n5] = 'denied'));
  const { como_advanced: r4 } = n4;
  return (r4 && (o3.wait_for_update = 'number' == typeof r4 ? r4 : 500), o3);
}
var O3 = false;
function A3(n4, e5) {
  const o3 = n4.settings || {};
  if (O3) return;
  if (
    !(function (n5, e6) {
      return !!(n5 && Object.keys(n5).length > 0) || !!e6.como_advanced;
    })(n4.consent, o3)
  )
    return;
  const r4 = k3(o3);
  if (!r4) return;
  const { window: a4 } = w2(e5),
    s2 = t5(a4);
  s2 && (s2('consent', 'default', r4), (O3 = true));
}
var D3 = {
  type: 'google-gtag',
  calls: ['call:window.gtag'],
  config: { settings: {} },
  init({ config: n4, env: r4, logger: a4 }) {
    const { settings: s2 = {}, loadScript: i4 } = n4,
      { ga4: c4, ads: d3, gtm: l4 } = s2;
    return (
      (null == c4 ? void 0 : c4.measurementId) ||
        (null == d3 ? void 0 : d3.conversionId) ||
        (null == l4 ? void 0 : l4.containerId) ||
        a4.throw(
          'Config settings missing. Set ga4.measurementId, ads.conversionId, or gtm.containerId',
        ),
      A3(n4, r4),
      (null == c4 ? void 0 : c4.measurementId) &&
        (function (n5, r5, a5, s3) {
          const { window: i5, document: c5 } = w2(a5),
            {
              measurementId: d4,
              transport_url: g4,
              server_container_url: l5,
              pageview: u4,
            } = n5;
          (d4 || s3.throw('Config settings ga4.measurementId missing'),
            r5 && e4(d4, void 0, c5),
            t5(i5));
          const m5 = {};
          (g4 && (m5.transport_url = g4),
            l5 && (m5.server_container_url = l5),
            false === u4 && (m5.send_page_view = false));
          const f2 = i5.gtag;
          (f2('js', /* @__PURE__ */ new Date()), f2('config', d4, m5));
        })(c4, i4, r4, a4),
      (null == d3 ? void 0 : d3.conversionId) &&
        (function (n5, o3, r5, a5) {
          const { window: s3, document: i5 } = w2(r5),
            { conversionId: c5 } = n5;
          (c5 || a5.throw('Config settings ads.conversionId missing'),
            n5.currency || (n5.currency = 'EUR'),
            o3 && e4(c5, void 0, i5),
            t5(s3));
          const d4 = s3.gtag;
          (d4('js', /* @__PURE__ */ new Date()),
            n5.enhancedConversions
              ? d4('config', c5, { allow_enhanced_conversions: true })
              : d4('config', c5));
        })(d3, i4, r4, a4),
      (null == l4 ? void 0 : l4.containerId) && p3(l4, i4, r4),
      n4
    );
  },
  async push(
    n4,
    { config: e5, rule: t6 = {}, data: o3, env: a4, collector: s2, logger: i4 },
  ) {
    const { settings: g4 = {} } = e5,
      { ga4: f2, ads: w6, gtm: p4 } = g4,
      y6 = t6.settings || {},
      I2 = await c3(n4, o3, e5, f2, s2),
      k4 = await c3(n4, o3, e5, w6, s2),
      j2 = await c3(n4, o3, e5, p4, s2);
    let E4;
    ((null == f2 ? void 0 : f2.measurementId) &&
      (function (n5, e6, t7, o4, a5) {
        const { window: s3 } = w2(o4);
        e6.measurementId ||
          a5.throw('Config settings ga4.measurementId missing');
        const i5 = de(t7) ? { ...t7 } : {};
        let c4 = n5.name;
        (false !== e6.snakeCase &&
          (c4 = (function (n6, e7 = true) {
            return e7 ? n6.replace(/\s+/g, '_').toLowerCase() : n6;
          })(c4)),
          (i5.send_to = e6.measurementId),
          e6.debug && (i5.debug_mode = true),
          (0, s3.gtag)('event', c4, i5));
      })(n4, f2, I2, a4, i4),
      (null == w6 ? void 0 : w6.conversionId) &&
        (null == w6 ? void 0 : w6.enhancedConversions) &&
        (E4 = await (async function (n5, e6, t7) {
          const o4 = e6.enhancedConversions;
          if (!o4) return;
          const r4 = {};
          if (o4.email) {
            const e7 = await et(n5, o4.email, { collector: t7 });
            e7 && (r4.email = e7);
          }
          if (o4.phone_number) {
            const e7 = await et(n5, o4.phone_number, { collector: t7 });
            e7 && (r4.phone_number = e7);
          }
          if (o4.address) {
            const e7 = {};
            for (const [r5, a5] of Object.entries(o4.address))
              if (a5) {
                const o5 = await et(n5, a5, { collector: t7 });
                o5 && (e7[r5] = o5);
              }
            Object.keys(e7).length > 0 && (r4.address = e7);
          }
          return Object.keys(r4).length > 0 ? r4 : void 0;
        })(n4, w6, s2)),
      (null == w6 ? void 0 : w6.conversionId) &&
        t6.name &&
        (function (n5, e6, t7 = {}, o4, r4, a5, s3, i5) {
          const { conversionId: c4, currency: d3 } = e6,
            g5 = de(o4) ? o4 : {},
            m5 = t7.label || r4;
          m5 || s3.throw('Config mapping ads.label missing');
          const f3 = { send_to: `${c4}/${m5}`, currency: d3 || 'EUR', ...g5 },
            { window: w7 } = w2(a5),
            v3 = w7.gtag;
          (i5 && v3('set', 'user_data', i5), v3('event', 'conversion', f3));
        })(0, w6, y6.ads, k4, t6.name, a4, i4, E4),
      (null == p4 ? void 0 : p4.containerId) &&
        (function (n5, e6, t7 = {}, o4, r4) {
          const { window: a5 } = w2(r4),
            s3 = { event: n5.name },
            i5 = e6.dataLayer || v2,
            c4 = a5[i5],
            d3 = ie(c4) ? c4 : [];
          ((a5[i5] = d3), d3.push({ ...s3, ...(de(o4) ? o4 : n5) }));
        })(n4, p4, y6.gtm, j2, a4));
  },
  on(n4, e5) {
    var t6;
    if ('consent' !== n4 || !de(e5.data)) return;
    const o3 = e5.data,
      r4 = (null == (t6 = e5.config) ? void 0 : t6.settings) || {},
      a4 = I(r4);
    if (!a4) return;
    const { window: s2 } = w2(e5.env),
      i4 = s2.gtag;
    if (!i4) return;
    if (!O3) {
      const n5 = k3(r4);
      (n5 && i4('consent', 'default', n5), (O3 = true));
    }
    const c4 = {};
    (Object.entries(o3).forEach(([n5, e6]) => {
      const t7 = a4[n5];
      if (!t7) return;
      const o4 = Array.isArray(t7) ? t7 : [t7],
        r5 = e6 ? 'granted' : 'denied';
      o4.forEach((n6) => {
        c4[n6] = r5;
      });
    }),
      0 !== Object.keys(c4).length && i4('consent', 'update', c4));
  },
};
export {
  y4 as destinationAPI,
  D3 as destinationGtag,
  Se as getId,
  Ae2 as sourceBrowser,
  w4 as sourceSession,
  hn2 as startFlow,
  N as storageDelete,
  W2 as storageRead,
  E2 as storageWrite,
};
