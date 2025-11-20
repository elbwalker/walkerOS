'use strict';
var walkerOS = (() => {
  var zo = Object.defineProperty;
  var k$ = Object.getOwnPropertyDescriptor;
  var x$ = Object.getOwnPropertyNames;
  var w$ = Object.prototype.hasOwnProperty;
  var Je = (e, t) => {
      for (var i in t) zo(e, i, { get: t[i], enumerable: !0 });
    },
    S$ = (e, t, i, n) => {
      if ((t && typeof t == 'object') || typeof t == 'function')
        for (let r of x$(t))
          !w$.call(e, r) &&
            r !== i &&
            zo(e, r, {
              get: () => t[r],
              enumerable: !(n = k$(t, r)) || n.enumerable,
            });
      return e;
    };
  var I$ = (e) => S$(zo({}, '__esModule', { value: !0 }), e);
  var iU = {};
  Je(iU, { default: () => rU });
  var d = {};
  Je(d, {
    $brand: () => pr,
    $input: () => Ws,
    $output: () => Ms,
    NEVER: () => jo,
    TimePrecision: () => Ks,
    ZodAny: () => jp,
    ZodArray: () => Np,
    ZodBase64: () => dc,
    ZodBase64URL: () => mc,
    ZodBigInt: () => En,
    ZodBigIntFormat: () => vc,
    ZodBoolean: () => Zn,
    ZodCIDRv4: () => cc,
    ZodCIDRv6: () => lc,
    ZodCUID: () => nc,
    ZodCUID2: () => rc,
    ZodCatch: () => Hp,
    ZodCodec: () => Sc,
    ZodCustom: () => _i,
    ZodCustomStringFormat: () => Nn,
    ZodDate: () => bi,
    ZodDefault: () => Wp,
    ZodDiscriminatedUnion: () => Dp,
    ZodE164: () => pc,
    ZodEmail: () => Qu,
    ZodEmoji: () => ec,
    ZodEnum: () => Un,
    ZodError: () => tx,
    ZodFile: () => Fp,
    ZodFirstPartyTypeKind: () => Ic,
    ZodFunction: () => sf,
    ZodGUID: () => pi,
    ZodIPv4: () => sc,
    ZodIPv6: () => uc,
    ZodISODate: () => ci,
    ZodISODateTime: () => ui,
    ZodISODuration: () => di,
    ZodISOTime: () => li,
    ZodIntersection: () => Zp,
    ZodIssueCode: () => mw,
    ZodJWT: () => fc,
    ZodKSUID: () => ac,
    ZodLazy: () => rf,
    ZodLiteral: () => Jp,
    ZodMap: () => Lp,
    ZodNaN: () => Qp,
    ZodNanoID: () => tc,
    ZodNever: () => Up,
    ZodNonOptional: () => xc,
    ZodNull: () => Ip,
    ZodNullable: () => Mp,
    ZodNumber: () => Dn,
    ZodNumberFormat: () => Lt,
    ZodObject: () => $i,
    ZodOptional: () => kc,
    ZodPipe: () => wc,
    ZodPrefault: () => Gp,
    ZodPromise: () => af,
    ZodReadonly: () => ef,
    ZodRealError: () => ce,
    ZodRecord: () => yc,
    ZodSet: () => Rp,
    ZodString: () => Pn,
    ZodStringFormat: () => M,
    ZodSuccess: () => Xp,
    ZodSymbol: () => wp,
    ZodTemplateLiteral: () => nf,
    ZodTransform: () => Vp,
    ZodTuple: () => Tp,
    ZodType: () => A,
    ZodULID: () => ic,
    ZodURL: () => hi,
    ZodUUID: () => Te,
    ZodUndefined: () => Sp,
    ZodUnion: () => hc,
    ZodUnknown: () => Op,
    ZodVoid: () => Pp,
    ZodXID: () => oc,
    _ZodString: () => Yu,
    _default: () => Bp,
    _function: () => ow,
    any: () => Lx,
    array: () => yi,
    base64: () => kx,
    base64url: () => xx,
    bigint: () => Zx,
    boolean: () => xp,
    catch: () => Yp,
    check: () => aw,
    cidrv4: () => $x,
    cidrv6: () => _x,
    clone: () => te,
    codec: () => nw,
    coerce: () => zc,
    config: () => q,
    core: () => Ee,
    cuid: () => px,
    cuid2: () => fx,
    custom: () => sw,
    date: () => Jx,
    decode: () => Vu,
    decodeAsync: () => Wu,
    discriminatedUnion: () => Bx,
    e164: () => wx,
    email: () => rx,
    emoji: () => dx,
    encode: () => Fu,
    encodeAsync: () => Mu,
    endsWith: () => xn,
    enum: () => $c,
    file: () => Yx,
    flattenError: () => on,
    float32: () => Ux,
    float64: () => Px,
    formatError: () => an,
    function: () => ow,
    getErrorMap: () => fw,
    globalRegistry: () => Ue,
    gt: () => De,
    gte: () => ue,
    guid: () => ix,
    hash: () => Ox,
    hex: () => jx,
    hostname: () => zx,
    httpUrl: () => lx,
    includes: () => _n,
    instanceof: () => uw,
    int: () => Hu,
    int32: () => Nx,
    int64: () => Ex,
    intersection: () => Ep,
    ipv4: () => bx,
    ipv6: () => yx,
    iso: () => mi,
    json: () => lw,
    jwt: () => Sx,
    keyof: () => Fx,
    ksuid: () => hx,
    lazy: () => of,
    length: () => Tt,
    literal: () => Hx,
    locales: () => fn,
    looseObject: () => Wx,
    lowercase: () => yn,
    lt: () => Ne,
    lte: () => he,
    map: () => Kx,
    maxLength: () => Et,
    maxSize: () => Zt,
    mime: () => wn,
    minLength: () => Ke,
    minSize: () => ot,
    multipleOf: () => it,
    nan: () => tw,
    nanoid: () => mx,
    nativeEnum: () => Xx,
    negative: () => xu,
    never: () => gc,
    nonnegative: () => Su,
    nonoptional: () => qp,
    nonpositive: () => wu,
    normalize: () => Sn,
    null: () => zp,
    nullable: () => vi,
    nullish: () => Qx,
    number: () => kp,
    object: () => Vx,
    optional: () => fi,
    overwrite: () => Ze,
    parse: () => Cu,
    parseAsync: () => Lu,
    partialRecord: () => Gx,
    pipe: () => gi,
    positive: () => ku,
    prefault: () => Kp,
    preprocess: () => dw,
    prettifyError: () => Lo,
    promise: () => iw,
    property: () => Iu,
    readonly: () => tf,
    record: () => Cp,
    refine: () => uf,
    regex: () => bn,
    regexes: () => ge,
    registry: () => Jr,
    safeDecode: () => Gu,
    safeDecodeAsync: () => qu,
    safeEncode: () => Bu,
    safeEncodeAsync: () => Ku,
    safeParse: () => Ru,
    safeParseAsync: () => Ju,
    set: () => qx,
    setErrorMap: () => pw,
    size: () => hn,
    startsWith: () => kn,
    strictObject: () => Mx,
    string: () => Xu,
    stringFormat: () => Ix,
    stringbool: () => cw,
    success: () => ew,
    superRefine: () => cf,
    symbol: () => Ax,
    templateLiteral: () => rw,
    toJSONSchema: () => Du,
    toLowerCase: () => zn,
    toUpperCase: () => jn,
    transform: () => _c,
    treeifyError: () => Co,
    trim: () => In,
    tuple: () => Ap,
    uint32: () => Dx,
    uint64: () => Tx,
    ulid: () => vx,
    undefined: () => Cx,
    union: () => bc,
    unknown: () => Ct,
    uppercase: () => $n,
    url: () => cx,
    util: () => O,
    uuid: () => ox,
    uuidv4: () => ax,
    uuidv6: () => sx,
    uuidv7: () => ux,
    void: () => Rx,
    xid: () => gx,
  });
  var Ee = {};
  Je(Ee, {
    $ZodAny: () => ps,
    $ZodArray: () => bs,
    $ZodAsyncError: () => ke,
    $ZodBase64: () => rs,
    $ZodBase64URL: () => is,
    $ZodBigInt: () => Er,
    $ZodBigIntFormat: () => cs,
    $ZodBoolean: () => ln,
    $ZodCIDRv4: () => es,
    $ZodCIDRv6: () => ts,
    $ZodCUID: () => Va,
    $ZodCUID2: () => Ma,
    $ZodCatch: () => Es,
    $ZodCheck: () => B,
    $ZodCheckBigIntFormat: () => ya,
    $ZodCheckEndsWith: () => Pa,
    $ZodCheckGreaterThan: () => jr,
    $ZodCheckIncludes: () => Oa,
    $ZodCheckLengthEquals: () => Sa,
    $ZodCheckLessThan: () => zr,
    $ZodCheckLowerCase: () => za,
    $ZodCheckMaxLength: () => xa,
    $ZodCheckMaxSize: () => $a,
    $ZodCheckMimeType: () => Da,
    $ZodCheckMinLength: () => wa,
    $ZodCheckMinSize: () => _a,
    $ZodCheckMultipleOf: () => ha,
    $ZodCheckNumberFormat: () => ba,
    $ZodCheckOverwrite: () => Za,
    $ZodCheckProperty: () => Na,
    $ZodCheckRegex: () => Ia,
    $ZodCheckSizeEquals: () => ka,
    $ZodCheckStartsWith: () => Ua,
    $ZodCheckStringFormat: () => Nt,
    $ZodCheckUpperCase: () => ja,
    $ZodCodec: () => dn,
    $ZodCustom: () => Vs,
    $ZodCustomStringFormat: () => ss,
    $ZodDate: () => hs,
    $ZodDefault: () => Ps,
    $ZodDiscriminatedUnion: () => $s,
    $ZodE164: () => os,
    $ZodEmail: () => La,
    $ZodEmoji: () => Ja,
    $ZodEncodeError: () => Fe,
    $ZodEnum: () => Ss,
    $ZodError: () => rn,
    $ZodFile: () => zs,
    $ZodFunction: () => Rs,
    $ZodGUID: () => Aa,
    $ZodIPv4: () => Ya,
    $ZodIPv6: () => Qa,
    $ZodISODate: () => qa,
    $ZodISODateTime: () => Ka,
    $ZodISODuration: () => Ha,
    $ZodISOTime: () => Xa,
    $ZodIntersection: () => _s,
    $ZodJWT: () => as,
    $ZodKSUID: () => Ga,
    $ZodLazy: () => Fs,
    $ZodLiteral: () => Is,
    $ZodMap: () => xs,
    $ZodNaN: () => Ts,
    $ZodNanoID: () => Fa,
    $ZodNever: () => vs,
    $ZodNonOptional: () => Ds,
    $ZodNull: () => ms,
    $ZodNullable: () => Us,
    $ZodNumber: () => Zr,
    $ZodNumberFormat: () => us,
    $ZodObject: () => wm,
    $ZodObjectJIT: () => ys,
    $ZodOptional: () => Os,
    $ZodPipe: () => As,
    $ZodPrefault: () => Ns,
    $ZodPromise: () => Js,
    $ZodReadonly: () => Cs,
    $ZodRealError: () => se,
    $ZodRecord: () => ks,
    $ZodRegistry: () => Dt,
    $ZodSet: () => ws,
    $ZodString: () => rt,
    $ZodStringFormat: () => V,
    $ZodSuccess: () => Zs,
    $ZodSymbol: () => ls,
    $ZodTemplateLiteral: () => Ls,
    $ZodTransform: () => js,
    $ZodTuple: () => Ar,
    $ZodType: () => D,
    $ZodULID: () => Wa,
    $ZodURL: () => Ra,
    $ZodUUID: () => Ca,
    $ZodUndefined: () => ds,
    $ZodUnion: () => Tr,
    $ZodUnknown: () => fs,
    $ZodVoid: () => gs,
    $ZodXID: () => Ba,
    $brand: () => pr,
    $constructor: () => h,
    $input: () => Ws,
    $output: () => Ms,
    Doc: () => cn,
    JSONSchema: () => yp,
    JSONSchemaGenerator: () => On,
    NEVER: () => jo,
    TimePrecision: () => Ks,
    _any: () => vu,
    _array: () => zu,
    _base64: () => ii,
    _base64url: () => oi,
    _bigint: () => uu,
    _boolean: () => au,
    _catch: () => Kk,
    _check: () => bp,
    _cidrv4: () => ni,
    _cidrv6: () => ri,
    _coercedBigint: () => cu,
    _coercedBoolean: () => su,
    _coercedDate: () => $u,
    _coercedNumber: () => eu,
    _coercedString: () => Gs,
    _cuid: () => qr,
    _cuid2: () => Xr,
    _custom: () => Ou,
    _date: () => yu,
    _decode: () => yr,
    _decodeAsync: () => _r,
    _default: () => Wk,
    _discriminatedUnion: () => Dk,
    _e164: () => ai,
    _email: () => Fr,
    _emoji: () => Gr,
    _encode: () => br,
    _encodeAsync: () => $r,
    _endsWith: () => xn,
    _enum: () => Lk,
    _file: () => ju,
    _float32: () => nu,
    _float64: () => ru,
    _gt: () => De,
    _gte: () => ue,
    _guid: () => vn,
    _includes: () => _n,
    _int: () => tu,
    _int32: () => iu,
    _int64: () => lu,
    _intersection: () => Zk,
    _ipv4: () => ei,
    _ipv6: () => ti,
    _isoDate: () => Xs,
    _isoDateTime: () => qs,
    _isoDuration: () => Ys,
    _isoTime: () => Hs,
    _jwt: () => si,
    _ksuid: () => Qr,
    _lazy: () => Yk,
    _length: () => Tt,
    _literal: () => Jk,
    _lowercase: () => yn,
    _lt: () => Ne,
    _lte: () => he,
    _map: () => Ak,
    _max: () => he,
    _maxLength: () => Et,
    _maxSize: () => Zt,
    _mime: () => wn,
    _min: () => ue,
    _minLength: () => Ke,
    _minSize: () => ot,
    _multipleOf: () => it,
    _nan: () => _u,
    _nanoid: () => Kr,
    _nativeEnum: () => Rk,
    _negative: () => xu,
    _never: () => hu,
    _nonnegative: () => Su,
    _nonoptional: () => Bk,
    _nonpositive: () => wu,
    _normalize: () => Sn,
    _null: () => fu,
    _nullable: () => Mk,
    _number: () => Qs,
    _optional: () => Vk,
    _overwrite: () => Ze,
    _parse: () => jt,
    _parseAsync: () => Ot,
    _pipe: () => qk,
    _positive: () => ku,
    _promise: () => Qk,
    _property: () => Iu,
    _readonly: () => Xk,
    _record: () => Tk,
    _refine: () => Uu,
    _regex: () => bn,
    _safeDecode: () => xr,
    _safeDecodeAsync: () => Sr,
    _safeEncode: () => kr,
    _safeEncodeAsync: () => wr,
    _safeParse: () => Ut,
    _safeParseAsync: () => Pt,
    _set: () => Ck,
    _size: () => hn,
    _startsWith: () => kn,
    _string: () => Bs,
    _stringFormat: () => At,
    _stringbool: () => Nu,
    _success: () => Gk,
    _superRefine: () => Pu,
    _symbol: () => mu,
    _templateLiteral: () => Hk,
    _toLowerCase: () => zn,
    _toUpperCase: () => jn,
    _transform: () => Fk,
    _trim: () => In,
    _tuple: () => Ek,
    _uint32: () => ou,
    _uint64: () => du,
    _ulid: () => Hr,
    _undefined: () => pu,
    _union: () => Nk,
    _unknown: () => gu,
    _uppercase: () => $n,
    _url: () => gn,
    _uuid: () => Vr,
    _uuidv4: () => Mr,
    _uuidv6: () => Wr,
    _uuidv7: () => Br,
    _void: () => bu,
    _xid: () => Yr,
    clone: () => te,
    config: () => q,
    decode: () => e_,
    decodeAsync: () => n_,
    encode: () => Q$,
    encodeAsync: () => t_,
    flattenError: () => on,
    formatError: () => an,
    globalConfig: () => Xt,
    globalRegistry: () => Ue,
    isValidBase64: () => ns,
    isValidBase64URL: () => $m,
    isValidJWT: () => _m,
    locales: () => fn,
    parse: () => gr,
    parseAsync: () => hr,
    prettifyError: () => Lo,
    regexes: () => ge,
    registry: () => Jr,
    safeDecode: () => i_,
    safeDecodeAsync: () => a_,
    safeEncode: () => r_,
    safeEncodeAsync: () => o_,
    safeParse: () => Ro,
    safeParseAsync: () => Jo,
    toDotPath: () => rm,
    toJSONSchema: () => Du,
    treeifyError: () => Co,
    util: () => O,
    version: () => Ea,
  });
  var jo = Object.freeze({ status: 'aborted' });
  function h(e, t, i) {
    function n(u, a) {
      var c;
      (Object.defineProperty(u, '_zod', {
        value: u._zod ?? {},
        enumerable: !1,
      }),
        (c = u._zod).traits ?? (c.traits = new Set()),
        u._zod.traits.add(e),
        t(u, a));
      for (let m in s.prototype)
        m in u ||
          Object.defineProperty(u, m, { value: s.prototype[m].bind(u) });
      ((u._zod.constr = s), (u._zod.def = a));
    }
    let r = i?.Parent ?? Object;
    class o extends r {}
    Object.defineProperty(o, 'name', { value: e });
    function s(u) {
      var a;
      let c = i?.Parent ? new o() : this;
      (n(c, u), (a = c._zod).deferred ?? (a.deferred = []));
      for (let m of c._zod.deferred) m();
      return c;
    }
    return (
      Object.defineProperty(s, 'init', { value: n }),
      Object.defineProperty(s, Symbol.hasInstance, {
        value: (u) =>
          i?.Parent && u instanceof i.Parent ? !0 : u?._zod?.traits?.has(e),
      }),
      Object.defineProperty(s, 'name', { value: e }),
      s
    );
  }
  var pr = Symbol('zod_brand'),
    ke = class extends Error {
      constructor() {
        super(
          'Encountered Promise during synchronous parse. Use .parseAsync() instead.',
        );
      }
    },
    Fe = class extends Error {
      constructor(t) {
        (super(`Encountered unidirectional transform during encode: ${t}`),
          (this.name = 'ZodEncodeError'));
      }
    },
    Xt = {};
  function q(e) {
    return (e && Object.assign(Xt, e), Xt);
  }
  var O = {};
  Je(O, {
    BIGINT_FORMAT_RANGES: () => Ao,
    Class: () => Uo,
    NUMBER_FORMAT_RANGES: () => To,
    aborted: () => Ge,
    allowsEval: () => No,
    assert: () => P$,
    assertEqual: () => z$,
    assertIs: () => O$,
    assertNever: () => U$,
    assertNotEqual: () => j$,
    assignProp: () => Me,
    base64ToUint8Array: () => em,
    base64urlToUint8Array: () => K$,
    cached: () => It,
    captureStackTrace: () => vr,
    cleanEnum: () => G$,
    cleanRegex: () => Qt,
    clone: () => te,
    cloneDef: () => D$,
    createTransparentProxy: () => L$,
    defineLazy: () => L,
    esc: () => fr,
    escapeRegex: () => Oe,
    extend: () => F$,
    finalizeIssue: () => de,
    floatSafeRemainder: () => Po,
    getElementAtPath: () => Z$,
    getEnumValues: () => Yt,
    getLengthableOrigin: () => nn,
    getParsedType: () => C$,
    getSizableOrigin: () => tn,
    hexToUint8Array: () => X$,
    isObject: () => tt,
    isPlainObject: () => Be,
    issue: () => zt,
    joinValues: () => _,
    jsonStringifyReplacer: () => St,
    merge: () => M$,
    mergeDefs: () => We,
    normalizeParams: () => j,
    nullish: () => Ve,
    numKeys: () => A$,
    objectClone: () => N$,
    omit: () => J$,
    optionalKeys: () => Eo,
    partial: () => W$,
    pick: () => R$,
    prefixIssues: () => le,
    primitiveTypes: () => Zo,
    promiseAllObject: () => E$,
    propertyKeyTypes: () => en,
    randomString: () => T$,
    required: () => B$,
    safeExtend: () => V$,
    shallowClone: () => Do,
    stringifyPrimitive: () => I,
    uint8ArrayToBase64: () => tm,
    uint8ArrayToBase64url: () => q$,
    uint8ArrayToHex: () => H$,
    unwrapMessage: () => Ht,
  });
  function z$(e) {
    return e;
  }
  function j$(e) {
    return e;
  }
  function O$(e) {}
  function U$(e) {
    throw new Error();
  }
  function P$(e) {}
  function Yt(e) {
    let t = Object.values(e).filter((n) => typeof n == 'number');
    return Object.entries(e)
      .filter(([n, r]) => t.indexOf(+n) === -1)
      .map(([n, r]) => r);
  }
  function _(e, t = '|') {
    return e.map((i) => I(i)).join(t);
  }
  function St(e, t) {
    return typeof t == 'bigint' ? t.toString() : t;
  }
  function It(e) {
    return {
      get value() {
        {
          let i = e();
          return (Object.defineProperty(this, 'value', { value: i }), i);
        }
        throw new Error('cached value already set');
      },
    };
  }
  function Ve(e) {
    return e == null;
  }
  function Qt(e) {
    let t = e.startsWith('^') ? 1 : 0,
      i = e.endsWith('$') ? e.length - 1 : e.length;
    return e.slice(t, i);
  }
  function Po(e, t) {
    let i = (e.toString().split('.')[1] || '').length,
      n = t.toString(),
      r = (n.split('.')[1] || '').length;
    if (r === 0 && /\d?e-\d?/.test(n)) {
      let a = n.match(/\d?e-(\d?)/);
      a?.[1] && (r = Number.parseInt(a[1]));
    }
    let o = i > r ? i : r,
      s = Number.parseInt(e.toFixed(o).replace('.', '')),
      u = Number.parseInt(t.toFixed(o).replace('.', ''));
    return (s % u) / 10 ** o;
  }
  var Qd = Symbol('evaluating');
  function L(e, t, i) {
    let n;
    Object.defineProperty(e, t, {
      get() {
        if (n !== Qd) return (n === void 0 && ((n = Qd), (n = i())), n);
      },
      set(r) {
        Object.defineProperty(e, t, { value: r });
      },
      configurable: !0,
    });
  }
  function N$(e) {
    return Object.create(
      Object.getPrototypeOf(e),
      Object.getOwnPropertyDescriptors(e),
    );
  }
  function Me(e, t, i) {
    Object.defineProperty(e, t, {
      value: i,
      writable: !0,
      enumerable: !0,
      configurable: !0,
    });
  }
  function We(...e) {
    let t = {};
    for (let i of e) {
      let n = Object.getOwnPropertyDescriptors(i);
      Object.assign(t, n);
    }
    return Object.defineProperties({}, t);
  }
  function D$(e) {
    return We(e._zod.def);
  }
  function Z$(e, t) {
    return t ? t.reduce((i, n) => i?.[n], e) : e;
  }
  function E$(e) {
    let t = Object.keys(e),
      i = t.map((n) => e[n]);
    return Promise.all(i).then((n) => {
      let r = {};
      for (let o = 0; o < t.length; o++) r[t[o]] = n[o];
      return r;
    });
  }
  function T$(e = 10) {
    let t = 'abcdefghijklmnopqrstuvwxyz',
      i = '';
    for (let n = 0; n < e; n++) i += t[Math.floor(Math.random() * t.length)];
    return i;
  }
  function fr(e) {
    return JSON.stringify(e);
  }
  var vr =
    'captureStackTrace' in Error ? Error.captureStackTrace : (...e) => {};
  function tt(e) {
    return typeof e == 'object' && e !== null && !Array.isArray(e);
  }
  var No = It(() => {
    if (typeof navigator < 'u' && navigator?.userAgent?.includes('Cloudflare'))
      return !1;
    try {
      let e = Function;
      return (new e(''), !0);
    } catch {
      return !1;
    }
  });
  function Be(e) {
    if (tt(e) === !1) return !1;
    let t = e.constructor;
    if (t === void 0) return !0;
    let i = t.prototype;
    return !(
      tt(i) === !1 ||
      Object.prototype.hasOwnProperty.call(i, 'isPrototypeOf') === !1
    );
  }
  function Do(e) {
    return Be(e) ? { ...e } : Array.isArray(e) ? [...e] : e;
  }
  function A$(e) {
    let t = 0;
    for (let i in e) Object.prototype.hasOwnProperty.call(e, i) && t++;
    return t;
  }
  var C$ = (e) => {
      let t = typeof e;
      switch (t) {
        case 'undefined':
          return 'undefined';
        case 'string':
          return 'string';
        case 'number':
          return Number.isNaN(e) ? 'nan' : 'number';
        case 'boolean':
          return 'boolean';
        case 'function':
          return 'function';
        case 'bigint':
          return 'bigint';
        case 'symbol':
          return 'symbol';
        case 'object':
          return Array.isArray(e)
            ? 'array'
            : e === null
              ? 'null'
              : e.then &&
                  typeof e.then == 'function' &&
                  e.catch &&
                  typeof e.catch == 'function'
                ? 'promise'
                : typeof Map < 'u' && e instanceof Map
                  ? 'map'
                  : typeof Set < 'u' && e instanceof Set
                    ? 'set'
                    : typeof Date < 'u' && e instanceof Date
                      ? 'date'
                      : typeof File < 'u' && e instanceof File
                        ? 'file'
                        : 'object';
        default:
          throw new Error(`Unknown data type: ${t}`);
      }
    },
    en = new Set(['string', 'number', 'symbol']),
    Zo = new Set([
      'string',
      'number',
      'bigint',
      'boolean',
      'symbol',
      'undefined',
    ]);
  function Oe(e) {
    return e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function te(e, t, i) {
    let n = new e._zod.constr(t ?? e._zod.def);
    return ((!t || i?.parent) && (n._zod.parent = e), n);
  }
  function j(e) {
    let t = e;
    if (!t) return {};
    if (typeof t == 'string') return { error: () => t };
    if (t?.message !== void 0) {
      if (t?.error !== void 0)
        throw new Error('Cannot specify both `message` and `error` params');
      t.error = t.message;
    }
    return (
      delete t.message,
      typeof t.error == 'string' ? { ...t, error: () => t.error } : t
    );
  }
  function L$(e) {
    let t;
    return new Proxy(
      {},
      {
        get(i, n, r) {
          return (t ?? (t = e()), Reflect.get(t, n, r));
        },
        set(i, n, r, o) {
          return (t ?? (t = e()), Reflect.set(t, n, r, o));
        },
        has(i, n) {
          return (t ?? (t = e()), Reflect.has(t, n));
        },
        deleteProperty(i, n) {
          return (t ?? (t = e()), Reflect.deleteProperty(t, n));
        },
        ownKeys(i) {
          return (t ?? (t = e()), Reflect.ownKeys(t));
        },
        getOwnPropertyDescriptor(i, n) {
          return (t ?? (t = e()), Reflect.getOwnPropertyDescriptor(t, n));
        },
        defineProperty(i, n, r) {
          return (t ?? (t = e()), Reflect.defineProperty(t, n, r));
        },
      },
    );
  }
  function I(e) {
    return typeof e == 'bigint'
      ? e.toString() + 'n'
      : typeof e == 'string'
        ? `"${e}"`
        : `${e}`;
  }
  function Eo(e) {
    return Object.keys(e).filter(
      (t) => e[t]._zod.optin === 'optional' && e[t]._zod.optout === 'optional',
    );
  }
  var To = {
      safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
      int32: [-2147483648, 2147483647],
      uint32: [0, 4294967295],
      float32: [-34028234663852886e22, 34028234663852886e22],
      float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
    },
    Ao = {
      int64: [BigInt('-9223372036854775808'), BigInt('9223372036854775807')],
      uint64: [BigInt(0), BigInt('18446744073709551615')],
    };
  function R$(e, t) {
    let i = e._zod.def,
      n = We(e._zod.def, {
        get shape() {
          let r = {};
          for (let o in t) {
            if (!(o in i.shape)) throw new Error(`Unrecognized key: "${o}"`);
            t[o] && (r[o] = i.shape[o]);
          }
          return (Me(this, 'shape', r), r);
        },
        checks: [],
      });
    return te(e, n);
  }
  function J$(e, t) {
    let i = e._zod.def,
      n = We(e._zod.def, {
        get shape() {
          let r = { ...e._zod.def.shape };
          for (let o in t) {
            if (!(o in i.shape)) throw new Error(`Unrecognized key: "${o}"`);
            t[o] && delete r[o];
          }
          return (Me(this, 'shape', r), r);
        },
        checks: [],
      });
    return te(e, n);
  }
  function F$(e, t) {
    if (!Be(t))
      throw new Error('Invalid input to extend: expected a plain object');
    let i = e._zod.def.checks;
    if (i && i.length > 0)
      throw new Error(
        'Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.',
      );
    let r = We(e._zod.def, {
      get shape() {
        let o = { ...e._zod.def.shape, ...t };
        return (Me(this, 'shape', o), o);
      },
      checks: [],
    });
    return te(e, r);
  }
  function V$(e, t) {
    if (!Be(t))
      throw new Error('Invalid input to safeExtend: expected a plain object');
    let i = {
      ...e._zod.def,
      get shape() {
        let n = { ...e._zod.def.shape, ...t };
        return (Me(this, 'shape', n), n);
      },
      checks: e._zod.def.checks,
    };
    return te(e, i);
  }
  function M$(e, t) {
    let i = We(e._zod.def, {
      get shape() {
        let n = { ...e._zod.def.shape, ...t._zod.def.shape };
        return (Me(this, 'shape', n), n);
      },
      get catchall() {
        return t._zod.def.catchall;
      },
      checks: [],
    });
    return te(e, i);
  }
  function W$(e, t, i) {
    let n = We(t._zod.def, {
      get shape() {
        let r = t._zod.def.shape,
          o = { ...r };
        if (i)
          for (let s in i) {
            if (!(s in r)) throw new Error(`Unrecognized key: "${s}"`);
            i[s] &&
              (o[s] = e ? new e({ type: 'optional', innerType: r[s] }) : r[s]);
          }
        else
          for (let s in r)
            o[s] = e ? new e({ type: 'optional', innerType: r[s] }) : r[s];
        return (Me(this, 'shape', o), o);
      },
      checks: [],
    });
    return te(t, n);
  }
  function B$(e, t, i) {
    let n = We(t._zod.def, {
      get shape() {
        let r = t._zod.def.shape,
          o = { ...r };
        if (i)
          for (let s in i) {
            if (!(s in o)) throw new Error(`Unrecognized key: "${s}"`);
            i[s] && (o[s] = new e({ type: 'nonoptional', innerType: r[s] }));
          }
        else
          for (let s in r)
            o[s] = new e({ type: 'nonoptional', innerType: r[s] });
        return (Me(this, 'shape', o), o);
      },
      checks: [],
    });
    return te(t, n);
  }
  function Ge(e, t = 0) {
    if (e.aborted === !0) return !0;
    for (let i = t; i < e.issues.length; i++)
      if (e.issues[i]?.continue !== !0) return !0;
    return !1;
  }
  function le(e, t) {
    return t.map((i) => {
      var n;
      return ((n = i).path ?? (n.path = []), i.path.unshift(e), i);
    });
  }
  function Ht(e) {
    return typeof e == 'string' ? e : e?.message;
  }
  function de(e, t, i) {
    let n = { ...e, path: e.path ?? [] };
    if (!e.message) {
      let r =
        Ht(e.inst?._zod.def?.error?.(e)) ??
        Ht(t?.error?.(e)) ??
        Ht(i.customError?.(e)) ??
        Ht(i.localeError?.(e)) ??
        'Invalid input';
      n.message = r;
    }
    return (
      delete n.inst,
      delete n.continue,
      t?.reportInput || delete n.input,
      n
    );
  }
  function tn(e) {
    return e instanceof Set
      ? 'set'
      : e instanceof Map
        ? 'map'
        : e instanceof File
          ? 'file'
          : 'unknown';
  }
  function nn(e) {
    return Array.isArray(e)
      ? 'array'
      : typeof e == 'string'
        ? 'string'
        : 'unknown';
  }
  function zt(...e) {
    let [t, i, n] = e;
    return typeof t == 'string'
      ? { message: t, code: 'custom', input: i, inst: n }
      : { ...t };
  }
  function G$(e) {
    return Object.entries(e)
      .filter(([t, i]) => Number.isNaN(Number.parseInt(t, 10)))
      .map((t) => t[1]);
  }
  function em(e) {
    let t = atob(e),
      i = new Uint8Array(t.length);
    for (let n = 0; n < t.length; n++) i[n] = t.charCodeAt(n);
    return i;
  }
  function tm(e) {
    let t = '';
    for (let i = 0; i < e.length; i++) t += String.fromCharCode(e[i]);
    return btoa(t);
  }
  function K$(e) {
    let t = e.replace(/-/g, '+').replace(/_/g, '/'),
      i = '='.repeat((4 - (t.length % 4)) % 4);
    return em(t + i);
  }
  function q$(e) {
    return tm(e).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  function X$(e) {
    let t = e.replace(/^0x/, '');
    if (t.length % 2 !== 0) throw new Error('Invalid hex string length');
    let i = new Uint8Array(t.length / 2);
    for (let n = 0; n < t.length; n += 2)
      i[n / 2] = Number.parseInt(t.slice(n, n + 2), 16);
    return i;
  }
  function H$(e) {
    return Array.from(e)
      .map((t) => t.toString(16).padStart(2, '0'))
      .join('');
  }
  var Uo = class {
    constructor(...t) {}
  };
  var nm = (e, t) => {
      ((e.name = '$ZodError'),
        Object.defineProperty(e, '_zod', { value: e._zod, enumerable: !1 }),
        Object.defineProperty(e, 'issues', { value: t, enumerable: !1 }),
        (e.message = JSON.stringify(t, St, 2)),
        Object.defineProperty(e, 'toString', {
          value: () => e.message,
          enumerable: !1,
        }));
    },
    rn = h('$ZodError', nm),
    se = h('$ZodError', nm, { Parent: Error });
  function on(e, t = (i) => i.message) {
    let i = {},
      n = [];
    for (let r of e.issues)
      r.path.length > 0
        ? ((i[r.path[0]] = i[r.path[0]] || []), i[r.path[0]].push(t(r)))
        : n.push(t(r));
    return { formErrors: n, fieldErrors: i };
  }
  function an(e, t = (i) => i.message) {
    let i = { _errors: [] },
      n = (r) => {
        for (let o of r.issues)
          if (o.code === 'invalid_union' && o.errors.length)
            o.errors.map((s) => n({ issues: s }));
          else if (o.code === 'invalid_key') n({ issues: o.issues });
          else if (o.code === 'invalid_element') n({ issues: o.issues });
          else if (o.path.length === 0) i._errors.push(t(o));
          else {
            let s = i,
              u = 0;
            for (; u < o.path.length; ) {
              let a = o.path[u];
              (u === o.path.length - 1
                ? ((s[a] = s[a] || { _errors: [] }), s[a]._errors.push(t(o)))
                : (s[a] = s[a] || { _errors: [] }),
                (s = s[a]),
                u++);
            }
          }
      };
    return (n(e), i);
  }
  function Co(e, t = (i) => i.message) {
    let i = { errors: [] },
      n = (r, o = []) => {
        var s, u;
        for (let a of r.issues)
          if (a.code === 'invalid_union' && a.errors.length)
            a.errors.map((c) => n({ issues: c }, a.path));
          else if (a.code === 'invalid_key') n({ issues: a.issues }, a.path);
          else if (a.code === 'invalid_element')
            n({ issues: a.issues }, a.path);
          else {
            let c = [...o, ...a.path];
            if (c.length === 0) {
              i.errors.push(t(a));
              continue;
            }
            let m = i,
              p = 0;
            for (; p < c.length; ) {
              let f = c[p],
                v = p === c.length - 1;
              (typeof f == 'string'
                ? (m.properties ?? (m.properties = {}),
                  (s = m.properties)[f] ?? (s[f] = { errors: [] }),
                  (m = m.properties[f]))
                : (m.items ?? (m.items = []),
                  (u = m.items)[f] ?? (u[f] = { errors: [] }),
                  (m = m.items[f])),
                v && m.errors.push(t(a)),
                p++);
            }
          }
      };
    return (n(e), i);
  }
  function rm(e) {
    let t = [],
      i = e.map((n) => (typeof n == 'object' ? n.key : n));
    for (let n of i)
      typeof n == 'number'
        ? t.push(`[${n}]`)
        : typeof n == 'symbol'
          ? t.push(`[${JSON.stringify(String(n))}]`)
          : /[^\w$]/.test(n)
            ? t.push(`[${JSON.stringify(n)}]`)
            : (t.length && t.push('.'), t.push(n));
    return t.join('');
  }
  function Lo(e) {
    let t = [],
      i = [...e.issues].sort(
        (n, r) => (n.path ?? []).length - (r.path ?? []).length,
      );
    for (let n of i)
      (t.push(`✖ ${n.message}`),
        n.path?.length && t.push(`  → at ${rm(n.path)}`));
    return t.join(`
`);
  }
  var jt = (e) => (t, i, n, r) => {
      let o = n ? Object.assign(n, { async: !1 }) : { async: !1 },
        s = t._zod.run({ value: i, issues: [] }, o);
      if (s instanceof Promise) throw new ke();
      if (s.issues.length) {
        let u = new (r?.Err ?? e)(s.issues.map((a) => de(a, o, q())));
        throw (vr(u, r?.callee), u);
      }
      return s.value;
    },
    gr = jt(se),
    Ot = (e) => async (t, i, n, r) => {
      let o = n ? Object.assign(n, { async: !0 }) : { async: !0 },
        s = t._zod.run({ value: i, issues: [] }, o);
      if ((s instanceof Promise && (s = await s), s.issues.length)) {
        let u = new (r?.Err ?? e)(s.issues.map((a) => de(a, o, q())));
        throw (vr(u, r?.callee), u);
      }
      return s.value;
    },
    hr = Ot(se),
    Ut = (e) => (t, i, n) => {
      let r = n ? { ...n, async: !1 } : { async: !1 },
        o = t._zod.run({ value: i, issues: [] }, r);
      if (o instanceof Promise) throw new ke();
      return o.issues.length
        ? {
            success: !1,
            error: new (e ?? rn)(o.issues.map((s) => de(s, r, q()))),
          }
        : { success: !0, data: o.value };
    },
    Ro = Ut(se),
    Pt = (e) => async (t, i, n) => {
      let r = n ? Object.assign(n, { async: !0 }) : { async: !0 },
        o = t._zod.run({ value: i, issues: [] }, r);
      return (
        o instanceof Promise && (o = await o),
        o.issues.length
          ? { success: !1, error: new e(o.issues.map((s) => de(s, r, q()))) }
          : { success: !0, data: o.value }
      );
    },
    Jo = Pt(se),
    br = (e) => (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return jt(e)(t, i, r);
    },
    Q$ = br(se),
    yr = (e) => (t, i, n) => jt(e)(t, i, n),
    e_ = yr(se),
    $r = (e) => async (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return Ot(e)(t, i, r);
    },
    t_ = $r(se),
    _r = (e) => async (t, i, n) => Ot(e)(t, i, n),
    n_ = _r(se),
    kr = (e) => (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return Ut(e)(t, i, r);
    },
    r_ = kr(se),
    xr = (e) => (t, i, n) => Ut(e)(t, i, n),
    i_ = xr(se),
    wr = (e) => async (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return Pt(e)(t, i, r);
    },
    o_ = wr(se),
    Sr = (e) => async (t, i, n) => Pt(e)(t, i, n),
    a_ = Sr(se);
  var ge = {};
  Je(ge, {
    base64: () => na,
    base64url: () => Ir,
    bigint: () => ca,
    boolean: () => ma,
    browserEmail: () => f_,
    cidrv4: () => ea,
    cidrv6: () => ta,
    cuid: () => Fo,
    cuid2: () => Vo,
    date: () => oa,
    datetime: () => sa,
    domain: () => g_,
    duration: () => Ko,
    e164: () => ia,
    email: () => Xo,
    emoji: () => Ho,
    extendedDuration: () => s_,
    guid: () => qo,
    hex: () => h_,
    hostname: () => ra,
    html5Email: () => d_,
    idnEmail: () => p_,
    integer: () => la,
    ipv4: () => Yo,
    ipv6: () => Qo,
    ksuid: () => Bo,
    lowercase: () => va,
    md5_base64: () => y_,
    md5_base64url: () => $_,
    md5_hex: () => b_,
    nanoid: () => Go,
    null: () => pa,
    number: () => da,
    rfc5322Email: () => m_,
    sha1_base64: () => k_,
    sha1_base64url: () => x_,
    sha1_hex: () => __,
    sha256_base64: () => S_,
    sha256_base64url: () => I_,
    sha256_hex: () => w_,
    sha384_base64: () => j_,
    sha384_base64url: () => O_,
    sha384_hex: () => z_,
    sha512_base64: () => P_,
    sha512_base64url: () => N_,
    sha512_hex: () => U_,
    string: () => ua,
    time: () => aa,
    ulid: () => Mo,
    undefined: () => fa,
    unicodeEmail: () => im,
    uppercase: () => ga,
    uuid: () => nt,
    uuid4: () => u_,
    uuid6: () => c_,
    uuid7: () => l_,
    xid: () => Wo,
  });
  var Fo = /^[cC][^\s-]{8,}$/,
    Vo = /^[0-9a-z]+$/,
    Mo = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/,
    Wo = /^[0-9a-vA-V]{20}$/,
    Bo = /^[A-Za-z0-9]{27}$/,
    Go = /^[a-zA-Z0-9_-]{21}$/,
    Ko =
      /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/,
    s_ =
      /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
    qo =
      /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
    nt = (e) =>
      e
        ? new RegExp(
            `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`,
          )
        : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/,
    u_ = nt(4),
    c_ = nt(6),
    l_ = nt(7),
    Xo =
      /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/,
    d_ =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    m_ =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    im = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u,
    p_ = im,
    f_ =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    v_ = '^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$';
  function Ho() {
    return new RegExp(v_, 'u');
  }
  var Yo =
      /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    Qo =
      /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/,
    ea =
      /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/,
    ta =
      /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    na =
      /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/,
    Ir = /^[A-Za-z0-9_-]*$/,
    ra =
      /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/,
    g_ = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    ia = /^\+(?:[0-9]){6,14}[0-9]$/,
    om =
      '(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))',
    oa = new RegExp(`^${om}$`);
  function am(e) {
    let t = '(?:[01]\\d|2[0-3]):[0-5]\\d';
    return typeof e.precision == 'number'
      ? e.precision === -1
        ? `${t}`
        : e.precision === 0
          ? `${t}:[0-5]\\d`
          : `${t}:[0-5]\\d\\.\\d{${e.precision}}`
      : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  }
  function aa(e) {
    return new RegExp(`^${am(e)}$`);
  }
  function sa(e) {
    let t = am({ precision: e.precision }),
      i = ['Z'];
    (e.local && i.push(''),
      e.offset && i.push('([+-](?:[01]\\d|2[0-3]):[0-5]\\d)'));
    let n = `${t}(?:${i.join('|')})`;
    return new RegExp(`^${om}T(?:${n})$`);
  }
  var ua = (e) => {
      let t = e
        ? `[\\s\\S]{${e?.minimum ?? 0},${e?.maximum ?? ''}}`
        : '[\\s\\S]*';
      return new RegExp(`^${t}$`);
    },
    ca = /^-?\d+n?$/,
    la = /^-?\d+$/,
    da = /^-?\d+(?:\.\d+)?/,
    ma = /^(?:true|false)$/i,
    pa = /^null$/i;
  var fa = /^undefined$/i;
  var va = /^[^A-Z]*$/,
    ga = /^[^a-z]*$/,
    h_ = /^[0-9a-fA-F]*$/;
  function sn(e, t) {
    return new RegExp(`^[A-Za-z0-9+/]{${e}}${t}$`);
  }
  function un(e) {
    return new RegExp(`^[A-Za-z0-9_-]{${e}}$`);
  }
  var b_ = /^[0-9a-fA-F]{32}$/,
    y_ = sn(22, '=='),
    $_ = un(22),
    __ = /^[0-9a-fA-F]{40}$/,
    k_ = sn(27, '='),
    x_ = un(27),
    w_ = /^[0-9a-fA-F]{64}$/,
    S_ = sn(43, '='),
    I_ = un(43),
    z_ = /^[0-9a-fA-F]{96}$/,
    j_ = sn(64, ''),
    O_ = un(64),
    U_ = /^[0-9a-fA-F]{128}$/,
    P_ = sn(86, '=='),
    N_ = un(86);
  var B = h('$ZodCheck', (e, t) => {
      var i;
      (e._zod ?? (e._zod = {}),
        (e._zod.def = t),
        (i = e._zod).onattach ?? (i.onattach = []));
    }),
    um = { number: 'number', bigint: 'bigint', object: 'date' },
    zr = h('$ZodCheckLessThan', (e, t) => {
      B.init(e, t);
      let i = um[typeof t.value];
      (e._zod.onattach.push((n) => {
        let r = n._zod.bag,
          o =
            (t.inclusive ? r.maximum : r.exclusiveMaximum) ??
            Number.POSITIVE_INFINITY;
        t.value < o &&
          (t.inclusive
            ? (r.maximum = t.value)
            : (r.exclusiveMaximum = t.value));
      }),
        (e._zod.check = (n) => {
          (t.inclusive ? n.value <= t.value : n.value < t.value) ||
            n.issues.push({
              origin: i,
              code: 'too_big',
              maximum: t.value,
              input: n.value,
              inclusive: t.inclusive,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    jr = h('$ZodCheckGreaterThan', (e, t) => {
      B.init(e, t);
      let i = um[typeof t.value];
      (e._zod.onattach.push((n) => {
        let r = n._zod.bag,
          o =
            (t.inclusive ? r.minimum : r.exclusiveMinimum) ??
            Number.NEGATIVE_INFINITY;
        t.value > o &&
          (t.inclusive
            ? (r.minimum = t.value)
            : (r.exclusiveMinimum = t.value));
      }),
        (e._zod.check = (n) => {
          (t.inclusive ? n.value >= t.value : n.value > t.value) ||
            n.issues.push({
              origin: i,
              code: 'too_small',
              minimum: t.value,
              input: n.value,
              inclusive: t.inclusive,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    ha = h('$ZodCheckMultipleOf', (e, t) => {
      (B.init(e, t),
        e._zod.onattach.push((i) => {
          var n;
          (n = i._zod.bag).multipleOf ?? (n.multipleOf = t.value);
        }),
        (e._zod.check = (i) => {
          if (typeof i.value != typeof t.value)
            throw new Error(
              'Cannot mix number and bigint in multiple_of check.',
            );
          (typeof i.value == 'bigint'
            ? i.value % t.value === BigInt(0)
            : Po(i.value, t.value) === 0) ||
            i.issues.push({
              origin: typeof i.value,
              code: 'not_multiple_of',
              divisor: t.value,
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    ba = h('$ZodCheckNumberFormat', (e, t) => {
      (B.init(e, t), (t.format = t.format || 'float64'));
      let i = t.format?.includes('int'),
        n = i ? 'int' : 'number',
        [r, o] = To[t.format];
      (e._zod.onattach.push((s) => {
        let u = s._zod.bag;
        ((u.format = t.format),
          (u.minimum = r),
          (u.maximum = o),
          i && (u.pattern = la));
      }),
        (e._zod.check = (s) => {
          let u = s.value;
          if (i) {
            if (!Number.isInteger(u)) {
              s.issues.push({
                expected: n,
                format: t.format,
                code: 'invalid_type',
                continue: !1,
                input: u,
                inst: e,
              });
              return;
            }
            if (!Number.isSafeInteger(u)) {
              u > 0
                ? s.issues.push({
                    input: u,
                    code: 'too_big',
                    maximum: Number.MAX_SAFE_INTEGER,
                    note: 'Integers must be within the safe integer range.',
                    inst: e,
                    origin: n,
                    continue: !t.abort,
                  })
                : s.issues.push({
                    input: u,
                    code: 'too_small',
                    minimum: Number.MIN_SAFE_INTEGER,
                    note: 'Integers must be within the safe integer range.',
                    inst: e,
                    origin: n,
                    continue: !t.abort,
                  });
              return;
            }
          }
          (u < r &&
            s.issues.push({
              origin: 'number',
              input: u,
              code: 'too_small',
              minimum: r,
              inclusive: !0,
              inst: e,
              continue: !t.abort,
            }),
            u > o &&
              s.issues.push({
                origin: 'number',
                input: u,
                code: 'too_big',
                maximum: o,
                inst: e,
              }));
        }));
    }),
    ya = h('$ZodCheckBigIntFormat', (e, t) => {
      B.init(e, t);
      let [i, n] = Ao[t.format];
      (e._zod.onattach.push((r) => {
        let o = r._zod.bag;
        ((o.format = t.format), (o.minimum = i), (o.maximum = n));
      }),
        (e._zod.check = (r) => {
          let o = r.value;
          (o < i &&
            r.issues.push({
              origin: 'bigint',
              input: o,
              code: 'too_small',
              minimum: i,
              inclusive: !0,
              inst: e,
              continue: !t.abort,
            }),
            o > n &&
              r.issues.push({
                origin: 'bigint',
                input: o,
                code: 'too_big',
                maximum: n,
                inst: e,
              }));
        }));
    }),
    $a = h('$ZodCheckMaxSize', (e, t) => {
      var i;
      (B.init(e, t),
        (i = e._zod.def).when ??
          (i.when = (n) => {
            let r = n.value;
            return !Ve(r) && r.size !== void 0;
          }),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
          t.maximum < r && (n._zod.bag.maximum = t.maximum);
        }),
        (e._zod.check = (n) => {
          let r = n.value;
          r.size <= t.maximum ||
            n.issues.push({
              origin: tn(r),
              code: 'too_big',
              maximum: t.maximum,
              inclusive: !0,
              input: r,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    _a = h('$ZodCheckMinSize', (e, t) => {
      var i;
      (B.init(e, t),
        (i = e._zod.def).when ??
          (i.when = (n) => {
            let r = n.value;
            return !Ve(r) && r.size !== void 0;
          }),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
          t.minimum > r && (n._zod.bag.minimum = t.minimum);
        }),
        (e._zod.check = (n) => {
          let r = n.value;
          r.size >= t.minimum ||
            n.issues.push({
              origin: tn(r),
              code: 'too_small',
              minimum: t.minimum,
              inclusive: !0,
              input: r,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    ka = h('$ZodCheckSizeEquals', (e, t) => {
      var i;
      (B.init(e, t),
        (i = e._zod.def).when ??
          (i.when = (n) => {
            let r = n.value;
            return !Ve(r) && r.size !== void 0;
          }),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag;
          ((r.minimum = t.size), (r.maximum = t.size), (r.size = t.size));
        }),
        (e._zod.check = (n) => {
          let r = n.value,
            o = r.size;
          if (o === t.size) return;
          let s = o > t.size;
          n.issues.push({
            origin: tn(r),
            ...(s
              ? { code: 'too_big', maximum: t.size }
              : { code: 'too_small', minimum: t.size }),
            inclusive: !0,
            exact: !0,
            input: n.value,
            inst: e,
            continue: !t.abort,
          });
        }));
    }),
    xa = h('$ZodCheckMaxLength', (e, t) => {
      var i;
      (B.init(e, t),
        (i = e._zod.def).when ??
          (i.when = (n) => {
            let r = n.value;
            return !Ve(r) && r.length !== void 0;
          }),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
          t.maximum < r && (n._zod.bag.maximum = t.maximum);
        }),
        (e._zod.check = (n) => {
          let r = n.value;
          if (r.length <= t.maximum) return;
          let s = nn(r);
          n.issues.push({
            origin: s,
            code: 'too_big',
            maximum: t.maximum,
            inclusive: !0,
            input: r,
            inst: e,
            continue: !t.abort,
          });
        }));
    }),
    wa = h('$ZodCheckMinLength', (e, t) => {
      var i;
      (B.init(e, t),
        (i = e._zod.def).when ??
          (i.when = (n) => {
            let r = n.value;
            return !Ve(r) && r.length !== void 0;
          }),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
          t.minimum > r && (n._zod.bag.minimum = t.minimum);
        }),
        (e._zod.check = (n) => {
          let r = n.value;
          if (r.length >= t.minimum) return;
          let s = nn(r);
          n.issues.push({
            origin: s,
            code: 'too_small',
            minimum: t.minimum,
            inclusive: !0,
            input: r,
            inst: e,
            continue: !t.abort,
          });
        }));
    }),
    Sa = h('$ZodCheckLengthEquals', (e, t) => {
      var i;
      (B.init(e, t),
        (i = e._zod.def).when ??
          (i.when = (n) => {
            let r = n.value;
            return !Ve(r) && r.length !== void 0;
          }),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag;
          ((r.minimum = t.length),
            (r.maximum = t.length),
            (r.length = t.length));
        }),
        (e._zod.check = (n) => {
          let r = n.value,
            o = r.length;
          if (o === t.length) return;
          let s = nn(r),
            u = o > t.length;
          n.issues.push({
            origin: s,
            ...(u
              ? { code: 'too_big', maximum: t.length }
              : { code: 'too_small', minimum: t.length }),
            inclusive: !0,
            exact: !0,
            input: n.value,
            inst: e,
            continue: !t.abort,
          });
        }));
    }),
    Nt = h('$ZodCheckStringFormat', (e, t) => {
      var i, n;
      (B.init(e, t),
        e._zod.onattach.push((r) => {
          let o = r._zod.bag;
          ((o.format = t.format),
            t.pattern &&
              (o.patterns ?? (o.patterns = new Set()),
              o.patterns.add(t.pattern)));
        }),
        t.pattern
          ? ((i = e._zod).check ??
            (i.check = (r) => {
              ((t.pattern.lastIndex = 0),
                !t.pattern.test(r.value) &&
                  r.issues.push({
                    origin: 'string',
                    code: 'invalid_format',
                    format: t.format,
                    input: r.value,
                    ...(t.pattern ? { pattern: t.pattern.toString() } : {}),
                    inst: e,
                    continue: !t.abort,
                  }));
            }))
          : ((n = e._zod).check ?? (n.check = () => {})));
    }),
    Ia = h('$ZodCheckRegex', (e, t) => {
      (Nt.init(e, t),
        (e._zod.check = (i) => {
          ((t.pattern.lastIndex = 0),
            !t.pattern.test(i.value) &&
              i.issues.push({
                origin: 'string',
                code: 'invalid_format',
                format: 'regex',
                input: i.value,
                pattern: t.pattern.toString(),
                inst: e,
                continue: !t.abort,
              }));
        }));
    }),
    za = h('$ZodCheckLowerCase', (e, t) => {
      (t.pattern ?? (t.pattern = va), Nt.init(e, t));
    }),
    ja = h('$ZodCheckUpperCase', (e, t) => {
      (t.pattern ?? (t.pattern = ga), Nt.init(e, t));
    }),
    Oa = h('$ZodCheckIncludes', (e, t) => {
      B.init(e, t);
      let i = Oe(t.includes),
        n = new RegExp(
          typeof t.position == 'number' ? `^.{${t.position}}${i}` : i,
        );
      ((t.pattern = n),
        e._zod.onattach.push((r) => {
          let o = r._zod.bag;
          (o.patterns ?? (o.patterns = new Set()), o.patterns.add(n));
        }),
        (e._zod.check = (r) => {
          r.value.includes(t.includes, t.position) ||
            r.issues.push({
              origin: 'string',
              code: 'invalid_format',
              format: 'includes',
              includes: t.includes,
              input: r.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    Ua = h('$ZodCheckStartsWith', (e, t) => {
      B.init(e, t);
      let i = new RegExp(`^${Oe(t.prefix)}.*`);
      (t.pattern ?? (t.pattern = i),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag;
          (r.patterns ?? (r.patterns = new Set()), r.patterns.add(i));
        }),
        (e._zod.check = (n) => {
          n.value.startsWith(t.prefix) ||
            n.issues.push({
              origin: 'string',
              code: 'invalid_format',
              format: 'starts_with',
              prefix: t.prefix,
              input: n.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    Pa = h('$ZodCheckEndsWith', (e, t) => {
      B.init(e, t);
      let i = new RegExp(`.*${Oe(t.suffix)}$`);
      (t.pattern ?? (t.pattern = i),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag;
          (r.patterns ?? (r.patterns = new Set()), r.patterns.add(i));
        }),
        (e._zod.check = (n) => {
          n.value.endsWith(t.suffix) ||
            n.issues.push({
              origin: 'string',
              code: 'invalid_format',
              format: 'ends_with',
              suffix: t.suffix,
              input: n.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    });
  function sm(e, t, i) {
    e.issues.length && t.issues.push(...le(i, e.issues));
  }
  var Na = h('$ZodCheckProperty', (e, t) => {
      (B.init(e, t),
        (e._zod.check = (i) => {
          let n = t.schema._zod.run(
            { value: i.value[t.property], issues: [] },
            {},
          );
          if (n instanceof Promise) return n.then((r) => sm(r, i, t.property));
          sm(n, i, t.property);
        }));
    }),
    Da = h('$ZodCheckMimeType', (e, t) => {
      B.init(e, t);
      let i = new Set(t.mime);
      (e._zod.onattach.push((n) => {
        n._zod.bag.mime = t.mime;
      }),
        (e._zod.check = (n) => {
          i.has(n.value.type) ||
            n.issues.push({
              code: 'invalid_value',
              values: t.mime,
              input: n.value.type,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    Za = h('$ZodCheckOverwrite', (e, t) => {
      (B.init(e, t),
        (e._zod.check = (i) => {
          i.value = t.tx(i.value);
        }));
    });
  var cn = class {
    constructor(t = []) {
      ((this.content = []), (this.indent = 0), this && (this.args = t));
    }
    indented(t) {
      ((this.indent += 1), t(this), (this.indent -= 1));
    }
    write(t) {
      if (typeof t == 'function') {
        (t(this, { execution: 'sync' }), t(this, { execution: 'async' }));
        return;
      }
      let n = t
          .split(
            `
`,
          )
          .filter((s) => s),
        r = Math.min(...n.map((s) => s.length - s.trimStart().length)),
        o = n
          .map((s) => s.slice(r))
          .map((s) => ' '.repeat(this.indent * 2) + s);
      for (let s of o) this.content.push(s);
    }
    compile() {
      let t = Function,
        i = this?.args,
        r = [...(this?.content ?? ['']).map((o) => `  ${o}`)];
      return new t(
        ...i,
        r.join(`
`),
      );
    }
  };
  var Ea = { major: 4, minor: 1, patch: 12 };
  var D = h('$ZodType', (e, t) => {
      var i;
      (e ?? (e = {}),
        (e._zod.def = t),
        (e._zod.bag = e._zod.bag || {}),
        (e._zod.version = Ea));
      let n = [...(e._zod.def.checks ?? [])];
      e._zod.traits.has('$ZodCheck') && n.unshift(e);
      for (let r of n) for (let o of r._zod.onattach) o(e);
      if (n.length === 0)
        ((i = e._zod).deferred ?? (i.deferred = []),
          e._zod.deferred?.push(() => {
            e._zod.run = e._zod.parse;
          }));
      else {
        let r = (s, u, a) => {
            let c = Ge(s),
              m;
            for (let p of u) {
              if (p._zod.def.when) {
                if (!p._zod.def.when(s)) continue;
              } else if (c) continue;
              let f = s.issues.length,
                v = p._zod.check(s);
              if (v instanceof Promise && a?.async === !1) throw new ke();
              if (m || v instanceof Promise)
                m = (m ?? Promise.resolve()).then(async () => {
                  (await v, s.issues.length !== f && (c || (c = Ge(s, f))));
                });
              else {
                if (s.issues.length === f) continue;
                c || (c = Ge(s, f));
              }
            }
            return m ? m.then(() => s) : s;
          },
          o = (s, u, a) => {
            if (Ge(s)) return ((s.aborted = !0), s);
            let c = r(u, n, a);
            if (c instanceof Promise) {
              if (a.async === !1) throw new ke();
              return c.then((m) => e._zod.parse(m, a));
            }
            return e._zod.parse(c, a);
          };
        e._zod.run = (s, u) => {
          if (u.skipChecks) return e._zod.parse(s, u);
          if (u.direction === 'backward') {
            let c = e._zod.parse(
              { value: s.value, issues: [] },
              { ...u, skipChecks: !0 },
            );
            return c instanceof Promise
              ? c.then((m) => o(m, s, u))
              : o(c, s, u);
          }
          let a = e._zod.parse(s, u);
          if (a instanceof Promise) {
            if (u.async === !1) throw new ke();
            return a.then((c) => r(c, n, u));
          }
          return r(a, n, u);
        };
      }
      e['~standard'] = {
        validate: (r) => {
          try {
            let o = Ro(e, r);
            return o.success ? { value: o.data } : { issues: o.error?.issues };
          } catch {
            return Jo(e, r).then((s) =>
              s.success ? { value: s.data } : { issues: s.error?.issues },
            );
          }
        },
        vendor: 'zod',
        version: 1,
      };
    }),
    rt = h('$ZodString', (e, t) => {
      (D.init(e, t),
        (e._zod.pattern =
          [...(e?._zod.bag?.patterns ?? [])].pop() ?? ua(e._zod.bag)),
        (e._zod.parse = (i, n) => {
          if (t.coerce)
            try {
              i.value = String(i.value);
            } catch {}
          return (
            typeof i.value == 'string' ||
              i.issues.push({
                expected: 'string',
                code: 'invalid_type',
                input: i.value,
                inst: e,
              }),
            i
          );
        }));
    }),
    V = h('$ZodStringFormat', (e, t) => {
      (Nt.init(e, t), rt.init(e, t));
    }),
    Aa = h('$ZodGUID', (e, t) => {
      (t.pattern ?? (t.pattern = qo), V.init(e, t));
    }),
    Ca = h('$ZodUUID', (e, t) => {
      if (t.version) {
        let n = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[
          t.version
        ];
        if (n === void 0)
          throw new Error(`Invalid UUID version: "${t.version}"`);
        t.pattern ?? (t.pattern = nt(n));
      } else t.pattern ?? (t.pattern = nt());
      V.init(e, t);
    }),
    La = h('$ZodEmail', (e, t) => {
      (t.pattern ?? (t.pattern = Xo), V.init(e, t));
    }),
    Ra = h('$ZodURL', (e, t) => {
      (V.init(e, t),
        (e._zod.check = (i) => {
          try {
            let n = i.value.trim(),
              r = new URL(n);
            (t.hostname &&
              ((t.hostname.lastIndex = 0),
              t.hostname.test(r.hostname) ||
                i.issues.push({
                  code: 'invalid_format',
                  format: 'url',
                  note: 'Invalid hostname',
                  pattern: ra.source,
                  input: i.value,
                  inst: e,
                  continue: !t.abort,
                })),
              t.protocol &&
                ((t.protocol.lastIndex = 0),
                t.protocol.test(
                  r.protocol.endsWith(':')
                    ? r.protocol.slice(0, -1)
                    : r.protocol,
                ) ||
                  i.issues.push({
                    code: 'invalid_format',
                    format: 'url',
                    note: 'Invalid protocol',
                    pattern: t.protocol.source,
                    input: i.value,
                    inst: e,
                    continue: !t.abort,
                  })),
              t.normalize ? (i.value = r.href) : (i.value = n));
            return;
          } catch {
            i.issues.push({
              code: 'invalid_format',
              format: 'url',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
          }
        }));
    }),
    Ja = h('$ZodEmoji', (e, t) => {
      (t.pattern ?? (t.pattern = Ho()), V.init(e, t));
    }),
    Fa = h('$ZodNanoID', (e, t) => {
      (t.pattern ?? (t.pattern = Go), V.init(e, t));
    }),
    Va = h('$ZodCUID', (e, t) => {
      (t.pattern ?? (t.pattern = Fo), V.init(e, t));
    }),
    Ma = h('$ZodCUID2', (e, t) => {
      (t.pattern ?? (t.pattern = Vo), V.init(e, t));
    }),
    Wa = h('$ZodULID', (e, t) => {
      (t.pattern ?? (t.pattern = Mo), V.init(e, t));
    }),
    Ba = h('$ZodXID', (e, t) => {
      (t.pattern ?? (t.pattern = Wo), V.init(e, t));
    }),
    Ga = h('$ZodKSUID', (e, t) => {
      (t.pattern ?? (t.pattern = Bo), V.init(e, t));
    }),
    Ka = h('$ZodISODateTime', (e, t) => {
      (t.pattern ?? (t.pattern = sa(t)), V.init(e, t));
    }),
    qa = h('$ZodISODate', (e, t) => {
      (t.pattern ?? (t.pattern = oa), V.init(e, t));
    }),
    Xa = h('$ZodISOTime', (e, t) => {
      (t.pattern ?? (t.pattern = aa(t)), V.init(e, t));
    }),
    Ha = h('$ZodISODuration', (e, t) => {
      (t.pattern ?? (t.pattern = Ko), V.init(e, t));
    }),
    Ya = h('$ZodIPv4', (e, t) => {
      (t.pattern ?? (t.pattern = Yo),
        V.init(e, t),
        e._zod.onattach.push((i) => {
          let n = i._zod.bag;
          n.format = 'ipv4';
        }));
    }),
    Qa = h('$ZodIPv6', (e, t) => {
      (t.pattern ?? (t.pattern = Qo),
        V.init(e, t),
        e._zod.onattach.push((i) => {
          let n = i._zod.bag;
          n.format = 'ipv6';
        }),
        (e._zod.check = (i) => {
          try {
            new URL(`http://[${i.value}]`);
          } catch {
            i.issues.push({
              code: 'invalid_format',
              format: 'ipv6',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
          }
        }));
    }),
    es = h('$ZodCIDRv4', (e, t) => {
      (t.pattern ?? (t.pattern = ea), V.init(e, t));
    }),
    ts = h('$ZodCIDRv6', (e, t) => {
      (t.pattern ?? (t.pattern = ta),
        V.init(e, t),
        (e._zod.check = (i) => {
          let n = i.value.split('/');
          try {
            if (n.length !== 2) throw new Error();
            let [r, o] = n;
            if (!o) throw new Error();
            let s = Number(o);
            if (`${s}` !== o) throw new Error();
            if (s < 0 || s > 128) throw new Error();
            new URL(`http://[${r}]`);
          } catch {
            i.issues.push({
              code: 'invalid_format',
              format: 'cidrv6',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
          }
        }));
    });
  function ns(e) {
    if (e === '') return !0;
    if (e.length % 4 !== 0) return !1;
    try {
      return (atob(e), !0);
    } catch {
      return !1;
    }
  }
  var rs = h('$ZodBase64', (e, t) => {
    (t.pattern ?? (t.pattern = na),
      V.init(e, t),
      e._zod.onattach.push((i) => {
        i._zod.bag.contentEncoding = 'base64';
      }),
      (e._zod.check = (i) => {
        ns(i.value) ||
          i.issues.push({
            code: 'invalid_format',
            format: 'base64',
            input: i.value,
            inst: e,
            continue: !t.abort,
          });
      }));
  });
  function $m(e) {
    if (!Ir.test(e)) return !1;
    let t = e.replace(/[-_]/g, (n) => (n === '-' ? '+' : '/')),
      i = t.padEnd(Math.ceil(t.length / 4) * 4, '=');
    return ns(i);
  }
  var is = h('$ZodBase64URL', (e, t) => {
      (t.pattern ?? (t.pattern = Ir),
        V.init(e, t),
        e._zod.onattach.push((i) => {
          i._zod.bag.contentEncoding = 'base64url';
        }),
        (e._zod.check = (i) => {
          $m(i.value) ||
            i.issues.push({
              code: 'invalid_format',
              format: 'base64url',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    os = h('$ZodE164', (e, t) => {
      (t.pattern ?? (t.pattern = ia), V.init(e, t));
    });
  function _m(e, t = null) {
    try {
      let i = e.split('.');
      if (i.length !== 3) return !1;
      let [n] = i;
      if (!n) return !1;
      let r = JSON.parse(atob(n));
      return !(
        ('typ' in r && r?.typ !== 'JWT') ||
        !r.alg ||
        (t && (!('alg' in r) || r.alg !== t))
      );
    } catch {
      return !1;
    }
  }
  var as = h('$ZodJWT', (e, t) => {
      (V.init(e, t),
        (e._zod.check = (i) => {
          _m(i.value, t.alg) ||
            i.issues.push({
              code: 'invalid_format',
              format: 'jwt',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    ss = h('$ZodCustomStringFormat', (e, t) => {
      (V.init(e, t),
        (e._zod.check = (i) => {
          t.fn(i.value) ||
            i.issues.push({
              code: 'invalid_format',
              format: t.format,
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    Zr = h('$ZodNumber', (e, t) => {
      (D.init(e, t),
        (e._zod.pattern = e._zod.bag.pattern ?? da),
        (e._zod.parse = (i, n) => {
          if (t.coerce)
            try {
              i.value = Number(i.value);
            } catch {}
          let r = i.value;
          if (typeof r == 'number' && !Number.isNaN(r) && Number.isFinite(r))
            return i;
          let o =
            typeof r == 'number'
              ? Number.isNaN(r)
                ? 'NaN'
                : Number.isFinite(r)
                  ? void 0
                  : 'Infinity'
              : void 0;
          return (
            i.issues.push({
              expected: 'number',
              code: 'invalid_type',
              input: r,
              inst: e,
              ...(o ? { received: o } : {}),
            }),
            i
          );
        }));
    }),
    us = h('$ZodNumber', (e, t) => {
      (ba.init(e, t), Zr.init(e, t));
    }),
    ln = h('$ZodBoolean', (e, t) => {
      (D.init(e, t),
        (e._zod.pattern = ma),
        (e._zod.parse = (i, n) => {
          if (t.coerce)
            try {
              i.value = !!i.value;
            } catch {}
          let r = i.value;
          return (
            typeof r == 'boolean' ||
              i.issues.push({
                expected: 'boolean',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    Er = h('$ZodBigInt', (e, t) => {
      (D.init(e, t),
        (e._zod.pattern = ca),
        (e._zod.parse = (i, n) => {
          if (t.coerce)
            try {
              i.value = BigInt(i.value);
            } catch {}
          return (
            typeof i.value == 'bigint' ||
              i.issues.push({
                expected: 'bigint',
                code: 'invalid_type',
                input: i.value,
                inst: e,
              }),
            i
          );
        }));
    }),
    cs = h('$ZodBigInt', (e, t) => {
      (ya.init(e, t), Er.init(e, t));
    }),
    ls = h('$ZodSymbol', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            typeof r == 'symbol' ||
              i.issues.push({
                expected: 'symbol',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    ds = h('$ZodUndefined', (e, t) => {
      (D.init(e, t),
        (e._zod.pattern = fa),
        (e._zod.values = new Set([void 0])),
        (e._zod.optin = 'optional'),
        (e._zod.optout = 'optional'),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            typeof r > 'u' ||
              i.issues.push({
                expected: 'undefined',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    ms = h('$ZodNull', (e, t) => {
      (D.init(e, t),
        (e._zod.pattern = pa),
        (e._zod.values = new Set([null])),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            r === null ||
              i.issues.push({
                expected: 'null',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    ps = h('$ZodAny', (e, t) => {
      (D.init(e, t), (e._zod.parse = (i) => i));
    }),
    fs = h('$ZodUnknown', (e, t) => {
      (D.init(e, t), (e._zod.parse = (i) => i));
    }),
    vs = h('$ZodNever', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => (
          i.issues.push({
            expected: 'never',
            code: 'invalid_type',
            input: i.value,
            inst: e,
          }),
          i
        )));
    }),
    gs = h('$ZodVoid', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            typeof r > 'u' ||
              i.issues.push({
                expected: 'void',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    hs = h('$ZodDate', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => {
          if (t.coerce)
            try {
              i.value = new Date(i.value);
            } catch {}
          let r = i.value,
            o = r instanceof Date;
          return (
            (o && !Number.isNaN(r.getTime())) ||
              i.issues.push({
                expected: 'date',
                code: 'invalid_type',
                input: r,
                ...(o ? { received: 'Invalid Date' } : {}),
                inst: e,
              }),
            i
          );
        }));
    });
  function lm(e, t, i) {
    (e.issues.length && t.issues.push(...le(i, e.issues)),
      (t.value[i] = e.value));
  }
  var bs = h('$ZodArray', (e, t) => {
    (D.init(e, t),
      (e._zod.parse = (i, n) => {
        let r = i.value;
        if (!Array.isArray(r))
          return (
            i.issues.push({
              expected: 'array',
              code: 'invalid_type',
              input: r,
              inst: e,
            }),
            i
          );
        i.value = Array(r.length);
        let o = [];
        for (let s = 0; s < r.length; s++) {
          let u = r[s],
            a = t.element._zod.run({ value: u, issues: [] }, n);
          a instanceof Promise
            ? o.push(a.then((c) => lm(c, i, s)))
            : lm(a, i, s);
        }
        return o.length ? Promise.all(o).then(() => i) : i;
      }));
  });
  function Dr(e, t, i, n) {
    (e.issues.length && t.issues.push(...le(i, e.issues)),
      e.value === void 0
        ? i in n && (t.value[i] = void 0)
        : (t.value[i] = e.value));
  }
  function km(e) {
    let t = Object.keys(e.shape);
    for (let n of t)
      if (!e.shape?.[n]?._zod?.traits?.has('$ZodType'))
        throw new Error(`Invalid element at key "${n}": expected a Zod schema`);
    let i = Eo(e.shape);
    return {
      ...e,
      keys: t,
      keySet: new Set(t),
      numKeys: t.length,
      optionalKeys: new Set(i),
    };
  }
  function xm(e, t, i, n, r, o) {
    let s = [],
      u = r.keySet,
      a = r.catchall._zod,
      c = a.def.type;
    for (let m of Object.keys(t)) {
      if (u.has(m)) continue;
      if (c === 'never') {
        s.push(m);
        continue;
      }
      let p = a.run({ value: t[m], issues: [] }, n);
      p instanceof Promise
        ? e.push(p.then((f) => Dr(f, i, m, t)))
        : Dr(p, i, m, t);
    }
    return (
      s.length &&
        i.issues.push({
          code: 'unrecognized_keys',
          keys: s,
          input: t,
          inst: o,
        }),
      e.length ? Promise.all(e).then(() => i) : i
    );
  }
  var wm = h('$ZodObject', (e, t) => {
      if ((D.init(e, t), !Object.getOwnPropertyDescriptor(t, 'shape')?.get)) {
        let u = t.shape;
        Object.defineProperty(t, 'shape', {
          get: () => {
            let a = { ...u };
            return (Object.defineProperty(t, 'shape', { value: a }), a);
          },
        });
      }
      let n = It(() => km(t));
      L(e._zod, 'propValues', () => {
        let u = t.shape,
          a = {};
        for (let c in u) {
          let m = u[c]._zod;
          if (m.values) {
            a[c] ?? (a[c] = new Set());
            for (let p of m.values) a[c].add(p);
          }
        }
        return a;
      });
      let r = tt,
        o = t.catchall,
        s;
      e._zod.parse = (u, a) => {
        s ?? (s = n.value);
        let c = u.value;
        if (!r(c))
          return (
            u.issues.push({
              expected: 'object',
              code: 'invalid_type',
              input: c,
              inst: e,
            }),
            u
          );
        u.value = {};
        let m = [],
          p = s.shape;
        for (let f of s.keys) {
          let b = p[f]._zod.run({ value: c[f], issues: [] }, a);
          b instanceof Promise
            ? m.push(b.then(($) => Dr($, u, f, c)))
            : Dr(b, u, f, c);
        }
        return o
          ? xm(m, c, u, a, n.value, e)
          : m.length
            ? Promise.all(m).then(() => u)
            : u;
      };
    }),
    ys = h('$ZodObjectJIT', (e, t) => {
      wm.init(e, t);
      let i = e._zod.parse,
        n = It(() => km(t)),
        r = (f) => {
          let v = new cn(['shape', 'payload', 'ctx']),
            b = n.value,
            $ = (w) => {
              let S = fr(w);
              return `shape[${S}]._zod.run({ value: input[${S}], issues: [] }, ctx)`;
            };
          v.write('const input = payload.value;');
          let g = Object.create(null),
            k = 0;
          for (let w of b.keys) g[w] = `key_${k++}`;
          v.write('const newResult = {};');
          for (let w of b.keys) {
            let S = g[w],
              P = fr(w);
            (v.write(`const ${S} = ${$(w)};`),
              v.write(`
        if (${S}.issues.length) {
          payload.issues = payload.issues.concat(${S}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${P}, ...iss.path] : [${P}]
          })));
        }
        
        
        if (${S}.value === undefined) {
          if (${P} in input) {
            newResult[${P}] = undefined;
          }
        } else {
          newResult[${P}] = ${S}.value;
        }
        
      `));
          }
          (v.write('payload.value = newResult;'), v.write('return payload;'));
          let x = v.compile();
          return (w, S) => x(f, w, S);
        },
        o,
        s = tt,
        u = !Xt.jitless,
        c = u && No.value,
        m = t.catchall,
        p;
      e._zod.parse = (f, v) => {
        p ?? (p = n.value);
        let b = f.value;
        return s(b)
          ? u && c && v?.async === !1 && v.jitless !== !0
            ? (o || (o = r(t.shape)),
              (f = o(f, v)),
              m ? xm([], b, f, v, p, e) : f)
            : i(f, v)
          : (f.issues.push({
              expected: 'object',
              code: 'invalid_type',
              input: b,
              inst: e,
            }),
            f);
      };
    });
  function dm(e, t, i, n) {
    for (let o of e) if (o.issues.length === 0) return ((t.value = o.value), t);
    let r = e.filter((o) => !Ge(o));
    return r.length === 1
      ? ((t.value = r[0].value), r[0])
      : (t.issues.push({
          code: 'invalid_union',
          input: t.value,
          inst: i,
          errors: e.map((o) => o.issues.map((s) => de(s, n, q()))),
        }),
        t);
  }
  var Tr = h('$ZodUnion', (e, t) => {
      (D.init(e, t),
        L(e._zod, 'optin', () =>
          t.options.some((r) => r._zod.optin === 'optional')
            ? 'optional'
            : void 0,
        ),
        L(e._zod, 'optout', () =>
          t.options.some((r) => r._zod.optout === 'optional')
            ? 'optional'
            : void 0,
        ),
        L(e._zod, 'values', () => {
          if (t.options.every((r) => r._zod.values))
            return new Set(t.options.flatMap((r) => Array.from(r._zod.values)));
        }),
        L(e._zod, 'pattern', () => {
          if (t.options.every((r) => r._zod.pattern)) {
            let r = t.options.map((o) => o._zod.pattern);
            return new RegExp(`^(${r.map((o) => Qt(o.source)).join('|')})$`);
          }
        }));
      let i = t.options.length === 1,
        n = t.options[0]._zod.run;
      e._zod.parse = (r, o) => {
        if (i) return n(r, o);
        let s = !1,
          u = [];
        for (let a of t.options) {
          let c = a._zod.run({ value: r.value, issues: [] }, o);
          if (c instanceof Promise) (u.push(c), (s = !0));
          else {
            if (c.issues.length === 0) return c;
            u.push(c);
          }
        }
        return s ? Promise.all(u).then((a) => dm(a, r, e, o)) : dm(u, r, e, o);
      };
    }),
    $s = h('$ZodDiscriminatedUnion', (e, t) => {
      Tr.init(e, t);
      let i = e._zod.parse;
      L(e._zod, 'propValues', () => {
        let r = {};
        for (let o of t.options) {
          let s = o._zod.propValues;
          if (!s || Object.keys(s).length === 0)
            throw new Error(
              `Invalid discriminated union option at index "${t.options.indexOf(o)}"`,
            );
          for (let [u, a] of Object.entries(s)) {
            r[u] || (r[u] = new Set());
            for (let c of a) r[u].add(c);
          }
        }
        return r;
      });
      let n = It(() => {
        let r = t.options,
          o = new Map();
        for (let s of r) {
          let u = s._zod.propValues?.[t.discriminator];
          if (!u || u.size === 0)
            throw new Error(
              `Invalid discriminated union option at index "${t.options.indexOf(s)}"`,
            );
          for (let a of u) {
            if (o.has(a))
              throw new Error(`Duplicate discriminator value "${String(a)}"`);
            o.set(a, s);
          }
        }
        return o;
      });
      e._zod.parse = (r, o) => {
        let s = r.value;
        if (!tt(s))
          return (
            r.issues.push({
              code: 'invalid_type',
              expected: 'object',
              input: s,
              inst: e,
            }),
            r
          );
        let u = n.value.get(s?.[t.discriminator]);
        return u
          ? u._zod.run(r, o)
          : t.unionFallback
            ? i(r, o)
            : (r.issues.push({
                code: 'invalid_union',
                errors: [],
                note: 'No matching discriminator',
                discriminator: t.discriminator,
                input: s,
                path: [t.discriminator],
                inst: e,
              }),
              r);
      };
    }),
    _s = h('$ZodIntersection', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value,
            o = t.left._zod.run({ value: r, issues: [] }, n),
            s = t.right._zod.run({ value: r, issues: [] }, n);
          return o instanceof Promise || s instanceof Promise
            ? Promise.all([o, s]).then(([a, c]) => mm(i, a, c))
            : mm(i, o, s);
        }));
    });
  function Ta(e, t) {
    if (e === t) return { valid: !0, data: e };
    if (e instanceof Date && t instanceof Date && +e == +t)
      return { valid: !0, data: e };
    if (Be(e) && Be(t)) {
      let i = Object.keys(t),
        n = Object.keys(e).filter((o) => i.indexOf(o) !== -1),
        r = { ...e, ...t };
      for (let o of n) {
        let s = Ta(e[o], t[o]);
        if (!s.valid)
          return { valid: !1, mergeErrorPath: [o, ...s.mergeErrorPath] };
        r[o] = s.data;
      }
      return { valid: !0, data: r };
    }
    if (Array.isArray(e) && Array.isArray(t)) {
      if (e.length !== t.length) return { valid: !1, mergeErrorPath: [] };
      let i = [];
      for (let n = 0; n < e.length; n++) {
        let r = e[n],
          o = t[n],
          s = Ta(r, o);
        if (!s.valid)
          return { valid: !1, mergeErrorPath: [n, ...s.mergeErrorPath] };
        i.push(s.data);
      }
      return { valid: !0, data: i };
    }
    return { valid: !1, mergeErrorPath: [] };
  }
  function mm(e, t, i) {
    if (
      (t.issues.length && e.issues.push(...t.issues),
      i.issues.length && e.issues.push(...i.issues),
      Ge(e))
    )
      return e;
    let n = Ta(t.value, i.value);
    if (!n.valid)
      throw new Error(
        `Unmergable intersection. Error path: ${JSON.stringify(n.mergeErrorPath)}`,
      );
    return ((e.value = n.data), e);
  }
  var Ar = h('$ZodTuple', (e, t) => {
    D.init(e, t);
    let i = t.items,
      n =
        i.length -
        [...i].reverse().findIndex((r) => r._zod.optin !== 'optional');
    e._zod.parse = (r, o) => {
      let s = r.value;
      if (!Array.isArray(s))
        return (
          r.issues.push({
            input: s,
            inst: e,
            expected: 'tuple',
            code: 'invalid_type',
          }),
          r
        );
      r.value = [];
      let u = [];
      if (!t.rest) {
        let c = s.length > i.length,
          m = s.length < n - 1;
        if (c || m)
          return (
            r.issues.push({
              ...(c
                ? { code: 'too_big', maximum: i.length }
                : { code: 'too_small', minimum: i.length }),
              input: s,
              inst: e,
              origin: 'array',
            }),
            r
          );
      }
      let a = -1;
      for (let c of i) {
        if ((a++, a >= s.length && a >= n)) continue;
        let m = c._zod.run({ value: s[a], issues: [] }, o);
        m instanceof Promise ? u.push(m.then((p) => Or(p, r, a))) : Or(m, r, a);
      }
      if (t.rest) {
        let c = s.slice(i.length);
        for (let m of c) {
          a++;
          let p = t.rest._zod.run({ value: m, issues: [] }, o);
          p instanceof Promise
            ? u.push(p.then((f) => Or(f, r, a)))
            : Or(p, r, a);
        }
      }
      return u.length ? Promise.all(u).then(() => r) : r;
    };
  });
  function Or(e, t, i) {
    (e.issues.length && t.issues.push(...le(i, e.issues)),
      (t.value[i] = e.value));
  }
  var ks = h('$ZodRecord', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          if (!Be(r))
            return (
              i.issues.push({
                expected: 'record',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
              i
            );
          let o = [];
          if (t.keyType._zod.values) {
            let s = t.keyType._zod.values;
            i.value = {};
            for (let a of s)
              if (
                typeof a == 'string' ||
                typeof a == 'number' ||
                typeof a == 'symbol'
              ) {
                let c = t.valueType._zod.run({ value: r[a], issues: [] }, n);
                c instanceof Promise
                  ? o.push(
                      c.then((m) => {
                        (m.issues.length && i.issues.push(...le(a, m.issues)),
                          (i.value[a] = m.value));
                      }),
                    )
                  : (c.issues.length && i.issues.push(...le(a, c.issues)),
                    (i.value[a] = c.value));
              }
            let u;
            for (let a in r) s.has(a) || ((u = u ?? []), u.push(a));
            u &&
              u.length > 0 &&
              i.issues.push({
                code: 'unrecognized_keys',
                input: r,
                inst: e,
                keys: u,
              });
          } else {
            i.value = {};
            for (let s of Reflect.ownKeys(r)) {
              if (s === '__proto__') continue;
              let u = t.keyType._zod.run({ value: s, issues: [] }, n);
              if (u instanceof Promise)
                throw new Error(
                  'Async schemas not supported in object keys currently',
                );
              if (u.issues.length) {
                (i.issues.push({
                  code: 'invalid_key',
                  origin: 'record',
                  issues: u.issues.map((c) => de(c, n, q())),
                  input: s,
                  path: [s],
                  inst: e,
                }),
                  (i.value[u.value] = u.value));
                continue;
              }
              let a = t.valueType._zod.run({ value: r[s], issues: [] }, n);
              a instanceof Promise
                ? o.push(
                    a.then((c) => {
                      (c.issues.length && i.issues.push(...le(s, c.issues)),
                        (i.value[u.value] = c.value));
                    }),
                  )
                : (a.issues.length && i.issues.push(...le(s, a.issues)),
                  (i.value[u.value] = a.value));
            }
          }
          return o.length ? Promise.all(o).then(() => i) : i;
        }));
    }),
    xs = h('$ZodMap', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          if (!(r instanceof Map))
            return (
              i.issues.push({
                expected: 'map',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
              i
            );
          let o = [];
          i.value = new Map();
          for (let [s, u] of r) {
            let a = t.keyType._zod.run({ value: s, issues: [] }, n),
              c = t.valueType._zod.run({ value: u, issues: [] }, n);
            a instanceof Promise || c instanceof Promise
              ? o.push(
                  Promise.all([a, c]).then(([m, p]) => {
                    pm(m, p, i, s, r, e, n);
                  }),
                )
              : pm(a, c, i, s, r, e, n);
          }
          return o.length ? Promise.all(o).then(() => i) : i;
        }));
    });
  function pm(e, t, i, n, r, o, s) {
    (e.issues.length &&
      (en.has(typeof n)
        ? i.issues.push(...le(n, e.issues))
        : i.issues.push({
            code: 'invalid_key',
            origin: 'map',
            input: r,
            inst: o,
            issues: e.issues.map((u) => de(u, s, q())),
          })),
      t.issues.length &&
        (en.has(typeof n)
          ? i.issues.push(...le(n, t.issues))
          : i.issues.push({
              origin: 'map',
              code: 'invalid_element',
              input: r,
              inst: o,
              key: n,
              issues: t.issues.map((u) => de(u, s, q())),
            })),
      i.value.set(e.value, t.value));
  }
  var ws = h('$ZodSet', (e, t) => {
    (D.init(e, t),
      (e._zod.parse = (i, n) => {
        let r = i.value;
        if (!(r instanceof Set))
          return (
            i.issues.push({
              input: r,
              inst: e,
              expected: 'set',
              code: 'invalid_type',
            }),
            i
          );
        let o = [];
        i.value = new Set();
        for (let s of r) {
          let u = t.valueType._zod.run({ value: s, issues: [] }, n);
          u instanceof Promise ? o.push(u.then((a) => fm(a, i))) : fm(u, i);
        }
        return o.length ? Promise.all(o).then(() => i) : i;
      }));
  });
  function fm(e, t) {
    (e.issues.length && t.issues.push(...e.issues), t.value.add(e.value));
  }
  var Ss = h('$ZodEnum', (e, t) => {
      D.init(e, t);
      let i = Yt(t.entries),
        n = new Set(i);
      ((e._zod.values = n),
        (e._zod.pattern = new RegExp(
          `^(${i
            .filter((r) => en.has(typeof r))
            .map((r) => (typeof r == 'string' ? Oe(r) : r.toString()))
            .join('|')})$`,
        )),
        (e._zod.parse = (r, o) => {
          let s = r.value;
          return (
            n.has(s) ||
              r.issues.push({
                code: 'invalid_value',
                values: i,
                input: s,
                inst: e,
              }),
            r
          );
        }));
    }),
    Is = h('$ZodLiteral', (e, t) => {
      if ((D.init(e, t), t.values.length === 0))
        throw new Error('Cannot create literal schema with no valid values');
      ((e._zod.values = new Set(t.values)),
        (e._zod.pattern = new RegExp(
          `^(${t.values.map((i) => (typeof i == 'string' ? Oe(i) : i ? Oe(i.toString()) : String(i))).join('|')})$`,
        )),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            e._zod.values.has(r) ||
              i.issues.push({
                code: 'invalid_value',
                values: t.values,
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    zs = h('$ZodFile', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            r instanceof File ||
              i.issues.push({
                expected: 'file',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    js = h('$ZodTransform', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') throw new Fe(e.constructor.name);
          let r = t.transform(i.value, i);
          if (n.async)
            return (r instanceof Promise ? r : Promise.resolve(r)).then(
              (s) => ((i.value = s), i),
            );
          if (r instanceof Promise) throw new ke();
          return ((i.value = r), i);
        }));
    });
  function vm(e, t) {
    return e.issues.length && t === void 0 ? { issues: [], value: void 0 } : e;
  }
  var Os = h('$ZodOptional', (e, t) => {
      (D.init(e, t),
        (e._zod.optin = 'optional'),
        (e._zod.optout = 'optional'),
        L(e._zod, 'values', () =>
          t.innerType._zod.values
            ? new Set([...t.innerType._zod.values, void 0])
            : void 0,
        ),
        L(e._zod, 'pattern', () => {
          let i = t.innerType._zod.pattern;
          return i ? new RegExp(`^(${Qt(i.source)})?$`) : void 0;
        }),
        (e._zod.parse = (i, n) => {
          if (t.innerType._zod.optin === 'optional') {
            let r = t.innerType._zod.run(i, n);
            return r instanceof Promise
              ? r.then((o) => vm(o, i.value))
              : vm(r, i.value);
          }
          return i.value === void 0 ? i : t.innerType._zod.run(i, n);
        }));
    }),
    Us = h('$ZodNullable', (e, t) => {
      (D.init(e, t),
        L(e._zod, 'optin', () => t.innerType._zod.optin),
        L(e._zod, 'optout', () => t.innerType._zod.optout),
        L(e._zod, 'pattern', () => {
          let i = t.innerType._zod.pattern;
          return i ? new RegExp(`^(${Qt(i.source)}|null)$`) : void 0;
        }),
        L(e._zod, 'values', () =>
          t.innerType._zod.values
            ? new Set([...t.innerType._zod.values, null])
            : void 0,
        ),
        (e._zod.parse = (i, n) =>
          i.value === null ? i : t.innerType._zod.run(i, n)));
    }),
    Ps = h('$ZodDefault', (e, t) => {
      (D.init(e, t),
        (e._zod.optin = 'optional'),
        L(e._zod, 'values', () => t.innerType._zod.values),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') return t.innerType._zod.run(i, n);
          if (i.value === void 0) return ((i.value = t.defaultValue), i);
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise ? r.then((o) => gm(o, t)) : gm(r, t);
        }));
    });
  function gm(e, t) {
    return (e.value === void 0 && (e.value = t.defaultValue), e);
  }
  var Ns = h('$ZodPrefault', (e, t) => {
      (D.init(e, t),
        (e._zod.optin = 'optional'),
        L(e._zod, 'values', () => t.innerType._zod.values),
        (e._zod.parse = (i, n) => (
          n.direction === 'backward' ||
            (i.value === void 0 && (i.value = t.defaultValue)),
          t.innerType._zod.run(i, n)
        )));
    }),
    Ds = h('$ZodNonOptional', (e, t) => {
      (D.init(e, t),
        L(e._zod, 'values', () => {
          let i = t.innerType._zod.values;
          return i ? new Set([...i].filter((n) => n !== void 0)) : void 0;
        }),
        (e._zod.parse = (i, n) => {
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise ? r.then((o) => hm(o, e)) : hm(r, e);
        }));
    });
  function hm(e, t) {
    return (
      !e.issues.length &&
        e.value === void 0 &&
        e.issues.push({
          code: 'invalid_type',
          expected: 'nonoptional',
          input: e.value,
          inst: t,
        }),
      e
    );
  }
  var Zs = h('$ZodSuccess', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') throw new Fe('ZodSuccess');
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise
            ? r.then((o) => ((i.value = o.issues.length === 0), i))
            : ((i.value = r.issues.length === 0), i);
        }));
    }),
    Es = h('$ZodCatch', (e, t) => {
      (D.init(e, t),
        L(e._zod, 'optin', () => t.innerType._zod.optin),
        L(e._zod, 'optout', () => t.innerType._zod.optout),
        L(e._zod, 'values', () => t.innerType._zod.values),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') return t.innerType._zod.run(i, n);
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise
            ? r.then(
                (o) => (
                  (i.value = o.value),
                  o.issues.length &&
                    ((i.value = t.catchValue({
                      ...i,
                      error: { issues: o.issues.map((s) => de(s, n, q())) },
                      input: i.value,
                    })),
                    (i.issues = [])),
                  i
                ),
              )
            : ((i.value = r.value),
              r.issues.length &&
                ((i.value = t.catchValue({
                  ...i,
                  error: { issues: r.issues.map((o) => de(o, n, q())) },
                  input: i.value,
                })),
                (i.issues = [])),
              i);
        }));
    }),
    Ts = h('$ZodNaN', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) => (
          (typeof i.value != 'number' || !Number.isNaN(i.value)) &&
            i.issues.push({
              input: i.value,
              inst: e,
              expected: 'nan',
              code: 'invalid_type',
            }),
          i
        )));
    }),
    As = h('$ZodPipe', (e, t) => {
      (D.init(e, t),
        L(e._zod, 'values', () => t.in._zod.values),
        L(e._zod, 'optin', () => t.in._zod.optin),
        L(e._zod, 'optout', () => t.out._zod.optout),
        L(e._zod, 'propValues', () => t.in._zod.propValues),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') {
            let o = t.out._zod.run(i, n);
            return o instanceof Promise
              ? o.then((s) => Ur(s, t.in, n))
              : Ur(o, t.in, n);
          }
          let r = t.in._zod.run(i, n);
          return r instanceof Promise
            ? r.then((o) => Ur(o, t.out, n))
            : Ur(r, t.out, n);
        }));
    });
  function Ur(e, t, i) {
    return e.issues.length
      ? ((e.aborted = !0), e)
      : t._zod.run({ value: e.value, issues: e.issues }, i);
  }
  var dn = h('$ZodCodec', (e, t) => {
    (D.init(e, t),
      L(e._zod, 'values', () => t.in._zod.values),
      L(e._zod, 'optin', () => t.in._zod.optin),
      L(e._zod, 'optout', () => t.out._zod.optout),
      L(e._zod, 'propValues', () => t.in._zod.propValues),
      (e._zod.parse = (i, n) => {
        if ((n.direction || 'forward') === 'forward') {
          let o = t.in._zod.run(i, n);
          return o instanceof Promise
            ? o.then((s) => Pr(s, t, n))
            : Pr(o, t, n);
        } else {
          let o = t.out._zod.run(i, n);
          return o instanceof Promise
            ? o.then((s) => Pr(s, t, n))
            : Pr(o, t, n);
        }
      }));
  });
  function Pr(e, t, i) {
    if (e.issues.length) return ((e.aborted = !0), e);
    if ((i.direction || 'forward') === 'forward') {
      let r = t.transform(e.value, e);
      return r instanceof Promise
        ? r.then((o) => Nr(e, o, t.out, i))
        : Nr(e, r, t.out, i);
    } else {
      let r = t.reverseTransform(e.value, e);
      return r instanceof Promise
        ? r.then((o) => Nr(e, o, t.in, i))
        : Nr(e, r, t.in, i);
    }
  }
  function Nr(e, t, i, n) {
    return e.issues.length
      ? ((e.aborted = !0), e)
      : i._zod.run({ value: t, issues: e.issues }, n);
  }
  var Cs = h('$ZodReadonly', (e, t) => {
    (D.init(e, t),
      L(e._zod, 'propValues', () => t.innerType._zod.propValues),
      L(e._zod, 'values', () => t.innerType._zod.values),
      L(e._zod, 'optin', () => t.innerType._zod.optin),
      L(e._zod, 'optout', () => t.innerType._zod.optout),
      (e._zod.parse = (i, n) => {
        if (n.direction === 'backward') return t.innerType._zod.run(i, n);
        let r = t.innerType._zod.run(i, n);
        return r instanceof Promise ? r.then(bm) : bm(r);
      }));
  });
  function bm(e) {
    return ((e.value = Object.freeze(e.value)), e);
  }
  var Ls = h('$ZodTemplateLiteral', (e, t) => {
      D.init(e, t);
      let i = [];
      for (let n of t.parts)
        if (typeof n == 'object' && n !== null) {
          if (!n._zod.pattern)
            throw new Error(
              `Invalid template literal part, no pattern found: ${[...n._zod.traits].shift()}`,
            );
          let r =
            n._zod.pattern instanceof RegExp
              ? n._zod.pattern.source
              : n._zod.pattern;
          if (!r)
            throw new Error(`Invalid template literal part: ${n._zod.traits}`);
          let o = r.startsWith('^') ? 1 : 0,
            s = r.endsWith('$') ? r.length - 1 : r.length;
          i.push(r.slice(o, s));
        } else if (n === null || Zo.has(typeof n)) i.push(Oe(`${n}`));
        else throw new Error(`Invalid template literal part: ${n}`);
      ((e._zod.pattern = new RegExp(`^${i.join('')}$`)),
        (e._zod.parse = (n, r) =>
          typeof n.value != 'string'
            ? (n.issues.push({
                input: n.value,
                inst: e,
                expected: 'template_literal',
                code: 'invalid_type',
              }),
              n)
            : ((e._zod.pattern.lastIndex = 0),
              e._zod.pattern.test(n.value) ||
                n.issues.push({
                  input: n.value,
                  inst: e,
                  code: 'invalid_format',
                  format: t.format ?? 'template_literal',
                  pattern: e._zod.pattern.source,
                }),
              n)));
    }),
    Rs = h(
      '$ZodFunction',
      (e, t) => (
        D.init(e, t),
        (e._def = t),
        (e._zod.def = t),
        (e.implement = (i) => {
          if (typeof i != 'function')
            throw new Error('implement() must be called with a function');
          return function (...n) {
            let r = e._def.input ? gr(e._def.input, n) : n,
              o = Reflect.apply(i, this, r);
            return e._def.output ? gr(e._def.output, o) : o;
          };
        }),
        (e.implementAsync = (i) => {
          if (typeof i != 'function')
            throw new Error('implementAsync() must be called with a function');
          return async function (...n) {
            let r = e._def.input ? await hr(e._def.input, n) : n,
              o = await Reflect.apply(i, this, r);
            return e._def.output ? await hr(e._def.output, o) : o;
          };
        }),
        (e._zod.parse = (i, n) =>
          typeof i.value != 'function'
            ? (i.issues.push({
                code: 'invalid_type',
                expected: 'function',
                input: i.value,
                inst: e,
              }),
              i)
            : (e._def.output && e._def.output._zod.def.type === 'promise'
                ? (i.value = e.implementAsync(i.value))
                : (i.value = e.implement(i.value)),
              i)),
        (e.input = (...i) => {
          let n = e.constructor;
          return Array.isArray(i[0])
            ? new n({
                type: 'function',
                input: new Ar({ type: 'tuple', items: i[0], rest: i[1] }),
                output: e._def.output,
              })
            : new n({ type: 'function', input: i[0], output: e._def.output });
        }),
        (e.output = (i) => {
          let n = e.constructor;
          return new n({ type: 'function', input: e._def.input, output: i });
        }),
        e
      ),
    ),
    Js = h('$ZodPromise', (e, t) => {
      (D.init(e, t),
        (e._zod.parse = (i, n) =>
          Promise.resolve(i.value).then((r) =>
            t.innerType._zod.run({ value: r, issues: [] }, n),
          )));
    }),
    Fs = h('$ZodLazy', (e, t) => {
      (D.init(e, t),
        L(e._zod, 'innerType', () => t.getter()),
        L(e._zod, 'pattern', () => e._zod.innerType._zod.pattern),
        L(e._zod, 'propValues', () => e._zod.innerType._zod.propValues),
        L(e._zod, 'optin', () => e._zod.innerType._zod.optin ?? void 0),
        L(e._zod, 'optout', () => e._zod.innerType._zod.optout ?? void 0),
        (e._zod.parse = (i, n) => e._zod.innerType._zod.run(i, n)));
    }),
    Vs = h('$ZodCustom', (e, t) => {
      (B.init(e, t),
        D.init(e, t),
        (e._zod.parse = (i, n) => i),
        (e._zod.check = (i) => {
          let n = i.value,
            r = t.fn(n);
          if (r instanceof Promise) return r.then((o) => ym(o, i, n, e));
          ym(r, i, n, e);
        }));
    });
  function ym(e, t, i, n) {
    if (!e) {
      let r = {
        code: 'custom',
        input: i,
        inst: n,
        path: [...(n._zod.def.path ?? [])],
        continue: !n._zod.def.abort,
      };
      (n._zod.def.params && (r.params = n._zod.def.params),
        t.issues.push(zt(r)));
    }
  }
  var fn = {};
  Je(fn, {
    ar: () => Sm,
    az: () => Im,
    be: () => jm,
    bg: () => Om,
    ca: () => Um,
    cs: () => Pm,
    da: () => Nm,
    de: () => Dm,
    en: () => Cr,
    eo: () => Zm,
    es: () => Em,
    fa: () => Tm,
    fi: () => Am,
    fr: () => Cm,
    frCA: () => Lm,
    he: () => Rm,
    hu: () => Jm,
    id: () => Fm,
    is: () => Vm,
    it: () => Mm,
    ja: () => Wm,
    ka: () => Bm,
    kh: () => Gm,
    km: () => Lr,
    ko: () => Km,
    lt: () => Xm,
    mk: () => Hm,
    ms: () => Ym,
    nl: () => Qm,
    no: () => ep,
    ota: () => tp,
    pl: () => rp,
    ps: () => np,
    pt: () => ip,
    ru: () => ap,
    sl: () => sp,
    sv: () => up,
    ta: () => cp,
    th: () => lp,
    tr: () => dp,
    ua: () => mp,
    uk: () => Rr,
    ur: () => pp,
    vi: () => fp,
    yo: () => hp,
    zhCN: () => vp,
    zhTW: () => gp,
  });
  var Z_ = () => {
    let e = {
      string: { unit: 'حرف', verb: 'أن يحوي' },
      file: { unit: 'بايت', verb: 'أن يحوي' },
      array: { unit: 'عنصر', verb: 'أن يحوي' },
      set: { unit: 'عنصر', verb: 'أن يحوي' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'number';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'مدخل',
        email: 'بريد إلكتروني',
        url: 'رابط',
        emoji: 'إيموجي',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'تاريخ ووقت بمعيار ISO',
        date: 'تاريخ بمعيار ISO',
        time: 'وقت بمعيار ISO',
        duration: 'مدة بمعيار ISO',
        ipv4: 'عنوان IPv4',
        ipv6: 'عنوان IPv6',
        cidrv4: 'مدى عناوين بصيغة IPv4',
        cidrv6: 'مدى عناوين بصيغة IPv6',
        base64: 'نَص بترميز base64-encoded',
        base64url: 'نَص بترميز base64url-encoded',
        json_string: 'نَص على هيئة JSON',
        e164: 'رقم هاتف بمعيار E.164',
        jwt: 'JWT',
        template_literal: 'مدخل',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `مدخلات غير مقبولة: يفترض إدخال ${r.expected}، ولكن تم إدخال ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `مدخلات غير مقبولة: يفترض إدخال ${I(r.values[0])}`
            : `اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? ` أكبر من اللازم: يفترض أن تكون ${r.origin ?? 'القيمة'} ${o} ${r.maximum.toString()} ${s.unit ?? 'عنصر'}`
            : `أكبر من اللازم: يفترض أن تكون ${r.origin ?? 'القيمة'} ${o} ${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `أصغر من اللازم: يفترض لـ ${r.origin} أن يكون ${o} ${r.minimum.toString()} ${s.unit}`
            : `أصغر من اللازم: يفترض لـ ${r.origin} أن يكون ${o} ${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `نَص غير مقبول: يجب أن يبدأ بـ "${r.prefix}"`
            : o.format === 'ends_with'
              ? `نَص غير مقبول: يجب أن ينتهي بـ "${o.suffix}"`
              : o.format === 'includes'
                ? `نَص غير مقبول: يجب أن يتضمَّن "${o.includes}"`
                : o.format === 'regex'
                  ? `نَص غير مقبول: يجب أن يطابق النمط ${o.pattern}`
                  : `${n[o.format] ?? r.format} غير مقبول`;
        }
        case 'not_multiple_of':
          return `رقم غير مقبول: يجب أن يكون من مضاعفات ${r.divisor}`;
        case 'unrecognized_keys':
          return `معرف${r.keys.length > 1 ? 'ات' : ''} غريب${r.keys.length > 1 ? 'ة' : ''}: ${_(r.keys, '، ')}`;
        case 'invalid_key':
          return `معرف غير مقبول في ${r.origin}`;
        case 'invalid_union':
          return 'مدخل غير مقبول';
        case 'invalid_element':
          return `مدخل غير مقبول في ${r.origin}`;
        default:
          return 'مدخل غير مقبول';
      }
    };
  };
  function Sm() {
    return { localeError: Z_() };
  }
  var E_ = () => {
    let e = {
      string: { unit: 'simvol', verb: 'olmalıdır' },
      file: { unit: 'bayt', verb: 'olmalıdır' },
      array: { unit: 'element', verb: 'olmalıdır' },
      set: { unit: 'element', verb: 'olmalıdır' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'number';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'input',
        email: 'email address',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO datetime',
        date: 'ISO date',
        time: 'ISO time',
        duration: 'ISO duration',
        ipv4: 'IPv4 address',
        ipv6: 'IPv6 address',
        cidrv4: 'IPv4 range',
        cidrv6: 'IPv6 range',
        base64: 'base64-encoded string',
        base64url: 'base64url-encoded string',
        json_string: 'JSON string',
        e164: 'E.164 number',
        jwt: 'JWT',
        template_literal: 'input',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Yanlış dəyər: gözlənilən ${r.expected}, daxil olan ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Yanlış dəyər: gözlənilən ${I(r.values[0])}`
            : `Yanlış seçim: aşağıdakılardan biri olmalıdır: ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Çox böyük: gözlənilən ${r.origin ?? 'dəyər'} ${o}${r.maximum.toString()} ${s.unit ?? 'element'}`
            : `Çox böyük: gözlənilən ${r.origin ?? 'dəyər'} ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Çox kiçik: gözlənilən ${r.origin} ${o}${r.minimum.toString()} ${s.unit}`
            : `Çox kiçik: gözlənilən ${r.origin} ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Yanlış mətn: "${o.prefix}" ilə başlamalıdır`
            : o.format === 'ends_with'
              ? `Yanlış mətn: "${o.suffix}" ilə bitməlidir`
              : o.format === 'includes'
                ? `Yanlış mətn: "${o.includes}" daxil olmalıdır`
                : o.format === 'regex'
                  ? `Yanlış mətn: ${o.pattern} şablonuna uyğun olmalıdır`
                  : `Yanlış ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Yanlış ədəd: ${r.divisor} ilə bölünə bilən olmalıdır`;
        case 'unrecognized_keys':
          return `Tanınmayan açar${r.keys.length > 1 ? 'lar' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `${r.origin} daxilində yanlış açar`;
        case 'invalid_union':
          return 'Yanlış dəyər';
        case 'invalid_element':
          return `${r.origin} daxilində yanlış dəyər`;
        default:
          return 'Yanlış dəyər';
      }
    };
  };
  function Im() {
    return { localeError: E_() };
  }
  function zm(e, t, i, n) {
    let r = Math.abs(e),
      o = r % 10,
      s = r % 100;
    return s >= 11 && s <= 19 ? n : o === 1 ? t : o >= 2 && o <= 4 ? i : n;
  }
  var T_ = () => {
    let e = {
      string: {
        unit: { one: 'сімвал', few: 'сімвалы', many: 'сімвалаў' },
        verb: 'мець',
      },
      array: {
        unit: { one: 'элемент', few: 'элементы', many: 'элементаў' },
        verb: 'мець',
      },
      set: {
        unit: { one: 'элемент', few: 'элементы', many: 'элементаў' },
        verb: 'мець',
      },
      file: {
        unit: { one: 'байт', few: 'байты', many: 'байтаў' },
        verb: 'мець',
      },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'лік';
          case 'object': {
            if (Array.isArray(r)) return 'масіў';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'увод',
        email: 'email адрас',
        url: 'URL',
        emoji: 'эмодзі',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO дата і час',
        date: 'ISO дата',
        time: 'ISO час',
        duration: 'ISO працягласць',
        ipv4: 'IPv4 адрас',
        ipv6: 'IPv6 адрас',
        cidrv4: 'IPv4 дыяпазон',
        cidrv6: 'IPv6 дыяпазон',
        base64: 'радок у фармаце base64',
        base64url: 'радок у фармаце base64url',
        json_string: 'JSON радок',
        e164: 'нумар E.164',
        jwt: 'JWT',
        template_literal: 'увод',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Няправільны ўвод: чакаўся ${r.expected}, атрымана ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Няправільны ўвод: чакалася ${I(r.values[0])}`
            : `Няправільны варыянт: чакаўся адзін з ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          if (s) {
            let u = Number(r.maximum),
              a = zm(u, s.unit.one, s.unit.few, s.unit.many);
            return `Занадта вялікі: чакалася, што ${r.origin ?? 'значэнне'} павінна ${s.verb} ${o}${r.maximum.toString()} ${a}`;
          }
          return `Занадта вялікі: чакалася, што ${r.origin ?? 'значэнне'} павінна быць ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          if (s) {
            let u = Number(r.minimum),
              a = zm(u, s.unit.one, s.unit.few, s.unit.many);
            return `Занадта малы: чакалася, што ${r.origin} павінна ${s.verb} ${o}${r.minimum.toString()} ${a}`;
          }
          return `Занадта малы: чакалася, што ${r.origin} павінна быць ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Няправільны радок: павінен пачынацца з "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Няправільны радок: павінен заканчвацца на "${o.suffix}"`
              : o.format === 'includes'
                ? `Няправільны радок: павінен змяшчаць "${o.includes}"`
                : o.format === 'regex'
                  ? `Няправільны радок: павінен адпавядаць шаблону ${o.pattern}`
                  : `Няправільны ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Няправільны лік: павінен быць кратным ${r.divisor}`;
        case 'unrecognized_keys':
          return `Нераспазнаны ${r.keys.length > 1 ? 'ключы' : 'ключ'}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Няправільны ключ у ${r.origin}`;
        case 'invalid_union':
          return 'Няправільны ўвод';
        case 'invalid_element':
          return `Няправільнае значэнне ў ${r.origin}`;
        default:
          return 'Няправільны ўвод';
      }
    };
  };
  function jm() {
    return { localeError: T_() };
  }
  var A_ = (e) => {
      let t = typeof e;
      switch (t) {
        case 'number':
          return Number.isNaN(e) ? 'NaN' : 'число';
        case 'object': {
          if (Array.isArray(e)) return 'масив';
          if (e === null) return 'null';
          if (Object.getPrototypeOf(e) !== Object.prototype && e.constructor)
            return e.constructor.name;
        }
      }
      return t;
    },
    C_ = () => {
      let e = {
        string: { unit: 'символа', verb: 'да съдържа' },
        file: { unit: 'байта', verb: 'да съдържа' },
        array: { unit: 'елемента', verb: 'да съдържа' },
        set: { unit: 'елемента', verb: 'да съдържа' },
      };
      function t(n) {
        return e[n] ?? null;
      }
      let i = {
        regex: 'вход',
        email: 'имейл адрес',
        url: 'URL',
        emoji: 'емоджи',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO време',
        date: 'ISO дата',
        time: 'ISO време',
        duration: 'ISO продължителност',
        ipv4: 'IPv4 адрес',
        ipv6: 'IPv6 адрес',
        cidrv4: 'IPv4 диапазон',
        cidrv6: 'IPv6 диапазон',
        base64: 'base64-кодиран низ',
        base64url: 'base64url-кодиран низ',
        json_string: 'JSON низ',
        e164: 'E.164 номер',
        jwt: 'JWT',
        template_literal: 'вход',
      };
      return (n) => {
        switch (n.code) {
          case 'invalid_type':
            return `Невалиден вход: очакван ${n.expected}, получен ${A_(n.input)}`;
          case 'invalid_value':
            return n.values.length === 1
              ? `Невалиден вход: очакван ${I(n.values[0])}`
              : `Невалидна опция: очаквано едно от ${_(n.values, '|')}`;
          case 'too_big': {
            let r = n.inclusive ? '<=' : '<',
              o = t(n.origin);
            return o
              ? `Твърде голямо: очаква се ${n.origin ?? 'стойност'} да съдържа ${r}${n.maximum.toString()} ${o.unit ?? 'елемента'}`
              : `Твърде голямо: очаква се ${n.origin ?? 'стойност'} да бъде ${r}${n.maximum.toString()}`;
          }
          case 'too_small': {
            let r = n.inclusive ? '>=' : '>',
              o = t(n.origin);
            return o
              ? `Твърде малко: очаква се ${n.origin} да съдържа ${r}${n.minimum.toString()} ${o.unit}`
              : `Твърде малко: очаква се ${n.origin} да бъде ${r}${n.minimum.toString()}`;
          }
          case 'invalid_format': {
            let r = n;
            if (r.format === 'starts_with')
              return `Невалиден низ: трябва да започва с "${r.prefix}"`;
            if (r.format === 'ends_with')
              return `Невалиден низ: трябва да завършва с "${r.suffix}"`;
            if (r.format === 'includes')
              return `Невалиден низ: трябва да включва "${r.includes}"`;
            if (r.format === 'regex')
              return `Невалиден низ: трябва да съвпада с ${r.pattern}`;
            let o = 'Невалиден';
            return (
              r.format === 'emoji' && (o = 'Невалидно'),
              r.format === 'datetime' && (o = 'Невалидно'),
              r.format === 'date' && (o = 'Невалидна'),
              r.format === 'time' && (o = 'Невалидно'),
              r.format === 'duration' && (o = 'Невалидна'),
              `${o} ${i[r.format] ?? n.format}`
            );
          }
          case 'not_multiple_of':
            return `Невалидно число: трябва да бъде кратно на ${n.divisor}`;
          case 'unrecognized_keys':
            return `Неразпознат${n.keys.length > 1 ? 'и' : ''} ключ${n.keys.length > 1 ? 'ове' : ''}: ${_(n.keys, ', ')}`;
          case 'invalid_key':
            return `Невалиден ключ в ${n.origin}`;
          case 'invalid_union':
            return 'Невалиден вход';
          case 'invalid_element':
            return `Невалидна стойност в ${n.origin}`;
          default:
            return 'Невалиден вход';
        }
      };
    };
  function Om() {
    return { localeError: C_() };
  }
  var L_ = () => {
    let e = {
      string: { unit: 'caràcters', verb: 'contenir' },
      file: { unit: 'bytes', verb: 'contenir' },
      array: { unit: 'elements', verb: 'contenir' },
      set: { unit: 'elements', verb: 'contenir' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'number';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'entrada',
        email: 'adreça electrònica',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'data i hora ISO',
        date: 'data ISO',
        time: 'hora ISO',
        duration: 'durada ISO',
        ipv4: 'adreça IPv4',
        ipv6: 'adreça IPv6',
        cidrv4: 'rang IPv4',
        cidrv6: 'rang IPv6',
        base64: 'cadena codificada en base64',
        base64url: 'cadena codificada en base64url',
        json_string: 'cadena JSON',
        e164: 'número E.164',
        jwt: 'JWT',
        template_literal: 'entrada',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Tipus invàlid: s'esperava ${r.expected}, s'ha rebut ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Valor invàlid: s'esperava ${I(r.values[0])}`
            : `Opció invàlida: s'esperava una de ${_(r.values, ' o ')}`;
        case 'too_big': {
          let o = r.inclusive ? 'com a màxim' : 'menys de',
            s = t(r.origin);
          return s
            ? `Massa gran: s'esperava que ${r.origin ?? 'el valor'} contingués ${o} ${r.maximum.toString()} ${s.unit ?? 'elements'}`
            : `Massa gran: s'esperava que ${r.origin ?? 'el valor'} fos ${o} ${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? 'com a mínim' : 'més de',
            s = t(r.origin);
          return s
            ? `Massa petit: s'esperava que ${r.origin} contingués ${o} ${r.minimum.toString()} ${s.unit}`
            : `Massa petit: s'esperava que ${r.origin} fos ${o} ${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Format invàlid: ha de començar amb "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Format invàlid: ha d'acabar amb "${o.suffix}"`
              : o.format === 'includes'
                ? `Format invàlid: ha d'incloure "${o.includes}"`
                : o.format === 'regex'
                  ? `Format invàlid: ha de coincidir amb el patró ${o.pattern}`
                  : `Format invàlid per a ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Número invàlid: ha de ser múltiple de ${r.divisor}`;
        case 'unrecognized_keys':
          return `Clau${r.keys.length > 1 ? 's' : ''} no reconeguda${r.keys.length > 1 ? 's' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Clau invàlida a ${r.origin}`;
        case 'invalid_union':
          return 'Entrada invàlida';
        case 'invalid_element':
          return `Element invàlid a ${r.origin}`;
        default:
          return 'Entrada invàlida';
      }
    };
  };
  function Um() {
    return { localeError: L_() };
  }
  var R_ = () => {
    let e = {
      string: { unit: 'znaků', verb: 'mít' },
      file: { unit: 'bajtů', verb: 'mít' },
      array: { unit: 'prvků', verb: 'mít' },
      set: { unit: 'prvků', verb: 'mít' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'číslo';
          case 'string':
            return 'řetězec';
          case 'boolean':
            return 'boolean';
          case 'bigint':
            return 'bigint';
          case 'function':
            return 'funkce';
          case 'symbol':
            return 'symbol';
          case 'undefined':
            return 'undefined';
          case 'object': {
            if (Array.isArray(r)) return 'pole';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'regulární výraz',
        email: 'e-mailová adresa',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'datum a čas ve formátu ISO',
        date: 'datum ve formátu ISO',
        time: 'čas ve formátu ISO',
        duration: 'doba trvání ISO',
        ipv4: 'IPv4 adresa',
        ipv6: 'IPv6 adresa',
        cidrv4: 'rozsah IPv4',
        cidrv6: 'rozsah IPv6',
        base64: 'řetězec zakódovaný ve formátu base64',
        base64url: 'řetězec zakódovaný ve formátu base64url',
        json_string: 'řetězec ve formátu JSON',
        e164: 'číslo E.164',
        jwt: 'JWT',
        template_literal: 'vstup',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Neplatný vstup: očekáváno ${r.expected}, obdrženo ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Neplatný vstup: očekáváno ${I(r.values[0])}`
            : `Neplatná možnost: očekávána jedna z hodnot ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Hodnota je příliš velká: ${r.origin ?? 'hodnota'} musí mít ${o}${r.maximum.toString()} ${s.unit ?? 'prvků'}`
            : `Hodnota je příliš velká: ${r.origin ?? 'hodnota'} musí být ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Hodnota je příliš malá: ${r.origin ?? 'hodnota'} musí mít ${o}${r.minimum.toString()} ${s.unit ?? 'prvků'}`
            : `Hodnota je příliš malá: ${r.origin ?? 'hodnota'} musí být ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Neplatný řetězec: musí začínat na "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Neplatný řetězec: musí končit na "${o.suffix}"`
              : o.format === 'includes'
                ? `Neplatný řetězec: musí obsahovat "${o.includes}"`
                : o.format === 'regex'
                  ? `Neplatný řetězec: musí odpovídat vzoru ${o.pattern}`
                  : `Neplatný formát ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Neplatné číslo: musí být násobkem ${r.divisor}`;
        case 'unrecognized_keys':
          return `Neznámé klíče: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Neplatný klíč v ${r.origin}`;
        case 'invalid_union':
          return 'Neplatný vstup';
        case 'invalid_element':
          return `Neplatná hodnota v ${r.origin}`;
        default:
          return 'Neplatný vstup';
      }
    };
  };
  function Pm() {
    return { localeError: R_() };
  }
  var J_ = () => {
    let e = {
        string: { unit: 'tegn', verb: 'havde' },
        file: { unit: 'bytes', verb: 'havde' },
        array: { unit: 'elementer', verb: 'indeholdt' },
        set: { unit: 'elementer', verb: 'indeholdt' },
      },
      t = {
        string: 'streng',
        number: 'tal',
        boolean: 'boolean',
        array: 'liste',
        object: 'objekt',
        set: 'sæt',
        file: 'fil',
      };
    function i(s) {
      return e[s] ?? null;
    }
    function n(s) {
      return t[s] ?? s;
    }
    let r = (s) => {
        let u = typeof s;
        switch (u) {
          case 'number':
            return Number.isNaN(s) ? 'NaN' : 'tal';
          case 'object':
            return Array.isArray(s)
              ? 'liste'
              : s === null
                ? 'null'
                : Object.getPrototypeOf(s) !== Object.prototype && s.constructor
                  ? s.constructor.name
                  : 'objekt';
        }
        return u;
      },
      o = {
        regex: 'input',
        email: 'e-mailadresse',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO dato- og klokkeslæt',
        date: 'ISO-dato',
        time: 'ISO-klokkeslæt',
        duration: 'ISO-varighed',
        ipv4: 'IPv4-område',
        ipv6: 'IPv6-område',
        cidrv4: 'IPv4-spektrum',
        cidrv6: 'IPv6-spektrum',
        base64: 'base64-kodet streng',
        base64url: 'base64url-kodet streng',
        json_string: 'JSON-streng',
        e164: 'E.164-nummer',
        jwt: 'JWT',
        template_literal: 'input',
      };
    return (s) => {
      switch (s.code) {
        case 'invalid_type':
          return `Ugyldigt input: forventede ${n(s.expected)}, fik ${n(r(s.input))}`;
        case 'invalid_value':
          return s.values.length === 1
            ? `Ugyldig værdi: forventede ${I(s.values[0])}`
            : `Ugyldigt valg: forventede en af følgende ${_(s.values, '|')}`;
        case 'too_big': {
          let u = s.inclusive ? '<=' : '<',
            a = i(s.origin),
            c = n(s.origin);
          return a
            ? `For stor: forventede ${c ?? 'value'} ${a.verb} ${u} ${s.maximum.toString()} ${a.unit ?? 'elementer'}`
            : `For stor: forventede ${c ?? 'value'} havde ${u} ${s.maximum.toString()}`;
        }
        case 'too_small': {
          let u = s.inclusive ? '>=' : '>',
            a = i(s.origin),
            c = n(s.origin);
          return a
            ? `For lille: forventede ${c} ${a.verb} ${u} ${s.minimum.toString()} ${a.unit}`
            : `For lille: forventede ${c} havde ${u} ${s.minimum.toString()}`;
        }
        case 'invalid_format': {
          let u = s;
          return u.format === 'starts_with'
            ? `Ugyldig streng: skal starte med "${u.prefix}"`
            : u.format === 'ends_with'
              ? `Ugyldig streng: skal ende med "${u.suffix}"`
              : u.format === 'includes'
                ? `Ugyldig streng: skal indeholde "${u.includes}"`
                : u.format === 'regex'
                  ? `Ugyldig streng: skal matche mønsteret ${u.pattern}`
                  : `Ugyldig ${o[u.format] ?? s.format}`;
        }
        case 'not_multiple_of':
          return `Ugyldigt tal: skal være deleligt med ${s.divisor}`;
        case 'unrecognized_keys':
          return `${s.keys.length > 1 ? 'Ukendte nøgler' : 'Ukendt nøgle'}: ${_(s.keys, ', ')}`;
        case 'invalid_key':
          return `Ugyldig nøgle i ${s.origin}`;
        case 'invalid_union':
          return 'Ugyldigt input: matcher ingen af de tilladte typer';
        case 'invalid_element':
          return `Ugyldig værdi i ${s.origin}`;
        default:
          return 'Ugyldigt input';
      }
    };
  };
  function Nm() {
    return { localeError: J_() };
  }
  var F_ = () => {
    let e = {
      string: { unit: 'Zeichen', verb: 'zu haben' },
      file: { unit: 'Bytes', verb: 'zu haben' },
      array: { unit: 'Elemente', verb: 'zu haben' },
      set: { unit: 'Elemente', verb: 'zu haben' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'Zahl';
          case 'object': {
            if (Array.isArray(r)) return 'Array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'Eingabe',
        email: 'E-Mail-Adresse',
        url: 'URL',
        emoji: 'Emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO-Datum und -Uhrzeit',
        date: 'ISO-Datum',
        time: 'ISO-Uhrzeit',
        duration: 'ISO-Dauer',
        ipv4: 'IPv4-Adresse',
        ipv6: 'IPv6-Adresse',
        cidrv4: 'IPv4-Bereich',
        cidrv6: 'IPv6-Bereich',
        base64: 'Base64-codierter String',
        base64url: 'Base64-URL-codierter String',
        json_string: 'JSON-String',
        e164: 'E.164-Nummer',
        jwt: 'JWT',
        template_literal: 'Eingabe',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Ungültige Eingabe: erwartet ${r.expected}, erhalten ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Ungültige Eingabe: erwartet ${I(r.values[0])}`
            : `Ungültige Option: erwartet eine von ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Zu groß: erwartet, dass ${r.origin ?? 'Wert'} ${o}${r.maximum.toString()} ${s.unit ?? 'Elemente'} hat`
            : `Zu groß: erwartet, dass ${r.origin ?? 'Wert'} ${o}${r.maximum.toString()} ist`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Zu klein: erwartet, dass ${r.origin} ${o}${r.minimum.toString()} ${s.unit} hat`
            : `Zu klein: erwartet, dass ${r.origin} ${o}${r.minimum.toString()} ist`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Ungültiger String: muss mit "${o.prefix}" beginnen`
            : o.format === 'ends_with'
              ? `Ungültiger String: muss mit "${o.suffix}" enden`
              : o.format === 'includes'
                ? `Ungültiger String: muss "${o.includes}" enthalten`
                : o.format === 'regex'
                  ? `Ungültiger String: muss dem Muster ${o.pattern} entsprechen`
                  : `Ungültig: ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Ungültige Zahl: muss ein Vielfaches von ${r.divisor} sein`;
        case 'unrecognized_keys':
          return `${r.keys.length > 1 ? 'Unbekannte Schlüssel' : 'Unbekannter Schlüssel'}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Ungültiger Schlüssel in ${r.origin}`;
        case 'invalid_union':
          return 'Ungültige Eingabe';
        case 'invalid_element':
          return `Ungültiger Wert in ${r.origin}`;
        default:
          return 'Ungültige Eingabe';
      }
    };
  };
  function Dm() {
    return { localeError: F_() };
  }
  var V_ = (e) => {
      let t = typeof e;
      switch (t) {
        case 'number':
          return Number.isNaN(e) ? 'NaN' : 'number';
        case 'object': {
          if (Array.isArray(e)) return 'array';
          if (e === null) return 'null';
          if (Object.getPrototypeOf(e) !== Object.prototype && e.constructor)
            return e.constructor.name;
        }
      }
      return t;
    },
    M_ = () => {
      let e = {
        string: { unit: 'characters', verb: 'to have' },
        file: { unit: 'bytes', verb: 'to have' },
        array: { unit: 'items', verb: 'to have' },
        set: { unit: 'items', verb: 'to have' },
      };
      function t(n) {
        return e[n] ?? null;
      }
      let i = {
        regex: 'input',
        email: 'email address',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO datetime',
        date: 'ISO date',
        time: 'ISO time',
        duration: 'ISO duration',
        ipv4: 'IPv4 address',
        ipv6: 'IPv6 address',
        cidrv4: 'IPv4 range',
        cidrv6: 'IPv6 range',
        base64: 'base64-encoded string',
        base64url: 'base64url-encoded string',
        json_string: 'JSON string',
        e164: 'E.164 number',
        jwt: 'JWT',
        template_literal: 'input',
      };
      return (n) => {
        switch (n.code) {
          case 'invalid_type':
            return `Invalid input: expected ${n.expected}, received ${V_(n.input)}`;
          case 'invalid_value':
            return n.values.length === 1
              ? `Invalid input: expected ${I(n.values[0])}`
              : `Invalid option: expected one of ${_(n.values, '|')}`;
          case 'too_big': {
            let r = n.inclusive ? '<=' : '<',
              o = t(n.origin);
            return o
              ? `Too big: expected ${n.origin ?? 'value'} to have ${r}${n.maximum.toString()} ${o.unit ?? 'elements'}`
              : `Too big: expected ${n.origin ?? 'value'} to be ${r}${n.maximum.toString()}`;
          }
          case 'too_small': {
            let r = n.inclusive ? '>=' : '>',
              o = t(n.origin);
            return o
              ? `Too small: expected ${n.origin} to have ${r}${n.minimum.toString()} ${o.unit}`
              : `Too small: expected ${n.origin} to be ${r}${n.minimum.toString()}`;
          }
          case 'invalid_format': {
            let r = n;
            return r.format === 'starts_with'
              ? `Invalid string: must start with "${r.prefix}"`
              : r.format === 'ends_with'
                ? `Invalid string: must end with "${r.suffix}"`
                : r.format === 'includes'
                  ? `Invalid string: must include "${r.includes}"`
                  : r.format === 'regex'
                    ? `Invalid string: must match pattern ${r.pattern}`
                    : `Invalid ${i[r.format] ?? n.format}`;
          }
          case 'not_multiple_of':
            return `Invalid number: must be a multiple of ${n.divisor}`;
          case 'unrecognized_keys':
            return `Unrecognized key${n.keys.length > 1 ? 's' : ''}: ${_(n.keys, ', ')}`;
          case 'invalid_key':
            return `Invalid key in ${n.origin}`;
          case 'invalid_union':
            return 'Invalid input';
          case 'invalid_element':
            return `Invalid value in ${n.origin}`;
          default:
            return 'Invalid input';
        }
      };
    };
  function Cr() {
    return { localeError: M_() };
  }
  var W_ = (e) => {
      let t = typeof e;
      switch (t) {
        case 'number':
          return Number.isNaN(e) ? 'NaN' : 'nombro';
        case 'object': {
          if (Array.isArray(e)) return 'tabelo';
          if (e === null) return 'senvalora';
          if (Object.getPrototypeOf(e) !== Object.prototype && e.constructor)
            return e.constructor.name;
        }
      }
      return t;
    },
    B_ = () => {
      let e = {
        string: { unit: 'karaktrojn', verb: 'havi' },
        file: { unit: 'bajtojn', verb: 'havi' },
        array: { unit: 'elementojn', verb: 'havi' },
        set: { unit: 'elementojn', verb: 'havi' },
      };
      function t(n) {
        return e[n] ?? null;
      }
      let i = {
        regex: 'enigo',
        email: 'retadreso',
        url: 'URL',
        emoji: 'emoĝio',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO-datotempo',
        date: 'ISO-dato',
        time: 'ISO-tempo',
        duration: 'ISO-daŭro',
        ipv4: 'IPv4-adreso',
        ipv6: 'IPv6-adreso',
        cidrv4: 'IPv4-rango',
        cidrv6: 'IPv6-rango',
        base64: '64-ume kodita karaktraro',
        base64url: 'URL-64-ume kodita karaktraro',
        json_string: 'JSON-karaktraro',
        e164: 'E.164-nombro',
        jwt: 'JWT',
        template_literal: 'enigo',
      };
      return (n) => {
        switch (n.code) {
          case 'invalid_type':
            return `Nevalida enigo: atendiĝis ${n.expected}, riceviĝis ${W_(n.input)}`;
          case 'invalid_value':
            return n.values.length === 1
              ? `Nevalida enigo: atendiĝis ${I(n.values[0])}`
              : `Nevalida opcio: atendiĝis unu el ${_(n.values, '|')}`;
          case 'too_big': {
            let r = n.inclusive ? '<=' : '<',
              o = t(n.origin);
            return o
              ? `Tro granda: atendiĝis ke ${n.origin ?? 'valoro'} havu ${r}${n.maximum.toString()} ${o.unit ?? 'elementojn'}`
              : `Tro granda: atendiĝis ke ${n.origin ?? 'valoro'} havu ${r}${n.maximum.toString()}`;
          }
          case 'too_small': {
            let r = n.inclusive ? '>=' : '>',
              o = t(n.origin);
            return o
              ? `Tro malgranda: atendiĝis ke ${n.origin} havu ${r}${n.minimum.toString()} ${o.unit}`
              : `Tro malgranda: atendiĝis ke ${n.origin} estu ${r}${n.minimum.toString()}`;
          }
          case 'invalid_format': {
            let r = n;
            return r.format === 'starts_with'
              ? `Nevalida karaktraro: devas komenciĝi per "${r.prefix}"`
              : r.format === 'ends_with'
                ? `Nevalida karaktraro: devas finiĝi per "${r.suffix}"`
                : r.format === 'includes'
                  ? `Nevalida karaktraro: devas inkluzivi "${r.includes}"`
                  : r.format === 'regex'
                    ? `Nevalida karaktraro: devas kongrui kun la modelo ${r.pattern}`
                    : `Nevalida ${i[r.format] ?? n.format}`;
          }
          case 'not_multiple_of':
            return `Nevalida nombro: devas esti oblo de ${n.divisor}`;
          case 'unrecognized_keys':
            return `Nekonata${n.keys.length > 1 ? 'j' : ''} ŝlosilo${n.keys.length > 1 ? 'j' : ''}: ${_(n.keys, ', ')}`;
          case 'invalid_key':
            return `Nevalida ŝlosilo en ${n.origin}`;
          case 'invalid_union':
            return 'Nevalida enigo';
          case 'invalid_element':
            return `Nevalida valoro en ${n.origin}`;
          default:
            return 'Nevalida enigo';
        }
      };
    };
  function Zm() {
    return { localeError: B_() };
  }
  var G_ = () => {
    let e = {
        string: { unit: 'caracteres', verb: 'tener' },
        file: { unit: 'bytes', verb: 'tener' },
        array: { unit: 'elementos', verb: 'tener' },
        set: { unit: 'elementos', verb: 'tener' },
      },
      t = {
        string: 'texto',
        number: 'número',
        boolean: 'booleano',
        array: 'arreglo',
        object: 'objeto',
        set: 'conjunto',
        file: 'archivo',
        date: 'fecha',
        bigint: 'número grande',
        symbol: 'símbolo',
        undefined: 'indefinido',
        null: 'nulo',
        function: 'función',
        map: 'mapa',
        record: 'registro',
        tuple: 'tupla',
        enum: 'enumeración',
        union: 'unión',
        literal: 'literal',
        promise: 'promesa',
        void: 'vacío',
        never: 'nunca',
        unknown: 'desconocido',
        any: 'cualquiera',
      };
    function i(s) {
      return e[s] ?? null;
    }
    function n(s) {
      return t[s] ?? s;
    }
    let r = (s) => {
        let u = typeof s;
        switch (u) {
          case 'number':
            return Number.isNaN(s) ? 'NaN' : 'number';
          case 'object':
            return Array.isArray(s)
              ? 'array'
              : s === null
                ? 'null'
                : Object.getPrototypeOf(s) !== Object.prototype
                  ? s.constructor.name
                  : 'object';
        }
        return u;
      },
      o = {
        regex: 'entrada',
        email: 'dirección de correo electrónico',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'fecha y hora ISO',
        date: 'fecha ISO',
        time: 'hora ISO',
        duration: 'duración ISO',
        ipv4: 'dirección IPv4',
        ipv6: 'dirección IPv6',
        cidrv4: 'rango IPv4',
        cidrv6: 'rango IPv6',
        base64: 'cadena codificada en base64',
        base64url: 'URL codificada en base64',
        json_string: 'cadena JSON',
        e164: 'número E.164',
        jwt: 'JWT',
        template_literal: 'entrada',
      };
    return (s) => {
      switch (s.code) {
        case 'invalid_type':
          return `Entrada inválida: se esperaba ${n(s.expected)}, recibido ${n(r(s.input))}`;
        case 'invalid_value':
          return s.values.length === 1
            ? `Entrada inválida: se esperaba ${I(s.values[0])}`
            : `Opción inválida: se esperaba una de ${_(s.values, '|')}`;
        case 'too_big': {
          let u = s.inclusive ? '<=' : '<',
            a = i(s.origin),
            c = n(s.origin);
          return a
            ? `Demasiado grande: se esperaba que ${c ?? 'valor'} tuviera ${u}${s.maximum.toString()} ${a.unit ?? 'elementos'}`
            : `Demasiado grande: se esperaba que ${c ?? 'valor'} fuera ${u}${s.maximum.toString()}`;
        }
        case 'too_small': {
          let u = s.inclusive ? '>=' : '>',
            a = i(s.origin),
            c = n(s.origin);
          return a
            ? `Demasiado pequeño: se esperaba que ${c} tuviera ${u}${s.minimum.toString()} ${a.unit}`
            : `Demasiado pequeño: se esperaba que ${c} fuera ${u}${s.minimum.toString()}`;
        }
        case 'invalid_format': {
          let u = s;
          return u.format === 'starts_with'
            ? `Cadena inválida: debe comenzar con "${u.prefix}"`
            : u.format === 'ends_with'
              ? `Cadena inválida: debe terminar en "${u.suffix}"`
              : u.format === 'includes'
                ? `Cadena inválida: debe incluir "${u.includes}"`
                : u.format === 'regex'
                  ? `Cadena inválida: debe coincidir con el patrón ${u.pattern}`
                  : `Inválido ${o[u.format] ?? s.format}`;
        }
        case 'not_multiple_of':
          return `Número inválido: debe ser múltiplo de ${s.divisor}`;
        case 'unrecognized_keys':
          return `Llave${s.keys.length > 1 ? 's' : ''} desconocida${s.keys.length > 1 ? 's' : ''}: ${_(s.keys, ', ')}`;
        case 'invalid_key':
          return `Llave inválida en ${n(s.origin)}`;
        case 'invalid_union':
          return 'Entrada inválida';
        case 'invalid_element':
          return `Valor inválido en ${n(s.origin)}`;
        default:
          return 'Entrada inválida';
      }
    };
  };
  function Em() {
    return { localeError: G_() };
  }
  var K_ = () => {
    let e = {
      string: { unit: 'کاراکتر', verb: 'داشته باشد' },
      file: { unit: 'بایت', verb: 'داشته باشد' },
      array: { unit: 'آیتم', verb: 'داشته باشد' },
      set: { unit: 'آیتم', verb: 'داشته باشد' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'عدد';
          case 'object': {
            if (Array.isArray(r)) return 'آرایه';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'ورودی',
        email: 'آدرس ایمیل',
        url: 'URL',
        emoji: 'ایموجی',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'تاریخ و زمان ایزو',
        date: 'تاریخ ایزو',
        time: 'زمان ایزو',
        duration: 'مدت زمان ایزو',
        ipv4: 'IPv4 آدرس',
        ipv6: 'IPv6 آدرس',
        cidrv4: 'IPv4 دامنه',
        cidrv6: 'IPv6 دامنه',
        base64: 'base64-encoded رشته',
        base64url: 'base64url-encoded رشته',
        json_string: 'JSON رشته',
        e164: 'E.164 عدد',
        jwt: 'JWT',
        template_literal: 'ورودی',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `ورودی نامعتبر: می‌بایست ${r.expected} می‌بود، ${i(r.input)} دریافت شد`;
        case 'invalid_value':
          return r.values.length === 1
            ? `ورودی نامعتبر: می‌بایست ${I(r.values[0])} می‌بود`
            : `گزینه نامعتبر: می‌بایست یکی از ${_(r.values, '|')} می‌بود`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `خیلی بزرگ: ${r.origin ?? 'مقدار'} باید ${o}${r.maximum.toString()} ${s.unit ?? 'عنصر'} باشد`
            : `خیلی بزرگ: ${r.origin ?? 'مقدار'} باید ${o}${r.maximum.toString()} باشد`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `خیلی کوچک: ${r.origin} باید ${o}${r.minimum.toString()} ${s.unit} باشد`
            : `خیلی کوچک: ${r.origin} باید ${o}${r.minimum.toString()} باشد`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `رشته نامعتبر: باید با "${o.prefix}" شروع شود`
            : o.format === 'ends_with'
              ? `رشته نامعتبر: باید با "${o.suffix}" تمام شود`
              : o.format === 'includes'
                ? `رشته نامعتبر: باید شامل "${o.includes}" باشد`
                : o.format === 'regex'
                  ? `رشته نامعتبر: باید با الگوی ${o.pattern} مطابقت داشته باشد`
                  : `${n[o.format] ?? r.format} نامعتبر`;
        }
        case 'not_multiple_of':
          return `عدد نامعتبر: باید مضرب ${r.divisor} باشد`;
        case 'unrecognized_keys':
          return `کلید${r.keys.length > 1 ? 'های' : ''} ناشناس: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `کلید ناشناس در ${r.origin}`;
        case 'invalid_union':
          return 'ورودی نامعتبر';
        case 'invalid_element':
          return `مقدار نامعتبر در ${r.origin}`;
        default:
          return 'ورودی نامعتبر';
      }
    };
  };
  function Tm() {
    return { localeError: K_() };
  }
  var q_ = () => {
    let e = {
      string: { unit: 'merkkiä', subject: 'merkkijonon' },
      file: { unit: 'tavua', subject: 'tiedoston' },
      array: { unit: 'alkiota', subject: 'listan' },
      set: { unit: 'alkiota', subject: 'joukon' },
      number: { unit: '', subject: 'luvun' },
      bigint: { unit: '', subject: 'suuren kokonaisluvun' },
      int: { unit: '', subject: 'kokonaisluvun' },
      date: { unit: '', subject: 'päivämäärän' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'number';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'säännöllinen lauseke',
        email: 'sähköpostiosoite',
        url: 'URL-osoite',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO-aikaleima',
        date: 'ISO-päivämäärä',
        time: 'ISO-aika',
        duration: 'ISO-kesto',
        ipv4: 'IPv4-osoite',
        ipv6: 'IPv6-osoite',
        cidrv4: 'IPv4-alue',
        cidrv6: 'IPv6-alue',
        base64: 'base64-koodattu merkkijono',
        base64url: 'base64url-koodattu merkkijono',
        json_string: 'JSON-merkkijono',
        e164: 'E.164-luku',
        jwt: 'JWT',
        template_literal: 'templaattimerkkijono',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Virheellinen tyyppi: odotettiin ${r.expected}, oli ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Virheellinen syöte: täytyy olla ${I(r.values[0])}`
            : `Virheellinen valinta: täytyy olla yksi seuraavista: ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Liian suuri: ${s.subject} täytyy olla ${o}${r.maximum.toString()} ${s.unit}`.trim()
            : `Liian suuri: arvon täytyy olla ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Liian pieni: ${s.subject} täytyy olla ${o}${r.minimum.toString()} ${s.unit}`.trim()
            : `Liian pieni: arvon täytyy olla ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Virheellinen syöte: täytyy alkaa "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Virheellinen syöte: täytyy loppua "${o.suffix}"`
              : o.format === 'includes'
                ? `Virheellinen syöte: täytyy sisältää "${o.includes}"`
                : o.format === 'regex'
                  ? `Virheellinen syöte: täytyy vastata säännöllistä lauseketta ${o.pattern}`
                  : `Virheellinen ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Virheellinen luku: täytyy olla luvun ${r.divisor} monikerta`;
        case 'unrecognized_keys':
          return `${r.keys.length > 1 ? 'Tuntemattomat avaimet' : 'Tuntematon avain'}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return 'Virheellinen avain tietueessa';
        case 'invalid_union':
          return 'Virheellinen unioni';
        case 'invalid_element':
          return 'Virheellinen arvo joukossa';
        default:
          return 'Virheellinen syöte';
      }
    };
  };
  function Am() {
    return { localeError: q_() };
  }
  var X_ = () => {
    let e = {
      string: { unit: 'caractères', verb: 'avoir' },
      file: { unit: 'octets', verb: 'avoir' },
      array: { unit: 'éléments', verb: 'avoir' },
      set: { unit: 'éléments', verb: 'avoir' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'nombre';
          case 'object': {
            if (Array.isArray(r)) return 'tableau';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'entrée',
        email: 'adresse e-mail',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'date et heure ISO',
        date: 'date ISO',
        time: 'heure ISO',
        duration: 'durée ISO',
        ipv4: 'adresse IPv4',
        ipv6: 'adresse IPv6',
        cidrv4: 'plage IPv4',
        cidrv6: 'plage IPv6',
        base64: 'chaîne encodée en base64',
        base64url: 'chaîne encodée en base64url',
        json_string: 'chaîne JSON',
        e164: 'numéro E.164',
        jwt: 'JWT',
        template_literal: 'entrée',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Entrée invalide : ${r.expected} attendu, ${i(r.input)} reçu`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Entrée invalide : ${I(r.values[0])} attendu`
            : `Option invalide : une valeur parmi ${_(r.values, '|')} attendue`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Trop grand : ${r.origin ?? 'valeur'} doit ${s.verb} ${o}${r.maximum.toString()} ${s.unit ?? 'élément(s)'}`
            : `Trop grand : ${r.origin ?? 'valeur'} doit être ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Trop petit : ${r.origin} doit ${s.verb} ${o}${r.minimum.toString()} ${s.unit}`
            : `Trop petit : ${r.origin} doit être ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Chaîne invalide : doit commencer par "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Chaîne invalide : doit se terminer par "${o.suffix}"`
              : o.format === 'includes'
                ? `Chaîne invalide : doit inclure "${o.includes}"`
                : o.format === 'regex'
                  ? `Chaîne invalide : doit correspondre au modèle ${o.pattern}`
                  : `${n[o.format] ?? r.format} invalide`;
        }
        case 'not_multiple_of':
          return `Nombre invalide : doit être un multiple de ${r.divisor}`;
        case 'unrecognized_keys':
          return `Clé${r.keys.length > 1 ? 's' : ''} non reconnue${r.keys.length > 1 ? 's' : ''} : ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Clé invalide dans ${r.origin}`;
        case 'invalid_union':
          return 'Entrée invalide';
        case 'invalid_element':
          return `Valeur invalide dans ${r.origin}`;
        default:
          return 'Entrée invalide';
      }
    };
  };
  function Cm() {
    return { localeError: X_() };
  }
  var H_ = () => {
    let e = {
      string: { unit: 'caractères', verb: 'avoir' },
      file: { unit: 'octets', verb: 'avoir' },
      array: { unit: 'éléments', verb: 'avoir' },
      set: { unit: 'éléments', verb: 'avoir' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'number';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'entrée',
        email: 'adresse courriel',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'date-heure ISO',
        date: 'date ISO',
        time: 'heure ISO',
        duration: 'durée ISO',
        ipv4: 'adresse IPv4',
        ipv6: 'adresse IPv6',
        cidrv4: 'plage IPv4',
        cidrv6: 'plage IPv6',
        base64: 'chaîne encodée en base64',
        base64url: 'chaîne encodée en base64url',
        json_string: 'chaîne JSON',
        e164: 'numéro E.164',
        jwt: 'JWT',
        template_literal: 'entrée',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Entrée invalide : attendu ${r.expected}, reçu ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Entrée invalide : attendu ${I(r.values[0])}`
            : `Option invalide : attendu l'une des valeurs suivantes ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '≤' : '<',
            s = t(r.origin);
          return s
            ? `Trop grand : attendu que ${r.origin ?? 'la valeur'} ait ${o}${r.maximum.toString()} ${s.unit}`
            : `Trop grand : attendu que ${r.origin ?? 'la valeur'} soit ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '≥' : '>',
            s = t(r.origin);
          return s
            ? `Trop petit : attendu que ${r.origin} ait ${o}${r.minimum.toString()} ${s.unit}`
            : `Trop petit : attendu que ${r.origin} soit ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Chaîne invalide : doit commencer par "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Chaîne invalide : doit se terminer par "${o.suffix}"`
              : o.format === 'includes'
                ? `Chaîne invalide : doit inclure "${o.includes}"`
                : o.format === 'regex'
                  ? `Chaîne invalide : doit correspondre au motif ${o.pattern}`
                  : `${n[o.format] ?? r.format} invalide`;
        }
        case 'not_multiple_of':
          return `Nombre invalide : doit être un multiple de ${r.divisor}`;
        case 'unrecognized_keys':
          return `Clé${r.keys.length > 1 ? 's' : ''} non reconnue${r.keys.length > 1 ? 's' : ''} : ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Clé invalide dans ${r.origin}`;
        case 'invalid_union':
          return 'Entrée invalide';
        case 'invalid_element':
          return `Valeur invalide dans ${r.origin}`;
        default:
          return 'Entrée invalide';
      }
    };
  };
  function Lm() {
    return { localeError: H_() };
  }
  var Y_ = () => {
    let e = {
      string: { unit: 'אותיות', verb: 'לכלול' },
      file: { unit: 'בייטים', verb: 'לכלול' },
      array: { unit: 'פריטים', verb: 'לכלול' },
      set: { unit: 'פריטים', verb: 'לכלול' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'number';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'קלט',
        email: 'כתובת אימייל',
        url: 'כתובת רשת',
        emoji: "אימוג'י",
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'תאריך וזמן ISO',
        date: 'תאריך ISO',
        time: 'זמן ISO',
        duration: 'משך זמן ISO',
        ipv4: 'כתובת IPv4',
        ipv6: 'כתובת IPv6',
        cidrv4: 'טווח IPv4',
        cidrv6: 'טווח IPv6',
        base64: 'מחרוזת בבסיס 64',
        base64url: 'מחרוזת בבסיס 64 לכתובות רשת',
        json_string: 'מחרוזת JSON',
        e164: 'מספר E.164',
        jwt: 'JWT',
        template_literal: 'קלט',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `קלט לא תקין: צריך ${r.expected}, התקבל ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `קלט לא תקין: צריך ${I(r.values[0])}`
            : `קלט לא תקין: צריך אחת מהאפשרויות  ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `גדול מדי: ${r.origin ?? 'value'} צריך להיות ${o}${r.maximum.toString()} ${s.unit ?? 'elements'}`
            : `גדול מדי: ${r.origin ?? 'value'} צריך להיות ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `קטן מדי: ${r.origin} צריך להיות ${o}${r.minimum.toString()} ${s.unit}`
            : `קטן מדי: ${r.origin} צריך להיות ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `מחרוזת לא תקינה: חייבת להתחיל ב"${o.prefix}"`
            : o.format === 'ends_with'
              ? `מחרוזת לא תקינה: חייבת להסתיים ב "${o.suffix}"`
              : o.format === 'includes'
                ? `מחרוזת לא תקינה: חייבת לכלול "${o.includes}"`
                : o.format === 'regex'
                  ? `מחרוזת לא תקינה: חייבת להתאים לתבנית ${o.pattern}`
                  : `${n[o.format] ?? r.format} לא תקין`;
        }
        case 'not_multiple_of':
          return `מספר לא תקין: חייב להיות מכפלה של ${r.divisor}`;
        case 'unrecognized_keys':
          return `מפתח${r.keys.length > 1 ? 'ות' : ''} לא מזוה${r.keys.length > 1 ? 'ים' : 'ה'}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `מפתח לא תקין ב${r.origin}`;
        case 'invalid_union':
          return 'קלט לא תקין';
        case 'invalid_element':
          return `ערך לא תקין ב${r.origin}`;
        default:
          return 'קלט לא תקין';
      }
    };
  };
  function Rm() {
    return { localeError: Y_() };
  }
  var Q_ = () => {
    let e = {
      string: { unit: 'karakter', verb: 'legyen' },
      file: { unit: 'byte', verb: 'legyen' },
      array: { unit: 'elem', verb: 'legyen' },
      set: { unit: 'elem', verb: 'legyen' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'szám';
          case 'object': {
            if (Array.isArray(r)) return 'tömb';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'bemenet',
        email: 'email cím',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO időbélyeg',
        date: 'ISO dátum',
        time: 'ISO idő',
        duration: 'ISO időintervallum',
        ipv4: 'IPv4 cím',
        ipv6: 'IPv6 cím',
        cidrv4: 'IPv4 tartomány',
        cidrv6: 'IPv6 tartomány',
        base64: 'base64-kódolt string',
        base64url: 'base64url-kódolt string',
        json_string: 'JSON string',
        e164: 'E.164 szám',
        jwt: 'JWT',
        template_literal: 'bemenet',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Érvénytelen bemenet: a várt érték ${r.expected}, a kapott érték ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Érvénytelen bemenet: a várt érték ${I(r.values[0])}`
            : `Érvénytelen opció: valamelyik érték várt ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Túl nagy: ${r.origin ?? 'érték'} mérete túl nagy ${o}${r.maximum.toString()} ${s.unit ?? 'elem'}`
            : `Túl nagy: a bemeneti érték ${r.origin ?? 'érték'} túl nagy: ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Túl kicsi: a bemeneti érték ${r.origin} mérete túl kicsi ${o}${r.minimum.toString()} ${s.unit}`
            : `Túl kicsi: a bemeneti érték ${r.origin} túl kicsi ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Érvénytelen string: "${o.prefix}" értékkel kell kezdődnie`
            : o.format === 'ends_with'
              ? `Érvénytelen string: "${o.suffix}" értékkel kell végződnie`
              : o.format === 'includes'
                ? `Érvénytelen string: "${o.includes}" értéket kell tartalmaznia`
                : o.format === 'regex'
                  ? `Érvénytelen string: ${o.pattern} mintának kell megfelelnie`
                  : `Érvénytelen ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Érvénytelen szám: ${r.divisor} többszörösének kell lennie`;
        case 'unrecognized_keys':
          return `Ismeretlen kulcs${r.keys.length > 1 ? 's' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Érvénytelen kulcs ${r.origin}`;
        case 'invalid_union':
          return 'Érvénytelen bemenet';
        case 'invalid_element':
          return `Érvénytelen érték: ${r.origin}`;
        default:
          return 'Érvénytelen bemenet';
      }
    };
  };
  function Jm() {
    return { localeError: Q_() };
  }
  var ek = () => {
    let e = {
      string: { unit: 'karakter', verb: 'memiliki' },
      file: { unit: 'byte', verb: 'memiliki' },
      array: { unit: 'item', verb: 'memiliki' },
      set: { unit: 'item', verb: 'memiliki' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'number';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'input',
        email: 'alamat email',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'tanggal dan waktu format ISO',
        date: 'tanggal format ISO',
        time: 'jam format ISO',
        duration: 'durasi format ISO',
        ipv4: 'alamat IPv4',
        ipv6: 'alamat IPv6',
        cidrv4: 'rentang alamat IPv4',
        cidrv6: 'rentang alamat IPv6',
        base64: 'string dengan enkode base64',
        base64url: 'string dengan enkode base64url',
        json_string: 'string JSON',
        e164: 'angka E.164',
        jwt: 'JWT',
        template_literal: 'input',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Input tidak valid: diharapkan ${r.expected}, diterima ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Input tidak valid: diharapkan ${I(r.values[0])}`
            : `Pilihan tidak valid: diharapkan salah satu dari ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Terlalu besar: diharapkan ${r.origin ?? 'value'} memiliki ${o}${r.maximum.toString()} ${s.unit ?? 'elemen'}`
            : `Terlalu besar: diharapkan ${r.origin ?? 'value'} menjadi ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Terlalu kecil: diharapkan ${r.origin} memiliki ${o}${r.minimum.toString()} ${s.unit}`
            : `Terlalu kecil: diharapkan ${r.origin} menjadi ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `String tidak valid: harus dimulai dengan "${o.prefix}"`
            : o.format === 'ends_with'
              ? `String tidak valid: harus berakhir dengan "${o.suffix}"`
              : o.format === 'includes'
                ? `String tidak valid: harus menyertakan "${o.includes}"`
                : o.format === 'regex'
                  ? `String tidak valid: harus sesuai pola ${o.pattern}`
                  : `${n[o.format] ?? r.format} tidak valid`;
        }
        case 'not_multiple_of':
          return `Angka tidak valid: harus kelipatan dari ${r.divisor}`;
        case 'unrecognized_keys':
          return `Kunci tidak dikenali ${r.keys.length > 1 ? 's' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Kunci tidak valid di ${r.origin}`;
        case 'invalid_union':
          return 'Input tidak valid';
        case 'invalid_element':
          return `Nilai tidak valid di ${r.origin}`;
        default:
          return 'Input tidak valid';
      }
    };
  };
  function Fm() {
    return { localeError: ek() };
  }
  var tk = (e) => {
      let t = typeof e;
      switch (t) {
        case 'number':
          return Number.isNaN(e) ? 'NaN' : 'númer';
        case 'object': {
          if (Array.isArray(e)) return 'fylki';
          if (e === null) return 'null';
          if (Object.getPrototypeOf(e) !== Object.prototype && e.constructor)
            return e.constructor.name;
        }
      }
      return t;
    },
    nk = () => {
      let e = {
        string: { unit: 'stafi', verb: 'að hafa' },
        file: { unit: 'bæti', verb: 'að hafa' },
        array: { unit: 'hluti', verb: 'að hafa' },
        set: { unit: 'hluti', verb: 'að hafa' },
      };
      function t(n) {
        return e[n] ?? null;
      }
      let i = {
        regex: 'gildi',
        email: 'netfang',
        url: 'vefslóð',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO dagsetning og tími',
        date: 'ISO dagsetning',
        time: 'ISO tími',
        duration: 'ISO tímalengd',
        ipv4: 'IPv4 address',
        ipv6: 'IPv6 address',
        cidrv4: 'IPv4 range',
        cidrv6: 'IPv6 range',
        base64: 'base64-encoded strengur',
        base64url: 'base64url-encoded strengur',
        json_string: 'JSON strengur',
        e164: 'E.164 tölugildi',
        jwt: 'JWT',
        template_literal: 'gildi',
      };
      return (n) => {
        switch (n.code) {
          case 'invalid_type':
            return `Rangt gildi: Þú slóst inn ${tk(n.input)} þar sem á að vera ${n.expected}`;
          case 'invalid_value':
            return n.values.length === 1
              ? `Rangt gildi: gert ráð fyrir ${I(n.values[0])}`
              : `Ógilt val: má vera eitt af eftirfarandi ${_(n.values, '|')}`;
          case 'too_big': {
            let r = n.inclusive ? '<=' : '<',
              o = t(n.origin);
            return o
              ? `Of stórt: gert er ráð fyrir að ${n.origin ?? 'gildi'} hafi ${r}${n.maximum.toString()} ${o.unit ?? 'hluti'}`
              : `Of stórt: gert er ráð fyrir að ${n.origin ?? 'gildi'} sé ${r}${n.maximum.toString()}`;
          }
          case 'too_small': {
            let r = n.inclusive ? '>=' : '>',
              o = t(n.origin);
            return o
              ? `Of lítið: gert er ráð fyrir að ${n.origin} hafi ${r}${n.minimum.toString()} ${o.unit}`
              : `Of lítið: gert er ráð fyrir að ${n.origin} sé ${r}${n.minimum.toString()}`;
          }
          case 'invalid_format': {
            let r = n;
            return r.format === 'starts_with'
              ? `Ógildur strengur: verður að byrja á "${r.prefix}"`
              : r.format === 'ends_with'
                ? `Ógildur strengur: verður að enda á "${r.suffix}"`
                : r.format === 'includes'
                  ? `Ógildur strengur: verður að innihalda "${r.includes}"`
                  : r.format === 'regex'
                    ? `Ógildur strengur: verður að fylgja mynstri ${r.pattern}`
                    : `Rangt ${i[r.format] ?? n.format}`;
          }
          case 'not_multiple_of':
            return `Röng tala: verður að vera margfeldi af ${n.divisor}`;
          case 'unrecognized_keys':
            return `Óþekkt ${n.keys.length > 1 ? 'ir lyklar' : 'ur lykill'}: ${_(n.keys, ', ')}`;
          case 'invalid_key':
            return `Rangur lykill í ${n.origin}`;
          case 'invalid_union':
            return 'Rangt gildi';
          case 'invalid_element':
            return `Rangt gildi í ${n.origin}`;
          default:
            return 'Rangt gildi';
        }
      };
    };
  function Vm() {
    return { localeError: nk() };
  }
  var rk = () => {
    let e = {
      string: { unit: 'caratteri', verb: 'avere' },
      file: { unit: 'byte', verb: 'avere' },
      array: { unit: 'elementi', verb: 'avere' },
      set: { unit: 'elementi', verb: 'avere' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'numero';
          case 'object': {
            if (Array.isArray(r)) return 'vettore';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'input',
        email: 'indirizzo email',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'data e ora ISO',
        date: 'data ISO',
        time: 'ora ISO',
        duration: 'durata ISO',
        ipv4: 'indirizzo IPv4',
        ipv6: 'indirizzo IPv6',
        cidrv4: 'intervallo IPv4',
        cidrv6: 'intervallo IPv6',
        base64: 'stringa codificata in base64',
        base64url: 'URL codificata in base64',
        json_string: 'stringa JSON',
        e164: 'numero E.164',
        jwt: 'JWT',
        template_literal: 'input',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Input non valido: atteso ${r.expected}, ricevuto ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Input non valido: atteso ${I(r.values[0])}`
            : `Opzione non valida: atteso uno tra ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Troppo grande: ${r.origin ?? 'valore'} deve avere ${o}${r.maximum.toString()} ${s.unit ?? 'elementi'}`
            : `Troppo grande: ${r.origin ?? 'valore'} deve essere ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Troppo piccolo: ${r.origin} deve avere ${o}${r.minimum.toString()} ${s.unit}`
            : `Troppo piccolo: ${r.origin} deve essere ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Stringa non valida: deve iniziare con "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Stringa non valida: deve terminare con "${o.suffix}"`
              : o.format === 'includes'
                ? `Stringa non valida: deve includere "${o.includes}"`
                : o.format === 'regex'
                  ? `Stringa non valida: deve corrispondere al pattern ${o.pattern}`
                  : `Invalid ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Numero non valido: deve essere un multiplo di ${r.divisor}`;
        case 'unrecognized_keys':
          return `Chiav${r.keys.length > 1 ? 'i' : 'e'} non riconosciut${r.keys.length > 1 ? 'e' : 'a'}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Chiave non valida in ${r.origin}`;
        case 'invalid_union':
          return 'Input non valido';
        case 'invalid_element':
          return `Valore non valido in ${r.origin}`;
        default:
          return 'Input non valido';
      }
    };
  };
  function Mm() {
    return { localeError: rk() };
  }
  var ik = () => {
    let e = {
      string: { unit: '文字', verb: 'である' },
      file: { unit: 'バイト', verb: 'である' },
      array: { unit: '要素', verb: 'である' },
      set: { unit: '要素', verb: 'である' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : '数値';
          case 'object': {
            if (Array.isArray(r)) return '配列';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: '入力値',
        email: 'メールアドレス',
        url: 'URL',
        emoji: '絵文字',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO日時',
        date: 'ISO日付',
        time: 'ISO時刻',
        duration: 'ISO期間',
        ipv4: 'IPv4アドレス',
        ipv6: 'IPv6アドレス',
        cidrv4: 'IPv4範囲',
        cidrv6: 'IPv6範囲',
        base64: 'base64エンコード文字列',
        base64url: 'base64urlエンコード文字列',
        json_string: 'JSON文字列',
        e164: 'E.164番号',
        jwt: 'JWT',
        template_literal: '入力値',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `無効な入力: ${r.expected}が期待されましたが、${i(r.input)}が入力されました`;
        case 'invalid_value':
          return r.values.length === 1
            ? `無効な入力: ${I(r.values[0])}が期待されました`
            : `無効な選択: ${_(r.values, '、')}のいずれかである必要があります`;
        case 'too_big': {
          let o = r.inclusive ? '以下である' : 'より小さい',
            s = t(r.origin);
          return s
            ? `大きすぎる値: ${r.origin ?? '値'}は${r.maximum.toString()}${s.unit ?? '要素'}${o}必要があります`
            : `大きすぎる値: ${r.origin ?? '値'}は${r.maximum.toString()}${o}必要があります`;
        }
        case 'too_small': {
          let o = r.inclusive ? '以上である' : 'より大きい',
            s = t(r.origin);
          return s
            ? `小さすぎる値: ${r.origin}は${r.minimum.toString()}${s.unit}${o}必要があります`
            : `小さすぎる値: ${r.origin}は${r.minimum.toString()}${o}必要があります`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `無効な文字列: "${o.prefix}"で始まる必要があります`
            : o.format === 'ends_with'
              ? `無効な文字列: "${o.suffix}"で終わる必要があります`
              : o.format === 'includes'
                ? `無効な文字列: "${o.includes}"を含む必要があります`
                : o.format === 'regex'
                  ? `無効な文字列: パターン${o.pattern}に一致する必要があります`
                  : `無効な${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `無効な数値: ${r.divisor}の倍数である必要があります`;
        case 'unrecognized_keys':
          return `認識されていないキー${r.keys.length > 1 ? '群' : ''}: ${_(r.keys, '、')}`;
        case 'invalid_key':
          return `${r.origin}内の無効なキー`;
        case 'invalid_union':
          return '無効な入力';
        case 'invalid_element':
          return `${r.origin}内の無効な値`;
        default:
          return '無効な入力';
      }
    };
  };
  function Wm() {
    return { localeError: ik() };
  }
  var ok = (e) => {
      let t = typeof e;
      switch (t) {
        case 'number':
          return Number.isNaN(e) ? 'NaN' : 'რიცხვი';
        case 'object': {
          if (Array.isArray(e)) return 'მასივი';
          if (e === null) return 'null';
          if (Object.getPrototypeOf(e) !== Object.prototype && e.constructor)
            return e.constructor.name;
        }
      }
      return (
        {
          string: 'სტრინგი',
          boolean: 'ბულეანი',
          undefined: 'undefined',
          bigint: 'bigint',
          symbol: 'symbol',
          function: 'ფუნქცია',
        }[t] ?? t
      );
    },
    ak = () => {
      let e = {
        string: { unit: 'სიმბოლო', verb: 'უნდა შეიცავდეს' },
        file: { unit: 'ბაიტი', verb: 'უნდა შეიცავდეს' },
        array: { unit: 'ელემენტი', verb: 'უნდა შეიცავდეს' },
        set: { unit: 'ელემენტი', verb: 'უნდა შეიცავდეს' },
      };
      function t(n) {
        return e[n] ?? null;
      }
      let i = {
        regex: 'შეყვანა',
        email: 'ელ-ფოსტის მისამართი',
        url: 'URL',
        emoji: 'ემოჯი',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'თარიღი-დრო',
        date: 'თარიღი',
        time: 'დრო',
        duration: 'ხანგრძლივობა',
        ipv4: 'IPv4 მისამართი',
        ipv6: 'IPv6 მისამართი',
        cidrv4: 'IPv4 დიაპაზონი',
        cidrv6: 'IPv6 დიაპაზონი',
        base64: 'base64-კოდირებული სტრინგი',
        base64url: 'base64url-კოდირებული სტრინგი',
        json_string: 'JSON სტრინგი',
        e164: 'E.164 ნომერი',
        jwt: 'JWT',
        template_literal: 'შეყვანა',
      };
      return (n) => {
        switch (n.code) {
          case 'invalid_type':
            return `არასწორი შეყვანა: მოსალოდნელი ${n.expected}, მიღებული ${ok(n.input)}`;
          case 'invalid_value':
            return n.values.length === 1
              ? `არასწორი შეყვანა: მოსალოდნელი ${I(n.values[0])}`
              : `არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${_(n.values, '|')}-დან`;
          case 'too_big': {
            let r = n.inclusive ? '<=' : '<',
              o = t(n.origin);
            return o
              ? `ზედმეტად დიდი: მოსალოდნელი ${n.origin ?? 'მნიშვნელობა'} ${o.verb} ${r}${n.maximum.toString()} ${o.unit}`
              : `ზედმეტად დიდი: მოსალოდნელი ${n.origin ?? 'მნიშვნელობა'} იყოს ${r}${n.maximum.toString()}`;
          }
          case 'too_small': {
            let r = n.inclusive ? '>=' : '>',
              o = t(n.origin);
            return o
              ? `ზედმეტად პატარა: მოსალოდნელი ${n.origin} ${o.verb} ${r}${n.minimum.toString()} ${o.unit}`
              : `ზედმეტად პატარა: მოსალოდნელი ${n.origin} იყოს ${r}${n.minimum.toString()}`;
          }
          case 'invalid_format': {
            let r = n;
            return r.format === 'starts_with'
              ? `არასწორი სტრინგი: უნდა იწყებოდეს "${r.prefix}"-ით`
              : r.format === 'ends_with'
                ? `არასწორი სტრინგი: უნდა მთავრდებოდეს "${r.suffix}"-ით`
                : r.format === 'includes'
                  ? `არასწორი სტრინგი: უნდა შეიცავდეს "${r.includes}"-ს`
                  : r.format === 'regex'
                    ? `არასწორი სტრინგი: უნდა შეესაბამებოდეს შაბლონს ${r.pattern}`
                    : `არასწორი ${i[r.format] ?? n.format}`;
          }
          case 'not_multiple_of':
            return `არასწორი რიცხვი: უნდა იყოს ${n.divisor}-ის ჯერადი`;
          case 'unrecognized_keys':
            return `უცნობი გასაღებ${n.keys.length > 1 ? 'ები' : 'ი'}: ${_(n.keys, ', ')}`;
          case 'invalid_key':
            return `არასწორი გასაღები ${n.origin}-ში`;
          case 'invalid_union':
            return 'არასწორი შეყვანა';
          case 'invalid_element':
            return `არასწორი მნიშვნელობა ${n.origin}-ში`;
          default:
            return 'არასწორი შეყვანა';
        }
      };
    };
  function Bm() {
    return { localeError: ak() };
  }
  var sk = () => {
    let e = {
      string: { unit: 'តួអក្សរ', verb: 'គួរមាន' },
      file: { unit: 'បៃ', verb: 'គួរមាន' },
      array: { unit: 'ធាតុ', verb: 'គួរមាន' },
      set: { unit: 'ធាតុ', verb: 'គួរមាន' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'មិនមែនជាលេខ (NaN)' : 'លេខ';
          case 'object': {
            if (Array.isArray(r)) return 'អារេ (Array)';
            if (r === null) return 'គ្មានតម្លៃ (null)';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'ទិន្នន័យបញ្ចូល',
        email: 'អាសយដ្ឋានអ៊ីមែល',
        url: 'URL',
        emoji: 'សញ្ញាអារម្មណ៍',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'កាលបរិច្ឆេទ និងម៉ោង ISO',
        date: 'កាលបរិច្ឆេទ ISO',
        time: 'ម៉ោង ISO',
        duration: 'រយៈពេល ISO',
        ipv4: 'អាសយដ្ឋាន IPv4',
        ipv6: 'អាសយដ្ឋាន IPv6',
        cidrv4: 'ដែនអាសយដ្ឋាន IPv4',
        cidrv6: 'ដែនអាសយដ្ឋាន IPv6',
        base64: 'ខ្សែអក្សរអ៊ិកូដ base64',
        base64url: 'ខ្សែអក្សរអ៊ិកូដ base64url',
        json_string: 'ខ្សែអក្សរ JSON',
        e164: 'លេខ E.164',
        jwt: 'JWT',
        template_literal: 'ទិន្នន័យបញ្ចូល',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${r.expected} ប៉ុន្តែទទួលបាន ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${I(r.values[0])}`
            : `ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `ធំពេក៖ ត្រូវការ ${r.origin ?? 'តម្លៃ'} ${o} ${r.maximum.toString()} ${s.unit ?? 'ធាតុ'}`
            : `ធំពេក៖ ត្រូវការ ${r.origin ?? 'តម្លៃ'} ${o} ${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `តូចពេក៖ ត្រូវការ ${r.origin} ${o} ${r.minimum.toString()} ${s.unit}`
            : `តូចពេក៖ ត្រូវការ ${r.origin} ${o} ${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវចាប់ផ្តើមដោយ "${o.prefix}"`
            : o.format === 'ends_with'
              ? `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវបញ្ចប់ដោយ "${o.suffix}"`
              : o.format === 'includes'
                ? `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវមាន "${o.includes}"`
                : o.format === 'regex'
                  ? `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវតែផ្គូផ្គងនឹងទម្រង់ដែលបានកំណត់ ${o.pattern}`
                  : `មិនត្រឹមត្រូវ៖ ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `លេខមិនត្រឹមត្រូវ៖ ត្រូវតែជាពហុគុណនៃ ${r.divisor}`;
        case 'unrecognized_keys':
          return `រកឃើញសោមិនស្គាល់៖ ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `សោមិនត្រឹមត្រូវនៅក្នុង ${r.origin}`;
        case 'invalid_union':
          return 'ទិន្នន័យមិនត្រឹមត្រូវ';
        case 'invalid_element':
          return `ទិន្នន័យមិនត្រឹមត្រូវនៅក្នុង ${r.origin}`;
        default:
          return 'ទិន្នន័យមិនត្រឹមត្រូវ';
      }
    };
  };
  function Lr() {
    return { localeError: sk() };
  }
  function Gm() {
    return Lr();
  }
  var uk = () => {
    let e = {
      string: { unit: '문자', verb: 'to have' },
      file: { unit: '바이트', verb: 'to have' },
      array: { unit: '개', verb: 'to have' },
      set: { unit: '개', verb: 'to have' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'number';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: '입력',
        email: '이메일 주소',
        url: 'URL',
        emoji: '이모지',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO 날짜시간',
        date: 'ISO 날짜',
        time: 'ISO 시간',
        duration: 'ISO 기간',
        ipv4: 'IPv4 주소',
        ipv6: 'IPv6 주소',
        cidrv4: 'IPv4 범위',
        cidrv6: 'IPv6 범위',
        base64: 'base64 인코딩 문자열',
        base64url: 'base64url 인코딩 문자열',
        json_string: 'JSON 문자열',
        e164: 'E.164 번호',
        jwt: 'JWT',
        template_literal: '입력',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `잘못된 입력: 예상 타입은 ${r.expected}, 받은 타입은 ${i(r.input)}입니다`;
        case 'invalid_value':
          return r.values.length === 1
            ? `잘못된 입력: 값은 ${I(r.values[0])} 이어야 합니다`
            : `잘못된 옵션: ${_(r.values, '또는 ')} 중 하나여야 합니다`;
        case 'too_big': {
          let o = r.inclusive ? '이하' : '미만',
            s = o === '미만' ? '이어야 합니다' : '여야 합니다',
            u = t(r.origin),
            a = u?.unit ?? '요소';
          return u
            ? `${r.origin ?? '값'}이 너무 큽니다: ${r.maximum.toString()}${a} ${o}${s}`
            : `${r.origin ?? '값'}이 너무 큽니다: ${r.maximum.toString()} ${o}${s}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '이상' : '초과',
            s = o === '이상' ? '이어야 합니다' : '여야 합니다',
            u = t(r.origin),
            a = u?.unit ?? '요소';
          return u
            ? `${r.origin ?? '값'}이 너무 작습니다: ${r.minimum.toString()}${a} ${o}${s}`
            : `${r.origin ?? '값'}이 너무 작습니다: ${r.minimum.toString()} ${o}${s}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `잘못된 문자열: "${o.prefix}"(으)로 시작해야 합니다`
            : o.format === 'ends_with'
              ? `잘못된 문자열: "${o.suffix}"(으)로 끝나야 합니다`
              : o.format === 'includes'
                ? `잘못된 문자열: "${o.includes}"을(를) 포함해야 합니다`
                : o.format === 'regex'
                  ? `잘못된 문자열: 정규식 ${o.pattern} 패턴과 일치해야 합니다`
                  : `잘못된 ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `잘못된 숫자: ${r.divisor}의 배수여야 합니다`;
        case 'unrecognized_keys':
          return `인식할 수 없는 키: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `잘못된 키: ${r.origin}`;
        case 'invalid_union':
          return '잘못된 입력';
        case 'invalid_element':
          return `잘못된 값: ${r.origin}`;
        default:
          return '잘못된 입력';
      }
    };
  };
  function Km() {
    return { localeError: uk() };
  }
  var ck = (e) => pn(typeof e, e),
    pn = (e, t = void 0) => {
      switch (e) {
        case 'number':
          return Number.isNaN(t) ? 'NaN' : 'skaičius';
        case 'bigint':
          return 'sveikasis skaičius';
        case 'string':
          return 'eilutė';
        case 'boolean':
          return 'loginė reikšmė';
        case 'undefined':
        case 'void':
          return 'neapibrėžta reikšmė';
        case 'function':
          return 'funkcija';
        case 'symbol':
          return 'simbolis';
        case 'object':
          return t === void 0
            ? 'nežinomas objektas'
            : t === null
              ? 'nulinė reikšmė'
              : Array.isArray(t)
                ? 'masyvas'
                : Object.getPrototypeOf(t) !== Object.prototype && t.constructor
                  ? t.constructor.name
                  : 'objektas';
        case 'null':
          return 'nulinė reikšmė';
      }
      return e;
    },
    mn = (e) => e.charAt(0).toUpperCase() + e.slice(1);
  function qm(e) {
    let t = Math.abs(e),
      i = t % 10,
      n = t % 100;
    return (n >= 11 && n <= 19) || i === 0 ? 'many' : i === 1 ? 'one' : 'few';
  }
  var lk = () => {
    let e = {
      string: {
        unit: { one: 'simbolis', few: 'simboliai', many: 'simbolių' },
        verb: {
          smaller: {
            inclusive: 'turi būti ne ilgesnė kaip',
            notInclusive: 'turi būti trumpesnė kaip',
          },
          bigger: {
            inclusive: 'turi būti ne trumpesnė kaip',
            notInclusive: 'turi būti ilgesnė kaip',
          },
        },
      },
      file: {
        unit: { one: 'baitas', few: 'baitai', many: 'baitų' },
        verb: {
          smaller: {
            inclusive: 'turi būti ne didesnis kaip',
            notInclusive: 'turi būti mažesnis kaip',
          },
          bigger: {
            inclusive: 'turi būti ne mažesnis kaip',
            notInclusive: 'turi būti didesnis kaip',
          },
        },
      },
      array: {
        unit: { one: 'elementą', few: 'elementus', many: 'elementų' },
        verb: {
          smaller: {
            inclusive: 'turi turėti ne daugiau kaip',
            notInclusive: 'turi turėti mažiau kaip',
          },
          bigger: {
            inclusive: 'turi turėti ne mažiau kaip',
            notInclusive: 'turi turėti daugiau kaip',
          },
        },
      },
      set: {
        unit: { one: 'elementą', few: 'elementus', many: 'elementų' },
        verb: {
          smaller: {
            inclusive: 'turi turėti ne daugiau kaip',
            notInclusive: 'turi turėti mažiau kaip',
          },
          bigger: {
            inclusive: 'turi turėti ne mažiau kaip',
            notInclusive: 'turi turėti daugiau kaip',
          },
        },
      },
    };
    function t(n, r, o, s) {
      let u = e[n] ?? null;
      return u === null
        ? u
        : {
            unit: u.unit[r],
            verb: u.verb[s][o ? 'inclusive' : 'notInclusive'],
          };
    }
    let i = {
      regex: 'įvestis',
      email: 'el. pašto adresas',
      url: 'URL',
      emoji: 'jaustukas',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO data ir laikas',
      date: 'ISO data',
      time: 'ISO laikas',
      duration: 'ISO trukmė',
      ipv4: 'IPv4 adresas',
      ipv6: 'IPv6 adresas',
      cidrv4: 'IPv4 tinklo prefiksas (CIDR)',
      cidrv6: 'IPv6 tinklo prefiksas (CIDR)',
      base64: 'base64 užkoduota eilutė',
      base64url: 'base64url užkoduota eilutė',
      json_string: 'JSON eilutė',
      e164: 'E.164 numeris',
      jwt: 'JWT',
      template_literal: 'įvestis',
    };
    return (n) => {
      switch (n.code) {
        case 'invalid_type':
          return `Gautas tipas ${ck(n.input)}, o tikėtasi - ${pn(n.expected)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Privalo būti ${I(n.values[0])}`
            : `Privalo būti vienas iš ${_(n.values, '|')} pasirinkimų`;
        case 'too_big': {
          let r = pn(n.origin),
            o = t(
              n.origin,
              qm(Number(n.maximum)),
              n.inclusive ?? !1,
              'smaller',
            );
          if (o?.verb)
            return `${mn(r ?? n.origin ?? 'reikšmė')} ${o.verb} ${n.maximum.toString()} ${o.unit ?? 'elementų'}`;
          let s = n.inclusive ? 'ne didesnis kaip' : 'mažesnis kaip';
          return `${mn(r ?? n.origin ?? 'reikšmė')} turi būti ${s} ${n.maximum.toString()} ${o?.unit}`;
        }
        case 'too_small': {
          let r = pn(n.origin),
            o = t(n.origin, qm(Number(n.minimum)), n.inclusive ?? !1, 'bigger');
          if (o?.verb)
            return `${mn(r ?? n.origin ?? 'reikšmė')} ${o.verb} ${n.minimum.toString()} ${o.unit ?? 'elementų'}`;
          let s = n.inclusive ? 'ne mažesnis kaip' : 'didesnis kaip';
          return `${mn(r ?? n.origin ?? 'reikšmė')} turi būti ${s} ${n.minimum.toString()} ${o?.unit}`;
        }
        case 'invalid_format': {
          let r = n;
          return r.format === 'starts_with'
            ? `Eilutė privalo prasidėti "${r.prefix}"`
            : r.format === 'ends_with'
              ? `Eilutė privalo pasibaigti "${r.suffix}"`
              : r.format === 'includes'
                ? `Eilutė privalo įtraukti "${r.includes}"`
                : r.format === 'regex'
                  ? `Eilutė privalo atitikti ${r.pattern}`
                  : `Neteisingas ${i[r.format] ?? n.format}`;
        }
        case 'not_multiple_of':
          return `Skaičius privalo būti ${n.divisor} kartotinis.`;
        case 'unrecognized_keys':
          return `Neatpažint${n.keys.length > 1 ? 'i' : 'as'} rakt${n.keys.length > 1 ? 'ai' : 'as'}: ${_(n.keys, ', ')}`;
        case 'invalid_key':
          return 'Rastas klaidingas raktas';
        case 'invalid_union':
          return 'Klaidinga įvestis';
        case 'invalid_element': {
          let r = pn(n.origin);
          return `${mn(r ?? n.origin ?? 'reikšmė')} turi klaidingą įvestį`;
        }
        default:
          return 'Klaidinga įvestis';
      }
    };
  };
  function Xm() {
    return { localeError: lk() };
  }
  var dk = () => {
    let e = {
      string: { unit: 'знаци', verb: 'да имаат' },
      file: { unit: 'бајти', verb: 'да имаат' },
      array: { unit: 'ставки', verb: 'да имаат' },
      set: { unit: 'ставки', verb: 'да имаат' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'број';
          case 'object': {
            if (Array.isArray(r)) return 'низа';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'внес',
        email: 'адреса на е-пошта',
        url: 'URL',
        emoji: 'емоџи',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO датум и време',
        date: 'ISO датум',
        time: 'ISO време',
        duration: 'ISO времетраење',
        ipv4: 'IPv4 адреса',
        ipv6: 'IPv6 адреса',
        cidrv4: 'IPv4 опсег',
        cidrv6: 'IPv6 опсег',
        base64: 'base64-енкодирана низа',
        base64url: 'base64url-енкодирана низа',
        json_string: 'JSON низа',
        e164: 'E.164 број',
        jwt: 'JWT',
        template_literal: 'внес',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Грешен внес: се очекува ${r.expected}, примено ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Invalid input: expected ${I(r.values[0])}`
            : `Грешана опција: се очекува една ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Премногу голем: се очекува ${r.origin ?? 'вредноста'} да има ${o}${r.maximum.toString()} ${s.unit ?? 'елементи'}`
            : `Премногу голем: се очекува ${r.origin ?? 'вредноста'} да биде ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Премногу мал: се очекува ${r.origin} да има ${o}${r.minimum.toString()} ${s.unit}`
            : `Премногу мал: се очекува ${r.origin} да биде ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Неважечка низа: мора да започнува со "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Неважечка низа: мора да завршува со "${o.suffix}"`
              : o.format === 'includes'
                ? `Неважечка низа: мора да вклучува "${o.includes}"`
                : o.format === 'regex'
                  ? `Неважечка низа: мора да одгоара на патернот ${o.pattern}`
                  : `Invalid ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Грешен број: мора да биде делив со ${r.divisor}`;
        case 'unrecognized_keys':
          return `${r.keys.length > 1 ? 'Непрепознаени клучеви' : 'Непрепознаен клуч'}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Грешен клуч во ${r.origin}`;
        case 'invalid_union':
          return 'Грешен внес';
        case 'invalid_element':
          return `Грешна вредност во ${r.origin}`;
        default:
          return 'Грешен внес';
      }
    };
  };
  function Hm() {
    return { localeError: dk() };
  }
  var mk = () => {
    let e = {
      string: { unit: 'aksara', verb: 'mempunyai' },
      file: { unit: 'bait', verb: 'mempunyai' },
      array: { unit: 'elemen', verb: 'mempunyai' },
      set: { unit: 'elemen', verb: 'mempunyai' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'nombor';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'input',
        email: 'alamat e-mel',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'tarikh masa ISO',
        date: 'tarikh ISO',
        time: 'masa ISO',
        duration: 'tempoh ISO',
        ipv4: 'alamat IPv4',
        ipv6: 'alamat IPv6',
        cidrv4: 'julat IPv4',
        cidrv6: 'julat IPv6',
        base64: 'string dikodkan base64',
        base64url: 'string dikodkan base64url',
        json_string: 'string JSON',
        e164: 'nombor E.164',
        jwt: 'JWT',
        template_literal: 'input',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Input tidak sah: dijangka ${r.expected}, diterima ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Input tidak sah: dijangka ${I(r.values[0])}`
            : `Pilihan tidak sah: dijangka salah satu daripada ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Terlalu besar: dijangka ${r.origin ?? 'nilai'} ${s.verb} ${o}${r.maximum.toString()} ${s.unit ?? 'elemen'}`
            : `Terlalu besar: dijangka ${r.origin ?? 'nilai'} adalah ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Terlalu kecil: dijangka ${r.origin} ${s.verb} ${o}${r.minimum.toString()} ${s.unit}`
            : `Terlalu kecil: dijangka ${r.origin} adalah ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `String tidak sah: mesti bermula dengan "${o.prefix}"`
            : o.format === 'ends_with'
              ? `String tidak sah: mesti berakhir dengan "${o.suffix}"`
              : o.format === 'includes'
                ? `String tidak sah: mesti mengandungi "${o.includes}"`
                : o.format === 'regex'
                  ? `String tidak sah: mesti sepadan dengan corak ${o.pattern}`
                  : `${n[o.format] ?? r.format} tidak sah`;
        }
        case 'not_multiple_of':
          return `Nombor tidak sah: perlu gandaan ${r.divisor}`;
        case 'unrecognized_keys':
          return `Kunci tidak dikenali: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Kunci tidak sah dalam ${r.origin}`;
        case 'invalid_union':
          return 'Input tidak sah';
        case 'invalid_element':
          return `Nilai tidak sah dalam ${r.origin}`;
        default:
          return 'Input tidak sah';
      }
    };
  };
  function Ym() {
    return { localeError: mk() };
  }
  var pk = () => {
    let e = {
      string: { unit: 'tekens' },
      file: { unit: 'bytes' },
      array: { unit: 'elementen' },
      set: { unit: 'elementen' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'getal';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'invoer',
        email: 'emailadres',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO datum en tijd',
        date: 'ISO datum',
        time: 'ISO tijd',
        duration: 'ISO duur',
        ipv4: 'IPv4-adres',
        ipv6: 'IPv6-adres',
        cidrv4: 'IPv4-bereik',
        cidrv6: 'IPv6-bereik',
        base64: 'base64-gecodeerde tekst',
        base64url: 'base64 URL-gecodeerde tekst',
        json_string: 'JSON string',
        e164: 'E.164-nummer',
        jwt: 'JWT',
        template_literal: 'invoer',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Ongeldige invoer: verwacht ${r.expected}, ontving ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Ongeldige invoer: verwacht ${I(r.values[0])}`
            : `Ongeldige optie: verwacht één van ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Te lang: verwacht dat ${r.origin ?? 'waarde'} ${o}${r.maximum.toString()} ${s.unit ?? 'elementen'} bevat`
            : `Te lang: verwacht dat ${r.origin ?? 'waarde'} ${o}${r.maximum.toString()} is`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Te kort: verwacht dat ${r.origin} ${o}${r.minimum.toString()} ${s.unit} bevat`
            : `Te kort: verwacht dat ${r.origin} ${o}${r.minimum.toString()} is`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Ongeldige tekst: moet met "${o.prefix}" beginnen`
            : o.format === 'ends_with'
              ? `Ongeldige tekst: moet op "${o.suffix}" eindigen`
              : o.format === 'includes'
                ? `Ongeldige tekst: moet "${o.includes}" bevatten`
                : o.format === 'regex'
                  ? `Ongeldige tekst: moet overeenkomen met patroon ${o.pattern}`
                  : `Ongeldig: ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Ongeldig getal: moet een veelvoud van ${r.divisor} zijn`;
        case 'unrecognized_keys':
          return `Onbekende key${r.keys.length > 1 ? 's' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Ongeldige key in ${r.origin}`;
        case 'invalid_union':
          return 'Ongeldige invoer';
        case 'invalid_element':
          return `Ongeldige waarde in ${r.origin}`;
        default:
          return 'Ongeldige invoer';
      }
    };
  };
  function Qm() {
    return { localeError: pk() };
  }
  var fk = () => {
    let e = {
      string: { unit: 'tegn', verb: 'å ha' },
      file: { unit: 'bytes', verb: 'å ha' },
      array: { unit: 'elementer', verb: 'å inneholde' },
      set: { unit: 'elementer', verb: 'å inneholde' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'tall';
          case 'object': {
            if (Array.isArray(r)) return 'liste';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'input',
        email: 'e-postadresse',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO dato- og klokkeslett',
        date: 'ISO-dato',
        time: 'ISO-klokkeslett',
        duration: 'ISO-varighet',
        ipv4: 'IPv4-område',
        ipv6: 'IPv6-område',
        cidrv4: 'IPv4-spekter',
        cidrv6: 'IPv6-spekter',
        base64: 'base64-enkodet streng',
        base64url: 'base64url-enkodet streng',
        json_string: 'JSON-streng',
        e164: 'E.164-nummer',
        jwt: 'JWT',
        template_literal: 'input',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Ugyldig input: forventet ${r.expected}, fikk ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Ugyldig verdi: forventet ${I(r.values[0])}`
            : `Ugyldig valg: forventet en av ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `For stor(t): forventet ${r.origin ?? 'value'} til å ha ${o}${r.maximum.toString()} ${s.unit ?? 'elementer'}`
            : `For stor(t): forventet ${r.origin ?? 'value'} til å ha ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `For lite(n): forventet ${r.origin} til å ha ${o}${r.minimum.toString()} ${s.unit}`
            : `For lite(n): forventet ${r.origin} til å ha ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Ugyldig streng: må starte med "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Ugyldig streng: må ende med "${o.suffix}"`
              : o.format === 'includes'
                ? `Ugyldig streng: må inneholde "${o.includes}"`
                : o.format === 'regex'
                  ? `Ugyldig streng: må matche mønsteret ${o.pattern}`
                  : `Ugyldig ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Ugyldig tall: må være et multiplum av ${r.divisor}`;
        case 'unrecognized_keys':
          return `${r.keys.length > 1 ? 'Ukjente nøkler' : 'Ukjent nøkkel'}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Ugyldig nøkkel i ${r.origin}`;
        case 'invalid_union':
          return 'Ugyldig input';
        case 'invalid_element':
          return `Ugyldig verdi i ${r.origin}`;
        default:
          return 'Ugyldig input';
      }
    };
  };
  function ep() {
    return { localeError: fk() };
  }
  var vk = () => {
    let e = {
      string: { unit: 'harf', verb: 'olmalıdır' },
      file: { unit: 'bayt', verb: 'olmalıdır' },
      array: { unit: 'unsur', verb: 'olmalıdır' },
      set: { unit: 'unsur', verb: 'olmalıdır' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'numara';
          case 'object': {
            if (Array.isArray(r)) return 'saf';
            if (r === null) return 'gayb';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'giren',
        email: 'epostagâh',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO hengâmı',
        date: 'ISO tarihi',
        time: 'ISO zamanı',
        duration: 'ISO müddeti',
        ipv4: 'IPv4 nişânı',
        ipv6: 'IPv6 nişânı',
        cidrv4: 'IPv4 menzili',
        cidrv6: 'IPv6 menzili',
        base64: 'base64-şifreli metin',
        base64url: 'base64url-şifreli metin',
        json_string: 'JSON metin',
        e164: 'E.164 sayısı',
        jwt: 'JWT',
        template_literal: 'giren',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Fâsit giren: umulan ${r.expected}, alınan ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Fâsit giren: umulan ${I(r.values[0])}`
            : `Fâsit tercih: mûteberler ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Fazla büyük: ${r.origin ?? 'value'}, ${o}${r.maximum.toString()} ${s.unit ?? 'elements'} sahip olmalıydı.`
            : `Fazla büyük: ${r.origin ?? 'value'}, ${o}${r.maximum.toString()} olmalıydı.`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Fazla küçük: ${r.origin}, ${o}${r.minimum.toString()} ${s.unit} sahip olmalıydı.`
            : `Fazla küçük: ${r.origin}, ${o}${r.minimum.toString()} olmalıydı.`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Fâsit metin: "${o.prefix}" ile başlamalı.`
            : o.format === 'ends_with'
              ? `Fâsit metin: "${o.suffix}" ile bitmeli.`
              : o.format === 'includes'
                ? `Fâsit metin: "${o.includes}" ihtivâ etmeli.`
                : o.format === 'regex'
                  ? `Fâsit metin: ${o.pattern} nakşına uymalı.`
                  : `Fâsit ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Fâsit sayı: ${r.divisor} katı olmalıydı.`;
        case 'unrecognized_keys':
          return `Tanınmayan anahtar ${r.keys.length > 1 ? 's' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `${r.origin} için tanınmayan anahtar var.`;
        case 'invalid_union':
          return 'Giren tanınamadı.';
        case 'invalid_element':
          return `${r.origin} için tanınmayan kıymet var.`;
        default:
          return 'Kıymet tanınamadı.';
      }
    };
  };
  function tp() {
    return { localeError: vk() };
  }
  var gk = () => {
    let e = {
      string: { unit: 'توکي', verb: 'ولري' },
      file: { unit: 'بایټس', verb: 'ولري' },
      array: { unit: 'توکي', verb: 'ولري' },
      set: { unit: 'توکي', verb: 'ولري' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'عدد';
          case 'object': {
            if (Array.isArray(r)) return 'ارې';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'ورودي',
        email: 'بریښنالیک',
        url: 'یو آر ال',
        emoji: 'ایموجي',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'نیټه او وخت',
        date: 'نېټه',
        time: 'وخت',
        duration: 'موده',
        ipv4: 'د IPv4 پته',
        ipv6: 'د IPv6 پته',
        cidrv4: 'د IPv4 ساحه',
        cidrv6: 'د IPv6 ساحه',
        base64: 'base64-encoded متن',
        base64url: 'base64url-encoded متن',
        json_string: 'JSON متن',
        e164: 'د E.164 شمېره',
        jwt: 'JWT',
        template_literal: 'ورودي',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `ناسم ورودي: باید ${r.expected} وای, مګر ${i(r.input)} ترلاسه شو`;
        case 'invalid_value':
          return r.values.length === 1
            ? `ناسم ورودي: باید ${I(r.values[0])} وای`
            : `ناسم انتخاب: باید یو له ${_(r.values, '|')} څخه وای`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `ډیر لوی: ${r.origin ?? 'ارزښت'} باید ${o}${r.maximum.toString()} ${s.unit ?? 'عنصرونه'} ولري`
            : `ډیر لوی: ${r.origin ?? 'ارزښت'} باید ${o}${r.maximum.toString()} وي`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `ډیر کوچنی: ${r.origin} باید ${o}${r.minimum.toString()} ${s.unit} ولري`
            : `ډیر کوچنی: ${r.origin} باید ${o}${r.minimum.toString()} وي`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `ناسم متن: باید د "${o.prefix}" سره پیل شي`
            : o.format === 'ends_with'
              ? `ناسم متن: باید د "${o.suffix}" سره پای ته ورسيږي`
              : o.format === 'includes'
                ? `ناسم متن: باید "${o.includes}" ولري`
                : o.format === 'regex'
                  ? `ناسم متن: باید د ${o.pattern} سره مطابقت ولري`
                  : `${n[o.format] ?? r.format} ناسم دی`;
        }
        case 'not_multiple_of':
          return `ناسم عدد: باید د ${r.divisor} مضرب وي`;
        case 'unrecognized_keys':
          return `ناسم ${r.keys.length > 1 ? 'کلیډونه' : 'کلیډ'}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `ناسم کلیډ په ${r.origin} کې`;
        case 'invalid_union':
          return 'ناسمه ورودي';
        case 'invalid_element':
          return `ناسم عنصر په ${r.origin} کې`;
        default:
          return 'ناسمه ورودي';
      }
    };
  };
  function np() {
    return { localeError: gk() };
  }
  var hk = () => {
    let e = {
      string: { unit: 'znaków', verb: 'mieć' },
      file: { unit: 'bajtów', verb: 'mieć' },
      array: { unit: 'elementów', verb: 'mieć' },
      set: { unit: 'elementów', verb: 'mieć' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'liczba';
          case 'object': {
            if (Array.isArray(r)) return 'tablica';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'wyrażenie',
        email: 'adres email',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'data i godzina w formacie ISO',
        date: 'data w formacie ISO',
        time: 'godzina w formacie ISO',
        duration: 'czas trwania ISO',
        ipv4: 'adres IPv4',
        ipv6: 'adres IPv6',
        cidrv4: 'zakres IPv4',
        cidrv6: 'zakres IPv6',
        base64: 'ciąg znaków zakodowany w formacie base64',
        base64url: 'ciąg znaków zakodowany w formacie base64url',
        json_string: 'ciąg znaków w formacie JSON',
        e164: 'liczba E.164',
        jwt: 'JWT',
        template_literal: 'wejście',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Nieprawidłowe dane wejściowe: oczekiwano ${r.expected}, otrzymano ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Nieprawidłowe dane wejściowe: oczekiwano ${I(r.values[0])}`
            : `Nieprawidłowa opcja: oczekiwano jednej z wartości ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Za duża wartość: oczekiwano, że ${r.origin ?? 'wartość'} będzie mieć ${o}${r.maximum.toString()} ${s.unit ?? 'elementów'}`
            : `Zbyt duż(y/a/e): oczekiwano, że ${r.origin ?? 'wartość'} będzie wynosić ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Za mała wartość: oczekiwano, że ${r.origin ?? 'wartość'} będzie mieć ${o}${r.minimum.toString()} ${s.unit ?? 'elementów'}`
            : `Zbyt mał(y/a/e): oczekiwano, że ${r.origin ?? 'wartość'} będzie wynosić ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Nieprawidłowy ciąg znaków: musi zaczynać się od "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Nieprawidłowy ciąg znaków: musi kończyć się na "${o.suffix}"`
              : o.format === 'includes'
                ? `Nieprawidłowy ciąg znaków: musi zawierać "${o.includes}"`
                : o.format === 'regex'
                  ? `Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi ${o.pattern}`
                  : `Nieprawidłow(y/a/e) ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Nieprawidłowa liczba: musi być wielokrotnością ${r.divisor}`;
        case 'unrecognized_keys':
          return `Nierozpoznane klucze${r.keys.length > 1 ? 's' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Nieprawidłowy klucz w ${r.origin}`;
        case 'invalid_union':
          return 'Nieprawidłowe dane wejściowe';
        case 'invalid_element':
          return `Nieprawidłowa wartość w ${r.origin}`;
        default:
          return 'Nieprawidłowe dane wejściowe';
      }
    };
  };
  function rp() {
    return { localeError: hk() };
  }
  var bk = () => {
    let e = {
      string: { unit: 'caracteres', verb: 'ter' },
      file: { unit: 'bytes', verb: 'ter' },
      array: { unit: 'itens', verb: 'ter' },
      set: { unit: 'itens', verb: 'ter' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'número';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'nulo';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'padrão',
        email: 'endereço de e-mail',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'data e hora ISO',
        date: 'data ISO',
        time: 'hora ISO',
        duration: 'duração ISO',
        ipv4: 'endereço IPv4',
        ipv6: 'endereço IPv6',
        cidrv4: 'faixa de IPv4',
        cidrv6: 'faixa de IPv6',
        base64: 'texto codificado em base64',
        base64url: 'URL codificada em base64',
        json_string: 'texto JSON',
        e164: 'número E.164',
        jwt: 'JWT',
        template_literal: 'entrada',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Tipo inválido: esperado ${r.expected}, recebido ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Entrada inválida: esperado ${I(r.values[0])}`
            : `Opção inválida: esperada uma das ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Muito grande: esperado que ${r.origin ?? 'valor'} tivesse ${o}${r.maximum.toString()} ${s.unit ?? 'elementos'}`
            : `Muito grande: esperado que ${r.origin ?? 'valor'} fosse ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Muito pequeno: esperado que ${r.origin} tivesse ${o}${r.minimum.toString()} ${s.unit}`
            : `Muito pequeno: esperado que ${r.origin} fosse ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Texto inválido: deve começar com "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Texto inválido: deve terminar com "${o.suffix}"`
              : o.format === 'includes'
                ? `Texto inválido: deve incluir "${o.includes}"`
                : o.format === 'regex'
                  ? `Texto inválido: deve corresponder ao padrão ${o.pattern}`
                  : `${n[o.format] ?? r.format} inválido`;
        }
        case 'not_multiple_of':
          return `Número inválido: deve ser múltiplo de ${r.divisor}`;
        case 'unrecognized_keys':
          return `Chave${r.keys.length > 1 ? 's' : ''} desconhecida${r.keys.length > 1 ? 's' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Chave inválida em ${r.origin}`;
        case 'invalid_union':
          return 'Entrada inválida';
        case 'invalid_element':
          return `Valor inválido em ${r.origin}`;
        default:
          return 'Campo inválido';
      }
    };
  };
  function ip() {
    return { localeError: bk() };
  }
  function op(e, t, i, n) {
    let r = Math.abs(e),
      o = r % 10,
      s = r % 100;
    return s >= 11 && s <= 19 ? n : o === 1 ? t : o >= 2 && o <= 4 ? i : n;
  }
  var yk = () => {
    let e = {
      string: {
        unit: { one: 'символ', few: 'символа', many: 'символов' },
        verb: 'иметь',
      },
      file: {
        unit: { one: 'байт', few: 'байта', many: 'байт' },
        verb: 'иметь',
      },
      array: {
        unit: { one: 'элемент', few: 'элемента', many: 'элементов' },
        verb: 'иметь',
      },
      set: {
        unit: { one: 'элемент', few: 'элемента', many: 'элементов' },
        verb: 'иметь',
      },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'число';
          case 'object': {
            if (Array.isArray(r)) return 'массив';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'ввод',
        email: 'email адрес',
        url: 'URL',
        emoji: 'эмодзи',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO дата и время',
        date: 'ISO дата',
        time: 'ISO время',
        duration: 'ISO длительность',
        ipv4: 'IPv4 адрес',
        ipv6: 'IPv6 адрес',
        cidrv4: 'IPv4 диапазон',
        cidrv6: 'IPv6 диапазон',
        base64: 'строка в формате base64',
        base64url: 'строка в формате base64url',
        json_string: 'JSON строка',
        e164: 'номер E.164',
        jwt: 'JWT',
        template_literal: 'ввод',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Неверный ввод: ожидалось ${r.expected}, получено ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Неверный ввод: ожидалось ${I(r.values[0])}`
            : `Неверный вариант: ожидалось одно из ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          if (s) {
            let u = Number(r.maximum),
              a = op(u, s.unit.one, s.unit.few, s.unit.many);
            return `Слишком большое значение: ожидалось, что ${r.origin ?? 'значение'} будет иметь ${o}${r.maximum.toString()} ${a}`;
          }
          return `Слишком большое значение: ожидалось, что ${r.origin ?? 'значение'} будет ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          if (s) {
            let u = Number(r.minimum),
              a = op(u, s.unit.one, s.unit.few, s.unit.many);
            return `Слишком маленькое значение: ожидалось, что ${r.origin} будет иметь ${o}${r.minimum.toString()} ${a}`;
          }
          return `Слишком маленькое значение: ожидалось, что ${r.origin} будет ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Неверная строка: должна начинаться с "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Неверная строка: должна заканчиваться на "${o.suffix}"`
              : o.format === 'includes'
                ? `Неверная строка: должна содержать "${o.includes}"`
                : o.format === 'regex'
                  ? `Неверная строка: должна соответствовать шаблону ${o.pattern}`
                  : `Неверный ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Неверное число: должно быть кратным ${r.divisor}`;
        case 'unrecognized_keys':
          return `Нераспознанн${r.keys.length > 1 ? 'ые' : 'ый'} ключ${r.keys.length > 1 ? 'и' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Неверный ключ в ${r.origin}`;
        case 'invalid_union':
          return 'Неверные входные данные';
        case 'invalid_element':
          return `Неверное значение в ${r.origin}`;
        default:
          return 'Неверные входные данные';
      }
    };
  };
  function ap() {
    return { localeError: yk() };
  }
  var $k = () => {
    let e = {
      string: { unit: 'znakov', verb: 'imeti' },
      file: { unit: 'bajtov', verb: 'imeti' },
      array: { unit: 'elementov', verb: 'imeti' },
      set: { unit: 'elementov', verb: 'imeti' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'število';
          case 'object': {
            if (Array.isArray(r)) return 'tabela';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'vnos',
        email: 'e-poštni naslov',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO datum in čas',
        date: 'ISO datum',
        time: 'ISO čas',
        duration: 'ISO trajanje',
        ipv4: 'IPv4 naslov',
        ipv6: 'IPv6 naslov',
        cidrv4: 'obseg IPv4',
        cidrv6: 'obseg IPv6',
        base64: 'base64 kodiran niz',
        base64url: 'base64url kodiran niz',
        json_string: 'JSON niz',
        e164: 'E.164 številka',
        jwt: 'JWT',
        template_literal: 'vnos',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Neveljaven vnos: pričakovano ${r.expected}, prejeto ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Neveljaven vnos: pričakovano ${I(r.values[0])}`
            : `Neveljavna možnost: pričakovano eno izmed ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Preveliko: pričakovano, da bo ${r.origin ?? 'vrednost'} imelo ${o}${r.maximum.toString()} ${s.unit ?? 'elementov'}`
            : `Preveliko: pričakovano, da bo ${r.origin ?? 'vrednost'} ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Premajhno: pričakovano, da bo ${r.origin} imelo ${o}${r.minimum.toString()} ${s.unit}`
            : `Premajhno: pričakovano, da bo ${r.origin} ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Neveljaven niz: mora se začeti z "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Neveljaven niz: mora se končati z "${o.suffix}"`
              : o.format === 'includes'
                ? `Neveljaven niz: mora vsebovati "${o.includes}"`
                : o.format === 'regex'
                  ? `Neveljaven niz: mora ustrezati vzorcu ${o.pattern}`
                  : `Neveljaven ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Neveljavno število: mora biti večkratnik ${r.divisor}`;
        case 'unrecognized_keys':
          return `Neprepoznan${r.keys.length > 1 ? 'i ključi' : ' ključ'}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Neveljaven ključ v ${r.origin}`;
        case 'invalid_union':
          return 'Neveljaven vnos';
        case 'invalid_element':
          return `Neveljavna vrednost v ${r.origin}`;
        default:
          return 'Neveljaven vnos';
      }
    };
  };
  function sp() {
    return { localeError: $k() };
  }
  var _k = () => {
    let e = {
      string: { unit: 'tecken', verb: 'att ha' },
      file: { unit: 'bytes', verb: 'att ha' },
      array: { unit: 'objekt', verb: 'att innehålla' },
      set: { unit: 'objekt', verb: 'att innehålla' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'antal';
          case 'object': {
            if (Array.isArray(r)) return 'lista';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'reguljärt uttryck',
        email: 'e-postadress',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO-datum och tid',
        date: 'ISO-datum',
        time: 'ISO-tid',
        duration: 'ISO-varaktighet',
        ipv4: 'IPv4-intervall',
        ipv6: 'IPv6-intervall',
        cidrv4: 'IPv4-spektrum',
        cidrv6: 'IPv6-spektrum',
        base64: 'base64-kodad sträng',
        base64url: 'base64url-kodad sträng',
        json_string: 'JSON-sträng',
        e164: 'E.164-nummer',
        jwt: 'JWT',
        template_literal: 'mall-literal',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Ogiltig inmatning: förväntat ${r.expected}, fick ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Ogiltig inmatning: förväntat ${I(r.values[0])}`
            : `Ogiltigt val: förväntade en av ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `För stor(t): förväntade ${r.origin ?? 'värdet'} att ha ${o}${r.maximum.toString()} ${s.unit ?? 'element'}`
            : `För stor(t): förväntat ${r.origin ?? 'värdet'} att ha ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `För lite(t): förväntade ${r.origin ?? 'värdet'} att ha ${o}${r.minimum.toString()} ${s.unit}`
            : `För lite(t): förväntade ${r.origin ?? 'värdet'} att ha ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Ogiltig sträng: måste börja med "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Ogiltig sträng: måste sluta med "${o.suffix}"`
              : o.format === 'includes'
                ? `Ogiltig sträng: måste innehålla "${o.includes}"`
                : o.format === 'regex'
                  ? `Ogiltig sträng: måste matcha mönstret "${o.pattern}"`
                  : `Ogiltig(t) ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Ogiltigt tal: måste vara en multipel av ${r.divisor}`;
        case 'unrecognized_keys':
          return `${r.keys.length > 1 ? 'Okända nycklar' : 'Okänd nyckel'}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Ogiltig nyckel i ${r.origin ?? 'värdet'}`;
        case 'invalid_union':
          return 'Ogiltig input';
        case 'invalid_element':
          return `Ogiltigt värde i ${r.origin ?? 'värdet'}`;
        default:
          return 'Ogiltig input';
      }
    };
  };
  function up() {
    return { localeError: _k() };
  }
  var kk = () => {
    let e = {
      string: { unit: 'எழுத்துக்கள்', verb: 'கொண்டிருக்க வேண்டும்' },
      file: { unit: 'பைட்டுகள்', verb: 'கொண்டிருக்க வேண்டும்' },
      array: { unit: 'உறுப்புகள்', verb: 'கொண்டிருக்க வேண்டும்' },
      set: { unit: 'உறுப்புகள்', verb: 'கொண்டிருக்க வேண்டும்' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'எண் அல்லாதது' : 'எண்';
          case 'object': {
            if (Array.isArray(r)) return 'அணி';
            if (r === null) return 'வெறுமை';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'உள்ளீடு',
        email: 'மின்னஞ்சல் முகவரி',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO தேதி நேரம்',
        date: 'ISO தேதி',
        time: 'ISO நேரம்',
        duration: 'ISO கால அளவு',
        ipv4: 'IPv4 முகவரி',
        ipv6: 'IPv6 முகவரி',
        cidrv4: 'IPv4 வரம்பு',
        cidrv6: 'IPv6 வரம்பு',
        base64: 'base64-encoded சரம்',
        base64url: 'base64url-encoded சரம்',
        json_string: 'JSON சரம்',
        e164: 'E.164 எண்',
        jwt: 'JWT',
        template_literal: 'input',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${r.expected}, பெறப்பட்டது ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${I(r.values[0])}`
            : `தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${_(r.values, '|')} இல் ஒன்று`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${r.origin ?? 'மதிப்பு'} ${o}${r.maximum.toString()} ${s.unit ?? 'உறுப்புகள்'} ஆக இருக்க வேண்டும்`
            : `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${r.origin ?? 'மதிப்பு'} ${o}${r.maximum.toString()} ஆக இருக்க வேண்டும்`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${r.origin} ${o}${r.minimum.toString()} ${s.unit} ஆக இருக்க வேண்டும்`
            : `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${r.origin} ${o}${r.minimum.toString()} ஆக இருக்க வேண்டும்`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `தவறான சரம்: "${o.prefix}" இல் தொடங்க வேண்டும்`
            : o.format === 'ends_with'
              ? `தவறான சரம்: "${o.suffix}" இல் முடிவடைய வேண்டும்`
              : o.format === 'includes'
                ? `தவறான சரம்: "${o.includes}" ஐ உள்ளடக்க வேண்டும்`
                : o.format === 'regex'
                  ? `தவறான சரம்: ${o.pattern} முறைபாட்டுடன் பொருந்த வேண்டும்`
                  : `தவறான ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `தவறான எண்: ${r.divisor} இன் பலமாக இருக்க வேண்டும்`;
        case 'unrecognized_keys':
          return `அடையாளம் தெரியாத விசை${r.keys.length > 1 ? 'கள்' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `${r.origin} இல் தவறான விசை`;
        case 'invalid_union':
          return 'தவறான உள்ளீடு';
        case 'invalid_element':
          return `${r.origin} இல் தவறான மதிப்பு`;
        default:
          return 'தவறான உள்ளீடு';
      }
    };
  };
  function cp() {
    return { localeError: kk() };
  }
  var xk = () => {
    let e = {
      string: { unit: 'ตัวอักษร', verb: 'ควรมี' },
      file: { unit: 'ไบต์', verb: 'ควรมี' },
      array: { unit: 'รายการ', verb: 'ควรมี' },
      set: { unit: 'รายการ', verb: 'ควรมี' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'ไม่ใช่ตัวเลข (NaN)' : 'ตัวเลข';
          case 'object': {
            if (Array.isArray(r)) return 'อาร์เรย์ (Array)';
            if (r === null) return 'ไม่มีค่า (null)';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'ข้อมูลที่ป้อน',
        email: 'ที่อยู่อีเมล',
        url: 'URL',
        emoji: 'อิโมจิ',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'วันที่เวลาแบบ ISO',
        date: 'วันที่แบบ ISO',
        time: 'เวลาแบบ ISO',
        duration: 'ช่วงเวลาแบบ ISO',
        ipv4: 'ที่อยู่ IPv4',
        ipv6: 'ที่อยู่ IPv6',
        cidrv4: 'ช่วง IP แบบ IPv4',
        cidrv6: 'ช่วง IP แบบ IPv6',
        base64: 'ข้อความแบบ Base64',
        base64url: 'ข้อความแบบ Base64 สำหรับ URL',
        json_string: 'ข้อความแบบ JSON',
        e164: 'เบอร์โทรศัพท์ระหว่างประเทศ (E.164)',
        jwt: 'โทเคน JWT',
        template_literal: 'ข้อมูลที่ป้อน',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${r.expected} แต่ได้รับ ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `ค่าไม่ถูกต้อง: ควรเป็น ${I(r.values[0])}`
            : `ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? 'ไม่เกิน' : 'น้อยกว่า',
            s = t(r.origin);
          return s
            ? `เกินกำหนด: ${r.origin ?? 'ค่า'} ควรมี${o} ${r.maximum.toString()} ${s.unit ?? 'รายการ'}`
            : `เกินกำหนด: ${r.origin ?? 'ค่า'} ควรมี${o} ${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? 'อย่างน้อย' : 'มากกว่า',
            s = t(r.origin);
          return s
            ? `น้อยกว่ากำหนด: ${r.origin} ควรมี${o} ${r.minimum.toString()} ${s.unit}`
            : `น้อยกว่ากำหนด: ${r.origin} ควรมี${o} ${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${o.prefix}"`
            : o.format === 'ends_with'
              ? `รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${o.suffix}"`
              : o.format === 'includes'
                ? `รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${o.includes}" อยู่ในข้อความ`
                : o.format === 'regex'
                  ? `รูปแบบไม่ถูกต้อง: ต้องตรงกับรูปแบบที่กำหนด ${o.pattern}`
                  : `รูปแบบไม่ถูกต้อง: ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `ตัวเลขไม่ถูกต้อง: ต้องเป็นจำนวนที่หารด้วย ${r.divisor} ได้ลงตัว`;
        case 'unrecognized_keys':
          return `พบคีย์ที่ไม่รู้จัก: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `คีย์ไม่ถูกต้องใน ${r.origin}`;
        case 'invalid_union':
          return 'ข้อมูลไม่ถูกต้อง: ไม่ตรงกับรูปแบบยูเนียนที่กำหนดไว้';
        case 'invalid_element':
          return `ข้อมูลไม่ถูกต้องใน ${r.origin}`;
        default:
          return 'ข้อมูลไม่ถูกต้อง';
      }
    };
  };
  function lp() {
    return { localeError: xk() };
  }
  var wk = (e) => {
      let t = typeof e;
      switch (t) {
        case 'number':
          return Number.isNaN(e) ? 'NaN' : 'number';
        case 'object': {
          if (Array.isArray(e)) return 'array';
          if (e === null) return 'null';
          if (Object.getPrototypeOf(e) !== Object.prototype && e.constructor)
            return e.constructor.name;
        }
      }
      return t;
    },
    Sk = () => {
      let e = {
        string: { unit: 'karakter', verb: 'olmalı' },
        file: { unit: 'bayt', verb: 'olmalı' },
        array: { unit: 'öğe', verb: 'olmalı' },
        set: { unit: 'öğe', verb: 'olmalı' },
      };
      function t(n) {
        return e[n] ?? null;
      }
      let i = {
        regex: 'girdi',
        email: 'e-posta adresi',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO tarih ve saat',
        date: 'ISO tarih',
        time: 'ISO saat',
        duration: 'ISO süre',
        ipv4: 'IPv4 adresi',
        ipv6: 'IPv6 adresi',
        cidrv4: 'IPv4 aralığı',
        cidrv6: 'IPv6 aralığı',
        base64: 'base64 ile şifrelenmiş metin',
        base64url: 'base64url ile şifrelenmiş metin',
        json_string: 'JSON dizesi',
        e164: 'E.164 sayısı',
        jwt: 'JWT',
        template_literal: 'Şablon dizesi',
      };
      return (n) => {
        switch (n.code) {
          case 'invalid_type':
            return `Geçersiz değer: beklenen ${n.expected}, alınan ${wk(n.input)}`;
          case 'invalid_value':
            return n.values.length === 1
              ? `Geçersiz değer: beklenen ${I(n.values[0])}`
              : `Geçersiz seçenek: aşağıdakilerden biri olmalı: ${_(n.values, '|')}`;
          case 'too_big': {
            let r = n.inclusive ? '<=' : '<',
              o = t(n.origin);
            return o
              ? `Çok büyük: beklenen ${n.origin ?? 'değer'} ${r}${n.maximum.toString()} ${o.unit ?? 'öğe'}`
              : `Çok büyük: beklenen ${n.origin ?? 'değer'} ${r}${n.maximum.toString()}`;
          }
          case 'too_small': {
            let r = n.inclusive ? '>=' : '>',
              o = t(n.origin);
            return o
              ? `Çok küçük: beklenen ${n.origin} ${r}${n.minimum.toString()} ${o.unit}`
              : `Çok küçük: beklenen ${n.origin} ${r}${n.minimum.toString()}`;
          }
          case 'invalid_format': {
            let r = n;
            return r.format === 'starts_with'
              ? `Geçersiz metin: "${r.prefix}" ile başlamalı`
              : r.format === 'ends_with'
                ? `Geçersiz metin: "${r.suffix}" ile bitmeli`
                : r.format === 'includes'
                  ? `Geçersiz metin: "${r.includes}" içermeli`
                  : r.format === 'regex'
                    ? `Geçersiz metin: ${r.pattern} desenine uymalı`
                    : `Geçersiz ${i[r.format] ?? n.format}`;
          }
          case 'not_multiple_of':
            return `Geçersiz sayı: ${n.divisor} ile tam bölünebilmeli`;
          case 'unrecognized_keys':
            return `Tanınmayan anahtar${n.keys.length > 1 ? 'lar' : ''}: ${_(n.keys, ', ')}`;
          case 'invalid_key':
            return `${n.origin} içinde geçersiz anahtar`;
          case 'invalid_union':
            return 'Geçersiz değer';
          case 'invalid_element':
            return `${n.origin} içinde geçersiz değer`;
          default:
            return 'Geçersiz değer';
        }
      };
    };
  function dp() {
    return { localeError: Sk() };
  }
  var Ik = () => {
    let e = {
      string: { unit: 'символів', verb: 'матиме' },
      file: { unit: 'байтів', verb: 'матиме' },
      array: { unit: 'елементів', verb: 'матиме' },
      set: { unit: 'елементів', verb: 'матиме' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'число';
          case 'object': {
            if (Array.isArray(r)) return 'масив';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'вхідні дані',
        email: 'адреса електронної пошти',
        url: 'URL',
        emoji: 'емодзі',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'дата та час ISO',
        date: 'дата ISO',
        time: 'час ISO',
        duration: 'тривалість ISO',
        ipv4: 'адреса IPv4',
        ipv6: 'адреса IPv6',
        cidrv4: 'діапазон IPv4',
        cidrv6: 'діапазон IPv6',
        base64: 'рядок у кодуванні base64',
        base64url: 'рядок у кодуванні base64url',
        json_string: 'рядок JSON',
        e164: 'номер E.164',
        jwt: 'JWT',
        template_literal: 'вхідні дані',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Неправильні вхідні дані: очікується ${r.expected}, отримано ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Неправильні вхідні дані: очікується ${I(r.values[0])}`
            : `Неправильна опція: очікується одне з ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Занадто велике: очікується, що ${r.origin ?? 'значення'} ${s.verb} ${o}${r.maximum.toString()} ${s.unit ?? 'елементів'}`
            : `Занадто велике: очікується, що ${r.origin ?? 'значення'} буде ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Занадто мале: очікується, що ${r.origin} ${s.verb} ${o}${r.minimum.toString()} ${s.unit}`
            : `Занадто мале: очікується, що ${r.origin} буде ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Неправильний рядок: повинен починатися з "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Неправильний рядок: повинен закінчуватися на "${o.suffix}"`
              : o.format === 'includes'
                ? `Неправильний рядок: повинен містити "${o.includes}"`
                : o.format === 'regex'
                  ? `Неправильний рядок: повинен відповідати шаблону ${o.pattern}`
                  : `Неправильний ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Неправильне число: повинно бути кратним ${r.divisor}`;
        case 'unrecognized_keys':
          return `Нерозпізнаний ключ${r.keys.length > 1 ? 'і' : ''}: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Неправильний ключ у ${r.origin}`;
        case 'invalid_union':
          return 'Неправильні вхідні дані';
        case 'invalid_element':
          return `Неправильне значення у ${r.origin}`;
        default:
          return 'Неправильні вхідні дані';
      }
    };
  };
  function Rr() {
    return { localeError: Ik() };
  }
  function mp() {
    return Rr();
  }
  var zk = () => {
    let e = {
      string: { unit: 'حروف', verb: 'ہونا' },
      file: { unit: 'بائٹس', verb: 'ہونا' },
      array: { unit: 'آئٹمز', verb: 'ہونا' },
      set: { unit: 'آئٹمز', verb: 'ہونا' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'نمبر';
          case 'object': {
            if (Array.isArray(r)) return 'آرے';
            if (r === null) return 'نل';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'ان پٹ',
        email: 'ای میل ایڈریس',
        url: 'یو آر ایل',
        emoji: 'ایموجی',
        uuid: 'یو یو آئی ڈی',
        uuidv4: 'یو یو آئی ڈی وی 4',
        uuidv6: 'یو یو آئی ڈی وی 6',
        nanoid: 'نینو آئی ڈی',
        guid: 'جی یو آئی ڈی',
        cuid: 'سی یو آئی ڈی',
        cuid2: 'سی یو آئی ڈی 2',
        ulid: 'یو ایل آئی ڈی',
        xid: 'ایکس آئی ڈی',
        ksuid: 'کے ایس یو آئی ڈی',
        datetime: 'آئی ایس او ڈیٹ ٹائم',
        date: 'آئی ایس او تاریخ',
        time: 'آئی ایس او وقت',
        duration: 'آئی ایس او مدت',
        ipv4: 'آئی پی وی 4 ایڈریس',
        ipv6: 'آئی پی وی 6 ایڈریس',
        cidrv4: 'آئی پی وی 4 رینج',
        cidrv6: 'آئی پی وی 6 رینج',
        base64: 'بیس 64 ان کوڈڈ سٹرنگ',
        base64url: 'بیس 64 یو آر ایل ان کوڈڈ سٹرنگ',
        json_string: 'جے ایس او این سٹرنگ',
        e164: 'ای 164 نمبر',
        jwt: 'جے ڈبلیو ٹی',
        template_literal: 'ان پٹ',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `غلط ان پٹ: ${r.expected} متوقع تھا، ${i(r.input)} موصول ہوا`;
        case 'invalid_value':
          return r.values.length === 1
            ? `غلط ان پٹ: ${I(r.values[0])} متوقع تھا`
            : `غلط آپشن: ${_(r.values, '|')} میں سے ایک متوقع تھا`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `بہت بڑا: ${r.origin ?? 'ویلیو'} کے ${o}${r.maximum.toString()} ${s.unit ?? 'عناصر'} ہونے متوقع تھے`
            : `بہت بڑا: ${r.origin ?? 'ویلیو'} کا ${o}${r.maximum.toString()} ہونا متوقع تھا`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `بہت چھوٹا: ${r.origin} کے ${o}${r.minimum.toString()} ${s.unit} ہونے متوقع تھے`
            : `بہت چھوٹا: ${r.origin} کا ${o}${r.minimum.toString()} ہونا متوقع تھا`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `غلط سٹرنگ: "${o.prefix}" سے شروع ہونا چاہیے`
            : o.format === 'ends_with'
              ? `غلط سٹرنگ: "${o.suffix}" پر ختم ہونا چاہیے`
              : o.format === 'includes'
                ? `غلط سٹرنگ: "${o.includes}" شامل ہونا چاہیے`
                : o.format === 'regex'
                  ? `غلط سٹرنگ: پیٹرن ${o.pattern} سے میچ ہونا چاہیے`
                  : `غلط ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `غلط نمبر: ${r.divisor} کا مضاعف ہونا چاہیے`;
        case 'unrecognized_keys':
          return `غیر تسلیم شدہ کی${r.keys.length > 1 ? 'ز' : ''}: ${_(r.keys, '، ')}`;
        case 'invalid_key':
          return `${r.origin} میں غلط کی`;
        case 'invalid_union':
          return 'غلط ان پٹ';
        case 'invalid_element':
          return `${r.origin} میں غلط ویلیو`;
        default:
          return 'غلط ان پٹ';
      }
    };
  };
  function pp() {
    return { localeError: zk() };
  }
  var jk = () => {
    let e = {
      string: { unit: 'ký tự', verb: 'có' },
      file: { unit: 'byte', verb: 'có' },
      array: { unit: 'phần tử', verb: 'có' },
      set: { unit: 'phần tử', verb: 'có' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'số';
          case 'object': {
            if (Array.isArray(r)) return 'mảng';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'đầu vào',
        email: 'địa chỉ email',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ngày giờ ISO',
        date: 'ngày ISO',
        time: 'giờ ISO',
        duration: 'khoảng thời gian ISO',
        ipv4: 'địa chỉ IPv4',
        ipv6: 'địa chỉ IPv6',
        cidrv4: 'dải IPv4',
        cidrv6: 'dải IPv6',
        base64: 'chuỗi mã hóa base64',
        base64url: 'chuỗi mã hóa base64url',
        json_string: 'chuỗi JSON',
        e164: 'số E.164',
        jwt: 'JWT',
        template_literal: 'đầu vào',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Đầu vào không hợp lệ: mong đợi ${r.expected}, nhận được ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Đầu vào không hợp lệ: mong đợi ${I(r.values[0])}`
            : `Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Quá lớn: mong đợi ${r.origin ?? 'giá trị'} ${s.verb} ${o}${r.maximum.toString()} ${s.unit ?? 'phần tử'}`
            : `Quá lớn: mong đợi ${r.origin ?? 'giá trị'} ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Quá nhỏ: mong đợi ${r.origin} ${s.verb} ${o}${r.minimum.toString()} ${s.unit}`
            : `Quá nhỏ: mong đợi ${r.origin} ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Chuỗi không hợp lệ: phải bắt đầu bằng "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Chuỗi không hợp lệ: phải kết thúc bằng "${o.suffix}"`
              : o.format === 'includes'
                ? `Chuỗi không hợp lệ: phải bao gồm "${o.includes}"`
                : o.format === 'regex'
                  ? `Chuỗi không hợp lệ: phải khớp với mẫu ${o.pattern}`
                  : `${n[o.format] ?? r.format} không hợp lệ`;
        }
        case 'not_multiple_of':
          return `Số không hợp lệ: phải là bội số của ${r.divisor}`;
        case 'unrecognized_keys':
          return `Khóa không được nhận dạng: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Khóa không hợp lệ trong ${r.origin}`;
        case 'invalid_union':
          return 'Đầu vào không hợp lệ';
        case 'invalid_element':
          return `Giá trị không hợp lệ trong ${r.origin}`;
        default:
          return 'Đầu vào không hợp lệ';
      }
    };
  };
  function fp() {
    return { localeError: jk() };
  }
  var Ok = () => {
    let e = {
      string: { unit: '字符', verb: '包含' },
      file: { unit: '字节', verb: '包含' },
      array: { unit: '项', verb: '包含' },
      set: { unit: '项', verb: '包含' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? '非数字(NaN)' : '数字';
          case 'object': {
            if (Array.isArray(r)) return '数组';
            if (r === null) return '空值(null)';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: '输入',
        email: '电子邮件',
        url: 'URL',
        emoji: '表情符号',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO日期时间',
        date: 'ISO日期',
        time: 'ISO时间',
        duration: 'ISO时长',
        ipv4: 'IPv4地址',
        ipv6: 'IPv6地址',
        cidrv4: 'IPv4网段',
        cidrv6: 'IPv6网段',
        base64: 'base64编码字符串',
        base64url: 'base64url编码字符串',
        json_string: 'JSON字符串',
        e164: 'E.164号码',
        jwt: 'JWT',
        template_literal: '输入',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `无效输入：期望 ${r.expected}，实际接收 ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `无效输入：期望 ${I(r.values[0])}`
            : `无效选项：期望以下之一 ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `数值过大：期望 ${r.origin ?? '值'} ${o}${r.maximum.toString()} ${s.unit ?? '个元素'}`
            : `数值过大：期望 ${r.origin ?? '值'} ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `数值过小：期望 ${r.origin} ${o}${r.minimum.toString()} ${s.unit}`
            : `数值过小：期望 ${r.origin} ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `无效字符串：必须以 "${o.prefix}" 开头`
            : o.format === 'ends_with'
              ? `无效字符串：必须以 "${o.suffix}" 结尾`
              : o.format === 'includes'
                ? `无效字符串：必须包含 "${o.includes}"`
                : o.format === 'regex'
                  ? `无效字符串：必须满足正则表达式 ${o.pattern}`
                  : `无效${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `无效数字：必须是 ${r.divisor} 的倍数`;
        case 'unrecognized_keys':
          return `出现未知的键(key): ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `${r.origin} 中的键(key)无效`;
        case 'invalid_union':
          return '无效输入';
        case 'invalid_element':
          return `${r.origin} 中包含无效值(value)`;
        default:
          return '无效输入';
      }
    };
  };
  function vp() {
    return { localeError: Ok() };
  }
  var Uk = () => {
    let e = {
      string: { unit: '字元', verb: '擁有' },
      file: { unit: '位元組', verb: '擁有' },
      array: { unit: '項目', verb: '擁有' },
      set: { unit: '項目', verb: '擁有' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'number';
          case 'object': {
            if (Array.isArray(r)) return 'array';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: '輸入',
        email: '郵件地址',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'ISO 日期時間',
        date: 'ISO 日期',
        time: 'ISO 時間',
        duration: 'ISO 期間',
        ipv4: 'IPv4 位址',
        ipv6: 'IPv6 位址',
        cidrv4: 'IPv4 範圍',
        cidrv6: 'IPv6 範圍',
        base64: 'base64 編碼字串',
        base64url: 'base64url 編碼字串',
        json_string: 'JSON 字串',
        e164: 'E.164 數值',
        jwt: 'JWT',
        template_literal: '輸入',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `無效的輸入值：預期為 ${r.expected}，但收到 ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `無效的輸入值：預期為 ${I(r.values[0])}`
            : `無效的選項：預期為以下其中之一 ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `數值過大：預期 ${r.origin ?? '值'} 應為 ${o}${r.maximum.toString()} ${s.unit ?? '個元素'}`
            : `數值過大：預期 ${r.origin ?? '值'} 應為 ${o}${r.maximum.toString()}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `數值過小：預期 ${r.origin} 應為 ${o}${r.minimum.toString()} ${s.unit}`
            : `數值過小：預期 ${r.origin} 應為 ${o}${r.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `無效的字串：必須以 "${o.prefix}" 開頭`
            : o.format === 'ends_with'
              ? `無效的字串：必須以 "${o.suffix}" 結尾`
              : o.format === 'includes'
                ? `無效的字串：必須包含 "${o.includes}"`
                : o.format === 'regex'
                  ? `無效的字串：必須符合格式 ${o.pattern}`
                  : `無效的 ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `無效的數字：必須為 ${r.divisor} 的倍數`;
        case 'unrecognized_keys':
          return `無法識別的鍵值${r.keys.length > 1 ? '們' : ''}：${_(r.keys, '、')}`;
        case 'invalid_key':
          return `${r.origin} 中有無效的鍵值`;
        case 'invalid_union':
          return '無效的輸入值';
        case 'invalid_element':
          return `${r.origin} 中有無效的值`;
        default:
          return '無效的輸入值';
      }
    };
  };
  function gp() {
    return { localeError: Uk() };
  }
  var Pk = () => {
    let e = {
      string: { unit: 'àmi', verb: 'ní' },
      file: { unit: 'bytes', verb: 'ní' },
      array: { unit: 'nkan', verb: 'ní' },
      set: { unit: 'nkan', verb: 'ní' },
    };
    function t(r) {
      return e[r] ?? null;
    }
    let i = (r) => {
        let o = typeof r;
        switch (o) {
          case 'number':
            return Number.isNaN(r) ? 'NaN' : 'nọ́mbà';
          case 'object': {
            if (Array.isArray(r)) return 'akopọ';
            if (r === null) return 'null';
            if (Object.getPrototypeOf(r) !== Object.prototype && r.constructor)
              return r.constructor.name;
          }
        }
        return o;
      },
      n = {
        regex: 'ẹ̀rọ ìbáwọlé',
        email: 'àdírẹ́sì ìmẹ́lì',
        url: 'URL',
        emoji: 'emoji',
        uuid: 'UUID',
        uuidv4: 'UUIDv4',
        uuidv6: 'UUIDv6',
        nanoid: 'nanoid',
        guid: 'GUID',
        cuid: 'cuid',
        cuid2: 'cuid2',
        ulid: 'ULID',
        xid: 'XID',
        ksuid: 'KSUID',
        datetime: 'àkókò ISO',
        date: 'ọjọ́ ISO',
        time: 'àkókò ISO',
        duration: 'àkókò tó pé ISO',
        ipv4: 'àdírẹ́sì IPv4',
        ipv6: 'àdírẹ́sì IPv6',
        cidrv4: 'àgbègbè IPv4',
        cidrv6: 'àgbègbè IPv6',
        base64: 'ọ̀rọ̀ tí a kọ́ ní base64',
        base64url: 'ọ̀rọ̀ base64url',
        json_string: 'ọ̀rọ̀ JSON',
        e164: 'nọ́mbà E.164',
        jwt: 'JWT',
        template_literal: 'ẹ̀rọ ìbáwọlé',
      };
    return (r) => {
      switch (r.code) {
        case 'invalid_type':
          return `Ìbáwọlé aṣìṣe: a ní láti fi ${r.expected}, àmọ̀ a rí ${i(r.input)}`;
        case 'invalid_value':
          return r.values.length === 1
            ? `Ìbáwọlé aṣìṣe: a ní láti fi ${I(r.values[0])}`
            : `Àṣàyàn aṣìṣe: yan ọ̀kan lára ${_(r.values, '|')}`;
        case 'too_big': {
          let o = r.inclusive ? '<=' : '<',
            s = t(r.origin);
          return s
            ? `Tó pọ̀ jù: a ní láti jẹ́ pé ${r.origin ?? 'iye'} ${s.verb} ${o}${r.maximum} ${s.unit}`
            : `Tó pọ̀ jù: a ní láti jẹ́ ${o}${r.maximum}`;
        }
        case 'too_small': {
          let o = r.inclusive ? '>=' : '>',
            s = t(r.origin);
          return s
            ? `Kéré ju: a ní láti jẹ́ pé ${r.origin} ${s.verb} ${o}${r.minimum} ${s.unit}`
            : `Kéré ju: a ní láti jẹ́ ${o}${r.minimum}`;
        }
        case 'invalid_format': {
          let o = r;
          return o.format === 'starts_with'
            ? `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bẹ̀rẹ̀ pẹ̀lú "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ parí pẹ̀lú "${o.suffix}"`
              : o.format === 'includes'
                ? `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ ní "${o.includes}"`
                : o.format === 'regex'
                  ? `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bá àpẹẹrẹ mu ${o.pattern}`
                  : `Aṣìṣe: ${n[o.format] ?? r.format}`;
        }
        case 'not_multiple_of':
          return `Nọ́mbà aṣìṣe: gbọ́dọ̀ jẹ́ èyà pípín ti ${r.divisor}`;
        case 'unrecognized_keys':
          return `Bọtìnì àìmọ̀: ${_(r.keys, ', ')}`;
        case 'invalid_key':
          return `Bọtìnì aṣìṣe nínú ${r.origin}`;
        case 'invalid_union':
          return 'Ìbáwọlé aṣìṣe';
        case 'invalid_element':
          return `Iye aṣìṣe nínú ${r.origin}`;
        default:
          return 'Ìbáwọlé aṣìṣe';
      }
    };
  };
  function hp() {
    return { localeError: Pk() };
  }
  var Ms = Symbol('ZodOutput'),
    Ws = Symbol('ZodInput'),
    Dt = class {
      constructor() {
        ((this._map = new WeakMap()), (this._idmap = new Map()));
      }
      add(t, ...i) {
        let n = i[0];
        if ((this._map.set(t, n), n && typeof n == 'object' && 'id' in n)) {
          if (this._idmap.has(n.id))
            throw new Error(`ID ${n.id} already exists in the registry`);
          this._idmap.set(n.id, t);
        }
        return this;
      }
      clear() {
        return ((this._map = new WeakMap()), (this._idmap = new Map()), this);
      }
      remove(t) {
        let i = this._map.get(t);
        return (
          i && typeof i == 'object' && 'id' in i && this._idmap.delete(i.id),
          this._map.delete(t),
          this
        );
      }
      get(t) {
        let i = t._zod.parent;
        if (i) {
          let n = { ...(this.get(i) ?? {}) };
          delete n.id;
          let r = { ...n, ...this._map.get(t) };
          return Object.keys(r).length ? r : void 0;
        }
        return this._map.get(t);
      }
      has(t) {
        return this._map.has(t);
      }
    };
  function Jr() {
    return new Dt();
  }
  var Ue = Jr();
  function Bs(e, t) {
    return new e({ type: 'string', ...j(t) });
  }
  function Gs(e, t) {
    return new e({ type: 'string', coerce: !0, ...j(t) });
  }
  function Fr(e, t) {
    return new e({
      type: 'string',
      format: 'email',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function vn(e, t) {
    return new e({
      type: 'string',
      format: 'guid',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function Vr(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function Mr(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      version: 'v4',
      ...j(t),
    });
  }
  function Wr(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      version: 'v6',
      ...j(t),
    });
  }
  function Br(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      version: 'v7',
      ...j(t),
    });
  }
  function gn(e, t) {
    return new e({
      type: 'string',
      format: 'url',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function Gr(e, t) {
    return new e({
      type: 'string',
      format: 'emoji',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function Kr(e, t) {
    return new e({
      type: 'string',
      format: 'nanoid',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function qr(e, t) {
    return new e({
      type: 'string',
      format: 'cuid',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function Xr(e, t) {
    return new e({
      type: 'string',
      format: 'cuid2',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function Hr(e, t) {
    return new e({
      type: 'string',
      format: 'ulid',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function Yr(e, t) {
    return new e({
      type: 'string',
      format: 'xid',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function Qr(e, t) {
    return new e({
      type: 'string',
      format: 'ksuid',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function ei(e, t) {
    return new e({
      type: 'string',
      format: 'ipv4',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function ti(e, t) {
    return new e({
      type: 'string',
      format: 'ipv6',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function ni(e, t) {
    return new e({
      type: 'string',
      format: 'cidrv4',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function ri(e, t) {
    return new e({
      type: 'string',
      format: 'cidrv6',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function ii(e, t) {
    return new e({
      type: 'string',
      format: 'base64',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function oi(e, t) {
    return new e({
      type: 'string',
      format: 'base64url',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function ai(e, t) {
    return new e({
      type: 'string',
      format: 'e164',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  function si(e, t) {
    return new e({
      type: 'string',
      format: 'jwt',
      check: 'string_format',
      abort: !1,
      ...j(t),
    });
  }
  var Ks = { Any: null, Minute: -1, Second: 0, Millisecond: 3, Microsecond: 6 };
  function qs(e, t) {
    return new e({
      type: 'string',
      format: 'datetime',
      check: 'string_format',
      offset: !1,
      local: !1,
      precision: null,
      ...j(t),
    });
  }
  function Xs(e, t) {
    return new e({
      type: 'string',
      format: 'date',
      check: 'string_format',
      ...j(t),
    });
  }
  function Hs(e, t) {
    return new e({
      type: 'string',
      format: 'time',
      check: 'string_format',
      precision: null,
      ...j(t),
    });
  }
  function Ys(e, t) {
    return new e({
      type: 'string',
      format: 'duration',
      check: 'string_format',
      ...j(t),
    });
  }
  function Qs(e, t) {
    return new e({ type: 'number', checks: [], ...j(t) });
  }
  function eu(e, t) {
    return new e({ type: 'number', coerce: !0, checks: [], ...j(t) });
  }
  function tu(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'safeint',
      ...j(t),
    });
  }
  function nu(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'float32',
      ...j(t),
    });
  }
  function ru(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'float64',
      ...j(t),
    });
  }
  function iu(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'int32',
      ...j(t),
    });
  }
  function ou(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'uint32',
      ...j(t),
    });
  }
  function au(e, t) {
    return new e({ type: 'boolean', ...j(t) });
  }
  function su(e, t) {
    return new e({ type: 'boolean', coerce: !0, ...j(t) });
  }
  function uu(e, t) {
    return new e({ type: 'bigint', ...j(t) });
  }
  function cu(e, t) {
    return new e({ type: 'bigint', coerce: !0, ...j(t) });
  }
  function lu(e, t) {
    return new e({
      type: 'bigint',
      check: 'bigint_format',
      abort: !1,
      format: 'int64',
      ...j(t),
    });
  }
  function du(e, t) {
    return new e({
      type: 'bigint',
      check: 'bigint_format',
      abort: !1,
      format: 'uint64',
      ...j(t),
    });
  }
  function mu(e, t) {
    return new e({ type: 'symbol', ...j(t) });
  }
  function pu(e, t) {
    return new e({ type: 'undefined', ...j(t) });
  }
  function fu(e, t) {
    return new e({ type: 'null', ...j(t) });
  }
  function vu(e) {
    return new e({ type: 'any' });
  }
  function gu(e) {
    return new e({ type: 'unknown' });
  }
  function hu(e, t) {
    return new e({ type: 'never', ...j(t) });
  }
  function bu(e, t) {
    return new e({ type: 'void', ...j(t) });
  }
  function yu(e, t) {
    return new e({ type: 'date', ...j(t) });
  }
  function $u(e, t) {
    return new e({ type: 'date', coerce: !0, ...j(t) });
  }
  function _u(e, t) {
    return new e({ type: 'nan', ...j(t) });
  }
  function Ne(e, t) {
    return new zr({ check: 'less_than', ...j(t), value: e, inclusive: !1 });
  }
  function he(e, t) {
    return new zr({ check: 'less_than', ...j(t), value: e, inclusive: !0 });
  }
  function De(e, t) {
    return new jr({ check: 'greater_than', ...j(t), value: e, inclusive: !1 });
  }
  function ue(e, t) {
    return new jr({ check: 'greater_than', ...j(t), value: e, inclusive: !0 });
  }
  function ku(e) {
    return De(0, e);
  }
  function xu(e) {
    return Ne(0, e);
  }
  function wu(e) {
    return he(0, e);
  }
  function Su(e) {
    return ue(0, e);
  }
  function it(e, t) {
    return new ha({ check: 'multiple_of', ...j(t), value: e });
  }
  function Zt(e, t) {
    return new $a({ check: 'max_size', ...j(t), maximum: e });
  }
  function ot(e, t) {
    return new _a({ check: 'min_size', ...j(t), minimum: e });
  }
  function hn(e, t) {
    return new ka({ check: 'size_equals', ...j(t), size: e });
  }
  function Et(e, t) {
    return new xa({ check: 'max_length', ...j(t), maximum: e });
  }
  function Ke(e, t) {
    return new wa({ check: 'min_length', ...j(t), minimum: e });
  }
  function Tt(e, t) {
    return new Sa({ check: 'length_equals', ...j(t), length: e });
  }
  function bn(e, t) {
    return new Ia({
      check: 'string_format',
      format: 'regex',
      ...j(t),
      pattern: e,
    });
  }
  function yn(e) {
    return new za({ check: 'string_format', format: 'lowercase', ...j(e) });
  }
  function $n(e) {
    return new ja({ check: 'string_format', format: 'uppercase', ...j(e) });
  }
  function _n(e, t) {
    return new Oa({
      check: 'string_format',
      format: 'includes',
      ...j(t),
      includes: e,
    });
  }
  function kn(e, t) {
    return new Ua({
      check: 'string_format',
      format: 'starts_with',
      ...j(t),
      prefix: e,
    });
  }
  function xn(e, t) {
    return new Pa({
      check: 'string_format',
      format: 'ends_with',
      ...j(t),
      suffix: e,
    });
  }
  function Iu(e, t, i) {
    return new Na({ check: 'property', property: e, schema: t, ...j(i) });
  }
  function wn(e, t) {
    return new Da({ check: 'mime_type', mime: e, ...j(t) });
  }
  function Ze(e) {
    return new Za({ check: 'overwrite', tx: e });
  }
  function Sn(e) {
    return Ze((t) => t.normalize(e));
  }
  function In() {
    return Ze((e) => e.trim());
  }
  function zn() {
    return Ze((e) => e.toLowerCase());
  }
  function jn() {
    return Ze((e) => e.toUpperCase());
  }
  function zu(e, t, i) {
    return new e({ type: 'array', element: t, ...j(i) });
  }
  function Nk(e, t, i) {
    return new e({ type: 'union', options: t, ...j(i) });
  }
  function Dk(e, t, i, n) {
    return new e({ type: 'union', options: i, discriminator: t, ...j(n) });
  }
  function Zk(e, t, i) {
    return new e({ type: 'intersection', left: t, right: i });
  }
  function Ek(e, t, i, n) {
    let r = i instanceof D,
      o = r ? n : i,
      s = r ? i : null;
    return new e({ type: 'tuple', items: t, rest: s, ...j(o) });
  }
  function Tk(e, t, i, n) {
    return new e({ type: 'record', keyType: t, valueType: i, ...j(n) });
  }
  function Ak(e, t, i, n) {
    return new e({ type: 'map', keyType: t, valueType: i, ...j(n) });
  }
  function Ck(e, t, i) {
    return new e({ type: 'set', valueType: t, ...j(i) });
  }
  function Lk(e, t, i) {
    let n = Array.isArray(t) ? Object.fromEntries(t.map((r) => [r, r])) : t;
    return new e({ type: 'enum', entries: n, ...j(i) });
  }
  function Rk(e, t, i) {
    return new e({ type: 'enum', entries: t, ...j(i) });
  }
  function Jk(e, t, i) {
    return new e({
      type: 'literal',
      values: Array.isArray(t) ? t : [t],
      ...j(i),
    });
  }
  function ju(e, t) {
    return new e({ type: 'file', ...j(t) });
  }
  function Fk(e, t) {
    return new e({ type: 'transform', transform: t });
  }
  function Vk(e, t) {
    return new e({ type: 'optional', innerType: t });
  }
  function Mk(e, t) {
    return new e({ type: 'nullable', innerType: t });
  }
  function Wk(e, t, i) {
    return new e({
      type: 'default',
      innerType: t,
      get defaultValue() {
        return typeof i == 'function' ? i() : Do(i);
      },
    });
  }
  function Bk(e, t, i) {
    return new e({ type: 'nonoptional', innerType: t, ...j(i) });
  }
  function Gk(e, t) {
    return new e({ type: 'success', innerType: t });
  }
  function Kk(e, t, i) {
    return new e({
      type: 'catch',
      innerType: t,
      catchValue: typeof i == 'function' ? i : () => i,
    });
  }
  function qk(e, t, i) {
    return new e({ type: 'pipe', in: t, out: i });
  }
  function Xk(e, t) {
    return new e({ type: 'readonly', innerType: t });
  }
  function Hk(e, t, i) {
    return new e({ type: 'template_literal', parts: t, ...j(i) });
  }
  function Yk(e, t) {
    return new e({ type: 'lazy', getter: t });
  }
  function Qk(e, t) {
    return new e({ type: 'promise', innerType: t });
  }
  function Ou(e, t, i) {
    let n = j(i);
    return (
      n.abort ?? (n.abort = !0),
      new e({ type: 'custom', check: 'custom', fn: t, ...n })
    );
  }
  function Uu(e, t, i) {
    return new e({ type: 'custom', check: 'custom', fn: t, ...j(i) });
  }
  function Pu(e) {
    let t = bp(
      (i) => (
        (i.addIssue = (n) => {
          if (typeof n == 'string') i.issues.push(zt(n, i.value, t._zod.def));
          else {
            let r = n;
            (r.fatal && (r.continue = !1),
              r.code ?? (r.code = 'custom'),
              r.input ?? (r.input = i.value),
              r.inst ?? (r.inst = t),
              r.continue ?? (r.continue = !t._zod.def.abort),
              i.issues.push(zt(r)));
          }
        }),
        e(i.value, i)
      ),
    );
    return t;
  }
  function bp(e, t) {
    let i = new B({ check: 'custom', ...j(t) });
    return ((i._zod.check = e), i);
  }
  function Nu(e, t) {
    let i = j(t),
      n = i.truthy ?? ['true', '1', 'yes', 'on', 'y', 'enabled'],
      r = i.falsy ?? ['false', '0', 'no', 'off', 'n', 'disabled'];
    i.case !== 'sensitive' &&
      ((n = n.map((v) => (typeof v == 'string' ? v.toLowerCase() : v))),
      (r = r.map((v) => (typeof v == 'string' ? v.toLowerCase() : v))));
    let o = new Set(n),
      s = new Set(r),
      u = e.Codec ?? dn,
      a = e.Boolean ?? ln,
      c = e.String ?? rt,
      m = new c({ type: 'string', error: i.error }),
      p = new a({ type: 'boolean', error: i.error }),
      f = new u({
        type: 'pipe',
        in: m,
        out: p,
        transform: (v, b) => {
          let $ = v;
          return (
            i.case !== 'sensitive' && ($ = $.toLowerCase()),
            o.has($)
              ? !0
              : s.has($)
                ? !1
                : (b.issues.push({
                    code: 'invalid_value',
                    expected: 'stringbool',
                    values: [...o, ...s],
                    input: b.value,
                    inst: f,
                    continue: !1,
                  }),
                  {})
          );
        },
        reverseTransform: (v, b) =>
          v === !0 ? n[0] || 'true' : r[0] || 'false',
        error: i.error,
      });
    return f;
  }
  function At(e, t, i, n = {}) {
    let r = j(n),
      o = {
        ...j(n),
        check: 'string_format',
        type: 'string',
        format: t,
        fn: typeof i == 'function' ? i : (u) => i.test(u),
        ...r,
      };
    return (i instanceof RegExp && (o.pattern = i), new e(o));
  }
  var On = class {
    constructor(t) {
      ((this.counter = 0),
        (this.metadataRegistry = t?.metadata ?? Ue),
        (this.target = t?.target ?? 'draft-2020-12'),
        (this.unrepresentable = t?.unrepresentable ?? 'throw'),
        (this.override = t?.override ?? (() => {})),
        (this.io = t?.io ?? 'output'),
        (this.seen = new Map()));
    }
    process(t, i = { path: [], schemaPath: [] }) {
      var n;
      let r = t._zod.def,
        o = {
          guid: 'uuid',
          url: 'uri',
          datetime: 'date-time',
          json_string: 'json-string',
          regex: '',
        },
        s = this.seen.get(t);
      if (s)
        return (
          s.count++,
          i.schemaPath.includes(t) && (s.cycle = i.path),
          s.schema
        );
      let u = { schema: {}, count: 1, cycle: void 0, path: i.path };
      this.seen.set(t, u);
      let a = t._zod.toJSONSchema?.();
      if (a) u.schema = a;
      else {
        let p = { ...i, schemaPath: [...i.schemaPath, t], path: i.path },
          f = t._zod.parent;
        if (f)
          ((u.ref = f), this.process(f, p), (this.seen.get(f).isParent = !0));
        else {
          let v = u.schema;
          switch (r.type) {
            case 'string': {
              let b = v;
              b.type = 'string';
              let {
                minimum: $,
                maximum: g,
                format: k,
                patterns: x,
                contentEncoding: w,
              } = t._zod.bag;
              if (
                (typeof $ == 'number' && (b.minLength = $),
                typeof g == 'number' && (b.maxLength = g),
                k &&
                  ((b.format = o[k] ?? k), b.format === '' && delete b.format),
                w && (b.contentEncoding = w),
                x && x.size > 0)
              ) {
                let S = [...x];
                S.length === 1
                  ? (b.pattern = S[0].source)
                  : S.length > 1 &&
                    (u.schema.allOf = [
                      ...S.map((P) => ({
                        ...(this.target === 'draft-7' ||
                        this.target === 'draft-4' ||
                        this.target === 'openapi-3.0'
                          ? { type: 'string' }
                          : {}),
                        pattern: P.source,
                      })),
                    ]);
              }
              break;
            }
            case 'number': {
              let b = v,
                {
                  minimum: $,
                  maximum: g,
                  format: k,
                  multipleOf: x,
                  exclusiveMaximum: w,
                  exclusiveMinimum: S,
                } = t._zod.bag;
              (typeof k == 'string' && k.includes('int')
                ? (b.type = 'integer')
                : (b.type = 'number'),
                typeof S == 'number' &&
                  (this.target === 'draft-4' || this.target === 'openapi-3.0'
                    ? ((b.minimum = S), (b.exclusiveMinimum = !0))
                    : (b.exclusiveMinimum = S)),
                typeof $ == 'number' &&
                  ((b.minimum = $),
                  typeof S == 'number' &&
                    this.target !== 'draft-4' &&
                    (S >= $ ? delete b.minimum : delete b.exclusiveMinimum)),
                typeof w == 'number' &&
                  (this.target === 'draft-4' || this.target === 'openapi-3.0'
                    ? ((b.maximum = w), (b.exclusiveMaximum = !0))
                    : (b.exclusiveMaximum = w)),
                typeof g == 'number' &&
                  ((b.maximum = g),
                  typeof w == 'number' &&
                    this.target !== 'draft-4' &&
                    (w <= g ? delete b.maximum : delete b.exclusiveMaximum)),
                typeof x == 'number' && (b.multipleOf = x));
              break;
            }
            case 'boolean': {
              let b = v;
              b.type = 'boolean';
              break;
            }
            case 'bigint': {
              if (this.unrepresentable === 'throw')
                throw new Error('BigInt cannot be represented in JSON Schema');
              break;
            }
            case 'symbol': {
              if (this.unrepresentable === 'throw')
                throw new Error('Symbols cannot be represented in JSON Schema');
              break;
            }
            case 'null': {
              this.target === 'openapi-3.0'
                ? ((v.type = 'string'), (v.nullable = !0), (v.enum = [null]))
                : (v.type = 'null');
              break;
            }
            case 'any':
              break;
            case 'unknown':
              break;
            case 'undefined': {
              if (this.unrepresentable === 'throw')
                throw new Error(
                  'Undefined cannot be represented in JSON Schema',
                );
              break;
            }
            case 'void': {
              if (this.unrepresentable === 'throw')
                throw new Error('Void cannot be represented in JSON Schema');
              break;
            }
            case 'never': {
              v.not = {};
              break;
            }
            case 'date': {
              if (this.unrepresentable === 'throw')
                throw new Error('Date cannot be represented in JSON Schema');
              break;
            }
            case 'array': {
              let b = v,
                { minimum: $, maximum: g } = t._zod.bag;
              (typeof $ == 'number' && (b.minItems = $),
                typeof g == 'number' && (b.maxItems = g),
                (b.type = 'array'),
                (b.items = this.process(r.element, {
                  ...p,
                  path: [...p.path, 'items'],
                })));
              break;
            }
            case 'object': {
              let b = v;
              ((b.type = 'object'), (b.properties = {}));
              let $ = r.shape;
              for (let x in $)
                b.properties[x] = this.process($[x], {
                  ...p,
                  path: [...p.path, 'properties', x],
                });
              let g = new Set(Object.keys($)),
                k = new Set(
                  [...g].filter((x) => {
                    let w = r.shape[x]._zod;
                    return this.io === 'input'
                      ? w.optin === void 0
                      : w.optout === void 0;
                  }),
                );
              (k.size > 0 && (b.required = Array.from(k)),
                r.catchall?._zod.def.type === 'never'
                  ? (b.additionalProperties = !1)
                  : r.catchall
                    ? r.catchall &&
                      (b.additionalProperties = this.process(r.catchall, {
                        ...p,
                        path: [...p.path, 'additionalProperties'],
                      }))
                    : this.io === 'output' && (b.additionalProperties = !1));
              break;
            }
            case 'union': {
              let b = v,
                $ = r.options.map((g, k) =>
                  this.process(g, { ...p, path: [...p.path, 'anyOf', k] }),
                );
              b.anyOf = $;
              break;
            }
            case 'intersection': {
              let b = v,
                $ = this.process(r.left, {
                  ...p,
                  path: [...p.path, 'allOf', 0],
                }),
                g = this.process(r.right, {
                  ...p,
                  path: [...p.path, 'allOf', 1],
                }),
                k = (w) => 'allOf' in w && Object.keys(w).length === 1,
                x = [...(k($) ? $.allOf : [$]), ...(k(g) ? g.allOf : [g])];
              b.allOf = x;
              break;
            }
            case 'tuple': {
              let b = v;
              b.type = 'array';
              let $ = this.target === 'draft-2020-12' ? 'prefixItems' : 'items',
                g =
                  this.target === 'draft-2020-12' ||
                  this.target === 'openapi-3.0'
                    ? 'items'
                    : 'additionalItems',
                k = r.items.map((P, J) =>
                  this.process(P, { ...p, path: [...p.path, $, J] }),
                ),
                x = r.rest
                  ? this.process(r.rest, {
                      ...p,
                      path: [
                        ...p.path,
                        g,
                        ...(this.target === 'openapi-3.0'
                          ? [r.items.length]
                          : []),
                      ],
                    })
                  : null;
              this.target === 'draft-2020-12'
                ? ((b.prefixItems = k), x && (b.items = x))
                : this.target === 'openapi-3.0'
                  ? ((b.items = { anyOf: k }),
                    x && b.items.anyOf.push(x),
                    (b.minItems = k.length),
                    x || (b.maxItems = k.length))
                  : ((b.items = k), x && (b.additionalItems = x));
              let { minimum: w, maximum: S } = t._zod.bag;
              (typeof w == 'number' && (b.minItems = w),
                typeof S == 'number' && (b.maxItems = S));
              break;
            }
            case 'record': {
              let b = v;
              ((b.type = 'object'),
                (this.target === 'draft-7' ||
                  this.target === 'draft-2020-12') &&
                  (b.propertyNames = this.process(r.keyType, {
                    ...p,
                    path: [...p.path, 'propertyNames'],
                  })),
                (b.additionalProperties = this.process(r.valueType, {
                  ...p,
                  path: [...p.path, 'additionalProperties'],
                })));
              break;
            }
            case 'map': {
              if (this.unrepresentable === 'throw')
                throw new Error('Map cannot be represented in JSON Schema');
              break;
            }
            case 'set': {
              if (this.unrepresentable === 'throw')
                throw new Error('Set cannot be represented in JSON Schema');
              break;
            }
            case 'enum': {
              let b = v,
                $ = Yt(r.entries);
              ($.every((g) => typeof g == 'number') && (b.type = 'number'),
                $.every((g) => typeof g == 'string') && (b.type = 'string'),
                (b.enum = $));
              break;
            }
            case 'literal': {
              let b = v,
                $ = [];
              for (let g of r.values)
                if (g === void 0) {
                  if (this.unrepresentable === 'throw')
                    throw new Error(
                      'Literal `undefined` cannot be represented in JSON Schema',
                    );
                } else if (typeof g == 'bigint') {
                  if (this.unrepresentable === 'throw')
                    throw new Error(
                      'BigInt literals cannot be represented in JSON Schema',
                    );
                  $.push(Number(g));
                } else $.push(g);
              if ($.length !== 0)
                if ($.length === 1) {
                  let g = $[0];
                  ((b.type = g === null ? 'null' : typeof g),
                    this.target === 'draft-4' || this.target === 'openapi-3.0'
                      ? (b.enum = [g])
                      : (b.const = g));
                } else
                  ($.every((g) => typeof g == 'number') && (b.type = 'number'),
                    $.every((g) => typeof g == 'string') && (b.type = 'string'),
                    $.every((g) => typeof g == 'boolean') &&
                      (b.type = 'string'),
                    $.every((g) => g === null) && (b.type = 'null'),
                    (b.enum = $));
              break;
            }
            case 'file': {
              let b = v,
                $ = {
                  type: 'string',
                  format: 'binary',
                  contentEncoding: 'binary',
                },
                { minimum: g, maximum: k, mime: x } = t._zod.bag;
              (g !== void 0 && ($.minLength = g),
                k !== void 0 && ($.maxLength = k),
                x
                  ? x.length === 1
                    ? (($.contentMediaType = x[0]), Object.assign(b, $))
                    : (b.anyOf = x.map((w) => ({ ...$, contentMediaType: w })))
                  : Object.assign(b, $));
              break;
            }
            case 'transform': {
              if (this.unrepresentable === 'throw')
                throw new Error(
                  'Transforms cannot be represented in JSON Schema',
                );
              break;
            }
            case 'nullable': {
              let b = this.process(r.innerType, p);
              this.target === 'openapi-3.0'
                ? ((u.ref = r.innerType), (v.nullable = !0))
                : (v.anyOf = [b, { type: 'null' }]);
              break;
            }
            case 'nonoptional': {
              (this.process(r.innerType, p), (u.ref = r.innerType));
              break;
            }
            case 'success': {
              let b = v;
              b.type = 'boolean';
              break;
            }
            case 'default': {
              (this.process(r.innerType, p),
                (u.ref = r.innerType),
                (v.default = JSON.parse(JSON.stringify(r.defaultValue))));
              break;
            }
            case 'prefault': {
              (this.process(r.innerType, p),
                (u.ref = r.innerType),
                this.io === 'input' &&
                  (v._prefault = JSON.parse(JSON.stringify(r.defaultValue))));
              break;
            }
            case 'catch': {
              (this.process(r.innerType, p), (u.ref = r.innerType));
              let b;
              try {
                b = r.catchValue(void 0);
              } catch {
                throw new Error(
                  'Dynamic catch values are not supported in JSON Schema',
                );
              }
              v.default = b;
              break;
            }
            case 'nan': {
              if (this.unrepresentable === 'throw')
                throw new Error('NaN cannot be represented in JSON Schema');
              break;
            }
            case 'template_literal': {
              let b = v,
                $ = t._zod.pattern;
              if (!$) throw new Error('Pattern not found in template literal');
              ((b.type = 'string'), (b.pattern = $.source));
              break;
            }
            case 'pipe': {
              let b =
                this.io === 'input'
                  ? r.in._zod.def.type === 'transform'
                    ? r.out
                    : r.in
                  : r.out;
              (this.process(b, p), (u.ref = b));
              break;
            }
            case 'readonly': {
              (this.process(r.innerType, p),
                (u.ref = r.innerType),
                (v.readOnly = !0));
              break;
            }
            case 'promise': {
              (this.process(r.innerType, p), (u.ref = r.innerType));
              break;
            }
            case 'optional': {
              (this.process(r.innerType, p), (u.ref = r.innerType));
              break;
            }
            case 'lazy': {
              let b = t._zod.innerType;
              (this.process(b, p), (u.ref = b));
              break;
            }
            case 'custom': {
              if (this.unrepresentable === 'throw')
                throw new Error(
                  'Custom types cannot be represented in JSON Schema',
                );
              break;
            }
            case 'function': {
              if (this.unrepresentable === 'throw')
                throw new Error(
                  'Function types cannot be represented in JSON Schema',
                );
              break;
            }
            default:
          }
        }
      }
      let c = this.metadataRegistry.get(t);
      return (
        c && Object.assign(u.schema, c),
        this.io === 'input' &&
          X(t) &&
          (delete u.schema.examples, delete u.schema.default),
        this.io === 'input' &&
          u.schema._prefault &&
          ((n = u.schema).default ?? (n.default = u.schema._prefault)),
        delete u.schema._prefault,
        this.seen.get(t).schema
      );
    }
    emit(t, i) {
      let n = {
          cycles: i?.cycles ?? 'ref',
          reused: i?.reused ?? 'inline',
          external: i?.external ?? void 0,
        },
        r = this.seen.get(t);
      if (!r) throw new Error('Unprocessed schema. This is a bug in Zod.');
      let o = (m) => {
          let p = this.target === 'draft-2020-12' ? '$defs' : 'definitions';
          if (n.external) {
            let $ = n.external.registry.get(m[0])?.id,
              g = n.external.uri ?? ((x) => x);
            if ($) return { ref: g($) };
            let k = m[1].defId ?? m[1].schema.id ?? `schema${this.counter++}`;
            return (
              (m[1].defId = k),
              { defId: k, ref: `${g('__shared')}#/${p}/${k}` }
            );
          }
          if (m[1] === r) return { ref: '#' };
          let v = `#/${p}/`,
            b = m[1].schema.id ?? `__schema${this.counter++}`;
          return { defId: b, ref: v + b };
        },
        s = (m) => {
          if (m[1].schema.$ref) return;
          let p = m[1],
            { ref: f, defId: v } = o(m);
          ((p.def = { ...p.schema }), v && (p.defId = v));
          let b = p.schema;
          for (let $ in b) delete b[$];
          b.$ref = f;
        };
      if (n.cycles === 'throw')
        for (let m of this.seen.entries()) {
          let p = m[1];
          if (p.cycle)
            throw new Error(`Cycle detected: #/${p.cycle?.join('/')}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
        }
      for (let m of this.seen.entries()) {
        let p = m[1];
        if (t === m[0]) {
          s(m);
          continue;
        }
        if (n.external) {
          let v = n.external.registry.get(m[0])?.id;
          if (t !== m[0] && v) {
            s(m);
            continue;
          }
        }
        if (this.metadataRegistry.get(m[0])?.id) {
          s(m);
          continue;
        }
        if (p.cycle) {
          s(m);
          continue;
        }
        if (p.count > 1 && n.reused === 'ref') {
          s(m);
          continue;
        }
      }
      let u = (m, p) => {
        let f = this.seen.get(m),
          v = f.def ?? f.schema,
          b = { ...v };
        if (f.ref === null) return;
        let $ = f.ref;
        if (((f.ref = null), $)) {
          u($, p);
          let g = this.seen.get($).schema;
          g.$ref &&
          (p.target === 'draft-7' ||
            p.target === 'draft-4' ||
            p.target === 'openapi-3.0')
            ? ((v.allOf = v.allOf ?? []), v.allOf.push(g))
            : (Object.assign(v, g), Object.assign(v, b));
        }
        f.isParent ||
          this.override({ zodSchema: m, jsonSchema: v, path: f.path ?? [] });
      };
      for (let m of [...this.seen.entries()].reverse())
        u(m[0], { target: this.target });
      let a = {};
      if (
        (this.target === 'draft-2020-12'
          ? (a.$schema = 'https://json-schema.org/draft/2020-12/schema')
          : this.target === 'draft-7'
            ? (a.$schema = 'http://json-schema.org/draft-07/schema#')
            : this.target === 'draft-4'
              ? (a.$schema = 'http://json-schema.org/draft-04/schema#')
              : this.target === 'openapi-3.0' ||
                console.warn(`Invalid target: ${this.target}`),
        n.external?.uri)
      ) {
        let m = n.external.registry.get(t)?.id;
        if (!m) throw new Error('Schema is missing an `id` property');
        a.$id = n.external.uri(m);
      }
      Object.assign(a, r.def);
      let c = n.external?.defs ?? {};
      for (let m of this.seen.entries()) {
        let p = m[1];
        p.def && p.defId && (c[p.defId] = p.def);
      }
      n.external ||
        (Object.keys(c).length > 0 &&
          (this.target === 'draft-2020-12'
            ? (a.$defs = c)
            : (a.definitions = c)));
      try {
        return JSON.parse(JSON.stringify(a));
      } catch {
        throw new Error('Error converting schema to JSON.');
      }
    }
  };
  function Du(e, t) {
    if (e instanceof Dt) {
      let n = new On(t),
        r = {};
      for (let u of e._idmap.entries()) {
        let [a, c] = u;
        n.process(c);
      }
      let o = {},
        s = { registry: e, uri: t?.uri, defs: r };
      for (let u of e._idmap.entries()) {
        let [a, c] = u;
        o[a] = n.emit(c, { ...t, external: s });
      }
      if (Object.keys(r).length > 0) {
        let u = n.target === 'draft-2020-12' ? '$defs' : 'definitions';
        o.__shared = { [u]: r };
      }
      return { schemas: o };
    }
    let i = new On(t);
    return (i.process(e), i.emit(e, t));
  }
  function X(e, t) {
    let i = t ?? { seen: new Set() };
    if (i.seen.has(e)) return !1;
    i.seen.add(e);
    let r = e._zod.def;
    switch (r.type) {
      case 'string':
      case 'number':
      case 'bigint':
      case 'boolean':
      case 'date':
      case 'symbol':
      case 'undefined':
      case 'null':
      case 'any':
      case 'unknown':
      case 'never':
      case 'void':
      case 'literal':
      case 'enum':
      case 'nan':
      case 'file':
      case 'template_literal':
        return !1;
      case 'array':
        return X(r.element, i);
      case 'object': {
        for (let o in r.shape) if (X(r.shape[o], i)) return !0;
        return !1;
      }
      case 'union': {
        for (let o of r.options) if (X(o, i)) return !0;
        return !1;
      }
      case 'intersection':
        return X(r.left, i) || X(r.right, i);
      case 'tuple': {
        for (let o of r.items) if (X(o, i)) return !0;
        return !!(r.rest && X(r.rest, i));
      }
      case 'record':
        return X(r.keyType, i) || X(r.valueType, i);
      case 'map':
        return X(r.keyType, i) || X(r.valueType, i);
      case 'set':
        return X(r.valueType, i);
      case 'promise':
      case 'optional':
      case 'nonoptional':
      case 'nullable':
      case 'readonly':
        return X(r.innerType, i);
      case 'lazy':
        return X(r.getter(), i);
      case 'default':
        return X(r.innerType, i);
      case 'prefault':
        return X(r.innerType, i);
      case 'custom':
        return !1;
      case 'transform':
        return !0;
      case 'pipe':
        return X(r.in, i) || X(r.out, i);
      case 'success':
        return !1;
      case 'catch':
        return !1;
      case 'function':
        return !1;
      default:
    }
    throw new Error(`Unknown schema type: ${r.type}`);
  }
  var yp = {};
  var mi = {};
  Je(mi, {
    ZodISODate: () => ci,
    ZodISODateTime: () => ui,
    ZodISODuration: () => di,
    ZodISOTime: () => li,
    date: () => Eu,
    datetime: () => Zu,
    duration: () => Au,
    time: () => Tu,
  });
  var ui = h('ZodISODateTime', (e, t) => {
    (Ka.init(e, t), M.init(e, t));
  });
  function Zu(e) {
    return qs(ui, e);
  }
  var ci = h('ZodISODate', (e, t) => {
    (qa.init(e, t), M.init(e, t));
  });
  function Eu(e) {
    return Xs(ci, e);
  }
  var li = h('ZodISOTime', (e, t) => {
    (Xa.init(e, t), M.init(e, t));
  });
  function Tu(e) {
    return Hs(li, e);
  }
  var di = h('ZodISODuration', (e, t) => {
    (Ha.init(e, t), M.init(e, t));
  });
  function Au(e) {
    return Ys(di, e);
  }
  var _p = (e, t) => {
      (rn.init(e, t),
        (e.name = 'ZodError'),
        Object.defineProperties(e, {
          format: { value: (i) => an(e, i) },
          flatten: { value: (i) => on(e, i) },
          addIssue: {
            value: (i) => {
              (e.issues.push(i), (e.message = JSON.stringify(e.issues, St, 2)));
            },
          },
          addIssues: {
            value: (i) => {
              (e.issues.push(...i),
                (e.message = JSON.stringify(e.issues, St, 2)));
            },
          },
          isEmpty: {
            get() {
              return e.issues.length === 0;
            },
          },
        }));
    },
    tx = h('ZodError', _p),
    ce = h('ZodError', _p, { Parent: Error });
  var Cu = jt(ce),
    Lu = Ot(ce),
    Ru = Ut(ce),
    Ju = Pt(ce),
    Fu = br(ce),
    Vu = yr(ce),
    Mu = $r(ce),
    Wu = _r(ce),
    Bu = kr(ce),
    Gu = xr(ce),
    Ku = wr(ce),
    qu = Sr(ce);
  var A = h(
      'ZodType',
      (e, t) => (
        D.init(e, t),
        (e.def = t),
        (e.type = t.type),
        Object.defineProperty(e, '_def', { value: t }),
        (e.check = (...i) =>
          e.clone(
            O.mergeDefs(t, {
              checks: [
                ...(t.checks ?? []),
                ...i.map((n) =>
                  typeof n == 'function'
                    ? {
                        _zod: {
                          check: n,
                          def: { check: 'custom' },
                          onattach: [],
                        },
                      }
                    : n,
                ),
              ],
            }),
          )),
        (e.clone = (i, n) => te(e, i, n)),
        (e.brand = () => e),
        (e.register = (i, n) => (i.add(e, n), e)),
        (e.parse = (i, n) => Cu(e, i, n, { callee: e.parse })),
        (e.safeParse = (i, n) => Ru(e, i, n)),
        (e.parseAsync = async (i, n) => Lu(e, i, n, { callee: e.parseAsync })),
        (e.safeParseAsync = async (i, n) => Ju(e, i, n)),
        (e.spa = e.safeParseAsync),
        (e.encode = (i, n) => Fu(e, i, n)),
        (e.decode = (i, n) => Vu(e, i, n)),
        (e.encodeAsync = async (i, n) => Mu(e, i, n)),
        (e.decodeAsync = async (i, n) => Wu(e, i, n)),
        (e.safeEncode = (i, n) => Bu(e, i, n)),
        (e.safeDecode = (i, n) => Gu(e, i, n)),
        (e.safeEncodeAsync = async (i, n) => Ku(e, i, n)),
        (e.safeDecodeAsync = async (i, n) => qu(e, i, n)),
        (e.refine = (i, n) => e.check(uf(i, n))),
        (e.superRefine = (i) => e.check(cf(i))),
        (e.overwrite = (i) => e.check(Ze(i))),
        (e.optional = () => fi(e)),
        (e.nullable = () => vi(e)),
        (e.nullish = () => fi(vi(e))),
        (e.nonoptional = (i) => qp(e, i)),
        (e.array = () => yi(e)),
        (e.or = (i) => bc([e, i])),
        (e.and = (i) => Ep(e, i)),
        (e.transform = (i) => gi(e, _c(i))),
        (e.default = (i) => Bp(e, i)),
        (e.prefault = (i) => Kp(e, i)),
        (e.catch = (i) => Yp(e, i)),
        (e.pipe = (i) => gi(e, i)),
        (e.readonly = () => tf(e)),
        (e.describe = (i) => {
          let n = e.clone();
          return (Ue.add(n, { description: i }), n);
        }),
        Object.defineProperty(e, 'description', {
          get() {
            return Ue.get(e)?.description;
          },
          configurable: !0,
        }),
        (e.meta = (...i) => {
          if (i.length === 0) return Ue.get(e);
          let n = e.clone();
          return (Ue.add(n, i[0]), n);
        }),
        (e.isOptional = () => e.safeParse(void 0).success),
        (e.isNullable = () => e.safeParse(null).success),
        e
      ),
    ),
    Yu = h('_ZodString', (e, t) => {
      (rt.init(e, t), A.init(e, t));
      let i = e._zod.bag;
      ((e.format = i.format ?? null),
        (e.minLength = i.minimum ?? null),
        (e.maxLength = i.maximum ?? null),
        (e.regex = (...n) => e.check(bn(...n))),
        (e.includes = (...n) => e.check(_n(...n))),
        (e.startsWith = (...n) => e.check(kn(...n))),
        (e.endsWith = (...n) => e.check(xn(...n))),
        (e.min = (...n) => e.check(Ke(...n))),
        (e.max = (...n) => e.check(Et(...n))),
        (e.length = (...n) => e.check(Tt(...n))),
        (e.nonempty = (...n) => e.check(Ke(1, ...n))),
        (e.lowercase = (n) => e.check(yn(n))),
        (e.uppercase = (n) => e.check($n(n))),
        (e.trim = () => e.check(In())),
        (e.normalize = (...n) => e.check(Sn(...n))),
        (e.toLowerCase = () => e.check(zn())),
        (e.toUpperCase = () => e.check(jn())));
    }),
    Pn = h('ZodString', (e, t) => {
      (rt.init(e, t),
        Yu.init(e, t),
        (e.email = (i) => e.check(Fr(Qu, i))),
        (e.url = (i) => e.check(gn(hi, i))),
        (e.jwt = (i) => e.check(si(fc, i))),
        (e.emoji = (i) => e.check(Gr(ec, i))),
        (e.guid = (i) => e.check(vn(pi, i))),
        (e.uuid = (i) => e.check(Vr(Te, i))),
        (e.uuidv4 = (i) => e.check(Mr(Te, i))),
        (e.uuidv6 = (i) => e.check(Wr(Te, i))),
        (e.uuidv7 = (i) => e.check(Br(Te, i))),
        (e.nanoid = (i) => e.check(Kr(tc, i))),
        (e.guid = (i) => e.check(vn(pi, i))),
        (e.cuid = (i) => e.check(qr(nc, i))),
        (e.cuid2 = (i) => e.check(Xr(rc, i))),
        (e.ulid = (i) => e.check(Hr(ic, i))),
        (e.base64 = (i) => e.check(ii(dc, i))),
        (e.base64url = (i) => e.check(oi(mc, i))),
        (e.xid = (i) => e.check(Yr(oc, i))),
        (e.ksuid = (i) => e.check(Qr(ac, i))),
        (e.ipv4 = (i) => e.check(ei(sc, i))),
        (e.ipv6 = (i) => e.check(ti(uc, i))),
        (e.cidrv4 = (i) => e.check(ni(cc, i))),
        (e.cidrv6 = (i) => e.check(ri(lc, i))),
        (e.e164 = (i) => e.check(ai(pc, i))),
        (e.datetime = (i) => e.check(Zu(i))),
        (e.date = (i) => e.check(Eu(i))),
        (e.time = (i) => e.check(Tu(i))),
        (e.duration = (i) => e.check(Au(i))));
    });
  function Xu(e) {
    return Bs(Pn, e);
  }
  var M = h('ZodStringFormat', (e, t) => {
      (V.init(e, t), Yu.init(e, t));
    }),
    Qu = h('ZodEmail', (e, t) => {
      (La.init(e, t), M.init(e, t));
    });
  function rx(e) {
    return Fr(Qu, e);
  }
  var pi = h('ZodGUID', (e, t) => {
    (Aa.init(e, t), M.init(e, t));
  });
  function ix(e) {
    return vn(pi, e);
  }
  var Te = h('ZodUUID', (e, t) => {
    (Ca.init(e, t), M.init(e, t));
  });
  function ox(e) {
    return Vr(Te, e);
  }
  function ax(e) {
    return Mr(Te, e);
  }
  function sx(e) {
    return Wr(Te, e);
  }
  function ux(e) {
    return Br(Te, e);
  }
  var hi = h('ZodURL', (e, t) => {
    (Ra.init(e, t), M.init(e, t));
  });
  function cx(e) {
    return gn(hi, e);
  }
  function lx(e) {
    return gn(hi, {
      protocol: /^https?$/,
      hostname: ge.domain,
      ...O.normalizeParams(e),
    });
  }
  var ec = h('ZodEmoji', (e, t) => {
    (Ja.init(e, t), M.init(e, t));
  });
  function dx(e) {
    return Gr(ec, e);
  }
  var tc = h('ZodNanoID', (e, t) => {
    (Fa.init(e, t), M.init(e, t));
  });
  function mx(e) {
    return Kr(tc, e);
  }
  var nc = h('ZodCUID', (e, t) => {
    (Va.init(e, t), M.init(e, t));
  });
  function px(e) {
    return qr(nc, e);
  }
  var rc = h('ZodCUID2', (e, t) => {
    (Ma.init(e, t), M.init(e, t));
  });
  function fx(e) {
    return Xr(rc, e);
  }
  var ic = h('ZodULID', (e, t) => {
    (Wa.init(e, t), M.init(e, t));
  });
  function vx(e) {
    return Hr(ic, e);
  }
  var oc = h('ZodXID', (e, t) => {
    (Ba.init(e, t), M.init(e, t));
  });
  function gx(e) {
    return Yr(oc, e);
  }
  var ac = h('ZodKSUID', (e, t) => {
    (Ga.init(e, t), M.init(e, t));
  });
  function hx(e) {
    return Qr(ac, e);
  }
  var sc = h('ZodIPv4', (e, t) => {
    (Ya.init(e, t), M.init(e, t));
  });
  function bx(e) {
    return ei(sc, e);
  }
  var uc = h('ZodIPv6', (e, t) => {
    (Qa.init(e, t), M.init(e, t));
  });
  function yx(e) {
    return ti(uc, e);
  }
  var cc = h('ZodCIDRv4', (e, t) => {
    (es.init(e, t), M.init(e, t));
  });
  function $x(e) {
    return ni(cc, e);
  }
  var lc = h('ZodCIDRv6', (e, t) => {
    (ts.init(e, t), M.init(e, t));
  });
  function _x(e) {
    return ri(lc, e);
  }
  var dc = h('ZodBase64', (e, t) => {
    (rs.init(e, t), M.init(e, t));
  });
  function kx(e) {
    return ii(dc, e);
  }
  var mc = h('ZodBase64URL', (e, t) => {
    (is.init(e, t), M.init(e, t));
  });
  function xx(e) {
    return oi(mc, e);
  }
  var pc = h('ZodE164', (e, t) => {
    (os.init(e, t), M.init(e, t));
  });
  function wx(e) {
    return ai(pc, e);
  }
  var fc = h('ZodJWT', (e, t) => {
    (as.init(e, t), M.init(e, t));
  });
  function Sx(e) {
    return si(fc, e);
  }
  var Nn = h('ZodCustomStringFormat', (e, t) => {
    (ss.init(e, t), M.init(e, t));
  });
  function Ix(e, t, i = {}) {
    return At(Nn, e, t, i);
  }
  function zx(e) {
    return At(Nn, 'hostname', ge.hostname, e);
  }
  function jx(e) {
    return At(Nn, 'hex', ge.hex, e);
  }
  function Ox(e, t) {
    let i = t?.enc ?? 'hex',
      n = `${e}_${i}`,
      r = ge[n];
    if (!r) throw new Error(`Unrecognized hash format: ${n}`);
    return At(Nn, n, r, t);
  }
  var Dn = h('ZodNumber', (e, t) => {
    (Zr.init(e, t),
      A.init(e, t),
      (e.gt = (n, r) => e.check(De(n, r))),
      (e.gte = (n, r) => e.check(ue(n, r))),
      (e.min = (n, r) => e.check(ue(n, r))),
      (e.lt = (n, r) => e.check(Ne(n, r))),
      (e.lte = (n, r) => e.check(he(n, r))),
      (e.max = (n, r) => e.check(he(n, r))),
      (e.int = (n) => e.check(Hu(n))),
      (e.safe = (n) => e.check(Hu(n))),
      (e.positive = (n) => e.check(De(0, n))),
      (e.nonnegative = (n) => e.check(ue(0, n))),
      (e.negative = (n) => e.check(Ne(0, n))),
      (e.nonpositive = (n) => e.check(he(0, n))),
      (e.multipleOf = (n, r) => e.check(it(n, r))),
      (e.step = (n, r) => e.check(it(n, r))),
      (e.finite = () => e));
    let i = e._zod.bag;
    ((e.minValue =
      Math.max(
        i.minimum ?? Number.NEGATIVE_INFINITY,
        i.exclusiveMinimum ?? Number.NEGATIVE_INFINITY,
      ) ?? null),
      (e.maxValue =
        Math.min(
          i.maximum ?? Number.POSITIVE_INFINITY,
          i.exclusiveMaximum ?? Number.POSITIVE_INFINITY,
        ) ?? null),
      (e.isInt =
        (i.format ?? '').includes('int') ||
        Number.isSafeInteger(i.multipleOf ?? 0.5)),
      (e.isFinite = !0),
      (e.format = i.format ?? null));
  });
  function kp(e) {
    return Qs(Dn, e);
  }
  var Lt = h('ZodNumberFormat', (e, t) => {
    (us.init(e, t), Dn.init(e, t));
  });
  function Hu(e) {
    return tu(Lt, e);
  }
  function Ux(e) {
    return nu(Lt, e);
  }
  function Px(e) {
    return ru(Lt, e);
  }
  function Nx(e) {
    return iu(Lt, e);
  }
  function Dx(e) {
    return ou(Lt, e);
  }
  var Zn = h('ZodBoolean', (e, t) => {
    (ln.init(e, t), A.init(e, t));
  });
  function xp(e) {
    return au(Zn, e);
  }
  var En = h('ZodBigInt', (e, t) => {
    (Er.init(e, t),
      A.init(e, t),
      (e.gte = (n, r) => e.check(ue(n, r))),
      (e.min = (n, r) => e.check(ue(n, r))),
      (e.gt = (n, r) => e.check(De(n, r))),
      (e.gte = (n, r) => e.check(ue(n, r))),
      (e.min = (n, r) => e.check(ue(n, r))),
      (e.lt = (n, r) => e.check(Ne(n, r))),
      (e.lte = (n, r) => e.check(he(n, r))),
      (e.max = (n, r) => e.check(he(n, r))),
      (e.positive = (n) => e.check(De(BigInt(0), n))),
      (e.negative = (n) => e.check(Ne(BigInt(0), n))),
      (e.nonpositive = (n) => e.check(he(BigInt(0), n))),
      (e.nonnegative = (n) => e.check(ue(BigInt(0), n))),
      (e.multipleOf = (n, r) => e.check(it(n, r))));
    let i = e._zod.bag;
    ((e.minValue = i.minimum ?? null),
      (e.maxValue = i.maximum ?? null),
      (e.format = i.format ?? null));
  });
  function Zx(e) {
    return uu(En, e);
  }
  var vc = h('ZodBigIntFormat', (e, t) => {
    (cs.init(e, t), En.init(e, t));
  });
  function Ex(e) {
    return lu(vc, e);
  }
  function Tx(e) {
    return du(vc, e);
  }
  var wp = h('ZodSymbol', (e, t) => {
    (ls.init(e, t), A.init(e, t));
  });
  function Ax(e) {
    return mu(wp, e);
  }
  var Sp = h('ZodUndefined', (e, t) => {
    (ds.init(e, t), A.init(e, t));
  });
  function Cx(e) {
    return pu(Sp, e);
  }
  var Ip = h('ZodNull', (e, t) => {
    (ms.init(e, t), A.init(e, t));
  });
  function zp(e) {
    return fu(Ip, e);
  }
  var jp = h('ZodAny', (e, t) => {
    (ps.init(e, t), A.init(e, t));
  });
  function Lx() {
    return vu(jp);
  }
  var Op = h('ZodUnknown', (e, t) => {
    (fs.init(e, t), A.init(e, t));
  });
  function Ct() {
    return gu(Op);
  }
  var Up = h('ZodNever', (e, t) => {
    (vs.init(e, t), A.init(e, t));
  });
  function gc(e) {
    return hu(Up, e);
  }
  var Pp = h('ZodVoid', (e, t) => {
    (gs.init(e, t), A.init(e, t));
  });
  function Rx(e) {
    return bu(Pp, e);
  }
  var bi = h('ZodDate', (e, t) => {
    (hs.init(e, t),
      A.init(e, t),
      (e.min = (n, r) => e.check(ue(n, r))),
      (e.max = (n, r) => e.check(he(n, r))));
    let i = e._zod.bag;
    ((e.minDate = i.minimum ? new Date(i.minimum) : null),
      (e.maxDate = i.maximum ? new Date(i.maximum) : null));
  });
  function Jx(e) {
    return yu(bi, e);
  }
  var Np = h('ZodArray', (e, t) => {
    (bs.init(e, t),
      A.init(e, t),
      (e.element = t.element),
      (e.min = (i, n) => e.check(Ke(i, n))),
      (e.nonempty = (i) => e.check(Ke(1, i))),
      (e.max = (i, n) => e.check(Et(i, n))),
      (e.length = (i, n) => e.check(Tt(i, n))),
      (e.unwrap = () => e.element));
  });
  function yi(e, t) {
    return zu(Np, e, t);
  }
  function Fx(e) {
    let t = e._zod.def.shape;
    return $c(Object.keys(t));
  }
  var $i = h('ZodObject', (e, t) => {
    (ys.init(e, t),
      A.init(e, t),
      O.defineLazy(e, 'shape', () => t.shape),
      (e.keyof = () => $c(Object.keys(e._zod.def.shape))),
      (e.catchall = (i) => e.clone({ ...e._zod.def, catchall: i })),
      (e.passthrough = () => e.clone({ ...e._zod.def, catchall: Ct() })),
      (e.loose = () => e.clone({ ...e._zod.def, catchall: Ct() })),
      (e.strict = () => e.clone({ ...e._zod.def, catchall: gc() })),
      (e.strip = () => e.clone({ ...e._zod.def, catchall: void 0 })),
      (e.extend = (i) => O.extend(e, i)),
      (e.safeExtend = (i) => O.safeExtend(e, i)),
      (e.merge = (i) => O.merge(e, i)),
      (e.pick = (i) => O.pick(e, i)),
      (e.omit = (i) => O.omit(e, i)),
      (e.partial = (...i) => O.partial(kc, e, i[0])),
      (e.required = (...i) => O.required(xc, e, i[0])));
  });
  function Vx(e, t) {
    let i = { type: 'object', shape: e ?? {}, ...O.normalizeParams(t) };
    return new $i(i);
  }
  function Mx(e, t) {
    return new $i({
      type: 'object',
      shape: e,
      catchall: gc(),
      ...O.normalizeParams(t),
    });
  }
  function Wx(e, t) {
    return new $i({
      type: 'object',
      shape: e,
      catchall: Ct(),
      ...O.normalizeParams(t),
    });
  }
  var hc = h('ZodUnion', (e, t) => {
    (Tr.init(e, t), A.init(e, t), (e.options = t.options));
  });
  function bc(e, t) {
    return new hc({ type: 'union', options: e, ...O.normalizeParams(t) });
  }
  var Dp = h('ZodDiscriminatedUnion', (e, t) => {
    (hc.init(e, t), $s.init(e, t));
  });
  function Bx(e, t, i) {
    return new Dp({
      type: 'union',
      options: t,
      discriminator: e,
      ...O.normalizeParams(i),
    });
  }
  var Zp = h('ZodIntersection', (e, t) => {
    (_s.init(e, t), A.init(e, t));
  });
  function Ep(e, t) {
    return new Zp({ type: 'intersection', left: e, right: t });
  }
  var Tp = h('ZodTuple', (e, t) => {
    (Ar.init(e, t),
      A.init(e, t),
      (e.rest = (i) => e.clone({ ...e._zod.def, rest: i })));
  });
  function Ap(e, t, i) {
    let n = t instanceof D,
      r = n ? i : t,
      o = n ? t : null;
    return new Tp({
      type: 'tuple',
      items: e,
      rest: o,
      ...O.normalizeParams(r),
    });
  }
  var yc = h('ZodRecord', (e, t) => {
    (ks.init(e, t),
      A.init(e, t),
      (e.keyType = t.keyType),
      (e.valueType = t.valueType));
  });
  function Cp(e, t, i) {
    return new yc({
      type: 'record',
      keyType: e,
      valueType: t,
      ...O.normalizeParams(i),
    });
  }
  function Gx(e, t, i) {
    let n = te(e);
    return (
      (n._zod.values = void 0),
      new yc({
        type: 'record',
        keyType: n,
        valueType: t,
        ...O.normalizeParams(i),
      })
    );
  }
  var Lp = h('ZodMap', (e, t) => {
    (xs.init(e, t),
      A.init(e, t),
      (e.keyType = t.keyType),
      (e.valueType = t.valueType));
  });
  function Kx(e, t, i) {
    return new Lp({
      type: 'map',
      keyType: e,
      valueType: t,
      ...O.normalizeParams(i),
    });
  }
  var Rp = h('ZodSet', (e, t) => {
    (ws.init(e, t),
      A.init(e, t),
      (e.min = (...i) => e.check(ot(...i))),
      (e.nonempty = (i) => e.check(ot(1, i))),
      (e.max = (...i) => e.check(Zt(...i))),
      (e.size = (...i) => e.check(hn(...i))));
  });
  function qx(e, t) {
    return new Rp({ type: 'set', valueType: e, ...O.normalizeParams(t) });
  }
  var Un = h('ZodEnum', (e, t) => {
    (Ss.init(e, t),
      A.init(e, t),
      (e.enum = t.entries),
      (e.options = Object.values(t.entries)));
    let i = new Set(Object.keys(t.entries));
    ((e.extract = (n, r) => {
      let o = {};
      for (let s of n)
        if (i.has(s)) o[s] = t.entries[s];
        else throw new Error(`Key ${s} not found in enum`);
      return new Un({ ...t, checks: [], ...O.normalizeParams(r), entries: o });
    }),
      (e.exclude = (n, r) => {
        let o = { ...t.entries };
        for (let s of n)
          if (i.has(s)) delete o[s];
          else throw new Error(`Key ${s} not found in enum`);
        return new Un({
          ...t,
          checks: [],
          ...O.normalizeParams(r),
          entries: o,
        });
      }));
  });
  function $c(e, t) {
    let i = Array.isArray(e) ? Object.fromEntries(e.map((n) => [n, n])) : e;
    return new Un({ type: 'enum', entries: i, ...O.normalizeParams(t) });
  }
  function Xx(e, t) {
    return new Un({ type: 'enum', entries: e, ...O.normalizeParams(t) });
  }
  var Jp = h('ZodLiteral', (e, t) => {
    (Is.init(e, t),
      A.init(e, t),
      (e.values = new Set(t.values)),
      Object.defineProperty(e, 'value', {
        get() {
          if (t.values.length > 1)
            throw new Error(
              'This schema contains multiple valid literal values. Use `.values` instead.',
            );
          return t.values[0];
        },
      }));
  });
  function Hx(e, t) {
    return new Jp({
      type: 'literal',
      values: Array.isArray(e) ? e : [e],
      ...O.normalizeParams(t),
    });
  }
  var Fp = h('ZodFile', (e, t) => {
    (zs.init(e, t),
      A.init(e, t),
      (e.min = (i, n) => e.check(ot(i, n))),
      (e.max = (i, n) => e.check(Zt(i, n))),
      (e.mime = (i, n) => e.check(wn(Array.isArray(i) ? i : [i], n))));
  });
  function Yx(e) {
    return ju(Fp, e);
  }
  var Vp = h('ZodTransform', (e, t) => {
    (js.init(e, t),
      A.init(e, t),
      (e._zod.parse = (i, n) => {
        if (n.direction === 'backward') throw new Fe(e.constructor.name);
        i.addIssue = (o) => {
          if (typeof o == 'string') i.issues.push(O.issue(o, i.value, t));
          else {
            let s = o;
            (s.fatal && (s.continue = !1),
              s.code ?? (s.code = 'custom'),
              s.input ?? (s.input = i.value),
              s.inst ?? (s.inst = e),
              i.issues.push(O.issue(s)));
          }
        };
        let r = t.transform(i.value, i);
        return r instanceof Promise
          ? r.then((o) => ((i.value = o), i))
          : ((i.value = r), i);
      }));
  });
  function _c(e) {
    return new Vp({ type: 'transform', transform: e });
  }
  var kc = h('ZodOptional', (e, t) => {
    (Os.init(e, t), A.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function fi(e) {
    return new kc({ type: 'optional', innerType: e });
  }
  var Mp = h('ZodNullable', (e, t) => {
    (Us.init(e, t), A.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function vi(e) {
    return new Mp({ type: 'nullable', innerType: e });
  }
  function Qx(e) {
    return fi(vi(e));
  }
  var Wp = h('ZodDefault', (e, t) => {
    (Ps.init(e, t),
      A.init(e, t),
      (e.unwrap = () => e._zod.def.innerType),
      (e.removeDefault = e.unwrap));
  });
  function Bp(e, t) {
    return new Wp({
      type: 'default',
      innerType: e,
      get defaultValue() {
        return typeof t == 'function' ? t() : O.shallowClone(t);
      },
    });
  }
  var Gp = h('ZodPrefault', (e, t) => {
    (Ns.init(e, t), A.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function Kp(e, t) {
    return new Gp({
      type: 'prefault',
      innerType: e,
      get defaultValue() {
        return typeof t == 'function' ? t() : O.shallowClone(t);
      },
    });
  }
  var xc = h('ZodNonOptional', (e, t) => {
    (Ds.init(e, t), A.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function qp(e, t) {
    return new xc({
      type: 'nonoptional',
      innerType: e,
      ...O.normalizeParams(t),
    });
  }
  var Xp = h('ZodSuccess', (e, t) => {
    (Zs.init(e, t), A.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function ew(e) {
    return new Xp({ type: 'success', innerType: e });
  }
  var Hp = h('ZodCatch', (e, t) => {
    (Es.init(e, t),
      A.init(e, t),
      (e.unwrap = () => e._zod.def.innerType),
      (e.removeCatch = e.unwrap));
  });
  function Yp(e, t) {
    return new Hp({
      type: 'catch',
      innerType: e,
      catchValue: typeof t == 'function' ? t : () => t,
    });
  }
  var Qp = h('ZodNaN', (e, t) => {
    (Ts.init(e, t), A.init(e, t));
  });
  function tw(e) {
    return _u(Qp, e);
  }
  var wc = h('ZodPipe', (e, t) => {
    (As.init(e, t), A.init(e, t), (e.in = t.in), (e.out = t.out));
  });
  function gi(e, t) {
    return new wc({ type: 'pipe', in: e, out: t });
  }
  var Sc = h('ZodCodec', (e, t) => {
    (wc.init(e, t), dn.init(e, t));
  });
  function nw(e, t, i) {
    return new Sc({
      type: 'pipe',
      in: e,
      out: t,
      transform: i.decode,
      reverseTransform: i.encode,
    });
  }
  var ef = h('ZodReadonly', (e, t) => {
    (Cs.init(e, t), A.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function tf(e) {
    return new ef({ type: 'readonly', innerType: e });
  }
  var nf = h('ZodTemplateLiteral', (e, t) => {
    (Ls.init(e, t), A.init(e, t));
  });
  function rw(e, t) {
    return new nf({
      type: 'template_literal',
      parts: e,
      ...O.normalizeParams(t),
    });
  }
  var rf = h('ZodLazy', (e, t) => {
    (Fs.init(e, t), A.init(e, t), (e.unwrap = () => e._zod.def.getter()));
  });
  function of(e) {
    return new rf({ type: 'lazy', getter: e });
  }
  var af = h('ZodPromise', (e, t) => {
    (Js.init(e, t), A.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function iw(e) {
    return new af({ type: 'promise', innerType: e });
  }
  var sf = h('ZodFunction', (e, t) => {
    (Rs.init(e, t), A.init(e, t));
  });
  function ow(e) {
    return new sf({
      type: 'function',
      input: Array.isArray(e?.input) ? Ap(e?.input) : (e?.input ?? yi(Ct())),
      output: e?.output ?? Ct(),
    });
  }
  var _i = h('ZodCustom', (e, t) => {
    (Vs.init(e, t), A.init(e, t));
  });
  function aw(e) {
    let t = new B({ check: 'custom' });
    return ((t._zod.check = e), t);
  }
  function sw(e, t) {
    return Ou(_i, e ?? (() => !0), t);
  }
  function uf(e, t = {}) {
    return Uu(_i, e, t);
  }
  function cf(e) {
    return Pu(e);
  }
  function uw(e, t = { error: `Input not instance of ${e.name}` }) {
    let i = new _i({
      type: 'custom',
      check: 'custom',
      fn: (n) => n instanceof e,
      abort: !0,
      ...O.normalizeParams(t),
    });
    return ((i._zod.bag.Class = e), i);
  }
  var cw = (...e) => Nu({ Codec: Sc, Boolean: Zn, String: Pn }, ...e);
  function lw(e) {
    let t = of(() => bc([Xu(e), kp(), xp(), zp(), yi(t), Cp(Xu(), t)]));
    return t;
  }
  function dw(e, t) {
    return gi(_c(e), t);
  }
  var mw = {
    invalid_type: 'invalid_type',
    too_big: 'too_big',
    too_small: 'too_small',
    invalid_format: 'invalid_format',
    not_multiple_of: 'not_multiple_of',
    unrecognized_keys: 'unrecognized_keys',
    invalid_union: 'invalid_union',
    invalid_key: 'invalid_key',
    invalid_element: 'invalid_element',
    invalid_value: 'invalid_value',
    custom: 'custom',
  };
  function pw(e) {
    q({ customError: e });
  }
  function fw() {
    return q().customError;
  }
  var Ic;
  Ic || (Ic = {});
  var zc = {};
  Je(zc, {
    bigint: () => bw,
    boolean: () => hw,
    date: () => yw,
    number: () => gw,
    string: () => vw,
  });
  function vw(e) {
    return Gs(Pn, e);
  }
  function gw(e) {
    return eu(Dn, e);
  }
  function hw(e) {
    return su(Zn, e);
  }
  function bw(e) {
    return cu(En, e);
  }
  function yw(e) {
    return $u(bi, e);
  }
  q(Cr());
  var $w = Object.defineProperty,
    ut = (e, t) => {
      for (var i in t) $w(e, i, { get: t[i], enumerable: !0 });
    };
  function Z(e, t, i = 'draft-7') {
    return d.toJSONSchema(e, { target: i });
  }
  var at = d.string(),
    _w = d.number(),
    TP = d.boolean(),
    Tn = d.string().min(1),
    jc = d.number().int().positive(),
    Oc = d.number().int().nonnegative(),
    mf = d.number().describe('Tagging version number'),
    kw = d.union([d.string(), d.number(), d.boolean()]),
    AP = kw.optional(),
    xw = {};
  ut(xw, {
    ErrorHandlerSchema: () => ct,
    HandlerSchema: () => vf,
    LogHandlerSchema: () => Rt,
    StorageSchema: () => ff,
    StorageTypeSchema: () => pf,
    errorHandlerJsonSchema: () => Iw,
    handlerJsonSchema: () => jw,
    logHandlerJsonSchema: () => zw,
    storageJsonSchema: () => Sw,
    storageTypeJsonSchema: () => ww,
  });
  var pf = d
      .enum(['local', 'session', 'cookie'])
      .describe('Storage mechanism: local, session, or cookie'),
    ff = d
      .object({
        Local: d.literal('local'),
        Session: d.literal('session'),
        Cookie: d.literal('cookie'),
      })
      .describe('Storage type constants for type-safe references'),
    ct = d.any().describe('Error handler function: (error, state?) => void'),
    Rt = d.any().describe('Log handler function: (message, verbose?) => void'),
    vf = d
      .object({
        Error: ct.describe('Error handler function'),
        Log: Rt.describe('Log handler function'),
      })
      .describe('Handler interface with error and log functions'),
    ww = Z(pf),
    Sw = Z(ff),
    Iw = Z(ct),
    zw = Z(Rt),
    jw = Z(vf),
    CP = d
      .object({
        onError: ct
          .optional()
          .describe('Error handler function: (error, state?) => void'),
        onLog: Rt.optional().describe(
          'Log handler function: (message, verbose?) => void',
        ),
      })
      .partial(),
    LP = d
      .object({
        verbose: d
          .boolean()
          .describe('Enable verbose logging for debugging')
          .optional(),
      })
      .partial(),
    RP = d
      .object({
        queue: d
          .boolean()
          .describe('Whether to queue events when consent is not granted')
          .optional(),
      })
      .partial(),
    JP = d.object({}).partial(),
    FP = d
      .object({
        init: d
          .boolean()
          .describe('Whether to initialize immediately')
          .optional(),
        loadScript: d
          .boolean()
          .describe('Whether to load external script (for web destinations)')
          .optional(),
      })
      .partial(),
    VP = d
      .object({
        disabled: d.boolean().describe('Set to true to disable').optional(),
      })
      .partial(),
    MP = d
      .object({
        primary: d
          .boolean()
          .describe('Mark as primary (only one can be primary)')
          .optional(),
      })
      .partial(),
    WP = d
      .object({
        settings: d
          .any()
          .optional()
          .describe('Implementation-specific configuration'),
      })
      .partial(),
    BP = d
      .object({
        env: d
          .any()
          .optional()
          .describe('Environment dependencies (platform-specific)'),
      })
      .partial();
  var GP = d
      .object({
        type: d.string().optional().describe('Instance type identifier'),
        config: d.unknown().describe('Instance configuration'),
      })
      .partial(),
    KP = d
      .object({
        collector: d.unknown().describe('Collector instance (runtime object)'),
        config: d.unknown().describe('Configuration'),
        env: d.unknown().describe('Environment dependencies'),
      })
      .partial(),
    qP = d
      .object({
        batch: d
          .number()
          .optional()
          .describe('Batch size: bundle N events for batch processing'),
        batched: d
          .unknown()
          .optional()
          .describe('Batch of events to be processed'),
      })
      .partial(),
    XP = d
      .object({
        ignore: d
          .boolean()
          .describe('Set to true to skip processing')
          .optional(),
        condition: d
          .string()
          .optional()
          .describe('Condition function: return true to process'),
      })
      .partial(),
    HP = d
      .object({
        sources: d
          .record(d.string(), d.unknown())
          .describe('Map of source instances'),
      })
      .partial(),
    YP = d
      .object({
        destinations: d
          .record(d.string(), d.unknown())
          .describe('Map of destination instances'),
      })
      .partial(),
    Ow = {};
  ut(Ow, {
    ConsentSchema: () => Ce,
    DeepPartialEventSchema: () => Uw,
    EntitiesSchema: () => yf,
    EntitySchema: () => Si,
    EventSchema: () => xe,
    OrderedPropertiesSchema: () => wi,
    PartialEventSchema: () => $f,
    PropertiesSchema: () => ne,
    PropertySchema: () => xi,
    PropertyTypeSchema: () => Uc,
    SourceSchema: () => bf,
    SourceTypeSchema: () => Nc,
    UserSchema: () => Cn,
    VersionSchema: () => hf,
    consentJsonSchema: () => Cw,
    entityJsonSchema: () => Tw,
    eventJsonSchema: () => Pw,
    orderedPropertiesJsonSchema: () => Ew,
    partialEventJsonSchema: () => Nw,
    propertiesJsonSchema: () => Zw,
    sourceTypeJsonSchema: () => Aw,
    userJsonSchema: () => Dw,
  });
  var gf,
    Uc = d.lazy(() =>
      d.union([d.boolean(), d.string(), d.number(), d.record(d.string(), xi)]),
    ),
    xi = d.lazy(() => d.union([Uc, d.array(Uc)])),
    ne = d
      .record(d.string(), xi.optional())
      .describe('Flexible property collection with optional values'),
    wi = d
      .record(d.string(), d.tuple([xi, d.number()]).optional())
      .describe(
        'Ordered properties with [value, order] tuples for priority control',
      ),
    Nc = d
      .union([d.enum(['web', 'server', 'app', 'other']), d.string()])
      .describe('Source type: web, server, app, other, or custom'),
    Ce = d
      .record(d.string(), d.boolean())
      .describe('Consent requirement mapping (group name → state)'),
    Cn = ne
      .and(
        d.object({
          id: d.string().optional().describe('User identifier'),
          device: d.string().optional().describe('Device identifier'),
          session: d.string().optional().describe('Session identifier'),
          hash: d.string().optional().describe('Hashed identifier'),
          address: d.string().optional().describe('User address'),
          email: d.string().email().optional().describe('User email address'),
          phone: d.string().optional().describe('User phone number'),
          userAgent: d
            .string()
            .optional()
            .describe('Browser user agent string'),
          browser: d.string().optional().describe('Browser name'),
          browserVersion: d.string().optional().describe('Browser version'),
          deviceType: d
            .string()
            .optional()
            .describe('Device type (mobile, desktop, tablet)'),
          os: d.string().optional().describe('Operating system'),
          osVersion: d.string().optional().describe('Operating system version'),
          screenSize: d.string().optional().describe('Screen dimensions'),
          language: d.string().optional().describe('User language'),
          country: d.string().optional().describe('User country'),
          region: d.string().optional().describe('User region/state'),
          city: d.string().optional().describe('User city'),
          zip: d.string().optional().describe('User postal code'),
          timezone: d.string().optional().describe('User timezone'),
          ip: d.string().optional().describe('User IP address'),
          internal: d
            .boolean()
            .optional()
            .describe('Internal user flag (employee, test user)'),
        }),
      )
      .describe('User identification and properties'),
    hf = ne
      .and(
        d.object({
          source: at.describe('Walker implementation version (e.g., "2.0.0")'),
          tagging: mf,
        }),
      )
      .describe('Walker version information'),
    bf = ne
      .and(
        d.object({
          type: Nc.describe('Source type identifier'),
          id: at.describe('Source identifier (typically URL on web)'),
          previous_id: at.describe(
            'Previous source identifier (typically referrer on web)',
          ),
        }),
      )
      .describe('Event source information'),
    Si = d
      .lazy(() =>
        d.object({
          entity: d.string().describe('Entity name'),
          data: ne.describe('Entity-specific properties'),
          nested: d.array(Si).describe('Nested child entities'),
          context: wi.describe('Entity context data'),
        }),
      )
      .describe('Nested entity structure with recursive nesting support'),
    yf = d.array(Si).describe('Array of nested entities'),
    xe = d
      .object({
        name: d
          .string()
          .describe(
            'Event name in "entity action" format (e.g., "page view", "product add")',
          ),
        data: ne.describe('Event-specific properties'),
        context: wi.describe('Ordered context properties with priorities'),
        globals: ne.describe('Global properties shared across events'),
        custom: ne.describe('Custom implementation-specific properties'),
        user: Cn.describe('User identification and attributes'),
        nested: yf.describe('Related nested entities'),
        consent: Ce.describe('Consent states at event time'),
        id: Tn.describe('Unique event identifier (timestamp-based)'),
        trigger: at.describe('Event trigger identifier'),
        entity: at.describe('Parsed entity from event name'),
        action: at.describe('Parsed action from event name'),
        timestamp: jc.describe('Unix timestamp in milliseconds since epoch'),
        timing: _w.describe('Event processing timing information'),
        group: at.describe('Event grouping identifier'),
        count: Oc.describe('Event count in session'),
        version: hf.describe('Walker version information'),
        source: bf.describe('Event source information'),
      })
      .describe('Complete walkerOS event structure'),
    $f = xe
      .partial()
      .describe('Partial event structure with all fields optional'),
    Uw = xe
      .partial()
      .describe('Partial event structure with all top-level fields optional'),
    Pw = Z(xe),
    Nw = Z($f),
    Dw = Z(Cn),
    Zw = Z(ne),
    Ew = Z(wi),
    Tw = Z(Si),
    Aw = Z(Nc),
    Cw = Z(Ce),
    Lw = {};
  ut(Lw, {
    ConfigSchema: () => ji,
    LoopSchema: () => Dc,
    MapSchema: () => Ec,
    PolicySchema: () => Jt,
    ResultSchema: () => Rw,
    RuleSchema: () => qe,
    RulesSchema: () => zi,
    SetSchema: () => Zc,
    ValueConfigSchema: () => _f,
    ValueSchema: () => be,
    ValuesSchema: () => Ii,
    configJsonSchema: () => qw,
    loopJsonSchema: () => Vw,
    mapJsonSchema: () => Ww,
    policyJsonSchema: () => Bw,
    ruleJsonSchema: () => Gw,
    rulesJsonSchema: () => Kw,
    setJsonSchema: () => Mw,
    valueConfigJsonSchema: () => Fw,
    valueJsonSchema: () => Jw,
  });
  var be = d.lazy(() =>
      d.union([
        d.string().describe('String value or property path (e.g., "data.id")'),
        d.number().describe('Numeric value'),
        d.boolean().describe('Boolean value'),
        d.lazy(() => gf),
        d.array(be).describe('Array of values'),
      ]),
    ),
    Ii = d.array(be).describe('Array of transformation values'),
    Dc = d.lazy(() =>
      d
        .tuple([be, be])
        .describe(
          'Loop transformation: [source, transform] tuple for array processing',
        ),
    ),
    Zc = d.lazy(() =>
      d.array(be).describe('Set: Array of values for selection or combination'),
    ),
    Ec = d.lazy(() =>
      d
        .record(d.string(), be)
        .describe('Map: Object mapping keys to transformation values'),
    ),
    _f = (gf = d
      .object({
        key: d
          .string()
          .optional()
          .describe(
            'Property path to extract from event (e.g., "data.id", "user.email")',
          ),
        value: d
          .union([d.string(), d.number(), d.boolean()])
          .optional()
          .describe('Static primitive value'),
        fn: d
          .string()
          .optional()
          .describe('Custom transformation function as string (serialized)'),
        map: Ec.optional().describe(
          'Object mapping: transform event data to structured output',
        ),
        loop: Dc.optional().describe(
          'Loop transformation: [source, transform] for array processing',
        ),
        set: Zc.optional().describe(
          'Set of values: combine or select from multiple values',
        ),
        consent: Ce.optional().describe(
          'Required consent states to include this value',
        ),
        condition: d
          .string()
          .optional()
          .describe(
            'Condition function as string: return true to include value',
          ),
        validate: d
          .string()
          .optional()
          .describe(
            'Validation function as string: return true if value is valid',
          ),
      })
      .refine((e) => Object.keys(e).length > 0, {
        message: 'ValueConfig must have at least one property',
      })
      .describe('Value transformation configuration with multiple strategies')),
    Jt = d
      .record(d.string(), be)
      .describe('Policy rules for event pre-processing (key → value mapping)'),
    qe = d
      .object({
        batch: d
          .number()
          .optional()
          .describe('Batch size: bundle N events for batch processing'),
        condition: d
          .string()
          .optional()
          .describe(
            'Condition function as string: return true to process event',
          ),
        consent: Ce.optional().describe(
          'Required consent states to process this event',
        ),
        settings: d
          .any()
          .optional()
          .describe('Destination-specific settings for this event mapping'),
        data: d
          .union([be, Ii])
          .optional()
          .describe('Data transformation rules for event'),
        ignore: d
          .boolean()
          .optional()
          .describe('Set to true to skip processing this event'),
        name: d
          .string()
          .optional()
          .describe(
            'Custom event name override (e.g., "view_item" for "product view")',
          ),
        policy: Jt.optional().describe(
          'Event-level policy overrides (applied after config-level policy)',
        ),
      })
      .describe('Mapping rule for specific entity-action combination'),
    zi = d
      .record(
        d.string(),
        d.record(d.string(), d.union([qe, d.array(qe)])).optional(),
      )
      .describe(
        'Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support',
      ),
    ji = d
      .object({
        consent: Ce.optional().describe(
          'Required consent states to process any events',
        ),
        data: d
          .union([be, Ii])
          .optional()
          .describe('Global data transformation applied to all events'),
        mapping: zi.optional().describe('Entity-action specific mapping rules'),
        policy: Jt.optional().describe(
          'Pre-processing policy rules applied before mapping',
        ),
      })
      .describe('Shared mapping configuration for sources and destinations'),
    Rw = d
      .object({
        eventMapping: qe.optional().describe('Resolved mapping rule for event'),
        mappingKey: d
          .string()
          .optional()
          .describe('Mapping key used (e.g., "product.view")'),
      })
      .describe('Mapping resolution result'),
    Jw = Z(be),
    Fw = Z(_f),
    Vw = Z(Dc),
    Mw = Z(Zc),
    Ww = Z(Ec),
    Bw = Z(Jt),
    Gw = Z(qe),
    Kw = Z(zi),
    qw = Z(ji),
    Xw = {};
  ut(Xw, {
    BatchSchema: () => xf,
    ConfigSchema: () => Ln,
    ContextSchema: () => Ac,
    DLQSchema: () => iS,
    DataSchema: () => eS,
    DestinationPolicySchema: () => Hw,
    DestinationsSchema: () => nS,
    InitDestinationsSchema: () => tS,
    InitSchema: () => wf,
    InstanceSchema: () => Rn,
    PartialConfigSchema: () => Tc,
    PushBatchContextSchema: () => Yw,
    PushContextSchema: () => Cc,
    PushEventSchema: () => kf,
    PushEventsSchema: () => Qw,
    PushResultSchema: () => rS,
    RefSchema: () => ki,
    ResultSchema: () => Sf,
    batchJsonSchema: () => cS,
    configJsonSchema: () => oS,
    contextJsonSchema: () => sS,
    instanceJsonSchema: () => lS,
    partialConfigJsonSchema: () => aS,
    pushContextJsonSchema: () => uS,
    resultJsonSchema: () => dS,
  });
  var Ln = d
      .object({
        consent: Ce.optional().describe(
          'Required consent states to send events to this destination',
        ),
        settings: d
          .any()
          .describe('Implementation-specific configuration')
          .optional(),
        data: d
          .union([be, Ii])
          .optional()
          .describe(
            'Global data transformation applied to all events for this destination',
          ),
        env: d
          .any()
          .describe('Environment dependencies (platform-specific)')
          .optional(),
        id: Tn.describe(
          'Destination instance identifier (defaults to destination key)',
        ).optional(),
        init: d
          .boolean()
          .describe('Whether to initialize immediately')
          .optional(),
        loadScript: d
          .boolean()
          .describe('Whether to load external script (for web destinations)')
          .optional(),
        mapping: zi
          .optional()
          .describe(
            'Entity-action specific mapping rules for this destination',
          ),
        policy: Jt.optional().describe(
          'Pre-processing policy rules applied before event mapping',
        ),
        queue: d
          .boolean()
          .describe('Whether to queue events when consent is not granted')
          .optional(),
        verbose: d
          .boolean()
          .describe('Enable verbose logging for debugging')
          .optional(),
        onError: ct.optional(),
        onLog: Rt.optional(),
      })
      .describe('Destination configuration'),
    Tc = Ln.partial().describe(
      'Partial destination configuration with all fields optional',
    ),
    Hw = Jt.describe('Destination policy rules for event pre-processing'),
    Ac = d
      .object({
        collector: d.unknown().describe('Collector instance (runtime object)'),
        config: Ln.describe('Destination configuration'),
        data: d
          .union([d.unknown(), d.array(d.unknown())])
          .optional()
          .describe('Transformed event data'),
        env: d.unknown().describe('Environment dependencies'),
      })
      .describe('Destination context for init and push functions'),
    Cc = Ac.extend({
      mapping: qe
        .optional()
        .describe('Resolved mapping rule for this specific event'),
    }).describe('Push context with event-specific mapping'),
    Yw = Cc.describe('Batch push context with event-specific mapping'),
    kf = d
      .object({
        event: xe.describe('The event to process'),
        mapping: qe.optional().describe('Mapping rule for this event'),
      })
      .describe('Event with optional mapping for batch processing'),
    Qw = d.array(kf).describe('Array of events with mappings'),
    xf = d
      .object({
        key: d
          .string()
          .describe('Batch key (usually mapping key like "product.view")'),
        events: d.array(xe).describe('Array of events in batch'),
        data: d
          .array(d.union([d.unknown(), d.array(d.unknown())]).optional())
          .describe('Transformed data for each event'),
        mapping: qe.optional().describe('Shared mapping rule for batch'),
      })
      .describe('Batch of events grouped by mapping key'),
    eS = d
      .union([d.unknown(), d.array(d.unknown())])
      .optional()
      .describe('Transformed event data (Property, undefined, or array)'),
    Rn = d
      .object({
        config: Ln.describe('Destination configuration'),
        queue: d
          .array(xe)
          .optional()
          .describe('Queued events awaiting consent'),
        dlq: d
          .array(d.tuple([xe, d.unknown()]))
          .optional()
          .describe('Dead letter queue (failed events with errors)'),
        type: d.string().optional().describe('Destination type identifier'),
        env: d.unknown().optional().describe('Environment dependencies'),
        init: d.unknown().optional().describe('Initialization function'),
        push: d.unknown().describe('Push function for single events'),
        pushBatch: d.unknown().optional().describe('Batch push function'),
        on: d.unknown().optional().describe('Event lifecycle hook function'),
      })
      .describe('Destination instance (runtime object with functions)'),
    wf = d
      .object({
        code: Rn.describe('Destination instance with implementation'),
        config: Tc.optional().describe('Partial configuration overrides'),
        env: d.unknown().optional().describe('Partial environment overrides'),
      })
      .describe('Destination initialization configuration'),
    tS = d
      .record(d.string(), wf)
      .describe('Map of destination IDs to initialization configurations'),
    nS = d
      .record(d.string(), Rn)
      .describe('Map of destination IDs to runtime instances'),
    ki = d
      .object({
        id: d.string().describe('Destination ID'),
        destination: Rn.describe('Destination instance'),
      })
      .describe('Destination reference (ID + instance)'),
    rS = d
      .object({
        queue: d
          .array(xe)
          .optional()
          .describe('Events queued (awaiting consent)'),
        error: d.unknown().optional().describe('Error if push failed'),
      })
      .describe('Push operation result'),
    Sf = d
      .object({
        successful: d
          .array(ki)
          .describe('Destinations that processed successfully'),
        queued: d.array(ki).describe('Destinations that queued events'),
        failed: d.array(ki).describe('Destinations that failed to process'),
      })
      .describe('Overall destination processing result'),
    iS = d
      .array(d.tuple([xe, d.unknown()]))
      .describe('Dead letter queue: [(event, error), ...]'),
    oS = Z(Ln),
    aS = Z(Tc),
    sS = Z(Ac),
    uS = Z(Cc),
    cS = Z(xf),
    lS = Z(Rn),
    dS = Z(Sf),
    mS = {};
  ut(mS, {
    CommandTypeSchema: () => If,
    ConfigSchema: () => Oi,
    DestinationsSchema: () => Uf,
    InitConfigSchema: () => zf,
    InstanceSchema: () => Pf,
    PushContextSchema: () => jf,
    SessionDataSchema: () => Lc,
    SourcesSchema: () => Of,
    commandTypeJsonSchema: () => pS,
    configJsonSchema: () => fS,
    initConfigJsonSchema: () => gS,
    instanceJsonSchema: () => bS,
    pushContextJsonSchema: () => hS,
    sessionDataJsonSchema: () => vS,
  });
  var If = d
      .union([
        d.enum([
          'action',
          'config',
          'consent',
          'context',
          'destination',
          'elb',
          'globals',
          'hook',
          'init',
          'link',
          'run',
          'user',
          'walker',
        ]),
        d.string(),
      ])
      .describe(
        'Collector command type: standard commands or custom string for extensions',
      ),
    Oi = d
      .object({
        run: d
          .boolean()
          .describe('Whether to run collector automatically on initialization')
          .optional(),
        tagging: mf,
        globalsStatic: ne.describe(
          'Static global properties that persist across collector runs',
        ),
        sessionStatic: d
          .record(d.string(), d.unknown())
          .describe('Static session data that persists across collector runs'),
        verbose: d.boolean().describe('Enable verbose logging for debugging'),
        onError: ct.optional(),
        onLog: Rt.optional(),
      })
      .describe('Core collector configuration'),
    Lc = ne
      .and(
        d.object({
          isStart: d.boolean().describe('Whether this is a new session start'),
          storage: d.boolean().describe('Whether storage is available'),
          id: Tn.describe('Session identifier').optional(),
          start: jc.describe('Session start timestamp').optional(),
          marketing: d
            .literal(!0)
            .optional()
            .describe('Marketing attribution flag'),
          updated: jc.describe('Last update timestamp').optional(),
          isNew: d
            .boolean()
            .describe('Whether this is a new session')
            .optional(),
          device: Tn.describe('Device identifier').optional(),
          count: Oc.describe('Event count in session').optional(),
          runs: Oc.describe('Number of runs').optional(),
        }),
      )
      .describe('Session state and tracking data'),
    zf = Oi.partial()
      .extend({
        consent: Ce.optional().describe('Initial consent state'),
        user: Cn.optional().describe('Initial user data'),
        globals: ne.optional().describe('Initial global properties'),
        sources: d.unknown().optional().describe('Source configurations'),
        destinations: d
          .unknown()
          .optional()
          .describe('Destination configurations'),
        custom: ne
          .optional()
          .describe('Initial custom implementation-specific properties'),
      })
      .describe('Collector initialization configuration with initial state'),
    jf = d
      .object({
        mapping: ji.optional().describe('Source-level mapping configuration'),
      })
      .describe('Push context with optional source mapping'),
    Of = d
      .record(d.string(), d.unknown())
      .describe('Map of source IDs to source instances'),
    Uf = d
      .record(d.string(), d.unknown())
      .describe('Map of destination IDs to destination instances'),
    Pf = d
      .object({
        push: d.unknown().describe('Push function for processing events'),
        command: d.unknown().describe('Command function for walker commands'),
        allowed: d.boolean().describe('Whether event processing is allowed'),
        config: Oi.describe('Current collector configuration'),
        consent: Ce.describe('Current consent state'),
        count: d.number().describe('Event count (increments with each event)'),
        custom: ne.describe('Custom implementation-specific properties'),
        sources: Of.describe('Registered source instances'),
        destinations: Uf.describe('Registered destination instances'),
        globals: ne.describe('Current global properties'),
        group: d.string().describe('Event grouping identifier'),
        hooks: d.unknown().describe('Lifecycle hook functions'),
        on: d.unknown().describe('Event lifecycle configuration'),
        queue: d.array(xe).describe('Queued events awaiting processing'),
        round: d
          .number()
          .describe('Collector run count (increments with each run)'),
        session: d.union([Lc]).describe('Current session state'),
        timing: d.number().describe('Event processing timing information'),
        user: Cn.describe('Current user data'),
        version: d.string().describe('Walker implementation version'),
      })
      .describe('Collector instance with state and methods'),
    pS = Z(If),
    fS = Z(Oi),
    vS = Z(Lc),
    gS = Z(zf),
    hS = Z(jf),
    bS = Z(Pf),
    yS = {};
  ut(yS, {
    BaseEnvSchema: () => Ui,
    ConfigSchema: () => Pi,
    InitSchema: () => Df,
    InitSourceSchema: () => Jc,
    InitSourcesSchema: () => Zf,
    InstanceSchema: () => Nf,
    PartialConfigSchema: () => Rc,
    baseEnvJsonSchema: () => $S,
    configJsonSchema: () => _S,
    initSourceJsonSchema: () => wS,
    initSourcesJsonSchema: () => SS,
    instanceJsonSchema: () => xS,
    partialConfigJsonSchema: () => kS,
  });
  var Ui = d
      .object({
        push: d.unknown().describe('Collector push function'),
        command: d.unknown().describe('Collector command function'),
        sources: d
          .unknown()
          .optional()
          .describe('Map of registered source instances'),
        elb: d
          .unknown()
          .describe('Public API function (alias for collector.push)'),
      })
      .catchall(d.unknown())
      .describe(
        'Base environment for dependency injection - platform-specific sources extend this',
      ),
    Pi = ji
      .extend({
        settings: d
          .any()
          .describe('Implementation-specific configuration')
          .optional(),
        env: Ui.optional().describe(
          'Environment dependencies (platform-specific)',
        ),
        id: Tn.describe(
          'Source identifier (defaults to source key)',
        ).optional(),
        onError: ct.optional(),
        disabled: d.boolean().describe('Set to true to disable').optional(),
        primary: d
          .boolean()
          .describe('Mark as primary (only one can be primary)')
          .optional(),
      })
      .describe('Source configuration with mapping and environment'),
    Rc = Pi.partial().describe(
      'Partial source configuration with all fields optional',
    ),
    Nf = d
      .object({
        type: d
          .string()
          .describe('Source type identifier (e.g., "browser", "dataLayer")'),
        config: Pi.describe('Current source configuration'),
        push: d
          .any()
          .describe(
            'Push function - THE HANDLER (flexible signature for platform compatibility)',
          ),
        destroy: d
          .any()
          .optional()
          .describe('Cleanup function called when source is removed'),
        on: d
          .unknown()
          .optional()
          .describe('Lifecycle hook function for event types'),
      })
      .describe('Source instance with push handler and lifecycle methods'),
    Df = d
      .any()
      .describe(
        'Source initialization function: (config, env) => Instance | Promise<Instance>',
      ),
    Jc = d
      .object({
        code: Df.describe('Source initialization function'),
        config: Rc.optional().describe('Partial configuration overrides'),
        env: Ui.partial().optional().describe('Partial environment overrides'),
        primary: d
          .boolean()
          .optional()
          .describe('Mark as primary source (only one can be primary)'),
      })
      .describe('Source initialization configuration'),
    Zf = d
      .record(d.string(), Jc)
      .describe('Map of source IDs to initialization configurations'),
    $S = Z(Ui),
    _S = Z(Pi),
    kS = Z(Rc),
    xS = Z(Nf),
    wS = Z(Jc),
    SS = Z(Zf),
    IS = {};
  ut(IS, {
    ConfigSchema: () => Jn,
    DestinationReferenceSchema: () => Vc,
    PrimitiveSchema: () => Ef,
    SetupSchema: () => Ni,
    SourceReferenceSchema: () => Fc,
    configJsonSchema: () => NS,
    destinationReferenceJsonSchema: () => ZS,
    parseConfig: () => OS,
    parseSetup: () => zS,
    safeParseConfig: () => US,
    safeParseSetup: () => jS,
    setupJsonSchema: () => PS,
    sourceReferenceJsonSchema: () => DS,
  });
  var Ef = d
      .union([d.string(), d.number(), d.boolean()])
      .describe('Primitive value: string, number, or boolean'),
    Fc = d
      .object({
        package: d
          .string()
          .min(1, 'Package name cannot be empty')
          .describe(
            'Package specifier with optional version (e.g., "@walkeros/web-source-browser@2.0.0")',
          ),
        config: d
          .unknown()
          .optional()
          .describe('Source-specific configuration object'),
        env: d
          .unknown()
          .optional()
          .describe('Source environment configuration'),
        primary: d
          .boolean()
          .optional()
          .describe(
            'Mark as primary source (provides main elb). Only one source should be primary.',
          ),
      })
      .describe('Source package reference with configuration'),
    Vc = d
      .object({
        package: d
          .string()
          .min(1, 'Package name cannot be empty')
          .describe(
            'Package specifier with optional version (e.g., "@walkeros/web-destination-gtag@2.0.0")',
          ),
        config: d
          .unknown()
          .optional()
          .describe('Destination-specific configuration object'),
        env: d
          .unknown()
          .optional()
          .describe('Destination environment configuration'),
      })
      .describe('Destination package reference with configuration'),
    Jn = d
      .object({
        platform: d
          .enum(['web', 'server'], {
            error: 'Platform must be "web" or "server"',
          })
          .describe(
            'Target platform: "web" for browser-based tracking, "server" for Node.js server-side collection',
          ),
        sources: d
          .record(d.string(), Fc)
          .optional()
          .describe(
            'Source configurations (data capture) keyed by unique identifier',
          ),
        destinations: d
          .record(d.string(), Vc)
          .optional()
          .describe(
            'Destination configurations (data output) keyed by unique identifier',
          ),
        collector: d
          .unknown()
          .optional()
          .describe(
            'Collector configuration for event processing (uses Collector.InitConfig)',
          ),
        env: d
          .record(d.string(), d.string())
          .optional()
          .describe(
            'Environment-specific variables (override root-level variables)',
          ),
      })
      .passthrough()
      .describe('Single environment configuration for one deployment target'),
    Ni = d
      .object({
        version: d
          .literal(1, { error: 'Only version 1 is currently supported' })
          .describe(
            'Configuration schema version (currently only 1 is supported)',
          ),
        $schema: d
          .string()
          .url('Schema URL must be a valid URL')
          .optional()
          .describe(
            'JSON Schema reference for IDE validation (e.g., "https://walkeros.io/schema/flow/v1.json")',
          ),
        variables: d
          .record(d.string(), Ef)
          .optional()
          .describe(
            'Shared variables for interpolation across all environments (use ${VAR_NAME:default} syntax)',
          ),
        definitions: d
          .record(d.string(), d.unknown())
          .optional()
          .describe(
            'Reusable configuration definitions (reference with JSON Schema $ref syntax)',
          ),
        environments: d
          .record(d.string(), Jn)
          .refine((e) => Object.keys(e).length > 0, {
            message: 'At least one environment is required',
          })
          .describe(
            'Named environment configurations (e.g., web_prod, server_stage)',
          ),
      })
      .describe(
        'Complete multi-environment walkerOS configuration (walkeros.config.json)',
      );
  function zS(e) {
    return Ni.parse(e);
  }
  function jS(e) {
    return Ni.safeParse(e);
  }
  function OS(e) {
    return Jn.parse(e);
  }
  function US(e) {
    return Jn.safeParse(e);
  }
  var PS = d.toJSONSchema(Ni, { target: 'draft-7' }),
    NS = Z(Jn),
    DS = Z(Fc),
    ZS = Z(Vc);
  var ES = { merge: !0, shallow: !0, extend: !0 };
  function Y(e, t = {}, i = {}) {
    i = { ...ES, ...i };
    let n = Object.entries(t).reduce((r, [o, s]) => {
      let u = e[o];
      return (
        i.merge && Array.isArray(u) && Array.isArray(s)
          ? (r[o] = s.reduce((a, c) => (a.includes(c) ? a : [...a, c]), [...u]))
          : (i.extend || o in e) && (r[o] = s),
        r
      );
    }, {});
    return i.shallow ? { ...e, ...n } : (Object.assign(e, n), e);
  }
  function Ae(e) {
    return Array.isArray(e);
  }
  function TS(e) {
    return typeof e == 'boolean';
  }
  function Pe(e) {
    return e !== void 0;
  }
  function Tf(e) {
    return typeof e == 'function';
  }
  function AS(e) {
    return typeof e == 'number' && !Number.isNaN(e);
  }
  function re(e) {
    return (
      typeof e == 'object' &&
      e !== null &&
      !Ae(e) &&
      Object.prototype.toString.call(e) === '[object Object]'
    );
  }
  function Di(e) {
    return typeof e == 'string';
  }
  function An(e, t = new WeakMap()) {
    if (typeof e != 'object' || e === null) return e;
    if (t.has(e)) return t.get(e);
    let i = Object.prototype.toString.call(e);
    if (i === '[object Object]') {
      let n = {};
      t.set(e, n);
      for (let r in e)
        Object.prototype.hasOwnProperty.call(e, r) && (n[r] = An(e[r], t));
      return n;
    }
    if (i === '[object Array]') {
      let n = [];
      return (
        t.set(e, n),
        e.forEach((r) => {
          n.push(An(r, t));
        }),
        n
      );
    }
    if (i === '[object Date]') return new Date(e.getTime());
    if (i === '[object RegExp]') {
      let n = e;
      return new RegExp(n.source, n.flags);
    }
    return e;
  }
  function Af(e, t = '', i) {
    let n = t.split('.'),
      r = e;
    for (let o = 0; o < n.length; o++) {
      let s = n[o];
      if (s === '*' && Ae(r)) {
        let u = n.slice(o + 1).join('.'),
          a = [];
        for (let c of r) {
          let m = Af(c, u, i);
          a.push(m);
        }
        return a;
      }
      if (((r = r instanceof Object ? r[s] : void 0), !r)) break;
    }
    return Pe(r) ? r : i;
  }
  function lf(e, t, i) {
    if (!re(e)) return e;
    let n = An(e),
      r = t.split('.'),
      o = n;
    for (let s = 0; s < r.length; s++) {
      let u = r[s];
      s === r.length - 1
        ? (o[u] = i)
        : ((u in o && typeof o[u] == 'object' && o[u] !== null) || (o[u] = {}),
          (o = o[u]));
    }
    return n;
  }
  function Fn(e, t = {}, i = {}) {
    let n = { ...t, ...i },
      r = {},
      o = e === void 0;
    return (
      Object.keys(n).forEach((s) => {
        n[s] && ((r[s] = !0), e && e[s] && (o = !0));
      }),
      !!o && r
    );
  }
  function Zi(e = 6) {
    let t = '';
    for (let i = 36; t.length < e; ) t += ((Math.random() * i) | 0).toString(i);
    return t;
  }
  function Cf(e, t = 1e3, i = !1) {
    let n,
      r = null,
      o = !1;
    return (...s) =>
      new Promise((u) => {
        let a = i && !o;
        (r && clearTimeout(r),
          (r = setTimeout(() => {
            ((r = null), (i && !o) || ((n = e(...s)), u(n)));
          }, t)),
          a && ((o = !0), (n = e(...s)), u(n)));
      });
  }
  function Pc(e) {
    return (
      TS(e) ||
      Di(e) ||
      AS(e) ||
      !Pe(e) ||
      (Ae(e) && e.every(Pc)) ||
      (re(e) && Object.values(e).every(Pc))
    );
  }
  function df(e) {
    return Pc(e) ? e : void 0;
  }
  function Ft(e, t, i) {
    return function (...n) {
      try {
        return e(...n);
      } catch (r) {
        return t ? t(r) : void 0;
      } finally {
        i?.();
      }
    };
  }
  function me(e, t, i) {
    return async function (...n) {
      try {
        return await e(...n);
      } catch (r) {
        return t ? await t(r) : void 0;
      } finally {
        await i?.();
      }
    };
  }
  async function CS(e, t) {
    let [i, n] = (e.name || '').split(' ');
    if (!t || !i || !n) return {};
    let r,
      o = '',
      s = i,
      u = n,
      a = (m) => {
        if (m)
          return (m = Ae(m) ? m : [m]).find(
            (p) => !p.condition || p.condition(e),
          );
      };
    t[s] || (s = '*');
    let c = t[s];
    return (
      c && (c[u] || (u = '*'), (r = a(c[u]))),
      r || ((s = '*'), (u = '*'), (r = a(t[s]?.[u]))),
      r && (o = `${s} ${u}`),
      { eventMapping: r, mappingKey: o }
    );
  }
  async function st(e, t = {}, i = {}) {
    if (!Pe(e)) return;
    let n = (re(e) && e.consent) || i.consent || i.collector?.consent,
      r = Ae(t) ? t : [t];
    for (let o of r) {
      let s = await me(Lf)(e, o, { ...i, consent: n });
      if (Pe(s)) return s;
    }
  }
  async function Lf(e, t, i = {}) {
    let { collector: n, consent: r } = i;
    return (Ae(t) ? t : [t]).reduce(
      async (o, s) => {
        let u = await o;
        if (u) return u;
        let a = Di(s) ? { key: s } : s;
        if (!Object.keys(a).length) return;
        let {
          condition: c,
          consent: m,
          fn: p,
          key: f,
          loop: v,
          map: b,
          set: $,
          validate: g,
          value: k,
        } = a;
        if (c && !(await me(c)(e, s, n))) return;
        if (m && !Fn(m, r)) return k;
        let x = Pe(k) ? k : e;
        if ((p && (x = await me(p)(e, s, i)), f && (x = Af(e, f, k)), v)) {
          let [S, P] = v,
            J = S === 'this' ? [e] : await st(e, S, i);
          Ae(J) &&
            (x = (await Promise.all(J.map((H) => st(H, P, i)))).filter(Pe));
        } else
          b
            ? (x = await Object.entries(b).reduce(async (S, [P, J]) => {
                let H = await S,
                  ee = await st(e, J, i);
                return (Pe(ee) && (H[P] = ee), H);
              }, Promise.resolve({})))
            : $ && (x = await Promise.all($.map((S) => Lf(e, S, i))));
        g && !(await me(g)(x)) && (x = void 0);
        let w = df(x);
        return Pe(w) ? w : df(k);
      },
      Promise.resolve(void 0),
    );
  }
  async function Ei(e, t, i) {
    t.policy &&
      (await Promise.all(
        Object.entries(t.policy).map(async ([s, u]) => {
          let a = await st(e, u, { collector: i });
          e = lf(e, s, a);
        }),
      ));
    let { eventMapping: n, mappingKey: r } = await CS(e, t.mapping);
    n?.policy &&
      (await Promise.all(
        Object.entries(n.policy).map(async ([s, u]) => {
          let a = await st(e, u, { collector: i });
          e = lf(e, s, a);
        }),
      ));
    let o = t.data && (await st(e, t.data, { collector: i }));
    if (n) {
      if (n.ignore)
        return { event: e, data: o, mapping: n, mappingKey: r, ignore: !0 };
      if ((n.name && (e.name = n.name), n.data)) {
        let s = n.data && (await st(e, n.data, { collector: i }));
        o = re(o) && re(s) ? Y(o, s) : s;
      }
    }
    return { event: e, data: o, mapping: n, mappingKey: r, ignore: !1 };
  }
  function Rf(e, t = !1) {
    t && console.dir(e, { depth: 4 });
  }
  function Xe(e, t, i) {
    return function (...n) {
      let r,
        o = 'post' + t,
        s = i['pre' + t],
        u = i[o];
      return (
        (r = s ? s({ fn: e }, ...n) : e(...n)),
        u && (r = u({ fn: e, result: r }, ...n)),
        r
      );
    };
  }
  var LS = Object.defineProperty,
    RS = {
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
    Q = {
      Commands: RS,
      Utils: {
        Storage: { Cookie: 'cookie', Local: 'local', Session: 'session' },
      },
    },
    JS = {};
  ((e, t) => {
    for (var i in t) LS(e, i, { get: t[i], enumerable: !0 });
  })(JS, { schemas: () => FS, settingsSchema: () => Jf });
  var Jf = {
      type: 'object',
      properties: {
        run: {
          type: 'boolean',
          description:
            'Automatically start the collector pipeline on initialization',
        },
        sources: {
          type: 'object',
          description:
            'Configurations for sources providing events to the collector',
        },
        destinations: {
          type: 'object',
          description:
            'Configurations for destinations receiving processed events',
        },
        consent: {
          type: 'object',
          description: 'Initial consent state to control routing of events',
        },
        verbose: {
          type: 'boolean',
          description: 'Enable verbose logging for debugging',
        },
        onError: {
          type: 'string',
          description:
            'Error handler triggered when the collector encounters failures',
        },
        onLog: {
          type: 'string',
          description: 'Custom log handler for collector messages',
        },
      },
    },
    FS = { settings: Jf };
  async function VS(e, t, i) {
    let { code: n, config: r = {}, env: o = {} } = t,
      s = i || r || { init: !1 },
      u = { ...n, config: s, env: Vn(n.env, o) },
      a = u.config.id;
    if (!a)
      do a = Zi(4);
      while (e.destinations[a]);
    return (
      (e.destinations[a] = u),
      u.config.queue !== !1 && (u.queue = [...e.queue]),
      Ti(e, void 0, { [a]: u })
    );
  }
  async function Ti(e, t, i) {
    let { allowed: n, consent: r, globals: o, user: s } = e;
    if (!n) return lt({ ok: !1 });
    (t && e.queue.push(t), i || (i = e.destinations));
    let u = await Promise.all(
        Object.entries(i || {}).map(async ([p, f]) => {
          let v = (f.queue || []).map((k) => ({ ...k, consent: r }));
          if (((f.queue = []), t)) {
            let k = An(t);
            v.push(k);
          }
          if (!v.length) return { id: p, destination: f, skipped: !0 };
          let b = [],
            $ = v.filter((k) => {
              let x = Fn(f.config.consent, r, k.consent);
              return !x || ((k.consent = x), b.push(k), !1);
            });
          if ((f.queue.concat($), !b.length))
            return { id: p, destination: f, queue: v };
          if (!(await me(MS)(e, f))) return { id: p, destination: f, queue: v };
          let g = !1;
          return (
            f.dlq || (f.dlq = []),
            await Promise.all(
              b.map(
                async (k) => (
                  (k.globals = Y(o, k.globals)),
                  (k.user = Y(s, k.user)),
                  await me(
                    WS,
                    (x) => (
                      e.config.onError && e.config.onError(x, e),
                      (g = !0),
                      f.dlq.push([k, x]),
                      !1
                    ),
                  )(e, f, k),
                  k
                ),
              ),
            ),
            { id: p, destination: f, error: g }
          );
        }),
      ),
      a = [],
      c = [],
      m = [];
    for (let p of u) {
      if (p.skipped) continue;
      let f = p.destination,
        v = { id: p.id, destination: f };
      p.error
        ? m.push(v)
        : p.queue && p.queue.length
          ? ((f.queue = (f.queue || []).concat(p.queue)), c.push(v))
          : a.push(v);
    }
    return lt({ ok: !m.length, event: t, successful: a, queued: c, failed: m });
  }
  async function MS(e, t) {
    if (t.init && !t.config.init) {
      let i = { collector: e, config: t.config, env: Vn(t.env, t.config.env) },
        n = await Xe(t.init, 'DestinationInit', e.hooks)(i);
      if (n === !1) return n;
      t.config = { ...(n || t.config), init: !0 };
    }
    return !0;
  }
  async function WS(e, t, i) {
    let { config: n } = t,
      r = await Ei(i, n, e);
    if (r.ignore) return !1;
    let o = {
        collector: e,
        config: n,
        data: r.data,
        mapping: r.mapping,
        env: Vn(t.env, n.env),
      },
      s = r.mapping;
    if (s?.batch && t.pushBatch) {
      let u = s.batched || { key: r.mappingKey || '', events: [], data: [] };
      (u.events.push(r.event),
        Pe(r.data) && u.data.push(r.data),
        (s.batchFn =
          s.batchFn ||
          Cf((a, c) => {
            let m = {
              collector: c,
              config: n,
              data: r.data,
              mapping: s,
              env: Vn(a.env, n.env),
            };
            (Xe(a.pushBatch, 'DestinationPushBatch', c.hooks)(u, m),
              (u.events = []),
              (u.data = []));
          }, s.batch)),
        (s.batched = u),
        s.batchFn?.(t, e));
    } else await Xe(t.push, 'DestinationPush', e.hooks)(r.event, o);
    return !0;
  }
  function lt(e) {
    return Y(
      { ok: !e?.failed?.length, successful: [], queued: [], failed: [] },
      e,
    );
  }
  async function BS(e, t = {}) {
    let i = {};
    for (let [n, r] of Object.entries(t)) {
      let { code: o, config: s = {}, env: u = {} } = r,
        a = { ...o.config, ...s },
        c = Vn(o.env, u);
      i[n] = { ...o, config: a, env: c };
    }
    return i;
  }
  function Vn(e, t) {
    return e || t ? (t ? (e && re(e) && re(t) ? { ...e, ...t } : t) : e) : {};
  }
  function GS(e, t, i) {
    let n = e.on,
      r = n[t] || [],
      o = Ae(i) ? i : [i];
    (o.forEach((s) => {
      r.push(s);
    }),
      (n[t] = r),
      Mn(e, t, o));
  }
  function Mn(e, t, i, n) {
    let r,
      o = i || [];
    switch ((i || (o = e.on[t] || []), t)) {
      case Q.Commands.Consent:
        r = n || e.consent;
        break;
      case Q.Commands.Session:
        r = e.session;
        break;
      case Q.Commands.Ready:
      case Q.Commands.Run:
      default:
        r = void 0;
    }
    if (
      (Object.values(e.sources).forEach((s) => {
        s.on && Ft(s.on)(t, r);
      }),
      Object.values(e.destinations).forEach((s) => {
        if (s.on) {
          let u = s.on;
          Ft(u)(t, r);
        }
      }),
      o.length)
    )
      switch (t) {
        case Q.Commands.Consent:
          (function (s, u, a) {
            let c = a || s.consent;
            u.forEach((m) => {
              Object.keys(c)
                .filter((p) => p in m)
                .forEach((p) => {
                  Ft(m[p])(s, c);
                });
            });
          })(e, o, n);
          break;
        case Q.Commands.Ready:
        case Q.Commands.Run:
          (function (s, u) {
            s.allowed &&
              u.forEach((a) => {
                Ft(a)(s);
              });
          })(e, o);
          break;
        case Q.Commands.Session:
          (function (s, u) {
            s.session &&
              u.forEach((a) => {
                Ft(a)(s, s.session);
              });
          })(e, o);
      }
  }
  async function KS(e, t) {
    let { consent: i } = e,
      n = !1,
      r = {};
    return (
      Object.entries(t).forEach(([o, s]) => {
        let u = !!s;
        ((r[o] = u), (n = n || u));
      }),
      (e.consent = Y(i, r)),
      Mn(e, 'consent', void 0, r),
      n ? Ti(e) : lt({ ok: !0 })
    );
  }
  async function qS(e, t, i, n) {
    let r;
    switch (t) {
      case Q.Commands.Config:
        re(i) && Y(e.config, i, { shallow: !1 });
        break;
      case Q.Commands.Consent:
        re(i) && (r = await KS(e, i));
        break;
      case Q.Commands.Custom:
        re(i) && (e.custom = Y(e.custom, i));
        break;
      case Q.Commands.Destination:
        re(i) && Tf(i.push) && (r = await VS(e, { code: i }, n));
        break;
      case Q.Commands.Globals:
        re(i) && (e.globals = Y(e.globals, i));
        break;
      case Q.Commands.On:
        Di(i) && GS(e, i, n);
        break;
      case Q.Commands.Ready:
        Mn(e, 'ready');
        break;
      case Q.Commands.Run:
        r = await HS(e, i);
        break;
      case Q.Commands.Session:
        Mn(e, 'session');
        break;
      case Q.Commands.User:
        re(i) && Y(e.user, i, { shallow: !1 });
    }
    return r || { ok: !0, successful: [], queued: [], failed: [] };
  }
  function XS(e, t) {
    if (!t.name) throw new Error('Event name is required');
    let [i, n] = t.name.split(' ');
    if (!i || !n) throw new Error('Event name is invalid');
    ++e.count;
    let {
        timestamp: r = Date.now(),
        group: o = e.group,
        count: s = e.count,
      } = t,
      {
        name: u = `${i} ${n}`,
        data: a = {},
        context: c = {},
        globals: m = e.globals,
        custom: p = {},
        user: f = e.user,
        nested: v = [],
        consent: b = e.consent,
        id: $ = `${r}-${o}-${s}`,
        trigger: g = '',
        entity: k = i,
        action: x = n,
        timing: w = 0,
        version: S = { source: e.version, tagging: e.config.tagging || 0 },
        source: P = { type: 'collector', id: '', previous_id: '' },
      } = t;
    return {
      name: u,
      data: a,
      context: c,
      globals: m,
      custom: p,
      user: f,
      nested: v,
      consent: b,
      id: $,
      trigger: g,
      entity: k,
      action: x,
      timestamp: r,
      timing: w,
      group: o,
      count: s,
      version: S,
      source: P,
    };
  }
  async function HS(e, t) {
    ((e.allowed = !0),
      (e.count = 0),
      (e.group = Zi()),
      (e.timing = Date.now()),
      t &&
        (t.consent && (e.consent = Y(e.consent, t.consent)),
        t.user && (e.user = Y(e.user, t.user)),
        t.globals && (e.globals = Y(e.config.globalsStatic || {}, t.globals)),
        t.custom && (e.custom = Y(e.custom, t.custom))),
      Object.values(e.destinations).forEach((n) => {
        n.queue = [];
      }),
      (e.queue = []),
      e.round++);
    let i = await Ti(e);
    return (Mn(e, 'run'), i);
  }
  function YS(e, t) {
    return Xe(
      async (i, n = {}) =>
        await me(
          async () => {
            let r = i;
            if (n.mapping) {
              let u = await Ei(r, n.mapping, e);
              if (u.ignore) return lt({ ok: !0 });
              if (
                n.mapping.consent &&
                !Fn(n.mapping.consent, e.consent, u.event.consent)
              )
                return lt({ ok: !0 });
              r = u.event;
            }
            let o = t(r),
              s = XS(e, o);
            return await Ti(e, s);
          },
          () => lt({ ok: !1 }),
        )(),
      'Push',
      e.hooks,
    );
  }
  async function QS(e) {
    let t = Y(
      {
        globalsStatic: {},
        sessionStatic: {},
        tagging: 0,
        verbose: !1,
        onLog: i,
        run: !0,
      },
      e,
      { merge: !1, extend: !1 },
    );
    function i(o, s) {
      Rf({ message: o }, s || t.verbose);
    }
    t.onLog = i;
    let n = { ...t.globalsStatic, ...e.globals },
      r = {
        allowed: !1,
        config: t,
        consent: e.consent || {},
        count: 0,
        custom: e.custom || {},
        destinations: {},
        globals: n,
        group: '',
        hooks: {},
        on: {},
        queue: [],
        round: 0,
        session: void 0,
        timing: Date.now(),
        user: e.user || {},
        version: '0.3.1',
        sources: {},
        push: void 0,
        command: void 0,
      };
    return (
      (r.push = YS(r, (o) => ({
        timing: Math.round((Date.now() - r.timing) / 10) / 100,
        source: { type: 'collector', id: '', previous_id: '' },
        ...o,
      }))),
      (r.command = (function (o, s) {
        return Xe(
          async (u, a, c) =>
            await me(
              async () => await s(o, u, a, c),
              () => lt({ ok: !1 }),
            )(),
          'Command',
          o.hooks,
        );
      })(r, qS)),
      (r.destinations = await BS(0, e.destinations || {})),
      r
    );
  }
  async function eI(e, t = {}) {
    let i = {};
    for (let [n, r] of Object.entries(t)) {
      let { code: o, config: s = {}, env: u = {}, primary: a } = r,
        c = {
          push: (p, f = {}) => e.push(p, { ...f, mapping: s }),
          command: e.command,
          sources: e.sources,
          elb: e.sources.elb.push,
          ...u,
        },
        m = await me(o)(s, c);
      m && (a && (m.config = { ...m.config, primary: a }), (i[n] = m));
    }
    return i;
  }
  async function Ff(e) {
    e = e || {};
    let t = await QS(e),
      i =
        ((n = t),
        {
          type: 'elb',
          config: {},
          push: async (f, v, b, $, g, k) => {
            if (typeof f == 'string' && f.startsWith('walker ')) {
              let w = f.replace('walker ', '');
              return n.command(w, v, b);
            }
            let x;
            if (typeof f == 'string')
              ((x = { name: f }),
                v && typeof v == 'object' && !Array.isArray(v) && (x.data = v));
            else {
              if (!f || typeof f != 'object')
                return { ok: !1, successful: [], queued: [], failed: [] };
              ((x = f),
                v &&
                  typeof v == 'object' &&
                  !Array.isArray(v) &&
                  (x.data = { ...(x.data || {}), ...v }));
            }
            return (
              $ && typeof $ == 'object' && (x.context = $),
              g && Array.isArray(g) && (x.nested = g),
              k && typeof k == 'object' && (x.custom = k),
              n.push(x)
            );
          },
        });
    var n;
    t.sources.elb = i;
    let r = await eI(t, e.sources || {});
    Object.assign(t.sources, r);
    let { consent: o, user: s, globals: u, custom: a } = e;
    (o && (await t.command('consent', o)),
      s && (await t.command('user', s)),
      u && Object.assign(t.globals, u),
      a && Object.assign(t.custom, a),
      t.config.run && (await t.command('run')));
    let c = i.push,
      m = Object.values(t.sources).filter((f) => f.type !== 'elb'),
      p = m.find((f) => f.config.primary);
    return (
      p ? (c = p.push) : m.length > 0 && (c = m[0].push),
      { collector: t, elb: c }
    );
  }
  var tI = Object.defineProperty,
    Vf = (e, t) => {
      for (var i in t) tI(e, i, { get: t[i], enumerable: !0 });
    };
  var nI = {};
  Vf(nI, { env: () => Mf });
  var Mf = {};
  Vf(Mf, { init: () => rI, push: () => iI, simulation: () => oI });
  var Mc = async () => ({ ok: !0, successful: [], queued: [], failed: [] }),
    rI = void 0,
    iI = { push: Mc, command: Mc, elb: Mc },
    oI = ['call:elb'],
    Wf = async (e, t) => {
      let { elb: i } = t,
        n = { ...e, settings: e?.settings || { events: [] } };
      return (
        (n.settings?.events || []).forEach((r) => {
          let { delay: o, ...s } = r;
          setTimeout(() => i(s), o || 0);
        }),
        { type: 'demo', config: n, push: i }
      );
    };
  var aI = Object.defineProperty,
    Bf = (e, t) => {
      for (var i in t) aI(e, i, { get: t[i], enumerable: !0 });
    };
  var Gf = {};
  Bf(Gf, { env: () => Kf });
  var Kf = {};
  Bf(Kf, { init: () => sI, push: () => uI, simulation: () => cI });
  var sI = { log: void 0 },
    uI = { log: Object.assign(() => {}, {}) },
    cI = ['call:log'],
    qf = {
      type: 'demo',
      config: { settings: { name: 'demo' } },
      init({ config: e, env: t }) {
        (t?.log || console.log)(
          `[${{ name: 'demo', ...e?.settings }.name}] initialized`,
        );
      },
      push(e, { config: t, env: i }) {
        let n = i?.log || console.log,
          r = { name: 'demo', ...t?.settings },
          o = r.values
            ? (function (s, u) {
                let a = {};
                for (let c of u) {
                  let m = c.split('.').reduce((p, f) => p?.[f], s);
                  m !== void 0 && (a[c] = m);
                }
                return a;
              })(e, r.values)
            : e;
        n(`[${r.name}] ${JSON.stringify(o, null, 2)}`);
      },
    };
  var lI = Object.defineProperty,
    $e = (e, t) => {
      for (var i in t) lI(e, i, { get: t[i], enumerable: !0 });
    },
    l = {};
  $e(l, {
    $brand: () => gv,
    $input: () => Bh,
    $output: () => Wh,
    NEVER: () => vv,
    TimePrecision: () => qh,
    ZodAny: () => ay,
    ZodArray: () => ly,
    ZodBase64: () => wd,
    ZodBase64URL: () => Sd,
    ZodBigInt: () => lo,
    ZodBigIntFormat: () => jd,
    ZodBoolean: () => co,
    ZodCIDRv4: () => kd,
    ZodCIDRv6: () => xd,
    ZodCUID: () => vd,
    ZodCUID2: () => gd,
    ZodCatch: () => Oy,
    ZodCodec: () => Ld,
    ZodCustom: () => fo,
    ZodCustomStringFormat: () => ur,
    ZodDate: () => Ud,
    ZodDefault: () => xy,
    ZodDiscriminatedUnion: () => dy,
    ZodE164: () => Id,
    ZodEmail: () => md,
    ZodEmoji: () => pd,
    ZodEnum: () => Xn,
    ZodError: () => _4,
    ZodFile: () => $y,
    ZodFirstPartyTypeKind: () => Qc,
    ZodFunction: () => Cy,
    ZodGUID: () => Ki,
    ZodIPv4: () => $d,
    ZodIPv6: () => _d,
    ZodISODate: () => ud,
    ZodISODateTime: () => sd,
    ZodISODuration: () => ld,
    ZodISOTime: () => cd,
    ZodIntersection: () => my,
    ZodIssueCode: () => U6,
    ZodJWT: () => zd,
    ZodKSUID: () => yd,
    ZodLazy: () => Ey,
    ZodLiteral: () => yy,
    ZodMap: () => hy,
    ZodNaN: () => Py,
    ZodNanoID: () => fd,
    ZodNever: () => uy,
    ZodNonOptional: () => Ad,
    ZodNull: () => iy,
    ZodNullable: () => ky,
    ZodNumber: () => uo,
    ZodNumberFormat: () => Gt,
    ZodObject: () => po,
    ZodOptional: () => Td,
    ZodPipe: () => Cd,
    ZodPrefault: () => Sy,
    ZodPromise: () => Ay,
    ZodReadonly: () => Ny,
    ZodRealError: () => ve,
    ZodRecord: () => Dd,
    ZodSet: () => by,
    ZodString: () => ao,
    ZodStringFormat: () => G,
    ZodSuccess: () => jy,
    ZodSymbol: () => ny,
    ZodTemplateLiteral: () => Zy,
    ZodTransform: () => _y,
    ZodTuple: () => fy,
    ZodType: () => C,
    ZodULID: () => hd,
    ZodURL: () => so,
    ZodUUID: () => Le,
    ZodUndefined: () => ry,
    ZodUnion: () => Pd,
    ZodUnknown: () => sy,
    ZodVoid: () => cy,
    ZodXID: () => bd,
    _ZodString: () => dd,
    _default: () => wy,
    _function: () => dv,
    any: () => i6,
    array: () => mo,
    base64: () => J4,
    base64url: () => F4,
    bigint: () => Q4,
    boolean: () => ty,
    catch: () => Uy,
    check: () => w6,
    cidrv4: () => L4,
    cidrv6: () => R4,
    clone: () => _e,
    codec: () => _6,
    coerce: () => Jy,
    config: () => ae,
    core: () => fv,
    cuid: () => N4,
    cuid2: () => D4,
    custom: () => S6,
    date: () => a6,
    decode: () => Gb,
    decodeAsync: () => qb,
    discriminatedUnion: () => d6,
    e164: () => V4,
    email: () => k4,
    emoji: () => U4,
    encode: () => Bb,
    encodeAsync: () => Kb,
    endsWith: () => td,
    enum: () => Zd,
    file: () => h6,
    flattenError: () => al,
    float32: () => q4,
    float64: () => X4,
    formatError: () => sl,
    function: () => dv,
    getErrorMap: () => N6,
    globalRegistry: () => mt,
    gt: () => ht,
    gte: () => pe,
    guid: () => x4,
    hash: () => K4,
    hex: () => G4,
    hostname: () => B4,
    httpUrl: () => O4,
    includes: () => Ql,
    instanceof: () => I6,
    int: () => Yc,
    int32: () => H4,
    int64: () => e6,
    intersection: () => py,
    ipv4: () => A4,
    ipv6: () => C4,
    iso: () => Tb,
    json: () => j6,
    jwt: () => M4,
    keyof: () => s6,
    ksuid: () => T4,
    lazy: () => Ty,
    length: () => oo,
    literal: () => g6,
    locales: () => Il,
    looseObject: () => l6,
    lowercase: () => Hl,
    lt: () => gt,
    lte: () => Se,
    map: () => p6,
    maxLength: () => io,
    maxSize: () => ro,
    mime: () => nd,
    minLength: () => Wt,
    minSize: () => qn,
    multipleOf: () => Kn,
    nan: () => $6,
    nanoid: () => P4,
    nativeEnum: () => v6,
    negative: () => wb,
    never: () => Od,
    nonnegative: () => Ib,
    nonoptional: () => zy,
    nonpositive: () => Sb,
    normalize: () => rd,
    null: () => oy,
    nullable: () => Xi,
    nullish: () => b6,
    number: () => ey,
    object: () => u6,
    optional: () => qi,
    overwrite: () => $t,
    parse: () => Fb,
    parseAsync: () => Vb,
    partialRecord: () => m6,
    pipe: () => Hi,
    positive: () => xb,
    prefault: () => Iy,
    preprocess: () => O6,
    prettifyError: () => Ov,
    promise: () => x6,
    property: () => zb,
    readonly: () => Dy,
    record: () => gy,
    refine: () => Ly,
    regex: () => Xl,
    regexes: () => yt,
    registry: () => jl,
    safeDecode: () => Hb,
    safeDecodeAsync: () => Qb,
    safeEncode: () => Xb,
    safeEncodeAsync: () => Yb,
    safeParse: () => Mb,
    safeParseAsync: () => Wb,
    set: () => f6,
    setErrorMap: () => P6,
    size: () => ql,
    startsWith: () => ed,
    strictObject: () => c6,
    string: () => Hc,
    stringFormat: () => W4,
    stringbool: () => z6,
    success: () => y6,
    superRefine: () => Ry,
    symbol: () => n6,
    templateLiteral: () => k6,
    toJSONSchema: () => Eb,
    toLowerCase: () => od,
    toUpperCase: () => ad,
    transform: () => Ed,
    treeifyError: () => zv,
    trim: () => id,
    tuple: () => vy,
    uint32: () => Y4,
    uint64: () => t6,
    ulid: () => Z4,
    undefined: () => r6,
    union: () => Nd,
    unknown: () => Bt,
    uppercase: () => Yl,
    url: () => j4,
    util: () => F,
    uuid: () => w4,
    uuidv4: () => S4,
    uuidv6: () => I4,
    uuidv7: () => z4,
    void: () => o6,
    xid: () => E4,
  });
  var fv = {};
  $e(fv, {
    $ZodAny: () => uh,
    $ZodArray: () => ph,
    $ZodAsyncError: () => ft,
    $ZodBase64: () => Xg,
    $ZodBase64URL: () => Yg,
    $ZodBigInt: () => kl,
    $ZodBigIntFormat: () => ih,
    $ZodBoolean: () => _l,
    $ZodCIDRv4: () => Kg,
    $ZodCIDRv6: () => qg,
    $ZodCUID: () => Ag,
    $ZodCUID2: () => Cg,
    $ZodCatch: () => Dh,
    $ZodCheck: () => K,
    $ZodCheckBigIntFormat: () => pg,
    $ZodCheckEndsWith: () => Sg,
    $ZodCheckGreaterThan: () => bl,
    $ZodCheckIncludes: () => xg,
    $ZodCheckLengthEquals: () => yg,
    $ZodCheckLessThan: () => hl,
    $ZodCheckLowerCase: () => _g,
    $ZodCheckMaxLength: () => hg,
    $ZodCheckMaxSize: () => fg,
    $ZodCheckMimeType: () => zg,
    $ZodCheckMinLength: () => bg,
    $ZodCheckMinSize: () => vg,
    $ZodCheckMultipleOf: () => dg,
    $ZodCheckNumberFormat: () => mg,
    $ZodCheckOverwrite: () => jg,
    $ZodCheckProperty: () => Ig,
    $ZodCheckRegex: () => $g,
    $ZodCheckSizeEquals: () => gg,
    $ZodCheckStartsWith: () => wg,
    $ZodCheckStringFormat: () => or,
    $ZodCheckUpperCase: () => kg,
    $ZodCodec: () => Sl,
    $ZodCustom: () => Jh,
    $ZodCustomStringFormat: () => nh,
    $ZodDate: () => mh,
    $ZodDefault: () => Oh,
    $ZodDiscriminatedUnion: () => bh,
    $ZodE164: () => Qg,
    $ZodEmail: () => Dg,
    $ZodEmoji: () => Eg,
    $ZodEncodeError: () => Yi,
    $ZodEnum: () => xh,
    $ZodError: () => ol,
    $ZodFile: () => Sh,
    $ZodFunction: () => Ch,
    $ZodGUID: () => Pg,
    $ZodIPv4: () => Bg,
    $ZodIPv6: () => Gg,
    $ZodISODate: () => Vg,
    $ZodISODateTime: () => Fg,
    $ZodISODuration: () => Wg,
    $ZodISOTime: () => Mg,
    $ZodIntersection: () => yh,
    $ZodJWT: () => th,
    $ZodKSUID: () => Jg,
    $ZodLazy: () => Rh,
    $ZodLiteral: () => wh,
    $ZodMap: () => _h,
    $ZodNaN: () => Zh,
    $ZodNanoID: () => Tg,
    $ZodNever: () => lh,
    $ZodNonOptional: () => Ph,
    $ZodNull: () => sh,
    $ZodNullable: () => jh,
    $ZodNumber: () => $l,
    $ZodNumberFormat: () => rh,
    $ZodObject: () => gh,
    $ZodObjectJIT: () => hh,
    $ZodOptional: () => zh,
    $ZodPipe: () => Eh,
    $ZodPrefault: () => Uh,
    $ZodPromise: () => Lh,
    $ZodReadonly: () => Th,
    $ZodRealError: () => fe,
    $ZodRecord: () => $h,
    $ZodRegistry: () => zl,
    $ZodSet: () => kh,
    $ZodString: () => ar,
    $ZodStringFormat: () => W,
    $ZodSuccess: () => Nh,
    $ZodSymbol: () => oh,
    $ZodTemplateLiteral: () => Ah,
    $ZodTransform: () => Ih,
    $ZodTuple: () => wl,
    $ZodType: () => E,
    $ZodULID: () => Lg,
    $ZodURL: () => Zg,
    $ZodUUID: () => Ng,
    $ZodUndefined: () => ah,
    $ZodUnion: () => xl,
    $ZodUnknown: () => ch,
    $ZodVoid: () => dh,
    $ZodXID: () => Rg,
    $brand: () => gv,
    $constructor: () => y,
    $input: () => Bh,
    $output: () => Wh,
    Doc: () => Og,
    JSONSchema: () => $4,
    JSONSchemaGenerator: () => Xc,
    NEVER: () => vv,
    TimePrecision: () => qh,
    _any: () => gb,
    _array: () => jb,
    _base64: () => Wl,
    _base64url: () => Bl,
    _bigint: () => cb,
    _boolean: () => sb,
    _catch: () => f4,
    _check: () => Db,
    _cidrv4: () => Vl,
    _cidrv6: () => Ml,
    _coercedBigint: () => lb,
    _coercedBoolean: () => ub,
    _coercedDate: () => _b,
    _coercedNumber: () => tb,
    _coercedString: () => Kh,
    _cuid: () => Tl,
    _cuid2: () => Al,
    _custom: () => Ub,
    _date: () => $b,
    _decode: () => cl,
    _decodeAsync: () => dl,
    _default: () => d4,
    _discriminatedUnion: () => Qj,
    _e164: () => Gl,
    _email: () => Ol,
    _emoji: () => Zl,
    _encode: () => ul,
    _encodeAsync: () => ll,
    _endsWith: () => td,
    _enum: () => o4,
    _file: () => Ob,
    _float32: () => rb,
    _float64: () => ib,
    _gt: () => ht,
    _gte: () => pe,
    _guid: () => Gi,
    _includes: () => Ql,
    _int: () => nb,
    _int32: () => ob,
    _int64: () => db,
    _intersection: () => e4,
    _ipv4: () => Jl,
    _ipv6: () => Fl,
    _isoDate: () => Hh,
    _isoDateTime: () => Xh,
    _isoDuration: () => Qh,
    _isoTime: () => Yh,
    _jwt: () => Kl,
    _ksuid: () => Rl,
    _lazy: () => b4,
    _length: () => oo,
    _literal: () => s4,
    _lowercase: () => Hl,
    _lt: () => gt,
    _lte: () => Se,
    _map: () => r4,
    _max: () => Se,
    _maxLength: () => io,
    _maxSize: () => ro,
    _mime: () => nd,
    _min: () => pe,
    _minLength: () => Wt,
    _minSize: () => qn,
    _multipleOf: () => Kn,
    _nan: () => kb,
    _nanoid: () => El,
    _nativeEnum: () => a4,
    _negative: () => wb,
    _never: () => bb,
    _nonnegative: () => Ib,
    _nonoptional: () => m4,
    _nonpositive: () => Sb,
    _normalize: () => rd,
    _null: () => vb,
    _nullable: () => l4,
    _number: () => eb,
    _optional: () => c4,
    _overwrite: () => $t,
    _parse: () => Qn,
    _parseAsync: () => er,
    _pipe: () => v4,
    _positive: () => xb,
    _promise: () => y4,
    _property: () => zb,
    _readonly: () => g4,
    _record: () => n4,
    _refine: () => Pb,
    _regex: () => Xl,
    _safeDecode: () => pl,
    _safeDecodeAsync: () => vl,
    _safeEncode: () => ml,
    _safeEncodeAsync: () => fl,
    _safeParse: () => tr,
    _safeParseAsync: () => nr,
    _set: () => i4,
    _size: () => ql,
    _startsWith: () => ed,
    _string: () => Gh,
    _stringFormat: () => sr,
    _stringbool: () => Zb,
    _success: () => p4,
    _superRefine: () => Nb,
    _symbol: () => pb,
    _templateLiteral: () => h4,
    _toLowerCase: () => od,
    _toUpperCase: () => ad,
    _transform: () => u4,
    _trim: () => id,
    _tuple: () => t4,
    _uint32: () => ab,
    _uint64: () => mb,
    _ulid: () => Cl,
    _undefined: () => fb,
    _union: () => Yj,
    _unknown: () => hb,
    _uppercase: () => Yl,
    _url: () => no,
    _uuid: () => Ul,
    _uuidv4: () => Pl,
    _uuidv6: () => Nl,
    _uuidv7: () => Dl,
    _void: () => yb,
    _xid: () => Ll,
    clone: () => _e,
    config: () => ae,
    decode: () => CI,
    decodeAsync: () => RI,
    encode: () => AI,
    encodeAsync: () => LI,
    flattenError: () => al,
    formatError: () => sl,
    globalConfig: () => Fi,
    globalRegistry: () => mt,
    isValidBase64: () => yl,
    isValidBase64URL: () => Hg,
    isValidJWT: () => eh,
    locales: () => Il,
    parse: () => Gc,
    parseAsync: () => Kc,
    prettifyError: () => Ov,
    regexes: () => yt,
    registry: () => jl,
    safeDecode: () => FI,
    safeDecodeAsync: () => MI,
    safeEncode: () => JI,
    safeEncodeAsync: () => VI,
    safeParse: () => Uv,
    safeParseAsync: () => Pv,
    toDotPath: () => jv,
    toJSONSchema: () => Eb,
    treeifyError: () => zv,
    util: () => F,
    version: () => Ug,
  });
  var vv = Object.freeze({ status: 'aborted' });
  function y(e, t, i) {
    var n;
    function r(a, c) {
      var m, p;
      (Object.defineProperty(a, '_zod', {
        value: (m = a._zod) != null ? m : {},
        enumerable: !1,
      }),
        (p = a._zod).traits != null || (p.traits = new Set()),
        a._zod.traits.add(e),
        t(a, c));
      for (let f in u.prototype)
        f in a ||
          Object.defineProperty(a, f, { value: u.prototype[f].bind(a) });
      ((a._zod.constr = u), (a._zod.def = c));
    }
    let o = (n = i?.Parent) != null ? n : Object;
    class s extends o {}
    function u(a) {
      var c;
      let m = i?.Parent ? new s() : this;
      (r(m, a), (c = m._zod).deferred != null || (c.deferred = []));
      for (let p of m._zod.deferred) p();
      return m;
    }
    return (
      Object.defineProperty(s, 'name', { value: e }),
      Object.defineProperty(u, 'init', { value: r }),
      Object.defineProperty(u, Symbol.hasInstance, {
        value: (a) => {
          var c, m;
          return (
            !!(i?.Parent && a instanceof i.Parent) ||
            ((m = (c = a?._zod) == null ? void 0 : c.traits) == null
              ? void 0
              : m.has(e))
          );
        },
      }),
      Object.defineProperty(u, 'name', { value: e }),
      u
    );
  }
  var gv = Symbol('zod_brand'),
    ft = class extends Error {
      constructor() {
        super(
          'Encountered Promise during synchronous parse. Use .parseAsync() instead.',
        );
      }
    },
    Yi = class extends Error {
      constructor(e) {
        (super(`Encountered unidirectional transform during encode: ${e}`),
          (this.name = 'ZodEncodeError'));
      }
    },
    Fi = {};
  function ae(e) {
    return (e && Object.assign(Fi, e), Fi);
  }
  var F = {};
  function dI(e) {
    return e;
  }
  function mI(e) {
    return e;
  }
  function pI(e) {}
  function fI(e) {
    throw new Error();
  }
  function vI(e) {}
  function rl(e) {
    let t = Object.values(e).filter((i) => typeof i == 'number');
    return Object.entries(e)
      .filter(([i, n]) => t.indexOf(+i) === -1)
      .map(([i, n]) => n);
  }
  function z(e, t = '|') {
    return e.map((i) => N(i)).join(t);
  }
  function Vi(e, t) {
    return typeof t == 'bigint' ? t.toString() : t;
  }
  function Yn(e) {
    return {
      get value() {
        {
          let t = e();
          return (Object.defineProperty(this, 'value', { value: t }), t);
        }
      },
    };
  }
  function bt(e) {
    return e == null;
  }
  function Qi(e) {
    let t = e.startsWith('^') ? 1 : 0,
      i = e.endsWith('$') ? e.length - 1 : e.length;
    return e.slice(t, i);
  }
  function hv(e, t) {
    let i = (e.toString().split('.')[1] || '').length,
      n = t.toString(),
      r = (n.split('.')[1] || '').length;
    if (r === 0 && /\d?e-\d?/.test(n)) {
      let s = n.match(/\d?e-(\d?)/);
      s?.[1] && (r = Number.parseInt(s[1]));
    }
    let o = i > r ? i : r;
    return (
      (Number.parseInt(e.toFixed(o).replace('.', '')) %
        Number.parseInt(t.toFixed(o).replace('.', ''))) /
      10 ** o
    );
  }
  $e(F, {
    BIGINT_FORMAT_RANGES: () => xv,
    Class: () => TI,
    NUMBER_FORMAT_RANGES: () => kv,
    aborted: () => dt,
    allowsEval: () => bv,
    assert: () => vI,
    assertEqual: () => dI,
    assertIs: () => pI,
    assertNever: () => fI,
    assertNotEqual: () => mI,
    assignProp: () => Qe,
    base64ToUint8Array: () => wv,
    base64urlToUint8Array: () => NI,
    cached: () => Yn,
    captureStackTrace: () => il,
    cleanEnum: () => PI,
    cleanRegex: () => Qi,
    clone: () => _e,
    cloneDef: () => hI,
    createTransparentProxy: () => xI,
    defineLazy: () => R,
    esc: () => Bc,
    escapeRegex: () => He,
    extend: () => II,
    finalizeIssue: () => Ie,
    floatSafeRemainder: () => hv,
    getElementAtPath: () => bI,
    getEnumValues: () => rl,
    getLengthableOrigin: () => to,
    getParsedType: () => kI,
    getSizableOrigin: () => eo,
    hexToUint8Array: () => ZI,
    isObject: () => Vt,
    isPlainObject: () => vt,
    issue: () => Wi,
    joinValues: () => z,
    jsonStringifyReplacer: () => Vi,
    merge: () => jI,
    mergeDefs: () => et,
    normalizeParams: () => U,
    nullish: () => bt,
    numKeys: () => _I,
    objectClone: () => gI,
    omit: () => SI,
    optionalKeys: () => _v,
    partial: () => OI,
    pick: () => wI,
    prefixIssues: () => we,
    primitiveTypes: () => $v,
    promiseAllObject: () => yI,
    propertyKeyTypes: () => Mi,
    randomString: () => $I,
    required: () => UI,
    safeExtend: () => zI,
    shallowClone: () => yv,
    stringifyPrimitive: () => N,
    uint8ArrayToBase64: () => Sv,
    uint8ArrayToBase64url: () => DI,
    uint8ArrayToHex: () => EI,
    unwrapMessage: () => Gn,
  });
  var Xf = Symbol('evaluating');
  function R(e, t, i) {
    let n;
    Object.defineProperty(e, t, {
      get() {
        if (n !== Xf) return (n === void 0 && ((n = Xf), (n = i())), n);
      },
      set(r) {
        Object.defineProperty(e, t, { value: r });
      },
      configurable: !0,
    });
  }
  function gI(e) {
    return Object.create(
      Object.getPrototypeOf(e),
      Object.getOwnPropertyDescriptors(e),
    );
  }
  function Qe(e, t, i) {
    Object.defineProperty(e, t, {
      value: i,
      writable: !0,
      enumerable: !0,
      configurable: !0,
    });
  }
  function et(...e) {
    let t = {};
    for (let i of e) {
      let n = Object.getOwnPropertyDescriptors(i);
      Object.assign(t, n);
    }
    return Object.defineProperties({}, t);
  }
  function hI(e) {
    return et(e._zod.def);
  }
  function bI(e, t) {
    return t ? t.reduce((i, n) => i?.[n], e) : e;
  }
  function yI(e) {
    let t = Object.keys(e),
      i = t.map((n) => e[n]);
    return Promise.all(i).then((n) => {
      let r = {};
      for (let o = 0; o < t.length; o++) r[t[o]] = n[o];
      return r;
    });
  }
  function $I(e = 10) {
    let t = 'abcdefghijklmnopqrstuvwxyz',
      i = '';
    for (let n = 0; n < e; n++) i += t[Math.floor(26 * Math.random())];
    return i;
  }
  function Bc(e) {
    return JSON.stringify(e);
  }
  var il =
    'captureStackTrace' in Error ? Error.captureStackTrace : (...e) => {};
  function Vt(e) {
    return typeof e == 'object' && e !== null && !Array.isArray(e);
  }
  var bv = Yn(() => {
    var e;
    if (
      typeof navigator < 'u' &&
      (e = navigator?.userAgent) != null &&
      e.includes('Cloudflare')
    )
      return !1;
    try {
      return (new Function(''), !0);
    } catch {
      return !1;
    }
  });
  function vt(e) {
    if (Vt(e) === !1) return !1;
    let t = e.constructor;
    if (t === void 0) return !0;
    let i = t.prototype;
    return (
      Vt(i) !== !1 &&
      Object.prototype.hasOwnProperty.call(i, 'isPrototypeOf') !== !1
    );
  }
  function yv(e) {
    return vt(e) ? { ...e } : Array.isArray(e) ? [...e] : e;
  }
  function _I(e) {
    let t = 0;
    for (let i in e) Object.prototype.hasOwnProperty.call(e, i) && t++;
    return t;
  }
  var kI = (e) => {
      let t = typeof e;
      switch (t) {
        case 'undefined':
          return 'undefined';
        case 'string':
          return 'string';
        case 'number':
          return Number.isNaN(e) ? 'nan' : 'number';
        case 'boolean':
          return 'boolean';
        case 'function':
          return 'function';
        case 'bigint':
          return 'bigint';
        case 'symbol':
          return 'symbol';
        case 'object':
          return Array.isArray(e)
            ? 'array'
            : e === null
              ? 'null'
              : e.then &&
                  typeof e.then == 'function' &&
                  e.catch &&
                  typeof e.catch == 'function'
                ? 'promise'
                : typeof Map < 'u' && e instanceof Map
                  ? 'map'
                  : typeof Set < 'u' && e instanceof Set
                    ? 'set'
                    : typeof Date < 'u' && e instanceof Date
                      ? 'date'
                      : typeof File < 'u' && e instanceof File
                        ? 'file'
                        : 'object';
        default:
          throw new Error(`Unknown data type: ${t}`);
      }
    },
    Mi = new Set(['string', 'number', 'symbol']),
    $v = new Set([
      'string',
      'number',
      'bigint',
      'boolean',
      'symbol',
      'undefined',
    ]);
  function He(e) {
    return e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function _e(e, t, i) {
    let n = new e._zod.constr(t ?? e._zod.def);
    return ((t && !i?.parent) || (n._zod.parent = e), n);
  }
  function U(e) {
    let t = e;
    if (!t) return {};
    if (typeof t == 'string') return { error: () => t };
    if (t?.message !== void 0) {
      if (t?.error !== void 0)
        throw new Error('Cannot specify both `message` and `error` params');
      t.error = t.message;
    }
    return (
      delete t.message,
      typeof t.error == 'string' ? { ...t, error: () => t.error } : t
    );
  }
  function xI(e) {
    let t;
    return new Proxy(
      {},
      {
        get: (i, n, r) => (t != null || (t = e()), Reflect.get(t, n, r)),
        set: (i, n, r, o) => (t != null || (t = e()), Reflect.set(t, n, r, o)),
        has: (i, n) => (t != null || (t = e()), Reflect.has(t, n)),
        deleteProperty: (i, n) => (
          t != null || (t = e()),
          Reflect.deleteProperty(t, n)
        ),
        ownKeys: (i) => (t != null || (t = e()), Reflect.ownKeys(t)),
        getOwnPropertyDescriptor: (i, n) => (
          t != null || (t = e()),
          Reflect.getOwnPropertyDescriptor(t, n)
        ),
        defineProperty: (i, n, r) => (
          t != null || (t = e()),
          Reflect.defineProperty(t, n, r)
        ),
      },
    );
  }
  function N(e) {
    return typeof e == 'bigint'
      ? e.toString() + 'n'
      : typeof e == 'string'
        ? `"${e}"`
        : `${e}`;
  }
  function _v(e) {
    return Object.keys(e).filter(
      (t) => e[t]._zod.optin === 'optional' && e[t]._zod.optout === 'optional',
    );
  }
  var kv = {
      safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
      int32: [-2147483648, 2147483647],
      uint32: [0, 4294967295],
      float32: [-34028234663852886e22, 34028234663852886e22],
      float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
    },
    xv = {
      int64: [BigInt('-9223372036854775808'), BigInt('9223372036854775807')],
      uint64: [BigInt(0), BigInt('18446744073709551615')],
    };
  function wI(e, t) {
    let i = e._zod.def;
    return _e(
      e,
      et(e._zod.def, {
        get shape() {
          let n = {};
          for (let r in t) {
            if (!(r in i.shape)) throw new Error(`Unrecognized key: "${r}"`);
            t[r] && (n[r] = i.shape[r]);
          }
          return (Qe(this, 'shape', n), n);
        },
        checks: [],
      }),
    );
  }
  function SI(e, t) {
    let i = e._zod.def,
      n = et(e._zod.def, {
        get shape() {
          let r = { ...e._zod.def.shape };
          for (let o in t) {
            if (!(o in i.shape)) throw new Error(`Unrecognized key: "${o}"`);
            t[o] && delete r[o];
          }
          return (Qe(this, 'shape', r), r);
        },
        checks: [],
      });
    return _e(e, n);
  }
  function II(e, t) {
    if (!vt(t))
      throw new Error('Invalid input to extend: expected a plain object');
    let i = e._zod.def.checks;
    if (i && i.length > 0)
      throw new Error(
        'Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.',
      );
    let n = et(e._zod.def, {
      get shape() {
        let r = { ...e._zod.def.shape, ...t };
        return (Qe(this, 'shape', r), r);
      },
      checks: [],
    });
    return _e(e, n);
  }
  function zI(e, t) {
    if (!vt(t))
      throw new Error('Invalid input to safeExtend: expected a plain object');
    let i = {
      ...e._zod.def,
      get shape() {
        let n = { ...e._zod.def.shape, ...t };
        return (Qe(this, 'shape', n), n);
      },
      checks: e._zod.def.checks,
    };
    return _e(e, i);
  }
  function jI(e, t) {
    let i = et(e._zod.def, {
      get shape() {
        let n = { ...e._zod.def.shape, ...t._zod.def.shape };
        return (Qe(this, 'shape', n), n);
      },
      get catchall() {
        return t._zod.def.catchall;
      },
      checks: [],
    });
    return _e(e, i);
  }
  function OI(e, t, i) {
    let n = et(t._zod.def, {
      get shape() {
        let r = t._zod.def.shape,
          o = { ...r };
        if (i)
          for (let s in i) {
            if (!(s in r)) throw new Error(`Unrecognized key: "${s}"`);
            i[s] &&
              (o[s] = e ? new e({ type: 'optional', innerType: r[s] }) : r[s]);
          }
        else
          for (let s in r)
            o[s] = e ? new e({ type: 'optional', innerType: r[s] }) : r[s];
        return (Qe(this, 'shape', o), o);
      },
      checks: [],
    });
    return _e(t, n);
  }
  function UI(e, t, i) {
    let n = et(t._zod.def, {
      get shape() {
        let r = t._zod.def.shape,
          o = { ...r };
        if (i)
          for (let s in i) {
            if (!(s in o)) throw new Error(`Unrecognized key: "${s}"`);
            i[s] && (o[s] = new e({ type: 'nonoptional', innerType: r[s] }));
          }
        else
          for (let s in r)
            o[s] = new e({ type: 'nonoptional', innerType: r[s] });
        return (Qe(this, 'shape', o), o);
      },
      checks: [],
    });
    return _e(t, n);
  }
  function dt(e, t = 0) {
    var i;
    if (e.aborted === !0) return !0;
    for (let n = t; n < e.issues.length; n++)
      if (((i = e.issues[n]) == null ? void 0 : i.continue) !== !0) return !0;
    return !1;
  }
  function we(e, t) {
    return t.map((i) => {
      var n;
      return ((n = i).path != null || (n.path = []), i.path.unshift(e), i);
    });
  }
  function Gn(e) {
    return typeof e == 'string' ? e : e?.message;
  }
  function Ie(e, t, i) {
    var n, r, o, s, u, a, c, m, p, f, v;
    let b = { ...e, path: (n = e.path) != null ? n : [] };
    if (!e.message) {
      let $ =
        (v =
          (f =
            (m =
              (a = Gn(
                (s =
                  (o = (r = e.inst) == null ? void 0 : r._zod.def) == null
                    ? void 0
                    : o.error) == null
                  ? void 0
                  : s.call(o, e),
              )) != null
                ? a
                : Gn((u = t?.error) == null ? void 0 : u.call(t, e))) != null
              ? m
              : Gn((c = i.customError) == null ? void 0 : c.call(i, e))) != null
            ? f
            : Gn((p = i.localeError) == null ? void 0 : p.call(i, e))) != null
          ? v
          : 'Invalid input';
      b.message = $;
    }
    return (
      delete b.inst,
      delete b.continue,
      t?.reportInput || delete b.input,
      b
    );
  }
  function eo(e) {
    return e instanceof Set
      ? 'set'
      : e instanceof Map
        ? 'map'
        : e instanceof File
          ? 'file'
          : 'unknown';
  }
  function to(e) {
    return Array.isArray(e)
      ? 'array'
      : typeof e == 'string'
        ? 'string'
        : 'unknown';
  }
  function Wi(...e) {
    let [t, i, n] = e;
    return typeof t == 'string'
      ? { message: t, code: 'custom', input: i, inst: n }
      : { ...t };
  }
  function PI(e) {
    return Object.entries(e)
      .filter(([t, i]) => Number.isNaN(Number.parseInt(t, 10)))
      .map((t) => t[1]);
  }
  function wv(e) {
    let t = atob(e),
      i = new Uint8Array(t.length);
    for (let n = 0; n < t.length; n++) i[n] = t.charCodeAt(n);
    return i;
  }
  function Sv(e) {
    let t = '';
    for (let i = 0; i < e.length; i++) t += String.fromCharCode(e[i]);
    return btoa(t);
  }
  function NI(e) {
    let t = e.replace(/-/g, '+').replace(/_/g, '/');
    return wv(t + '='.repeat((4 - (t.length % 4)) % 4));
  }
  function DI(e) {
    return Sv(e).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  function ZI(e) {
    let t = e.replace(/^0x/, '');
    if (t.length % 2 != 0) throw new Error('Invalid hex string length');
    let i = new Uint8Array(t.length / 2);
    for (let n = 0; n < t.length; n += 2)
      i[n / 2] = Number.parseInt(t.slice(n, n + 2), 16);
    return i;
  }
  function EI(e) {
    return Array.from(e)
      .map((t) => t.toString(16).padStart(2, '0'))
      .join('');
  }
  var TI = class {
      constructor(...e) {}
    },
    Iv = (e, t) => {
      ((e.name = '$ZodError'),
        Object.defineProperty(e, '_zod', { value: e._zod, enumerable: !1 }),
        Object.defineProperty(e, 'issues', { value: t, enumerable: !1 }),
        (e.message = JSON.stringify(t, Vi, 2)),
        Object.defineProperty(e, 'toString', {
          value: () => e.message,
          enumerable: !1,
        }));
    },
    ol = y('$ZodError', Iv),
    fe = y('$ZodError', Iv, { Parent: Error });
  function al(e, t = (i) => i.message) {
    let i = {},
      n = [];
    for (let r of e.issues)
      r.path.length > 0
        ? ((i[r.path[0]] = i[r.path[0]] || []), i[r.path[0]].push(t(r)))
        : n.push(t(r));
    return { formErrors: n, fieldErrors: i };
  }
  function sl(e, t = (i) => i.message) {
    let i = { _errors: [] },
      n = (r) => {
        for (let o of r.issues)
          if (o.code === 'invalid_union' && o.errors.length)
            o.errors.map((s) => n({ issues: s }));
          else if (o.code === 'invalid_key') n({ issues: o.issues });
          else if (o.code === 'invalid_element') n({ issues: o.issues });
          else if (o.path.length === 0) i._errors.push(t(o));
          else {
            let s = i,
              u = 0;
            for (; u < o.path.length; ) {
              let a = o.path[u];
              (u === o.path.length - 1
                ? ((s[a] = s[a] || { _errors: [] }), s[a]._errors.push(t(o)))
                : (s[a] = s[a] || { _errors: [] }),
                (s = s[a]),
                u++);
            }
          }
      };
    return (n(e), i);
  }
  function zv(e, t = (i) => i.message) {
    let i = { errors: [] },
      n = (r, o = []) => {
        var s, u;
        for (let a of r.issues)
          if (a.code === 'invalid_union' && a.errors.length)
            a.errors.map((c) => n({ issues: c }, a.path));
          else if (a.code === 'invalid_key') n({ issues: a.issues }, a.path);
          else if (a.code === 'invalid_element')
            n({ issues: a.issues }, a.path);
          else {
            let c = [...o, ...a.path];
            if (c.length === 0) {
              i.errors.push(t(a));
              continue;
            }
            let m = i,
              p = 0;
            for (; p < c.length; ) {
              let f = c[p],
                v = p === c.length - 1;
              (typeof f == 'string'
                ? (m.properties != null || (m.properties = {}),
                  (s = m.properties)[f] != null || (s[f] = { errors: [] }),
                  (m = m.properties[f]))
                : (m.items != null || (m.items = []),
                  (u = m.items)[f] != null || (u[f] = { errors: [] }),
                  (m = m.items[f])),
                v && m.errors.push(t(a)),
                p++);
            }
          }
      };
    return (n(e), i);
  }
  function jv(e) {
    let t = [],
      i = e.map((n) => (typeof n == 'object' ? n.key : n));
    for (let n of i)
      typeof n == 'number'
        ? t.push(`[${n}]`)
        : typeof n == 'symbol'
          ? t.push(`[${JSON.stringify(String(n))}]`)
          : /[^\w$]/.test(n)
            ? t.push(`[${JSON.stringify(n)}]`)
            : (t.length && t.push('.'), t.push(n));
    return t.join('');
  }
  function Ov(e) {
    var t;
    let i = [],
      n = [...e.issues].sort((r, o) => {
        var s, u;
        return (
          ((s = r.path) != null ? s : []).length -
          ((u = o.path) != null ? u : []).length
        );
      });
    for (let r of n)
      (i.push(`✖ ${r.message}`),
        (t = r.path) != null && t.length && i.push(`  → at ${jv(r.path)}`));
    return i.join(`
`);
  }
  var Qn = (e) => (t, i, n, r) => {
      var o;
      let s = n ? Object.assign(n, { async: !1 }) : { async: !1 },
        u = t._zod.run({ value: i, issues: [] }, s);
      if (u instanceof Promise) throw new ft();
      if (u.issues.length) {
        let a = new ((o = r?.Err) != null ? o : e)(
          u.issues.map((c) => Ie(c, s, ae())),
        );
        throw (il(a, r?.callee), a);
      }
      return u.value;
    },
    Gc = Qn(fe),
    er = (e) => async (t, i, n, r) => {
      var o;
      let s = n ? Object.assign(n, { async: !0 }) : { async: !0 },
        u = t._zod.run({ value: i, issues: [] }, s);
      if ((u instanceof Promise && (u = await u), u.issues.length)) {
        let a = new ((o = r?.Err) != null ? o : e)(
          u.issues.map((c) => Ie(c, s, ae())),
        );
        throw (il(a, r?.callee), a);
      }
      return u.value;
    },
    Kc = er(fe),
    tr = (e) => (t, i, n) => {
      let r = n ? { ...n, async: !1 } : { async: !1 },
        o = t._zod.run({ value: i, issues: [] }, r);
      if (o instanceof Promise) throw new ft();
      return o.issues.length
        ? {
            success: !1,
            error: new (e ?? ol)(o.issues.map((s) => Ie(s, r, ae()))),
          }
        : { success: !0, data: o.value };
    },
    Uv = tr(fe),
    nr = (e) => async (t, i, n) => {
      let r = n ? Object.assign(n, { async: !0 }) : { async: !0 },
        o = t._zod.run({ value: i, issues: [] }, r);
      return (
        o instanceof Promise && (o = await o),
        o.issues.length
          ? { success: !1, error: new e(o.issues.map((s) => Ie(s, r, ae()))) }
          : { success: !0, data: o.value }
      );
    },
    Pv = nr(fe),
    ul = (e) => (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return Qn(e)(t, i, r);
    },
    AI = ul(fe),
    cl = (e) => (t, i, n) => Qn(e)(t, i, n),
    CI = cl(fe),
    ll = (e) => async (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return er(e)(t, i, r);
    },
    LI = ll(fe),
    dl = (e) => async (t, i, n) => er(e)(t, i, n),
    RI = dl(fe),
    ml = (e) => (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return tr(e)(t, i, r);
    },
    JI = ml(fe),
    pl = (e) => (t, i, n) => tr(e)(t, i, n),
    FI = pl(fe),
    fl = (e) => async (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return nr(e)(t, i, r);
    },
    VI = fl(fe),
    vl = (e) => async (t, i, n) => nr(e)(t, i, n),
    MI = vl(fe),
    yt = {};
  $e(yt, {
    base64: () => Gv,
    base64url: () => gl,
    bigint: () => ng,
    boolean: () => og,
    browserEmail: () => YI,
    cidrv4: () => Wv,
    cidrv6: () => Bv,
    cuid: () => Nv,
    cuid2: () => Dv,
    date: () => Hv,
    datetime: () => eg,
    domain: () => ez,
    duration: () => Cv,
    e164: () => qv,
    email: () => Rv,
    emoji: () => Fv,
    extendedDuration: () => WI,
    guid: () => Lv,
    hex: () => tz,
    hostname: () => Kv,
    html5Email: () => qI,
    idnEmail: () => HI,
    integer: () => rg,
    ipv4: () => Vv,
    ipv6: () => Mv,
    ksuid: () => Tv,
    lowercase: () => ug,
    md5_base64: () => rz,
    md5_base64url: () => iz,
    md5_hex: () => nz,
    nanoid: () => Av,
    null: () => ag,
    number: () => ig,
    rfc5322Email: () => XI,
    sha1_base64: () => az,
    sha1_base64url: () => sz,
    sha1_hex: () => oz,
    sha256_base64: () => cz,
    sha256_base64url: () => lz,
    sha256_hex: () => uz,
    sha384_base64: () => mz,
    sha384_base64url: () => pz,
    sha384_hex: () => dz,
    sha512_base64: () => vz,
    sha512_base64url: () => gz,
    sha512_hex: () => fz,
    string: () => tg,
    time: () => Qv,
    ulid: () => Zv,
    undefined: () => sg,
    unicodeEmail: () => Jv,
    uppercase: () => cg,
    uuid: () => Mt,
    uuid4: () => BI,
    uuid6: () => GI,
    uuid7: () => KI,
    xid: () => Ev,
  });
  var Nv = /^[cC][^\s-]{8,}$/,
    Dv = /^[0-9a-z]+$/,
    Zv = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/,
    Ev = /^[0-9a-vA-V]{20}$/,
    Tv = /^[A-Za-z0-9]{27}$/,
    Av = /^[a-zA-Z0-9_-]{21}$/,
    Cv =
      /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/,
    WI =
      /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
    Lv =
      /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
    Mt = (e) =>
      e
        ? new RegExp(
            `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`,
          )
        : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/,
    BI = Mt(4),
    GI = Mt(6),
    KI = Mt(7),
    Rv =
      /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/,
    qI =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    XI =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    Jv = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u,
    HI = Jv,
    YI =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    QI = '^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$';
  function Fv() {
    return new RegExp(QI, 'u');
  }
  var Vv =
      /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    Mv =
      /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/,
    Wv =
      /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/,
    Bv =
      /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    Gv =
      /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/,
    gl = /^[A-Za-z0-9_-]*$/,
    Kv =
      /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/,
    ez = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    qv = /^\+(?:[0-9]){6,14}[0-9]$/,
    Xv =
      '(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))',
    Hv = new RegExp(`^${Xv}$`);
  function Yv(e) {
    let t = '(?:[01]\\d|2[0-3]):[0-5]\\d';
    return typeof e.precision == 'number'
      ? e.precision === -1
        ? `${t}`
        : e.precision === 0
          ? `${t}:[0-5]\\d`
          : `${t}:[0-5]\\d\\.\\d{${e.precision}}`
      : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  }
  function Qv(e) {
    return new RegExp(`^${Yv(e)}$`);
  }
  function eg(e) {
    let t = Yv({ precision: e.precision }),
      i = ['Z'];
    (e.local && i.push(''),
      e.offset && i.push('([+-](?:[01]\\d|2[0-3]):[0-5]\\d)'));
    let n = `${t}(?:${i.join('|')})`;
    return new RegExp(`^${Xv}T(?:${n})$`);
  }
  var tg = (e) => {
      var t, i;
      let n = e
        ? `[\\s\\S]{${(t = e?.minimum) != null ? t : 0},${(i = e?.maximum) != null ? i : ''}}`
        : '[\\s\\S]*';
      return new RegExp(`^${n}$`);
    },
    ng = /^-?\d+n?$/,
    rg = /^-?\d+$/,
    ig = /^-?\d+(?:\.\d+)?/,
    og = /^(?:true|false)$/i,
    ag = /^null$/i,
    sg = /^undefined$/i,
    ug = /^[^A-Z]*$/,
    cg = /^[^a-z]*$/,
    tz = /^[0-9a-fA-F]*$/;
  function rr(e, t) {
    return new RegExp(`^[A-Za-z0-9+/]{${e}}${t}$`);
  }
  function ir(e) {
    return new RegExp(`^[A-Za-z0-9_-]{${e}}$`);
  }
  var nz = /^[0-9a-fA-F]{32}$/,
    rz = rr(22, '=='),
    iz = ir(22),
    oz = /^[0-9a-fA-F]{40}$/,
    az = rr(27, '='),
    sz = ir(27),
    uz = /^[0-9a-fA-F]{64}$/,
    cz = rr(43, '='),
    lz = ir(43),
    dz = /^[0-9a-fA-F]{96}$/,
    mz = rr(64, ''),
    pz = ir(64),
    fz = /^[0-9a-fA-F]{128}$/,
    vz = rr(86, '=='),
    gz = ir(86),
    K = y('$ZodCheck', (e, t) => {
      var i;
      (e._zod != null || (e._zod = {}),
        (e._zod.def = t),
        (i = e._zod).onattach != null || (i.onattach = []));
    }),
    lg = { number: 'number', bigint: 'bigint', object: 'date' },
    hl = y('$ZodCheckLessThan', (e, t) => {
      K.init(e, t);
      let i = lg[typeof t.value];
      (e._zod.onattach.push((n) => {
        var r;
        let o = n._zod.bag,
          s =
            (r = t.inclusive ? o.maximum : o.exclusiveMaximum) != null
              ? r
              : Number.POSITIVE_INFINITY;
        t.value < s &&
          (t.inclusive
            ? (o.maximum = t.value)
            : (o.exclusiveMaximum = t.value));
      }),
        (e._zod.check = (n) => {
          (t.inclusive ? n.value <= t.value : n.value < t.value) ||
            n.issues.push({
              origin: i,
              code: 'too_big',
              maximum: t.value,
              input: n.value,
              inclusive: t.inclusive,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    bl = y('$ZodCheckGreaterThan', (e, t) => {
      K.init(e, t);
      let i = lg[typeof t.value];
      (e._zod.onattach.push((n) => {
        var r;
        let o = n._zod.bag,
          s =
            (r = t.inclusive ? o.minimum : o.exclusiveMinimum) != null
              ? r
              : Number.NEGATIVE_INFINITY;
        t.value > s &&
          (t.inclusive
            ? (o.minimum = t.value)
            : (o.exclusiveMinimum = t.value));
      }),
        (e._zod.check = (n) => {
          (t.inclusive ? n.value >= t.value : n.value > t.value) ||
            n.issues.push({
              origin: i,
              code: 'too_small',
              minimum: t.value,
              input: n.value,
              inclusive: t.inclusive,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    dg = y('$ZodCheckMultipleOf', (e, t) => {
      (K.init(e, t),
        e._zod.onattach.push((i) => {
          var n;
          (n = i._zod.bag).multipleOf != null || (n.multipleOf = t.value);
        }),
        (e._zod.check = (i) => {
          if (typeof i.value != typeof t.value)
            throw new Error(
              'Cannot mix number and bigint in multiple_of check.',
            );
          (typeof i.value == 'bigint'
            ? i.value % t.value === BigInt(0)
            : hv(i.value, t.value) === 0) ||
            i.issues.push({
              origin: typeof i.value,
              code: 'not_multiple_of',
              divisor: t.value,
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    mg = y('$ZodCheckNumberFormat', (e, t) => {
      var i;
      (K.init(e, t), (t.format = t.format || 'float64'));
      let n = (i = t.format) == null ? void 0 : i.includes('int'),
        r = n ? 'int' : 'number',
        [o, s] = kv[t.format];
      (e._zod.onattach.push((u) => {
        let a = u._zod.bag;
        ((a.format = t.format),
          (a.minimum = o),
          (a.maximum = s),
          n && (a.pattern = rg));
      }),
        (e._zod.check = (u) => {
          let a = u.value;
          if (n) {
            if (!Number.isInteger(a))
              return void u.issues.push({
                expected: r,
                format: t.format,
                code: 'invalid_type',
                continue: !1,
                input: a,
                inst: e,
              });
            if (!Number.isSafeInteger(a))
              return void (a > 0
                ? u.issues.push({
                    input: a,
                    code: 'too_big',
                    maximum: Number.MAX_SAFE_INTEGER,
                    note: 'Integers must be within the safe integer range.',
                    inst: e,
                    origin: r,
                    continue: !t.abort,
                  })
                : u.issues.push({
                    input: a,
                    code: 'too_small',
                    minimum: Number.MIN_SAFE_INTEGER,
                    note: 'Integers must be within the safe integer range.',
                    inst: e,
                    origin: r,
                    continue: !t.abort,
                  }));
          }
          (a < o &&
            u.issues.push({
              origin: 'number',
              input: a,
              code: 'too_small',
              minimum: o,
              inclusive: !0,
              inst: e,
              continue: !t.abort,
            }),
            a > s &&
              u.issues.push({
                origin: 'number',
                input: a,
                code: 'too_big',
                maximum: s,
                inst: e,
              }));
        }));
    }),
    pg = y('$ZodCheckBigIntFormat', (e, t) => {
      K.init(e, t);
      let [i, n] = xv[t.format];
      (e._zod.onattach.push((r) => {
        let o = r._zod.bag;
        ((o.format = t.format), (o.minimum = i), (o.maximum = n));
      }),
        (e._zod.check = (r) => {
          let o = r.value;
          (o < i &&
            r.issues.push({
              origin: 'bigint',
              input: o,
              code: 'too_small',
              minimum: i,
              inclusive: !0,
              inst: e,
              continue: !t.abort,
            }),
            o > n &&
              r.issues.push({
                origin: 'bigint',
                input: o,
                code: 'too_big',
                maximum: n,
                inst: e,
              }));
        }));
    }),
    fg = y('$ZodCheckMaxSize', (e, t) => {
      var i;
      (K.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !bt(r) && r.size !== void 0;
          }),
        e._zod.onattach.push((n) => {
          var r;
          let o =
            (r = n._zod.bag.maximum) != null ? r : Number.POSITIVE_INFINITY;
          t.maximum < o && (n._zod.bag.maximum = t.maximum);
        }),
        (e._zod.check = (n) => {
          let r = n.value;
          r.size <= t.maximum ||
            n.issues.push({
              origin: eo(r),
              code: 'too_big',
              maximum: t.maximum,
              inclusive: !0,
              input: r,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    vg = y('$ZodCheckMinSize', (e, t) => {
      var i;
      (K.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !bt(r) && r.size !== void 0;
          }),
        e._zod.onattach.push((n) => {
          var r;
          let o =
            (r = n._zod.bag.minimum) != null ? r : Number.NEGATIVE_INFINITY;
          t.minimum > o && (n._zod.bag.minimum = t.minimum);
        }),
        (e._zod.check = (n) => {
          let r = n.value;
          r.size >= t.minimum ||
            n.issues.push({
              origin: eo(r),
              code: 'too_small',
              minimum: t.minimum,
              inclusive: !0,
              input: r,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    gg = y('$ZodCheckSizeEquals', (e, t) => {
      var i;
      (K.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !bt(r) && r.size !== void 0;
          }),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag;
          ((r.minimum = t.size), (r.maximum = t.size), (r.size = t.size));
        }),
        (e._zod.check = (n) => {
          let r = n.value,
            o = r.size;
          if (o === t.size) return;
          let s = o > t.size;
          n.issues.push({
            origin: eo(r),
            ...(s
              ? { code: 'too_big', maximum: t.size }
              : { code: 'too_small', minimum: t.size }),
            inclusive: !0,
            exact: !0,
            input: n.value,
            inst: e,
            continue: !t.abort,
          });
        }));
    }),
    hg = y('$ZodCheckMaxLength', (e, t) => {
      var i;
      (K.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !bt(r) && r.length !== void 0;
          }),
        e._zod.onattach.push((n) => {
          var r;
          let o =
            (r = n._zod.bag.maximum) != null ? r : Number.POSITIVE_INFINITY;
          t.maximum < o && (n._zod.bag.maximum = t.maximum);
        }),
        (e._zod.check = (n) => {
          let r = n.value;
          if (r.length <= t.maximum) return;
          let o = to(r);
          n.issues.push({
            origin: o,
            code: 'too_big',
            maximum: t.maximum,
            inclusive: !0,
            input: r,
            inst: e,
            continue: !t.abort,
          });
        }));
    }),
    bg = y('$ZodCheckMinLength', (e, t) => {
      var i;
      (K.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !bt(r) && r.length !== void 0;
          }),
        e._zod.onattach.push((n) => {
          var r;
          let o =
            (r = n._zod.bag.minimum) != null ? r : Number.NEGATIVE_INFINITY;
          t.minimum > o && (n._zod.bag.minimum = t.minimum);
        }),
        (e._zod.check = (n) => {
          let r = n.value;
          if (r.length >= t.minimum) return;
          let o = to(r);
          n.issues.push({
            origin: o,
            code: 'too_small',
            minimum: t.minimum,
            inclusive: !0,
            input: r,
            inst: e,
            continue: !t.abort,
          });
        }));
    }),
    yg = y('$ZodCheckLengthEquals', (e, t) => {
      var i;
      (K.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !bt(r) && r.length !== void 0;
          }),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag;
          ((r.minimum = t.length),
            (r.maximum = t.length),
            (r.length = t.length));
        }),
        (e._zod.check = (n) => {
          let r = n.value,
            o = r.length;
          if (o === t.length) return;
          let s = to(r),
            u = o > t.length;
          n.issues.push({
            origin: s,
            ...(u
              ? { code: 'too_big', maximum: t.length }
              : { code: 'too_small', minimum: t.length }),
            inclusive: !0,
            exact: !0,
            input: n.value,
            inst: e,
            continue: !t.abort,
          });
        }));
    }),
    or = y('$ZodCheckStringFormat', (e, t) => {
      var i, n;
      (K.init(e, t),
        e._zod.onattach.push((r) => {
          let o = r._zod.bag;
          ((o.format = t.format),
            t.pattern &&
              (o.patterns != null || (o.patterns = new Set()),
              o.patterns.add(t.pattern)));
        }),
        t.pattern
          ? (i = e._zod).check != null ||
            (i.check = (r) => {
              ((t.pattern.lastIndex = 0),
                t.pattern.test(r.value) ||
                  r.issues.push({
                    origin: 'string',
                    code: 'invalid_format',
                    format: t.format,
                    input: r.value,
                    ...(t.pattern ? { pattern: t.pattern.toString() } : {}),
                    inst: e,
                    continue: !t.abort,
                  }));
            })
          : (n = e._zod).check != null || (n.check = () => {}));
    }),
    $g = y('$ZodCheckRegex', (e, t) => {
      (or.init(e, t),
        (e._zod.check = (i) => {
          ((t.pattern.lastIndex = 0),
            t.pattern.test(i.value) ||
              i.issues.push({
                origin: 'string',
                code: 'invalid_format',
                format: 'regex',
                input: i.value,
                pattern: t.pattern.toString(),
                inst: e,
                continue: !t.abort,
              }));
        }));
    }),
    _g = y('$ZodCheckLowerCase', (e, t) => {
      (t.pattern != null || (t.pattern = ug), or.init(e, t));
    }),
    kg = y('$ZodCheckUpperCase', (e, t) => {
      (t.pattern != null || (t.pattern = cg), or.init(e, t));
    }),
    xg = y('$ZodCheckIncludes', (e, t) => {
      K.init(e, t);
      let i = He(t.includes),
        n = new RegExp(
          typeof t.position == 'number' ? `^.{${t.position}}${i}` : i,
        );
      ((t.pattern = n),
        e._zod.onattach.push((r) => {
          let o = r._zod.bag;
          (o.patterns != null || (o.patterns = new Set()), o.patterns.add(n));
        }),
        (e._zod.check = (r) => {
          r.value.includes(t.includes, t.position) ||
            r.issues.push({
              origin: 'string',
              code: 'invalid_format',
              format: 'includes',
              includes: t.includes,
              input: r.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    wg = y('$ZodCheckStartsWith', (e, t) => {
      K.init(e, t);
      let i = new RegExp(`^${He(t.prefix)}.*`);
      (t.pattern != null || (t.pattern = i),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag;
          (r.patterns != null || (r.patterns = new Set()), r.patterns.add(i));
        }),
        (e._zod.check = (n) => {
          n.value.startsWith(t.prefix) ||
            n.issues.push({
              origin: 'string',
              code: 'invalid_format',
              format: 'starts_with',
              prefix: t.prefix,
              input: n.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    Sg = y('$ZodCheckEndsWith', (e, t) => {
      K.init(e, t);
      let i = new RegExp(`.*${He(t.suffix)}$`);
      (t.pattern != null || (t.pattern = i),
        e._zod.onattach.push((n) => {
          let r = n._zod.bag;
          (r.patterns != null || (r.patterns = new Set()), r.patterns.add(i));
        }),
        (e._zod.check = (n) => {
          n.value.endsWith(t.suffix) ||
            n.issues.push({
              origin: 'string',
              code: 'invalid_format',
              format: 'ends_with',
              suffix: t.suffix,
              input: n.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    });
  function Hf(e, t, i) {
    e.issues.length && t.issues.push(...we(i, e.issues));
  }
  var Ig = y('$ZodCheckProperty', (e, t) => {
      (K.init(e, t),
        (e._zod.check = (i) => {
          let n = t.schema._zod.run(
            { value: i.value[t.property], issues: [] },
            {},
          );
          if (n instanceof Promise) return n.then((r) => Hf(r, i, t.property));
          Hf(n, i, t.property);
        }));
    }),
    zg = y('$ZodCheckMimeType', (e, t) => {
      K.init(e, t);
      let i = new Set(t.mime);
      (e._zod.onattach.push((n) => {
        n._zod.bag.mime = t.mime;
      }),
        (e._zod.check = (n) => {
          i.has(n.value.type) ||
            n.issues.push({
              code: 'invalid_value',
              values: t.mime,
              input: n.value.type,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    jg = y('$ZodCheckOverwrite', (e, t) => {
      (K.init(e, t),
        (e._zod.check = (i) => {
          i.value = t.tx(i.value);
        }));
    }),
    Og = class {
      constructor(e = []) {
        ((this.content = []), (this.indent = 0), this && (this.args = e));
      }
      indented(e) {
        ((this.indent += 1), e(this), (this.indent -= 1));
      }
      write(e) {
        if (typeof e == 'function')
          return (
            e(this, { execution: 'sync' }),
            void e(this, { execution: 'async' })
          );
        let t = e
            .split(
              `
`,
            )
            .filter((r) => r),
          i = Math.min(...t.map((r) => r.length - r.trimStart().length)),
          n = t
            .map((r) => r.slice(i))
            .map((r) => ' '.repeat(2 * this.indent) + r);
        for (let r of n) this.content.push(r);
      }
      compile() {
        var e;
        return new Function(
          ...(this == null ? void 0 : this.args),
          [
            ...((e = this == null ? void 0 : this.content) != null
              ? e
              : ['']
            ).map((t) => `  ${t}`),
          ].join(`
`),
        );
      }
    },
    Ug = { major: 4, minor: 1, patch: 12 },
    E = y('$ZodType', (e, t) => {
      var i, n, r;
      (e != null || (e = {}),
        (e._zod.def = t),
        (e._zod.bag = e._zod.bag || {}),
        (e._zod.version = Ug));
      let o = [...((i = e._zod.def.checks) != null ? i : [])];
      e._zod.traits.has('$ZodCheck') && o.unshift(e);
      for (let s of o) for (let u of s._zod.onattach) u(e);
      if (o.length === 0)
        ((r = e._zod).deferred != null || (r.deferred = []),
          (n = e._zod.deferred) == null ||
            n.push(() => {
              e._zod.run = e._zod.parse;
            }));
      else {
        let s = (a, c, m) => {
            let p,
              f = dt(a);
            for (let v of c) {
              if (v._zod.def.when) {
                if (!v._zod.def.when(a)) continue;
              } else if (f) continue;
              let b = a.issues.length,
                $ = v._zod.check(a);
              if ($ instanceof Promise && m?.async === !1) throw new ft();
              if (p || $ instanceof Promise)
                p = (p ?? Promise.resolve()).then(async () => {
                  (await $, a.issues.length !== b && (f || (f = dt(a, b))));
                });
              else {
                if (a.issues.length === b) continue;
                f || (f = dt(a, b));
              }
            }
            return p ? p.then(() => a) : a;
          },
          u = (a, c, m) => {
            if (dt(a)) return ((a.aborted = !0), a);
            let p = s(c, o, m);
            if (p instanceof Promise) {
              if (m.async === !1) throw new ft();
              return p.then((f) => e._zod.parse(f, m));
            }
            return e._zod.parse(p, m);
          };
        e._zod.run = (a, c) => {
          if (c.skipChecks) return e._zod.parse(a, c);
          if (c.direction === 'backward') {
            let p = e._zod.parse(
              { value: a.value, issues: [] },
              { ...c, skipChecks: !0 },
            );
            return p instanceof Promise
              ? p.then((f) => u(f, a, c))
              : u(p, a, c);
          }
          let m = e._zod.parse(a, c);
          if (m instanceof Promise) {
            if (c.async === !1) throw new ft();
            return m.then((p) => s(p, o, c));
          }
          return s(m, o, c);
        };
      }
      e['~standard'] = {
        validate: (s) => {
          var u;
          try {
            let a = Uv(e, s);
            return a.success
              ? { value: a.data }
              : { issues: (u = a.error) == null ? void 0 : u.issues };
          } catch {
            return Pv(e, s).then((c) => {
              var m;
              return c.success
                ? { value: c.data }
                : { issues: (m = c.error) == null ? void 0 : m.issues };
            });
          }
        },
        vendor: 'zod',
        version: 1,
      };
    }),
    ar = y('$ZodString', (e, t) => {
      var i, n, r;
      (E.init(e, t),
        (e._zod.pattern =
          (r = [
            ...((n = (i = e?._zod.bag) == null ? void 0 : i.patterns) != null
              ? n
              : []),
          ].pop()) != null
            ? r
            : tg(e._zod.bag)),
        (e._zod.parse = (o, s) => {
          if (t.coerce)
            try {
              o.value = String(o.value);
            } catch {}
          return (
            typeof o.value == 'string' ||
              o.issues.push({
                expected: 'string',
                code: 'invalid_type',
                input: o.value,
                inst: e,
              }),
            o
          );
        }));
    }),
    W = y('$ZodStringFormat', (e, t) => {
      (or.init(e, t), ar.init(e, t));
    }),
    Pg = y('$ZodGUID', (e, t) => {
      (t.pattern != null || (t.pattern = Lv), W.init(e, t));
    }),
    Ng = y('$ZodUUID', (e, t) => {
      if (t.version) {
        let i = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[
          t.version
        ];
        if (i === void 0)
          throw new Error(`Invalid UUID version: "${t.version}"`);
        t.pattern != null || (t.pattern = Mt(i));
      } else t.pattern != null || (t.pattern = Mt());
      W.init(e, t);
    }),
    Dg = y('$ZodEmail', (e, t) => {
      (t.pattern != null || (t.pattern = Rv), W.init(e, t));
    }),
    Zg = y('$ZodURL', (e, t) => {
      (W.init(e, t),
        (e._zod.check = (i) => {
          try {
            let n = i.value.trim(),
              r = new URL(n);
            return (
              t.hostname &&
                ((t.hostname.lastIndex = 0),
                t.hostname.test(r.hostname) ||
                  i.issues.push({
                    code: 'invalid_format',
                    format: 'url',
                    note: 'Invalid hostname',
                    pattern: Kv.source,
                    input: i.value,
                    inst: e,
                    continue: !t.abort,
                  })),
              t.protocol &&
                ((t.protocol.lastIndex = 0),
                t.protocol.test(
                  r.protocol.endsWith(':')
                    ? r.protocol.slice(0, -1)
                    : r.protocol,
                ) ||
                  i.issues.push({
                    code: 'invalid_format',
                    format: 'url',
                    note: 'Invalid protocol',
                    pattern: t.protocol.source,
                    input: i.value,
                    inst: e,
                    continue: !t.abort,
                  })),
              void (t.normalize ? (i.value = r.href) : (i.value = n))
            );
          } catch {
            i.issues.push({
              code: 'invalid_format',
              format: 'url',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
          }
        }));
    }),
    Eg = y('$ZodEmoji', (e, t) => {
      (t.pattern != null || (t.pattern = Fv()), W.init(e, t));
    }),
    Tg = y('$ZodNanoID', (e, t) => {
      (t.pattern != null || (t.pattern = Av), W.init(e, t));
    }),
    Ag = y('$ZodCUID', (e, t) => {
      (t.pattern != null || (t.pattern = Nv), W.init(e, t));
    }),
    Cg = y('$ZodCUID2', (e, t) => {
      (t.pattern != null || (t.pattern = Dv), W.init(e, t));
    }),
    Lg = y('$ZodULID', (e, t) => {
      (t.pattern != null || (t.pattern = Zv), W.init(e, t));
    }),
    Rg = y('$ZodXID', (e, t) => {
      (t.pattern != null || (t.pattern = Ev), W.init(e, t));
    }),
    Jg = y('$ZodKSUID', (e, t) => {
      (t.pattern != null || (t.pattern = Tv), W.init(e, t));
    }),
    Fg = y('$ZodISODateTime', (e, t) => {
      (t.pattern != null || (t.pattern = eg(t)), W.init(e, t));
    }),
    Vg = y('$ZodISODate', (e, t) => {
      (t.pattern != null || (t.pattern = Hv), W.init(e, t));
    }),
    Mg = y('$ZodISOTime', (e, t) => {
      (t.pattern != null || (t.pattern = Qv(t)), W.init(e, t));
    }),
    Wg = y('$ZodISODuration', (e, t) => {
      (t.pattern != null || (t.pattern = Cv), W.init(e, t));
    }),
    Bg = y('$ZodIPv4', (e, t) => {
      (t.pattern != null || (t.pattern = Vv),
        W.init(e, t),
        e._zod.onattach.push((i) => {
          i._zod.bag.format = 'ipv4';
        }));
    }),
    Gg = y('$ZodIPv6', (e, t) => {
      (t.pattern != null || (t.pattern = Mv),
        W.init(e, t),
        e._zod.onattach.push((i) => {
          i._zod.bag.format = 'ipv6';
        }),
        (e._zod.check = (i) => {
          try {
            new URL(`http://[${i.value}]`);
          } catch {
            i.issues.push({
              code: 'invalid_format',
              format: 'ipv6',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
          }
        }));
    }),
    Kg = y('$ZodCIDRv4', (e, t) => {
      (t.pattern != null || (t.pattern = Wv), W.init(e, t));
    }),
    qg = y('$ZodCIDRv6', (e, t) => {
      (t.pattern != null || (t.pattern = Bv),
        W.init(e, t),
        (e._zod.check = (i) => {
          let n = i.value.split('/');
          try {
            if (n.length !== 2) throw new Error();
            let [r, o] = n;
            if (!o) throw new Error();
            let s = Number(o);
            if (`${s}` !== o) throw new Error();
            if (s < 0 || s > 128) throw new Error();
            new URL(`http://[${r}]`);
          } catch {
            i.issues.push({
              code: 'invalid_format',
              format: 'cidrv6',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
          }
        }));
    });
  function yl(e) {
    if (e === '') return !0;
    if (e.length % 4 != 0) return !1;
    try {
      return (atob(e), !0);
    } catch {
      return !1;
    }
  }
  var Xg = y('$ZodBase64', (e, t) => {
    (t.pattern != null || (t.pattern = Gv),
      W.init(e, t),
      e._zod.onattach.push((i) => {
        i._zod.bag.contentEncoding = 'base64';
      }),
      (e._zod.check = (i) => {
        yl(i.value) ||
          i.issues.push({
            code: 'invalid_format',
            format: 'base64',
            input: i.value,
            inst: e,
            continue: !t.abort,
          });
      }));
  });
  function Hg(e) {
    if (!gl.test(e)) return !1;
    let t = e.replace(/[-_]/g, (i) => (i === '-' ? '+' : '/'));
    return yl(t.padEnd(4 * Math.ceil(t.length / 4), '='));
  }
  var Yg = y('$ZodBase64URL', (e, t) => {
      (t.pattern != null || (t.pattern = gl),
        W.init(e, t),
        e._zod.onattach.push((i) => {
          i._zod.bag.contentEncoding = 'base64url';
        }),
        (e._zod.check = (i) => {
          Hg(i.value) ||
            i.issues.push({
              code: 'invalid_format',
              format: 'base64url',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    Qg = y('$ZodE164', (e, t) => {
      (t.pattern != null || (t.pattern = qv), W.init(e, t));
    });
  function eh(e, t = null) {
    try {
      let i = e.split('.');
      if (i.length !== 3) return !1;
      let [n] = i;
      if (!n) return !1;
      let r = JSON.parse(atob(n));
      return (
        (!('typ' in r) || r?.typ === 'JWT') &&
        !!r.alg &&
        (!t || ('alg' in r && r.alg === t))
      );
    } catch {
      return !1;
    }
  }
  var th = y('$ZodJWT', (e, t) => {
      (W.init(e, t),
        (e._zod.check = (i) => {
          eh(i.value, t.alg) ||
            i.issues.push({
              code: 'invalid_format',
              format: 'jwt',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    nh = y('$ZodCustomStringFormat', (e, t) => {
      (W.init(e, t),
        (e._zod.check = (i) => {
          t.fn(i.value) ||
            i.issues.push({
              code: 'invalid_format',
              format: t.format,
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    $l = y('$ZodNumber', (e, t) => {
      var i;
      (E.init(e, t),
        (e._zod.pattern = (i = e._zod.bag.pattern) != null ? i : ig),
        (e._zod.parse = (n, r) => {
          if (t.coerce)
            try {
              n.value = Number(n.value);
            } catch {}
          let o = n.value;
          if (typeof o == 'number' && !Number.isNaN(o) && Number.isFinite(o))
            return n;
          let s =
            typeof o == 'number'
              ? Number.isNaN(o)
                ? 'NaN'
                : Number.isFinite(o)
                  ? void 0
                  : 'Infinity'
              : void 0;
          return (
            n.issues.push({
              expected: 'number',
              code: 'invalid_type',
              input: o,
              inst: e,
              ...(s ? { received: s } : {}),
            }),
            n
          );
        }));
    }),
    rh = y('$ZodNumber', (e, t) => {
      (mg.init(e, t), $l.init(e, t));
    }),
    _l = y('$ZodBoolean', (e, t) => {
      (E.init(e, t),
        (e._zod.pattern = og),
        (e._zod.parse = (i, n) => {
          if (t.coerce)
            try {
              i.value = !!i.value;
            } catch {}
          let r = i.value;
          return (
            typeof r == 'boolean' ||
              i.issues.push({
                expected: 'boolean',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    kl = y('$ZodBigInt', (e, t) => {
      (E.init(e, t),
        (e._zod.pattern = ng),
        (e._zod.parse = (i, n) => {
          if (t.coerce)
            try {
              i.value = BigInt(i.value);
            } catch {}
          return (
            typeof i.value == 'bigint' ||
              i.issues.push({
                expected: 'bigint',
                code: 'invalid_type',
                input: i.value,
                inst: e,
              }),
            i
          );
        }));
    }),
    ih = y('$ZodBigInt', (e, t) => {
      (pg.init(e, t), kl.init(e, t));
    }),
    oh = y('$ZodSymbol', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            typeof r == 'symbol' ||
              i.issues.push({
                expected: 'symbol',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    ah = y('$ZodUndefined', (e, t) => {
      (E.init(e, t),
        (e._zod.pattern = sg),
        (e._zod.values = new Set([void 0])),
        (e._zod.optin = 'optional'),
        (e._zod.optout = 'optional'),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            r === void 0 ||
              i.issues.push({
                expected: 'undefined',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    sh = y('$ZodNull', (e, t) => {
      (E.init(e, t),
        (e._zod.pattern = ag),
        (e._zod.values = new Set([null])),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            r === null ||
              i.issues.push({
                expected: 'null',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    uh = y('$ZodAny', (e, t) => {
      (E.init(e, t), (e._zod.parse = (i) => i));
    }),
    ch = y('$ZodUnknown', (e, t) => {
      (E.init(e, t), (e._zod.parse = (i) => i));
    }),
    lh = y('$ZodNever', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => (
          i.issues.push({
            expected: 'never',
            code: 'invalid_type',
            input: i.value,
            inst: e,
          }),
          i
        )));
    }),
    dh = y('$ZodVoid', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            r === void 0 ||
              i.issues.push({
                expected: 'void',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    mh = y('$ZodDate', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => {
          if (t.coerce)
            try {
              i.value = new Date(i.value);
            } catch {}
          let r = i.value,
            o = r instanceof Date;
          return (
            (o && !Number.isNaN(r.getTime())) ||
              i.issues.push({
                expected: 'date',
                code: 'invalid_type',
                input: r,
                ...(o ? { received: 'Invalid Date' } : {}),
                inst: e,
              }),
            i
          );
        }));
    });
  function Yf(e, t, i) {
    (e.issues.length && t.issues.push(...we(i, e.issues)),
      (t.value[i] = e.value));
  }
  var ph = y('$ZodArray', (e, t) => {
    (E.init(e, t),
      (e._zod.parse = (i, n) => {
        let r = i.value;
        if (!Array.isArray(r))
          return (
            i.issues.push({
              expected: 'array',
              code: 'invalid_type',
              input: r,
              inst: e,
            }),
            i
          );
        i.value = Array(r.length);
        let o = [];
        for (let s = 0; s < r.length; s++) {
          let u = r[s],
            a = t.element._zod.run({ value: u, issues: [] }, n);
          a instanceof Promise
            ? o.push(a.then((c) => Yf(c, i, s)))
            : Yf(a, i, s);
        }
        return o.length ? Promise.all(o).then(() => i) : i;
      }));
  });
  function Bi(e, t, i, n) {
    (e.issues.length && t.issues.push(...we(i, e.issues)),
      e.value === void 0
        ? i in n && (t.value[i] = void 0)
        : (t.value[i] = e.value));
  }
  function fh(e) {
    var t, i, n, r;
    let o = Object.keys(e.shape);
    for (let u of o)
      if (
        !(
          (r =
            (n =
              (i = (t = e.shape) == null ? void 0 : t[u]) == null
                ? void 0
                : i._zod) == null
              ? void 0
              : n.traits) != null && r.has('$ZodType')
        )
      )
        throw new Error(`Invalid element at key "${u}": expected a Zod schema`);
    let s = _v(e.shape);
    return {
      ...e,
      keys: o,
      keySet: new Set(o),
      numKeys: o.length,
      optionalKeys: new Set(s),
    };
  }
  function vh(e, t, i, n, r, o) {
    let s = [],
      u = r.keySet,
      a = r.catchall._zod,
      c = a.def.type;
    for (let m of Object.keys(t)) {
      if (u.has(m)) continue;
      if (c === 'never') {
        s.push(m);
        continue;
      }
      let p = a.run({ value: t[m], issues: [] }, n);
      p instanceof Promise
        ? e.push(p.then((f) => Bi(f, i, m, t)))
        : Bi(p, i, m, t);
    }
    return (
      s.length &&
        i.issues.push({
          code: 'unrecognized_keys',
          keys: s,
          input: t,
          inst: o,
        }),
      e.length ? Promise.all(e).then(() => i) : i
    );
  }
  var gh = y('$ZodObject', (e, t) => {
      E.init(e, t);
      let i = Object.getOwnPropertyDescriptor(t, 'shape');
      if (!i?.get) {
        let u = t.shape;
        Object.defineProperty(t, 'shape', {
          get: () => {
            let a = { ...u };
            return (Object.defineProperty(t, 'shape', { value: a }), a);
          },
        });
      }
      let n = Yn(() => fh(t));
      R(e._zod, 'propValues', () => {
        let u = t.shape,
          a = {};
        for (let c in u) {
          let m = u[c]._zod;
          if (m.values) {
            a[c] != null || (a[c] = new Set());
            for (let p of m.values) a[c].add(p);
          }
        }
        return a;
      });
      let r = Vt,
        o = t.catchall,
        s;
      e._zod.parse = (u, a) => {
        s != null || (s = n.value);
        let c = u.value;
        if (!r(c))
          return (
            u.issues.push({
              expected: 'object',
              code: 'invalid_type',
              input: c,
              inst: e,
            }),
            u
          );
        u.value = {};
        let m = [],
          p = s.shape;
        for (let f of s.keys) {
          let v = p[f]._zod.run({ value: c[f], issues: [] }, a);
          v instanceof Promise
            ? m.push(v.then((b) => Bi(b, u, f, c)))
            : Bi(v, u, f, c);
        }
        return o
          ? vh(m, c, u, a, n.value, e)
          : m.length
            ? Promise.all(m).then(() => u)
            : u;
      };
    }),
    hh = y('$ZodObjectJIT', (e, t) => {
      gh.init(e, t);
      let i = e._zod.parse,
        n = Yn(() => fh(t)),
        r,
        o = Vt,
        s = !Fi.jitless,
        u = s && bv.value,
        a = t.catchall,
        c;
      e._zod.parse = (m, p) => {
        c != null || (c = n.value);
        let f = m.value;
        return o(f)
          ? s && u && p?.async === !1 && p.jitless !== !0
            ? (r ||
                (r = ((v) => {
                  let b = new Og(['shape', 'payload', 'ctx']),
                    $ = n.value,
                    g = (S) => {
                      let P = Bc(S);
                      return `shape[${P}]._zod.run({ value: input[${P}], issues: [] }, ctx)`;
                    };
                  b.write('const input = payload.value;');
                  let k = Object.create(null),
                    x = 0;
                  for (let S of $.keys) k[S] = 'key_' + x++;
                  b.write('const newResult = {};');
                  for (let S of $.keys) {
                    let P = k[S],
                      J = Bc(S);
                    (b.write(`const ${P} = ${g(S)};`),
                      b.write(`
        if (${P}.issues.length) {
          payload.issues = payload.issues.concat(${P}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${J}, ...iss.path] : [${J}]
          })));
        }
        
        
        if (${P}.value === undefined) {
          if (${J} in input) {
            newResult[${J}] = undefined;
          }
        } else {
          newResult[${J}] = ${P}.value;
        }
        
      `));
                  }
                  (b.write('payload.value = newResult;'),
                    b.write('return payload;'));
                  let w = b.compile();
                  return (S, P) => w(v, S, P);
                })(t.shape)),
              (m = r(m, p)),
              a ? vh([], f, m, p, c, e) : m)
            : i(m, p)
          : (m.issues.push({
              expected: 'object',
              code: 'invalid_type',
              input: f,
              inst: e,
            }),
            m);
      };
    });
  function Qf(e, t, i, n) {
    for (let o of e) if (o.issues.length === 0) return ((t.value = o.value), t);
    let r = e.filter((o) => !dt(o));
    return r.length === 1
      ? ((t.value = r[0].value), r[0])
      : (t.issues.push({
          code: 'invalid_union',
          input: t.value,
          inst: i,
          errors: e.map((o) => o.issues.map((s) => Ie(s, n, ae()))),
        }),
        t);
  }
  var xl = y('$ZodUnion', (e, t) => {
      (E.init(e, t),
        R(e._zod, 'optin', () =>
          t.options.some((r) => r._zod.optin === 'optional')
            ? 'optional'
            : void 0,
        ),
        R(e._zod, 'optout', () =>
          t.options.some((r) => r._zod.optout === 'optional')
            ? 'optional'
            : void 0,
        ),
        R(e._zod, 'values', () => {
          if (t.options.every((r) => r._zod.values))
            return new Set(t.options.flatMap((r) => Array.from(r._zod.values)));
        }),
        R(e._zod, 'pattern', () => {
          if (t.options.every((r) => r._zod.pattern)) {
            let r = t.options.map((o) => o._zod.pattern);
            return new RegExp(`^(${r.map((o) => Qi(o.source)).join('|')})$`);
          }
        }));
      let i = t.options.length === 1,
        n = t.options[0]._zod.run;
      e._zod.parse = (r, o) => {
        if (i) return n(r, o);
        let s = !1,
          u = [];
        for (let a of t.options) {
          let c = a._zod.run({ value: r.value, issues: [] }, o);
          if (c instanceof Promise) (u.push(c), (s = !0));
          else {
            if (c.issues.length === 0) return c;
            u.push(c);
          }
        }
        return s ? Promise.all(u).then((a) => Qf(a, r, e, o)) : Qf(u, r, e, o);
      };
    }),
    bh = y('$ZodDiscriminatedUnion', (e, t) => {
      xl.init(e, t);
      let i = e._zod.parse;
      R(e._zod, 'propValues', () => {
        let r = {};
        for (let o of t.options) {
          let s = o._zod.propValues;
          if (!s || Object.keys(s).length === 0)
            throw new Error(
              `Invalid discriminated union option at index "${t.options.indexOf(o)}"`,
            );
          for (let [u, a] of Object.entries(s)) {
            r[u] || (r[u] = new Set());
            for (let c of a) r[u].add(c);
          }
        }
        return r;
      });
      let n = Yn(() => {
        var r;
        let o = t.options,
          s = new Map();
        for (let u of o) {
          let a = (r = u._zod.propValues) == null ? void 0 : r[t.discriminator];
          if (!a || a.size === 0)
            throw new Error(
              `Invalid discriminated union option at index "${t.options.indexOf(u)}"`,
            );
          for (let c of a) {
            if (s.has(c))
              throw new Error(`Duplicate discriminator value "${String(c)}"`);
            s.set(c, u);
          }
        }
        return s;
      });
      e._zod.parse = (r, o) => {
        let s = r.value;
        if (!Vt(s))
          return (
            r.issues.push({
              code: 'invalid_type',
              expected: 'object',
              input: s,
              inst: e,
            }),
            r
          );
        let u = n.value.get(s?.[t.discriminator]);
        return u
          ? u._zod.run(r, o)
          : t.unionFallback
            ? i(r, o)
            : (r.issues.push({
                code: 'invalid_union',
                errors: [],
                note: 'No matching discriminator',
                discriminator: t.discriminator,
                input: s,
                path: [t.discriminator],
                inst: e,
              }),
              r);
      };
    }),
    yh = y('$ZodIntersection', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value,
            o = t.left._zod.run({ value: r, issues: [] }, n),
            s = t.right._zod.run({ value: r, issues: [] }, n);
          return o instanceof Promise || s instanceof Promise
            ? Promise.all([o, s]).then(([u, a]) => ev(i, u, a))
            : ev(i, o, s);
        }));
    });
  function qc(e, t) {
    if (e === t) return { valid: !0, data: e };
    if (e instanceof Date && t instanceof Date && +e == +t)
      return { valid: !0, data: e };
    if (vt(e) && vt(t)) {
      let i = Object.keys(t),
        n = Object.keys(e).filter((o) => i.indexOf(o) !== -1),
        r = { ...e, ...t };
      for (let o of n) {
        let s = qc(e[o], t[o]);
        if (!s.valid)
          return { valid: !1, mergeErrorPath: [o, ...s.mergeErrorPath] };
        r[o] = s.data;
      }
      return { valid: !0, data: r };
    }
    if (Array.isArray(e) && Array.isArray(t)) {
      if (e.length !== t.length) return { valid: !1, mergeErrorPath: [] };
      let i = [];
      for (let n = 0; n < e.length; n++) {
        let r = qc(e[n], t[n]);
        if (!r.valid)
          return { valid: !1, mergeErrorPath: [n, ...r.mergeErrorPath] };
        i.push(r.data);
      }
      return { valid: !0, data: i };
    }
    return { valid: !1, mergeErrorPath: [] };
  }
  function ev(e, t, i) {
    if (
      (t.issues.length && e.issues.push(...t.issues),
      i.issues.length && e.issues.push(...i.issues),
      dt(e))
    )
      return e;
    let n = qc(t.value, i.value);
    if (!n.valid)
      throw new Error(
        `Unmergable intersection. Error path: ${JSON.stringify(n.mergeErrorPath)}`,
      );
    return ((e.value = n.data), e);
  }
  var wl = y('$ZodTuple', (e, t) => {
    E.init(e, t);
    let i = t.items,
      n =
        i.length -
        [...i].reverse().findIndex((r) => r._zod.optin !== 'optional');
    e._zod.parse = (r, o) => {
      let s = r.value;
      if (!Array.isArray(s))
        return (
          r.issues.push({
            input: s,
            inst: e,
            expected: 'tuple',
            code: 'invalid_type',
          }),
          r
        );
      r.value = [];
      let u = [];
      if (!t.rest) {
        let c = s.length > i.length,
          m = s.length < n - 1;
        if (c || m)
          return (
            r.issues.push({
              ...(c
                ? { code: 'too_big', maximum: i.length }
                : { code: 'too_small', minimum: i.length }),
              input: s,
              inst: e,
              origin: 'array',
            }),
            r
          );
      }
      let a = -1;
      for (let c of i) {
        if ((a++, a >= s.length && a >= n)) continue;
        let m = c._zod.run({ value: s[a], issues: [] }, o);
        m instanceof Promise ? u.push(m.then((p) => Ai(p, r, a))) : Ai(m, r, a);
      }
      if (t.rest) {
        let c = s.slice(i.length);
        for (let m of c) {
          a++;
          let p = t.rest._zod.run({ value: m, issues: [] }, o);
          p instanceof Promise
            ? u.push(p.then((f) => Ai(f, r, a)))
            : Ai(p, r, a);
        }
      }
      return u.length ? Promise.all(u).then(() => r) : r;
    };
  });
  function Ai(e, t, i) {
    (e.issues.length && t.issues.push(...we(i, e.issues)),
      (t.value[i] = e.value));
  }
  var $h = y('$ZodRecord', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          if (!vt(r))
            return (
              i.issues.push({
                expected: 'record',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
              i
            );
          let o = [];
          if (t.keyType._zod.values) {
            let s = t.keyType._zod.values;
            i.value = {};
            for (let a of s)
              if (
                typeof a == 'string' ||
                typeof a == 'number' ||
                typeof a == 'symbol'
              ) {
                let c = t.valueType._zod.run({ value: r[a], issues: [] }, n);
                c instanceof Promise
                  ? o.push(
                      c.then((m) => {
                        (m.issues.length && i.issues.push(...we(a, m.issues)),
                          (i.value[a] = m.value));
                      }),
                    )
                  : (c.issues.length && i.issues.push(...we(a, c.issues)),
                    (i.value[a] = c.value));
              }
            let u;
            for (let a in r) s.has(a) || ((u = u ?? []), u.push(a));
            u &&
              u.length > 0 &&
              i.issues.push({
                code: 'unrecognized_keys',
                input: r,
                inst: e,
                keys: u,
              });
          } else {
            i.value = {};
            for (let s of Reflect.ownKeys(r)) {
              if (s === '__proto__') continue;
              let u = t.keyType._zod.run({ value: s, issues: [] }, n);
              if (u instanceof Promise)
                throw new Error(
                  'Async schemas not supported in object keys currently',
                );
              if (u.issues.length) {
                (i.issues.push({
                  code: 'invalid_key',
                  origin: 'record',
                  issues: u.issues.map((c) => Ie(c, n, ae())),
                  input: s,
                  path: [s],
                  inst: e,
                }),
                  (i.value[u.value] = u.value));
                continue;
              }
              let a = t.valueType._zod.run({ value: r[s], issues: [] }, n);
              a instanceof Promise
                ? o.push(
                    a.then((c) => {
                      (c.issues.length && i.issues.push(...we(s, c.issues)),
                        (i.value[u.value] = c.value));
                    }),
                  )
                : (a.issues.length && i.issues.push(...we(s, a.issues)),
                  (i.value[u.value] = a.value));
            }
          }
          return o.length ? Promise.all(o).then(() => i) : i;
        }));
    }),
    _h = y('$ZodMap', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          if (!(r instanceof Map))
            return (
              i.issues.push({
                expected: 'map',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
              i
            );
          let o = [];
          i.value = new Map();
          for (let [s, u] of r) {
            let a = t.keyType._zod.run({ value: s, issues: [] }, n),
              c = t.valueType._zod.run({ value: u, issues: [] }, n);
            a instanceof Promise || c instanceof Promise
              ? o.push(
                  Promise.all([a, c]).then(([m, p]) => {
                    tv(m, p, i, s, r, e, n);
                  }),
                )
              : tv(a, c, i, s, r, e, n);
          }
          return o.length ? Promise.all(o).then(() => i) : i;
        }));
    });
  function tv(e, t, i, n, r, o, s) {
    (e.issues.length &&
      (Mi.has(typeof n)
        ? i.issues.push(...we(n, e.issues))
        : i.issues.push({
            code: 'invalid_key',
            origin: 'map',
            input: r,
            inst: o,
            issues: e.issues.map((u) => Ie(u, s, ae())),
          })),
      t.issues.length &&
        (Mi.has(typeof n)
          ? i.issues.push(...we(n, t.issues))
          : i.issues.push({
              origin: 'map',
              code: 'invalid_element',
              input: r,
              inst: o,
              key: n,
              issues: t.issues.map((u) => Ie(u, s, ae())),
            })),
      i.value.set(e.value, t.value));
  }
  var kh = y('$ZodSet', (e, t) => {
    (E.init(e, t),
      (e._zod.parse = (i, n) => {
        let r = i.value;
        if (!(r instanceof Set))
          return (
            i.issues.push({
              input: r,
              inst: e,
              expected: 'set',
              code: 'invalid_type',
            }),
            i
          );
        let o = [];
        i.value = new Set();
        for (let s of r) {
          let u = t.valueType._zod.run({ value: s, issues: [] }, n);
          u instanceof Promise ? o.push(u.then((a) => nv(a, i))) : nv(u, i);
        }
        return o.length ? Promise.all(o).then(() => i) : i;
      }));
  });
  function nv(e, t) {
    (e.issues.length && t.issues.push(...e.issues), t.value.add(e.value));
  }
  var xh = y('$ZodEnum', (e, t) => {
      E.init(e, t);
      let i = rl(t.entries),
        n = new Set(i);
      ((e._zod.values = n),
        (e._zod.pattern = new RegExp(
          `^(${i
            .filter((r) => Mi.has(typeof r))
            .map((r) => (typeof r == 'string' ? He(r) : r.toString()))
            .join('|')})$`,
        )),
        (e._zod.parse = (r, o) => {
          let s = r.value;
          return (
            n.has(s) ||
              r.issues.push({
                code: 'invalid_value',
                values: i,
                input: s,
                inst: e,
              }),
            r
          );
        }));
    }),
    wh = y('$ZodLiteral', (e, t) => {
      if ((E.init(e, t), t.values.length === 0))
        throw new Error('Cannot create literal schema with no valid values');
      ((e._zod.values = new Set(t.values)),
        (e._zod.pattern = new RegExp(
          `^(${t.values.map((i) => (typeof i == 'string' ? He(i) : i ? He(i.toString()) : String(i))).join('|')})$`,
        )),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            e._zod.values.has(r) ||
              i.issues.push({
                code: 'invalid_value',
                values: t.values,
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    Sh = y('$ZodFile', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          return (
            r instanceof File ||
              i.issues.push({
                expected: 'file',
                code: 'invalid_type',
                input: r,
                inst: e,
              }),
            i
          );
        }));
    }),
    Ih = y('$ZodTransform', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') throw new Yi(e.constructor.name);
          let r = t.transform(i.value, i);
          if (n.async)
            return (r instanceof Promise ? r : Promise.resolve(r)).then(
              (o) => ((i.value = o), i),
            );
          if (r instanceof Promise) throw new ft();
          return ((i.value = r), i);
        }));
    });
  function rv(e, t) {
    return e.issues.length && t === void 0 ? { issues: [], value: void 0 } : e;
  }
  var zh = y('$ZodOptional', (e, t) => {
      (E.init(e, t),
        (e._zod.optin = 'optional'),
        (e._zod.optout = 'optional'),
        R(e._zod, 'values', () =>
          t.innerType._zod.values
            ? new Set([...t.innerType._zod.values, void 0])
            : void 0,
        ),
        R(e._zod, 'pattern', () => {
          let i = t.innerType._zod.pattern;
          return i ? new RegExp(`^(${Qi(i.source)})?$`) : void 0;
        }),
        (e._zod.parse = (i, n) => {
          if (t.innerType._zod.optin === 'optional') {
            let r = t.innerType._zod.run(i, n);
            return r instanceof Promise
              ? r.then((o) => rv(o, i.value))
              : rv(r, i.value);
          }
          return i.value === void 0 ? i : t.innerType._zod.run(i, n);
        }));
    }),
    jh = y('$ZodNullable', (e, t) => {
      (E.init(e, t),
        R(e._zod, 'optin', () => t.innerType._zod.optin),
        R(e._zod, 'optout', () => t.innerType._zod.optout),
        R(e._zod, 'pattern', () => {
          let i = t.innerType._zod.pattern;
          return i ? new RegExp(`^(${Qi(i.source)}|null)$`) : void 0;
        }),
        R(e._zod, 'values', () =>
          t.innerType._zod.values
            ? new Set([...t.innerType._zod.values, null])
            : void 0,
        ),
        (e._zod.parse = (i, n) =>
          i.value === null ? i : t.innerType._zod.run(i, n)));
    }),
    Oh = y('$ZodDefault', (e, t) => {
      (E.init(e, t),
        (e._zod.optin = 'optional'),
        R(e._zod, 'values', () => t.innerType._zod.values),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') return t.innerType._zod.run(i, n);
          if (i.value === void 0) return ((i.value = t.defaultValue), i);
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise ? r.then((o) => iv(o, t)) : iv(r, t);
        }));
    });
  function iv(e, t) {
    return (e.value === void 0 && (e.value = t.defaultValue), e);
  }
  var Uh = y('$ZodPrefault', (e, t) => {
      (E.init(e, t),
        (e._zod.optin = 'optional'),
        R(e._zod, 'values', () => t.innerType._zod.values),
        (e._zod.parse = (i, n) => (
          n.direction === 'backward' ||
            (i.value === void 0 && (i.value = t.defaultValue)),
          t.innerType._zod.run(i, n)
        )));
    }),
    Ph = y('$ZodNonOptional', (e, t) => {
      (E.init(e, t),
        R(e._zod, 'values', () => {
          let i = t.innerType._zod.values;
          return i ? new Set([...i].filter((n) => n !== void 0)) : void 0;
        }),
        (e._zod.parse = (i, n) => {
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise ? r.then((o) => ov(o, e)) : ov(r, e);
        }));
    });
  function ov(e, t) {
    return (
      e.issues.length ||
        e.value !== void 0 ||
        e.issues.push({
          code: 'invalid_type',
          expected: 'nonoptional',
          input: e.value,
          inst: t,
        }),
      e
    );
  }
  var Nh = y('$ZodSuccess', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') throw new Yi('ZodSuccess');
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise
            ? r.then((o) => ((i.value = o.issues.length === 0), i))
            : ((i.value = r.issues.length === 0), i);
        }));
    }),
    Dh = y('$ZodCatch', (e, t) => {
      (E.init(e, t),
        R(e._zod, 'optin', () => t.innerType._zod.optin),
        R(e._zod, 'optout', () => t.innerType._zod.optout),
        R(e._zod, 'values', () => t.innerType._zod.values),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') return t.innerType._zod.run(i, n);
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise
            ? r.then(
                (o) => (
                  (i.value = o.value),
                  o.issues.length &&
                    ((i.value = t.catchValue({
                      ...i,
                      error: { issues: o.issues.map((s) => Ie(s, n, ae())) },
                      input: i.value,
                    })),
                    (i.issues = [])),
                  i
                ),
              )
            : ((i.value = r.value),
              r.issues.length &&
                ((i.value = t.catchValue({
                  ...i,
                  error: { issues: r.issues.map((o) => Ie(o, n, ae())) },
                  input: i.value,
                })),
                (i.issues = [])),
              i);
        }));
    }),
    Zh = y('$ZodNaN', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) => (
          (typeof i.value == 'number' && Number.isNaN(i.value)) ||
            i.issues.push({
              input: i.value,
              inst: e,
              expected: 'nan',
              code: 'invalid_type',
            }),
          i
        )));
    }),
    Eh = y('$ZodPipe', (e, t) => {
      (E.init(e, t),
        R(e._zod, 'values', () => t.in._zod.values),
        R(e._zod, 'optin', () => t.in._zod.optin),
        R(e._zod, 'optout', () => t.out._zod.optout),
        R(e._zod, 'propValues', () => t.in._zod.propValues),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') {
            let o = t.out._zod.run(i, n);
            return o instanceof Promise
              ? o.then((s) => Ci(s, t.in, n))
              : Ci(o, t.in, n);
          }
          let r = t.in._zod.run(i, n);
          return r instanceof Promise
            ? r.then((o) => Ci(o, t.out, n))
            : Ci(r, t.out, n);
        }));
    });
  function Ci(e, t, i) {
    return e.issues.length
      ? ((e.aborted = !0), e)
      : t._zod.run({ value: e.value, issues: e.issues }, i);
  }
  var Sl = y('$ZodCodec', (e, t) => {
    (E.init(e, t),
      R(e._zod, 'values', () => t.in._zod.values),
      R(e._zod, 'optin', () => t.in._zod.optin),
      R(e._zod, 'optout', () => t.out._zod.optout),
      R(e._zod, 'propValues', () => t.in._zod.propValues),
      (e._zod.parse = (i, n) => {
        if ((n.direction || 'forward') === 'forward') {
          let r = t.in._zod.run(i, n);
          return r instanceof Promise
            ? r.then((o) => Li(o, t, n))
            : Li(r, t, n);
        }
        {
          let r = t.out._zod.run(i, n);
          return r instanceof Promise
            ? r.then((o) => Li(o, t, n))
            : Li(r, t, n);
        }
      }));
  });
  function Li(e, t, i) {
    if (e.issues.length) return ((e.aborted = !0), e);
    if ((i.direction || 'forward') === 'forward') {
      let n = t.transform(e.value, e);
      return n instanceof Promise
        ? n.then((r) => Ri(e, r, t.out, i))
        : Ri(e, n, t.out, i);
    }
    {
      let n = t.reverseTransform(e.value, e);
      return n instanceof Promise
        ? n.then((r) => Ri(e, r, t.in, i))
        : Ri(e, n, t.in, i);
    }
  }
  function Ri(e, t, i, n) {
    return e.issues.length
      ? ((e.aborted = !0), e)
      : i._zod.run({ value: t, issues: e.issues }, n);
  }
  var Th = y('$ZodReadonly', (e, t) => {
    (E.init(e, t),
      R(e._zod, 'propValues', () => t.innerType._zod.propValues),
      R(e._zod, 'values', () => t.innerType._zod.values),
      R(e._zod, 'optin', () => t.innerType._zod.optin),
      R(e._zod, 'optout', () => t.innerType._zod.optout),
      (e._zod.parse = (i, n) => {
        if (n.direction === 'backward') return t.innerType._zod.run(i, n);
        let r = t.innerType._zod.run(i, n);
        return r instanceof Promise ? r.then(av) : av(r);
      }));
  });
  function av(e) {
    return ((e.value = Object.freeze(e.value)), e);
  }
  var Ah = y('$ZodTemplateLiteral', (e, t) => {
      E.init(e, t);
      let i = [];
      for (let n of t.parts)
        if (typeof n == 'object' && n !== null) {
          if (!n._zod.pattern)
            throw new Error(
              `Invalid template literal part, no pattern found: ${[...n._zod.traits].shift()}`,
            );
          let r =
            n._zod.pattern instanceof RegExp
              ? n._zod.pattern.source
              : n._zod.pattern;
          if (!r)
            throw new Error(`Invalid template literal part: ${n._zod.traits}`);
          let o = r.startsWith('^') ? 1 : 0,
            s = r.endsWith('$') ? r.length - 1 : r.length;
          i.push(r.slice(o, s));
        } else {
          if (n !== null && !$v.has(typeof n))
            throw new Error(`Invalid template literal part: ${n}`);
          i.push(He(`${n}`));
        }
      ((e._zod.pattern = new RegExp(`^${i.join('')}$`)),
        (e._zod.parse = (n, r) => {
          var o;
          return typeof n.value != 'string'
            ? (n.issues.push({
                input: n.value,
                inst: e,
                expected: 'template_literal',
                code: 'invalid_type',
              }),
              n)
            : ((e._zod.pattern.lastIndex = 0),
              e._zod.pattern.test(n.value) ||
                n.issues.push({
                  input: n.value,
                  inst: e,
                  code: 'invalid_format',
                  format: (o = t.format) != null ? o : 'template_literal',
                  pattern: e._zod.pattern.source,
                }),
              n);
        }));
    }),
    Ch = y(
      '$ZodFunction',
      (e, t) => (
        E.init(e, t),
        (e._def = t),
        (e._zod.def = t),
        (e.implement = (i) => {
          if (typeof i != 'function')
            throw new Error('implement() must be called with a function');
          return function (...n) {
            let r = e._def.input ? Gc(e._def.input, n) : n,
              o = Reflect.apply(i, this, r);
            return e._def.output ? Gc(e._def.output, o) : o;
          };
        }),
        (e.implementAsync = (i) => {
          if (typeof i != 'function')
            throw new Error('implementAsync() must be called with a function');
          return async function (...n) {
            let r = e._def.input ? await Kc(e._def.input, n) : n,
              o = await Reflect.apply(i, this, r);
            return e._def.output ? await Kc(e._def.output, o) : o;
          };
        }),
        (e._zod.parse = (i, n) => {
          if (typeof i.value != 'function')
            return (
              i.issues.push({
                code: 'invalid_type',
                expected: 'function',
                input: i.value,
                inst: e,
              }),
              i
            );
          let r = e._def.output && e._def.output._zod.def.type === 'promise';
          return (
            (i.value = r ? e.implementAsync(i.value) : e.implement(i.value)),
            i
          );
        }),
        (e.input = (...i) => {
          let n = e.constructor;
          return Array.isArray(i[0])
            ? new n({
                type: 'function',
                input: new wl({ type: 'tuple', items: i[0], rest: i[1] }),
                output: e._def.output,
              })
            : new n({ type: 'function', input: i[0], output: e._def.output });
        }),
        (e.output = (i) =>
          new e.constructor({
            type: 'function',
            input: e._def.input,
            output: i,
          })),
        e
      ),
    ),
    Lh = y('$ZodPromise', (e, t) => {
      (E.init(e, t),
        (e._zod.parse = (i, n) =>
          Promise.resolve(i.value).then((r) =>
            t.innerType._zod.run({ value: r, issues: [] }, n),
          )));
    }),
    Rh = y('$ZodLazy', (e, t) => {
      (E.init(e, t),
        R(e._zod, 'innerType', () => t.getter()),
        R(e._zod, 'pattern', () => e._zod.innerType._zod.pattern),
        R(e._zod, 'propValues', () => e._zod.innerType._zod.propValues),
        R(e._zod, 'optin', () => {
          var i;
          return (i = e._zod.innerType._zod.optin) != null ? i : void 0;
        }),
        R(e._zod, 'optout', () => {
          var i;
          return (i = e._zod.innerType._zod.optout) != null ? i : void 0;
        }),
        (e._zod.parse = (i, n) => e._zod.innerType._zod.run(i, n)));
    }),
    Jh = y('$ZodCustom', (e, t) => {
      (K.init(e, t),
        E.init(e, t),
        (e._zod.parse = (i, n) => i),
        (e._zod.check = (i) => {
          let n = i.value,
            r = t.fn(n);
          if (r instanceof Promise) return r.then((o) => sv(o, i, n, e));
          sv(r, i, n, e);
        }));
    });
  function sv(e, t, i, n) {
    var r;
    if (!e) {
      let o = {
        code: 'custom',
        input: i,
        inst: n,
        path: [...((r = n._zod.def.path) != null ? r : [])],
        continue: !n._zod.def.abort,
      };
      (n._zod.def.params && (o.params = n._zod.def.params),
        t.issues.push(Wi(o)));
    }
  }
  var Il = {};
  $e(Il, {
    ar: () => bz,
    az: () => $z,
    be: () => kz,
    bg: () => wz,
    ca: () => Iz,
    cs: () => jz,
    da: () => Uz,
    de: () => Nz,
    en: () => Fh,
    eo: () => Ez,
    es: () => Az,
    fa: () => Lz,
    fi: () => Jz,
    fr: () => Vz,
    frCA: () => Wz,
    he: () => Gz,
    hu: () => qz,
    id: () => Hz,
    is: () => Qz,
    it: () => tj,
    ja: () => rj,
    ka: () => oj,
    kh: () => sj,
    km: () => Vh,
    ko: () => cj,
    lt: () => dj,
    mk: () => pj,
    ms: () => vj,
    nl: () => hj,
    no: () => yj,
    ota: () => _j,
    pl: () => Sj,
    ps: () => xj,
    pt: () => zj,
    ru: () => Oj,
    sl: () => Pj,
    sv: () => Dj,
    ta: () => Ej,
    th: () => Aj,
    tr: () => Lj,
    ua: () => Jj,
    uk: () => Mh,
    ur: () => Vj,
    vi: () => Wj,
    yo: () => Hj,
    zhCN: () => Gj,
    zhTW: () => qj,
  });
  var hz = () => {
    let e = {
      string: { unit: 'حرف', verb: 'أن يحوي' },
      file: { unit: 'بايت', verb: 'أن يحوي' },
      array: { unit: 'عنصر', verb: 'أن يحوي' },
      set: { unit: 'عنصر', verb: 'أن يحوي' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'مدخل',
      email: 'بريد إلكتروني',
      url: 'رابط',
      emoji: 'إيموجي',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'تاريخ ووقت بمعيار ISO',
      date: 'تاريخ بمعيار ISO',
      time: 'وقت بمعيار ISO',
      duration: 'مدة بمعيار ISO',
      ipv4: 'عنوان IPv4',
      ipv6: 'عنوان IPv6',
      cidrv4: 'مدى عناوين بصيغة IPv4',
      cidrv6: 'مدى عناوين بصيغة IPv6',
      base64: 'نَص بترميز base64-encoded',
      base64url: 'نَص بترميز base64url-encoded',
      json_string: 'نَص على هيئة JSON',
      e164: 'رقم هاتف بمعيار E.164',
      jwt: 'JWT',
      template_literal: 'مدخل',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `مدخلات غير مقبولة: يفترض إدخال ${n.expected}، ولكن تم إدخال ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `مدخلات غير مقبولة: يفترض إدخال ${N(n.values[0])}`
            : `اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? ` أكبر من اللازم: يفترض أن تكون ${(r = n.origin) != null ? r : 'القيمة'} ${a} ${n.maximum.toString()} ${(o = c.unit) != null ? o : 'عنصر'}`
            : `أكبر من اللازم: يفترض أن تكون ${(s = n.origin) != null ? s : 'القيمة'} ${a} ${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `أصغر من اللازم: يفترض لـ ${n.origin} أن يكون ${a} ${n.minimum.toString()} ${c.unit}`
            : `أصغر من اللازم: يفترض لـ ${n.origin} أن يكون ${a} ${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `نَص غير مقبول: يجب أن يبدأ بـ "${n.prefix}"`
            : a.format === 'ends_with'
              ? `نَص غير مقبول: يجب أن ينتهي بـ "${a.suffix}"`
              : a.format === 'includes'
                ? `نَص غير مقبول: يجب أن يتضمَّن "${a.includes}"`
                : a.format === 'regex'
                  ? `نَص غير مقبول: يجب أن يطابق النمط ${a.pattern}`
                  : `${(u = i[a.format]) != null ? u : n.format} غير مقبول`;
        }
        case 'not_multiple_of':
          return `رقم غير مقبول: يجب أن يكون من مضاعفات ${n.divisor}`;
        case 'unrecognized_keys':
          return `معرف${n.keys.length > 1 ? 'ات' : ''} غريب${n.keys.length > 1 ? 'ة' : ''}: ${z(n.keys, '، ')}`;
        case 'invalid_key':
          return `معرف غير مقبول في ${n.origin}`;
        case 'invalid_union':
        default:
          return 'مدخل غير مقبول';
        case 'invalid_element':
          return `مدخل غير مقبول في ${n.origin}`;
      }
    };
  };
  function bz() {
    return { localeError: hz() };
  }
  var yz = () => {
    let e = {
      string: { unit: 'simvol', verb: 'olmalıdır' },
      file: { unit: 'bayt', verb: 'olmalıdır' },
      array: { unit: 'element', verb: 'olmalıdır' },
      set: { unit: 'element', verb: 'olmalıdır' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'input',
      email: 'email address',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO datetime',
      date: 'ISO date',
      time: 'ISO time',
      duration: 'ISO duration',
      ipv4: 'IPv4 address',
      ipv6: 'IPv6 address',
      cidrv4: 'IPv4 range',
      cidrv6: 'IPv6 range',
      base64: 'base64-encoded string',
      base64url: 'base64url-encoded string',
      json_string: 'JSON string',
      e164: 'E.164 number',
      jwt: 'JWT',
      template_literal: 'input',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Yanlış dəyər: gözlənilən ${n.expected}, daxil olan ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Yanlış dəyər: gözlənilən ${N(n.values[0])}`
            : `Yanlış seçim: aşağıdakılardan biri olmalıdır: ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Çox böyük: gözlənilən ${(r = n.origin) != null ? r : 'dəyər'} ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'element'}`
            : `Çox böyük: gözlənilən ${(s = n.origin) != null ? s : 'dəyər'} ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Çox kiçik: gözlənilən ${n.origin} ${a}${n.minimum.toString()} ${c.unit}`
            : `Çox kiçik: gözlənilən ${n.origin} ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Yanlış mətn: "${a.prefix}" ilə başlamalıdır`
            : a.format === 'ends_with'
              ? `Yanlış mətn: "${a.suffix}" ilə bitməlidir`
              : a.format === 'includes'
                ? `Yanlış mətn: "${a.includes}" daxil olmalıdır`
                : a.format === 'regex'
                  ? `Yanlış mətn: ${a.pattern} şablonuna uyğun olmalıdır`
                  : `Yanlış ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Yanlış ədəd: ${n.divisor} ilə bölünə bilən olmalıdır`;
        case 'unrecognized_keys':
          return `Tanınmayan açar${n.keys.length > 1 ? 'lar' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `${n.origin} daxilində yanlış açar`;
        case 'invalid_union':
        default:
          return 'Yanlış dəyər';
        case 'invalid_element':
          return `${n.origin} daxilində yanlış dəyər`;
      }
    };
  };
  function $z() {
    return { localeError: yz() };
  }
  function uv(e, t, i, n) {
    let r = Math.abs(e),
      o = r % 10,
      s = r % 100;
    return s >= 11 && s <= 19 ? n : o === 1 ? t : o >= 2 && o <= 4 ? i : n;
  }
  var _z = () => {
    let e = {
      string: {
        unit: { one: 'сімвал', few: 'сімвалы', many: 'сімвалаў' },
        verb: 'мець',
      },
      array: {
        unit: { one: 'элемент', few: 'элементы', many: 'элементаў' },
        verb: 'мець',
      },
      set: {
        unit: { one: 'элемент', few: 'элементы', many: 'элементаў' },
        verb: 'мець',
      },
      file: {
        unit: { one: 'байт', few: 'байты', many: 'байтаў' },
        verb: 'мець',
      },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'увод',
      email: 'email адрас',
      url: 'URL',
      emoji: 'эмодзі',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO дата і час',
      date: 'ISO дата',
      time: 'ISO час',
      duration: 'ISO працягласць',
      ipv4: 'IPv4 адрас',
      ipv6: 'IPv6 адрас',
      cidrv4: 'IPv4 дыяпазон',
      cidrv6: 'IPv6 дыяпазон',
      base64: 'радок у фармаце base64',
      base64url: 'радок у фармаце base64url',
      json_string: 'JSON радок',
      e164: 'нумар E.164',
      jwt: 'JWT',
      template_literal: 'увод',
    };
    return (n) => {
      var r, o, s;
      switch (n.code) {
        case 'invalid_type':
          return `Няправільны ўвод: чакаўся ${n.expected}, атрымана ${((u) => {
            let a = typeof u;
            switch (a) {
              case 'number':
                return Number.isNaN(u) ? 'NaN' : 'лік';
              case 'object':
                if (Array.isArray(u)) return 'масіў';
                if (u === null) return 'null';
                if (
                  Object.getPrototypeOf(u) !== Object.prototype &&
                  u.constructor
                )
                  return u.constructor.name;
            }
            return a;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Няправільны ўвод: чакалася ${N(n.values[0])}`
            : `Няправільны варыянт: чакаўся адзін з ${z(n.values, '|')}`;
        case 'too_big': {
          let u = n.inclusive ? '<=' : '<',
            a = t(n.origin);
          if (a) {
            let c = uv(Number(n.maximum), a.unit.one, a.unit.few, a.unit.many);
            return `Занадта вялікі: чакалася, што ${(r = n.origin) != null ? r : 'значэнне'} павінна ${a.verb} ${u}${n.maximum.toString()} ${c}`;
          }
          return `Занадта вялікі: чакалася, што ${(o = n.origin) != null ? o : 'значэнне'} павінна быць ${u}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let u = n.inclusive ? '>=' : '>',
            a = t(n.origin);
          if (a) {
            let c = uv(Number(n.minimum), a.unit.one, a.unit.few, a.unit.many);
            return `Занадта малы: чакалася, што ${n.origin} павінна ${a.verb} ${u}${n.minimum.toString()} ${c}`;
          }
          return `Занадта малы: чакалася, што ${n.origin} павінна быць ${u}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let u = n;
          return u.format === 'starts_with'
            ? `Няправільны радок: павінен пачынацца з "${u.prefix}"`
            : u.format === 'ends_with'
              ? `Няправільны радок: павінен заканчвацца на "${u.suffix}"`
              : u.format === 'includes'
                ? `Няправільны радок: павінен змяшчаць "${u.includes}"`
                : u.format === 'regex'
                  ? `Няправільны радок: павінен адпавядаць шаблону ${u.pattern}`
                  : `Няправільны ${(s = i[u.format]) != null ? s : n.format}`;
        }
        case 'not_multiple_of':
          return `Няправільны лік: павінен быць кратным ${n.divisor}`;
        case 'unrecognized_keys':
          return `Нераспазнаны ${n.keys.length > 1 ? 'ключы' : 'ключ'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Няправільны ключ у ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Няправільны ўвод';
        case 'invalid_element':
          return `Няправільнае значэнне ў ${n.origin}`;
      }
    };
  };
  function kz() {
    return { localeError: _z() };
  }
  var xz = () => {
    let e = {
      string: { unit: 'символа', verb: 'да съдържа' },
      file: { unit: 'байта', verb: 'да съдържа' },
      array: { unit: 'елемента', verb: 'да съдържа' },
      set: { unit: 'елемента', verb: 'да съдържа' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'вход',
      email: 'имейл адрес',
      url: 'URL',
      emoji: 'емоджи',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO време',
      date: 'ISO дата',
      time: 'ISO време',
      duration: 'ISO продължителност',
      ipv4: 'IPv4 адрес',
      ipv6: 'IPv6 адрес',
      cidrv4: 'IPv4 диапазон',
      cidrv6: 'IPv6 диапазон',
      base64: 'base64-кодиран низ',
      base64url: 'base64url-кодиран низ',
      json_string: 'JSON низ',
      e164: 'E.164 номер',
      jwt: 'JWT',
      template_literal: 'вход',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Невалиден вход: очакван ${n.expected}, получен ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'число';
              case 'object':
                if (Array.isArray(a)) return 'масив';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Невалиден вход: очакван ${N(n.values[0])}`
            : `Невалидна опция: очаквано едно от ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Твърде голямо: очаква се ${(r = n.origin) != null ? r : 'стойност'} да съдържа ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'елемента'}`
            : `Твърде голямо: очаква се ${(s = n.origin) != null ? s : 'стойност'} да бъде ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Твърде малко: очаква се ${n.origin} да съдържа ${a}${n.minimum.toString()} ${c.unit}`
            : `Твърде малко: очаква се ${n.origin} да бъде ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          if (a.format === 'starts_with')
            return `Невалиден низ: трябва да започва с "${a.prefix}"`;
          if (a.format === 'ends_with')
            return `Невалиден низ: трябва да завършва с "${a.suffix}"`;
          if (a.format === 'includes')
            return `Невалиден низ: трябва да включва "${a.includes}"`;
          if (a.format === 'regex')
            return `Невалиден низ: трябва да съвпада с ${a.pattern}`;
          let c = 'Невалиден';
          return (
            a.format === 'emoji' && (c = 'Невалидно'),
            a.format === 'datetime' && (c = 'Невалидно'),
            a.format === 'date' && (c = 'Невалидна'),
            a.format === 'time' && (c = 'Невалидно'),
            a.format === 'duration' && (c = 'Невалидна'),
            `${c} ${(u = i[a.format]) != null ? u : n.format}`
          );
        }
        case 'not_multiple_of':
          return `Невалидно число: трябва да бъде кратно на ${n.divisor}`;
        case 'unrecognized_keys':
          return `Неразпознат${n.keys.length > 1 ? 'и' : ''} ключ${n.keys.length > 1 ? 'ове' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Невалиден ключ в ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Невалиден вход';
        case 'invalid_element':
          return `Невалидна стойност в ${n.origin}`;
      }
    };
  };
  function wz() {
    return { localeError: xz() };
  }
  var Sz = () => {
    let e = {
      string: { unit: 'caràcters', verb: 'contenir' },
      file: { unit: 'bytes', verb: 'contenir' },
      array: { unit: 'elements', verb: 'contenir' },
      set: { unit: 'elements', verb: 'contenir' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'entrada',
      email: 'adreça electrònica',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'data i hora ISO',
      date: 'data ISO',
      time: 'hora ISO',
      duration: 'durada ISO',
      ipv4: 'adreça IPv4',
      ipv6: 'adreça IPv6',
      cidrv4: 'rang IPv4',
      cidrv6: 'rang IPv6',
      base64: 'cadena codificada en base64',
      base64url: 'cadena codificada en base64url',
      json_string: 'cadena JSON',
      e164: 'número E.164',
      jwt: 'JWT',
      template_literal: 'entrada',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Tipus invàlid: s'esperava ${n.expected}, s'ha rebut ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Valor invàlid: s'esperava ${N(n.values[0])}`
            : `Opció invàlida: s'esperava una de ${z(n.values, ' o ')}`;
        case 'too_big': {
          let a = n.inclusive ? 'com a màxim' : 'menys de',
            c = t(n.origin);
          return c
            ? `Massa gran: s'esperava que ${(r = n.origin) != null ? r : 'el valor'} contingués ${a} ${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elements'}`
            : `Massa gran: s'esperava que ${(s = n.origin) != null ? s : 'el valor'} fos ${a} ${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? 'com a mínim' : 'més de',
            c = t(n.origin);
          return c
            ? `Massa petit: s'esperava que ${n.origin} contingués ${a} ${n.minimum.toString()} ${c.unit}`
            : `Massa petit: s'esperava que ${n.origin} fos ${a} ${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Format invàlid: ha de començar amb "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Format invàlid: ha d'acabar amb "${a.suffix}"`
              : a.format === 'includes'
                ? `Format invàlid: ha d'incloure "${a.includes}"`
                : a.format === 'regex'
                  ? `Format invàlid: ha de coincidir amb el patró ${a.pattern}`
                  : `Format invàlid per a ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Número invàlid: ha de ser múltiple de ${n.divisor}`;
        case 'unrecognized_keys':
          return `Clau${n.keys.length > 1 ? 's' : ''} no reconeguda${n.keys.length > 1 ? 's' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Clau invàlida a ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Entrada invàlida';
        case 'invalid_element':
          return `Element invàlid a ${n.origin}`;
      }
    };
  };
  function Iz() {
    return { localeError: Sz() };
  }
  var zz = () => {
    let e = {
      string: { unit: 'znaků', verb: 'mít' },
      file: { unit: 'bajtů', verb: 'mít' },
      array: { unit: 'prvků', verb: 'mít' },
      set: { unit: 'prvků', verb: 'mít' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'regulární výraz',
      email: 'e-mailová adresa',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'datum a čas ve formátu ISO',
      date: 'datum ve formátu ISO',
      time: 'čas ve formátu ISO',
      duration: 'doba trvání ISO',
      ipv4: 'IPv4 adresa',
      ipv6: 'IPv6 adresa',
      cidrv4: 'rozsah IPv4',
      cidrv6: 'rozsah IPv6',
      base64: 'řetězec zakódovaný ve formátu base64',
      base64url: 'řetězec zakódovaný ve formátu base64url',
      json_string: 'řetězec ve formátu JSON',
      e164: 'číslo E.164',
      jwt: 'JWT',
      template_literal: 'vstup',
    };
    return (n) => {
      var r, o, s, u, a, c, m;
      switch (n.code) {
        case 'invalid_type':
          return `Neplatný vstup: očekáváno ${n.expected}, obdrženo ${((p) => {
            let f = typeof p;
            switch (f) {
              case 'number':
                return Number.isNaN(p) ? 'NaN' : 'číslo';
              case 'string':
                return 'řetězec';
              case 'boolean':
                return 'boolean';
              case 'bigint':
                return 'bigint';
              case 'function':
                return 'funkce';
              case 'symbol':
                return 'symbol';
              case 'undefined':
                return 'undefined';
              case 'object':
                if (Array.isArray(p)) return 'pole';
                if (p === null) return 'null';
                if (
                  Object.getPrototypeOf(p) !== Object.prototype &&
                  p.constructor
                )
                  return p.constructor.name;
            }
            return f;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Neplatný vstup: očekáváno ${N(n.values[0])}`
            : `Neplatná možnost: očekávána jedna z hodnot ${z(n.values, '|')}`;
        case 'too_big': {
          let p = n.inclusive ? '<=' : '<',
            f = t(n.origin);
          return f
            ? `Hodnota je příliš velká: ${(r = n.origin) != null ? r : 'hodnota'} musí mít ${p}${n.maximum.toString()} ${(o = f.unit) != null ? o : 'prvků'}`
            : `Hodnota je příliš velká: ${(s = n.origin) != null ? s : 'hodnota'} musí být ${p}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let p = n.inclusive ? '>=' : '>',
            f = t(n.origin);
          return f
            ? `Hodnota je příliš malá: ${(u = n.origin) != null ? u : 'hodnota'} musí mít ${p}${n.minimum.toString()} ${(a = f.unit) != null ? a : 'prvků'}`
            : `Hodnota je příliš malá: ${(c = n.origin) != null ? c : 'hodnota'} musí být ${p}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let p = n;
          return p.format === 'starts_with'
            ? `Neplatný řetězec: musí začínat na "${p.prefix}"`
            : p.format === 'ends_with'
              ? `Neplatný řetězec: musí končit na "${p.suffix}"`
              : p.format === 'includes'
                ? `Neplatný řetězec: musí obsahovat "${p.includes}"`
                : p.format === 'regex'
                  ? `Neplatný řetězec: musí odpovídat vzoru ${p.pattern}`
                  : `Neplatný formát ${(m = i[p.format]) != null ? m : n.format}`;
        }
        case 'not_multiple_of':
          return `Neplatné číslo: musí být násobkem ${n.divisor}`;
        case 'unrecognized_keys':
          return `Neznámé klíče: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Neplatný klíč v ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Neplatný vstup';
        case 'invalid_element':
          return `Neplatná hodnota v ${n.origin}`;
      }
    };
  };
  function jz() {
    return { localeError: zz() };
  }
  var Oz = () => {
    let e = {
        string: { unit: 'tegn', verb: 'havde' },
        file: { unit: 'bytes', verb: 'havde' },
        array: { unit: 'elementer', verb: 'indeholdt' },
        set: { unit: 'elementer', verb: 'indeholdt' },
      },
      t = {
        string: 'streng',
        number: 'tal',
        boolean: 'boolean',
        array: 'liste',
        object: 'objekt',
        set: 'sæt',
        file: 'fil',
      };
    function i(o) {
      var s;
      return (s = e[o]) != null ? s : null;
    }
    function n(o) {
      var s;
      return (s = t[o]) != null ? s : o;
    }
    let r = {
      regex: 'input',
      email: 'e-mailadresse',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO dato- og klokkeslæt',
      date: 'ISO-dato',
      time: 'ISO-klokkeslæt',
      duration: 'ISO-varighed',
      ipv4: 'IPv4-område',
      ipv6: 'IPv6-område',
      cidrv4: 'IPv4-spektrum',
      cidrv6: 'IPv6-spektrum',
      base64: 'base64-kodet streng',
      base64url: 'base64url-kodet streng',
      json_string: 'JSON-streng',
      e164: 'E.164-nummer',
      jwt: 'JWT',
      template_literal: 'input',
    };
    return (o) => {
      var s, u;
      switch (o.code) {
        case 'invalid_type':
          return `Ugyldigt input: forventede ${n(o.expected)}, fik ${n(
            ((a) => {
              let c = typeof a;
              switch (c) {
                case 'number':
                  return Number.isNaN(a) ? 'NaN' : 'tal';
                case 'object':
                  return Array.isArray(a)
                    ? 'liste'
                    : a === null
                      ? 'null'
                      : Object.getPrototypeOf(a) !== Object.prototype &&
                          a.constructor
                        ? a.constructor.name
                        : 'objekt';
              }
              return c;
            })(o.input),
          )}`;
        case 'invalid_value':
          return o.values.length === 1
            ? `Ugyldig værdi: forventede ${N(o.values[0])}`
            : `Ugyldigt valg: forventede en af følgende ${z(o.values, '|')}`;
        case 'too_big': {
          let a = o.inclusive ? '<=' : '<',
            c = i(o.origin),
            m = n(o.origin);
          return c
            ? `For stor: forventede ${m ?? 'value'} ${c.verb} ${a} ${o.maximum.toString()} ${(s = c.unit) != null ? s : 'elementer'}`
            : `For stor: forventede ${m ?? 'value'} havde ${a} ${o.maximum.toString()}`;
        }
        case 'too_small': {
          let a = o.inclusive ? '>=' : '>',
            c = i(o.origin),
            m = n(o.origin);
          return c
            ? `For lille: forventede ${m} ${c.verb} ${a} ${o.minimum.toString()} ${c.unit}`
            : `For lille: forventede ${m} havde ${a} ${o.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = o;
          return a.format === 'starts_with'
            ? `Ugyldig streng: skal starte med "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Ugyldig streng: skal ende med "${a.suffix}"`
              : a.format === 'includes'
                ? `Ugyldig streng: skal indeholde "${a.includes}"`
                : a.format === 'regex'
                  ? `Ugyldig streng: skal matche mønsteret ${a.pattern}`
                  : `Ugyldig ${(u = r[a.format]) != null ? u : o.format}`;
        }
        case 'not_multiple_of':
          return `Ugyldigt tal: skal være deleligt med ${o.divisor}`;
        case 'unrecognized_keys':
          return `${o.keys.length > 1 ? 'Ukendte nøgler' : 'Ukendt nøgle'}: ${z(o.keys, ', ')}`;
        case 'invalid_key':
          return `Ugyldig nøgle i ${o.origin}`;
        case 'invalid_union':
          return 'Ugyldigt input: matcher ingen af de tilladte typer';
        case 'invalid_element':
          return `Ugyldig værdi i ${o.origin}`;
        default:
          return 'Ugyldigt input';
      }
    };
  };
  function Uz() {
    return { localeError: Oz() };
  }
  var Pz = () => {
    let e = {
      string: { unit: 'Zeichen', verb: 'zu haben' },
      file: { unit: 'Bytes', verb: 'zu haben' },
      array: { unit: 'Elemente', verb: 'zu haben' },
      set: { unit: 'Elemente', verb: 'zu haben' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'Eingabe',
      email: 'E-Mail-Adresse',
      url: 'URL',
      emoji: 'Emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO-Datum und -Uhrzeit',
      date: 'ISO-Datum',
      time: 'ISO-Uhrzeit',
      duration: 'ISO-Dauer',
      ipv4: 'IPv4-Adresse',
      ipv6: 'IPv6-Adresse',
      cidrv4: 'IPv4-Bereich',
      cidrv6: 'IPv6-Bereich',
      base64: 'Base64-codierter String',
      base64url: 'Base64-URL-codierter String',
      json_string: 'JSON-String',
      e164: 'E.164-Nummer',
      jwt: 'JWT',
      template_literal: 'Eingabe',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Ungültige Eingabe: erwartet ${n.expected}, erhalten ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'Zahl';
              case 'object':
                if (Array.isArray(a)) return 'Array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Ungültige Eingabe: erwartet ${N(n.values[0])}`
            : `Ungültige Option: erwartet eine von ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Zu groß: erwartet, dass ${(r = n.origin) != null ? r : 'Wert'} ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'Elemente'} hat`
            : `Zu groß: erwartet, dass ${(s = n.origin) != null ? s : 'Wert'} ${a}${n.maximum.toString()} ist`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Zu klein: erwartet, dass ${n.origin} ${a}${n.minimum.toString()} ${c.unit} hat`
            : `Zu klein: erwartet, dass ${n.origin} ${a}${n.minimum.toString()} ist`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Ungültiger String: muss mit "${a.prefix}" beginnen`
            : a.format === 'ends_with'
              ? `Ungültiger String: muss mit "${a.suffix}" enden`
              : a.format === 'includes'
                ? `Ungültiger String: muss "${a.includes}" enthalten`
                : a.format === 'regex'
                  ? `Ungültiger String: muss dem Muster ${a.pattern} entsprechen`
                  : `Ungültig: ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Ungültige Zahl: muss ein Vielfaches von ${n.divisor} sein`;
        case 'unrecognized_keys':
          return `${n.keys.length > 1 ? 'Unbekannte Schlüssel' : 'Unbekannter Schlüssel'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Ungültiger Schlüssel in ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Ungültige Eingabe';
        case 'invalid_element':
          return `Ungültiger Wert in ${n.origin}`;
      }
    };
  };
  function Nz() {
    return { localeError: Pz() };
  }
  var Dz = () => {
    let e = {
      string: { unit: 'characters', verb: 'to have' },
      file: { unit: 'bytes', verb: 'to have' },
      array: { unit: 'items', verb: 'to have' },
      set: { unit: 'items', verb: 'to have' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'input',
      email: 'email address',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO datetime',
      date: 'ISO date',
      time: 'ISO time',
      duration: 'ISO duration',
      ipv4: 'IPv4 address',
      ipv6: 'IPv6 address',
      cidrv4: 'IPv4 range',
      cidrv6: 'IPv6 range',
      base64: 'base64-encoded string',
      base64url: 'base64url-encoded string',
      json_string: 'JSON string',
      e164: 'E.164 number',
      jwt: 'JWT',
      template_literal: 'input',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Invalid input: expected ${n.expected}, received ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Invalid input: expected ${N(n.values[0])}`
            : `Invalid option: expected one of ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Too big: expected ${(r = n.origin) != null ? r : 'value'} to have ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elements'}`
            : `Too big: expected ${(s = n.origin) != null ? s : 'value'} to be ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Too small: expected ${n.origin} to have ${a}${n.minimum.toString()} ${c.unit}`
            : `Too small: expected ${n.origin} to be ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Invalid string: must start with "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Invalid string: must end with "${a.suffix}"`
              : a.format === 'includes'
                ? `Invalid string: must include "${a.includes}"`
                : a.format === 'regex'
                  ? `Invalid string: must match pattern ${a.pattern}`
                  : `Invalid ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Invalid number: must be a multiple of ${n.divisor}`;
        case 'unrecognized_keys':
          return `Unrecognized key${n.keys.length > 1 ? 's' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Invalid key in ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Invalid input';
        case 'invalid_element':
          return `Invalid value in ${n.origin}`;
      }
    };
  };
  function Fh() {
    return { localeError: Dz() };
  }
  var Zz = () => {
    let e = {
      string: { unit: 'karaktrojn', verb: 'havi' },
      file: { unit: 'bajtojn', verb: 'havi' },
      array: { unit: 'elementojn', verb: 'havi' },
      set: { unit: 'elementojn', verb: 'havi' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'enigo',
      email: 'retadreso',
      url: 'URL',
      emoji: 'emoĝio',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO-datotempo',
      date: 'ISO-dato',
      time: 'ISO-tempo',
      duration: 'ISO-daŭro',
      ipv4: 'IPv4-adreso',
      ipv6: 'IPv6-adreso',
      cidrv4: 'IPv4-rango',
      cidrv6: 'IPv6-rango',
      base64: '64-ume kodita karaktraro',
      base64url: 'URL-64-ume kodita karaktraro',
      json_string: 'JSON-karaktraro',
      e164: 'E.164-nombro',
      jwt: 'JWT',
      template_literal: 'enigo',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Nevalida enigo: atendiĝis ${n.expected}, riceviĝis ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'nombro';
              case 'object':
                if (Array.isArray(a)) return 'tabelo';
                if (a === null) return 'senvalora';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Nevalida enigo: atendiĝis ${N(n.values[0])}`
            : `Nevalida opcio: atendiĝis unu el ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Tro granda: atendiĝis ke ${(r = n.origin) != null ? r : 'valoro'} havu ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elementojn'}`
            : `Tro granda: atendiĝis ke ${(s = n.origin) != null ? s : 'valoro'} havu ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Tro malgranda: atendiĝis ke ${n.origin} havu ${a}${n.minimum.toString()} ${c.unit}`
            : `Tro malgranda: atendiĝis ke ${n.origin} estu ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Nevalida karaktraro: devas komenciĝi per "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Nevalida karaktraro: devas finiĝi per "${a.suffix}"`
              : a.format === 'includes'
                ? `Nevalida karaktraro: devas inkluzivi "${a.includes}"`
                : a.format === 'regex'
                  ? `Nevalida karaktraro: devas kongrui kun la modelo ${a.pattern}`
                  : `Nevalida ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Nevalida nombro: devas esti oblo de ${n.divisor}`;
        case 'unrecognized_keys':
          return `Nekonata${n.keys.length > 1 ? 'j' : ''} ŝlosilo${n.keys.length > 1 ? 'j' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Nevalida ŝlosilo en ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Nevalida enigo';
        case 'invalid_element':
          return `Nevalida valoro en ${n.origin}`;
      }
    };
  };
  function Ez() {
    return { localeError: Zz() };
  }
  var Tz = () => {
    let e = {
        string: { unit: 'caracteres', verb: 'tener' },
        file: { unit: 'bytes', verb: 'tener' },
        array: { unit: 'elementos', verb: 'tener' },
        set: { unit: 'elementos', verb: 'tener' },
      },
      t = {
        string: 'texto',
        number: 'número',
        boolean: 'booleano',
        array: 'arreglo',
        object: 'objeto',
        set: 'conjunto',
        file: 'archivo',
        date: 'fecha',
        bigint: 'número grande',
        symbol: 'símbolo',
        undefined: 'indefinido',
        null: 'nulo',
        function: 'función',
        map: 'mapa',
        record: 'registro',
        tuple: 'tupla',
        enum: 'enumeración',
        union: 'unión',
        literal: 'literal',
        promise: 'promesa',
        void: 'vacío',
        never: 'nunca',
        unknown: 'desconocido',
        any: 'cualquiera',
      };
    function i(o) {
      var s;
      return (s = e[o]) != null ? s : null;
    }
    function n(o) {
      var s;
      return (s = t[o]) != null ? s : o;
    }
    let r = {
      regex: 'entrada',
      email: 'dirección de correo electrónico',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'fecha y hora ISO',
      date: 'fecha ISO',
      time: 'hora ISO',
      duration: 'duración ISO',
      ipv4: 'dirección IPv4',
      ipv6: 'dirección IPv6',
      cidrv4: 'rango IPv4',
      cidrv6: 'rango IPv6',
      base64: 'cadena codificada en base64',
      base64url: 'URL codificada en base64',
      json_string: 'cadena JSON',
      e164: 'número E.164',
      jwt: 'JWT',
      template_literal: 'entrada',
    };
    return (o) => {
      var s, u;
      switch (o.code) {
        case 'invalid_type':
          return `Entrada inválida: se esperaba ${n(o.expected)}, recibido ${n(
            ((a) => {
              let c = typeof a;
              switch (c) {
                case 'number':
                  return Number.isNaN(a) ? 'NaN' : 'number';
                case 'object':
                  return Array.isArray(a)
                    ? 'array'
                    : a === null
                      ? 'null'
                      : Object.getPrototypeOf(a) !== Object.prototype
                        ? a.constructor.name
                        : 'object';
              }
              return c;
            })(o.input),
          )}`;
        case 'invalid_value':
          return o.values.length === 1
            ? `Entrada inválida: se esperaba ${N(o.values[0])}`
            : `Opción inválida: se esperaba una de ${z(o.values, '|')}`;
        case 'too_big': {
          let a = o.inclusive ? '<=' : '<',
            c = i(o.origin),
            m = n(o.origin);
          return c
            ? `Demasiado grande: se esperaba que ${m ?? 'valor'} tuviera ${a}${o.maximum.toString()} ${(s = c.unit) != null ? s : 'elementos'}`
            : `Demasiado grande: se esperaba que ${m ?? 'valor'} fuera ${a}${o.maximum.toString()}`;
        }
        case 'too_small': {
          let a = o.inclusive ? '>=' : '>',
            c = i(o.origin),
            m = n(o.origin);
          return c
            ? `Demasiado pequeño: se esperaba que ${m} tuviera ${a}${o.minimum.toString()} ${c.unit}`
            : `Demasiado pequeño: se esperaba que ${m} fuera ${a}${o.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = o;
          return a.format === 'starts_with'
            ? `Cadena inválida: debe comenzar con "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Cadena inválida: debe terminar en "${a.suffix}"`
              : a.format === 'includes'
                ? `Cadena inválida: debe incluir "${a.includes}"`
                : a.format === 'regex'
                  ? `Cadena inválida: debe coincidir con el patrón ${a.pattern}`
                  : `Inválido ${(u = r[a.format]) != null ? u : o.format}`;
        }
        case 'not_multiple_of':
          return `Número inválido: debe ser múltiplo de ${o.divisor}`;
        case 'unrecognized_keys':
          return `Llave${o.keys.length > 1 ? 's' : ''} desconocida${o.keys.length > 1 ? 's' : ''}: ${z(o.keys, ', ')}`;
        case 'invalid_key':
          return `Llave inválida en ${n(o.origin)}`;
        case 'invalid_union':
        default:
          return 'Entrada inválida';
        case 'invalid_element':
          return `Valor inválido en ${n(o.origin)}`;
      }
    };
  };
  function Az() {
    return { localeError: Tz() };
  }
  var Cz = () => {
    let e = {
      string: { unit: 'کاراکتر', verb: 'داشته باشد' },
      file: { unit: 'بایت', verb: 'داشته باشد' },
      array: { unit: 'آیتم', verb: 'داشته باشد' },
      set: { unit: 'آیتم', verb: 'داشته باشد' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'ورودی',
      email: 'آدرس ایمیل',
      url: 'URL',
      emoji: 'ایموجی',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'تاریخ و زمان ایزو',
      date: 'تاریخ ایزو',
      time: 'زمان ایزو',
      duration: 'مدت زمان ایزو',
      ipv4: 'IPv4 آدرس',
      ipv6: 'IPv6 آدرس',
      cidrv4: 'IPv4 دامنه',
      cidrv6: 'IPv6 دامنه',
      base64: 'base64-encoded رشته',
      base64url: 'base64url-encoded رشته',
      json_string: 'JSON رشته',
      e164: 'E.164 عدد',
      jwt: 'JWT',
      template_literal: 'ورودی',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `ورودی نامعتبر: می‌بایست ${n.expected} می‌بود، ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'عدد';
              case 'object':
                if (Array.isArray(a)) return 'آرایه';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)} دریافت شد`;
        case 'invalid_value':
          return n.values.length === 1
            ? `ورودی نامعتبر: می‌بایست ${N(n.values[0])} می‌بود`
            : `گزینه نامعتبر: می‌بایست یکی از ${z(n.values, '|')} می‌بود`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `خیلی بزرگ: ${(r = n.origin) != null ? r : 'مقدار'} باید ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'عنصر'} باشد`
            : `خیلی بزرگ: ${(s = n.origin) != null ? s : 'مقدار'} باید ${a}${n.maximum.toString()} باشد`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `خیلی کوچک: ${n.origin} باید ${a}${n.minimum.toString()} ${c.unit} باشد`
            : `خیلی کوچک: ${n.origin} باید ${a}${n.minimum.toString()} باشد`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `رشته نامعتبر: باید با "${a.prefix}" شروع شود`
            : a.format === 'ends_with'
              ? `رشته نامعتبر: باید با "${a.suffix}" تمام شود`
              : a.format === 'includes'
                ? `رشته نامعتبر: باید شامل "${a.includes}" باشد`
                : a.format === 'regex'
                  ? `رشته نامعتبر: باید با الگوی ${a.pattern} مطابقت داشته باشد`
                  : `${(u = i[a.format]) != null ? u : n.format} نامعتبر`;
        }
        case 'not_multiple_of':
          return `عدد نامعتبر: باید مضرب ${n.divisor} باشد`;
        case 'unrecognized_keys':
          return `کلید${n.keys.length > 1 ? 'های' : ''} ناشناس: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `کلید ناشناس در ${n.origin}`;
        case 'invalid_union':
        default:
          return 'ورودی نامعتبر';
        case 'invalid_element':
          return `مقدار نامعتبر در ${n.origin}`;
      }
    };
  };
  function Lz() {
    return { localeError: Cz() };
  }
  var Rz = () => {
    let e = {
      string: { unit: 'merkkiä', subject: 'merkkijonon' },
      file: { unit: 'tavua', subject: 'tiedoston' },
      array: { unit: 'alkiota', subject: 'listan' },
      set: { unit: 'alkiota', subject: 'joukon' },
      number: { unit: '', subject: 'luvun' },
      bigint: { unit: '', subject: 'suuren kokonaisluvun' },
      int: { unit: '', subject: 'kokonaisluvun' },
      date: { unit: '', subject: 'päivämäärän' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'säännöllinen lauseke',
      email: 'sähköpostiosoite',
      url: 'URL-osoite',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO-aikaleima',
      date: 'ISO-päivämäärä',
      time: 'ISO-aika',
      duration: 'ISO-kesto',
      ipv4: 'IPv4-osoite',
      ipv6: 'IPv6-osoite',
      cidrv4: 'IPv4-alue',
      cidrv6: 'IPv6-alue',
      base64: 'base64-koodattu merkkijono',
      base64url: 'base64url-koodattu merkkijono',
      json_string: 'JSON-merkkijono',
      e164: 'E.164-luku',
      jwt: 'JWT',
      template_literal: 'templaattimerkkijono',
    };
    return (n) => {
      var r;
      switch (n.code) {
        case 'invalid_type':
          return `Virheellinen tyyppi: odotettiin ${n.expected}, oli ${((o) => {
            let s = typeof o;
            switch (s) {
              case 'number':
                return Number.isNaN(o) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(o)) return 'array';
                if (o === null) return 'null';
                if (
                  Object.getPrototypeOf(o) !== Object.prototype &&
                  o.constructor
                )
                  return o.constructor.name;
            }
            return s;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Virheellinen syöte: täytyy olla ${N(n.values[0])}`
            : `Virheellinen valinta: täytyy olla yksi seuraavista: ${z(n.values, '|')}`;
        case 'too_big': {
          let o = n.inclusive ? '<=' : '<',
            s = t(n.origin);
          return s
            ? `Liian suuri: ${s.subject} täytyy olla ${o}${n.maximum.toString()} ${s.unit}`.trim()
            : `Liian suuri: arvon täytyy olla ${o}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let o = n.inclusive ? '>=' : '>',
            s = t(n.origin);
          return s
            ? `Liian pieni: ${s.subject} täytyy olla ${o}${n.minimum.toString()} ${s.unit}`.trim()
            : `Liian pieni: arvon täytyy olla ${o}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let o = n;
          return o.format === 'starts_with'
            ? `Virheellinen syöte: täytyy alkaa "${o.prefix}"`
            : o.format === 'ends_with'
              ? `Virheellinen syöte: täytyy loppua "${o.suffix}"`
              : o.format === 'includes'
                ? `Virheellinen syöte: täytyy sisältää "${o.includes}"`
                : o.format === 'regex'
                  ? `Virheellinen syöte: täytyy vastata säännöllistä lauseketta ${o.pattern}`
                  : `Virheellinen ${(r = i[o.format]) != null ? r : n.format}`;
        }
        case 'not_multiple_of':
          return `Virheellinen luku: täytyy olla luvun ${n.divisor} monikerta`;
        case 'unrecognized_keys':
          return `${n.keys.length > 1 ? 'Tuntemattomat avaimet' : 'Tuntematon avain'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return 'Virheellinen avain tietueessa';
        case 'invalid_union':
          return 'Virheellinen unioni';
        case 'invalid_element':
          return 'Virheellinen arvo joukossa';
        default:
          return 'Virheellinen syöte';
      }
    };
  };
  function Jz() {
    return { localeError: Rz() };
  }
  var Fz = () => {
    let e = {
      string: { unit: 'caractères', verb: 'avoir' },
      file: { unit: 'octets', verb: 'avoir' },
      array: { unit: 'éléments', verb: 'avoir' },
      set: { unit: 'éléments', verb: 'avoir' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'entrée',
      email: 'adresse e-mail',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'date et heure ISO',
      date: 'date ISO',
      time: 'heure ISO',
      duration: 'durée ISO',
      ipv4: 'adresse IPv4',
      ipv6: 'adresse IPv6',
      cidrv4: 'plage IPv4',
      cidrv6: 'plage IPv6',
      base64: 'chaîne encodée en base64',
      base64url: 'chaîne encodée en base64url',
      json_string: 'chaîne JSON',
      e164: 'numéro E.164',
      jwt: 'JWT',
      template_literal: 'entrée',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Entrée invalide : ${n.expected} attendu, ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'nombre';
              case 'object':
                if (Array.isArray(a)) return 'tableau';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)} reçu`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Entrée invalide : ${N(n.values[0])} attendu`
            : `Option invalide : une valeur parmi ${z(n.values, '|')} attendue`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Trop grand : ${(r = n.origin) != null ? r : 'valeur'} doit ${c.verb} ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'élément(s)'}`
            : `Trop grand : ${(s = n.origin) != null ? s : 'valeur'} doit être ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Trop petit : ${n.origin} doit ${c.verb} ${a}${n.minimum.toString()} ${c.unit}`
            : `Trop petit : ${n.origin} doit être ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Chaîne invalide : doit commencer par "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Chaîne invalide : doit se terminer par "${a.suffix}"`
              : a.format === 'includes'
                ? `Chaîne invalide : doit inclure "${a.includes}"`
                : a.format === 'regex'
                  ? `Chaîne invalide : doit correspondre au modèle ${a.pattern}`
                  : `${(u = i[a.format]) != null ? u : n.format} invalide`;
        }
        case 'not_multiple_of':
          return `Nombre invalide : doit être un multiple de ${n.divisor}`;
        case 'unrecognized_keys':
          return `Clé${n.keys.length > 1 ? 's' : ''} non reconnue${n.keys.length > 1 ? 's' : ''} : ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Clé invalide dans ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Entrée invalide';
        case 'invalid_element':
          return `Valeur invalide dans ${n.origin}`;
      }
    };
  };
  function Vz() {
    return { localeError: Fz() };
  }
  var Mz = () => {
    let e = {
      string: { unit: 'caractères', verb: 'avoir' },
      file: { unit: 'octets', verb: 'avoir' },
      array: { unit: 'éléments', verb: 'avoir' },
      set: { unit: 'éléments', verb: 'avoir' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'entrée',
      email: 'adresse courriel',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'date-heure ISO',
      date: 'date ISO',
      time: 'heure ISO',
      duration: 'durée ISO',
      ipv4: 'adresse IPv4',
      ipv6: 'adresse IPv6',
      cidrv4: 'plage IPv4',
      cidrv6: 'plage IPv6',
      base64: 'chaîne encodée en base64',
      base64url: 'chaîne encodée en base64url',
      json_string: 'chaîne JSON',
      e164: 'numéro E.164',
      jwt: 'JWT',
      template_literal: 'entrée',
    };
    return (n) => {
      var r, o, s;
      switch (n.code) {
        case 'invalid_type':
          return `Entrée invalide : attendu ${n.expected}, reçu ${((u) => {
            let a = typeof u;
            switch (a) {
              case 'number':
                return Number.isNaN(u) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(u)) return 'array';
                if (u === null) return 'null';
                if (
                  Object.getPrototypeOf(u) !== Object.prototype &&
                  u.constructor
                )
                  return u.constructor.name;
            }
            return a;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Entrée invalide : attendu ${N(n.values[0])}`
            : `Option invalide : attendu l'une des valeurs suivantes ${z(n.values, '|')}`;
        case 'too_big': {
          let u = n.inclusive ? '≤' : '<',
            a = t(n.origin);
          return a
            ? `Trop grand : attendu que ${(r = n.origin) != null ? r : 'la valeur'} ait ${u}${n.maximum.toString()} ${a.unit}`
            : `Trop grand : attendu que ${(o = n.origin) != null ? o : 'la valeur'} soit ${u}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let u = n.inclusive ? '≥' : '>',
            a = t(n.origin);
          return a
            ? `Trop petit : attendu que ${n.origin} ait ${u}${n.minimum.toString()} ${a.unit}`
            : `Trop petit : attendu que ${n.origin} soit ${u}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let u = n;
          return u.format === 'starts_with'
            ? `Chaîne invalide : doit commencer par "${u.prefix}"`
            : u.format === 'ends_with'
              ? `Chaîne invalide : doit se terminer par "${u.suffix}"`
              : u.format === 'includes'
                ? `Chaîne invalide : doit inclure "${u.includes}"`
                : u.format === 'regex'
                  ? `Chaîne invalide : doit correspondre au motif ${u.pattern}`
                  : `${(s = i[u.format]) != null ? s : n.format} invalide`;
        }
        case 'not_multiple_of':
          return `Nombre invalide : doit être un multiple de ${n.divisor}`;
        case 'unrecognized_keys':
          return `Clé${n.keys.length > 1 ? 's' : ''} non reconnue${n.keys.length > 1 ? 's' : ''} : ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Clé invalide dans ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Entrée invalide';
        case 'invalid_element':
          return `Valeur invalide dans ${n.origin}`;
      }
    };
  };
  function Wz() {
    return { localeError: Mz() };
  }
  var Bz = () => {
    let e = {
      string: { unit: 'אותיות', verb: 'לכלול' },
      file: { unit: 'בייטים', verb: 'לכלול' },
      array: { unit: 'פריטים', verb: 'לכלול' },
      set: { unit: 'פריטים', verb: 'לכלול' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'קלט',
      email: 'כתובת אימייל',
      url: 'כתובת רשת',
      emoji: "אימוג'י",
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'תאריך וזמן ISO',
      date: 'תאריך ISO',
      time: 'זמן ISO',
      duration: 'משך זמן ISO',
      ipv4: 'כתובת IPv4',
      ipv6: 'כתובת IPv6',
      cidrv4: 'טווח IPv4',
      cidrv6: 'טווח IPv6',
      base64: 'מחרוזת בבסיס 64',
      base64url: 'מחרוזת בבסיס 64 לכתובות רשת',
      json_string: 'מחרוזת JSON',
      e164: 'מספר E.164',
      jwt: 'JWT',
      template_literal: 'קלט',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `קלט לא תקין: צריך ${n.expected}, התקבל ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `קלט לא תקין: צריך ${N(n.values[0])}`
            : `קלט לא תקין: צריך אחת מהאפשרויות  ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `גדול מדי: ${(r = n.origin) != null ? r : 'value'} צריך להיות ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elements'}`
            : `גדול מדי: ${(s = n.origin) != null ? s : 'value'} צריך להיות ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `קטן מדי: ${n.origin} צריך להיות ${a}${n.minimum.toString()} ${c.unit}`
            : `קטן מדי: ${n.origin} צריך להיות ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `מחרוזת לא תקינה: חייבת להתחיל ב"${a.prefix}"`
            : a.format === 'ends_with'
              ? `מחרוזת לא תקינה: חייבת להסתיים ב "${a.suffix}"`
              : a.format === 'includes'
                ? `מחרוזת לא תקינה: חייבת לכלול "${a.includes}"`
                : a.format === 'regex'
                  ? `מחרוזת לא תקינה: חייבת להתאים לתבנית ${a.pattern}`
                  : `${(u = i[a.format]) != null ? u : n.format} לא תקין`;
        }
        case 'not_multiple_of':
          return `מספר לא תקין: חייב להיות מכפלה של ${n.divisor}`;
        case 'unrecognized_keys':
          return `מפתח${n.keys.length > 1 ? 'ות' : ''} לא מזוה${n.keys.length > 1 ? 'ים' : 'ה'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `מפתח לא תקין ב${n.origin}`;
        case 'invalid_union':
        default:
          return 'קלט לא תקין';
        case 'invalid_element':
          return `ערך לא תקין ב${n.origin}`;
      }
    };
  };
  function Gz() {
    return { localeError: Bz() };
  }
  var Kz = () => {
    let e = {
      string: { unit: 'karakter', verb: 'legyen' },
      file: { unit: 'byte', verb: 'legyen' },
      array: { unit: 'elem', verb: 'legyen' },
      set: { unit: 'elem', verb: 'legyen' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'bemenet',
      email: 'email cím',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO időbélyeg',
      date: 'ISO dátum',
      time: 'ISO idő',
      duration: 'ISO időintervallum',
      ipv4: 'IPv4 cím',
      ipv6: 'IPv6 cím',
      cidrv4: 'IPv4 tartomány',
      cidrv6: 'IPv6 tartomány',
      base64: 'base64-kódolt string',
      base64url: 'base64url-kódolt string',
      json_string: 'JSON string',
      e164: 'E.164 szám',
      jwt: 'JWT',
      template_literal: 'bemenet',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Érvénytelen bemenet: a várt érték ${n.expected}, a kapott érték ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'szám';
              case 'object':
                if (Array.isArray(a)) return 'tömb';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Érvénytelen bemenet: a várt érték ${N(n.values[0])}`
            : `Érvénytelen opció: valamelyik érték várt ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Túl nagy: ${(r = n.origin) != null ? r : 'érték'} mérete túl nagy ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elem'}`
            : `Túl nagy: a bemeneti érték ${(s = n.origin) != null ? s : 'érték'} túl nagy: ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Túl kicsi: a bemeneti érték ${n.origin} mérete túl kicsi ${a}${n.minimum.toString()} ${c.unit}`
            : `Túl kicsi: a bemeneti érték ${n.origin} túl kicsi ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Érvénytelen string: "${a.prefix}" értékkel kell kezdődnie`
            : a.format === 'ends_with'
              ? `Érvénytelen string: "${a.suffix}" értékkel kell végződnie`
              : a.format === 'includes'
                ? `Érvénytelen string: "${a.includes}" értéket kell tartalmaznia`
                : a.format === 'regex'
                  ? `Érvénytelen string: ${a.pattern} mintának kell megfelelnie`
                  : `Érvénytelen ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Érvénytelen szám: ${n.divisor} többszörösének kell lennie`;
        case 'unrecognized_keys':
          return `Ismeretlen kulcs${n.keys.length > 1 ? 's' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Érvénytelen kulcs ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Érvénytelen bemenet';
        case 'invalid_element':
          return `Érvénytelen érték: ${n.origin}`;
      }
    };
  };
  function qz() {
    return { localeError: Kz() };
  }
  var Xz = () => {
    let e = {
      string: { unit: 'karakter', verb: 'memiliki' },
      file: { unit: 'byte', verb: 'memiliki' },
      array: { unit: 'item', verb: 'memiliki' },
      set: { unit: 'item', verb: 'memiliki' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'input',
      email: 'alamat email',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'tanggal dan waktu format ISO',
      date: 'tanggal format ISO',
      time: 'jam format ISO',
      duration: 'durasi format ISO',
      ipv4: 'alamat IPv4',
      ipv6: 'alamat IPv6',
      cidrv4: 'rentang alamat IPv4',
      cidrv6: 'rentang alamat IPv6',
      base64: 'string dengan enkode base64',
      base64url: 'string dengan enkode base64url',
      json_string: 'string JSON',
      e164: 'angka E.164',
      jwt: 'JWT',
      template_literal: 'input',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Input tidak valid: diharapkan ${n.expected}, diterima ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Input tidak valid: diharapkan ${N(n.values[0])}`
            : `Pilihan tidak valid: diharapkan salah satu dari ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Terlalu besar: diharapkan ${(r = n.origin) != null ? r : 'value'} memiliki ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elemen'}`
            : `Terlalu besar: diharapkan ${(s = n.origin) != null ? s : 'value'} menjadi ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Terlalu kecil: diharapkan ${n.origin} memiliki ${a}${n.minimum.toString()} ${c.unit}`
            : `Terlalu kecil: diharapkan ${n.origin} menjadi ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `String tidak valid: harus dimulai dengan "${a.prefix}"`
            : a.format === 'ends_with'
              ? `String tidak valid: harus berakhir dengan "${a.suffix}"`
              : a.format === 'includes'
                ? `String tidak valid: harus menyertakan "${a.includes}"`
                : a.format === 'regex'
                  ? `String tidak valid: harus sesuai pola ${a.pattern}`
                  : `${(u = i[a.format]) != null ? u : n.format} tidak valid`;
        }
        case 'not_multiple_of':
          return `Angka tidak valid: harus kelipatan dari ${n.divisor}`;
        case 'unrecognized_keys':
          return `Kunci tidak dikenali ${n.keys.length > 1 ? 's' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Kunci tidak valid di ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Input tidak valid';
        case 'invalid_element':
          return `Nilai tidak valid di ${n.origin}`;
      }
    };
  };
  function Hz() {
    return { localeError: Xz() };
  }
  var Yz = () => {
    let e = {
      string: { unit: 'stafi', verb: 'að hafa' },
      file: { unit: 'bæti', verb: 'að hafa' },
      array: { unit: 'hluti', verb: 'að hafa' },
      set: { unit: 'hluti', verb: 'að hafa' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'gildi',
      email: 'netfang',
      url: 'vefslóð',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO dagsetning og tími',
      date: 'ISO dagsetning',
      time: 'ISO tími',
      duration: 'ISO tímalengd',
      ipv4: 'IPv4 address',
      ipv6: 'IPv6 address',
      cidrv4: 'IPv4 range',
      cidrv6: 'IPv6 range',
      base64: 'base64-encoded strengur',
      base64url: 'base64url-encoded strengur',
      json_string: 'JSON strengur',
      e164: 'E.164 tölugildi',
      jwt: 'JWT',
      template_literal: 'gildi',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Rangt gildi: Þú slóst inn ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'númer';
              case 'object':
                if (Array.isArray(a)) return 'fylki';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)} þar sem á að vera ${n.expected}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Rangt gildi: gert ráð fyrir ${N(n.values[0])}`
            : `Ógilt val: má vera eitt af eftirfarandi ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Of stórt: gert er ráð fyrir að ${(r = n.origin) != null ? r : 'gildi'} hafi ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'hluti'}`
            : `Of stórt: gert er ráð fyrir að ${(s = n.origin) != null ? s : 'gildi'} sé ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Of lítið: gert er ráð fyrir að ${n.origin} hafi ${a}${n.minimum.toString()} ${c.unit}`
            : `Of lítið: gert er ráð fyrir að ${n.origin} sé ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Ógildur strengur: verður að byrja á "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Ógildur strengur: verður að enda á "${a.suffix}"`
              : a.format === 'includes'
                ? `Ógildur strengur: verður að innihalda "${a.includes}"`
                : a.format === 'regex'
                  ? `Ógildur strengur: verður að fylgja mynstri ${a.pattern}`
                  : `Rangt ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Röng tala: verður að vera margfeldi af ${n.divisor}`;
        case 'unrecognized_keys':
          return `Óþekkt ${n.keys.length > 1 ? 'ir lyklar' : 'ur lykill'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Rangur lykill í ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Rangt gildi';
        case 'invalid_element':
          return `Rangt gildi í ${n.origin}`;
      }
    };
  };
  function Qz() {
    return { localeError: Yz() };
  }
  var ej = () => {
    let e = {
      string: { unit: 'caratteri', verb: 'avere' },
      file: { unit: 'byte', verb: 'avere' },
      array: { unit: 'elementi', verb: 'avere' },
      set: { unit: 'elementi', verb: 'avere' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'input',
      email: 'indirizzo email',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'data e ora ISO',
      date: 'data ISO',
      time: 'ora ISO',
      duration: 'durata ISO',
      ipv4: 'indirizzo IPv4',
      ipv6: 'indirizzo IPv6',
      cidrv4: 'intervallo IPv4',
      cidrv6: 'intervallo IPv6',
      base64: 'stringa codificata in base64',
      base64url: 'URL codificata in base64',
      json_string: 'stringa JSON',
      e164: 'numero E.164',
      jwt: 'JWT',
      template_literal: 'input',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Input non valido: atteso ${n.expected}, ricevuto ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'numero';
              case 'object':
                if (Array.isArray(a)) return 'vettore';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Input non valido: atteso ${N(n.values[0])}`
            : `Opzione non valida: atteso uno tra ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Troppo grande: ${(r = n.origin) != null ? r : 'valore'} deve avere ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elementi'}`
            : `Troppo grande: ${(s = n.origin) != null ? s : 'valore'} deve essere ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Troppo piccolo: ${n.origin} deve avere ${a}${n.minimum.toString()} ${c.unit}`
            : `Troppo piccolo: ${n.origin} deve essere ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Stringa non valida: deve iniziare con "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Stringa non valida: deve terminare con "${a.suffix}"`
              : a.format === 'includes'
                ? `Stringa non valida: deve includere "${a.includes}"`
                : a.format === 'regex'
                  ? `Stringa non valida: deve corrispondere al pattern ${a.pattern}`
                  : `Invalid ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Numero non valido: deve essere un multiplo di ${n.divisor}`;
        case 'unrecognized_keys':
          return `Chiav${n.keys.length > 1 ? 'i' : 'e'} non riconosciut${n.keys.length > 1 ? 'e' : 'a'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Chiave non valida in ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Input non valido';
        case 'invalid_element':
          return `Valore non valido in ${n.origin}`;
      }
    };
  };
  function tj() {
    return { localeError: ej() };
  }
  var nj = () => {
    let e = {
      string: { unit: '文字', verb: 'である' },
      file: { unit: 'バイト', verb: 'である' },
      array: { unit: '要素', verb: 'である' },
      set: { unit: '要素', verb: 'である' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: '入力値',
      email: 'メールアドレス',
      url: 'URL',
      emoji: '絵文字',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO日時',
      date: 'ISO日付',
      time: 'ISO時刻',
      duration: 'ISO期間',
      ipv4: 'IPv4アドレス',
      ipv6: 'IPv6アドレス',
      cidrv4: 'IPv4範囲',
      cidrv6: 'IPv6範囲',
      base64: 'base64エンコード文字列',
      base64url: 'base64urlエンコード文字列',
      json_string: 'JSON文字列',
      e164: 'E.164番号',
      jwt: 'JWT',
      template_literal: '入力値',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `無効な入力: ${n.expected}が期待されましたが、${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : '数値';
              case 'object':
                if (Array.isArray(a)) return '配列';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}が入力されました`;
        case 'invalid_value':
          return n.values.length === 1
            ? `無効な入力: ${N(n.values[0])}が期待されました`
            : `無効な選択: ${z(n.values, '、')}のいずれかである必要があります`;
        case 'too_big': {
          let a = n.inclusive ? '以下である' : 'より小さい',
            c = t(n.origin);
          return c
            ? `大きすぎる値: ${(r = n.origin) != null ? r : '値'}は${n.maximum.toString()}${(o = c.unit) != null ? o : '要素'}${a}必要があります`
            : `大きすぎる値: ${(s = n.origin) != null ? s : '値'}は${n.maximum.toString()}${a}必要があります`;
        }
        case 'too_small': {
          let a = n.inclusive ? '以上である' : 'より大きい',
            c = t(n.origin);
          return c
            ? `小さすぎる値: ${n.origin}は${n.minimum.toString()}${c.unit}${a}必要があります`
            : `小さすぎる値: ${n.origin}は${n.minimum.toString()}${a}必要があります`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `無効な文字列: "${a.prefix}"で始まる必要があります`
            : a.format === 'ends_with'
              ? `無効な文字列: "${a.suffix}"で終わる必要があります`
              : a.format === 'includes'
                ? `無効な文字列: "${a.includes}"を含む必要があります`
                : a.format === 'regex'
                  ? `無効な文字列: パターン${a.pattern}に一致する必要があります`
                  : `無効な${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `無効な数値: ${n.divisor}の倍数である必要があります`;
        case 'unrecognized_keys':
          return `認識されていないキー${n.keys.length > 1 ? '群' : ''}: ${z(n.keys, '、')}`;
        case 'invalid_key':
          return `${n.origin}内の無効なキー`;
        case 'invalid_union':
        default:
          return '無効な入力';
        case 'invalid_element':
          return `${n.origin}内の無効な値`;
      }
    };
  };
  function rj() {
    return { localeError: nj() };
  }
  var ij = () => {
    let e = {
      string: { unit: 'სიმბოლო', verb: 'უნდა შეიცავდეს' },
      file: { unit: 'ბაიტი', verb: 'უნდა შეიცავდეს' },
      array: { unit: 'ელემენტი', verb: 'უნდა შეიცავდეს' },
      set: { unit: 'ელემენტი', verb: 'უნდა შეიცავდეს' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'შეყვანა',
      email: 'ელ-ფოსტის მისამართი',
      url: 'URL',
      emoji: 'ემოჯი',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'თარიღი-დრო',
      date: 'თარიღი',
      time: 'დრო',
      duration: 'ხანგრძლივობა',
      ipv4: 'IPv4 მისამართი',
      ipv6: 'IPv6 მისამართი',
      cidrv4: 'IPv4 დიაპაზონი',
      cidrv6: 'IPv6 დიაპაზონი',
      base64: 'base64-კოდირებული სტრინგი',
      base64url: 'base64url-კოდირებული სტრინგი',
      json_string: 'JSON სტრინგი',
      e164: 'E.164 ნომერი',
      jwt: 'JWT',
      template_literal: 'შეყვანა',
    };
    return (n) => {
      var r, o, s;
      switch (n.code) {
        case 'invalid_type':
          return `არასწორი შეყვანა: მოსალოდნელი ${n.expected}, მიღებული ${((
            u,
          ) => {
            var a;
            let c = typeof u;
            switch (c) {
              case 'number':
                return Number.isNaN(u) ? 'NaN' : 'რიცხვი';
              case 'object':
                if (Array.isArray(u)) return 'მასივი';
                if (u === null) return 'null';
                if (
                  Object.getPrototypeOf(u) !== Object.prototype &&
                  u.constructor
                )
                  return u.constructor.name;
            }
            return (a = {
              string: 'სტრინგი',
              boolean: 'ბულეანი',
              undefined: 'undefined',
              bigint: 'bigint',
              symbol: 'symbol',
              function: 'ფუნქცია',
            }[c]) != null
              ? a
              : c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `არასწორი შეყვანა: მოსალოდნელი ${N(n.values[0])}`
            : `არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${z(n.values, '|')}-დან`;
        case 'too_big': {
          let u = n.inclusive ? '<=' : '<',
            a = t(n.origin);
          return a
            ? `ზედმეტად დიდი: მოსალოდნელი ${(r = n.origin) != null ? r : 'მნიშვნელობა'} ${a.verb} ${u}${n.maximum.toString()} ${a.unit}`
            : `ზედმეტად დიდი: მოსალოდნელი ${(o = n.origin) != null ? o : 'მნიშვნელობა'} იყოს ${u}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let u = n.inclusive ? '>=' : '>',
            a = t(n.origin);
          return a
            ? `ზედმეტად პატარა: მოსალოდნელი ${n.origin} ${a.verb} ${u}${n.minimum.toString()} ${a.unit}`
            : `ზედმეტად პატარა: მოსალოდნელი ${n.origin} იყოს ${u}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let u = n;
          return u.format === 'starts_with'
            ? `არასწორი სტრინგი: უნდა იწყებოდეს "${u.prefix}"-ით`
            : u.format === 'ends_with'
              ? `არასწორი სტრინგი: უნდა მთავრდებოდეს "${u.suffix}"-ით`
              : u.format === 'includes'
                ? `არასწორი სტრინგი: უნდა შეიცავდეს "${u.includes}"-ს`
                : u.format === 'regex'
                  ? `არასწორი სტრინგი: უნდა შეესაბამებოდეს შაბლონს ${u.pattern}`
                  : `არასწორი ${(s = i[u.format]) != null ? s : n.format}`;
        }
        case 'not_multiple_of':
          return `არასწორი რიცხვი: უნდა იყოს ${n.divisor}-ის ჯერადი`;
        case 'unrecognized_keys':
          return `უცნობი გასაღებ${n.keys.length > 1 ? 'ები' : 'ი'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `არასწორი გასაღები ${n.origin}-ში`;
        case 'invalid_union':
        default:
          return 'არასწორი შეყვანა';
        case 'invalid_element':
          return `არასწორი მნიშვნელობა ${n.origin}-ში`;
      }
    };
  };
  function oj() {
    return { localeError: ij() };
  }
  var aj = () => {
    let e = {
      string: { unit: 'តួអក្សរ', verb: 'គួរមាន' },
      file: { unit: 'បៃ', verb: 'គួរមាន' },
      array: { unit: 'ធាតុ', verb: 'គួរមាន' },
      set: { unit: 'ធាតុ', verb: 'គួរមាន' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'ទិន្នន័យបញ្ចូល',
      email: 'អាសយដ្ឋានអ៊ីមែល',
      url: 'URL',
      emoji: 'សញ្ញាអារម្មណ៍',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'កាលបរិច្ឆេទ និងម៉ោង ISO',
      date: 'កាលបរិច្ឆេទ ISO',
      time: 'ម៉ោង ISO',
      duration: 'រយៈពេល ISO',
      ipv4: 'អាសយដ្ឋាន IPv4',
      ipv6: 'អាសយដ្ឋាន IPv6',
      cidrv4: 'ដែនអាសយដ្ឋាន IPv4',
      cidrv6: 'ដែនអាសយដ្ឋាន IPv6',
      base64: 'ខ្សែអក្សរអ៊ិកូដ base64',
      base64url: 'ខ្សែអក្សរអ៊ិកូដ base64url',
      json_string: 'ខ្សែអក្សរ JSON',
      e164: 'លេខ E.164',
      jwt: 'JWT',
      template_literal: 'ទិន្នន័យបញ្ចូល',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${n.expected} ប៉ុន្តែទទួលបាន ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'មិនមែនជាលេខ (NaN)' : 'លេខ';
              case 'object':
                if (Array.isArray(a)) return 'អារេ (Array)';
                if (a === null) return 'គ្មានតម្លៃ (null)';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${N(n.values[0])}`
            : `ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `ធំពេក៖ ត្រូវការ ${(r = n.origin) != null ? r : 'តម្លៃ'} ${a} ${n.maximum.toString()} ${(o = c.unit) != null ? o : 'ធាតុ'}`
            : `ធំពេក៖ ត្រូវការ ${(s = n.origin) != null ? s : 'តម្លៃ'} ${a} ${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `តូចពេក៖ ត្រូវការ ${n.origin} ${a} ${n.minimum.toString()} ${c.unit}`
            : `តូចពេក៖ ត្រូវការ ${n.origin} ${a} ${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវចាប់ផ្តើមដោយ "${a.prefix}"`
            : a.format === 'ends_with'
              ? `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវបញ្ចប់ដោយ "${a.suffix}"`
              : a.format === 'includes'
                ? `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវមាន "${a.includes}"`
                : a.format === 'regex'
                  ? `ខ្សែអក្សរមិនត្រឹមត្រូវ៖ ត្រូវតែផ្គូផ្គងនឹងទម្រង់ដែលបានកំណត់ ${a.pattern}`
                  : `មិនត្រឹមត្រូវ៖ ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `លេខមិនត្រឹមត្រូវ៖ ត្រូវតែជាពហុគុណនៃ ${n.divisor}`;
        case 'unrecognized_keys':
          return `រកឃើញសោមិនស្គាល់៖ ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `សោមិនត្រឹមត្រូវនៅក្នុង ${n.origin}`;
        case 'invalid_union':
        default:
          return 'ទិន្នន័យមិនត្រឹមត្រូវ';
        case 'invalid_element':
          return `ទិន្នន័យមិនត្រឹមត្រូវនៅក្នុង ${n.origin}`;
      }
    };
  };
  function Vh() {
    return { localeError: aj() };
  }
  function sj() {
    return Vh();
  }
  var uj = () => {
    let e = {
      string: { unit: '문자', verb: 'to have' },
      file: { unit: '바이트', verb: 'to have' },
      array: { unit: '개', verb: 'to have' },
      set: { unit: '개', verb: 'to have' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: '입력',
      email: '이메일 주소',
      url: 'URL',
      emoji: '이모지',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO 날짜시간',
      date: 'ISO 날짜',
      time: 'ISO 시간',
      duration: 'ISO 기간',
      ipv4: 'IPv4 주소',
      ipv6: 'IPv6 주소',
      cidrv4: 'IPv4 범위',
      cidrv6: 'IPv6 범위',
      base64: 'base64 인코딩 문자열',
      base64url: 'base64url 인코딩 문자열',
      json_string: 'JSON 문자열',
      e164: 'E.164 번호',
      jwt: 'JWT',
      template_literal: '입력',
    };
    return (n) => {
      var r, o, s, u, a, c, m;
      switch (n.code) {
        case 'invalid_type':
          return `잘못된 입력: 예상 타입은 ${n.expected}, 받은 타입은 ${((
            p,
          ) => {
            let f = typeof p;
            switch (f) {
              case 'number':
                return Number.isNaN(p) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(p)) return 'array';
                if (p === null) return 'null';
                if (
                  Object.getPrototypeOf(p) !== Object.prototype &&
                  p.constructor
                )
                  return p.constructor.name;
            }
            return f;
          })(n.input)}입니다`;
        case 'invalid_value':
          return n.values.length === 1
            ? `잘못된 입력: 값은 ${N(n.values[0])} 이어야 합니다`
            : `잘못된 옵션: ${z(n.values, '또는 ')} 중 하나여야 합니다`;
        case 'too_big': {
          let p = n.inclusive ? '이하' : '미만',
            f = p === '미만' ? '이어야 합니다' : '여야 합니다',
            v = t(n.origin),
            b = (r = v?.unit) != null ? r : '요소';
          return v
            ? `${(o = n.origin) != null ? o : '값'}이 너무 큽니다: ${n.maximum.toString()}${b} ${p}${f}`
            : `${(s = n.origin) != null ? s : '값'}이 너무 큽니다: ${n.maximum.toString()} ${p}${f}`;
        }
        case 'too_small': {
          let p = n.inclusive ? '이상' : '초과',
            f = p === '이상' ? '이어야 합니다' : '여야 합니다',
            v = t(n.origin),
            b = (u = v?.unit) != null ? u : '요소';
          return v
            ? `${(a = n.origin) != null ? a : '값'}이 너무 작습니다: ${n.minimum.toString()}${b} ${p}${f}`
            : `${(c = n.origin) != null ? c : '값'}이 너무 작습니다: ${n.minimum.toString()} ${p}${f}`;
        }
        case 'invalid_format': {
          let p = n;
          return p.format === 'starts_with'
            ? `잘못된 문자열: "${p.prefix}"(으)로 시작해야 합니다`
            : p.format === 'ends_with'
              ? `잘못된 문자열: "${p.suffix}"(으)로 끝나야 합니다`
              : p.format === 'includes'
                ? `잘못된 문자열: "${p.includes}"을(를) 포함해야 합니다`
                : p.format === 'regex'
                  ? `잘못된 문자열: 정규식 ${p.pattern} 패턴과 일치해야 합니다`
                  : `잘못된 ${(m = i[p.format]) != null ? m : n.format}`;
        }
        case 'not_multiple_of':
          return `잘못된 숫자: ${n.divisor}의 배수여야 합니다`;
        case 'unrecognized_keys':
          return `인식할 수 없는 키: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `잘못된 키: ${n.origin}`;
        case 'invalid_union':
        default:
          return '잘못된 입력';
        case 'invalid_element':
          return `잘못된 값: ${n.origin}`;
      }
    };
  };
  function cj() {
    return { localeError: uj() };
  }
  var Wn = (e, t = void 0) => {
      switch (e) {
        case 'number':
          return Number.isNaN(t) ? 'NaN' : 'skaičius';
        case 'bigint':
          return 'sveikasis skaičius';
        case 'string':
          return 'eilutė';
        case 'boolean':
          return 'loginė reikšmė';
        case 'undefined':
        case 'void':
          return 'neapibrėžta reikšmė';
        case 'function':
          return 'funkcija';
        case 'symbol':
          return 'simbolis';
        case 'object':
          return t === void 0
            ? 'nežinomas objektas'
            : t === null
              ? 'nulinė reikšmė'
              : Array.isArray(t)
                ? 'masyvas'
                : Object.getPrototypeOf(t) !== Object.prototype && t.constructor
                  ? t.constructor.name
                  : 'objektas';
        case 'null':
          return 'nulinė reikšmė';
      }
      return e;
    },
    Bn = (e) => e.charAt(0).toUpperCase() + e.slice(1);
  function cv(e) {
    let t = Math.abs(e),
      i = t % 10,
      n = t % 100;
    return (n >= 11 && n <= 19) || i === 0 ? 'many' : i === 1 ? 'one' : 'few';
  }
  var lj = () => {
    let e = {
      string: {
        unit: { one: 'simbolis', few: 'simboliai', many: 'simbolių' },
        verb: {
          smaller: {
            inclusive: 'turi būti ne ilgesnė kaip',
            notInclusive: 'turi būti trumpesnė kaip',
          },
          bigger: {
            inclusive: 'turi būti ne trumpesnė kaip',
            notInclusive: 'turi būti ilgesnė kaip',
          },
        },
      },
      file: {
        unit: { one: 'baitas', few: 'baitai', many: 'baitų' },
        verb: {
          smaller: {
            inclusive: 'turi būti ne didesnis kaip',
            notInclusive: 'turi būti mažesnis kaip',
          },
          bigger: {
            inclusive: 'turi būti ne mažesnis kaip',
            notInclusive: 'turi būti didesnis kaip',
          },
        },
      },
      array: {
        unit: { one: 'elementą', few: 'elementus', many: 'elementų' },
        verb: {
          smaller: {
            inclusive: 'turi turėti ne daugiau kaip',
            notInclusive: 'turi turėti mažiau kaip',
          },
          bigger: {
            inclusive: 'turi turėti ne mažiau kaip',
            notInclusive: 'turi turėti daugiau kaip',
          },
        },
      },
      set: {
        unit: { one: 'elementą', few: 'elementus', many: 'elementų' },
        verb: {
          smaller: {
            inclusive: 'turi turėti ne daugiau kaip',
            notInclusive: 'turi turėti mažiau kaip',
          },
          bigger: {
            inclusive: 'turi turėti ne mažiau kaip',
            notInclusive: 'turi turėti daugiau kaip',
          },
        },
      },
    };
    function t(n, r, o, s) {
      var u;
      let a = (u = e[n]) != null ? u : null;
      return a === null
        ? a
        : {
            unit: a.unit[r],
            verb: a.verb[s][o ? 'inclusive' : 'notInclusive'],
          };
    }
    let i = {
      regex: 'įvestis',
      email: 'el. pašto adresas',
      url: 'URL',
      emoji: 'jaustukas',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO data ir laikas',
      date: 'ISO data',
      time: 'ISO laikas',
      duration: 'ISO trukmė',
      ipv4: 'IPv4 adresas',
      ipv6: 'IPv6 adresas',
      cidrv4: 'IPv4 tinklo prefiksas (CIDR)',
      cidrv6: 'IPv6 tinklo prefiksas (CIDR)',
      base64: 'base64 užkoduota eilutė',
      base64url: 'base64url užkoduota eilutė',
      json_string: 'JSON eilutė',
      e164: 'E.164 numeris',
      jwt: 'JWT',
      template_literal: 'įvestis',
    };
    return (n) => {
      var r, o, s, u, a, c, m, p, f, v, b;
      switch (n.code) {
        case 'invalid_type':
          return `Gautas tipas ${((b = n.input), Wn(typeof b, b))}, o tikėtasi - ${Wn(n.expected)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Privalo būti ${N(n.values[0])}`
            : `Privalo būti vienas iš ${z(n.values, '|')} pasirinkimų`;
        case 'too_big': {
          let $ = Wn(n.origin),
            g = t(
              n.origin,
              cv(Number(n.maximum)),
              (r = n.inclusive) != null && r,
              'smaller',
            );
          if (g?.verb)
            return `${Bn((o = $ ?? n.origin) != null ? o : 'reikšmė')} ${g.verb} ${n.maximum.toString()} ${(s = g.unit) != null ? s : 'elementų'}`;
          let k = n.inclusive ? 'ne didesnis kaip' : 'mažesnis kaip';
          return `${Bn((u = $ ?? n.origin) != null ? u : 'reikšmė')} turi būti ${k} ${n.maximum.toString()} ${g?.unit}`;
        }
        case 'too_small': {
          let $ = Wn(n.origin),
            g = t(
              n.origin,
              cv(Number(n.minimum)),
              (a = n.inclusive) != null && a,
              'bigger',
            );
          if (g?.verb)
            return `${Bn((c = $ ?? n.origin) != null ? c : 'reikšmė')} ${g.verb} ${n.minimum.toString()} ${(m = g.unit) != null ? m : 'elementų'}`;
          let k = n.inclusive ? 'ne mažesnis kaip' : 'didesnis kaip';
          return `${Bn((p = $ ?? n.origin) != null ? p : 'reikšmė')} turi būti ${k} ${n.minimum.toString()} ${g?.unit}`;
        }
        case 'invalid_format': {
          let $ = n;
          return $.format === 'starts_with'
            ? `Eilutė privalo prasidėti "${$.prefix}"`
            : $.format === 'ends_with'
              ? `Eilutė privalo pasibaigti "${$.suffix}"`
              : $.format === 'includes'
                ? `Eilutė privalo įtraukti "${$.includes}"`
                : $.format === 'regex'
                  ? `Eilutė privalo atitikti ${$.pattern}`
                  : `Neteisingas ${(f = i[$.format]) != null ? f : n.format}`;
        }
        case 'not_multiple_of':
          return `Skaičius privalo būti ${n.divisor} kartotinis.`;
        case 'unrecognized_keys':
          return `Neatpažint${n.keys.length > 1 ? 'i' : 'as'} rakt${n.keys.length > 1 ? 'ai' : 'as'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return 'Rastas klaidingas raktas';
        case 'invalid_union':
        default:
          return 'Klaidinga įvestis';
        case 'invalid_element': {
          let $ = Wn(n.origin);
          return `${Bn((v = $ ?? n.origin) != null ? v : 'reikšmė')} turi klaidingą įvestį`;
        }
      }
    };
  };
  function dj() {
    return { localeError: lj() };
  }
  var mj = () => {
    let e = {
      string: { unit: 'знаци', verb: 'да имаат' },
      file: { unit: 'бајти', verb: 'да имаат' },
      array: { unit: 'ставки', verb: 'да имаат' },
      set: { unit: 'ставки', verb: 'да имаат' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'внес',
      email: 'адреса на е-пошта',
      url: 'URL',
      emoji: 'емоџи',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO датум и време',
      date: 'ISO датум',
      time: 'ISO време',
      duration: 'ISO времетраење',
      ipv4: 'IPv4 адреса',
      ipv6: 'IPv6 адреса',
      cidrv4: 'IPv4 опсег',
      cidrv6: 'IPv6 опсег',
      base64: 'base64-енкодирана низа',
      base64url: 'base64url-енкодирана низа',
      json_string: 'JSON низа',
      e164: 'E.164 број',
      jwt: 'JWT',
      template_literal: 'внес',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Грешен внес: се очекува ${n.expected}, примено ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'број';
              case 'object':
                if (Array.isArray(a)) return 'низа';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Invalid input: expected ${N(n.values[0])}`
            : `Грешана опција: се очекува една ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Премногу голем: се очекува ${(r = n.origin) != null ? r : 'вредноста'} да има ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'елементи'}`
            : `Премногу голем: се очекува ${(s = n.origin) != null ? s : 'вредноста'} да биде ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Премногу мал: се очекува ${n.origin} да има ${a}${n.minimum.toString()} ${c.unit}`
            : `Премногу мал: се очекува ${n.origin} да биде ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Неважечка низа: мора да започнува со "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Неважечка низа: мора да завршува со "${a.suffix}"`
              : a.format === 'includes'
                ? `Неважечка низа: мора да вклучува "${a.includes}"`
                : a.format === 'regex'
                  ? `Неважечка низа: мора да одгоара на патернот ${a.pattern}`
                  : `Invalid ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Грешен број: мора да биде делив со ${n.divisor}`;
        case 'unrecognized_keys':
          return `${n.keys.length > 1 ? 'Непрепознаени клучеви' : 'Непрепознаен клуч'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Грешен клуч во ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Грешен внес';
        case 'invalid_element':
          return `Грешна вредност во ${n.origin}`;
      }
    };
  };
  function pj() {
    return { localeError: mj() };
  }
  var fj = () => {
    let e = {
      string: { unit: 'aksara', verb: 'mempunyai' },
      file: { unit: 'bait', verb: 'mempunyai' },
      array: { unit: 'elemen', verb: 'mempunyai' },
      set: { unit: 'elemen', verb: 'mempunyai' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'input',
      email: 'alamat e-mel',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'tarikh masa ISO',
      date: 'tarikh ISO',
      time: 'masa ISO',
      duration: 'tempoh ISO',
      ipv4: 'alamat IPv4',
      ipv6: 'alamat IPv6',
      cidrv4: 'julat IPv4',
      cidrv6: 'julat IPv6',
      base64: 'string dikodkan base64',
      base64url: 'string dikodkan base64url',
      json_string: 'string JSON',
      e164: 'nombor E.164',
      jwt: 'JWT',
      template_literal: 'input',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Input tidak sah: dijangka ${n.expected}, diterima ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'nombor';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Input tidak sah: dijangka ${N(n.values[0])}`
            : `Pilihan tidak sah: dijangka salah satu daripada ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Terlalu besar: dijangka ${(r = n.origin) != null ? r : 'nilai'} ${c.verb} ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elemen'}`
            : `Terlalu besar: dijangka ${(s = n.origin) != null ? s : 'nilai'} adalah ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Terlalu kecil: dijangka ${n.origin} ${c.verb} ${a}${n.minimum.toString()} ${c.unit}`
            : `Terlalu kecil: dijangka ${n.origin} adalah ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `String tidak sah: mesti bermula dengan "${a.prefix}"`
            : a.format === 'ends_with'
              ? `String tidak sah: mesti berakhir dengan "${a.suffix}"`
              : a.format === 'includes'
                ? `String tidak sah: mesti mengandungi "${a.includes}"`
                : a.format === 'regex'
                  ? `String tidak sah: mesti sepadan dengan corak ${a.pattern}`
                  : `${(u = i[a.format]) != null ? u : n.format} tidak sah`;
        }
        case 'not_multiple_of':
          return `Nombor tidak sah: perlu gandaan ${n.divisor}`;
        case 'unrecognized_keys':
          return `Kunci tidak dikenali: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Kunci tidak sah dalam ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Input tidak sah';
        case 'invalid_element':
          return `Nilai tidak sah dalam ${n.origin}`;
      }
    };
  };
  function vj() {
    return { localeError: fj() };
  }
  var gj = () => {
    let e = {
      string: { unit: 'tekens' },
      file: { unit: 'bytes' },
      array: { unit: 'elementen' },
      set: { unit: 'elementen' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'invoer',
      email: 'emailadres',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO datum en tijd',
      date: 'ISO datum',
      time: 'ISO tijd',
      duration: 'ISO duur',
      ipv4: 'IPv4-adres',
      ipv6: 'IPv6-adres',
      cidrv4: 'IPv4-bereik',
      cidrv6: 'IPv6-bereik',
      base64: 'base64-gecodeerde tekst',
      base64url: 'base64 URL-gecodeerde tekst',
      json_string: 'JSON string',
      e164: 'E.164-nummer',
      jwt: 'JWT',
      template_literal: 'invoer',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Ongeldige invoer: verwacht ${n.expected}, ontving ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'getal';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Ongeldige invoer: verwacht ${N(n.values[0])}`
            : `Ongeldige optie: verwacht één van ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Te lang: verwacht dat ${(r = n.origin) != null ? r : 'waarde'} ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elementen'} bevat`
            : `Te lang: verwacht dat ${(s = n.origin) != null ? s : 'waarde'} ${a}${n.maximum.toString()} is`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Te kort: verwacht dat ${n.origin} ${a}${n.minimum.toString()} ${c.unit} bevat`
            : `Te kort: verwacht dat ${n.origin} ${a}${n.minimum.toString()} is`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Ongeldige tekst: moet met "${a.prefix}" beginnen`
            : a.format === 'ends_with'
              ? `Ongeldige tekst: moet op "${a.suffix}" eindigen`
              : a.format === 'includes'
                ? `Ongeldige tekst: moet "${a.includes}" bevatten`
                : a.format === 'regex'
                  ? `Ongeldige tekst: moet overeenkomen met patroon ${a.pattern}`
                  : `Ongeldig: ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Ongeldig getal: moet een veelvoud van ${n.divisor} zijn`;
        case 'unrecognized_keys':
          return `Onbekende key${n.keys.length > 1 ? 's' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Ongeldige key in ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Ongeldige invoer';
        case 'invalid_element':
          return `Ongeldige waarde in ${n.origin}`;
      }
    };
  };
  function hj() {
    return { localeError: gj() };
  }
  var bj = () => {
    let e = {
      string: { unit: 'tegn', verb: 'å ha' },
      file: { unit: 'bytes', verb: 'å ha' },
      array: { unit: 'elementer', verb: 'å inneholde' },
      set: { unit: 'elementer', verb: 'å inneholde' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'input',
      email: 'e-postadresse',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO dato- og klokkeslett',
      date: 'ISO-dato',
      time: 'ISO-klokkeslett',
      duration: 'ISO-varighet',
      ipv4: 'IPv4-område',
      ipv6: 'IPv6-område',
      cidrv4: 'IPv4-spekter',
      cidrv6: 'IPv6-spekter',
      base64: 'base64-enkodet streng',
      base64url: 'base64url-enkodet streng',
      json_string: 'JSON-streng',
      e164: 'E.164-nummer',
      jwt: 'JWT',
      template_literal: 'input',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Ugyldig input: forventet ${n.expected}, fikk ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'tall';
              case 'object':
                if (Array.isArray(a)) return 'liste';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Ugyldig verdi: forventet ${N(n.values[0])}`
            : `Ugyldig valg: forventet en av ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `For stor(t): forventet ${(r = n.origin) != null ? r : 'value'} til å ha ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elementer'}`
            : `For stor(t): forventet ${(s = n.origin) != null ? s : 'value'} til å ha ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `For lite(n): forventet ${n.origin} til å ha ${a}${n.minimum.toString()} ${c.unit}`
            : `For lite(n): forventet ${n.origin} til å ha ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Ugyldig streng: må starte med "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Ugyldig streng: må ende med "${a.suffix}"`
              : a.format === 'includes'
                ? `Ugyldig streng: må inneholde "${a.includes}"`
                : a.format === 'regex'
                  ? `Ugyldig streng: må matche mønsteret ${a.pattern}`
                  : `Ugyldig ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Ugyldig tall: må være et multiplum av ${n.divisor}`;
        case 'unrecognized_keys':
          return `${n.keys.length > 1 ? 'Ukjente nøkler' : 'Ukjent nøkkel'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Ugyldig nøkkel i ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Ugyldig input';
        case 'invalid_element':
          return `Ugyldig verdi i ${n.origin}`;
      }
    };
  };
  function yj() {
    return { localeError: bj() };
  }
  var $j = () => {
    let e = {
      string: { unit: 'harf', verb: 'olmalıdır' },
      file: { unit: 'bayt', verb: 'olmalıdır' },
      array: { unit: 'unsur', verb: 'olmalıdır' },
      set: { unit: 'unsur', verb: 'olmalıdır' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'giren',
      email: 'epostagâh',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO hengâmı',
      date: 'ISO tarihi',
      time: 'ISO zamanı',
      duration: 'ISO müddeti',
      ipv4: 'IPv4 nişânı',
      ipv6: 'IPv6 nişânı',
      cidrv4: 'IPv4 menzili',
      cidrv6: 'IPv6 menzili',
      base64: 'base64-şifreli metin',
      base64url: 'base64url-şifreli metin',
      json_string: 'JSON metin',
      e164: 'E.164 sayısı',
      jwt: 'JWT',
      template_literal: 'giren',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Fâsit giren: umulan ${n.expected}, alınan ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'numara';
              case 'object':
                if (Array.isArray(a)) return 'saf';
                if (a === null) return 'gayb';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Fâsit giren: umulan ${N(n.values[0])}`
            : `Fâsit tercih: mûteberler ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Fazla büyük: ${(r = n.origin) != null ? r : 'value'}, ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elements'} sahip olmalıydı.`
            : `Fazla büyük: ${(s = n.origin) != null ? s : 'value'}, ${a}${n.maximum.toString()} olmalıydı.`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Fazla küçük: ${n.origin}, ${a}${n.minimum.toString()} ${c.unit} sahip olmalıydı.`
            : `Fazla küçük: ${n.origin}, ${a}${n.minimum.toString()} olmalıydı.`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Fâsit metin: "${a.prefix}" ile başlamalı.`
            : a.format === 'ends_with'
              ? `Fâsit metin: "${a.suffix}" ile bitmeli.`
              : a.format === 'includes'
                ? `Fâsit metin: "${a.includes}" ihtivâ etmeli.`
                : a.format === 'regex'
                  ? `Fâsit metin: ${a.pattern} nakşına uymalı.`
                  : `Fâsit ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Fâsit sayı: ${n.divisor} katı olmalıydı.`;
        case 'unrecognized_keys':
          return `Tanınmayan anahtar ${n.keys.length > 1 ? 's' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `${n.origin} için tanınmayan anahtar var.`;
        case 'invalid_union':
          return 'Giren tanınamadı.';
        case 'invalid_element':
          return `${n.origin} için tanınmayan kıymet var.`;
        default:
          return 'Kıymet tanınamadı.';
      }
    };
  };
  function _j() {
    return { localeError: $j() };
  }
  var kj = () => {
    let e = {
      string: { unit: 'توکي', verb: 'ولري' },
      file: { unit: 'بایټس', verb: 'ولري' },
      array: { unit: 'توکي', verb: 'ولري' },
      set: { unit: 'توکي', verb: 'ولري' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'ورودي',
      email: 'بریښنالیک',
      url: 'یو آر ال',
      emoji: 'ایموجي',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'نیټه او وخت',
      date: 'نېټه',
      time: 'وخت',
      duration: 'موده',
      ipv4: 'د IPv4 پته',
      ipv6: 'د IPv6 پته',
      cidrv4: 'د IPv4 ساحه',
      cidrv6: 'د IPv6 ساحه',
      base64: 'base64-encoded متن',
      base64url: 'base64url-encoded متن',
      json_string: 'JSON متن',
      e164: 'د E.164 شمېره',
      jwt: 'JWT',
      template_literal: 'ورودي',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `ناسم ورودي: باید ${n.expected} وای, مګر ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'عدد';
              case 'object':
                if (Array.isArray(a)) return 'ارې';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)} ترلاسه شو`;
        case 'invalid_value':
          return n.values.length === 1
            ? `ناسم ورودي: باید ${N(n.values[0])} وای`
            : `ناسم انتخاب: باید یو له ${z(n.values, '|')} څخه وای`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `ډیر لوی: ${(r = n.origin) != null ? r : 'ارزښت'} باید ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'عنصرونه'} ولري`
            : `ډیر لوی: ${(s = n.origin) != null ? s : 'ارزښت'} باید ${a}${n.maximum.toString()} وي`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `ډیر کوچنی: ${n.origin} باید ${a}${n.minimum.toString()} ${c.unit} ولري`
            : `ډیر کوچنی: ${n.origin} باید ${a}${n.minimum.toString()} وي`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `ناسم متن: باید د "${a.prefix}" سره پیل شي`
            : a.format === 'ends_with'
              ? `ناسم متن: باید د "${a.suffix}" سره پای ته ورسيږي`
              : a.format === 'includes'
                ? `ناسم متن: باید "${a.includes}" ولري`
                : a.format === 'regex'
                  ? `ناسم متن: باید د ${a.pattern} سره مطابقت ولري`
                  : `${(u = i[a.format]) != null ? u : n.format} ناسم دی`;
        }
        case 'not_multiple_of':
          return `ناسم عدد: باید د ${n.divisor} مضرب وي`;
        case 'unrecognized_keys':
          return `ناسم ${n.keys.length > 1 ? 'کلیډونه' : 'کلیډ'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `ناسم کلیډ په ${n.origin} کې`;
        case 'invalid_union':
        default:
          return 'ناسمه ورودي';
        case 'invalid_element':
          return `ناسم عنصر په ${n.origin} کې`;
      }
    };
  };
  function xj() {
    return { localeError: kj() };
  }
  var wj = () => {
    let e = {
      string: { unit: 'znaków', verb: 'mieć' },
      file: { unit: 'bajtów', verb: 'mieć' },
      array: { unit: 'elementów', verb: 'mieć' },
      set: { unit: 'elementów', verb: 'mieć' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'wyrażenie',
      email: 'adres email',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'data i godzina w formacie ISO',
      date: 'data w formacie ISO',
      time: 'godzina w formacie ISO',
      duration: 'czas trwania ISO',
      ipv4: 'adres IPv4',
      ipv6: 'adres IPv6',
      cidrv4: 'zakres IPv4',
      cidrv6: 'zakres IPv6',
      base64: 'ciąg znaków zakodowany w formacie base64',
      base64url: 'ciąg znaków zakodowany w formacie base64url',
      json_string: 'ciąg znaków w formacie JSON',
      e164: 'liczba E.164',
      jwt: 'JWT',
      template_literal: 'wejście',
    };
    return (n) => {
      var r, o, s, u, a, c, m;
      switch (n.code) {
        case 'invalid_type':
          return `Nieprawidłowe dane wejściowe: oczekiwano ${n.expected}, otrzymano ${((
            p,
          ) => {
            let f = typeof p;
            switch (f) {
              case 'number':
                return Number.isNaN(p) ? 'NaN' : 'liczba';
              case 'object':
                if (Array.isArray(p)) return 'tablica';
                if (p === null) return 'null';
                if (
                  Object.getPrototypeOf(p) !== Object.prototype &&
                  p.constructor
                )
                  return p.constructor.name;
            }
            return f;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Nieprawidłowe dane wejściowe: oczekiwano ${N(n.values[0])}`
            : `Nieprawidłowa opcja: oczekiwano jednej z wartości ${z(n.values, '|')}`;
        case 'too_big': {
          let p = n.inclusive ? '<=' : '<',
            f = t(n.origin);
          return f
            ? `Za duża wartość: oczekiwano, że ${(r = n.origin) != null ? r : 'wartość'} będzie mieć ${p}${n.maximum.toString()} ${(o = f.unit) != null ? o : 'elementów'}`
            : `Zbyt duż(y/a/e): oczekiwano, że ${(s = n.origin) != null ? s : 'wartość'} będzie wynosić ${p}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let p = n.inclusive ? '>=' : '>',
            f = t(n.origin);
          return f
            ? `Za mała wartość: oczekiwano, że ${(u = n.origin) != null ? u : 'wartość'} będzie mieć ${p}${n.minimum.toString()} ${(a = f.unit) != null ? a : 'elementów'}`
            : `Zbyt mał(y/a/e): oczekiwano, że ${(c = n.origin) != null ? c : 'wartość'} będzie wynosić ${p}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let p = n;
          return p.format === 'starts_with'
            ? `Nieprawidłowy ciąg znaków: musi zaczynać się od "${p.prefix}"`
            : p.format === 'ends_with'
              ? `Nieprawidłowy ciąg znaków: musi kończyć się na "${p.suffix}"`
              : p.format === 'includes'
                ? `Nieprawidłowy ciąg znaków: musi zawierać "${p.includes}"`
                : p.format === 'regex'
                  ? `Nieprawidłowy ciąg znaków: musi odpowiadać wzorcowi ${p.pattern}`
                  : `Nieprawidłow(y/a/e) ${(m = i[p.format]) != null ? m : n.format}`;
        }
        case 'not_multiple_of':
          return `Nieprawidłowa liczba: musi być wielokrotnością ${n.divisor}`;
        case 'unrecognized_keys':
          return `Nierozpoznane klucze${n.keys.length > 1 ? 's' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Nieprawidłowy klucz w ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Nieprawidłowe dane wejściowe';
        case 'invalid_element':
          return `Nieprawidłowa wartość w ${n.origin}`;
      }
    };
  };
  function Sj() {
    return { localeError: wj() };
  }
  var Ij = () => {
    let e = {
      string: { unit: 'caracteres', verb: 'ter' },
      file: { unit: 'bytes', verb: 'ter' },
      array: { unit: 'itens', verb: 'ter' },
      set: { unit: 'itens', verb: 'ter' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'padrão',
      email: 'endereço de e-mail',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'data e hora ISO',
      date: 'data ISO',
      time: 'hora ISO',
      duration: 'duração ISO',
      ipv4: 'endereço IPv4',
      ipv6: 'endereço IPv6',
      cidrv4: 'faixa de IPv4',
      cidrv6: 'faixa de IPv6',
      base64: 'texto codificado em base64',
      base64url: 'URL codificada em base64',
      json_string: 'texto JSON',
      e164: 'número E.164',
      jwt: 'JWT',
      template_literal: 'entrada',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Tipo inválido: esperado ${n.expected}, recebido ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'número';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'nulo';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Entrada inválida: esperado ${N(n.values[0])}`
            : `Opção inválida: esperada uma das ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Muito grande: esperado que ${(r = n.origin) != null ? r : 'valor'} tivesse ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elementos'}`
            : `Muito grande: esperado que ${(s = n.origin) != null ? s : 'valor'} fosse ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Muito pequeno: esperado que ${n.origin} tivesse ${a}${n.minimum.toString()} ${c.unit}`
            : `Muito pequeno: esperado que ${n.origin} fosse ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Texto inválido: deve começar com "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Texto inválido: deve terminar com "${a.suffix}"`
              : a.format === 'includes'
                ? `Texto inválido: deve incluir "${a.includes}"`
                : a.format === 'regex'
                  ? `Texto inválido: deve corresponder ao padrão ${a.pattern}`
                  : `${(u = i[a.format]) != null ? u : n.format} inválido`;
        }
        case 'not_multiple_of':
          return `Número inválido: deve ser múltiplo de ${n.divisor}`;
        case 'unrecognized_keys':
          return `Chave${n.keys.length > 1 ? 's' : ''} desconhecida${n.keys.length > 1 ? 's' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Chave inválida em ${n.origin}`;
        case 'invalid_union':
          return 'Entrada inválida';
        case 'invalid_element':
          return `Valor inválido em ${n.origin}`;
        default:
          return 'Campo inválido';
      }
    };
  };
  function zj() {
    return { localeError: Ij() };
  }
  function lv(e, t, i, n) {
    let r = Math.abs(e),
      o = r % 10,
      s = r % 100;
    return s >= 11 && s <= 19 ? n : o === 1 ? t : o >= 2 && o <= 4 ? i : n;
  }
  var jj = () => {
    let e = {
      string: {
        unit: { one: 'символ', few: 'символа', many: 'символов' },
        verb: 'иметь',
      },
      file: {
        unit: { one: 'байт', few: 'байта', many: 'байт' },
        verb: 'иметь',
      },
      array: {
        unit: { one: 'элемент', few: 'элемента', many: 'элементов' },
        verb: 'иметь',
      },
      set: {
        unit: { one: 'элемент', few: 'элемента', many: 'элементов' },
        verb: 'иметь',
      },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'ввод',
      email: 'email адрес',
      url: 'URL',
      emoji: 'эмодзи',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO дата и время',
      date: 'ISO дата',
      time: 'ISO время',
      duration: 'ISO длительность',
      ipv4: 'IPv4 адрес',
      ipv6: 'IPv6 адрес',
      cidrv4: 'IPv4 диапазон',
      cidrv6: 'IPv6 диапазон',
      base64: 'строка в формате base64',
      base64url: 'строка в формате base64url',
      json_string: 'JSON строка',
      e164: 'номер E.164',
      jwt: 'JWT',
      template_literal: 'ввод',
    };
    return (n) => {
      var r, o, s;
      switch (n.code) {
        case 'invalid_type':
          return `Неверный ввод: ожидалось ${n.expected}, получено ${((u) => {
            let a = typeof u;
            switch (a) {
              case 'number':
                return Number.isNaN(u) ? 'NaN' : 'число';
              case 'object':
                if (Array.isArray(u)) return 'массив';
                if (u === null) return 'null';
                if (
                  Object.getPrototypeOf(u) !== Object.prototype &&
                  u.constructor
                )
                  return u.constructor.name;
            }
            return a;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Неверный ввод: ожидалось ${N(n.values[0])}`
            : `Неверный вариант: ожидалось одно из ${z(n.values, '|')}`;
        case 'too_big': {
          let u = n.inclusive ? '<=' : '<',
            a = t(n.origin);
          if (a) {
            let c = lv(Number(n.maximum), a.unit.one, a.unit.few, a.unit.many);
            return `Слишком большое значение: ожидалось, что ${(r = n.origin) != null ? r : 'значение'} будет иметь ${u}${n.maximum.toString()} ${c}`;
          }
          return `Слишком большое значение: ожидалось, что ${(o = n.origin) != null ? o : 'значение'} будет ${u}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let u = n.inclusive ? '>=' : '>',
            a = t(n.origin);
          if (a) {
            let c = lv(Number(n.minimum), a.unit.one, a.unit.few, a.unit.many);
            return `Слишком маленькое значение: ожидалось, что ${n.origin} будет иметь ${u}${n.minimum.toString()} ${c}`;
          }
          return `Слишком маленькое значение: ожидалось, что ${n.origin} будет ${u}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let u = n;
          return u.format === 'starts_with'
            ? `Неверная строка: должна начинаться с "${u.prefix}"`
            : u.format === 'ends_with'
              ? `Неверная строка: должна заканчиваться на "${u.suffix}"`
              : u.format === 'includes'
                ? `Неверная строка: должна содержать "${u.includes}"`
                : u.format === 'regex'
                  ? `Неверная строка: должна соответствовать шаблону ${u.pattern}`
                  : `Неверный ${(s = i[u.format]) != null ? s : n.format}`;
        }
        case 'not_multiple_of':
          return `Неверное число: должно быть кратным ${n.divisor}`;
        case 'unrecognized_keys':
          return `Нераспознанн${n.keys.length > 1 ? 'ые' : 'ый'} ключ${n.keys.length > 1 ? 'и' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Неверный ключ в ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Неверные входные данные';
        case 'invalid_element':
          return `Неверное значение в ${n.origin}`;
      }
    };
  };
  function Oj() {
    return { localeError: jj() };
  }
  var Uj = () => {
    let e = {
      string: { unit: 'znakov', verb: 'imeti' },
      file: { unit: 'bajtov', verb: 'imeti' },
      array: { unit: 'elementov', verb: 'imeti' },
      set: { unit: 'elementov', verb: 'imeti' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'vnos',
      email: 'e-poštni naslov',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO datum in čas',
      date: 'ISO datum',
      time: 'ISO čas',
      duration: 'ISO trajanje',
      ipv4: 'IPv4 naslov',
      ipv6: 'IPv6 naslov',
      cidrv4: 'obseg IPv4',
      cidrv6: 'obseg IPv6',
      base64: 'base64 kodiran niz',
      base64url: 'base64url kodiran niz',
      json_string: 'JSON niz',
      e164: 'E.164 številka',
      jwt: 'JWT',
      template_literal: 'vnos',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Neveljaven vnos: pričakovano ${n.expected}, prejeto ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'število';
              case 'object':
                if (Array.isArray(a)) return 'tabela';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Neveljaven vnos: pričakovano ${N(n.values[0])}`
            : `Neveljavna možnost: pričakovano eno izmed ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Preveliko: pričakovano, da bo ${(r = n.origin) != null ? r : 'vrednost'} imelo ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'elementov'}`
            : `Preveliko: pričakovano, da bo ${(s = n.origin) != null ? s : 'vrednost'} ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Premajhno: pričakovano, da bo ${n.origin} imelo ${a}${n.minimum.toString()} ${c.unit}`
            : `Premajhno: pričakovano, da bo ${n.origin} ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Neveljaven niz: mora se začeti z "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Neveljaven niz: mora se končati z "${a.suffix}"`
              : a.format === 'includes'
                ? `Neveljaven niz: mora vsebovati "${a.includes}"`
                : a.format === 'regex'
                  ? `Neveljaven niz: mora ustrezati vzorcu ${a.pattern}`
                  : `Neveljaven ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Neveljavno število: mora biti večkratnik ${n.divisor}`;
        case 'unrecognized_keys':
          return `Neprepoznan${n.keys.length > 1 ? 'i ključi' : ' ključ'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Neveljaven ključ v ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Neveljaven vnos';
        case 'invalid_element':
          return `Neveljavna vrednost v ${n.origin}`;
      }
    };
  };
  function Pj() {
    return { localeError: Uj() };
  }
  var Nj = () => {
    let e = {
      string: { unit: 'tecken', verb: 'att ha' },
      file: { unit: 'bytes', verb: 'att ha' },
      array: { unit: 'objekt', verb: 'att innehålla' },
      set: { unit: 'objekt', verb: 'att innehålla' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'reguljärt uttryck',
      email: 'e-postadress',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO-datum och tid',
      date: 'ISO-datum',
      time: 'ISO-tid',
      duration: 'ISO-varaktighet',
      ipv4: 'IPv4-intervall',
      ipv6: 'IPv6-intervall',
      cidrv4: 'IPv4-spektrum',
      cidrv6: 'IPv6-spektrum',
      base64: 'base64-kodad sträng',
      base64url: 'base64url-kodad sträng',
      json_string: 'JSON-sträng',
      e164: 'E.164-nummer',
      jwt: 'JWT',
      template_literal: 'mall-literal',
    };
    return (n) => {
      var r, o, s, u, a, c, m, p;
      switch (n.code) {
        case 'invalid_type':
          return `Ogiltig inmatning: förväntat ${n.expected}, fick ${((f) => {
            let v = typeof f;
            switch (v) {
              case 'number':
                return Number.isNaN(f) ? 'NaN' : 'antal';
              case 'object':
                if (Array.isArray(f)) return 'lista';
                if (f === null) return 'null';
                if (
                  Object.getPrototypeOf(f) !== Object.prototype &&
                  f.constructor
                )
                  return f.constructor.name;
            }
            return v;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Ogiltig inmatning: förväntat ${N(n.values[0])}`
            : `Ogiltigt val: förväntade en av ${z(n.values, '|')}`;
        case 'too_big': {
          let f = n.inclusive ? '<=' : '<',
            v = t(n.origin);
          return v
            ? `För stor(t): förväntade ${(r = n.origin) != null ? r : 'värdet'} att ha ${f}${n.maximum.toString()} ${(o = v.unit) != null ? o : 'element'}`
            : `För stor(t): förväntat ${(s = n.origin) != null ? s : 'värdet'} att ha ${f}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let f = n.inclusive ? '>=' : '>',
            v = t(n.origin);
          return v
            ? `För lite(t): förväntade ${(u = n.origin) != null ? u : 'värdet'} att ha ${f}${n.minimum.toString()} ${v.unit}`
            : `För lite(t): förväntade ${(a = n.origin) != null ? a : 'värdet'} att ha ${f}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let f = n;
          return f.format === 'starts_with'
            ? `Ogiltig sträng: måste börja med "${f.prefix}"`
            : f.format === 'ends_with'
              ? `Ogiltig sträng: måste sluta med "${f.suffix}"`
              : f.format === 'includes'
                ? `Ogiltig sträng: måste innehålla "${f.includes}"`
                : f.format === 'regex'
                  ? `Ogiltig sträng: måste matcha mönstret "${f.pattern}"`
                  : `Ogiltig(t) ${(c = i[f.format]) != null ? c : n.format}`;
        }
        case 'not_multiple_of':
          return `Ogiltigt tal: måste vara en multipel av ${n.divisor}`;
        case 'unrecognized_keys':
          return `${n.keys.length > 1 ? 'Okända nycklar' : 'Okänd nyckel'}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Ogiltig nyckel i ${(m = n.origin) != null ? m : 'värdet'}`;
        case 'invalid_union':
        default:
          return 'Ogiltig input';
        case 'invalid_element':
          return `Ogiltigt värde i ${(p = n.origin) != null ? p : 'värdet'}`;
      }
    };
  };
  function Dj() {
    return { localeError: Nj() };
  }
  var Zj = () => {
    let e = {
      string: { unit: 'எழுத்துக்கள்', verb: 'கொண்டிருக்க வேண்டும்' },
      file: { unit: 'பைட்டுகள்', verb: 'கொண்டிருக்க வேண்டும்' },
      array: { unit: 'உறுப்புகள்', verb: 'கொண்டிருக்க வேண்டும்' },
      set: { unit: 'உறுப்புகள்', verb: 'கொண்டிருக்க வேண்டும்' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'உள்ளீடு',
      email: 'மின்னஞ்சல் முகவரி',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO தேதி நேரம்',
      date: 'ISO தேதி',
      time: 'ISO நேரம்',
      duration: 'ISO கால அளவு',
      ipv4: 'IPv4 முகவரி',
      ipv6: 'IPv6 முகவரி',
      cidrv4: 'IPv4 வரம்பு',
      cidrv6: 'IPv6 வரம்பு',
      base64: 'base64-encoded சரம்',
      base64url: 'base64url-encoded சரம்',
      json_string: 'JSON சரம்',
      e164: 'E.164 எண்',
      jwt: 'JWT',
      template_literal: 'input',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${n.expected}, பெறப்பட்டது ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'எண் அல்லாதது' : 'எண்';
              case 'object':
                if (Array.isArray(a)) return 'அணி';
                if (a === null) return 'வெறுமை';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${N(n.values[0])}`
            : `தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${z(n.values, '|')} இல் ஒன்று`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${(r = n.origin) != null ? r : 'மதிப்பு'} ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'உறுப்புகள்'} ஆக இருக்க வேண்டும்`
            : `மிக பெரியது: எதிர்பார்க்கப்பட்டது ${(s = n.origin) != null ? s : 'மதிப்பு'} ${a}${n.maximum.toString()} ஆக இருக்க வேண்டும்`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${n.origin} ${a}${n.minimum.toString()} ${c.unit} ஆக இருக்க வேண்டும்`
            : `மிகச் சிறியது: எதிர்பார்க்கப்பட்டது ${n.origin} ${a}${n.minimum.toString()} ஆக இருக்க வேண்டும்`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `தவறான சரம்: "${a.prefix}" இல் தொடங்க வேண்டும்`
            : a.format === 'ends_with'
              ? `தவறான சரம்: "${a.suffix}" இல் முடிவடைய வேண்டும்`
              : a.format === 'includes'
                ? `தவறான சரம்: "${a.includes}" ஐ உள்ளடக்க வேண்டும்`
                : a.format === 'regex'
                  ? `தவறான சரம்: ${a.pattern} முறைபாட்டுடன் பொருந்த வேண்டும்`
                  : `தவறான ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `தவறான எண்: ${n.divisor} இன் பலமாக இருக்க வேண்டும்`;
        case 'unrecognized_keys':
          return `அடையாளம் தெரியாத விசை${n.keys.length > 1 ? 'கள்' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `${n.origin} இல் தவறான விசை`;
        case 'invalid_union':
        default:
          return 'தவறான உள்ளீடு';
        case 'invalid_element':
          return `${n.origin} இல் தவறான மதிப்பு`;
      }
    };
  };
  function Ej() {
    return { localeError: Zj() };
  }
  var Tj = () => {
    let e = {
      string: { unit: 'ตัวอักษร', verb: 'ควรมี' },
      file: { unit: 'ไบต์', verb: 'ควรมี' },
      array: { unit: 'รายการ', verb: 'ควรมี' },
      set: { unit: 'รายการ', verb: 'ควรมี' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'ข้อมูลที่ป้อน',
      email: 'ที่อยู่อีเมล',
      url: 'URL',
      emoji: 'อิโมจิ',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'วันที่เวลาแบบ ISO',
      date: 'วันที่แบบ ISO',
      time: 'เวลาแบบ ISO',
      duration: 'ช่วงเวลาแบบ ISO',
      ipv4: 'ที่อยู่ IPv4',
      ipv6: 'ที่อยู่ IPv6',
      cidrv4: 'ช่วง IP แบบ IPv4',
      cidrv6: 'ช่วง IP แบบ IPv6',
      base64: 'ข้อความแบบ Base64',
      base64url: 'ข้อความแบบ Base64 สำหรับ URL',
      json_string: 'ข้อความแบบ JSON',
      e164: 'เบอร์โทรศัพท์ระหว่างประเทศ (E.164)',
      jwt: 'โทเคน JWT',
      template_literal: 'ข้อมูลที่ป้อน',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `ประเภทข้อมูลไม่ถูกต้อง: ควรเป็น ${n.expected} แต่ได้รับ ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'ไม่ใช่ตัวเลข (NaN)' : 'ตัวเลข';
              case 'object':
                if (Array.isArray(a)) return 'อาร์เรย์ (Array)';
                if (a === null) return 'ไม่มีค่า (null)';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `ค่าไม่ถูกต้อง: ควรเป็น ${N(n.values[0])}`
            : `ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? 'ไม่เกิน' : 'น้อยกว่า',
            c = t(n.origin);
          return c
            ? `เกินกำหนด: ${(r = n.origin) != null ? r : 'ค่า'} ควรมี${a} ${n.maximum.toString()} ${(o = c.unit) != null ? o : 'รายการ'}`
            : `เกินกำหนด: ${(s = n.origin) != null ? s : 'ค่า'} ควรมี${a} ${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? 'อย่างน้อย' : 'มากกว่า',
            c = t(n.origin);
          return c
            ? `น้อยกว่ากำหนด: ${n.origin} ควรมี${a} ${n.minimum.toString()} ${c.unit}`
            : `น้อยกว่ากำหนด: ${n.origin} ควรมี${a} ${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `รูปแบบไม่ถูกต้อง: ข้อความต้องขึ้นต้นด้วย "${a.prefix}"`
            : a.format === 'ends_with'
              ? `รูปแบบไม่ถูกต้อง: ข้อความต้องลงท้ายด้วย "${a.suffix}"`
              : a.format === 'includes'
                ? `รูปแบบไม่ถูกต้อง: ข้อความต้องมี "${a.includes}" อยู่ในข้อความ`
                : a.format === 'regex'
                  ? `รูปแบบไม่ถูกต้อง: ต้องตรงกับรูปแบบที่กำหนด ${a.pattern}`
                  : `รูปแบบไม่ถูกต้อง: ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `ตัวเลขไม่ถูกต้อง: ต้องเป็นจำนวนที่หารด้วย ${n.divisor} ได้ลงตัว`;
        case 'unrecognized_keys':
          return `พบคีย์ที่ไม่รู้จัก: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `คีย์ไม่ถูกต้องใน ${n.origin}`;
        case 'invalid_union':
          return 'ข้อมูลไม่ถูกต้อง: ไม่ตรงกับรูปแบบยูเนียนที่กำหนดไว้';
        case 'invalid_element':
          return `ข้อมูลไม่ถูกต้องใน ${n.origin}`;
        default:
          return 'ข้อมูลไม่ถูกต้อง';
      }
    };
  };
  function Aj() {
    return { localeError: Tj() };
  }
  var Cj = () => {
    let e = {
      string: { unit: 'karakter', verb: 'olmalı' },
      file: { unit: 'bayt', verb: 'olmalı' },
      array: { unit: 'öğe', verb: 'olmalı' },
      set: { unit: 'öğe', verb: 'olmalı' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'girdi',
      email: 'e-posta adresi',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO tarih ve saat',
      date: 'ISO tarih',
      time: 'ISO saat',
      duration: 'ISO süre',
      ipv4: 'IPv4 adresi',
      ipv6: 'IPv6 adresi',
      cidrv4: 'IPv4 aralığı',
      cidrv6: 'IPv6 aralığı',
      base64: 'base64 ile şifrelenmiş metin',
      base64url: 'base64url ile şifrelenmiş metin',
      json_string: 'JSON dizesi',
      e164: 'E.164 sayısı',
      jwt: 'JWT',
      template_literal: 'Şablon dizesi',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Geçersiz değer: beklenen ${n.expected}, alınan ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Geçersiz değer: beklenen ${N(n.values[0])}`
            : `Geçersiz seçenek: aşağıdakilerden biri olmalı: ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Çok büyük: beklenen ${(r = n.origin) != null ? r : 'değer'} ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'öğe'}`
            : `Çok büyük: beklenen ${(s = n.origin) != null ? s : 'değer'} ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Çok küçük: beklenen ${n.origin} ${a}${n.minimum.toString()} ${c.unit}`
            : `Çok küçük: beklenen ${n.origin} ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Geçersiz metin: "${a.prefix}" ile başlamalı`
            : a.format === 'ends_with'
              ? `Geçersiz metin: "${a.suffix}" ile bitmeli`
              : a.format === 'includes'
                ? `Geçersiz metin: "${a.includes}" içermeli`
                : a.format === 'regex'
                  ? `Geçersiz metin: ${a.pattern} desenine uymalı`
                  : `Geçersiz ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Geçersiz sayı: ${n.divisor} ile tam bölünebilmeli`;
        case 'unrecognized_keys':
          return `Tanınmayan anahtar${n.keys.length > 1 ? 'lar' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `${n.origin} içinde geçersiz anahtar`;
        case 'invalid_union':
        default:
          return 'Geçersiz değer';
        case 'invalid_element':
          return `${n.origin} içinde geçersiz değer`;
      }
    };
  };
  function Lj() {
    return { localeError: Cj() };
  }
  var Rj = () => {
    let e = {
      string: { unit: 'символів', verb: 'матиме' },
      file: { unit: 'байтів', verb: 'матиме' },
      array: { unit: 'елементів', verb: 'матиме' },
      set: { unit: 'елементів', verb: 'матиме' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'вхідні дані',
      email: 'адреса електронної пошти',
      url: 'URL',
      emoji: 'емодзі',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'дата та час ISO',
      date: 'дата ISO',
      time: 'час ISO',
      duration: 'тривалість ISO',
      ipv4: 'адреса IPv4',
      ipv6: 'адреса IPv6',
      cidrv4: 'діапазон IPv4',
      cidrv6: 'діапазон IPv6',
      base64: 'рядок у кодуванні base64',
      base64url: 'рядок у кодуванні base64url',
      json_string: 'рядок JSON',
      e164: 'номер E.164',
      jwt: 'JWT',
      template_literal: 'вхідні дані',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Неправильні вхідні дані: очікується ${n.expected}, отримано ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'число';
              case 'object':
                if (Array.isArray(a)) return 'масив';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Неправильні вхідні дані: очікується ${N(n.values[0])}`
            : `Неправильна опція: очікується одне з ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Занадто велике: очікується, що ${(r = n.origin) != null ? r : 'значення'} ${c.verb} ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'елементів'}`
            : `Занадто велике: очікується, що ${(s = n.origin) != null ? s : 'значення'} буде ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Занадто мале: очікується, що ${n.origin} ${c.verb} ${a}${n.minimum.toString()} ${c.unit}`
            : `Занадто мале: очікується, що ${n.origin} буде ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Неправильний рядок: повинен починатися з "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Неправильний рядок: повинен закінчуватися на "${a.suffix}"`
              : a.format === 'includes'
                ? `Неправильний рядок: повинен містити "${a.includes}"`
                : a.format === 'regex'
                  ? `Неправильний рядок: повинен відповідати шаблону ${a.pattern}`
                  : `Неправильний ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `Неправильне число: повинно бути кратним ${n.divisor}`;
        case 'unrecognized_keys':
          return `Нерозпізнаний ключ${n.keys.length > 1 ? 'і' : ''}: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Неправильний ключ у ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Неправильні вхідні дані';
        case 'invalid_element':
          return `Неправильне значення у ${n.origin}`;
      }
    };
  };
  function Mh() {
    return { localeError: Rj() };
  }
  function Jj() {
    return Mh();
  }
  var Fj = () => {
    let e = {
      string: { unit: 'حروف', verb: 'ہونا' },
      file: { unit: 'بائٹس', verb: 'ہونا' },
      array: { unit: 'آئٹمز', verb: 'ہونا' },
      set: { unit: 'آئٹمز', verb: 'ہونا' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'ان پٹ',
      email: 'ای میل ایڈریس',
      url: 'یو آر ایل',
      emoji: 'ایموجی',
      uuid: 'یو یو آئی ڈی',
      uuidv4: 'یو یو آئی ڈی وی 4',
      uuidv6: 'یو یو آئی ڈی وی 6',
      nanoid: 'نینو آئی ڈی',
      guid: 'جی یو آئی ڈی',
      cuid: 'سی یو آئی ڈی',
      cuid2: 'سی یو آئی ڈی 2',
      ulid: 'یو ایل آئی ڈی',
      xid: 'ایکس آئی ڈی',
      ksuid: 'کے ایس یو آئی ڈی',
      datetime: 'آئی ایس او ڈیٹ ٹائم',
      date: 'آئی ایس او تاریخ',
      time: 'آئی ایس او وقت',
      duration: 'آئی ایس او مدت',
      ipv4: 'آئی پی وی 4 ایڈریس',
      ipv6: 'آئی پی وی 6 ایڈریس',
      cidrv4: 'آئی پی وی 4 رینج',
      cidrv6: 'آئی پی وی 6 رینج',
      base64: 'بیس 64 ان کوڈڈ سٹرنگ',
      base64url: 'بیس 64 یو آر ایل ان کوڈڈ سٹرنگ',
      json_string: 'جے ایس او این سٹرنگ',
      e164: 'ای 164 نمبر',
      jwt: 'جے ڈبلیو ٹی',
      template_literal: 'ان پٹ',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `غلط ان پٹ: ${n.expected} متوقع تھا، ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'نمبر';
              case 'object':
                if (Array.isArray(a)) return 'آرے';
                if (a === null) return 'نل';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)} موصول ہوا`;
        case 'invalid_value':
          return n.values.length === 1
            ? `غلط ان پٹ: ${N(n.values[0])} متوقع تھا`
            : `غلط آپشن: ${z(n.values, '|')} میں سے ایک متوقع تھا`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `بہت بڑا: ${(r = n.origin) != null ? r : 'ویلیو'} کے ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'عناصر'} ہونے متوقع تھے`
            : `بہت بڑا: ${(s = n.origin) != null ? s : 'ویلیو'} کا ${a}${n.maximum.toString()} ہونا متوقع تھا`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `بہت چھوٹا: ${n.origin} کے ${a}${n.minimum.toString()} ${c.unit} ہونے متوقع تھے`
            : `بہت چھوٹا: ${n.origin} کا ${a}${n.minimum.toString()} ہونا متوقع تھا`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `غلط سٹرنگ: "${a.prefix}" سے شروع ہونا چاہیے`
            : a.format === 'ends_with'
              ? `غلط سٹرنگ: "${a.suffix}" پر ختم ہونا چاہیے`
              : a.format === 'includes'
                ? `غلط سٹرنگ: "${a.includes}" شامل ہونا چاہیے`
                : a.format === 'regex'
                  ? `غلط سٹرنگ: پیٹرن ${a.pattern} سے میچ ہونا چاہیے`
                  : `غلط ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `غلط نمبر: ${n.divisor} کا مضاعف ہونا چاہیے`;
        case 'unrecognized_keys':
          return `غیر تسلیم شدہ کی${n.keys.length > 1 ? 'ز' : ''}: ${z(n.keys, '، ')}`;
        case 'invalid_key':
          return `${n.origin} میں غلط کی`;
        case 'invalid_union':
        default:
          return 'غلط ان پٹ';
        case 'invalid_element':
          return `${n.origin} میں غلط ویلیو`;
      }
    };
  };
  function Vj() {
    return { localeError: Fj() };
  }
  var Mj = () => {
    let e = {
      string: { unit: 'ký tự', verb: 'có' },
      file: { unit: 'byte', verb: 'có' },
      array: { unit: 'phần tử', verb: 'có' },
      set: { unit: 'phần tử', verb: 'có' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'đầu vào',
      email: 'địa chỉ email',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ngày giờ ISO',
      date: 'ngày ISO',
      time: 'giờ ISO',
      duration: 'khoảng thời gian ISO',
      ipv4: 'địa chỉ IPv4',
      ipv6: 'địa chỉ IPv6',
      cidrv4: 'dải IPv4',
      cidrv6: 'dải IPv6',
      base64: 'chuỗi mã hóa base64',
      base64url: 'chuỗi mã hóa base64url',
      json_string: 'chuỗi JSON',
      e164: 'số E.164',
      jwt: 'JWT',
      template_literal: 'đầu vào',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `Đầu vào không hợp lệ: mong đợi ${n.expected}, nhận được ${((
            a,
          ) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'số';
              case 'object':
                if (Array.isArray(a)) return 'mảng';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Đầu vào không hợp lệ: mong đợi ${N(n.values[0])}`
            : `Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `Quá lớn: mong đợi ${(r = n.origin) != null ? r : 'giá trị'} ${c.verb} ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : 'phần tử'}`
            : `Quá lớn: mong đợi ${(s = n.origin) != null ? s : 'giá trị'} ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `Quá nhỏ: mong đợi ${n.origin} ${c.verb} ${a}${n.minimum.toString()} ${c.unit}`
            : `Quá nhỏ: mong đợi ${n.origin} ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `Chuỗi không hợp lệ: phải bắt đầu bằng "${a.prefix}"`
            : a.format === 'ends_with'
              ? `Chuỗi không hợp lệ: phải kết thúc bằng "${a.suffix}"`
              : a.format === 'includes'
                ? `Chuỗi không hợp lệ: phải bao gồm "${a.includes}"`
                : a.format === 'regex'
                  ? `Chuỗi không hợp lệ: phải khớp với mẫu ${a.pattern}`
                  : `${(u = i[a.format]) != null ? u : n.format} không hợp lệ`;
        }
        case 'not_multiple_of':
          return `Số không hợp lệ: phải là bội số của ${n.divisor}`;
        case 'unrecognized_keys':
          return `Khóa không được nhận dạng: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Khóa không hợp lệ trong ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Đầu vào không hợp lệ';
        case 'invalid_element':
          return `Giá trị không hợp lệ trong ${n.origin}`;
      }
    };
  };
  function Wj() {
    return { localeError: Mj() };
  }
  var Bj = () => {
    let e = {
      string: { unit: '字符', verb: '包含' },
      file: { unit: '字节', verb: '包含' },
      array: { unit: '项', verb: '包含' },
      set: { unit: '项', verb: '包含' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: '输入',
      email: '电子邮件',
      url: 'URL',
      emoji: '表情符号',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO日期时间',
      date: 'ISO日期',
      time: 'ISO时间',
      duration: 'ISO时长',
      ipv4: 'IPv4地址',
      ipv6: 'IPv6地址',
      cidrv4: 'IPv4网段',
      cidrv6: 'IPv6网段',
      base64: 'base64编码字符串',
      base64url: 'base64url编码字符串',
      json_string: 'JSON字符串',
      e164: 'E.164号码',
      jwt: 'JWT',
      template_literal: '输入',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `无效输入：期望 ${n.expected}，实际接收 ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? '非数字(NaN)' : '数字';
              case 'object':
                if (Array.isArray(a)) return '数组';
                if (a === null) return '空值(null)';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `无效输入：期望 ${N(n.values[0])}`
            : `无效选项：期望以下之一 ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `数值过大：期望 ${(r = n.origin) != null ? r : '值'} ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : '个元素'}`
            : `数值过大：期望 ${(s = n.origin) != null ? s : '值'} ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `数值过小：期望 ${n.origin} ${a}${n.minimum.toString()} ${c.unit}`
            : `数值过小：期望 ${n.origin} ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `无效字符串：必须以 "${a.prefix}" 开头`
            : a.format === 'ends_with'
              ? `无效字符串：必须以 "${a.suffix}" 结尾`
              : a.format === 'includes'
                ? `无效字符串：必须包含 "${a.includes}"`
                : a.format === 'regex'
                  ? `无效字符串：必须满足正则表达式 ${a.pattern}`
                  : `无效${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `无效数字：必须是 ${n.divisor} 的倍数`;
        case 'unrecognized_keys':
          return `出现未知的键(key): ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `${n.origin} 中的键(key)无效`;
        case 'invalid_union':
        default:
          return '无效输入';
        case 'invalid_element':
          return `${n.origin} 中包含无效值(value)`;
      }
    };
  };
  function Gj() {
    return { localeError: Bj() };
  }
  var Kj = () => {
    let e = {
      string: { unit: '字元', verb: '擁有' },
      file: { unit: '位元組', verb: '擁有' },
      array: { unit: '項目', verb: '擁有' },
      set: { unit: '項目', verb: '擁有' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: '輸入',
      email: '郵件地址',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'ISO 日期時間',
      date: 'ISO 日期',
      time: 'ISO 時間',
      duration: 'ISO 期間',
      ipv4: 'IPv4 位址',
      ipv6: 'IPv6 位址',
      cidrv4: 'IPv4 範圍',
      cidrv6: 'IPv6 範圍',
      base64: 'base64 編碼字串',
      base64url: 'base64url 編碼字串',
      json_string: 'JSON 字串',
      e164: 'E.164 數值',
      jwt: 'JWT',
      template_literal: '輸入',
    };
    return (n) => {
      var r, o, s, u;
      switch (n.code) {
        case 'invalid_type':
          return `無效的輸入值：預期為 ${n.expected}，但收到 ${((a) => {
            let c = typeof a;
            switch (c) {
              case 'number':
                return Number.isNaN(a) ? 'NaN' : 'number';
              case 'object':
                if (Array.isArray(a)) return 'array';
                if (a === null) return 'null';
                if (
                  Object.getPrototypeOf(a) !== Object.prototype &&
                  a.constructor
                )
                  return a.constructor.name;
            }
            return c;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `無效的輸入值：預期為 ${N(n.values[0])}`
            : `無效的選項：預期為以下其中之一 ${z(n.values, '|')}`;
        case 'too_big': {
          let a = n.inclusive ? '<=' : '<',
            c = t(n.origin);
          return c
            ? `數值過大：預期 ${(r = n.origin) != null ? r : '值'} 應為 ${a}${n.maximum.toString()} ${(o = c.unit) != null ? o : '個元素'}`
            : `數值過大：預期 ${(s = n.origin) != null ? s : '值'} 應為 ${a}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let a = n.inclusive ? '>=' : '>',
            c = t(n.origin);
          return c
            ? `數值過小：預期 ${n.origin} 應為 ${a}${n.minimum.toString()} ${c.unit}`
            : `數值過小：預期 ${n.origin} 應為 ${a}${n.minimum.toString()}`;
        }
        case 'invalid_format': {
          let a = n;
          return a.format === 'starts_with'
            ? `無效的字串：必須以 "${a.prefix}" 開頭`
            : a.format === 'ends_with'
              ? `無效的字串：必須以 "${a.suffix}" 結尾`
              : a.format === 'includes'
                ? `無效的字串：必須包含 "${a.includes}"`
                : a.format === 'regex'
                  ? `無效的字串：必須符合格式 ${a.pattern}`
                  : `無效的 ${(u = i[a.format]) != null ? u : n.format}`;
        }
        case 'not_multiple_of':
          return `無效的數字：必須為 ${n.divisor} 的倍數`;
        case 'unrecognized_keys':
          return `無法識別的鍵值${n.keys.length > 1 ? '們' : ''}：${z(n.keys, '、')}`;
        case 'invalid_key':
          return `${n.origin} 中有無效的鍵值`;
        case 'invalid_union':
        default:
          return '無效的輸入值';
        case 'invalid_element':
          return `${n.origin} 中有無效的值`;
      }
    };
  };
  function qj() {
    return { localeError: Kj() };
  }
  var Xj = () => {
    let e = {
      string: { unit: 'àmi', verb: 'ní' },
      file: { unit: 'bytes', verb: 'ní' },
      array: { unit: 'nkan', verb: 'ní' },
      set: { unit: 'nkan', verb: 'ní' },
    };
    function t(n) {
      var r;
      return (r = e[n]) != null ? r : null;
    }
    let i = {
      regex: 'ẹ̀rọ ìbáwọlé',
      email: 'àdírẹ́sì ìmẹ́lì',
      url: 'URL',
      emoji: 'emoji',
      uuid: 'UUID',
      uuidv4: 'UUIDv4',
      uuidv6: 'UUIDv6',
      nanoid: 'nanoid',
      guid: 'GUID',
      cuid: 'cuid',
      cuid2: 'cuid2',
      ulid: 'ULID',
      xid: 'XID',
      ksuid: 'KSUID',
      datetime: 'àkókò ISO',
      date: 'ọjọ́ ISO',
      time: 'àkókò ISO',
      duration: 'àkókò tó pé ISO',
      ipv4: 'àdírẹ́sì IPv4',
      ipv6: 'àdírẹ́sì IPv6',
      cidrv4: 'àgbègbè IPv4',
      cidrv6: 'àgbègbè IPv6',
      base64: 'ọ̀rọ̀ tí a kọ́ ní base64',
      base64url: 'ọ̀rọ̀ base64url',
      json_string: 'ọ̀rọ̀ JSON',
      e164: 'nọ́mbà E.164',
      jwt: 'JWT',
      template_literal: 'ẹ̀rọ ìbáwọlé',
    };
    return (n) => {
      var r, o;
      switch (n.code) {
        case 'invalid_type':
          return `Ìbáwọlé aṣìṣe: a ní láti fi ${n.expected}, àmọ̀ a rí ${((
            s,
          ) => {
            let u = typeof s;
            switch (u) {
              case 'number':
                return Number.isNaN(s) ? 'NaN' : 'nọ́mbà';
              case 'object':
                if (Array.isArray(s)) return 'akopọ';
                if (s === null) return 'null';
                if (
                  Object.getPrototypeOf(s) !== Object.prototype &&
                  s.constructor
                )
                  return s.constructor.name;
            }
            return u;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Ìbáwọlé aṣìṣe: a ní láti fi ${N(n.values[0])}`
            : `Àṣàyàn aṣìṣe: yan ọ̀kan lára ${z(n.values, '|')}`;
        case 'too_big': {
          let s = n.inclusive ? '<=' : '<',
            u = t(n.origin);
          return u
            ? `Tó pọ̀ jù: a ní láti jẹ́ pé ${(r = n.origin) != null ? r : 'iye'} ${u.verb} ${s}${n.maximum} ${u.unit}`
            : `Tó pọ̀ jù: a ní láti jẹ́ ${s}${n.maximum}`;
        }
        case 'too_small': {
          let s = n.inclusive ? '>=' : '>',
            u = t(n.origin);
          return u
            ? `Kéré ju: a ní láti jẹ́ pé ${n.origin} ${u.verb} ${s}${n.minimum} ${u.unit}`
            : `Kéré ju: a ní láti jẹ́ ${s}${n.minimum}`;
        }
        case 'invalid_format': {
          let s = n;
          return s.format === 'starts_with'
            ? `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bẹ̀rẹ̀ pẹ̀lú "${s.prefix}"`
            : s.format === 'ends_with'
              ? `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ parí pẹ̀lú "${s.suffix}"`
              : s.format === 'includes'
                ? `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ ní "${s.includes}"`
                : s.format === 'regex'
                  ? `Ọ̀rọ̀ aṣìṣe: gbọ́dọ̀ bá àpẹẹrẹ mu ${s.pattern}`
                  : `Aṣìṣe: ${(o = i[s.format]) != null ? o : n.format}`;
        }
        case 'not_multiple_of':
          return `Nọ́mbà aṣìṣe: gbọ́dọ̀ jẹ́ èyà pípín ti ${n.divisor}`;
        case 'unrecognized_keys':
          return `Bọtìnì àìmọ̀: ${z(n.keys, ', ')}`;
        case 'invalid_key':
          return `Bọtìnì aṣìṣe nínú ${n.origin}`;
        case 'invalid_union':
        default:
          return 'Ìbáwọlé aṣìṣe';
        case 'invalid_element':
          return `Iye aṣìṣe nínú ${n.origin}`;
      }
    };
  };
  function Hj() {
    return { localeError: Xj() };
  }
  var Wh = Symbol('ZodOutput'),
    Bh = Symbol('ZodInput'),
    zl = class {
      constructor() {
        ((this._map = new WeakMap()), (this._idmap = new Map()));
      }
      add(e, ...t) {
        let i = t[0];
        if ((this._map.set(e, i), i && typeof i == 'object' && 'id' in i)) {
          if (this._idmap.has(i.id))
            throw new Error(`ID ${i.id} already exists in the registry`);
          this._idmap.set(i.id, e);
        }
        return this;
      }
      clear() {
        return ((this._map = new WeakMap()), (this._idmap = new Map()), this);
      }
      remove(e) {
        let t = this._map.get(e);
        return (
          t && typeof t == 'object' && 'id' in t && this._idmap.delete(t.id),
          this._map.delete(e),
          this
        );
      }
      get(e) {
        var t;
        let i = e._zod.parent;
        if (i) {
          let n = { ...((t = this.get(i)) != null ? t : {}) };
          delete n.id;
          let r = { ...n, ...this._map.get(e) };
          return Object.keys(r).length ? r : void 0;
        }
        return this._map.get(e);
      }
      has(e) {
        return this._map.has(e);
      }
    };
  function jl() {
    return new zl();
  }
  var mt = jl();
  function Gh(e, t) {
    return new e({ type: 'string', ...U(t) });
  }
  function Kh(e, t) {
    return new e({ type: 'string', coerce: !0, ...U(t) });
  }
  function Ol(e, t) {
    return new e({
      type: 'string',
      format: 'email',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Gi(e, t) {
    return new e({
      type: 'string',
      format: 'guid',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Ul(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Pl(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      version: 'v4',
      ...U(t),
    });
  }
  function Nl(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      version: 'v6',
      ...U(t),
    });
  }
  function Dl(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      version: 'v7',
      ...U(t),
    });
  }
  function no(e, t) {
    return new e({
      type: 'string',
      format: 'url',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Zl(e, t) {
    return new e({
      type: 'string',
      format: 'emoji',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function El(e, t) {
    return new e({
      type: 'string',
      format: 'nanoid',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Tl(e, t) {
    return new e({
      type: 'string',
      format: 'cuid',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Al(e, t) {
    return new e({
      type: 'string',
      format: 'cuid2',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Cl(e, t) {
    return new e({
      type: 'string',
      format: 'ulid',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Ll(e, t) {
    return new e({
      type: 'string',
      format: 'xid',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Rl(e, t) {
    return new e({
      type: 'string',
      format: 'ksuid',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Jl(e, t) {
    return new e({
      type: 'string',
      format: 'ipv4',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Fl(e, t) {
    return new e({
      type: 'string',
      format: 'ipv6',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Vl(e, t) {
    return new e({
      type: 'string',
      format: 'cidrv4',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Ml(e, t) {
    return new e({
      type: 'string',
      format: 'cidrv6',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Wl(e, t) {
    return new e({
      type: 'string',
      format: 'base64',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Bl(e, t) {
    return new e({
      type: 'string',
      format: 'base64url',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Gl(e, t) {
    return new e({
      type: 'string',
      format: 'e164',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  function Kl(e, t) {
    return new e({
      type: 'string',
      format: 'jwt',
      check: 'string_format',
      abort: !1,
      ...U(t),
    });
  }
  var qh = { Any: null, Minute: -1, Second: 0, Millisecond: 3, Microsecond: 6 };
  function Xh(e, t) {
    return new e({
      type: 'string',
      format: 'datetime',
      check: 'string_format',
      offset: !1,
      local: !1,
      precision: null,
      ...U(t),
    });
  }
  function Hh(e, t) {
    return new e({
      type: 'string',
      format: 'date',
      check: 'string_format',
      ...U(t),
    });
  }
  function Yh(e, t) {
    return new e({
      type: 'string',
      format: 'time',
      check: 'string_format',
      precision: null,
      ...U(t),
    });
  }
  function Qh(e, t) {
    return new e({
      type: 'string',
      format: 'duration',
      check: 'string_format',
      ...U(t),
    });
  }
  function eb(e, t) {
    return new e({ type: 'number', checks: [], ...U(t) });
  }
  function tb(e, t) {
    return new e({ type: 'number', coerce: !0, checks: [], ...U(t) });
  }
  function nb(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'safeint',
      ...U(t),
    });
  }
  function rb(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'float32',
      ...U(t),
    });
  }
  function ib(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'float64',
      ...U(t),
    });
  }
  function ob(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'int32',
      ...U(t),
    });
  }
  function ab(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'uint32',
      ...U(t),
    });
  }
  function sb(e, t) {
    return new e({ type: 'boolean', ...U(t) });
  }
  function ub(e, t) {
    return new e({ type: 'boolean', coerce: !0, ...U(t) });
  }
  function cb(e, t) {
    return new e({ type: 'bigint', ...U(t) });
  }
  function lb(e, t) {
    return new e({ type: 'bigint', coerce: !0, ...U(t) });
  }
  function db(e, t) {
    return new e({
      type: 'bigint',
      check: 'bigint_format',
      abort: !1,
      format: 'int64',
      ...U(t),
    });
  }
  function mb(e, t) {
    return new e({
      type: 'bigint',
      check: 'bigint_format',
      abort: !1,
      format: 'uint64',
      ...U(t),
    });
  }
  function pb(e, t) {
    return new e({ type: 'symbol', ...U(t) });
  }
  function fb(e, t) {
    return new e({ type: 'undefined', ...U(t) });
  }
  function vb(e, t) {
    return new e({ type: 'null', ...U(t) });
  }
  function gb(e) {
    return new e({ type: 'any' });
  }
  function hb(e) {
    return new e({ type: 'unknown' });
  }
  function bb(e, t) {
    return new e({ type: 'never', ...U(t) });
  }
  function yb(e, t) {
    return new e({ type: 'void', ...U(t) });
  }
  function $b(e, t) {
    return new e({ type: 'date', ...U(t) });
  }
  function _b(e, t) {
    return new e({ type: 'date', coerce: !0, ...U(t) });
  }
  function kb(e, t) {
    return new e({ type: 'nan', ...U(t) });
  }
  function gt(e, t) {
    return new hl({ check: 'less_than', ...U(t), value: e, inclusive: !1 });
  }
  function Se(e, t) {
    return new hl({ check: 'less_than', ...U(t), value: e, inclusive: !0 });
  }
  function ht(e, t) {
    return new bl({ check: 'greater_than', ...U(t), value: e, inclusive: !1 });
  }
  function pe(e, t) {
    return new bl({ check: 'greater_than', ...U(t), value: e, inclusive: !0 });
  }
  function xb(e) {
    return ht(0, e);
  }
  function wb(e) {
    return gt(0, e);
  }
  function Sb(e) {
    return Se(0, e);
  }
  function Ib(e) {
    return pe(0, e);
  }
  function Kn(e, t) {
    return new dg({ check: 'multiple_of', ...U(t), value: e });
  }
  function ro(e, t) {
    return new fg({ check: 'max_size', ...U(t), maximum: e });
  }
  function qn(e, t) {
    return new vg({ check: 'min_size', ...U(t), minimum: e });
  }
  function ql(e, t) {
    return new gg({ check: 'size_equals', ...U(t), size: e });
  }
  function io(e, t) {
    return new hg({ check: 'max_length', ...U(t), maximum: e });
  }
  function Wt(e, t) {
    return new bg({ check: 'min_length', ...U(t), minimum: e });
  }
  function oo(e, t) {
    return new yg({ check: 'length_equals', ...U(t), length: e });
  }
  function Xl(e, t) {
    return new $g({
      check: 'string_format',
      format: 'regex',
      ...U(t),
      pattern: e,
    });
  }
  function Hl(e) {
    return new _g({ check: 'string_format', format: 'lowercase', ...U(e) });
  }
  function Yl(e) {
    return new kg({ check: 'string_format', format: 'uppercase', ...U(e) });
  }
  function Ql(e, t) {
    return new xg({
      check: 'string_format',
      format: 'includes',
      ...U(t),
      includes: e,
    });
  }
  function ed(e, t) {
    return new wg({
      check: 'string_format',
      format: 'starts_with',
      ...U(t),
      prefix: e,
    });
  }
  function td(e, t) {
    return new Sg({
      check: 'string_format',
      format: 'ends_with',
      ...U(t),
      suffix: e,
    });
  }
  function zb(e, t, i) {
    return new Ig({ check: 'property', property: e, schema: t, ...U(i) });
  }
  function nd(e, t) {
    return new zg({ check: 'mime_type', mime: e, ...U(t) });
  }
  function $t(e) {
    return new jg({ check: 'overwrite', tx: e });
  }
  function rd(e) {
    return $t((t) => t.normalize(e));
  }
  function id() {
    return $t((e) => e.trim());
  }
  function od() {
    return $t((e) => e.toLowerCase());
  }
  function ad() {
    return $t((e) => e.toUpperCase());
  }
  function jb(e, t, i) {
    return new e({ type: 'array', element: t, ...U(i) });
  }
  function Yj(e, t, i) {
    return new e({ type: 'union', options: t, ...U(i) });
  }
  function Qj(e, t, i, n) {
    return new e({ type: 'union', options: i, discriminator: t, ...U(n) });
  }
  function e4(e, t, i) {
    return new e({ type: 'intersection', left: t, right: i });
  }
  function t4(e, t, i, n) {
    let r = i instanceof E;
    return new e({
      type: 'tuple',
      items: t,
      rest: r ? i : null,
      ...U(r ? n : i),
    });
  }
  function n4(e, t, i, n) {
    return new e({ type: 'record', keyType: t, valueType: i, ...U(n) });
  }
  function r4(e, t, i, n) {
    return new e({ type: 'map', keyType: t, valueType: i, ...U(n) });
  }
  function i4(e, t, i) {
    return new e({ type: 'set', valueType: t, ...U(i) });
  }
  function o4(e, t, i) {
    return new e({
      type: 'enum',
      entries: Array.isArray(t) ? Object.fromEntries(t.map((n) => [n, n])) : t,
      ...U(i),
    });
  }
  function a4(e, t, i) {
    return new e({ type: 'enum', entries: t, ...U(i) });
  }
  function s4(e, t, i) {
    return new e({
      type: 'literal',
      values: Array.isArray(t) ? t : [t],
      ...U(i),
    });
  }
  function Ob(e, t) {
    return new e({ type: 'file', ...U(t) });
  }
  function u4(e, t) {
    return new e({ type: 'transform', transform: t });
  }
  function c4(e, t) {
    return new e({ type: 'optional', innerType: t });
  }
  function l4(e, t) {
    return new e({ type: 'nullable', innerType: t });
  }
  function d4(e, t, i) {
    return new e({
      type: 'default',
      innerType: t,
      get defaultValue() {
        return typeof i == 'function' ? i() : yv(i);
      },
    });
  }
  function m4(e, t, i) {
    return new e({ type: 'nonoptional', innerType: t, ...U(i) });
  }
  function p4(e, t) {
    return new e({ type: 'success', innerType: t });
  }
  function f4(e, t, i) {
    return new e({
      type: 'catch',
      innerType: t,
      catchValue: typeof i == 'function' ? i : () => i,
    });
  }
  function v4(e, t, i) {
    return new e({ type: 'pipe', in: t, out: i });
  }
  function g4(e, t) {
    return new e({ type: 'readonly', innerType: t });
  }
  function h4(e, t, i) {
    return new e({ type: 'template_literal', parts: t, ...U(i) });
  }
  function b4(e, t) {
    return new e({ type: 'lazy', getter: t });
  }
  function y4(e, t) {
    return new e({ type: 'promise', innerType: t });
  }
  function Ub(e, t, i) {
    let n = U(i);
    return (
      n.abort != null || (n.abort = !0),
      new e({ type: 'custom', check: 'custom', fn: t, ...n })
    );
  }
  function Pb(e, t, i) {
    return new e({ type: 'custom', check: 'custom', fn: t, ...U(i) });
  }
  function Nb(e) {
    let t = Db(
      (i) => (
        (i.addIssue = (n) => {
          if (typeof n == 'string') i.issues.push(Wi(n, i.value, t._zod.def));
          else {
            let r = n;
            (r.fatal && (r.continue = !1),
              r.code != null || (r.code = 'custom'),
              r.input != null || (r.input = i.value),
              r.inst != null || (r.inst = t),
              r.continue != null || (r.continue = !t._zod.def.abort),
              i.issues.push(Wi(r)));
          }
        }),
        e(i.value, i)
      ),
    );
    return t;
  }
  function Db(e, t) {
    let i = new K({ check: 'custom', ...U(t) });
    return ((i._zod.check = e), i);
  }
  function Zb(e, t) {
    var i, n, r, o, s;
    let u = U(t),
      a =
        (i = u.truthy) != null ? i : ['true', '1', 'yes', 'on', 'y', 'enabled'],
      c =
        (n = u.falsy) != null
          ? n
          : ['false', '0', 'no', 'off', 'n', 'disabled'];
    u.case !== 'sensitive' &&
      ((a = a.map(($) => (typeof $ == 'string' ? $.toLowerCase() : $))),
      (c = c.map(($) => (typeof $ == 'string' ? $.toLowerCase() : $))));
    let m = new Set(a),
      p = new Set(c),
      f = (r = e.Codec) != null ? r : Sl,
      v = (o = e.Boolean) != null ? o : _l,
      b = new f({
        type: 'pipe',
        in: new ((s = e.String) != null ? s : ar)({
          type: 'string',
          error: u.error,
        }),
        out: new v({ type: 'boolean', error: u.error }),
        transform: ($, g) => {
          let k = $;
          return (
            u.case !== 'sensitive' && (k = k.toLowerCase()),
            !!m.has(k) ||
              (!p.has(k) &&
                (g.issues.push({
                  code: 'invalid_value',
                  expected: 'stringbool',
                  values: [...m, ...p],
                  input: g.value,
                  inst: b,
                  continue: !1,
                }),
                {}))
          );
        },
        reverseTransform: ($, g) =>
          $ === !0 ? a[0] || 'true' : c[0] || 'false',
        error: u.error,
      });
    return b;
  }
  function sr(e, t, i, n = {}) {
    let r = U(n),
      o = {
        ...U(n),
        check: 'string_format',
        type: 'string',
        format: t,
        fn: typeof i == 'function' ? i : (s) => i.test(s),
        ...r,
      };
    return (i instanceof RegExp && (o.pattern = i), new e(o));
  }
  var Xc = class {
    constructor(e) {
      var t, i, n, r, o;
      ((this.counter = 0),
        (this.metadataRegistry = (t = e?.metadata) != null ? t : mt),
        (this.target = (i = e?.target) != null ? i : 'draft-2020-12'),
        (this.unrepresentable = (n = e?.unrepresentable) != null ? n : 'throw'),
        (this.override = (r = e?.override) != null ? r : () => {}),
        (this.io = (o = e?.io) != null ? o : 'output'),
        (this.seen = new Map()));
    }
    process(e, t = { path: [], schemaPath: [] }) {
      var i, n, r, o, s;
      let u = e._zod.def,
        a = {
          guid: 'uuid',
          url: 'uri',
          datetime: 'date-time',
          json_string: 'json-string',
          regex: '',
        },
        c = this.seen.get(e);
      if (c)
        return (
          c.count++,
          t.schemaPath.includes(e) && (c.cycle = t.path),
          c.schema
        );
      let m = { schema: {}, count: 1, cycle: void 0, path: t.path };
      this.seen.set(e, m);
      let p = (n = (i = e._zod).toJSONSchema) == null ? void 0 : n.call(i);
      if (p) m.schema = p;
      else {
        let v = { ...t, schemaPath: [...t.schemaPath, e], path: t.path },
          b = e._zod.parent;
        if (b)
          ((m.ref = b), this.process(b, v), (this.seen.get(b).isParent = !0));
        else {
          let $ = m.schema;
          switch (u.type) {
            case 'string': {
              let g = $;
              g.type = 'string';
              let {
                minimum: k,
                maximum: x,
                format: w,
                patterns: S,
                contentEncoding: P,
              } = e._zod.bag;
              if (
                (typeof k == 'number' && (g.minLength = k),
                typeof x == 'number' && (g.maxLength = x),
                w &&
                  ((g.format = (r = a[w]) != null ? r : w),
                  g.format === '' && delete g.format),
                P && (g.contentEncoding = P),
                S && S.size > 0)
              ) {
                let J = [...S];
                J.length === 1
                  ? (g.pattern = J[0].source)
                  : J.length > 1 &&
                    (m.schema.allOf = [
                      ...J.map((H) => ({
                        ...(this.target === 'draft-7' ||
                        this.target === 'draft-4' ||
                        this.target === 'openapi-3.0'
                          ? { type: 'string' }
                          : {}),
                        pattern: H.source,
                      })),
                    ]);
              }
              break;
            }
            case 'number': {
              let g = $,
                {
                  minimum: k,
                  maximum: x,
                  format: w,
                  multipleOf: S,
                  exclusiveMaximum: P,
                  exclusiveMinimum: J,
                } = e._zod.bag;
              (typeof w == 'string' && w.includes('int')
                ? (g.type = 'integer')
                : (g.type = 'number'),
                typeof J == 'number' &&
                  (this.target === 'draft-4' || this.target === 'openapi-3.0'
                    ? ((g.minimum = J), (g.exclusiveMinimum = !0))
                    : (g.exclusiveMinimum = J)),
                typeof k == 'number' &&
                  ((g.minimum = k),
                  typeof J == 'number' &&
                    this.target !== 'draft-4' &&
                    (J >= k ? delete g.minimum : delete g.exclusiveMinimum)),
                typeof P == 'number' &&
                  (this.target === 'draft-4' || this.target === 'openapi-3.0'
                    ? ((g.maximum = P), (g.exclusiveMaximum = !0))
                    : (g.exclusiveMaximum = P)),
                typeof x == 'number' &&
                  ((g.maximum = x),
                  typeof P == 'number' &&
                    this.target !== 'draft-4' &&
                    (P <= x ? delete g.maximum : delete g.exclusiveMaximum)),
                typeof S == 'number' && (g.multipleOf = S));
              break;
            }
            case 'boolean':
              $.type = 'boolean';
              break;
            case 'bigint':
              if (this.unrepresentable === 'throw')
                throw new Error('BigInt cannot be represented in JSON Schema');
              break;
            case 'symbol':
              if (this.unrepresentable === 'throw')
                throw new Error('Symbols cannot be represented in JSON Schema');
              break;
            case 'null':
              this.target === 'openapi-3.0'
                ? (($.type = 'string'), ($.nullable = !0), ($.enum = [null]))
                : ($.type = 'null');
              break;
            case 'any':
            case 'unknown':
              break;
            case 'undefined':
              if (this.unrepresentable === 'throw')
                throw new Error(
                  'Undefined cannot be represented in JSON Schema',
                );
              break;
            case 'void':
              if (this.unrepresentable === 'throw')
                throw new Error('Void cannot be represented in JSON Schema');
              break;
            case 'never':
              $.not = {};
              break;
            case 'date':
              if (this.unrepresentable === 'throw')
                throw new Error('Date cannot be represented in JSON Schema');
              break;
            case 'array': {
              let g = $,
                { minimum: k, maximum: x } = e._zod.bag;
              (typeof k == 'number' && (g.minItems = k),
                typeof x == 'number' && (g.maxItems = x),
                (g.type = 'array'),
                (g.items = this.process(u.element, {
                  ...v,
                  path: [...v.path, 'items'],
                })));
              break;
            }
            case 'object': {
              let g = $;
              ((g.type = 'object'), (g.properties = {}));
              let k = u.shape;
              for (let S in k)
                g.properties[S] = this.process(k[S], {
                  ...v,
                  path: [...v.path, 'properties', S],
                });
              let x = new Set(Object.keys(k)),
                w = new Set(
                  [...x].filter((S) => {
                    let P = u.shape[S]._zod;
                    return this.io === 'input'
                      ? P.optin === void 0
                      : P.optout === void 0;
                  }),
                );
              (w.size > 0 && (g.required = Array.from(w)),
                ((o = u.catchall) == null ? void 0 : o._zod.def.type) ===
                'never'
                  ? (g.additionalProperties = !1)
                  : u.catchall
                    ? u.catchall &&
                      (g.additionalProperties = this.process(u.catchall, {
                        ...v,
                        path: [...v.path, 'additionalProperties'],
                      }))
                    : this.io === 'output' && (g.additionalProperties = !1));
              break;
            }
            case 'union': {
              let g = $,
                k = u.options.map((x, w) =>
                  this.process(x, { ...v, path: [...v.path, 'anyOf', w] }),
                );
              g.anyOf = k;
              break;
            }
            case 'intersection': {
              let g = $,
                k = this.process(u.left, {
                  ...v,
                  path: [...v.path, 'allOf', 0],
                }),
                x = this.process(u.right, {
                  ...v,
                  path: [...v.path, 'allOf', 1],
                }),
                w = (P) => 'allOf' in P && Object.keys(P).length === 1,
                S = [...(w(k) ? k.allOf : [k]), ...(w(x) ? x.allOf : [x])];
              g.allOf = S;
              break;
            }
            case 'tuple': {
              let g = $;
              g.type = 'array';
              let k = this.target === 'draft-2020-12' ? 'prefixItems' : 'items',
                x =
                  this.target === 'draft-2020-12' ||
                  this.target === 'openapi-3.0'
                    ? 'items'
                    : 'additionalItems',
                w = u.items.map((H, ee) =>
                  this.process(H, { ...v, path: [...v.path, k, ee] }),
                ),
                S = u.rest
                  ? this.process(u.rest, {
                      ...v,
                      path: [
                        ...v.path,
                        x,
                        ...(this.target === 'openapi-3.0'
                          ? [u.items.length]
                          : []),
                      ],
                    })
                  : null;
              this.target === 'draft-2020-12'
                ? ((g.prefixItems = w), S && (g.items = S))
                : this.target === 'openapi-3.0'
                  ? ((g.items = { anyOf: w }),
                    S && g.items.anyOf.push(S),
                    (g.minItems = w.length),
                    S || (g.maxItems = w.length))
                  : ((g.items = w), S && (g.additionalItems = S));
              let { minimum: P, maximum: J } = e._zod.bag;
              (typeof P == 'number' && (g.minItems = P),
                typeof J == 'number' && (g.maxItems = J));
              break;
            }
            case 'record': {
              let g = $;
              ((g.type = 'object'),
                (this.target !== 'draft-7' &&
                  this.target !== 'draft-2020-12') ||
                  (g.propertyNames = this.process(u.keyType, {
                    ...v,
                    path: [...v.path, 'propertyNames'],
                  })),
                (g.additionalProperties = this.process(u.valueType, {
                  ...v,
                  path: [...v.path, 'additionalProperties'],
                })));
              break;
            }
            case 'map':
              if (this.unrepresentable === 'throw')
                throw new Error('Map cannot be represented in JSON Schema');
              break;
            case 'set':
              if (this.unrepresentable === 'throw')
                throw new Error('Set cannot be represented in JSON Schema');
              break;
            case 'enum': {
              let g = $,
                k = rl(u.entries);
              (k.every((x) => typeof x == 'number') && (g.type = 'number'),
                k.every((x) => typeof x == 'string') && (g.type = 'string'),
                (g.enum = k));
              break;
            }
            case 'literal': {
              let g = $,
                k = [];
              for (let x of u.values)
                if (x === void 0) {
                  if (this.unrepresentable === 'throw')
                    throw new Error(
                      'Literal `undefined` cannot be represented in JSON Schema',
                    );
                } else if (typeof x == 'bigint') {
                  if (this.unrepresentable === 'throw')
                    throw new Error(
                      'BigInt literals cannot be represented in JSON Schema',
                    );
                  k.push(Number(x));
                } else k.push(x);
              if (k.length !== 0)
                if (k.length === 1) {
                  let x = k[0];
                  ((g.type = x === null ? 'null' : typeof x),
                    this.target === 'draft-4' || this.target === 'openapi-3.0'
                      ? (g.enum = [x])
                      : (g.const = x));
                } else
                  (k.every((x) => typeof x == 'number') && (g.type = 'number'),
                    k.every((x) => typeof x == 'string') && (g.type = 'string'),
                    k.every((x) => typeof x == 'boolean') &&
                      (g.type = 'string'),
                    k.every((x) => x === null) && (g.type = 'null'),
                    (g.enum = k));
              break;
            }
            case 'file': {
              let g = $,
                k = {
                  type: 'string',
                  format: 'binary',
                  contentEncoding: 'binary',
                },
                { minimum: x, maximum: w, mime: S } = e._zod.bag;
              (x !== void 0 && (k.minLength = x),
                w !== void 0 && (k.maxLength = w),
                S
                  ? S.length === 1
                    ? ((k.contentMediaType = S[0]), Object.assign(g, k))
                    : (g.anyOf = S.map((P) => ({ ...k, contentMediaType: P })))
                  : Object.assign(g, k));
              break;
            }
            case 'transform':
              if (this.unrepresentable === 'throw')
                throw new Error(
                  'Transforms cannot be represented in JSON Schema',
                );
              break;
            case 'nullable': {
              let g = this.process(u.innerType, v);
              this.target === 'openapi-3.0'
                ? ((m.ref = u.innerType), ($.nullable = !0))
                : ($.anyOf = [g, { type: 'null' }]);
              break;
            }
            case 'nonoptional':
            case 'promise':
            case 'optional':
              (this.process(u.innerType, v), (m.ref = u.innerType));
              break;
            case 'success':
              $.type = 'boolean';
              break;
            case 'default':
              (this.process(u.innerType, v),
                (m.ref = u.innerType),
                ($.default = JSON.parse(JSON.stringify(u.defaultValue))));
              break;
            case 'prefault':
              (this.process(u.innerType, v),
                (m.ref = u.innerType),
                this.io === 'input' &&
                  ($._prefault = JSON.parse(JSON.stringify(u.defaultValue))));
              break;
            case 'catch': {
              let g;
              (this.process(u.innerType, v), (m.ref = u.innerType));
              try {
                g = u.catchValue(void 0);
              } catch {
                throw new Error(
                  'Dynamic catch values are not supported in JSON Schema',
                );
              }
              $.default = g;
              break;
            }
            case 'nan':
              if (this.unrepresentable === 'throw')
                throw new Error('NaN cannot be represented in JSON Schema');
              break;
            case 'template_literal': {
              let g = $,
                k = e._zod.pattern;
              if (!k) throw new Error('Pattern not found in template literal');
              ((g.type = 'string'), (g.pattern = k.source));
              break;
            }
            case 'pipe': {
              let g =
                this.io === 'input'
                  ? u.in._zod.def.type === 'transform'
                    ? u.out
                    : u.in
                  : u.out;
              (this.process(g, v), (m.ref = g));
              break;
            }
            case 'readonly':
              (this.process(u.innerType, v),
                (m.ref = u.innerType),
                ($.readOnly = !0));
              break;
            case 'lazy': {
              let g = e._zod.innerType;
              (this.process(g, v), (m.ref = g));
              break;
            }
            case 'custom':
              if (this.unrepresentable === 'throw')
                throw new Error(
                  'Custom types cannot be represented in JSON Schema',
                );
              break;
            case 'function':
              if (this.unrepresentable === 'throw')
                throw new Error(
                  'Function types cannot be represented in JSON Schema',
                );
          }
        }
      }
      let f = this.metadataRegistry.get(e);
      return (
        f && Object.assign(m.schema, f),
        this.io === 'input' &&
          ie(e) &&
          (delete m.schema.examples, delete m.schema.default),
        this.io === 'input' &&
          m.schema._prefault &&
          ((s = m.schema).default != null || (s.default = m.schema._prefault)),
        delete m.schema._prefault,
        this.seen.get(e).schema
      );
    }
    emit(e, t) {
      var i, n, r, o, s, u, a, c, m, p;
      let f = {
          cycles: (i = t?.cycles) != null ? i : 'ref',
          reused: (n = t?.reused) != null ? n : 'inline',
          external: (r = t?.external) != null ? r : void 0,
        },
        v = this.seen.get(e);
      if (!v) throw new Error('Unprocessed schema. This is a bug in Zod.');
      let b = (w) => {
          var S, P, J, H, ee;
          let je = this.target === 'draft-2020-12' ? '$defs' : 'definitions';
          if (f.external) {
            let wt =
                (S = f.external.registry.get(w[0])) == null ? void 0 : S.id,
              Yd = (P = f.external.uri) != null ? P : (_$) => _$;
            if (wt) return { ref: Yd(wt) };
            let Io =
              (H = (J = w[1].defId) != null ? J : w[1].schema.id) != null
                ? H
                : 'schema' + this.counter++;
            return (
              (w[1].defId = Io),
              { defId: Io, ref: `${Yd('__shared')}#/${je}/${Io}` }
            );
          }
          if (w[1] === v) return { ref: '#' };
          let So = `#/${je}/`,
            xt =
              (ee = w[1].schema.id) != null ? ee : '__schema' + this.counter++;
          return { defId: xt, ref: So + xt };
        },
        $ = (w) => {
          if (w[1].schema.$ref) return;
          let S = w[1],
            { ref: P, defId: J } = b(w);
          ((S.def = { ...S.schema }), J && (S.defId = J));
          let H = S.schema;
          for (let ee in H) delete H[ee];
          H.$ref = P;
        };
      if (f.cycles === 'throw')
        for (let w of this.seen.entries()) {
          let S = w[1];
          if (S.cycle)
            throw new Error(`Cycle detected: #/${(o = S.cycle) == null ? void 0 : o.join('/')}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
        }
      for (let w of this.seen.entries()) {
        let S = w[1];
        if (e === w[0]) {
          $(w);
          continue;
        }
        if (f.external) {
          let P = (s = f.external.registry.get(w[0])) == null ? void 0 : s.id;
          if (e !== w[0] && P) {
            $(w);
            continue;
          }
        }
        (((u = this.metadataRegistry.get(w[0])) != null && u.id) ||
          S.cycle ||
          (S.count > 1 && f.reused === 'ref')) &&
          $(w);
      }
      let g = (w, S) => {
        var P, J, H;
        let ee = this.seen.get(w),
          je = (P = ee.def) != null ? P : ee.schema,
          So = { ...je };
        if (ee.ref === null) return;
        let xt = ee.ref;
        if (((ee.ref = null), xt)) {
          g(xt, S);
          let wt = this.seen.get(xt).schema;
          !wt.$ref ||
          (S.target !== 'draft-7' &&
            S.target !== 'draft-4' &&
            S.target !== 'openapi-3.0')
            ? (Object.assign(je, wt), Object.assign(je, So))
            : ((je.allOf = (J = je.allOf) != null ? J : []), je.allOf.push(wt));
        }
        ee.isParent ||
          this.override({
            zodSchema: w,
            jsonSchema: je,
            path: (H = ee.path) != null ? H : [],
          });
      };
      for (let w of [...this.seen.entries()].reverse())
        g(w[0], { target: this.target });
      let k = {};
      if (
        (this.target === 'draft-2020-12'
          ? (k.$schema = 'https://json-schema.org/draft/2020-12/schema')
          : this.target === 'draft-7'
            ? (k.$schema = 'http://json-schema.org/draft-07/schema#')
            : this.target === 'draft-4'
              ? (k.$schema = 'http://json-schema.org/draft-04/schema#')
              : this.target === 'openapi-3.0' ||
                console.warn(`Invalid target: ${this.target}`),
        (a = f.external) == null ? void 0 : a.uri)
      ) {
        let w = (c = f.external.registry.get(e)) == null ? void 0 : c.id;
        if (!w) throw new Error('Schema is missing an `id` property');
        k.$id = f.external.uri(w);
      }
      Object.assign(k, v.def);
      let x = (p = (m = f.external) == null ? void 0 : m.defs) != null ? p : {};
      for (let w of this.seen.entries()) {
        let S = w[1];
        S.def && S.defId && (x[S.defId] = S.def);
      }
      f.external ||
        (Object.keys(x).length > 0 &&
          (this.target === 'draft-2020-12'
            ? (k.$defs = x)
            : (k.definitions = x)));
      try {
        return JSON.parse(JSON.stringify(k));
      } catch {
        throw new Error('Error converting schema to JSON.');
      }
    }
  };
  function Eb(e, t) {
    if (e instanceof zl) {
      let n = new Xc(t),
        r = {};
      for (let u of e._idmap.entries()) {
        let [a, c] = u;
        n.process(c);
      }
      let o = {},
        s = { registry: e, uri: t?.uri, defs: r };
      for (let u of e._idmap.entries()) {
        let [a, c] = u;
        o[a] = n.emit(c, { ...t, external: s });
      }
      if (Object.keys(r).length > 0) {
        let u = n.target === 'draft-2020-12' ? '$defs' : 'definitions';
        o.__shared = { [u]: r };
      }
      return { schemas: o };
    }
    let i = new Xc(t);
    return (i.process(e), i.emit(e, t));
  }
  function ie(e, t) {
    let i = t ?? { seen: new Set() };
    if (i.seen.has(e)) return !1;
    i.seen.add(e);
    let n = e._zod.def;
    switch (n.type) {
      case 'string':
      case 'number':
      case 'bigint':
      case 'boolean':
      case 'date':
      case 'symbol':
      case 'undefined':
      case 'null':
      case 'any':
      case 'unknown':
      case 'never':
      case 'void':
      case 'literal':
      case 'enum':
      case 'nan':
      case 'file':
      case 'template_literal':
      case 'custom':
      case 'success':
      case 'catch':
      case 'function':
        return !1;
      case 'array':
        return ie(n.element, i);
      case 'object':
        for (let r in n.shape) if (ie(n.shape[r], i)) return !0;
        return !1;
      case 'union':
        for (let r of n.options) if (ie(r, i)) return !0;
        return !1;
      case 'intersection':
        return ie(n.left, i) || ie(n.right, i);
      case 'tuple':
        for (let r of n.items) if (ie(r, i)) return !0;
        return !(!n.rest || !ie(n.rest, i));
      case 'record':
      case 'map':
        return ie(n.keyType, i) || ie(n.valueType, i);
      case 'set':
        return ie(n.valueType, i);
      case 'promise':
      case 'optional':
      case 'nonoptional':
      case 'nullable':
      case 'readonly':
      case 'default':
      case 'prefault':
        return ie(n.innerType, i);
      case 'lazy':
        return ie(n.getter(), i);
      case 'transform':
        return !0;
      case 'pipe':
        return ie(n.in, i) || ie(n.out, i);
    }
    throw new Error(`Unknown schema type: ${n.type}`);
  }
  var $4 = {},
    Tb = {};
  $e(Tb, {
    ZodISODate: () => ud,
    ZodISODateTime: () => sd,
    ZodISODuration: () => ld,
    ZodISOTime: () => cd,
    date: () => Cb,
    datetime: () => Ab,
    duration: () => Rb,
    time: () => Lb,
  });
  var sd = y('ZodISODateTime', (e, t) => {
    (Fg.init(e, t), G.init(e, t));
  });
  function Ab(e) {
    return Xh(sd, e);
  }
  var ud = y('ZodISODate', (e, t) => {
    (Vg.init(e, t), G.init(e, t));
  });
  function Cb(e) {
    return Hh(ud, e);
  }
  var cd = y('ZodISOTime', (e, t) => {
    (Mg.init(e, t), G.init(e, t));
  });
  function Lb(e) {
    return Yh(cd, e);
  }
  var ld = y('ZodISODuration', (e, t) => {
    (Wg.init(e, t), G.init(e, t));
  });
  function Rb(e) {
    return Qh(ld, e);
  }
  var Jb = (e, t) => {
      (ol.init(e, t),
        (e.name = 'ZodError'),
        Object.defineProperties(e, {
          format: { value: (i) => sl(e, i) },
          flatten: { value: (i) => al(e, i) },
          addIssue: {
            value: (i) => {
              (e.issues.push(i), (e.message = JSON.stringify(e.issues, Vi, 2)));
            },
          },
          addIssues: {
            value: (i) => {
              (e.issues.push(...i),
                (e.message = JSON.stringify(e.issues, Vi, 2)));
            },
          },
          isEmpty: { get: () => e.issues.length === 0 },
        }));
    },
    _4 = y('ZodError', Jb),
    ve = y('ZodError', Jb, { Parent: Error }),
    Fb = Qn(ve),
    Vb = er(ve),
    Mb = tr(ve),
    Wb = nr(ve),
    Bb = ul(ve),
    Gb = cl(ve),
    Kb = ll(ve),
    qb = dl(ve),
    Xb = ml(ve),
    Hb = pl(ve),
    Yb = fl(ve),
    Qb = vl(ve),
    C = y(
      'ZodType',
      (e, t) => (
        E.init(e, t),
        (e.def = t),
        (e.type = t.type),
        Object.defineProperty(e, '_def', { value: t }),
        (e.check = (...i) => {
          var n;
          return e.clone(
            F.mergeDefs(t, {
              checks: [
                ...((n = t.checks) != null ? n : []),
                ...i.map((r) =>
                  typeof r == 'function'
                    ? {
                        _zod: {
                          check: r,
                          def: { check: 'custom' },
                          onattach: [],
                        },
                      }
                    : r,
                ),
              ],
            }),
          );
        }),
        (e.clone = (i, n) => _e(e, i, n)),
        (e.brand = () => e),
        (e.register = (i, n) => (i.add(e, n), e)),
        (e.parse = (i, n) => Fb(e, i, n, { callee: e.parse })),
        (e.safeParse = (i, n) => Mb(e, i, n)),
        (e.parseAsync = async (i, n) => Vb(e, i, n, { callee: e.parseAsync })),
        (e.safeParseAsync = async (i, n) => Wb(e, i, n)),
        (e.spa = e.safeParseAsync),
        (e.encode = (i, n) => Bb(e, i, n)),
        (e.decode = (i, n) => Gb(e, i, n)),
        (e.encodeAsync = async (i, n) => Kb(e, i, n)),
        (e.decodeAsync = async (i, n) => qb(e, i, n)),
        (e.safeEncode = (i, n) => Xb(e, i, n)),
        (e.safeDecode = (i, n) => Hb(e, i, n)),
        (e.safeEncodeAsync = async (i, n) => Yb(e, i, n)),
        (e.safeDecodeAsync = async (i, n) => Qb(e, i, n)),
        (e.refine = (i, n) => e.check(Ly(i, n))),
        (e.superRefine = (i) => e.check(Ry(i))),
        (e.overwrite = (i) => e.check($t(i))),
        (e.optional = () => qi(e)),
        (e.nullable = () => Xi(e)),
        (e.nullish = () => qi(Xi(e))),
        (e.nonoptional = (i) => zy(e, i)),
        (e.array = () => mo(e)),
        (e.or = (i) => Nd([e, i])),
        (e.and = (i) => py(e, i)),
        (e.transform = (i) => Hi(e, Ed(i))),
        (e.default = (i) => wy(e, i)),
        (e.prefault = (i) => Iy(e, i)),
        (e.catch = (i) => Uy(e, i)),
        (e.pipe = (i) => Hi(e, i)),
        (e.readonly = () => Dy(e)),
        (e.describe = (i) => {
          let n = e.clone();
          return (mt.add(n, { description: i }), n);
        }),
        Object.defineProperty(e, 'description', {
          get() {
            var i;
            return (i = mt.get(e)) == null ? void 0 : i.description;
          },
          configurable: !0,
        }),
        (e.meta = (...i) => {
          if (i.length === 0) return mt.get(e);
          let n = e.clone();
          return (mt.add(n, i[0]), n);
        }),
        (e.isOptional = () => e.safeParse(void 0).success),
        (e.isNullable = () => e.safeParse(null).success),
        e
      ),
    ),
    dd = y('_ZodString', (e, t) => {
      var i, n, r;
      (ar.init(e, t), C.init(e, t));
      let o = e._zod.bag;
      ((e.format = (i = o.format) != null ? i : null),
        (e.minLength = (n = o.minimum) != null ? n : null),
        (e.maxLength = (r = o.maximum) != null ? r : null),
        (e.regex = (...s) => e.check(Xl(...s))),
        (e.includes = (...s) => e.check(Ql(...s))),
        (e.startsWith = (...s) => e.check(ed(...s))),
        (e.endsWith = (...s) => e.check(td(...s))),
        (e.min = (...s) => e.check(Wt(...s))),
        (e.max = (...s) => e.check(io(...s))),
        (e.length = (...s) => e.check(oo(...s))),
        (e.nonempty = (...s) => e.check(Wt(1, ...s))),
        (e.lowercase = (s) => e.check(Hl(s))),
        (e.uppercase = (s) => e.check(Yl(s))),
        (e.trim = () => e.check(id())),
        (e.normalize = (...s) => e.check(rd(...s))),
        (e.toLowerCase = () => e.check(od())),
        (e.toUpperCase = () => e.check(ad())));
    }),
    ao = y('ZodString', (e, t) => {
      (ar.init(e, t),
        dd.init(e, t),
        (e.email = (i) => e.check(Ol(md, i))),
        (e.url = (i) => e.check(no(so, i))),
        (e.jwt = (i) => e.check(Kl(zd, i))),
        (e.emoji = (i) => e.check(Zl(pd, i))),
        (e.guid = (i) => e.check(Gi(Ki, i))),
        (e.uuid = (i) => e.check(Ul(Le, i))),
        (e.uuidv4 = (i) => e.check(Pl(Le, i))),
        (e.uuidv6 = (i) => e.check(Nl(Le, i))),
        (e.uuidv7 = (i) => e.check(Dl(Le, i))),
        (e.nanoid = (i) => e.check(El(fd, i))),
        (e.guid = (i) => e.check(Gi(Ki, i))),
        (e.cuid = (i) => e.check(Tl(vd, i))),
        (e.cuid2 = (i) => e.check(Al(gd, i))),
        (e.ulid = (i) => e.check(Cl(hd, i))),
        (e.base64 = (i) => e.check(Wl(wd, i))),
        (e.base64url = (i) => e.check(Bl(Sd, i))),
        (e.xid = (i) => e.check(Ll(bd, i))),
        (e.ksuid = (i) => e.check(Rl(yd, i))),
        (e.ipv4 = (i) => e.check(Jl($d, i))),
        (e.ipv6 = (i) => e.check(Fl(_d, i))),
        (e.cidrv4 = (i) => e.check(Vl(kd, i))),
        (e.cidrv6 = (i) => e.check(Ml(xd, i))),
        (e.e164 = (i) => e.check(Gl(Id, i))),
        (e.datetime = (i) => e.check(Ab(i))),
        (e.date = (i) => e.check(Cb(i))),
        (e.time = (i) => e.check(Lb(i))),
        (e.duration = (i) => e.check(Rb(i))));
    });
  function Hc(e) {
    return Gh(ao, e);
  }
  var G = y('ZodStringFormat', (e, t) => {
      (W.init(e, t), dd.init(e, t));
    }),
    md = y('ZodEmail', (e, t) => {
      (Dg.init(e, t), G.init(e, t));
    });
  function k4(e) {
    return Ol(md, e);
  }
  var Ki = y('ZodGUID', (e, t) => {
    (Pg.init(e, t), G.init(e, t));
  });
  function x4(e) {
    return Gi(Ki, e);
  }
  var Le = y('ZodUUID', (e, t) => {
    (Ng.init(e, t), G.init(e, t));
  });
  function w4(e) {
    return Ul(Le, e);
  }
  function S4(e) {
    return Pl(Le, e);
  }
  function I4(e) {
    return Nl(Le, e);
  }
  function z4(e) {
    return Dl(Le, e);
  }
  var so = y('ZodURL', (e, t) => {
    (Zg.init(e, t), G.init(e, t));
  });
  function j4(e) {
    return no(so, e);
  }
  function O4(e) {
    return no(so, {
      protocol: /^https?$/,
      hostname: yt.domain,
      ...F.normalizeParams(e),
    });
  }
  var pd = y('ZodEmoji', (e, t) => {
    (Eg.init(e, t), G.init(e, t));
  });
  function U4(e) {
    return Zl(pd, e);
  }
  var fd = y('ZodNanoID', (e, t) => {
    (Tg.init(e, t), G.init(e, t));
  });
  function P4(e) {
    return El(fd, e);
  }
  var vd = y('ZodCUID', (e, t) => {
    (Ag.init(e, t), G.init(e, t));
  });
  function N4(e) {
    return Tl(vd, e);
  }
  var gd = y('ZodCUID2', (e, t) => {
    (Cg.init(e, t), G.init(e, t));
  });
  function D4(e) {
    return Al(gd, e);
  }
  var hd = y('ZodULID', (e, t) => {
    (Lg.init(e, t), G.init(e, t));
  });
  function Z4(e) {
    return Cl(hd, e);
  }
  var bd = y('ZodXID', (e, t) => {
    (Rg.init(e, t), G.init(e, t));
  });
  function E4(e) {
    return Ll(bd, e);
  }
  var yd = y('ZodKSUID', (e, t) => {
    (Jg.init(e, t), G.init(e, t));
  });
  function T4(e) {
    return Rl(yd, e);
  }
  var $d = y('ZodIPv4', (e, t) => {
    (Bg.init(e, t), G.init(e, t));
  });
  function A4(e) {
    return Jl($d, e);
  }
  var _d = y('ZodIPv6', (e, t) => {
    (Gg.init(e, t), G.init(e, t));
  });
  function C4(e) {
    return Fl(_d, e);
  }
  var kd = y('ZodCIDRv4', (e, t) => {
    (Kg.init(e, t), G.init(e, t));
  });
  function L4(e) {
    return Vl(kd, e);
  }
  var xd = y('ZodCIDRv6', (e, t) => {
    (qg.init(e, t), G.init(e, t));
  });
  function R4(e) {
    return Ml(xd, e);
  }
  var wd = y('ZodBase64', (e, t) => {
    (Xg.init(e, t), G.init(e, t));
  });
  function J4(e) {
    return Wl(wd, e);
  }
  var Sd = y('ZodBase64URL', (e, t) => {
    (Yg.init(e, t), G.init(e, t));
  });
  function F4(e) {
    return Bl(Sd, e);
  }
  var Id = y('ZodE164', (e, t) => {
    (Qg.init(e, t), G.init(e, t));
  });
  function V4(e) {
    return Gl(Id, e);
  }
  var zd = y('ZodJWT', (e, t) => {
    (th.init(e, t), G.init(e, t));
  });
  function M4(e) {
    return Kl(zd, e);
  }
  var ur = y('ZodCustomStringFormat', (e, t) => {
    (nh.init(e, t), G.init(e, t));
  });
  function W4(e, t, i = {}) {
    return sr(ur, e, t, i);
  }
  function B4(e) {
    return sr(ur, 'hostname', yt.hostname, e);
  }
  function G4(e) {
    return sr(ur, 'hex', yt.hex, e);
  }
  function K4(e, t) {
    var i;
    let n = `${e}_${(i = t?.enc) != null ? i : 'hex'}`,
      r = yt[n];
    if (!r) throw new Error(`Unrecognized hash format: ${n}`);
    return sr(ur, n, r, t);
  }
  var uo = y('ZodNumber', (e, t) => {
    var i, n, r, o, s, u, a, c, m;
    ($l.init(e, t),
      C.init(e, t),
      (e.gt = (f, v) => e.check(ht(f, v))),
      (e.gte = (f, v) => e.check(pe(f, v))),
      (e.min = (f, v) => e.check(pe(f, v))),
      (e.lt = (f, v) => e.check(gt(f, v))),
      (e.lte = (f, v) => e.check(Se(f, v))),
      (e.max = (f, v) => e.check(Se(f, v))),
      (e.int = (f) => e.check(Yc(f))),
      (e.safe = (f) => e.check(Yc(f))),
      (e.positive = (f) => e.check(ht(0, f))),
      (e.nonnegative = (f) => e.check(pe(0, f))),
      (e.negative = (f) => e.check(gt(0, f))),
      (e.nonpositive = (f) => e.check(Se(0, f))),
      (e.multipleOf = (f, v) => e.check(Kn(f, v))),
      (e.step = (f, v) => e.check(Kn(f, v))),
      (e.finite = () => e));
    let p = e._zod.bag;
    ((e.minValue =
      (r = Math.max(
        (i = p.minimum) != null ? i : Number.NEGATIVE_INFINITY,
        (n = p.exclusiveMinimum) != null ? n : Number.NEGATIVE_INFINITY,
      )) != null
        ? r
        : null),
      (e.maxValue =
        (u = Math.min(
          (o = p.maximum) != null ? o : Number.POSITIVE_INFINITY,
          (s = p.exclusiveMaximum) != null ? s : Number.POSITIVE_INFINITY,
        )) != null
          ? u
          : null),
      (e.isInt =
        ((a = p.format) != null ? a : '').includes('int') ||
        Number.isSafeInteger((c = p.multipleOf) != null ? c : 0.5)),
      (e.isFinite = !0),
      (e.format = (m = p.format) != null ? m : null));
  });
  function ey(e) {
    return eb(uo, e);
  }
  var Gt = y('ZodNumberFormat', (e, t) => {
    (rh.init(e, t), uo.init(e, t));
  });
  function Yc(e) {
    return nb(Gt, e);
  }
  function q4(e) {
    return rb(Gt, e);
  }
  function X4(e) {
    return ib(Gt, e);
  }
  function H4(e) {
    return ob(Gt, e);
  }
  function Y4(e) {
    return ab(Gt, e);
  }
  var co = y('ZodBoolean', (e, t) => {
    (_l.init(e, t), C.init(e, t));
  });
  function ty(e) {
    return sb(co, e);
  }
  var lo = y('ZodBigInt', (e, t) => {
    var i, n, r;
    (kl.init(e, t),
      C.init(e, t),
      (e.gte = (s, u) => e.check(pe(s, u))),
      (e.min = (s, u) => e.check(pe(s, u))),
      (e.gt = (s, u) => e.check(ht(s, u))),
      (e.gte = (s, u) => e.check(pe(s, u))),
      (e.min = (s, u) => e.check(pe(s, u))),
      (e.lt = (s, u) => e.check(gt(s, u))),
      (e.lte = (s, u) => e.check(Se(s, u))),
      (e.max = (s, u) => e.check(Se(s, u))),
      (e.positive = (s) => e.check(ht(BigInt(0), s))),
      (e.negative = (s) => e.check(gt(BigInt(0), s))),
      (e.nonpositive = (s) => e.check(Se(BigInt(0), s))),
      (e.nonnegative = (s) => e.check(pe(BigInt(0), s))),
      (e.multipleOf = (s, u) => e.check(Kn(s, u))));
    let o = e._zod.bag;
    ((e.minValue = (i = o.minimum) != null ? i : null),
      (e.maxValue = (n = o.maximum) != null ? n : null),
      (e.format = (r = o.format) != null ? r : null));
  });
  function Q4(e) {
    return cb(lo, e);
  }
  var jd = y('ZodBigIntFormat', (e, t) => {
    (ih.init(e, t), lo.init(e, t));
  });
  function e6(e) {
    return db(jd, e);
  }
  function t6(e) {
    return mb(jd, e);
  }
  var ny = y('ZodSymbol', (e, t) => {
    (oh.init(e, t), C.init(e, t));
  });
  function n6(e) {
    return pb(ny, e);
  }
  var ry = y('ZodUndefined', (e, t) => {
    (ah.init(e, t), C.init(e, t));
  });
  function r6(e) {
    return fb(ry, e);
  }
  var iy = y('ZodNull', (e, t) => {
    (sh.init(e, t), C.init(e, t));
  });
  function oy(e) {
    return vb(iy, e);
  }
  var ay = y('ZodAny', (e, t) => {
    (uh.init(e, t), C.init(e, t));
  });
  function i6() {
    return gb(ay);
  }
  var sy = y('ZodUnknown', (e, t) => {
    (ch.init(e, t), C.init(e, t));
  });
  function Bt() {
    return hb(sy);
  }
  var uy = y('ZodNever', (e, t) => {
    (lh.init(e, t), C.init(e, t));
  });
  function Od(e) {
    return bb(uy, e);
  }
  var cy = y('ZodVoid', (e, t) => {
    (dh.init(e, t), C.init(e, t));
  });
  function o6(e) {
    return yb(cy, e);
  }
  var Ud = y('ZodDate', (e, t) => {
    (mh.init(e, t),
      C.init(e, t),
      (e.min = (n, r) => e.check(pe(n, r))),
      (e.max = (n, r) => e.check(Se(n, r))));
    let i = e._zod.bag;
    ((e.minDate = i.minimum ? new Date(i.minimum) : null),
      (e.maxDate = i.maximum ? new Date(i.maximum) : null));
  });
  function a6(e) {
    return $b(Ud, e);
  }
  var ly = y('ZodArray', (e, t) => {
    (ph.init(e, t),
      C.init(e, t),
      (e.element = t.element),
      (e.min = (i, n) => e.check(Wt(i, n))),
      (e.nonempty = (i) => e.check(Wt(1, i))),
      (e.max = (i, n) => e.check(io(i, n))),
      (e.length = (i, n) => e.check(oo(i, n))),
      (e.unwrap = () => e.element));
  });
  function mo(e, t) {
    return jb(ly, e, t);
  }
  function s6(e) {
    let t = e._zod.def.shape;
    return Zd(Object.keys(t));
  }
  var po = y('ZodObject', (e, t) => {
    (hh.init(e, t),
      C.init(e, t),
      F.defineLazy(e, 'shape', () => t.shape),
      (e.keyof = () => Zd(Object.keys(e._zod.def.shape))),
      (e.catchall = (i) => e.clone({ ...e._zod.def, catchall: i })),
      (e.passthrough = () => e.clone({ ...e._zod.def, catchall: Bt() })),
      (e.loose = () => e.clone({ ...e._zod.def, catchall: Bt() })),
      (e.strict = () => e.clone({ ...e._zod.def, catchall: Od() })),
      (e.strip = () => e.clone({ ...e._zod.def, catchall: void 0 })),
      (e.extend = (i) => F.extend(e, i)),
      (e.safeExtend = (i) => F.safeExtend(e, i)),
      (e.merge = (i) => F.merge(e, i)),
      (e.pick = (i) => F.pick(e, i)),
      (e.omit = (i) => F.omit(e, i)),
      (e.partial = (...i) => F.partial(Td, e, i[0])),
      (e.required = (...i) => F.required(Ad, e, i[0])));
  });
  function u6(e, t) {
    let i = { type: 'object', shape: e ?? {}, ...F.normalizeParams(t) };
    return new po(i);
  }
  function c6(e, t) {
    return new po({
      type: 'object',
      shape: e,
      catchall: Od(),
      ...F.normalizeParams(t),
    });
  }
  function l6(e, t) {
    return new po({
      type: 'object',
      shape: e,
      catchall: Bt(),
      ...F.normalizeParams(t),
    });
  }
  var Pd = y('ZodUnion', (e, t) => {
    (xl.init(e, t), C.init(e, t), (e.options = t.options));
  });
  function Nd(e, t) {
    return new Pd({ type: 'union', options: e, ...F.normalizeParams(t) });
  }
  var dy = y('ZodDiscriminatedUnion', (e, t) => {
    (Pd.init(e, t), bh.init(e, t));
  });
  function d6(e, t, i) {
    return new dy({
      type: 'union',
      options: t,
      discriminator: e,
      ...F.normalizeParams(i),
    });
  }
  var my = y('ZodIntersection', (e, t) => {
    (yh.init(e, t), C.init(e, t));
  });
  function py(e, t) {
    return new my({ type: 'intersection', left: e, right: t });
  }
  var fy = y('ZodTuple', (e, t) => {
    (wl.init(e, t),
      C.init(e, t),
      (e.rest = (i) => e.clone({ ...e._zod.def, rest: i })));
  });
  function vy(e, t, i) {
    let n = t instanceof E,
      r = n ? i : t;
    return new fy({
      type: 'tuple',
      items: e,
      rest: n ? t : null,
      ...F.normalizeParams(r),
    });
  }
  var Dd = y('ZodRecord', (e, t) => {
    ($h.init(e, t),
      C.init(e, t),
      (e.keyType = t.keyType),
      (e.valueType = t.valueType));
  });
  function gy(e, t, i) {
    return new Dd({
      type: 'record',
      keyType: e,
      valueType: t,
      ...F.normalizeParams(i),
    });
  }
  function m6(e, t, i) {
    let n = _e(e);
    return (
      (n._zod.values = void 0),
      new Dd({
        type: 'record',
        keyType: n,
        valueType: t,
        ...F.normalizeParams(i),
      })
    );
  }
  var hy = y('ZodMap', (e, t) => {
    (_h.init(e, t),
      C.init(e, t),
      (e.keyType = t.keyType),
      (e.valueType = t.valueType));
  });
  function p6(e, t, i) {
    return new hy({
      type: 'map',
      keyType: e,
      valueType: t,
      ...F.normalizeParams(i),
    });
  }
  var by = y('ZodSet', (e, t) => {
    (kh.init(e, t),
      C.init(e, t),
      (e.min = (...i) => e.check(qn(...i))),
      (e.nonempty = (i) => e.check(qn(1, i))),
      (e.max = (...i) => e.check(ro(...i))),
      (e.size = (...i) => e.check(ql(...i))));
  });
  function f6(e, t) {
    return new by({ type: 'set', valueType: e, ...F.normalizeParams(t) });
  }
  var Xn = y('ZodEnum', (e, t) => {
    (xh.init(e, t),
      C.init(e, t),
      (e.enum = t.entries),
      (e.options = Object.values(t.entries)));
    let i = new Set(Object.keys(t.entries));
    ((e.extract = (n, r) => {
      let o = {};
      for (let s of n) {
        if (!i.has(s)) throw new Error(`Key ${s} not found in enum`);
        o[s] = t.entries[s];
      }
      return new Xn({ ...t, checks: [], ...F.normalizeParams(r), entries: o });
    }),
      (e.exclude = (n, r) => {
        let o = { ...t.entries };
        for (let s of n) {
          if (!i.has(s)) throw new Error(`Key ${s} not found in enum`);
          delete o[s];
        }
        return new Xn({
          ...t,
          checks: [],
          ...F.normalizeParams(r),
          entries: o,
        });
      }));
  });
  function Zd(e, t) {
    let i = Array.isArray(e) ? Object.fromEntries(e.map((n) => [n, n])) : e;
    return new Xn({ type: 'enum', entries: i, ...F.normalizeParams(t) });
  }
  function v6(e, t) {
    return new Xn({ type: 'enum', entries: e, ...F.normalizeParams(t) });
  }
  var yy = y('ZodLiteral', (e, t) => {
    (wh.init(e, t),
      C.init(e, t),
      (e.values = new Set(t.values)),
      Object.defineProperty(e, 'value', {
        get() {
          if (t.values.length > 1)
            throw new Error(
              'This schema contains multiple valid literal values. Use `.values` instead.',
            );
          return t.values[0];
        },
      }));
  });
  function g6(e, t) {
    return new yy({
      type: 'literal',
      values: Array.isArray(e) ? e : [e],
      ...F.normalizeParams(t),
    });
  }
  var $y = y('ZodFile', (e, t) => {
    (Sh.init(e, t),
      C.init(e, t),
      (e.min = (i, n) => e.check(qn(i, n))),
      (e.max = (i, n) => e.check(ro(i, n))),
      (e.mime = (i, n) => e.check(nd(Array.isArray(i) ? i : [i], n))));
  });
  function h6(e) {
    return Ob($y, e);
  }
  var _y = y('ZodTransform', (e, t) => {
    (Ih.init(e, t),
      C.init(e, t),
      (e._zod.parse = (i, n) => {
        if (n.direction === 'backward') throw new Yi(e.constructor.name);
        i.addIssue = (o) => {
          if (typeof o == 'string') i.issues.push(F.issue(o, i.value, t));
          else {
            let s = o;
            (s.fatal && (s.continue = !1),
              s.code != null || (s.code = 'custom'),
              s.input != null || (s.input = i.value),
              s.inst != null || (s.inst = e),
              i.issues.push(F.issue(s)));
          }
        };
        let r = t.transform(i.value, i);
        return r instanceof Promise
          ? r.then((o) => ((i.value = o), i))
          : ((i.value = r), i);
      }));
  });
  function Ed(e) {
    return new _y({ type: 'transform', transform: e });
  }
  var Td = y('ZodOptional', (e, t) => {
    (zh.init(e, t), C.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function qi(e) {
    return new Td({ type: 'optional', innerType: e });
  }
  var ky = y('ZodNullable', (e, t) => {
    (jh.init(e, t), C.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function Xi(e) {
    return new ky({ type: 'nullable', innerType: e });
  }
  function b6(e) {
    return qi(Xi(e));
  }
  var xy = y('ZodDefault', (e, t) => {
    (Oh.init(e, t),
      C.init(e, t),
      (e.unwrap = () => e._zod.def.innerType),
      (e.removeDefault = e.unwrap));
  });
  function wy(e, t) {
    return new xy({
      type: 'default',
      innerType: e,
      get defaultValue() {
        return typeof t == 'function' ? t() : F.shallowClone(t);
      },
    });
  }
  var Sy = y('ZodPrefault', (e, t) => {
    (Uh.init(e, t), C.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function Iy(e, t) {
    return new Sy({
      type: 'prefault',
      innerType: e,
      get defaultValue() {
        return typeof t == 'function' ? t() : F.shallowClone(t);
      },
    });
  }
  var Ad = y('ZodNonOptional', (e, t) => {
    (Ph.init(e, t), C.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function zy(e, t) {
    return new Ad({
      type: 'nonoptional',
      innerType: e,
      ...F.normalizeParams(t),
    });
  }
  var jy = y('ZodSuccess', (e, t) => {
    (Nh.init(e, t), C.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function y6(e) {
    return new jy({ type: 'success', innerType: e });
  }
  var Oy = y('ZodCatch', (e, t) => {
    (Dh.init(e, t),
      C.init(e, t),
      (e.unwrap = () => e._zod.def.innerType),
      (e.removeCatch = e.unwrap));
  });
  function Uy(e, t) {
    return new Oy({
      type: 'catch',
      innerType: e,
      catchValue: typeof t == 'function' ? t : () => t,
    });
  }
  var Py = y('ZodNaN', (e, t) => {
    (Zh.init(e, t), C.init(e, t));
  });
  function $6(e) {
    return kb(Py, e);
  }
  var Cd = y('ZodPipe', (e, t) => {
    (Eh.init(e, t), C.init(e, t), (e.in = t.in), (e.out = t.out));
  });
  function Hi(e, t) {
    return new Cd({ type: 'pipe', in: e, out: t });
  }
  var Ld = y('ZodCodec', (e, t) => {
    (Cd.init(e, t), Sl.init(e, t));
  });
  function _6(e, t, i) {
    return new Ld({
      type: 'pipe',
      in: e,
      out: t,
      transform: i.decode,
      reverseTransform: i.encode,
    });
  }
  var Ny = y('ZodReadonly', (e, t) => {
    (Th.init(e, t), C.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function Dy(e) {
    return new Ny({ type: 'readonly', innerType: e });
  }
  var Zy = y('ZodTemplateLiteral', (e, t) => {
    (Ah.init(e, t), C.init(e, t));
  });
  function k6(e, t) {
    return new Zy({
      type: 'template_literal',
      parts: e,
      ...F.normalizeParams(t),
    });
  }
  var Ey = y('ZodLazy', (e, t) => {
    (Rh.init(e, t), C.init(e, t), (e.unwrap = () => e._zod.def.getter()));
  });
  function Ty(e) {
    return new Ey({ type: 'lazy', getter: e });
  }
  var Ay = y('ZodPromise', (e, t) => {
    (Lh.init(e, t), C.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function x6(e) {
    return new Ay({ type: 'promise', innerType: e });
  }
  var Cy = y('ZodFunction', (e, t) => {
    (Ch.init(e, t), C.init(e, t));
  });
  function dv(e) {
    var t, i;
    return new Cy({
      type: 'function',
      input: Array.isArray(e?.input)
        ? vy(e?.input)
        : (t = e?.input) != null
          ? t
          : mo(Bt()),
      output: (i = e?.output) != null ? i : Bt(),
    });
  }
  var fo = y('ZodCustom', (e, t) => {
    (Jh.init(e, t), C.init(e, t));
  });
  function w6(e) {
    let t = new K({ check: 'custom' });
    return ((t._zod.check = e), t);
  }
  function S6(e, t) {
    return Ub(fo, e ?? (() => !0), t);
  }
  function Ly(e, t = {}) {
    return Pb(fo, e, t);
  }
  function Ry(e) {
    return Nb(e);
  }
  function I6(e, t = { error: `Input not instance of ${e.name}` }) {
    let i = new fo({
      type: 'custom',
      check: 'custom',
      fn: (n) => n instanceof e,
      abort: !0,
      ...F.normalizeParams(t),
    });
    return ((i._zod.bag.Class = e), i);
  }
  var z6 = (...e) => Zb({ Codec: Ld, Boolean: co, String: ao }, ...e);
  function j6(e) {
    let t = Ty(() => Nd([Hc(e), ey(), ty(), oy(), mo(t), gy(Hc(), t)]));
    return t;
  }
  function O6(e, t) {
    return Hi(Ed(e), t);
  }
  var Qc,
    U6 = {
      invalid_type: 'invalid_type',
      too_big: 'too_big',
      too_small: 'too_small',
      invalid_format: 'invalid_format',
      not_multiple_of: 'not_multiple_of',
      unrecognized_keys: 'unrecognized_keys',
      invalid_union: 'invalid_union',
      invalid_key: 'invalid_key',
      invalid_element: 'invalid_element',
      invalid_value: 'invalid_value',
      custom: 'custom',
    };
  function P6(e) {
    ae({ customError: e });
  }
  function N6() {
    return ae().customError;
  }
  Qc || (Qc = {});
  var Jy = {};
  function D6(e) {
    return Kh(ao, e);
  }
  function Z6(e) {
    return tb(uo, e);
  }
  function E6(e) {
    return ub(co, e);
  }
  function T6(e) {
    return lb(lo, e);
  }
  function A6(e) {
    return _b(Ud, e);
  }
  ($e(Jy, {
    bigint: () => T6,
    boolean: () => E6,
    date: () => A6,
    number: () => Z6,
    string: () => D6,
  }),
    ae(Fh()));
  var C6 = Object.defineProperty,
    _t = (e, t) => {
      for (var i in t) C6(e, i, { get: t[i], enumerable: !0 });
    };
  function T(e, t, i = 'draft-7') {
    return l.toJSONSchema(e, { target: i });
  }
  var pt = l.string(),
    L6 = l.number(),
    Hn = (l.boolean(), l.string().min(1)),
    el = l.number().int().positive(),
    tl = l.number().int().nonnegative(),
    Fy = l.number().describe('Tagging version number');
  l.union([l.string(), l.number(), l.boolean()]).optional();
  _t(
    {},
    {
      ErrorHandlerSchema: () => kt,
      HandlerSchema: () => By,
      LogHandlerSchema: () => Kt,
      StorageSchema: () => Wy,
      StorageTypeSchema: () => My,
      errorHandlerJsonSchema: () => F6,
      handlerJsonSchema: () => M6,
      logHandlerJsonSchema: () => V6,
      storageJsonSchema: () => J6,
      storageTypeJsonSchema: () => R6,
    },
  );
  var Vy,
    My = l
      .enum(['local', 'session', 'cookie'])
      .describe('Storage mechanism: local, session, or cookie'),
    Wy = l
      .object({
        Local: l.literal('local'),
        Session: l.literal('session'),
        Cookie: l.literal('cookie'),
      })
      .describe('Storage type constants for type-safe references'),
    kt = l.any().describe('Error handler function: (error, state?) => void'),
    Kt = l.any().describe('Log handler function: (message, verbose?) => void'),
    By = l
      .object({
        Error: kt.describe('Error handler function'),
        Log: Kt.describe('Log handler function'),
      })
      .describe('Handler interface with error and log functions'),
    R6 = T(My),
    J6 = T(Wy),
    F6 = T(kt),
    V6 = T(Kt),
    M6 = T(By);
  (l
    .object({
      onError: kt
        .optional()
        .describe('Error handler function: (error, state?) => void'),
      onLog: Kt.optional().describe(
        'Log handler function: (message, verbose?) => void',
      ),
    })
    .partial(),
    l
      .object({
        verbose: l
          .boolean()
          .describe('Enable verbose logging for debugging')
          .optional(),
      })
      .partial(),
    l
      .object({
        queue: l
          .boolean()
          .describe('Whether to queue events when consent is not granted')
          .optional(),
      })
      .partial(),
    l.object({}).partial(),
    l
      .object({
        init: l
          .boolean()
          .describe('Whether to initialize immediately')
          .optional(),
        loadScript: l
          .boolean()
          .describe('Whether to load external script (for web destinations)')
          .optional(),
      })
      .partial(),
    l
      .object({
        disabled: l.boolean().describe('Set to true to disable').optional(),
      })
      .partial(),
    l
      .object({
        primary: l
          .boolean()
          .describe('Mark as primary (only one can be primary)')
          .optional(),
      })
      .partial(),
    l
      .object({
        settings: l
          .any()
          .optional()
          .describe('Implementation-specific configuration'),
      })
      .partial(),
    l
      .object({
        env: l
          .any()
          .optional()
          .describe('Environment dependencies (platform-specific)'),
      })
      .partial(),
    l
      .object({
        type: l.string().optional().describe('Instance type identifier'),
        config: l.unknown().describe('Instance configuration'),
      })
      .partial(),
    l
      .object({
        collector: l.unknown().describe('Collector instance (runtime object)'),
        config: l.unknown().describe('Configuration'),
        env: l.unknown().describe('Environment dependencies'),
      })
      .partial(),
    l
      .object({
        batch: l
          .number()
          .optional()
          .describe('Batch size: bundle N events for batch processing'),
        batched: l
          .unknown()
          .optional()
          .describe('Batch of events to be processed'),
      })
      .partial(),
    l
      .object({
        ignore: l
          .boolean()
          .describe('Set to true to skip processing')
          .optional(),
        condition: l
          .string()
          .optional()
          .describe('Condition function: return true to process'),
      })
      .partial(),
    l
      .object({
        sources: l
          .record(l.string(), l.unknown())
          .describe('Map of source instances'),
      })
      .partial(),
    l
      .object({
        destinations: l
          .record(l.string(), l.unknown())
          .describe('Map of destination instances'),
      })
      .partial());
  _t(
    {},
    {
      ConsentSchema: () => Re,
      DeepPartialEventSchema: () => W6,
      EntitiesSchema: () => qy,
      EntitySchema: () => ho,
      EventSchema: () => ze,
      OrderedPropertiesSchema: () => go,
      PartialEventSchema: () => Xy,
      PropertiesSchema: () => oe,
      PropertySchema: () => vo,
      PropertyTypeSchema: () => nl,
      SourceSchema: () => Ky,
      SourceTypeSchema: () => Rd,
      UserSchema: () => cr,
      VersionSchema: () => Gy,
      consentJsonSchema: () => Q6,
      entityJsonSchema: () => H6,
      eventJsonSchema: () => B6,
      orderedPropertiesJsonSchema: () => X6,
      partialEventJsonSchema: () => G6,
      propertiesJsonSchema: () => q6,
      sourceTypeJsonSchema: () => Y6,
      userJsonSchema: () => K6,
    },
  );
  var nl = l.lazy(() =>
      l.union([l.boolean(), l.string(), l.number(), l.record(l.string(), vo)]),
    ),
    vo = l.lazy(() => l.union([nl, l.array(nl)])),
    oe = l
      .record(l.string(), vo.optional())
      .describe('Flexible property collection with optional values'),
    go = l
      .record(l.string(), l.tuple([vo, l.number()]).optional())
      .describe(
        'Ordered properties with [value, order] tuples for priority control',
      ),
    Rd = l
      .union([l.enum(['web', 'server', 'app', 'other']), l.string()])
      .describe('Source type: web, server, app, other, or custom'),
    Re = l
      .record(l.string(), l.boolean())
      .describe('Consent requirement mapping (group name → state)'),
    cr = oe
      .and(
        l.object({
          id: l.string().optional().describe('User identifier'),
          device: l.string().optional().describe('Device identifier'),
          session: l.string().optional().describe('Session identifier'),
          hash: l.string().optional().describe('Hashed identifier'),
          address: l.string().optional().describe('User address'),
          email: l.string().email().optional().describe('User email address'),
          phone: l.string().optional().describe('User phone number'),
          userAgent: l
            .string()
            .optional()
            .describe('Browser user agent string'),
          browser: l.string().optional().describe('Browser name'),
          browserVersion: l.string().optional().describe('Browser version'),
          deviceType: l
            .string()
            .optional()
            .describe('Device type (mobile, desktop, tablet)'),
          os: l.string().optional().describe('Operating system'),
          osVersion: l.string().optional().describe('Operating system version'),
          screenSize: l.string().optional().describe('Screen dimensions'),
          language: l.string().optional().describe('User language'),
          country: l.string().optional().describe('User country'),
          region: l.string().optional().describe('User region/state'),
          city: l.string().optional().describe('User city'),
          zip: l.string().optional().describe('User postal code'),
          timezone: l.string().optional().describe('User timezone'),
          ip: l.string().optional().describe('User IP address'),
          internal: l
            .boolean()
            .optional()
            .describe('Internal user flag (employee, test user)'),
        }),
      )
      .describe('User identification and properties'),
    Gy = oe
      .and(
        l.object({
          source: pt.describe('Walker implementation version (e.g., "2.0.0")'),
          tagging: Fy,
        }),
      )
      .describe('Walker version information'),
    Ky = oe
      .and(
        l.object({
          type: Rd.describe('Source type identifier'),
          id: pt.describe('Source identifier (typically URL on web)'),
          previous_id: pt.describe(
            'Previous source identifier (typically referrer on web)',
          ),
        }),
      )
      .describe('Event source information'),
    ho = l
      .lazy(() =>
        l.object({
          entity: l.string().describe('Entity name'),
          data: oe.describe('Entity-specific properties'),
          nested: l.array(ho).describe('Nested child entities'),
          context: go.describe('Entity context data'),
        }),
      )
      .describe('Nested entity structure with recursive nesting support'),
    qy = l.array(ho).describe('Array of nested entities'),
    ze = l
      .object({
        name: l
          .string()
          .describe(
            'Event name in "entity action" format (e.g., "page view", "product add")',
          ),
        data: oe.describe('Event-specific properties'),
        context: go.describe('Ordered context properties with priorities'),
        globals: oe.describe('Global properties shared across events'),
        custom: oe.describe('Custom implementation-specific properties'),
        user: cr.describe('User identification and attributes'),
        nested: qy.describe('Related nested entities'),
        consent: Re.describe('Consent states at event time'),
        id: Hn.describe('Unique event identifier (timestamp-based)'),
        trigger: pt.describe('Event trigger identifier'),
        entity: pt.describe('Parsed entity from event name'),
        action: pt.describe('Parsed action from event name'),
        timestamp: el.describe('Unix timestamp in milliseconds since epoch'),
        timing: L6.describe('Event processing timing information'),
        group: pt.describe('Event grouping identifier'),
        count: tl.describe('Event count in session'),
        version: Gy.describe('Walker version information'),
        source: Ky.describe('Event source information'),
      })
      .describe('Complete walkerOS event structure'),
    Xy = ze
      .partial()
      .describe('Partial event structure with all fields optional'),
    W6 = ze
      .partial()
      .describe('Partial event structure with all top-level fields optional'),
    B6 = T(ze),
    G6 = T(Xy),
    K6 = T(cr),
    q6 = T(oe),
    X6 = T(go),
    H6 = T(ho),
    Y6 = T(Rd),
    Q6 = T(Re);
  _t(
    {},
    {
      ConfigSchema: () => $o,
      LoopSchema: () => Jd,
      MapSchema: () => Vd,
      PolicySchema: () => qt,
      ResultSchema: () => eO,
      RuleSchema: () => Ye,
      RulesSchema: () => yo,
      SetSchema: () => Fd,
      ValueConfigSchema: () => Hy,
      ValueSchema: () => ye,
      ValuesSchema: () => bo,
      configJsonSchema: () => cO,
      loopJsonSchema: () => rO,
      mapJsonSchema: () => oO,
      policyJsonSchema: () => aO,
      ruleJsonSchema: () => sO,
      rulesJsonSchema: () => uO,
      setJsonSchema: () => iO,
      valueConfigJsonSchema: () => nO,
      valueJsonSchema: () => tO,
    },
  );
  var ye = l.lazy(() =>
      l.union([
        l.string().describe('String value or property path (e.g., "data.id")'),
        l.number().describe('Numeric value'),
        l.boolean().describe('Boolean value'),
        l.lazy(() => Vy),
        l.array(ye).describe('Array of values'),
      ]),
    ),
    bo = l.array(ye).describe('Array of transformation values'),
    Jd = l.lazy(() =>
      l
        .tuple([ye, ye])
        .describe(
          'Loop transformation: [source, transform] tuple for array processing',
        ),
    ),
    Fd = l.lazy(() =>
      l.array(ye).describe('Set: Array of values for selection or combination'),
    ),
    Vd = l.lazy(() =>
      l
        .record(l.string(), ye)
        .describe('Map: Object mapping keys to transformation values'),
    ),
    Hy = (Vy = l
      .object({
        key: l
          .string()
          .optional()
          .describe(
            'Property path to extract from event (e.g., "data.id", "user.email")',
          ),
        value: l
          .union([l.string(), l.number(), l.boolean()])
          .optional()
          .describe('Static primitive value'),
        fn: l
          .string()
          .optional()
          .describe('Custom transformation function as string (serialized)'),
        map: Vd.optional().describe(
          'Object mapping: transform event data to structured output',
        ),
        loop: Jd.optional().describe(
          'Loop transformation: [source, transform] for array processing',
        ),
        set: Fd.optional().describe(
          'Set of values: combine or select from multiple values',
        ),
        consent: Re.optional().describe(
          'Required consent states to include this value',
        ),
        condition: l
          .string()
          .optional()
          .describe(
            'Condition function as string: return true to include value',
          ),
        validate: l
          .string()
          .optional()
          .describe(
            'Validation function as string: return true if value is valid',
          ),
      })
      .refine((e) => Object.keys(e).length > 0, {
        message: 'ValueConfig must have at least one property',
      })
      .describe('Value transformation configuration with multiple strategies')),
    qt = l
      .record(l.string(), ye)
      .describe('Policy rules for event pre-processing (key → value mapping)'),
    Ye = l
      .object({
        batch: l
          .number()
          .optional()
          .describe('Batch size: bundle N events for batch processing'),
        condition: l
          .string()
          .optional()
          .describe(
            'Condition function as string: return true to process event',
          ),
        consent: Re.optional().describe(
          'Required consent states to process this event',
        ),
        settings: l
          .any()
          .optional()
          .describe('Destination-specific settings for this event mapping'),
        data: l
          .union([ye, bo])
          .optional()
          .describe('Data transformation rules for event'),
        ignore: l
          .boolean()
          .optional()
          .describe('Set to true to skip processing this event'),
        name: l
          .string()
          .optional()
          .describe(
            'Custom event name override (e.g., "view_item" for "product view")',
          ),
        policy: qt
          .optional()
          .describe(
            'Event-level policy overrides (applied after config-level policy)',
          ),
      })
      .describe('Mapping rule for specific entity-action combination'),
    yo = l
      .record(
        l.string(),
        l.record(l.string(), l.union([Ye, l.array(Ye)])).optional(),
      )
      .describe(
        'Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support',
      ),
    $o = l
      .object({
        consent: Re.optional().describe(
          'Required consent states to process any events',
        ),
        data: l
          .union([ye, bo])
          .optional()
          .describe('Global data transformation applied to all events'),
        mapping: yo.optional().describe('Entity-action specific mapping rules'),
        policy: qt
          .optional()
          .describe('Pre-processing policy rules applied before mapping'),
      })
      .describe('Shared mapping configuration for sources and destinations'),
    eO = l
      .object({
        eventMapping: Ye.optional().describe('Resolved mapping rule for event'),
        mappingKey: l
          .string()
          .optional()
          .describe('Mapping key used (e.g., "product.view")'),
      })
      .describe('Mapping resolution result'),
    tO = T(ye),
    nO = T(Hy),
    rO = T(Jd),
    iO = T(Fd),
    oO = T(Vd),
    aO = T(qt),
    sO = T(Ye),
    uO = T(yo),
    cO = T($o);
  _t(
    {},
    {
      BatchSchema: () => Qy,
      ConfigSchema: () => lr,
      ContextSchema: () => Wd,
      DLQSchema: () => hO,
      DataSchema: () => pO,
      DestinationPolicySchema: () => lO,
      DestinationsSchema: () => vO,
      InitDestinationsSchema: () => fO,
      InitSchema: () => e$,
      InstanceSchema: () => dr,
      PartialConfigSchema: () => Md,
      PushBatchContextSchema: () => dO,
      PushContextSchema: () => Bd,
      PushEventSchema: () => Yy,
      PushEventsSchema: () => mO,
      PushResultSchema: () => gO,
      RefSchema: () => Ji,
      ResultSchema: () => t$,
      batchJsonSchema: () => kO,
      configJsonSchema: () => bO,
      contextJsonSchema: () => $O,
      instanceJsonSchema: () => xO,
      partialConfigJsonSchema: () => yO,
      pushContextJsonSchema: () => _O,
      resultJsonSchema: () => wO,
    },
  );
  var lr = l
      .object({
        consent: Re.optional().describe(
          'Required consent states to send events to this destination',
        ),
        settings: l
          .any()
          .describe('Implementation-specific configuration')
          .optional(),
        data: l
          .union([ye, bo])
          .optional()
          .describe(
            'Global data transformation applied to all events for this destination',
          ),
        env: l
          .any()
          .describe('Environment dependencies (platform-specific)')
          .optional(),
        id: Hn.describe(
          'Destination instance identifier (defaults to destination key)',
        ).optional(),
        init: l
          .boolean()
          .describe('Whether to initialize immediately')
          .optional(),
        loadScript: l
          .boolean()
          .describe('Whether to load external script (for web destinations)')
          .optional(),
        mapping: yo
          .optional()
          .describe(
            'Entity-action specific mapping rules for this destination',
          ),
        policy: qt
          .optional()
          .describe('Pre-processing policy rules applied before event mapping'),
        queue: l
          .boolean()
          .describe('Whether to queue events when consent is not granted')
          .optional(),
        verbose: l
          .boolean()
          .describe('Enable verbose logging for debugging')
          .optional(),
        onError: kt.optional(),
        onLog: Kt.optional(),
      })
      .describe('Destination configuration'),
    Md = lr
      .partial()
      .describe('Partial destination configuration with all fields optional'),
    lO = qt.describe('Destination policy rules for event pre-processing'),
    Wd = l
      .object({
        collector: l.unknown().describe('Collector instance (runtime object)'),
        config: lr.describe('Destination configuration'),
        data: l
          .union([l.unknown(), l.array(l.unknown())])
          .optional()
          .describe('Transformed event data'),
        env: l.unknown().describe('Environment dependencies'),
      })
      .describe('Destination context for init and push functions'),
    Bd = Wd.extend({
      mapping: Ye.optional().describe(
        'Resolved mapping rule for this specific event',
      ),
    }).describe('Push context with event-specific mapping'),
    dO = Bd.describe('Batch push context with event-specific mapping'),
    Yy = l
      .object({
        event: ze.describe('The event to process'),
        mapping: Ye.optional().describe('Mapping rule for this event'),
      })
      .describe('Event with optional mapping for batch processing'),
    mO = l.array(Yy).describe('Array of events with mappings'),
    Qy = l
      .object({
        key: l
          .string()
          .describe('Batch key (usually mapping key like "product.view")'),
        events: l.array(ze).describe('Array of events in batch'),
        data: l
          .array(l.union([l.unknown(), l.array(l.unknown())]).optional())
          .describe('Transformed data for each event'),
        mapping: Ye.optional().describe('Shared mapping rule for batch'),
      })
      .describe('Batch of events grouped by mapping key'),
    pO = l
      .union([l.unknown(), l.array(l.unknown())])
      .optional()
      .describe('Transformed event data (Property, undefined, or array)'),
    dr = l
      .object({
        config: lr.describe('Destination configuration'),
        queue: l
          .array(ze)
          .optional()
          .describe('Queued events awaiting consent'),
        dlq: l
          .array(l.tuple([ze, l.unknown()]))
          .optional()
          .describe('Dead letter queue (failed events with errors)'),
        type: l.string().optional().describe('Destination type identifier'),
        env: l.unknown().optional().describe('Environment dependencies'),
        init: l.unknown().optional().describe('Initialization function'),
        push: l.unknown().describe('Push function for single events'),
        pushBatch: l.unknown().optional().describe('Batch push function'),
        on: l.unknown().optional().describe('Event lifecycle hook function'),
      })
      .describe('Destination instance (runtime object with functions)'),
    e$ = l
      .object({
        code: dr.describe('Destination instance with implementation'),
        config: Md.optional().describe('Partial configuration overrides'),
        env: l.unknown().optional().describe('Partial environment overrides'),
      })
      .describe('Destination initialization configuration'),
    fO = l
      .record(l.string(), e$)
      .describe('Map of destination IDs to initialization configurations'),
    vO = l
      .record(l.string(), dr)
      .describe('Map of destination IDs to runtime instances'),
    Ji = l
      .object({
        id: l.string().describe('Destination ID'),
        destination: dr.describe('Destination instance'),
      })
      .describe('Destination reference (ID + instance)'),
    gO = l
      .object({
        queue: l
          .array(ze)
          .optional()
          .describe('Events queued (awaiting consent)'),
        error: l.unknown().optional().describe('Error if push failed'),
      })
      .describe('Push operation result'),
    t$ = l
      .object({
        successful: l
          .array(Ji)
          .describe('Destinations that processed successfully'),
        queued: l.array(Ji).describe('Destinations that queued events'),
        failed: l.array(Ji).describe('Destinations that failed to process'),
      })
      .describe('Overall destination processing result'),
    hO = l
      .array(l.tuple([ze, l.unknown()]))
      .describe('Dead letter queue: [(event, error), ...]'),
    bO = T(lr),
    yO = T(Md),
    $O = T(Wd),
    _O = T(Bd),
    kO = T(Qy),
    xO = T(dr),
    wO = T(t$);
  _t(
    {},
    {
      CommandTypeSchema: () => n$,
      ConfigSchema: () => _o,
      DestinationsSchema: () => a$,
      InitConfigSchema: () => r$,
      InstanceSchema: () => s$,
      PushContextSchema: () => i$,
      SessionDataSchema: () => Gd,
      SourcesSchema: () => o$,
      commandTypeJsonSchema: () => SO,
      configJsonSchema: () => IO,
      initConfigJsonSchema: () => jO,
      instanceJsonSchema: () => UO,
      pushContextJsonSchema: () => OO,
      sessionDataJsonSchema: () => zO,
    },
  );
  var n$ = l
      .union([
        l.enum([
          'action',
          'config',
          'consent',
          'context',
          'destination',
          'elb',
          'globals',
          'hook',
          'init',
          'link',
          'run',
          'user',
          'walker',
        ]),
        l.string(),
      ])
      .describe(
        'Collector command type: standard commands or custom string for extensions',
      ),
    _o = l
      .object({
        run: l
          .boolean()
          .describe('Whether to run collector automatically on initialization')
          .optional(),
        tagging: Fy,
        globalsStatic: oe.describe(
          'Static global properties that persist across collector runs',
        ),
        sessionStatic: l
          .record(l.string(), l.unknown())
          .describe('Static session data that persists across collector runs'),
        verbose: l.boolean().describe('Enable verbose logging for debugging'),
        onError: kt.optional(),
        onLog: Kt.optional(),
      })
      .describe('Core collector configuration'),
    Gd = oe
      .and(
        l.object({
          isStart: l.boolean().describe('Whether this is a new session start'),
          storage: l.boolean().describe('Whether storage is available'),
          id: Hn.describe('Session identifier').optional(),
          start: el.describe('Session start timestamp').optional(),
          marketing: l
            .literal(!0)
            .optional()
            .describe('Marketing attribution flag'),
          updated: el.describe('Last update timestamp').optional(),
          isNew: l
            .boolean()
            .describe('Whether this is a new session')
            .optional(),
          device: Hn.describe('Device identifier').optional(),
          count: tl.describe('Event count in session').optional(),
          runs: tl.describe('Number of runs').optional(),
        }),
      )
      .describe('Session state and tracking data'),
    r$ = _o
      .partial()
      .extend({
        consent: Re.optional().describe('Initial consent state'),
        user: cr.optional().describe('Initial user data'),
        globals: oe.optional().describe('Initial global properties'),
        sources: l.unknown().optional().describe('Source configurations'),
        destinations: l
          .unknown()
          .optional()
          .describe('Destination configurations'),
        custom: oe
          .optional()
          .describe('Initial custom implementation-specific properties'),
      })
      .describe('Collector initialization configuration with initial state'),
    i$ = l
      .object({
        mapping: $o.optional().describe('Source-level mapping configuration'),
      })
      .describe('Push context with optional source mapping'),
    o$ = l
      .record(l.string(), l.unknown())
      .describe('Map of source IDs to source instances'),
    a$ = l
      .record(l.string(), l.unknown())
      .describe('Map of destination IDs to destination instances'),
    s$ = l
      .object({
        push: l.unknown().describe('Push function for processing events'),
        command: l.unknown().describe('Command function for walker commands'),
        allowed: l.boolean().describe('Whether event processing is allowed'),
        config: _o.describe('Current collector configuration'),
        consent: Re.describe('Current consent state'),
        count: l.number().describe('Event count (increments with each event)'),
        custom: oe.describe('Custom implementation-specific properties'),
        sources: o$.describe('Registered source instances'),
        destinations: a$.describe('Registered destination instances'),
        globals: oe.describe('Current global properties'),
        group: l.string().describe('Event grouping identifier'),
        hooks: l.unknown().describe('Lifecycle hook functions'),
        on: l.unknown().describe('Event lifecycle configuration'),
        queue: l.array(ze).describe('Queued events awaiting processing'),
        round: l
          .number()
          .describe('Collector run count (increments with each run)'),
        session: l.union([Gd]).describe('Current session state'),
        timing: l.number().describe('Event processing timing information'),
        user: cr.describe('Current user data'),
        version: l.string().describe('Walker implementation version'),
      })
      .describe('Collector instance with state and methods'),
    SO = T(n$),
    IO = T(_o),
    zO = T(Gd),
    jO = T(r$),
    OO = T(i$),
    UO = T(s$);
  _t(
    {},
    {
      BaseEnvSchema: () => ko,
      ConfigSchema: () => xo,
      InitSchema: () => c$,
      InitSourceSchema: () => qd,
      InitSourcesSchema: () => l$,
      InstanceSchema: () => u$,
      PartialConfigSchema: () => Kd,
      baseEnvJsonSchema: () => PO,
      configJsonSchema: () => NO,
      initSourceJsonSchema: () => EO,
      initSourcesJsonSchema: () => TO,
      instanceJsonSchema: () => ZO,
      partialConfigJsonSchema: () => DO,
    },
  );
  var ko = l
      .object({
        push: l.unknown().describe('Collector push function'),
        command: l.unknown().describe('Collector command function'),
        sources: l
          .unknown()
          .optional()
          .describe('Map of registered source instances'),
        elb: l
          .unknown()
          .describe('Public API function (alias for collector.push)'),
      })
      .catchall(l.unknown())
      .describe(
        'Base environment for dependency injection - platform-specific sources extend this',
      ),
    xo = $o
      .extend({
        settings: l
          .any()
          .describe('Implementation-specific configuration')
          .optional(),
        env: ko
          .optional()
          .describe('Environment dependencies (platform-specific)'),
        id: Hn.describe(
          'Source identifier (defaults to source key)',
        ).optional(),
        onError: kt.optional(),
        disabled: l.boolean().describe('Set to true to disable').optional(),
        primary: l
          .boolean()
          .describe('Mark as primary (only one can be primary)')
          .optional(),
      })
      .describe('Source configuration with mapping and environment'),
    Kd = xo
      .partial()
      .describe('Partial source configuration with all fields optional'),
    u$ = l
      .object({
        type: l
          .string()
          .describe('Source type identifier (e.g., "browser", "dataLayer")'),
        config: xo.describe('Current source configuration'),
        push: l
          .any()
          .describe(
            'Push function - THE HANDLER (flexible signature for platform compatibility)',
          ),
        destroy: l
          .any()
          .optional()
          .describe('Cleanup function called when source is removed'),
        on: l
          .unknown()
          .optional()
          .describe('Lifecycle hook function for event types'),
      })
      .describe('Source instance with push handler and lifecycle methods'),
    c$ = l
      .any()
      .describe(
        'Source initialization function: (config, env) => Instance | Promise<Instance>',
      ),
    qd = l
      .object({
        code: c$.describe('Source initialization function'),
        config: Kd.optional().describe('Partial configuration overrides'),
        env: ko.partial().optional().describe('Partial environment overrides'),
        primary: l
          .boolean()
          .optional()
          .describe('Mark as primary source (only one can be primary)'),
      })
      .describe('Source initialization configuration'),
    l$ = l
      .record(l.string(), qd)
      .describe('Map of source IDs to initialization configurations'),
    PO = T(ko),
    NO = T(xo),
    DO = T(Kd),
    ZO = T(u$),
    EO = T(qd),
    TO = T(l$);
  _t(
    {},
    {
      ConfigSchema: () => mr,
      DestinationReferenceSchema: () => Hd,
      PrimitiveSchema: () => d$,
      SetupSchema: () => wo,
      SourceReferenceSchema: () => Xd,
      configJsonSchema: () => FO,
      destinationReferenceJsonSchema: () => MO,
      parseConfig: () => LO,
      parseSetup: () => AO,
      safeParseConfig: () => RO,
      safeParseSetup: () => CO,
      setupJsonSchema: () => JO,
      sourceReferenceJsonSchema: () => VO,
    },
  );
  var d$ = l
      .union([l.string(), l.number(), l.boolean()])
      .describe('Primitive value: string, number, or boolean'),
    Xd = l
      .object({
        package: l
          .string()
          .min(1, 'Package name cannot be empty')
          .describe(
            'Package specifier with optional version (e.g., "@walkeros/web-source-browser@2.0.0")',
          ),
        config: l
          .unknown()
          .optional()
          .describe('Source-specific configuration object'),
        env: l
          .unknown()
          .optional()
          .describe('Source environment configuration'),
        primary: l
          .boolean()
          .optional()
          .describe(
            'Mark as primary source (provides main elb). Only one source should be primary.',
          ),
      })
      .describe('Source package reference with configuration'),
    Hd = l
      .object({
        package: l
          .string()
          .min(1, 'Package name cannot be empty')
          .describe(
            'Package specifier with optional version (e.g., "@walkeros/web-destination-gtag@2.0.0")',
          ),
        config: l
          .unknown()
          .optional()
          .describe('Destination-specific configuration object'),
        env: l
          .unknown()
          .optional()
          .describe('Destination environment configuration'),
      })
      .describe('Destination package reference with configuration'),
    mr = l
      .object({
        platform: l
          .enum(['web', 'server'], {
            error: 'Platform must be "web" or "server"',
          })
          .describe(
            'Target platform: "web" for browser-based tracking, "server" for Node.js server-side collection',
          ),
        sources: l
          .record(l.string(), Xd)
          .optional()
          .describe(
            'Source configurations (data capture) keyed by unique identifier',
          ),
        destinations: l
          .record(l.string(), Hd)
          .optional()
          .describe(
            'Destination configurations (data output) keyed by unique identifier',
          ),
        collector: l
          .unknown()
          .optional()
          .describe(
            'Collector configuration for event processing (uses Collector.InitConfig)',
          ),
        env: l
          .record(l.string(), l.string())
          .optional()
          .describe(
            'Environment-specific variables (override root-level variables)',
          ),
      })
      .passthrough()
      .describe('Single environment configuration for one deployment target'),
    wo = l
      .object({
        version: l
          .literal(1, { error: 'Only version 1 is currently supported' })
          .describe(
            'Configuration schema version (currently only 1 is supported)',
          ),
        $schema: l
          .string()
          .url('Schema URL must be a valid URL')
          .optional()
          .describe(
            'JSON Schema reference for IDE validation (e.g., "https://walkeros.io/schema/flow/v1.json")',
          ),
        variables: l
          .record(l.string(), d$)
          .optional()
          .describe(
            'Shared variables for interpolation across all environments (use ${VAR_NAME:default} syntax)',
          ),
        definitions: l
          .record(l.string(), l.unknown())
          .optional()
          .describe(
            'Reusable configuration definitions (reference with JSON Schema $ref syntax)',
          ),
        environments: l
          .record(l.string(), mr)
          .refine((e) => Object.keys(e).length > 0, {
            message: 'At least one environment is required',
          })
          .describe(
            'Named environment configurations (e.g., web_prod, server_stage)',
          ),
      })
      .describe(
        'Complete multi-environment walkerOS configuration (walkeros.config.json)',
      );
  function AO(e) {
    return wo.parse(e);
  }
  function CO(e) {
    return wo.safeParse(e);
  }
  function LO(e) {
    return mr.parse(e);
  }
  function RO(e) {
    return mr.safeParse(e);
  }
  var JO = l.toJSONSchema(wo, { target: 'draft-7' }),
    FO = T(mr),
    VO = T(Xd),
    MO = T(Hd);
  function m$(e) {
    return l.toJSONSchema(e, { target: 'draft-7' });
  }
  var WO = { merge: !0, shallow: !0, extend: !0 };
  function p$(e, t = {}, i = {}) {
    i = { ...WO, ...i };
    let n = Object.entries(t).reduce((r, [o, s]) => {
      let u = e[o];
      return (
        i.merge && Array.isArray(u) && Array.isArray(s)
          ? (r[o] = s.reduce((a, c) => (a.includes(c) ? a : [...a, c]), [...u]))
          : (i.extend || o in e) && (r[o] = s),
        r
      );
    }, {});
    return i.shallow ? { ...e, ...n } : (Object.assign(e, n), e);
  }
  function BO(e = 'entity action', t = {}) {
    let i = t.timestamp || new Date().setHours(0, 13, 37, 0),
      n = {
        data: {
          id: 'ers',
          name: 'Everyday Ruck Snack',
          color: 'black',
          size: 'l',
          price: 420,
        },
      },
      r = { data: { id: 'cc', name: 'Cool Cap', size: 'one size', price: 42 } };
    return (function (o = {}) {
      var s;
      let u = o.timestamp || new Date().setHours(0, 13, 37, 0),
        a = o.group || 'gr0up',
        c = o.count || 1,
        m = p$(
          {
            name: 'entity action',
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
                entity: 'child',
                data: { is: 'subordinated' },
                nested: [],
                context: { element: ['child', 0] },
              },
            ],
            consent: { functional: !0 },
            id: `${u}-${a}-${c}`,
            trigger: 'test',
            entity: 'entity',
            action: 'action',
            timestamp: u,
            timing: 3.14,
            group: a,
            count: c,
            version: { source: '0.3.1', tagging: 1 },
            source: {
              type: 'web',
              id: 'https://localhost:80',
              previous_id: 'http://remotehost:9001',
            },
          },
          o,
          { merge: !1 },
        );
      if (o.name) {
        let [p, f] = (s = o.name.split(' ')) != null ? s : [];
        p && f && ((m.entity = p), (m.action = f));
      }
      return m;
    })({
      ...{
        'cart view': {
          data: { currency: 'EUR', value: 2 * n.data.price },
          context: { shopping: ['cart', 0] },
          globals: { pagegroup: 'shop' },
          nested: [
            {
              entity: 'product',
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
              entity: 'product',
              ...n,
              context: { shopping: ['checkout', 0] },
              nested: [],
            },
            {
              entity: 'product',
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
              entity: 'product',
              ...n,
              context: { shopping: ['complete', 0] },
              nested: [],
            },
            {
              entity: 'product',
              ...r,
              context: { shopping: ['complete', 0] },
              nested: [],
            },
            {
              entity: 'gift',
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
            start: i,
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
      name: e,
    });
  }
  function mv(e, t, i) {
    return function (...n) {
      try {
        return e(...n);
      } catch (r) {
        return t ? t(r) : void 0;
      } finally {
        i?.();
      }
    };
  }
  function Wc(e) {
    return e === void 0 ||
      (function (t, i) {
        return typeof t == typeof i;
      })(e, '')
      ? e
      : JSON.stringify(e);
  }
  function pv(e = {}) {
    return p$({ 'Content-Type': 'application/json; charset=utf-8' }, e);
  }
  function GO(e, t, i = { transport: 'fetch' }) {
    switch (i.transport || 'fetch') {
      case 'beacon':
        return (function (n, r) {
          let o = Wc(r),
            s = navigator.sendBeacon(n, o);
          return { ok: s, error: s ? void 0 : 'Failed to send beacon' };
        })(e, t);
      case 'xhr':
        return (function (n, r, o = {}) {
          let s = pv(o.headers),
            u = o.method || 'POST',
            a = Wc(r);
          return mv(
            () => {
              let c = new XMLHttpRequest();
              c.open(u, n, !1);
              for (let p in s) c.setRequestHeader(p, s[p]);
              c.send(a);
              let m = c.status >= 200 && c.status < 300;
              return {
                ok: m,
                data: mv(JSON.parse, () => c.response)(c.response),
                error: m ? void 0 : `${c.status} ${c.statusText}`,
              };
            },
            (c) => ({ ok: !1, error: c.message }),
          )();
        })(e, t, i);
      default:
        return (async function (n, r, o = {}) {
          let s = pv(o.headers),
            u = Wc(r);
          return (function (a, c, m) {
            return async function (...p) {
              try {
                return await a(...p);
              } catch (f) {
                return c ? await c(f) : void 0;
              } finally {
                await m?.();
              }
            };
          })(
            async () => {
              let a = await fetch(n, {
                  method: o.method || 'POST',
                  headers: s,
                  keepalive: !0,
                  credentials: o.credentials || 'same-origin',
                  mode: o.noCors ? 'no-cors' : 'cors',
                  body: u,
                }),
                c = o.noCors ? '' : await a.text();
              return { ok: a.ok, data: c, error: a.ok ? void 0 : a.statusText };
            },
            (a) => ({ ok: !1, error: a.message }),
          )();
        })(e, t, i);
    }
  }
  var KO = {};
  $e(KO, { env: () => f$, events: () => v$, mapping: () => g$ });
  var f$ = {};
  $e(f$, { init: () => qO, push: () => XO, simulation: () => HO });
  var qO = { sendWeb: void 0 },
    XO = { sendWeb: Object.assign(() => {}, {}) },
    HO = ['call:sendWeb'],
    v$ = {};
  function YO() {
    let e = BO('entity action');
    return JSON.stringify(e.data);
  }
  $e(v$, { entity_action: () => YO });
  var g$ = {};
  $e(g$, { config: () => QO, entity_action: () => h$ });
  var h$ = { data: 'data' },
    QO = { entity: { action: h$ } },
    eU = {};
  $e(eU, {
    MappingSchema: () => y$,
    SettingsSchema: () => b$,
    mapping: () => nU,
    settings: () => tU,
  });
  var b$ = l.object({
      url: l
        .string()
        .url()
        .describe(
          'The HTTP endpoint URL to send events to (like https://api.example.com/events)',
        ),
      headers: l
        .record(l.string(), l.string())
        .describe(
          "Additional HTTP headers to include with requests (like { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' })",
        )
        .optional(),
      method: l
        .string()
        .default('POST')
        .describe('HTTP method for the request'),
      transform: l
        .any()
        .describe(
          'Function to transform event data before sending (like (data, config, mapping) => JSON.stringify(data))',
        )
        .optional(),
      transport: l
        .enum(['fetch', 'xhr', 'beacon'])
        .default('fetch')
        .describe('Transport method for sending requests'),
    }),
    y$ = l.object({}),
    tU = m$(b$),
    nU = m$(y$),
    $$ = {
      type: 'api',
      config: {},
      push(e, { config: t, mapping: i, data: n, env: r }) {
        let { settings: o } = t,
          {
            url: s,
            headers: u,
            method: a,
            transform: c,
            transport: m = 'fetch',
          } = o || {};
        if (!s) return;
        let p = n !== void 0 ? n : e,
          f = c ? c(p, t, i) : JSON.stringify(p);
        (r?.sendWeb || GO)(s, f, { headers: u, method: a, transport: m });
      },
    };
  async function rU(e = {}) {
    let { tracker: t } = e,
      i = t,
      n = typeof globalThis.window < 'u' ? globalThis.window : void 0,
      r = typeof globalThis.document < 'u' ? globalThis.document : void 0;
    return await Ff({
      sources: {
        demo: {
          code: Wf,
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
        demo: { code: qf, config: { settings: { name: 'demo' } } },
        api: {
          code: $$,
          config: { settings: { url: 'http://localhost:8080/collect' } },
        },
      },
      run: !0,
      globals: { language: 'en' },
    });
  }
  return I$(iU);
})();
