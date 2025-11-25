var walkerOS = (() => {
  var Ti = Object.defineProperty;
  var Tm = Object.getOwnPropertyDescriptor;
  var Cm = Object.getOwnPropertyNames;
  var Am = Object.prototype.hasOwnProperty;
  var lo = (e, t) => {
      for (var i in t) Ti(e, i, { get: t[i], enumerable: !0 });
    },
    Zm = (e, t, i, n) => {
      if ((t && typeof t == 'object') || typeof t == 'function')
        for (let r of Cm(t))
          !Am.call(e, r) &&
            r !== i &&
            Ti(e, r, {
              get: () => t[r],
              enumerable: !(n = Tm(t, r)) || n.enumerable,
            });
      return e;
    };
  var Rm = (e) => Zm(Ti({}, '__esModule', { value: !0 }), e);
  var T$ = {};
  lo(T$, { default: () => D$ });
  var d = {};
  lo(d, {
    BRAND: () => dp,
    DIRTY: () => qe,
    EMPTY_PATH: () => Vm,
    INVALID: () => z,
    NEVER: () => Kp,
    OK: () => Y,
    ParseStatus: () => X,
    Schema: () => Z,
    ZodAny: () => Ze,
    ZodArray: () => Ue,
    ZodBigInt: () => Ge,
    ZodBoolean: () => Ke,
    ZodBranded: () => qt,
    ZodCatch: () => ot,
    ZodDate: () => He,
    ZodDefault: () => at,
    ZodDiscriminatedUnion: () => On,
    ZodEffects: () => me,
    ZodEnum: () => it,
    ZodError: () => re,
    ZodFirstPartyTypeKind: () => U,
    ZodFunction: () => Nn,
    ZodIntersection: () => et,
    ZodIssueCode: () => b,
    ZodLazy: () => tt,
    ZodLiteral: () => nt,
    ZodMap: () => Pt,
    ZodNaN: () => Dt,
    ZodNativeEnum: () => rt,
    ZodNever: () => he,
    ZodNull: () => Ye,
    ZodNullable: () => Ie,
    ZodNumber: () => Be,
    ZodObject: () => ae,
    ZodOptional: () => le,
    ZodParsedType: () => x,
    ZodPipeline: () => Bt,
    ZodPromise: () => Re,
    ZodReadonly: () => st,
    ZodRecord: () => zn,
    ZodSchema: () => Z,
    ZodSet: () => Et,
    ZodString: () => Ae,
    ZodSymbol: () => Nt,
    ZodTransformer: () => me,
    ZodTuple: () => xe,
    ZodType: () => Z,
    ZodUndefined: () => Xe,
    ZodUnion: () => Qe,
    ZodUnknown: () => Ne,
    ZodVoid: () => Ut,
    addIssueToContext: () => S,
    any: () => _p,
    array: () => Sp,
    bigint: () => vp,
    boolean: () => ko,
    coerce: () => Gp,
    custom: () => yo,
    date: () => gp,
    datetimeRegex: () => ho,
    defaultErrorMap: () => Oe,
    discriminatedUnion: () => Op,
    effect: () => Lp,
    enum: () => Ap,
    function: () => Dp,
    getErrorMap: () => jt,
    getParsedType: () => Se,
    instanceof: () => pp,
    intersection: () => zp,
    isAborted: () => In,
    isAsync: () => Ot,
    isDirty: () => jn,
    isValid: () => Ce,
    late: () => mp,
    lazy: () => Tp,
    literal: () => Cp,
    makeIssue: () => Wt,
    map: () => Pp,
    nan: () => fp,
    nativeEnum: () => Zp,
    never: () => kp,
    null: () => yp,
    nullable: () => Mp,
    number: () => $o,
    object: () => xp,
    objectUtil: () => Ci,
    oboolean: () => Bp,
    onumber: () => qp,
    optional: () => Jp,
    ostring: () => Wp,
    pipeline: () => Fp,
    preprocess: () => Vp,
    promise: () => Rp,
    quotelessJson: () => Lm,
    record: () => Up,
    set: () => Ep,
    setErrorMap: () => Mm,
    strictObject: () => Ip,
    string: () => _o,
    symbol: () => hp,
    transformer: () => Lp,
    tuple: () => Np,
    undefined: () => bp,
    union: () => jp,
    unknown: () => $p,
    util: () => L,
    void: () => wp,
  });
  var L;
  (function (e) {
    e.assertEqual = (r) => {};
    function t(r) {}
    e.assertIs = t;
    function i(r) {
      throw new Error();
    }
    ((e.assertNever = i),
      (e.arrayToEnum = (r) => {
        let o = {};
        for (let s of r) o[s] = s;
        return o;
      }),
      (e.getValidEnumValues = (r) => {
        let o = e.objectKeys(r).filter((u) => typeof r[r[u]] != 'number'),
          s = {};
        for (let u of o) s[u] = r[u];
        return e.objectValues(s);
      }),
      (e.objectValues = (r) =>
        e.objectKeys(r).map(function (o) {
          return r[o];
        })),
      (e.objectKeys =
        typeof Object.keys == 'function'
          ? (r) => Object.keys(r)
          : (r) => {
              let o = [];
              for (let s in r)
                Object.prototype.hasOwnProperty.call(r, s) && o.push(s);
              return o;
            }),
      (e.find = (r, o) => {
        for (let s of r) if (o(s)) return s;
      }),
      (e.isInteger =
        typeof Number.isInteger == 'function'
          ? (r) => Number.isInteger(r)
          : (r) =>
              typeof r == 'number' &&
              Number.isFinite(r) &&
              Math.floor(r) === r));
    function n(r, o = ' | ') {
      return r.map((s) => (typeof s == 'string' ? `'${s}'` : s)).join(o);
    }
    ((e.joinValues = n),
      (e.jsonStringifyReplacer = (r, o) =>
        typeof o == 'bigint' ? o.toString() : o));
  })(L || (L = {}));
  var Ci;
  (function (e) {
    e.mergeShapes = (t, i) => ({ ...t, ...i });
  })(Ci || (Ci = {}));
  var x = L.arrayToEnum([
      'string',
      'nan',
      'number',
      'integer',
      'float',
      'boolean',
      'date',
      'bigint',
      'symbol',
      'function',
      'undefined',
      'null',
      'array',
      'object',
      'unknown',
      'promise',
      'void',
      'never',
      'map',
      'set',
    ]),
    Se = (e) => {
      switch (typeof e) {
        case 'undefined':
          return x.undefined;
        case 'string':
          return x.string;
        case 'number':
          return Number.isNaN(e) ? x.nan : x.number;
        case 'boolean':
          return x.boolean;
        case 'function':
          return x.function;
        case 'bigint':
          return x.bigint;
        case 'symbol':
          return x.symbol;
        case 'object':
          return Array.isArray(e)
            ? x.array
            : e === null
              ? x.null
              : e.then &&
                  typeof e.then == 'function' &&
                  e.catch &&
                  typeof e.catch == 'function'
                ? x.promise
                : typeof Map < 'u' && e instanceof Map
                  ? x.map
                  : typeof Set < 'u' && e instanceof Set
                    ? x.set
                    : typeof Date < 'u' && e instanceof Date
                      ? x.date
                      : x.object;
        default:
          return x.unknown;
      }
    };
  var b = L.arrayToEnum([
      'invalid_type',
      'invalid_literal',
      'custom',
      'invalid_union',
      'invalid_union_discriminator',
      'invalid_enum_value',
      'unrecognized_keys',
      'invalid_arguments',
      'invalid_return_type',
      'invalid_date',
      'invalid_string',
      'too_small',
      'too_big',
      'invalid_intersection_types',
      'not_multiple_of',
      'not_finite',
    ]),
    Lm = (e) => JSON.stringify(e, null, 2).replace(/"([^"]+)":/g, '$1:'),
    re = class e extends Error {
      get errors() {
        return this.issues;
      }
      constructor(t) {
        (super(),
          (this.issues = []),
          (this.addIssue = (n) => {
            this.issues = [...this.issues, n];
          }),
          (this.addIssues = (n = []) => {
            this.issues = [...this.issues, ...n];
          }));
        let i = new.target.prototype;
        (Object.setPrototypeOf
          ? Object.setPrototypeOf(this, i)
          : (this.__proto__ = i),
          (this.name = 'ZodError'),
          (this.issues = t));
      }
      format(t) {
        let i =
            t ||
            function (o) {
              return o.message;
            },
          n = { _errors: [] },
          r = (o) => {
            for (let s of o.issues)
              if (s.code === 'invalid_union') s.unionErrors.map(r);
              else if (s.code === 'invalid_return_type') r(s.returnTypeError);
              else if (s.code === 'invalid_arguments') r(s.argumentsError);
              else if (s.path.length === 0) n._errors.push(i(s));
              else {
                let u = n,
                  a = 0;
                for (; a < s.path.length; ) {
                  let c = s.path[a];
                  (a === s.path.length - 1
                    ? ((u[c] = u[c] || { _errors: [] }),
                      u[c]._errors.push(i(s)))
                    : (u[c] = u[c] || { _errors: [] }),
                    (u = u[c]),
                    a++);
                }
              }
          };
        return (r(this), n);
      }
      static assert(t) {
        if (!(t instanceof e)) throw new Error(`Not a ZodError: ${t}`);
      }
      toString() {
        return this.message;
      }
      get message() {
        return JSON.stringify(this.issues, L.jsonStringifyReplacer, 2);
      }
      get isEmpty() {
        return this.issues.length === 0;
      }
      flatten(t = (i) => i.message) {
        let i = {},
          n = [];
        for (let r of this.issues)
          if (r.path.length > 0) {
            let o = r.path[0];
            ((i[o] = i[o] || []), i[o].push(t(r)));
          } else n.push(t(r));
        return { formErrors: n, fieldErrors: i };
      }
      get formErrors() {
        return this.flatten();
      }
    };
  re.create = (e) => new re(e);
  var Jm = (e, t) => {
      let i;
      switch (e.code) {
        case b.invalid_type:
          e.received === x.undefined
            ? (i = 'Required')
            : (i = `Expected ${e.expected}, received ${e.received}`);
          break;
        case b.invalid_literal:
          i = `Invalid literal value, expected ${JSON.stringify(e.expected, L.jsonStringifyReplacer)}`;
          break;
        case b.unrecognized_keys:
          i = `Unrecognized key(s) in object: ${L.joinValues(e.keys, ', ')}`;
          break;
        case b.invalid_union:
          i = 'Invalid input';
          break;
        case b.invalid_union_discriminator:
          i = `Invalid discriminator value. Expected ${L.joinValues(e.options)}`;
          break;
        case b.invalid_enum_value:
          i = `Invalid enum value. Expected ${L.joinValues(e.options)}, received '${e.received}'`;
          break;
        case b.invalid_arguments:
          i = 'Invalid function arguments';
          break;
        case b.invalid_return_type:
          i = 'Invalid function return type';
          break;
        case b.invalid_date:
          i = 'Invalid date';
          break;
        case b.invalid_string:
          typeof e.validation == 'object'
            ? 'includes' in e.validation
              ? ((i = `Invalid input: must include "${e.validation.includes}"`),
                typeof e.validation.position == 'number' &&
                  (i = `${i} at one or more positions greater than or equal to ${e.validation.position}`))
              : 'startsWith' in e.validation
                ? (i = `Invalid input: must start with "${e.validation.startsWith}"`)
                : 'endsWith' in e.validation
                  ? (i = `Invalid input: must end with "${e.validation.endsWith}"`)
                  : L.assertNever(e.validation)
            : e.validation !== 'regex'
              ? (i = `Invalid ${e.validation}`)
              : (i = 'Invalid');
          break;
        case b.too_small:
          e.type === 'array'
            ? (i = `Array must contain ${e.exact ? 'exactly' : e.inclusive ? 'at least' : 'more than'} ${e.minimum} element(s)`)
            : e.type === 'string'
              ? (i = `String must contain ${e.exact ? 'exactly' : e.inclusive ? 'at least' : 'over'} ${e.minimum} character(s)`)
              : e.type === 'number'
                ? (i = `Number must be ${e.exact ? 'exactly equal to ' : e.inclusive ? 'greater than or equal to ' : 'greater than '}${e.minimum}`)
                : e.type === 'bigint'
                  ? (i = `Number must be ${e.exact ? 'exactly equal to ' : e.inclusive ? 'greater than or equal to ' : 'greater than '}${e.minimum}`)
                  : e.type === 'date'
                    ? (i = `Date must be ${e.exact ? 'exactly equal to ' : e.inclusive ? 'greater than or equal to ' : 'greater than '}${new Date(Number(e.minimum))}`)
                    : (i = 'Invalid input');
          break;
        case b.too_big:
          e.type === 'array'
            ? (i = `Array must contain ${e.exact ? 'exactly' : e.inclusive ? 'at most' : 'less than'} ${e.maximum} element(s)`)
            : e.type === 'string'
              ? (i = `String must contain ${e.exact ? 'exactly' : e.inclusive ? 'at most' : 'under'} ${e.maximum} character(s)`)
              : e.type === 'number'
                ? (i = `Number must be ${e.exact ? 'exactly' : e.inclusive ? 'less than or equal to' : 'less than'} ${e.maximum}`)
                : e.type === 'bigint'
                  ? (i = `BigInt must be ${e.exact ? 'exactly' : e.inclusive ? 'less than or equal to' : 'less than'} ${e.maximum}`)
                  : e.type === 'date'
                    ? (i = `Date must be ${e.exact ? 'exactly' : e.inclusive ? 'smaller than or equal to' : 'smaller than'} ${new Date(Number(e.maximum))}`)
                    : (i = 'Invalid input');
          break;
        case b.custom:
          i = 'Invalid input';
          break;
        case b.invalid_intersection_types:
          i = 'Intersection results could not be merged';
          break;
        case b.not_multiple_of:
          i = `Number must be a multiple of ${e.multipleOf}`;
          break;
        case b.not_finite:
          i = 'Number must be finite';
          break;
        default:
          ((i = t.defaultError), L.assertNever(e));
      }
      return { message: i };
    },
    Oe = Jm;
  var mo = Oe;
  function Mm(e) {
    mo = e;
  }
  function jt() {
    return mo;
  }
  var Wt = (e) => {
      let { data: t, path: i, errorMaps: n, issueData: r } = e,
        o = [...i, ...(r.path || [])],
        s = { ...r, path: o };
      if (r.message !== void 0) return { ...r, path: o, message: r.message };
      let u = '',
        a = n
          .filter((c) => !!c)
          .slice()
          .reverse();
      for (let c of a) u = c(s, { data: t, defaultError: u }).message;
      return { ...r, path: o, message: u };
    },
    Vm = [];
  function S(e, t) {
    let i = jt(),
      n = Wt({
        issueData: t,
        data: e.data,
        path: e.path,
        errorMaps: [
          e.common.contextualErrorMap,
          e.schemaErrorMap,
          i,
          i === Oe ? void 0 : Oe,
        ].filter((r) => !!r),
      });
    e.common.issues.push(n);
  }
  var X = class e {
      constructor() {
        this.value = 'valid';
      }
      dirty() {
        this.value === 'valid' && (this.value = 'dirty');
      }
      abort() {
        this.value !== 'aborted' && (this.value = 'aborted');
      }
      static mergeArray(t, i) {
        let n = [];
        for (let r of i) {
          if (r.status === 'aborted') return z;
          (r.status === 'dirty' && t.dirty(), n.push(r.value));
        }
        return { status: t.value, value: n };
      }
      static async mergeObjectAsync(t, i) {
        let n = [];
        for (let r of i) {
          let o = await r.key,
            s = await r.value;
          n.push({ key: o, value: s });
        }
        return e.mergeObjectSync(t, n);
      }
      static mergeObjectSync(t, i) {
        let n = {};
        for (let r of i) {
          let { key: o, value: s } = r;
          if (o.status === 'aborted' || s.status === 'aborted') return z;
          (o.status === 'dirty' && t.dirty(),
            s.status === 'dirty' && t.dirty(),
            o.value !== '__proto__' &&
              (typeof s.value < 'u' || r.alwaysSet) &&
              (n[o.value] = s.value));
        }
        return { status: t.value, value: n };
      }
    },
    z = Object.freeze({ status: 'aborted' }),
    qe = (e) => ({ status: 'dirty', value: e }),
    Y = (e) => ({ status: 'valid', value: e }),
    In = (e) => e.status === 'aborted',
    jn = (e) => e.status === 'dirty',
    Ce = (e) => e.status === 'valid',
    Ot = (e) => typeof Promise < 'u' && e instanceof Promise;
  var O;
  (function (e) {
    ((e.errToObj = (t) => (typeof t == 'string' ? { message: t } : t || {})),
      (e.toString = (t) => (typeof t == 'string' ? t : t?.message)));
  })(O || (O = {}));
  var de = class {
      constructor(t, i, n, r) {
        ((this._cachedPath = []),
          (this.parent = t),
          (this.data = i),
          (this._path = n),
          (this._key = r));
      }
      get path() {
        return (
          this._cachedPath.length ||
            (Array.isArray(this._key)
              ? this._cachedPath.push(...this._path, ...this._key)
              : this._cachedPath.push(...this._path, this._key)),
          this._cachedPath
        );
      }
    },
    po = (e, t) => {
      if (Ce(t)) return { success: !0, data: t.value };
      if (!e.common.issues.length)
        throw new Error('Validation failed but no issues detected.');
      return {
        success: !1,
        get error() {
          if (this._error) return this._error;
          let i = new re(e.common.issues);
          return ((this._error = i), this._error);
        },
      };
    };
  function A(e) {
    if (!e) return {};
    let {
      errorMap: t,
      invalid_type_error: i,
      required_error: n,
      description: r,
    } = e;
    if (t && (i || n))
      throw new Error(
        `Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`,
      );
    return t
      ? { errorMap: t, description: r }
      : {
          errorMap: (s, u) => {
            let { message: a } = e;
            return s.code === 'invalid_enum_value'
              ? { message: a ?? u.defaultError }
              : typeof u.data > 'u'
                ? { message: a ?? n ?? u.defaultError }
                : s.code !== 'invalid_type'
                  ? { message: u.defaultError }
                  : { message: a ?? i ?? u.defaultError };
          },
          description: r,
        };
  }
  var Z = class {
      get description() {
        return this._def.description;
      }
      _getType(t) {
        return Se(t.data);
      }
      _getOrReturnCtx(t, i) {
        return (
          i || {
            common: t.parent.common,
            data: t.data,
            parsedType: Se(t.data),
            schemaErrorMap: this._def.errorMap,
            path: t.path,
            parent: t.parent,
          }
        );
      }
      _processInputParams(t) {
        return {
          status: new X(),
          ctx: {
            common: t.parent.common,
            data: t.data,
            parsedType: Se(t.data),
            schemaErrorMap: this._def.errorMap,
            path: t.path,
            parent: t.parent,
          },
        };
      }
      _parseSync(t) {
        let i = this._parse(t);
        if (Ot(i)) throw new Error('Synchronous parse encountered promise.');
        return i;
      }
      _parseAsync(t) {
        let i = this._parse(t);
        return Promise.resolve(i);
      }
      parse(t, i) {
        let n = this.safeParse(t, i);
        if (n.success) return n.data;
        throw n.error;
      }
      safeParse(t, i) {
        let n = {
            common: {
              issues: [],
              async: i?.async ?? !1,
              contextualErrorMap: i?.errorMap,
            },
            path: i?.path || [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data: t,
            parsedType: Se(t),
          },
          r = this._parseSync({ data: t, path: n.path, parent: n });
        return po(n, r);
      }
      '~validate'(t) {
        let i = {
          common: { issues: [], async: !!this['~standard'].async },
          path: [],
          schemaErrorMap: this._def.errorMap,
          parent: null,
          data: t,
          parsedType: Se(t),
        };
        if (!this['~standard'].async)
          try {
            let n = this._parseSync({ data: t, path: [], parent: i });
            return Ce(n) ? { value: n.value } : { issues: i.common.issues };
          } catch (n) {
            (n?.message?.toLowerCase()?.includes('encountered') &&
              (this['~standard'].async = !0),
              (i.common = { issues: [], async: !0 }));
          }
        return this._parseAsync({ data: t, path: [], parent: i }).then((n) =>
          Ce(n) ? { value: n.value } : { issues: i.common.issues },
        );
      }
      async parseAsync(t, i) {
        let n = await this.safeParseAsync(t, i);
        if (n.success) return n.data;
        throw n.error;
      }
      async safeParseAsync(t, i) {
        let n = {
            common: { issues: [], contextualErrorMap: i?.errorMap, async: !0 },
            path: i?.path || [],
            schemaErrorMap: this._def.errorMap,
            parent: null,
            data: t,
            parsedType: Se(t),
          },
          r = this._parse({ data: t, path: n.path, parent: n }),
          o = await (Ot(r) ? r : Promise.resolve(r));
        return po(n, o);
      }
      refine(t, i) {
        let n = (r) =>
          typeof i == 'string' || typeof i > 'u'
            ? { message: i }
            : typeof i == 'function'
              ? i(r)
              : i;
        return this._refinement((r, o) => {
          let s = t(r),
            u = () => o.addIssue({ code: b.custom, ...n(r) });
          return typeof Promise < 'u' && s instanceof Promise
            ? s.then((a) => (a ? !0 : (u(), !1)))
            : s
              ? !0
              : (u(), !1);
        });
      }
      refinement(t, i) {
        return this._refinement((n, r) =>
          t(n) ? !0 : (r.addIssue(typeof i == 'function' ? i(n, r) : i), !1),
        );
      }
      _refinement(t) {
        return new me({
          schema: this,
          typeName: U.ZodEffects,
          effect: { type: 'refinement', refinement: t },
        });
      }
      superRefine(t) {
        return this._refinement(t);
      }
      constructor(t) {
        ((this.spa = this.safeParseAsync),
          (this._def = t),
          (this.parse = this.parse.bind(this)),
          (this.safeParse = this.safeParse.bind(this)),
          (this.parseAsync = this.parseAsync.bind(this)),
          (this.safeParseAsync = this.safeParseAsync.bind(this)),
          (this.spa = this.spa.bind(this)),
          (this.refine = this.refine.bind(this)),
          (this.refinement = this.refinement.bind(this)),
          (this.superRefine = this.superRefine.bind(this)),
          (this.optional = this.optional.bind(this)),
          (this.nullable = this.nullable.bind(this)),
          (this.nullish = this.nullish.bind(this)),
          (this.array = this.array.bind(this)),
          (this.promise = this.promise.bind(this)),
          (this.or = this.or.bind(this)),
          (this.and = this.and.bind(this)),
          (this.transform = this.transform.bind(this)),
          (this.brand = this.brand.bind(this)),
          (this.default = this.default.bind(this)),
          (this.catch = this.catch.bind(this)),
          (this.describe = this.describe.bind(this)),
          (this.pipe = this.pipe.bind(this)),
          (this.readonly = this.readonly.bind(this)),
          (this.isNullable = this.isNullable.bind(this)),
          (this.isOptional = this.isOptional.bind(this)),
          (this['~standard'] = {
            version: 1,
            vendor: 'zod',
            validate: (i) => this['~validate'](i),
          }));
      }
      optional() {
        return le.create(this, this._def);
      }
      nullable() {
        return Ie.create(this, this._def);
      }
      nullish() {
        return this.nullable().optional();
      }
      array() {
        return Ue.create(this);
      }
      promise() {
        return Re.create(this, this._def);
      }
      or(t) {
        return Qe.create([this, t], this._def);
      }
      and(t) {
        return et.create(this, t, this._def);
      }
      transform(t) {
        return new me({
          ...A(this._def),
          schema: this,
          typeName: U.ZodEffects,
          effect: { type: 'transform', transform: t },
        });
      }
      default(t) {
        let i = typeof t == 'function' ? t : () => t;
        return new at({
          ...A(this._def),
          innerType: this,
          defaultValue: i,
          typeName: U.ZodDefault,
        });
      }
      brand() {
        return new qt({ typeName: U.ZodBranded, type: this, ...A(this._def) });
      }
      catch(t) {
        let i = typeof t == 'function' ? t : () => t;
        return new ot({
          ...A(this._def),
          innerType: this,
          catchValue: i,
          typeName: U.ZodCatch,
        });
      }
      describe(t) {
        let i = this.constructor;
        return new i({ ...this._def, description: t });
      }
      pipe(t) {
        return Bt.create(this, t);
      }
      readonly() {
        return st.create(this);
      }
      isOptional() {
        return this.safeParse(void 0).success;
      }
      isNullable() {
        return this.safeParse(null).success;
      }
    },
    Fm = /^c[^\s-]{8,}$/i,
    Wm = /^[0-9a-z]+$/,
    qm = /^[0-9A-HJKMNP-TV-Z]{26}$/i,
    Bm =
      /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i,
    Gm = /^[a-z0-9_-]{21}$/i,
    Km = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,
    Hm =
      /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
    Xm =
      /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i,
    Ym = '^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$',
    Ai,
    Qm =
      /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    ep =
      /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
    tp =
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/,
    np =
      /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    ip = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
    rp =
      /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
    vo =
      '((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))',
    ap = new RegExp(`^${vo}$`);
  function go(e) {
    let t = '[0-5]\\d';
    e.precision
      ? (t = `${t}\\.\\d{${e.precision}}`)
      : e.precision == null && (t = `${t}(\\.\\d+)?`);
    let i = e.precision ? '+' : '?';
    return `([01]\\d|2[0-3]):[0-5]\\d(:${t})${i}`;
  }
  function op(e) {
    return new RegExp(`^${go(e)}$`);
  }
  function ho(e) {
    let t = `${vo}T${go(e)}`,
      i = [];
    return (
      i.push(e.local ? 'Z?' : 'Z'),
      e.offset && i.push('([+-]\\d{2}:?\\d{2})'),
      (t = `${t}(${i.join('|')})`),
      new RegExp(`^${t}$`)
    );
  }
  function sp(e, t) {
    return !!(
      ((t === 'v4' || !t) && Qm.test(e)) ||
      ((t === 'v6' || !t) && tp.test(e))
    );
  }
  function up(e, t) {
    if (!Km.test(e)) return !1;
    try {
      let [i] = e.split('.');
      if (!i) return !1;
      let n = i
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(i.length + ((4 - (i.length % 4)) % 4), '='),
        r = JSON.parse(atob(n));
      return !(
        typeof r != 'object' ||
        r === null ||
        ('typ' in r && r?.typ !== 'JWT') ||
        !r.alg ||
        (t && r.alg !== t)
      );
    } catch {
      return !1;
    }
  }
  function cp(e, t) {
    return !!(
      ((t === 'v4' || !t) && ep.test(e)) ||
      ((t === 'v6' || !t) && np.test(e))
    );
  }
  var Ae = class e extends Z {
    _parse(t) {
      if (
        (this._def.coerce && (t.data = String(t.data)),
        this._getType(t) !== x.string)
      ) {
        let o = this._getOrReturnCtx(t);
        return (
          S(o, {
            code: b.invalid_type,
            expected: x.string,
            received: o.parsedType,
          }),
          z
        );
      }
      let n = new X(),
        r;
      for (let o of this._def.checks)
        if (o.kind === 'min')
          t.data.length < o.value &&
            ((r = this._getOrReturnCtx(t, r)),
            S(r, {
              code: b.too_small,
              minimum: o.value,
              type: 'string',
              inclusive: !0,
              exact: !1,
              message: o.message,
            }),
            n.dirty());
        else if (o.kind === 'max')
          t.data.length > o.value &&
            ((r = this._getOrReturnCtx(t, r)),
            S(r, {
              code: b.too_big,
              maximum: o.value,
              type: 'string',
              inclusive: !0,
              exact: !1,
              message: o.message,
            }),
            n.dirty());
        else if (o.kind === 'length') {
          let s = t.data.length > o.value,
            u = t.data.length < o.value;
          (s || u) &&
            ((r = this._getOrReturnCtx(t, r)),
            s
              ? S(r, {
                  code: b.too_big,
                  maximum: o.value,
                  type: 'string',
                  inclusive: !0,
                  exact: !0,
                  message: o.message,
                })
              : u &&
                S(r, {
                  code: b.too_small,
                  minimum: o.value,
                  type: 'string',
                  inclusive: !0,
                  exact: !0,
                  message: o.message,
                }),
            n.dirty());
        } else if (o.kind === 'email')
          Xm.test(t.data) ||
            ((r = this._getOrReturnCtx(t, r)),
            S(r, {
              validation: 'email',
              code: b.invalid_string,
              message: o.message,
            }),
            n.dirty());
        else if (o.kind === 'emoji')
          (Ai || (Ai = new RegExp(Ym, 'u')),
            Ai.test(t.data) ||
              ((r = this._getOrReturnCtx(t, r)),
              S(r, {
                validation: 'emoji',
                code: b.invalid_string,
                message: o.message,
              }),
              n.dirty()));
        else if (o.kind === 'uuid')
          Bm.test(t.data) ||
            ((r = this._getOrReturnCtx(t, r)),
            S(r, {
              validation: 'uuid',
              code: b.invalid_string,
              message: o.message,
            }),
            n.dirty());
        else if (o.kind === 'nanoid')
          Gm.test(t.data) ||
            ((r = this._getOrReturnCtx(t, r)),
            S(r, {
              validation: 'nanoid',
              code: b.invalid_string,
              message: o.message,
            }),
            n.dirty());
        else if (o.kind === 'cuid')
          Fm.test(t.data) ||
            ((r = this._getOrReturnCtx(t, r)),
            S(r, {
              validation: 'cuid',
              code: b.invalid_string,
              message: o.message,
            }),
            n.dirty());
        else if (o.kind === 'cuid2')
          Wm.test(t.data) ||
            ((r = this._getOrReturnCtx(t, r)),
            S(r, {
              validation: 'cuid2',
              code: b.invalid_string,
              message: o.message,
            }),
            n.dirty());
        else if (o.kind === 'ulid')
          qm.test(t.data) ||
            ((r = this._getOrReturnCtx(t, r)),
            S(r, {
              validation: 'ulid',
              code: b.invalid_string,
              message: o.message,
            }),
            n.dirty());
        else if (o.kind === 'url')
          try {
            new URL(t.data);
          } catch {
            ((r = this._getOrReturnCtx(t, r)),
              S(r, {
                validation: 'url',
                code: b.invalid_string,
                message: o.message,
              }),
              n.dirty());
          }
        else
          o.kind === 'regex'
            ? ((o.regex.lastIndex = 0),
              o.regex.test(t.data) ||
                ((r = this._getOrReturnCtx(t, r)),
                S(r, {
                  validation: 'regex',
                  code: b.invalid_string,
                  message: o.message,
                }),
                n.dirty()))
            : o.kind === 'trim'
              ? (t.data = t.data.trim())
              : o.kind === 'includes'
                ? t.data.includes(o.value, o.position) ||
                  ((r = this._getOrReturnCtx(t, r)),
                  S(r, {
                    code: b.invalid_string,
                    validation: { includes: o.value, position: o.position },
                    message: o.message,
                  }),
                  n.dirty())
                : o.kind === 'toLowerCase'
                  ? (t.data = t.data.toLowerCase())
                  : o.kind === 'toUpperCase'
                    ? (t.data = t.data.toUpperCase())
                    : o.kind === 'startsWith'
                      ? t.data.startsWith(o.value) ||
                        ((r = this._getOrReturnCtx(t, r)),
                        S(r, {
                          code: b.invalid_string,
                          validation: { startsWith: o.value },
                          message: o.message,
                        }),
                        n.dirty())
                      : o.kind === 'endsWith'
                        ? t.data.endsWith(o.value) ||
                          ((r = this._getOrReturnCtx(t, r)),
                          S(r, {
                            code: b.invalid_string,
                            validation: { endsWith: o.value },
                            message: o.message,
                          }),
                          n.dirty())
                        : o.kind === 'datetime'
                          ? ho(o).test(t.data) ||
                            ((r = this._getOrReturnCtx(t, r)),
                            S(r, {
                              code: b.invalid_string,
                              validation: 'datetime',
                              message: o.message,
                            }),
                            n.dirty())
                          : o.kind === 'date'
                            ? ap.test(t.data) ||
                              ((r = this._getOrReturnCtx(t, r)),
                              S(r, {
                                code: b.invalid_string,
                                validation: 'date',
                                message: o.message,
                              }),
                              n.dirty())
                            : o.kind === 'time'
                              ? op(o).test(t.data) ||
                                ((r = this._getOrReturnCtx(t, r)),
                                S(r, {
                                  code: b.invalid_string,
                                  validation: 'time',
                                  message: o.message,
                                }),
                                n.dirty())
                              : o.kind === 'duration'
                                ? Hm.test(t.data) ||
                                  ((r = this._getOrReturnCtx(t, r)),
                                  S(r, {
                                    validation: 'duration',
                                    code: b.invalid_string,
                                    message: o.message,
                                  }),
                                  n.dirty())
                                : o.kind === 'ip'
                                  ? sp(t.data, o.version) ||
                                    ((r = this._getOrReturnCtx(t, r)),
                                    S(r, {
                                      validation: 'ip',
                                      code: b.invalid_string,
                                      message: o.message,
                                    }),
                                    n.dirty())
                                  : o.kind === 'jwt'
                                    ? up(t.data, o.alg) ||
                                      ((r = this._getOrReturnCtx(t, r)),
                                      S(r, {
                                        validation: 'jwt',
                                        code: b.invalid_string,
                                        message: o.message,
                                      }),
                                      n.dirty())
                                    : o.kind === 'cidr'
                                      ? cp(t.data, o.version) ||
                                        ((r = this._getOrReturnCtx(t, r)),
                                        S(r, {
                                          validation: 'cidr',
                                          code: b.invalid_string,
                                          message: o.message,
                                        }),
                                        n.dirty())
                                      : o.kind === 'base64'
                                        ? ip.test(t.data) ||
                                          ((r = this._getOrReturnCtx(t, r)),
                                          S(r, {
                                            validation: 'base64',
                                            code: b.invalid_string,
                                            message: o.message,
                                          }),
                                          n.dirty())
                                        : o.kind === 'base64url'
                                          ? rp.test(t.data) ||
                                            ((r = this._getOrReturnCtx(t, r)),
                                            S(r, {
                                              validation: 'base64url',
                                              code: b.invalid_string,
                                              message: o.message,
                                            }),
                                            n.dirty())
                                          : L.assertNever(o);
      return { status: n.value, value: t.data };
    }
    _regex(t, i, n) {
      return this.refinement((r) => t.test(r), {
        validation: i,
        code: b.invalid_string,
        ...O.errToObj(n),
      });
    }
    _addCheck(t) {
      return new e({ ...this._def, checks: [...this._def.checks, t] });
    }
    email(t) {
      return this._addCheck({ kind: 'email', ...O.errToObj(t) });
    }
    url(t) {
      return this._addCheck({ kind: 'url', ...O.errToObj(t) });
    }
    emoji(t) {
      return this._addCheck({ kind: 'emoji', ...O.errToObj(t) });
    }
    uuid(t) {
      return this._addCheck({ kind: 'uuid', ...O.errToObj(t) });
    }
    nanoid(t) {
      return this._addCheck({ kind: 'nanoid', ...O.errToObj(t) });
    }
    cuid(t) {
      return this._addCheck({ kind: 'cuid', ...O.errToObj(t) });
    }
    cuid2(t) {
      return this._addCheck({ kind: 'cuid2', ...O.errToObj(t) });
    }
    ulid(t) {
      return this._addCheck({ kind: 'ulid', ...O.errToObj(t) });
    }
    base64(t) {
      return this._addCheck({ kind: 'base64', ...O.errToObj(t) });
    }
    base64url(t) {
      return this._addCheck({ kind: 'base64url', ...O.errToObj(t) });
    }
    jwt(t) {
      return this._addCheck({ kind: 'jwt', ...O.errToObj(t) });
    }
    ip(t) {
      return this._addCheck({ kind: 'ip', ...O.errToObj(t) });
    }
    cidr(t) {
      return this._addCheck({ kind: 'cidr', ...O.errToObj(t) });
    }
    datetime(t) {
      return typeof t == 'string'
        ? this._addCheck({
            kind: 'datetime',
            precision: null,
            offset: !1,
            local: !1,
            message: t,
          })
        : this._addCheck({
            kind: 'datetime',
            precision: typeof t?.precision > 'u' ? null : t?.precision,
            offset: t?.offset ?? !1,
            local: t?.local ?? !1,
            ...O.errToObj(t?.message),
          });
    }
    date(t) {
      return this._addCheck({ kind: 'date', message: t });
    }
    time(t) {
      return typeof t == 'string'
        ? this._addCheck({ kind: 'time', precision: null, message: t })
        : this._addCheck({
            kind: 'time',
            precision: typeof t?.precision > 'u' ? null : t?.precision,
            ...O.errToObj(t?.message),
          });
    }
    duration(t) {
      return this._addCheck({ kind: 'duration', ...O.errToObj(t) });
    }
    regex(t, i) {
      return this._addCheck({ kind: 'regex', regex: t, ...O.errToObj(i) });
    }
    includes(t, i) {
      return this._addCheck({
        kind: 'includes',
        value: t,
        position: i?.position,
        ...O.errToObj(i?.message),
      });
    }
    startsWith(t, i) {
      return this._addCheck({ kind: 'startsWith', value: t, ...O.errToObj(i) });
    }
    endsWith(t, i) {
      return this._addCheck({ kind: 'endsWith', value: t, ...O.errToObj(i) });
    }
    min(t, i) {
      return this._addCheck({ kind: 'min', value: t, ...O.errToObj(i) });
    }
    max(t, i) {
      return this._addCheck({ kind: 'max', value: t, ...O.errToObj(i) });
    }
    length(t, i) {
      return this._addCheck({ kind: 'length', value: t, ...O.errToObj(i) });
    }
    nonempty(t) {
      return this.min(1, O.errToObj(t));
    }
    trim() {
      return new e({
        ...this._def,
        checks: [...this._def.checks, { kind: 'trim' }],
      });
    }
    toLowerCase() {
      return new e({
        ...this._def,
        checks: [...this._def.checks, { kind: 'toLowerCase' }],
      });
    }
    toUpperCase() {
      return new e({
        ...this._def,
        checks: [...this._def.checks, { kind: 'toUpperCase' }],
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((t) => t.kind === 'datetime');
    }
    get isDate() {
      return !!this._def.checks.find((t) => t.kind === 'date');
    }
    get isTime() {
      return !!this._def.checks.find((t) => t.kind === 'time');
    }
    get isDuration() {
      return !!this._def.checks.find((t) => t.kind === 'duration');
    }
    get isEmail() {
      return !!this._def.checks.find((t) => t.kind === 'email');
    }
    get isURL() {
      return !!this._def.checks.find((t) => t.kind === 'url');
    }
    get isEmoji() {
      return !!this._def.checks.find((t) => t.kind === 'emoji');
    }
    get isUUID() {
      return !!this._def.checks.find((t) => t.kind === 'uuid');
    }
    get isNANOID() {
      return !!this._def.checks.find((t) => t.kind === 'nanoid');
    }
    get isCUID() {
      return !!this._def.checks.find((t) => t.kind === 'cuid');
    }
    get isCUID2() {
      return !!this._def.checks.find((t) => t.kind === 'cuid2');
    }
    get isULID() {
      return !!this._def.checks.find((t) => t.kind === 'ulid');
    }
    get isIP() {
      return !!this._def.checks.find((t) => t.kind === 'ip');
    }
    get isCIDR() {
      return !!this._def.checks.find((t) => t.kind === 'cidr');
    }
    get isBase64() {
      return !!this._def.checks.find((t) => t.kind === 'base64');
    }
    get isBase64url() {
      return !!this._def.checks.find((t) => t.kind === 'base64url');
    }
    get minLength() {
      let t = null;
      for (let i of this._def.checks)
        i.kind === 'min' && (t === null || i.value > t) && (t = i.value);
      return t;
    }
    get maxLength() {
      let t = null;
      for (let i of this._def.checks)
        i.kind === 'max' && (t === null || i.value < t) && (t = i.value);
      return t;
    }
  };
  Ae.create = (e) =>
    new Ae({
      checks: [],
      typeName: U.ZodString,
      coerce: e?.coerce ?? !1,
      ...A(e),
    });
  function lp(e, t) {
    let i = (e.toString().split('.')[1] || '').length,
      n = (t.toString().split('.')[1] || '').length,
      r = i > n ? i : n,
      o = Number.parseInt(e.toFixed(r).replace('.', '')),
      s = Number.parseInt(t.toFixed(r).replace('.', ''));
    return (o % s) / 10 ** r;
  }
  var Be = class e extends Z {
    constructor() {
      (super(...arguments),
        (this.min = this.gte),
        (this.max = this.lte),
        (this.step = this.multipleOf));
    }
    _parse(t) {
      if (
        (this._def.coerce && (t.data = Number(t.data)),
        this._getType(t) !== x.number)
      ) {
        let o = this._getOrReturnCtx(t);
        return (
          S(o, {
            code: b.invalid_type,
            expected: x.number,
            received: o.parsedType,
          }),
          z
        );
      }
      let n,
        r = new X();
      for (let o of this._def.checks)
        o.kind === 'int'
          ? L.isInteger(t.data) ||
            ((n = this._getOrReturnCtx(t, n)),
            S(n, {
              code: b.invalid_type,
              expected: 'integer',
              received: 'float',
              message: o.message,
            }),
            r.dirty())
          : o.kind === 'min'
            ? (o.inclusive ? t.data < o.value : t.data <= o.value) &&
              ((n = this._getOrReturnCtx(t, n)),
              S(n, {
                code: b.too_small,
                minimum: o.value,
                type: 'number',
                inclusive: o.inclusive,
                exact: !1,
                message: o.message,
              }),
              r.dirty())
            : o.kind === 'max'
              ? (o.inclusive ? t.data > o.value : t.data >= o.value) &&
                ((n = this._getOrReturnCtx(t, n)),
                S(n, {
                  code: b.too_big,
                  maximum: o.value,
                  type: 'number',
                  inclusive: o.inclusive,
                  exact: !1,
                  message: o.message,
                }),
                r.dirty())
              : o.kind === 'multipleOf'
                ? lp(t.data, o.value) !== 0 &&
                  ((n = this._getOrReturnCtx(t, n)),
                  S(n, {
                    code: b.not_multiple_of,
                    multipleOf: o.value,
                    message: o.message,
                  }),
                  r.dirty())
                : o.kind === 'finite'
                  ? Number.isFinite(t.data) ||
                    ((n = this._getOrReturnCtx(t, n)),
                    S(n, { code: b.not_finite, message: o.message }),
                    r.dirty())
                  : L.assertNever(o);
      return { status: r.value, value: t.data };
    }
    gte(t, i) {
      return this.setLimit('min', t, !0, O.toString(i));
    }
    gt(t, i) {
      return this.setLimit('min', t, !1, O.toString(i));
    }
    lte(t, i) {
      return this.setLimit('max', t, !0, O.toString(i));
    }
    lt(t, i) {
      return this.setLimit('max', t, !1, O.toString(i));
    }
    setLimit(t, i, n, r) {
      return new e({
        ...this._def,
        checks: [
          ...this._def.checks,
          { kind: t, value: i, inclusive: n, message: O.toString(r) },
        ],
      });
    }
    _addCheck(t) {
      return new e({ ...this._def, checks: [...this._def.checks, t] });
    }
    int(t) {
      return this._addCheck({ kind: 'int', message: O.toString(t) });
    }
    positive(t) {
      return this._addCheck({
        kind: 'min',
        value: 0,
        inclusive: !1,
        message: O.toString(t),
      });
    }
    negative(t) {
      return this._addCheck({
        kind: 'max',
        value: 0,
        inclusive: !1,
        message: O.toString(t),
      });
    }
    nonpositive(t) {
      return this._addCheck({
        kind: 'max',
        value: 0,
        inclusive: !0,
        message: O.toString(t),
      });
    }
    nonnegative(t) {
      return this._addCheck({
        kind: 'min',
        value: 0,
        inclusive: !0,
        message: O.toString(t),
      });
    }
    multipleOf(t, i) {
      return this._addCheck({
        kind: 'multipleOf',
        value: t,
        message: O.toString(i),
      });
    }
    finite(t) {
      return this._addCheck({ kind: 'finite', message: O.toString(t) });
    }
    safe(t) {
      return this._addCheck({
        kind: 'min',
        inclusive: !0,
        value: Number.MIN_SAFE_INTEGER,
        message: O.toString(t),
      })._addCheck({
        kind: 'max',
        inclusive: !0,
        value: Number.MAX_SAFE_INTEGER,
        message: O.toString(t),
      });
    }
    get minValue() {
      let t = null;
      for (let i of this._def.checks)
        i.kind === 'min' && (t === null || i.value > t) && (t = i.value);
      return t;
    }
    get maxValue() {
      let t = null;
      for (let i of this._def.checks)
        i.kind === 'max' && (t === null || i.value < t) && (t = i.value);
      return t;
    }
    get isInt() {
      return !!this._def.checks.find(
        (t) =>
          t.kind === 'int' || (t.kind === 'multipleOf' && L.isInteger(t.value)),
      );
    }
    get isFinite() {
      let t = null,
        i = null;
      for (let n of this._def.checks) {
        if (n.kind === 'finite' || n.kind === 'int' || n.kind === 'multipleOf')
          return !0;
        n.kind === 'min'
          ? (i === null || n.value > i) && (i = n.value)
          : n.kind === 'max' && (t === null || n.value < t) && (t = n.value);
      }
      return Number.isFinite(i) && Number.isFinite(t);
    }
  };
  Be.create = (e) =>
    new Be({
      checks: [],
      typeName: U.ZodNumber,
      coerce: e?.coerce || !1,
      ...A(e),
    });
  var Ge = class e extends Z {
    constructor() {
      (super(...arguments), (this.min = this.gte), (this.max = this.lte));
    }
    _parse(t) {
      if (this._def.coerce)
        try {
          t.data = BigInt(t.data);
        } catch {
          return this._getInvalidInput(t);
        }
      if (this._getType(t) !== x.bigint) return this._getInvalidInput(t);
      let n,
        r = new X();
      for (let o of this._def.checks)
        o.kind === 'min'
          ? (o.inclusive ? t.data < o.value : t.data <= o.value) &&
            ((n = this._getOrReturnCtx(t, n)),
            S(n, {
              code: b.too_small,
              type: 'bigint',
              minimum: o.value,
              inclusive: o.inclusive,
              message: o.message,
            }),
            r.dirty())
          : o.kind === 'max'
            ? (o.inclusive ? t.data > o.value : t.data >= o.value) &&
              ((n = this._getOrReturnCtx(t, n)),
              S(n, {
                code: b.too_big,
                type: 'bigint',
                maximum: o.value,
                inclusive: o.inclusive,
                message: o.message,
              }),
              r.dirty())
            : o.kind === 'multipleOf'
              ? t.data % o.value !== BigInt(0) &&
                ((n = this._getOrReturnCtx(t, n)),
                S(n, {
                  code: b.not_multiple_of,
                  multipleOf: o.value,
                  message: o.message,
                }),
                r.dirty())
              : L.assertNever(o);
      return { status: r.value, value: t.data };
    }
    _getInvalidInput(t) {
      let i = this._getOrReturnCtx(t);
      return (
        S(i, {
          code: b.invalid_type,
          expected: x.bigint,
          received: i.parsedType,
        }),
        z
      );
    }
    gte(t, i) {
      return this.setLimit('min', t, !0, O.toString(i));
    }
    gt(t, i) {
      return this.setLimit('min', t, !1, O.toString(i));
    }
    lte(t, i) {
      return this.setLimit('max', t, !0, O.toString(i));
    }
    lt(t, i) {
      return this.setLimit('max', t, !1, O.toString(i));
    }
    setLimit(t, i, n, r) {
      return new e({
        ...this._def,
        checks: [
          ...this._def.checks,
          { kind: t, value: i, inclusive: n, message: O.toString(r) },
        ],
      });
    }
    _addCheck(t) {
      return new e({ ...this._def, checks: [...this._def.checks, t] });
    }
    positive(t) {
      return this._addCheck({
        kind: 'min',
        value: BigInt(0),
        inclusive: !1,
        message: O.toString(t),
      });
    }
    negative(t) {
      return this._addCheck({
        kind: 'max',
        value: BigInt(0),
        inclusive: !1,
        message: O.toString(t),
      });
    }
    nonpositive(t) {
      return this._addCheck({
        kind: 'max',
        value: BigInt(0),
        inclusive: !0,
        message: O.toString(t),
      });
    }
    nonnegative(t) {
      return this._addCheck({
        kind: 'min',
        value: BigInt(0),
        inclusive: !0,
        message: O.toString(t),
      });
    }
    multipleOf(t, i) {
      return this._addCheck({
        kind: 'multipleOf',
        value: t,
        message: O.toString(i),
      });
    }
    get minValue() {
      let t = null;
      for (let i of this._def.checks)
        i.kind === 'min' && (t === null || i.value > t) && (t = i.value);
      return t;
    }
    get maxValue() {
      let t = null;
      for (let i of this._def.checks)
        i.kind === 'max' && (t === null || i.value < t) && (t = i.value);
      return t;
    }
  };
  Ge.create = (e) =>
    new Ge({
      checks: [],
      typeName: U.ZodBigInt,
      coerce: e?.coerce ?? !1,
      ...A(e),
    });
  var Ke = class extends Z {
    _parse(t) {
      if (
        (this._def.coerce && (t.data = !!t.data),
        this._getType(t) !== x.boolean)
      ) {
        let n = this._getOrReturnCtx(t);
        return (
          S(n, {
            code: b.invalid_type,
            expected: x.boolean,
            received: n.parsedType,
          }),
          z
        );
      }
      return Y(t.data);
    }
  };
  Ke.create = (e) =>
    new Ke({ typeName: U.ZodBoolean, coerce: e?.coerce || !1, ...A(e) });
  var He = class e extends Z {
    _parse(t) {
      if (
        (this._def.coerce && (t.data = new Date(t.data)),
        this._getType(t) !== x.date)
      ) {
        let o = this._getOrReturnCtx(t);
        return (
          S(o, {
            code: b.invalid_type,
            expected: x.date,
            received: o.parsedType,
          }),
          z
        );
      }
      if (Number.isNaN(t.data.getTime())) {
        let o = this._getOrReturnCtx(t);
        return (S(o, { code: b.invalid_date }), z);
      }
      let n = new X(),
        r;
      for (let o of this._def.checks)
        o.kind === 'min'
          ? t.data.getTime() < o.value &&
            ((r = this._getOrReturnCtx(t, r)),
            S(r, {
              code: b.too_small,
              message: o.message,
              inclusive: !0,
              exact: !1,
              minimum: o.value,
              type: 'date',
            }),
            n.dirty())
          : o.kind === 'max'
            ? t.data.getTime() > o.value &&
              ((r = this._getOrReturnCtx(t, r)),
              S(r, {
                code: b.too_big,
                message: o.message,
                inclusive: !0,
                exact: !1,
                maximum: o.value,
                type: 'date',
              }),
              n.dirty())
            : L.assertNever(o);
      return { status: n.value, value: new Date(t.data.getTime()) };
    }
    _addCheck(t) {
      return new e({ ...this._def, checks: [...this._def.checks, t] });
    }
    min(t, i) {
      return this._addCheck({
        kind: 'min',
        value: t.getTime(),
        message: O.toString(i),
      });
    }
    max(t, i) {
      return this._addCheck({
        kind: 'max',
        value: t.getTime(),
        message: O.toString(i),
      });
    }
    get minDate() {
      let t = null;
      for (let i of this._def.checks)
        i.kind === 'min' && (t === null || i.value > t) && (t = i.value);
      return t != null ? new Date(t) : null;
    }
    get maxDate() {
      let t = null;
      for (let i of this._def.checks)
        i.kind === 'max' && (t === null || i.value < t) && (t = i.value);
      return t != null ? new Date(t) : null;
    }
  };
  He.create = (e) =>
    new He({
      checks: [],
      coerce: e?.coerce || !1,
      typeName: U.ZodDate,
      ...A(e),
    });
  var Nt = class extends Z {
    _parse(t) {
      if (this._getType(t) !== x.symbol) {
        let n = this._getOrReturnCtx(t);
        return (
          S(n, {
            code: b.invalid_type,
            expected: x.symbol,
            received: n.parsedType,
          }),
          z
        );
      }
      return Y(t.data);
    }
  };
  Nt.create = (e) => new Nt({ typeName: U.ZodSymbol, ...A(e) });
  var Xe = class extends Z {
    _parse(t) {
      if (this._getType(t) !== x.undefined) {
        let n = this._getOrReturnCtx(t);
        return (
          S(n, {
            code: b.invalid_type,
            expected: x.undefined,
            received: n.parsedType,
          }),
          z
        );
      }
      return Y(t.data);
    }
  };
  Xe.create = (e) => new Xe({ typeName: U.ZodUndefined, ...A(e) });
  var Ye = class extends Z {
    _parse(t) {
      if (this._getType(t) !== x.null) {
        let n = this._getOrReturnCtx(t);
        return (
          S(n, {
            code: b.invalid_type,
            expected: x.null,
            received: n.parsedType,
          }),
          z
        );
      }
      return Y(t.data);
    }
  };
  Ye.create = (e) => new Ye({ typeName: U.ZodNull, ...A(e) });
  var Ze = class extends Z {
    constructor() {
      (super(...arguments), (this._any = !0));
    }
    _parse(t) {
      return Y(t.data);
    }
  };
  Ze.create = (e) => new Ze({ typeName: U.ZodAny, ...A(e) });
  var Ne = class extends Z {
    constructor() {
      (super(...arguments), (this._unknown = !0));
    }
    _parse(t) {
      return Y(t.data);
    }
  };
  Ne.create = (e) => new Ne({ typeName: U.ZodUnknown, ...A(e) });
  var he = class extends Z {
    _parse(t) {
      let i = this._getOrReturnCtx(t);
      return (
        S(i, {
          code: b.invalid_type,
          expected: x.never,
          received: i.parsedType,
        }),
        z
      );
    }
  };
  he.create = (e) => new he({ typeName: U.ZodNever, ...A(e) });
  var Ut = class extends Z {
    _parse(t) {
      if (this._getType(t) !== x.undefined) {
        let n = this._getOrReturnCtx(t);
        return (
          S(n, {
            code: b.invalid_type,
            expected: x.void,
            received: n.parsedType,
          }),
          z
        );
      }
      return Y(t.data);
    }
  };
  Ut.create = (e) => new Ut({ typeName: U.ZodVoid, ...A(e) });
  var Ue = class e extends Z {
    _parse(t) {
      let { ctx: i, status: n } = this._processInputParams(t),
        r = this._def;
      if (i.parsedType !== x.array)
        return (
          S(i, {
            code: b.invalid_type,
            expected: x.array,
            received: i.parsedType,
          }),
          z
        );
      if (r.exactLength !== null) {
        let s = i.data.length > r.exactLength.value,
          u = i.data.length < r.exactLength.value;
        (s || u) &&
          (S(i, {
            code: s ? b.too_big : b.too_small,
            minimum: u ? r.exactLength.value : void 0,
            maximum: s ? r.exactLength.value : void 0,
            type: 'array',
            inclusive: !0,
            exact: !0,
            message: r.exactLength.message,
          }),
          n.dirty());
      }
      if (
        (r.minLength !== null &&
          i.data.length < r.minLength.value &&
          (S(i, {
            code: b.too_small,
            minimum: r.minLength.value,
            type: 'array',
            inclusive: !0,
            exact: !1,
            message: r.minLength.message,
          }),
          n.dirty()),
        r.maxLength !== null &&
          i.data.length > r.maxLength.value &&
          (S(i, {
            code: b.too_big,
            maximum: r.maxLength.value,
            type: 'array',
            inclusive: !0,
            exact: !1,
            message: r.maxLength.message,
          }),
          n.dirty()),
        i.common.async)
      )
        return Promise.all(
          [...i.data].map((s, u) =>
            r.type._parseAsync(new de(i, s, i.path, u)),
          ),
        ).then((s) => X.mergeArray(n, s));
      let o = [...i.data].map((s, u) =>
        r.type._parseSync(new de(i, s, i.path, u)),
      );
      return X.mergeArray(n, o);
    }
    get element() {
      return this._def.type;
    }
    min(t, i) {
      return new e({
        ...this._def,
        minLength: { value: t, message: O.toString(i) },
      });
    }
    max(t, i) {
      return new e({
        ...this._def,
        maxLength: { value: t, message: O.toString(i) },
      });
    }
    length(t, i) {
      return new e({
        ...this._def,
        exactLength: { value: t, message: O.toString(i) },
      });
    }
    nonempty(t) {
      return this.min(1, t);
    }
  };
  Ue.create = (e, t) =>
    new Ue({
      type: e,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: U.ZodArray,
      ...A(t),
    });
  function zt(e) {
    if (e instanceof ae) {
      let t = {};
      for (let i in e.shape) {
        let n = e.shape[i];
        t[i] = le.create(zt(n));
      }
      return new ae({ ...e._def, shape: () => t });
    } else
      return e instanceof Ue
        ? new Ue({ ...e._def, type: zt(e.element) })
        : e instanceof le
          ? le.create(zt(e.unwrap()))
          : e instanceof Ie
            ? Ie.create(zt(e.unwrap()))
            : e instanceof xe
              ? xe.create(e.items.map((t) => zt(t)))
              : e;
  }
  var ae = class e extends Z {
    constructor() {
      (super(...arguments),
        (this._cached = null),
        (this.nonstrict = this.passthrough),
        (this.augment = this.extend));
    }
    _getCached() {
      if (this._cached !== null) return this._cached;
      let t = this._def.shape(),
        i = L.objectKeys(t);
      return ((this._cached = { shape: t, keys: i }), this._cached);
    }
    _parse(t) {
      if (this._getType(t) !== x.object) {
        let c = this._getOrReturnCtx(t);
        return (
          S(c, {
            code: b.invalid_type,
            expected: x.object,
            received: c.parsedType,
          }),
          z
        );
      }
      let { status: n, ctx: r } = this._processInputParams(t),
        { shape: o, keys: s } = this._getCached(),
        u = [];
      if (
        !(this._def.catchall instanceof he && this._def.unknownKeys === 'strip')
      )
        for (let c in r.data) s.includes(c) || u.push(c);
      let a = [];
      for (let c of s) {
        let m = o[c],
          p = r.data[c];
        a.push({
          key: { status: 'valid', value: c },
          value: m._parse(new de(r, p, r.path, c)),
          alwaysSet: c in r.data,
        });
      }
      if (this._def.catchall instanceof he) {
        let c = this._def.unknownKeys;
        if (c === 'passthrough')
          for (let m of u)
            a.push({
              key: { status: 'valid', value: m },
              value: { status: 'valid', value: r.data[m] },
            });
        else if (c === 'strict')
          u.length > 0 &&
            (S(r, { code: b.unrecognized_keys, keys: u }), n.dirty());
        else if (c !== 'strip')
          throw new Error(
            'Internal ZodObject error: invalid unknownKeys value.',
          );
      } else {
        let c = this._def.catchall;
        for (let m of u) {
          let p = r.data[m];
          a.push({
            key: { status: 'valid', value: m },
            value: c._parse(new de(r, p, r.path, m)),
            alwaysSet: m in r.data,
          });
        }
      }
      return r.common.async
        ? Promise.resolve()
            .then(async () => {
              let c = [];
              for (let m of a) {
                let p = await m.key,
                  f = await m.value;
                c.push({ key: p, value: f, alwaysSet: m.alwaysSet });
              }
              return c;
            })
            .then((c) => X.mergeObjectSync(n, c))
        : X.mergeObjectSync(n, a);
    }
    get shape() {
      return this._def.shape();
    }
    strict(t) {
      return (
        O.errToObj,
        new e({
          ...this._def,
          unknownKeys: 'strict',
          ...(t !== void 0
            ? {
                errorMap: (i, n) => {
                  let r = this._def.errorMap?.(i, n).message ?? n.defaultError;
                  return i.code === 'unrecognized_keys'
                    ? { message: O.errToObj(t).message ?? r }
                    : { message: r };
                },
              }
            : {}),
        })
      );
    }
    strip() {
      return new e({ ...this._def, unknownKeys: 'strip' });
    }
    passthrough() {
      return new e({ ...this._def, unknownKeys: 'passthrough' });
    }
    extend(t) {
      return new e({
        ...this._def,
        shape: () => ({ ...this._def.shape(), ...t }),
      });
    }
    merge(t) {
      return new e({
        unknownKeys: t._def.unknownKeys,
        catchall: t._def.catchall,
        shape: () => ({ ...this._def.shape(), ...t._def.shape() }),
        typeName: U.ZodObject,
      });
    }
    setKey(t, i) {
      return this.augment({ [t]: i });
    }
    catchall(t) {
      return new e({ ...this._def, catchall: t });
    }
    pick(t) {
      let i = {};
      for (let n of L.objectKeys(t))
        t[n] && this.shape[n] && (i[n] = this.shape[n]);
      return new e({ ...this._def, shape: () => i });
    }
    omit(t) {
      let i = {};
      for (let n of L.objectKeys(this.shape)) t[n] || (i[n] = this.shape[n]);
      return new e({ ...this._def, shape: () => i });
    }
    deepPartial() {
      return zt(this);
    }
    partial(t) {
      let i = {};
      for (let n of L.objectKeys(this.shape)) {
        let r = this.shape[n];
        t && !t[n] ? (i[n] = r) : (i[n] = r.optional());
      }
      return new e({ ...this._def, shape: () => i });
    }
    required(t) {
      let i = {};
      for (let n of L.objectKeys(this.shape))
        if (t && !t[n]) i[n] = this.shape[n];
        else {
          let o = this.shape[n];
          for (; o instanceof le; ) o = o._def.innerType;
          i[n] = o;
        }
      return new e({ ...this._def, shape: () => i });
    }
    keyof() {
      return bo(L.objectKeys(this.shape));
    }
  };
  ae.create = (e, t) =>
    new ae({
      shape: () => e,
      unknownKeys: 'strip',
      catchall: he.create(),
      typeName: U.ZodObject,
      ...A(t),
    });
  ae.strictCreate = (e, t) =>
    new ae({
      shape: () => e,
      unknownKeys: 'strict',
      catchall: he.create(),
      typeName: U.ZodObject,
      ...A(t),
    });
  ae.lazycreate = (e, t) =>
    new ae({
      shape: e,
      unknownKeys: 'strip',
      catchall: he.create(),
      typeName: U.ZodObject,
      ...A(t),
    });
  var Qe = class extends Z {
    _parse(t) {
      let { ctx: i } = this._processInputParams(t),
        n = this._def.options;
      function r(o) {
        for (let u of o) if (u.result.status === 'valid') return u.result;
        for (let u of o)
          if (u.result.status === 'dirty')
            return (i.common.issues.push(...u.ctx.common.issues), u.result);
        let s = o.map((u) => new re(u.ctx.common.issues));
        return (S(i, { code: b.invalid_union, unionErrors: s }), z);
      }
      if (i.common.async)
        return Promise.all(
          n.map(async (o) => {
            let s = { ...i, common: { ...i.common, issues: [] }, parent: null };
            return {
              result: await o._parseAsync({
                data: i.data,
                path: i.path,
                parent: s,
              }),
              ctx: s,
            };
          }),
        ).then(r);
      {
        let o,
          s = [];
        for (let a of n) {
          let c = { ...i, common: { ...i.common, issues: [] }, parent: null },
            m = a._parseSync({ data: i.data, path: i.path, parent: c });
          if (m.status === 'valid') return m;
          (m.status === 'dirty' && !o && (o = { result: m, ctx: c }),
            c.common.issues.length && s.push(c.common.issues));
        }
        if (o) return (i.common.issues.push(...o.ctx.common.issues), o.result);
        let u = s.map((a) => new re(a));
        return (S(i, { code: b.invalid_union, unionErrors: u }), z);
      }
    }
    get options() {
      return this._def.options;
    }
  };
  Qe.create = (e, t) => new Qe({ options: e, typeName: U.ZodUnion, ...A(t) });
  var ze = (e) =>
      e instanceof tt
        ? ze(e.schema)
        : e instanceof me
          ? ze(e.innerType())
          : e instanceof nt
            ? [e.value]
            : e instanceof it
              ? e.options
              : e instanceof rt
                ? L.objectValues(e.enum)
                : e instanceof at
                  ? ze(e._def.innerType)
                  : e instanceof Xe
                    ? [void 0]
                    : e instanceof Ye
                      ? [null]
                      : e instanceof le
                        ? [void 0, ...ze(e.unwrap())]
                        : e instanceof Ie
                          ? [null, ...ze(e.unwrap())]
                          : e instanceof qt || e instanceof st
                            ? ze(e.unwrap())
                            : e instanceof ot
                              ? ze(e._def.innerType)
                              : [],
    On = class e extends Z {
      _parse(t) {
        let { ctx: i } = this._processInputParams(t);
        if (i.parsedType !== x.object)
          return (
            S(i, {
              code: b.invalid_type,
              expected: x.object,
              received: i.parsedType,
            }),
            z
          );
        let n = this.discriminator,
          r = i.data[n],
          o = this.optionsMap.get(r);
        return o
          ? i.common.async
            ? o._parseAsync({ data: i.data, path: i.path, parent: i })
            : o._parseSync({ data: i.data, path: i.path, parent: i })
          : (S(i, {
              code: b.invalid_union_discriminator,
              options: Array.from(this.optionsMap.keys()),
              path: [n],
            }),
            z);
      }
      get discriminator() {
        return this._def.discriminator;
      }
      get options() {
        return this._def.options;
      }
      get optionsMap() {
        return this._def.optionsMap;
      }
      static create(t, i, n) {
        let r = new Map();
        for (let o of i) {
          let s = ze(o.shape[t]);
          if (!s.length)
            throw new Error(
              `A discriminator value for key \`${t}\` could not be extracted from all schema options`,
            );
          for (let u of s) {
            if (r.has(u))
              throw new Error(
                `Discriminator property ${String(t)} has duplicate value ${String(u)}`,
              );
            r.set(u, o);
          }
        }
        return new e({
          typeName: U.ZodDiscriminatedUnion,
          discriminator: t,
          options: i,
          optionsMap: r,
          ...A(n),
        });
      }
    };
  function Zi(e, t) {
    let i = Se(e),
      n = Se(t);
    if (e === t) return { valid: !0, data: e };
    if (i === x.object && n === x.object) {
      let r = L.objectKeys(t),
        o = L.objectKeys(e).filter((u) => r.indexOf(u) !== -1),
        s = { ...e, ...t };
      for (let u of o) {
        let a = Zi(e[u], t[u]);
        if (!a.valid) return { valid: !1 };
        s[u] = a.data;
      }
      return { valid: !0, data: s };
    } else if (i === x.array && n === x.array) {
      if (e.length !== t.length) return { valid: !1 };
      let r = [];
      for (let o = 0; o < e.length; o++) {
        let s = e[o],
          u = t[o],
          a = Zi(s, u);
        if (!a.valid) return { valid: !1 };
        r.push(a.data);
      }
      return { valid: !0, data: r };
    } else
      return i === x.date && n === x.date && +e == +t
        ? { valid: !0, data: e }
        : { valid: !1 };
  }
  var et = class extends Z {
    _parse(t) {
      let { status: i, ctx: n } = this._processInputParams(t),
        r = (o, s) => {
          if (In(o) || In(s)) return z;
          let u = Zi(o.value, s.value);
          return u.valid
            ? ((jn(o) || jn(s)) && i.dirty(),
              { status: i.value, value: u.data })
            : (S(n, { code: b.invalid_intersection_types }), z);
        };
      return n.common.async
        ? Promise.all([
            this._def.left._parseAsync({
              data: n.data,
              path: n.path,
              parent: n,
            }),
            this._def.right._parseAsync({
              data: n.data,
              path: n.path,
              parent: n,
            }),
          ]).then(([o, s]) => r(o, s))
        : r(
            this._def.left._parseSync({
              data: n.data,
              path: n.path,
              parent: n,
            }),
            this._def.right._parseSync({
              data: n.data,
              path: n.path,
              parent: n,
            }),
          );
    }
  };
  et.create = (e, t, i) =>
    new et({ left: e, right: t, typeName: U.ZodIntersection, ...A(i) });
  var xe = class e extends Z {
    _parse(t) {
      let { status: i, ctx: n } = this._processInputParams(t);
      if (n.parsedType !== x.array)
        return (
          S(n, {
            code: b.invalid_type,
            expected: x.array,
            received: n.parsedType,
          }),
          z
        );
      if (n.data.length < this._def.items.length)
        return (
          S(n, {
            code: b.too_small,
            minimum: this._def.items.length,
            inclusive: !0,
            exact: !1,
            type: 'array',
          }),
          z
        );
      !this._def.rest &&
        n.data.length > this._def.items.length &&
        (S(n, {
          code: b.too_big,
          maximum: this._def.items.length,
          inclusive: !0,
          exact: !1,
          type: 'array',
        }),
        i.dirty());
      let o = [...n.data]
        .map((s, u) => {
          let a = this._def.items[u] || this._def.rest;
          return a ? a._parse(new de(n, s, n.path, u)) : null;
        })
        .filter((s) => !!s);
      return n.common.async
        ? Promise.all(o).then((s) => X.mergeArray(i, s))
        : X.mergeArray(i, o);
    }
    get items() {
      return this._def.items;
    }
    rest(t) {
      return new e({ ...this._def, rest: t });
    }
  };
  xe.create = (e, t) => {
    if (!Array.isArray(e))
      throw new Error('You must pass an array of schemas to z.tuple([ ... ])');
    return new xe({ items: e, typeName: U.ZodTuple, rest: null, ...A(t) });
  };
  var zn = class e extends Z {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(t) {
        let { status: i, ctx: n } = this._processInputParams(t);
        if (n.parsedType !== x.object)
          return (
            S(n, {
              code: b.invalid_type,
              expected: x.object,
              received: n.parsedType,
            }),
            z
          );
        let r = [],
          o = this._def.keyType,
          s = this._def.valueType;
        for (let u in n.data)
          r.push({
            key: o._parse(new de(n, u, n.path, u)),
            value: s._parse(new de(n, n.data[u], n.path, u)),
            alwaysSet: u in n.data,
          });
        return n.common.async
          ? X.mergeObjectAsync(i, r)
          : X.mergeObjectSync(i, r);
      }
      get element() {
        return this._def.valueType;
      }
      static create(t, i, n) {
        return i instanceof Z
          ? new e({ keyType: t, valueType: i, typeName: U.ZodRecord, ...A(n) })
          : new e({
              keyType: Ae.create(),
              valueType: t,
              typeName: U.ZodRecord,
              ...A(i),
            });
      }
    },
    Pt = class extends Z {
      get keySchema() {
        return this._def.keyType;
      }
      get valueSchema() {
        return this._def.valueType;
      }
      _parse(t) {
        let { status: i, ctx: n } = this._processInputParams(t);
        if (n.parsedType !== x.map)
          return (
            S(n, {
              code: b.invalid_type,
              expected: x.map,
              received: n.parsedType,
            }),
            z
          );
        let r = this._def.keyType,
          o = this._def.valueType,
          s = [...n.data.entries()].map(([u, a], c) => ({
            key: r._parse(new de(n, u, n.path, [c, 'key'])),
            value: o._parse(new de(n, a, n.path, [c, 'value'])),
          }));
        if (n.common.async) {
          let u = new Map();
          return Promise.resolve().then(async () => {
            for (let a of s) {
              let c = await a.key,
                m = await a.value;
              if (c.status === 'aborted' || m.status === 'aborted') return z;
              ((c.status === 'dirty' || m.status === 'dirty') && i.dirty(),
                u.set(c.value, m.value));
            }
            return { status: i.value, value: u };
          });
        } else {
          let u = new Map();
          for (let a of s) {
            let c = a.key,
              m = a.value;
            if (c.status === 'aborted' || m.status === 'aborted') return z;
            ((c.status === 'dirty' || m.status === 'dirty') && i.dirty(),
              u.set(c.value, m.value));
          }
          return { status: i.value, value: u };
        }
      }
    };
  Pt.create = (e, t, i) =>
    new Pt({ valueType: t, keyType: e, typeName: U.ZodMap, ...A(i) });
  var Et = class e extends Z {
    _parse(t) {
      let { status: i, ctx: n } = this._processInputParams(t);
      if (n.parsedType !== x.set)
        return (
          S(n, {
            code: b.invalid_type,
            expected: x.set,
            received: n.parsedType,
          }),
          z
        );
      let r = this._def;
      (r.minSize !== null &&
        n.data.size < r.minSize.value &&
        (S(n, {
          code: b.too_small,
          minimum: r.minSize.value,
          type: 'set',
          inclusive: !0,
          exact: !1,
          message: r.minSize.message,
        }),
        i.dirty()),
        r.maxSize !== null &&
          n.data.size > r.maxSize.value &&
          (S(n, {
            code: b.too_big,
            maximum: r.maxSize.value,
            type: 'set',
            inclusive: !0,
            exact: !1,
            message: r.maxSize.message,
          }),
          i.dirty()));
      let o = this._def.valueType;
      function s(a) {
        let c = new Set();
        for (let m of a) {
          if (m.status === 'aborted') return z;
          (m.status === 'dirty' && i.dirty(), c.add(m.value));
        }
        return { status: i.value, value: c };
      }
      let u = [...n.data.values()].map((a, c) =>
        o._parse(new de(n, a, n.path, c)),
      );
      return n.common.async ? Promise.all(u).then((a) => s(a)) : s(u);
    }
    min(t, i) {
      return new e({
        ...this._def,
        minSize: { value: t, message: O.toString(i) },
      });
    }
    max(t, i) {
      return new e({
        ...this._def,
        maxSize: { value: t, message: O.toString(i) },
      });
    }
    size(t, i) {
      return this.min(t, i).max(t, i);
    }
    nonempty(t) {
      return this.min(1, t);
    }
  };
  Et.create = (e, t) =>
    new Et({
      valueType: e,
      minSize: null,
      maxSize: null,
      typeName: U.ZodSet,
      ...A(t),
    });
  var Nn = class e extends Z {
      constructor() {
        (super(...arguments), (this.validate = this.implement));
      }
      _parse(t) {
        let { ctx: i } = this._processInputParams(t);
        if (i.parsedType !== x.function)
          return (
            S(i, {
              code: b.invalid_type,
              expected: x.function,
              received: i.parsedType,
            }),
            z
          );
        function n(u, a) {
          return Wt({
            data: u,
            path: i.path,
            errorMaps: [
              i.common.contextualErrorMap,
              i.schemaErrorMap,
              jt(),
              Oe,
            ].filter((c) => !!c),
            issueData: { code: b.invalid_arguments, argumentsError: a },
          });
        }
        function r(u, a) {
          return Wt({
            data: u,
            path: i.path,
            errorMaps: [
              i.common.contextualErrorMap,
              i.schemaErrorMap,
              jt(),
              Oe,
            ].filter((c) => !!c),
            issueData: { code: b.invalid_return_type, returnTypeError: a },
          });
        }
        let o = { errorMap: i.common.contextualErrorMap },
          s = i.data;
        if (this._def.returns instanceof Re) {
          let u = this;
          return Y(async function (...a) {
            let c = new re([]),
              m = await u._def.args.parseAsync(a, o).catch((h) => {
                throw (c.addIssue(n(a, h)), c);
              }),
              p = await Reflect.apply(s, this, m);
            return await u._def.returns._def.type
              .parseAsync(p, o)
              .catch((h) => {
                throw (c.addIssue(r(p, h)), c);
              });
          });
        } else {
          let u = this;
          return Y(function (...a) {
            let c = u._def.args.safeParse(a, o);
            if (!c.success) throw new re([n(a, c.error)]);
            let m = Reflect.apply(s, this, c.data),
              p = u._def.returns.safeParse(m, o);
            if (!p.success) throw new re([r(m, p.error)]);
            return p.data;
          });
        }
      }
      parameters() {
        return this._def.args;
      }
      returnType() {
        return this._def.returns;
      }
      args(...t) {
        return new e({ ...this._def, args: xe.create(t).rest(Ne.create()) });
      }
      returns(t) {
        return new e({ ...this._def, returns: t });
      }
      implement(t) {
        return this.parse(t);
      }
      strictImplement(t) {
        return this.parse(t);
      }
      static create(t, i, n) {
        return new e({
          args: t || xe.create([]).rest(Ne.create()),
          returns: i || Ne.create(),
          typeName: U.ZodFunction,
          ...A(n),
        });
      }
    },
    tt = class extends Z {
      get schema() {
        return this._def.getter();
      }
      _parse(t) {
        let { ctx: i } = this._processInputParams(t);
        return this._def
          .getter()
          ._parse({ data: i.data, path: i.path, parent: i });
      }
    };
  tt.create = (e, t) => new tt({ getter: e, typeName: U.ZodLazy, ...A(t) });
  var nt = class extends Z {
    _parse(t) {
      if (t.data !== this._def.value) {
        let i = this._getOrReturnCtx(t);
        return (
          S(i, {
            received: i.data,
            code: b.invalid_literal,
            expected: this._def.value,
          }),
          z
        );
      }
      return { status: 'valid', value: t.data };
    }
    get value() {
      return this._def.value;
    }
  };
  nt.create = (e, t) => new nt({ value: e, typeName: U.ZodLiteral, ...A(t) });
  function bo(e, t) {
    return new it({ values: e, typeName: U.ZodEnum, ...A(t) });
  }
  var it = class e extends Z {
    _parse(t) {
      if (typeof t.data != 'string') {
        let i = this._getOrReturnCtx(t),
          n = this._def.values;
        return (
          S(i, {
            expected: L.joinValues(n),
            received: i.parsedType,
            code: b.invalid_type,
          }),
          z
        );
      }
      if (
        (this._cache || (this._cache = new Set(this._def.values)),
        !this._cache.has(t.data))
      ) {
        let i = this._getOrReturnCtx(t),
          n = this._def.values;
        return (
          S(i, { received: i.data, code: b.invalid_enum_value, options: n }),
          z
        );
      }
      return Y(t.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      let t = {};
      for (let i of this._def.values) t[i] = i;
      return t;
    }
    get Values() {
      let t = {};
      for (let i of this._def.values) t[i] = i;
      return t;
    }
    get Enum() {
      let t = {};
      for (let i of this._def.values) t[i] = i;
      return t;
    }
    extract(t, i = this._def) {
      return e.create(t, { ...this._def, ...i });
    }
    exclude(t, i = this._def) {
      return e.create(
        this.options.filter((n) => !t.includes(n)),
        { ...this._def, ...i },
      );
    }
  };
  it.create = bo;
  var rt = class extends Z {
    _parse(t) {
      let i = L.getValidEnumValues(this._def.values),
        n = this._getOrReturnCtx(t);
      if (n.parsedType !== x.string && n.parsedType !== x.number) {
        let r = L.objectValues(i);
        return (
          S(n, {
            expected: L.joinValues(r),
            received: n.parsedType,
            code: b.invalid_type,
          }),
          z
        );
      }
      if (
        (this._cache ||
          (this._cache = new Set(L.getValidEnumValues(this._def.values))),
        !this._cache.has(t.data))
      ) {
        let r = L.objectValues(i);
        return (
          S(n, { received: n.data, code: b.invalid_enum_value, options: r }),
          z
        );
      }
      return Y(t.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  rt.create = (e, t) =>
    new rt({ values: e, typeName: U.ZodNativeEnum, ...A(t) });
  var Re = class extends Z {
    unwrap() {
      return this._def.type;
    }
    _parse(t) {
      let { ctx: i } = this._processInputParams(t);
      if (i.parsedType !== x.promise && i.common.async === !1)
        return (
          S(i, {
            code: b.invalid_type,
            expected: x.promise,
            received: i.parsedType,
          }),
          z
        );
      let n = i.parsedType === x.promise ? i.data : Promise.resolve(i.data);
      return Y(
        n.then((r) =>
          this._def.type.parseAsync(r, {
            path: i.path,
            errorMap: i.common.contextualErrorMap,
          }),
        ),
      );
    }
  };
  Re.create = (e, t) => new Re({ type: e, typeName: U.ZodPromise, ...A(t) });
  var me = class extends Z {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === U.ZodEffects
        ? this._def.schema.sourceType()
        : this._def.schema;
    }
    _parse(t) {
      let { status: i, ctx: n } = this._processInputParams(t),
        r = this._def.effect || null,
        o = {
          addIssue: (s) => {
            (S(n, s), s.fatal ? i.abort() : i.dirty());
          },
          get path() {
            return n.path;
          },
        };
      if (((o.addIssue = o.addIssue.bind(o)), r.type === 'preprocess')) {
        let s = r.transform(n.data, o);
        if (n.common.async)
          return Promise.resolve(s).then(async (u) => {
            if (i.value === 'aborted') return z;
            let a = await this._def.schema._parseAsync({
              data: u,
              path: n.path,
              parent: n,
            });
            return a.status === 'aborted'
              ? z
              : a.status === 'dirty'
                ? qe(a.value)
                : i.value === 'dirty'
                  ? qe(a.value)
                  : a;
          });
        {
          if (i.value === 'aborted') return z;
          let u = this._def.schema._parseSync({
            data: s,
            path: n.path,
            parent: n,
          });
          return u.status === 'aborted'
            ? z
            : u.status === 'dirty'
              ? qe(u.value)
              : i.value === 'dirty'
                ? qe(u.value)
                : u;
        }
      }
      if (r.type === 'refinement') {
        let s = (u) => {
          let a = r.refinement(u, o);
          if (n.common.async) return Promise.resolve(a);
          if (a instanceof Promise)
            throw new Error(
              'Async refinement encountered during synchronous parse operation. Use .parseAsync instead.',
            );
          return u;
        };
        if (n.common.async === !1) {
          let u = this._def.schema._parseSync({
            data: n.data,
            path: n.path,
            parent: n,
          });
          return u.status === 'aborted'
            ? z
            : (u.status === 'dirty' && i.dirty(),
              s(u.value),
              { status: i.value, value: u.value });
        } else
          return this._def.schema
            ._parseAsync({ data: n.data, path: n.path, parent: n })
            .then((u) =>
              u.status === 'aborted'
                ? z
                : (u.status === 'dirty' && i.dirty(),
                  s(u.value).then(() => ({ status: i.value, value: u.value }))),
            );
      }
      if (r.type === 'transform')
        if (n.common.async === !1) {
          let s = this._def.schema._parseSync({
            data: n.data,
            path: n.path,
            parent: n,
          });
          if (!Ce(s)) return z;
          let u = r.transform(s.value, o);
          if (u instanceof Promise)
            throw new Error(
              'Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.',
            );
          return { status: i.value, value: u };
        } else
          return this._def.schema
            ._parseAsync({ data: n.data, path: n.path, parent: n })
            .then((s) =>
              Ce(s)
                ? Promise.resolve(r.transform(s.value, o)).then((u) => ({
                    status: i.value,
                    value: u,
                  }))
                : z,
            );
      L.assertNever(r);
    }
  };
  me.create = (e, t, i) =>
    new me({ schema: e, typeName: U.ZodEffects, effect: t, ...A(i) });
  me.createWithPreprocess = (e, t, i) =>
    new me({
      schema: t,
      effect: { type: 'preprocess', transform: e },
      typeName: U.ZodEffects,
      ...A(i),
    });
  var le = class extends Z {
    _parse(t) {
      return this._getType(t) === x.undefined
        ? Y(void 0)
        : this._def.innerType._parse(t);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  le.create = (e, t) =>
    new le({ innerType: e, typeName: U.ZodOptional, ...A(t) });
  var Ie = class extends Z {
    _parse(t) {
      return this._getType(t) === x.null
        ? Y(null)
        : this._def.innerType._parse(t);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  Ie.create = (e, t) =>
    new Ie({ innerType: e, typeName: U.ZodNullable, ...A(t) });
  var at = class extends Z {
    _parse(t) {
      let { ctx: i } = this._processInputParams(t),
        n = i.data;
      return (
        i.parsedType === x.undefined && (n = this._def.defaultValue()),
        this._def.innerType._parse({ data: n, path: i.path, parent: i })
      );
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  at.create = (e, t) =>
    new at({
      innerType: e,
      typeName: U.ZodDefault,
      defaultValue:
        typeof t.default == 'function' ? t.default : () => t.default,
      ...A(t),
    });
  var ot = class extends Z {
    _parse(t) {
      let { ctx: i } = this._processInputParams(t),
        n = { ...i, common: { ...i.common, issues: [] } },
        r = this._def.innerType._parse({
          data: n.data,
          path: n.path,
          parent: { ...n },
        });
      return Ot(r)
        ? r.then((o) => ({
            status: 'valid',
            value:
              o.status === 'valid'
                ? o.value
                : this._def.catchValue({
                    get error() {
                      return new re(n.common.issues);
                    },
                    input: n.data,
                  }),
          }))
        : {
            status: 'valid',
            value:
              r.status === 'valid'
                ? r.value
                : this._def.catchValue({
                    get error() {
                      return new re(n.common.issues);
                    },
                    input: n.data,
                  }),
          };
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  ot.create = (e, t) =>
    new ot({
      innerType: e,
      typeName: U.ZodCatch,
      catchValue: typeof t.catch == 'function' ? t.catch : () => t.catch,
      ...A(t),
    });
  var Dt = class extends Z {
    _parse(t) {
      if (this._getType(t) !== x.nan) {
        let n = this._getOrReturnCtx(t);
        return (
          S(n, {
            code: b.invalid_type,
            expected: x.nan,
            received: n.parsedType,
          }),
          z
        );
      }
      return { status: 'valid', value: t.data };
    }
  };
  Dt.create = (e) => new Dt({ typeName: U.ZodNaN, ...A(e) });
  var dp = Symbol('zod_brand'),
    qt = class extends Z {
      _parse(t) {
        let { ctx: i } = this._processInputParams(t),
          n = i.data;
        return this._def.type._parse({ data: n, path: i.path, parent: i });
      }
      unwrap() {
        return this._def.type;
      }
    },
    Bt = class e extends Z {
      _parse(t) {
        let { status: i, ctx: n } = this._processInputParams(t);
        if (n.common.async)
          return (async () => {
            let o = await this._def.in._parseAsync({
              data: n.data,
              path: n.path,
              parent: n,
            });
            return o.status === 'aborted'
              ? z
              : o.status === 'dirty'
                ? (i.dirty(), qe(o.value))
                : this._def.out._parseAsync({
                    data: o.value,
                    path: n.path,
                    parent: n,
                  });
          })();
        {
          let r = this._def.in._parseSync({
            data: n.data,
            path: n.path,
            parent: n,
          });
          return r.status === 'aborted'
            ? z
            : r.status === 'dirty'
              ? (i.dirty(), { status: 'dirty', value: r.value })
              : this._def.out._parseSync({
                  data: r.value,
                  path: n.path,
                  parent: n,
                });
        }
      }
      static create(t, i) {
        return new e({ in: t, out: i, typeName: U.ZodPipeline });
      }
    },
    st = class extends Z {
      _parse(t) {
        let i = this._def.innerType._parse(t),
          n = (r) => (Ce(r) && (r.value = Object.freeze(r.value)), r);
        return Ot(i) ? i.then((r) => n(r)) : n(i);
      }
      unwrap() {
        return this._def.innerType;
      }
    };
  st.create = (e, t) =>
    new st({ innerType: e, typeName: U.ZodReadonly, ...A(t) });
  function fo(e, t) {
    let i =
      typeof e == 'function' ? e(t) : typeof e == 'string' ? { message: e } : e;
    return typeof i == 'string' ? { message: i } : i;
  }
  function yo(e, t = {}, i) {
    return e
      ? Ze.create().superRefine((n, r) => {
          let o = e(n);
          if (o instanceof Promise)
            return o.then((s) => {
              if (!s) {
                let u = fo(t, n),
                  a = u.fatal ?? i ?? !0;
                r.addIssue({ code: 'custom', ...u, fatal: a });
              }
            });
          if (!o) {
            let s = fo(t, n),
              u = s.fatal ?? i ?? !0;
            r.addIssue({ code: 'custom', ...s, fatal: u });
          }
        })
      : Ze.create();
  }
  var mp = { object: ae.lazycreate },
    U;
  (function (e) {
    ((e.ZodString = 'ZodString'),
      (e.ZodNumber = 'ZodNumber'),
      (e.ZodNaN = 'ZodNaN'),
      (e.ZodBigInt = 'ZodBigInt'),
      (e.ZodBoolean = 'ZodBoolean'),
      (e.ZodDate = 'ZodDate'),
      (e.ZodSymbol = 'ZodSymbol'),
      (e.ZodUndefined = 'ZodUndefined'),
      (e.ZodNull = 'ZodNull'),
      (e.ZodAny = 'ZodAny'),
      (e.ZodUnknown = 'ZodUnknown'),
      (e.ZodNever = 'ZodNever'),
      (e.ZodVoid = 'ZodVoid'),
      (e.ZodArray = 'ZodArray'),
      (e.ZodObject = 'ZodObject'),
      (e.ZodUnion = 'ZodUnion'),
      (e.ZodDiscriminatedUnion = 'ZodDiscriminatedUnion'),
      (e.ZodIntersection = 'ZodIntersection'),
      (e.ZodTuple = 'ZodTuple'),
      (e.ZodRecord = 'ZodRecord'),
      (e.ZodMap = 'ZodMap'),
      (e.ZodSet = 'ZodSet'),
      (e.ZodFunction = 'ZodFunction'),
      (e.ZodLazy = 'ZodLazy'),
      (e.ZodLiteral = 'ZodLiteral'),
      (e.ZodEnum = 'ZodEnum'),
      (e.ZodEffects = 'ZodEffects'),
      (e.ZodNativeEnum = 'ZodNativeEnum'),
      (e.ZodOptional = 'ZodOptional'),
      (e.ZodNullable = 'ZodNullable'),
      (e.ZodDefault = 'ZodDefault'),
      (e.ZodCatch = 'ZodCatch'),
      (e.ZodPromise = 'ZodPromise'),
      (e.ZodBranded = 'ZodBranded'),
      (e.ZodPipeline = 'ZodPipeline'),
      (e.ZodReadonly = 'ZodReadonly'));
  })(U || (U = {}));
  var pp = (e, t = { message: `Input not instance of ${e.name}` }) =>
      yo((i) => i instanceof e, t),
    _o = Ae.create,
    $o = Be.create,
    fp = Dt.create,
    vp = Ge.create,
    ko = Ke.create,
    gp = He.create,
    hp = Nt.create,
    bp = Xe.create,
    yp = Ye.create,
    _p = Ze.create,
    $p = Ne.create,
    kp = he.create,
    wp = Ut.create,
    Sp = Ue.create,
    xp = ae.create,
    Ip = ae.strictCreate,
    jp = Qe.create,
    Op = On.create,
    zp = et.create,
    Np = xe.create,
    Up = zn.create,
    Pp = Pt.create,
    Ep = Et.create,
    Dp = Nn.create,
    Tp = tt.create,
    Cp = nt.create,
    Ap = it.create,
    Zp = rt.create,
    Rp = Re.create,
    Lp = me.create,
    Jp = le.create,
    Mp = Ie.create,
    Vp = me.createWithPreprocess,
    Fp = Bt.create,
    Wp = () => _o().optional(),
    qp = () => $o().optional(),
    Bp = () => ko().optional(),
    Gp = {
      string: (e) => Ae.create({ ...e, coerce: !0 }),
      number: (e) => Be.create({ ...e, coerce: !0 }),
      boolean: (e) => Ke.create({ ...e, coerce: !0 }),
      bigint: (e) => Ge.create({ ...e, coerce: !0 }),
      date: (e) => He.create({ ...e, coerce: !0 }),
    };
  var Kp = z;
  var Hp = Object.defineProperty,
    lt = (e, t) => {
      for (var i in t) Hp(e, i, { get: t[i], enumerable: !0 });
    };
  function D(e, t, i = 'draft-7') {
    return d.toJSONSchema(e, { target: i });
  }
  var ut = d.string(),
    Xp = d.number(),
    lk = d.boolean(),
    Gt = d.string().min(1),
    Ri = d.number().int().positive(),
    Li = d.number().int().nonnegative(),
    xo = d.number().describe('Tagging version number'),
    Yp = d.union([d.string(), d.number(), d.boolean()]),
    dk = Yp.optional(),
    Qp = {};
  lt(Qp, {
    ErrorHandlerSchema: () => dt,
    HandlerSchema: () => Oo,
    LogHandlerSchema: () => Tt,
    StorageSchema: () => jo,
    StorageTypeSchema: () => Io,
    errorHandlerJsonSchema: () => nf,
    handlerJsonSchema: () => af,
    logHandlerJsonSchema: () => rf,
    storageJsonSchema: () => tf,
    storageTypeJsonSchema: () => ef,
  });
  var Io = d
      .enum(['local', 'session', 'cookie'])
      .describe('Storage mechanism: local, session, or cookie'),
    jo = d
      .object({
        Local: d.literal('local'),
        Session: d.literal('session'),
        Cookie: d.literal('cookie'),
      })
      .describe('Storage type constants for type-safe references'),
    dt = d.any().describe('Error handler function: (error, state?) => void'),
    Tt = d.any().describe('Log handler function: (message, verbose?) => void'),
    Oo = d
      .object({
        Error: dt.describe('Error handler function'),
        Log: Tt.describe('Log handler function'),
      })
      .describe('Handler interface with error and log functions'),
    ef = D(Io),
    tf = D(jo),
    nf = D(dt),
    rf = D(Tt),
    af = D(Oo),
    mk = d
      .object({
        onError: dt
          .optional()
          .describe('Error handler function: (error, state?) => void'),
        onLog: Tt.optional().describe(
          'Log handler function: (message, verbose?) => void',
        ),
      })
      .partial(),
    pk = d
      .object({
        verbose: d
          .boolean()
          .describe('Enable verbose logging for debugging')
          .optional(),
      })
      .partial(),
    fk = d
      .object({
        queue: d
          .boolean()
          .describe('Whether to queue events when consent is not granted')
          .optional(),
      })
      .partial(),
    vk = d.object({}).partial(),
    gk = d
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
    hk = d
      .object({
        disabled: d.boolean().describe('Set to true to disable').optional(),
      })
      .partial(),
    bk = d
      .object({
        primary: d
          .boolean()
          .describe('Mark as primary (only one can be primary)')
          .optional(),
      })
      .partial(),
    yk = d
      .object({
        settings: d
          .any()
          .optional()
          .describe('Implementation-specific configuration'),
      })
      .partial(),
    _k = d
      .object({
        env: d
          .any()
          .optional()
          .describe('Environment dependencies (platform-specific)'),
      })
      .partial();
  var $k = d
      .object({
        type: d.string().optional().describe('Instance type identifier'),
        config: d.unknown().describe('Instance configuration'),
      })
      .partial(),
    kk = d
      .object({
        collector: d.unknown().describe('Collector instance (runtime object)'),
        config: d.unknown().describe('Configuration'),
        env: d.unknown().describe('Environment dependencies'),
      })
      .partial(),
    wk = d
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
    Sk = d
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
    xk = d
      .object({
        sources: d
          .record(d.string(), d.unknown())
          .describe('Map of source instances'),
      })
      .partial(),
    Ik = d
      .object({
        destinations: d
          .record(d.string(), d.unknown())
          .describe('Map of destination instances'),
      })
      .partial(),
    of = {};
  lt(of, {
    ConsentSchema: () => Ee,
    DeepPartialEventSchema: () => sf,
    EntitiesSchema: () => Po,
    EntitySchema: () => Dn,
    EventSchema: () => be,
    OrderedPropertiesSchema: () => En,
    PartialEventSchema: () => Eo,
    PropertiesSchema: () => Q,
    PropertySchema: () => Pn,
    PropertyTypeSchema: () => Ji,
    SourceSchema: () => Uo,
    SourceTypeSchema: () => Vi,
    UserSchema: () => Ht,
    VersionSchema: () => No,
    consentJsonSchema: () => vf,
    entityJsonSchema: () => pf,
    eventJsonSchema: () => uf,
    orderedPropertiesJsonSchema: () => mf,
    partialEventJsonSchema: () => cf,
    propertiesJsonSchema: () => df,
    sourceTypeJsonSchema: () => ff,
    userJsonSchema: () => lf,
  });
  var zo,
    Ji = d.lazy(() =>
      d.union([d.boolean(), d.string(), d.number(), d.record(d.string(), Pn)]),
    ),
    Pn = d.lazy(() => d.union([Ji, d.array(Ji)])),
    Q = d
      .record(d.string(), Pn.optional())
      .describe('Flexible property collection with optional values'),
    En = d
      .record(d.string(), d.tuple([Pn, d.number()]).optional())
      .describe(
        'Ordered properties with [value, order] tuples for priority control',
      ),
    Vi = d
      .union([d.enum(['web', 'server', 'app', 'other']), d.string()])
      .describe('Source type: web, server, app, other, or custom'),
    Ee = d
      .record(d.string(), d.boolean())
      .describe('Consent requirement mapping (group name → state)'),
    Ht = Q.and(
      d.object({
        id: d.string().optional().describe('User identifier'),
        device: d.string().optional().describe('Device identifier'),
        session: d.string().optional().describe('Session identifier'),
        hash: d.string().optional().describe('Hashed identifier'),
        address: d.string().optional().describe('User address'),
        email: d.string().email().optional().describe('User email address'),
        phone: d.string().optional().describe('User phone number'),
        userAgent: d.string().optional().describe('Browser user agent string'),
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
    ).describe('User identification and properties'),
    No = Q.and(
      d.object({
        source: ut.describe('Walker implementation version (e.g., "2.0.0")'),
        tagging: xo,
      }),
    ).describe('Walker version information'),
    Uo = Q.and(
      d.object({
        type: Vi.describe('Source type identifier'),
        id: ut.describe('Source identifier (typically URL on web)'),
        previous_id: ut.describe(
          'Previous source identifier (typically referrer on web)',
        ),
      }),
    ).describe('Event source information'),
    Dn = d
      .lazy(() =>
        d.object({
          entity: d.string().describe('Entity name'),
          data: Q.describe('Entity-specific properties'),
          nested: d.array(Dn).describe('Nested child entities'),
          context: En.describe('Entity context data'),
        }),
      )
      .describe('Nested entity structure with recursive nesting support'),
    Po = d.array(Dn).describe('Array of nested entities'),
    be = d
      .object({
        name: d
          .string()
          .describe(
            'Event name in "entity action" format (e.g., "page view", "product add")',
          ),
        data: Q.describe('Event-specific properties'),
        context: En.describe('Ordered context properties with priorities'),
        globals: Q.describe('Global properties shared across events'),
        custom: Q.describe('Custom implementation-specific properties'),
        user: Ht.describe('User identification and attributes'),
        nested: Po.describe('Related nested entities'),
        consent: Ee.describe('Consent states at event time'),
        id: Gt.describe('Unique event identifier (timestamp-based)'),
        trigger: ut.describe('Event trigger identifier'),
        entity: ut.describe('Parsed entity from event name'),
        action: ut.describe('Parsed action from event name'),
        timestamp: Ri.describe('Unix timestamp in milliseconds since epoch'),
        timing: Xp.describe('Event processing timing information'),
        group: ut.describe('Event grouping identifier'),
        count: Li.describe('Event count in session'),
        version: No.describe('Walker version information'),
        source: Uo.describe('Event source information'),
      })
      .describe('Complete walkerOS event structure'),
    Eo = be
      .partial()
      .describe('Partial event structure with all fields optional'),
    sf = be
      .partial()
      .describe('Partial event structure with all top-level fields optional'),
    uf = D(be),
    cf = D(Eo),
    lf = D(Ht),
    df = D(Q),
    mf = D(En),
    pf = D(Dn),
    ff = D(Vi),
    vf = D(Ee),
    gf = {};
  lt(gf, {
    ConfigSchema: () => An,
    LoopSchema: () => Fi,
    MapSchema: () => qi,
    PolicySchema: () => Ct,
    ResultSchema: () => hf,
    RuleSchema: () => Le,
    RulesSchema: () => Cn,
    SetSchema: () => Wi,
    ValueConfigSchema: () => Do,
    ValueSchema: () => pe,
    ValuesSchema: () => Tn,
    configJsonSchema: () => If,
    loopJsonSchema: () => _f,
    mapJsonSchema: () => kf,
    policyJsonSchema: () => wf,
    ruleJsonSchema: () => Sf,
    rulesJsonSchema: () => xf,
    setJsonSchema: () => $f,
    valueConfigJsonSchema: () => yf,
    valueJsonSchema: () => bf,
  });
  var pe = d.lazy(() =>
      d.union([
        d.string().describe('String value or property path (e.g., "data.id")'),
        d.number().describe('Numeric value'),
        d.boolean().describe('Boolean value'),
        d.lazy(() => zo),
        d.array(pe).describe('Array of values'),
      ]),
    ),
    Tn = d.array(pe).describe('Array of transformation values'),
    Fi = d.lazy(() =>
      d
        .tuple([pe, pe])
        .describe(
          'Loop transformation: [source, transform] tuple for array processing',
        ),
    ),
    Wi = d.lazy(() =>
      d.array(pe).describe('Set: Array of values for selection or combination'),
    ),
    qi = d.lazy(() =>
      d
        .record(d.string(), pe)
        .describe('Map: Object mapping keys to transformation values'),
    ),
    Do = (zo = d
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
        map: qi
          .optional()
          .describe(
            'Object mapping: transform event data to structured output',
          ),
        loop: Fi.optional().describe(
          'Loop transformation: [source, transform] for array processing',
        ),
        set: Wi.optional().describe(
          'Set of values: combine or select from multiple values',
        ),
        consent: Ee.optional().describe(
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
    Ct = d
      .record(d.string(), pe)
      .describe('Policy rules for event pre-processing (key → value mapping)'),
    Le = d
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
        consent: Ee.optional().describe(
          'Required consent states to process this event',
        ),
        settings: d
          .any()
          .optional()
          .describe('Destination-specific settings for this event mapping'),
        data: d
          .union([pe, Tn])
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
        policy: Ct.optional().describe(
          'Event-level policy overrides (applied after config-level policy)',
        ),
      })
      .describe('Mapping rule for specific entity-action combination'),
    Cn = d
      .record(
        d.string(),
        d.record(d.string(), d.union([Le, d.array(Le)])).optional(),
      )
      .describe(
        'Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support',
      ),
    An = d
      .object({
        consent: Ee.optional().describe(
          'Required consent states to process any events',
        ),
        data: d
          .union([pe, Tn])
          .optional()
          .describe('Global data transformation applied to all events'),
        mapping: Cn.optional().describe('Entity-action specific mapping rules'),
        policy: Ct.optional().describe(
          'Pre-processing policy rules applied before mapping',
        ),
      })
      .describe('Shared mapping configuration for sources and destinations'),
    hf = d
      .object({
        eventMapping: Le.optional().describe('Resolved mapping rule for event'),
        mappingKey: d
          .string()
          .optional()
          .describe('Mapping key used (e.g., "product.view")'),
      })
      .describe('Mapping resolution result'),
    bf = D(pe),
    yf = D(Do),
    _f = D(Fi),
    $f = D(Wi),
    kf = D(qi),
    wf = D(Ct),
    Sf = D(Le),
    xf = D(Cn),
    If = D(An),
    jf = {};
  lt(jf, {
    BatchSchema: () => Co,
    ConfigSchema: () => Xt,
    ContextSchema: () => Gi,
    DLQSchema: () => Tf,
    DataSchema: () => Uf,
    DestinationPolicySchema: () => Of,
    DestinationsSchema: () => Ef,
    InitDestinationsSchema: () => Pf,
    InitSchema: () => Ao,
    InstanceSchema: () => Yt,
    PartialConfigSchema: () => Bi,
    PushBatchContextSchema: () => zf,
    PushContextSchema: () => Ki,
    PushEventSchema: () => To,
    PushEventsSchema: () => Nf,
    PushResultSchema: () => Df,
    RefSchema: () => Un,
    ResultSchema: () => Zo,
    batchJsonSchema: () => Lf,
    configJsonSchema: () => Cf,
    contextJsonSchema: () => Zf,
    instanceJsonSchema: () => Jf,
    partialConfigJsonSchema: () => Af,
    pushContextJsonSchema: () => Rf,
    resultJsonSchema: () => Mf,
  });
  var Xt = d
      .object({
        consent: Ee.optional().describe(
          'Required consent states to send events to this destination',
        ),
        settings: d
          .any()
          .describe('Implementation-specific configuration')
          .optional(),
        data: d
          .union([pe, Tn])
          .optional()
          .describe(
            'Global data transformation applied to all events for this destination',
          ),
        env: d
          .any()
          .describe('Environment dependencies (platform-specific)')
          .optional(),
        id: Gt.describe(
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
        mapping: Cn.optional().describe(
          'Entity-action specific mapping rules for this destination',
        ),
        policy: Ct.optional().describe(
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
        onError: dt.optional(),
        onLog: Tt.optional(),
      })
      .describe('Destination configuration'),
    Bi = Xt.partial().describe(
      'Partial destination configuration with all fields optional',
    ),
    Of = Ct.describe('Destination policy rules for event pre-processing'),
    Gi = d
      .object({
        collector: d.unknown().describe('Collector instance (runtime object)'),
        config: Xt.describe('Destination configuration'),
        data: d
          .union([d.unknown(), d.array(d.unknown())])
          .optional()
          .describe('Transformed event data'),
        env: d.unknown().describe('Environment dependencies'),
      })
      .describe('Destination context for init and push functions'),
    Ki = Gi.extend({
      mapping: Le.optional().describe(
        'Resolved mapping rule for this specific event',
      ),
    }).describe('Push context with event-specific mapping'),
    zf = Ki.describe('Batch push context with event-specific mapping'),
    To = d
      .object({
        event: be.describe('The event to process'),
        mapping: Le.optional().describe('Mapping rule for this event'),
      })
      .describe('Event with optional mapping for batch processing'),
    Nf = d.array(To).describe('Array of events with mappings'),
    Co = d
      .object({
        key: d
          .string()
          .describe('Batch key (usually mapping key like "product.view")'),
        events: d.array(be).describe('Array of events in batch'),
        data: d
          .array(d.union([d.unknown(), d.array(d.unknown())]).optional())
          .describe('Transformed data for each event'),
        mapping: Le.optional().describe('Shared mapping rule for batch'),
      })
      .describe('Batch of events grouped by mapping key'),
    Uf = d
      .union([d.unknown(), d.array(d.unknown())])
      .optional()
      .describe('Transformed event data (Property, undefined, or array)'),
    Yt = d
      .object({
        config: Xt.describe('Destination configuration'),
        queue: d
          .array(be)
          .optional()
          .describe('Queued events awaiting consent'),
        dlq: d
          .array(d.tuple([be, d.unknown()]))
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
    Ao = d
      .object({
        code: Yt.describe('Destination instance with implementation'),
        config: Bi.optional().describe('Partial configuration overrides'),
        env: d.unknown().optional().describe('Partial environment overrides'),
      })
      .describe('Destination initialization configuration'),
    Pf = d
      .record(d.string(), Ao)
      .describe('Map of destination IDs to initialization configurations'),
    Ef = d
      .record(d.string(), Yt)
      .describe('Map of destination IDs to runtime instances'),
    Un = d
      .object({
        id: d.string().describe('Destination ID'),
        destination: Yt.describe('Destination instance'),
      })
      .describe('Destination reference (ID + instance)'),
    Df = d
      .object({
        queue: d
          .array(be)
          .optional()
          .describe('Events queued (awaiting consent)'),
        error: d.unknown().optional().describe('Error if push failed'),
      })
      .describe('Push operation result'),
    Zo = d
      .object({
        successful: d
          .array(Un)
          .describe('Destinations that processed successfully'),
        queued: d.array(Un).describe('Destinations that queued events'),
        failed: d.array(Un).describe('Destinations that failed to process'),
      })
      .describe('Overall destination processing result'),
    Tf = d
      .array(d.tuple([be, d.unknown()]))
      .describe('Dead letter queue: [(event, error), ...]'),
    Cf = D(Xt),
    Af = D(Bi),
    Zf = D(Gi),
    Rf = D(Ki),
    Lf = D(Co),
    Jf = D(Yt),
    Mf = D(Zo),
    Vf = {};
  lt(Vf, {
    CommandTypeSchema: () => Ro,
    ConfigSchema: () => Zn,
    DestinationsSchema: () => Vo,
    InitConfigSchema: () => Lo,
    InstanceSchema: () => Fo,
    PushContextSchema: () => Jo,
    SessionDataSchema: () => Hi,
    SourcesSchema: () => Mo,
    commandTypeJsonSchema: () => Ff,
    configJsonSchema: () => Wf,
    initConfigJsonSchema: () => Bf,
    instanceJsonSchema: () => Kf,
    pushContextJsonSchema: () => Gf,
    sessionDataJsonSchema: () => qf,
  });
  var Ro = d
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
    Zn = d
      .object({
        run: d
          .boolean()
          .describe('Whether to run collector automatically on initialization')
          .optional(),
        tagging: xo,
        globalsStatic: Q.describe(
          'Static global properties that persist across collector runs',
        ),
        sessionStatic: d
          .record(d.string(), d.unknown())
          .describe('Static session data that persists across collector runs'),
        verbose: d.boolean().describe('Enable verbose logging for debugging'),
        onError: dt.optional(),
        onLog: Tt.optional(),
      })
      .describe('Core collector configuration'),
    Hi = Q.and(
      d.object({
        isStart: d.boolean().describe('Whether this is a new session start'),
        storage: d.boolean().describe('Whether storage is available'),
        id: Gt.describe('Session identifier').optional(),
        start: Ri.describe('Session start timestamp').optional(),
        marketing: d
          .literal(!0)
          .optional()
          .describe('Marketing attribution flag'),
        updated: Ri.describe('Last update timestamp').optional(),
        isNew: d.boolean().describe('Whether this is a new session').optional(),
        device: Gt.describe('Device identifier').optional(),
        count: Li.describe('Event count in session').optional(),
        runs: Li.describe('Number of runs').optional(),
      }),
    ).describe('Session state and tracking data'),
    Lo = Zn.partial()
      .extend({
        consent: Ee.optional().describe('Initial consent state'),
        user: Ht.optional().describe('Initial user data'),
        globals: Q.optional().describe('Initial global properties'),
        sources: d.unknown().optional().describe('Source configurations'),
        destinations: d
          .unknown()
          .optional()
          .describe('Destination configurations'),
        custom: Q.optional().describe(
          'Initial custom implementation-specific properties',
        ),
      })
      .describe('Collector initialization configuration with initial state'),
    Jo = d
      .object({
        mapping: An.optional().describe('Source-level mapping configuration'),
      })
      .describe('Push context with optional source mapping'),
    Mo = d
      .record(d.string(), d.unknown())
      .describe('Map of source IDs to source instances'),
    Vo = d
      .record(d.string(), d.unknown())
      .describe('Map of destination IDs to destination instances'),
    Fo = d
      .object({
        push: d.unknown().describe('Push function for processing events'),
        command: d.unknown().describe('Command function for walker commands'),
        allowed: d.boolean().describe('Whether event processing is allowed'),
        config: Zn.describe('Current collector configuration'),
        consent: Ee.describe('Current consent state'),
        count: d.number().describe('Event count (increments with each event)'),
        custom: Q.describe('Custom implementation-specific properties'),
        sources: Mo.describe('Registered source instances'),
        destinations: Vo.describe('Registered destination instances'),
        globals: Q.describe('Current global properties'),
        group: d.string().describe('Event grouping identifier'),
        hooks: d.unknown().describe('Lifecycle hook functions'),
        on: d.unknown().describe('Event lifecycle configuration'),
        queue: d.array(be).describe('Queued events awaiting processing'),
        round: d
          .number()
          .describe('Collector run count (increments with each run)'),
        session: d.union([Hi]).describe('Current session state'),
        timing: d.number().describe('Event processing timing information'),
        user: Ht.describe('Current user data'),
        version: d.string().describe('Walker implementation version'),
      })
      .describe('Collector instance with state and methods'),
    Ff = D(Ro),
    Wf = D(Zn),
    qf = D(Hi),
    Bf = D(Lo),
    Gf = D(Jo),
    Kf = D(Fo),
    Hf = {};
  lt(Hf, {
    BaseEnvSchema: () => Rn,
    ConfigSchema: () => Ln,
    InitSchema: () => qo,
    InitSourceSchema: () => Yi,
    InitSourcesSchema: () => Bo,
    InstanceSchema: () => Wo,
    PartialConfigSchema: () => Xi,
    baseEnvJsonSchema: () => Xf,
    configJsonSchema: () => Yf,
    initSourceJsonSchema: () => tv,
    initSourcesJsonSchema: () => nv,
    instanceJsonSchema: () => ev,
    partialConfigJsonSchema: () => Qf,
  });
  var Rn = d
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
    Ln = An.extend({
      settings: d
        .any()
        .describe('Implementation-specific configuration')
        .optional(),
      env: Rn.optional().describe(
        'Environment dependencies (platform-specific)',
      ),
      id: Gt.describe('Source identifier (defaults to source key)').optional(),
      onError: dt.optional(),
      disabled: d.boolean().describe('Set to true to disable').optional(),
      primary: d
        .boolean()
        .describe('Mark as primary (only one can be primary)')
        .optional(),
    }).describe('Source configuration with mapping and environment'),
    Xi = Ln.partial().describe(
      'Partial source configuration with all fields optional',
    ),
    Wo = d
      .object({
        type: d
          .string()
          .describe('Source type identifier (e.g., "browser", "dataLayer")'),
        config: Ln.describe('Current source configuration'),
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
    qo = d
      .any()
      .describe(
        'Source initialization function: (config, env) => Instance | Promise<Instance>',
      ),
    Yi = d
      .object({
        code: qo.describe('Source initialization function'),
        config: Xi.optional().describe('Partial configuration overrides'),
        env: Rn.partial().optional().describe('Partial environment overrides'),
        primary: d
          .boolean()
          .optional()
          .describe('Mark as primary source (only one can be primary)'),
      })
      .describe('Source initialization configuration'),
    Bo = d
      .record(d.string(), Yi)
      .describe('Map of source IDs to initialization configurations'),
    Xf = D(Rn),
    Yf = D(Ln),
    Qf = D(Xi),
    ev = D(Wo),
    tv = D(Yi),
    nv = D(Bo),
    iv = {};
  lt(iv, {
    ConfigSchema: () => Qt,
    DestinationReferenceSchema: () => er,
    PrimitiveSchema: () => Go,
    SetupSchema: () => Jn,
    SourceReferenceSchema: () => Qi,
    configJsonSchema: () => cv,
    destinationReferenceJsonSchema: () => dv,
    parseConfig: () => ov,
    parseSetup: () => rv,
    safeParseConfig: () => sv,
    safeParseSetup: () => av,
    setupJsonSchema: () => uv,
    sourceReferenceJsonSchema: () => lv,
  });
  var Go = d
      .union([d.string(), d.number(), d.boolean()])
      .describe('Primitive value: string, number, or boolean'),
    Qi = d
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
    er = d
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
    Qt = d
      .object({
        platform: d
          .enum(['web', 'server'], {
            error: 'Platform must be "web" or "server"',
          })
          .describe(
            'Target platform: "web" for browser-based tracking, "server" for Node.js server-side collection',
          ),
        sources: d
          .record(d.string(), Qi)
          .optional()
          .describe(
            'Source configurations (data capture) keyed by unique identifier',
          ),
        destinations: d
          .record(d.string(), er)
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
    Jn = d
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
          .record(d.string(), Go)
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
          .record(d.string(), Qt)
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
  function rv(e) {
    return Jn.parse(e);
  }
  function av(e) {
    return Jn.safeParse(e);
  }
  function ov(e) {
    return Qt.parse(e);
  }
  function sv(e) {
    return Qt.safeParse(e);
  }
  var uv = d.toJSONSchema(Jn, { target: 'draft-7' }),
    cv = D(Qt),
    lv = D(Qi),
    dv = D(er);
  var mv = { merge: !0, shallow: !0, extend: !0 };
  function G(e, t = {}, i = {}) {
    i = { ...mv, ...i };
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
  function Pe(e) {
    return Array.isArray(e);
  }
  function pv(e) {
    return typeof e == 'boolean';
  }
  function je(e) {
    return e !== void 0;
  }
  function Ko(e) {
    return typeof e == 'function';
  }
  function fv(e) {
    return typeof e == 'number' && !Number.isNaN(e);
  }
  function ee(e) {
    return (
      typeof e == 'object' &&
      e !== null &&
      !Pe(e) &&
      Object.prototype.toString.call(e) === '[object Object]'
    );
  }
  function Mn(e) {
    return typeof e == 'string';
  }
  function Kt(e, t = new WeakMap()) {
    if (typeof e != 'object' || e === null) return e;
    if (t.has(e)) return t.get(e);
    let i = Object.prototype.toString.call(e);
    if (i === '[object Object]') {
      let n = {};
      t.set(e, n);
      for (let r in e)
        Object.prototype.hasOwnProperty.call(e, r) && (n[r] = Kt(e[r], t));
      return n;
    }
    if (i === '[object Array]') {
      let n = [];
      return (
        t.set(e, n),
        e.forEach((r) => {
          n.push(Kt(r, t));
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
  function Ho(e, t = '', i) {
    let n = t.split('.'),
      r = e;
    for (let o = 0; o < n.length; o++) {
      let s = n[o];
      if (s === '*' && Pe(r)) {
        let u = n.slice(o + 1).join('.'),
          a = [];
        for (let c of r) {
          let m = Ho(c, u, i);
          a.push(m);
        }
        return a;
      }
      if (((r = r instanceof Object ? r[s] : void 0), !r)) break;
    }
    return je(r) ? r : i;
  }
  function wo(e, t, i) {
    if (!ee(e)) return e;
    let n = Kt(e),
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
  function en(e, t = {}, i = {}) {
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
  function Vn(e = 6) {
    let t = '';
    for (let i = 36; t.length < e; ) t += ((Math.random() * i) | 0).toString(i);
    return t;
  }
  function Xo(e, t = 1e3, i = !1) {
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
  function Mi(e) {
    return (
      pv(e) ||
      Mn(e) ||
      fv(e) ||
      !je(e) ||
      (Pe(e) && e.every(Mi)) ||
      (ee(e) && Object.values(e).every(Mi))
    );
  }
  function So(e) {
    return Mi(e) ? e : void 0;
  }
  function At(e, t, i) {
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
  function oe(e, t, i) {
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
  async function vv(e, t) {
    let [i, n] = (e.name || '').split(' ');
    if (!t || !i || !n) return {};
    let r,
      o = '',
      s = i,
      u = n,
      a = (m) => {
        if (m)
          return (m = Pe(m) ? m : [m]).find(
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
  async function ct(e, t = {}, i = {}) {
    if (!je(e)) return;
    let n = (ee(e) && e.consent) || i.consent || i.collector?.consent,
      r = Pe(t) ? t : [t];
    for (let o of r) {
      let s = await oe(Yo)(e, o, { ...i, consent: n });
      if (je(s)) return s;
    }
  }
  async function Yo(e, t, i = {}) {
    let { collector: n, consent: r } = i;
    return (Pe(t) ? t : [t]).reduce(
      async (o, s) => {
        let u = await o;
        if (u) return u;
        let a = Mn(s) ? { key: s } : s;
        if (!Object.keys(a).length) return;
        let {
          condition: c,
          consent: m,
          fn: p,
          key: f,
          loop: h,
          map: N,
          set: k,
          validate: g,
          value: y,
        } = a;
        if (c && !(await oe(c)(e, s, n))) return;
        if (m && !en(m, r)) return y;
        let w = je(y) ? y : e;
        if ((p && (w = await oe(p)(e, s, i)), f && (w = Ho(e, f, y)), h)) {
          let [I, E] = h,
            V = I === 'this' ? [e] : await ct(e, I, i);
          Pe(V) &&
            (w = (await Promise.all(V.map((B) => ct(B, E, i)))).filter(je));
        } else
          N
            ? (w = await Object.entries(N).reduce(async (I, [E, V]) => {
                let B = await I,
                  H = await ct(e, V, i);
                return (je(H) && (B[E] = H), B);
              }, Promise.resolve({})))
            : k && (w = await Promise.all(k.map((I) => Yo(e, I, i))));
        g && !(await oe(g)(w)) && (w = void 0);
        let j = So(w);
        return je(j) ? j : So(y);
      },
      Promise.resolve(void 0),
    );
  }
  async function Fn(e, t, i) {
    t.policy &&
      (await Promise.all(
        Object.entries(t.policy).map(async ([s, u]) => {
          let a = await ct(e, u, { collector: i });
          e = wo(e, s, a);
        }),
      ));
    let { eventMapping: n, mappingKey: r } = await vv(e, t.mapping);
    n?.policy &&
      (await Promise.all(
        Object.entries(n.policy).map(async ([s, u]) => {
          let a = await ct(e, u, { collector: i });
          e = wo(e, s, a);
        }),
      ));
    let o = t.data && (await ct(e, t.data, { collector: i }));
    if (n) {
      if (n.ignore)
        return { event: e, data: o, mapping: n, mappingKey: r, ignore: !0 };
      if ((n.name && (e.name = n.name), n.data)) {
        let s = n.data && (await ct(e, n.data, { collector: i }));
        o = ee(o) && ee(s) ? G(o, s) : s;
      }
    }
    return { event: e, data: o, mapping: n, mappingKey: r, ignore: !1 };
  }
  function Qo(e, t = !1) {
    t && console.dir(e, { depth: 4 });
  }
  function Je(e, t, i) {
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
  var gv = Object.defineProperty,
    hv = {
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
    K = {
      Commands: hv,
      Utils: {
        Storage: { Cookie: 'cookie', Local: 'local', Session: 'session' },
      },
    },
    bv = {};
  ((e, t) => {
    for (var i in t) gv(e, i, { get: t[i], enumerable: !0 });
  })(bv, { schemas: () => yv, settingsSchema: () => es });
  var es = {
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
    yv = { settings: es };
  async function _v(e, t, i) {
    let { code: n, config: r = {}, env: o = {} } = t,
      s = i || r || { init: !1 },
      u = { ...n, config: s, env: tn(n.env, o) },
      a = u.config.id;
    if (!a)
      do a = Vn(4);
      while (e.destinations[a]);
    return (
      (e.destinations[a] = u),
      u.config.queue !== !1 && (u.queue = [...e.queue]),
      Wn(e, void 0, { [a]: u })
    );
  }
  async function Wn(e, t, i) {
    let { allowed: n, consent: r, globals: o, user: s } = e;
    if (!n) return mt({ ok: !1 });
    (t && e.queue.push(t), i || (i = e.destinations));
    let u = await Promise.all(
        Object.entries(i || {}).map(async ([p, f]) => {
          let h = (f.queue || []).map((y) => ({ ...y, consent: r }));
          if (((f.queue = []), t)) {
            let y = Kt(t);
            h.push(y);
          }
          if (!h.length) return { id: p, destination: f, skipped: !0 };
          let N = [],
            k = h.filter((y) => {
              let w = en(f.config.consent, r, y.consent);
              return !w || ((y.consent = w), N.push(y), !1);
            });
          if ((f.queue.concat(k), !N.length))
            return { id: p, destination: f, queue: h };
          if (!(await oe($v)(e, f))) return { id: p, destination: f, queue: h };
          let g = !1;
          return (
            f.dlq || (f.dlq = []),
            await Promise.all(
              N.map(
                async (y) => (
                  (y.globals = G(o, y.globals)),
                  (y.user = G(s, y.user)),
                  await oe(
                    kv,
                    (w) => (
                      e.config.onError && e.config.onError(w, e),
                      (g = !0),
                      f.dlq.push([y, w]),
                      !1
                    ),
                  )(e, f, y),
                  y
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
        h = { id: p.id, destination: f };
      p.error
        ? m.push(h)
        : p.queue && p.queue.length
          ? ((f.queue = (f.queue || []).concat(p.queue)), c.push(h))
          : a.push(h);
    }
    return mt({ ok: !m.length, event: t, successful: a, queued: c, failed: m });
  }
  async function $v(e, t) {
    if (t.init && !t.config.init) {
      let i = { collector: e, config: t.config, env: tn(t.env, t.config.env) },
        n = await Je(t.init, 'DestinationInit', e.hooks)(i);
      if (n === !1) return n;
      t.config = { ...(n || t.config), init: !0 };
    }
    return !0;
  }
  async function kv(e, t, i) {
    let { config: n } = t,
      r = await Fn(i, n, e);
    if (r.ignore) return !1;
    let o = {
        collector: e,
        config: n,
        data: r.data,
        mapping: r.mapping,
        env: tn(t.env, n.env),
      },
      s = r.mapping;
    if (s?.batch && t.pushBatch) {
      let u = s.batched || { key: r.mappingKey || '', events: [], data: [] };
      (u.events.push(r.event),
        je(r.data) && u.data.push(r.data),
        (s.batchFn =
          s.batchFn ||
          Xo((a, c) => {
            let m = {
              collector: c,
              config: n,
              data: r.data,
              mapping: s,
              env: tn(a.env, n.env),
            };
            (Je(a.pushBatch, 'DestinationPushBatch', c.hooks)(u, m),
              (u.events = []),
              (u.data = []));
          }, s.batch)),
        (s.batched = u),
        s.batchFn?.(t, e));
    } else await Je(t.push, 'DestinationPush', e.hooks)(r.event, o);
    return !0;
  }
  function mt(e) {
    return G(
      { ok: !e?.failed?.length, successful: [], queued: [], failed: [] },
      e,
    );
  }
  async function wv(e, t = {}) {
    let i = {};
    for (let [n, r] of Object.entries(t)) {
      let { code: o, config: s = {}, env: u = {} } = r,
        a = { ...o.config, ...s },
        c = tn(o.env, u);
      i[n] = { ...o, config: a, env: c };
    }
    return i;
  }
  function tn(e, t) {
    return e || t ? (t ? (e && ee(e) && ee(t) ? { ...e, ...t } : t) : e) : {};
  }
  function Sv(e, t, i) {
    let n = e.on,
      r = n[t] || [],
      o = Pe(i) ? i : [i];
    (o.forEach((s) => {
      r.push(s);
    }),
      (n[t] = r),
      nn(e, t, o));
  }
  function nn(e, t, i, n) {
    let r,
      o = i || [];
    switch ((i || (o = e.on[t] || []), t)) {
      case K.Commands.Consent:
        r = n || e.consent;
        break;
      case K.Commands.Session:
        r = e.session;
        break;
      case K.Commands.Ready:
      case K.Commands.Run:
      default:
        r = void 0;
    }
    if (
      (Object.values(e.sources).forEach((s) => {
        s.on && At(s.on)(t, r);
      }),
      Object.values(e.destinations).forEach((s) => {
        if (s.on) {
          let u = s.on;
          At(u)(t, r);
        }
      }),
      o.length)
    )
      switch (t) {
        case K.Commands.Consent:
          (function (s, u, a) {
            let c = a || s.consent;
            u.forEach((m) => {
              Object.keys(c)
                .filter((p) => p in m)
                .forEach((p) => {
                  At(m[p])(s, c);
                });
            });
          })(e, o, n);
          break;
        case K.Commands.Ready:
        case K.Commands.Run:
          (function (s, u) {
            s.allowed &&
              u.forEach((a) => {
                At(a)(s);
              });
          })(e, o);
          break;
        case K.Commands.Session:
          (function (s, u) {
            s.session &&
              u.forEach((a) => {
                At(a)(s, s.session);
              });
          })(e, o);
      }
  }
  async function xv(e, t) {
    let { consent: i } = e,
      n = !1,
      r = {};
    return (
      Object.entries(t).forEach(([o, s]) => {
        let u = !!s;
        ((r[o] = u), (n = n || u));
      }),
      (e.consent = G(i, r)),
      nn(e, 'consent', void 0, r),
      n ? Wn(e) : mt({ ok: !0 })
    );
  }
  async function Iv(e, t, i, n) {
    let r;
    switch (t) {
      case K.Commands.Config:
        ee(i) && G(e.config, i, { shallow: !1 });
        break;
      case K.Commands.Consent:
        ee(i) && (r = await xv(e, i));
        break;
      case K.Commands.Custom:
        ee(i) && (e.custom = G(e.custom, i));
        break;
      case K.Commands.Destination:
        ee(i) && Ko(i.push) && (r = await _v(e, { code: i }, n));
        break;
      case K.Commands.Globals:
        ee(i) && (e.globals = G(e.globals, i));
        break;
      case K.Commands.On:
        Mn(i) && Sv(e, i, n);
        break;
      case K.Commands.Ready:
        nn(e, 'ready');
        break;
      case K.Commands.Run:
        r = await Ov(e, i);
        break;
      case K.Commands.Session:
        nn(e, 'session');
        break;
      case K.Commands.User:
        ee(i) && G(e.user, i, { shallow: !1 });
    }
    return r || { ok: !0, successful: [], queued: [], failed: [] };
  }
  function jv(e, t) {
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
        nested: h = [],
        consent: N = e.consent,
        id: k = `${r}-${o}-${s}`,
        trigger: g = '',
        entity: y = i,
        action: w = n,
        timing: j = 0,
        version: I = { source: e.version, tagging: e.config.tagging || 0 },
        source: E = { type: 'collector', id: '', previous_id: '' },
      } = t;
    return {
      name: u,
      data: a,
      context: c,
      globals: m,
      custom: p,
      user: f,
      nested: h,
      consent: N,
      id: k,
      trigger: g,
      entity: y,
      action: w,
      timestamp: r,
      timing: j,
      group: o,
      count: s,
      version: I,
      source: E,
    };
  }
  async function Ov(e, t) {
    ((e.allowed = !0),
      (e.count = 0),
      (e.group = Vn()),
      (e.timing = Date.now()),
      t &&
        (t.consent && (e.consent = G(e.consent, t.consent)),
        t.user && (e.user = G(e.user, t.user)),
        t.globals && (e.globals = G(e.config.globalsStatic || {}, t.globals)),
        t.custom && (e.custom = G(e.custom, t.custom))),
      Object.values(e.destinations).forEach((n) => {
        n.queue = [];
      }),
      (e.queue = []),
      e.round++);
    let i = await Wn(e);
    return (nn(e, 'run'), i);
  }
  function zv(e, t) {
    return Je(
      async (i, n = {}) =>
        await oe(
          async () => {
            let r = i;
            if (n.mapping) {
              let u = await Fn(r, n.mapping, e);
              if (u.ignore) return mt({ ok: !0 });
              if (
                n.mapping.consent &&
                !en(n.mapping.consent, e.consent, u.event.consent)
              )
                return mt({ ok: !0 });
              r = u.event;
            }
            let o = t(r),
              s = jv(e, o);
            return await Wn(e, s);
          },
          () => mt({ ok: !1 }),
        )(),
      'Push',
      e.hooks,
    );
  }
  async function Nv(e) {
    let t = G(
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
      Qo({ message: o }, s || t.verbose);
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
        version: '0.3.0',
        sources: {},
        push: void 0,
        command: void 0,
      };
    return (
      (r.push = zv(r, (o) => ({
        timing: Math.round((Date.now() - r.timing) / 10) / 100,
        source: { type: 'collector', id: '', previous_id: '' },
        ...o,
      }))),
      (r.command = (function (o, s) {
        return Je(
          async (u, a, c) =>
            await oe(
              async () => await s(o, u, a, c),
              () => mt({ ok: !1 }),
            )(),
          'Command',
          o.hooks,
        );
      })(r, Iv)),
      (r.destinations = await wv(0, e.destinations || {})),
      r
    );
  }
  async function Uv(e, t = {}) {
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
        m = await oe(o)(s, c);
      m && (a && (m.config = { ...m.config, primary: a }), (i[n] = m));
    }
    return i;
  }
  async function ts(e) {
    e = e || {};
    let t = await Nv(e),
      i =
        ((n = t),
        {
          type: 'elb',
          config: {},
          push: async (f, h, N, k, g, y) => {
            if (typeof f == 'string' && f.startsWith('walker ')) {
              let j = f.replace('walker ', '');
              return n.command(j, h, N);
            }
            let w;
            if (typeof f == 'string')
              ((w = { name: f }),
                h && typeof h == 'object' && !Array.isArray(h) && (w.data = h));
            else {
              if (!f || typeof f != 'object')
                return { ok: !1, successful: [], queued: [], failed: [] };
              ((w = f),
                h &&
                  typeof h == 'object' &&
                  !Array.isArray(h) &&
                  (w.data = { ...(w.data || {}), ...h }));
            }
            return (
              k && typeof k == 'object' && (w.context = k),
              g && Array.isArray(g) && (w.nested = g),
              y && typeof y == 'object' && (w.custom = y),
              n.push(w)
            );
          },
        });
    var n;
    t.sources.elb = i;
    let r = await Uv(t, e.sources || {});
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
  var Pv = Object.defineProperty,
    ns = (e, t) => {
      for (var i in t) Pv(e, i, { get: t[i], enumerable: !0 });
    };
  var Ev = {};
  ns(Ev, { env: () => is });
  var is = {};
  ns(is, { init: () => Dv, push: () => Tv, simulation: () => Cv });
  var tr = async () => ({ ok: !0, successful: [], queued: [], failed: [] }),
    Dv = void 0,
    Tv = { push: tr, command: tr, elb: tr },
    Cv = ['call:elb'],
    rs = async (e, t) => {
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
  var Av = Object.defineProperty,
    as = (e, t) => {
      for (var i in t) Av(e, i, { get: t[i], enumerable: !0 });
    };
  var os = {};
  as(os, { env: () => ss });
  var ss = {};
  as(ss, { init: () => Zv, push: () => Rv, simulation: () => Lv });
  var Zv = { log: void 0 },
    Rv = { log: Object.assign(() => {}, {}) },
    Lv = ['call:log'],
    us = {
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
  var Jv = Object.defineProperty,
    ve = (e, t) => {
      for (var i in t) Jv(e, i, { get: t[i], enumerable: !0 });
    },
    l = {};
  ve(l, {
    $brand: () => zs,
    $input: () => al,
    $output: () => rl,
    NEVER: () => Os,
    TimePrecision: () => ul,
    ZodAny: () => yd,
    ZodArray: () => wd,
    ZodBase64: () => Ta,
    ZodBase64URL: () => Ca,
    ZodBigInt: () => yi,
    ZodBigIntFormat: () => Ra,
    ZodBoolean: () => bi,
    ZodCIDRv4: () => Ea,
    ZodCIDRv6: () => Da,
    ZodCUID: () => Ia,
    ZodCUID2: () => ja,
    ZodCatch: () => Md,
    ZodCodec: () => Ha,
    ZodCustom: () => ki,
    ZodCustomStringFormat: () => $n,
    ZodDate: () => Ja,
    ZodDefault: () => Cd,
    ZodDiscriminatedUnion: () => Sd,
    ZodE164: () => Aa,
    ZodEmail: () => wa,
    ZodEmoji: () => Sa,
    ZodEnum: () => cn,
    ZodError: () => Yb,
    ZodFile: () => Ed,
    ZodFirstPartyTypeKind: () => lr,
    ZodFunction: () => Xd,
    ZodGUID: () => ii,
    ZodIPv4: () => Ua,
    ZodIPv6: () => Pa,
    ZodISODate: () => ya,
    ZodISODateTime: () => ba,
    ZodISODuration: () => $a,
    ZodISOTime: () => _a,
    ZodIntersection: () => xd,
    ZodIssueCode: () => s_,
    ZodJWT: () => Za,
    ZodKSUID: () => Na,
    ZodLazy: () => Gd,
    ZodLiteral: () => Pd,
    ZodMap: () => Nd,
    ZodNaN: () => Fd,
    ZodNanoID: () => xa,
    ZodNever: () => $d,
    ZodNonOptional: () => Ga,
    ZodNull: () => hd,
    ZodNullable: () => Td,
    ZodNumber: () => hi,
    ZodNumberFormat: () => Mt,
    ZodObject: () => $i,
    ZodOptional: () => Ba,
    ZodPipe: () => Ka,
    ZodPrefault: () => Zd,
    ZodPromise: () => Hd,
    ZodReadonly: () => Wd,
    ZodRealError: () => ce,
    ZodRecord: () => Fa,
    ZodSet: () => Ud,
    ZodString: () => vi,
    ZodStringFormat: () => W,
    ZodSuccess: () => Jd,
    ZodSymbol: () => vd,
    ZodTemplateLiteral: () => Bd,
    ZodTransform: () => Dd,
    ZodTuple: () => jd,
    ZodType: () => R,
    ZodULID: () => Oa,
    ZodURL: () => gi,
    ZodUUID: () => De,
    ZodUndefined: () => gd,
    ZodUnion: () => Ma,
    ZodUnknown: () => _d,
    ZodVoid: () => kd,
    ZodXID: () => za,
    _ZodString: () => ka,
    _default: () => Ad,
    _function: () => Ss,
    any: () => Ty,
    array: () => _i,
    base64: () => by,
    base64url: () => yy,
    bigint: () => Ny,
    boolean: () => fd,
    catch: () => Vd,
    check: () => t_,
    cidrv4: () => gy,
    cidrv6: () => hy,
    clone: () => ge,
    codec: () => Yy,
    coerce: () => em,
    config: () => ie,
    core: () => js,
    cuid: () => cy,
    cuid2: () => ly,
    custom: () => n_,
    date: () => Ay,
    decode: () => od,
    decodeAsync: () => ud,
    discriminatedUnion: () => My,
    e164: () => _y,
    email: () => Qb,
    emoji: () => sy,
    encode: () => ad,
    encodeAsync: () => sd,
    endsWith: () => ma,
    enum: () => Wa,
    file: () => Gy,
    flattenError: () => hr,
    float32: () => Iy,
    float64: () => jy,
    formatError: () => br,
    function: () => Ss,
    getErrorMap: () => c_,
    globalRegistry: () => ft,
    gt: () => yt,
    gte: () => se,
    guid: () => ey,
    hash: () => xy,
    hex: () => Sy,
    hostname: () => wy,
    httpUrl: () => oy,
    includes: () => la,
    instanceof: () => i_,
    int: () => cr,
    int32: () => Oy,
    int64: () => Uy,
    intersection: () => Id,
    ipv4: () => fy,
    ipv6: () => vy,
    iso: () => Kl,
    json: () => a_,
    jwt: () => $y,
    keyof: () => Zy,
    ksuid: () => py,
    lazy: () => Kd,
    length: () => fi,
    literal: () => By,
    locales: () => Ar,
    looseObject: () => Jy,
    lowercase: () => ua,
    lt: () => bt,
    lte: () => _e,
    map: () => Fy,
    maxLength: () => pi,
    maxSize: () => mi,
    mime: () => pa,
    minLength: () => Lt,
    minSize: () => un,
    multipleOf: () => sn,
    nan: () => Xy,
    nanoid: () => uy,
    nativeEnum: () => qy,
    negative: () => Al,
    never: () => La,
    nonnegative: () => Rl,
    nonoptional: () => Ld,
    nonpositive: () => Zl,
    normalize: () => fa,
    null: () => bd,
    nullable: () => ai,
    nullish: () => Ky,
    number: () => pd,
    object: () => Ry,
    optional: () => ri,
    overwrite: () => kt,
    parse: () => td,
    parseAsync: () => nd,
    partialRecord: () => Vy,
    pipe: () => oi,
    positive: () => Cl,
    prefault: () => Rd,
    preprocess: () => o_,
    prettifyError: () => Ms,
    promise: () => e_,
    property: () => Ll,
    readonly: () => qd,
    record: () => zd,
    refine: () => Yd,
    regex: () => sa,
    regexes: () => $t,
    registry: () => Rr,
    safeDecode: () => ld,
    safeDecodeAsync: () => md,
    safeEncode: () => cd,
    safeEncodeAsync: () => dd,
    safeParse: () => id,
    safeParseAsync: () => rd,
    set: () => Wy,
    setErrorMap: () => u_,
    size: () => oa,
    startsWith: () => da,
    strictObject: () => Ly,
    string: () => ur,
    stringFormat: () => ky,
    stringbool: () => r_,
    success: () => Hy,
    superRefine: () => Qd,
    symbol: () => Ey,
    templateLiteral: () => Qy,
    toJSONSchema: () => Gl,
    toLowerCase: () => ga,
    toUpperCase: () => ha,
    transform: () => qa,
    treeifyError: () => Ls,
    trim: () => va,
    tuple: () => Od,
    uint32: () => zy,
    uint64: () => Py,
    ulid: () => dy,
    undefined: () => Dy,
    union: () => Va,
    unknown: () => Jt,
    uppercase: () => ca,
    url: () => ay,
    util: () => M,
    uuid: () => ty,
    uuidv4: () => ny,
    uuidv6: () => iy,
    uuidv7: () => ry,
    void: () => Cy,
    xid: () => my,
  });
  var js = {};
  ve(js, {
    $ZodAny: () => $c,
    $ZodArray: () => Ic,
    $ZodAsyncError: () => gt,
    $ZodBase64: () => cc,
    $ZodBase64URL: () => dc,
    $ZodBigInt: () => Er,
    $ZodBigIntFormat: () => hc,
    $ZodBoolean: () => Pr,
    $ZodCIDRv4: () => sc,
    $ZodCIDRv6: () => uc,
    $ZodCUID: () => Hu,
    $ZodCUID2: () => Xu,
    $ZodCatch: () => qc,
    $ZodCheck: () => q,
    $ZodCheckBigIntFormat: () => Iu,
    $ZodCheckEndsWith: () => Zu,
    $ZodCheckGreaterThan: () => zr,
    $ZodCheckIncludes: () => Cu,
    $ZodCheckLengthEquals: () => Pu,
    $ZodCheckLessThan: () => Or,
    $ZodCheckLowerCase: () => Du,
    $ZodCheckMaxLength: () => Nu,
    $ZodCheckMaxSize: () => ju,
    $ZodCheckMimeType: () => Lu,
    $ZodCheckMinLength: () => Uu,
    $ZodCheckMinSize: () => Ou,
    $ZodCheckMultipleOf: () => Su,
    $ZodCheckNumberFormat: () => xu,
    $ZodCheckOverwrite: () => Ju,
    $ZodCheckProperty: () => Ru,
    $ZodCheckRegex: () => Eu,
    $ZodCheckSizeEquals: () => zu,
    $ZodCheckStartsWith: () => Au,
    $ZodCheckStringFormat: () => bn,
    $ZodCheckUpperCase: () => Tu,
    $ZodCodec: () => Cr,
    $ZodCustom: () => el,
    $ZodCustomStringFormat: () => vc,
    $ZodDate: () => xc,
    $ZodDefault: () => Mc,
    $ZodDiscriminatedUnion: () => Uc,
    $ZodE164: () => mc,
    $ZodEmail: () => qu,
    $ZodEmoji: () => Gu,
    $ZodEncodeError: () => si,
    $ZodEnum: () => Cc,
    $ZodError: () => gr,
    $ZodFile: () => Zc,
    $ZodFunction: () => Xc,
    $ZodGUID: () => Fu,
    $ZodIPv4: () => ac,
    $ZodIPv6: () => oc,
    $ZodISODate: () => nc,
    $ZodISODateTime: () => tc,
    $ZodISODuration: () => rc,
    $ZodISOTime: () => ic,
    $ZodIntersection: () => Pc,
    $ZodJWT: () => fc,
    $ZodKSUID: () => ec,
    $ZodLazy: () => Qc,
    $ZodLiteral: () => Ac,
    $ZodMap: () => Dc,
    $ZodNaN: () => Bc,
    $ZodNanoID: () => Ku,
    $ZodNever: () => wc,
    $ZodNonOptional: () => Fc,
    $ZodNull: () => _c,
    $ZodNullable: () => Jc,
    $ZodNumber: () => Ur,
    $ZodNumberFormat: () => gc,
    $ZodObject: () => zc,
    $ZodObjectJIT: () => Nc,
    $ZodOptional: () => Lc,
    $ZodPipe: () => Gc,
    $ZodPrefault: () => Vc,
    $ZodPromise: () => Yc,
    $ZodReadonly: () => Kc,
    $ZodRealError: () => ue,
    $ZodRecord: () => Ec,
    $ZodRegistry: () => Zr,
    $ZodSet: () => Tc,
    $ZodString: () => yn,
    $ZodStringFormat: () => F,
    $ZodSuccess: () => Wc,
    $ZodSymbol: () => bc,
    $ZodTemplateLiteral: () => Hc,
    $ZodTransform: () => Rc,
    $ZodTuple: () => Tr,
    $ZodType: () => T,
    $ZodULID: () => Yu,
    $ZodURL: () => Bu,
    $ZodUUID: () => Wu,
    $ZodUndefined: () => yc,
    $ZodUnion: () => Dr,
    $ZodUnknown: () => kc,
    $ZodVoid: () => Sc,
    $ZodXID: () => Qu,
    $brand: () => zs,
    $constructor: () => v,
    $input: () => al,
    $output: () => rl,
    Doc: () => Mu,
    JSONSchema: () => Xb,
    JSONSchemaGenerator: () => sr,
    NEVER: () => Os,
    TimePrecision: () => ul,
    _any: () => zl,
    _array: () => Jl,
    _base64: () => na,
    _base64url: () => ia,
    _bigint: () => kl,
    _boolean: () => _l,
    _catch: () => Wb,
    _check: () => ql,
    _cidrv4: () => ea,
    _cidrv6: () => ta,
    _coercedBigint: () => wl,
    _coercedBoolean: () => $l,
    _coercedDate: () => Dl,
    _coercedNumber: () => fl,
    _coercedString: () => sl,
    _cuid: () => Br,
    _cuid2: () => Gr,
    _custom: () => Vl,
    _date: () => El,
    _decode: () => _r,
    _decodeAsync: () => kr,
    _default: () => Mb,
    _discriminatedUnion: () => Nb,
    _e164: () => ra,
    _email: () => Lr,
    _emoji: () => Wr,
    _encode: () => yr,
    _encodeAsync: () => $r,
    _endsWith: () => ma,
    _enum: () => Cb,
    _file: () => Ml,
    _float32: () => gl,
    _float64: () => hl,
    _gt: () => yt,
    _gte: () => se,
    _guid: () => ni,
    _includes: () => la,
    _int: () => vl,
    _int32: () => bl,
    _int64: () => Sl,
    _intersection: () => Ub,
    _ipv4: () => Yr,
    _ipv6: () => Qr,
    _isoDate: () => ll,
    _isoDateTime: () => cl,
    _isoDuration: () => ml,
    _isoTime: () => dl,
    _jwt: () => aa,
    _ksuid: () => Xr,
    _lazy: () => Kb,
    _length: () => fi,
    _literal: () => Zb,
    _lowercase: () => ua,
    _lt: () => bt,
    _lte: () => _e,
    _map: () => Db,
    _max: () => _e,
    _maxLength: () => pi,
    _maxSize: () => mi,
    _mime: () => pa,
    _min: () => se,
    _minLength: () => Lt,
    _minSize: () => un,
    _multipleOf: () => sn,
    _nan: () => Tl,
    _nanoid: () => qr,
    _nativeEnum: () => Ab,
    _negative: () => Al,
    _never: () => Ul,
    _nonnegative: () => Rl,
    _nonoptional: () => Vb,
    _nonpositive: () => Zl,
    _normalize: () => fa,
    _null: () => Ol,
    _nullable: () => Jb,
    _number: () => pl,
    _optional: () => Lb,
    _overwrite: () => kt,
    _parse: () => mn,
    _parseAsync: () => pn,
    _pipe: () => qb,
    _positive: () => Cl,
    _promise: () => Hb,
    _property: () => Ll,
    _readonly: () => Bb,
    _record: () => Eb,
    _refine: () => Fl,
    _regex: () => sa,
    _safeDecode: () => Sr,
    _safeDecodeAsync: () => Ir,
    _safeEncode: () => wr,
    _safeEncodeAsync: () => xr,
    _safeParse: () => fn,
    _safeParseAsync: () => vn,
    _set: () => Tb,
    _size: () => oa,
    _startsWith: () => da,
    _string: () => ol,
    _stringFormat: () => _n,
    _stringbool: () => Bl,
    _success: () => Fb,
    _superRefine: () => Wl,
    _symbol: () => Il,
    _templateLiteral: () => Gb,
    _toLowerCase: () => ga,
    _toUpperCase: () => ha,
    _transform: () => Rb,
    _trim: () => va,
    _tuple: () => Pb,
    _uint32: () => yl,
    _uint64: () => xl,
    _ulid: () => Kr,
    _undefined: () => jl,
    _union: () => zb,
    _unknown: () => Nl,
    _uppercase: () => ca,
    _url: () => di,
    _uuid: () => Jr,
    _uuidv4: () => Mr,
    _uuidv6: () => Vr,
    _uuidv7: () => Fr,
    _void: () => Pl,
    _xid: () => Hr,
    clone: () => ge,
    config: () => ie,
    decode: () => vg,
    decodeAsync: () => hg,
    encode: () => fg,
    encodeAsync: () => gg,
    flattenError: () => hr,
    formatError: () => br,
    globalConfig: () => Xn,
    globalRegistry: () => ft,
    isValidBase64: () => Nr,
    isValidBase64URL: () => lc,
    isValidJWT: () => pc,
    locales: () => Ar,
    parse: () => rr,
    parseAsync: () => ar,
    prettifyError: () => Ms,
    regexes: () => $t,
    registry: () => Rr,
    safeDecode: () => yg,
    safeDecodeAsync: () => $g,
    safeEncode: () => bg,
    safeEncodeAsync: () => _g,
    safeParse: () => Vs,
    safeParseAsync: () => Fs,
    toDotPath: () => Js,
    toJSONSchema: () => Gl,
    treeifyError: () => Ls,
    util: () => M,
    version: () => Vu,
  });
  var Os = Object.freeze({ status: 'aborted' });
  function v(e, t, i) {
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
  var zs = Symbol('zod_brand'),
    gt = class extends Error {
      constructor() {
        super(
          'Encountered Promise during synchronous parse. Use .parseAsync() instead.',
        );
      }
    },
    si = class extends Error {
      constructor(e) {
        (super(`Encountered unidirectional transform during encode: ${e}`),
          (this.name = 'ZodEncodeError'));
      }
    },
    Xn = {};
  function ie(e) {
    return (e && Object.assign(Xn, e), Xn);
  }
  var M = {};
  function Mv(e) {
    return e;
  }
  function Vv(e) {
    return e;
  }
  function Fv(e) {}
  function Wv(e) {
    throw new Error();
  }
  function qv(e) {}
  function fr(e) {
    let t = Object.values(e).filter((i) => typeof i == 'number');
    return Object.entries(e)
      .filter(([i, n]) => t.indexOf(+i) === -1)
      .map(([i, n]) => n);
  }
  function _(e, t = '|') {
    return e.map((i) => P(i)).join(t);
  }
  function Yn(e, t) {
    return typeof t == 'bigint' ? t.toString() : t;
  }
  function dn(e) {
    return {
      get value() {
        {
          let t = e();
          return (Object.defineProperty(this, 'value', { value: t }), t);
        }
      },
    };
  }
  function _t(e) {
    return e == null;
  }
  function ui(e) {
    let t = e.startsWith('^') ? 1 : 0,
      i = e.endsWith('$') ? e.length - 1 : e.length;
    return e.slice(t, i);
  }
  function Ns(e, t) {
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
  ve(M, {
    BIGINT_FORMAT_RANGES: () => Cs,
    Class: () => pg,
    NUMBER_FORMAT_RANGES: () => Ts,
    aborted: () => pt,
    allowsEval: () => Us,
    assert: () => qv,
    assertEqual: () => Mv,
    assertIs: () => Fv,
    assertNever: () => Wv,
    assertNotEqual: () => Vv,
    assignProp: () => Fe,
    base64ToUint8Array: () => As,
    base64urlToUint8Array: () => cg,
    cached: () => dn,
    captureStackTrace: () => vr,
    cleanEnum: () => ug,
    cleanRegex: () => ui,
    clone: () => ge,
    cloneDef: () => Gv,
    createTransparentProxy: () => eg,
    defineLazy: () => J,
    esc: () => ir,
    escapeRegex: () => Me,
    extend: () => ig,
    finalizeIssue: () => $e,
    floatSafeRemainder: () => Ns,
    getElementAtPath: () => Kv,
    getEnumValues: () => fr,
    getLengthableOrigin: () => li,
    getParsedType: () => Qv,
    getSizableOrigin: () => ci,
    hexToUint8Array: () => dg,
    isObject: () => Zt,
    isPlainObject: () => ht,
    issue: () => ei,
    joinValues: () => _,
    jsonStringifyReplacer: () => Yn,
    merge: () => ag,
    mergeDefs: () => We,
    normalizeParams: () => $,
    nullish: () => _t,
    numKeys: () => Yv,
    objectClone: () => Bv,
    omit: () => ng,
    optionalKeys: () => Ds,
    partial: () => og,
    pick: () => tg,
    prefixIssues: () => ye,
    primitiveTypes: () => Es,
    promiseAllObject: () => Hv,
    propertyKeyTypes: () => Qn,
    randomString: () => Xv,
    required: () => sg,
    safeExtend: () => rg,
    shallowClone: () => Ps,
    stringifyPrimitive: () => P,
    uint8ArrayToBase64: () => Zs,
    uint8ArrayToBase64url: () => lg,
    uint8ArrayToHex: () => mg,
    unwrapMessage: () => on,
  });
  var cs = Symbol('evaluating');
  function J(e, t, i) {
    let n;
    Object.defineProperty(e, t, {
      get() {
        if (n !== cs) return (n === void 0 && ((n = cs), (n = i())), n);
      },
      set(r) {
        Object.defineProperty(e, t, { value: r });
      },
      configurable: !0,
    });
  }
  function Bv(e) {
    return Object.create(
      Object.getPrototypeOf(e),
      Object.getOwnPropertyDescriptors(e),
    );
  }
  function Fe(e, t, i) {
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
  function Gv(e) {
    return We(e._zod.def);
  }
  function Kv(e, t) {
    return t ? t.reduce((i, n) => i?.[n], e) : e;
  }
  function Hv(e) {
    let t = Object.keys(e),
      i = t.map((n) => e[n]);
    return Promise.all(i).then((n) => {
      let r = {};
      for (let o = 0; o < t.length; o++) r[t[o]] = n[o];
      return r;
    });
  }
  function Xv(e = 10) {
    let t = 'abcdefghijklmnopqrstuvwxyz',
      i = '';
    for (let n = 0; n < e; n++) i += t[Math.floor(26 * Math.random())];
    return i;
  }
  function ir(e) {
    return JSON.stringify(e);
  }
  var vr =
    'captureStackTrace' in Error ? Error.captureStackTrace : (...e) => {};
  function Zt(e) {
    return typeof e == 'object' && e !== null && !Array.isArray(e);
  }
  var Us = dn(() => {
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
  function ht(e) {
    if (Zt(e) === !1) return !1;
    let t = e.constructor;
    if (t === void 0) return !0;
    let i = t.prototype;
    return (
      Zt(i) !== !1 &&
      Object.prototype.hasOwnProperty.call(i, 'isPrototypeOf') !== !1
    );
  }
  function Ps(e) {
    return ht(e) ? { ...e } : Array.isArray(e) ? [...e] : e;
  }
  function Yv(e) {
    let t = 0;
    for (let i in e) Object.prototype.hasOwnProperty.call(e, i) && t++;
    return t;
  }
  var Qv = (e) => {
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
    Qn = new Set(['string', 'number', 'symbol']),
    Es = new Set([
      'string',
      'number',
      'bigint',
      'boolean',
      'symbol',
      'undefined',
    ]);
  function Me(e) {
    return e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  function ge(e, t, i) {
    let n = new e._zod.constr(t ?? e._zod.def);
    return ((t && !i?.parent) || (n._zod.parent = e), n);
  }
  function $(e) {
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
  function eg(e) {
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
  function P(e) {
    return typeof e == 'bigint'
      ? e.toString() + 'n'
      : typeof e == 'string'
        ? `"${e}"`
        : `${e}`;
  }
  function Ds(e) {
    return Object.keys(e).filter(
      (t) => e[t]._zod.optin === 'optional' && e[t]._zod.optout === 'optional',
    );
  }
  var Ts = {
      safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
      int32: [-2147483648, 2147483647],
      uint32: [0, 4294967295],
      float32: [-34028234663852886e22, 34028234663852886e22],
      float64: [-Number.MAX_VALUE, Number.MAX_VALUE],
    },
    Cs = {
      int64: [BigInt('-9223372036854775808'), BigInt('9223372036854775807')],
      uint64: [BigInt(0), BigInt('18446744073709551615')],
    };
  function tg(e, t) {
    let i = e._zod.def;
    return ge(
      e,
      We(e._zod.def, {
        get shape() {
          let n = {};
          for (let r in t) {
            if (!(r in i.shape)) throw new Error(`Unrecognized key: "${r}"`);
            t[r] && (n[r] = i.shape[r]);
          }
          return (Fe(this, 'shape', n), n);
        },
        checks: [],
      }),
    );
  }
  function ng(e, t) {
    let i = e._zod.def,
      n = We(e._zod.def, {
        get shape() {
          let r = { ...e._zod.def.shape };
          for (let o in t) {
            if (!(o in i.shape)) throw new Error(`Unrecognized key: "${o}"`);
            t[o] && delete r[o];
          }
          return (Fe(this, 'shape', r), r);
        },
        checks: [],
      });
    return ge(e, n);
  }
  function ig(e, t) {
    if (!ht(t))
      throw new Error('Invalid input to extend: expected a plain object');
    let i = e._zod.def.checks;
    if (i && i.length > 0)
      throw new Error(
        'Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.',
      );
    let n = We(e._zod.def, {
      get shape() {
        let r = { ...e._zod.def.shape, ...t };
        return (Fe(this, 'shape', r), r);
      },
      checks: [],
    });
    return ge(e, n);
  }
  function rg(e, t) {
    if (!ht(t))
      throw new Error('Invalid input to safeExtend: expected a plain object');
    let i = {
      ...e._zod.def,
      get shape() {
        let n = { ...e._zod.def.shape, ...t };
        return (Fe(this, 'shape', n), n);
      },
      checks: e._zod.def.checks,
    };
    return ge(e, i);
  }
  function ag(e, t) {
    let i = We(e._zod.def, {
      get shape() {
        let n = { ...e._zod.def.shape, ...t._zod.def.shape };
        return (Fe(this, 'shape', n), n);
      },
      get catchall() {
        return t._zod.def.catchall;
      },
      checks: [],
    });
    return ge(e, i);
  }
  function og(e, t, i) {
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
        return (Fe(this, 'shape', o), o);
      },
      checks: [],
    });
    return ge(t, n);
  }
  function sg(e, t, i) {
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
        return (Fe(this, 'shape', o), o);
      },
      checks: [],
    });
    return ge(t, n);
  }
  function pt(e, t = 0) {
    var i;
    if (e.aborted === !0) return !0;
    for (let n = t; n < e.issues.length; n++)
      if (((i = e.issues[n]) == null ? void 0 : i.continue) !== !0) return !0;
    return !1;
  }
  function ye(e, t) {
    return t.map((i) => {
      var n;
      return ((n = i).path != null || (n.path = []), i.path.unshift(e), i);
    });
  }
  function on(e) {
    return typeof e == 'string' ? e : e?.message;
  }
  function $e(e, t, i) {
    var n, r, o, s, u, a, c, m, p, f, h;
    let N = { ...e, path: (n = e.path) != null ? n : [] };
    if (!e.message) {
      let k =
        (h =
          (f =
            (m =
              (a = on(
                (s =
                  (o = (r = e.inst) == null ? void 0 : r._zod.def) == null
                    ? void 0
                    : o.error) == null
                  ? void 0
                  : s.call(o, e),
              )) != null
                ? a
                : on((u = t?.error) == null ? void 0 : u.call(t, e))) != null
              ? m
              : on((c = i.customError) == null ? void 0 : c.call(i, e))) != null
            ? f
            : on((p = i.localeError) == null ? void 0 : p.call(i, e))) != null
          ? h
          : 'Invalid input';
      N.message = k;
    }
    return (
      delete N.inst,
      delete N.continue,
      t?.reportInput || delete N.input,
      N
    );
  }
  function ci(e) {
    return e instanceof Set
      ? 'set'
      : e instanceof Map
        ? 'map'
        : e instanceof File
          ? 'file'
          : 'unknown';
  }
  function li(e) {
    return Array.isArray(e)
      ? 'array'
      : typeof e == 'string'
        ? 'string'
        : 'unknown';
  }
  function ei(...e) {
    let [t, i, n] = e;
    return typeof t == 'string'
      ? { message: t, code: 'custom', input: i, inst: n }
      : { ...t };
  }
  function ug(e) {
    return Object.entries(e)
      .filter(([t, i]) => Number.isNaN(Number.parseInt(t, 10)))
      .map((t) => t[1]);
  }
  function As(e) {
    let t = atob(e),
      i = new Uint8Array(t.length);
    for (let n = 0; n < t.length; n++) i[n] = t.charCodeAt(n);
    return i;
  }
  function Zs(e) {
    let t = '';
    for (let i = 0; i < e.length; i++) t += String.fromCharCode(e[i]);
    return btoa(t);
  }
  function cg(e) {
    let t = e.replace(/-/g, '+').replace(/_/g, '/');
    return As(t + '='.repeat((4 - (t.length % 4)) % 4));
  }
  function lg(e) {
    return Zs(e).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
  function dg(e) {
    let t = e.replace(/^0x/, '');
    if (t.length % 2 != 0) throw new Error('Invalid hex string length');
    let i = new Uint8Array(t.length / 2);
    for (let n = 0; n < t.length; n += 2)
      i[n / 2] = Number.parseInt(t.slice(n, n + 2), 16);
    return i;
  }
  function mg(e) {
    return Array.from(e)
      .map((t) => t.toString(16).padStart(2, '0'))
      .join('');
  }
  var pg = class {
      constructor(...e) {}
    },
    Rs = (e, t) => {
      ((e.name = '$ZodError'),
        Object.defineProperty(e, '_zod', { value: e._zod, enumerable: !1 }),
        Object.defineProperty(e, 'issues', { value: t, enumerable: !1 }),
        (e.message = JSON.stringify(t, Yn, 2)),
        Object.defineProperty(e, 'toString', {
          value: () => e.message,
          enumerable: !1,
        }));
    },
    gr = v('$ZodError', Rs),
    ue = v('$ZodError', Rs, { Parent: Error });
  function hr(e, t = (i) => i.message) {
    let i = {},
      n = [];
    for (let r of e.issues)
      r.path.length > 0
        ? ((i[r.path[0]] = i[r.path[0]] || []), i[r.path[0]].push(t(r)))
        : n.push(t(r));
    return { formErrors: n, fieldErrors: i };
  }
  function br(e, t = (i) => i.message) {
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
  function Ls(e, t = (i) => i.message) {
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
                h = p === c.length - 1;
              (typeof f == 'string'
                ? (m.properties != null || (m.properties = {}),
                  (s = m.properties)[f] != null || (s[f] = { errors: [] }),
                  (m = m.properties[f]))
                : (m.items != null || (m.items = []),
                  (u = m.items)[f] != null || (u[f] = { errors: [] }),
                  (m = m.items[f])),
                h && m.errors.push(t(a)),
                p++);
            }
          }
      };
    return (n(e), i);
  }
  function Js(e) {
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
  function Ms(e) {
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
        (t = r.path) != null && t.length && i.push(`  → at ${Js(r.path)}`));
    return i.join(`
`);
  }
  var mn = (e) => (t, i, n, r) => {
      var o;
      let s = n ? Object.assign(n, { async: !1 }) : { async: !1 },
        u = t._zod.run({ value: i, issues: [] }, s);
      if (u instanceof Promise) throw new gt();
      if (u.issues.length) {
        let a = new ((o = r?.Err) != null ? o : e)(
          u.issues.map((c) => $e(c, s, ie())),
        );
        throw (vr(a, r?.callee), a);
      }
      return u.value;
    },
    rr = mn(ue),
    pn = (e) => async (t, i, n, r) => {
      var o;
      let s = n ? Object.assign(n, { async: !0 }) : { async: !0 },
        u = t._zod.run({ value: i, issues: [] }, s);
      if ((u instanceof Promise && (u = await u), u.issues.length)) {
        let a = new ((o = r?.Err) != null ? o : e)(
          u.issues.map((c) => $e(c, s, ie())),
        );
        throw (vr(a, r?.callee), a);
      }
      return u.value;
    },
    ar = pn(ue),
    fn = (e) => (t, i, n) => {
      let r = n ? { ...n, async: !1 } : { async: !1 },
        o = t._zod.run({ value: i, issues: [] }, r);
      if (o instanceof Promise) throw new gt();
      return o.issues.length
        ? {
            success: !1,
            error: new (e ?? gr)(o.issues.map((s) => $e(s, r, ie()))),
          }
        : { success: !0, data: o.value };
    },
    Vs = fn(ue),
    vn = (e) => async (t, i, n) => {
      let r = n ? Object.assign(n, { async: !0 }) : { async: !0 },
        o = t._zod.run({ value: i, issues: [] }, r);
      return (
        o instanceof Promise && (o = await o),
        o.issues.length
          ? { success: !1, error: new e(o.issues.map((s) => $e(s, r, ie()))) }
          : { success: !0, data: o.value }
      );
    },
    Fs = vn(ue),
    yr = (e) => (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return mn(e)(t, i, r);
    },
    fg = yr(ue),
    _r = (e) => (t, i, n) => mn(e)(t, i, n),
    vg = _r(ue),
    $r = (e) => async (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return pn(e)(t, i, r);
    },
    gg = $r(ue),
    kr = (e) => async (t, i, n) => pn(e)(t, i, n),
    hg = kr(ue),
    wr = (e) => (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return fn(e)(t, i, r);
    },
    bg = wr(ue),
    Sr = (e) => (t, i, n) => fn(e)(t, i, n),
    yg = Sr(ue),
    xr = (e) => async (t, i, n) => {
      let r = n
        ? Object.assign(n, { direction: 'backward' })
        : { direction: 'backward' };
      return vn(e)(t, i, r);
    },
    _g = xr(ue),
    Ir = (e) => async (t, i, n) => vn(e)(t, i, n),
    $g = Ir(ue),
    $t = {};
  ve($t, {
    base64: () => ou,
    base64url: () => jr,
    bigint: () => vu,
    boolean: () => bu,
    browserEmail: () => zg,
    cidrv4: () => ru,
    cidrv6: () => au,
    cuid: () => Ws,
    cuid2: () => qs,
    date: () => lu,
    datetime: () => pu,
    domain: () => Ug,
    duration: () => Xs,
    e164: () => uu,
    email: () => Qs,
    emoji: () => tu,
    extendedDuration: () => kg,
    guid: () => Ys,
    hex: () => Pg,
    hostname: () => su,
    html5Email: () => Ig,
    idnEmail: () => Og,
    integer: () => gu,
    ipv4: () => nu,
    ipv6: () => iu,
    ksuid: () => Ks,
    lowercase: () => $u,
    md5_base64: () => Dg,
    md5_base64url: () => Tg,
    md5_hex: () => Eg,
    nanoid: () => Hs,
    null: () => yu,
    number: () => hu,
    rfc5322Email: () => jg,
    sha1_base64: () => Ag,
    sha1_base64url: () => Zg,
    sha1_hex: () => Cg,
    sha256_base64: () => Lg,
    sha256_base64url: () => Jg,
    sha256_hex: () => Rg,
    sha384_base64: () => Vg,
    sha384_base64url: () => Fg,
    sha384_hex: () => Mg,
    sha512_base64: () => qg,
    sha512_base64url: () => Bg,
    sha512_hex: () => Wg,
    string: () => fu,
    time: () => mu,
    ulid: () => Bs,
    undefined: () => _u,
    unicodeEmail: () => eu,
    uppercase: () => ku,
    uuid: () => Rt,
    uuid4: () => wg,
    uuid6: () => Sg,
    uuid7: () => xg,
    xid: () => Gs,
  });
  var Ws = /^[cC][^\s-]{8,}$/,
    qs = /^[0-9a-z]+$/,
    Bs = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/,
    Gs = /^[0-9a-vA-V]{20}$/,
    Ks = /^[A-Za-z0-9]{27}$/,
    Hs = /^[a-zA-Z0-9_-]{21}$/,
    Xs =
      /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/,
    kg =
      /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/,
    Ys =
      /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/,
    Rt = (e) =>
      e
        ? new RegExp(
            `^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`,
          )
        : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/,
    wg = Rt(4),
    Sg = Rt(6),
    xg = Rt(7),
    Qs =
      /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/,
    Ig =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    jg =
      /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
    eu = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u,
    Og = eu,
    zg =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
    Ng = '^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$';
  function tu() {
    return new RegExp(Ng, 'u');
  }
  var nu =
      /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    iu =
      /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/,
    ru =
      /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/,
    au =
      /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    ou =
      /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/,
    jr = /^[A-Za-z0-9_-]*$/,
    su =
      /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/,
    Ug = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    uu = /^\+(?:[0-9]){6,14}[0-9]$/,
    cu =
      '(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))',
    lu = new RegExp(`^${cu}$`);
  function du(e) {
    let t = '(?:[01]\\d|2[0-3]):[0-5]\\d';
    return typeof e.precision == 'number'
      ? e.precision === -1
        ? `${t}`
        : e.precision === 0
          ? `${t}:[0-5]\\d`
          : `${t}:[0-5]\\d\\.\\d{${e.precision}}`
      : `${t}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  }
  function mu(e) {
    return new RegExp(`^${du(e)}$`);
  }
  function pu(e) {
    let t = du({ precision: e.precision }),
      i = ['Z'];
    (e.local && i.push(''),
      e.offset && i.push('([+-](?:[01]\\d|2[0-3]):[0-5]\\d)'));
    let n = `${t}(?:${i.join('|')})`;
    return new RegExp(`^${cu}T(?:${n})$`);
  }
  var fu = (e) => {
      var t, i;
      let n = e
        ? `[\\s\\S]{${(t = e?.minimum) != null ? t : 0},${(i = e?.maximum) != null ? i : ''}}`
        : '[\\s\\S]*';
      return new RegExp(`^${n}$`);
    },
    vu = /^-?\d+n?$/,
    gu = /^-?\d+$/,
    hu = /^-?\d+(?:\.\d+)?/,
    bu = /^(?:true|false)$/i,
    yu = /^null$/i,
    _u = /^undefined$/i,
    $u = /^[^A-Z]*$/,
    ku = /^[^a-z]*$/,
    Pg = /^[0-9a-fA-F]*$/;
  function gn(e, t) {
    return new RegExp(`^[A-Za-z0-9+/]{${e}}${t}$`);
  }
  function hn(e) {
    return new RegExp(`^[A-Za-z0-9_-]{${e}}$`);
  }
  var Eg = /^[0-9a-fA-F]{32}$/,
    Dg = gn(22, '=='),
    Tg = hn(22),
    Cg = /^[0-9a-fA-F]{40}$/,
    Ag = gn(27, '='),
    Zg = hn(27),
    Rg = /^[0-9a-fA-F]{64}$/,
    Lg = gn(43, '='),
    Jg = hn(43),
    Mg = /^[0-9a-fA-F]{96}$/,
    Vg = gn(64, ''),
    Fg = hn(64),
    Wg = /^[0-9a-fA-F]{128}$/,
    qg = gn(86, '=='),
    Bg = hn(86),
    q = v('$ZodCheck', (e, t) => {
      var i;
      (e._zod != null || (e._zod = {}),
        (e._zod.def = t),
        (i = e._zod).onattach != null || (i.onattach = []));
    }),
    wu = { number: 'number', bigint: 'bigint', object: 'date' },
    Or = v('$ZodCheckLessThan', (e, t) => {
      q.init(e, t);
      let i = wu[typeof t.value];
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
    zr = v('$ZodCheckGreaterThan', (e, t) => {
      q.init(e, t);
      let i = wu[typeof t.value];
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
    Su = v('$ZodCheckMultipleOf', (e, t) => {
      (q.init(e, t),
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
            : Ns(i.value, t.value) === 0) ||
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
    xu = v('$ZodCheckNumberFormat', (e, t) => {
      var i;
      (q.init(e, t), (t.format = t.format || 'float64'));
      let n = (i = t.format) == null ? void 0 : i.includes('int'),
        r = n ? 'int' : 'number',
        [o, s] = Ts[t.format];
      (e._zod.onattach.push((u) => {
        let a = u._zod.bag;
        ((a.format = t.format),
          (a.minimum = o),
          (a.maximum = s),
          n && (a.pattern = gu));
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
    Iu = v('$ZodCheckBigIntFormat', (e, t) => {
      q.init(e, t);
      let [i, n] = Cs[t.format];
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
    ju = v('$ZodCheckMaxSize', (e, t) => {
      var i;
      (q.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !_t(r) && r.size !== void 0;
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
              origin: ci(r),
              code: 'too_big',
              maximum: t.maximum,
              inclusive: !0,
              input: r,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    Ou = v('$ZodCheckMinSize', (e, t) => {
      var i;
      (q.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !_t(r) && r.size !== void 0;
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
              origin: ci(r),
              code: 'too_small',
              minimum: t.minimum,
              inclusive: !0,
              input: r,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    zu = v('$ZodCheckSizeEquals', (e, t) => {
      var i;
      (q.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !_t(r) && r.size !== void 0;
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
            origin: ci(r),
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
    Nu = v('$ZodCheckMaxLength', (e, t) => {
      var i;
      (q.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !_t(r) && r.length !== void 0;
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
          let o = li(r);
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
    Uu = v('$ZodCheckMinLength', (e, t) => {
      var i;
      (q.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !_t(r) && r.length !== void 0;
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
          let o = li(r);
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
    Pu = v('$ZodCheckLengthEquals', (e, t) => {
      var i;
      (q.init(e, t),
        (i = e._zod.def).when != null ||
          (i.when = (n) => {
            let r = n.value;
            return !_t(r) && r.length !== void 0;
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
          let s = li(r),
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
    bn = v('$ZodCheckStringFormat', (e, t) => {
      var i, n;
      (q.init(e, t),
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
    Eu = v('$ZodCheckRegex', (e, t) => {
      (bn.init(e, t),
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
    Du = v('$ZodCheckLowerCase', (e, t) => {
      (t.pattern != null || (t.pattern = $u), bn.init(e, t));
    }),
    Tu = v('$ZodCheckUpperCase', (e, t) => {
      (t.pattern != null || (t.pattern = ku), bn.init(e, t));
    }),
    Cu = v('$ZodCheckIncludes', (e, t) => {
      q.init(e, t);
      let i = Me(t.includes),
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
    Au = v('$ZodCheckStartsWith', (e, t) => {
      q.init(e, t);
      let i = new RegExp(`^${Me(t.prefix)}.*`);
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
    Zu = v('$ZodCheckEndsWith', (e, t) => {
      q.init(e, t);
      let i = new RegExp(`.*${Me(t.suffix)}$`);
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
  function ls(e, t, i) {
    e.issues.length && t.issues.push(...ye(i, e.issues));
  }
  var Ru = v('$ZodCheckProperty', (e, t) => {
      (q.init(e, t),
        (e._zod.check = (i) => {
          let n = t.schema._zod.run(
            { value: i.value[t.property], issues: [] },
            {},
          );
          if (n instanceof Promise) return n.then((r) => ls(r, i, t.property));
          ls(n, i, t.property);
        }));
    }),
    Lu = v('$ZodCheckMimeType', (e, t) => {
      q.init(e, t);
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
    Ju = v('$ZodCheckOverwrite', (e, t) => {
      (q.init(e, t),
        (e._zod.check = (i) => {
          i.value = t.tx(i.value);
        }));
    }),
    Mu = class {
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
    Vu = { major: 4, minor: 1, patch: 12 },
    T = v('$ZodType', (e, t) => {
      var i, n, r;
      (e != null || (e = {}),
        (e._zod.def = t),
        (e._zod.bag = e._zod.bag || {}),
        (e._zod.version = Vu));
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
              f = pt(a);
            for (let h of c) {
              if (h._zod.def.when) {
                if (!h._zod.def.when(a)) continue;
              } else if (f) continue;
              let N = a.issues.length,
                k = h._zod.check(a);
              if (k instanceof Promise && m?.async === !1) throw new gt();
              if (p || k instanceof Promise)
                p = (p ?? Promise.resolve()).then(async () => {
                  (await k, a.issues.length !== N && (f || (f = pt(a, N))));
                });
              else {
                if (a.issues.length === N) continue;
                f || (f = pt(a, N));
              }
            }
            return p ? p.then(() => a) : a;
          },
          u = (a, c, m) => {
            if (pt(a)) return ((a.aborted = !0), a);
            let p = s(c, o, m);
            if (p instanceof Promise) {
              if (m.async === !1) throw new gt();
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
            if (c.async === !1) throw new gt();
            return m.then((p) => s(p, o, c));
          }
          return s(m, o, c);
        };
      }
      e['~standard'] = {
        validate: (s) => {
          var u;
          try {
            let a = Vs(e, s);
            return a.success
              ? { value: a.data }
              : { issues: (u = a.error) == null ? void 0 : u.issues };
          } catch {
            return Fs(e, s).then((c) => {
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
    yn = v('$ZodString', (e, t) => {
      var i, n, r;
      (T.init(e, t),
        (e._zod.pattern =
          (r = [
            ...((n = (i = e?._zod.bag) == null ? void 0 : i.patterns) != null
              ? n
              : []),
          ].pop()) != null
            ? r
            : fu(e._zod.bag)),
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
    F = v('$ZodStringFormat', (e, t) => {
      (bn.init(e, t), yn.init(e, t));
    }),
    Fu = v('$ZodGUID', (e, t) => {
      (t.pattern != null || (t.pattern = Ys), F.init(e, t));
    }),
    Wu = v('$ZodUUID', (e, t) => {
      if (t.version) {
        let i = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[
          t.version
        ];
        if (i === void 0)
          throw new Error(`Invalid UUID version: "${t.version}"`);
        t.pattern != null || (t.pattern = Rt(i));
      } else t.pattern != null || (t.pattern = Rt());
      F.init(e, t);
    }),
    qu = v('$ZodEmail', (e, t) => {
      (t.pattern != null || (t.pattern = Qs), F.init(e, t));
    }),
    Bu = v('$ZodURL', (e, t) => {
      (F.init(e, t),
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
                    pattern: su.source,
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
    Gu = v('$ZodEmoji', (e, t) => {
      (t.pattern != null || (t.pattern = tu()), F.init(e, t));
    }),
    Ku = v('$ZodNanoID', (e, t) => {
      (t.pattern != null || (t.pattern = Hs), F.init(e, t));
    }),
    Hu = v('$ZodCUID', (e, t) => {
      (t.pattern != null || (t.pattern = Ws), F.init(e, t));
    }),
    Xu = v('$ZodCUID2', (e, t) => {
      (t.pattern != null || (t.pattern = qs), F.init(e, t));
    }),
    Yu = v('$ZodULID', (e, t) => {
      (t.pattern != null || (t.pattern = Bs), F.init(e, t));
    }),
    Qu = v('$ZodXID', (e, t) => {
      (t.pattern != null || (t.pattern = Gs), F.init(e, t));
    }),
    ec = v('$ZodKSUID', (e, t) => {
      (t.pattern != null || (t.pattern = Ks), F.init(e, t));
    }),
    tc = v('$ZodISODateTime', (e, t) => {
      (t.pattern != null || (t.pattern = pu(t)), F.init(e, t));
    }),
    nc = v('$ZodISODate', (e, t) => {
      (t.pattern != null || (t.pattern = lu), F.init(e, t));
    }),
    ic = v('$ZodISOTime', (e, t) => {
      (t.pattern != null || (t.pattern = mu(t)), F.init(e, t));
    }),
    rc = v('$ZodISODuration', (e, t) => {
      (t.pattern != null || (t.pattern = Xs), F.init(e, t));
    }),
    ac = v('$ZodIPv4', (e, t) => {
      (t.pattern != null || (t.pattern = nu),
        F.init(e, t),
        e._zod.onattach.push((i) => {
          i._zod.bag.format = 'ipv4';
        }));
    }),
    oc = v('$ZodIPv6', (e, t) => {
      (t.pattern != null || (t.pattern = iu),
        F.init(e, t),
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
    sc = v('$ZodCIDRv4', (e, t) => {
      (t.pattern != null || (t.pattern = ru), F.init(e, t));
    }),
    uc = v('$ZodCIDRv6', (e, t) => {
      (t.pattern != null || (t.pattern = au),
        F.init(e, t),
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
  function Nr(e) {
    if (e === '') return !0;
    if (e.length % 4 != 0) return !1;
    try {
      return (atob(e), !0);
    } catch {
      return !1;
    }
  }
  var cc = v('$ZodBase64', (e, t) => {
    (t.pattern != null || (t.pattern = ou),
      F.init(e, t),
      e._zod.onattach.push((i) => {
        i._zod.bag.contentEncoding = 'base64';
      }),
      (e._zod.check = (i) => {
        Nr(i.value) ||
          i.issues.push({
            code: 'invalid_format',
            format: 'base64',
            input: i.value,
            inst: e,
            continue: !t.abort,
          });
      }));
  });
  function lc(e) {
    if (!jr.test(e)) return !1;
    let t = e.replace(/[-_]/g, (i) => (i === '-' ? '+' : '/'));
    return Nr(t.padEnd(4 * Math.ceil(t.length / 4), '='));
  }
  var dc = v('$ZodBase64URL', (e, t) => {
      (t.pattern != null || (t.pattern = jr),
        F.init(e, t),
        e._zod.onattach.push((i) => {
          i._zod.bag.contentEncoding = 'base64url';
        }),
        (e._zod.check = (i) => {
          lc(i.value) ||
            i.issues.push({
              code: 'invalid_format',
              format: 'base64url',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    mc = v('$ZodE164', (e, t) => {
      (t.pattern != null || (t.pattern = uu), F.init(e, t));
    });
  function pc(e, t = null) {
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
  var fc = v('$ZodJWT', (e, t) => {
      (F.init(e, t),
        (e._zod.check = (i) => {
          pc(i.value, t.alg) ||
            i.issues.push({
              code: 'invalid_format',
              format: 'jwt',
              input: i.value,
              inst: e,
              continue: !t.abort,
            });
        }));
    }),
    vc = v('$ZodCustomStringFormat', (e, t) => {
      (F.init(e, t),
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
    Ur = v('$ZodNumber', (e, t) => {
      var i;
      (T.init(e, t),
        (e._zod.pattern = (i = e._zod.bag.pattern) != null ? i : hu),
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
    gc = v('$ZodNumber', (e, t) => {
      (xu.init(e, t), Ur.init(e, t));
    }),
    Pr = v('$ZodBoolean', (e, t) => {
      (T.init(e, t),
        (e._zod.pattern = bu),
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
    Er = v('$ZodBigInt', (e, t) => {
      (T.init(e, t),
        (e._zod.pattern = vu),
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
    hc = v('$ZodBigInt', (e, t) => {
      (Iu.init(e, t), Er.init(e, t));
    }),
    bc = v('$ZodSymbol', (e, t) => {
      (T.init(e, t),
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
    yc = v('$ZodUndefined', (e, t) => {
      (T.init(e, t),
        (e._zod.pattern = _u),
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
    _c = v('$ZodNull', (e, t) => {
      (T.init(e, t),
        (e._zod.pattern = yu),
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
    $c = v('$ZodAny', (e, t) => {
      (T.init(e, t), (e._zod.parse = (i) => i));
    }),
    kc = v('$ZodUnknown', (e, t) => {
      (T.init(e, t), (e._zod.parse = (i) => i));
    }),
    wc = v('$ZodNever', (e, t) => {
      (T.init(e, t),
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
    Sc = v('$ZodVoid', (e, t) => {
      (T.init(e, t),
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
    xc = v('$ZodDate', (e, t) => {
      (T.init(e, t),
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
  function ds(e, t, i) {
    (e.issues.length && t.issues.push(...ye(i, e.issues)),
      (t.value[i] = e.value));
  }
  var Ic = v('$ZodArray', (e, t) => {
    (T.init(e, t),
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
            ? o.push(a.then((c) => ds(c, i, s)))
            : ds(a, i, s);
        }
        return o.length ? Promise.all(o).then(() => i) : i;
      }));
  });
  function ti(e, t, i, n) {
    (e.issues.length && t.issues.push(...ye(i, e.issues)),
      e.value === void 0
        ? i in n && (t.value[i] = void 0)
        : (t.value[i] = e.value));
  }
  function jc(e) {
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
    let s = Ds(e.shape);
    return {
      ...e,
      keys: o,
      keySet: new Set(o),
      numKeys: o.length,
      optionalKeys: new Set(s),
    };
  }
  function Oc(e, t, i, n, r, o) {
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
        ? e.push(p.then((f) => ti(f, i, m, t)))
        : ti(p, i, m, t);
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
  var zc = v('$ZodObject', (e, t) => {
      T.init(e, t);
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
      let n = dn(() => jc(t));
      J(e._zod, 'propValues', () => {
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
      let r = Zt,
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
          let h = p[f]._zod.run({ value: c[f], issues: [] }, a);
          h instanceof Promise
            ? m.push(h.then((N) => ti(N, u, f, c)))
            : ti(h, u, f, c);
        }
        return o
          ? Oc(m, c, u, a, n.value, e)
          : m.length
            ? Promise.all(m).then(() => u)
            : u;
      };
    }),
    Nc = v('$ZodObjectJIT', (e, t) => {
      zc.init(e, t);
      let i = e._zod.parse,
        n = dn(() => jc(t)),
        r,
        o = Zt,
        s = !Xn.jitless,
        u = s && Us.value,
        a = t.catchall,
        c;
      e._zod.parse = (m, p) => {
        c != null || (c = n.value);
        let f = m.value;
        return o(f)
          ? s && u && p?.async === !1 && p.jitless !== !0
            ? (r ||
                (r = ((h) => {
                  let N = new Mu(['shape', 'payload', 'ctx']),
                    k = n.value,
                    g = (I) => {
                      let E = ir(I);
                      return `shape[${E}]._zod.run({ value: input[${E}], issues: [] }, ctx)`;
                    };
                  N.write('const input = payload.value;');
                  let y = Object.create(null),
                    w = 0;
                  for (let I of k.keys) y[I] = 'key_' + w++;
                  N.write('const newResult = {};');
                  for (let I of k.keys) {
                    let E = y[I],
                      V = ir(I);
                    (N.write(`const ${E} = ${g(I)};`),
                      N.write(`
        if (${E}.issues.length) {
          payload.issues = payload.issues.concat(${E}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${V}, ...iss.path] : [${V}]
          })));
        }
        
        
        if (${E}.value === undefined) {
          if (${V} in input) {
            newResult[${V}] = undefined;
          }
        } else {
          newResult[${V}] = ${E}.value;
        }
        
      `));
                  }
                  (N.write('payload.value = newResult;'),
                    N.write('return payload;'));
                  let j = N.compile();
                  return (I, E) => j(h, I, E);
                })(t.shape)),
              (m = r(m, p)),
              a ? Oc([], f, m, p, c, e) : m)
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
  function ms(e, t, i, n) {
    for (let o of e) if (o.issues.length === 0) return ((t.value = o.value), t);
    let r = e.filter((o) => !pt(o));
    return r.length === 1
      ? ((t.value = r[0].value), r[0])
      : (t.issues.push({
          code: 'invalid_union',
          input: t.value,
          inst: i,
          errors: e.map((o) => o.issues.map((s) => $e(s, n, ie()))),
        }),
        t);
  }
  var Dr = v('$ZodUnion', (e, t) => {
      (T.init(e, t),
        J(e._zod, 'optin', () =>
          t.options.some((r) => r._zod.optin === 'optional')
            ? 'optional'
            : void 0,
        ),
        J(e._zod, 'optout', () =>
          t.options.some((r) => r._zod.optout === 'optional')
            ? 'optional'
            : void 0,
        ),
        J(e._zod, 'values', () => {
          if (t.options.every((r) => r._zod.values))
            return new Set(t.options.flatMap((r) => Array.from(r._zod.values)));
        }),
        J(e._zod, 'pattern', () => {
          if (t.options.every((r) => r._zod.pattern)) {
            let r = t.options.map((o) => o._zod.pattern);
            return new RegExp(`^(${r.map((o) => ui(o.source)).join('|')})$`);
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
        return s ? Promise.all(u).then((a) => ms(a, r, e, o)) : ms(u, r, e, o);
      };
    }),
    Uc = v('$ZodDiscriminatedUnion', (e, t) => {
      Dr.init(e, t);
      let i = e._zod.parse;
      J(e._zod, 'propValues', () => {
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
      let n = dn(() => {
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
        if (!Zt(s))
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
    Pc = v('$ZodIntersection', (e, t) => {
      (T.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value,
            o = t.left._zod.run({ value: r, issues: [] }, n),
            s = t.right._zod.run({ value: r, issues: [] }, n);
          return o instanceof Promise || s instanceof Promise
            ? Promise.all([o, s]).then(([u, a]) => ps(i, u, a))
            : ps(i, o, s);
        }));
    });
  function or(e, t) {
    if (e === t) return { valid: !0, data: e };
    if (e instanceof Date && t instanceof Date && +e == +t)
      return { valid: !0, data: e };
    if (ht(e) && ht(t)) {
      let i = Object.keys(t),
        n = Object.keys(e).filter((o) => i.indexOf(o) !== -1),
        r = { ...e, ...t };
      for (let o of n) {
        let s = or(e[o], t[o]);
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
        let r = or(e[n], t[n]);
        if (!r.valid)
          return { valid: !1, mergeErrorPath: [n, ...r.mergeErrorPath] };
        i.push(r.data);
      }
      return { valid: !0, data: i };
    }
    return { valid: !1, mergeErrorPath: [] };
  }
  function ps(e, t, i) {
    if (
      (t.issues.length && e.issues.push(...t.issues),
      i.issues.length && e.issues.push(...i.issues),
      pt(e))
    )
      return e;
    let n = or(t.value, i.value);
    if (!n.valid)
      throw new Error(
        `Unmergable intersection. Error path: ${JSON.stringify(n.mergeErrorPath)}`,
      );
    return ((e.value = n.data), e);
  }
  var Tr = v('$ZodTuple', (e, t) => {
    T.init(e, t);
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
        m instanceof Promise ? u.push(m.then((p) => qn(p, r, a))) : qn(m, r, a);
      }
      if (t.rest) {
        let c = s.slice(i.length);
        for (let m of c) {
          a++;
          let p = t.rest._zod.run({ value: m, issues: [] }, o);
          p instanceof Promise
            ? u.push(p.then((f) => qn(f, r, a)))
            : qn(p, r, a);
        }
      }
      return u.length ? Promise.all(u).then(() => r) : r;
    };
  });
  function qn(e, t, i) {
    (e.issues.length && t.issues.push(...ye(i, e.issues)),
      (t.value[i] = e.value));
  }
  var Ec = v('$ZodRecord', (e, t) => {
      (T.init(e, t),
        (e._zod.parse = (i, n) => {
          let r = i.value;
          if (!ht(r))
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
                        (m.issues.length && i.issues.push(...ye(a, m.issues)),
                          (i.value[a] = m.value));
                      }),
                    )
                  : (c.issues.length && i.issues.push(...ye(a, c.issues)),
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
                  issues: u.issues.map((c) => $e(c, n, ie())),
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
                      (c.issues.length && i.issues.push(...ye(s, c.issues)),
                        (i.value[u.value] = c.value));
                    }),
                  )
                : (a.issues.length && i.issues.push(...ye(s, a.issues)),
                  (i.value[u.value] = a.value));
            }
          }
          return o.length ? Promise.all(o).then(() => i) : i;
        }));
    }),
    Dc = v('$ZodMap', (e, t) => {
      (T.init(e, t),
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
                    fs(m, p, i, s, r, e, n);
                  }),
                )
              : fs(a, c, i, s, r, e, n);
          }
          return o.length ? Promise.all(o).then(() => i) : i;
        }));
    });
  function fs(e, t, i, n, r, o, s) {
    (e.issues.length &&
      (Qn.has(typeof n)
        ? i.issues.push(...ye(n, e.issues))
        : i.issues.push({
            code: 'invalid_key',
            origin: 'map',
            input: r,
            inst: o,
            issues: e.issues.map((u) => $e(u, s, ie())),
          })),
      t.issues.length &&
        (Qn.has(typeof n)
          ? i.issues.push(...ye(n, t.issues))
          : i.issues.push({
              origin: 'map',
              code: 'invalid_element',
              input: r,
              inst: o,
              key: n,
              issues: t.issues.map((u) => $e(u, s, ie())),
            })),
      i.value.set(e.value, t.value));
  }
  var Tc = v('$ZodSet', (e, t) => {
    (T.init(e, t),
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
          u instanceof Promise ? o.push(u.then((a) => vs(a, i))) : vs(u, i);
        }
        return o.length ? Promise.all(o).then(() => i) : i;
      }));
  });
  function vs(e, t) {
    (e.issues.length && t.issues.push(...e.issues), t.value.add(e.value));
  }
  var Cc = v('$ZodEnum', (e, t) => {
      T.init(e, t);
      let i = fr(t.entries),
        n = new Set(i);
      ((e._zod.values = n),
        (e._zod.pattern = new RegExp(
          `^(${i
            .filter((r) => Qn.has(typeof r))
            .map((r) => (typeof r == 'string' ? Me(r) : r.toString()))
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
    Ac = v('$ZodLiteral', (e, t) => {
      if ((T.init(e, t), t.values.length === 0))
        throw new Error('Cannot create literal schema with no valid values');
      ((e._zod.values = new Set(t.values)),
        (e._zod.pattern = new RegExp(
          `^(${t.values.map((i) => (typeof i == 'string' ? Me(i) : i ? Me(i.toString()) : String(i))).join('|')})$`,
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
    Zc = v('$ZodFile', (e, t) => {
      (T.init(e, t),
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
    Rc = v('$ZodTransform', (e, t) => {
      (T.init(e, t),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') throw new si(e.constructor.name);
          let r = t.transform(i.value, i);
          if (n.async)
            return (r instanceof Promise ? r : Promise.resolve(r)).then(
              (o) => ((i.value = o), i),
            );
          if (r instanceof Promise) throw new gt();
          return ((i.value = r), i);
        }));
    });
  function gs(e, t) {
    return e.issues.length && t === void 0 ? { issues: [], value: void 0 } : e;
  }
  var Lc = v('$ZodOptional', (e, t) => {
      (T.init(e, t),
        (e._zod.optin = 'optional'),
        (e._zod.optout = 'optional'),
        J(e._zod, 'values', () =>
          t.innerType._zod.values
            ? new Set([...t.innerType._zod.values, void 0])
            : void 0,
        ),
        J(e._zod, 'pattern', () => {
          let i = t.innerType._zod.pattern;
          return i ? new RegExp(`^(${ui(i.source)})?$`) : void 0;
        }),
        (e._zod.parse = (i, n) => {
          if (t.innerType._zod.optin === 'optional') {
            let r = t.innerType._zod.run(i, n);
            return r instanceof Promise
              ? r.then((o) => gs(o, i.value))
              : gs(r, i.value);
          }
          return i.value === void 0 ? i : t.innerType._zod.run(i, n);
        }));
    }),
    Jc = v('$ZodNullable', (e, t) => {
      (T.init(e, t),
        J(e._zod, 'optin', () => t.innerType._zod.optin),
        J(e._zod, 'optout', () => t.innerType._zod.optout),
        J(e._zod, 'pattern', () => {
          let i = t.innerType._zod.pattern;
          return i ? new RegExp(`^(${ui(i.source)}|null)$`) : void 0;
        }),
        J(e._zod, 'values', () =>
          t.innerType._zod.values
            ? new Set([...t.innerType._zod.values, null])
            : void 0,
        ),
        (e._zod.parse = (i, n) =>
          i.value === null ? i : t.innerType._zod.run(i, n)));
    }),
    Mc = v('$ZodDefault', (e, t) => {
      (T.init(e, t),
        (e._zod.optin = 'optional'),
        J(e._zod, 'values', () => t.innerType._zod.values),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') return t.innerType._zod.run(i, n);
          if (i.value === void 0) return ((i.value = t.defaultValue), i);
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise ? r.then((o) => hs(o, t)) : hs(r, t);
        }));
    });
  function hs(e, t) {
    return (e.value === void 0 && (e.value = t.defaultValue), e);
  }
  var Vc = v('$ZodPrefault', (e, t) => {
      (T.init(e, t),
        (e._zod.optin = 'optional'),
        J(e._zod, 'values', () => t.innerType._zod.values),
        (e._zod.parse = (i, n) => (
          n.direction === 'backward' ||
            (i.value === void 0 && (i.value = t.defaultValue)),
          t.innerType._zod.run(i, n)
        )));
    }),
    Fc = v('$ZodNonOptional', (e, t) => {
      (T.init(e, t),
        J(e._zod, 'values', () => {
          let i = t.innerType._zod.values;
          return i ? new Set([...i].filter((n) => n !== void 0)) : void 0;
        }),
        (e._zod.parse = (i, n) => {
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise ? r.then((o) => bs(o, e)) : bs(r, e);
        }));
    });
  function bs(e, t) {
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
  var Wc = v('$ZodSuccess', (e, t) => {
      (T.init(e, t),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') throw new si('ZodSuccess');
          let r = t.innerType._zod.run(i, n);
          return r instanceof Promise
            ? r.then((o) => ((i.value = o.issues.length === 0), i))
            : ((i.value = r.issues.length === 0), i);
        }));
    }),
    qc = v('$ZodCatch', (e, t) => {
      (T.init(e, t),
        J(e._zod, 'optin', () => t.innerType._zod.optin),
        J(e._zod, 'optout', () => t.innerType._zod.optout),
        J(e._zod, 'values', () => t.innerType._zod.values),
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
                      error: { issues: o.issues.map((s) => $e(s, n, ie())) },
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
                  error: { issues: r.issues.map((o) => $e(o, n, ie())) },
                  input: i.value,
                })),
                (i.issues = [])),
              i);
        }));
    }),
    Bc = v('$ZodNaN', (e, t) => {
      (T.init(e, t),
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
    Gc = v('$ZodPipe', (e, t) => {
      (T.init(e, t),
        J(e._zod, 'values', () => t.in._zod.values),
        J(e._zod, 'optin', () => t.in._zod.optin),
        J(e._zod, 'optout', () => t.out._zod.optout),
        J(e._zod, 'propValues', () => t.in._zod.propValues),
        (e._zod.parse = (i, n) => {
          if (n.direction === 'backward') {
            let o = t.out._zod.run(i, n);
            return o instanceof Promise
              ? o.then((s) => Bn(s, t.in, n))
              : Bn(o, t.in, n);
          }
          let r = t.in._zod.run(i, n);
          return r instanceof Promise
            ? r.then((o) => Bn(o, t.out, n))
            : Bn(r, t.out, n);
        }));
    });
  function Bn(e, t, i) {
    return e.issues.length
      ? ((e.aborted = !0), e)
      : t._zod.run({ value: e.value, issues: e.issues }, i);
  }
  var Cr = v('$ZodCodec', (e, t) => {
    (T.init(e, t),
      J(e._zod, 'values', () => t.in._zod.values),
      J(e._zod, 'optin', () => t.in._zod.optin),
      J(e._zod, 'optout', () => t.out._zod.optout),
      J(e._zod, 'propValues', () => t.in._zod.propValues),
      (e._zod.parse = (i, n) => {
        if ((n.direction || 'forward') === 'forward') {
          let r = t.in._zod.run(i, n);
          return r instanceof Promise
            ? r.then((o) => Gn(o, t, n))
            : Gn(r, t, n);
        }
        {
          let r = t.out._zod.run(i, n);
          return r instanceof Promise
            ? r.then((o) => Gn(o, t, n))
            : Gn(r, t, n);
        }
      }));
  });
  function Gn(e, t, i) {
    if (e.issues.length) return ((e.aborted = !0), e);
    if ((i.direction || 'forward') === 'forward') {
      let n = t.transform(e.value, e);
      return n instanceof Promise
        ? n.then((r) => Kn(e, r, t.out, i))
        : Kn(e, n, t.out, i);
    }
    {
      let n = t.reverseTransform(e.value, e);
      return n instanceof Promise
        ? n.then((r) => Kn(e, r, t.in, i))
        : Kn(e, n, t.in, i);
    }
  }
  function Kn(e, t, i, n) {
    return e.issues.length
      ? ((e.aborted = !0), e)
      : i._zod.run({ value: t, issues: e.issues }, n);
  }
  var Kc = v('$ZodReadonly', (e, t) => {
    (T.init(e, t),
      J(e._zod, 'propValues', () => t.innerType._zod.propValues),
      J(e._zod, 'values', () => t.innerType._zod.values),
      J(e._zod, 'optin', () => t.innerType._zod.optin),
      J(e._zod, 'optout', () => t.innerType._zod.optout),
      (e._zod.parse = (i, n) => {
        if (n.direction === 'backward') return t.innerType._zod.run(i, n);
        let r = t.innerType._zod.run(i, n);
        return r instanceof Promise ? r.then(ys) : ys(r);
      }));
  });
  function ys(e) {
    return ((e.value = Object.freeze(e.value)), e);
  }
  var Hc = v('$ZodTemplateLiteral', (e, t) => {
      T.init(e, t);
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
          if (n !== null && !Es.has(typeof n))
            throw new Error(`Invalid template literal part: ${n}`);
          i.push(Me(`${n}`));
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
    Xc = v(
      '$ZodFunction',
      (e, t) => (
        T.init(e, t),
        (e._def = t),
        (e._zod.def = t),
        (e.implement = (i) => {
          if (typeof i != 'function')
            throw new Error('implement() must be called with a function');
          return function (...n) {
            let r = e._def.input ? rr(e._def.input, n) : n,
              o = Reflect.apply(i, this, r);
            return e._def.output ? rr(e._def.output, o) : o;
          };
        }),
        (e.implementAsync = (i) => {
          if (typeof i != 'function')
            throw new Error('implementAsync() must be called with a function');
          return async function (...n) {
            let r = e._def.input ? await ar(e._def.input, n) : n,
              o = await Reflect.apply(i, this, r);
            return e._def.output ? await ar(e._def.output, o) : o;
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
                input: new Tr({ type: 'tuple', items: i[0], rest: i[1] }),
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
    Yc = v('$ZodPromise', (e, t) => {
      (T.init(e, t),
        (e._zod.parse = (i, n) =>
          Promise.resolve(i.value).then((r) =>
            t.innerType._zod.run({ value: r, issues: [] }, n),
          )));
    }),
    Qc = v('$ZodLazy', (e, t) => {
      (T.init(e, t),
        J(e._zod, 'innerType', () => t.getter()),
        J(e._zod, 'pattern', () => e._zod.innerType._zod.pattern),
        J(e._zod, 'propValues', () => e._zod.innerType._zod.propValues),
        J(e._zod, 'optin', () => {
          var i;
          return (i = e._zod.innerType._zod.optin) != null ? i : void 0;
        }),
        J(e._zod, 'optout', () => {
          var i;
          return (i = e._zod.innerType._zod.optout) != null ? i : void 0;
        }),
        (e._zod.parse = (i, n) => e._zod.innerType._zod.run(i, n)));
    }),
    el = v('$ZodCustom', (e, t) => {
      (q.init(e, t),
        T.init(e, t),
        (e._zod.parse = (i, n) => i),
        (e._zod.check = (i) => {
          let n = i.value,
            r = t.fn(n);
          if (r instanceof Promise) return r.then((o) => _s(o, i, n, e));
          _s(r, i, n, e);
        }));
    });
  function _s(e, t, i, n) {
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
        t.issues.push(ei(o)));
    }
  }
  var Ar = {};
  ve(Ar, {
    ar: () => Kg,
    az: () => Xg,
    be: () => Qg,
    bg: () => th,
    ca: () => ih,
    cs: () => ah,
    da: () => sh,
    de: () => ch,
    en: () => tl,
    eo: () => mh,
    es: () => fh,
    fa: () => gh,
    fi: () => bh,
    fr: () => _h,
    frCA: () => kh,
    he: () => Sh,
    hu: () => Ih,
    id: () => Oh,
    is: () => Nh,
    it: () => Ph,
    ja: () => Dh,
    ka: () => Ch,
    kh: () => Zh,
    km: () => nl,
    ko: () => Lh,
    lt: () => Mh,
    mk: () => Fh,
    ms: () => qh,
    nl: () => Gh,
    no: () => Hh,
    ota: () => Yh,
    pl: () => nb,
    ps: () => eb,
    pt: () => rb,
    ru: () => ob,
    sl: () => ub,
    sv: () => lb,
    ta: () => mb,
    th: () => fb,
    tr: () => gb,
    ua: () => bb,
    uk: () => il,
    ur: () => _b,
    vi: () => kb,
    yo: () => Ob,
    zhCN: () => Sb,
    zhTW: () => Ib,
  });
  var Gg = () => {
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
            ? `مدخلات غير مقبولة: يفترض إدخال ${P(n.values[0])}`
            : `اختيار غير مقبول: يتوقع انتقاء أحد هذه الخيارات: ${_(n.values, '|')}`;
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
          return `معرف${n.keys.length > 1 ? 'ات' : ''} غريب${n.keys.length > 1 ? 'ة' : ''}: ${_(n.keys, '، ')}`;
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
  function Kg() {
    return { localeError: Gg() };
  }
  var Hg = () => {
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
            ? `Yanlış dəyər: gözlənilən ${P(n.values[0])}`
            : `Yanlış seçim: aşağıdakılardan biri olmalıdır: ${_(n.values, '|')}`;
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
          return `Tanınmayan açar${n.keys.length > 1 ? 'lar' : ''}: ${_(n.keys, ', ')}`;
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
  function Xg() {
    return { localeError: Hg() };
  }
  function $s(e, t, i, n) {
    let r = Math.abs(e),
      o = r % 10,
      s = r % 100;
    return s >= 11 && s <= 19 ? n : o === 1 ? t : o >= 2 && o <= 4 ? i : n;
  }
  var Yg = () => {
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
            ? `Няправільны ўвод: чакалася ${P(n.values[0])}`
            : `Няправільны варыянт: чакаўся адзін з ${_(n.values, '|')}`;
        case 'too_big': {
          let u = n.inclusive ? '<=' : '<',
            a = t(n.origin);
          if (a) {
            let c = $s(Number(n.maximum), a.unit.one, a.unit.few, a.unit.many);
            return `Занадта вялікі: чакалася, што ${(r = n.origin) != null ? r : 'значэнне'} павінна ${a.verb} ${u}${n.maximum.toString()} ${c}`;
          }
          return `Занадта вялікі: чакалася, што ${(o = n.origin) != null ? o : 'значэнне'} павінна быць ${u}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let u = n.inclusive ? '>=' : '>',
            a = t(n.origin);
          if (a) {
            let c = $s(Number(n.minimum), a.unit.one, a.unit.few, a.unit.many);
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
          return `Нераспазнаны ${n.keys.length > 1 ? 'ключы' : 'ключ'}: ${_(n.keys, ', ')}`;
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
  function Qg() {
    return { localeError: Yg() };
  }
  var eh = () => {
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
            ? `Невалиден вход: очакван ${P(n.values[0])}`
            : `Невалидна опция: очаквано едно от ${_(n.values, '|')}`;
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
          return `Неразпознат${n.keys.length > 1 ? 'и' : ''} ключ${n.keys.length > 1 ? 'ове' : ''}: ${_(n.keys, ', ')}`;
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
  function th() {
    return { localeError: eh() };
  }
  var nh = () => {
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
            ? `Valor invàlid: s'esperava ${P(n.values[0])}`
            : `Opció invàlida: s'esperava una de ${_(n.values, ' o ')}`;
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
          return `Clau${n.keys.length > 1 ? 's' : ''} no reconeguda${n.keys.length > 1 ? 's' : ''}: ${_(n.keys, ', ')}`;
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
  function ih() {
    return { localeError: nh() };
  }
  var rh = () => {
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
            ? `Neplatný vstup: očekáváno ${P(n.values[0])}`
            : `Neplatná možnost: očekávána jedna z hodnot ${_(n.values, '|')}`;
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
          return `Neznámé klíče: ${_(n.keys, ', ')}`;
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
  function ah() {
    return { localeError: rh() };
  }
  var oh = () => {
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
            ? `Ugyldig værdi: forventede ${P(o.values[0])}`
            : `Ugyldigt valg: forventede en af følgende ${_(o.values, '|')}`;
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
          return `${o.keys.length > 1 ? 'Ukendte nøgler' : 'Ukendt nøgle'}: ${_(o.keys, ', ')}`;
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
  function sh() {
    return { localeError: oh() };
  }
  var uh = () => {
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
            ? `Ungültige Eingabe: erwartet ${P(n.values[0])}`
            : `Ungültige Option: erwartet eine von ${_(n.values, '|')}`;
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
          return `${n.keys.length > 1 ? 'Unbekannte Schlüssel' : 'Unbekannter Schlüssel'}: ${_(n.keys, ', ')}`;
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
  function ch() {
    return { localeError: uh() };
  }
  var lh = () => {
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
            ? `Invalid input: expected ${P(n.values[0])}`
            : `Invalid option: expected one of ${_(n.values, '|')}`;
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
          return `Unrecognized key${n.keys.length > 1 ? 's' : ''}: ${_(n.keys, ', ')}`;
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
  function tl() {
    return { localeError: lh() };
  }
  var dh = () => {
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
            ? `Nevalida enigo: atendiĝis ${P(n.values[0])}`
            : `Nevalida opcio: atendiĝis unu el ${_(n.values, '|')}`;
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
          return `Nekonata${n.keys.length > 1 ? 'j' : ''} ŝlosilo${n.keys.length > 1 ? 'j' : ''}: ${_(n.keys, ', ')}`;
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
  function mh() {
    return { localeError: dh() };
  }
  var ph = () => {
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
            ? `Entrada inválida: se esperaba ${P(o.values[0])}`
            : `Opción inválida: se esperaba una de ${_(o.values, '|')}`;
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
          return `Llave${o.keys.length > 1 ? 's' : ''} desconocida${o.keys.length > 1 ? 's' : ''}: ${_(o.keys, ', ')}`;
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
  function fh() {
    return { localeError: ph() };
  }
  var vh = () => {
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
            ? `ورودی نامعتبر: می‌بایست ${P(n.values[0])} می‌بود`
            : `گزینه نامعتبر: می‌بایست یکی از ${_(n.values, '|')} می‌بود`;
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
          return `کلید${n.keys.length > 1 ? 'های' : ''} ناشناس: ${_(n.keys, ', ')}`;
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
  function gh() {
    return { localeError: vh() };
  }
  var hh = () => {
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
            ? `Virheellinen syöte: täytyy olla ${P(n.values[0])}`
            : `Virheellinen valinta: täytyy olla yksi seuraavista: ${_(n.values, '|')}`;
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
          return `${n.keys.length > 1 ? 'Tuntemattomat avaimet' : 'Tuntematon avain'}: ${_(n.keys, ', ')}`;
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
  function bh() {
    return { localeError: hh() };
  }
  var yh = () => {
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
            ? `Entrée invalide : ${P(n.values[0])} attendu`
            : `Option invalide : une valeur parmi ${_(n.values, '|')} attendue`;
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
          return `Clé${n.keys.length > 1 ? 's' : ''} non reconnue${n.keys.length > 1 ? 's' : ''} : ${_(n.keys, ', ')}`;
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
  function _h() {
    return { localeError: yh() };
  }
  var $h = () => {
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
            ? `Entrée invalide : attendu ${P(n.values[0])}`
            : `Option invalide : attendu l'une des valeurs suivantes ${_(n.values, '|')}`;
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
          return `Clé${n.keys.length > 1 ? 's' : ''} non reconnue${n.keys.length > 1 ? 's' : ''} : ${_(n.keys, ', ')}`;
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
  function kh() {
    return { localeError: $h() };
  }
  var wh = () => {
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
            ? `קלט לא תקין: צריך ${P(n.values[0])}`
            : `קלט לא תקין: צריך אחת מהאפשרויות  ${_(n.values, '|')}`;
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
          return `מפתח${n.keys.length > 1 ? 'ות' : ''} לא מזוה${n.keys.length > 1 ? 'ים' : 'ה'}: ${_(n.keys, ', ')}`;
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
  function Sh() {
    return { localeError: wh() };
  }
  var xh = () => {
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
            ? `Érvénytelen bemenet: a várt érték ${P(n.values[0])}`
            : `Érvénytelen opció: valamelyik érték várt ${_(n.values, '|')}`;
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
          return `Ismeretlen kulcs${n.keys.length > 1 ? 's' : ''}: ${_(n.keys, ', ')}`;
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
  function Ih() {
    return { localeError: xh() };
  }
  var jh = () => {
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
            ? `Input tidak valid: diharapkan ${P(n.values[0])}`
            : `Pilihan tidak valid: diharapkan salah satu dari ${_(n.values, '|')}`;
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
          return `Kunci tidak dikenali ${n.keys.length > 1 ? 's' : ''}: ${_(n.keys, ', ')}`;
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
  function Oh() {
    return { localeError: jh() };
  }
  var zh = () => {
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
            ? `Rangt gildi: gert ráð fyrir ${P(n.values[0])}`
            : `Ógilt val: má vera eitt af eftirfarandi ${_(n.values, '|')}`;
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
          return `Óþekkt ${n.keys.length > 1 ? 'ir lyklar' : 'ur lykill'}: ${_(n.keys, ', ')}`;
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
  function Nh() {
    return { localeError: zh() };
  }
  var Uh = () => {
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
            ? `Input non valido: atteso ${P(n.values[0])}`
            : `Opzione non valida: atteso uno tra ${_(n.values, '|')}`;
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
          return `Chiav${n.keys.length > 1 ? 'i' : 'e'} non riconosciut${n.keys.length > 1 ? 'e' : 'a'}: ${_(n.keys, ', ')}`;
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
  function Ph() {
    return { localeError: Uh() };
  }
  var Eh = () => {
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
            ? `無効な入力: ${P(n.values[0])}が期待されました`
            : `無効な選択: ${_(n.values, '、')}のいずれかである必要があります`;
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
          return `認識されていないキー${n.keys.length > 1 ? '群' : ''}: ${_(n.keys, '、')}`;
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
  function Dh() {
    return { localeError: Eh() };
  }
  var Th = () => {
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
            ? `არასწორი შეყვანა: მოსალოდნელი ${P(n.values[0])}`
            : `არასწორი ვარიანტი: მოსალოდნელია ერთ-ერთი ${_(n.values, '|')}-დან`;
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
          return `უცნობი გასაღებ${n.keys.length > 1 ? 'ები' : 'ი'}: ${_(n.keys, ', ')}`;
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
  function Ch() {
    return { localeError: Th() };
  }
  var Ah = () => {
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
            ? `ទិន្នន័យបញ្ចូលមិនត្រឹមត្រូវ៖ ត្រូវការ ${P(n.values[0])}`
            : `ជម្រើសមិនត្រឹមត្រូវ៖ ត្រូវជាមួយក្នុងចំណោម ${_(n.values, '|')}`;
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
          return `រកឃើញសោមិនស្គាល់៖ ${_(n.keys, ', ')}`;
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
  function nl() {
    return { localeError: Ah() };
  }
  function Zh() {
    return nl();
  }
  var Rh = () => {
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
            ? `잘못된 입력: 값은 ${P(n.values[0])} 이어야 합니다`
            : `잘못된 옵션: ${_(n.values, '또는 ')} 중 하나여야 합니다`;
        case 'too_big': {
          let p = n.inclusive ? '이하' : '미만',
            f = p === '미만' ? '이어야 합니다' : '여야 합니다',
            h = t(n.origin),
            N = (r = h?.unit) != null ? r : '요소';
          return h
            ? `${(o = n.origin) != null ? o : '값'}이 너무 큽니다: ${n.maximum.toString()}${N} ${p}${f}`
            : `${(s = n.origin) != null ? s : '값'}이 너무 큽니다: ${n.maximum.toString()} ${p}${f}`;
        }
        case 'too_small': {
          let p = n.inclusive ? '이상' : '초과',
            f = p === '이상' ? '이어야 합니다' : '여야 합니다',
            h = t(n.origin),
            N = (u = h?.unit) != null ? u : '요소';
          return h
            ? `${(a = n.origin) != null ? a : '값'}이 너무 작습니다: ${n.minimum.toString()}${N} ${p}${f}`
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
          return `인식할 수 없는 키: ${_(n.keys, ', ')}`;
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
  function Lh() {
    return { localeError: Rh() };
  }
  var rn = (e, t = void 0) => {
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
    an = (e) => e.charAt(0).toUpperCase() + e.slice(1);
  function ks(e) {
    let t = Math.abs(e),
      i = t % 10,
      n = t % 100;
    return (n >= 11 && n <= 19) || i === 0 ? 'many' : i === 1 ? 'one' : 'few';
  }
  var Jh = () => {
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
      var r, o, s, u, a, c, m, p, f, h, N;
      switch (n.code) {
        case 'invalid_type':
          return `Gautas tipas ${((N = n.input), rn(typeof N, N))}, o tikėtasi - ${rn(n.expected)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Privalo būti ${P(n.values[0])}`
            : `Privalo būti vienas iš ${_(n.values, '|')} pasirinkimų`;
        case 'too_big': {
          let k = rn(n.origin),
            g = t(
              n.origin,
              ks(Number(n.maximum)),
              (r = n.inclusive) != null && r,
              'smaller',
            );
          if (g?.verb)
            return `${an((o = k ?? n.origin) != null ? o : 'reikšmė')} ${g.verb} ${n.maximum.toString()} ${(s = g.unit) != null ? s : 'elementų'}`;
          let y = n.inclusive ? 'ne didesnis kaip' : 'mažesnis kaip';
          return `${an((u = k ?? n.origin) != null ? u : 'reikšmė')} turi būti ${y} ${n.maximum.toString()} ${g?.unit}`;
        }
        case 'too_small': {
          let k = rn(n.origin),
            g = t(
              n.origin,
              ks(Number(n.minimum)),
              (a = n.inclusive) != null && a,
              'bigger',
            );
          if (g?.verb)
            return `${an((c = k ?? n.origin) != null ? c : 'reikšmė')} ${g.verb} ${n.minimum.toString()} ${(m = g.unit) != null ? m : 'elementų'}`;
          let y = n.inclusive ? 'ne mažesnis kaip' : 'didesnis kaip';
          return `${an((p = k ?? n.origin) != null ? p : 'reikšmė')} turi būti ${y} ${n.minimum.toString()} ${g?.unit}`;
        }
        case 'invalid_format': {
          let k = n;
          return k.format === 'starts_with'
            ? `Eilutė privalo prasidėti "${k.prefix}"`
            : k.format === 'ends_with'
              ? `Eilutė privalo pasibaigti "${k.suffix}"`
              : k.format === 'includes'
                ? `Eilutė privalo įtraukti "${k.includes}"`
                : k.format === 'regex'
                  ? `Eilutė privalo atitikti ${k.pattern}`
                  : `Neteisingas ${(f = i[k.format]) != null ? f : n.format}`;
        }
        case 'not_multiple_of':
          return `Skaičius privalo būti ${n.divisor} kartotinis.`;
        case 'unrecognized_keys':
          return `Neatpažint${n.keys.length > 1 ? 'i' : 'as'} rakt${n.keys.length > 1 ? 'ai' : 'as'}: ${_(n.keys, ', ')}`;
        case 'invalid_key':
          return 'Rastas klaidingas raktas';
        case 'invalid_union':
        default:
          return 'Klaidinga įvestis';
        case 'invalid_element': {
          let k = rn(n.origin);
          return `${an((h = k ?? n.origin) != null ? h : 'reikšmė')} turi klaidingą įvestį`;
        }
      }
    };
  };
  function Mh() {
    return { localeError: Jh() };
  }
  var Vh = () => {
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
            ? `Invalid input: expected ${P(n.values[0])}`
            : `Грешана опција: се очекува една ${_(n.values, '|')}`;
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
          return `${n.keys.length > 1 ? 'Непрепознаени клучеви' : 'Непрепознаен клуч'}: ${_(n.keys, ', ')}`;
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
  function Fh() {
    return { localeError: Vh() };
  }
  var Wh = () => {
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
            ? `Input tidak sah: dijangka ${P(n.values[0])}`
            : `Pilihan tidak sah: dijangka salah satu daripada ${_(n.values, '|')}`;
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
          return `Kunci tidak dikenali: ${_(n.keys, ', ')}`;
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
  function qh() {
    return { localeError: Wh() };
  }
  var Bh = () => {
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
            ? `Ongeldige invoer: verwacht ${P(n.values[0])}`
            : `Ongeldige optie: verwacht één van ${_(n.values, '|')}`;
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
          return `Onbekende key${n.keys.length > 1 ? 's' : ''}: ${_(n.keys, ', ')}`;
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
  function Gh() {
    return { localeError: Bh() };
  }
  var Kh = () => {
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
            ? `Ugyldig verdi: forventet ${P(n.values[0])}`
            : `Ugyldig valg: forventet en av ${_(n.values, '|')}`;
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
          return `${n.keys.length > 1 ? 'Ukjente nøkler' : 'Ukjent nøkkel'}: ${_(n.keys, ', ')}`;
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
  function Hh() {
    return { localeError: Kh() };
  }
  var Xh = () => {
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
            ? `Fâsit giren: umulan ${P(n.values[0])}`
            : `Fâsit tercih: mûteberler ${_(n.values, '|')}`;
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
          return `Tanınmayan anahtar ${n.keys.length > 1 ? 's' : ''}: ${_(n.keys, ', ')}`;
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
  function Yh() {
    return { localeError: Xh() };
  }
  var Qh = () => {
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
            ? `ناسم ورودي: باید ${P(n.values[0])} وای`
            : `ناسم انتخاب: باید یو له ${_(n.values, '|')} څخه وای`;
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
          return `ناسم ${n.keys.length > 1 ? 'کلیډونه' : 'کلیډ'}: ${_(n.keys, ', ')}`;
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
  function eb() {
    return { localeError: Qh() };
  }
  var tb = () => {
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
            ? `Nieprawidłowe dane wejściowe: oczekiwano ${P(n.values[0])}`
            : `Nieprawidłowa opcja: oczekiwano jednej z wartości ${_(n.values, '|')}`;
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
          return `Nierozpoznane klucze${n.keys.length > 1 ? 's' : ''}: ${_(n.keys, ', ')}`;
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
  function nb() {
    return { localeError: tb() };
  }
  var ib = () => {
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
            ? `Entrada inválida: esperado ${P(n.values[0])}`
            : `Opção inválida: esperada uma das ${_(n.values, '|')}`;
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
          return `Chave${n.keys.length > 1 ? 's' : ''} desconhecida${n.keys.length > 1 ? 's' : ''}: ${_(n.keys, ', ')}`;
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
  function rb() {
    return { localeError: ib() };
  }
  function ws(e, t, i, n) {
    let r = Math.abs(e),
      o = r % 10,
      s = r % 100;
    return s >= 11 && s <= 19 ? n : o === 1 ? t : o >= 2 && o <= 4 ? i : n;
  }
  var ab = () => {
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
            ? `Неверный ввод: ожидалось ${P(n.values[0])}`
            : `Неверный вариант: ожидалось одно из ${_(n.values, '|')}`;
        case 'too_big': {
          let u = n.inclusive ? '<=' : '<',
            a = t(n.origin);
          if (a) {
            let c = ws(Number(n.maximum), a.unit.one, a.unit.few, a.unit.many);
            return `Слишком большое значение: ожидалось, что ${(r = n.origin) != null ? r : 'значение'} будет иметь ${u}${n.maximum.toString()} ${c}`;
          }
          return `Слишком большое значение: ожидалось, что ${(o = n.origin) != null ? o : 'значение'} будет ${u}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let u = n.inclusive ? '>=' : '>',
            a = t(n.origin);
          if (a) {
            let c = ws(Number(n.minimum), a.unit.one, a.unit.few, a.unit.many);
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
          return `Нераспознанн${n.keys.length > 1 ? 'ые' : 'ый'} ключ${n.keys.length > 1 ? 'и' : ''}: ${_(n.keys, ', ')}`;
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
  function ob() {
    return { localeError: ab() };
  }
  var sb = () => {
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
            ? `Neveljaven vnos: pričakovano ${P(n.values[0])}`
            : `Neveljavna možnost: pričakovano eno izmed ${_(n.values, '|')}`;
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
          return `Neprepoznan${n.keys.length > 1 ? 'i ključi' : ' ključ'}: ${_(n.keys, ', ')}`;
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
  function ub() {
    return { localeError: sb() };
  }
  var cb = () => {
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
            let h = typeof f;
            switch (h) {
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
            return h;
          })(n.input)}`;
        case 'invalid_value':
          return n.values.length === 1
            ? `Ogiltig inmatning: förväntat ${P(n.values[0])}`
            : `Ogiltigt val: förväntade en av ${_(n.values, '|')}`;
        case 'too_big': {
          let f = n.inclusive ? '<=' : '<',
            h = t(n.origin);
          return h
            ? `För stor(t): förväntade ${(r = n.origin) != null ? r : 'värdet'} att ha ${f}${n.maximum.toString()} ${(o = h.unit) != null ? o : 'element'}`
            : `För stor(t): förväntat ${(s = n.origin) != null ? s : 'värdet'} att ha ${f}${n.maximum.toString()}`;
        }
        case 'too_small': {
          let f = n.inclusive ? '>=' : '>',
            h = t(n.origin);
          return h
            ? `För lite(t): förväntade ${(u = n.origin) != null ? u : 'värdet'} att ha ${f}${n.minimum.toString()} ${h.unit}`
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
          return `${n.keys.length > 1 ? 'Okända nycklar' : 'Okänd nyckel'}: ${_(n.keys, ', ')}`;
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
  function lb() {
    return { localeError: cb() };
  }
  var db = () => {
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
            ? `தவறான உள்ளீடு: எதிர்பார்க்கப்பட்டது ${P(n.values[0])}`
            : `தவறான விருப்பம்: எதிர்பார்க்கப்பட்டது ${_(n.values, '|')} இல் ஒன்று`;
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
          return `அடையாளம் தெரியாத விசை${n.keys.length > 1 ? 'கள்' : ''}: ${_(n.keys, ', ')}`;
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
  function mb() {
    return { localeError: db() };
  }
  var pb = () => {
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
            ? `ค่าไม่ถูกต้อง: ควรเป็น ${P(n.values[0])}`
            : `ตัวเลือกไม่ถูกต้อง: ควรเป็นหนึ่งใน ${_(n.values, '|')}`;
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
          return `พบคีย์ที่ไม่รู้จัก: ${_(n.keys, ', ')}`;
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
  function fb() {
    return { localeError: pb() };
  }
  var vb = () => {
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
            ? `Geçersiz değer: beklenen ${P(n.values[0])}`
            : `Geçersiz seçenek: aşağıdakilerden biri olmalı: ${_(n.values, '|')}`;
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
          return `Tanınmayan anahtar${n.keys.length > 1 ? 'lar' : ''}: ${_(n.keys, ', ')}`;
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
  function gb() {
    return { localeError: vb() };
  }
  var hb = () => {
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
            ? `Неправильні вхідні дані: очікується ${P(n.values[0])}`
            : `Неправильна опція: очікується одне з ${_(n.values, '|')}`;
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
          return `Нерозпізнаний ключ${n.keys.length > 1 ? 'і' : ''}: ${_(n.keys, ', ')}`;
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
  function il() {
    return { localeError: hb() };
  }
  function bb() {
    return il();
  }
  var yb = () => {
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
            ? `غلط ان پٹ: ${P(n.values[0])} متوقع تھا`
            : `غلط آپشن: ${_(n.values, '|')} میں سے ایک متوقع تھا`;
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
          return `غیر تسلیم شدہ کی${n.keys.length > 1 ? 'ز' : ''}: ${_(n.keys, '، ')}`;
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
  function _b() {
    return { localeError: yb() };
  }
  var $b = () => {
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
            ? `Đầu vào không hợp lệ: mong đợi ${P(n.values[0])}`
            : `Tùy chọn không hợp lệ: mong đợi một trong các giá trị ${_(n.values, '|')}`;
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
          return `Khóa không được nhận dạng: ${_(n.keys, ', ')}`;
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
  function kb() {
    return { localeError: $b() };
  }
  var wb = () => {
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
            ? `无效输入：期望 ${P(n.values[0])}`
            : `无效选项：期望以下之一 ${_(n.values, '|')}`;
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
          return `出现未知的键(key): ${_(n.keys, ', ')}`;
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
  function Sb() {
    return { localeError: wb() };
  }
  var xb = () => {
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
            ? `無效的輸入值：預期為 ${P(n.values[0])}`
            : `無效的選項：預期為以下其中之一 ${_(n.values, '|')}`;
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
          return `無法識別的鍵值${n.keys.length > 1 ? '們' : ''}：${_(n.keys, '、')}`;
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
  function Ib() {
    return { localeError: xb() };
  }
  var jb = () => {
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
            ? `Ìbáwọlé aṣìṣe: a ní láti fi ${P(n.values[0])}`
            : `Àṣàyàn aṣìṣe: yan ọ̀kan lára ${_(n.values, '|')}`;
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
          return `Bọtìnì àìmọ̀: ${_(n.keys, ', ')}`;
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
  function Ob() {
    return { localeError: jb() };
  }
  var rl = Symbol('ZodOutput'),
    al = Symbol('ZodInput'),
    Zr = class {
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
  function Rr() {
    return new Zr();
  }
  var ft = Rr();
  function ol(e, t) {
    return new e({ type: 'string', ...$(t) });
  }
  function sl(e, t) {
    return new e({ type: 'string', coerce: !0, ...$(t) });
  }
  function Lr(e, t) {
    return new e({
      type: 'string',
      format: 'email',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function ni(e, t) {
    return new e({
      type: 'string',
      format: 'guid',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function Jr(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function Mr(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      version: 'v4',
      ...$(t),
    });
  }
  function Vr(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      version: 'v6',
      ...$(t),
    });
  }
  function Fr(e, t) {
    return new e({
      type: 'string',
      format: 'uuid',
      check: 'string_format',
      abort: !1,
      version: 'v7',
      ...$(t),
    });
  }
  function di(e, t) {
    return new e({
      type: 'string',
      format: 'url',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function Wr(e, t) {
    return new e({
      type: 'string',
      format: 'emoji',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function qr(e, t) {
    return new e({
      type: 'string',
      format: 'nanoid',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function Br(e, t) {
    return new e({
      type: 'string',
      format: 'cuid',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function Gr(e, t) {
    return new e({
      type: 'string',
      format: 'cuid2',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function Kr(e, t) {
    return new e({
      type: 'string',
      format: 'ulid',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function Hr(e, t) {
    return new e({
      type: 'string',
      format: 'xid',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function Xr(e, t) {
    return new e({
      type: 'string',
      format: 'ksuid',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function Yr(e, t) {
    return new e({
      type: 'string',
      format: 'ipv4',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function Qr(e, t) {
    return new e({
      type: 'string',
      format: 'ipv6',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function ea(e, t) {
    return new e({
      type: 'string',
      format: 'cidrv4',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function ta(e, t) {
    return new e({
      type: 'string',
      format: 'cidrv6',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function na(e, t) {
    return new e({
      type: 'string',
      format: 'base64',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function ia(e, t) {
    return new e({
      type: 'string',
      format: 'base64url',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function ra(e, t) {
    return new e({
      type: 'string',
      format: 'e164',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  function aa(e, t) {
    return new e({
      type: 'string',
      format: 'jwt',
      check: 'string_format',
      abort: !1,
      ...$(t),
    });
  }
  var ul = { Any: null, Minute: -1, Second: 0, Millisecond: 3, Microsecond: 6 };
  function cl(e, t) {
    return new e({
      type: 'string',
      format: 'datetime',
      check: 'string_format',
      offset: !1,
      local: !1,
      precision: null,
      ...$(t),
    });
  }
  function ll(e, t) {
    return new e({
      type: 'string',
      format: 'date',
      check: 'string_format',
      ...$(t),
    });
  }
  function dl(e, t) {
    return new e({
      type: 'string',
      format: 'time',
      check: 'string_format',
      precision: null,
      ...$(t),
    });
  }
  function ml(e, t) {
    return new e({
      type: 'string',
      format: 'duration',
      check: 'string_format',
      ...$(t),
    });
  }
  function pl(e, t) {
    return new e({ type: 'number', checks: [], ...$(t) });
  }
  function fl(e, t) {
    return new e({ type: 'number', coerce: !0, checks: [], ...$(t) });
  }
  function vl(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'safeint',
      ...$(t),
    });
  }
  function gl(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'float32',
      ...$(t),
    });
  }
  function hl(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'float64',
      ...$(t),
    });
  }
  function bl(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'int32',
      ...$(t),
    });
  }
  function yl(e, t) {
    return new e({
      type: 'number',
      check: 'number_format',
      abort: !1,
      format: 'uint32',
      ...$(t),
    });
  }
  function _l(e, t) {
    return new e({ type: 'boolean', ...$(t) });
  }
  function $l(e, t) {
    return new e({ type: 'boolean', coerce: !0, ...$(t) });
  }
  function kl(e, t) {
    return new e({ type: 'bigint', ...$(t) });
  }
  function wl(e, t) {
    return new e({ type: 'bigint', coerce: !0, ...$(t) });
  }
  function Sl(e, t) {
    return new e({
      type: 'bigint',
      check: 'bigint_format',
      abort: !1,
      format: 'int64',
      ...$(t),
    });
  }
  function xl(e, t) {
    return new e({
      type: 'bigint',
      check: 'bigint_format',
      abort: !1,
      format: 'uint64',
      ...$(t),
    });
  }
  function Il(e, t) {
    return new e({ type: 'symbol', ...$(t) });
  }
  function jl(e, t) {
    return new e({ type: 'undefined', ...$(t) });
  }
  function Ol(e, t) {
    return new e({ type: 'null', ...$(t) });
  }
  function zl(e) {
    return new e({ type: 'any' });
  }
  function Nl(e) {
    return new e({ type: 'unknown' });
  }
  function Ul(e, t) {
    return new e({ type: 'never', ...$(t) });
  }
  function Pl(e, t) {
    return new e({ type: 'void', ...$(t) });
  }
  function El(e, t) {
    return new e({ type: 'date', ...$(t) });
  }
  function Dl(e, t) {
    return new e({ type: 'date', coerce: !0, ...$(t) });
  }
  function Tl(e, t) {
    return new e({ type: 'nan', ...$(t) });
  }
  function bt(e, t) {
    return new Or({ check: 'less_than', ...$(t), value: e, inclusive: !1 });
  }
  function _e(e, t) {
    return new Or({ check: 'less_than', ...$(t), value: e, inclusive: !0 });
  }
  function yt(e, t) {
    return new zr({ check: 'greater_than', ...$(t), value: e, inclusive: !1 });
  }
  function se(e, t) {
    return new zr({ check: 'greater_than', ...$(t), value: e, inclusive: !0 });
  }
  function Cl(e) {
    return yt(0, e);
  }
  function Al(e) {
    return bt(0, e);
  }
  function Zl(e) {
    return _e(0, e);
  }
  function Rl(e) {
    return se(0, e);
  }
  function sn(e, t) {
    return new Su({ check: 'multiple_of', ...$(t), value: e });
  }
  function mi(e, t) {
    return new ju({ check: 'max_size', ...$(t), maximum: e });
  }
  function un(e, t) {
    return new Ou({ check: 'min_size', ...$(t), minimum: e });
  }
  function oa(e, t) {
    return new zu({ check: 'size_equals', ...$(t), size: e });
  }
  function pi(e, t) {
    return new Nu({ check: 'max_length', ...$(t), maximum: e });
  }
  function Lt(e, t) {
    return new Uu({ check: 'min_length', ...$(t), minimum: e });
  }
  function fi(e, t) {
    return new Pu({ check: 'length_equals', ...$(t), length: e });
  }
  function sa(e, t) {
    return new Eu({
      check: 'string_format',
      format: 'regex',
      ...$(t),
      pattern: e,
    });
  }
  function ua(e) {
    return new Du({ check: 'string_format', format: 'lowercase', ...$(e) });
  }
  function ca(e) {
    return new Tu({ check: 'string_format', format: 'uppercase', ...$(e) });
  }
  function la(e, t) {
    return new Cu({
      check: 'string_format',
      format: 'includes',
      ...$(t),
      includes: e,
    });
  }
  function da(e, t) {
    return new Au({
      check: 'string_format',
      format: 'starts_with',
      ...$(t),
      prefix: e,
    });
  }
  function ma(e, t) {
    return new Zu({
      check: 'string_format',
      format: 'ends_with',
      ...$(t),
      suffix: e,
    });
  }
  function Ll(e, t, i) {
    return new Ru({ check: 'property', property: e, schema: t, ...$(i) });
  }
  function pa(e, t) {
    return new Lu({ check: 'mime_type', mime: e, ...$(t) });
  }
  function kt(e) {
    return new Ju({ check: 'overwrite', tx: e });
  }
  function fa(e) {
    return kt((t) => t.normalize(e));
  }
  function va() {
    return kt((e) => e.trim());
  }
  function ga() {
    return kt((e) => e.toLowerCase());
  }
  function ha() {
    return kt((e) => e.toUpperCase());
  }
  function Jl(e, t, i) {
    return new e({ type: 'array', element: t, ...$(i) });
  }
  function zb(e, t, i) {
    return new e({ type: 'union', options: t, ...$(i) });
  }
  function Nb(e, t, i, n) {
    return new e({ type: 'union', options: i, discriminator: t, ...$(n) });
  }
  function Ub(e, t, i) {
    return new e({ type: 'intersection', left: t, right: i });
  }
  function Pb(e, t, i, n) {
    let r = i instanceof T;
    return new e({
      type: 'tuple',
      items: t,
      rest: r ? i : null,
      ...$(r ? n : i),
    });
  }
  function Eb(e, t, i, n) {
    return new e({ type: 'record', keyType: t, valueType: i, ...$(n) });
  }
  function Db(e, t, i, n) {
    return new e({ type: 'map', keyType: t, valueType: i, ...$(n) });
  }
  function Tb(e, t, i) {
    return new e({ type: 'set', valueType: t, ...$(i) });
  }
  function Cb(e, t, i) {
    return new e({
      type: 'enum',
      entries: Array.isArray(t) ? Object.fromEntries(t.map((n) => [n, n])) : t,
      ...$(i),
    });
  }
  function Ab(e, t, i) {
    return new e({ type: 'enum', entries: t, ...$(i) });
  }
  function Zb(e, t, i) {
    return new e({
      type: 'literal',
      values: Array.isArray(t) ? t : [t],
      ...$(i),
    });
  }
  function Ml(e, t) {
    return new e({ type: 'file', ...$(t) });
  }
  function Rb(e, t) {
    return new e({ type: 'transform', transform: t });
  }
  function Lb(e, t) {
    return new e({ type: 'optional', innerType: t });
  }
  function Jb(e, t) {
    return new e({ type: 'nullable', innerType: t });
  }
  function Mb(e, t, i) {
    return new e({
      type: 'default',
      innerType: t,
      get defaultValue() {
        return typeof i == 'function' ? i() : Ps(i);
      },
    });
  }
  function Vb(e, t, i) {
    return new e({ type: 'nonoptional', innerType: t, ...$(i) });
  }
  function Fb(e, t) {
    return new e({ type: 'success', innerType: t });
  }
  function Wb(e, t, i) {
    return new e({
      type: 'catch',
      innerType: t,
      catchValue: typeof i == 'function' ? i : () => i,
    });
  }
  function qb(e, t, i) {
    return new e({ type: 'pipe', in: t, out: i });
  }
  function Bb(e, t) {
    return new e({ type: 'readonly', innerType: t });
  }
  function Gb(e, t, i) {
    return new e({ type: 'template_literal', parts: t, ...$(i) });
  }
  function Kb(e, t) {
    return new e({ type: 'lazy', getter: t });
  }
  function Hb(e, t) {
    return new e({ type: 'promise', innerType: t });
  }
  function Vl(e, t, i) {
    let n = $(i);
    return (
      n.abort != null || (n.abort = !0),
      new e({ type: 'custom', check: 'custom', fn: t, ...n })
    );
  }
  function Fl(e, t, i) {
    return new e({ type: 'custom', check: 'custom', fn: t, ...$(i) });
  }
  function Wl(e) {
    let t = ql(
      (i) => (
        (i.addIssue = (n) => {
          if (typeof n == 'string') i.issues.push(ei(n, i.value, t._zod.def));
          else {
            let r = n;
            (r.fatal && (r.continue = !1),
              r.code != null || (r.code = 'custom'),
              r.input != null || (r.input = i.value),
              r.inst != null || (r.inst = t),
              r.continue != null || (r.continue = !t._zod.def.abort),
              i.issues.push(ei(r)));
          }
        }),
        e(i.value, i)
      ),
    );
    return t;
  }
  function ql(e, t) {
    let i = new q({ check: 'custom', ...$(t) });
    return ((i._zod.check = e), i);
  }
  function Bl(e, t) {
    var i, n, r, o, s;
    let u = $(t),
      a =
        (i = u.truthy) != null ? i : ['true', '1', 'yes', 'on', 'y', 'enabled'],
      c =
        (n = u.falsy) != null
          ? n
          : ['false', '0', 'no', 'off', 'n', 'disabled'];
    u.case !== 'sensitive' &&
      ((a = a.map((k) => (typeof k == 'string' ? k.toLowerCase() : k))),
      (c = c.map((k) => (typeof k == 'string' ? k.toLowerCase() : k))));
    let m = new Set(a),
      p = new Set(c),
      f = (r = e.Codec) != null ? r : Cr,
      h = (o = e.Boolean) != null ? o : Pr,
      N = new f({
        type: 'pipe',
        in: new ((s = e.String) != null ? s : yn)({
          type: 'string',
          error: u.error,
        }),
        out: new h({ type: 'boolean', error: u.error }),
        transform: (k, g) => {
          let y = k;
          return (
            u.case !== 'sensitive' && (y = y.toLowerCase()),
            !!m.has(y) ||
              (!p.has(y) &&
                (g.issues.push({
                  code: 'invalid_value',
                  expected: 'stringbool',
                  values: [...m, ...p],
                  input: g.value,
                  inst: N,
                  continue: !1,
                }),
                {}))
          );
        },
        reverseTransform: (k, g) =>
          k === !0 ? a[0] || 'true' : c[0] || 'false',
        error: u.error,
      });
    return N;
  }
  function _n(e, t, i, n = {}) {
    let r = $(n),
      o = {
        ...$(n),
        check: 'string_format',
        type: 'string',
        format: t,
        fn: typeof i == 'function' ? i : (s) => i.test(s),
        ...r,
      };
    return (i instanceof RegExp && (o.pattern = i), new e(o));
  }
  var sr = class {
    constructor(e) {
      var t, i, n, r, o;
      ((this.counter = 0),
        (this.metadataRegistry = (t = e?.metadata) != null ? t : ft),
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
        let h = { ...t, schemaPath: [...t.schemaPath, e], path: t.path },
          N = e._zod.parent;
        if (N)
          ((m.ref = N), this.process(N, h), (this.seen.get(N).isParent = !0));
        else {
          let k = m.schema;
          switch (u.type) {
            case 'string': {
              let g = k;
              g.type = 'string';
              let {
                minimum: y,
                maximum: w,
                format: j,
                patterns: I,
                contentEncoding: E,
              } = e._zod.bag;
              if (
                (typeof y == 'number' && (g.minLength = y),
                typeof w == 'number' && (g.maxLength = w),
                j &&
                  ((g.format = (r = a[j]) != null ? r : j),
                  g.format === '' && delete g.format),
                E && (g.contentEncoding = E),
                I && I.size > 0)
              ) {
                let V = [...I];
                V.length === 1
                  ? (g.pattern = V[0].source)
                  : V.length > 1 &&
                    (m.schema.allOf = [
                      ...V.map((B) => ({
                        ...(this.target === 'draft-7' ||
                        this.target === 'draft-4' ||
                        this.target === 'openapi-3.0'
                          ? { type: 'string' }
                          : {}),
                        pattern: B.source,
                      })),
                    ]);
              }
              break;
            }
            case 'number': {
              let g = k,
                {
                  minimum: y,
                  maximum: w,
                  format: j,
                  multipleOf: I,
                  exclusiveMaximum: E,
                  exclusiveMinimum: V,
                } = e._zod.bag;
              (typeof j == 'string' && j.includes('int')
                ? (g.type = 'integer')
                : (g.type = 'number'),
                typeof V == 'number' &&
                  (this.target === 'draft-4' || this.target === 'openapi-3.0'
                    ? ((g.minimum = V), (g.exclusiveMinimum = !0))
                    : (g.exclusiveMinimum = V)),
                typeof y == 'number' &&
                  ((g.minimum = y),
                  typeof V == 'number' &&
                    this.target !== 'draft-4' &&
                    (V >= y ? delete g.minimum : delete g.exclusiveMinimum)),
                typeof E == 'number' &&
                  (this.target === 'draft-4' || this.target === 'openapi-3.0'
                    ? ((g.maximum = E), (g.exclusiveMaximum = !0))
                    : (g.exclusiveMaximum = E)),
                typeof w == 'number' &&
                  ((g.maximum = w),
                  typeof E == 'number' &&
                    this.target !== 'draft-4' &&
                    (E <= w ? delete g.maximum : delete g.exclusiveMaximum)),
                typeof I == 'number' && (g.multipleOf = I));
              break;
            }
            case 'boolean':
              k.type = 'boolean';
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
                ? ((k.type = 'string'), (k.nullable = !0), (k.enum = [null]))
                : (k.type = 'null');
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
              k.not = {};
              break;
            case 'date':
              if (this.unrepresentable === 'throw')
                throw new Error('Date cannot be represented in JSON Schema');
              break;
            case 'array': {
              let g = k,
                { minimum: y, maximum: w } = e._zod.bag;
              (typeof y == 'number' && (g.minItems = y),
                typeof w == 'number' && (g.maxItems = w),
                (g.type = 'array'),
                (g.items = this.process(u.element, {
                  ...h,
                  path: [...h.path, 'items'],
                })));
              break;
            }
            case 'object': {
              let g = k;
              ((g.type = 'object'), (g.properties = {}));
              let y = u.shape;
              for (let I in y)
                g.properties[I] = this.process(y[I], {
                  ...h,
                  path: [...h.path, 'properties', I],
                });
              let w = new Set(Object.keys(y)),
                j = new Set(
                  [...w].filter((I) => {
                    let E = u.shape[I]._zod;
                    return this.io === 'input'
                      ? E.optin === void 0
                      : E.optout === void 0;
                  }),
                );
              (j.size > 0 && (g.required = Array.from(j)),
                ((o = u.catchall) == null ? void 0 : o._zod.def.type) ===
                'never'
                  ? (g.additionalProperties = !1)
                  : u.catchall
                    ? u.catchall &&
                      (g.additionalProperties = this.process(u.catchall, {
                        ...h,
                        path: [...h.path, 'additionalProperties'],
                      }))
                    : this.io === 'output' && (g.additionalProperties = !1));
              break;
            }
            case 'union': {
              let g = k,
                y = u.options.map((w, j) =>
                  this.process(w, { ...h, path: [...h.path, 'anyOf', j] }),
                );
              g.anyOf = y;
              break;
            }
            case 'intersection': {
              let g = k,
                y = this.process(u.left, {
                  ...h,
                  path: [...h.path, 'allOf', 0],
                }),
                w = this.process(u.right, {
                  ...h,
                  path: [...h.path, 'allOf', 1],
                }),
                j = (E) => 'allOf' in E && Object.keys(E).length === 1,
                I = [...(j(y) ? y.allOf : [y]), ...(j(w) ? w.allOf : [w])];
              g.allOf = I;
              break;
            }
            case 'tuple': {
              let g = k;
              g.type = 'array';
              let y = this.target === 'draft-2020-12' ? 'prefixItems' : 'items',
                w =
                  this.target === 'draft-2020-12' ||
                  this.target === 'openapi-3.0'
                    ? 'items'
                    : 'additionalItems',
                j = u.items.map((B, H) =>
                  this.process(B, { ...h, path: [...h.path, y, H] }),
                ),
                I = u.rest
                  ? this.process(u.rest, {
                      ...h,
                      path: [
                        ...h.path,
                        w,
                        ...(this.target === 'openapi-3.0'
                          ? [u.items.length]
                          : []),
                      ],
                    })
                  : null;
              this.target === 'draft-2020-12'
                ? ((g.prefixItems = j), I && (g.items = I))
                : this.target === 'openapi-3.0'
                  ? ((g.items = { anyOf: j }),
                    I && g.items.anyOf.push(I),
                    (g.minItems = j.length),
                    I || (g.maxItems = j.length))
                  : ((g.items = j), I && (g.additionalItems = I));
              let { minimum: E, maximum: V } = e._zod.bag;
              (typeof E == 'number' && (g.minItems = E),
                typeof V == 'number' && (g.maxItems = V));
              break;
            }
            case 'record': {
              let g = k;
              ((g.type = 'object'),
                (this.target !== 'draft-7' &&
                  this.target !== 'draft-2020-12') ||
                  (g.propertyNames = this.process(u.keyType, {
                    ...h,
                    path: [...h.path, 'propertyNames'],
                  })),
                (g.additionalProperties = this.process(u.valueType, {
                  ...h,
                  path: [...h.path, 'additionalProperties'],
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
              let g = k,
                y = fr(u.entries);
              (y.every((w) => typeof w == 'number') && (g.type = 'number'),
                y.every((w) => typeof w == 'string') && (g.type = 'string'),
                (g.enum = y));
              break;
            }
            case 'literal': {
              let g = k,
                y = [];
              for (let w of u.values)
                if (w === void 0) {
                  if (this.unrepresentable === 'throw')
                    throw new Error(
                      'Literal `undefined` cannot be represented in JSON Schema',
                    );
                } else if (typeof w == 'bigint') {
                  if (this.unrepresentable === 'throw')
                    throw new Error(
                      'BigInt literals cannot be represented in JSON Schema',
                    );
                  y.push(Number(w));
                } else y.push(w);
              if (y.length !== 0)
                if (y.length === 1) {
                  let w = y[0];
                  ((g.type = w === null ? 'null' : typeof w),
                    this.target === 'draft-4' || this.target === 'openapi-3.0'
                      ? (g.enum = [w])
                      : (g.const = w));
                } else
                  (y.every((w) => typeof w == 'number') && (g.type = 'number'),
                    y.every((w) => typeof w == 'string') && (g.type = 'string'),
                    y.every((w) => typeof w == 'boolean') &&
                      (g.type = 'string'),
                    y.every((w) => w === null) && (g.type = 'null'),
                    (g.enum = y));
              break;
            }
            case 'file': {
              let g = k,
                y = {
                  type: 'string',
                  format: 'binary',
                  contentEncoding: 'binary',
                },
                { minimum: w, maximum: j, mime: I } = e._zod.bag;
              (w !== void 0 && (y.minLength = w),
                j !== void 0 && (y.maxLength = j),
                I
                  ? I.length === 1
                    ? ((y.contentMediaType = I[0]), Object.assign(g, y))
                    : (g.anyOf = I.map((E) => ({ ...y, contentMediaType: E })))
                  : Object.assign(g, y));
              break;
            }
            case 'transform':
              if (this.unrepresentable === 'throw')
                throw new Error(
                  'Transforms cannot be represented in JSON Schema',
                );
              break;
            case 'nullable': {
              let g = this.process(u.innerType, h);
              this.target === 'openapi-3.0'
                ? ((m.ref = u.innerType), (k.nullable = !0))
                : (k.anyOf = [g, { type: 'null' }]);
              break;
            }
            case 'nonoptional':
            case 'promise':
            case 'optional':
              (this.process(u.innerType, h), (m.ref = u.innerType));
              break;
            case 'success':
              k.type = 'boolean';
              break;
            case 'default':
              (this.process(u.innerType, h),
                (m.ref = u.innerType),
                (k.default = JSON.parse(JSON.stringify(u.defaultValue))));
              break;
            case 'prefault':
              (this.process(u.innerType, h),
                (m.ref = u.innerType),
                this.io === 'input' &&
                  (k._prefault = JSON.parse(JSON.stringify(u.defaultValue))));
              break;
            case 'catch': {
              let g;
              (this.process(u.innerType, h), (m.ref = u.innerType));
              try {
                g = u.catchValue(void 0);
              } catch {
                throw new Error(
                  'Dynamic catch values are not supported in JSON Schema',
                );
              }
              k.default = g;
              break;
            }
            case 'nan':
              if (this.unrepresentable === 'throw')
                throw new Error('NaN cannot be represented in JSON Schema');
              break;
            case 'template_literal': {
              let g = k,
                y = e._zod.pattern;
              if (!y) throw new Error('Pattern not found in template literal');
              ((g.type = 'string'), (g.pattern = y.source));
              break;
            }
            case 'pipe': {
              let g =
                this.io === 'input'
                  ? u.in._zod.def.type === 'transform'
                    ? u.out
                    : u.in
                  : u.out;
              (this.process(g, h), (m.ref = g));
              break;
            }
            case 'readonly':
              (this.process(u.innerType, h),
                (m.ref = u.innerType),
                (k.readOnly = !0));
              break;
            case 'lazy': {
              let g = e._zod.innerType;
              (this.process(g, h), (m.ref = g));
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
          te(e) &&
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
        h = this.seen.get(e);
      if (!h) throw new Error('Unprocessed schema. This is a bug in Zod.');
      let N = (j) => {
          var I, E, V, B, H;
          let we = this.target === 'draft-2020-12' ? '$defs' : 'definitions';
          if (f.external) {
            let It =
                (I = f.external.registry.get(j[0])) == null ? void 0 : I.id,
              co = (E = f.external.uri) != null ? E : (Dm) => Dm;
            if (It) return { ref: co(It) };
            let Di =
              (B = (V = j[1].defId) != null ? V : j[1].schema.id) != null
                ? B
                : 'schema' + this.counter++;
            return (
              (j[1].defId = Di),
              { defId: Di, ref: `${co('__shared')}#/${we}/${Di}` }
            );
          }
          if (j[1] === h) return { ref: '#' };
          let Ei = `#/${we}/`,
            xt = (H = j[1].schema.id) != null ? H : '__schema' + this.counter++;
          return { defId: xt, ref: Ei + xt };
        },
        k = (j) => {
          if (j[1].schema.$ref) return;
          let I = j[1],
            { ref: E, defId: V } = N(j);
          ((I.def = { ...I.schema }), V && (I.defId = V));
          let B = I.schema;
          for (let H in B) delete B[H];
          B.$ref = E;
        };
      if (f.cycles === 'throw')
        for (let j of this.seen.entries()) {
          let I = j[1];
          if (I.cycle)
            throw new Error(`Cycle detected: #/${(o = I.cycle) == null ? void 0 : o.join('/')}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
        }
      for (let j of this.seen.entries()) {
        let I = j[1];
        if (e === j[0]) {
          k(j);
          continue;
        }
        if (f.external) {
          let E = (s = f.external.registry.get(j[0])) == null ? void 0 : s.id;
          if (e !== j[0] && E) {
            k(j);
            continue;
          }
        }
        (((u = this.metadataRegistry.get(j[0])) != null && u.id) ||
          I.cycle ||
          (I.count > 1 && f.reused === 'ref')) &&
          k(j);
      }
      let g = (j, I) => {
        var E, V, B;
        let H = this.seen.get(j),
          we = (E = H.def) != null ? E : H.schema,
          Ei = { ...we };
        if (H.ref === null) return;
        let xt = H.ref;
        if (((H.ref = null), xt)) {
          g(xt, I);
          let It = this.seen.get(xt).schema;
          !It.$ref ||
          (I.target !== 'draft-7' &&
            I.target !== 'draft-4' &&
            I.target !== 'openapi-3.0')
            ? (Object.assign(we, It), Object.assign(we, Ei))
            : ((we.allOf = (V = we.allOf) != null ? V : []), we.allOf.push(It));
        }
        H.isParent ||
          this.override({
            zodSchema: j,
            jsonSchema: we,
            path: (B = H.path) != null ? B : [],
          });
      };
      for (let j of [...this.seen.entries()].reverse())
        g(j[0], { target: this.target });
      let y = {};
      if (
        (this.target === 'draft-2020-12'
          ? (y.$schema = 'https://json-schema.org/draft/2020-12/schema')
          : this.target === 'draft-7'
            ? (y.$schema = 'http://json-schema.org/draft-07/schema#')
            : this.target === 'draft-4'
              ? (y.$schema = 'http://json-schema.org/draft-04/schema#')
              : this.target === 'openapi-3.0' ||
                console.warn(`Invalid target: ${this.target}`),
        (a = f.external) == null ? void 0 : a.uri)
      ) {
        let j = (c = f.external.registry.get(e)) == null ? void 0 : c.id;
        if (!j) throw new Error('Schema is missing an `id` property');
        y.$id = f.external.uri(j);
      }
      Object.assign(y, h.def);
      let w = (p = (m = f.external) == null ? void 0 : m.defs) != null ? p : {};
      for (let j of this.seen.entries()) {
        let I = j[1];
        I.def && I.defId && (w[I.defId] = I.def);
      }
      f.external ||
        (Object.keys(w).length > 0 &&
          (this.target === 'draft-2020-12'
            ? (y.$defs = w)
            : (y.definitions = w)));
      try {
        return JSON.parse(JSON.stringify(y));
      } catch {
        throw new Error('Error converting schema to JSON.');
      }
    }
  };
  function Gl(e, t) {
    if (e instanceof Zr) {
      let n = new sr(t),
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
    let i = new sr(t);
    return (i.process(e), i.emit(e, t));
  }
  function te(e, t) {
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
        return te(n.element, i);
      case 'object':
        for (let r in n.shape) if (te(n.shape[r], i)) return !0;
        return !1;
      case 'union':
        for (let r of n.options) if (te(r, i)) return !0;
        return !1;
      case 'intersection':
        return te(n.left, i) || te(n.right, i);
      case 'tuple':
        for (let r of n.items) if (te(r, i)) return !0;
        return !(!n.rest || !te(n.rest, i));
      case 'record':
      case 'map':
        return te(n.keyType, i) || te(n.valueType, i);
      case 'set':
        return te(n.valueType, i);
      case 'promise':
      case 'optional':
      case 'nonoptional':
      case 'nullable':
      case 'readonly':
      case 'default':
      case 'prefault':
        return te(n.innerType, i);
      case 'lazy':
        return te(n.getter(), i);
      case 'transform':
        return !0;
      case 'pipe':
        return te(n.in, i) || te(n.out, i);
    }
    throw new Error(`Unknown schema type: ${n.type}`);
  }
  var Xb = {},
    Kl = {};
  ve(Kl, {
    ZodISODate: () => ya,
    ZodISODateTime: () => ba,
    ZodISODuration: () => $a,
    ZodISOTime: () => _a,
    date: () => Xl,
    datetime: () => Hl,
    duration: () => Ql,
    time: () => Yl,
  });
  var ba = v('ZodISODateTime', (e, t) => {
    (tc.init(e, t), W.init(e, t));
  });
  function Hl(e) {
    return cl(ba, e);
  }
  var ya = v('ZodISODate', (e, t) => {
    (nc.init(e, t), W.init(e, t));
  });
  function Xl(e) {
    return ll(ya, e);
  }
  var _a = v('ZodISOTime', (e, t) => {
    (ic.init(e, t), W.init(e, t));
  });
  function Yl(e) {
    return dl(_a, e);
  }
  var $a = v('ZodISODuration', (e, t) => {
    (rc.init(e, t), W.init(e, t));
  });
  function Ql(e) {
    return ml($a, e);
  }
  var ed = (e, t) => {
      (gr.init(e, t),
        (e.name = 'ZodError'),
        Object.defineProperties(e, {
          format: { value: (i) => br(e, i) },
          flatten: { value: (i) => hr(e, i) },
          addIssue: {
            value: (i) => {
              (e.issues.push(i), (e.message = JSON.stringify(e.issues, Yn, 2)));
            },
          },
          addIssues: {
            value: (i) => {
              (e.issues.push(...i),
                (e.message = JSON.stringify(e.issues, Yn, 2)));
            },
          },
          isEmpty: { get: () => e.issues.length === 0 },
        }));
    },
    Yb = v('ZodError', ed),
    ce = v('ZodError', ed, { Parent: Error }),
    td = mn(ce),
    nd = pn(ce),
    id = fn(ce),
    rd = vn(ce),
    ad = yr(ce),
    od = _r(ce),
    sd = $r(ce),
    ud = kr(ce),
    cd = wr(ce),
    ld = Sr(ce),
    dd = xr(ce),
    md = Ir(ce),
    R = v(
      'ZodType',
      (e, t) => (
        T.init(e, t),
        (e.def = t),
        (e.type = t.type),
        Object.defineProperty(e, '_def', { value: t }),
        (e.check = (...i) => {
          var n;
          return e.clone(
            M.mergeDefs(t, {
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
        (e.clone = (i, n) => ge(e, i, n)),
        (e.brand = () => e),
        (e.register = (i, n) => (i.add(e, n), e)),
        (e.parse = (i, n) => td(e, i, n, { callee: e.parse })),
        (e.safeParse = (i, n) => id(e, i, n)),
        (e.parseAsync = async (i, n) => nd(e, i, n, { callee: e.parseAsync })),
        (e.safeParseAsync = async (i, n) => rd(e, i, n)),
        (e.spa = e.safeParseAsync),
        (e.encode = (i, n) => ad(e, i, n)),
        (e.decode = (i, n) => od(e, i, n)),
        (e.encodeAsync = async (i, n) => sd(e, i, n)),
        (e.decodeAsync = async (i, n) => ud(e, i, n)),
        (e.safeEncode = (i, n) => cd(e, i, n)),
        (e.safeDecode = (i, n) => ld(e, i, n)),
        (e.safeEncodeAsync = async (i, n) => dd(e, i, n)),
        (e.safeDecodeAsync = async (i, n) => md(e, i, n)),
        (e.refine = (i, n) => e.check(Yd(i, n))),
        (e.superRefine = (i) => e.check(Qd(i))),
        (e.overwrite = (i) => e.check(kt(i))),
        (e.optional = () => ri(e)),
        (e.nullable = () => ai(e)),
        (e.nullish = () => ri(ai(e))),
        (e.nonoptional = (i) => Ld(e, i)),
        (e.array = () => _i(e)),
        (e.or = (i) => Va([e, i])),
        (e.and = (i) => Id(e, i)),
        (e.transform = (i) => oi(e, qa(i))),
        (e.default = (i) => Ad(e, i)),
        (e.prefault = (i) => Rd(e, i)),
        (e.catch = (i) => Vd(e, i)),
        (e.pipe = (i) => oi(e, i)),
        (e.readonly = () => qd(e)),
        (e.describe = (i) => {
          let n = e.clone();
          return (ft.add(n, { description: i }), n);
        }),
        Object.defineProperty(e, 'description', {
          get() {
            var i;
            return (i = ft.get(e)) == null ? void 0 : i.description;
          },
          configurable: !0,
        }),
        (e.meta = (...i) => {
          if (i.length === 0) return ft.get(e);
          let n = e.clone();
          return (ft.add(n, i[0]), n);
        }),
        (e.isOptional = () => e.safeParse(void 0).success),
        (e.isNullable = () => e.safeParse(null).success),
        e
      ),
    ),
    ka = v('_ZodString', (e, t) => {
      var i, n, r;
      (yn.init(e, t), R.init(e, t));
      let o = e._zod.bag;
      ((e.format = (i = o.format) != null ? i : null),
        (e.minLength = (n = o.minimum) != null ? n : null),
        (e.maxLength = (r = o.maximum) != null ? r : null),
        (e.regex = (...s) => e.check(sa(...s))),
        (e.includes = (...s) => e.check(la(...s))),
        (e.startsWith = (...s) => e.check(da(...s))),
        (e.endsWith = (...s) => e.check(ma(...s))),
        (e.min = (...s) => e.check(Lt(...s))),
        (e.max = (...s) => e.check(pi(...s))),
        (e.length = (...s) => e.check(fi(...s))),
        (e.nonempty = (...s) => e.check(Lt(1, ...s))),
        (e.lowercase = (s) => e.check(ua(s))),
        (e.uppercase = (s) => e.check(ca(s))),
        (e.trim = () => e.check(va())),
        (e.normalize = (...s) => e.check(fa(...s))),
        (e.toLowerCase = () => e.check(ga())),
        (e.toUpperCase = () => e.check(ha())));
    }),
    vi = v('ZodString', (e, t) => {
      (yn.init(e, t),
        ka.init(e, t),
        (e.email = (i) => e.check(Lr(wa, i))),
        (e.url = (i) => e.check(di(gi, i))),
        (e.jwt = (i) => e.check(aa(Za, i))),
        (e.emoji = (i) => e.check(Wr(Sa, i))),
        (e.guid = (i) => e.check(ni(ii, i))),
        (e.uuid = (i) => e.check(Jr(De, i))),
        (e.uuidv4 = (i) => e.check(Mr(De, i))),
        (e.uuidv6 = (i) => e.check(Vr(De, i))),
        (e.uuidv7 = (i) => e.check(Fr(De, i))),
        (e.nanoid = (i) => e.check(qr(xa, i))),
        (e.guid = (i) => e.check(ni(ii, i))),
        (e.cuid = (i) => e.check(Br(Ia, i))),
        (e.cuid2 = (i) => e.check(Gr(ja, i))),
        (e.ulid = (i) => e.check(Kr(Oa, i))),
        (e.base64 = (i) => e.check(na(Ta, i))),
        (e.base64url = (i) => e.check(ia(Ca, i))),
        (e.xid = (i) => e.check(Hr(za, i))),
        (e.ksuid = (i) => e.check(Xr(Na, i))),
        (e.ipv4 = (i) => e.check(Yr(Ua, i))),
        (e.ipv6 = (i) => e.check(Qr(Pa, i))),
        (e.cidrv4 = (i) => e.check(ea(Ea, i))),
        (e.cidrv6 = (i) => e.check(ta(Da, i))),
        (e.e164 = (i) => e.check(ra(Aa, i))),
        (e.datetime = (i) => e.check(Hl(i))),
        (e.date = (i) => e.check(Xl(i))),
        (e.time = (i) => e.check(Yl(i))),
        (e.duration = (i) => e.check(Ql(i))));
    });
  function ur(e) {
    return ol(vi, e);
  }
  var W = v('ZodStringFormat', (e, t) => {
      (F.init(e, t), ka.init(e, t));
    }),
    wa = v('ZodEmail', (e, t) => {
      (qu.init(e, t), W.init(e, t));
    });
  function Qb(e) {
    return Lr(wa, e);
  }
  var ii = v('ZodGUID', (e, t) => {
    (Fu.init(e, t), W.init(e, t));
  });
  function ey(e) {
    return ni(ii, e);
  }
  var De = v('ZodUUID', (e, t) => {
    (Wu.init(e, t), W.init(e, t));
  });
  function ty(e) {
    return Jr(De, e);
  }
  function ny(e) {
    return Mr(De, e);
  }
  function iy(e) {
    return Vr(De, e);
  }
  function ry(e) {
    return Fr(De, e);
  }
  var gi = v('ZodURL', (e, t) => {
    (Bu.init(e, t), W.init(e, t));
  });
  function ay(e) {
    return di(gi, e);
  }
  function oy(e) {
    return di(gi, {
      protocol: /^https?$/,
      hostname: $t.domain,
      ...M.normalizeParams(e),
    });
  }
  var Sa = v('ZodEmoji', (e, t) => {
    (Gu.init(e, t), W.init(e, t));
  });
  function sy(e) {
    return Wr(Sa, e);
  }
  var xa = v('ZodNanoID', (e, t) => {
    (Ku.init(e, t), W.init(e, t));
  });
  function uy(e) {
    return qr(xa, e);
  }
  var Ia = v('ZodCUID', (e, t) => {
    (Hu.init(e, t), W.init(e, t));
  });
  function cy(e) {
    return Br(Ia, e);
  }
  var ja = v('ZodCUID2', (e, t) => {
    (Xu.init(e, t), W.init(e, t));
  });
  function ly(e) {
    return Gr(ja, e);
  }
  var Oa = v('ZodULID', (e, t) => {
    (Yu.init(e, t), W.init(e, t));
  });
  function dy(e) {
    return Kr(Oa, e);
  }
  var za = v('ZodXID', (e, t) => {
    (Qu.init(e, t), W.init(e, t));
  });
  function my(e) {
    return Hr(za, e);
  }
  var Na = v('ZodKSUID', (e, t) => {
    (ec.init(e, t), W.init(e, t));
  });
  function py(e) {
    return Xr(Na, e);
  }
  var Ua = v('ZodIPv4', (e, t) => {
    (ac.init(e, t), W.init(e, t));
  });
  function fy(e) {
    return Yr(Ua, e);
  }
  var Pa = v('ZodIPv6', (e, t) => {
    (oc.init(e, t), W.init(e, t));
  });
  function vy(e) {
    return Qr(Pa, e);
  }
  var Ea = v('ZodCIDRv4', (e, t) => {
    (sc.init(e, t), W.init(e, t));
  });
  function gy(e) {
    return ea(Ea, e);
  }
  var Da = v('ZodCIDRv6', (e, t) => {
    (uc.init(e, t), W.init(e, t));
  });
  function hy(e) {
    return ta(Da, e);
  }
  var Ta = v('ZodBase64', (e, t) => {
    (cc.init(e, t), W.init(e, t));
  });
  function by(e) {
    return na(Ta, e);
  }
  var Ca = v('ZodBase64URL', (e, t) => {
    (dc.init(e, t), W.init(e, t));
  });
  function yy(e) {
    return ia(Ca, e);
  }
  var Aa = v('ZodE164', (e, t) => {
    (mc.init(e, t), W.init(e, t));
  });
  function _y(e) {
    return ra(Aa, e);
  }
  var Za = v('ZodJWT', (e, t) => {
    (fc.init(e, t), W.init(e, t));
  });
  function $y(e) {
    return aa(Za, e);
  }
  var $n = v('ZodCustomStringFormat', (e, t) => {
    (vc.init(e, t), W.init(e, t));
  });
  function ky(e, t, i = {}) {
    return _n($n, e, t, i);
  }
  function wy(e) {
    return _n($n, 'hostname', $t.hostname, e);
  }
  function Sy(e) {
    return _n($n, 'hex', $t.hex, e);
  }
  function xy(e, t) {
    var i;
    let n = `${e}_${(i = t?.enc) != null ? i : 'hex'}`,
      r = $t[n];
    if (!r) throw new Error(`Unrecognized hash format: ${n}`);
    return _n($n, n, r, t);
  }
  var hi = v('ZodNumber', (e, t) => {
    var i, n, r, o, s, u, a, c, m;
    (Ur.init(e, t),
      R.init(e, t),
      (e.gt = (f, h) => e.check(yt(f, h))),
      (e.gte = (f, h) => e.check(se(f, h))),
      (e.min = (f, h) => e.check(se(f, h))),
      (e.lt = (f, h) => e.check(bt(f, h))),
      (e.lte = (f, h) => e.check(_e(f, h))),
      (e.max = (f, h) => e.check(_e(f, h))),
      (e.int = (f) => e.check(cr(f))),
      (e.safe = (f) => e.check(cr(f))),
      (e.positive = (f) => e.check(yt(0, f))),
      (e.nonnegative = (f) => e.check(se(0, f))),
      (e.negative = (f) => e.check(bt(0, f))),
      (e.nonpositive = (f) => e.check(_e(0, f))),
      (e.multipleOf = (f, h) => e.check(sn(f, h))),
      (e.step = (f, h) => e.check(sn(f, h))),
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
  function pd(e) {
    return pl(hi, e);
  }
  var Mt = v('ZodNumberFormat', (e, t) => {
    (gc.init(e, t), hi.init(e, t));
  });
  function cr(e) {
    return vl(Mt, e);
  }
  function Iy(e) {
    return gl(Mt, e);
  }
  function jy(e) {
    return hl(Mt, e);
  }
  function Oy(e) {
    return bl(Mt, e);
  }
  function zy(e) {
    return yl(Mt, e);
  }
  var bi = v('ZodBoolean', (e, t) => {
    (Pr.init(e, t), R.init(e, t));
  });
  function fd(e) {
    return _l(bi, e);
  }
  var yi = v('ZodBigInt', (e, t) => {
    var i, n, r;
    (Er.init(e, t),
      R.init(e, t),
      (e.gte = (s, u) => e.check(se(s, u))),
      (e.min = (s, u) => e.check(se(s, u))),
      (e.gt = (s, u) => e.check(yt(s, u))),
      (e.gte = (s, u) => e.check(se(s, u))),
      (e.min = (s, u) => e.check(se(s, u))),
      (e.lt = (s, u) => e.check(bt(s, u))),
      (e.lte = (s, u) => e.check(_e(s, u))),
      (e.max = (s, u) => e.check(_e(s, u))),
      (e.positive = (s) => e.check(yt(BigInt(0), s))),
      (e.negative = (s) => e.check(bt(BigInt(0), s))),
      (e.nonpositive = (s) => e.check(_e(BigInt(0), s))),
      (e.nonnegative = (s) => e.check(se(BigInt(0), s))),
      (e.multipleOf = (s, u) => e.check(sn(s, u))));
    let o = e._zod.bag;
    ((e.minValue = (i = o.minimum) != null ? i : null),
      (e.maxValue = (n = o.maximum) != null ? n : null),
      (e.format = (r = o.format) != null ? r : null));
  });
  function Ny(e) {
    return kl(yi, e);
  }
  var Ra = v('ZodBigIntFormat', (e, t) => {
    (hc.init(e, t), yi.init(e, t));
  });
  function Uy(e) {
    return Sl(Ra, e);
  }
  function Py(e) {
    return xl(Ra, e);
  }
  var vd = v('ZodSymbol', (e, t) => {
    (bc.init(e, t), R.init(e, t));
  });
  function Ey(e) {
    return Il(vd, e);
  }
  var gd = v('ZodUndefined', (e, t) => {
    (yc.init(e, t), R.init(e, t));
  });
  function Dy(e) {
    return jl(gd, e);
  }
  var hd = v('ZodNull', (e, t) => {
    (_c.init(e, t), R.init(e, t));
  });
  function bd(e) {
    return Ol(hd, e);
  }
  var yd = v('ZodAny', (e, t) => {
    ($c.init(e, t), R.init(e, t));
  });
  function Ty() {
    return zl(yd);
  }
  var _d = v('ZodUnknown', (e, t) => {
    (kc.init(e, t), R.init(e, t));
  });
  function Jt() {
    return Nl(_d);
  }
  var $d = v('ZodNever', (e, t) => {
    (wc.init(e, t), R.init(e, t));
  });
  function La(e) {
    return Ul($d, e);
  }
  var kd = v('ZodVoid', (e, t) => {
    (Sc.init(e, t), R.init(e, t));
  });
  function Cy(e) {
    return Pl(kd, e);
  }
  var Ja = v('ZodDate', (e, t) => {
    (xc.init(e, t),
      R.init(e, t),
      (e.min = (n, r) => e.check(se(n, r))),
      (e.max = (n, r) => e.check(_e(n, r))));
    let i = e._zod.bag;
    ((e.minDate = i.minimum ? new Date(i.minimum) : null),
      (e.maxDate = i.maximum ? new Date(i.maximum) : null));
  });
  function Ay(e) {
    return El(Ja, e);
  }
  var wd = v('ZodArray', (e, t) => {
    (Ic.init(e, t),
      R.init(e, t),
      (e.element = t.element),
      (e.min = (i, n) => e.check(Lt(i, n))),
      (e.nonempty = (i) => e.check(Lt(1, i))),
      (e.max = (i, n) => e.check(pi(i, n))),
      (e.length = (i, n) => e.check(fi(i, n))),
      (e.unwrap = () => e.element));
  });
  function _i(e, t) {
    return Jl(wd, e, t);
  }
  function Zy(e) {
    let t = e._zod.def.shape;
    return Wa(Object.keys(t));
  }
  var $i = v('ZodObject', (e, t) => {
    (Nc.init(e, t),
      R.init(e, t),
      M.defineLazy(e, 'shape', () => t.shape),
      (e.keyof = () => Wa(Object.keys(e._zod.def.shape))),
      (e.catchall = (i) => e.clone({ ...e._zod.def, catchall: i })),
      (e.passthrough = () => e.clone({ ...e._zod.def, catchall: Jt() })),
      (e.loose = () => e.clone({ ...e._zod.def, catchall: Jt() })),
      (e.strict = () => e.clone({ ...e._zod.def, catchall: La() })),
      (e.strip = () => e.clone({ ...e._zod.def, catchall: void 0 })),
      (e.extend = (i) => M.extend(e, i)),
      (e.safeExtend = (i) => M.safeExtend(e, i)),
      (e.merge = (i) => M.merge(e, i)),
      (e.pick = (i) => M.pick(e, i)),
      (e.omit = (i) => M.omit(e, i)),
      (e.partial = (...i) => M.partial(Ba, e, i[0])),
      (e.required = (...i) => M.required(Ga, e, i[0])));
  });
  function Ry(e, t) {
    let i = { type: 'object', shape: e ?? {}, ...M.normalizeParams(t) };
    return new $i(i);
  }
  function Ly(e, t) {
    return new $i({
      type: 'object',
      shape: e,
      catchall: La(),
      ...M.normalizeParams(t),
    });
  }
  function Jy(e, t) {
    return new $i({
      type: 'object',
      shape: e,
      catchall: Jt(),
      ...M.normalizeParams(t),
    });
  }
  var Ma = v('ZodUnion', (e, t) => {
    (Dr.init(e, t), R.init(e, t), (e.options = t.options));
  });
  function Va(e, t) {
    return new Ma({ type: 'union', options: e, ...M.normalizeParams(t) });
  }
  var Sd = v('ZodDiscriminatedUnion', (e, t) => {
    (Ma.init(e, t), Uc.init(e, t));
  });
  function My(e, t, i) {
    return new Sd({
      type: 'union',
      options: t,
      discriminator: e,
      ...M.normalizeParams(i),
    });
  }
  var xd = v('ZodIntersection', (e, t) => {
    (Pc.init(e, t), R.init(e, t));
  });
  function Id(e, t) {
    return new xd({ type: 'intersection', left: e, right: t });
  }
  var jd = v('ZodTuple', (e, t) => {
    (Tr.init(e, t),
      R.init(e, t),
      (e.rest = (i) => e.clone({ ...e._zod.def, rest: i })));
  });
  function Od(e, t, i) {
    let n = t instanceof T,
      r = n ? i : t;
    return new jd({
      type: 'tuple',
      items: e,
      rest: n ? t : null,
      ...M.normalizeParams(r),
    });
  }
  var Fa = v('ZodRecord', (e, t) => {
    (Ec.init(e, t),
      R.init(e, t),
      (e.keyType = t.keyType),
      (e.valueType = t.valueType));
  });
  function zd(e, t, i) {
    return new Fa({
      type: 'record',
      keyType: e,
      valueType: t,
      ...M.normalizeParams(i),
    });
  }
  function Vy(e, t, i) {
    let n = ge(e);
    return (
      (n._zod.values = void 0),
      new Fa({
        type: 'record',
        keyType: n,
        valueType: t,
        ...M.normalizeParams(i),
      })
    );
  }
  var Nd = v('ZodMap', (e, t) => {
    (Dc.init(e, t),
      R.init(e, t),
      (e.keyType = t.keyType),
      (e.valueType = t.valueType));
  });
  function Fy(e, t, i) {
    return new Nd({
      type: 'map',
      keyType: e,
      valueType: t,
      ...M.normalizeParams(i),
    });
  }
  var Ud = v('ZodSet', (e, t) => {
    (Tc.init(e, t),
      R.init(e, t),
      (e.min = (...i) => e.check(un(...i))),
      (e.nonempty = (i) => e.check(un(1, i))),
      (e.max = (...i) => e.check(mi(...i))),
      (e.size = (...i) => e.check(oa(...i))));
  });
  function Wy(e, t) {
    return new Ud({ type: 'set', valueType: e, ...M.normalizeParams(t) });
  }
  var cn = v('ZodEnum', (e, t) => {
    (Cc.init(e, t),
      R.init(e, t),
      (e.enum = t.entries),
      (e.options = Object.values(t.entries)));
    let i = new Set(Object.keys(t.entries));
    ((e.extract = (n, r) => {
      let o = {};
      for (let s of n) {
        if (!i.has(s)) throw new Error(`Key ${s} not found in enum`);
        o[s] = t.entries[s];
      }
      return new cn({ ...t, checks: [], ...M.normalizeParams(r), entries: o });
    }),
      (e.exclude = (n, r) => {
        let o = { ...t.entries };
        for (let s of n) {
          if (!i.has(s)) throw new Error(`Key ${s} not found in enum`);
          delete o[s];
        }
        return new cn({
          ...t,
          checks: [],
          ...M.normalizeParams(r),
          entries: o,
        });
      }));
  });
  function Wa(e, t) {
    let i = Array.isArray(e) ? Object.fromEntries(e.map((n) => [n, n])) : e;
    return new cn({ type: 'enum', entries: i, ...M.normalizeParams(t) });
  }
  function qy(e, t) {
    return new cn({ type: 'enum', entries: e, ...M.normalizeParams(t) });
  }
  var Pd = v('ZodLiteral', (e, t) => {
    (Ac.init(e, t),
      R.init(e, t),
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
  function By(e, t) {
    return new Pd({
      type: 'literal',
      values: Array.isArray(e) ? e : [e],
      ...M.normalizeParams(t),
    });
  }
  var Ed = v('ZodFile', (e, t) => {
    (Zc.init(e, t),
      R.init(e, t),
      (e.min = (i, n) => e.check(un(i, n))),
      (e.max = (i, n) => e.check(mi(i, n))),
      (e.mime = (i, n) => e.check(pa(Array.isArray(i) ? i : [i], n))));
  });
  function Gy(e) {
    return Ml(Ed, e);
  }
  var Dd = v('ZodTransform', (e, t) => {
    (Rc.init(e, t),
      R.init(e, t),
      (e._zod.parse = (i, n) => {
        if (n.direction === 'backward') throw new si(e.constructor.name);
        i.addIssue = (o) => {
          if (typeof o == 'string') i.issues.push(M.issue(o, i.value, t));
          else {
            let s = o;
            (s.fatal && (s.continue = !1),
              s.code != null || (s.code = 'custom'),
              s.input != null || (s.input = i.value),
              s.inst != null || (s.inst = e),
              i.issues.push(M.issue(s)));
          }
        };
        let r = t.transform(i.value, i);
        return r instanceof Promise
          ? r.then((o) => ((i.value = o), i))
          : ((i.value = r), i);
      }));
  });
  function qa(e) {
    return new Dd({ type: 'transform', transform: e });
  }
  var Ba = v('ZodOptional', (e, t) => {
    (Lc.init(e, t), R.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function ri(e) {
    return new Ba({ type: 'optional', innerType: e });
  }
  var Td = v('ZodNullable', (e, t) => {
    (Jc.init(e, t), R.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function ai(e) {
    return new Td({ type: 'nullable', innerType: e });
  }
  function Ky(e) {
    return ri(ai(e));
  }
  var Cd = v('ZodDefault', (e, t) => {
    (Mc.init(e, t),
      R.init(e, t),
      (e.unwrap = () => e._zod.def.innerType),
      (e.removeDefault = e.unwrap));
  });
  function Ad(e, t) {
    return new Cd({
      type: 'default',
      innerType: e,
      get defaultValue() {
        return typeof t == 'function' ? t() : M.shallowClone(t);
      },
    });
  }
  var Zd = v('ZodPrefault', (e, t) => {
    (Vc.init(e, t), R.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function Rd(e, t) {
    return new Zd({
      type: 'prefault',
      innerType: e,
      get defaultValue() {
        return typeof t == 'function' ? t() : M.shallowClone(t);
      },
    });
  }
  var Ga = v('ZodNonOptional', (e, t) => {
    (Fc.init(e, t), R.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function Ld(e, t) {
    return new Ga({
      type: 'nonoptional',
      innerType: e,
      ...M.normalizeParams(t),
    });
  }
  var Jd = v('ZodSuccess', (e, t) => {
    (Wc.init(e, t), R.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function Hy(e) {
    return new Jd({ type: 'success', innerType: e });
  }
  var Md = v('ZodCatch', (e, t) => {
    (qc.init(e, t),
      R.init(e, t),
      (e.unwrap = () => e._zod.def.innerType),
      (e.removeCatch = e.unwrap));
  });
  function Vd(e, t) {
    return new Md({
      type: 'catch',
      innerType: e,
      catchValue: typeof t == 'function' ? t : () => t,
    });
  }
  var Fd = v('ZodNaN', (e, t) => {
    (Bc.init(e, t), R.init(e, t));
  });
  function Xy(e) {
    return Tl(Fd, e);
  }
  var Ka = v('ZodPipe', (e, t) => {
    (Gc.init(e, t), R.init(e, t), (e.in = t.in), (e.out = t.out));
  });
  function oi(e, t) {
    return new Ka({ type: 'pipe', in: e, out: t });
  }
  var Ha = v('ZodCodec', (e, t) => {
    (Ka.init(e, t), Cr.init(e, t));
  });
  function Yy(e, t, i) {
    return new Ha({
      type: 'pipe',
      in: e,
      out: t,
      transform: i.decode,
      reverseTransform: i.encode,
    });
  }
  var Wd = v('ZodReadonly', (e, t) => {
    (Kc.init(e, t), R.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function qd(e) {
    return new Wd({ type: 'readonly', innerType: e });
  }
  var Bd = v('ZodTemplateLiteral', (e, t) => {
    (Hc.init(e, t), R.init(e, t));
  });
  function Qy(e, t) {
    return new Bd({
      type: 'template_literal',
      parts: e,
      ...M.normalizeParams(t),
    });
  }
  var Gd = v('ZodLazy', (e, t) => {
    (Qc.init(e, t), R.init(e, t), (e.unwrap = () => e._zod.def.getter()));
  });
  function Kd(e) {
    return new Gd({ type: 'lazy', getter: e });
  }
  var Hd = v('ZodPromise', (e, t) => {
    (Yc.init(e, t), R.init(e, t), (e.unwrap = () => e._zod.def.innerType));
  });
  function e_(e) {
    return new Hd({ type: 'promise', innerType: e });
  }
  var Xd = v('ZodFunction', (e, t) => {
    (Xc.init(e, t), R.init(e, t));
  });
  function Ss(e) {
    var t, i;
    return new Xd({
      type: 'function',
      input: Array.isArray(e?.input)
        ? Od(e?.input)
        : (t = e?.input) != null
          ? t
          : _i(Jt()),
      output: (i = e?.output) != null ? i : Jt(),
    });
  }
  var ki = v('ZodCustom', (e, t) => {
    (el.init(e, t), R.init(e, t));
  });
  function t_(e) {
    let t = new q({ check: 'custom' });
    return ((t._zod.check = e), t);
  }
  function n_(e, t) {
    return Vl(ki, e ?? (() => !0), t);
  }
  function Yd(e, t = {}) {
    return Fl(ki, e, t);
  }
  function Qd(e) {
    return Wl(e);
  }
  function i_(e, t = { error: `Input not instance of ${e.name}` }) {
    let i = new ki({
      type: 'custom',
      check: 'custom',
      fn: (n) => n instanceof e,
      abort: !0,
      ...M.normalizeParams(t),
    });
    return ((i._zod.bag.Class = e), i);
  }
  var r_ = (...e) => Bl({ Codec: Ha, Boolean: bi, String: vi }, ...e);
  function a_(e) {
    let t = Kd(() => Va([ur(e), pd(), fd(), bd(), _i(t), zd(ur(), t)]));
    return t;
  }
  function o_(e, t) {
    return oi(qa(e), t);
  }
  var lr,
    s_ = {
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
  function u_(e) {
    ie({ customError: e });
  }
  function c_() {
    return ie().customError;
  }
  lr || (lr = {});
  var em = {};
  function l_(e) {
    return sl(vi, e);
  }
  function d_(e) {
    return fl(hi, e);
  }
  function m_(e) {
    return $l(bi, e);
  }
  function p_(e) {
    return wl(yi, e);
  }
  function f_(e) {
    return Dl(Ja, e);
  }
  (ve(em, {
    bigint: () => p_,
    boolean: () => m_,
    date: () => f_,
    number: () => d_,
    string: () => l_,
  }),
    ie(tl()));
  var v_ = Object.defineProperty,
    wt = (e, t) => {
      for (var i in t) v_(e, i, { get: t[i], enumerable: !0 });
    };
  function C(e, t, i = 'draft-7') {
    return l.toJSONSchema(e, { target: i });
  }
  var vt = l.string(),
    g_ = l.number(),
    ln = (l.boolean(), l.string().min(1)),
    dr = l.number().int().positive(),
    mr = l.number().int().nonnegative(),
    tm = l.number().describe('Tagging version number');
  l.union([l.string(), l.number(), l.boolean()]).optional();
  wt(
    {},
    {
      ErrorHandlerSchema: () => St,
      HandlerSchema: () => am,
      LogHandlerSchema: () => Vt,
      StorageSchema: () => rm,
      StorageTypeSchema: () => im,
      errorHandlerJsonSchema: () => y_,
      handlerJsonSchema: () => $_,
      logHandlerJsonSchema: () => __,
      storageJsonSchema: () => b_,
      storageTypeJsonSchema: () => h_,
    },
  );
  var nm,
    im = l
      .enum(['local', 'session', 'cookie'])
      .describe('Storage mechanism: local, session, or cookie'),
    rm = l
      .object({
        Local: l.literal('local'),
        Session: l.literal('session'),
        Cookie: l.literal('cookie'),
      })
      .describe('Storage type constants for type-safe references'),
    St = l.any().describe('Error handler function: (error, state?) => void'),
    Vt = l.any().describe('Log handler function: (message, verbose?) => void'),
    am = l
      .object({
        Error: St.describe('Error handler function'),
        Log: Vt.describe('Log handler function'),
      })
      .describe('Handler interface with error and log functions'),
    h_ = C(im),
    b_ = C(rm),
    y_ = C(St),
    __ = C(Vt),
    $_ = C(am);
  (l
    .object({
      onError: St.optional().describe(
        'Error handler function: (error, state?) => void',
      ),
      onLog: Vt.optional().describe(
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
  wt(
    {},
    {
      ConsentSchema: () => Te,
      DeepPartialEventSchema: () => k_,
      EntitiesSchema: () => um,
      EntitySchema: () => xi,
      EventSchema: () => ke,
      OrderedPropertiesSchema: () => Si,
      PartialEventSchema: () => cm,
      PropertiesSchema: () => ne,
      PropertySchema: () => wi,
      PropertyTypeSchema: () => pr,
      SourceSchema: () => sm,
      SourceTypeSchema: () => Xa,
      UserSchema: () => kn,
      VersionSchema: () => om,
      consentJsonSchema: () => N_,
      entityJsonSchema: () => O_,
      eventJsonSchema: () => w_,
      orderedPropertiesJsonSchema: () => j_,
      partialEventJsonSchema: () => S_,
      propertiesJsonSchema: () => I_,
      sourceTypeJsonSchema: () => z_,
      userJsonSchema: () => x_,
    },
  );
  var pr = l.lazy(() =>
      l.union([l.boolean(), l.string(), l.number(), l.record(l.string(), wi)]),
    ),
    wi = l.lazy(() => l.union([pr, l.array(pr)])),
    ne = l
      .record(l.string(), wi.optional())
      .describe('Flexible property collection with optional values'),
    Si = l
      .record(l.string(), l.tuple([wi, l.number()]).optional())
      .describe(
        'Ordered properties with [value, order] tuples for priority control',
      ),
    Xa = l
      .union([l.enum(['web', 'server', 'app', 'other']), l.string()])
      .describe('Source type: web, server, app, other, or custom'),
    Te = l
      .record(l.string(), l.boolean())
      .describe('Consent requirement mapping (group name → state)'),
    kn = ne
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
    om = ne
      .and(
        l.object({
          source: vt.describe('Walker implementation version (e.g., "2.0.0")'),
          tagging: tm,
        }),
      )
      .describe('Walker version information'),
    sm = ne
      .and(
        l.object({
          type: Xa.describe('Source type identifier'),
          id: vt.describe('Source identifier (typically URL on web)'),
          previous_id: vt.describe(
            'Previous source identifier (typically referrer on web)',
          ),
        }),
      )
      .describe('Event source information'),
    xi = l
      .lazy(() =>
        l.object({
          entity: l.string().describe('Entity name'),
          data: ne.describe('Entity-specific properties'),
          nested: l.array(xi).describe('Nested child entities'),
          context: Si.describe('Entity context data'),
        }),
      )
      .describe('Nested entity structure with recursive nesting support'),
    um = l.array(xi).describe('Array of nested entities'),
    ke = l
      .object({
        name: l
          .string()
          .describe(
            'Event name in "entity action" format (e.g., "page view", "product add")',
          ),
        data: ne.describe('Event-specific properties'),
        context: Si.describe('Ordered context properties with priorities'),
        globals: ne.describe('Global properties shared across events'),
        custom: ne.describe('Custom implementation-specific properties'),
        user: kn.describe('User identification and attributes'),
        nested: um.describe('Related nested entities'),
        consent: Te.describe('Consent states at event time'),
        id: ln.describe('Unique event identifier (timestamp-based)'),
        trigger: vt.describe('Event trigger identifier'),
        entity: vt.describe('Parsed entity from event name'),
        action: vt.describe('Parsed action from event name'),
        timestamp: dr.describe('Unix timestamp in milliseconds since epoch'),
        timing: g_.describe('Event processing timing information'),
        group: vt.describe('Event grouping identifier'),
        count: mr.describe('Event count in session'),
        version: om.describe('Walker version information'),
        source: sm.describe('Event source information'),
      })
      .describe('Complete walkerOS event structure'),
    cm = ke
      .partial()
      .describe('Partial event structure with all fields optional'),
    k_ = ke
      .partial()
      .describe('Partial event structure with all top-level fields optional'),
    w_ = C(ke),
    S_ = C(cm),
    x_ = C(kn),
    I_ = C(ne),
    j_ = C(Si),
    O_ = C(xi),
    z_ = C(Xa),
    N_ = C(Te);
  wt(
    {},
    {
      ConfigSchema: () => Oi,
      LoopSchema: () => Ya,
      MapSchema: () => eo,
      PolicySchema: () => Ft,
      ResultSchema: () => U_,
      RuleSchema: () => Ve,
      RulesSchema: () => ji,
      SetSchema: () => Qa,
      ValueConfigSchema: () => lm,
      ValueSchema: () => fe,
      ValuesSchema: () => Ii,
      configJsonSchema: () => L_,
      loopJsonSchema: () => D_,
      mapJsonSchema: () => C_,
      policyJsonSchema: () => A_,
      ruleJsonSchema: () => Z_,
      rulesJsonSchema: () => R_,
      setJsonSchema: () => T_,
      valueConfigJsonSchema: () => E_,
      valueJsonSchema: () => P_,
    },
  );
  var fe = l.lazy(() =>
      l.union([
        l.string().describe('String value or property path (e.g., "data.id")'),
        l.number().describe('Numeric value'),
        l.boolean().describe('Boolean value'),
        l.lazy(() => nm),
        l.array(fe).describe('Array of values'),
      ]),
    ),
    Ii = l.array(fe).describe('Array of transformation values'),
    Ya = l.lazy(() =>
      l
        .tuple([fe, fe])
        .describe(
          'Loop transformation: [source, transform] tuple for array processing',
        ),
    ),
    Qa = l.lazy(() =>
      l.array(fe).describe('Set: Array of values for selection or combination'),
    ),
    eo = l.lazy(() =>
      l
        .record(l.string(), fe)
        .describe('Map: Object mapping keys to transformation values'),
    ),
    lm = (nm = l
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
        map: eo
          .optional()
          .describe(
            'Object mapping: transform event data to structured output',
          ),
        loop: Ya.optional().describe(
          'Loop transformation: [source, transform] for array processing',
        ),
        set: Qa.optional().describe(
          'Set of values: combine or select from multiple values',
        ),
        consent: Te.optional().describe(
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
    Ft = l
      .record(l.string(), fe)
      .describe('Policy rules for event pre-processing (key → value mapping)'),
    Ve = l
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
        consent: Te.optional().describe(
          'Required consent states to process this event',
        ),
        settings: l
          .any()
          .optional()
          .describe('Destination-specific settings for this event mapping'),
        data: l
          .union([fe, Ii])
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
        policy: Ft.optional().describe(
          'Event-level policy overrides (applied after config-level policy)',
        ),
      })
      .describe('Mapping rule for specific entity-action combination'),
    ji = l
      .record(
        l.string(),
        l.record(l.string(), l.union([Ve, l.array(Ve)])).optional(),
      )
      .describe(
        'Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support',
      ),
    Oi = l
      .object({
        consent: Te.optional().describe(
          'Required consent states to process any events',
        ),
        data: l
          .union([fe, Ii])
          .optional()
          .describe('Global data transformation applied to all events'),
        mapping: ji.optional().describe('Entity-action specific mapping rules'),
        policy: Ft.optional().describe(
          'Pre-processing policy rules applied before mapping',
        ),
      })
      .describe('Shared mapping configuration for sources and destinations'),
    U_ = l
      .object({
        eventMapping: Ve.optional().describe('Resolved mapping rule for event'),
        mappingKey: l
          .string()
          .optional()
          .describe('Mapping key used (e.g., "product.view")'),
      })
      .describe('Mapping resolution result'),
    P_ = C(fe),
    E_ = C(lm),
    D_ = C(Ya),
    T_ = C(Qa),
    C_ = C(eo),
    A_ = C(Ft),
    Z_ = C(Ve),
    R_ = C(ji),
    L_ = C(Oi);
  wt(
    {},
    {
      BatchSchema: () => mm,
      ConfigSchema: () => wn,
      ContextSchema: () => no,
      DLQSchema: () => G_,
      DataSchema: () => F_,
      DestinationPolicySchema: () => J_,
      DestinationsSchema: () => q_,
      InitDestinationsSchema: () => W_,
      InitSchema: () => pm,
      InstanceSchema: () => Sn,
      PartialConfigSchema: () => to,
      PushBatchContextSchema: () => M_,
      PushContextSchema: () => io,
      PushEventSchema: () => dm,
      PushEventsSchema: () => V_,
      PushResultSchema: () => B_,
      RefSchema: () => Hn,
      ResultSchema: () => fm,
      batchJsonSchema: () => Q_,
      configJsonSchema: () => K_,
      contextJsonSchema: () => X_,
      instanceJsonSchema: () => e$,
      partialConfigJsonSchema: () => H_,
      pushContextJsonSchema: () => Y_,
      resultJsonSchema: () => t$,
    },
  );
  var wn = l
      .object({
        consent: Te.optional().describe(
          'Required consent states to send events to this destination',
        ),
        settings: l
          .any()
          .describe('Implementation-specific configuration')
          .optional(),
        data: l
          .union([fe, Ii])
          .optional()
          .describe(
            'Global data transformation applied to all events for this destination',
          ),
        env: l
          .any()
          .describe('Environment dependencies (platform-specific)')
          .optional(),
        id: ln
          .describe(
            'Destination instance identifier (defaults to destination key)',
          )
          .optional(),
        init: l
          .boolean()
          .describe('Whether to initialize immediately')
          .optional(),
        loadScript: l
          .boolean()
          .describe('Whether to load external script (for web destinations)')
          .optional(),
        mapping: ji
          .optional()
          .describe(
            'Entity-action specific mapping rules for this destination',
          ),
        policy: Ft.optional().describe(
          'Pre-processing policy rules applied before event mapping',
        ),
        queue: l
          .boolean()
          .describe('Whether to queue events when consent is not granted')
          .optional(),
        verbose: l
          .boolean()
          .describe('Enable verbose logging for debugging')
          .optional(),
        onError: St.optional(),
        onLog: Vt.optional(),
      })
      .describe('Destination configuration'),
    to = wn
      .partial()
      .describe('Partial destination configuration with all fields optional'),
    J_ = Ft.describe('Destination policy rules for event pre-processing'),
    no = l
      .object({
        collector: l.unknown().describe('Collector instance (runtime object)'),
        config: wn.describe('Destination configuration'),
        data: l
          .union([l.unknown(), l.array(l.unknown())])
          .optional()
          .describe('Transformed event data'),
        env: l.unknown().describe('Environment dependencies'),
      })
      .describe('Destination context for init and push functions'),
    io = no
      .extend({
        mapping: Ve.optional().describe(
          'Resolved mapping rule for this specific event',
        ),
      })
      .describe('Push context with event-specific mapping'),
    M_ = io.describe('Batch push context with event-specific mapping'),
    dm = l
      .object({
        event: ke.describe('The event to process'),
        mapping: Ve.optional().describe('Mapping rule for this event'),
      })
      .describe('Event with optional mapping for batch processing'),
    V_ = l.array(dm).describe('Array of events with mappings'),
    mm = l
      .object({
        key: l
          .string()
          .describe('Batch key (usually mapping key like "product.view")'),
        events: l.array(ke).describe('Array of events in batch'),
        data: l
          .array(l.union([l.unknown(), l.array(l.unknown())]).optional())
          .describe('Transformed data for each event'),
        mapping: Ve.optional().describe('Shared mapping rule for batch'),
      })
      .describe('Batch of events grouped by mapping key'),
    F_ = l
      .union([l.unknown(), l.array(l.unknown())])
      .optional()
      .describe('Transformed event data (Property, undefined, or array)'),
    Sn = l
      .object({
        config: wn.describe('Destination configuration'),
        queue: l
          .array(ke)
          .optional()
          .describe('Queued events awaiting consent'),
        dlq: l
          .array(l.tuple([ke, l.unknown()]))
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
    pm = l
      .object({
        code: Sn.describe('Destination instance with implementation'),
        config: to.optional().describe('Partial configuration overrides'),
        env: l.unknown().optional().describe('Partial environment overrides'),
      })
      .describe('Destination initialization configuration'),
    W_ = l
      .record(l.string(), pm)
      .describe('Map of destination IDs to initialization configurations'),
    q_ = l
      .record(l.string(), Sn)
      .describe('Map of destination IDs to runtime instances'),
    Hn = l
      .object({
        id: l.string().describe('Destination ID'),
        destination: Sn.describe('Destination instance'),
      })
      .describe('Destination reference (ID + instance)'),
    B_ = l
      .object({
        queue: l
          .array(ke)
          .optional()
          .describe('Events queued (awaiting consent)'),
        error: l.unknown().optional().describe('Error if push failed'),
      })
      .describe('Push operation result'),
    fm = l
      .object({
        successful: l
          .array(Hn)
          .describe('Destinations that processed successfully'),
        queued: l.array(Hn).describe('Destinations that queued events'),
        failed: l.array(Hn).describe('Destinations that failed to process'),
      })
      .describe('Overall destination processing result'),
    G_ = l
      .array(l.tuple([ke, l.unknown()]))
      .describe('Dead letter queue: [(event, error), ...]'),
    K_ = C(wn),
    H_ = C(to),
    X_ = C(no),
    Y_ = C(io),
    Q_ = C(mm),
    e$ = C(Sn),
    t$ = C(fm);
  wt(
    {},
    {
      CommandTypeSchema: () => vm,
      ConfigSchema: () => zi,
      DestinationsSchema: () => ym,
      InitConfigSchema: () => gm,
      InstanceSchema: () => _m,
      PushContextSchema: () => hm,
      SessionDataSchema: () => ro,
      SourcesSchema: () => bm,
      commandTypeJsonSchema: () => n$,
      configJsonSchema: () => i$,
      initConfigJsonSchema: () => a$,
      instanceJsonSchema: () => s$,
      pushContextJsonSchema: () => o$,
      sessionDataJsonSchema: () => r$,
    },
  );
  var vm = l
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
    zi = l
      .object({
        run: l
          .boolean()
          .describe('Whether to run collector automatically on initialization')
          .optional(),
        tagging: tm,
        globalsStatic: ne.describe(
          'Static global properties that persist across collector runs',
        ),
        sessionStatic: l
          .record(l.string(), l.unknown())
          .describe('Static session data that persists across collector runs'),
        verbose: l.boolean().describe('Enable verbose logging for debugging'),
        onError: St.optional(),
        onLog: Vt.optional(),
      })
      .describe('Core collector configuration'),
    ro = ne
      .and(
        l.object({
          isStart: l.boolean().describe('Whether this is a new session start'),
          storage: l.boolean().describe('Whether storage is available'),
          id: ln.describe('Session identifier').optional(),
          start: dr.describe('Session start timestamp').optional(),
          marketing: l
            .literal(!0)
            .optional()
            .describe('Marketing attribution flag'),
          updated: dr.describe('Last update timestamp').optional(),
          isNew: l
            .boolean()
            .describe('Whether this is a new session')
            .optional(),
          device: ln.describe('Device identifier').optional(),
          count: mr.describe('Event count in session').optional(),
          runs: mr.describe('Number of runs').optional(),
        }),
      )
      .describe('Session state and tracking data'),
    gm = zi
      .partial()
      .extend({
        consent: Te.optional().describe('Initial consent state'),
        user: kn.optional().describe('Initial user data'),
        globals: ne.optional().describe('Initial global properties'),
        sources: l.unknown().optional().describe('Source configurations'),
        destinations: l
          .unknown()
          .optional()
          .describe('Destination configurations'),
        custom: ne
          .optional()
          .describe('Initial custom implementation-specific properties'),
      })
      .describe('Collector initialization configuration with initial state'),
    hm = l
      .object({
        mapping: Oi.optional().describe('Source-level mapping configuration'),
      })
      .describe('Push context with optional source mapping'),
    bm = l
      .record(l.string(), l.unknown())
      .describe('Map of source IDs to source instances'),
    ym = l
      .record(l.string(), l.unknown())
      .describe('Map of destination IDs to destination instances'),
    _m = l
      .object({
        push: l.unknown().describe('Push function for processing events'),
        command: l.unknown().describe('Command function for walker commands'),
        allowed: l.boolean().describe('Whether event processing is allowed'),
        config: zi.describe('Current collector configuration'),
        consent: Te.describe('Current consent state'),
        count: l.number().describe('Event count (increments with each event)'),
        custom: ne.describe('Custom implementation-specific properties'),
        sources: bm.describe('Registered source instances'),
        destinations: ym.describe('Registered destination instances'),
        globals: ne.describe('Current global properties'),
        group: l.string().describe('Event grouping identifier'),
        hooks: l.unknown().describe('Lifecycle hook functions'),
        on: l.unknown().describe('Event lifecycle configuration'),
        queue: l.array(ke).describe('Queued events awaiting processing'),
        round: l
          .number()
          .describe('Collector run count (increments with each run)'),
        session: l.union([ro]).describe('Current session state'),
        timing: l.number().describe('Event processing timing information'),
        user: kn.describe('Current user data'),
        version: l.string().describe('Walker implementation version'),
      })
      .describe('Collector instance with state and methods'),
    n$ = C(vm),
    i$ = C(zi),
    r$ = C(ro),
    a$ = C(gm),
    o$ = C(hm),
    s$ = C(_m);
  wt(
    {},
    {
      BaseEnvSchema: () => Ni,
      ConfigSchema: () => Ui,
      InitSchema: () => km,
      InitSourceSchema: () => oo,
      InitSourcesSchema: () => wm,
      InstanceSchema: () => $m,
      PartialConfigSchema: () => ao,
      baseEnvJsonSchema: () => u$,
      configJsonSchema: () => c$,
      initSourceJsonSchema: () => m$,
      initSourcesJsonSchema: () => p$,
      instanceJsonSchema: () => d$,
      partialConfigJsonSchema: () => l$,
    },
  );
  var Ni = l
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
    Ui = Oi.extend({
      settings: l
        .any()
        .describe('Implementation-specific configuration')
        .optional(),
      env: Ni.optional().describe(
        'Environment dependencies (platform-specific)',
      ),
      id: ln.describe('Source identifier (defaults to source key)').optional(),
      onError: St.optional(),
      disabled: l.boolean().describe('Set to true to disable').optional(),
      primary: l
        .boolean()
        .describe('Mark as primary (only one can be primary)')
        .optional(),
    }).describe('Source configuration with mapping and environment'),
    ao = Ui.partial().describe(
      'Partial source configuration with all fields optional',
    ),
    $m = l
      .object({
        type: l
          .string()
          .describe('Source type identifier (e.g., "browser", "dataLayer")'),
        config: Ui.describe('Current source configuration'),
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
    km = l
      .any()
      .describe(
        'Source initialization function: (config, env) => Instance | Promise<Instance>',
      ),
    oo = l
      .object({
        code: km.describe('Source initialization function'),
        config: ao.optional().describe('Partial configuration overrides'),
        env: Ni.partial().optional().describe('Partial environment overrides'),
        primary: l
          .boolean()
          .optional()
          .describe('Mark as primary source (only one can be primary)'),
      })
      .describe('Source initialization configuration'),
    wm = l
      .record(l.string(), oo)
      .describe('Map of source IDs to initialization configurations'),
    u$ = C(Ni),
    c$ = C(Ui),
    l$ = C(ao),
    d$ = C($m),
    m$ = C(oo),
    p$ = C(wm);
  wt(
    {},
    {
      ConfigSchema: () => xn,
      DestinationReferenceSchema: () => uo,
      PrimitiveSchema: () => Sm,
      SetupSchema: () => Pi,
      SourceReferenceSchema: () => so,
      configJsonSchema: () => y$,
      destinationReferenceJsonSchema: () => $$,
      parseConfig: () => g$,
      parseSetup: () => f$,
      safeParseConfig: () => h$,
      safeParseSetup: () => v$,
      setupJsonSchema: () => b$,
      sourceReferenceJsonSchema: () => _$,
    },
  );
  var Sm = l
      .union([l.string(), l.number(), l.boolean()])
      .describe('Primitive value: string, number, or boolean'),
    so = l
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
    uo = l
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
    xn = l
      .object({
        platform: l
          .enum(['web', 'server'], {
            error: 'Platform must be "web" or "server"',
          })
          .describe(
            'Target platform: "web" for browser-based tracking, "server" for Node.js server-side collection',
          ),
        sources: l
          .record(l.string(), so)
          .optional()
          .describe(
            'Source configurations (data capture) keyed by unique identifier',
          ),
        destinations: l
          .record(l.string(), uo)
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
    Pi = l
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
          .record(l.string(), Sm)
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
          .record(l.string(), xn)
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
  function f$(e) {
    return Pi.parse(e);
  }
  function v$(e) {
    return Pi.safeParse(e);
  }
  function g$(e) {
    return xn.parse(e);
  }
  function h$(e) {
    return xn.safeParse(e);
  }
  var b$ = l.toJSONSchema(Pi, { target: 'draft-7' }),
    y$ = C(xn),
    _$ = C(so),
    $$ = C(uo);
  function xm(e) {
    return l.toJSONSchema(e, { target: 'draft-7' });
  }
  var k$ = { merge: !0, shallow: !0, extend: !0 };
  function Im(e, t = {}, i = {}) {
    i = { ...k$, ...i };
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
  function w$(e = 'entity action', t = {}) {
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
        m = Im(
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
  function xs(e, t, i) {
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
  function nr(e) {
    return e === void 0 ||
      (function (t, i) {
        return typeof t == typeof i;
      })(e, '')
      ? e
      : JSON.stringify(e);
  }
  function Is(e = {}) {
    return Im({ 'Content-Type': 'application/json; charset=utf-8' }, e);
  }
  function S$(e, t, i = { transport: 'fetch' }) {
    switch (i.transport || 'fetch') {
      case 'beacon':
        return (function (n, r) {
          let o = nr(r),
            s = navigator.sendBeacon(n, o);
          return { ok: s, error: s ? void 0 : 'Failed to send beacon' };
        })(e, t);
      case 'xhr':
        return (function (n, r, o = {}) {
          let s = Is(o.headers),
            u = o.method || 'POST',
            a = nr(r);
          return xs(
            () => {
              let c = new XMLHttpRequest();
              c.open(u, n, !1);
              for (let p in s) c.setRequestHeader(p, s[p]);
              c.send(a);
              let m = c.status >= 200 && c.status < 300;
              return {
                ok: m,
                data: xs(JSON.parse, () => c.response)(c.response),
                error: m ? void 0 : `${c.status} ${c.statusText}`,
              };
            },
            (c) => ({ ok: !1, error: c.message }),
          )();
        })(e, t, i);
      default:
        return (async function (n, r, o = {}) {
          let s = Is(o.headers),
            u = nr(r);
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
  var x$ = {};
  ve(x$, { env: () => jm, events: () => Om, mapping: () => zm });
  var jm = {};
  ve(jm, { init: () => I$, push: () => j$, simulation: () => O$ });
  var I$ = { sendWeb: void 0 },
    j$ = { sendWeb: Object.assign(() => {}, {}) },
    O$ = ['call:sendWeb'],
    Om = {};
  function z$() {
    let e = w$('entity action');
    return JSON.stringify(e.data);
  }
  ve(Om, { entity_action: () => z$ });
  var zm = {};
  ve(zm, { config: () => N$, entity_action: () => Nm });
  var Nm = { data: 'data' },
    N$ = { entity: { action: Nm } },
    U$ = {};
  ve(U$, {
    MappingSchema: () => Pm,
    SettingsSchema: () => Um,
    mapping: () => E$,
    settings: () => P$,
  });
  var Um = l.object({
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
    Pm = l.object({}),
    P$ = xm(Um),
    E$ = xm(Pm),
    Em = {
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
        (r?.sendWeb || S$)(s, f, { headers: u, method: a, transport: m });
      },
    };
  async function D$(e = {}) {
    let { tracker: t } = e,
      i = t,
      n = typeof globalThis.window < 'u' ? globalThis.window : void 0,
      r = typeof globalThis.document < 'u' ? globalThis.document : void 0;
    return await ts({
      sources: {
        demo: {
          code: rs,
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
        demo: { code: us, config: { settings: { name: 'demo' } } },
        api: {
          code: Em,
          config: { settings: { url: 'http://localhost:8080/collect' } },
        },
      },
      run: !0,
      globals: { language: 'en' },
    });
  }
  return Rm(T$);
})();
