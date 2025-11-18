"use strict";
var walkerOS = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to2, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to2, key) && key !== except)
          __defProp(to2, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to2;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // entry.js
  var entry_exports = {};
  __export(entry_exports, {
    default: () => entry_default
  });

  // node_modules/zod/v4/classic/external.js
  var external_exports = {};
  __export(external_exports, {
    $brand: () => $brand,
    $input: () => $input,
    $output: () => $output,
    NEVER: () => NEVER,
    TimePrecision: () => TimePrecision,
    ZodAny: () => ZodAny,
    ZodArray: () => ZodArray,
    ZodBase64: () => ZodBase64,
    ZodBase64URL: () => ZodBase64URL,
    ZodBigInt: () => ZodBigInt,
    ZodBigIntFormat: () => ZodBigIntFormat,
    ZodBoolean: () => ZodBoolean,
    ZodCIDRv4: () => ZodCIDRv4,
    ZodCIDRv6: () => ZodCIDRv6,
    ZodCUID: () => ZodCUID,
    ZodCUID2: () => ZodCUID2,
    ZodCatch: () => ZodCatch,
    ZodCodec: () => ZodCodec,
    ZodCustom: () => ZodCustom,
    ZodCustomStringFormat: () => ZodCustomStringFormat,
    ZodDate: () => ZodDate,
    ZodDefault: () => ZodDefault,
    ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
    ZodE164: () => ZodE164,
    ZodEmail: () => ZodEmail,
    ZodEmoji: () => ZodEmoji,
    ZodEnum: () => ZodEnum,
    ZodError: () => ZodError,
    ZodFile: () => ZodFile,
    ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
    ZodFunction: () => ZodFunction,
    ZodGUID: () => ZodGUID,
    ZodIPv4: () => ZodIPv4,
    ZodIPv6: () => ZodIPv6,
    ZodISODate: () => ZodISODate,
    ZodISODateTime: () => ZodISODateTime,
    ZodISODuration: () => ZodISODuration,
    ZodISOTime: () => ZodISOTime,
    ZodIntersection: () => ZodIntersection,
    ZodIssueCode: () => ZodIssueCode,
    ZodJWT: () => ZodJWT,
    ZodKSUID: () => ZodKSUID,
    ZodLazy: () => ZodLazy,
    ZodLiteral: () => ZodLiteral,
    ZodMap: () => ZodMap,
    ZodNaN: () => ZodNaN,
    ZodNanoID: () => ZodNanoID,
    ZodNever: () => ZodNever,
    ZodNonOptional: () => ZodNonOptional,
    ZodNull: () => ZodNull,
    ZodNullable: () => ZodNullable,
    ZodNumber: () => ZodNumber,
    ZodNumberFormat: () => ZodNumberFormat,
    ZodObject: () => ZodObject,
    ZodOptional: () => ZodOptional,
    ZodPipe: () => ZodPipe,
    ZodPrefault: () => ZodPrefault,
    ZodPromise: () => ZodPromise,
    ZodReadonly: () => ZodReadonly,
    ZodRealError: () => ZodRealError,
    ZodRecord: () => ZodRecord,
    ZodSet: () => ZodSet,
    ZodString: () => ZodString,
    ZodStringFormat: () => ZodStringFormat,
    ZodSuccess: () => ZodSuccess,
    ZodSymbol: () => ZodSymbol,
    ZodTemplateLiteral: () => ZodTemplateLiteral,
    ZodTransform: () => ZodTransform,
    ZodTuple: () => ZodTuple,
    ZodType: () => ZodType,
    ZodULID: () => ZodULID,
    ZodURL: () => ZodURL,
    ZodUUID: () => ZodUUID,
    ZodUndefined: () => ZodUndefined,
    ZodUnion: () => ZodUnion,
    ZodUnknown: () => ZodUnknown,
    ZodVoid: () => ZodVoid,
    ZodXID: () => ZodXID,
    _ZodString: () => _ZodString,
    _default: () => _default2,
    _function: () => _function,
    any: () => any,
    array: () => array,
    base64: () => base642,
    base64url: () => base64url2,
    bigint: () => bigint2,
    boolean: () => boolean2,
    catch: () => _catch2,
    check: () => check,
    cidrv4: () => cidrv42,
    cidrv6: () => cidrv62,
    clone: () => clone,
    codec: () => codec,
    coerce: () => coerce_exports,
    config: () => config,
    core: () => core_exports2,
    cuid: () => cuid3,
    cuid2: () => cuid22,
    custom: () => custom,
    date: () => date3,
    decode: () => decode2,
    decodeAsync: () => decodeAsync2,
    discriminatedUnion: () => discriminatedUnion,
    e164: () => e1642,
    email: () => email2,
    emoji: () => emoji2,
    encode: () => encode2,
    encodeAsync: () => encodeAsync2,
    endsWith: () => _endsWith,
    enum: () => _enum2,
    file: () => file,
    flattenError: () => flattenError,
    float32: () => float32,
    float64: () => float64,
    formatError: () => formatError,
    function: () => _function,
    getErrorMap: () => getErrorMap,
    globalRegistry: () => globalRegistry,
    gt: () => _gt,
    gte: () => _gte,
    guid: () => guid2,
    hash: () => hash,
    hex: () => hex2,
    hostname: () => hostname2,
    httpUrl: () => httpUrl,
    includes: () => _includes,
    instanceof: () => _instanceof,
    int: () => int,
    int32: () => int32,
    int64: () => int64,
    intersection: () => intersection,
    ipv4: () => ipv42,
    ipv6: () => ipv62,
    iso: () => iso_exports,
    json: () => json,
    jwt: () => jwt,
    keyof: () => keyof,
    ksuid: () => ksuid2,
    lazy: () => lazy,
    length: () => _length,
    literal: () => literal,
    locales: () => locales_exports,
    looseObject: () => looseObject,
    lowercase: () => _lowercase,
    lt: () => _lt,
    lte: () => _lte,
    map: () => map,
    maxLength: () => _maxLength,
    maxSize: () => _maxSize,
    mime: () => _mime,
    minLength: () => _minLength,
    minSize: () => _minSize,
    multipleOf: () => _multipleOf,
    nan: () => nan,
    nanoid: () => nanoid2,
    nativeEnum: () => nativeEnum,
    negative: () => _negative,
    never: () => never,
    nonnegative: () => _nonnegative,
    nonoptional: () => nonoptional,
    nonpositive: () => _nonpositive,
    normalize: () => _normalize,
    null: () => _null3,
    nullable: () => nullable,
    nullish: () => nullish2,
    number: () => number2,
    object: () => object,
    optional: () => optional,
    overwrite: () => _overwrite,
    parse: () => parse2,
    parseAsync: () => parseAsync2,
    partialRecord: () => partialRecord,
    pipe: () => pipe,
    positive: () => _positive,
    prefault: () => prefault,
    preprocess: () => preprocess,
    prettifyError: () => prettifyError,
    promise: () => promise,
    property: () => _property,
    readonly: () => readonly,
    record: () => record,
    refine: () => refine,
    regex: () => _regex,
    regexes: () => regexes_exports,
    registry: () => registry,
    safeDecode: () => safeDecode2,
    safeDecodeAsync: () => safeDecodeAsync2,
    safeEncode: () => safeEncode2,
    safeEncodeAsync: () => safeEncodeAsync2,
    safeParse: () => safeParse2,
    safeParseAsync: () => safeParseAsync2,
    set: () => set,
    setErrorMap: () => setErrorMap,
    size: () => _size,
    startsWith: () => _startsWith,
    strictObject: () => strictObject,
    string: () => string2,
    stringFormat: () => stringFormat,
    stringbool: () => stringbool,
    success: () => success,
    superRefine: () => superRefine,
    symbol: () => symbol,
    templateLiteral: () => templateLiteral,
    toJSONSchema: () => toJSONSchema,
    toLowerCase: () => _toLowerCase,
    toUpperCase: () => _toUpperCase,
    transform: () => transform,
    treeifyError: () => treeifyError,
    trim: () => _trim,
    tuple: () => tuple,
    uint32: () => uint32,
    uint64: () => uint64,
    ulid: () => ulid2,
    undefined: () => _undefined3,
    union: () => union,
    unknown: () => unknown,
    uppercase: () => _uppercase,
    url: () => url,
    util: () => util_exports,
    uuid: () => uuid2,
    uuidv4: () => uuidv4,
    uuidv6: () => uuidv6,
    uuidv7: () => uuidv7,
    void: () => _void2,
    xid: () => xid2
  });

  // node_modules/zod/v4/core/index.js
  var core_exports2 = {};
  __export(core_exports2, {
    $ZodAny: () => $ZodAny,
    $ZodArray: () => $ZodArray,
    $ZodAsyncError: () => $ZodAsyncError,
    $ZodBase64: () => $ZodBase64,
    $ZodBase64URL: () => $ZodBase64URL,
    $ZodBigInt: () => $ZodBigInt,
    $ZodBigIntFormat: () => $ZodBigIntFormat,
    $ZodBoolean: () => $ZodBoolean,
    $ZodCIDRv4: () => $ZodCIDRv4,
    $ZodCIDRv6: () => $ZodCIDRv6,
    $ZodCUID: () => $ZodCUID,
    $ZodCUID2: () => $ZodCUID2,
    $ZodCatch: () => $ZodCatch,
    $ZodCheck: () => $ZodCheck,
    $ZodCheckBigIntFormat: () => $ZodCheckBigIntFormat,
    $ZodCheckEndsWith: () => $ZodCheckEndsWith,
    $ZodCheckGreaterThan: () => $ZodCheckGreaterThan,
    $ZodCheckIncludes: () => $ZodCheckIncludes,
    $ZodCheckLengthEquals: () => $ZodCheckLengthEquals,
    $ZodCheckLessThan: () => $ZodCheckLessThan,
    $ZodCheckLowerCase: () => $ZodCheckLowerCase,
    $ZodCheckMaxLength: () => $ZodCheckMaxLength,
    $ZodCheckMaxSize: () => $ZodCheckMaxSize,
    $ZodCheckMimeType: () => $ZodCheckMimeType,
    $ZodCheckMinLength: () => $ZodCheckMinLength,
    $ZodCheckMinSize: () => $ZodCheckMinSize,
    $ZodCheckMultipleOf: () => $ZodCheckMultipleOf,
    $ZodCheckNumberFormat: () => $ZodCheckNumberFormat,
    $ZodCheckOverwrite: () => $ZodCheckOverwrite,
    $ZodCheckProperty: () => $ZodCheckProperty,
    $ZodCheckRegex: () => $ZodCheckRegex,
    $ZodCheckSizeEquals: () => $ZodCheckSizeEquals,
    $ZodCheckStartsWith: () => $ZodCheckStartsWith,
    $ZodCheckStringFormat: () => $ZodCheckStringFormat,
    $ZodCheckUpperCase: () => $ZodCheckUpperCase,
    $ZodCodec: () => $ZodCodec,
    $ZodCustom: () => $ZodCustom,
    $ZodCustomStringFormat: () => $ZodCustomStringFormat,
    $ZodDate: () => $ZodDate,
    $ZodDefault: () => $ZodDefault,
    $ZodDiscriminatedUnion: () => $ZodDiscriminatedUnion,
    $ZodE164: () => $ZodE164,
    $ZodEmail: () => $ZodEmail,
    $ZodEmoji: () => $ZodEmoji,
    $ZodEncodeError: () => $ZodEncodeError,
    $ZodEnum: () => $ZodEnum,
    $ZodError: () => $ZodError,
    $ZodFile: () => $ZodFile,
    $ZodFunction: () => $ZodFunction,
    $ZodGUID: () => $ZodGUID,
    $ZodIPv4: () => $ZodIPv4,
    $ZodIPv6: () => $ZodIPv6,
    $ZodISODate: () => $ZodISODate,
    $ZodISODateTime: () => $ZodISODateTime,
    $ZodISODuration: () => $ZodISODuration,
    $ZodISOTime: () => $ZodISOTime,
    $ZodIntersection: () => $ZodIntersection,
    $ZodJWT: () => $ZodJWT,
    $ZodKSUID: () => $ZodKSUID,
    $ZodLazy: () => $ZodLazy,
    $ZodLiteral: () => $ZodLiteral,
    $ZodMap: () => $ZodMap,
    $ZodNaN: () => $ZodNaN,
    $ZodNanoID: () => $ZodNanoID,
    $ZodNever: () => $ZodNever,
    $ZodNonOptional: () => $ZodNonOptional,
    $ZodNull: () => $ZodNull,
    $ZodNullable: () => $ZodNullable,
    $ZodNumber: () => $ZodNumber,
    $ZodNumberFormat: () => $ZodNumberFormat,
    $ZodObject: () => $ZodObject,
    $ZodObjectJIT: () => $ZodObjectJIT,
    $ZodOptional: () => $ZodOptional,
    $ZodPipe: () => $ZodPipe,
    $ZodPrefault: () => $ZodPrefault,
    $ZodPromise: () => $ZodPromise,
    $ZodReadonly: () => $ZodReadonly,
    $ZodRealError: () => $ZodRealError,
    $ZodRecord: () => $ZodRecord,
    $ZodRegistry: () => $ZodRegistry,
    $ZodSet: () => $ZodSet,
    $ZodString: () => $ZodString,
    $ZodStringFormat: () => $ZodStringFormat,
    $ZodSuccess: () => $ZodSuccess,
    $ZodSymbol: () => $ZodSymbol,
    $ZodTemplateLiteral: () => $ZodTemplateLiteral,
    $ZodTransform: () => $ZodTransform,
    $ZodTuple: () => $ZodTuple,
    $ZodType: () => $ZodType,
    $ZodULID: () => $ZodULID,
    $ZodURL: () => $ZodURL,
    $ZodUUID: () => $ZodUUID,
    $ZodUndefined: () => $ZodUndefined,
    $ZodUnion: () => $ZodUnion,
    $ZodUnknown: () => $ZodUnknown,
    $ZodVoid: () => $ZodVoid,
    $ZodXID: () => $ZodXID,
    $brand: () => $brand,
    $constructor: () => $constructor,
    $input: () => $input,
    $output: () => $output,
    Doc: () => Doc,
    JSONSchema: () => json_schema_exports,
    JSONSchemaGenerator: () => JSONSchemaGenerator,
    NEVER: () => NEVER,
    TimePrecision: () => TimePrecision,
    _any: () => _any,
    _array: () => _array,
    _base64: () => _base64,
    _base64url: () => _base64url,
    _bigint: () => _bigint,
    _boolean: () => _boolean,
    _catch: () => _catch,
    _check: () => _check,
    _cidrv4: () => _cidrv4,
    _cidrv6: () => _cidrv6,
    _coercedBigint: () => _coercedBigint,
    _coercedBoolean: () => _coercedBoolean,
    _coercedDate: () => _coercedDate,
    _coercedNumber: () => _coercedNumber,
    _coercedString: () => _coercedString,
    _cuid: () => _cuid,
    _cuid2: () => _cuid2,
    _custom: () => _custom,
    _date: () => _date,
    _decode: () => _decode,
    _decodeAsync: () => _decodeAsync,
    _default: () => _default,
    _discriminatedUnion: () => _discriminatedUnion,
    _e164: () => _e164,
    _email: () => _email,
    _emoji: () => _emoji2,
    _encode: () => _encode,
    _encodeAsync: () => _encodeAsync,
    _endsWith: () => _endsWith,
    _enum: () => _enum,
    _file: () => _file,
    _float32: () => _float32,
    _float64: () => _float64,
    _gt: () => _gt,
    _gte: () => _gte,
    _guid: () => _guid,
    _includes: () => _includes,
    _int: () => _int,
    _int32: () => _int32,
    _int64: () => _int64,
    _intersection: () => _intersection,
    _ipv4: () => _ipv4,
    _ipv6: () => _ipv6,
    _isoDate: () => _isoDate,
    _isoDateTime: () => _isoDateTime,
    _isoDuration: () => _isoDuration,
    _isoTime: () => _isoTime,
    _jwt: () => _jwt,
    _ksuid: () => _ksuid,
    _lazy: () => _lazy,
    _length: () => _length,
    _literal: () => _literal,
    _lowercase: () => _lowercase,
    _lt: () => _lt,
    _lte: () => _lte,
    _map: () => _map,
    _max: () => _lte,
    _maxLength: () => _maxLength,
    _maxSize: () => _maxSize,
    _mime: () => _mime,
    _min: () => _gte,
    _minLength: () => _minLength,
    _minSize: () => _minSize,
    _multipleOf: () => _multipleOf,
    _nan: () => _nan,
    _nanoid: () => _nanoid,
    _nativeEnum: () => _nativeEnum,
    _negative: () => _negative,
    _never: () => _never,
    _nonnegative: () => _nonnegative,
    _nonoptional: () => _nonoptional,
    _nonpositive: () => _nonpositive,
    _normalize: () => _normalize,
    _null: () => _null2,
    _nullable: () => _nullable,
    _number: () => _number,
    _optional: () => _optional,
    _overwrite: () => _overwrite,
    _parse: () => _parse,
    _parseAsync: () => _parseAsync,
    _pipe: () => _pipe,
    _positive: () => _positive,
    _promise: () => _promise,
    _property: () => _property,
    _readonly: () => _readonly,
    _record: () => _record,
    _refine: () => _refine,
    _regex: () => _regex,
    _safeDecode: () => _safeDecode,
    _safeDecodeAsync: () => _safeDecodeAsync,
    _safeEncode: () => _safeEncode,
    _safeEncodeAsync: () => _safeEncodeAsync,
    _safeParse: () => _safeParse,
    _safeParseAsync: () => _safeParseAsync,
    _set: () => _set,
    _size: () => _size,
    _startsWith: () => _startsWith,
    _string: () => _string,
    _stringFormat: () => _stringFormat,
    _stringbool: () => _stringbool,
    _success: () => _success,
    _superRefine: () => _superRefine,
    _symbol: () => _symbol,
    _templateLiteral: () => _templateLiteral,
    _toLowerCase: () => _toLowerCase,
    _toUpperCase: () => _toUpperCase,
    _transform: () => _transform,
    _trim: () => _trim,
    _tuple: () => _tuple,
    _uint32: () => _uint32,
    _uint64: () => _uint64,
    _ulid: () => _ulid,
    _undefined: () => _undefined2,
    _union: () => _union,
    _unknown: () => _unknown,
    _uppercase: () => _uppercase,
    _url: () => _url,
    _uuid: () => _uuid,
    _uuidv4: () => _uuidv4,
    _uuidv6: () => _uuidv6,
    _uuidv7: () => _uuidv7,
    _void: () => _void,
    _xid: () => _xid,
    clone: () => clone,
    config: () => config,
    decode: () => decode,
    decodeAsync: () => decodeAsync,
    encode: () => encode,
    encodeAsync: () => encodeAsync,
    flattenError: () => flattenError,
    formatError: () => formatError,
    globalConfig: () => globalConfig,
    globalRegistry: () => globalRegistry,
    isValidBase64: () => isValidBase64,
    isValidBase64URL: () => isValidBase64URL,
    isValidJWT: () => isValidJWT,
    locales: () => locales_exports,
    parse: () => parse,
    parseAsync: () => parseAsync,
    prettifyError: () => prettifyError,
    regexes: () => regexes_exports,
    registry: () => registry,
    safeDecode: () => safeDecode,
    safeDecodeAsync: () => safeDecodeAsync,
    safeEncode: () => safeEncode,
    safeEncodeAsync: () => safeEncodeAsync,
    safeParse: () => safeParse,
    safeParseAsync: () => safeParseAsync,
    toDotPath: () => toDotPath,
    toJSONSchema: () => toJSONSchema,
    treeifyError: () => treeifyError,
    util: () => util_exports,
    version: () => version
  });

  // node_modules/zod/v4/core/core.js
  var NEVER = Object.freeze({
    status: "aborted"
  });
  // @__NO_SIDE_EFFECTS__
  function $constructor(name, initializer3, params) {
    function init(inst, def) {
      var _a2;
      Object.defineProperty(inst, "_zod", {
        value: inst._zod ?? {},
        enumerable: false
      });
      (_a2 = inst._zod).traits ?? (_a2.traits = /* @__PURE__ */ new Set());
      inst._zod.traits.add(name);
      initializer3(inst, def);
      for (const k4 in _4.prototype) {
        if (!(k4 in inst))
          Object.defineProperty(inst, k4, { value: _4.prototype[k4].bind(inst) });
      }
      inst._zod.constr = _4;
      inst._zod.def = def;
    }
    const Parent = params?.Parent ?? Object;
    class Definition extends Parent {
    }
    Object.defineProperty(Definition, "name", { value: name });
    function _4(def) {
      var _a2;
      const inst = params?.Parent ? new Definition() : this;
      init(inst, def);
      (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
      for (const fn3 of inst._zod.deferred) {
        fn3();
      }
      return inst;
    }
    Object.defineProperty(_4, "init", { value: init });
    Object.defineProperty(_4, Symbol.hasInstance, {
      value: (inst) => {
        if (params?.Parent && inst instanceof params.Parent)
          return true;
        return inst?._zod?.traits?.has(name);
      }
    });
    Object.defineProperty(_4, "name", { value: name });
    return _4;
  }
  var $brand = Symbol("zod_brand");
  var $ZodAsyncError = class extends Error {
    constructor() {
      super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
    }
  };
  var $ZodEncodeError = class extends Error {
    constructor(name) {
      super(`Encountered unidirectional transform during encode: ${name}`);
      this.name = "ZodEncodeError";
    }
  };
  var globalConfig = {};
  function config(newConfig) {
    if (newConfig)
      Object.assign(globalConfig, newConfig);
    return globalConfig;
  }

  // node_modules/zod/v4/core/util.js
  var util_exports = {};
  __export(util_exports, {
    BIGINT_FORMAT_RANGES: () => BIGINT_FORMAT_RANGES,
    Class: () => Class,
    NUMBER_FORMAT_RANGES: () => NUMBER_FORMAT_RANGES,
    aborted: () => aborted,
    allowsEval: () => allowsEval,
    assert: () => assert,
    assertEqual: () => assertEqual,
    assertIs: () => assertIs,
    assertNever: () => assertNever,
    assertNotEqual: () => assertNotEqual,
    assignProp: () => assignProp,
    base64ToUint8Array: () => base64ToUint8Array,
    base64urlToUint8Array: () => base64urlToUint8Array,
    cached: () => cached,
    captureStackTrace: () => captureStackTrace,
    cleanEnum: () => cleanEnum,
    cleanRegex: () => cleanRegex,
    clone: () => clone,
    cloneDef: () => cloneDef,
    createTransparentProxy: () => createTransparentProxy,
    defineLazy: () => defineLazy,
    esc: () => esc,
    escapeRegex: () => escapeRegex,
    extend: () => extend,
    finalizeIssue: () => finalizeIssue,
    floatSafeRemainder: () => floatSafeRemainder,
    getElementAtPath: () => getElementAtPath,
    getEnumValues: () => getEnumValues,
    getLengthableOrigin: () => getLengthableOrigin,
    getParsedType: () => getParsedType,
    getSizableOrigin: () => getSizableOrigin,
    hexToUint8Array: () => hexToUint8Array,
    isObject: () => isObject,
    isPlainObject: () => isPlainObject,
    issue: () => issue,
    joinValues: () => joinValues,
    jsonStringifyReplacer: () => jsonStringifyReplacer,
    merge: () => merge,
    mergeDefs: () => mergeDefs,
    normalizeParams: () => normalizeParams,
    nullish: () => nullish,
    numKeys: () => numKeys,
    objectClone: () => objectClone,
    omit: () => omit,
    optionalKeys: () => optionalKeys,
    partial: () => partial,
    pick: () => pick,
    prefixIssues: () => prefixIssues,
    primitiveTypes: () => primitiveTypes,
    promiseAllObject: () => promiseAllObject,
    propertyKeyTypes: () => propertyKeyTypes,
    randomString: () => randomString,
    required: () => required,
    safeExtend: () => safeExtend,
    shallowClone: () => shallowClone,
    stringifyPrimitive: () => stringifyPrimitive,
    uint8ArrayToBase64: () => uint8ArrayToBase64,
    uint8ArrayToBase64url: () => uint8ArrayToBase64url,
    uint8ArrayToHex: () => uint8ArrayToHex,
    unwrapMessage: () => unwrapMessage
  });
  function assertEqual(val) {
    return val;
  }
  function assertNotEqual(val) {
    return val;
  }
  function assertIs(_arg) {
  }
  function assertNever(_x) {
    throw new Error();
  }
  function assert(_4) {
  }
  function getEnumValues(entries) {
    const numericValues = Object.values(entries).filter((v4) => typeof v4 === "number");
    const values = Object.entries(entries).filter(([k4, _4]) => numericValues.indexOf(+k4) === -1).map(([_4, v4]) => v4);
    return values;
  }
  function joinValues(array2, separator = "|") {
    return array2.map((val) => stringifyPrimitive(val)).join(separator);
  }
  function jsonStringifyReplacer(_4, value) {
    if (typeof value === "bigint")
      return value.toString();
    return value;
  }
  function cached(getter) {
    const set2 = false;
    return {
      get value() {
        if (!set2) {
          const value = getter();
          Object.defineProperty(this, "value", { value });
          return value;
        }
        throw new Error("cached value already set");
      }
    };
  }
  function nullish(input) {
    return input === null || input === void 0;
  }
  function cleanRegex(source) {
    const start = source.startsWith("^") ? 1 : 0;
    const end = source.endsWith("$") ? source.length - 1 : source.length;
    return source.slice(start, end);
  }
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepString = step.toString();
    let stepDecCount = (stepString.split(".")[1] || "").length;
    if (stepDecCount === 0 && /\d?e-\d?/.test(stepString)) {
      const match = stepString.match(/\d?e-(\d?)/);
      if (match?.[1]) {
        stepDecCount = Number.parseInt(match[1]);
      }
    }
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  var EVALUATING = Symbol("evaluating");
  function defineLazy(object2, key, getter) {
    let value = void 0;
    Object.defineProperty(object2, key, {
      get() {
        if (value === EVALUATING) {
          return void 0;
        }
        if (value === void 0) {
          value = EVALUATING;
          value = getter();
        }
        return value;
      },
      set(v4) {
        Object.defineProperty(object2, key, {
          value: v4
          // configurable: true,
        });
      },
      configurable: true
    });
  }
  function objectClone(obj) {
    return Object.create(Object.getPrototypeOf(obj), Object.getOwnPropertyDescriptors(obj));
  }
  function assignProp(target, prop, value) {
    Object.defineProperty(target, prop, {
      value,
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  function mergeDefs(...defs) {
    const mergedDescriptors = {};
    for (const def of defs) {
      const descriptors = Object.getOwnPropertyDescriptors(def);
      Object.assign(mergedDescriptors, descriptors);
    }
    return Object.defineProperties({}, mergedDescriptors);
  }
  function cloneDef(schema) {
    return mergeDefs(schema._zod.def);
  }
  function getElementAtPath(obj, path) {
    if (!path)
      return obj;
    return path.reduce((acc, key) => acc?.[key], obj);
  }
  function promiseAllObject(promisesObj) {
    const keys = Object.keys(promisesObj);
    const promises = keys.map((key) => promisesObj[key]);
    return Promise.all(promises).then((results) => {
      const resolvedObj = {};
      for (let i4 = 0; i4 < keys.length; i4++) {
        resolvedObj[keys[i4]] = results[i4];
      }
      return resolvedObj;
    });
  }
  function randomString(length = 10) {
    const chars = "abcdefghijklmnopqrstuvwxyz";
    let str = "";
    for (let i4 = 0; i4 < length; i4++) {
      str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
  }
  function esc(str) {
    return JSON.stringify(str);
  }
  var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
  };
  function isObject(data) {
    return typeof data === "object" && data !== null && !Array.isArray(data);
  }
  var allowsEval = cached(() => {
    if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
      return false;
    }
    try {
      const F3 = Function;
      new F3("");
      return true;
    } catch (_4) {
      return false;
    }
  });
  function isPlainObject(o4) {
    if (isObject(o4) === false)
      return false;
    const ctor = o4.constructor;
    if (ctor === void 0)
      return true;
    const prot = ctor.prototype;
    if (isObject(prot) === false)
      return false;
    if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
      return false;
    }
    return true;
  }
  function shallowClone(o4) {
    if (isPlainObject(o4))
      return { ...o4 };
    if (Array.isArray(o4))
      return [...o4];
    return o4;
  }
  function numKeys(data) {
    let keyCount = 0;
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        keyCount++;
      }
    }
    return keyCount;
  }
  var getParsedType = (data) => {
    const t4 = typeof data;
    switch (t4) {
      case "undefined":
        return "undefined";
      case "string":
        return "string";
      case "number":
        return Number.isNaN(data) ? "nan" : "number";
      case "boolean":
        return "boolean";
      case "function":
        return "function";
      case "bigint":
        return "bigint";
      case "symbol":
        return "symbol";
      case "object":
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
          return "promise";
        }
        if (typeof Map !== "undefined" && data instanceof Map) {
          return "map";
        }
        if (typeof Set !== "undefined" && data instanceof Set) {
          return "set";
        }
        if (typeof Date !== "undefined" && data instanceof Date) {
          return "date";
        }
        if (typeof File !== "undefined" && data instanceof File) {
          return "file";
        }
        return "object";
      default:
        throw new Error(`Unknown data type: ${t4}`);
    }
  };
  var propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
  var primitiveTypes = /* @__PURE__ */ new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
  function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function clone(inst, def, params) {
    const cl2 = new inst._zod.constr(def ?? inst._zod.def);
    if (!def || params?.parent)
      cl2._zod.parent = inst;
    return cl2;
  }
  function normalizeParams(_params) {
    const params = _params;
    if (!params)
      return {};
    if (typeof params === "string")
      return { error: () => params };
    if (params?.message !== void 0) {
      if (params?.error !== void 0)
        throw new Error("Cannot specify both `message` and `error` params");
      params.error = params.message;
    }
    delete params.message;
    if (typeof params.error === "string")
      return { ...params, error: () => params.error };
    return params;
  }
  function createTransparentProxy(getter) {
    let target;
    return new Proxy({}, {
      get(_4, prop, receiver) {
        target ?? (target = getter());
        return Reflect.get(target, prop, receiver);
      },
      set(_4, prop, value, receiver) {
        target ?? (target = getter());
        return Reflect.set(target, prop, value, receiver);
      },
      has(_4, prop) {
        target ?? (target = getter());
        return Reflect.has(target, prop);
      },
      deleteProperty(_4, prop) {
        target ?? (target = getter());
        return Reflect.deleteProperty(target, prop);
      },
      ownKeys(_4) {
        target ?? (target = getter());
        return Reflect.ownKeys(target);
      },
      getOwnPropertyDescriptor(_4, prop) {
        target ?? (target = getter());
        return Reflect.getOwnPropertyDescriptor(target, prop);
      },
      defineProperty(_4, prop, descriptor) {
        target ?? (target = getter());
        return Reflect.defineProperty(target, prop, descriptor);
      }
    });
  }
  function stringifyPrimitive(value) {
    if (typeof value === "bigint")
      return value.toString() + "n";
    if (typeof value === "string")
      return `"${value}"`;
    return `${value}`;
  }
  function optionalKeys(shape) {
    return Object.keys(shape).filter((k4) => {
      return shape[k4]._zod.optin === "optional" && shape[k4]._zod.optout === "optional";
    });
  }
  var NUMBER_FORMAT_RANGES = {
    safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
    int32: [-2147483648, 2147483647],
    uint32: [0, 4294967295],
    float32: [-34028234663852886e22, 34028234663852886e22],
    float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
  };
  var BIGINT_FORMAT_RANGES = {
    int64: [/* @__PURE__ */ BigInt("-9223372036854775808"), /* @__PURE__ */ BigInt("9223372036854775807")],
    uint64: [/* @__PURE__ */ BigInt(0), /* @__PURE__ */ BigInt("18446744073709551615")]
  };
  function pick(schema, mask) {
    const currDef = schema._zod.def;
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const newShape = {};
        for (const key in mask) {
          if (!(key in currDef.shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          newShape[key] = currDef.shape[key];
        }
        assignProp(this, "shape", newShape);
        return newShape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function omit(schema, mask) {
    const currDef = schema._zod.def;
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const newShape = { ...schema._zod.def.shape };
        for (const key in mask) {
          if (!(key in currDef.shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          delete newShape[key];
        }
        assignProp(this, "shape", newShape);
        return newShape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function extend(schema, shape) {
    if (!isPlainObject(shape)) {
      throw new Error("Invalid input to extend: expected a plain object");
    }
    const checks = schema._zod.def.checks;
    const hasChecks = checks && checks.length > 0;
    if (hasChecks) {
      throw new Error("Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.");
    }
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const _shape = { ...schema._zod.def.shape, ...shape };
        assignProp(this, "shape", _shape);
        return _shape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function safeExtend(schema, shape) {
    if (!isPlainObject(shape)) {
      throw new Error("Invalid input to safeExtend: expected a plain object");
    }
    const def = {
      ...schema._zod.def,
      get shape() {
        const _shape = { ...schema._zod.def.shape, ...shape };
        assignProp(this, "shape", _shape);
        return _shape;
      },
      checks: schema._zod.def.checks
    };
    return clone(schema, def);
  }
  function merge(a5, b2) {
    const def = mergeDefs(a5._zod.def, {
      get shape() {
        const _shape = { ...a5._zod.def.shape, ...b2._zod.def.shape };
        assignProp(this, "shape", _shape);
        return _shape;
      },
      get catchall() {
        return b2._zod.def.catchall;
      },
      checks: []
      // delete existing checks
    });
    return clone(a5, def);
  }
  function partial(Class2, schema, mask) {
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const oldShape = schema._zod.def.shape;
        const shape = { ...oldShape };
        if (mask) {
          for (const key in mask) {
            if (!(key in oldShape)) {
              throw new Error(`Unrecognized key: "${key}"`);
            }
            if (!mask[key])
              continue;
            shape[key] = Class2 ? new Class2({
              type: "optional",
              innerType: oldShape[key]
            }) : oldShape[key];
          }
        } else {
          for (const key in oldShape) {
            shape[key] = Class2 ? new Class2({
              type: "optional",
              innerType: oldShape[key]
            }) : oldShape[key];
          }
        }
        assignProp(this, "shape", shape);
        return shape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function required(Class2, schema, mask) {
    const def = mergeDefs(schema._zod.def, {
      get shape() {
        const oldShape = schema._zod.def.shape;
        const shape = { ...oldShape };
        if (mask) {
          for (const key in mask) {
            if (!(key in shape)) {
              throw new Error(`Unrecognized key: "${key}"`);
            }
            if (!mask[key])
              continue;
            shape[key] = new Class2({
              type: "nonoptional",
              innerType: oldShape[key]
            });
          }
        } else {
          for (const key in oldShape) {
            shape[key] = new Class2({
              type: "nonoptional",
              innerType: oldShape[key]
            });
          }
        }
        assignProp(this, "shape", shape);
        return shape;
      },
      checks: []
    });
    return clone(schema, def);
  }
  function aborted(x3, startIndex = 0) {
    if (x3.aborted === true)
      return true;
    for (let i4 = startIndex; i4 < x3.issues.length; i4++) {
      if (x3.issues[i4]?.continue !== true) {
        return true;
      }
    }
    return false;
  }
  function prefixIssues(path, issues) {
    return issues.map((iss) => {
      var _a2;
      (_a2 = iss).path ?? (_a2.path = []);
      iss.path.unshift(path);
      return iss;
    });
  }
  function unwrapMessage(message) {
    return typeof message === "string" ? message : message?.message;
  }
  function finalizeIssue(iss, ctx, config2) {
    const full = { ...iss, path: iss.path ?? [] };
    if (!iss.message) {
      const message = unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
      full.message = message;
    }
    delete full.inst;
    delete full.continue;
    if (!ctx?.reportInput) {
      delete full.input;
    }
    return full;
  }
  function getSizableOrigin(input) {
    if (input instanceof Set)
      return "set";
    if (input instanceof Map)
      return "map";
    if (input instanceof File)
      return "file";
    return "unknown";
  }
  function getLengthableOrigin(input) {
    if (Array.isArray(input))
      return "array";
    if (typeof input === "string")
      return "string";
    return "unknown";
  }
  function issue(...args) {
    const [iss, input, inst] = args;
    if (typeof iss === "string") {
      return {
        message: iss,
        code: "custom",
        input,
        inst
      };
    }
    return { ...iss };
  }
  function cleanEnum(obj) {
    return Object.entries(obj).filter(([k4, _4]) => {
      return Number.isNaN(Number.parseInt(k4, 10));
    }).map((el2) => el2[1]);
  }
  function base64ToUint8Array(base643) {
    const binaryString = atob(base643);
    const bytes = new Uint8Array(binaryString.length);
    for (let i4 = 0; i4 < binaryString.length; i4++) {
      bytes[i4] = binaryString.charCodeAt(i4);
    }
    return bytes;
  }
  function uint8ArrayToBase64(bytes) {
    let binaryString = "";
    for (let i4 = 0; i4 < bytes.length; i4++) {
      binaryString += String.fromCharCode(bytes[i4]);
    }
    return btoa(binaryString);
  }
  function base64urlToUint8Array(base64url3) {
    const base643 = base64url3.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - base643.length % 4) % 4);
    return base64ToUint8Array(base643 + padding);
  }
  function uint8ArrayToBase64url(bytes) {
    return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  function hexToUint8Array(hex3) {
    const cleanHex = hex3.replace(/^0x/, "");
    if (cleanHex.length % 2 !== 0) {
      throw new Error("Invalid hex string length");
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i4 = 0; i4 < cleanHex.length; i4 += 2) {
      bytes[i4 / 2] = Number.parseInt(cleanHex.slice(i4, i4 + 2), 16);
    }
    return bytes;
  }
  function uint8ArrayToHex(bytes) {
    return Array.from(bytes).map((b2) => b2.toString(16).padStart(2, "0")).join("");
  }
  var Class = class {
    constructor(..._args) {
    }
  };

  // node_modules/zod/v4/core/errors.js
  var initializer = (inst, def) => {
    inst.name = "$ZodError";
    Object.defineProperty(inst, "_zod", {
      value: inst._zod,
      enumerable: false
    });
    Object.defineProperty(inst, "issues", {
      value: def,
      enumerable: false
    });
    inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
    Object.defineProperty(inst, "toString", {
      value: () => inst.message,
      enumerable: false
    });
  };
  var $ZodError = $constructor("$ZodError", initializer);
  var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });
  function flattenError(error46, mapper = (issue2) => issue2.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of error46.issues) {
      if (sub.path.length > 0) {
        fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
        fieldErrors[sub.path[0]].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  function formatError(error46, mapper = (issue2) => issue2.message) {
    const fieldErrors = { _errors: [] };
    const processError = (error47) => {
      for (const issue2 of error47.issues) {
        if (issue2.code === "invalid_union" && issue2.errors.length) {
          issue2.errors.map((issues) => processError({ issues }));
        } else if (issue2.code === "invalid_key") {
          processError({ issues: issue2.issues });
        } else if (issue2.code === "invalid_element") {
          processError({ issues: issue2.issues });
        } else if (issue2.path.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i4 = 0;
          while (i4 < issue2.path.length) {
            const el2 = issue2.path[i4];
            const terminal = i4 === issue2.path.length - 1;
            if (!terminal) {
              curr[el2] = curr[el2] || { _errors: [] };
            } else {
              curr[el2] = curr[el2] || { _errors: [] };
              curr[el2]._errors.push(mapper(issue2));
            }
            curr = curr[el2];
            i4++;
          }
        }
      }
    };
    processError(error46);
    return fieldErrors;
  }
  function treeifyError(error46, mapper = (issue2) => issue2.message) {
    const result = { errors: [] };
    const processError = (error47, path = []) => {
      var _a2, _b;
      for (const issue2 of error47.issues) {
        if (issue2.code === "invalid_union" && issue2.errors.length) {
          issue2.errors.map((issues) => processError({ issues }, issue2.path));
        } else if (issue2.code === "invalid_key") {
          processError({ issues: issue2.issues }, issue2.path);
        } else if (issue2.code === "invalid_element") {
          processError({ issues: issue2.issues }, issue2.path);
        } else {
          const fullpath = [...path, ...issue2.path];
          if (fullpath.length === 0) {
            result.errors.push(mapper(issue2));
            continue;
          }
          let curr = result;
          let i4 = 0;
          while (i4 < fullpath.length) {
            const el2 = fullpath[i4];
            const terminal = i4 === fullpath.length - 1;
            if (typeof el2 === "string") {
              curr.properties ?? (curr.properties = {});
              (_a2 = curr.properties)[el2] ?? (_a2[el2] = { errors: [] });
              curr = curr.properties[el2];
            } else {
              curr.items ?? (curr.items = []);
              (_b = curr.items)[el2] ?? (_b[el2] = { errors: [] });
              curr = curr.items[el2];
            }
            if (terminal) {
              curr.errors.push(mapper(issue2));
            }
            i4++;
          }
        }
      }
    };
    processError(error46);
    return result;
  }
  function toDotPath(_path) {
    const segs = [];
    const path = _path.map((seg) => typeof seg === "object" ? seg.key : seg);
    for (const seg of path) {
      if (typeof seg === "number")
        segs.push(`[${seg}]`);
      else if (typeof seg === "symbol")
        segs.push(`[${JSON.stringify(String(seg))}]`);
      else if (/[^\w$]/.test(seg))
        segs.push(`[${JSON.stringify(seg)}]`);
      else {
        if (segs.length)
          segs.push(".");
        segs.push(seg);
      }
    }
    return segs.join("");
  }
  function prettifyError(error46) {
    const lines = [];
    const issues = [...error46.issues].sort((a5, b2) => (a5.path ?? []).length - (b2.path ?? []).length);
    for (const issue2 of issues) {
      lines.push(`\u2716 ${issue2.message}`);
      if (issue2.path?.length)
        lines.push(`  \u2192 at ${toDotPath(issue2.path)}`);
    }
    return lines.join("\n");
  }

  // node_modules/zod/v4/core/parse.js
  var _parse = (_Err) => (schema, value, _ctx, _params) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: false }) : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    if (result.issues.length) {
      const e6 = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e6, _params?.callee);
      throw e6;
    }
    return result.value;
  };
  var parse = /* @__PURE__ */ _parse($ZodRealError);
  var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    if (result.issues.length) {
      const e6 = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
      captureStackTrace(e6, params?.callee);
      throw e6;
    }
    return result.value;
  };
  var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
  var _safeParse = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
    const result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise) {
      throw new $ZodAsyncError();
    }
    return result.issues.length ? {
      success: false,
      error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    } : { success: true, data: result.value };
  };
  var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
  var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { async: true }) : { async: true };
    let result = schema._zod.run({ value, issues: [] }, ctx);
    if (result instanceof Promise)
      result = await result;
    return result.issues.length ? {
      success: false,
      error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    } : { success: true, data: result.value };
  };
  var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);
  var _encode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _parse(_Err)(schema, value, ctx);
  };
  var encode = /* @__PURE__ */ _encode($ZodRealError);
  var _decode = (_Err) => (schema, value, _ctx) => {
    return _parse(_Err)(schema, value, _ctx);
  };
  var decode = /* @__PURE__ */ _decode($ZodRealError);
  var _encodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _parseAsync(_Err)(schema, value, ctx);
  };
  var encodeAsync = /* @__PURE__ */ _encodeAsync($ZodRealError);
  var _decodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _parseAsync(_Err)(schema, value, _ctx);
  };
  var decodeAsync = /* @__PURE__ */ _decodeAsync($ZodRealError);
  var _safeEncode = (_Err) => (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _safeParse(_Err)(schema, value, ctx);
  };
  var safeEncode = /* @__PURE__ */ _safeEncode($ZodRealError);
  var _safeDecode = (_Err) => (schema, value, _ctx) => {
    return _safeParse(_Err)(schema, value, _ctx);
  };
  var safeDecode = /* @__PURE__ */ _safeDecode($ZodRealError);
  var _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
    const ctx = _ctx ? Object.assign(_ctx, { direction: "backward" }) : { direction: "backward" };
    return _safeParseAsync(_Err)(schema, value, ctx);
  };
  var safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync($ZodRealError);
  var _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
    return _safeParseAsync(_Err)(schema, value, _ctx);
  };
  var safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync($ZodRealError);

  // node_modules/zod/v4/core/regexes.js
  var regexes_exports = {};
  __export(regexes_exports, {
    base64: () => base64,
    base64url: () => base64url,
    bigint: () => bigint,
    boolean: () => boolean,
    browserEmail: () => browserEmail,
    cidrv4: () => cidrv4,
    cidrv6: () => cidrv6,
    cuid: () => cuid,
    cuid2: () => cuid2,
    date: () => date,
    datetime: () => datetime,
    domain: () => domain,
    duration: () => duration,
    e164: () => e164,
    email: () => email,
    emoji: () => emoji,
    extendedDuration: () => extendedDuration,
    guid: () => guid,
    hex: () => hex,
    hostname: () => hostname,
    html5Email: () => html5Email,
    idnEmail: () => idnEmail,
    integer: () => integer,
    ipv4: () => ipv4,
    ipv6: () => ipv6,
    ksuid: () => ksuid,
    lowercase: () => lowercase,
    md5_base64: () => md5_base64,
    md5_base64url: () => md5_base64url,
    md5_hex: () => md5_hex,
    nanoid: () => nanoid,
    null: () => _null,
    number: () => number,
    rfc5322Email: () => rfc5322Email,
    sha1_base64: () => sha1_base64,
    sha1_base64url: () => sha1_base64url,
    sha1_hex: () => sha1_hex,
    sha256_base64: () => sha256_base64,
    sha256_base64url: () => sha256_base64url,
    sha256_hex: () => sha256_hex,
    sha384_base64: () => sha384_base64,
    sha384_base64url: () => sha384_base64url,
    sha384_hex: () => sha384_hex,
    sha512_base64: () => sha512_base64,
    sha512_base64url: () => sha512_base64url,
    sha512_hex: () => sha512_hex,
    string: () => string,
    time: () => time,
    ulid: () => ulid,
    undefined: () => _undefined,
    unicodeEmail: () => unicodeEmail,
    uppercase: () => uppercase,
    uuid: () => uuid,
    uuid4: () => uuid4,
    uuid6: () => uuid6,
    uuid7: () => uuid7,
    xid: () => xid
  });
  var cuid = /^[cC][^\s-]{8,}$/;
  var cuid2 = /^[0-9a-z]+$/;
  var ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
  var xid = /^[0-9a-vA-V]{20}$/;
  var ksuid = /^[A-Za-z0-9]{27}$/;
  var nanoid = /^[a-zA-Z0-9_-]{21}$/;
  var duration = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  var extendedDuration = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  var guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  var uuid = (version2) => {
    if (!version2)
      return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
    return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
  };
  var uuid4 = /* @__PURE__ */ uuid(4);
  var uuid6 = /* @__PURE__ */ uuid(6);
  var uuid7 = /* @__PURE__ */ uuid(7);
  var email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  var html5Email = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  var rfc5322Email = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  var unicodeEmail = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
  var idnEmail = unicodeEmail;
  var browserEmail = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  var _emoji = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  function emoji() {
    return new RegExp(_emoji, "u");
  }
  var ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  var ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  var cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  var cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  var base64url = /^[A-Za-z0-9_-]*$/;
  var hostname = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
  var domain = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  var e164 = /^\+(?:[0-9]){6,14}[0-9]$/;
  var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
  var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
  function timeSource(args) {
    const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
    const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
    return regex;
  }
  function time(args) {
    return new RegExp(`^${timeSource(args)}$`);
  }
  function datetime(args) {
    const time3 = timeSource({ precision: args.precision });
    const opts = ["Z"];
    if (args.local)
      opts.push("");
    if (args.offset)
      opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
    const timeRegex = `${time3}(?:${opts.join("|")})`;
    return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
  }
  var string = (params) => {
    const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
    return new RegExp(`^${regex}$`);
  };
  var bigint = /^-?\d+n?$/;
  var integer = /^-?\d+$/;
  var number = /^-?\d+(?:\.\d+)?/;
  var boolean = /^(?:true|false)$/i;
  var _null = /^null$/i;
  var _undefined = /^undefined$/i;
  var lowercase = /^[^A-Z]*$/;
  var uppercase = /^[^a-z]*$/;
  var hex = /^[0-9a-fA-F]*$/;
  function fixedBase64(bodyLength, padding) {
    return new RegExp(`^[A-Za-z0-9+/]{${bodyLength}}${padding}$`);
  }
  function fixedBase64url(length) {
    return new RegExp(`^[A-Za-z0-9_-]{${length}}$`);
  }
  var md5_hex = /^[0-9a-fA-F]{32}$/;
  var md5_base64 = /* @__PURE__ */ fixedBase64(22, "==");
  var md5_base64url = /* @__PURE__ */ fixedBase64url(22);
  var sha1_hex = /^[0-9a-fA-F]{40}$/;
  var sha1_base64 = /* @__PURE__ */ fixedBase64(27, "=");
  var sha1_base64url = /* @__PURE__ */ fixedBase64url(27);
  var sha256_hex = /^[0-9a-fA-F]{64}$/;
  var sha256_base64 = /* @__PURE__ */ fixedBase64(43, "=");
  var sha256_base64url = /* @__PURE__ */ fixedBase64url(43);
  var sha384_hex = /^[0-9a-fA-F]{96}$/;
  var sha384_base64 = /* @__PURE__ */ fixedBase64(64, "");
  var sha384_base64url = /* @__PURE__ */ fixedBase64url(64);
  var sha512_hex = /^[0-9a-fA-F]{128}$/;
  var sha512_base64 = /* @__PURE__ */ fixedBase64(86, "==");
  var sha512_base64url = /* @__PURE__ */ fixedBase64url(86);

  // node_modules/zod/v4/core/checks.js
  var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
    var _a2;
    inst._zod ?? (inst._zod = {});
    inst._zod.def = def;
    (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
  });
  var numericOriginMap = {
    number: "number",
    bigint: "bigint",
    object: "date"
  };
  var $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
      if (def.value < curr) {
        if (def.inclusive)
          bag.maximum = def.value;
        else
          bag.exclusiveMaximum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
    $ZodCheck.init(inst, def);
    const origin = numericOriginMap[typeof def.value];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
      if (def.value > curr) {
        if (def.inclusive)
          bag.minimum = def.value;
        else
          bag.exclusiveMinimum = def.value;
      }
    });
    inst._zod.check = (payload) => {
      if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
        return;
      }
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.value,
        input: payload.value,
        inclusive: def.inclusive,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      var _a2;
      (_a2 = inst2._zod.bag).multipleOf ?? (_a2.multipleOf = def.value);
    });
    inst._zod.check = (payload) => {
      if (typeof payload.value !== typeof def.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
      if (isMultiple)
        return;
      payload.issues.push({
        origin: typeof payload.value,
        code: "not_multiple_of",
        divisor: def.value,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    def.format = def.format || "float64";
    const isInt = def.format?.includes("int");
    const origin = isInt ? "int" : "number";
    const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
      if (isInt)
        bag.pattern = integer;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (isInt) {
        if (!Number.isInteger(input)) {
          payload.issues.push({
            expected: origin,
            format: def.format,
            code: "invalid_type",
            continue: false,
            input,
            inst
          });
          return;
        }
        if (!Number.isSafeInteger(input)) {
          if (input > 0) {
            payload.issues.push({
              input,
              code: "too_big",
              maximum: Number.MAX_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              continue: !def.abort
            });
          } else {
            payload.issues.push({
              input,
              code: "too_small",
              minimum: Number.MIN_SAFE_INTEGER,
              note: "Integers must be within the safe integer range.",
              inst,
              origin,
              continue: !def.abort
            });
          }
          return;
        }
      }
      if (input < minimum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "number",
          input,
          code: "too_big",
          maximum,
          inst
        });
      }
    };
  });
  var $ZodCheckBigIntFormat = /* @__PURE__ */ $constructor("$ZodCheckBigIntFormat", (inst, def) => {
    $ZodCheck.init(inst, def);
    const [minimum, maximum] = BIGINT_FORMAT_RANGES[def.format];
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      bag.minimum = minimum;
      bag.maximum = maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      if (input < minimum) {
        payload.issues.push({
          origin: "bigint",
          input,
          code: "too_small",
          minimum,
          inclusive: true,
          inst,
          continue: !def.abort
        });
      }
      if (input > maximum) {
        payload.issues.push({
          origin: "bigint",
          input,
          code: "too_big",
          maximum,
          inst
        });
      }
    };
  });
  var $ZodCheckMaxSize = /* @__PURE__ */ $constructor("$ZodCheckMaxSize", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size <= def.maximum)
        return;
      payload.issues.push({
        origin: getSizableOrigin(input),
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckMinSize = /* @__PURE__ */ $constructor("$ZodCheckMinSize", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size >= def.minimum)
        return;
      payload.issues.push({
        origin: getSizableOrigin(input),
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckSizeEquals = /* @__PURE__ */ $constructor("$ZodCheckSizeEquals", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.size !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.size;
      bag.maximum = def.size;
      bag.size = def.size;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const size = input.size;
      if (size === def.size)
        return;
      const tooBig = size > def.size;
      payload.issues.push({
        origin: getSizableOrigin(input),
        ...tooBig ? { code: "too_big", maximum: def.size } : { code: "too_small", minimum: def.size },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
      if (def.maximum < curr)
        inst2._zod.bag.maximum = def.maximum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length <= def.maximum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_big",
        maximum: def.maximum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
      if (def.minimum > curr)
        inst2._zod.bag.minimum = def.minimum;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length >= def.minimum)
        return;
      const origin = getLengthableOrigin(input);
      payload.issues.push({
        origin,
        code: "too_small",
        minimum: def.minimum,
        inclusive: true,
        input,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
    var _a2;
    $ZodCheck.init(inst, def);
    (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
      const val = payload.value;
      return !nullish(val) && val.length !== void 0;
    });
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.minimum = def.length;
      bag.maximum = def.length;
      bag.length = def.length;
    });
    inst._zod.check = (payload) => {
      const input = payload.value;
      const length = input.length;
      if (length === def.length)
        return;
      const origin = getLengthableOrigin(input);
      const tooBig = length > def.length;
      payload.issues.push({
        origin,
        ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
        inclusive: true,
        exact: true,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
    var _a2, _b;
    $ZodCheck.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = def.format;
      if (def.pattern) {
        bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
        bag.patterns.add(def.pattern);
      }
    });
    if (def.pattern)
      (_a2 = inst._zod).check ?? (_a2.check = (payload) => {
        def.pattern.lastIndex = 0;
        if (def.pattern.test(payload.value))
          return;
        payload.issues.push({
          origin: "string",
          code: "invalid_format",
          format: def.format,
          input: payload.value,
          ...def.pattern ? { pattern: def.pattern.toString() } : {},
          inst,
          continue: !def.abort
        });
      });
    else
      (_b = inst._zod).check ?? (_b.check = () => {
      });
  });
  var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "regex",
        input: payload.value,
        pattern: def.pattern.toString(),
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
    def.pattern ?? (def.pattern = lowercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  var $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
    def.pattern ?? (def.pattern = uppercase);
    $ZodCheckStringFormat.init(inst, def);
  });
  var $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
    $ZodCheck.init(inst, def);
    const escapedRegex = escapeRegex(def.includes);
    const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
    def.pattern = pattern;
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.includes(def.includes, def.position))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "includes",
        includes: def.includes,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.startsWith(def.prefix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "starts_with",
        prefix: def.prefix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
    $ZodCheck.init(inst, def);
    const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
    def.pattern ?? (def.pattern = pattern);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(pattern);
    });
    inst._zod.check = (payload) => {
      if (payload.value.endsWith(def.suffix))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: "ends_with",
        suffix: def.suffix,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  function handleCheckPropertyResult(result, payload, property) {
    if (result.issues.length) {
      payload.issues.push(...prefixIssues(property, result.issues));
    }
  }
  var $ZodCheckProperty = /* @__PURE__ */ $constructor("$ZodCheckProperty", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      const result = def.schema._zod.run({
        value: payload.value[def.property],
        issues: []
      }, {});
      if (result instanceof Promise) {
        return result.then((result2) => handleCheckPropertyResult(result2, payload, def.property));
      }
      handleCheckPropertyResult(result, payload, def.property);
      return;
    };
  });
  var $ZodCheckMimeType = /* @__PURE__ */ $constructor("$ZodCheckMimeType", (inst, def) => {
    $ZodCheck.init(inst, def);
    const mimeSet = new Set(def.mime);
    inst._zod.onattach.push((inst2) => {
      inst2._zod.bag.mime = def.mime;
    });
    inst._zod.check = (payload) => {
      if (mimeSet.has(payload.value.type))
        return;
      payload.issues.push({
        code: "invalid_value",
        values: def.mime,
        input: payload.value.type,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
    $ZodCheck.init(inst, def);
    inst._zod.check = (payload) => {
      payload.value = def.tx(payload.value);
    };
  });

  // node_modules/zod/v4/core/doc.js
  var Doc = class {
    constructor(args = []) {
      this.content = [];
      this.indent = 0;
      if (this)
        this.args = args;
    }
    indented(fn3) {
      this.indent += 1;
      fn3(this);
      this.indent -= 1;
    }
    write(arg) {
      if (typeof arg === "function") {
        arg(this, { execution: "sync" });
        arg(this, { execution: "async" });
        return;
      }
      const content = arg;
      const lines = content.split("\n").filter((x3) => x3);
      const minIndent = Math.min(...lines.map((x3) => x3.length - x3.trimStart().length));
      const dedented = lines.map((x3) => x3.slice(minIndent)).map((x3) => " ".repeat(this.indent * 2) + x3);
      for (const line of dedented) {
        this.content.push(line);
      }
    }
    compile() {
      const F3 = Function;
      const args = this?.args;
      const content = this?.content ?? [``];
      const lines = [...content.map((x3) => `  ${x3}`)];
      return new F3(...args, lines.join("\n"));
    }
  };

  // node_modules/zod/v4/core/versions.js
  var version = {
    major: 4,
    minor: 1,
    patch: 12
  };

  // node_modules/zod/v4/core/schemas.js
  var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
    var _a2;
    inst ?? (inst = {});
    inst._zod.def = def;
    inst._zod.bag = inst._zod.bag || {};
    inst._zod.version = version;
    const checks = [...inst._zod.def.checks ?? []];
    if (inst._zod.traits.has("$ZodCheck")) {
      checks.unshift(inst);
    }
    for (const ch of checks) {
      for (const fn3 of ch._zod.onattach) {
        fn3(inst);
      }
    }
    if (checks.length === 0) {
      (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
      inst._zod.deferred?.push(() => {
        inst._zod.run = inst._zod.parse;
      });
    } else {
      const runChecks = (payload, checks2, ctx) => {
        let isAborted = aborted(payload);
        let asyncResult;
        for (const ch of checks2) {
          if (ch._zod.def.when) {
            const shouldRun = ch._zod.def.when(payload);
            if (!shouldRun)
              continue;
          } else if (isAborted) {
            continue;
          }
          const currLen = payload.issues.length;
          const _4 = ch._zod.check(payload);
          if (_4 instanceof Promise && ctx?.async === false) {
            throw new $ZodAsyncError();
          }
          if (asyncResult || _4 instanceof Promise) {
            asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
              await _4;
              const nextLen = payload.issues.length;
              if (nextLen === currLen)
                return;
              if (!isAborted)
                isAborted = aborted(payload, currLen);
            });
          } else {
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              continue;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          }
        }
        if (asyncResult) {
          return asyncResult.then(() => {
            return payload;
          });
        }
        return payload;
      };
      const handleCanaryResult = (canary, payload, ctx) => {
        if (aborted(canary)) {
          canary.aborted = true;
          return canary;
        }
        const checkResult = runChecks(payload, checks, ctx);
        if (checkResult instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
        }
        return inst._zod.parse(checkResult, ctx);
      };
      inst._zod.run = (payload, ctx) => {
        if (ctx.skipChecks) {
          return inst._zod.parse(payload, ctx);
        }
        if (ctx.direction === "backward") {
          const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
          if (canary instanceof Promise) {
            return canary.then((canary2) => {
              return handleCanaryResult(canary2, payload, ctx);
            });
          }
          return handleCanaryResult(canary, payload, ctx);
        }
        const result = inst._zod.parse(payload, ctx);
        if (result instanceof Promise) {
          if (ctx.async === false)
            throw new $ZodAsyncError();
          return result.then((result2) => runChecks(result2, checks, ctx));
        }
        return runChecks(result, checks, ctx);
      };
    }
    inst["~standard"] = {
      validate: (value) => {
        try {
          const r3 = safeParse(inst, value);
          return r3.success ? { value: r3.data } : { issues: r3.error?.issues };
        } catch (_4) {
          return safeParseAsync(inst, value).then((r3) => r3.success ? { value: r3.data } : { issues: r3.error?.issues });
        }
      },
      vendor: "zod",
      version: 1
    };
  });
  var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
    inst._zod.parse = (payload, _4) => {
      if (def.coerce)
        try {
          payload.value = String(payload.value);
        } catch (_5) {
        }
      if (typeof payload.value === "string")
        return payload;
      payload.issues.push({
        expected: "string",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  var $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
    $ZodCheckStringFormat.init(inst, def);
    $ZodString.init(inst, def);
  });
  var $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
    def.pattern ?? (def.pattern = guid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
    if (def.version) {
      const versionMap = {
        v1: 1,
        v2: 2,
        v3: 3,
        v4: 4,
        v5: 5,
        v6: 6,
        v7: 7,
        v8: 8
      };
      const v4 = versionMap[def.version];
      if (v4 === void 0)
        throw new Error(`Invalid UUID version: "${def.version}"`);
      def.pattern ?? (def.pattern = uuid(v4));
    } else
      def.pattern ?? (def.pattern = uuid());
    $ZodStringFormat.init(inst, def);
  });
  var $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
    def.pattern ?? (def.pattern = email);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      try {
        const trimmed = payload.value.trim();
        const url2 = new URL(trimmed);
        if (def.hostname) {
          def.hostname.lastIndex = 0;
          if (!def.hostname.test(url2.hostname)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid hostname",
              pattern: hostname.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.protocol) {
          def.protocol.lastIndex = 0;
          if (!def.protocol.test(url2.protocol.endsWith(":") ? url2.protocol.slice(0, -1) : url2.protocol)) {
            payload.issues.push({
              code: "invalid_format",
              format: "url",
              note: "Invalid protocol",
              pattern: def.protocol.source,
              input: payload.value,
              inst,
              continue: !def.abort
            });
          }
        }
        if (def.normalize) {
          payload.value = url2.href;
        } else {
          payload.value = trimmed;
        }
        return;
      } catch (_4) {
        payload.issues.push({
          code: "invalid_format",
          format: "url",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  var $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
    def.pattern ?? (def.pattern = emoji());
    $ZodStringFormat.init(inst, def);
  });
  var $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
    def.pattern ?? (def.pattern = nanoid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
    def.pattern ?? (def.pattern = cuid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
    def.pattern ?? (def.pattern = cuid2);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
    def.pattern ?? (def.pattern = ulid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
    def.pattern ?? (def.pattern = xid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
    def.pattern ?? (def.pattern = ksuid);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
    def.pattern ?? (def.pattern = datetime(def));
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
    def.pattern ?? (def.pattern = date);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
    def.pattern ?? (def.pattern = time(def));
    $ZodStringFormat.init(inst, def);
  });
  var $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
    def.pattern ?? (def.pattern = duration);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
    def.pattern ?? (def.pattern = ipv4);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = `ipv4`;
    });
  });
  var $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
    def.pattern ?? (def.pattern = ipv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      const bag = inst2._zod.bag;
      bag.format = `ipv6`;
    });
    inst._zod.check = (payload) => {
      try {
        new URL(`http://[${payload.value}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "ipv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  var $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv4);
    $ZodStringFormat.init(inst, def);
  });
  var $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
    def.pattern ?? (def.pattern = cidrv6);
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      const parts = payload.value.split("/");
      try {
        if (parts.length !== 2)
          throw new Error();
        const [address, prefix] = parts;
        if (!prefix)
          throw new Error();
        const prefixNum = Number(prefix);
        if (`${prefixNum}` !== prefix)
          throw new Error();
        if (prefixNum < 0 || prefixNum > 128)
          throw new Error();
        new URL(`http://[${address}]`);
      } catch {
        payload.issues.push({
          code: "invalid_format",
          format: "cidrv6",
          input: payload.value,
          inst,
          continue: !def.abort
        });
      }
    };
  });
  function isValidBase64(data) {
    if (data === "")
      return true;
    if (data.length % 4 !== 0)
      return false;
    try {
      atob(data);
      return true;
    } catch {
      return false;
    }
  }
  var $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
    def.pattern ?? (def.pattern = base64);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      inst2._zod.bag.contentEncoding = "base64";
    });
    inst._zod.check = (payload) => {
      if (isValidBase64(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  function isValidBase64URL(data) {
    if (!base64url.test(data))
      return false;
    const base643 = data.replace(/[-_]/g, (c3) => c3 === "-" ? "+" : "/");
    const padded = base643.padEnd(Math.ceil(base643.length / 4) * 4, "=");
    return isValidBase64(padded);
  }
  var $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
    def.pattern ?? (def.pattern = base64url);
    $ZodStringFormat.init(inst, def);
    inst._zod.onattach.push((inst2) => {
      inst2._zod.bag.contentEncoding = "base64url";
    });
    inst._zod.check = (payload) => {
      if (isValidBase64URL(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "base64url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
    def.pattern ?? (def.pattern = e164);
    $ZodStringFormat.init(inst, def);
  });
  function isValidJWT(token, algorithm = null) {
    try {
      const tokensParts = token.split(".");
      if (tokensParts.length !== 3)
        return false;
      const [header] = tokensParts;
      if (!header)
        return false;
      const parsedHeader = JSON.parse(atob(header));
      if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
        return false;
      if (!parsedHeader.alg)
        return false;
      if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
        return false;
      return true;
    } catch {
      return false;
    }
  }
  var $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (isValidJWT(payload.value, def.alg))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: "jwt",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodCustomStringFormat = /* @__PURE__ */ $constructor("$ZodCustomStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    inst._zod.check = (payload) => {
      if (def.fn(payload.value))
        return;
      payload.issues.push({
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        inst,
        continue: !def.abort
      });
    };
  });
  var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = inst._zod.bag.pattern ?? number;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Number(payload.value);
        } catch (_4) {
        }
      const input = payload.value;
      if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
        return payload;
      }
      const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
      payload.issues.push({
        expected: "number",
        code: "invalid_type",
        input,
        inst,
        ...received ? { received } : {}
      });
      return payload;
    };
  });
  var $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
    $ZodCheckNumberFormat.init(inst, def);
    $ZodNumber.init(inst, def);
  });
  var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = boolean;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = Boolean(payload.value);
        } catch (_4) {
        }
      const input = payload.value;
      if (typeof input === "boolean")
        return payload;
      payload.issues.push({
        expected: "boolean",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodBigInt = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = bigint;
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce)
        try {
          payload.value = BigInt(payload.value);
        } catch (_4) {
        }
      if (typeof payload.value === "bigint")
        return payload;
      payload.issues.push({
        expected: "bigint",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  var $ZodBigIntFormat = /* @__PURE__ */ $constructor("$ZodBigInt", (inst, def) => {
    $ZodCheckBigIntFormat.init(inst, def);
    $ZodBigInt.init(inst, def);
  });
  var $ZodSymbol = /* @__PURE__ */ $constructor("$ZodSymbol", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "symbol")
        return payload;
      payload.issues.push({
        expected: "symbol",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodUndefined = /* @__PURE__ */ $constructor("$ZodUndefined", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _undefined;
    inst._zod.values = /* @__PURE__ */ new Set([void 0]);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "undefined")
        return payload;
      payload.issues.push({
        expected: "undefined",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodNull = /* @__PURE__ */ $constructor("$ZodNull", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.pattern = _null;
    inst._zod.values = /* @__PURE__ */ new Set([null]);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (input === null)
        return payload;
      payload.issues.push({
        expected: "null",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload) => payload;
  });
  var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      payload.issues.push({
        expected: "never",
        code: "invalid_type",
        input: payload.value,
        inst
      });
      return payload;
    };
  });
  var $ZodVoid = /* @__PURE__ */ $constructor("$ZodVoid", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (typeof input === "undefined")
        return payload;
      payload.issues.push({
        expected: "void",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodDate = /* @__PURE__ */ $constructor("$ZodDate", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (def.coerce) {
        try {
          payload.value = new Date(payload.value);
        } catch (_err) {
        }
      }
      const input = payload.value;
      const isDate = input instanceof Date;
      const isValidDate = isDate && !Number.isNaN(input.getTime());
      if (isValidDate)
        return payload;
      payload.issues.push({
        expected: "date",
        code: "invalid_type",
        input,
        ...isDate ? { received: "Invalid Date" } : {},
        inst
      });
      return payload;
    };
  });
  function handleArrayResult(result, final, index) {
    if (result.issues.length) {
      final.issues.push(...prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
  }
  var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          expected: "array",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = Array(input.length);
      const proms = [];
      for (let i4 = 0; i4 < input.length; i4++) {
        const item = input[i4];
        const result = def.element._zod.run({
          value: item,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleArrayResult(result2, payload, i4)));
        } else {
          handleArrayResult(result, payload, i4);
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  function handlePropertyResult(result, final, key, input) {
    if (result.issues.length) {
      final.issues.push(...prefixIssues(key, result.issues));
    }
    if (result.value === void 0) {
      if (key in input) {
        final.value[key] = void 0;
      }
    } else {
      final.value[key] = result.value;
    }
  }
  function normalizeDef(def) {
    const keys = Object.keys(def.shape);
    for (const k4 of keys) {
      if (!def.shape?.[k4]?._zod?.traits?.has("$ZodType")) {
        throw new Error(`Invalid element at key "${k4}": expected a Zod schema`);
      }
    }
    const okeys = optionalKeys(def.shape);
    return {
      ...def,
      keys,
      keySet: new Set(keys),
      numKeys: keys.length,
      optionalKeys: new Set(okeys)
    };
  }
  function handleCatchall(proms, input, payload, ctx, def, inst) {
    const unrecognized = [];
    const keySet = def.keySet;
    const _catchall = def.catchall._zod;
    const t4 = _catchall.def.type;
    for (const key of Object.keys(input)) {
      if (keySet.has(key))
        continue;
      if (t4 === "never") {
        unrecognized.push(key);
        continue;
      }
      const r3 = _catchall.run({ value: input[key], issues: [] }, ctx);
      if (r3 instanceof Promise) {
        proms.push(r3.then((r4) => handlePropertyResult(r4, payload, key, input)));
      } else {
        handlePropertyResult(r3, payload, key, input);
      }
    }
    if (unrecognized.length) {
      payload.issues.push({
        code: "unrecognized_keys",
        keys: unrecognized,
        input,
        inst
      });
    }
    if (!proms.length)
      return payload;
    return Promise.all(proms).then(() => {
      return payload;
    });
  }
  var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
    $ZodType.init(inst, def);
    const desc = Object.getOwnPropertyDescriptor(def, "shape");
    if (!desc?.get) {
      const sh = def.shape;
      Object.defineProperty(def, "shape", {
        get: () => {
          const newSh = { ...sh };
          Object.defineProperty(def, "shape", {
            value: newSh
          });
          return newSh;
        }
      });
    }
    const _normalized = cached(() => normalizeDef(def));
    defineLazy(inst._zod, "propValues", () => {
      const shape = def.shape;
      const propValues = {};
      for (const key in shape) {
        const field = shape[key]._zod;
        if (field.values) {
          propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
          for (const v4 of field.values)
            propValues[key].add(v4);
        }
      }
      return propValues;
    });
    const isObject2 = isObject;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      payload.value = {};
      const proms = [];
      const shape = value.shape;
      for (const key of value.keys) {
        const el2 = shape[key];
        const r3 = el2._zod.run({ value: input[key], issues: [] }, ctx);
        if (r3 instanceof Promise) {
          proms.push(r3.then((r4) => handlePropertyResult(r4, payload, key, input)));
        } else {
          handlePropertyResult(r3, payload, key, input);
        }
      }
      if (!catchall) {
        return proms.length ? Promise.all(proms).then(() => payload) : payload;
      }
      return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
    };
  });
  var $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
    $ZodObject.init(inst, def);
    const superParse = inst._zod.parse;
    const _normalized = cached(() => normalizeDef(def));
    const generateFastpass = (shape) => {
      const doc = new Doc(["shape", "payload", "ctx"]);
      const normalized = _normalized.value;
      const parseStr = (key) => {
        const k4 = esc(key);
        return `shape[${k4}]._zod.run({ value: input[${k4}], issues: [] }, ctx)`;
      };
      doc.write(`const input = payload.value;`);
      const ids = /* @__PURE__ */ Object.create(null);
      let counter = 0;
      for (const key of normalized.keys) {
        ids[key] = `key_${counter++}`;
      }
      doc.write(`const newResult = {};`);
      for (const key of normalized.keys) {
        const id2 = ids[key];
        const k4 = esc(key);
        doc.write(`const ${id2} = ${parseStr(key)};`);
        doc.write(`
        if (${id2}.issues.length) {
          payload.issues = payload.issues.concat(${id2}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k4}, ...iss.path] : [${k4}]
          })));
        }
        
        
        if (${id2}.value === undefined) {
          if (${k4} in input) {
            newResult[${k4}] = undefined;
          }
        } else {
          newResult[${k4}] = ${id2}.value;
        }
        
      `);
      }
      doc.write(`payload.value = newResult;`);
      doc.write(`return payload;`);
      const fn3 = doc.compile();
      return (payload, ctx) => fn3(shape, payload, ctx);
    };
    let fastpass;
    const isObject2 = isObject;
    const jit = !globalConfig.jitless;
    const allowsEval2 = allowsEval;
    const fastEnabled = jit && allowsEval2.value;
    const catchall = def.catchall;
    let value;
    inst._zod.parse = (payload, ctx) => {
      value ?? (value = _normalized.value);
      const input = payload.value;
      if (!isObject2(input)) {
        payload.issues.push({
          expected: "object",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
        if (!fastpass)
          fastpass = generateFastpass(def.shape);
        payload = fastpass(payload, ctx);
        if (!catchall)
          return payload;
        return handleCatchall([], input, payload, ctx, value, inst);
      }
      return superParse(payload, ctx);
    };
  });
  function handleUnionResults(results, final, inst, ctx) {
    for (const result of results) {
      if (result.issues.length === 0) {
        final.value = result.value;
        return final;
      }
    }
    const nonaborted = results.filter((r3) => !aborted(r3));
    if (nonaborted.length === 1) {
      final.value = nonaborted[0].value;
      return nonaborted[0];
    }
    final.issues.push({
      code: "invalid_union",
      input: final.value,
      inst,
      errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
    });
    return final;
  }
  var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.options.some((o4) => o4._zod.optin === "optional") ? "optional" : void 0);
    defineLazy(inst._zod, "optout", () => def.options.some((o4) => o4._zod.optout === "optional") ? "optional" : void 0);
    defineLazy(inst._zod, "values", () => {
      if (def.options.every((o4) => o4._zod.values)) {
        return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
      }
      return void 0;
    });
    defineLazy(inst._zod, "pattern", () => {
      if (def.options.every((o4) => o4._zod.pattern)) {
        const patterns = def.options.map((o4) => o4._zod.pattern);
        return new RegExp(`^(${patterns.map((p2) => cleanRegex(p2.source)).join("|")})$`);
      }
      return void 0;
    });
    const single = def.options.length === 1;
    const first = def.options[0]._zod.run;
    inst._zod.parse = (payload, ctx) => {
      if (single) {
        return first(payload, ctx);
      }
      let async = false;
      const results = [];
      for (const option of def.options) {
        const result = option._zod.run({
          value: payload.value,
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          results.push(result);
          async = true;
        } else {
          if (result.issues.length === 0)
            return result;
          results.push(result);
        }
      }
      if (!async)
        return handleUnionResults(results, payload, inst, ctx);
      return Promise.all(results).then((results2) => {
        return handleUnionResults(results2, payload, inst, ctx);
      });
    };
  });
  var $ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("$ZodDiscriminatedUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    const _super = inst._zod.parse;
    defineLazy(inst._zod, "propValues", () => {
      const propValues = {};
      for (const option of def.options) {
        const pv2 = option._zod.propValues;
        if (!pv2 || Object.keys(pv2).length === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(option)}"`);
        for (const [k4, v4] of Object.entries(pv2)) {
          if (!propValues[k4])
            propValues[k4] = /* @__PURE__ */ new Set();
          for (const val of v4) {
            propValues[k4].add(val);
          }
        }
      }
      return propValues;
    });
    const disc = cached(() => {
      const opts = def.options;
      const map2 = /* @__PURE__ */ new Map();
      for (const o4 of opts) {
        const values = o4._zod.propValues?.[def.discriminator];
        if (!values || values.size === 0)
          throw new Error(`Invalid discriminated union option at index "${def.options.indexOf(o4)}"`);
        for (const v4 of values) {
          if (map2.has(v4)) {
            throw new Error(`Duplicate discriminator value "${String(v4)}"`);
          }
          map2.set(v4, o4);
        }
      }
      return map2;
    });
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isObject(input)) {
        payload.issues.push({
          code: "invalid_type",
          expected: "object",
          input,
          inst
        });
        return payload;
      }
      const opt = disc.value.get(input?.[def.discriminator]);
      if (opt) {
        return opt._zod.run(payload, ctx);
      }
      if (def.unionFallback) {
        return _super(payload, ctx);
      }
      payload.issues.push({
        code: "invalid_union",
        errors: [],
        note: "No matching discriminator",
        discriminator: def.discriminator,
        input,
        path: [def.discriminator],
        inst
      });
      return payload;
    };
  });
  var $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      const left = def.left._zod.run({ value: input, issues: [] }, ctx);
      const right = def.right._zod.run({ value: input, issues: [] }, ctx);
      const async = left instanceof Promise || right instanceof Promise;
      if (async) {
        return Promise.all([left, right]).then(([left2, right2]) => {
          return handleIntersectionResults(payload, left2, right2);
        });
      }
      return handleIntersectionResults(payload, left, right);
    };
  });
  function mergeValues(a5, b2) {
    if (a5 === b2) {
      return { valid: true, data: a5 };
    }
    if (a5 instanceof Date && b2 instanceof Date && +a5 === +b2) {
      return { valid: true, data: a5 };
    }
    if (isPlainObject(a5) && isPlainObject(b2)) {
      const bKeys = Object.keys(b2);
      const sharedKeys = Object.keys(a5).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a5, ...b2 };
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a5[key], b2[key]);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
          };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    }
    if (Array.isArray(a5) && Array.isArray(b2)) {
      if (a5.length !== b2.length) {
        return { valid: false, mergeErrorPath: [] };
      }
      const newArray = [];
      for (let index = 0; index < a5.length; index++) {
        const itemA = a5[index];
        const itemB = b2[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return {
            valid: false,
            mergeErrorPath: [index, ...sharedValue.mergeErrorPath]
          };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    }
    return { valid: false, mergeErrorPath: [] };
  }
  function handleIntersectionResults(result, left, right) {
    if (left.issues.length) {
      result.issues.push(...left.issues);
    }
    if (right.issues.length) {
      result.issues.push(...right.issues);
    }
    if (aborted(result))
      return result;
    const merged = mergeValues(left.value, right.value);
    if (!merged.valid) {
      throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
    }
    result.value = merged.data;
    return result;
  }
  var $ZodTuple = /* @__PURE__ */ $constructor("$ZodTuple", (inst, def) => {
    $ZodType.init(inst, def);
    const items = def.items;
    const optStart = items.length - [...items].reverse().findIndex((item) => item._zod.optin !== "optional");
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!Array.isArray(input)) {
        payload.issues.push({
          input,
          inst,
          expected: "tuple",
          code: "invalid_type"
        });
        return payload;
      }
      payload.value = [];
      const proms = [];
      if (!def.rest) {
        const tooBig = input.length > items.length;
        const tooSmall = input.length < optStart - 1;
        if (tooBig || tooSmall) {
          payload.issues.push({
            ...tooBig ? { code: "too_big", maximum: items.length } : { code: "too_small", minimum: items.length },
            input,
            inst,
            origin: "array"
          });
          return payload;
        }
      }
      let i4 = -1;
      for (const item of items) {
        i4++;
        if (i4 >= input.length) {
          if (i4 >= optStart)
            continue;
        }
        const result = item._zod.run({
          value: input[i4],
          issues: []
        }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleTupleResult(result2, payload, i4)));
        } else {
          handleTupleResult(result, payload, i4);
        }
      }
      if (def.rest) {
        const rest = input.slice(items.length);
        for (const el2 of rest) {
          i4++;
          const result = def.rest._zod.run({
            value: el2,
            issues: []
          }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => handleTupleResult(result2, payload, i4)));
          } else {
            handleTupleResult(result, payload, i4);
          }
        }
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  function handleTupleResult(result, final, index) {
    if (result.issues.length) {
      final.issues.push(...prefixIssues(index, result.issues));
    }
    final.value[index] = result.value;
  }
  var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!isPlainObject(input)) {
        payload.issues.push({
          expected: "record",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      if (def.keyType._zod.values) {
        const values = def.keyType._zod.values;
        payload.value = {};
        for (const key of values) {
          if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
            const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
            if (result instanceof Promise) {
              proms.push(result.then((result2) => {
                if (result2.issues.length) {
                  payload.issues.push(...prefixIssues(key, result2.issues));
                }
                payload.value[key] = result2.value;
              }));
            } else {
              if (result.issues.length) {
                payload.issues.push(...prefixIssues(key, result.issues));
              }
              payload.value[key] = result.value;
            }
          }
        }
        let unrecognized;
        for (const key in input) {
          if (!values.has(key)) {
            unrecognized = unrecognized ?? [];
            unrecognized.push(key);
          }
        }
        if (unrecognized && unrecognized.length > 0) {
          payload.issues.push({
            code: "unrecognized_keys",
            input,
            inst,
            keys: unrecognized
          });
        }
      } else {
        payload.value = {};
        for (const key of Reflect.ownKeys(input)) {
          if (key === "__proto__")
            continue;
          const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (keyResult.issues.length) {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key,
              path: [key],
              inst
            });
            payload.value[keyResult.value] = keyResult.value;
            continue;
          }
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[keyResult.value] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[keyResult.value] = result.value;
          }
        }
      }
      if (proms.length) {
        return Promise.all(proms).then(() => payload);
      }
      return payload;
    };
  });
  var $ZodMap = /* @__PURE__ */ $constructor("$ZodMap", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!(input instanceof Map)) {
        payload.issues.push({
          expected: "map",
          code: "invalid_type",
          input,
          inst
        });
        return payload;
      }
      const proms = [];
      payload.value = /* @__PURE__ */ new Map();
      for (const [key, value] of input) {
        const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        const valueResult = def.valueType._zod.run({ value, issues: [] }, ctx);
        if (keyResult instanceof Promise || valueResult instanceof Promise) {
          proms.push(Promise.all([keyResult, valueResult]).then(([keyResult2, valueResult2]) => {
            handleMapResult(keyResult2, valueResult2, payload, key, input, inst, ctx);
          }));
        } else {
          handleMapResult(keyResult, valueResult, payload, key, input, inst, ctx);
        }
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  function handleMapResult(keyResult, valueResult, final, key, input, inst, ctx) {
    if (keyResult.issues.length) {
      if (propertyKeyTypes.has(typeof key)) {
        final.issues.push(...prefixIssues(key, keyResult.issues));
      } else {
        final.issues.push({
          code: "invalid_key",
          origin: "map",
          input,
          inst,
          issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        });
      }
    }
    if (valueResult.issues.length) {
      if (propertyKeyTypes.has(typeof key)) {
        final.issues.push(...prefixIssues(key, valueResult.issues));
      } else {
        final.issues.push({
          origin: "map",
          code: "invalid_element",
          input,
          inst,
          key,
          issues: valueResult.issues.map((iss) => finalizeIssue(iss, ctx, config()))
        });
      }
    }
    final.value.set(keyResult.value, valueResult.value);
  }
  var $ZodSet = /* @__PURE__ */ $constructor("$ZodSet", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      const input = payload.value;
      if (!(input instanceof Set)) {
        payload.issues.push({
          input,
          inst,
          expected: "set",
          code: "invalid_type"
        });
        return payload;
      }
      const proms = [];
      payload.value = /* @__PURE__ */ new Set();
      for (const item of input) {
        const result = def.valueType._zod.run({ value: item, issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => handleSetResult(result2, payload)));
        } else
          handleSetResult(result, payload);
      }
      if (proms.length)
        return Promise.all(proms).then(() => payload);
      return payload;
    };
  });
  function handleSetResult(result, final) {
    if (result.issues.length) {
      final.issues.push(...result.issues);
    }
    final.value.add(result.value);
  }
  var $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
    $ZodType.init(inst, def);
    const values = getEnumValues(def.entries);
    const valuesSet = new Set(values);
    inst._zod.values = valuesSet;
    inst._zod.pattern = new RegExp(`^(${values.filter((k4) => propertyKeyTypes.has(typeof k4)).map((o4) => typeof o4 === "string" ? escapeRegex(o4) : o4.toString()).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (valuesSet.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values,
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    if (def.values.length === 0) {
      throw new Error("Cannot create literal schema with no valid values");
    }
    inst._zod.values = new Set(def.values);
    inst._zod.pattern = new RegExp(`^(${def.values.map((o4) => typeof o4 === "string" ? escapeRegex(o4) : o4 ? escapeRegex(o4.toString()) : String(o4)).join("|")})$`);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (inst._zod.values.has(input)) {
        return payload;
      }
      payload.issues.push({
        code: "invalid_value",
        values: def.values,
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodFile = /* @__PURE__ */ $constructor("$ZodFile", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      const input = payload.value;
      if (input instanceof File)
        return payload;
      payload.issues.push({
        expected: "file",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    };
  });
  var $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      const _out = def.transform(payload.value, payload);
      if (ctx.async) {
        const output = _out instanceof Promise ? _out : Promise.resolve(_out);
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      if (_out instanceof Promise) {
        throw new $ZodAsyncError();
      }
      payload.value = _out;
      return payload;
    };
  });
  function handleOptionalResult(result, input) {
    if (result.issues.length && input === void 0) {
      return { issues: [], value: void 0 };
    }
    return result;
  }
  var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    inst._zod.optout = "optional";
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
    });
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (def.innerType._zod.optin === "optional") {
        const result = def.innerType._zod.run(payload, ctx);
        if (result instanceof Promise)
          return result.then((r3) => handleOptionalResult(r3, payload.value));
        return handleOptionalResult(result, payload.value);
      }
      if (payload.value === void 0) {
        return payload;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  var $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "pattern", () => {
      const pattern = def.innerType._zod.pattern;
      return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
    });
    defineLazy(inst._zod, "values", () => {
      return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      if (payload.value === null)
        return payload;
      return def.innerType._zod.run(payload, ctx);
    };
  });
  var $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
        return payload;
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleDefaultResult(result2, def));
      }
      return handleDefaultResult(result, def);
    };
  });
  function handleDefaultResult(payload, def) {
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return payload;
  }
  var $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.optin = "optional";
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      if (payload.value === void 0) {
        payload.value = def.defaultValue;
      }
      return def.innerType._zod.run(payload, ctx);
    };
  });
  var $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => {
      const v4 = def.innerType._zod.values;
      return v4 ? new Set([...v4].filter((x3) => x3 !== void 0)) : void 0;
    });
    inst._zod.parse = (payload, ctx) => {
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => handleNonOptionalResult(result2, inst));
      }
      return handleNonOptionalResult(result, inst);
    };
  });
  function handleNonOptionalResult(payload, inst) {
    if (!payload.issues.length && payload.value === void 0) {
      payload.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: payload.value,
        inst
      });
    }
    return payload;
  }
  var $ZodSuccess = /* @__PURE__ */ $constructor("$ZodSuccess", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        throw new $ZodEncodeError("ZodSuccess");
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => {
          payload.value = result2.issues.length === 0;
          return payload;
        });
      }
      payload.value = result.issues.length === 0;
      return payload;
    };
  });
  var $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then((result2) => {
          payload.value = result2.value;
          if (result2.issues.length) {
            payload.value = def.catchValue({
              ...payload,
              error: {
                issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config()))
              },
              input: payload.value
            });
            payload.issues = [];
          }
          return payload;
        });
      }
      payload.value = result.value;
      if (result.issues.length) {
        payload.value = def.catchValue({
          ...payload,
          error: {
            issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config()))
          },
          input: payload.value
        });
        payload.issues = [];
      }
      return payload;
    };
  });
  var $ZodNaN = /* @__PURE__ */ $constructor("$ZodNaN", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "number" || !Number.isNaN(payload.value)) {
        payload.issues.push({
          input: payload.value,
          inst,
          expected: "nan",
          code: "invalid_type"
        });
        return payload;
      }
      return payload;
    };
  });
  var $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handlePipeResult(right2, def.in, ctx));
        }
        return handlePipeResult(right, def.in, ctx);
      }
      const left = def.in._zod.run(payload, ctx);
      if (left instanceof Promise) {
        return left.then((left2) => handlePipeResult(left2, def.out, ctx));
      }
      return handlePipeResult(left, def.out, ctx);
    };
  });
  function handlePipeResult(left, next, ctx) {
    if (left.issues.length) {
      left.aborted = true;
      return left;
    }
    return next._zod.run({ value: left.value, issues: left.issues }, ctx);
  }
  var $ZodCodec = /* @__PURE__ */ $constructor("$ZodCodec", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "values", () => def.in._zod.values);
    defineLazy(inst._zod, "optin", () => def.in._zod.optin);
    defineLazy(inst._zod, "optout", () => def.out._zod.optout);
    defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
    inst._zod.parse = (payload, ctx) => {
      const direction = ctx.direction || "forward";
      if (direction === "forward") {
        const left = def.in._zod.run(payload, ctx);
        if (left instanceof Promise) {
          return left.then((left2) => handleCodecAResult(left2, def, ctx));
        }
        return handleCodecAResult(left, def, ctx);
      } else {
        const right = def.out._zod.run(payload, ctx);
        if (right instanceof Promise) {
          return right.then((right2) => handleCodecAResult(right2, def, ctx));
        }
        return handleCodecAResult(right, def, ctx);
      }
    };
  });
  function handleCodecAResult(result, def, ctx) {
    if (result.issues.length) {
      result.aborted = true;
      return result;
    }
    const direction = ctx.direction || "forward";
    if (direction === "forward") {
      const transformed = def.transform(result.value, result);
      if (transformed instanceof Promise) {
        return transformed.then((value) => handleCodecTxResult(result, value, def.out, ctx));
      }
      return handleCodecTxResult(result, transformed, def.out, ctx);
    } else {
      const transformed = def.reverseTransform(result.value, result);
      if (transformed instanceof Promise) {
        return transformed.then((value) => handleCodecTxResult(result, value, def.in, ctx));
      }
      return handleCodecTxResult(result, transformed, def.in, ctx);
    }
  }
  function handleCodecTxResult(left, value, nextSchema, ctx) {
    if (left.issues.length) {
      left.aborted = true;
      return left;
    }
    return nextSchema._zod.run({ value, issues: left.issues }, ctx);
  }
  var $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
    defineLazy(inst._zod, "values", () => def.innerType._zod.values);
    defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
    defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
    inst._zod.parse = (payload, ctx) => {
      if (ctx.direction === "backward") {
        return def.innerType._zod.run(payload, ctx);
      }
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise) {
        return result.then(handleReadonlyResult);
      }
      return handleReadonlyResult(result);
    };
  });
  function handleReadonlyResult(payload) {
    payload.value = Object.freeze(payload.value);
    return payload;
  }
  var $ZodTemplateLiteral = /* @__PURE__ */ $constructor("$ZodTemplateLiteral", (inst, def) => {
    $ZodType.init(inst, def);
    const regexParts = [];
    for (const part of def.parts) {
      if (typeof part === "object" && part !== null) {
        if (!part._zod.pattern) {
          throw new Error(`Invalid template literal part, no pattern found: ${[...part._zod.traits].shift()}`);
        }
        const source = part._zod.pattern instanceof RegExp ? part._zod.pattern.source : part._zod.pattern;
        if (!source)
          throw new Error(`Invalid template literal part: ${part._zod.traits}`);
        const start = source.startsWith("^") ? 1 : 0;
        const end = source.endsWith("$") ? source.length - 1 : source.length;
        regexParts.push(source.slice(start, end));
      } else if (part === null || primitiveTypes.has(typeof part)) {
        regexParts.push(escapeRegex(`${part}`));
      } else {
        throw new Error(`Invalid template literal part: ${part}`);
      }
    }
    inst._zod.pattern = new RegExp(`^${regexParts.join("")}$`);
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "string") {
        payload.issues.push({
          input: payload.value,
          inst,
          expected: "template_literal",
          code: "invalid_type"
        });
        return payload;
      }
      inst._zod.pattern.lastIndex = 0;
      if (!inst._zod.pattern.test(payload.value)) {
        payload.issues.push({
          input: payload.value,
          inst,
          code: "invalid_format",
          format: def.format ?? "template_literal",
          pattern: inst._zod.pattern.source
        });
        return payload;
      }
      return payload;
    };
  });
  var $ZodFunction = /* @__PURE__ */ $constructor("$ZodFunction", (inst, def) => {
    $ZodType.init(inst, def);
    inst._def = def;
    inst._zod.def = def;
    inst.implement = (func) => {
      if (typeof func !== "function") {
        throw new Error("implement() must be called with a function");
      }
      return function(...args) {
        const parsedArgs = inst._def.input ? parse(inst._def.input, args) : args;
        const result = Reflect.apply(func, this, parsedArgs);
        if (inst._def.output) {
          return parse(inst._def.output, result);
        }
        return result;
      };
    };
    inst.implementAsync = (func) => {
      if (typeof func !== "function") {
        throw new Error("implementAsync() must be called with a function");
      }
      return async function(...args) {
        const parsedArgs = inst._def.input ? await parseAsync(inst._def.input, args) : args;
        const result = await Reflect.apply(func, this, parsedArgs);
        if (inst._def.output) {
          return await parseAsync(inst._def.output, result);
        }
        return result;
      };
    };
    inst._zod.parse = (payload, _ctx) => {
      if (typeof payload.value !== "function") {
        payload.issues.push({
          code: "invalid_type",
          expected: "function",
          input: payload.value,
          inst
        });
        return payload;
      }
      const hasPromiseOutput = inst._def.output && inst._def.output._zod.def.type === "promise";
      if (hasPromiseOutput) {
        payload.value = inst.implementAsync(payload.value);
      } else {
        payload.value = inst.implement(payload.value);
      }
      return payload;
    };
    inst.input = (...args) => {
      const F3 = inst.constructor;
      if (Array.isArray(args[0])) {
        return new F3({
          type: "function",
          input: new $ZodTuple({
            type: "tuple",
            items: args[0],
            rest: args[1]
          }),
          output: inst._def.output
        });
      }
      return new F3({
        type: "function",
        input: args[0],
        output: inst._def.output
      });
    };
    inst.output = (output) => {
      const F3 = inst.constructor;
      return new F3({
        type: "function",
        input: inst._def.input,
        output
      });
    };
    return inst;
  });
  var $ZodPromise = /* @__PURE__ */ $constructor("$ZodPromise", (inst, def) => {
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, ctx) => {
      return Promise.resolve(payload.value).then((inner) => def.innerType._zod.run({ value: inner, issues: [] }, ctx));
    };
  });
  var $ZodLazy = /* @__PURE__ */ $constructor("$ZodLazy", (inst, def) => {
    $ZodType.init(inst, def);
    defineLazy(inst._zod, "innerType", () => def.getter());
    defineLazy(inst._zod, "pattern", () => inst._zod.innerType._zod.pattern);
    defineLazy(inst._zod, "propValues", () => inst._zod.innerType._zod.propValues);
    defineLazy(inst._zod, "optin", () => inst._zod.innerType._zod.optin ?? void 0);
    defineLazy(inst._zod, "optout", () => inst._zod.innerType._zod.optout ?? void 0);
    inst._zod.parse = (payload, ctx) => {
      const inner = inst._zod.innerType;
      return inner._zod.run(payload, ctx);
    };
  });
  var $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
    $ZodCheck.init(inst, def);
    $ZodType.init(inst, def);
    inst._zod.parse = (payload, _4) => {
      return payload;
    };
    inst._zod.check = (payload) => {
      const input = payload.value;
      const r3 = def.fn(input);
      if (r3 instanceof Promise) {
        return r3.then((r4) => handleRefineResult(r4, payload, input, inst));
      }
      handleRefineResult(r3, payload, input, inst);
      return;
    };
  });
  function handleRefineResult(result, payload, input, inst) {
    if (!result) {
      const _iss = {
        code: "custom",
        input,
        inst,
        // incorporates params.error into issue reporting
        path: [...inst._zod.def.path ?? []],
        // incorporates params.error into issue reporting
        continue: !inst._zod.def.abort
        // params: inst._zod.def.params,
      };
      if (inst._zod.def.params)
        _iss.params = inst._zod.def.params;
      payload.issues.push(issue(_iss));
    }
  }

  // node_modules/zod/v4/locales/index.js
  var locales_exports = {};
  __export(locales_exports, {
    ar: () => ar_default,
    az: () => az_default,
    be: () => be_default,
    bg: () => bg_default,
    ca: () => ca_default,
    cs: () => cs_default,
    da: () => da_default,
    de: () => de_default,
    en: () => en_default,
    eo: () => eo_default,
    es: () => es_default,
    fa: () => fa_default,
    fi: () => fi_default,
    fr: () => fr_default,
    frCA: () => fr_CA_default,
    he: () => he_default,
    hu: () => hu_default,
    id: () => id_default,
    is: () => is_default,
    it: () => it_default,
    ja: () => ja_default,
    ka: () => ka_default,
    kh: () => kh_default,
    km: () => km_default,
    ko: () => ko_default,
    lt: () => lt_default,
    mk: () => mk_default,
    ms: () => ms_default,
    nl: () => nl_default,
    no: () => no_default,
    ota: () => ota_default,
    pl: () => pl_default,
    ps: () => ps_default,
    pt: () => pt_default,
    ru: () => ru_default,
    sl: () => sl_default,
    sv: () => sv_default,
    ta: () => ta_default,
    th: () => th_default,
    tr: () => tr_default,
    ua: () => ua_default,
    uk: () => uk_default,
    ur: () => ur_default,
    vi: () => vi_default,
    yo: () => yo_default,
    zhCN: () => zh_CN_default,
    zhTW: () => zh_TW_default
  });

  // node_modules/zod/v4/locales/ar.js
  var error = () => {
    const Sizable = {
      string: { unit: "\u062D\u0631\u0641", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
      file: { unit: "\u0628\u0627\u064A\u062A", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
      array: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" },
      set: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0645\u062F\u062E\u0644",
      email: "\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A",
      url: "\u0631\u0627\u0628\u0637",
      emoji: "\u0625\u064A\u0645\u0648\u062C\u064A",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u062A\u0627\u0631\u064A\u062E \u0648\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
      date: "\u062A\u0627\u0631\u064A\u062E \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
      time: "\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
      duration: "\u0645\u062F\u0629 \u0628\u0645\u0639\u064A\u0627\u0631 ISO",
      ipv4: "\u0639\u0646\u0648\u0627\u0646 IPv4",
      ipv6: "\u0639\u0646\u0648\u0627\u0646 IPv6",
      cidrv4: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv4",
      cidrv6: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv6",
      base64: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64-encoded",
      base64url: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64url-encoded",
      json_string: "\u0646\u064E\u0635 \u0639\u0644\u0649 \u0647\u064A\u0626\u0629 JSON",
      e164: "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0628\u0645\u0639\u064A\u0627\u0631 E.164",
      jwt: "JWT",
      template_literal: "\u0645\u062F\u062E\u0644"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${issue2.expected}\u060C \u0648\u0644\u0643\u0646 \u062A\u0645 \u0625\u062F\u062E\u0627\u0644 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${stringifyPrimitive(issue2.values[0])}`;
          return `\u0627\u062E\u062A\u064A\u0627\u0631 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062A\u0648\u0642\u0639 \u0627\u0646\u062A\u0642\u0627\u0621 \u0623\u062D\u062F \u0647\u0630\u0647 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A: ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return ` \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${issue2.origin ?? "\u0627\u0644\u0642\u064A\u0645\u0629"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "\u0639\u0646\u0635\u0631"}`;
          return `\u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${issue2.origin ?? "\u0627\u0644\u0642\u064A\u0645\u0629"} ${adj} ${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${issue2.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${issue2.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${adj} ${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0628\u0640 "${issue2.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0646\u062A\u0647\u064A \u0628\u0640 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u062A\u0636\u0645\u0651\u064E\u0646 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0646\u0645\u0637 ${_issue.pattern}`;
          return `${Nouns[_issue.format] ?? issue2.format} \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644`;
        }
        case "not_multiple_of":
          return `\u0631\u0642\u0645 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0646 \u0645\u0636\u0627\u0639\u0641\u0627\u062A ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u0645\u0639\u0631\u0641${issue2.keys.length > 1 ? "\u0627\u062A" : ""} \u063A\u0631\u064A\u0628${issue2.keys.length > 1 ? "\u0629" : ""}: ${joinValues(issue2.keys, "\u060C ")}`;
        case "invalid_key":
          return `\u0645\u0639\u0631\u0641 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${issue2.origin}`;
        case "invalid_union":
          return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
        case "invalid_element":
          return `\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${issue2.origin}`;
        default:
          return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
      }
    };
  };
  function ar_default() {
    return {
      localeError: error()
    };
  }

  // node_modules/zod/v4/locales/az.js
  var error2 = () => {
    const Sizable = {
      string: { unit: "simvol", verb: "olmal\u0131d\u0131r" },
      file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
      array: { unit: "element", verb: "olmal\u0131d\u0131r" },
      set: { unit: "element", verb: "olmal\u0131d\u0131r" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "input",
      email: "email address",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO datetime",
      date: "ISO date",
      time: "ISO time",
      duration: "ISO duration",
      ipv4: "IPv4 address",
      ipv6: "IPv6 address",
      cidrv4: "IPv4 range",
      cidrv6: "IPv6 range",
      base64: "base64-encoded string",
      base64url: "base64url-encoded string",
      json_string: "JSON string",
      e164: "E.164 number",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${issue2.expected}, daxil olan ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${stringifyPrimitive(issue2.values[0])}`;
          return `Yanl\u0131\u015F se\xE7im: a\u015Fa\u011F\u0131dak\u0131lardan biri olmal\u0131d\u0131r: ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${issue2.origin ?? "d\u0259y\u0259r"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
          return `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${issue2.origin ?? "d\u0259y\u0259r"} ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          return `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Yanl\u0131\u015F m\u0259tn: "${_issue.prefix}" il\u0259 ba\u015Flamal\u0131d\u0131r`;
          if (_issue.format === "ends_with")
            return `Yanl\u0131\u015F m\u0259tn: "${_issue.suffix}" il\u0259 bitm\u0259lidir`;
          if (_issue.format === "includes")
            return `Yanl\u0131\u015F m\u0259tn: "${_issue.includes}" daxil olmal\u0131d\u0131r`;
          if (_issue.format === "regex")
            return `Yanl\u0131\u015F m\u0259tn: ${_issue.pattern} \u015Fablonuna uy\u011Fun olmal\u0131d\u0131r`;
          return `Yanl\u0131\u015F ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Yanl\u0131\u015F \u0259d\u0259d: ${issue2.divisor} il\u0259 b\xF6l\xFCn\u0259 bil\u0259n olmal\u0131d\u0131r`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan a\xE7ar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `${issue2.origin} daxilind\u0259 yanl\u0131\u015F a\xE7ar`;
        case "invalid_union":
          return "Yanl\u0131\u015F d\u0259y\u0259r";
        case "invalid_element":
          return `${issue2.origin} daxilind\u0259 yanl\u0131\u015F d\u0259y\u0259r`;
        default:
          return `Yanl\u0131\u015F d\u0259y\u0259r`;
      }
    };
  };
  function az_default() {
    return {
      localeError: error2()
    };
  }

  // node_modules/zod/v4/locales/be.js
  function getBelarusianPlural(count, one, few, many) {
    const absCount = Math.abs(count);
    const lastDigit = absCount % 10;
    const lastTwoDigits = absCount % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return many;
    }
    if (lastDigit === 1) {
      return one;
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
      return few;
    }
    return many;
  }
  var error3 = () => {
    const Sizable = {
      string: {
        unit: {
          one: "\u0441\u0456\u043C\u0432\u0430\u043B",
          few: "\u0441\u0456\u043C\u0432\u0430\u043B\u044B",
          many: "\u0441\u0456\u043C\u0432\u0430\u043B\u0430\u045E"
        },
        verb: "\u043C\u0435\u0446\u044C"
      },
      array: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E"
        },
        verb: "\u043C\u0435\u0446\u044C"
      },
      set: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E"
        },
        verb: "\u043C\u0435\u0446\u044C"
      },
      file: {
        unit: {
          one: "\u0431\u0430\u0439\u0442",
          few: "\u0431\u0430\u0439\u0442\u044B",
          many: "\u0431\u0430\u0439\u0442\u0430\u045E"
        },
        verb: "\u043C\u0435\u0446\u044C"
      }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u043B\u0456\u043A";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u043C\u0430\u0441\u0456\u045E";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0443\u0432\u043E\u0434",
      email: "email \u0430\u0434\u0440\u0430\u0441",
      url: "URL",
      emoji: "\u044D\u043C\u043E\u0434\u0437\u0456",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u0434\u0430\u0442\u0430 \u0456 \u0447\u0430\u0441",
      date: "ISO \u0434\u0430\u0442\u0430",
      time: "ISO \u0447\u0430\u0441",
      duration: "ISO \u043F\u0440\u0430\u0446\u044F\u0433\u043B\u0430\u0441\u0446\u044C",
      ipv4: "IPv4 \u0430\u0434\u0440\u0430\u0441",
      ipv6: "IPv6 \u0430\u0434\u0440\u0430\u0441",
      cidrv4: "IPv4 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D",
      cidrv6: "IPv6 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D",
      base64: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64",
      base64url: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64url",
      json_string: "JSON \u0440\u0430\u0434\u043E\u043A",
      e164: "\u043D\u0443\u043C\u0430\u0440 E.164",
      jwt: "JWT",
      template_literal: "\u0443\u0432\u043E\u0434"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u045E\u0441\u044F ${issue2.expected}, \u0430\u0442\u0440\u044B\u043C\u0430\u043D\u0430 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F ${stringifyPrimitive(issue2.values[0])}`;
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0432\u0430\u0440\u044B\u044F\u043D\u0442: \u0447\u0430\u043A\u0430\u045E\u0441\u044F \u0430\u0434\u0437\u0456\u043D \u0437 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            const maxValue = Number(issue2.maximum);
            const unit = getBelarusianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${sizing.verb} ${adj}${issue2.maximum.toString()} ${unit}`;
          }
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            const minValue = Number(issue2.minimum);
            const unit = getBelarusianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${sizing.verb} ${adj}${issue2.minimum.toString()} ${unit}`;
          }
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${issue2.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u043F\u0430\u0447\u044B\u043D\u0430\u0446\u0446\u0430 \u0437 "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u0430\u043A\u0430\u043D\u0447\u0432\u0430\u0446\u0446\u0430 \u043D\u0430 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u043C\u044F\u0448\u0447\u0430\u0446\u044C "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0430\u0434\u043F\u0430\u0432\u044F\u0434\u0430\u0446\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043B\u0456\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0431\u044B\u0446\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0441\u043F\u0430\u0437\u043D\u0430\u043D\u044B ${issue2.keys.length > 1 ? "\u043A\u043B\u044E\u0447\u044B" : "\u043A\u043B\u044E\u0447"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043A\u043B\u044E\u0447 \u0443 ${issue2.origin}`;
        case "invalid_union":
          return "\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434";
        case "invalid_element":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u0430\u0435 \u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435 \u045E ${issue2.origin}`;
        default:
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434`;
      }
    };
  };
  function be_default() {
    return {
      localeError: error3()
    };
  }

  // node_modules/zod/v4/locales/bg.js
  var parsedType = (data) => {
    const t4 = typeof data;
    switch (t4) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "\u043C\u0430\u0441\u0438\u0432";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t4;
  };
  var error4 = () => {
    const Sizable = {
      string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
      file: { unit: "\u0431\u0430\u0439\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
      array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" },
      set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const Nouns = {
      regex: "\u0432\u0445\u043E\u0434",
      email: "\u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441",
      url: "URL",
      emoji: "\u0435\u043C\u043E\u0434\u0436\u0438",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u0432\u0440\u0435\u043C\u0435",
      date: "ISO \u0434\u0430\u0442\u0430",
      time: "ISO \u0432\u0440\u0435\u043C\u0435",
      duration: "ISO \u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442",
      ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441",
      ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441",
      cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
      cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
      base64: "base64-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437",
      base64url: "base64url-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437",
      json_string: "JSON \u043D\u0438\u0437",
      e164: "E.164 \u043D\u043E\u043C\u0435\u0440",
      jwt: "JWT",
      template_literal: "\u0432\u0445\u043E\u0434"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${issue2.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D ${parsedType(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${stringifyPrimitive(issue2.values[0])}`;
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u043E\u043F\u0446\u0438\u044F: \u043E\u0447\u0430\u043A\u0432\u0430\u043D\u043E \u0435\u0434\u043D\u043E \u043E\u0442 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin ?? "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430"}`;
          return `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin ?? "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0431\u044A\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${issue2.origin} \u0434\u0430 \u0431\u044A\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u0432\u0430 \u0441 "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u0432\u044A\u0440\u0448\u0432\u0430 \u0441 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0432\u043A\u043B\u044E\u0447\u0432\u0430 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0441\u044A\u0432\u043F\u0430\u0434\u0430 \u0441 ${_issue.pattern}`;
          let invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D";
          if (_issue.format === "emoji")
            invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
          if (_issue.format === "datetime")
            invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
          if (_issue.format === "date")
            invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430";
          if (_issue.format === "time")
            invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E";
          if (_issue.format === "duration")
            invalid_adj = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430";
          return `${invalid_adj} ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E \u0447\u0438\u0441\u043B\u043E: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0431\u044A\u0434\u0435 \u043A\u0440\u0430\u0442\u043D\u043E \u043D\u0430 ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0437\u043F\u043E\u0437\u043D\u0430\u0442${issue2.keys.length > 1 ? "\u0438" : ""} \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u043E\u0432\u0435" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043A\u043B\u044E\u0447 \u0432 ${issue2.origin}`;
        case "invalid_union":
          return "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434";
        case "invalid_element":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442 \u0432 ${issue2.origin}`;
        default:
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434`;
      }
    };
  };
  function bg_default() {
    return {
      localeError: error4()
    };
  }

  // node_modules/zod/v4/locales/ca.js
  var error5 = () => {
    const Sizable = {
      string: { unit: "car\xE0cters", verb: "contenir" },
      file: { unit: "bytes", verb: "contenir" },
      array: { unit: "elements", verb: "contenir" },
      set: { unit: "elements", verb: "contenir" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "entrada",
      email: "adre\xE7a electr\xF2nica",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "data i hora ISO",
      date: "data ISO",
      time: "hora ISO",
      duration: "durada ISO",
      ipv4: "adre\xE7a IPv4",
      ipv6: "adre\xE7a IPv6",
      cidrv4: "rang IPv4",
      cidrv6: "rang IPv6",
      base64: "cadena codificada en base64",
      base64url: "cadena codificada en base64url",
      json_string: "cadena JSON",
      e164: "n\xFAmero E.164",
      jwt: "JWT",
      template_literal: "entrada"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Tipus inv\xE0lid: s'esperava ${issue2.expected}, s'ha rebut ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Valor inv\xE0lid: s'esperava ${stringifyPrimitive(issue2.values[0])}`;
          return `Opci\xF3 inv\xE0lida: s'esperava una de ${joinValues(issue2.values, " o ")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "com a m\xE0xim" : "menys de";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} contingu\xE9s ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
          return `Massa gran: s'esperava que ${issue2.origin ?? "el valor"} fos ${adj} ${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? "com a m\xEDnim" : "m\xE9s de";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Massa petit: s'esperava que ${issue2.origin} contingu\xE9s ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Massa petit: s'esperava que ${issue2.origin} fos ${adj} ${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Format inv\xE0lid: ha de comen\xE7ar amb "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Format inv\xE0lid: ha d'acabar amb "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Format inv\xE0lid: ha d'incloure "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Format inv\xE0lid: ha de coincidir amb el patr\xF3 ${_issue.pattern}`;
          return `Format inv\xE0lid per a ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE0lid: ha de ser m\xFAltiple de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Clau${issue2.keys.length > 1 ? "s" : ""} no reconeguda${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Clau inv\xE0lida a ${issue2.origin}`;
        case "invalid_union":
          return "Entrada inv\xE0lida";
        case "invalid_element":
          return `Element inv\xE0lid a ${issue2.origin}`;
        default:
          return `Entrada inv\xE0lida`;
      }
    };
  };
  function ca_default() {
    return {
      localeError: error5()
    };
  }

  // node_modules/zod/v4/locales/cs.js
  var error6 = () => {
    const Sizable = {
      string: { unit: "znak\u016F", verb: "m\xEDt" },
      file: { unit: "bajt\u016F", verb: "m\xEDt" },
      array: { unit: "prvk\u016F", verb: "m\xEDt" },
      set: { unit: "prvk\u016F", verb: "m\xEDt" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u010D\xEDslo";
        }
        case "string": {
          return "\u0159et\u011Bzec";
        }
        case "boolean": {
          return "boolean";
        }
        case "bigint": {
          return "bigint";
        }
        case "function": {
          return "funkce";
        }
        case "symbol": {
          return "symbol";
        }
        case "undefined": {
          return "undefined";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "pole";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "regul\xE1rn\xED v\xFDraz",
      email: "e-mailov\xE1 adresa",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "datum a \u010Das ve form\xE1tu ISO",
      date: "datum ve form\xE1tu ISO",
      time: "\u010Das ve form\xE1tu ISO",
      duration: "doba trv\xE1n\xED ISO",
      ipv4: "IPv4 adresa",
      ipv6: "IPv6 adresa",
      cidrv4: "rozsah IPv4",
      cidrv6: "rozsah IPv6",
      base64: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64",
      base64url: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64url",
      json_string: "\u0159et\u011Bzec ve form\xE1tu JSON",
      e164: "\u010D\xEDslo E.164",
      jwt: "JWT",
      template_literal: "vstup"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${issue2.expected}, obdr\u017Eeno ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${stringifyPrimitive(issue2.values[0])}`;
          return `Neplatn\xE1 mo\u017Enost: o\u010Dek\xE1v\xE1na jedna z hodnot ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${issue2.origin ?? "hodnota"} mus\xED m\xEDt ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "prvk\u016F"}`;
          }
          return `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${issue2.origin ?? "hodnota"} mus\xED b\xFDt ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${issue2.origin ?? "hodnota"} mus\xED m\xEDt ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "prvk\u016F"}`;
          }
          return `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${issue2.origin ?? "hodnota"} mus\xED b\xFDt ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Neplatn\xFD \u0159et\u011Bzec: mus\xED za\u010D\xEDnat na "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Neplatn\xFD \u0159et\u011Bzec: mus\xED kon\u010Dit na "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Neplatn\xFD \u0159et\u011Bzec: mus\xED obsahovat "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Neplatn\xFD \u0159et\u011Bzec: mus\xED odpov\xEDdat vzoru ${_issue.pattern}`;
          return `Neplatn\xFD form\xE1t ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Neplatn\xE9 \u010D\xEDslo: mus\xED b\xFDt n\xE1sobkem ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Nezn\xE1m\xE9 kl\xED\u010De: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Neplatn\xFD kl\xED\u010D v ${issue2.origin}`;
        case "invalid_union":
          return "Neplatn\xFD vstup";
        case "invalid_element":
          return `Neplatn\xE1 hodnota v ${issue2.origin}`;
        default:
          return `Neplatn\xFD vstup`;
      }
    };
  };
  function cs_default() {
    return {
      localeError: error6()
    };
  }

  // node_modules/zod/v4/locales/da.js
  var error7 = () => {
    const Sizable = {
      string: { unit: "tegn", verb: "havde" },
      file: { unit: "bytes", verb: "havde" },
      array: { unit: "elementer", verb: "indeholdt" },
      set: { unit: "elementer", verb: "indeholdt" }
    };
    const TypeNames = {
      string: "streng",
      number: "tal",
      boolean: "boolean",
      array: "liste",
      object: "objekt",
      set: "s\xE6t",
      file: "fil"
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    function getTypeName(type) {
      return TypeNames[type] ?? type;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "tal";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "liste";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
          return "objekt";
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "input",
      email: "e-mailadresse",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO dato- og klokkesl\xE6t",
      date: "ISO-dato",
      time: "ISO-klokkesl\xE6t",
      duration: "ISO-varighed",
      ipv4: "IPv4-omr\xE5de",
      ipv6: "IPv6-omr\xE5de",
      cidrv4: "IPv4-spektrum",
      cidrv6: "IPv6-spektrum",
      base64: "base64-kodet streng",
      base64url: "base64url-kodet streng",
      json_string: "JSON-streng",
      e164: "E.164-nummer",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Ugyldigt input: forventede ${getTypeName(issue2.expected)}, fik ${getTypeName(parsedType8(issue2.input))}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ugyldig v\xE6rdi: forventede ${stringifyPrimitive(issue2.values[0])}`;
          return `Ugyldigt valg: forventede en af f\xF8lgende ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          const origin = getTypeName(issue2.origin);
          if (sizing)
            return `For stor: forventede ${origin ?? "value"} ${sizing.verb} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
          return `For stor: forventede ${origin ?? "value"} havde ${adj} ${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          const origin = getTypeName(issue2.origin);
          if (sizing) {
            return `For lille: forventede ${origin} ${sizing.verb} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `For lille: forventede ${origin} havde ${adj} ${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Ugyldig streng: skal starte med "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Ugyldig streng: skal ende med "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Ugyldig streng: skal indeholde "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Ugyldig streng: skal matche m\xF8nsteret ${_issue.pattern}`;
          return `Ugyldig ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Ugyldigt tal: skal v\xE6re deleligt med ${issue2.divisor}`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "Ukendte n\xF8gler" : "Ukendt n\xF8gle"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8gle i ${issue2.origin}`;
        case "invalid_union":
          return "Ugyldigt input: matcher ingen af de tilladte typer";
        case "invalid_element":
          return `Ugyldig v\xE6rdi i ${issue2.origin}`;
        default:
          return `Ugyldigt input`;
      }
    };
  };
  function da_default() {
    return {
      localeError: error7()
    };
  }

  // node_modules/zod/v4/locales/de.js
  var error8 = () => {
    const Sizable = {
      string: { unit: "Zeichen", verb: "zu haben" },
      file: { unit: "Bytes", verb: "zu haben" },
      array: { unit: "Elemente", verb: "zu haben" },
      set: { unit: "Elemente", verb: "zu haben" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "Zahl";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "Array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "Eingabe",
      email: "E-Mail-Adresse",
      url: "URL",
      emoji: "Emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO-Datum und -Uhrzeit",
      date: "ISO-Datum",
      time: "ISO-Uhrzeit",
      duration: "ISO-Dauer",
      ipv4: "IPv4-Adresse",
      ipv6: "IPv6-Adresse",
      cidrv4: "IPv4-Bereich",
      cidrv6: "IPv6-Bereich",
      base64: "Base64-codierter String",
      base64url: "Base64-URL-codierter String",
      json_string: "JSON-String",
      e164: "E.164-Nummer",
      jwt: "JWT",
      template_literal: "Eingabe"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Ung\xFCltige Eingabe: erwartet ${issue2.expected}, erhalten ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ung\xFCltige Eingabe: erwartet ${stringifyPrimitive(issue2.values[0])}`;
          return `Ung\xFCltige Option: erwartet eine von ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Zu gro\xDF: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "Elemente"} hat`;
          return `Zu gro\xDF: erwartet, dass ${issue2.origin ?? "Wert"} ${adj}${issue2.maximum.toString()} ist`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} hat`;
          }
          return `Zu klein: erwartet, dass ${issue2.origin} ${adj}${issue2.minimum.toString()} ist`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Ung\xFCltiger String: muss mit "${_issue.prefix}" beginnen`;
          if (_issue.format === "ends_with")
            return `Ung\xFCltiger String: muss mit "${_issue.suffix}" enden`;
          if (_issue.format === "includes")
            return `Ung\xFCltiger String: muss "${_issue.includes}" enthalten`;
          if (_issue.format === "regex")
            return `Ung\xFCltiger String: muss dem Muster ${_issue.pattern} entsprechen`;
          return `Ung\xFCltig: ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Ung\xFCltige Zahl: muss ein Vielfaches von ${issue2.divisor} sein`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "Unbekannte Schl\xFCssel" : "Unbekannter Schl\xFCssel"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Ung\xFCltiger Schl\xFCssel in ${issue2.origin}`;
        case "invalid_union":
          return "Ung\xFCltige Eingabe";
        case "invalid_element":
          return `Ung\xFCltiger Wert in ${issue2.origin}`;
        default:
          return `Ung\xFCltige Eingabe`;
      }
    };
  };
  function de_default() {
    return {
      localeError: error8()
    };
  }

  // node_modules/zod/v4/locales/en.js
  var parsedType2 = (data) => {
    const t4 = typeof data;
    switch (t4) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t4;
  };
  var error9 = () => {
    const Sizable = {
      string: { unit: "characters", verb: "to have" },
      file: { unit: "bytes", verb: "to have" },
      array: { unit: "items", verb: "to have" },
      set: { unit: "items", verb: "to have" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const Nouns = {
      regex: "input",
      email: "email address",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO datetime",
      date: "ISO date",
      time: "ISO time",
      duration: "ISO duration",
      ipv4: "IPv4 address",
      ipv6: "IPv6 address",
      cidrv4: "IPv4 range",
      cidrv6: "IPv6 range",
      base64: "base64-encoded string",
      base64url: "base64url-encoded string",
      json_string: "JSON string",
      e164: "E.164 number",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Invalid input: expected ${issue2.expected}, received ${parsedType2(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
          return `Invalid option: expected one of ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Too big: expected ${issue2.origin ?? "value"} to have ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
          return `Too big: expected ${issue2.origin ?? "value"} to be ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Too small: expected ${issue2.origin} to have ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Too small: expected ${issue2.origin} to be ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Invalid string: must start with "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Invalid string: must end with "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Invalid string: must include "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Invalid string: must match pattern ${_issue.pattern}`;
          return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Invalid number: must be a multiple of ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Unrecognized key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Invalid key in ${issue2.origin}`;
        case "invalid_union":
          return "Invalid input";
        case "invalid_element":
          return `Invalid value in ${issue2.origin}`;
        default:
          return `Invalid input`;
      }
    };
  };
  function en_default() {
    return {
      localeError: error9()
    };
  }

  // node_modules/zod/v4/locales/eo.js
  var parsedType3 = (data) => {
    const t4 = typeof data;
    switch (t4) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "nombro";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "tabelo";
        }
        if (data === null) {
          return "senvalora";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t4;
  };
  var error10 = () => {
    const Sizable = {
      string: { unit: "karaktrojn", verb: "havi" },
      file: { unit: "bajtojn", verb: "havi" },
      array: { unit: "elementojn", verb: "havi" },
      set: { unit: "elementojn", verb: "havi" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const Nouns = {
      regex: "enigo",
      email: "retadreso",
      url: "URL",
      emoji: "emo\u011Dio",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO-datotempo",
      date: "ISO-dato",
      time: "ISO-tempo",
      duration: "ISO-da\u016Dro",
      ipv4: "IPv4-adreso",
      ipv6: "IPv6-adreso",
      cidrv4: "IPv4-rango",
      cidrv6: "IPv6-rango",
      base64: "64-ume kodita karaktraro",
      base64url: "URL-64-ume kodita karaktraro",
      json_string: "JSON-karaktraro",
      e164: "E.164-nombro",
      jwt: "JWT",
      template_literal: "enigo"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Nevalida enigo: atendi\u011Dis ${issue2.expected}, ricevi\u011Dis ${parsedType3(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Nevalida enigo: atendi\u011Dis ${stringifyPrimitive(issue2.values[0])}`;
          return `Nevalida opcio: atendi\u011Dis unu el ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Tro granda: atendi\u011Dis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementojn"}`;
          return `Tro granda: atendi\u011Dis ke ${issue2.origin ?? "valoro"} havu ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Tro malgranda: atendi\u011Dis ke ${issue2.origin} havu ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Tro malgranda: atendi\u011Dis ke ${issue2.origin} estu ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Nevalida karaktraro: devas komenci\u011Di per "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Nevalida karaktraro: devas fini\u011Di per "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Nevalida karaktraro: devas inkluzivi "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Nevalida karaktraro: devas kongrui kun la modelo ${_issue.pattern}`;
          return `Nevalida ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Nevalida nombro: devas esti oblo de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Nekonata${issue2.keys.length > 1 ? "j" : ""} \u015Dlosilo${issue2.keys.length > 1 ? "j" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Nevalida \u015Dlosilo en ${issue2.origin}`;
        case "invalid_union":
          return "Nevalida enigo";
        case "invalid_element":
          return `Nevalida valoro en ${issue2.origin}`;
        default:
          return `Nevalida enigo`;
      }
    };
  };
  function eo_default() {
    return {
      localeError: error10()
    };
  }

  // node_modules/zod/v4/locales/es.js
  var error11 = () => {
    const Sizable = {
      string: { unit: "caracteres", verb: "tener" },
      file: { unit: "bytes", verb: "tener" },
      array: { unit: "elementos", verb: "tener" },
      set: { unit: "elementos", verb: "tener" }
    };
    const TypeNames = {
      string: "texto",
      number: "n\xFAmero",
      boolean: "booleano",
      array: "arreglo",
      object: "objeto",
      set: "conjunto",
      file: "archivo",
      date: "fecha",
      bigint: "n\xFAmero grande",
      symbol: "s\xEDmbolo",
      undefined: "indefinido",
      null: "nulo",
      function: "funci\xF3n",
      map: "mapa",
      record: "registro",
      tuple: "tupla",
      enum: "enumeraci\xF3n",
      union: "uni\xF3n",
      literal: "literal",
      promise: "promesa",
      void: "vac\xEDo",
      never: "nunca",
      unknown: "desconocido",
      any: "cualquiera"
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    function getTypeName(type) {
      return TypeNames[type] ?? type;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype) {
            return data.constructor.name;
          }
          return "object";
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "entrada",
      email: "direcci\xF3n de correo electr\xF3nico",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "fecha y hora ISO",
      date: "fecha ISO",
      time: "hora ISO",
      duration: "duraci\xF3n ISO",
      ipv4: "direcci\xF3n IPv4",
      ipv6: "direcci\xF3n IPv6",
      cidrv4: "rango IPv4",
      cidrv6: "rango IPv6",
      base64: "cadena codificada en base64",
      base64url: "URL codificada en base64",
      json_string: "cadena JSON",
      e164: "n\xFAmero E.164",
      jwt: "JWT",
      template_literal: "entrada"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Entrada inv\xE1lida: se esperaba ${getTypeName(issue2.expected)}, recibido ${getTypeName(parsedType8(issue2.input))}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Entrada inv\xE1lida: se esperaba ${stringifyPrimitive(issue2.values[0])}`;
          return `Opci\xF3n inv\xE1lida: se esperaba una de ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          const origin = getTypeName(issue2.origin);
          if (sizing)
            return `Demasiado grande: se esperaba que ${origin ?? "valor"} tuviera ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
          return `Demasiado grande: se esperaba que ${origin ?? "valor"} fuera ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          const origin = getTypeName(issue2.origin);
          if (sizing) {
            return `Demasiado peque\xF1o: se esperaba que ${origin} tuviera ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Demasiado peque\xF1o: se esperaba que ${origin} fuera ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Cadena inv\xE1lida: debe comenzar con "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Cadena inv\xE1lida: debe terminar en "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Cadena inv\xE1lida: debe incluir "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Cadena inv\xE1lida: debe coincidir con el patr\xF3n ${_issue.pattern}`;
          return `Inv\xE1lido ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE1lido: debe ser m\xFAltiplo de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Llave${issue2.keys.length > 1 ? "s" : ""} desconocida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Llave inv\xE1lida en ${getTypeName(issue2.origin)}`;
        case "invalid_union":
          return "Entrada inv\xE1lida";
        case "invalid_element":
          return `Valor inv\xE1lido en ${getTypeName(issue2.origin)}`;
        default:
          return `Entrada inv\xE1lida`;
      }
    };
  };
  function es_default() {
    return {
      localeError: error11()
    };
  }

  // node_modules/zod/v4/locales/fa.js
  var error12 = () => {
    const Sizable = {
      string: { unit: "\u06A9\u0627\u0631\u0627\u06A9\u062A\u0631", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
      file: { unit: "\u0628\u0627\u06CC\u062A", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
      array: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" },
      set: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0639\u062F\u062F";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u0622\u0631\u0627\u06CC\u0647";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0648\u0631\u0648\u062F\u06CC",
      email: "\u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644",
      url: "URL",
      emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u062A\u0627\u0631\u06CC\u062E \u0648 \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
      date: "\u062A\u0627\u0631\u06CC\u062E \u0627\u06CC\u0632\u0648",
      time: "\u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
      duration: "\u0645\u062F\u062A \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648",
      ipv4: "IPv4 \u0622\u062F\u0631\u0633",
      ipv6: "IPv6 \u0622\u062F\u0631\u0633",
      cidrv4: "IPv4 \u062F\u0627\u0645\u0646\u0647",
      cidrv6: "IPv6 \u062F\u0627\u0645\u0646\u0647",
      base64: "base64-encoded \u0631\u0634\u062A\u0647",
      base64url: "base64url-encoded \u0631\u0634\u062A\u0647",
      json_string: "JSON \u0631\u0634\u062A\u0647",
      e164: "E.164 \u0639\u062F\u062F",
      jwt: "JWT",
      template_literal: "\u0648\u0631\u0648\u062F\u06CC"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${issue2.expected} \u0645\u06CC\u200C\u0628\u0648\u062F\u060C ${parsedType8(issue2.input)} \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F`;
        case "invalid_value":
          if (issue2.values.length === 1) {
            return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${stringifyPrimitive(issue2.values[0])} \u0645\u06CC\u200C\u0628\u0648\u062F`;
          }
          return `\u06AF\u0632\u06CC\u0646\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A \u06CC\u06A9\u06CC \u0627\u0632 ${joinValues(issue2.values, "|")} \u0645\u06CC\u200C\u0628\u0648\u062F`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${issue2.origin ?? "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0639\u0646\u0635\u0631"} \u0628\u0627\u0634\u062F`;
          }
          return `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${issue2.origin ?? "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} \u0628\u0627\u0634\u062F`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0628\u0627\u0634\u062F`;
          }
          return `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} \u0628\u0627\u0634\u062F`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${_issue.prefix}" \u0634\u0631\u0648\u0639 \u0634\u0648\u062F`;
          }
          if (_issue.format === "ends_with") {
            return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${_issue.suffix}" \u062A\u0645\u0627\u0645 \u0634\u0648\u062F`;
          }
          if (_issue.format === "includes") {
            return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0634\u0627\u0645\u0644 "${_issue.includes}" \u0628\u0627\u0634\u062F`;
          }
          if (_issue.format === "regex") {
            return `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 \u0627\u0644\u06AF\u0648\u06CC ${_issue.pattern} \u0645\u0637\u0627\u0628\u0642\u062A \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F`;
          }
          return `${Nouns[_issue.format] ?? issue2.format} \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
        }
        case "not_multiple_of":
          return `\u0639\u062F\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0645\u0636\u0631\u0628 ${issue2.divisor} \u0628\u0627\u0634\u062F`;
        case "unrecognized_keys":
          return `\u06A9\u0644\u06CC\u062F${issue2.keys.length > 1 ? "\u0647\u0627\u06CC" : ""} \u0646\u0627\u0634\u0646\u0627\u0633: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u06A9\u0644\u06CC\u062F \u0646\u0627\u0634\u0646\u0627\u0633 \u062F\u0631 ${issue2.origin}`;
        case "invalid_union":
          return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
        case "invalid_element":
          return `\u0645\u0642\u062F\u0627\u0631 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u062F\u0631 ${issue2.origin}`;
        default:
          return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
      }
    };
  };
  function fa_default() {
    return {
      localeError: error12()
    };
  }

  // node_modules/zod/v4/locales/fi.js
  var error13 = () => {
    const Sizable = {
      string: { unit: "merkki\xE4", subject: "merkkijonon" },
      file: { unit: "tavua", subject: "tiedoston" },
      array: { unit: "alkiota", subject: "listan" },
      set: { unit: "alkiota", subject: "joukon" },
      number: { unit: "", subject: "luvun" },
      bigint: { unit: "", subject: "suuren kokonaisluvun" },
      int: { unit: "", subject: "kokonaisluvun" },
      date: { unit: "", subject: "p\xE4iv\xE4m\xE4\xE4r\xE4n" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "s\xE4\xE4nn\xF6llinen lauseke",
      email: "s\xE4hk\xF6postiosoite",
      url: "URL-osoite",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO-aikaleima",
      date: "ISO-p\xE4iv\xE4m\xE4\xE4r\xE4",
      time: "ISO-aika",
      duration: "ISO-kesto",
      ipv4: "IPv4-osoite",
      ipv6: "IPv6-osoite",
      cidrv4: "IPv4-alue",
      cidrv6: "IPv6-alue",
      base64: "base64-koodattu merkkijono",
      base64url: "base64url-koodattu merkkijono",
      json_string: "JSON-merkkijono",
      e164: "E.164-luku",
      jwt: "JWT",
      template_literal: "templaattimerkkijono"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Virheellinen tyyppi: odotettiin ${issue2.expected}, oli ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Virheellinen sy\xF6te: t\xE4ytyy olla ${stringifyPrimitive(issue2.values[0])}`;
          return `Virheellinen valinta: t\xE4ytyy olla yksi seuraavista: ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Liian suuri: ${sizing.subject} t\xE4ytyy olla ${adj}${issue2.maximum.toString()} ${sizing.unit}`.trim();
          }
          return `Liian suuri: arvon t\xE4ytyy olla ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Liian pieni: ${sizing.subject} t\xE4ytyy olla ${adj}${issue2.minimum.toString()} ${sizing.unit}`.trim();
          }
          return `Liian pieni: arvon t\xE4ytyy olla ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Virheellinen sy\xF6te: t\xE4ytyy alkaa "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Virheellinen sy\xF6te: t\xE4ytyy loppua "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Virheellinen sy\xF6te: t\xE4ytyy sis\xE4lt\xE4\xE4 "${_issue.includes}"`;
          if (_issue.format === "regex") {
            return `Virheellinen sy\xF6te: t\xE4ytyy vastata s\xE4\xE4nn\xF6llist\xE4 lauseketta ${_issue.pattern}`;
          }
          return `Virheellinen ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Virheellinen luku: t\xE4ytyy olla luvun ${issue2.divisor} monikerta`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return "Virheellinen avain tietueessa";
        case "invalid_union":
          return "Virheellinen unioni";
        case "invalid_element":
          return "Virheellinen arvo joukossa";
        default:
          return `Virheellinen sy\xF6te`;
      }
    };
  };
  function fi_default() {
    return {
      localeError: error13()
    };
  }

  // node_modules/zod/v4/locales/fr.js
  var error14 = () => {
    const Sizable = {
      string: { unit: "caract\xE8res", verb: "avoir" },
      file: { unit: "octets", verb: "avoir" },
      array: { unit: "\xE9l\xE9ments", verb: "avoir" },
      set: { unit: "\xE9l\xE9ments", verb: "avoir" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "nombre";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "tableau";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "entr\xE9e",
      email: "adresse e-mail",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "date et heure ISO",
      date: "date ISO",
      time: "heure ISO",
      duration: "dur\xE9e ISO",
      ipv4: "adresse IPv4",
      ipv6: "adresse IPv6",
      cidrv4: "plage IPv4",
      cidrv6: "plage IPv6",
      base64: "cha\xEEne encod\xE9e en base64",
      base64url: "cha\xEEne encod\xE9e en base64url",
      json_string: "cha\xEEne JSON",
      e164: "num\xE9ro E.164",
      jwt: "JWT",
      template_literal: "entr\xE9e"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Entr\xE9e invalide : ${issue2.expected} attendu, ${parsedType8(issue2.input)} re\xE7u`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Entr\xE9e invalide : ${stringifyPrimitive(issue2.values[0])} attendu`;
          return `Option invalide : une valeur parmi ${joinValues(issue2.values, "|")} attendue`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Trop grand : ${issue2.origin ?? "valeur"} doit ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\xE9l\xE9ment(s)"}`;
          return `Trop grand : ${issue2.origin ?? "valeur"} doit \xEAtre ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Trop petit : ${issue2.origin} doit ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Trop petit : ${issue2.origin} doit \xEAtre ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Cha\xEEne invalide : doit commencer par "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Cha\xEEne invalide : doit se terminer par "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Cha\xEEne invalide : doit inclure "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Cha\xEEne invalide : doit correspondre au mod\xE8le ${_issue.pattern}`;
          return `${Nouns[_issue.format] ?? issue2.format} invalide`;
        }
        case "not_multiple_of":
          return `Nombre invalide : doit \xEAtre un multiple de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Cl\xE9${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Cl\xE9 invalide dans ${issue2.origin}`;
        case "invalid_union":
          return "Entr\xE9e invalide";
        case "invalid_element":
          return `Valeur invalide dans ${issue2.origin}`;
        default:
          return `Entr\xE9e invalide`;
      }
    };
  };
  function fr_default() {
    return {
      localeError: error14()
    };
  }

  // node_modules/zod/v4/locales/fr-CA.js
  var error15 = () => {
    const Sizable = {
      string: { unit: "caract\xE8res", verb: "avoir" },
      file: { unit: "octets", verb: "avoir" },
      array: { unit: "\xE9l\xE9ments", verb: "avoir" },
      set: { unit: "\xE9l\xE9ments", verb: "avoir" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "entr\xE9e",
      email: "adresse courriel",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "date-heure ISO",
      date: "date ISO",
      time: "heure ISO",
      duration: "dur\xE9e ISO",
      ipv4: "adresse IPv4",
      ipv6: "adresse IPv6",
      cidrv4: "plage IPv4",
      cidrv6: "plage IPv6",
      base64: "cha\xEEne encod\xE9e en base64",
      base64url: "cha\xEEne encod\xE9e en base64url",
      json_string: "cha\xEEne JSON",
      e164: "num\xE9ro E.164",
      jwt: "JWT",
      template_literal: "entr\xE9e"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Entr\xE9e invalide : attendu ${issue2.expected}, re\xE7u ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Entr\xE9e invalide : attendu ${stringifyPrimitive(issue2.values[0])}`;
          return `Option invalide : attendu l'une des valeurs suivantes ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "\u2264" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} ait ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
          return `Trop grand : attendu que ${issue2.origin ?? "la valeur"} soit ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? "\u2265" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Trop petit : attendu que ${issue2.origin} ait ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Trop petit : attendu que ${issue2.origin} soit ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Cha\xEEne invalide : doit commencer par "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Cha\xEEne invalide : doit se terminer par "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Cha\xEEne invalide : doit inclure "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Cha\xEEne invalide : doit correspondre au motif ${_issue.pattern}`;
          return `${Nouns[_issue.format] ?? issue2.format} invalide`;
        }
        case "not_multiple_of":
          return `Nombre invalide : doit \xEAtre un multiple de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Cl\xE9${issue2.keys.length > 1 ? "s" : ""} non reconnue${issue2.keys.length > 1 ? "s" : ""} : ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Cl\xE9 invalide dans ${issue2.origin}`;
        case "invalid_union":
          return "Entr\xE9e invalide";
        case "invalid_element":
          return `Valeur invalide dans ${issue2.origin}`;
        default:
          return `Entr\xE9e invalide`;
      }
    };
  };
  function fr_CA_default() {
    return {
      localeError: error15()
    };
  }

  // node_modules/zod/v4/locales/he.js
  var error16 = () => {
    const Sizable = {
      string: { unit: "\u05D0\u05D5\u05EA\u05D9\u05D5\u05EA", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" },
      file: { unit: "\u05D1\u05D9\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" },
      array: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" },
      set: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u05E7\u05DC\u05D8",
      email: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC",
      url: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05E8\u05E9\u05EA",
      emoji: "\u05D0\u05D9\u05DE\u05D5\u05D2'\u05D9",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05D6\u05DE\u05DF ISO",
      date: "\u05EA\u05D0\u05E8\u05D9\u05DA ISO",
      time: "\u05D6\u05DE\u05DF ISO",
      duration: "\u05DE\u05E9\u05DA \u05D6\u05DE\u05DF ISO",
      ipv4: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv4",
      ipv6: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv6",
      cidrv4: "\u05D8\u05D5\u05D5\u05D7 IPv4",
      cidrv6: "\u05D8\u05D5\u05D5\u05D7 IPv6",
      base64: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64",
      base64url: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64 \u05DC\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E8\u05E9\u05EA",
      json_string: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA JSON",
      e164: "\u05DE\u05E1\u05E4\u05E8 E.164",
      jwt: "JWT",
      template_literal: "\u05E7\u05DC\u05D8"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA ${issue2.expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA ${stringifyPrimitive(issue2.values[0])}`;
          return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05D0\u05D7\u05EA \u05DE\u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA  ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${issue2.origin ?? "value"} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"}`;
          return `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${issue2.origin ?? "value"} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${issue2.origin} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${issue2.origin} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1"${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05DB\u05DC\u05D5\u05DC "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05EA\u05D1\u05E0\u05D9\u05EA ${_issue.pattern}`;
          return `${Nouns[_issue.format] ?? issue2.format} \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF`;
        }
        case "not_multiple_of":
          return `\u05DE\u05E1\u05E4\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05DB\u05E4\u05DC\u05D4 \u05E9\u05DC ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u05DE\u05E4\u05EA\u05D7${issue2.keys.length > 1 ? "\u05D5\u05EA" : ""} \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4${issue2.keys.length > 1 ? "\u05D9\u05DD" : "\u05D4"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u05DE\u05E4\u05EA\u05D7 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${issue2.origin}`;
        case "invalid_union":
          return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
        case "invalid_element":
          return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${issue2.origin}`;
        default:
          return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF`;
      }
    };
  };
  function he_default() {
    return {
      localeError: error16()
    };
  }

  // node_modules/zod/v4/locales/hu.js
  var error17 = () => {
    const Sizable = {
      string: { unit: "karakter", verb: "legyen" },
      file: { unit: "byte", verb: "legyen" },
      array: { unit: "elem", verb: "legyen" },
      set: { unit: "elem", verb: "legyen" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "sz\xE1m";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "t\xF6mb";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "bemenet",
      email: "email c\xEDm",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO id\u0151b\xE9lyeg",
      date: "ISO d\xE1tum",
      time: "ISO id\u0151",
      duration: "ISO id\u0151intervallum",
      ipv4: "IPv4 c\xEDm",
      ipv6: "IPv6 c\xEDm",
      cidrv4: "IPv4 tartom\xE1ny",
      cidrv6: "IPv6 tartom\xE1ny",
      base64: "base64-k\xF3dolt string",
      base64url: "base64url-k\xF3dolt string",
      json_string: "JSON string",
      e164: "E.164 sz\xE1m",
      jwt: "JWT",
      template_literal: "bemenet"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${issue2.expected}, a kapott \xE9rt\xE9k ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${stringifyPrimitive(issue2.values[0])}`;
          return `\xC9rv\xE9nytelen opci\xF3: valamelyik \xE9rt\xE9k v\xE1rt ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `T\xFAl nagy: ${issue2.origin ?? "\xE9rt\xE9k"} m\xE9rete t\xFAl nagy ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elem"}`;
          return `T\xFAl nagy: a bemeneti \xE9rt\xE9k ${issue2.origin ?? "\xE9rt\xE9k"} t\xFAl nagy: ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${issue2.origin} m\xE9rete t\xFAl kicsi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${issue2.origin} t\xFAl kicsi ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\xC9rv\xE9nytelen string: "${_issue.prefix}" \xE9rt\xE9kkel kell kezd\u0151dnie`;
          if (_issue.format === "ends_with")
            return `\xC9rv\xE9nytelen string: "${_issue.suffix}" \xE9rt\xE9kkel kell v\xE9gz\u0151dnie`;
          if (_issue.format === "includes")
            return `\xC9rv\xE9nytelen string: "${_issue.includes}" \xE9rt\xE9ket kell tartalmaznia`;
          if (_issue.format === "regex")
            return `\xC9rv\xE9nytelen string: ${_issue.pattern} mint\xE1nak kell megfelelnie`;
          return `\xC9rv\xE9nytelen ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\xC9rv\xE9nytelen sz\xE1m: ${issue2.divisor} t\xF6bbsz\xF6r\xF6s\xE9nek kell lennie`;
        case "unrecognized_keys":
          return `Ismeretlen kulcs${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\xC9rv\xE9nytelen kulcs ${issue2.origin}`;
        case "invalid_union":
          return "\xC9rv\xE9nytelen bemenet";
        case "invalid_element":
          return `\xC9rv\xE9nytelen \xE9rt\xE9k: ${issue2.origin}`;
        default:
          return `\xC9rv\xE9nytelen bemenet`;
      }
    };
  };
  function hu_default() {
    return {
      localeError: error17()
    };
  }

  // node_modules/zod/v4/locales/id.js
  var error18 = () => {
    const Sizable = {
      string: { unit: "karakter", verb: "memiliki" },
      file: { unit: "byte", verb: "memiliki" },
      array: { unit: "item", verb: "memiliki" },
      set: { unit: "item", verb: "memiliki" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "input",
      email: "alamat email",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "tanggal dan waktu format ISO",
      date: "tanggal format ISO",
      time: "jam format ISO",
      duration: "durasi format ISO",
      ipv4: "alamat IPv4",
      ipv6: "alamat IPv6",
      cidrv4: "rentang alamat IPv4",
      cidrv6: "rentang alamat IPv6",
      base64: "string dengan enkode base64",
      base64url: "string dengan enkode base64url",
      json_string: "string JSON",
      e164: "angka E.164",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Input tidak valid: diharapkan ${issue2.expected}, diterima ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Input tidak valid: diharapkan ${stringifyPrimitive(issue2.values[0])}`;
          return `Pilihan tidak valid: diharapkan salah satu dari ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} memiliki ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
          return `Terlalu besar: diharapkan ${issue2.origin ?? "value"} menjadi ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Terlalu kecil: diharapkan ${issue2.origin} memiliki ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Terlalu kecil: diharapkan ${issue2.origin} menjadi ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `String tidak valid: harus dimulai dengan "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `String tidak valid: harus berakhir dengan "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `String tidak valid: harus menyertakan "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `String tidak valid: harus sesuai pola ${_issue.pattern}`;
          return `${Nouns[_issue.format] ?? issue2.format} tidak valid`;
        }
        case "not_multiple_of":
          return `Angka tidak valid: harus kelipatan dari ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Kunci tidak dikenali ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Kunci tidak valid di ${issue2.origin}`;
        case "invalid_union":
          return "Input tidak valid";
        case "invalid_element":
          return `Nilai tidak valid di ${issue2.origin}`;
        default:
          return `Input tidak valid`;
      }
    };
  };
  function id_default() {
    return {
      localeError: error18()
    };
  }

  // node_modules/zod/v4/locales/is.js
  var parsedType4 = (data) => {
    const t4 = typeof data;
    switch (t4) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "n\xFAmer";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "fylki";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t4;
  };
  var error19 = () => {
    const Sizable = {
      string: { unit: "stafi", verb: "a\xF0 hafa" },
      file: { unit: "b\xE6ti", verb: "a\xF0 hafa" },
      array: { unit: "hluti", verb: "a\xF0 hafa" },
      set: { unit: "hluti", verb: "a\xF0 hafa" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const Nouns = {
      regex: "gildi",
      email: "netfang",
      url: "vefsl\xF3\xF0",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO dagsetning og t\xEDmi",
      date: "ISO dagsetning",
      time: "ISO t\xEDmi",
      duration: "ISO t\xEDmalengd",
      ipv4: "IPv4 address",
      ipv6: "IPv6 address",
      cidrv4: "IPv4 range",
      cidrv6: "IPv6 range",
      base64: "base64-encoded strengur",
      base64url: "base64url-encoded strengur",
      json_string: "JSON strengur",
      e164: "E.164 t\xF6lugildi",
      jwt: "JWT",
      template_literal: "gildi"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Rangt gildi: \xDE\xFA sl\xF3st inn ${parsedType4(issue2.input)} \xFEar sem \xE1 a\xF0 vera ${issue2.expected}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Rangt gildi: gert r\xE1\xF0 fyrir ${stringifyPrimitive(issue2.values[0])}`;
          return `\xD3gilt val: m\xE1 vera eitt af eftirfarandi ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin ?? "gildi"} hafi ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "hluti"}`;
          return `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin ?? "gildi"} s\xE9 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin} hafi ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${issue2.origin} s\xE9 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\xD3gildur strengur: ver\xF0ur a\xF0 byrja \xE1 "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `\xD3gildur strengur: ver\xF0ur a\xF0 enda \xE1 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\xD3gildur strengur: ver\xF0ur a\xF0 innihalda "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\xD3gildur strengur: ver\xF0ur a\xF0 fylgja mynstri ${_issue.pattern}`;
          return `Rangt ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `R\xF6ng tala: ver\xF0ur a\xF0 vera margfeldi af ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\xD3\xFEekkt ${issue2.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Rangur lykill \xED ${issue2.origin}`;
        case "invalid_union":
          return "Rangt gildi";
        case "invalid_element":
          return `Rangt gildi \xED ${issue2.origin}`;
        default:
          return `Rangt gildi`;
      }
    };
  };
  function is_default() {
    return {
      localeError: error19()
    };
  }

  // node_modules/zod/v4/locales/it.js
  var error20 = () => {
    const Sizable = {
      string: { unit: "caratteri", verb: "avere" },
      file: { unit: "byte", verb: "avere" },
      array: { unit: "elementi", verb: "avere" },
      set: { unit: "elementi", verb: "avere" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "numero";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "vettore";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "input",
      email: "indirizzo email",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "data e ora ISO",
      date: "data ISO",
      time: "ora ISO",
      duration: "durata ISO",
      ipv4: "indirizzo IPv4",
      ipv6: "indirizzo IPv6",
      cidrv4: "intervallo IPv4",
      cidrv6: "intervallo IPv6",
      base64: "stringa codificata in base64",
      base64url: "URL codificata in base64",
      json_string: "stringa JSON",
      e164: "numero E.164",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Input non valido: atteso ${issue2.expected}, ricevuto ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Input non valido: atteso ${stringifyPrimitive(issue2.values[0])}`;
          return `Opzione non valida: atteso uno tra ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Troppo grande: ${issue2.origin ?? "valore"} deve avere ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementi"}`;
          return `Troppo grande: ${issue2.origin ?? "valore"} deve essere ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Troppo piccolo: ${issue2.origin} deve avere ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Troppo piccolo: ${issue2.origin} deve essere ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Stringa non valida: deve iniziare con "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Stringa non valida: deve terminare con "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Stringa non valida: deve includere "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Stringa non valida: deve corrispondere al pattern ${_issue.pattern}`;
          return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Numero non valido: deve essere un multiplo di ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Chiav${issue2.keys.length > 1 ? "i" : "e"} non riconosciut${issue2.keys.length > 1 ? "e" : "a"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Chiave non valida in ${issue2.origin}`;
        case "invalid_union":
          return "Input non valido";
        case "invalid_element":
          return `Valore non valido in ${issue2.origin}`;
        default:
          return `Input non valido`;
      }
    };
  };
  function it_default() {
    return {
      localeError: error20()
    };
  }

  // node_modules/zod/v4/locales/ja.js
  var error21 = () => {
    const Sizable = {
      string: { unit: "\u6587\u5B57", verb: "\u3067\u3042\u308B" },
      file: { unit: "\u30D0\u30A4\u30C8", verb: "\u3067\u3042\u308B" },
      array: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" },
      set: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u6570\u5024";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u914D\u5217";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u5165\u529B\u5024",
      email: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9",
      url: "URL",
      emoji: "\u7D75\u6587\u5B57",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO\u65E5\u6642",
      date: "ISO\u65E5\u4ED8",
      time: "ISO\u6642\u523B",
      duration: "ISO\u671F\u9593",
      ipv4: "IPv4\u30A2\u30C9\u30EC\u30B9",
      ipv6: "IPv6\u30A2\u30C9\u30EC\u30B9",
      cidrv4: "IPv4\u7BC4\u56F2",
      cidrv6: "IPv6\u7BC4\u56F2",
      base64: "base64\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
      base64url: "base64url\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217",
      json_string: "JSON\u6587\u5B57\u5217",
      e164: "E.164\u756A\u53F7",
      jwt: "JWT",
      template_literal: "\u5165\u529B\u5024"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u7121\u52B9\u306A\u5165\u529B: ${issue2.expected}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${parsedType8(issue2.input)}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u7121\u52B9\u306A\u5165\u529B: ${stringifyPrimitive(issue2.values[0])}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F`;
          return `\u7121\u52B9\u306A\u9078\u629E: ${joinValues(issue2.values, "\u3001")}\u306E\u3044\u305A\u308C\u304B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        case "too_big": {
          const adj = issue2.inclusive ? "\u4EE5\u4E0B\u3067\u3042\u308B" : "\u3088\u308A\u5C0F\u3055\u3044";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u5927\u304D\u3059\u304E\u308B\u5024: ${issue2.origin ?? "\u5024"}\u306F${issue2.maximum.toString()}${sizing.unit ?? "\u8981\u7D20"}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          return `\u5927\u304D\u3059\u304E\u308B\u5024: ${issue2.origin ?? "\u5024"}\u306F${issue2.maximum.toString()}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? "\u4EE5\u4E0A\u3067\u3042\u308B" : "\u3088\u308A\u5927\u304D\u3044";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${issue2.origin}\u306F${issue2.minimum.toString()}${sizing.unit}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          return `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${issue2.origin}\u306F${issue2.minimum.toString()}${adj}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.prefix}"\u3067\u59CB\u307E\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          if (_issue.format === "ends_with")
            return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.suffix}"\u3067\u7D42\u308F\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          if (_issue.format === "includes")
            return `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${_issue.includes}"\u3092\u542B\u3080\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          if (_issue.format === "regex")
            return `\u7121\u52B9\u306A\u6587\u5B57\u5217: \u30D1\u30BF\u30FC\u30F3${_issue.pattern}\u306B\u4E00\u81F4\u3059\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
          return `\u7121\u52B9\u306A${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u7121\u52B9\u306A\u6570\u5024: ${issue2.divisor}\u306E\u500D\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        case "unrecognized_keys":
          return `\u8A8D\u8B58\u3055\u308C\u3066\u3044\u306A\u3044\u30AD\u30FC${issue2.keys.length > 1 ? "\u7FA4" : ""}: ${joinValues(issue2.keys, "\u3001")}`;
        case "invalid_key":
          return `${issue2.origin}\u5185\u306E\u7121\u52B9\u306A\u30AD\u30FC`;
        case "invalid_union":
          return "\u7121\u52B9\u306A\u5165\u529B";
        case "invalid_element":
          return `${issue2.origin}\u5185\u306E\u7121\u52B9\u306A\u5024`;
        default:
          return `\u7121\u52B9\u306A\u5165\u529B`;
      }
    };
  };
  function ja_default() {
    return {
      localeError: error21()
    };
  }

  // node_modules/zod/v4/locales/ka.js
  var parsedType5 = (data) => {
    const t4 = typeof data;
    switch (t4) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "\u10DB\u10D0\u10E1\u10D8\u10D5\u10D8";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    const typeMap = {
      string: "\u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
      boolean: "\u10D1\u10E3\u10DA\u10D4\u10D0\u10DC\u10D8",
      undefined: "undefined",
      bigint: "bigint",
      symbol: "symbol",
      function: "\u10E4\u10E3\u10DC\u10E5\u10EA\u10D8\u10D0"
    };
    return typeMap[t4] ?? t4;
  };
  var error22 = () => {
    const Sizable = {
      string: { unit: "\u10E1\u10D8\u10DB\u10D1\u10DD\u10DA\u10DD", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
      file: { unit: "\u10D1\u10D0\u10D8\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
      array: { unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" },
      set: { unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const Nouns = {
      regex: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0",
      email: "\u10D4\u10DA-\u10E4\u10DD\u10E1\u10E2\u10D8\u10E1 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
      url: "URL",
      emoji: "\u10D4\u10DB\u10DD\u10EF\u10D8",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8-\u10D3\u10E0\u10DD",
      date: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8",
      time: "\u10D3\u10E0\u10DD",
      duration: "\u10EE\u10D0\u10DC\u10D2\u10E0\u10EB\u10DA\u10D8\u10D5\u10DD\u10D1\u10D0",
      ipv4: "IPv4 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
      ipv6: "IPv6 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8",
      cidrv4: "IPv4 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8",
      cidrv6: "IPv6 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8",
      base64: "base64-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
      base64url: "base64url-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
      json_string: "JSON \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8",
      e164: "E.164 \u10DC\u10DD\u10DB\u10D4\u10E0\u10D8",
      jwt: "JWT",
      template_literal: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.expected}, \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8 ${parsedType5(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${stringifyPrimitive(issue2.values[0])}`;
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D0\u10E0\u10D8\u10D0\u10DC\u10E2\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8\u10D0 \u10D4\u10E0\u10D7-\u10D4\u10E0\u10D7\u10D8 ${joinValues(issue2.values, "|")}-\u10D3\u10D0\u10DC`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin ?? "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit}`;
          return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin ?? "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} \u10D8\u10E7\u10DD\u10E1 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${issue2.origin} \u10D8\u10E7\u10DD\u10E1 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10EC\u10E7\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${_issue.prefix}"-\u10D8\u10D7`;
          }
          if (_issue.format === "ends_with")
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10DB\u10D7\u10D0\u10D5\u10E0\u10D3\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${_issue.suffix}"-\u10D8\u10D7`;
          if (_issue.format === "includes")
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1 "${_issue.includes}"-\u10E1`;
          if (_issue.format === "regex")
            return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D4\u10E1\u10D0\u10D1\u10D0\u10DB\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 \u10E8\u10D0\u10D1\u10DA\u10DD\u10DC\u10E1 ${_issue.pattern}`;
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E0\u10D8\u10EA\u10EE\u10D5\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10E7\u10DD\u10E1 ${issue2.divisor}-\u10D8\u10E1 \u10EF\u10D4\u10E0\u10D0\u10D3\u10D8`;
        case "unrecognized_keys":
          return `\u10E3\u10EA\u10DC\u10DD\u10D1\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1${issue2.keys.length > 1 ? "\u10D4\u10D1\u10D8" : "\u10D8"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1\u10D8 ${issue2.origin}-\u10E8\u10D8`;
        case "invalid_union":
          return "\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0";
        case "invalid_element":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0 ${issue2.origin}-\u10E8\u10D8`;
        default:
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0`;
      }
    };
  };
  function ka_default() {
    return {
      localeError: error22()
    };
  }

  // node_modules/zod/v4/locales/km.js
  var error23 = () => {
    const Sizable = {
      string: { unit: "\u178F\u17BD\u17A2\u1780\u17D2\u179F\u179A", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
      file: { unit: "\u1794\u17C3", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
      array: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" },
      set: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "\u1798\u17B7\u1793\u1798\u17C2\u1793\u1787\u17B6\u179B\u17C1\u1781 (NaN)" : "\u179B\u17C1\u1781";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u17A2\u17B6\u179A\u17C1 (Array)";
          }
          if (data === null) {
            return "\u1782\u17D2\u1798\u17B6\u1793\u178F\u1798\u17D2\u179B\u17C3 (null)";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B",
      email: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793\u17A2\u17CA\u17B8\u1798\u17C2\u179B",
      url: "URL",
      emoji: "\u179F\u1789\u17D2\u1789\u17B6\u17A2\u17B6\u179A\u1798\u17D2\u1798\u178E\u17CD",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 \u1793\u17B7\u1784\u1798\u17C9\u17C4\u1784 ISO",
      date: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 ISO",
      time: "\u1798\u17C9\u17C4\u1784 ISO",
      duration: "\u179A\u1799\u17C8\u1796\u17C1\u179B ISO",
      ipv4: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4",
      ipv6: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6",
      cidrv4: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4",
      cidrv6: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6",
      base64: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64",
      base64url: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64url",
      json_string: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A JSON",
      e164: "\u179B\u17C1\u1781 E.164",
      jwt: "JWT",
      template_literal: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.expected} \u1794\u17C9\u17BB\u1793\u17D2\u178F\u17C2\u1791\u1791\u17BD\u179B\u1794\u17B6\u1793 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${stringifyPrimitive(issue2.values[0])}`;
          return `\u1787\u1798\u17D2\u179A\u17BE\u179F\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1787\u17B6\u1798\u17BD\u1799\u1780\u17D2\u1793\u17BB\u1784\u1785\u17C6\u178E\u17C4\u1798 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin ?? "\u178F\u1798\u17D2\u179B\u17C3"} ${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "\u1792\u17B6\u178F\u17BB"}`;
          return `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin ?? "\u178F\u1798\u17D2\u179B\u17C3"} ${adj} ${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin} ${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${issue2.origin} ${adj} ${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1785\u17B6\u1794\u17CB\u1795\u17D2\u178F\u17BE\u1798\u178A\u17C4\u1799 "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1794\u1789\u17D2\u1785\u1794\u17CB\u178A\u17C4\u1799 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1798\u17B6\u1793 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1795\u17D2\u1782\u17BC\u1795\u17D2\u1782\u1784\u1793\u17B9\u1784\u1791\u1798\u17D2\u179A\u1784\u17CB\u178A\u17C2\u179B\u1794\u17B6\u1793\u1780\u17C6\u178E\u178F\u17CB ${_issue.pattern}`;
          return `\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u179B\u17C1\u1781\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1787\u17B6\u1796\u17A0\u17BB\u1782\u17BB\u178E\u1793\u17C3 ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u179A\u1780\u1783\u17BE\u1789\u179F\u17C4\u1798\u17B7\u1793\u179F\u17D2\u1782\u17B6\u179B\u17CB\u17D6 ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u179F\u17C4\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${issue2.origin}`;
        case "invalid_union":
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C`;
        case "invalid_element":
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${issue2.origin}`;
        default:
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C`;
      }
    };
  };
  function km_default() {
    return {
      localeError: error23()
    };
  }

  // node_modules/zod/v4/locales/kh.js
  function kh_default() {
    return km_default();
  }

  // node_modules/zod/v4/locales/ko.js
  var error24 = () => {
    const Sizable = {
      string: { unit: "\uBB38\uC790", verb: "to have" },
      file: { unit: "\uBC14\uC774\uD2B8", verb: "to have" },
      array: { unit: "\uAC1C", verb: "to have" },
      set: { unit: "\uAC1C", verb: "to have" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\uC785\uB825",
      email: "\uC774\uBA54\uC77C \uC8FC\uC18C",
      url: "URL",
      emoji: "\uC774\uBAA8\uC9C0",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \uB0A0\uC9DC\uC2DC\uAC04",
      date: "ISO \uB0A0\uC9DC",
      time: "ISO \uC2DC\uAC04",
      duration: "ISO \uAE30\uAC04",
      ipv4: "IPv4 \uC8FC\uC18C",
      ipv6: "IPv6 \uC8FC\uC18C",
      cidrv4: "IPv4 \uBC94\uC704",
      cidrv6: "IPv6 \uBC94\uC704",
      base64: "base64 \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
      base64url: "base64url \uC778\uCF54\uB529 \uBB38\uC790\uC5F4",
      json_string: "JSON \uBB38\uC790\uC5F4",
      e164: "E.164 \uBC88\uD638",
      jwt: "JWT",
      template_literal: "\uC785\uB825"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 ${issue2.expected}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${parsedType8(issue2.input)}\uC785\uB2C8\uB2E4`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\uC798\uBABB\uB41C \uC785\uB825: \uAC12\uC740 ${stringifyPrimitive(issue2.values[0])} \uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4`;
          return `\uC798\uBABB\uB41C \uC635\uC158: ${joinValues(issue2.values, "\uB610\uB294 ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
        case "too_big": {
          const adj = issue2.inclusive ? "\uC774\uD558" : "\uBBF8\uB9CC";
          const suffix = adj === "\uBBF8\uB9CC" ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4";
          const sizing = getSizing(issue2.origin);
          const unit = sizing?.unit ?? "\uC694\uC18C";
          if (sizing)
            return `${issue2.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${issue2.maximum.toString()}${unit} ${adj}${suffix}`;
          return `${issue2.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${issue2.maximum.toString()} ${adj}${suffix}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? "\uC774\uC0C1" : "\uCD08\uACFC";
          const suffix = adj === "\uC774\uC0C1" ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4";
          const sizing = getSizing(issue2.origin);
          const unit = sizing?.unit ?? "\uC694\uC18C";
          if (sizing) {
            return `${issue2.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${issue2.minimum.toString()}${unit} ${adj}${suffix}`;
          }
          return `${issue2.origin ?? "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${issue2.minimum.toString()} ${adj}${suffix}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.prefix}"(\uC73C)\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4`;
          }
          if (_issue.format === "ends_with")
            return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.suffix}"(\uC73C)\uB85C \uB05D\uB098\uC57C \uD569\uB2C8\uB2E4`;
          if (_issue.format === "includes")
            return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${_issue.includes}"\uC744(\uB97C) \uD3EC\uD568\uD574\uC57C \uD569\uB2C8\uB2E4`;
          if (_issue.format === "regex")
            return `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: \uC815\uADDC\uC2DD ${_issue.pattern} \uD328\uD134\uACFC \uC77C\uCE58\uD574\uC57C \uD569\uB2C8\uB2E4`;
          return `\uC798\uBABB\uB41C ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\uC798\uBABB\uB41C \uC22B\uC790: ${issue2.divisor}\uC758 \uBC30\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
        case "unrecognized_keys":
          return `\uC778\uC2DD\uD560 \uC218 \uC5C6\uB294 \uD0A4: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\uC798\uBABB\uB41C \uD0A4: ${issue2.origin}`;
        case "invalid_union":
          return `\uC798\uBABB\uB41C \uC785\uB825`;
        case "invalid_element":
          return `\uC798\uBABB\uB41C \uAC12: ${issue2.origin}`;
        default:
          return `\uC798\uBABB\uB41C \uC785\uB825`;
      }
    };
  };
  function ko_default() {
    return {
      localeError: error24()
    };
  }

  // node_modules/zod/v4/locales/lt.js
  var parsedType6 = (data) => {
    const t4 = typeof data;
    return parsedTypeFromType(t4, data);
  };
  var parsedTypeFromType = (t4, data = void 0) => {
    switch (t4) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "skai\u010Dius";
      }
      case "bigint": {
        return "sveikasis skai\u010Dius";
      }
      case "string": {
        return "eilut\u0117";
      }
      case "boolean": {
        return "login\u0117 reik\u0161m\u0117";
      }
      case "undefined":
      case "void": {
        return "neapibr\u0117\u017Eta reik\u0161m\u0117";
      }
      case "function": {
        return "funkcija";
      }
      case "symbol": {
        return "simbolis";
      }
      case "object": {
        if (data === void 0)
          return "ne\u017Einomas objektas";
        if (data === null)
          return "nulin\u0117 reik\u0161m\u0117";
        if (Array.isArray(data))
          return "masyvas";
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
        return "objektas";
      }
      case "null": {
        return "nulin\u0117 reik\u0161m\u0117";
      }
    }
    return t4;
  };
  var capitalizeFirstCharacter = (text) => {
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  function getUnitTypeFromNumber(number4) {
    const abs = Math.abs(number4);
    const last = abs % 10;
    const last2 = abs % 100;
    if (last2 >= 11 && last2 <= 19 || last === 0)
      return "many";
    if (last === 1)
      return "one";
    return "few";
  }
  var error25 = () => {
    const Sizable = {
      string: {
        unit: {
          one: "simbolis",
          few: "simboliai",
          many: "simboli\u0173"
        },
        verb: {
          smaller: {
            inclusive: "turi b\u016Bti ne ilgesn\u0117 kaip",
            notInclusive: "turi b\u016Bti trumpesn\u0117 kaip"
          },
          bigger: {
            inclusive: "turi b\u016Bti ne trumpesn\u0117 kaip",
            notInclusive: "turi b\u016Bti ilgesn\u0117 kaip"
          }
        }
      },
      file: {
        unit: {
          one: "baitas",
          few: "baitai",
          many: "bait\u0173"
        },
        verb: {
          smaller: {
            inclusive: "turi b\u016Bti ne didesnis kaip",
            notInclusive: "turi b\u016Bti ma\u017Eesnis kaip"
          },
          bigger: {
            inclusive: "turi b\u016Bti ne ma\u017Eesnis kaip",
            notInclusive: "turi b\u016Bti didesnis kaip"
          }
        }
      },
      array: {
        unit: {
          one: "element\u0105",
          few: "elementus",
          many: "element\u0173"
        },
        verb: {
          smaller: {
            inclusive: "turi tur\u0117ti ne daugiau kaip",
            notInclusive: "turi tur\u0117ti ma\u017Eiau kaip"
          },
          bigger: {
            inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
            notInclusive: "turi tur\u0117ti daugiau kaip"
          }
        }
      },
      set: {
        unit: {
          one: "element\u0105",
          few: "elementus",
          many: "element\u0173"
        },
        verb: {
          smaller: {
            inclusive: "turi tur\u0117ti ne daugiau kaip",
            notInclusive: "turi tur\u0117ti ma\u017Eiau kaip"
          },
          bigger: {
            inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip",
            notInclusive: "turi tur\u0117ti daugiau kaip"
          }
        }
      }
    };
    function getSizing(origin, unitType, inclusive, targetShouldBe) {
      const result = Sizable[origin] ?? null;
      if (result === null)
        return result;
      return {
        unit: result.unit[unitType],
        verb: result.verb[targetShouldBe][inclusive ? "inclusive" : "notInclusive"]
      };
    }
    const Nouns = {
      regex: "\u012Fvestis",
      email: "el. pa\u0161to adresas",
      url: "URL",
      emoji: "jaustukas",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO data ir laikas",
      date: "ISO data",
      time: "ISO laikas",
      duration: "ISO trukm\u0117",
      ipv4: "IPv4 adresas",
      ipv6: "IPv6 adresas",
      cidrv4: "IPv4 tinklo prefiksas (CIDR)",
      cidrv6: "IPv6 tinklo prefiksas (CIDR)",
      base64: "base64 u\u017Ekoduota eilut\u0117",
      base64url: "base64url u\u017Ekoduota eilut\u0117",
      json_string: "JSON eilut\u0117",
      e164: "E.164 numeris",
      jwt: "JWT",
      template_literal: "\u012Fvestis"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Gautas tipas ${parsedType6(issue2.input)}, o tik\u0117tasi - ${parsedTypeFromType(issue2.expected)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Privalo b\u016Bti ${stringifyPrimitive(issue2.values[0])}`;
          return `Privalo b\u016Bti vienas i\u0161 ${joinValues(issue2.values, "|")} pasirinkim\u0173`;
        case "too_big": {
          const origin = parsedTypeFromType(issue2.origin);
          const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.maximum)), issue2.inclusive ?? false, "smaller");
          if (sizing?.verb)
            return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reik\u0161m\u0117")} ${sizing.verb} ${issue2.maximum.toString()} ${sizing.unit ?? "element\u0173"}`;
          const adj = issue2.inclusive ? "ne didesnis kaip" : "ma\u017Eesnis kaip";
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reik\u0161m\u0117")} turi b\u016Bti ${adj} ${issue2.maximum.toString()} ${sizing?.unit}`;
        }
        case "too_small": {
          const origin = parsedTypeFromType(issue2.origin);
          const sizing = getSizing(issue2.origin, getUnitTypeFromNumber(Number(issue2.minimum)), issue2.inclusive ?? false, "bigger");
          if (sizing?.verb)
            return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reik\u0161m\u0117")} ${sizing.verb} ${issue2.minimum.toString()} ${sizing.unit ?? "element\u0173"}`;
          const adj = issue2.inclusive ? "ne ma\u017Eesnis kaip" : "didesnis kaip";
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reik\u0161m\u0117")} turi b\u016Bti ${adj} ${issue2.minimum.toString()} ${sizing?.unit}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Eilut\u0117 privalo prasid\u0117ti "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Eilut\u0117 privalo pasibaigti "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Eilut\u0117 privalo \u012Ftraukti "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Eilut\u0117 privalo atitikti ${_issue.pattern}`;
          return `Neteisingas ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Skai\u010Dius privalo b\u016Bti ${issue2.divisor} kartotinis.`;
        case "unrecognized_keys":
          return `Neatpa\u017Eint${issue2.keys.length > 1 ? "i" : "as"} rakt${issue2.keys.length > 1 ? "ai" : "as"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return "Rastas klaidingas raktas";
        case "invalid_union":
          return "Klaidinga \u012Fvestis";
        case "invalid_element": {
          const origin = parsedTypeFromType(issue2.origin);
          return `${capitalizeFirstCharacter(origin ?? issue2.origin ?? "reik\u0161m\u0117")} turi klaiding\u0105 \u012Fvest\u012F`;
        }
        default:
          return "Klaidinga \u012Fvestis";
      }
    };
  };
  function lt_default() {
    return {
      localeError: error25()
    };
  }

  // node_modules/zod/v4/locales/mk.js
  var error26 = () => {
    const Sizable = {
      string: { unit: "\u0437\u043D\u0430\u0446\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
      file: { unit: "\u0431\u0430\u0458\u0442\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
      array: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" },
      set: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0431\u0440\u043E\u0458";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u043D\u0438\u0437\u0430";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0432\u043D\u0435\u0441",
      email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u043D\u0430 \u0435-\u043F\u043E\u0448\u0442\u0430",
      url: "URL",
      emoji: "\u0435\u043C\u043E\u045F\u0438",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u0434\u0430\u0442\u0443\u043C \u0438 \u0432\u0440\u0435\u043C\u0435",
      date: "ISO \u0434\u0430\u0442\u0443\u043C",
      time: "ISO \u0432\u0440\u0435\u043C\u0435",
      duration: "ISO \u0432\u0440\u0435\u043C\u0435\u0442\u0440\u0430\u0435\u045A\u0435",
      ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441\u0430",
      ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441\u0430",
      cidrv4: "IPv4 \u043E\u043F\u0441\u0435\u0433",
      cidrv6: "IPv6 \u043E\u043F\u0441\u0435\u0433",
      base64: "base64-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430",
      base64url: "base64url-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430",
      json_string: "JSON \u043D\u0438\u0437\u0430",
      e164: "E.164 \u0431\u0440\u043E\u0458",
      jwt: "JWT",
      template_literal: "\u0432\u043D\u0435\u0441"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.expected}, \u043F\u0440\u0438\u043C\u0435\u043D\u043E ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Invalid input: expected ${stringifyPrimitive(issue2.values[0])}`;
          return `\u0413\u0440\u0435\u0448\u0430\u043D\u0430 \u043E\u043F\u0446\u0438\u0458\u0430: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 \u0435\u0434\u043D\u0430 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin ?? "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0438\u043C\u0430 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438"}`;
          return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin ?? "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0431\u0438\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin} \u0434\u0430 \u0438\u043C\u0430 ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${issue2.origin} \u0434\u0430 \u0431\u0438\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u043D\u0443\u0432\u0430 \u0441\u043E "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u0432\u0440\u0448\u0443\u0432\u0430 \u0441\u043E "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0432\u043A\u043B\u0443\u0447\u0443\u0432\u0430 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u043E\u0434\u0433\u043E\u0430\u0440\u0430 \u043D\u0430 \u043F\u0430\u0442\u0435\u0440\u043D\u043E\u0442 ${_issue.pattern}`;
          return `Invalid ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u0431\u0440\u043E\u0458: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0431\u0438\u0434\u0435 \u0434\u0435\u043B\u0438\u0432 \u0441\u043E ${issue2.divisor}`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D\u0438 \u043A\u043B\u0443\u0447\u0435\u0432\u0438" : "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D \u043A\u043B\u0443\u0447"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u043A\u043B\u0443\u0447 \u0432\u043E ${issue2.origin}`;
        case "invalid_union":
          return "\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441";
        case "invalid_element":
          return `\u0413\u0440\u0435\u0448\u043D\u0430 \u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442 \u0432\u043E ${issue2.origin}`;
        default:
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441`;
      }
    };
  };
  function mk_default() {
    return {
      localeError: error26()
    };
  }

  // node_modules/zod/v4/locales/ms.js
  var error27 = () => {
    const Sizable = {
      string: { unit: "aksara", verb: "mempunyai" },
      file: { unit: "bait", verb: "mempunyai" },
      array: { unit: "elemen", verb: "mempunyai" },
      set: { unit: "elemen", verb: "mempunyai" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "nombor";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "input",
      email: "alamat e-mel",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "tarikh masa ISO",
      date: "tarikh ISO",
      time: "masa ISO",
      duration: "tempoh ISO",
      ipv4: "alamat IPv4",
      ipv6: "alamat IPv6",
      cidrv4: "julat IPv4",
      cidrv6: "julat IPv6",
      base64: "string dikodkan base64",
      base64url: "string dikodkan base64url",
      json_string: "string JSON",
      e164: "nombor E.164",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Input tidak sah: dijangka ${issue2.expected}, diterima ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Input tidak sah: dijangka ${stringifyPrimitive(issue2.values[0])}`;
          return `Pilihan tidak sah: dijangka salah satu daripada ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elemen"}`;
          return `Terlalu besar: dijangka ${issue2.origin ?? "nilai"} adalah ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Terlalu kecil: dijangka ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Terlalu kecil: dijangka ${issue2.origin} adalah ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `String tidak sah: mesti bermula dengan "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `String tidak sah: mesti berakhir dengan "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `String tidak sah: mesti mengandungi "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `String tidak sah: mesti sepadan dengan corak ${_issue.pattern}`;
          return `${Nouns[_issue.format] ?? issue2.format} tidak sah`;
        }
        case "not_multiple_of":
          return `Nombor tidak sah: perlu gandaan ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Kunci tidak dikenali: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Kunci tidak sah dalam ${issue2.origin}`;
        case "invalid_union":
          return "Input tidak sah";
        case "invalid_element":
          return `Nilai tidak sah dalam ${issue2.origin}`;
        default:
          return `Input tidak sah`;
      }
    };
  };
  function ms_default() {
    return {
      localeError: error27()
    };
  }

  // node_modules/zod/v4/locales/nl.js
  var error28 = () => {
    const Sizable = {
      string: { unit: "tekens" },
      file: { unit: "bytes" },
      array: { unit: "elementen" },
      set: { unit: "elementen" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "getal";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "invoer",
      email: "emailadres",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO datum en tijd",
      date: "ISO datum",
      time: "ISO tijd",
      duration: "ISO duur",
      ipv4: "IPv4-adres",
      ipv6: "IPv6-adres",
      cidrv4: "IPv4-bereik",
      cidrv6: "IPv6-bereik",
      base64: "base64-gecodeerde tekst",
      base64url: "base64 URL-gecodeerde tekst",
      json_string: "JSON string",
      e164: "E.164-nummer",
      jwt: "JWT",
      template_literal: "invoer"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Ongeldige invoer: verwacht ${issue2.expected}, ontving ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ongeldige invoer: verwacht ${stringifyPrimitive(issue2.values[0])}`;
          return `Ongeldige optie: verwacht \xE9\xE9n van ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Te lang: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementen"} bevat`;
          return `Te lang: verwacht dat ${issue2.origin ?? "waarde"} ${adj}${issue2.maximum.toString()} is`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Te kort: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} bevat`;
          }
          return `Te kort: verwacht dat ${issue2.origin} ${adj}${issue2.minimum.toString()} is`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Ongeldige tekst: moet met "${_issue.prefix}" beginnen`;
          }
          if (_issue.format === "ends_with")
            return `Ongeldige tekst: moet op "${_issue.suffix}" eindigen`;
          if (_issue.format === "includes")
            return `Ongeldige tekst: moet "${_issue.includes}" bevatten`;
          if (_issue.format === "regex")
            return `Ongeldige tekst: moet overeenkomen met patroon ${_issue.pattern}`;
          return `Ongeldig: ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Ongeldig getal: moet een veelvoud van ${issue2.divisor} zijn`;
        case "unrecognized_keys":
          return `Onbekende key${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Ongeldige key in ${issue2.origin}`;
        case "invalid_union":
          return "Ongeldige invoer";
        case "invalid_element":
          return `Ongeldige waarde in ${issue2.origin}`;
        default:
          return `Ongeldige invoer`;
      }
    };
  };
  function nl_default() {
    return {
      localeError: error28()
    };
  }

  // node_modules/zod/v4/locales/no.js
  var error29 = () => {
    const Sizable = {
      string: { unit: "tegn", verb: "\xE5 ha" },
      file: { unit: "bytes", verb: "\xE5 ha" },
      array: { unit: "elementer", verb: "\xE5 inneholde" },
      set: { unit: "elementer", verb: "\xE5 inneholde" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "tall";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "liste";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "input",
      email: "e-postadresse",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO dato- og klokkeslett",
      date: "ISO-dato",
      time: "ISO-klokkeslett",
      duration: "ISO-varighet",
      ipv4: "IPv4-omr\xE5de",
      ipv6: "IPv6-omr\xE5de",
      cidrv4: "IPv4-spekter",
      cidrv6: "IPv6-spekter",
      base64: "base64-enkodet streng",
      base64url: "base64url-enkodet streng",
      json_string: "JSON-streng",
      e164: "E.164-nummer",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Ugyldig input: forventet ${issue2.expected}, fikk ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ugyldig verdi: forventet ${stringifyPrimitive(issue2.values[0])}`;
          return `Ugyldig valg: forventet en av ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `For stor(t): forventet ${issue2.origin ?? "value"} til \xE5 ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementer"}`;
          return `For stor(t): forventet ${issue2.origin ?? "value"} til \xE5 ha ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `For lite(n): forventet ${issue2.origin} til \xE5 ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `For lite(n): forventet ${issue2.origin} til \xE5 ha ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Ugyldig streng: m\xE5 starte med "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Ugyldig streng: m\xE5 ende med "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Ugyldig streng: m\xE5 inneholde "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Ugyldig streng: m\xE5 matche m\xF8nsteret ${_issue.pattern}`;
          return `Ugyldig ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Ugyldig tall: m\xE5 v\xE6re et multiplum av ${issue2.divisor}`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "Ukjente n\xF8kler" : "Ukjent n\xF8kkel"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8kkel i ${issue2.origin}`;
        case "invalid_union":
          return "Ugyldig input";
        case "invalid_element":
          return `Ugyldig verdi i ${issue2.origin}`;
        default:
          return `Ugyldig input`;
      }
    };
  };
  function no_default() {
    return {
      localeError: error29()
    };
  }

  // node_modules/zod/v4/locales/ota.js
  var error30 = () => {
    const Sizable = {
      string: { unit: "harf", verb: "olmal\u0131d\u0131r" },
      file: { unit: "bayt", verb: "olmal\u0131d\u0131r" },
      array: { unit: "unsur", verb: "olmal\u0131d\u0131r" },
      set: { unit: "unsur", verb: "olmal\u0131d\u0131r" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "numara";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "saf";
          }
          if (data === null) {
            return "gayb";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "giren",
      email: "epostag\xE2h",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO heng\xE2m\u0131",
      date: "ISO tarihi",
      time: "ISO zaman\u0131",
      duration: "ISO m\xFCddeti",
      ipv4: "IPv4 ni\u015F\xE2n\u0131",
      ipv6: "IPv6 ni\u015F\xE2n\u0131",
      cidrv4: "IPv4 menzili",
      cidrv6: "IPv6 menzili",
      base64: "base64-\u015Fifreli metin",
      base64url: "base64url-\u015Fifreli metin",
      json_string: "JSON metin",
      e164: "E.164 say\u0131s\u0131",
      jwt: "JWT",
      template_literal: "giren"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `F\xE2sit giren: umulan ${issue2.expected}, al\u0131nan ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `F\xE2sit giren: umulan ${stringifyPrimitive(issue2.values[0])}`;
          return `F\xE2sit tercih: m\xFBteberler ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Fazla b\xFCy\xFCk: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elements"} sahip olmal\u0131yd\u0131.`;
          return `Fazla b\xFCy\xFCk: ${issue2.origin ?? "value"}, ${adj}${issue2.maximum.toString()} olmal\u0131yd\u0131.`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Fazla k\xFC\xE7\xFCk: ${issue2.origin}, ${adj}${issue2.minimum.toString()} ${sizing.unit} sahip olmal\u0131yd\u0131.`;
          }
          return `Fazla k\xFC\xE7\xFCk: ${issue2.origin}, ${adj}${issue2.minimum.toString()} olmal\u0131yd\u0131.`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `F\xE2sit metin: "${_issue.prefix}" ile ba\u015Flamal\u0131.`;
          if (_issue.format === "ends_with")
            return `F\xE2sit metin: "${_issue.suffix}" ile bitmeli.`;
          if (_issue.format === "includes")
            return `F\xE2sit metin: "${_issue.includes}" ihtiv\xE2 etmeli.`;
          if (_issue.format === "regex")
            return `F\xE2sit metin: ${_issue.pattern} nak\u015F\u0131na uymal\u0131.`;
          return `F\xE2sit ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `F\xE2sit say\u0131: ${issue2.divisor} kat\u0131 olmal\u0131yd\u0131.`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan anahtar ${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `${issue2.origin} i\xE7in tan\u0131nmayan anahtar var.`;
        case "invalid_union":
          return "Giren tan\u0131namad\u0131.";
        case "invalid_element":
          return `${issue2.origin} i\xE7in tan\u0131nmayan k\u0131ymet var.`;
        default:
          return `K\u0131ymet tan\u0131namad\u0131.`;
      }
    };
  };
  function ota_default() {
    return {
      localeError: error30()
    };
  }

  // node_modules/zod/v4/locales/ps.js
  var error31 = () => {
    const Sizable = {
      string: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
      file: { unit: "\u0628\u0627\u06CC\u067C\u0633", verb: "\u0648\u0644\u0631\u064A" },
      array: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" },
      set: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0639\u062F\u062F";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u0627\u0631\u06D0";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0648\u0631\u0648\u062F\u064A",
      email: "\u0628\u0631\u06CC\u069A\u0646\u0627\u0644\u06CC\u06A9",
      url: "\u06CC\u0648 \u0622\u0631 \u0627\u0644",
      emoji: "\u0627\u06CC\u0645\u0648\u062C\u064A",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u0646\u06CC\u067C\u0647 \u0627\u0648 \u0648\u062E\u062A",
      date: "\u0646\u06D0\u067C\u0647",
      time: "\u0648\u062E\u062A",
      duration: "\u0645\u0648\u062F\u0647",
      ipv4: "\u062F IPv4 \u067E\u062A\u0647",
      ipv6: "\u062F IPv6 \u067E\u062A\u0647",
      cidrv4: "\u062F IPv4 \u0633\u0627\u062D\u0647",
      cidrv6: "\u062F IPv6 \u0633\u0627\u062D\u0647",
      base64: "base64-encoded \u0645\u062A\u0646",
      base64url: "base64url-encoded \u0645\u062A\u0646",
      json_string: "JSON \u0645\u062A\u0646",
      e164: "\u062F E.164 \u0634\u0645\u06D0\u0631\u0647",
      jwt: "JWT",
      template_literal: "\u0648\u0631\u0648\u062F\u064A"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${issue2.expected} \u0648\u0627\u06CC, \u0645\u06AB\u0631 ${parsedType8(issue2.input)} \u062A\u0631\u0644\u0627\u0633\u0647 \u0634\u0648`;
        case "invalid_value":
          if (issue2.values.length === 1) {
            return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${stringifyPrimitive(issue2.values[0])} \u0648\u0627\u06CC`;
          }
          return `\u0646\u0627\u0633\u0645 \u0627\u0646\u062A\u062E\u0627\u0628: \u0628\u0627\u06CC\u062F \u06CC\u0648 \u0644\u0647 ${joinValues(issue2.values, "|")} \u0685\u062E\u0647 \u0648\u0627\u06CC`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${issue2.origin ?? "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0639\u0646\u0635\u0631\u0648\u0646\u0647"} \u0648\u0644\u0631\u064A`;
          }
          return `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${issue2.origin ?? "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${adj}${issue2.maximum.toString()} \u0648\u064A`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0648\u0644\u0631\u064A`;
          }
          return `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${issue2.origin} \u0628\u0627\u06CC\u062F ${adj}${issue2.minimum.toString()} \u0648\u064A`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${_issue.prefix}" \u0633\u0631\u0647 \u067E\u06CC\u0644 \u0634\u064A`;
          }
          if (_issue.format === "ends_with") {
            return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${_issue.suffix}" \u0633\u0631\u0647 \u067E\u0627\u06CC \u062A\u0647 \u0648\u0631\u0633\u064A\u0696\u064A`;
          }
          if (_issue.format === "includes") {
            return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F "${_issue.includes}" \u0648\u0644\u0631\u064A`;
          }
          if (_issue.format === "regex") {
            return `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F ${_issue.pattern} \u0633\u0631\u0647 \u0645\u0637\u0627\u0628\u0642\u062A \u0648\u0644\u0631\u064A`;
          }
          return `${Nouns[_issue.format] ?? issue2.format} \u0646\u0627\u0633\u0645 \u062F\u06CC`;
        }
        case "not_multiple_of":
          return `\u0646\u0627\u0633\u0645 \u0639\u062F\u062F: \u0628\u0627\u06CC\u062F \u062F ${issue2.divisor} \u0645\u0636\u0631\u0628 \u0648\u064A`;
        case "unrecognized_keys":
          return `\u0646\u0627\u0633\u0645 ${issue2.keys.length > 1 ? "\u06A9\u0644\u06CC\u0689\u0648\u0646\u0647" : "\u06A9\u0644\u06CC\u0689"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u0646\u0627\u0633\u0645 \u06A9\u0644\u06CC\u0689 \u067E\u0647 ${issue2.origin} \u06A9\u06D0`;
        case "invalid_union":
          return `\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A`;
        case "invalid_element":
          return `\u0646\u0627\u0633\u0645 \u0639\u0646\u0635\u0631 \u067E\u0647 ${issue2.origin} \u06A9\u06D0`;
        default:
          return `\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A`;
      }
    };
  };
  function ps_default() {
    return {
      localeError: error31()
    };
  }

  // node_modules/zod/v4/locales/pl.js
  var error32 = () => {
    const Sizable = {
      string: { unit: "znak\xF3w", verb: "mie\u0107" },
      file: { unit: "bajt\xF3w", verb: "mie\u0107" },
      array: { unit: "element\xF3w", verb: "mie\u0107" },
      set: { unit: "element\xF3w", verb: "mie\u0107" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "liczba";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "tablica";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "wyra\u017Cenie",
      email: "adres email",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "data i godzina w formacie ISO",
      date: "data w formacie ISO",
      time: "godzina w formacie ISO",
      duration: "czas trwania ISO",
      ipv4: "adres IPv4",
      ipv6: "adres IPv6",
      cidrv4: "zakres IPv4",
      cidrv6: "zakres IPv6",
      base64: "ci\u0105g znak\xF3w zakodowany w formacie base64",
      base64url: "ci\u0105g znak\xF3w zakodowany w formacie base64url",
      json_string: "ci\u0105g znak\xF3w w formacie JSON",
      e164: "liczba E.164",
      jwt: "JWT",
      template_literal: "wej\u015Bcie"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${issue2.expected}, otrzymano ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${stringifyPrimitive(issue2.values[0])}`;
          return `Nieprawid\u0142owa opcja: oczekiwano jednej z warto\u015Bci ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Za du\u017Ca warto\u015B\u0107: oczekiwano, \u017Ce ${issue2.origin ?? "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element\xF3w"}`;
          }
          return `Zbyt du\u017C(y/a/e): oczekiwano, \u017Ce ${issue2.origin ?? "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Za ma\u0142a warto\u015B\u0107: oczekiwano, \u017Ce ${issue2.origin ?? "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${adj}${issue2.minimum.toString()} ${sizing.unit ?? "element\xF3w"}`;
          }
          return `Zbyt ma\u0142(y/a/e): oczekiwano, \u017Ce ${issue2.origin ?? "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zaczyna\u0107 si\u0119 od "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi ko\u0144czy\u0107 si\u0119 na "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zawiera\u0107 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi odpowiada\u0107 wzorcowi ${_issue.pattern}`;
          return `Nieprawid\u0142ow(y/a/e) ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Nieprawid\u0142owa liczba: musi by\u0107 wielokrotno\u015Bci\u0105 ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Nierozpoznane klucze${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Nieprawid\u0142owy klucz w ${issue2.origin}`;
        case "invalid_union":
          return "Nieprawid\u0142owe dane wej\u015Bciowe";
        case "invalid_element":
          return `Nieprawid\u0142owa warto\u015B\u0107 w ${issue2.origin}`;
        default:
          return `Nieprawid\u0142owe dane wej\u015Bciowe`;
      }
    };
  };
  function pl_default() {
    return {
      localeError: error32()
    };
  }

  // node_modules/zod/v4/locales/pt.js
  var error33 = () => {
    const Sizable = {
      string: { unit: "caracteres", verb: "ter" },
      file: { unit: "bytes", verb: "ter" },
      array: { unit: "itens", verb: "ter" },
      set: { unit: "itens", verb: "ter" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "n\xFAmero";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "nulo";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "padr\xE3o",
      email: "endere\xE7o de e-mail",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "data e hora ISO",
      date: "data ISO",
      time: "hora ISO",
      duration: "dura\xE7\xE3o ISO",
      ipv4: "endere\xE7o IPv4",
      ipv6: "endere\xE7o IPv6",
      cidrv4: "faixa de IPv4",
      cidrv6: "faixa de IPv6",
      base64: "texto codificado em base64",
      base64url: "URL codificada em base64",
      json_string: "texto JSON",
      e164: "n\xFAmero E.164",
      jwt: "JWT",
      template_literal: "entrada"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Tipo inv\xE1lido: esperado ${issue2.expected}, recebido ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Entrada inv\xE1lida: esperado ${stringifyPrimitive(issue2.values[0])}`;
          return `Op\xE7\xE3o inv\xE1lida: esperada uma das ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Muito grande: esperado que ${issue2.origin ?? "valor"} tivesse ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementos"}`;
          return `Muito grande: esperado que ${issue2.origin ?? "valor"} fosse ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Muito pequeno: esperado que ${issue2.origin} tivesse ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Muito pequeno: esperado que ${issue2.origin} fosse ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Texto inv\xE1lido: deve come\xE7ar com "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Texto inv\xE1lido: deve terminar com "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Texto inv\xE1lido: deve incluir "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Texto inv\xE1lido: deve corresponder ao padr\xE3o ${_issue.pattern}`;
          return `${Nouns[_issue.format] ?? issue2.format} inv\xE1lido`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE1lido: deve ser m\xFAltiplo de ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Chave${issue2.keys.length > 1 ? "s" : ""} desconhecida${issue2.keys.length > 1 ? "s" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Chave inv\xE1lida em ${issue2.origin}`;
        case "invalid_union":
          return "Entrada inv\xE1lida";
        case "invalid_element":
          return `Valor inv\xE1lido em ${issue2.origin}`;
        default:
          return `Campo inv\xE1lido`;
      }
    };
  };
  function pt_default() {
    return {
      localeError: error33()
    };
  }

  // node_modules/zod/v4/locales/ru.js
  function getRussianPlural(count, one, few, many) {
    const absCount = Math.abs(count);
    const lastDigit = absCount % 10;
    const lastTwoDigits = absCount % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return many;
    }
    if (lastDigit === 1) {
      return one;
    }
    if (lastDigit >= 2 && lastDigit <= 4) {
      return few;
    }
    return many;
  }
  var error34 = () => {
    const Sizable = {
      string: {
        unit: {
          one: "\u0441\u0438\u043C\u0432\u043E\u043B",
          few: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430",
          many: "\u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432"
        },
        verb: "\u0438\u043C\u0435\u0442\u044C"
      },
      file: {
        unit: {
          one: "\u0431\u0430\u0439\u0442",
          few: "\u0431\u0430\u0439\u0442\u0430",
          many: "\u0431\u0430\u0439\u0442"
        },
        verb: "\u0438\u043C\u0435\u0442\u044C"
      },
      array: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432"
        },
        verb: "\u0438\u043C\u0435\u0442\u044C"
      },
      set: {
        unit: {
          one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442",
          few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430",
          many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432"
        },
        verb: "\u0438\u043C\u0435\u0442\u044C"
      }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u043C\u0430\u0441\u0441\u0438\u0432";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0432\u0432\u043E\u0434",
      email: "email \u0430\u0434\u0440\u0435\u0441",
      url: "URL",
      emoji: "\u044D\u043C\u043E\u0434\u0437\u0438",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u0434\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F",
      date: "ISO \u0434\u0430\u0442\u0430",
      time: "ISO \u0432\u0440\u0435\u043C\u044F",
      duration: "ISO \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C",
      ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441",
      ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441",
      cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
      cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D",
      base64: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64",
      base64url: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64url",
      json_string: "JSON \u0441\u0442\u0440\u043E\u043A\u0430",
      e164: "\u043D\u043E\u043C\u0435\u0440 E.164",
      jwt: "JWT",
      template_literal: "\u0432\u0432\u043E\u0434"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${issue2.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${stringifyPrimitive(issue2.values[0])}`;
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0434\u043D\u043E \u0438\u0437 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            const maxValue = Number(issue2.maximum);
            const unit = getRussianPlural(maxValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
            return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${adj}${issue2.maximum.toString()} ${unit}`;
          }
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            const minValue = Number(issue2.minimum);
            const unit = getRussianPlural(minValue, sizing.unit.one, sizing.unit.few, sizing.unit.many);
            return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${adj}${issue2.minimum.toString()} ${unit}`;
          }
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${issue2.origin} \u0431\u0443\u0434\u0435\u0442 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0441 "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E: \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D${issue2.keys.length > 1 ? "\u044B\u0435" : "\u044B\u0439"} \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u0438" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0432 ${issue2.origin}`;
        case "invalid_union":
          return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
        case "invalid_element":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432 ${issue2.origin}`;
        default:
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435`;
      }
    };
  };
  function ru_default() {
    return {
      localeError: error34()
    };
  }

  // node_modules/zod/v4/locales/sl.js
  var error35 = () => {
    const Sizable = {
      string: { unit: "znakov", verb: "imeti" },
      file: { unit: "bajtov", verb: "imeti" },
      array: { unit: "elementov", verb: "imeti" },
      set: { unit: "elementov", verb: "imeti" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0161tevilo";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "tabela";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "vnos",
      email: "e-po\u0161tni naslov",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO datum in \u010Das",
      date: "ISO datum",
      time: "ISO \u010Das",
      duration: "ISO trajanje",
      ipv4: "IPv4 naslov",
      ipv6: "IPv6 naslov",
      cidrv4: "obseg IPv4",
      cidrv6: "obseg IPv6",
      base64: "base64 kodiran niz",
      base64url: "base64url kodiran niz",
      json_string: "JSON niz",
      e164: "E.164 \u0161tevilka",
      jwt: "JWT",
      template_literal: "vnos"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Neveljaven vnos: pri\u010Dakovano ${issue2.expected}, prejeto ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Neveljaven vnos: pri\u010Dakovano ${stringifyPrimitive(issue2.values[0])}`;
          return `Neveljavna mo\u017Enost: pri\u010Dakovano eno izmed ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Preveliko: pri\u010Dakovano, da bo ${issue2.origin ?? "vrednost"} imelo ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "elementov"}`;
          return `Preveliko: pri\u010Dakovano, da bo ${issue2.origin ?? "vrednost"} ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Premajhno: pri\u010Dakovano, da bo ${issue2.origin} imelo ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Premajhno: pri\u010Dakovano, da bo ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Neveljaven niz: mora se za\u010Deti z "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Neveljaven niz: mora se kon\u010Dati z "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Neveljaven niz: mora vsebovati "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Neveljaven niz: mora ustrezati vzorcu ${_issue.pattern}`;
          return `Neveljaven ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Neveljavno \u0161tevilo: mora biti ve\u010Dkratnik ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Neprepoznan${issue2.keys.length > 1 ? "i klju\u010Di" : " klju\u010D"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Neveljaven klju\u010D v ${issue2.origin}`;
        case "invalid_union":
          return "Neveljaven vnos";
        case "invalid_element":
          return `Neveljavna vrednost v ${issue2.origin}`;
        default:
          return "Neveljaven vnos";
      }
    };
  };
  function sl_default() {
    return {
      localeError: error35()
    };
  }

  // node_modules/zod/v4/locales/sv.js
  var error36 = () => {
    const Sizable = {
      string: { unit: "tecken", verb: "att ha" },
      file: { unit: "bytes", verb: "att ha" },
      array: { unit: "objekt", verb: "att inneh\xE5lla" },
      set: { unit: "objekt", verb: "att inneh\xE5lla" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "antal";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "lista";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "regulj\xE4rt uttryck",
      email: "e-postadress",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO-datum och tid",
      date: "ISO-datum",
      time: "ISO-tid",
      duration: "ISO-varaktighet",
      ipv4: "IPv4-intervall",
      ipv6: "IPv6-intervall",
      cidrv4: "IPv4-spektrum",
      cidrv6: "IPv6-spektrum",
      base64: "base64-kodad str\xE4ng",
      base64url: "base64url-kodad str\xE4ng",
      json_string: "JSON-str\xE4ng",
      e164: "E.164-nummer",
      jwt: "JWT",
      template_literal: "mall-literal"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Ogiltig inmatning: f\xF6rv\xE4ntat ${issue2.expected}, fick ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ogiltig inmatning: f\xF6rv\xE4ntat ${stringifyPrimitive(issue2.values[0])}`;
          return `Ogiltigt val: f\xF6rv\xE4ntade en av ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `F\xF6r stor(t): f\xF6rv\xE4ntade ${issue2.origin ?? "v\xE4rdet"} att ha ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "element"}`;
          }
          return `F\xF6r stor(t): f\xF6rv\xE4ntat ${issue2.origin ?? "v\xE4rdet"} att ha ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `F\xF6r lite(t): f\xF6rv\xE4ntade ${issue2.origin ?? "v\xE4rdet"} att ha ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `F\xF6r lite(t): f\xF6rv\xE4ntade ${issue2.origin ?? "v\xE4rdet"} att ha ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `Ogiltig str\xE4ng: m\xE5ste b\xF6rja med "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `Ogiltig str\xE4ng: m\xE5ste sluta med "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Ogiltig str\xE4ng: m\xE5ste inneh\xE5lla "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Ogiltig str\xE4ng: m\xE5ste matcha m\xF6nstret "${_issue.pattern}"`;
          return `Ogiltig(t) ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Ogiltigt tal: m\xE5ste vara en multipel av ${issue2.divisor}`;
        case "unrecognized_keys":
          return `${issue2.keys.length > 1 ? "Ok\xE4nda nycklar" : "Ok\xE4nd nyckel"}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Ogiltig nyckel i ${issue2.origin ?? "v\xE4rdet"}`;
        case "invalid_union":
          return "Ogiltig input";
        case "invalid_element":
          return `Ogiltigt v\xE4rde i ${issue2.origin ?? "v\xE4rdet"}`;
        default:
          return `Ogiltig input`;
      }
    };
  };
  function sv_default() {
    return {
      localeError: error36()
    };
  }

  // node_modules/zod/v4/locales/ta.js
  var error37 = () => {
    const Sizable = {
      string: { unit: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
      file: { unit: "\u0BAA\u0BC8\u0B9F\u0BCD\u0B9F\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
      array: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" },
      set: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "\u0B8E\u0BA3\u0BCD \u0B85\u0BB2\u0BCD\u0BB2\u0BBE\u0BA4\u0BA4\u0BC1" : "\u0B8E\u0BA3\u0BCD";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u0B85\u0BA3\u0BBF";
          }
          if (data === null) {
            return "\u0BB5\u0BC6\u0BB1\u0BC1\u0BAE\u0BC8";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1",
      email: "\u0BAE\u0BBF\u0BA9\u0BCD\u0BA9\u0B9E\u0BCD\u0B9A\u0BB2\u0BCD \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u0BA4\u0BC7\u0BA4\u0BBF \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD",
      date: "ISO \u0BA4\u0BC7\u0BA4\u0BBF",
      time: "ISO \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD",
      duration: "ISO \u0B95\u0BBE\u0BB2 \u0B85\u0BB3\u0BB5\u0BC1",
      ipv4: "IPv4 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
      ipv6: "IPv6 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF",
      cidrv4: "IPv4 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1",
      cidrv6: "IPv6 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1",
      base64: "base64-encoded \u0B9A\u0BB0\u0BAE\u0BCD",
      base64url: "base64url-encoded \u0B9A\u0BB0\u0BAE\u0BCD",
      json_string: "JSON \u0B9A\u0BB0\u0BAE\u0BCD",
      e164: "E.164 \u0B8E\u0BA3\u0BCD",
      jwt: "JWT",
      template_literal: "input"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.expected}, \u0BAA\u0BC6\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${stringifyPrimitive(issue2.values[0])}`;
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${joinValues(issue2.values, "|")} \u0B87\u0BB2\u0BCD \u0B92\u0BA9\u0BCD\u0BB1\u0BC1`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin ?? "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD"} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          }
          return `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin ?? "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${adj}${issue2.maximum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          }
          return `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${issue2.origin} ${adj}${issue2.minimum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.prefix}" \u0B87\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          if (_issue.format === "ends_with")
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.suffix}" \u0B87\u0BB2\u0BCD \u0BAE\u0BC1\u0B9F\u0BBF\u0BB5\u0B9F\u0BC8\u0BAF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          if (_issue.format === "includes")
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${_issue.includes}" \u0B90 \u0B89\u0BB3\u0BCD\u0BB3\u0B9F\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          if (_issue.format === "regex")
            return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: ${_issue.pattern} \u0BAE\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0B9F\u0BA9\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B8E\u0BA3\u0BCD: ${issue2.divisor} \u0B87\u0BA9\u0BCD \u0BAA\u0BB2\u0BAE\u0BBE\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        case "unrecognized_keys":
          return `\u0B85\u0B9F\u0BC8\u0BAF\u0BBE\u0BB3\u0BAE\u0BCD \u0BA4\u0BC6\u0BB0\u0BBF\u0BAF\u0BBE\u0BA4 \u0BB5\u0BBF\u0B9A\u0BC8${issue2.keys.length > 1 ? "\u0B95\u0BB3\u0BCD" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `${issue2.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0B9A\u0BC8`;
        case "invalid_union":
          return "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1";
        case "invalid_element":
          return `${issue2.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1`;
        default:
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1`;
      }
    };
  };
  function ta_default() {
    return {
      localeError: error37()
    };
  }

  // node_modules/zod/v4/locales/th.js
  var error38 = () => {
    const Sizable = {
      string: { unit: "\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
      file: { unit: "\u0E44\u0E1A\u0E15\u0E4C", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
      array: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" },
      set: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 (NaN)" : "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E23\u0E22\u0E4C (Array)";
          }
          if (data === null) {
            return "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E48\u0E32 (null)";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19",
      email: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E2D\u0E35\u0E40\u0E21\u0E25",
      url: "URL",
      emoji: "\u0E2D\u0E34\u0E42\u0E21\u0E08\u0E34",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
      date: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E1A\u0E1A ISO",
      time: "\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
      duration: "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO",
      ipv4: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv4",
      ipv6: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv6",
      cidrv4: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv4",
      cidrv6: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv6",
      base64: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64",
      base64url: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A URL",
      json_string: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A JSON",
      e164: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28 (E.164)",
      jwt: "\u0E42\u0E17\u0E40\u0E04\u0E19 JWT",
      template_literal: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${issue2.expected} \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u0E04\u0E48\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${stringifyPrimitive(issue2.values[0])}`;
          return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E43\u0E19 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19" : "\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin ?? "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.maximum.toString()} ${sizing.unit ?? "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"}`;
          return `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin ?? "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? "\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22" : "\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${issue2.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${adj} ${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 "${_issue.prefix}"`;
          }
          if (_issue.format === "ends_with")
            return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E17\u0E49\u0E32\u0E22\u0E14\u0E49\u0E27\u0E22 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 "${_issue.includes}" \u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21`;
          if (_issue.format === "regex")
            return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14 ${_issue.pattern}`;
          return `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E32\u0E23\u0E14\u0E49\u0E27\u0E22 ${issue2.divisor} \u0E44\u0E14\u0E49\u0E25\u0E07\u0E15\u0E31\u0E27`;
        case "unrecognized_keys":
          return `\u0E1E\u0E1A\u0E04\u0E35\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u0E04\u0E35\u0E22\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${issue2.origin}`;
        case "invalid_union":
          return "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E22\u0E39\u0E40\u0E19\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E44\u0E27\u0E49";
        case "invalid_element":
          return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${issue2.origin}`;
        default:
          return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07`;
      }
    };
  };
  function th_default() {
    return {
      localeError: error38()
    };
  }

  // node_modules/zod/v4/locales/tr.js
  var parsedType7 = (data) => {
    const t4 = typeof data;
    switch (t4) {
      case "number": {
        return Number.isNaN(data) ? "NaN" : "number";
      }
      case "object": {
        if (Array.isArray(data)) {
          return "array";
        }
        if (data === null) {
          return "null";
        }
        if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
          return data.constructor.name;
        }
      }
    }
    return t4;
  };
  var error39 = () => {
    const Sizable = {
      string: { unit: "karakter", verb: "olmal\u0131" },
      file: { unit: "bayt", verb: "olmal\u0131" },
      array: { unit: "\xF6\u011Fe", verb: "olmal\u0131" },
      set: { unit: "\xF6\u011Fe", verb: "olmal\u0131" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const Nouns = {
      regex: "girdi",
      email: "e-posta adresi",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO tarih ve saat",
      date: "ISO tarih",
      time: "ISO saat",
      duration: "ISO s\xFCre",
      ipv4: "IPv4 adresi",
      ipv6: "IPv6 adresi",
      cidrv4: "IPv4 aral\u0131\u011F\u0131",
      cidrv6: "IPv6 aral\u0131\u011F\u0131",
      base64: "base64 ile \u015Fifrelenmi\u015F metin",
      base64url: "base64url ile \u015Fifrelenmi\u015F metin",
      json_string: "JSON dizesi",
      e164: "E.164 say\u0131s\u0131",
      jwt: "JWT",
      template_literal: "\u015Eablon dizesi"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `Ge\xE7ersiz de\u011Fer: beklenen ${issue2.expected}, al\u0131nan ${parsedType7(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `Ge\xE7ersiz de\u011Fer: beklenen ${stringifyPrimitive(issue2.values[0])}`;
          return `Ge\xE7ersiz se\xE7enek: a\u015Fa\u011F\u0131dakilerden biri olmal\u0131: ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\xC7ok b\xFCy\xFCk: beklenen ${issue2.origin ?? "de\u011Fer"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\xF6\u011Fe"}`;
          return `\xC7ok b\xFCy\xFCk: beklenen ${issue2.origin ?? "de\u011Fer"} ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\xC7ok k\xFC\xE7\xFCk: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          return `\xC7ok k\xFC\xE7\xFCk: beklenen ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Ge\xE7ersiz metin: "${_issue.prefix}" ile ba\u015Flamal\u0131`;
          if (_issue.format === "ends_with")
            return `Ge\xE7ersiz metin: "${_issue.suffix}" ile bitmeli`;
          if (_issue.format === "includes")
            return `Ge\xE7ersiz metin: "${_issue.includes}" i\xE7ermeli`;
          if (_issue.format === "regex")
            return `Ge\xE7ersiz metin: ${_issue.pattern} desenine uymal\u0131`;
          return `Ge\xE7ersiz ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `Ge\xE7ersiz say\u0131: ${issue2.divisor} ile tam b\xF6l\xFCnebilmeli`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan anahtar${issue2.keys.length > 1 ? "lar" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `${issue2.origin} i\xE7inde ge\xE7ersiz anahtar`;
        case "invalid_union":
          return "Ge\xE7ersiz de\u011Fer";
        case "invalid_element":
          return `${issue2.origin} i\xE7inde ge\xE7ersiz de\u011Fer`;
        default:
          return `Ge\xE7ersiz de\u011Fer`;
      }
    };
  };
  function tr_default() {
    return {
      localeError: error39()
    };
  }

  // node_modules/zod/v4/locales/uk.js
  var error40 = () => {
    const Sizable = {
      string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
      file: { unit: "\u0431\u0430\u0439\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
      array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" },
      set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u043C\u0430\u0441\u0438\u0432";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456",
      email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u0435\u043B\u0435\u043A\u0442\u0440\u043E\u043D\u043D\u043E\u0457 \u043F\u043E\u0448\u0442\u0438",
      url: "URL",
      emoji: "\u0435\u043C\u043E\u0434\u0437\u0456",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\u0434\u0430\u0442\u0430 \u0442\u0430 \u0447\u0430\u0441 ISO",
      date: "\u0434\u0430\u0442\u0430 ISO",
      time: "\u0447\u0430\u0441 ISO",
      duration: "\u0442\u0440\u0438\u0432\u0430\u043B\u0456\u0441\u0442\u044C ISO",
      ipv4: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv4",
      ipv6: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv6",
      cidrv4: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv4",
      cidrv6: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv6",
      base64: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64",
      base64url: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64url",
      json_string: "\u0440\u044F\u0434\u043E\u043A JSON",
      e164: "\u043D\u043E\u043C\u0435\u0440 E.164",
      jwt: "JWT",
      template_literal: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${issue2.expected}, \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${stringifyPrimitive(issue2.values[0])}`;
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0430 \u043E\u043F\u0446\u0456\u044F: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u043E\u0434\u043D\u0435 \u0437 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432"}`;
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin ?? "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} \u0431\u0443\u0434\u0435 ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${issue2.origin} \u0431\u0443\u0434\u0435 ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043F\u043E\u0447\u0438\u043D\u0430\u0442\u0438\u0441\u044F \u0437 "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0432\u0430\u0442\u0438\u0441\u044F \u043D\u0430 "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043C\u0456\u0441\u0442\u0438\u0442\u0438 "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0442\u0438 \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${_issue.pattern}`;
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0447\u0438\u0441\u043B\u043E: \u043F\u043E\u0432\u0438\u043D\u043D\u043E \u0431\u0443\u0442\u0438 \u043A\u0440\u0430\u0442\u043D\u0438\u043C ${issue2.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u043D\u0438\u0439 \u043A\u043B\u044E\u0447${issue2.keys.length > 1 ? "\u0456" : ""}: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u043A\u043B\u044E\u0447 \u0443 ${issue2.origin}`;
        case "invalid_union":
          return "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456";
        case "invalid_element":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F \u0443 ${issue2.origin}`;
        default:
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456`;
      }
    };
  };
  function uk_default() {
    return {
      localeError: error40()
    };
  }

  // node_modules/zod/v4/locales/ua.js
  function ua_default() {
    return uk_default();
  }

  // node_modules/zod/v4/locales/ur.js
  var error41 = () => {
    const Sizable = {
      string: { unit: "\u062D\u0631\u0648\u0641", verb: "\u06C1\u0648\u0646\u0627" },
      file: { unit: "\u0628\u0627\u0626\u0679\u0633", verb: "\u06C1\u0648\u0646\u0627" },
      array: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" },
      set: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "\u0646\u0645\u0628\u0631";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u0622\u0631\u06D2";
          }
          if (data === null) {
            return "\u0646\u0644";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0627\u0646 \u067E\u0679",
      email: "\u0627\u06CC \u0645\u06CC\u0644 \u0627\u06CC\u0688\u0631\u06CC\u0633",
      url: "\u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644",
      emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC",
      uuid: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
      uuidv4: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 4",
      uuidv6: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 6",
      nanoid: "\u0646\u06CC\u0646\u0648 \u0622\u0626\u06CC \u0688\u06CC",
      guid: "\u062C\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
      cuid: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
      cuid2: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC 2",
      ulid: "\u06CC\u0648 \u0627\u06CC\u0644 \u0622\u0626\u06CC \u0688\u06CC",
      xid: "\u0627\u06CC\u06A9\u0633 \u0622\u0626\u06CC \u0688\u06CC",
      ksuid: "\u06A9\u06D2 \u0627\u06CC\u0633 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC",
      datetime: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0688\u06CC\u0679 \u0679\u0627\u0626\u0645",
      date: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u062A\u0627\u0631\u06CC\u062E",
      time: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0648\u0642\u062A",
      duration: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0645\u062F\u062A",
      ipv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0627\u06CC\u0688\u0631\u06CC\u0633",
      ipv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0627\u06CC\u0688\u0631\u06CC\u0633",
      cidrv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0631\u06CC\u0646\u062C",
      cidrv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0631\u06CC\u0646\u062C",
      base64: "\u0628\u06CC\u0633 64 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF",
      base64url: "\u0628\u06CC\u0633 64 \u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF",
      json_string: "\u062C\u06D2 \u0627\u06CC\u0633 \u0627\u0648 \u0627\u06CC\u0646 \u0633\u0679\u0631\u0646\u06AF",
      e164: "\u0627\u06CC 164 \u0646\u0645\u0628\u0631",
      jwt: "\u062C\u06D2 \u0688\u0628\u0644\u06CC\u0648 \u0679\u06CC",
      template_literal: "\u0627\u0646 \u067E\u0679"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${issue2.expected} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627\u060C ${parsedType8(issue2.input)} \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648\u0627`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${stringifyPrimitive(issue2.values[0])} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
          return `\u063A\u0644\u0637 \u0622\u067E\u0634\u0646: ${joinValues(issue2.values, "|")} \u0645\u06CC\u06BA \u0633\u06D2 \u0627\u06CC\u06A9 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u0628\u06C1\u062A \u0628\u0691\u0627: ${issue2.origin ?? "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u06D2 ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u0639\u0646\u0627\u0635\u0631"} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`;
          return `\u0628\u06C1\u062A \u0628\u0691\u0627: ${issue2.origin ?? "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u0627 ${adj}${issue2.maximum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${issue2.origin} \u06A9\u06D2 ${adj}${issue2.minimum.toString()} ${sizing.unit} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2`;
          }
          return `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${issue2.origin} \u06A9\u0627 ${adj}${issue2.minimum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.prefix}" \u0633\u06D2 \u0634\u0631\u0648\u0639 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
          }
          if (_issue.format === "ends_with")
            return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.suffix}" \u067E\u0631 \u062E\u062A\u0645 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
          if (_issue.format === "includes")
            return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${_issue.includes}" \u0634\u0627\u0645\u0644 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
          if (_issue.format === "regex")
            return `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: \u067E\u06CC\u0679\u0631\u0646 ${_issue.pattern} \u0633\u06D2 \u0645\u06CC\u0686 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
          return `\u063A\u0644\u0637 ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u063A\u0644\u0637 \u0646\u0645\u0628\u0631: ${issue2.divisor} \u06A9\u0627 \u0645\u0636\u0627\u0639\u0641 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        case "unrecognized_keys":
          return `\u063A\u06CC\u0631 \u062A\u0633\u0644\u06CC\u0645 \u0634\u062F\u06C1 \u06A9\u06CC${issue2.keys.length > 1 ? "\u0632" : ""}: ${joinValues(issue2.keys, "\u060C ")}`;
        case "invalid_key":
          return `${issue2.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u06A9\u06CC`;
        case "invalid_union":
          return "\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679";
        case "invalid_element":
          return `${issue2.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u0648\u06CC\u0644\u06CC\u0648`;
        default:
          return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679`;
      }
    };
  };
  function ur_default() {
    return {
      localeError: error41()
    };
  }

  // node_modules/zod/v4/locales/vi.js
  var error42 = () => {
    const Sizable = {
      string: { unit: "k\xFD t\u1EF1", verb: "c\xF3" },
      file: { unit: "byte", verb: "c\xF3" },
      array: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" },
      set: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "s\u1ED1";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "m\u1EA3ng";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u0111\u1EA7u v\xE0o",
      email: "\u0111\u1ECBa ch\u1EC9 email",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ng\xE0y gi\u1EDD ISO",
      date: "ng\xE0y ISO",
      time: "gi\u1EDD ISO",
      duration: "kho\u1EA3ng th\u1EDDi gian ISO",
      ipv4: "\u0111\u1ECBa ch\u1EC9 IPv4",
      ipv6: "\u0111\u1ECBa ch\u1EC9 IPv6",
      cidrv4: "d\u1EA3i IPv4",
      cidrv6: "d\u1EA3i IPv6",
      base64: "chu\u1ED7i m\xE3 h\xF3a base64",
      base64url: "chu\u1ED7i m\xE3 h\xF3a base64url",
      json_string: "chu\u1ED7i JSON",
      e164: "s\u1ED1 E.164",
      jwt: "JWT",
      template_literal: "\u0111\u1EA7u v\xE0o"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${issue2.expected}, nh\u1EADn \u0111\u01B0\u1EE3c ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${stringifyPrimitive(issue2.values[0])}`;
          return `T\xF9y ch\u1ECDn kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i m\u1ED9t trong c\xE1c gi\xE1 tr\u1ECB ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${issue2.origin ?? "gi\xE1 tr\u1ECB"} ${sizing.verb} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "ph\u1EA7n t\u1EED"}`;
          return `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${issue2.origin ?? "gi\xE1 tr\u1ECB"} ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i b\u1EAFt \u0111\u1EA7u b\u1EB1ng "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i k\u1EBFt th\xFAc b\u1EB1ng "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i bao g\u1ED3m "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i kh\u1EDBp v\u1EDBi m\u1EABu ${_issue.pattern}`;
          return `${Nouns[_issue.format] ?? issue2.format} kh\xF4ng h\u1EE3p l\u1EC7`;
        }
        case "not_multiple_of":
          return `S\u1ED1 kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i l\xE0 b\u1ED9i s\u1ED1 c\u1EE7a ${issue2.divisor}`;
        case "unrecognized_keys":
          return `Kh\xF3a kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADn d\u1EA1ng: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `Kh\xF3a kh\xF4ng h\u1EE3p l\u1EC7 trong ${issue2.origin}`;
        case "invalid_union":
          return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
        case "invalid_element":
          return `Gi\xE1 tr\u1ECB kh\xF4ng h\u1EE3p l\u1EC7 trong ${issue2.origin}`;
        default:
          return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7`;
      }
    };
  };
  function vi_default() {
    return {
      localeError: error42()
    };
  }

  // node_modules/zod/v4/locales/zh-CN.js
  var error43 = () => {
    const Sizable = {
      string: { unit: "\u5B57\u7B26", verb: "\u5305\u542B" },
      file: { unit: "\u5B57\u8282", verb: "\u5305\u542B" },
      array: { unit: "\u9879", verb: "\u5305\u542B" },
      set: { unit: "\u9879", verb: "\u5305\u542B" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "\u975E\u6570\u5B57(NaN)" : "\u6570\u5B57";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "\u6570\u7EC4";
          }
          if (data === null) {
            return "\u7A7A\u503C(null)";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u8F93\u5165",
      email: "\u7535\u5B50\u90AE\u4EF6",
      url: "URL",
      emoji: "\u8868\u60C5\u7B26\u53F7",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO\u65E5\u671F\u65F6\u95F4",
      date: "ISO\u65E5\u671F",
      time: "ISO\u65F6\u95F4",
      duration: "ISO\u65F6\u957F",
      ipv4: "IPv4\u5730\u5740",
      ipv6: "IPv6\u5730\u5740",
      cidrv4: "IPv4\u7F51\u6BB5",
      cidrv6: "IPv6\u7F51\u6BB5",
      base64: "base64\u7F16\u7801\u5B57\u7B26\u4E32",
      base64url: "base64url\u7F16\u7801\u5B57\u7B26\u4E32",
      json_string: "JSON\u5B57\u7B26\u4E32",
      e164: "E.164\u53F7\u7801",
      jwt: "JWT",
      template_literal: "\u8F93\u5165"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${issue2.expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${stringifyPrimitive(issue2.values[0])}`;
          return `\u65E0\u6548\u9009\u9879\uFF1A\u671F\u671B\u4EE5\u4E0B\u4E4B\u4E00 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${issue2.origin ?? "\u503C"} ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u4E2A\u5143\u7D20"}`;
          return `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${issue2.origin ?? "\u503C"} ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${issue2.origin} ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${issue2.origin} ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${_issue.prefix}" \u5F00\u5934`;
          if (_issue.format === "ends_with")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${_issue.suffix}" \u7ED3\u5C3E`;
          if (_issue.format === "includes")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u5305\u542B "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u6EE1\u8DB3\u6B63\u5219\u8868\u8FBE\u5F0F ${_issue.pattern}`;
          return `\u65E0\u6548${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u65E0\u6548\u6570\u5B57\uFF1A\u5FC5\u987B\u662F ${issue2.divisor} \u7684\u500D\u6570`;
        case "unrecognized_keys":
          return `\u51FA\u73B0\u672A\u77E5\u7684\u952E(key): ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `${issue2.origin} \u4E2D\u7684\u952E(key)\u65E0\u6548`;
        case "invalid_union":
          return "\u65E0\u6548\u8F93\u5165";
        case "invalid_element":
          return `${issue2.origin} \u4E2D\u5305\u542B\u65E0\u6548\u503C(value)`;
        default:
          return `\u65E0\u6548\u8F93\u5165`;
      }
    };
  };
  function zh_CN_default() {
    return {
      localeError: error43()
    };
  }

  // node_modules/zod/v4/locales/zh-TW.js
  var error44 = () => {
    const Sizable = {
      string: { unit: "\u5B57\u5143", verb: "\u64C1\u6709" },
      file: { unit: "\u4F4D\u5143\u7D44", verb: "\u64C1\u6709" },
      array: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" },
      set: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "number";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "array";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u8F38\u5165",
      email: "\u90F5\u4EF6\u5730\u5740",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "ISO \u65E5\u671F\u6642\u9593",
      date: "ISO \u65E5\u671F",
      time: "ISO \u6642\u9593",
      duration: "ISO \u671F\u9593",
      ipv4: "IPv4 \u4F4D\u5740",
      ipv6: "IPv6 \u4F4D\u5740",
      cidrv4: "IPv4 \u7BC4\u570D",
      cidrv6: "IPv6 \u7BC4\u570D",
      base64: "base64 \u7DE8\u78BC\u5B57\u4E32",
      base64url: "base64url \u7DE8\u78BC\u5B57\u4E32",
      json_string: "JSON \u5B57\u4E32",
      e164: "E.164 \u6578\u503C",
      jwt: "JWT",
      template_literal: "\u8F38\u5165"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${issue2.expected}\uFF0C\u4F46\u6536\u5230 ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${stringifyPrimitive(issue2.values[0])}`;
          return `\u7121\u6548\u7684\u9078\u9805\uFF1A\u9810\u671F\u70BA\u4EE5\u4E0B\u5176\u4E2D\u4E4B\u4E00 ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${issue2.origin ?? "\u503C"} \u61C9\u70BA ${adj}${issue2.maximum.toString()} ${sizing.unit ?? "\u500B\u5143\u7D20"}`;
          return `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${issue2.origin ?? "\u503C"} \u61C9\u70BA ${adj}${issue2.maximum.toString()}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing) {
            return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${issue2.origin} \u61C9\u70BA ${adj}${issue2.minimum.toString()} ${sizing.unit}`;
          }
          return `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${issue2.origin} \u61C9\u70BA ${adj}${issue2.minimum.toString()}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with") {
            return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${_issue.prefix}" \u958B\u982D`;
          }
          if (_issue.format === "ends_with")
            return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${_issue.suffix}" \u7D50\u5C3E`;
          if (_issue.format === "includes")
            return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u5305\u542B "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u7B26\u5408\u683C\u5F0F ${_issue.pattern}`;
          return `\u7121\u6548\u7684 ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `\u7121\u6548\u7684\u6578\u5B57\uFF1A\u5FC5\u9808\u70BA ${issue2.divisor} \u7684\u500D\u6578`;
        case "unrecognized_keys":
          return `\u7121\u6CD5\u8B58\u5225\u7684\u9375\u503C${issue2.keys.length > 1 ? "\u5011" : ""}\uFF1A${joinValues(issue2.keys, "\u3001")}`;
        case "invalid_key":
          return `${issue2.origin} \u4E2D\u6709\u7121\u6548\u7684\u9375\u503C`;
        case "invalid_union":
          return "\u7121\u6548\u7684\u8F38\u5165\u503C";
        case "invalid_element":
          return `${issue2.origin} \u4E2D\u6709\u7121\u6548\u7684\u503C`;
        default:
          return `\u7121\u6548\u7684\u8F38\u5165\u503C`;
      }
    };
  };
  function zh_TW_default() {
    return {
      localeError: error44()
    };
  }

  // node_modules/zod/v4/locales/yo.js
  var error45 = () => {
    const Sizable = {
      string: { unit: "\xE0mi", verb: "n\xED" },
      file: { unit: "bytes", verb: "n\xED" },
      array: { unit: "nkan", verb: "n\xED" },
      set: { unit: "nkan", verb: "n\xED" }
    };
    function getSizing(origin) {
      return Sizable[origin] ?? null;
    }
    const parsedType8 = (data) => {
      const t4 = typeof data;
      switch (t4) {
        case "number": {
          return Number.isNaN(data) ? "NaN" : "n\u1ECD\u0301mb\xE0";
        }
        case "object": {
          if (Array.isArray(data)) {
            return "akop\u1ECD";
          }
          if (data === null) {
            return "null";
          }
          if (Object.getPrototypeOf(data) !== Object.prototype && data.constructor) {
            return data.constructor.name;
          }
        }
      }
      return t4;
    };
    const Nouns = {
      regex: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9",
      email: "\xE0d\xEDr\u1EB9\u0301s\xEC \xECm\u1EB9\u0301l\xEC",
      url: "URL",
      emoji: "emoji",
      uuid: "UUID",
      uuidv4: "UUIDv4",
      uuidv6: "UUIDv6",
      nanoid: "nanoid",
      guid: "GUID",
      cuid: "cuid",
      cuid2: "cuid2",
      ulid: "ULID",
      xid: "XID",
      ksuid: "KSUID",
      datetime: "\xE0k\xF3k\xF2 ISO",
      date: "\u1ECDj\u1ECD\u0301 ISO",
      time: "\xE0k\xF3k\xF2 ISO",
      duration: "\xE0k\xF3k\xF2 t\xF3 p\xE9 ISO",
      ipv4: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv4",
      ipv6: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv6",
      cidrv4: "\xE0gb\xE8gb\xE8 IPv4",
      cidrv6: "\xE0gb\xE8gb\xE8 IPv6",
      base64: "\u1ECD\u0300r\u1ECD\u0300 t\xED a k\u1ECD\u0301 n\xED base64",
      base64url: "\u1ECD\u0300r\u1ECD\u0300 base64url",
      json_string: "\u1ECD\u0300r\u1ECD\u0300 JSON",
      e164: "n\u1ECD\u0301mb\xE0 E.164",
      jwt: "JWT",
      template_literal: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9"
    };
    return (issue2) => {
      switch (issue2.code) {
        case "invalid_type":
          return `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${issue2.expected}, \xE0m\u1ECD\u0300 a r\xED ${parsedType8(issue2.input)}`;
        case "invalid_value":
          if (issue2.values.length === 1)
            return `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${stringifyPrimitive(issue2.values[0])}`;
          return `\xC0\u1E63\xE0y\xE0n a\u1E63\xEC\u1E63e: yan \u1ECD\u0300kan l\xE1ra ${joinValues(issue2.values, "|")}`;
        case "too_big": {
          const adj = issue2.inclusive ? "<=" : "<";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${issue2.origin ?? "iye"} ${sizing.verb} ${adj}${issue2.maximum} ${sizing.unit}`;
          return `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 ${adj}${issue2.maximum}`;
        }
        case "too_small": {
          const adj = issue2.inclusive ? ">=" : ">";
          const sizing = getSizing(issue2.origin);
          if (sizing)
            return `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${issue2.origin} ${sizing.verb} ${adj}${issue2.minimum} ${sizing.unit}`;
          return `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 ${adj}${issue2.minimum}`;
        }
        case "invalid_format": {
          const _issue = issue2;
          if (_issue.format === "starts_with")
            return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\u1EB9\u0300r\u1EB9\u0300 p\u1EB9\u0300l\xFA "${_issue.prefix}"`;
          if (_issue.format === "ends_with")
            return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 par\xED p\u1EB9\u0300l\xFA "${_issue.suffix}"`;
          if (_issue.format === "includes")
            return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 n\xED "${_issue.includes}"`;
          if (_issue.format === "regex")
            return `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\xE1 \xE0p\u1EB9\u1EB9r\u1EB9 mu ${_issue.pattern}`;
          return `A\u1E63\xEC\u1E63e: ${Nouns[_issue.format] ?? issue2.format}`;
        }
        case "not_multiple_of":
          return `N\u1ECD\u0301mb\xE0 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 j\u1EB9\u0301 \xE8y\xE0 p\xEDp\xEDn ti ${issue2.divisor}`;
        case "unrecognized_keys":
          return `B\u1ECDt\xECn\xEC \xE0\xECm\u1ECD\u0300: ${joinValues(issue2.keys, ", ")}`;
        case "invalid_key":
          return `B\u1ECDt\xECn\xEC a\u1E63\xEC\u1E63e n\xEDn\xFA ${issue2.origin}`;
        case "invalid_union":
          return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
        case "invalid_element":
          return `Iye a\u1E63\xEC\u1E63e n\xEDn\xFA ${issue2.origin}`;
        default:
          return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
      }
    };
  };
  function yo_default() {
    return {
      localeError: error45()
    };
  }

  // node_modules/zod/v4/core/registries.js
  var $output = Symbol("ZodOutput");
  var $input = Symbol("ZodInput");
  var $ZodRegistry = class {
    constructor() {
      this._map = /* @__PURE__ */ new WeakMap();
      this._idmap = /* @__PURE__ */ new Map();
    }
    add(schema, ..._meta) {
      const meta = _meta[0];
      this._map.set(schema, meta);
      if (meta && typeof meta === "object" && "id" in meta) {
        if (this._idmap.has(meta.id)) {
          throw new Error(`ID ${meta.id} already exists in the registry`);
        }
        this._idmap.set(meta.id, schema);
      }
      return this;
    }
    clear() {
      this._map = /* @__PURE__ */ new WeakMap();
      this._idmap = /* @__PURE__ */ new Map();
      return this;
    }
    remove(schema) {
      const meta = this._map.get(schema);
      if (meta && typeof meta === "object" && "id" in meta) {
        this._idmap.delete(meta.id);
      }
      this._map.delete(schema);
      return this;
    }
    get(schema) {
      const p2 = schema._zod.parent;
      if (p2) {
        const pm2 = { ...this.get(p2) ?? {} };
        delete pm2.id;
        const f2 = { ...pm2, ...this._map.get(schema) };
        return Object.keys(f2).length ? f2 : void 0;
      }
      return this._map.get(schema);
    }
    has(schema) {
      return this._map.has(schema);
    }
  };
  function registry() {
    return new $ZodRegistry();
  }
  var globalRegistry = /* @__PURE__ */ registry();

  // node_modules/zod/v4/core/api.js
  function _string(Class2, params) {
    return new Class2({
      type: "string",
      ...normalizeParams(params)
    });
  }
  function _coercedString(Class2, params) {
    return new Class2({
      type: "string",
      coerce: true,
      ...normalizeParams(params)
    });
  }
  function _email(Class2, params) {
    return new Class2({
      type: "string",
      format: "email",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _guid(Class2, params) {
    return new Class2({
      type: "string",
      format: "guid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _uuid(Class2, params) {
    return new Class2({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _uuidv4(Class2, params) {
    return new Class2({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v4",
      ...normalizeParams(params)
    });
  }
  function _uuidv6(Class2, params) {
    return new Class2({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v6",
      ...normalizeParams(params)
    });
  }
  function _uuidv7(Class2, params) {
    return new Class2({
      type: "string",
      format: "uuid",
      check: "string_format",
      abort: false,
      version: "v7",
      ...normalizeParams(params)
    });
  }
  function _url(Class2, params) {
    return new Class2({
      type: "string",
      format: "url",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _emoji2(Class2, params) {
    return new Class2({
      type: "string",
      format: "emoji",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _nanoid(Class2, params) {
    return new Class2({
      type: "string",
      format: "nanoid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _cuid(Class2, params) {
    return new Class2({
      type: "string",
      format: "cuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _cuid2(Class2, params) {
    return new Class2({
      type: "string",
      format: "cuid2",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _ulid(Class2, params) {
    return new Class2({
      type: "string",
      format: "ulid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _xid(Class2, params) {
    return new Class2({
      type: "string",
      format: "xid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _ksuid(Class2, params) {
    return new Class2({
      type: "string",
      format: "ksuid",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _ipv4(Class2, params) {
    return new Class2({
      type: "string",
      format: "ipv4",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _ipv6(Class2, params) {
    return new Class2({
      type: "string",
      format: "ipv6",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _cidrv4(Class2, params) {
    return new Class2({
      type: "string",
      format: "cidrv4",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _cidrv6(Class2, params) {
    return new Class2({
      type: "string",
      format: "cidrv6",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _base64(Class2, params) {
    return new Class2({
      type: "string",
      format: "base64",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _base64url(Class2, params) {
    return new Class2({
      type: "string",
      format: "base64url",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _e164(Class2, params) {
    return new Class2({
      type: "string",
      format: "e164",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  function _jwt(Class2, params) {
    return new Class2({
      type: "string",
      format: "jwt",
      check: "string_format",
      abort: false,
      ...normalizeParams(params)
    });
  }
  var TimePrecision = {
    Any: null,
    Minute: -1,
    Second: 0,
    Millisecond: 3,
    Microsecond: 6
  };
  function _isoDateTime(Class2, params) {
    return new Class2({
      type: "string",
      format: "datetime",
      check: "string_format",
      offset: false,
      local: false,
      precision: null,
      ...normalizeParams(params)
    });
  }
  function _isoDate(Class2, params) {
    return new Class2({
      type: "string",
      format: "date",
      check: "string_format",
      ...normalizeParams(params)
    });
  }
  function _isoTime(Class2, params) {
    return new Class2({
      type: "string",
      format: "time",
      check: "string_format",
      precision: null,
      ...normalizeParams(params)
    });
  }
  function _isoDuration(Class2, params) {
    return new Class2({
      type: "string",
      format: "duration",
      check: "string_format",
      ...normalizeParams(params)
    });
  }
  function _number(Class2, params) {
    return new Class2({
      type: "number",
      checks: [],
      ...normalizeParams(params)
    });
  }
  function _coercedNumber(Class2, params) {
    return new Class2({
      type: "number",
      coerce: true,
      checks: [],
      ...normalizeParams(params)
    });
  }
  function _int(Class2, params) {
    return new Class2({
      type: "number",
      check: "number_format",
      abort: false,
      format: "safeint",
      ...normalizeParams(params)
    });
  }
  function _float32(Class2, params) {
    return new Class2({
      type: "number",
      check: "number_format",
      abort: false,
      format: "float32",
      ...normalizeParams(params)
    });
  }
  function _float64(Class2, params) {
    return new Class2({
      type: "number",
      check: "number_format",
      abort: false,
      format: "float64",
      ...normalizeParams(params)
    });
  }
  function _int32(Class2, params) {
    return new Class2({
      type: "number",
      check: "number_format",
      abort: false,
      format: "int32",
      ...normalizeParams(params)
    });
  }
  function _uint32(Class2, params) {
    return new Class2({
      type: "number",
      check: "number_format",
      abort: false,
      format: "uint32",
      ...normalizeParams(params)
    });
  }
  function _boolean(Class2, params) {
    return new Class2({
      type: "boolean",
      ...normalizeParams(params)
    });
  }
  function _coercedBoolean(Class2, params) {
    return new Class2({
      type: "boolean",
      coerce: true,
      ...normalizeParams(params)
    });
  }
  function _bigint(Class2, params) {
    return new Class2({
      type: "bigint",
      ...normalizeParams(params)
    });
  }
  function _coercedBigint(Class2, params) {
    return new Class2({
      type: "bigint",
      coerce: true,
      ...normalizeParams(params)
    });
  }
  function _int64(Class2, params) {
    return new Class2({
      type: "bigint",
      check: "bigint_format",
      abort: false,
      format: "int64",
      ...normalizeParams(params)
    });
  }
  function _uint64(Class2, params) {
    return new Class2({
      type: "bigint",
      check: "bigint_format",
      abort: false,
      format: "uint64",
      ...normalizeParams(params)
    });
  }
  function _symbol(Class2, params) {
    return new Class2({
      type: "symbol",
      ...normalizeParams(params)
    });
  }
  function _undefined2(Class2, params) {
    return new Class2({
      type: "undefined",
      ...normalizeParams(params)
    });
  }
  function _null2(Class2, params) {
    return new Class2({
      type: "null",
      ...normalizeParams(params)
    });
  }
  function _any(Class2) {
    return new Class2({
      type: "any"
    });
  }
  function _unknown(Class2) {
    return new Class2({
      type: "unknown"
    });
  }
  function _never(Class2, params) {
    return new Class2({
      type: "never",
      ...normalizeParams(params)
    });
  }
  function _void(Class2, params) {
    return new Class2({
      type: "void",
      ...normalizeParams(params)
    });
  }
  function _date(Class2, params) {
    return new Class2({
      type: "date",
      ...normalizeParams(params)
    });
  }
  function _coercedDate(Class2, params) {
    return new Class2({
      type: "date",
      coerce: true,
      ...normalizeParams(params)
    });
  }
  function _nan(Class2, params) {
    return new Class2({
      type: "nan",
      ...normalizeParams(params)
    });
  }
  function _lt(value, params) {
    return new $ZodCheckLessThan({
      check: "less_than",
      ...normalizeParams(params),
      value,
      inclusive: false
    });
  }
  function _lte(value, params) {
    return new $ZodCheckLessThan({
      check: "less_than",
      ...normalizeParams(params),
      value,
      inclusive: true
    });
  }
  function _gt(value, params) {
    return new $ZodCheckGreaterThan({
      check: "greater_than",
      ...normalizeParams(params),
      value,
      inclusive: false
    });
  }
  function _gte(value, params) {
    return new $ZodCheckGreaterThan({
      check: "greater_than",
      ...normalizeParams(params),
      value,
      inclusive: true
    });
  }
  function _positive(params) {
    return _gt(0, params);
  }
  function _negative(params) {
    return _lt(0, params);
  }
  function _nonpositive(params) {
    return _lte(0, params);
  }
  function _nonnegative(params) {
    return _gte(0, params);
  }
  function _multipleOf(value, params) {
    return new $ZodCheckMultipleOf({
      check: "multiple_of",
      ...normalizeParams(params),
      value
    });
  }
  function _maxSize(maximum, params) {
    return new $ZodCheckMaxSize({
      check: "max_size",
      ...normalizeParams(params),
      maximum
    });
  }
  function _minSize(minimum, params) {
    return new $ZodCheckMinSize({
      check: "min_size",
      ...normalizeParams(params),
      minimum
    });
  }
  function _size(size, params) {
    return new $ZodCheckSizeEquals({
      check: "size_equals",
      ...normalizeParams(params),
      size
    });
  }
  function _maxLength(maximum, params) {
    const ch = new $ZodCheckMaxLength({
      check: "max_length",
      ...normalizeParams(params),
      maximum
    });
    return ch;
  }
  function _minLength(minimum, params) {
    return new $ZodCheckMinLength({
      check: "min_length",
      ...normalizeParams(params),
      minimum
    });
  }
  function _length(length, params) {
    return new $ZodCheckLengthEquals({
      check: "length_equals",
      ...normalizeParams(params),
      length
    });
  }
  function _regex(pattern, params) {
    return new $ZodCheckRegex({
      check: "string_format",
      format: "regex",
      ...normalizeParams(params),
      pattern
    });
  }
  function _lowercase(params) {
    return new $ZodCheckLowerCase({
      check: "string_format",
      format: "lowercase",
      ...normalizeParams(params)
    });
  }
  function _uppercase(params) {
    return new $ZodCheckUpperCase({
      check: "string_format",
      format: "uppercase",
      ...normalizeParams(params)
    });
  }
  function _includes(includes, params) {
    return new $ZodCheckIncludes({
      check: "string_format",
      format: "includes",
      ...normalizeParams(params),
      includes
    });
  }
  function _startsWith(prefix, params) {
    return new $ZodCheckStartsWith({
      check: "string_format",
      format: "starts_with",
      ...normalizeParams(params),
      prefix
    });
  }
  function _endsWith(suffix, params) {
    return new $ZodCheckEndsWith({
      check: "string_format",
      format: "ends_with",
      ...normalizeParams(params),
      suffix
    });
  }
  function _property(property, schema, params) {
    return new $ZodCheckProperty({
      check: "property",
      property,
      schema,
      ...normalizeParams(params)
    });
  }
  function _mime(types, params) {
    return new $ZodCheckMimeType({
      check: "mime_type",
      mime: types,
      ...normalizeParams(params)
    });
  }
  function _overwrite(tx) {
    return new $ZodCheckOverwrite({
      check: "overwrite",
      tx
    });
  }
  function _normalize(form) {
    return _overwrite((input) => input.normalize(form));
  }
  function _trim() {
    return _overwrite((input) => input.trim());
  }
  function _toLowerCase() {
    return _overwrite((input) => input.toLowerCase());
  }
  function _toUpperCase() {
    return _overwrite((input) => input.toUpperCase());
  }
  function _array(Class2, element, params) {
    return new Class2({
      type: "array",
      element,
      // get element() {
      //   return element;
      // },
      ...normalizeParams(params)
    });
  }
  function _union(Class2, options, params) {
    return new Class2({
      type: "union",
      options,
      ...normalizeParams(params)
    });
  }
  function _discriminatedUnion(Class2, discriminator, options, params) {
    return new Class2({
      type: "union",
      options,
      discriminator,
      ...normalizeParams(params)
    });
  }
  function _intersection(Class2, left, right) {
    return new Class2({
      type: "intersection",
      left,
      right
    });
  }
  function _tuple(Class2, items, _paramsOrRest, _params) {
    const hasRest = _paramsOrRest instanceof $ZodType;
    const params = hasRest ? _params : _paramsOrRest;
    const rest = hasRest ? _paramsOrRest : null;
    return new Class2({
      type: "tuple",
      items,
      rest,
      ...normalizeParams(params)
    });
  }
  function _record(Class2, keyType, valueType, params) {
    return new Class2({
      type: "record",
      keyType,
      valueType,
      ...normalizeParams(params)
    });
  }
  function _map(Class2, keyType, valueType, params) {
    return new Class2({
      type: "map",
      keyType,
      valueType,
      ...normalizeParams(params)
    });
  }
  function _set(Class2, valueType, params) {
    return new Class2({
      type: "set",
      valueType,
      ...normalizeParams(params)
    });
  }
  function _enum(Class2, values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v4) => [v4, v4])) : values;
    return new Class2({
      type: "enum",
      entries,
      ...normalizeParams(params)
    });
  }
  function _nativeEnum(Class2, entries, params) {
    return new Class2({
      type: "enum",
      entries,
      ...normalizeParams(params)
    });
  }
  function _literal(Class2, value, params) {
    return new Class2({
      type: "literal",
      values: Array.isArray(value) ? value : [value],
      ...normalizeParams(params)
    });
  }
  function _file(Class2, params) {
    return new Class2({
      type: "file",
      ...normalizeParams(params)
    });
  }
  function _transform(Class2, fn3) {
    return new Class2({
      type: "transform",
      transform: fn3
    });
  }
  function _optional(Class2, innerType) {
    return new Class2({
      type: "optional",
      innerType
    });
  }
  function _nullable(Class2, innerType) {
    return new Class2({
      type: "nullable",
      innerType
    });
  }
  function _default(Class2, innerType, defaultValue) {
    return new Class2({
      type: "default",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
      }
    });
  }
  function _nonoptional(Class2, innerType, params) {
    return new Class2({
      type: "nonoptional",
      innerType,
      ...normalizeParams(params)
    });
  }
  function _success(Class2, innerType) {
    return new Class2({
      type: "success",
      innerType
    });
  }
  function _catch(Class2, innerType, catchValue) {
    return new Class2({
      type: "catch",
      innerType,
      catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
    });
  }
  function _pipe(Class2, in_, out) {
    return new Class2({
      type: "pipe",
      in: in_,
      out
    });
  }
  function _readonly(Class2, innerType) {
    return new Class2({
      type: "readonly",
      innerType
    });
  }
  function _templateLiteral(Class2, parts, params) {
    return new Class2({
      type: "template_literal",
      parts,
      ...normalizeParams(params)
    });
  }
  function _lazy(Class2, getter) {
    return new Class2({
      type: "lazy",
      getter
    });
  }
  function _promise(Class2, innerType) {
    return new Class2({
      type: "promise",
      innerType
    });
  }
  function _custom(Class2, fn3, _params) {
    const norm = normalizeParams(_params);
    norm.abort ?? (norm.abort = true);
    const schema = new Class2({
      type: "custom",
      check: "custom",
      fn: fn3,
      ...norm
    });
    return schema;
  }
  function _refine(Class2, fn3, _params) {
    const schema = new Class2({
      type: "custom",
      check: "custom",
      fn: fn3,
      ...normalizeParams(_params)
    });
    return schema;
  }
  function _superRefine(fn3) {
    const ch = _check((payload) => {
      payload.addIssue = (issue2) => {
        if (typeof issue2 === "string") {
          payload.issues.push(issue(issue2, payload.value, ch._zod.def));
        } else {
          const _issue = issue2;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = ch);
          _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
          payload.issues.push(issue(_issue));
        }
      };
      return fn3(payload.value, payload);
    });
    return ch;
  }
  function _check(fn3, params) {
    const ch = new $ZodCheck({
      check: "custom",
      ...normalizeParams(params)
    });
    ch._zod.check = fn3;
    return ch;
  }
  function _stringbool(Classes, _params) {
    const params = normalizeParams(_params);
    let truthyArray = params.truthy ?? ["true", "1", "yes", "on", "y", "enabled"];
    let falsyArray = params.falsy ?? ["false", "0", "no", "off", "n", "disabled"];
    if (params.case !== "sensitive") {
      truthyArray = truthyArray.map((v4) => typeof v4 === "string" ? v4.toLowerCase() : v4);
      falsyArray = falsyArray.map((v4) => typeof v4 === "string" ? v4.toLowerCase() : v4);
    }
    const truthySet = new Set(truthyArray);
    const falsySet = new Set(falsyArray);
    const _Codec = Classes.Codec ?? $ZodCodec;
    const _Boolean = Classes.Boolean ?? $ZodBoolean;
    const _String = Classes.String ?? $ZodString;
    const stringSchema = new _String({ type: "string", error: params.error });
    const booleanSchema = new _Boolean({ type: "boolean", error: params.error });
    const codec2 = new _Codec({
      type: "pipe",
      in: stringSchema,
      out: booleanSchema,
      transform: (input, payload) => {
        let data = input;
        if (params.case !== "sensitive")
          data = data.toLowerCase();
        if (truthySet.has(data)) {
          return true;
        } else if (falsySet.has(data)) {
          return false;
        } else {
          payload.issues.push({
            code: "invalid_value",
            expected: "stringbool",
            values: [...truthySet, ...falsySet],
            input: payload.value,
            inst: codec2,
            continue: false
          });
          return {};
        }
      },
      reverseTransform: (input, _payload) => {
        if (input === true) {
          return truthyArray[0] || "true";
        } else {
          return falsyArray[0] || "false";
        }
      },
      error: params.error
    });
    return codec2;
  }
  function _stringFormat(Class2, format, fnOrRegex, _params = {}) {
    const params = normalizeParams(_params);
    const def = {
      ...normalizeParams(_params),
      check: "string_format",
      type: "string",
      format,
      fn: typeof fnOrRegex === "function" ? fnOrRegex : (val) => fnOrRegex.test(val),
      ...params
    };
    if (fnOrRegex instanceof RegExp) {
      def.pattern = fnOrRegex;
    }
    const inst = new Class2(def);
    return inst;
  }

  // node_modules/zod/v4/core/to-json-schema.js
  var JSONSchemaGenerator = class {
    constructor(params) {
      this.counter = 0;
      this.metadataRegistry = params?.metadata ?? globalRegistry;
      this.target = params?.target ?? "draft-2020-12";
      this.unrepresentable = params?.unrepresentable ?? "throw";
      this.override = params?.override ?? (() => {
      });
      this.io = params?.io ?? "output";
      this.seen = /* @__PURE__ */ new Map();
    }
    process(schema, _params = { path: [], schemaPath: [] }) {
      var _a2;
      const def = schema._zod.def;
      const formatMap = {
        guid: "uuid",
        url: "uri",
        datetime: "date-time",
        json_string: "json-string",
        regex: ""
        // do not set
      };
      const seen = this.seen.get(schema);
      if (seen) {
        seen.count++;
        const isCycle = _params.schemaPath.includes(schema);
        if (isCycle) {
          seen.cycle = _params.path;
        }
        return seen.schema;
      }
      const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
      this.seen.set(schema, result);
      const overrideSchema = schema._zod.toJSONSchema?.();
      if (overrideSchema) {
        result.schema = overrideSchema;
      } else {
        const params = {
          ..._params,
          schemaPath: [..._params.schemaPath, schema],
          path: _params.path
        };
        const parent = schema._zod.parent;
        if (parent) {
          result.ref = parent;
          this.process(parent, params);
          this.seen.get(parent).isParent = true;
        } else {
          const _json = result.schema;
          switch (def.type) {
            case "string": {
              const json2 = _json;
              json2.type = "string";
              const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
              if (typeof minimum === "number")
                json2.minLength = minimum;
              if (typeof maximum === "number")
                json2.maxLength = maximum;
              if (format) {
                json2.format = formatMap[format] ?? format;
                if (json2.format === "")
                  delete json2.format;
              }
              if (contentEncoding)
                json2.contentEncoding = contentEncoding;
              if (patterns && patterns.size > 0) {
                const regexes = [...patterns];
                if (regexes.length === 1)
                  json2.pattern = regexes[0].source;
                else if (regexes.length > 1) {
                  result.schema.allOf = [
                    ...regexes.map((regex) => ({
                      ...this.target === "draft-7" || this.target === "draft-4" || this.target === "openapi-3.0" ? { type: "string" } : {},
                      pattern: regex.source
                    }))
                  ];
                }
              }
              break;
            }
            case "number": {
              const json2 = _json;
              const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
              if (typeof format === "string" && format.includes("int"))
                json2.type = "integer";
              else
                json2.type = "number";
              if (typeof exclusiveMinimum === "number") {
                if (this.target === "draft-4" || this.target === "openapi-3.0") {
                  json2.minimum = exclusiveMinimum;
                  json2.exclusiveMinimum = true;
                } else {
                  json2.exclusiveMinimum = exclusiveMinimum;
                }
              }
              if (typeof minimum === "number") {
                json2.minimum = minimum;
                if (typeof exclusiveMinimum === "number" && this.target !== "draft-4") {
                  if (exclusiveMinimum >= minimum)
                    delete json2.minimum;
                  else
                    delete json2.exclusiveMinimum;
                }
              }
              if (typeof exclusiveMaximum === "number") {
                if (this.target === "draft-4" || this.target === "openapi-3.0") {
                  json2.maximum = exclusiveMaximum;
                  json2.exclusiveMaximum = true;
                } else {
                  json2.exclusiveMaximum = exclusiveMaximum;
                }
              }
              if (typeof maximum === "number") {
                json2.maximum = maximum;
                if (typeof exclusiveMaximum === "number" && this.target !== "draft-4") {
                  if (exclusiveMaximum <= maximum)
                    delete json2.maximum;
                  else
                    delete json2.exclusiveMaximum;
                }
              }
              if (typeof multipleOf === "number")
                json2.multipleOf = multipleOf;
              break;
            }
            case "boolean": {
              const json2 = _json;
              json2.type = "boolean";
              break;
            }
            case "bigint": {
              if (this.unrepresentable === "throw") {
                throw new Error("BigInt cannot be represented in JSON Schema");
              }
              break;
            }
            case "symbol": {
              if (this.unrepresentable === "throw") {
                throw new Error("Symbols cannot be represented in JSON Schema");
              }
              break;
            }
            case "null": {
              if (this.target === "openapi-3.0") {
                _json.type = "string";
                _json.nullable = true;
                _json.enum = [null];
              } else
                _json.type = "null";
              break;
            }
            case "any": {
              break;
            }
            case "unknown": {
              break;
            }
            case "undefined": {
              if (this.unrepresentable === "throw") {
                throw new Error("Undefined cannot be represented in JSON Schema");
              }
              break;
            }
            case "void": {
              if (this.unrepresentable === "throw") {
                throw new Error("Void cannot be represented in JSON Schema");
              }
              break;
            }
            case "never": {
              _json.not = {};
              break;
            }
            case "date": {
              if (this.unrepresentable === "throw") {
                throw new Error("Date cannot be represented in JSON Schema");
              }
              break;
            }
            case "array": {
              const json2 = _json;
              const { minimum, maximum } = schema._zod.bag;
              if (typeof minimum === "number")
                json2.minItems = minimum;
              if (typeof maximum === "number")
                json2.maxItems = maximum;
              json2.type = "array";
              json2.items = this.process(def.element, { ...params, path: [...params.path, "items"] });
              break;
            }
            case "object": {
              const json2 = _json;
              json2.type = "object";
              json2.properties = {};
              const shape = def.shape;
              for (const key in shape) {
                json2.properties[key] = this.process(shape[key], {
                  ...params,
                  path: [...params.path, "properties", key]
                });
              }
              const allKeys = new Set(Object.keys(shape));
              const requiredKeys = new Set([...allKeys].filter((key) => {
                const v4 = def.shape[key]._zod;
                if (this.io === "input") {
                  return v4.optin === void 0;
                } else {
                  return v4.optout === void 0;
                }
              }));
              if (requiredKeys.size > 0) {
                json2.required = Array.from(requiredKeys);
              }
              if (def.catchall?._zod.def.type === "never") {
                json2.additionalProperties = false;
              } else if (!def.catchall) {
                if (this.io === "output")
                  json2.additionalProperties = false;
              } else if (def.catchall) {
                json2.additionalProperties = this.process(def.catchall, {
                  ...params,
                  path: [...params.path, "additionalProperties"]
                });
              }
              break;
            }
            case "union": {
              const json2 = _json;
              const options = def.options.map((x3, i4) => this.process(x3, {
                ...params,
                path: [...params.path, "anyOf", i4]
              }));
              json2.anyOf = options;
              break;
            }
            case "intersection": {
              const json2 = _json;
              const a5 = this.process(def.left, {
                ...params,
                path: [...params.path, "allOf", 0]
              });
              const b2 = this.process(def.right, {
                ...params,
                path: [...params.path, "allOf", 1]
              });
              const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
              const allOf = [
                ...isSimpleIntersection(a5) ? a5.allOf : [a5],
                ...isSimpleIntersection(b2) ? b2.allOf : [b2]
              ];
              json2.allOf = allOf;
              break;
            }
            case "tuple": {
              const json2 = _json;
              json2.type = "array";
              const prefixPath = this.target === "draft-2020-12" ? "prefixItems" : "items";
              const restPath = this.target === "draft-2020-12" ? "items" : this.target === "openapi-3.0" ? "items" : "additionalItems";
              const prefixItems = def.items.map((x3, i4) => this.process(x3, {
                ...params,
                path: [...params.path, prefixPath, i4]
              }));
              const rest = def.rest ? this.process(def.rest, {
                ...params,
                path: [...params.path, restPath, ...this.target === "openapi-3.0" ? [def.items.length] : []]
              }) : null;
              if (this.target === "draft-2020-12") {
                json2.prefixItems = prefixItems;
                if (rest) {
                  json2.items = rest;
                }
              } else if (this.target === "openapi-3.0") {
                json2.items = {
                  anyOf: prefixItems
                };
                if (rest) {
                  json2.items.anyOf.push(rest);
                }
                json2.minItems = prefixItems.length;
                if (!rest) {
                  json2.maxItems = prefixItems.length;
                }
              } else {
                json2.items = prefixItems;
                if (rest) {
                  json2.additionalItems = rest;
                }
              }
              const { minimum, maximum } = schema._zod.bag;
              if (typeof minimum === "number")
                json2.minItems = minimum;
              if (typeof maximum === "number")
                json2.maxItems = maximum;
              break;
            }
            case "record": {
              const json2 = _json;
              json2.type = "object";
              if (this.target === "draft-7" || this.target === "draft-2020-12") {
                json2.propertyNames = this.process(def.keyType, {
                  ...params,
                  path: [...params.path, "propertyNames"]
                });
              }
              json2.additionalProperties = this.process(def.valueType, {
                ...params,
                path: [...params.path, "additionalProperties"]
              });
              break;
            }
            case "map": {
              if (this.unrepresentable === "throw") {
                throw new Error("Map cannot be represented in JSON Schema");
              }
              break;
            }
            case "set": {
              if (this.unrepresentable === "throw") {
                throw new Error("Set cannot be represented in JSON Schema");
              }
              break;
            }
            case "enum": {
              const json2 = _json;
              const values = getEnumValues(def.entries);
              if (values.every((v4) => typeof v4 === "number"))
                json2.type = "number";
              if (values.every((v4) => typeof v4 === "string"))
                json2.type = "string";
              json2.enum = values;
              break;
            }
            case "literal": {
              const json2 = _json;
              const vals = [];
              for (const val of def.values) {
                if (val === void 0) {
                  if (this.unrepresentable === "throw") {
                    throw new Error("Literal `undefined` cannot be represented in JSON Schema");
                  } else {
                  }
                } else if (typeof val === "bigint") {
                  if (this.unrepresentable === "throw") {
                    throw new Error("BigInt literals cannot be represented in JSON Schema");
                  } else {
                    vals.push(Number(val));
                  }
                } else {
                  vals.push(val);
                }
              }
              if (vals.length === 0) {
              } else if (vals.length === 1) {
                const val = vals[0];
                json2.type = val === null ? "null" : typeof val;
                if (this.target === "draft-4" || this.target === "openapi-3.0") {
                  json2.enum = [val];
                } else {
                  json2.const = val;
                }
              } else {
                if (vals.every((v4) => typeof v4 === "number"))
                  json2.type = "number";
                if (vals.every((v4) => typeof v4 === "string"))
                  json2.type = "string";
                if (vals.every((v4) => typeof v4 === "boolean"))
                  json2.type = "string";
                if (vals.every((v4) => v4 === null))
                  json2.type = "null";
                json2.enum = vals;
              }
              break;
            }
            case "file": {
              const json2 = _json;
              const file2 = {
                type: "string",
                format: "binary",
                contentEncoding: "binary"
              };
              const { minimum, maximum, mime } = schema._zod.bag;
              if (minimum !== void 0)
                file2.minLength = minimum;
              if (maximum !== void 0)
                file2.maxLength = maximum;
              if (mime) {
                if (mime.length === 1) {
                  file2.contentMediaType = mime[0];
                  Object.assign(json2, file2);
                } else {
                  json2.anyOf = mime.map((m2) => {
                    const mFile = { ...file2, contentMediaType: m2 };
                    return mFile;
                  });
                }
              } else {
                Object.assign(json2, file2);
              }
              break;
            }
            case "transform": {
              if (this.unrepresentable === "throw") {
                throw new Error("Transforms cannot be represented in JSON Schema");
              }
              break;
            }
            case "nullable": {
              const inner = this.process(def.innerType, params);
              if (this.target === "openapi-3.0") {
                result.ref = def.innerType;
                _json.nullable = true;
              } else {
                _json.anyOf = [inner, { type: "null" }];
              }
              break;
            }
            case "nonoptional": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              break;
            }
            case "success": {
              const json2 = _json;
              json2.type = "boolean";
              break;
            }
            case "default": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              _json.default = JSON.parse(JSON.stringify(def.defaultValue));
              break;
            }
            case "prefault": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              if (this.io === "input")
                _json._prefault = JSON.parse(JSON.stringify(def.defaultValue));
              break;
            }
            case "catch": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              let catchValue;
              try {
                catchValue = def.catchValue(void 0);
              } catch {
                throw new Error("Dynamic catch values are not supported in JSON Schema");
              }
              _json.default = catchValue;
              break;
            }
            case "nan": {
              if (this.unrepresentable === "throw") {
                throw new Error("NaN cannot be represented in JSON Schema");
              }
              break;
            }
            case "template_literal": {
              const json2 = _json;
              const pattern = schema._zod.pattern;
              if (!pattern)
                throw new Error("Pattern not found in template literal");
              json2.type = "string";
              json2.pattern = pattern.source;
              break;
            }
            case "pipe": {
              const innerType = this.io === "input" ? def.in._zod.def.type === "transform" ? def.out : def.in : def.out;
              this.process(innerType, params);
              result.ref = innerType;
              break;
            }
            case "readonly": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              _json.readOnly = true;
              break;
            }
            case "promise": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              break;
            }
            case "optional": {
              this.process(def.innerType, params);
              result.ref = def.innerType;
              break;
            }
            case "lazy": {
              const innerType = schema._zod.innerType;
              this.process(innerType, params);
              result.ref = innerType;
              break;
            }
            case "custom": {
              if (this.unrepresentable === "throw") {
                throw new Error("Custom types cannot be represented in JSON Schema");
              }
              break;
            }
            case "function": {
              if (this.unrepresentable === "throw") {
                throw new Error("Function types cannot be represented in JSON Schema");
              }
              break;
            }
            default: {
              def;
            }
          }
        }
      }
      const meta = this.metadataRegistry.get(schema);
      if (meta)
        Object.assign(result.schema, meta);
      if (this.io === "input" && isTransforming(schema)) {
        delete result.schema.examples;
        delete result.schema.default;
      }
      if (this.io === "input" && result.schema._prefault)
        (_a2 = result.schema).default ?? (_a2.default = result.schema._prefault);
      delete result.schema._prefault;
      const _result = this.seen.get(schema);
      return _result.schema;
    }
    emit(schema, _params) {
      const params = {
        cycles: _params?.cycles ?? "ref",
        reused: _params?.reused ?? "inline",
        // unrepresentable: _params?.unrepresentable ?? "throw",
        // uri: _params?.uri ?? ((id) => `${id}`),
        external: _params?.external ?? void 0
      };
      const root = this.seen.get(schema);
      if (!root)
        throw new Error("Unprocessed schema. This is a bug in Zod.");
      const makeURI = (entry) => {
        const defsSegment = this.target === "draft-2020-12" ? "$defs" : "definitions";
        if (params.external) {
          const externalId = params.external.registry.get(entry[0])?.id;
          const uriGenerator = params.external.uri ?? ((id3) => id3);
          if (externalId) {
            return { ref: uriGenerator(externalId) };
          }
          const id2 = entry[1].defId ?? entry[1].schema.id ?? `schema${this.counter++}`;
          entry[1].defId = id2;
          return { defId: id2, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id2}` };
        }
        if (entry[1] === root) {
          return { ref: "#" };
        }
        const uriPrefix = `#`;
        const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
        const defId = entry[1].schema.id ?? `__schema${this.counter++}`;
        return { defId, ref: defUriPrefix + defId };
      };
      const extractToDef = (entry) => {
        if (entry[1].schema.$ref) {
          return;
        }
        const seen = entry[1];
        const { ref, defId } = makeURI(entry);
        seen.def = { ...seen.schema };
        if (defId)
          seen.defId = defId;
        const schema2 = seen.schema;
        for (const key in schema2) {
          delete schema2[key];
        }
        schema2.$ref = ref;
      };
      if (params.cycles === "throw") {
        for (const entry of this.seen.entries()) {
          const seen = entry[1];
          if (seen.cycle) {
            throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
          }
        }
      }
      for (const entry of this.seen.entries()) {
        const seen = entry[1];
        if (schema === entry[0]) {
          extractToDef(entry);
          continue;
        }
        if (params.external) {
          const ext = params.external.registry.get(entry[0])?.id;
          if (schema !== entry[0] && ext) {
            extractToDef(entry);
            continue;
          }
        }
        const id2 = this.metadataRegistry.get(entry[0])?.id;
        if (id2) {
          extractToDef(entry);
          continue;
        }
        if (seen.cycle) {
          extractToDef(entry);
          continue;
        }
        if (seen.count > 1) {
          if (params.reused === "ref") {
            extractToDef(entry);
            continue;
          }
        }
      }
      const flattenRef = (zodSchema, params2) => {
        const seen = this.seen.get(zodSchema);
        const schema2 = seen.def ?? seen.schema;
        const _cached = { ...schema2 };
        if (seen.ref === null) {
          return;
        }
        const ref = seen.ref;
        seen.ref = null;
        if (ref) {
          flattenRef(ref, params2);
          const refSchema = this.seen.get(ref).schema;
          if (refSchema.$ref && (params2.target === "draft-7" || params2.target === "draft-4" || params2.target === "openapi-3.0")) {
            schema2.allOf = schema2.allOf ?? [];
            schema2.allOf.push(refSchema);
          } else {
            Object.assign(schema2, refSchema);
            Object.assign(schema2, _cached);
          }
        }
        if (!seen.isParent)
          this.override({
            zodSchema,
            jsonSchema: schema2,
            path: seen.path ?? []
          });
      };
      for (const entry of [...this.seen.entries()].reverse()) {
        flattenRef(entry[0], { target: this.target });
      }
      const result = {};
      if (this.target === "draft-2020-12") {
        result.$schema = "https://json-schema.org/draft/2020-12/schema";
      } else if (this.target === "draft-7") {
        result.$schema = "http://json-schema.org/draft-07/schema#";
      } else if (this.target === "draft-4") {
        result.$schema = "http://json-schema.org/draft-04/schema#";
      } else if (this.target === "openapi-3.0") {
      } else {
        console.warn(`Invalid target: ${this.target}`);
      }
      if (params.external?.uri) {
        const id2 = params.external.registry.get(schema)?.id;
        if (!id2)
          throw new Error("Schema is missing an `id` property");
        result.$id = params.external.uri(id2);
      }
      Object.assign(result, root.def);
      const defs = params.external?.defs ?? {};
      for (const entry of this.seen.entries()) {
        const seen = entry[1];
        if (seen.def && seen.defId) {
          defs[seen.defId] = seen.def;
        }
      }
      if (params.external) {
      } else {
        if (Object.keys(defs).length > 0) {
          if (this.target === "draft-2020-12") {
            result.$defs = defs;
          } else {
            result.definitions = defs;
          }
        }
      }
      try {
        return JSON.parse(JSON.stringify(result));
      } catch (_err) {
        throw new Error("Error converting schema to JSON.");
      }
    }
  };
  function toJSONSchema(input, _params) {
    if (input instanceof $ZodRegistry) {
      const gen2 = new JSONSchemaGenerator(_params);
      const defs = {};
      for (const entry of input._idmap.entries()) {
        const [_4, schema] = entry;
        gen2.process(schema);
      }
      const schemas = {};
      const external = {
        registry: input,
        uri: _params?.uri,
        defs
      };
      for (const entry of input._idmap.entries()) {
        const [key, schema] = entry;
        schemas[key] = gen2.emit(schema, {
          ..._params,
          external
        });
      }
      if (Object.keys(defs).length > 0) {
        const defsSegment = gen2.target === "draft-2020-12" ? "$defs" : "definitions";
        schemas.__shared = {
          [defsSegment]: defs
        };
      }
      return { schemas };
    }
    const gen = new JSONSchemaGenerator(_params);
    gen.process(input);
    return gen.emit(input, _params);
  }
  function isTransforming(_schema, _ctx) {
    const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
    if (ctx.seen.has(_schema))
      return false;
    ctx.seen.add(_schema);
    const schema = _schema;
    const def = schema._zod.def;
    switch (def.type) {
      case "string":
      case "number":
      case "bigint":
      case "boolean":
      case "date":
      case "symbol":
      case "undefined":
      case "null":
      case "any":
      case "unknown":
      case "never":
      case "void":
      case "literal":
      case "enum":
      case "nan":
      case "file":
      case "template_literal":
        return false;
      case "array": {
        return isTransforming(def.element, ctx);
      }
      case "object": {
        for (const key in def.shape) {
          if (isTransforming(def.shape[key], ctx))
            return true;
        }
        return false;
      }
      case "union": {
        for (const option of def.options) {
          if (isTransforming(option, ctx))
            return true;
        }
        return false;
      }
      case "intersection": {
        return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
      }
      case "tuple": {
        for (const item of def.items) {
          if (isTransforming(item, ctx))
            return true;
        }
        if (def.rest && isTransforming(def.rest, ctx))
          return true;
        return false;
      }
      case "record": {
        return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
      }
      case "map": {
        return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
      }
      case "set": {
        return isTransforming(def.valueType, ctx);
      }
      case "promise":
      case "optional":
      case "nonoptional":
      case "nullable":
      case "readonly":
        return isTransforming(def.innerType, ctx);
      case "lazy":
        return isTransforming(def.getter(), ctx);
      case "default": {
        return isTransforming(def.innerType, ctx);
      }
      case "prefault": {
        return isTransforming(def.innerType, ctx);
      }
      case "custom": {
        return false;
      }
      case "transform": {
        return true;
      }
      case "pipe": {
        return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
      }
      case "success": {
        return false;
      }
      case "catch": {
        return false;
      }
      case "function": {
        return false;
      }
      default:
        def;
    }
    throw new Error(`Unknown schema type: ${def.type}`);
  }

  // node_modules/zod/v4/core/json-schema.js
  var json_schema_exports = {};

  // node_modules/zod/v4/classic/iso.js
  var iso_exports = {};
  __export(iso_exports, {
    ZodISODate: () => ZodISODate,
    ZodISODateTime: () => ZodISODateTime,
    ZodISODuration: () => ZodISODuration,
    ZodISOTime: () => ZodISOTime,
    date: () => date2,
    datetime: () => datetime2,
    duration: () => duration2,
    time: () => time2
  });
  var ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
    $ZodISODateTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function datetime2(params) {
    return _isoDateTime(ZodISODateTime, params);
  }
  var ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
    $ZodISODate.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function date2(params) {
    return _isoDate(ZodISODate, params);
  }
  var ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
    $ZodISOTime.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function time2(params) {
    return _isoTime(ZodISOTime, params);
  }
  var ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
    $ZodISODuration.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function duration2(params) {
    return _isoDuration(ZodISODuration, params);
  }

  // node_modules/zod/v4/classic/errors.js
  var initializer2 = (inst, issues) => {
    $ZodError.init(inst, issues);
    inst.name = "ZodError";
    Object.defineProperties(inst, {
      format: {
        value: (mapper) => formatError(inst, mapper)
        // enumerable: false,
      },
      flatten: {
        value: (mapper) => flattenError(inst, mapper)
        // enumerable: false,
      },
      addIssue: {
        value: (issue2) => {
          inst.issues.push(issue2);
          inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
        }
        // enumerable: false,
      },
      addIssues: {
        value: (issues2) => {
          inst.issues.push(...issues2);
          inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
        }
        // enumerable: false,
      },
      isEmpty: {
        get() {
          return inst.issues.length === 0;
        }
        // enumerable: false,
      }
    });
  };
  var ZodError = $constructor("ZodError", initializer2);
  var ZodRealError = $constructor("ZodError", initializer2, {
    Parent: Error
  });

  // node_modules/zod/v4/classic/parse.js
  var parse2 = /* @__PURE__ */ _parse(ZodRealError);
  var parseAsync2 = /* @__PURE__ */ _parseAsync(ZodRealError);
  var safeParse2 = /* @__PURE__ */ _safeParse(ZodRealError);
  var safeParseAsync2 = /* @__PURE__ */ _safeParseAsync(ZodRealError);
  var encode2 = /* @__PURE__ */ _encode(ZodRealError);
  var decode2 = /* @__PURE__ */ _decode(ZodRealError);
  var encodeAsync2 = /* @__PURE__ */ _encodeAsync(ZodRealError);
  var decodeAsync2 = /* @__PURE__ */ _decodeAsync(ZodRealError);
  var safeEncode2 = /* @__PURE__ */ _safeEncode(ZodRealError);
  var safeDecode2 = /* @__PURE__ */ _safeDecode(ZodRealError);
  var safeEncodeAsync2 = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
  var safeDecodeAsync2 = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);

  // node_modules/zod/v4/classic/schemas.js
  var ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
    $ZodType.init(inst, def);
    inst.def = def;
    inst.type = def.type;
    Object.defineProperty(inst, "_def", { value: def });
    inst.check = (...checks) => {
      return inst.clone(util_exports.mergeDefs(def, {
        checks: [
          ...def.checks ?? [],
          ...checks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }));
    };
    inst.clone = (def2, params) => clone(inst, def2, params);
    inst.brand = () => inst;
    inst.register = (reg, meta) => {
      reg.add(inst, meta);
      return inst;
    };
    inst.parse = (data, params) => parse2(inst, data, params, { callee: inst.parse });
    inst.safeParse = (data, params) => safeParse2(inst, data, params);
    inst.parseAsync = async (data, params) => parseAsync2(inst, data, params, { callee: inst.parseAsync });
    inst.safeParseAsync = async (data, params) => safeParseAsync2(inst, data, params);
    inst.spa = inst.safeParseAsync;
    inst.encode = (data, params) => encode2(inst, data, params);
    inst.decode = (data, params) => decode2(inst, data, params);
    inst.encodeAsync = async (data, params) => encodeAsync2(inst, data, params);
    inst.decodeAsync = async (data, params) => decodeAsync2(inst, data, params);
    inst.safeEncode = (data, params) => safeEncode2(inst, data, params);
    inst.safeDecode = (data, params) => safeDecode2(inst, data, params);
    inst.safeEncodeAsync = async (data, params) => safeEncodeAsync2(inst, data, params);
    inst.safeDecodeAsync = async (data, params) => safeDecodeAsync2(inst, data, params);
    inst.refine = (check2, params) => inst.check(refine(check2, params));
    inst.superRefine = (refinement) => inst.check(superRefine(refinement));
    inst.overwrite = (fn3) => inst.check(_overwrite(fn3));
    inst.optional = () => optional(inst);
    inst.nullable = () => nullable(inst);
    inst.nullish = () => optional(nullable(inst));
    inst.nonoptional = (params) => nonoptional(inst, params);
    inst.array = () => array(inst);
    inst.or = (arg) => union([inst, arg]);
    inst.and = (arg) => intersection(inst, arg);
    inst.transform = (tx) => pipe(inst, transform(tx));
    inst.default = (def2) => _default2(inst, def2);
    inst.prefault = (def2) => prefault(inst, def2);
    inst.catch = (params) => _catch2(inst, params);
    inst.pipe = (target) => pipe(inst, target);
    inst.readonly = () => readonly(inst);
    inst.describe = (description) => {
      const cl2 = inst.clone();
      globalRegistry.add(cl2, { description });
      return cl2;
    };
    Object.defineProperty(inst, "description", {
      get() {
        return globalRegistry.get(inst)?.description;
      },
      configurable: true
    });
    inst.meta = (...args) => {
      if (args.length === 0) {
        return globalRegistry.get(inst);
      }
      const cl2 = inst.clone();
      globalRegistry.add(cl2, args[0]);
      return cl2;
    };
    inst.isOptional = () => inst.safeParse(void 0).success;
    inst.isNullable = () => inst.safeParse(null).success;
    return inst;
  });
  var _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    ZodType.init(inst, def);
    const bag = inst._zod.bag;
    inst.format = bag.format ?? null;
    inst.minLength = bag.minimum ?? null;
    inst.maxLength = bag.maximum ?? null;
    inst.regex = (...args) => inst.check(_regex(...args));
    inst.includes = (...args) => inst.check(_includes(...args));
    inst.startsWith = (...args) => inst.check(_startsWith(...args));
    inst.endsWith = (...args) => inst.check(_endsWith(...args));
    inst.min = (...args) => inst.check(_minLength(...args));
    inst.max = (...args) => inst.check(_maxLength(...args));
    inst.length = (...args) => inst.check(_length(...args));
    inst.nonempty = (...args) => inst.check(_minLength(1, ...args));
    inst.lowercase = (params) => inst.check(_lowercase(params));
    inst.uppercase = (params) => inst.check(_uppercase(params));
    inst.trim = () => inst.check(_trim());
    inst.normalize = (...args) => inst.check(_normalize(...args));
    inst.toLowerCase = () => inst.check(_toLowerCase());
    inst.toUpperCase = () => inst.check(_toUpperCase());
  });
  var ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
    $ZodString.init(inst, def);
    _ZodString.init(inst, def);
    inst.email = (params) => inst.check(_email(ZodEmail, params));
    inst.url = (params) => inst.check(_url(ZodURL, params));
    inst.jwt = (params) => inst.check(_jwt(ZodJWT, params));
    inst.emoji = (params) => inst.check(_emoji2(ZodEmoji, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.uuid = (params) => inst.check(_uuid(ZodUUID, params));
    inst.uuidv4 = (params) => inst.check(_uuidv4(ZodUUID, params));
    inst.uuidv6 = (params) => inst.check(_uuidv6(ZodUUID, params));
    inst.uuidv7 = (params) => inst.check(_uuidv7(ZodUUID, params));
    inst.nanoid = (params) => inst.check(_nanoid(ZodNanoID, params));
    inst.guid = (params) => inst.check(_guid(ZodGUID, params));
    inst.cuid = (params) => inst.check(_cuid(ZodCUID, params));
    inst.cuid2 = (params) => inst.check(_cuid2(ZodCUID2, params));
    inst.ulid = (params) => inst.check(_ulid(ZodULID, params));
    inst.base64 = (params) => inst.check(_base64(ZodBase64, params));
    inst.base64url = (params) => inst.check(_base64url(ZodBase64URL, params));
    inst.xid = (params) => inst.check(_xid(ZodXID, params));
    inst.ksuid = (params) => inst.check(_ksuid(ZodKSUID, params));
    inst.ipv4 = (params) => inst.check(_ipv4(ZodIPv4, params));
    inst.ipv6 = (params) => inst.check(_ipv6(ZodIPv6, params));
    inst.cidrv4 = (params) => inst.check(_cidrv4(ZodCIDRv4, params));
    inst.cidrv6 = (params) => inst.check(_cidrv6(ZodCIDRv6, params));
    inst.e164 = (params) => inst.check(_e164(ZodE164, params));
    inst.datetime = (params) => inst.check(datetime2(params));
    inst.date = (params) => inst.check(date2(params));
    inst.time = (params) => inst.check(time2(params));
    inst.duration = (params) => inst.check(duration2(params));
  });
  function string2(params) {
    return _string(ZodString, params);
  }
  var ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
    $ZodStringFormat.init(inst, def);
    _ZodString.init(inst, def);
  });
  var ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
    $ZodEmail.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function email2(params) {
    return _email(ZodEmail, params);
  }
  var ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
    $ZodGUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function guid2(params) {
    return _guid(ZodGUID, params);
  }
  var ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
    $ZodUUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function uuid2(params) {
    return _uuid(ZodUUID, params);
  }
  function uuidv4(params) {
    return _uuidv4(ZodUUID, params);
  }
  function uuidv6(params) {
    return _uuidv6(ZodUUID, params);
  }
  function uuidv7(params) {
    return _uuidv7(ZodUUID, params);
  }
  var ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
    $ZodURL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function url(params) {
    return _url(ZodURL, params);
  }
  function httpUrl(params) {
    return _url(ZodURL, {
      protocol: /^https?$/,
      hostname: regexes_exports.domain,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
    $ZodEmoji.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function emoji2(params) {
    return _emoji2(ZodEmoji, params);
  }
  var ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
    $ZodNanoID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function nanoid2(params) {
    return _nanoid(ZodNanoID, params);
  }
  var ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
    $ZodCUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function cuid3(params) {
    return _cuid(ZodCUID, params);
  }
  var ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
    $ZodCUID2.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function cuid22(params) {
    return _cuid2(ZodCUID2, params);
  }
  var ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
    $ZodULID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function ulid2(params) {
    return _ulid(ZodULID, params);
  }
  var ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
    $ZodXID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function xid2(params) {
    return _xid(ZodXID, params);
  }
  var ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
    $ZodKSUID.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function ksuid2(params) {
    return _ksuid(ZodKSUID, params);
  }
  var ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
    $ZodIPv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function ipv42(params) {
    return _ipv4(ZodIPv4, params);
  }
  var ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
    $ZodIPv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function ipv62(params) {
    return _ipv6(ZodIPv6, params);
  }
  var ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
    $ZodCIDRv4.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function cidrv42(params) {
    return _cidrv4(ZodCIDRv4, params);
  }
  var ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
    $ZodCIDRv6.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function cidrv62(params) {
    return _cidrv6(ZodCIDRv6, params);
  }
  var ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
    $ZodBase64.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function base642(params) {
    return _base64(ZodBase64, params);
  }
  var ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
    $ZodBase64URL.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function base64url2(params) {
    return _base64url(ZodBase64URL, params);
  }
  var ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
    $ZodE164.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function e1642(params) {
    return _e164(ZodE164, params);
  }
  var ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
    $ZodJWT.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function jwt(params) {
    return _jwt(ZodJWT, params);
  }
  var ZodCustomStringFormat = /* @__PURE__ */ $constructor("ZodCustomStringFormat", (inst, def) => {
    $ZodCustomStringFormat.init(inst, def);
    ZodStringFormat.init(inst, def);
  });
  function stringFormat(format, fnOrRegex, _params = {}) {
    return _stringFormat(ZodCustomStringFormat, format, fnOrRegex, _params);
  }
  function hostname2(_params) {
    return _stringFormat(ZodCustomStringFormat, "hostname", regexes_exports.hostname, _params);
  }
  function hex2(_params) {
    return _stringFormat(ZodCustomStringFormat, "hex", regexes_exports.hex, _params);
  }
  function hash(alg, params) {
    const enc = params?.enc ?? "hex";
    const format = `${alg}_${enc}`;
    const regex = regexes_exports[format];
    if (!regex)
      throw new Error(`Unrecognized hash format: ${format}`);
    return _stringFormat(ZodCustomStringFormat, format, regex, params);
  }
  var ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
    $ZodNumber.init(inst, def);
    ZodType.init(inst, def);
    inst.gt = (value, params) => inst.check(_gt(value, params));
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.lt = (value, params) => inst.check(_lt(value, params));
    inst.lte = (value, params) => inst.check(_lte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    inst.int = (params) => inst.check(int(params));
    inst.safe = (params) => inst.check(int(params));
    inst.positive = (params) => inst.check(_gt(0, params));
    inst.nonnegative = (params) => inst.check(_gte(0, params));
    inst.negative = (params) => inst.check(_lt(0, params));
    inst.nonpositive = (params) => inst.check(_lte(0, params));
    inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
    inst.step = (value, params) => inst.check(_multipleOf(value, params));
    inst.finite = () => inst;
    const bag = inst._zod.bag;
    inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
    inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
    inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
    inst.isFinite = true;
    inst.format = bag.format ?? null;
  });
  function number2(params) {
    return _number(ZodNumber, params);
  }
  var ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
    $ZodNumberFormat.init(inst, def);
    ZodNumber.init(inst, def);
  });
  function int(params) {
    return _int(ZodNumberFormat, params);
  }
  function float32(params) {
    return _float32(ZodNumberFormat, params);
  }
  function float64(params) {
    return _float64(ZodNumberFormat, params);
  }
  function int32(params) {
    return _int32(ZodNumberFormat, params);
  }
  function uint32(params) {
    return _uint32(ZodNumberFormat, params);
  }
  var ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
    $ZodBoolean.init(inst, def);
    ZodType.init(inst, def);
  });
  function boolean2(params) {
    return _boolean(ZodBoolean, params);
  }
  var ZodBigInt = /* @__PURE__ */ $constructor("ZodBigInt", (inst, def) => {
    $ZodBigInt.init(inst, def);
    ZodType.init(inst, def);
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.gt = (value, params) => inst.check(_gt(value, params));
    inst.gte = (value, params) => inst.check(_gte(value, params));
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.lt = (value, params) => inst.check(_lt(value, params));
    inst.lte = (value, params) => inst.check(_lte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    inst.positive = (params) => inst.check(_gt(BigInt(0), params));
    inst.negative = (params) => inst.check(_lt(BigInt(0), params));
    inst.nonpositive = (params) => inst.check(_lte(BigInt(0), params));
    inst.nonnegative = (params) => inst.check(_gte(BigInt(0), params));
    inst.multipleOf = (value, params) => inst.check(_multipleOf(value, params));
    const bag = inst._zod.bag;
    inst.minValue = bag.minimum ?? null;
    inst.maxValue = bag.maximum ?? null;
    inst.format = bag.format ?? null;
  });
  function bigint2(params) {
    return _bigint(ZodBigInt, params);
  }
  var ZodBigIntFormat = /* @__PURE__ */ $constructor("ZodBigIntFormat", (inst, def) => {
    $ZodBigIntFormat.init(inst, def);
    ZodBigInt.init(inst, def);
  });
  function int64(params) {
    return _int64(ZodBigIntFormat, params);
  }
  function uint64(params) {
    return _uint64(ZodBigIntFormat, params);
  }
  var ZodSymbol = /* @__PURE__ */ $constructor("ZodSymbol", (inst, def) => {
    $ZodSymbol.init(inst, def);
    ZodType.init(inst, def);
  });
  function symbol(params) {
    return _symbol(ZodSymbol, params);
  }
  var ZodUndefined = /* @__PURE__ */ $constructor("ZodUndefined", (inst, def) => {
    $ZodUndefined.init(inst, def);
    ZodType.init(inst, def);
  });
  function _undefined3(params) {
    return _undefined2(ZodUndefined, params);
  }
  var ZodNull = /* @__PURE__ */ $constructor("ZodNull", (inst, def) => {
    $ZodNull.init(inst, def);
    ZodType.init(inst, def);
  });
  function _null3(params) {
    return _null2(ZodNull, params);
  }
  var ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
    $ZodAny.init(inst, def);
    ZodType.init(inst, def);
  });
  function any() {
    return _any(ZodAny);
  }
  var ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
    $ZodUnknown.init(inst, def);
    ZodType.init(inst, def);
  });
  function unknown() {
    return _unknown(ZodUnknown);
  }
  var ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
    $ZodNever.init(inst, def);
    ZodType.init(inst, def);
  });
  function never(params) {
    return _never(ZodNever, params);
  }
  var ZodVoid = /* @__PURE__ */ $constructor("ZodVoid", (inst, def) => {
    $ZodVoid.init(inst, def);
    ZodType.init(inst, def);
  });
  function _void2(params) {
    return _void(ZodVoid, params);
  }
  var ZodDate = /* @__PURE__ */ $constructor("ZodDate", (inst, def) => {
    $ZodDate.init(inst, def);
    ZodType.init(inst, def);
    inst.min = (value, params) => inst.check(_gte(value, params));
    inst.max = (value, params) => inst.check(_lte(value, params));
    const c3 = inst._zod.bag;
    inst.minDate = c3.minimum ? new Date(c3.minimum) : null;
    inst.maxDate = c3.maximum ? new Date(c3.maximum) : null;
  });
  function date3(params) {
    return _date(ZodDate, params);
  }
  var ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
    $ZodArray.init(inst, def);
    ZodType.init(inst, def);
    inst.element = def.element;
    inst.min = (minLength, params) => inst.check(_minLength(minLength, params));
    inst.nonempty = (params) => inst.check(_minLength(1, params));
    inst.max = (maxLength, params) => inst.check(_maxLength(maxLength, params));
    inst.length = (len, params) => inst.check(_length(len, params));
    inst.unwrap = () => inst.element;
  });
  function array(element, params) {
    return _array(ZodArray, element, params);
  }
  function keyof(schema) {
    const shape = schema._zod.def.shape;
    return _enum2(Object.keys(shape));
  }
  var ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
    $ZodObjectJIT.init(inst, def);
    ZodType.init(inst, def);
    util_exports.defineLazy(inst, "shape", () => {
      return def.shape;
    });
    inst.keyof = () => _enum2(Object.keys(inst._zod.def.shape));
    inst.catchall = (catchall) => inst.clone({ ...inst._zod.def, catchall });
    inst.passthrough = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.loose = () => inst.clone({ ...inst._zod.def, catchall: unknown() });
    inst.strict = () => inst.clone({ ...inst._zod.def, catchall: never() });
    inst.strip = () => inst.clone({ ...inst._zod.def, catchall: void 0 });
    inst.extend = (incoming) => {
      return util_exports.extend(inst, incoming);
    };
    inst.safeExtend = (incoming) => {
      return util_exports.safeExtend(inst, incoming);
    };
    inst.merge = (other) => util_exports.merge(inst, other);
    inst.pick = (mask) => util_exports.pick(inst, mask);
    inst.omit = (mask) => util_exports.omit(inst, mask);
    inst.partial = (...args) => util_exports.partial(ZodOptional, inst, args[0]);
    inst.required = (...args) => util_exports.required(ZodNonOptional, inst, args[0]);
  });
  function object(shape, params) {
    const def = {
      type: "object",
      shape: shape ?? {},
      ...util_exports.normalizeParams(params)
    };
    return new ZodObject(def);
  }
  function strictObject(shape, params) {
    return new ZodObject({
      type: "object",
      shape,
      catchall: never(),
      ...util_exports.normalizeParams(params)
    });
  }
  function looseObject(shape, params) {
    return new ZodObject({
      type: "object",
      shape,
      catchall: unknown(),
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
    $ZodUnion.init(inst, def);
    ZodType.init(inst, def);
    inst.options = def.options;
  });
  function union(options, params) {
    return new ZodUnion({
      type: "union",
      options,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodDiscriminatedUnion = /* @__PURE__ */ $constructor("ZodDiscriminatedUnion", (inst, def) => {
    ZodUnion.init(inst, def);
    $ZodDiscriminatedUnion.init(inst, def);
  });
  function discriminatedUnion(discriminator, options, params) {
    return new ZodDiscriminatedUnion({
      type: "union",
      options,
      discriminator,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
    $ZodIntersection.init(inst, def);
    ZodType.init(inst, def);
  });
  function intersection(left, right) {
    return new ZodIntersection({
      type: "intersection",
      left,
      right
    });
  }
  var ZodTuple = /* @__PURE__ */ $constructor("ZodTuple", (inst, def) => {
    $ZodTuple.init(inst, def);
    ZodType.init(inst, def);
    inst.rest = (rest) => inst.clone({
      ...inst._zod.def,
      rest
    });
  });
  function tuple(items, _paramsOrRest, _params) {
    const hasRest = _paramsOrRest instanceof $ZodType;
    const params = hasRest ? _params : _paramsOrRest;
    const rest = hasRest ? _paramsOrRest : null;
    return new ZodTuple({
      type: "tuple",
      items,
      rest,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
    $ZodRecord.init(inst, def);
    ZodType.init(inst, def);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  function record(keyType, valueType, params) {
    return new ZodRecord({
      type: "record",
      keyType,
      valueType,
      ...util_exports.normalizeParams(params)
    });
  }
  function partialRecord(keyType, valueType, params) {
    const k4 = clone(keyType);
    k4._zod.values = void 0;
    return new ZodRecord({
      type: "record",
      keyType: k4,
      valueType,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodMap = /* @__PURE__ */ $constructor("ZodMap", (inst, def) => {
    $ZodMap.init(inst, def);
    ZodType.init(inst, def);
    inst.keyType = def.keyType;
    inst.valueType = def.valueType;
  });
  function map(keyType, valueType, params) {
    return new ZodMap({
      type: "map",
      keyType,
      valueType,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodSet = /* @__PURE__ */ $constructor("ZodSet", (inst, def) => {
    $ZodSet.init(inst, def);
    ZodType.init(inst, def);
    inst.min = (...args) => inst.check(_minSize(...args));
    inst.nonempty = (params) => inst.check(_minSize(1, params));
    inst.max = (...args) => inst.check(_maxSize(...args));
    inst.size = (...args) => inst.check(_size(...args));
  });
  function set(valueType, params) {
    return new ZodSet({
      type: "set",
      valueType,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
    $ZodEnum.init(inst, def);
    ZodType.init(inst, def);
    inst.enum = def.entries;
    inst.options = Object.values(def.entries);
    const keys = new Set(Object.keys(def.entries));
    inst.extract = (values, params) => {
      const newEntries = {};
      for (const value of values) {
        if (keys.has(value)) {
          newEntries[value] = def.entries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...util_exports.normalizeParams(params),
        entries: newEntries
      });
    };
    inst.exclude = (values, params) => {
      const newEntries = { ...def.entries };
      for (const value of values) {
        if (keys.has(value)) {
          delete newEntries[value];
        } else
          throw new Error(`Key ${value} not found in enum`);
      }
      return new ZodEnum({
        ...def,
        checks: [],
        ...util_exports.normalizeParams(params),
        entries: newEntries
      });
    };
  });
  function _enum2(values, params) {
    const entries = Array.isArray(values) ? Object.fromEntries(values.map((v4) => [v4, v4])) : values;
    return new ZodEnum({
      type: "enum",
      entries,
      ...util_exports.normalizeParams(params)
    });
  }
  function nativeEnum(entries, params) {
    return new ZodEnum({
      type: "enum",
      entries,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
    $ZodLiteral.init(inst, def);
    ZodType.init(inst, def);
    inst.values = new Set(def.values);
    Object.defineProperty(inst, "value", {
      get() {
        if (def.values.length > 1) {
          throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
        }
        return def.values[0];
      }
    });
  });
  function literal(value, params) {
    return new ZodLiteral({
      type: "literal",
      values: Array.isArray(value) ? value : [value],
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodFile = /* @__PURE__ */ $constructor("ZodFile", (inst, def) => {
    $ZodFile.init(inst, def);
    ZodType.init(inst, def);
    inst.min = (size, params) => inst.check(_minSize(size, params));
    inst.max = (size, params) => inst.check(_maxSize(size, params));
    inst.mime = (types, params) => inst.check(_mime(Array.isArray(types) ? types : [types], params));
  });
  function file(params) {
    return _file(ZodFile, params);
  }
  var ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
    $ZodTransform.init(inst, def);
    ZodType.init(inst, def);
    inst._zod.parse = (payload, _ctx) => {
      if (_ctx.direction === "backward") {
        throw new $ZodEncodeError(inst.constructor.name);
      }
      payload.addIssue = (issue2) => {
        if (typeof issue2 === "string") {
          payload.issues.push(util_exports.issue(issue2, payload.value, def));
        } else {
          const _issue = issue2;
          if (_issue.fatal)
            _issue.continue = false;
          _issue.code ?? (_issue.code = "custom");
          _issue.input ?? (_issue.input = payload.value);
          _issue.inst ?? (_issue.inst = inst);
          payload.issues.push(util_exports.issue(_issue));
        }
      };
      const output = def.transform(payload.value, payload);
      if (output instanceof Promise) {
        return output.then((output2) => {
          payload.value = output2;
          return payload;
        });
      }
      payload.value = output;
      return payload;
    };
  });
  function transform(fn3) {
    return new ZodTransform({
      type: "transform",
      transform: fn3
    });
  }
  var ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
    $ZodOptional.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function optional(innerType) {
    return new ZodOptional({
      type: "optional",
      innerType
    });
  }
  var ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
    $ZodNullable.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nullable(innerType) {
    return new ZodNullable({
      type: "nullable",
      innerType
    });
  }
  function nullish2(innerType) {
    return optional(nullable(innerType));
  }
  var ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
    $ZodDefault.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeDefault = inst.unwrap;
  });
  function _default2(innerType, defaultValue) {
    return new ZodDefault({
      type: "default",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
      }
    });
  }
  var ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
    $ZodPrefault.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function prefault(innerType, defaultValue) {
    return new ZodPrefault({
      type: "prefault",
      innerType,
      get defaultValue() {
        return typeof defaultValue === "function" ? defaultValue() : util_exports.shallowClone(defaultValue);
      }
    });
  }
  var ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
    $ZodNonOptional.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function nonoptional(innerType, params) {
    return new ZodNonOptional({
      type: "nonoptional",
      innerType,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodSuccess = /* @__PURE__ */ $constructor("ZodSuccess", (inst, def) => {
    $ZodSuccess.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function success(innerType) {
    return new ZodSuccess({
      type: "success",
      innerType
    });
  }
  var ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
    $ZodCatch.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
    inst.removeCatch = inst.unwrap;
  });
  function _catch2(innerType, catchValue) {
    return new ZodCatch({
      type: "catch",
      innerType,
      catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
    });
  }
  var ZodNaN = /* @__PURE__ */ $constructor("ZodNaN", (inst, def) => {
    $ZodNaN.init(inst, def);
    ZodType.init(inst, def);
  });
  function nan(params) {
    return _nan(ZodNaN, params);
  }
  var ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
    $ZodPipe.init(inst, def);
    ZodType.init(inst, def);
    inst.in = def.in;
    inst.out = def.out;
  });
  function pipe(in_, out) {
    return new ZodPipe({
      type: "pipe",
      in: in_,
      out
      // ...util.normalizeParams(params),
    });
  }
  var ZodCodec = /* @__PURE__ */ $constructor("ZodCodec", (inst, def) => {
    ZodPipe.init(inst, def);
    $ZodCodec.init(inst, def);
  });
  function codec(in_, out, params) {
    return new ZodCodec({
      type: "pipe",
      in: in_,
      out,
      transform: params.decode,
      reverseTransform: params.encode
    });
  }
  var ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
    $ZodReadonly.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function readonly(innerType) {
    return new ZodReadonly({
      type: "readonly",
      innerType
    });
  }
  var ZodTemplateLiteral = /* @__PURE__ */ $constructor("ZodTemplateLiteral", (inst, def) => {
    $ZodTemplateLiteral.init(inst, def);
    ZodType.init(inst, def);
  });
  function templateLiteral(parts, params) {
    return new ZodTemplateLiteral({
      type: "template_literal",
      parts,
      ...util_exports.normalizeParams(params)
    });
  }
  var ZodLazy = /* @__PURE__ */ $constructor("ZodLazy", (inst, def) => {
    $ZodLazy.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.getter();
  });
  function lazy(getter) {
    return new ZodLazy({
      type: "lazy",
      getter
    });
  }
  var ZodPromise = /* @__PURE__ */ $constructor("ZodPromise", (inst, def) => {
    $ZodPromise.init(inst, def);
    ZodType.init(inst, def);
    inst.unwrap = () => inst._zod.def.innerType;
  });
  function promise(innerType) {
    return new ZodPromise({
      type: "promise",
      innerType
    });
  }
  var ZodFunction = /* @__PURE__ */ $constructor("ZodFunction", (inst, def) => {
    $ZodFunction.init(inst, def);
    ZodType.init(inst, def);
  });
  function _function(params) {
    return new ZodFunction({
      type: "function",
      input: Array.isArray(params?.input) ? tuple(params?.input) : params?.input ?? array(unknown()),
      output: params?.output ?? unknown()
    });
  }
  var ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
    $ZodCustom.init(inst, def);
    ZodType.init(inst, def);
  });
  function check(fn3) {
    const ch = new $ZodCheck({
      check: "custom"
      // ...util.normalizeParams(params),
    });
    ch._zod.check = fn3;
    return ch;
  }
  function custom(fn3, _params) {
    return _custom(ZodCustom, fn3 ?? (() => true), _params);
  }
  function refine(fn3, _params = {}) {
    return _refine(ZodCustom, fn3, _params);
  }
  function superRefine(fn3) {
    return _superRefine(fn3);
  }
  function _instanceof(cls, params = {
    error: `Input not instance of ${cls.name}`
  }) {
    const inst = new ZodCustom({
      type: "custom",
      check: "custom",
      fn: (data) => data instanceof cls,
      abort: true,
      ...util_exports.normalizeParams(params)
    });
    inst._zod.bag.Class = cls;
    return inst;
  }
  var stringbool = (...args) => _stringbool({
    Codec: ZodCodec,
    Boolean: ZodBoolean,
    String: ZodString
  }, ...args);
  function json(params) {
    const jsonSchema = lazy(() => {
      return union([string2(params), number2(), boolean2(), _null3(), array(jsonSchema), record(string2(), jsonSchema)]);
    });
    return jsonSchema;
  }
  function preprocess(fn3, schema) {
    return pipe(transform(fn3), schema);
  }

  // node_modules/zod/v4/classic/compat.js
  var ZodIssueCode = {
    invalid_type: "invalid_type",
    too_big: "too_big",
    too_small: "too_small",
    invalid_format: "invalid_format",
    not_multiple_of: "not_multiple_of",
    unrecognized_keys: "unrecognized_keys",
    invalid_union: "invalid_union",
    invalid_key: "invalid_key",
    invalid_element: "invalid_element",
    invalid_value: "invalid_value",
    custom: "custom"
  };
  function setErrorMap(map2) {
    config({
      customError: map2
    });
  }
  function getErrorMap() {
    return config().customError;
  }
  var ZodFirstPartyTypeKind;
  /* @__PURE__ */ (function(ZodFirstPartyTypeKind2) {
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));

  // node_modules/zod/v4/classic/coerce.js
  var coerce_exports = {};
  __export(coerce_exports, {
    bigint: () => bigint3,
    boolean: () => boolean3,
    date: () => date4,
    number: () => number3,
    string: () => string3
  });
  function string3(params) {
    return _coercedString(ZodString, params);
  }
  function number3(params) {
    return _coercedNumber(ZodNumber, params);
  }
  function boolean3(params) {
    return _coercedBoolean(ZodBoolean, params);
  }
  function bigint3(params) {
    return _coercedBigint(ZodBigInt, params);
  }
  function date4(params) {
    return _coercedDate(ZodDate, params);
  }

  // node_modules/zod/v4/classic/external.js
  config(en_default());

  // node_modules/@walkeros/core/dist/index.mjs
  var e = Object.defineProperty;
  var n = (n6, t4) => {
    for (var i4 in t4)
      e(n6, i4, { get: t4[i4], enumerable: true });
  };
  function h(e6, n6, t4 = "draft-7") {
    return external_exports.toJSONSchema(e6, { target: t4 });
  }
  var v = external_exports.string();
  var S = external_exports.number();
  var w = external_exports.boolean();
  var k = external_exports.string().min(1);
  var j = external_exports.number().int().positive();
  var x = external_exports.number().int().nonnegative();
  var E = external_exports.number().describe("Tagging version number");
  var P = external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()]);
  var C = P.optional();
  var O = {};
  n(O, { ErrorHandlerSchema: () => J, HandlerSchema: () => M, LogHandlerSchema: () => L, StorageSchema: () => I, StorageTypeSchema: () => D, errorHandlerJsonSchema: () => A, handlerJsonSchema: () => q, logHandlerJsonSchema: () => N, storageJsonSchema: () => z, storageTypeJsonSchema: () => R });
  var D = external_exports.enum(["local", "session", "cookie"]).describe("Storage mechanism: local, session, or cookie");
  var I = external_exports.object({ Local: external_exports.literal("local"), Session: external_exports.literal("session"), Cookie: external_exports.literal("cookie") }).describe("Storage type constants for type-safe references");
  var J = external_exports.any().describe("Error handler function: (error, state?) => void");
  var L = external_exports.any().describe("Log handler function: (message, verbose?) => void");
  var M = external_exports.object({ Error: J.describe("Error handler function"), Log: L.describe("Log handler function") }).describe("Handler interface with error and log functions");
  var R = h(D);
  var z = h(I);
  var A = h(J);
  var N = h(L);
  var q = h(M);
  var T = external_exports.object({ onError: J.optional().describe("Error handler function: (error, state?) => void"), onLog: L.optional().describe("Log handler function: (message, verbose?) => void") }).partial();
  var U = external_exports.object({ verbose: external_exports.boolean().describe("Enable verbose logging for debugging").optional() }).partial();
  var W = external_exports.object({ queue: external_exports.boolean().describe("Whether to queue events when consent is not granted").optional() }).partial();
  var B = external_exports.object({}).partial();
  var $ = external_exports.object({ init: external_exports.boolean().describe("Whether to initialize immediately").optional(), loadScript: external_exports.boolean().describe("Whether to load external script (for web destinations)").optional() }).partial();
  var V = external_exports.object({ disabled: external_exports.boolean().describe("Set to true to disable").optional() }).partial();
  var H = external_exports.object({ primary: external_exports.boolean().describe("Mark as primary (only one can be primary)").optional() }).partial();
  var _ = external_exports.object({ settings: external_exports.any().optional().describe("Implementation-specific configuration") }).partial();
  var K = external_exports.object({ env: external_exports.any().optional().describe("Environment dependencies (platform-specific)") }).partial();
  var Y = external_exports.object({ type: external_exports.string().optional().describe("Instance type identifier"), config: external_exports.unknown().describe("Instance configuration") }).partial();
  var Z = external_exports.object({ collector: external_exports.unknown().describe("Collector instance (runtime object)"), config: external_exports.unknown().describe("Configuration"), env: external_exports.unknown().describe("Environment dependencies") }).partial();
  var ee = external_exports.object({ batch: external_exports.number().optional().describe("Batch size: bundle N events for batch processing"), batched: external_exports.unknown().optional().describe("Batch of events to be processed") }).partial();
  var ne = external_exports.object({ ignore: external_exports.boolean().describe("Set to true to skip processing").optional(), condition: external_exports.string().optional().describe("Condition function: return true to process") }).partial();
  var te = external_exports.object({ sources: external_exports.record(external_exports.string(), external_exports.unknown()).describe("Map of source instances") }).partial();
  var ie = external_exports.object({ destinations: external_exports.record(external_exports.string(), external_exports.unknown()).describe("Map of destination instances") }).partial();
  var oe = {};
  n(oe, { ConsentSchema: () => ue, DeepPartialEventSchema: () => ve, EntitiesSchema: () => fe, EntitySchema: () => ge, EventSchema: () => he, OrderedPropertiesSchema: () => le, PartialEventSchema: () => ye, PropertiesSchema: () => ce, PropertySchema: () => ae, PropertyTypeSchema: () => se, SourceSchema: () => be, SourceTypeSchema: () => de, UserSchema: () => pe, VersionSchema: () => me, consentJsonSchema: () => Ce, entityJsonSchema: () => Ee, eventJsonSchema: () => Se, orderedPropertiesJsonSchema: () => xe, partialEventJsonSchema: () => we, propertiesJsonSchema: () => je, sourceTypeJsonSchema: () => Pe, userJsonSchema: () => ke });
  var re;
  var se = external_exports.lazy(() => external_exports.union([external_exports.boolean(), external_exports.string(), external_exports.number(), external_exports.record(external_exports.string(), ae)]));
  var ae = external_exports.lazy(() => external_exports.union([se, external_exports.array(se)]));
  var ce = external_exports.record(external_exports.string(), ae.optional()).describe("Flexible property collection with optional values");
  var le = external_exports.record(external_exports.string(), external_exports.tuple([ae, external_exports.number()]).optional()).describe("Ordered properties with [value, order] tuples for priority control");
  var de = external_exports.union([external_exports.enum(["web", "server", "app", "other"]), external_exports.string()]).describe("Source type: web, server, app, other, or custom");
  var ue = external_exports.record(external_exports.string(), external_exports.boolean()).describe("Consent requirement mapping (group name \u2192 state)");
  var pe = ce.and(external_exports.object({ id: external_exports.string().optional().describe("User identifier"), device: external_exports.string().optional().describe("Device identifier"), session: external_exports.string().optional().describe("Session identifier"), hash: external_exports.string().optional().describe("Hashed identifier"), address: external_exports.string().optional().describe("User address"), email: external_exports.string().email().optional().describe("User email address"), phone: external_exports.string().optional().describe("User phone number"), userAgent: external_exports.string().optional().describe("Browser user agent string"), browser: external_exports.string().optional().describe("Browser name"), browserVersion: external_exports.string().optional().describe("Browser version"), deviceType: external_exports.string().optional().describe("Device type (mobile, desktop, tablet)"), os: external_exports.string().optional().describe("Operating system"), osVersion: external_exports.string().optional().describe("Operating system version"), screenSize: external_exports.string().optional().describe("Screen dimensions"), language: external_exports.string().optional().describe("User language"), country: external_exports.string().optional().describe("User country"), region: external_exports.string().optional().describe("User region/state"), city: external_exports.string().optional().describe("User city"), zip: external_exports.string().optional().describe("User postal code"), timezone: external_exports.string().optional().describe("User timezone"), ip: external_exports.string().optional().describe("User IP address"), internal: external_exports.boolean().optional().describe("Internal user flag (employee, test user)") })).describe("User identification and properties");
  var me = ce.and(external_exports.object({ source: v.describe('Walker implementation version (e.g., "2.0.0")'), tagging: E })).describe("Walker version information");
  var be = ce.and(external_exports.object({ type: de.describe("Source type identifier"), id: v.describe("Source identifier (typically URL on web)"), previous_id: v.describe("Previous source identifier (typically referrer on web)") })).describe("Event source information");
  var ge = external_exports.lazy(() => external_exports.object({ entity: external_exports.string().describe("Entity name"), data: ce.describe("Entity-specific properties"), nested: external_exports.array(ge).describe("Nested child entities"), context: le.describe("Entity context data") })).describe("Nested entity structure with recursive nesting support");
  var fe = external_exports.array(ge).describe("Array of nested entities");
  var he = external_exports.object({ name: external_exports.string().describe('Event name in "entity action" format (e.g., "page view", "product add")'), data: ce.describe("Event-specific properties"), context: le.describe("Ordered context properties with priorities"), globals: ce.describe("Global properties shared across events"), custom: ce.describe("Custom implementation-specific properties"), user: pe.describe("User identification and attributes"), nested: fe.describe("Related nested entities"), consent: ue.describe("Consent states at event time"), id: k.describe("Unique event identifier (timestamp-based)"), trigger: v.describe("Event trigger identifier"), entity: v.describe("Parsed entity from event name"), action: v.describe("Parsed action from event name"), timestamp: j.describe("Unix timestamp in milliseconds since epoch"), timing: S.describe("Event processing timing information"), group: v.describe("Event grouping identifier"), count: x.describe("Event count in session"), version: me.describe("Walker version information"), source: be.describe("Event source information") }).describe("Complete walkerOS event structure");
  var ye = he.partial().describe("Partial event structure with all fields optional");
  var ve = he.partial().describe("Partial event structure with all top-level fields optional");
  var Se = h(he);
  var we = h(ye);
  var ke = h(pe);
  var je = h(ce);
  var xe = h(le);
  var Ee = h(ge);
  var Pe = h(de);
  var Ce = h(ue);
  var Oe = {};
  n(Oe, { ConfigSchema: () => qe, LoopSchema: () => Je, MapSchema: () => Me, PolicySchema: () => ze, ResultSchema: () => Te, RuleSchema: () => Ae, RulesSchema: () => Ne, SetSchema: () => Le, ValueConfigSchema: () => Re, ValueSchema: () => De, ValuesSchema: () => Ie, configJsonSchema: () => Fe, loopJsonSchema: () => Be, mapJsonSchema: () => Ve, policyJsonSchema: () => He, ruleJsonSchema: () => _e, rulesJsonSchema: () => Ke, setJsonSchema: () => $e, valueConfigJsonSchema: () => We, valueJsonSchema: () => Ue });
  var De = external_exports.lazy(() => external_exports.union([external_exports.string().describe('String value or property path (e.g., "data.id")'), external_exports.number().describe("Numeric value"), external_exports.boolean().describe("Boolean value"), external_exports.lazy(() => re), external_exports.array(De).describe("Array of values")]));
  var Ie = external_exports.array(De).describe("Array of transformation values");
  var Je = external_exports.lazy(() => external_exports.tuple([De, De]).describe("Loop transformation: [source, transform] tuple for array processing"));
  var Le = external_exports.lazy(() => external_exports.array(De).describe("Set: Array of values for selection or combination"));
  var Me = external_exports.lazy(() => external_exports.record(external_exports.string(), De).describe("Map: Object mapping keys to transformation values"));
  var Re = re = external_exports.object({ key: external_exports.string().optional().describe('Property path to extract from event (e.g., "data.id", "user.email")'), value: external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()]).optional().describe("Static primitive value"), fn: external_exports.string().optional().describe("Custom transformation function as string (serialized)"), map: Me.optional().describe("Object mapping: transform event data to structured output"), loop: Je.optional().describe("Loop transformation: [source, transform] for array processing"), set: Le.optional().describe("Set of values: combine or select from multiple values"), consent: ue.optional().describe("Required consent states to include this value"), condition: external_exports.string().optional().describe("Condition function as string: return true to include value"), validate: external_exports.string().optional().describe("Validation function as string: return true if value is valid") }).refine((e6) => Object.keys(e6).length > 0, { message: "ValueConfig must have at least one property" }).describe("Value transformation configuration with multiple strategies");
  var ze = external_exports.record(external_exports.string(), De).describe("Policy rules for event pre-processing (key \u2192 value mapping)");
  var Ae = external_exports.object({ batch: external_exports.number().optional().describe("Batch size: bundle N events for batch processing"), condition: external_exports.string().optional().describe("Condition function as string: return true to process event"), consent: ue.optional().describe("Required consent states to process this event"), settings: external_exports.any().optional().describe("Destination-specific settings for this event mapping"), data: external_exports.union([De, Ie]).optional().describe("Data transformation rules for event"), ignore: external_exports.boolean().optional().describe("Set to true to skip processing this event"), name: external_exports.string().optional().describe('Custom event name override (e.g., "view_item" for "product view")'), policy: ze.optional().describe("Event-level policy overrides (applied after config-level policy)") }).describe("Mapping rule for specific entity-action combination");
  var Ne = external_exports.record(external_exports.string(), external_exports.record(external_exports.string(), external_exports.union([Ae, external_exports.array(Ae)])).optional()).describe("Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support");
  var qe = external_exports.object({ consent: ue.optional().describe("Required consent states to process any events"), data: external_exports.union([De, Ie]).optional().describe("Global data transformation applied to all events"), mapping: Ne.optional().describe("Entity-action specific mapping rules"), policy: ze.optional().describe("Pre-processing policy rules applied before mapping") }).describe("Shared mapping configuration for sources and destinations");
  var Te = external_exports.object({ eventMapping: Ae.optional().describe("Resolved mapping rule for event"), mappingKey: external_exports.string().optional().describe('Mapping key used (e.g., "product.view")') }).describe("Mapping resolution result");
  var Ue = h(De);
  var We = h(Re);
  var Be = h(Je);
  var $e = h(Le);
  var Ve = h(Me);
  var He = h(ze);
  var _e = h(Ae);
  var Ke = h(Ne);
  var Fe = h(qe);
  var Ge = {};
  n(Ge, { BatchSchema: () => rn, ConfigSchema: () => Qe, ContextSchema: () => Ze, DLQSchema: () => bn, DataSchema: () => sn, DestinationPolicySchema: () => Ye, DestinationsSchema: () => dn, InitDestinationsSchema: () => ln, InitSchema: () => cn, InstanceSchema: () => an, PartialConfigSchema: () => Xe, PushBatchContextSchema: () => nn, PushContextSchema: () => en, PushEventSchema: () => tn, PushEventsSchema: () => on, PushResultSchema: () => pn, RefSchema: () => un, ResultSchema: () => mn, batchJsonSchema: () => vn, configJsonSchema: () => gn, contextJsonSchema: () => hn, instanceJsonSchema: () => Sn, partialConfigJsonSchema: () => fn, pushContextJsonSchema: () => yn, resultJsonSchema: () => wn });
  var Qe = external_exports.object({ consent: ue.optional().describe("Required consent states to send events to this destination"), settings: external_exports.any().describe("Implementation-specific configuration").optional(), data: external_exports.union([De, Ie]).optional().describe("Global data transformation applied to all events for this destination"), env: external_exports.any().describe("Environment dependencies (platform-specific)").optional(), id: k.describe("Destination instance identifier (defaults to destination key)").optional(), init: external_exports.boolean().describe("Whether to initialize immediately").optional(), loadScript: external_exports.boolean().describe("Whether to load external script (for web destinations)").optional(), mapping: Ne.optional().describe("Entity-action specific mapping rules for this destination"), policy: ze.optional().describe("Pre-processing policy rules applied before event mapping"), queue: external_exports.boolean().describe("Whether to queue events when consent is not granted").optional(), verbose: external_exports.boolean().describe("Enable verbose logging for debugging").optional(), onError: J.optional(), onLog: L.optional() }).describe("Destination configuration");
  var Xe = Qe.partial().describe("Partial destination configuration with all fields optional");
  var Ye = ze.describe("Destination policy rules for event pre-processing");
  var Ze = external_exports.object({ collector: external_exports.unknown().describe("Collector instance (runtime object)"), config: Qe.describe("Destination configuration"), data: external_exports.union([external_exports.unknown(), external_exports.array(external_exports.unknown())]).optional().describe("Transformed event data"), env: external_exports.unknown().describe("Environment dependencies") }).describe("Destination context for init and push functions");
  var en = Ze.extend({ mapping: Ae.optional().describe("Resolved mapping rule for this specific event") }).describe("Push context with event-specific mapping");
  var nn = en.describe("Batch push context with event-specific mapping");
  var tn = external_exports.object({ event: he.describe("The event to process"), mapping: Ae.optional().describe("Mapping rule for this event") }).describe("Event with optional mapping for batch processing");
  var on = external_exports.array(tn).describe("Array of events with mappings");
  var rn = external_exports.object({ key: external_exports.string().describe('Batch key (usually mapping key like "product.view")'), events: external_exports.array(he).describe("Array of events in batch"), data: external_exports.array(external_exports.union([external_exports.unknown(), external_exports.array(external_exports.unknown())]).optional()).describe("Transformed data for each event"), mapping: Ae.optional().describe("Shared mapping rule for batch") }).describe("Batch of events grouped by mapping key");
  var sn = external_exports.union([external_exports.unknown(), external_exports.array(external_exports.unknown())]).optional().describe("Transformed event data (Property, undefined, or array)");
  var an = external_exports.object({ config: Qe.describe("Destination configuration"), queue: external_exports.array(he).optional().describe("Queued events awaiting consent"), dlq: external_exports.array(external_exports.tuple([he, external_exports.unknown()])).optional().describe("Dead letter queue (failed events with errors)"), type: external_exports.string().optional().describe("Destination type identifier"), env: external_exports.unknown().optional().describe("Environment dependencies"), init: external_exports.unknown().optional().describe("Initialization function"), push: external_exports.unknown().describe("Push function for single events"), pushBatch: external_exports.unknown().optional().describe("Batch push function"), on: external_exports.unknown().optional().describe("Event lifecycle hook function") }).describe("Destination instance (runtime object with functions)");
  var cn = external_exports.object({ code: an.describe("Destination instance with implementation"), config: Xe.optional().describe("Partial configuration overrides"), env: external_exports.unknown().optional().describe("Partial environment overrides") }).describe("Destination initialization configuration");
  var ln = external_exports.record(external_exports.string(), cn).describe("Map of destination IDs to initialization configurations");
  var dn = external_exports.record(external_exports.string(), an).describe("Map of destination IDs to runtime instances");
  var un = external_exports.object({ id: external_exports.string().describe("Destination ID"), destination: an.describe("Destination instance") }).describe("Destination reference (ID + instance)");
  var pn = external_exports.object({ queue: external_exports.array(he).optional().describe("Events queued (awaiting consent)"), error: external_exports.unknown().optional().describe("Error if push failed") }).describe("Push operation result");
  var mn = external_exports.object({ successful: external_exports.array(un).describe("Destinations that processed successfully"), queued: external_exports.array(un).describe("Destinations that queued events"), failed: external_exports.array(un).describe("Destinations that failed to process") }).describe("Overall destination processing result");
  var bn = external_exports.array(external_exports.tuple([he, external_exports.unknown()])).describe("Dead letter queue: [(event, error), ...]");
  var gn = h(Qe);
  var fn = h(Xe);
  var hn = h(Ze);
  var yn = h(en);
  var vn = h(rn);
  var Sn = h(an);
  var wn = h(mn);
  var kn = {};
  n(kn, { CommandTypeSchema: () => jn, ConfigSchema: () => xn, DestinationsSchema: () => Dn, InitConfigSchema: () => Pn, InstanceSchema: () => In, PushContextSchema: () => Cn, SessionDataSchema: () => En, SourcesSchema: () => On, commandTypeJsonSchema: () => Jn, configJsonSchema: () => Ln, initConfigJsonSchema: () => Rn, instanceJsonSchema: () => An, pushContextJsonSchema: () => zn, sessionDataJsonSchema: () => Mn });
  var jn = external_exports.union([external_exports.enum(["action", "config", "consent", "context", "destination", "elb", "globals", "hook", "init", "link", "run", "user", "walker"]), external_exports.string()]).describe("Collector command type: standard commands or custom string for extensions");
  var xn = external_exports.object({ run: external_exports.boolean().describe("Whether to run collector automatically on initialization").optional(), tagging: E, globalsStatic: ce.describe("Static global properties that persist across collector runs"), sessionStatic: external_exports.record(external_exports.string(), external_exports.unknown()).describe("Static session data that persists across collector runs"), verbose: external_exports.boolean().describe("Enable verbose logging for debugging"), onError: J.optional(), onLog: L.optional() }).describe("Core collector configuration");
  var En = ce.and(external_exports.object({ isStart: external_exports.boolean().describe("Whether this is a new session start"), storage: external_exports.boolean().describe("Whether storage is available"), id: k.describe("Session identifier").optional(), start: j.describe("Session start timestamp").optional(), marketing: external_exports.literal(true).optional().describe("Marketing attribution flag"), updated: j.describe("Last update timestamp").optional(), isNew: external_exports.boolean().describe("Whether this is a new session").optional(), device: k.describe("Device identifier").optional(), count: x.describe("Event count in session").optional(), runs: x.describe("Number of runs").optional() })).describe("Session state and tracking data");
  var Pn = xn.partial().extend({ consent: ue.optional().describe("Initial consent state"), user: pe.optional().describe("Initial user data"), globals: ce.optional().describe("Initial global properties"), sources: external_exports.unknown().optional().describe("Source configurations"), destinations: external_exports.unknown().optional().describe("Destination configurations"), custom: ce.optional().describe("Initial custom implementation-specific properties") }).describe("Collector initialization configuration with initial state");
  var Cn = external_exports.object({ mapping: qe.optional().describe("Source-level mapping configuration") }).describe("Push context with optional source mapping");
  var On = external_exports.record(external_exports.string(), external_exports.unknown()).describe("Map of source IDs to source instances");
  var Dn = external_exports.record(external_exports.string(), external_exports.unknown()).describe("Map of destination IDs to destination instances");
  var In = external_exports.object({ push: external_exports.unknown().describe("Push function for processing events"), command: external_exports.unknown().describe("Command function for walker commands"), allowed: external_exports.boolean().describe("Whether event processing is allowed"), config: xn.describe("Current collector configuration"), consent: ue.describe("Current consent state"), count: external_exports.number().describe("Event count (increments with each event)"), custom: ce.describe("Custom implementation-specific properties"), sources: On.describe("Registered source instances"), destinations: Dn.describe("Registered destination instances"), globals: ce.describe("Current global properties"), group: external_exports.string().describe("Event grouping identifier"), hooks: external_exports.unknown().describe("Lifecycle hook functions"), on: external_exports.unknown().describe("Event lifecycle configuration"), queue: external_exports.array(he).describe("Queued events awaiting processing"), round: external_exports.number().describe("Collector run count (increments with each run)"), session: external_exports.union([En]).describe("Current session state"), timing: external_exports.number().describe("Event processing timing information"), user: pe.describe("Current user data"), version: external_exports.string().describe("Walker implementation version") }).describe("Collector instance with state and methods");
  var Jn = h(jn);
  var Ln = h(xn);
  var Mn = h(En);
  var Rn = h(Pn);
  var zn = h(Cn);
  var An = h(In);
  var Nn = {};
  n(Nn, { BaseEnvSchema: () => qn, ConfigSchema: () => Tn, InitSchema: () => Bn, InitSourceSchema: () => $n, InitSourcesSchema: () => Vn, InstanceSchema: () => Wn, PartialConfigSchema: () => Un, baseEnvJsonSchema: () => Hn, configJsonSchema: () => _n, initSourceJsonSchema: () => Gn, initSourcesJsonSchema: () => Qn, instanceJsonSchema: () => Fn, partialConfigJsonSchema: () => Kn });
  var qn = external_exports.object({ push: external_exports.unknown().describe("Collector push function"), command: external_exports.unknown().describe("Collector command function"), sources: external_exports.unknown().optional().describe("Map of registered source instances"), elb: external_exports.unknown().describe("Public API function (alias for collector.push)") }).catchall(external_exports.unknown()).describe("Base environment for dependency injection - platform-specific sources extend this");
  var Tn = qe.extend({ settings: external_exports.any().describe("Implementation-specific configuration").optional(), env: qn.optional().describe("Environment dependencies (platform-specific)"), id: k.describe("Source identifier (defaults to source key)").optional(), onError: J.optional(), disabled: external_exports.boolean().describe("Set to true to disable").optional(), primary: external_exports.boolean().describe("Mark as primary (only one can be primary)").optional() }).describe("Source configuration with mapping and environment");
  var Un = Tn.partial().describe("Partial source configuration with all fields optional");
  var Wn = external_exports.object({ type: external_exports.string().describe('Source type identifier (e.g., "browser", "dataLayer")'), config: Tn.describe("Current source configuration"), push: external_exports.any().describe("Push function - THE HANDLER (flexible signature for platform compatibility)"), destroy: external_exports.any().optional().describe("Cleanup function called when source is removed"), on: external_exports.unknown().optional().describe("Lifecycle hook function for event types") }).describe("Source instance with push handler and lifecycle methods");
  var Bn = external_exports.any().describe("Source initialization function: (config, env) => Instance | Promise<Instance>");
  var $n = external_exports.object({ code: Bn.describe("Source initialization function"), config: Un.optional().describe("Partial configuration overrides"), env: qn.partial().optional().describe("Partial environment overrides"), primary: external_exports.boolean().optional().describe("Mark as primary source (only one can be primary)") }).describe("Source initialization configuration");
  var Vn = external_exports.record(external_exports.string(), $n).describe("Map of source IDs to initialization configurations");
  var Hn = h(qn);
  var _n = h(Tn);
  var Kn = h(Un);
  var Fn = h(Wn);
  var Gn = h($n);
  var Qn = h(Vn);
  var Xn = {};
  n(Xn, { ConfigSchema: () => nt, DestinationReferenceSchema: () => et, PrimitiveSchema: () => Yn, SetupSchema: () => tt, SourceReferenceSchema: () => Zn, configJsonSchema: () => ct, destinationReferenceJsonSchema: () => dt, parseConfig: () => rt, parseSetup: () => it, safeParseConfig: () => st, safeParseSetup: () => ot, setupJsonSchema: () => at, sourceReferenceJsonSchema: () => lt });
  var Yn = external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()]).describe("Primitive value: string, number, or boolean");
  var Zn = external_exports.object({ package: external_exports.string().min(1, "Package name cannot be empty").describe('Package specifier with optional version (e.g., "@walkeros/web-source-browser@2.0.0")'), config: external_exports.unknown().optional().describe("Source-specific configuration object"), env: external_exports.unknown().optional().describe("Source environment configuration"), primary: external_exports.boolean().optional().describe("Mark as primary source (provides main elb). Only one source should be primary.") }).describe("Source package reference with configuration");
  var et = external_exports.object({ package: external_exports.string().min(1, "Package name cannot be empty").describe('Package specifier with optional version (e.g., "@walkeros/web-destination-gtag@2.0.0")'), config: external_exports.unknown().optional().describe("Destination-specific configuration object"), env: external_exports.unknown().optional().describe("Destination environment configuration") }).describe("Destination package reference with configuration");
  var nt = external_exports.object({ platform: external_exports.enum(["web", "server"], { error: 'Platform must be "web" or "server"' }).describe('Target platform: "web" for browser-based tracking, "server" for Node.js server-side collection'), sources: external_exports.record(external_exports.string(), Zn).optional().describe("Source configurations (data capture) keyed by unique identifier"), destinations: external_exports.record(external_exports.string(), et).optional().describe("Destination configurations (data output) keyed by unique identifier"), collector: external_exports.unknown().optional().describe("Collector configuration for event processing (uses Collector.InitConfig)"), env: external_exports.record(external_exports.string(), external_exports.string()).optional().describe("Environment-specific variables (override root-level variables)") }).passthrough().describe("Single environment configuration for one deployment target");
  var tt = external_exports.object({ version: external_exports.literal(1, { error: "Only version 1 is currently supported" }).describe("Configuration schema version (currently only 1 is supported)"), $schema: external_exports.string().url("Schema URL must be a valid URL").optional().describe('JSON Schema reference for IDE validation (e.g., "https://walkeros.io/schema/flow/v1.json")'), variables: external_exports.record(external_exports.string(), Yn).optional().describe("Shared variables for interpolation across all environments (use ${VAR_NAME:default} syntax)"), definitions: external_exports.record(external_exports.string(), external_exports.unknown()).optional().describe("Reusable configuration definitions (reference with JSON Schema $ref syntax)"), environments: external_exports.record(external_exports.string(), nt).refine((e6) => Object.keys(e6).length > 0, { message: "At least one environment is required" }).describe("Named environment configurations (e.g., web_prod, server_stage)") }).describe("Complete multi-environment walkerOS configuration (walkeros.config.json)");
  function it(e6) {
    return tt.parse(e6);
  }
  function ot(e6) {
    return tt.safeParse(e6);
  }
  function rt(e6) {
    return nt.parse(e6);
  }
  function st(e6) {
    return nt.safeParse(e6);
  }
  var at = external_exports.toJSONSchema(tt, { target: "draft-7" });
  var ct = h(nt);
  var lt = h(Zn);
  var dt = h(et);
  var yt = { merge: true, shallow: true, extend: true };
  function vt(e6, n6 = {}, t4 = {}) {
    t4 = { ...yt, ...t4 };
    const i4 = Object.entries(n6).reduce((n7, [i5, o4]) => {
      const r3 = e6[i5];
      return t4.merge && Array.isArray(r3) && Array.isArray(o4) ? n7[i5] = o4.reduce((e7, n8) => e7.includes(n8) ? e7 : [...e7, n8], [...r3]) : (t4.extend || i5 in e6) && (n7[i5] = o4), n7;
    }, {});
    return t4.shallow ? { ...e6, ...i4 } : (Object.assign(e6, i4), e6);
  }
  function wt(e6) {
    return Array.isArray(e6);
  }
  function kt(e6) {
    return "boolean" == typeof e6;
  }
  function xt(e6) {
    return void 0 !== e6;
  }
  function Pt(e6) {
    return "function" == typeof e6;
  }
  function Ct(e6) {
    return "number" == typeof e6 && !Number.isNaN(e6);
  }
  function Ot(e6) {
    return "object" == typeof e6 && null !== e6 && !wt(e6) && "[object Object]" === Object.prototype.toString.call(e6);
  }
  function It(e6) {
    return "string" == typeof e6;
  }
  function Jt(e6, n6 = /* @__PURE__ */ new WeakMap()) {
    if ("object" != typeof e6 || null === e6)
      return e6;
    if (n6.has(e6))
      return n6.get(e6);
    const t4 = Object.prototype.toString.call(e6);
    if ("[object Object]" === t4) {
      const t5 = {};
      n6.set(e6, t5);
      for (const i4 in e6)
        Object.prototype.hasOwnProperty.call(e6, i4) && (t5[i4] = Jt(e6[i4], n6));
      return t5;
    }
    if ("[object Array]" === t4) {
      const t5 = [];
      return n6.set(e6, t5), e6.forEach((e7) => {
        t5.push(Jt(e7, n6));
      }), t5;
    }
    if ("[object Date]" === t4)
      return new Date(e6.getTime());
    if ("[object RegExp]" === t4) {
      const n7 = e6;
      return new RegExp(n7.source, n7.flags);
    }
    return e6;
  }
  function Lt(e6, n6 = "", t4) {
    const i4 = n6.split(".");
    let o4 = e6;
    for (let e7 = 0; e7 < i4.length; e7++) {
      const n7 = i4[e7];
      if ("*" === n7 && wt(o4)) {
        const n8 = i4.slice(e7 + 1).join("."), r3 = [];
        for (const e8 of o4) {
          const i5 = Lt(e8, n8, t4);
          r3.push(i5);
        }
        return r3;
      }
      if (o4 = o4 instanceof Object ? o4[n7] : void 0, !o4)
        break;
    }
    return xt(o4) ? o4 : t4;
  }
  function Mt(e6, n6, t4) {
    if (!Ot(e6))
      return e6;
    const i4 = Jt(e6), o4 = n6.split(".");
    let r3 = i4;
    for (let e7 = 0; e7 < o4.length; e7++) {
      const n7 = o4[e7];
      e7 === o4.length - 1 ? r3[n7] = t4 : (n7 in r3 && "object" == typeof r3[n7] && null !== r3[n7] || (r3[n7] = {}), r3 = r3[n7]);
    }
    return i4;
  }
  function zt(e6, n6 = {}, t4 = {}) {
    const i4 = { ...n6, ...t4 }, o4 = {};
    let r3 = void 0 === e6;
    return Object.keys(i4).forEach((n7) => {
      i4[n7] && (o4[n7] = true, e6 && e6[n7] && (r3 = true));
    }), !!r3 && o4;
  }
  function Tt(e6 = 6) {
    let n6 = "";
    for (let t4 = 36; n6.length < e6; )
      n6 += (Math.random() * t4 | 0).toString(t4);
    return n6;
  }
  function Wt(e6, n6 = 1e3, t4 = false) {
    let i4, o4 = null, r3 = false;
    return (...s5) => new Promise((a5) => {
      const c3 = t4 && !r3;
      o4 && clearTimeout(o4), o4 = setTimeout(() => {
        o4 = null, t4 && !r3 || (i4 = e6(...s5), a5(i4));
      }, n6), c3 && (r3 = true, i4 = e6(...s5), a5(i4));
    });
  }
  function $t(e6) {
    return kt(e6) || It(e6) || Ct(e6) || !xt(e6) || wt(e6) && e6.every($t) || Ot(e6) && Object.values(e6).every($t);
  }
  function Ht(e6) {
    return $t(e6) ? e6 : void 0;
  }
  function _t(e6, n6, t4) {
    return function(...i4) {
      try {
        return e6(...i4);
      } catch (e7) {
        if (!n6)
          return;
        return n6(e7);
      } finally {
        t4?.();
      }
    };
  }
  function Kt(e6, n6, t4) {
    return async function(...i4) {
      try {
        return await e6(...i4);
      } catch (e7) {
        if (!n6)
          return;
        return await n6(e7);
      } finally {
        await t4?.();
      }
    };
  }
  async function Ft(e6, n6) {
    const [t4, i4] = (e6.name || "").split(" ");
    if (!n6 || !t4 || !i4)
      return {};
    let o4, r3 = "", s5 = t4, a5 = i4;
    const c3 = (n7) => {
      if (n7)
        return (n7 = wt(n7) ? n7 : [n7]).find((n8) => !n8.condition || n8.condition(e6));
    };
    n6[s5] || (s5 = "*");
    const l3 = n6[s5];
    return l3 && (l3[a5] || (a5 = "*"), o4 = c3(l3[a5])), o4 || (s5 = "*", a5 = "*", o4 = c3(n6[s5]?.[a5])), o4 && (r3 = `${s5} ${a5}`), { eventMapping: o4, mappingKey: r3 };
  }
  async function Gt(e6, n6 = {}, t4 = {}) {
    if (!xt(e6))
      return;
    const i4 = Ot(e6) && e6.consent || t4.consent || t4.collector?.consent, o4 = wt(n6) ? n6 : [n6];
    for (const n7 of o4) {
      const o5 = await Kt(Qt)(e6, n7, { ...t4, consent: i4 });
      if (xt(o5))
        return o5;
    }
  }
  async function Qt(e6, n6, t4 = {}) {
    const { collector: i4, consent: o4 } = t4;
    return (wt(n6) ? n6 : [n6]).reduce(async (n7, r3) => {
      const s5 = await n7;
      if (s5)
        return s5;
      const a5 = It(r3) ? { key: r3 } : r3;
      if (!Object.keys(a5).length)
        return;
      const { condition: c3, consent: l3, fn: d2, key: u3, loop: p2, map: m2, set: b2, validate: g3, value: f2 } = a5;
      if (c3 && !await Kt(c3)(e6, r3, i4))
        return;
      if (l3 && !zt(l3, o4))
        return f2;
      let h4 = xt(f2) ? f2 : e6;
      if (d2 && (h4 = await Kt(d2)(e6, r3, t4)), u3 && (h4 = Lt(e6, u3, f2)), p2) {
        const [n8, i5] = p2, o5 = "this" === n8 ? [e6] : await Gt(e6, n8, t4);
        wt(o5) && (h4 = (await Promise.all(o5.map((e7) => Gt(e7, i5, t4)))).filter(xt));
      } else
        m2 ? h4 = await Object.entries(m2).reduce(async (n8, [i5, o5]) => {
          const r4 = await n8, s6 = await Gt(e6, o5, t4);
          return xt(s6) && (r4[i5] = s6), r4;
        }, Promise.resolve({})) : b2 && (h4 = await Promise.all(b2.map((n8) => Qt(e6, n8, t4))));
      g3 && !await Kt(g3)(h4) && (h4 = void 0);
      const y3 = Ht(h4);
      return xt(y3) ? y3 : Ht(f2);
    }, Promise.resolve(void 0));
  }
  async function Xt(e6, n6, t4) {
    n6.policy && await Promise.all(Object.entries(n6.policy).map(async ([n7, i5]) => {
      const o5 = await Gt(e6, i5, { collector: t4 });
      e6 = Mt(e6, n7, o5);
    }));
    const { eventMapping: i4, mappingKey: o4 } = await Ft(e6, n6.mapping);
    i4?.policy && await Promise.all(Object.entries(i4.policy).map(async ([n7, i5]) => {
      const o5 = await Gt(e6, i5, { collector: t4 });
      e6 = Mt(e6, n7, o5);
    }));
    let r3 = n6.data && await Gt(e6, n6.data, { collector: t4 });
    if (i4) {
      if (i4.ignore)
        return { event: e6, data: r3, mapping: i4, mappingKey: o4, ignore: true };
      if (i4.name && (e6.name = i4.name), i4.data) {
        const n7 = i4.data && await Gt(e6, i4.data, { collector: t4 });
        r3 = Ot(r3) && Ot(n7) ? vt(r3, n7) : n7;
      }
    }
    return { event: e6, data: r3, mapping: i4, mappingKey: o4, ignore: false };
  }
  function ei(e6, n6 = false) {
    n6 && console.dir(e6, { depth: 4 });
  }
  function ai(e6, n6, t4) {
    return function(...i4) {
      let o4;
      const r3 = "post" + n6, s5 = t4["pre" + n6], a5 = t4[r3];
      return o4 = s5 ? s5({ fn: e6 }, ...i4) : e6(...i4), a5 && (o4 = a5({ fn: e6, result: o4 }, ...i4)), o4;
    };
  }

  // node_modules/@walkeros/collector/dist/index.mjs
  var e2 = Object.defineProperty;
  var n2 = { Action: "action", Actions: "actions", Config: "config", Consent: "consent", Context: "context", Custom: "custom", Destination: "destination", Elb: "elb", Globals: "globals", Hook: "hook", Init: "init", Link: "link", On: "on", Prefix: "data-elb", Ready: "ready", Run: "run", Session: "session", User: "user", Walker: "walker" };
  var o = { Commands: n2, Utils: { Storage: { Cookie: "cookie", Local: "local", Session: "session" } } };
  var t = {};
  ((n6, o4) => {
    for (var t4 in o4)
      e2(n6, t4, { get: o4[t4], enumerable: true });
  })(t, { schemas: () => a, settingsSchema: () => s });
  var s = { type: "object", properties: { run: { type: "boolean", description: "Automatically start the collector pipeline on initialization" }, sources: { type: "object", description: "Configurations for sources providing events to the collector" }, destinations: { type: "object", description: "Configurations for destinations receiving processed events" }, consent: { type: "object", description: "Initial consent state to control routing of events" }, verbose: { type: "boolean", description: "Enable verbose logging for debugging" }, onError: { type: "string", description: "Error handler triggered when the collector encounters failures" }, onLog: { type: "string", description: "Custom log handler for collector messages" } } };
  var a = { settings: s };
  async function h2(e6, n6, o4) {
    const { code: t4, config: s5 = {}, env: a5 = {} } = n6, i4 = o4 || s5 || { init: false }, c3 = { ...t4, config: i4, env: q2(t4.env, a5) };
    let r3 = c3.config.id;
    if (!r3)
      do {
        r3 = Tt(4);
      } while (e6.destinations[r3]);
    return e6.destinations[r3] = c3, false !== c3.config.queue && (c3.queue = [...e6.queue]), y(e6, void 0, { [r3]: c3 });
  }
  async function y(e6, n6, o4) {
    const { allowed: t4, consent: s5, globals: a5, user: i4 } = e6;
    if (!t4)
      return w2({ ok: false });
    n6 && e6.queue.push(n6), o4 || (o4 = e6.destinations);
    const u3 = await Promise.all(Object.entries(o4 || {}).map(async ([o5, t5]) => {
      let u4 = (t5.queue || []).map((e7) => ({ ...e7, consent: s5 }));
      if (t5.queue = [], n6) {
        const e7 = Jt(n6);
        u4.push(e7);
      }
      if (!u4.length)
        return { id: o5, destination: t5, skipped: true };
      const l4 = [], m3 = u4.filter((e7) => {
        const n7 = zt(t5.config.consent, s5, e7.consent);
        return !n7 || (e7.consent = n7, l4.push(e7), false);
      });
      if (t5.queue.concat(m3), !l4.length)
        return { id: o5, destination: t5, queue: u4 };
      if (!await Kt(v2)(e6, t5))
        return { id: o5, destination: t5, queue: u4 };
      let f3 = false;
      return t5.dlq || (t5.dlq = []), await Promise.all(l4.map(async (n7) => (n7.globals = vt(a5, n7.globals), n7.user = vt(i4, n7.user), await Kt(k2, (o6) => (e6.config.onError && e6.config.onError(o6, e6), f3 = true, t5.dlq.push([n7, o6]), false))(e6, t5, n7), n7))), { id: o5, destination: t5, error: f3 };
    })), l3 = [], m2 = [], f2 = [];
    for (const e7 of u3) {
      if (e7.skipped)
        continue;
      const n7 = e7.destination, o5 = { id: e7.id, destination: n7 };
      e7.error ? f2.push(o5) : e7.queue && e7.queue.length ? (n7.queue = (n7.queue || []).concat(e7.queue), m2.push(o5)) : l3.push(o5);
    }
    return w2({ ok: !f2.length, event: n6, successful: l3, queued: m2, failed: f2 });
  }
  async function v2(e6, n6) {
    if (n6.init && !n6.config.init) {
      const o4 = { collector: e6, config: n6.config, env: q2(n6.env, n6.config.env) }, t4 = await ai(n6.init, "DestinationInit", e6.hooks)(o4);
      if (false === t4)
        return t4;
      n6.config = { ...t4 || n6.config, init: true };
    }
    return true;
  }
  async function k2(e6, n6, o4) {
    const { config: t4 } = n6, s5 = await Xt(o4, t4, e6);
    if (s5.ignore)
      return false;
    const a5 = { collector: e6, config: t4, data: s5.data, mapping: s5.mapping, env: q2(n6.env, t4.env) }, i4 = s5.mapping;
    if (i4?.batch && n6.pushBatch) {
      const o5 = i4.batched || { key: s5.mappingKey || "", events: [], data: [] };
      o5.events.push(s5.event), xt(s5.data) && o5.data.push(s5.data), i4.batchFn = i4.batchFn || Wt((e7, n7) => {
        const a6 = { collector: n7, config: t4, data: s5.data, mapping: i4, env: q2(e7.env, t4.env) };
        ai(e7.pushBatch, "DestinationPushBatch", n7.hooks)(o5, a6), o5.events = [], o5.data = [];
      }, i4.batch), i4.batched = o5, i4.batchFn?.(n6, e6);
    } else
      await ai(n6.push, "DestinationPush", e6.hooks)(s5.event, a5);
    return true;
  }
  function w2(e6) {
    return vt({ ok: !e6?.failed?.length, successful: [], queued: [], failed: [] }, e6);
  }
  async function C2(e6, n6 = {}) {
    const o4 = {};
    for (const [e7, t4] of Object.entries(n6)) {
      const { code: n7, config: s5 = {}, env: a5 = {} } = t4, i4 = { ...n7.config, ...s5 }, c3 = q2(n7.env, a5);
      o4[e7] = { ...n7, config: i4, env: c3 };
    }
    return o4;
  }
  function q2(e6, n6) {
    return e6 || n6 ? n6 ? e6 && Ot(e6) && Ot(n6) ? { ...e6, ...n6 } : n6 : e6 : {};
  }
  function O2(e6, n6, o4) {
    const t4 = e6.on, s5 = t4[n6] || [], a5 = wt(o4) ? o4 : [o4];
    a5.forEach((e7) => {
      s5.push(e7);
    }), t4[n6] = s5, A2(e6, n6, a5);
  }
  function A2(e6, n6, t4, s5) {
    let a5, i4 = t4 || [];
    switch (t4 || (i4 = e6.on[n6] || []), n6) {
      case o.Commands.Consent:
        a5 = s5 || e6.consent;
        break;
      case o.Commands.Session:
        a5 = e6.session;
        break;
      case o.Commands.Ready:
      case o.Commands.Run:
      default:
        a5 = void 0;
    }
    if (Object.values(e6.sources).forEach((e7) => {
      e7.on && _t(e7.on)(n6, a5);
    }), Object.values(e6.destinations).forEach((e7) => {
      if (e7.on) {
        const o4 = e7.on;
        _t(o4)(n6, a5);
      }
    }), i4.length)
      switch (n6) {
        case o.Commands.Consent:
          !function(e7, n7, o4) {
            const t5 = o4 || e7.consent;
            n7.forEach((n8) => {
              Object.keys(t5).filter((e8) => e8 in n8).forEach((o5) => {
                _t(n8[o5])(e7, t5);
              });
            });
          }(e6, i4, s5);
          break;
        case o.Commands.Ready:
        case o.Commands.Run:
          !function(e7, n7) {
            e7.allowed && n7.forEach((n8) => {
              _t(n8)(e7);
            });
          }(e6, i4);
          break;
        case o.Commands.Session:
          !function(e7, n7) {
            if (!e7.session)
              return;
            n7.forEach((n8) => {
              _t(n8)(e7, e7.session);
            });
          }(e6, i4);
      }
  }
  async function S2(e6, n6) {
    const { consent: o4 } = e6;
    let t4 = false;
    const s5 = {};
    return Object.entries(n6).forEach(([e7, n7]) => {
      const o5 = !!n7;
      s5[e7] = o5, t4 = t4 || o5;
    }), e6.consent = vt(o4, s5), A2(e6, "consent", void 0, s5), t4 ? y(e6) : w2({ ok: true });
  }
  async function B2(e6, n6, t4, s5) {
    let a5;
    switch (n6) {
      case o.Commands.Config:
        Ot(t4) && vt(e6.config, t4, { shallow: false });
        break;
      case o.Commands.Consent:
        Ot(t4) && (a5 = await S2(e6, t4));
        break;
      case o.Commands.Custom:
        Ot(t4) && (e6.custom = vt(e6.custom, t4));
        break;
      case o.Commands.Destination:
        Ot(t4) && Pt(t4.push) && (a5 = await h2(e6, { code: t4 }, s5));
        break;
      case o.Commands.Globals:
        Ot(t4) && (e6.globals = vt(e6.globals, t4));
        break;
      case o.Commands.On:
        It(t4) && O2(e6, t4, s5);
        break;
      case o.Commands.Ready:
        A2(e6, "ready");
        break;
      case o.Commands.Run:
        a5 = await G(e6, t4);
        break;
      case o.Commands.Session:
        A2(e6, "session");
        break;
      case o.Commands.User:
        Ot(t4) && vt(e6.user, t4, { shallow: false });
    }
    return a5 || { ok: true, successful: [], queued: [], failed: [] };
  }
  function F(e6, n6) {
    if (!n6.name)
      throw new Error("Event name is required");
    const [o4, t4] = n6.name.split(" ");
    if (!o4 || !t4)
      throw new Error("Event name is invalid");
    ++e6.count;
    const { timestamp: s5 = Date.now(), group: a5 = e6.group, count: i4 = e6.count } = n6, { name: c3 = `${o4} ${t4}`, data: r3 = {}, context: u3 = {}, globals: l3 = e6.globals, custom: d2 = {}, user: m2 = e6.user, nested: f2 = [], consent: g3 = e6.consent, id: p2 = `${s5}-${a5}-${i4}`, trigger: b2 = "", entity: h4 = o4, action: y3 = t4, timing: v4 = 0, version: k4 = { source: e6.version, tagging: e6.config.tagging || 0 }, source: w4 = { type: "collector", id: "", previous_id: "" } } = n6;
    return { name: c3, data: r3, context: u3, globals: l3, custom: d2, user: m2, nested: f2, consent: g3, id: p2, trigger: b2, entity: h4, action: y3, timestamp: s5, timing: v4, group: a5, count: i4, version: k4, source: w4 };
  }
  async function G(e6, n6) {
    e6.allowed = true, e6.count = 0, e6.group = Tt(), e6.timing = Date.now(), n6 && (n6.consent && (e6.consent = vt(e6.consent, n6.consent)), n6.user && (e6.user = vt(e6.user, n6.user)), n6.globals && (e6.globals = vt(e6.config.globalsStatic || {}, n6.globals)), n6.custom && (e6.custom = vt(e6.custom, n6.custom))), Object.values(e6.destinations).forEach((e7) => {
      e7.queue = [];
    }), e6.queue = [], e6.round++;
    const o4 = await y(e6);
    return A2(e6, "run"), o4;
  }
  function _2(e6, n6) {
    return ai(async (o4, t4 = {}) => await Kt(async () => {
      let s5 = o4;
      if (t4.mapping) {
        const n7 = await Xt(s5, t4.mapping, e6);
        if (n7.ignore)
          return w2({ ok: true });
        if (t4.mapping.consent) {
          if (!zt(t4.mapping.consent, e6.consent, n7.event.consent))
            return w2({ ok: true });
        }
        s5 = n7.event;
      }
      const a5 = n6(s5), i4 = F(e6, a5);
      return await y(e6, i4);
    }, () => w2({ ok: false }))(), "Push", e6.hooks);
  }
  async function J2(e6) {
    const n6 = vt({ globalsStatic: {}, sessionStatic: {}, tagging: 0, verbose: false, onLog: o4, run: true }, e6, { merge: false, extend: false });
    function o4(e7, o5) {
      ei({ message: e7 }, o5 || n6.verbose);
    }
    n6.onLog = o4;
    const t4 = { ...n6.globalsStatic, ...e6.globals }, s5 = { allowed: false, config: n6, consent: e6.consent || {}, count: 0, custom: e6.custom || {}, destinations: {}, globals: t4, group: "", hooks: {}, on: {}, queue: [], round: 0, session: void 0, timing: Date.now(), user: e6.user || {}, version: "0.3.1", sources: {}, push: void 0, command: void 0 };
    return s5.push = _2(s5, (e7) => ({ timing: Math.round((Date.now() - s5.timing) / 10) / 100, source: { type: "collector", id: "", previous_id: "" }, ...e7 })), s5.command = function(e7, n7) {
      return ai(async (o5, t5, s6) => await Kt(async () => await n7(e7, o5, t5, s6), () => w2({ ok: false }))(), "Command", e7.hooks);
    }(s5, B2), s5.destinations = await C2(0, e6.destinations || {}), s5;
  }
  async function Q(e6, n6 = {}) {
    const o4 = {};
    for (const [t4, s5] of Object.entries(n6)) {
      const { code: n7, config: a5 = {}, env: i4 = {}, primary: c3 } = s5, r3 = { push: (n8, o5 = {}) => e6.push(n8, { ...o5, mapping: a5 }), command: e6.command, sources: e6.sources, elb: e6.sources.elb.push, ...i4 }, u3 = await Kt(n7)(a5, r3);
      u3 && (c3 && (u3.config = { ...u3.config, primary: c3 }), o4[t4] = u3);
    }
    return o4;
  }
  async function T2(e6) {
    e6 = e6 || {};
    const n6 = await J2(e6), o4 = (t4 = n6, { type: "elb", config: {}, push: async (e7, n7, o5, s6, a6, i5) => {
      if ("string" == typeof e7 && e7.startsWith("walker ")) {
        const s7 = e7.replace("walker ", "");
        return t4.command(s7, n7, o5);
      }
      let c4;
      if ("string" == typeof e7)
        c4 = { name: e7 }, n7 && "object" == typeof n7 && !Array.isArray(n7) && (c4.data = n7);
      else {
        if (!e7 || "object" != typeof e7)
          return { ok: false, successful: [], queued: [], failed: [] };
        c4 = e7, n7 && "object" == typeof n7 && !Array.isArray(n7) && (c4.data = { ...c4.data || {}, ...n7 });
      }
      return s6 && "object" == typeof s6 && (c4.context = s6), a6 && Array.isArray(a6) && (c4.nested = a6), i5 && "object" == typeof i5 && (c4.custom = i5), t4.push(c4);
    } });
    var t4;
    n6.sources.elb = o4;
    const s5 = await Q(n6, e6.sources || {});
    Object.assign(n6.sources, s5);
    const { consent: a5, user: i4, globals: c3, custom: r3 } = e6;
    a5 && await n6.command("consent", a5), i4 && await n6.command("user", i4), c3 && Object.assign(n6.globals, c3), r3 && Object.assign(n6.custom, r3), n6.config.run && await n6.command("run");
    let u3 = o4.push;
    const l3 = Object.values(n6.sources).filter((e7) => "elb" !== e7.type), d2 = l3.find((e7) => e7.config.primary);
    return d2 ? u3 = d2.push : l3.length > 0 && (u3 = l3[0].push), { collector: n6, elb: u3 };
  }

  // node_modules/@walkeros/source-demo/dist/index.mjs
  var e3 = Object.defineProperty;
  var s2 = (s5, t4) => {
    for (var a5 in t4)
      e3(s5, a5, { get: t4[a5], enumerable: true });
  };
  var a2 = {};
  s2(a2, { env: () => n3 });
  var n3 = {};
  s2(n3, { init: () => i, push: () => r, simulation: () => u });
  var o2 = async () => ({ ok: true, successful: [], queued: [], failed: [] });
  var i = void 0;
  var r = { push: o2, command: o2, elb: o2 };
  var u = ["call:elb"];
  var c = async (e6, s5) => {
    const { elb: t4 } = s5, a5 = { ...e6, settings: e6?.settings || { events: [] } };
    return (a5.settings?.events || []).forEach((e7) => {
      const { delay: s6, ...a6 } = e7;
      setTimeout(() => t4(a6), s6 || 0);
    }), { type: "demo", config: a5, push: t4 };
  };

  // node_modules/@walkeros/destination-demo/dist/index.mjs
  var e4 = Object.defineProperty;
  var n4 = (n6, o4) => {
    for (var i4 in o4)
      e4(n6, i4, { get: o4[i4], enumerable: true });
  };
  var i2 = {};
  n4(i2, { env: () => t2 });
  var t2 = {};
  n4(t2, { init: () => s3, push: () => a3, simulation: () => l });
  var s3 = { log: void 0 };
  var a3 = { log: Object.assign(() => {
  }, {}) };
  var l = ["call:log"];
  var g = { type: "demo", config: { settings: { name: "demo" } }, init({ config: e6, env: n6 }) {
    (n6?.log || console.log)(`[${{ name: "demo", ...e6?.settings }.name}] initialized`);
  }, push(e6, { config: n6, env: o4 }) {
    const i4 = o4?.log || console.log, t4 = { name: "demo", ...n6?.settings }, s5 = t4.values ? function(e7, n7) {
      const o5 = {};
      for (const i5 of n7) {
        const n8 = i5.split(".").reduce((e8, n9) => e8?.[n9], e7);
        void 0 !== n8 && (o5[i5] = n8);
      }
      return o5;
    }(e6, t4.values) : e6;
    i4(`[${t4.name}] ${JSON.stringify(s5, null, 2)}`);
  } };

  // node_modules/@walkeros/web-destination-api/dist/index.mjs
  var e5 = Object.defineProperty;
  var n5 = (n6, t4) => {
    for (var i4 in t4)
      e5(n6, i4, { get: t4[i4], enumerable: true });
  };
  var t3 = {};
  n5(t3, { $brand: () => o3, $input: () => so, $output: () => oo, NEVER: () => r2, TimePrecision: () => To, ZodAny: () => sc, ZodArray: () => hc, ZodBase64: () => xl, ZodBase64URL: () => Ol, ZodBigInt: () => Xl, ZodBigIntFormat: () => Yl, ZodBoolean: () => Kl, ZodCIDRv4: () => wl, ZodCIDRv6: () => Sl, ZodCUID: () => ll, ZodCUID2: () => dl, ZodCatch: () => sd, ZodCodec: () => pd, ZodCustom: () => Sd, ZodCustomStringFormat: () => El, ZodDate: () => fc, ZodDefault: () => Qc, ZodDiscriminatedUnion: () => zc, ZodE164: () => Nl, ZodEmail: () => Bu, ZodEmoji: () => al, ZodEnum: () => Jc, ZodError: () => ju, ZodFile: () => Wc, ZodFirstPartyTypeKind: () => Zd, ZodFunction: () => wd, ZodGUID: () => qu, ZodIPv4: () => yl, ZodIPv6: () => _l, ZodISODate: () => _u, ZodISODateTime: () => yu, ZodISODuration: () => Su, ZodISOTime: () => wu, ZodIntersection: () => jc, ZodIssueCode: () => Ed, ZodJWT: () => Dl, ZodKSUID: () => hl, ZodLazy: () => yd, ZodLiteral: () => Fc, ZodMap: () => Ec, ZodNaN: () => ld, ZodNanoID: () => sl, ZodNever: () => dc, ZodNonOptional: () => id, ZodNull: () => ac, ZodNullable: () => Xc, ZodNumber: () => Ll, ZodNumberFormat: () => Fl, ZodObject: () => $c, ZodOptional: () => Kc, ZodPipe: () => dd, ZodPrefault: () => nd, ZodPromise: () => _d, ZodReadonly: () => fd, ZodRealError: () => Ou, ZodRecord: () => Pc, ZodSet: () => Ac, ZodString: () => Wu, ZodStringFormat: () => Gu, ZodSuccess: () => ad, ZodSymbol: () => nc, ZodTemplateLiteral: () => hd, ZodTransform: () => Gc, ZodTuple: () => Uc, ZodType: () => Fu, ZodULID: () => pl, ZodURL: () => tl, ZodUUID: () => Hu, ZodUndefined: () => ic, ZodUnion: () => Ic, ZodUnknown: () => lc, ZodVoid: () => pc, ZodXID: () => fl, _ZodString: () => Mu, _default: () => ed, _function: () => Id, any: () => uc, array: () => bc, base64: () => jl, base64url: () => Ul, bigint: () => Hl, boolean: () => ql, catch: () => ud, check: () => zd, cidrv4: () => Il, cidrv6: () => zl, clone: () => W2, codec: () => vd, coerce: () => Cd, config: () => c2, core: () => i3, cuid: () => cl, cuid2: () => ml, custom: () => xd, date: () => gc, decode: () => Eu, decodeAsync: () => Au, discriminatedUnion: () => xc, e164: () => Pl, email: () => Ku, emoji: () => ol, encode: () => Zu, encodeAsync: () => Tu, endsWith: () => Us, enum: () => Lc, file: () => Vc, flattenError: () => ke2, float32: () => Wl, float64: () => Vl, formatError: () => we2, function: () => Id, getErrorMap: () => Ad, globalRegistry: () => co, gt: () => ms, gte: () => ps, guid: () => Xu, hash: () => Jl, hex: () => Cl, hostname: () => Al, httpUrl: () => rl, includes: () => js, instanceof: () => Ud, int: () => Ml, int32: () => Gl, int64: () => Ql, intersection: () => Oc, ipv4: () => $l, ipv6: () => kl, iso: () => bu, json: () => Pd, jwt: () => Zl, keyof: () => yc, ksuid: () => bl, lazy: () => $d, length: () => Is, literal: () => Mc, locales: () => gr, looseObject: () => wc, lowercase: () => zs, lt: () => cs, lte: () => ds, map: () => Tc, maxLength: () => ks, maxSize: () => ys, mime: () => Ps, minLength: () => ws, minSize: () => $s, multipleOf: () => bs, nan: () => cd, nanoid: () => ul, nativeEnum: () => Rc, negative: () => fs, never: () => mc, nonnegative: () => hs, nonoptional: () => rd, nonpositive: () => gs, normalize: () => Zs, null: () => oc, nullable: () => Hc, nullish: () => Yc, number: () => Rl, object: () => _c, optional: () => qc, overwrite: () => Ds, parse: () => Uu, parseAsync: () => Nu, partialRecord: () => Zc, pipe: () => md, positive: () => vs, prefault: () => td, preprocess: () => Dd, prettifyError: () => ze2, promise: () => kd, property: () => Ns, readonly: () => gd, record: () => Dc, refine: () => jd, regex: () => Ss, regexes: () => He2, registry: () => lo, safeDecode: () => Ju, safeDecodeAsync: () => Ru, safeEncode: () => Cu, safeEncodeAsync: () => Lu, safeParse: () => Pu, safeParseAsync: () => Du, set: () => Cc, setErrorMap: () => Td, size: () => _s, startsWith: () => Os, strictObject: () => kc, string: () => Vu, stringFormat: () => Tl, stringbool: () => Nd, success: () => od, superRefine: () => Od, symbol: () => tc, templateLiteral: () => bd, toJSONSchema: () => fu, toLowerCase: () => Ts, toUpperCase: () => As, transform: () => Bc, treeifyError: () => Ie2, trim: () => Es, tuple: () => Nc, uint32: () => Bl, uint64: () => ec, ulid: () => vl, undefined: () => rc, union: () => Sc, unknown: () => cc, uppercase: () => xs, url: () => il, util: () => d, uuid: () => Yu, uuidv4: () => Qu, uuidv6: () => el, uuidv7: () => nl, void: () => vc, xid: () => gl });
  var i3 = {};
  n5(i3, { $ZodAny: () => hi, $ZodArray: () => wi, $ZodAsyncError: () => s4, $ZodBase64: () => ti, $ZodBase64URL: () => ri, $ZodBigInt: () => mi, $ZodBigIntFormat: () => pi, $ZodBoolean: () => di, $ZodCIDRv4: () => Qt2, $ZodCIDRv6: () => ei2, $ZodCUID: () => Ft2, $ZodCUID2: () => Mt2, $ZodCatch: () => nr, $ZodCheck: () => st2, $ZodCheckBigIntFormat: () => pt, $ZodCheckEndsWith: () => zt2, $ZodCheckGreaterThan: () => ct2, $ZodCheckIncludes: () => It2, $ZodCheckLengthEquals: () => yt2, $ZodCheckLessThan: () => lt2, $ZodCheckLowerCase: () => kt2, $ZodCheckMaxLength: () => ht, $ZodCheckMaxSize: () => vt2, $ZodCheckMimeType: () => Ot2, $ZodCheckMinLength: () => bt, $ZodCheckMinSize: () => ft, $ZodCheckMultipleOf: () => dt2, $ZodCheckNumberFormat: () => mt, $ZodCheckOverwrite: () => Ut, $ZodCheckProperty: () => jt, $ZodCheckRegex: () => _t2, $ZodCheckSizeEquals: () => gt, $ZodCheckStartsWith: () => St, $ZodCheckStringFormat: () => $t2, $ZodCheckUpperCase: () => wt2, $ZodCodec: () => ar, $ZodCustom: () => vr, $ZodCustomStringFormat: () => ui, $ZodDate: () => _i, $ZodDefault: () => qi, $ZodDiscriminatedUnion: () => Ni, $ZodE164: () => ai2, $ZodEmail: () => Ct2, $ZodEmoji: () => Lt2, $ZodEncodeError: () => u2, $ZodEnum: () => Fi, $ZodError: () => $e2, $ZodFile: () => Wi, $ZodFunction: () => dr, $ZodGUID: () => Tt2, $ZodIPv4: () => Ht2, $ZodIPv6: () => Yt, $ZodISODate: () => Kt2, $ZodISODateTime: () => Bt, $ZodISODuration: () => Xt2, $ZodISOTime: () => qt, $ZodIntersection: () => Pi, $ZodJWT: () => si, $ZodKSUID: () => Gt2, $ZodLazy: () => pr, $ZodLiteral: () => Mi, $ZodMap: () => Ci, $ZodNaN: () => tr, $ZodNanoID: () => Rt, $ZodNever: () => yi, $ZodNonOptional: () => Yi, $ZodNull: () => gi, $ZodNullable: () => Ki, $ZodNumber: () => li, $ZodNumberFormat: () => ci, $ZodObject: () => xi, $ZodObjectJIT: () => ji, $ZodOptional: () => Bi, $ZodPipe: () => ir, $ZodPrefault: () => Hi, $ZodPromise: () => mr, $ZodReadonly: () => ur, $ZodRealError: () => _e2, $ZodRecord: () => Ai, $ZodRegistry: () => uo, $ZodSet: () => Li, $ZodString: () => Zt, $ZodStringFormat: () => Et, $ZodSuccess: () => er, $ZodSymbol: () => vi, $ZodTemplateLiteral: () => cr, $ZodTransform: () => Vi, $ZodTuple: () => Ei, $ZodType: () => Dt, $ZodULID: () => Wt2, $ZodURL: () => Jt2, $ZodUUID: () => At, $ZodUndefined: () => fi, $ZodUnion: () => Ui, $ZodUnknown: () => bi, $ZodVoid: () => $i, $ZodXID: () => Vt, $brand: () => o3, $constructor: () => a4, $input: () => so, $output: () => oo, Doc: () => Nt, JSONSchema: () => hu, JSONSchemaGenerator: () => vu, NEVER: () => r2, TimePrecision: () => To, _any: () => is, _array: () => Cs, _base64: () => Po, _base64url: () => Do, _bigint: () => Xo, _boolean: () => Ko, _catch: () => tu, _check: () => du, _cidrv4: () => Uo, _cidrv6: () => No, _coercedBigint: () => Ho, _coercedBoolean: () => qo, _coercedDate: () => us, _coercedNumber: () => Fo, _coercedString: () => po, _cuid: () => wo, _cuid2: () => Io, _custom: () => uu, _date: () => ss, _decode: () => Ae2, _decodeAsync: () => Re2, _default: () => Qs, _discriminatedUnion: () => Ls, _e164: () => Zo, _email: () => vo, _emoji: () => _o, _encode: () => Ee2, _encodeAsync: () => Je2, _endsWith: () => Us, _enum: () => Gs, _file: () => qs, _float32: () => Wo, _float64: () => Vo, _gt: () => ms, _gte: () => ps, _guid: () => fo, _includes: () => js, _int: () => Mo, _int32: () => Go, _int64: () => Yo, _intersection: () => Rs, _ipv4: () => jo, _ipv6: () => Oo, _isoDate: () => Co, _isoDateTime: () => Ao, _isoDuration: () => Lo, _isoTime: () => Jo, _jwt: () => Eo, _ksuid: () => xo, _lazy: () => ou, _length: () => Is, _literal: () => Ks, _lowercase: () => zs, _lt: () => cs, _lte: () => ds, _map: () => Ws, _max: () => ds, _maxLength: () => ks, _maxSize: () => ys, _mime: () => Ps, _min: () => ps, _minLength: () => ws, _minSize: () => $s, _multipleOf: () => bs, _nan: () => ls, _nanoid: () => ko, _nativeEnum: () => Bs, _negative: () => fs, _never: () => as, _nonnegative: () => hs, _nonoptional: () => eu, _nonpositive: () => gs, _normalize: () => Zs, _null: () => ts, _nullable: () => Ys, _number: () => Ro, _optional: () => Hs, _overwrite: () => Ds, _parse: () => xe2, _parseAsync: () => Oe2, _pipe: () => iu, _positive: () => vs, _promise: () => su, _property: () => Ns, _readonly: () => ru, _record: () => Ms, _refine: () => lu, _regex: () => Ss, _safeDecode: () => Ve2, _safeDecodeAsync: () => qe2, _safeEncode: () => Me2, _safeEncodeAsync: () => Be2, _safeParse: () => Ne2, _safeParseAsync: () => De2, _set: () => Vs, _size: () => _s, _startsWith: () => Os, _string: () => mo, _stringFormat: () => pu, _stringbool: () => mu, _success: () => nu, _superRefine: () => cu, _symbol: () => es, _templateLiteral: () => au, _toLowerCase: () => Ts, _toUpperCase: () => As, _transform: () => Xs, _trim: () => Es, _tuple: () => Fs, _uint32: () => Bo, _uint64: () => Qo, _ulid: () => So, _undefined: () => ns, _union: () => Js, _unknown: () => rs, _uppercase: () => xs, _url: () => $o, _uuid: () => go, _uuidv4: () => ho, _uuidv6: () => bo, _uuidv7: () => yo, _void: () => os, _xid: () => zo, clone: () => W2, config: () => c2, decode: () => Ce2, decodeAsync: () => Fe2, encode: () => Te2, encodeAsync: () => Le2, flattenError: () => ke2, formatError: () => we2, globalConfig: () => l2, globalRegistry: () => co, isValidBase64: () => ni, isValidBase64URL: () => ii, isValidJWT: () => oi, locales: () => gr, parse: () => je2, parseAsync: () => Ue2, prettifyError: () => ze2, regexes: () => He2, registry: () => lo, safeDecode: () => Ge2, safeDecodeAsync: () => Xe2, safeEncode: () => We2, safeEncodeAsync: () => Ke2, safeParse: () => Pe2, safeParseAsync: () => Ze2, toDotPath: () => Se2, toJSONSchema: () => fu, treeifyError: () => Ie2, util: () => d, version: () => Pt2 });
  var r2 = Object.freeze({ status: "aborted" });
  function a4(e6, n6, t4) {
    var i4;
    function r3(t5, i5) {
      var r4, a6;
      Object.defineProperty(t5, "_zod", { value: null != (r4 = t5._zod) ? r4 : {}, enumerable: false }), null != (a6 = t5._zod).traits || (a6.traits = /* @__PURE__ */ new Set()), t5._zod.traits.add(e6), n6(t5, i5);
      for (const e7 in s5.prototype)
        e7 in t5 || Object.defineProperty(t5, e7, { value: s5.prototype[e7].bind(t5) });
      t5._zod.constr = s5, t5._zod.def = i5;
    }
    const a5 = null != (i4 = null == t4 ? void 0 : t4.Parent) ? i4 : Object;
    class o4 extends a5 {
    }
    function s5(e7) {
      var n7;
      const i5 = (null == t4 ? void 0 : t4.Parent) ? new o4() : this;
      r3(i5, e7), null != (n7 = i5._zod).deferred || (n7.deferred = []);
      for (const e8 of i5._zod.deferred)
        e8();
      return i5;
    }
    return Object.defineProperty(o4, "name", { value: e6 }), Object.defineProperty(s5, "init", { value: r3 }), Object.defineProperty(s5, Symbol.hasInstance, { value: (n7) => {
      var i5, r4;
      return !!((null == t4 ? void 0 : t4.Parent) && n7 instanceof t4.Parent) || (null == (r4 = null == (i5 = null == n7 ? void 0 : n7._zod) ? void 0 : i5.traits) ? void 0 : r4.has(e6));
    } }), Object.defineProperty(s5, "name", { value: e6 }), s5;
  }
  var o3 = Symbol("zod_brand");
  var s4 = class extends Error {
    constructor() {
      super("Encountered Promise during synchronous parse. Use .parseAsync() instead.");
    }
  };
  var u2 = class extends Error {
    constructor(e6) {
      super(`Encountered unidirectional transform during encode: ${e6}`), this.name = "ZodEncodeError";
    }
  };
  var l2 = {};
  function c2(e6) {
    return e6 && Object.assign(l2, e6), l2;
  }
  var d = {};
  function m(e6) {
    return e6;
  }
  function p(e6) {
    return e6;
  }
  function v3(e6) {
  }
  function f(e6) {
    throw new Error();
  }
  function g2(e6) {
  }
  function h3(e6) {
    const n6 = Object.values(e6).filter((e7) => "number" == typeof e7);
    return Object.entries(e6).filter(([e7, t4]) => -1 === n6.indexOf(+e7)).map(([e7, n7]) => n7);
  }
  function b(e6, n6 = "|") {
    return e6.map((e7) => B3(e7)).join(n6);
  }
  function y2(e6, n6) {
    return "bigint" == typeof n6 ? n6.toString() : n6;
  }
  function $2(e6) {
    return { get value() {
      {
        const n6 = e6();
        return Object.defineProperty(this, "value", { value: n6 }), n6;
      }
    } };
  }
  function _3(e6) {
    return null == e6;
  }
  function k3(e6) {
    const n6 = e6.startsWith("^") ? 1 : 0, t4 = e6.endsWith("$") ? e6.length - 1 : e6.length;
    return e6.slice(n6, t4);
  }
  function w3(e6, n6) {
    const t4 = (e6.toString().split(".")[1] || "").length, i4 = n6.toString();
    let r3 = (i4.split(".")[1] || "").length;
    if (0 === r3 && /\d?e-\d?/.test(i4)) {
      const e7 = i4.match(/\d?e-(\d?)/);
      (null == e7 ? void 0 : e7[1]) && (r3 = Number.parseInt(e7[1]));
    }
    const a5 = t4 > r3 ? t4 : r3;
    return Number.parseInt(e6.toFixed(a5).replace(".", "")) % Number.parseInt(n6.toFixed(a5).replace(".", "")) / 10 ** a5;
  }
  n5(d, { BIGINT_FORMAT_RANGES: () => X, Class: () => be2, NUMBER_FORMAT_RANGES: () => q3, aborted: () => re2, allowsEval: () => T3, assert: () => g2, assertEqual: () => m, assertIs: () => v3, assertNever: () => f, assertNotEqual: () => p, assignProp: () => x2, base64ToUint8Array: () => me2, base64urlToUint8Array: () => ve2, cached: () => $2, captureStackTrace: () => Z2, cleanEnum: () => de2, cleanRegex: () => k3, clone: () => W2, cloneDef: () => O3, createTransparentProxy: () => G2, defineLazy: () => S3, esc: () => D2, escapeRegex: () => M2, extend: () => Q2, finalizeIssue: () => se2, floatSafeRemainder: () => w3, getElementAtPath: () => U2, getEnumValues: () => h3, getLengthableOrigin: () => le2, getParsedType: () => L2, getSizableOrigin: () => ue2, hexToUint8Array: () => ge2, isObject: () => E2, isPlainObject: () => A3, issue: () => ce2, joinValues: () => b, jsonStringifyReplacer: () => y2, merge: () => ne2, mergeDefs: () => j2, normalizeParams: () => V2, nullish: () => _3, numKeys: () => J3, objectClone: () => z2, omit: () => Y2, optionalKeys: () => K2, partial: () => te2, pick: () => H2, prefixIssues: () => ae2, primitiveTypes: () => F2, promiseAllObject: () => N2, propertyKeyTypes: () => R2, randomString: () => P2, required: () => ie2, safeExtend: () => ee2, shallowClone: () => C3, stringifyPrimitive: () => B3, uint8ArrayToBase64: () => pe2, uint8ArrayToBase64url: () => fe2, uint8ArrayToHex: () => he2, unwrapMessage: () => oe2 });
  var I2 = Symbol("evaluating");
  function S3(e6, n6, t4) {
    let i4;
    Object.defineProperty(e6, n6, { get() {
      if (i4 !== I2)
        return void 0 === i4 && (i4 = I2, i4 = t4()), i4;
    }, set(t5) {
      Object.defineProperty(e6, n6, { value: t5 });
    }, configurable: true });
  }
  function z2(e6) {
    return Object.create(Object.getPrototypeOf(e6), Object.getOwnPropertyDescriptors(e6));
  }
  function x2(e6, n6, t4) {
    Object.defineProperty(e6, n6, { value: t4, writable: true, enumerable: true, configurable: true });
  }
  function j2(...e6) {
    const n6 = {};
    for (const t4 of e6) {
      const e7 = Object.getOwnPropertyDescriptors(t4);
      Object.assign(n6, e7);
    }
    return Object.defineProperties({}, n6);
  }
  function O3(e6) {
    return j2(e6._zod.def);
  }
  function U2(e6, n6) {
    return n6 ? n6.reduce((e7, n7) => null == e7 ? void 0 : e7[n7], e6) : e6;
  }
  function N2(e6) {
    const n6 = Object.keys(e6), t4 = n6.map((n7) => e6[n7]);
    return Promise.all(t4).then((e7) => {
      const t5 = {};
      for (let i4 = 0; i4 < n6.length; i4++)
        t5[n6[i4]] = e7[i4];
      return t5;
    });
  }
  function P2(e6 = 10) {
    const n6 = "abcdefghijklmnopqrstuvwxyz";
    let t4 = "";
    for (let i4 = 0; i4 < e6; i4++)
      t4 += n6[Math.floor(26 * Math.random())];
    return t4;
  }
  function D2(e6) {
    return JSON.stringify(e6);
  }
  var Z2 = "captureStackTrace" in Error ? Error.captureStackTrace : (...e6) => {
  };
  function E2(e6) {
    return "object" == typeof e6 && null !== e6 && !Array.isArray(e6);
  }
  var T3 = $2(() => {
    var e6;
    if ("undefined" != typeof navigator && (null == (e6 = null == navigator ? void 0 : navigator.userAgent) ? void 0 : e6.includes("Cloudflare")))
      return false;
    try {
      return new Function(""), true;
    } catch (e7) {
      return false;
    }
  });
  function A3(e6) {
    if (false === E2(e6))
      return false;
    const n6 = e6.constructor;
    if (void 0 === n6)
      return true;
    const t4 = n6.prototype;
    return false !== E2(t4) && false !== Object.prototype.hasOwnProperty.call(t4, "isPrototypeOf");
  }
  function C3(e6) {
    return A3(e6) ? { ...e6 } : Array.isArray(e6) ? [...e6] : e6;
  }
  function J3(e6) {
    let n6 = 0;
    for (const t4 in e6)
      Object.prototype.hasOwnProperty.call(e6, t4) && n6++;
    return n6;
  }
  var L2 = (e6) => {
    const n6 = typeof e6;
    switch (n6) {
      case "undefined":
        return "undefined";
      case "string":
        return "string";
      case "number":
        return Number.isNaN(e6) ? "nan" : "number";
      case "boolean":
        return "boolean";
      case "function":
        return "function";
      case "bigint":
        return "bigint";
      case "symbol":
        return "symbol";
      case "object":
        return Array.isArray(e6) ? "array" : null === e6 ? "null" : e6.then && "function" == typeof e6.then && e6.catch && "function" == typeof e6.catch ? "promise" : "undefined" != typeof Map && e6 instanceof Map ? "map" : "undefined" != typeof Set && e6 instanceof Set ? "set" : "undefined" != typeof Date && e6 instanceof Date ? "date" : "undefined" != typeof File && e6 instanceof File ? "file" : "object";
      default:
        throw new Error(`Unknown data type: ${n6}`);
    }
  };
  var R2 = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
  var F2 = /* @__PURE__ */ new Set(["string", "number", "bigint", "boolean", "symbol", "undefined"]);
  function M2(e6) {
    return e6.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
  function W2(e6, n6, t4) {
    const i4 = new e6._zod.constr(null != n6 ? n6 : e6._zod.def);
    return n6 && !(null == t4 ? void 0 : t4.parent) || (i4._zod.parent = e6), i4;
  }
  function V2(e6) {
    const n6 = e6;
    if (!n6)
      return {};
    if ("string" == typeof n6)
      return { error: () => n6 };
    if (void 0 !== (null == n6 ? void 0 : n6.message)) {
      if (void 0 !== (null == n6 ? void 0 : n6.error))
        throw new Error("Cannot specify both `message` and `error` params");
      n6.error = n6.message;
    }
    return delete n6.message, "string" == typeof n6.error ? { ...n6, error: () => n6.error } : n6;
  }
  function G2(e6) {
    let n6;
    return new Proxy({}, { get: (t4, i4, r3) => (null != n6 || (n6 = e6()), Reflect.get(n6, i4, r3)), set: (t4, i4, r3, a5) => (null != n6 || (n6 = e6()), Reflect.set(n6, i4, r3, a5)), has: (t4, i4) => (null != n6 || (n6 = e6()), Reflect.has(n6, i4)), deleteProperty: (t4, i4) => (null != n6 || (n6 = e6()), Reflect.deleteProperty(n6, i4)), ownKeys: (t4) => (null != n6 || (n6 = e6()), Reflect.ownKeys(n6)), getOwnPropertyDescriptor: (t4, i4) => (null != n6 || (n6 = e6()), Reflect.getOwnPropertyDescriptor(n6, i4)), defineProperty: (t4, i4, r3) => (null != n6 || (n6 = e6()), Reflect.defineProperty(n6, i4, r3)) });
  }
  function B3(e6) {
    return "bigint" == typeof e6 ? e6.toString() + "n" : "string" == typeof e6 ? `"${e6}"` : `${e6}`;
  }
  function K2(e6) {
    return Object.keys(e6).filter((n6) => "optional" === e6[n6]._zod.optin && "optional" === e6[n6]._zod.optout);
  }
  var q3 = { safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER], int32: [-2147483648, 2147483647], uint32: [0, 4294967295], float32: [-34028234663852886e22, 34028234663852886e22], float64: [-Number.MAX_VALUE, Number.MAX_VALUE] };
  var X = { int64: [BigInt("-9223372036854775808"), BigInt("9223372036854775807")], uint64: [BigInt(0), BigInt("18446744073709551615")] };
  function H2(e6, n6) {
    const t4 = e6._zod.def;
    return W2(e6, j2(e6._zod.def, { get shape() {
      const e7 = {};
      for (const i4 in n6) {
        if (!(i4 in t4.shape))
          throw new Error(`Unrecognized key: "${i4}"`);
        n6[i4] && (e7[i4] = t4.shape[i4]);
      }
      return x2(this, "shape", e7), e7;
    }, checks: [] }));
  }
  function Y2(e6, n6) {
    const t4 = e6._zod.def, i4 = j2(e6._zod.def, { get shape() {
      const i5 = { ...e6._zod.def.shape };
      for (const e7 in n6) {
        if (!(e7 in t4.shape))
          throw new Error(`Unrecognized key: "${e7}"`);
        n6[e7] && delete i5[e7];
      }
      return x2(this, "shape", i5), i5;
    }, checks: [] });
    return W2(e6, i4);
  }
  function Q2(e6, n6) {
    if (!A3(n6))
      throw new Error("Invalid input to extend: expected a plain object");
    const t4 = e6._zod.def.checks;
    if (t4 && t4.length > 0)
      throw new Error("Object schemas containing refinements cannot be extended. Use `.safeExtend()` instead.");
    const i4 = j2(e6._zod.def, { get shape() {
      const t5 = { ...e6._zod.def.shape, ...n6 };
      return x2(this, "shape", t5), t5;
    }, checks: [] });
    return W2(e6, i4);
  }
  function ee2(e6, n6) {
    if (!A3(n6))
      throw new Error("Invalid input to safeExtend: expected a plain object");
    const t4 = { ...e6._zod.def, get shape() {
      const t5 = { ...e6._zod.def.shape, ...n6 };
      return x2(this, "shape", t5), t5;
    }, checks: e6._zod.def.checks };
    return W2(e6, t4);
  }
  function ne2(e6, n6) {
    const t4 = j2(e6._zod.def, { get shape() {
      const t5 = { ...e6._zod.def.shape, ...n6._zod.def.shape };
      return x2(this, "shape", t5), t5;
    }, get catchall() {
      return n6._zod.def.catchall;
    }, checks: [] });
    return W2(e6, t4);
  }
  function te2(e6, n6, t4) {
    const i4 = j2(n6._zod.def, { get shape() {
      const i5 = n6._zod.def.shape, r3 = { ...i5 };
      if (t4)
        for (const n7 in t4) {
          if (!(n7 in i5))
            throw new Error(`Unrecognized key: "${n7}"`);
          t4[n7] && (r3[n7] = e6 ? new e6({ type: "optional", innerType: i5[n7] }) : i5[n7]);
        }
      else
        for (const n7 in i5)
          r3[n7] = e6 ? new e6({ type: "optional", innerType: i5[n7] }) : i5[n7];
      return x2(this, "shape", r3), r3;
    }, checks: [] });
    return W2(n6, i4);
  }
  function ie2(e6, n6, t4) {
    const i4 = j2(n6._zod.def, { get shape() {
      const i5 = n6._zod.def.shape, r3 = { ...i5 };
      if (t4)
        for (const n7 in t4) {
          if (!(n7 in r3))
            throw new Error(`Unrecognized key: "${n7}"`);
          t4[n7] && (r3[n7] = new e6({ type: "nonoptional", innerType: i5[n7] }));
        }
      else
        for (const n7 in i5)
          r3[n7] = new e6({ type: "nonoptional", innerType: i5[n7] });
      return x2(this, "shape", r3), r3;
    }, checks: [] });
    return W2(n6, i4);
  }
  function re2(e6, n6 = 0) {
    var t4;
    if (true === e6.aborted)
      return true;
    for (let i4 = n6; i4 < e6.issues.length; i4++)
      if (true !== (null == (t4 = e6.issues[i4]) ? void 0 : t4.continue))
        return true;
    return false;
  }
  function ae2(e6, n6) {
    return n6.map((n7) => {
      var t4;
      return null != (t4 = n7).path || (t4.path = []), n7.path.unshift(e6), n7;
    });
  }
  function oe2(e6) {
    return "string" == typeof e6 ? e6 : null == e6 ? void 0 : e6.message;
  }
  function se2(e6, n6, t4) {
    var i4, r3, a5, o4, s5, u3, l3, c3, d2, m2, p2;
    const v4 = { ...e6, path: null != (i4 = e6.path) ? i4 : [] };
    if (!e6.message) {
      const i5 = null != (p2 = null != (m2 = null != (c3 = null != (u3 = oe2(null == (o4 = null == (a5 = null == (r3 = e6.inst) ? void 0 : r3._zod.def) ? void 0 : a5.error) ? void 0 : o4.call(a5, e6))) ? u3 : oe2(null == (s5 = null == n6 ? void 0 : n6.error) ? void 0 : s5.call(n6, e6))) ? c3 : oe2(null == (l3 = t4.customError) ? void 0 : l3.call(t4, e6))) ? m2 : oe2(null == (d2 = t4.localeError) ? void 0 : d2.call(t4, e6))) ? p2 : "Invalid input";
      v4.message = i5;
    }
    return delete v4.inst, delete v4.continue, (null == n6 ? void 0 : n6.reportInput) || delete v4.input, v4;
  }
  function ue2(e6) {
    return e6 instanceof Set ? "set" : e6 instanceof Map ? "map" : e6 instanceof File ? "file" : "unknown";
  }
  function le2(e6) {
    return Array.isArray(e6) ? "array" : "string" == typeof e6 ? "string" : "unknown";
  }
  function ce2(...e6) {
    const [n6, t4, i4] = e6;
    return "string" == typeof n6 ? { message: n6, code: "custom", input: t4, inst: i4 } : { ...n6 };
  }
  function de2(e6) {
    return Object.entries(e6).filter(([e7, n6]) => Number.isNaN(Number.parseInt(e7, 10))).map((e7) => e7[1]);
  }
  function me2(e6) {
    const n6 = atob(e6), t4 = new Uint8Array(n6.length);
    for (let e7 = 0; e7 < n6.length; e7++)
      t4[e7] = n6.charCodeAt(e7);
    return t4;
  }
  function pe2(e6) {
    let n6 = "";
    for (let t4 = 0; t4 < e6.length; t4++)
      n6 += String.fromCharCode(e6[t4]);
    return btoa(n6);
  }
  function ve2(e6) {
    const n6 = e6.replace(/-/g, "+").replace(/_/g, "/");
    return me2(n6 + "=".repeat((4 - n6.length % 4) % 4));
  }
  function fe2(e6) {
    return pe2(e6).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  function ge2(e6) {
    const n6 = e6.replace(/^0x/, "");
    if (n6.length % 2 != 0)
      throw new Error("Invalid hex string length");
    const t4 = new Uint8Array(n6.length / 2);
    for (let e7 = 0; e7 < n6.length; e7 += 2)
      t4[e7 / 2] = Number.parseInt(n6.slice(e7, e7 + 2), 16);
    return t4;
  }
  function he2(e6) {
    return Array.from(e6).map((e7) => e7.toString(16).padStart(2, "0")).join("");
  }
  var be2 = class {
    constructor(...e6) {
    }
  };
  var ye2 = (e6, n6) => {
    e6.name = "$ZodError", Object.defineProperty(e6, "_zod", { value: e6._zod, enumerable: false }), Object.defineProperty(e6, "issues", { value: n6, enumerable: false }), e6.message = JSON.stringify(n6, y2, 2), Object.defineProperty(e6, "toString", { value: () => e6.message, enumerable: false });
  };
  var $e2 = a4("$ZodError", ye2);
  var _e2 = a4("$ZodError", ye2, { Parent: Error });
  function ke2(e6, n6 = (e7) => e7.message) {
    const t4 = {}, i4 = [];
    for (const r3 of e6.issues)
      r3.path.length > 0 ? (t4[r3.path[0]] = t4[r3.path[0]] || [], t4[r3.path[0]].push(n6(r3))) : i4.push(n6(r3));
    return { formErrors: i4, fieldErrors: t4 };
  }
  function we2(e6, n6 = (e7) => e7.message) {
    const t4 = { _errors: [] }, i4 = (e7) => {
      for (const r3 of e7.issues)
        if ("invalid_union" === r3.code && r3.errors.length)
          r3.errors.map((e8) => i4({ issues: e8 }));
        else if ("invalid_key" === r3.code)
          i4({ issues: r3.issues });
        else if ("invalid_element" === r3.code)
          i4({ issues: r3.issues });
        else if (0 === r3.path.length)
          t4._errors.push(n6(r3));
        else {
          let e8 = t4, i5 = 0;
          for (; i5 < r3.path.length; ) {
            const t5 = r3.path[i5];
            i5 === r3.path.length - 1 ? (e8[t5] = e8[t5] || { _errors: [] }, e8[t5]._errors.push(n6(r3))) : e8[t5] = e8[t5] || { _errors: [] }, e8 = e8[t5], i5++;
          }
        }
    };
    return i4(e6), t4;
  }
  function Ie2(e6, n6 = (e7) => e7.message) {
    const t4 = { errors: [] }, i4 = (e7, r3 = []) => {
      var a5, o4;
      for (const s5 of e7.issues)
        if ("invalid_union" === s5.code && s5.errors.length)
          s5.errors.map((e8) => i4({ issues: e8 }, s5.path));
        else if ("invalid_key" === s5.code)
          i4({ issues: s5.issues }, s5.path);
        else if ("invalid_element" === s5.code)
          i4({ issues: s5.issues }, s5.path);
        else {
          const e8 = [...r3, ...s5.path];
          if (0 === e8.length) {
            t4.errors.push(n6(s5));
            continue;
          }
          let i5 = t4, u3 = 0;
          for (; u3 < e8.length; ) {
            const t5 = e8[u3], r4 = u3 === e8.length - 1;
            "string" == typeof t5 ? (null != i5.properties || (i5.properties = {}), null != (a5 = i5.properties)[t5] || (a5[t5] = { errors: [] }), i5 = i5.properties[t5]) : (null != i5.items || (i5.items = []), null != (o4 = i5.items)[t5] || (o4[t5] = { errors: [] }), i5 = i5.items[t5]), r4 && i5.errors.push(n6(s5)), u3++;
          }
        }
    };
    return i4(e6), t4;
  }
  function Se2(e6) {
    const n6 = [], t4 = e6.map((e7) => "object" == typeof e7 ? e7.key : e7);
    for (const e7 of t4)
      "number" == typeof e7 ? n6.push(`[${e7}]`) : "symbol" == typeof e7 ? n6.push(`[${JSON.stringify(String(e7))}]`) : /[^\w$]/.test(e7) ? n6.push(`[${JSON.stringify(e7)}]`) : (n6.length && n6.push("."), n6.push(e7));
    return n6.join("");
  }
  function ze2(e6) {
    var n6;
    const t4 = [], i4 = [...e6.issues].sort((e7, n7) => {
      var t5, i5;
      return (null != (t5 = e7.path) ? t5 : []).length - (null != (i5 = n7.path) ? i5 : []).length;
    });
    for (const e7 of i4)
      t4.push(`\u2716 ${e7.message}`), (null == (n6 = e7.path) ? void 0 : n6.length) && t4.push(`  \u2192 at ${Se2(e7.path)}`);
    return t4.join("\n");
  }
  var xe2 = (e6) => (n6, t4, i4, r3) => {
    var a5;
    const o4 = i4 ? Object.assign(i4, { async: false }) : { async: false }, u3 = n6._zod.run({ value: t4, issues: [] }, o4);
    if (u3 instanceof Promise)
      throw new s4();
    if (u3.issues.length) {
      const n7 = new (null != (a5 = null == r3 ? void 0 : r3.Err) ? a5 : e6)(u3.issues.map((e7) => se2(e7, o4, c2())));
      throw Z2(n7, null == r3 ? void 0 : r3.callee), n7;
    }
    return u3.value;
  };
  var je2 = xe2(_e2);
  var Oe2 = (e6) => async (n6, t4, i4, r3) => {
    var a5;
    const o4 = i4 ? Object.assign(i4, { async: true }) : { async: true };
    let s5 = n6._zod.run({ value: t4, issues: [] }, o4);
    if (s5 instanceof Promise && (s5 = await s5), s5.issues.length) {
      const n7 = new (null != (a5 = null == r3 ? void 0 : r3.Err) ? a5 : e6)(s5.issues.map((e7) => se2(e7, o4, c2())));
      throw Z2(n7, null == r3 ? void 0 : r3.callee), n7;
    }
    return s5.value;
  };
  var Ue2 = Oe2(_e2);
  var Ne2 = (e6) => (n6, t4, i4) => {
    const r3 = i4 ? { ...i4, async: false } : { async: false }, a5 = n6._zod.run({ value: t4, issues: [] }, r3);
    if (a5 instanceof Promise)
      throw new s4();
    return a5.issues.length ? { success: false, error: new (null != e6 ? e6 : $e2)(a5.issues.map((e7) => se2(e7, r3, c2()))) } : { success: true, data: a5.value };
  };
  var Pe2 = Ne2(_e2);
  var De2 = (e6) => async (n6, t4, i4) => {
    const r3 = i4 ? Object.assign(i4, { async: true }) : { async: true };
    let a5 = n6._zod.run({ value: t4, issues: [] }, r3);
    return a5 instanceof Promise && (a5 = await a5), a5.issues.length ? { success: false, error: new e6(a5.issues.map((e7) => se2(e7, r3, c2()))) } : { success: true, data: a5.value };
  };
  var Ze2 = De2(_e2);
  var Ee2 = (e6) => (n6, t4, i4) => {
    const r3 = i4 ? Object.assign(i4, { direction: "backward" }) : { direction: "backward" };
    return xe2(e6)(n6, t4, r3);
  };
  var Te2 = Ee2(_e2);
  var Ae2 = (e6) => (n6, t4, i4) => xe2(e6)(n6, t4, i4);
  var Ce2 = Ae2(_e2);
  var Je2 = (e6) => async (n6, t4, i4) => {
    const r3 = i4 ? Object.assign(i4, { direction: "backward" }) : { direction: "backward" };
    return Oe2(e6)(n6, t4, r3);
  };
  var Le2 = Je2(_e2);
  var Re2 = (e6) => async (n6, t4, i4) => Oe2(e6)(n6, t4, i4);
  var Fe2 = Re2(_e2);
  var Me2 = (e6) => (n6, t4, i4) => {
    const r3 = i4 ? Object.assign(i4, { direction: "backward" }) : { direction: "backward" };
    return Ne2(e6)(n6, t4, r3);
  };
  var We2 = Me2(_e2);
  var Ve2 = (e6) => (n6, t4, i4) => Ne2(e6)(n6, t4, i4);
  var Ge2 = Ve2(_e2);
  var Be2 = (e6) => async (n6, t4, i4) => {
    const r3 = i4 ? Object.assign(i4, { direction: "backward" }) : { direction: "backward" };
    return De2(e6)(n6, t4, r3);
  };
  var Ke2 = Be2(_e2);
  var qe2 = (e6) => async (n6, t4, i4) => De2(e6)(n6, t4, i4);
  var Xe2 = qe2(_e2);
  var He2 = {};
  n5(He2, { base64: () => In2, base64url: () => Sn2, bigint: () => En2, boolean: () => Cn2, browserEmail: () => hn2, cidrv4: () => kn2, cidrv6: () => wn2, cuid: () => Ye2, cuid2: () => Qe2, date: () => Un2, datetime: () => Dn2, domain: () => xn2, duration: () => an2, e164: () => jn2, email: () => mn2, emoji: () => yn2, extendedDuration: () => on2, guid: () => sn2, hex: () => Mn2, hostname: () => zn2, html5Email: () => pn2, idnEmail: () => gn2, integer: () => Tn2, ipv4: () => $n2, ipv6: () => _n2, ksuid: () => tn2, lowercase: () => Rn2, md5_base64: () => Bn2, md5_base64url: () => Kn2, md5_hex: () => Gn2, nanoid: () => rn2, null: () => Jn2, number: () => An2, rfc5322Email: () => vn2, sha1_base64: () => Xn2, sha1_base64url: () => Hn2, sha1_hex: () => qn2, sha256_base64: () => Qn2, sha256_base64url: () => et2, sha256_hex: () => Yn2, sha384_base64: () => tt2, sha384_base64url: () => it2, sha384_hex: () => nt2, sha512_base64: () => at2, sha512_base64url: () => ot2, sha512_hex: () => rt2, string: () => Zn2, time: () => Pn2, ulid: () => en2, undefined: () => Ln2, unicodeEmail: () => fn2, uppercase: () => Fn2, uuid: () => un2, uuid4: () => ln2, uuid6: () => cn2, uuid7: () => dn2, xid: () => nn2 });
  var Ye2 = /^[cC][^\s-]{8,}$/;
  var Qe2 = /^[0-9a-z]+$/;
  var en2 = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
  var nn2 = /^[0-9a-vA-V]{20}$/;
  var tn2 = /^[A-Za-z0-9]{27}$/;
  var rn2 = /^[a-zA-Z0-9_-]{21}$/;
  var an2 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
  var on2 = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  var sn2 = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
  var un2 = (e6) => e6 ? new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${e6}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`) : /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  var ln2 = un2(4);
  var cn2 = un2(6);
  var dn2 = un2(7);
  var mn2 = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
  var pn2 = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  var vn2 = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  var fn2 = /^[^\s@"]{1,64}@[^\s@]{1,255}$/u;
  var gn2 = fn2;
  var hn2 = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  var bn2 = "^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$";
  function yn2() {
    return new RegExp(bn2, "u");
  }
  var $n2 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  var _n2 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
  var kn2 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
  var wn2 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var In2 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
  var Sn2 = /^[A-Za-z0-9_-]*$/;
  var zn2 = /^(?=.{1,253}\.?$)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[-0-9a-zA-Z]{0,61}[0-9a-zA-Z])?)*\.?$/;
  var xn2 = /^([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  var jn2 = /^\+(?:[0-9]){6,14}[0-9]$/;
  var On2 = "(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))";
  var Un2 = new RegExp(`^${On2}$`);
  function Nn2(e6) {
    const n6 = "(?:[01]\\d|2[0-3]):[0-5]\\d";
    return "number" == typeof e6.precision ? -1 === e6.precision ? `${n6}` : 0 === e6.precision ? `${n6}:[0-5]\\d` : `${n6}:[0-5]\\d\\.\\d{${e6.precision}}` : `${n6}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  }
  function Pn2(e6) {
    return new RegExp(`^${Nn2(e6)}$`);
  }
  function Dn2(e6) {
    const n6 = Nn2({ precision: e6.precision }), t4 = ["Z"];
    e6.local && t4.push(""), e6.offset && t4.push("([+-](?:[01]\\d|2[0-3]):[0-5]\\d)");
    const i4 = `${n6}(?:${t4.join("|")})`;
    return new RegExp(`^${On2}T(?:${i4})$`);
  }
  var Zn2 = (e6) => {
    var n6, t4;
    const i4 = e6 ? `[\\s\\S]{${null != (n6 = null == e6 ? void 0 : e6.minimum) ? n6 : 0},${null != (t4 = null == e6 ? void 0 : e6.maximum) ? t4 : ""}}` : "[\\s\\S]*";
    return new RegExp(`^${i4}$`);
  };
  var En2 = /^-?\d+n?$/;
  var Tn2 = /^-?\d+$/;
  var An2 = /^-?\d+(?:\.\d+)?/;
  var Cn2 = /^(?:true|false)$/i;
  var Jn2 = /^null$/i;
  var Ln2 = /^undefined$/i;
  var Rn2 = /^[^A-Z]*$/;
  var Fn2 = /^[^a-z]*$/;
  var Mn2 = /^[0-9a-fA-F]*$/;
  function Wn2(e6, n6) {
    return new RegExp(`^[A-Za-z0-9+/]{${e6}}${n6}$`);
  }
  function Vn2(e6) {
    return new RegExp(`^[A-Za-z0-9_-]{${e6}}$`);
  }
  var Gn2 = /^[0-9a-fA-F]{32}$/;
  var Bn2 = Wn2(22, "==");
  var Kn2 = Vn2(22);
  var qn2 = /^[0-9a-fA-F]{40}$/;
  var Xn2 = Wn2(27, "=");
  var Hn2 = Vn2(27);
  var Yn2 = /^[0-9a-fA-F]{64}$/;
  var Qn2 = Wn2(43, "=");
  var et2 = Vn2(43);
  var nt2 = /^[0-9a-fA-F]{96}$/;
  var tt2 = Wn2(64, "");
  var it2 = Vn2(64);
  var rt2 = /^[0-9a-fA-F]{128}$/;
  var at2 = Wn2(86, "==");
  var ot2 = Vn2(86);
  var st2 = a4("$ZodCheck", (e6, n6) => {
    var t4;
    null != e6._zod || (e6._zod = {}), e6._zod.def = n6, null != (t4 = e6._zod).onattach || (t4.onattach = []);
  });
  var ut = { number: "number", bigint: "bigint", object: "date" };
  var lt2 = a4("$ZodCheckLessThan", (e6, n6) => {
    st2.init(e6, n6);
    const t4 = ut[typeof n6.value];
    e6._zod.onattach.push((e7) => {
      var t5;
      const i4 = e7._zod.bag, r3 = null != (t5 = n6.inclusive ? i4.maximum : i4.exclusiveMaximum) ? t5 : Number.POSITIVE_INFINITY;
      n6.value < r3 && (n6.inclusive ? i4.maximum = n6.value : i4.exclusiveMaximum = n6.value);
    }), e6._zod.check = (i4) => {
      (n6.inclusive ? i4.value <= n6.value : i4.value < n6.value) || i4.issues.push({ origin: t4, code: "too_big", maximum: n6.value, input: i4.value, inclusive: n6.inclusive, inst: e6, continue: !n6.abort });
    };
  });
  var ct2 = a4("$ZodCheckGreaterThan", (e6, n6) => {
    st2.init(e6, n6);
    const t4 = ut[typeof n6.value];
    e6._zod.onattach.push((e7) => {
      var t5;
      const i4 = e7._zod.bag, r3 = null != (t5 = n6.inclusive ? i4.minimum : i4.exclusiveMinimum) ? t5 : Number.NEGATIVE_INFINITY;
      n6.value > r3 && (n6.inclusive ? i4.minimum = n6.value : i4.exclusiveMinimum = n6.value);
    }), e6._zod.check = (i4) => {
      (n6.inclusive ? i4.value >= n6.value : i4.value > n6.value) || i4.issues.push({ origin: t4, code: "too_small", minimum: n6.value, input: i4.value, inclusive: n6.inclusive, inst: e6, continue: !n6.abort });
    };
  });
  var dt2 = a4("$ZodCheckMultipleOf", (e6, n6) => {
    st2.init(e6, n6), e6._zod.onattach.push((e7) => {
      var t4;
      null != (t4 = e7._zod.bag).multipleOf || (t4.multipleOf = n6.value);
    }), e6._zod.check = (t4) => {
      if (typeof t4.value != typeof n6.value)
        throw new Error("Cannot mix number and bigint in multiple_of check.");
      ("bigint" == typeof t4.value ? t4.value % n6.value === BigInt(0) : 0 === w3(t4.value, n6.value)) || t4.issues.push({ origin: typeof t4.value, code: "not_multiple_of", divisor: n6.value, input: t4.value, inst: e6, continue: !n6.abort });
    };
  });
  var mt = a4("$ZodCheckNumberFormat", (e6, n6) => {
    var t4;
    st2.init(e6, n6), n6.format = n6.format || "float64";
    const i4 = null == (t4 = n6.format) ? void 0 : t4.includes("int"), r3 = i4 ? "int" : "number", [a5, o4] = q3[n6.format];
    e6._zod.onattach.push((e7) => {
      const t5 = e7._zod.bag;
      t5.format = n6.format, t5.minimum = a5, t5.maximum = o4, i4 && (t5.pattern = Tn2);
    }), e6._zod.check = (t5) => {
      const s5 = t5.value;
      if (i4) {
        if (!Number.isInteger(s5))
          return void t5.issues.push({ expected: r3, format: n6.format, code: "invalid_type", continue: false, input: s5, inst: e6 });
        if (!Number.isSafeInteger(s5))
          return void (s5 > 0 ? t5.issues.push({ input: s5, code: "too_big", maximum: Number.MAX_SAFE_INTEGER, note: "Integers must be within the safe integer range.", inst: e6, origin: r3, continue: !n6.abort }) : t5.issues.push({ input: s5, code: "too_small", minimum: Number.MIN_SAFE_INTEGER, note: "Integers must be within the safe integer range.", inst: e6, origin: r3, continue: !n6.abort }));
      }
      s5 < a5 && t5.issues.push({ origin: "number", input: s5, code: "too_small", minimum: a5, inclusive: true, inst: e6, continue: !n6.abort }), s5 > o4 && t5.issues.push({ origin: "number", input: s5, code: "too_big", maximum: o4, inst: e6 });
    };
  });
  var pt = a4("$ZodCheckBigIntFormat", (e6, n6) => {
    st2.init(e6, n6);
    const [t4, i4] = X[n6.format];
    e6._zod.onattach.push((e7) => {
      const r3 = e7._zod.bag;
      r3.format = n6.format, r3.minimum = t4, r3.maximum = i4;
    }), e6._zod.check = (r3) => {
      const a5 = r3.value;
      a5 < t4 && r3.issues.push({ origin: "bigint", input: a5, code: "too_small", minimum: t4, inclusive: true, inst: e6, continue: !n6.abort }), a5 > i4 && r3.issues.push({ origin: "bigint", input: a5, code: "too_big", maximum: i4, inst: e6 });
    };
  });
  var vt2 = a4("$ZodCheckMaxSize", (e6, n6) => {
    var t4;
    st2.init(e6, n6), null != (t4 = e6._zod.def).when || (t4.when = (e7) => {
      const n7 = e7.value;
      return !_3(n7) && void 0 !== n7.size;
    }), e6._zod.onattach.push((e7) => {
      var t5;
      const i4 = null != (t5 = e7._zod.bag.maximum) ? t5 : Number.POSITIVE_INFINITY;
      n6.maximum < i4 && (e7._zod.bag.maximum = n6.maximum);
    }), e6._zod.check = (t5) => {
      const i4 = t5.value;
      i4.size <= n6.maximum || t5.issues.push({ origin: ue2(i4), code: "too_big", maximum: n6.maximum, inclusive: true, input: i4, inst: e6, continue: !n6.abort });
    };
  });
  var ft = a4("$ZodCheckMinSize", (e6, n6) => {
    var t4;
    st2.init(e6, n6), null != (t4 = e6._zod.def).when || (t4.when = (e7) => {
      const n7 = e7.value;
      return !_3(n7) && void 0 !== n7.size;
    }), e6._zod.onattach.push((e7) => {
      var t5;
      const i4 = null != (t5 = e7._zod.bag.minimum) ? t5 : Number.NEGATIVE_INFINITY;
      n6.minimum > i4 && (e7._zod.bag.minimum = n6.minimum);
    }), e6._zod.check = (t5) => {
      const i4 = t5.value;
      i4.size >= n6.minimum || t5.issues.push({ origin: ue2(i4), code: "too_small", minimum: n6.minimum, inclusive: true, input: i4, inst: e6, continue: !n6.abort });
    };
  });
  var gt = a4("$ZodCheckSizeEquals", (e6, n6) => {
    var t4;
    st2.init(e6, n6), null != (t4 = e6._zod.def).when || (t4.when = (e7) => {
      const n7 = e7.value;
      return !_3(n7) && void 0 !== n7.size;
    }), e6._zod.onattach.push((e7) => {
      const t5 = e7._zod.bag;
      t5.minimum = n6.size, t5.maximum = n6.size, t5.size = n6.size;
    }), e6._zod.check = (t5) => {
      const i4 = t5.value, r3 = i4.size;
      if (r3 === n6.size)
        return;
      const a5 = r3 > n6.size;
      t5.issues.push({ origin: ue2(i4), ...a5 ? { code: "too_big", maximum: n6.size } : { code: "too_small", minimum: n6.size }, inclusive: true, exact: true, input: t5.value, inst: e6, continue: !n6.abort });
    };
  });
  var ht = a4("$ZodCheckMaxLength", (e6, n6) => {
    var t4;
    st2.init(e6, n6), null != (t4 = e6._zod.def).when || (t4.when = (e7) => {
      const n7 = e7.value;
      return !_3(n7) && void 0 !== n7.length;
    }), e6._zod.onattach.push((e7) => {
      var t5;
      const i4 = null != (t5 = e7._zod.bag.maximum) ? t5 : Number.POSITIVE_INFINITY;
      n6.maximum < i4 && (e7._zod.bag.maximum = n6.maximum);
    }), e6._zod.check = (t5) => {
      const i4 = t5.value;
      if (i4.length <= n6.maximum)
        return;
      const r3 = le2(i4);
      t5.issues.push({ origin: r3, code: "too_big", maximum: n6.maximum, inclusive: true, input: i4, inst: e6, continue: !n6.abort });
    };
  });
  var bt = a4("$ZodCheckMinLength", (e6, n6) => {
    var t4;
    st2.init(e6, n6), null != (t4 = e6._zod.def).when || (t4.when = (e7) => {
      const n7 = e7.value;
      return !_3(n7) && void 0 !== n7.length;
    }), e6._zod.onattach.push((e7) => {
      var t5;
      const i4 = null != (t5 = e7._zod.bag.minimum) ? t5 : Number.NEGATIVE_INFINITY;
      n6.minimum > i4 && (e7._zod.bag.minimum = n6.minimum);
    }), e6._zod.check = (t5) => {
      const i4 = t5.value;
      if (i4.length >= n6.minimum)
        return;
      const r3 = le2(i4);
      t5.issues.push({ origin: r3, code: "too_small", minimum: n6.minimum, inclusive: true, input: i4, inst: e6, continue: !n6.abort });
    };
  });
  var yt2 = a4("$ZodCheckLengthEquals", (e6, n6) => {
    var t4;
    st2.init(e6, n6), null != (t4 = e6._zod.def).when || (t4.when = (e7) => {
      const n7 = e7.value;
      return !_3(n7) && void 0 !== n7.length;
    }), e6._zod.onattach.push((e7) => {
      const t5 = e7._zod.bag;
      t5.minimum = n6.length, t5.maximum = n6.length, t5.length = n6.length;
    }), e6._zod.check = (t5) => {
      const i4 = t5.value, r3 = i4.length;
      if (r3 === n6.length)
        return;
      const a5 = le2(i4), o4 = r3 > n6.length;
      t5.issues.push({ origin: a5, ...o4 ? { code: "too_big", maximum: n6.length } : { code: "too_small", minimum: n6.length }, inclusive: true, exact: true, input: t5.value, inst: e6, continue: !n6.abort });
    };
  });
  var $t2 = a4("$ZodCheckStringFormat", (e6, n6) => {
    var t4, i4;
    st2.init(e6, n6), e6._zod.onattach.push((e7) => {
      const t5 = e7._zod.bag;
      t5.format = n6.format, n6.pattern && (null != t5.patterns || (t5.patterns = /* @__PURE__ */ new Set()), t5.patterns.add(n6.pattern));
    }), n6.pattern ? null != (t4 = e6._zod).check || (t4.check = (t5) => {
      n6.pattern.lastIndex = 0, n6.pattern.test(t5.value) || t5.issues.push({ origin: "string", code: "invalid_format", format: n6.format, input: t5.value, ...n6.pattern ? { pattern: n6.pattern.toString() } : {}, inst: e6, continue: !n6.abort });
    }) : null != (i4 = e6._zod).check || (i4.check = () => {
    });
  });
  var _t2 = a4("$ZodCheckRegex", (e6, n6) => {
    $t2.init(e6, n6), e6._zod.check = (t4) => {
      n6.pattern.lastIndex = 0, n6.pattern.test(t4.value) || t4.issues.push({ origin: "string", code: "invalid_format", format: "regex", input: t4.value, pattern: n6.pattern.toString(), inst: e6, continue: !n6.abort });
    };
  });
  var kt2 = a4("$ZodCheckLowerCase", (e6, n6) => {
    null != n6.pattern || (n6.pattern = Rn2), $t2.init(e6, n6);
  });
  var wt2 = a4("$ZodCheckUpperCase", (e6, n6) => {
    null != n6.pattern || (n6.pattern = Fn2), $t2.init(e6, n6);
  });
  var It2 = a4("$ZodCheckIncludes", (e6, n6) => {
    st2.init(e6, n6);
    const t4 = M2(n6.includes), i4 = new RegExp("number" == typeof n6.position ? `^.{${n6.position}}${t4}` : t4);
    n6.pattern = i4, e6._zod.onattach.push((e7) => {
      const n7 = e7._zod.bag;
      null != n7.patterns || (n7.patterns = /* @__PURE__ */ new Set()), n7.patterns.add(i4);
    }), e6._zod.check = (t5) => {
      t5.value.includes(n6.includes, n6.position) || t5.issues.push({ origin: "string", code: "invalid_format", format: "includes", includes: n6.includes, input: t5.value, inst: e6, continue: !n6.abort });
    };
  });
  var St = a4("$ZodCheckStartsWith", (e6, n6) => {
    st2.init(e6, n6);
    const t4 = new RegExp(`^${M2(n6.prefix)}.*`);
    null != n6.pattern || (n6.pattern = t4), e6._zod.onattach.push((e7) => {
      const n7 = e7._zod.bag;
      null != n7.patterns || (n7.patterns = /* @__PURE__ */ new Set()), n7.patterns.add(t4);
    }), e6._zod.check = (t5) => {
      t5.value.startsWith(n6.prefix) || t5.issues.push({ origin: "string", code: "invalid_format", format: "starts_with", prefix: n6.prefix, input: t5.value, inst: e6, continue: !n6.abort });
    };
  });
  var zt2 = a4("$ZodCheckEndsWith", (e6, n6) => {
    st2.init(e6, n6);
    const t4 = new RegExp(`.*${M2(n6.suffix)}$`);
    null != n6.pattern || (n6.pattern = t4), e6._zod.onattach.push((e7) => {
      const n7 = e7._zod.bag;
      null != n7.patterns || (n7.patterns = /* @__PURE__ */ new Set()), n7.patterns.add(t4);
    }), e6._zod.check = (t5) => {
      t5.value.endsWith(n6.suffix) || t5.issues.push({ origin: "string", code: "invalid_format", format: "ends_with", suffix: n6.suffix, input: t5.value, inst: e6, continue: !n6.abort });
    };
  });
  function xt2(e6, n6, t4) {
    e6.issues.length && n6.issues.push(...ae2(t4, e6.issues));
  }
  var jt = a4("$ZodCheckProperty", (e6, n6) => {
    st2.init(e6, n6), e6._zod.check = (e7) => {
      const t4 = n6.schema._zod.run({ value: e7.value[n6.property], issues: [] }, {});
      if (t4 instanceof Promise)
        return t4.then((t5) => xt2(t5, e7, n6.property));
      xt2(t4, e7, n6.property);
    };
  });
  var Ot2 = a4("$ZodCheckMimeType", (e6, n6) => {
    st2.init(e6, n6);
    const t4 = new Set(n6.mime);
    e6._zod.onattach.push((e7) => {
      e7._zod.bag.mime = n6.mime;
    }), e6._zod.check = (i4) => {
      t4.has(i4.value.type) || i4.issues.push({ code: "invalid_value", values: n6.mime, input: i4.value.type, inst: e6, continue: !n6.abort });
    };
  });
  var Ut = a4("$ZodCheckOverwrite", (e6, n6) => {
    st2.init(e6, n6), e6._zod.check = (e7) => {
      e7.value = n6.tx(e7.value);
    };
  });
  var Nt = class {
    constructor(e6 = []) {
      this.content = [], this.indent = 0, this && (this.args = e6);
    }
    indented(e6) {
      this.indent += 1, e6(this), this.indent -= 1;
    }
    write(e6) {
      if ("function" == typeof e6)
        return e6(this, { execution: "sync" }), void e6(this, { execution: "async" });
      const n6 = e6.split("\n").filter((e7) => e7), t4 = Math.min(...n6.map((e7) => e7.length - e7.trimStart().length)), i4 = n6.map((e7) => e7.slice(t4)).map((e7) => " ".repeat(2 * this.indent) + e7);
      for (const e7 of i4)
        this.content.push(e7);
    }
    compile() {
      var e6;
      return new Function(...null == this ? void 0 : this.args, [...(null != (e6 = null == this ? void 0 : this.content) ? e6 : [""]).map((e7) => `  ${e7}`)].join("\n"));
    }
  };
  var Pt2 = { major: 4, minor: 1, patch: 12 };
  var Dt = a4("$ZodType", (e6, n6) => {
    var t4, i4, r3;
    null != e6 || (e6 = {}), e6._zod.def = n6, e6._zod.bag = e6._zod.bag || {}, e6._zod.version = Pt2;
    const a5 = [...null != (t4 = e6._zod.def.checks) ? t4 : []];
    e6._zod.traits.has("$ZodCheck") && a5.unshift(e6);
    for (const n7 of a5)
      for (const t5 of n7._zod.onattach)
        t5(e6);
    if (0 === a5.length)
      null != (r3 = e6._zod).deferred || (r3.deferred = []), null == (i4 = e6._zod.deferred) || i4.push(() => {
        e6._zod.run = e6._zod.parse;
      });
    else {
      const n7 = (e7, n8, t6) => {
        let i5, r4 = re2(e7);
        for (const a6 of n8) {
          if (a6._zod.def.when) {
            if (!a6._zod.def.when(e7))
              continue;
          } else if (r4)
            continue;
          const n9 = e7.issues.length, o4 = a6._zod.check(e7);
          if (o4 instanceof Promise && false === (null == t6 ? void 0 : t6.async))
            throw new s4();
          if (i5 || o4 instanceof Promise)
            i5 = (null != i5 ? i5 : Promise.resolve()).then(async () => {
              await o4;
              e7.issues.length !== n9 && (r4 || (r4 = re2(e7, n9)));
            });
          else {
            if (e7.issues.length === n9)
              continue;
            r4 || (r4 = re2(e7, n9));
          }
        }
        return i5 ? i5.then(() => e7) : e7;
      }, t5 = (t6, i5, r4) => {
        if (re2(t6))
          return t6.aborted = true, t6;
        const o4 = n7(i5, a5, r4);
        if (o4 instanceof Promise) {
          if (false === r4.async)
            throw new s4();
          return o4.then((n8) => e6._zod.parse(n8, r4));
        }
        return e6._zod.parse(o4, r4);
      };
      e6._zod.run = (i5, r4) => {
        if (r4.skipChecks)
          return e6._zod.parse(i5, r4);
        if ("backward" === r4.direction) {
          const n8 = e6._zod.parse({ value: i5.value, issues: [] }, { ...r4, skipChecks: true });
          return n8 instanceof Promise ? n8.then((e7) => t5(e7, i5, r4)) : t5(n8, i5, r4);
        }
        const o4 = e6._zod.parse(i5, r4);
        if (o4 instanceof Promise) {
          if (false === r4.async)
            throw new s4();
          return o4.then((e7) => n7(e7, a5, r4));
        }
        return n7(o4, a5, r4);
      };
    }
    e6["~standard"] = { validate: (n7) => {
      var t5;
      try {
        const i5 = Pe2(e6, n7);
        return i5.success ? { value: i5.data } : { issues: null == (t5 = i5.error) ? void 0 : t5.issues };
      } catch (t6) {
        return Ze2(e6, n7).then((e7) => {
          var n8;
          return e7.success ? { value: e7.data } : { issues: null == (n8 = e7.error) ? void 0 : n8.issues };
        });
      }
    }, vendor: "zod", version: 1 };
  });
  var Zt = a4("$ZodString", (e6, n6) => {
    var t4, i4, r3;
    Dt.init(e6, n6), e6._zod.pattern = null != (r3 = [...null != (i4 = null == (t4 = null == e6 ? void 0 : e6._zod.bag) ? void 0 : t4.patterns) ? i4 : []].pop()) ? r3 : Zn2(e6._zod.bag), e6._zod.parse = (t5, i5) => {
      if (n6.coerce)
        try {
          t5.value = String(t5.value);
        } catch (e7) {
        }
      return "string" == typeof t5.value || t5.issues.push({ expected: "string", code: "invalid_type", input: t5.value, inst: e6 }), t5;
    };
  });
  var Et = a4("$ZodStringFormat", (e6, n6) => {
    $t2.init(e6, n6), Zt.init(e6, n6);
  });
  var Tt2 = a4("$ZodGUID", (e6, n6) => {
    null != n6.pattern || (n6.pattern = sn2), Et.init(e6, n6);
  });
  var At = a4("$ZodUUID", (e6, n6) => {
    if (n6.version) {
      const e7 = { v1: 1, v2: 2, v3: 3, v4: 4, v5: 5, v6: 6, v7: 7, v8: 8 }[n6.version];
      if (void 0 === e7)
        throw new Error(`Invalid UUID version: "${n6.version}"`);
      null != n6.pattern || (n6.pattern = un2(e7));
    } else
      null != n6.pattern || (n6.pattern = un2());
    Et.init(e6, n6);
  });
  var Ct2 = a4("$ZodEmail", (e6, n6) => {
    null != n6.pattern || (n6.pattern = mn2), Et.init(e6, n6);
  });
  var Jt2 = a4("$ZodURL", (e6, n6) => {
    Et.init(e6, n6), e6._zod.check = (t4) => {
      try {
        const i4 = t4.value.trim(), r3 = new URL(i4);
        return n6.hostname && (n6.hostname.lastIndex = 0, n6.hostname.test(r3.hostname) || t4.issues.push({ code: "invalid_format", format: "url", note: "Invalid hostname", pattern: zn2.source, input: t4.value, inst: e6, continue: !n6.abort })), n6.protocol && (n6.protocol.lastIndex = 0, n6.protocol.test(r3.protocol.endsWith(":") ? r3.protocol.slice(0, -1) : r3.protocol) || t4.issues.push({ code: "invalid_format", format: "url", note: "Invalid protocol", pattern: n6.protocol.source, input: t4.value, inst: e6, continue: !n6.abort })), void (n6.normalize ? t4.value = r3.href : t4.value = i4);
      } catch (i4) {
        t4.issues.push({ code: "invalid_format", format: "url", input: t4.value, inst: e6, continue: !n6.abort });
      }
    };
  });
  var Lt2 = a4("$ZodEmoji", (e6, n6) => {
    null != n6.pattern || (n6.pattern = yn2()), Et.init(e6, n6);
  });
  var Rt = a4("$ZodNanoID", (e6, n6) => {
    null != n6.pattern || (n6.pattern = rn2), Et.init(e6, n6);
  });
  var Ft2 = a4("$ZodCUID", (e6, n6) => {
    null != n6.pattern || (n6.pattern = Ye2), Et.init(e6, n6);
  });
  var Mt2 = a4("$ZodCUID2", (e6, n6) => {
    null != n6.pattern || (n6.pattern = Qe2), Et.init(e6, n6);
  });
  var Wt2 = a4("$ZodULID", (e6, n6) => {
    null != n6.pattern || (n6.pattern = en2), Et.init(e6, n6);
  });
  var Vt = a4("$ZodXID", (e6, n6) => {
    null != n6.pattern || (n6.pattern = nn2), Et.init(e6, n6);
  });
  var Gt2 = a4("$ZodKSUID", (e6, n6) => {
    null != n6.pattern || (n6.pattern = tn2), Et.init(e6, n6);
  });
  var Bt = a4("$ZodISODateTime", (e6, n6) => {
    null != n6.pattern || (n6.pattern = Dn2(n6)), Et.init(e6, n6);
  });
  var Kt2 = a4("$ZodISODate", (e6, n6) => {
    null != n6.pattern || (n6.pattern = Un2), Et.init(e6, n6);
  });
  var qt = a4("$ZodISOTime", (e6, n6) => {
    null != n6.pattern || (n6.pattern = Pn2(n6)), Et.init(e6, n6);
  });
  var Xt2 = a4("$ZodISODuration", (e6, n6) => {
    null != n6.pattern || (n6.pattern = an2), Et.init(e6, n6);
  });
  var Ht2 = a4("$ZodIPv4", (e6, n6) => {
    null != n6.pattern || (n6.pattern = $n2), Et.init(e6, n6), e6._zod.onattach.push((e7) => {
      e7._zod.bag.format = "ipv4";
    });
  });
  var Yt = a4("$ZodIPv6", (e6, n6) => {
    null != n6.pattern || (n6.pattern = _n2), Et.init(e6, n6), e6._zod.onattach.push((e7) => {
      e7._zod.bag.format = "ipv6";
    }), e6._zod.check = (t4) => {
      try {
        new URL(`http://[${t4.value}]`);
      } catch (i4) {
        t4.issues.push({ code: "invalid_format", format: "ipv6", input: t4.value, inst: e6, continue: !n6.abort });
      }
    };
  });
  var Qt2 = a4("$ZodCIDRv4", (e6, n6) => {
    null != n6.pattern || (n6.pattern = kn2), Et.init(e6, n6);
  });
  var ei2 = a4("$ZodCIDRv6", (e6, n6) => {
    null != n6.pattern || (n6.pattern = wn2), Et.init(e6, n6), e6._zod.check = (t4) => {
      const i4 = t4.value.split("/");
      try {
        if (2 !== i4.length)
          throw new Error();
        const [e7, n7] = i4;
        if (!n7)
          throw new Error();
        const t5 = Number(n7);
        if (`${t5}` !== n7)
          throw new Error();
        if (t5 < 0 || t5 > 128)
          throw new Error();
        new URL(`http://[${e7}]`);
      } catch (i5) {
        t4.issues.push({ code: "invalid_format", format: "cidrv6", input: t4.value, inst: e6, continue: !n6.abort });
      }
    };
  });
  function ni(e6) {
    if ("" === e6)
      return true;
    if (e6.length % 4 != 0)
      return false;
    try {
      return atob(e6), true;
    } catch (e7) {
      return false;
    }
  }
  var ti = a4("$ZodBase64", (e6, n6) => {
    null != n6.pattern || (n6.pattern = In2), Et.init(e6, n6), e6._zod.onattach.push((e7) => {
      e7._zod.bag.contentEncoding = "base64";
    }), e6._zod.check = (t4) => {
      ni(t4.value) || t4.issues.push({ code: "invalid_format", format: "base64", input: t4.value, inst: e6, continue: !n6.abort });
    };
  });
  function ii(e6) {
    if (!Sn2.test(e6))
      return false;
    const n6 = e6.replace(/[-_]/g, (e7) => "-" === e7 ? "+" : "/");
    return ni(n6.padEnd(4 * Math.ceil(n6.length / 4), "="));
  }
  var ri = a4("$ZodBase64URL", (e6, n6) => {
    null != n6.pattern || (n6.pattern = Sn2), Et.init(e6, n6), e6._zod.onattach.push((e7) => {
      e7._zod.bag.contentEncoding = "base64url";
    }), e6._zod.check = (t4) => {
      ii(t4.value) || t4.issues.push({ code: "invalid_format", format: "base64url", input: t4.value, inst: e6, continue: !n6.abort });
    };
  });
  var ai2 = a4("$ZodE164", (e6, n6) => {
    null != n6.pattern || (n6.pattern = jn2), Et.init(e6, n6);
  });
  function oi(e6, n6 = null) {
    try {
      const t4 = e6.split(".");
      if (3 !== t4.length)
        return false;
      const [i4] = t4;
      if (!i4)
        return false;
      const r3 = JSON.parse(atob(i4));
      return (!("typ" in r3) || "JWT" === (null == r3 ? void 0 : r3.typ)) && (!!r3.alg && (!n6 || "alg" in r3 && r3.alg === n6));
    } catch (e7) {
      return false;
    }
  }
  var si = a4("$ZodJWT", (e6, n6) => {
    Et.init(e6, n6), e6._zod.check = (t4) => {
      oi(t4.value, n6.alg) || t4.issues.push({ code: "invalid_format", format: "jwt", input: t4.value, inst: e6, continue: !n6.abort });
    };
  });
  var ui = a4("$ZodCustomStringFormat", (e6, n6) => {
    Et.init(e6, n6), e6._zod.check = (t4) => {
      n6.fn(t4.value) || t4.issues.push({ code: "invalid_format", format: n6.format, input: t4.value, inst: e6, continue: !n6.abort });
    };
  });
  var li = a4("$ZodNumber", (e6, n6) => {
    var t4;
    Dt.init(e6, n6), e6._zod.pattern = null != (t4 = e6._zod.bag.pattern) ? t4 : An2, e6._zod.parse = (t5, i4) => {
      if (n6.coerce)
        try {
          t5.value = Number(t5.value);
        } catch (e7) {
        }
      const r3 = t5.value;
      if ("number" == typeof r3 && !Number.isNaN(r3) && Number.isFinite(r3))
        return t5;
      const a5 = "number" == typeof r3 ? Number.isNaN(r3) ? "NaN" : Number.isFinite(r3) ? void 0 : "Infinity" : void 0;
      return t5.issues.push({ expected: "number", code: "invalid_type", input: r3, inst: e6, ...a5 ? { received: a5 } : {} }), t5;
    };
  });
  var ci = a4("$ZodNumber", (e6, n6) => {
    mt.init(e6, n6), li.init(e6, n6);
  });
  var di = a4("$ZodBoolean", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.pattern = Cn2, e6._zod.parse = (t4, i4) => {
      if (n6.coerce)
        try {
          t4.value = Boolean(t4.value);
        } catch (e7) {
        }
      const r3 = t4.value;
      return "boolean" == typeof r3 || t4.issues.push({ expected: "boolean", code: "invalid_type", input: r3, inst: e6 }), t4;
    };
  });
  var mi = a4("$ZodBigInt", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.pattern = En2, e6._zod.parse = (t4, i4) => {
      if (n6.coerce)
        try {
          t4.value = BigInt(t4.value);
        } catch (e7) {
        }
      return "bigint" == typeof t4.value || t4.issues.push({ expected: "bigint", code: "invalid_type", input: t4.value, inst: e6 }), t4;
    };
  });
  var pi = a4("$ZodBigInt", (e6, n6) => {
    pt.init(e6, n6), mi.init(e6, n6);
  });
  var vi = a4("$ZodSymbol", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (n7, t4) => {
      const i4 = n7.value;
      return "symbol" == typeof i4 || n7.issues.push({ expected: "symbol", code: "invalid_type", input: i4, inst: e6 }), n7;
    };
  });
  var fi = a4("$ZodUndefined", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.pattern = Ln2, e6._zod.values = /* @__PURE__ */ new Set([void 0]), e6._zod.optin = "optional", e6._zod.optout = "optional", e6._zod.parse = (n7, t4) => {
      const i4 = n7.value;
      return void 0 === i4 || n7.issues.push({ expected: "undefined", code: "invalid_type", input: i4, inst: e6 }), n7;
    };
  });
  var gi = a4("$ZodNull", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.pattern = Jn2, e6._zod.values = /* @__PURE__ */ new Set([null]), e6._zod.parse = (n7, t4) => {
      const i4 = n7.value;
      return null === i4 || n7.issues.push({ expected: "null", code: "invalid_type", input: i4, inst: e6 }), n7;
    };
  });
  var hi = a4("$ZodAny", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (e7) => e7;
  });
  var bi = a4("$ZodUnknown", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (e7) => e7;
  });
  var yi = a4("$ZodNever", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (n7, t4) => (n7.issues.push({ expected: "never", code: "invalid_type", input: n7.value, inst: e6 }), n7);
  });
  var $i = a4("$ZodVoid", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (n7, t4) => {
      const i4 = n7.value;
      return void 0 === i4 || n7.issues.push({ expected: "void", code: "invalid_type", input: i4, inst: e6 }), n7;
    };
  });
  var _i = a4("$ZodDate", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (t4, i4) => {
      if (n6.coerce)
        try {
          t4.value = new Date(t4.value);
        } catch (e7) {
        }
      const r3 = t4.value, a5 = r3 instanceof Date;
      return a5 && !Number.isNaN(r3.getTime()) || t4.issues.push({ expected: "date", code: "invalid_type", input: r3, ...a5 ? { received: "Invalid Date" } : {}, inst: e6 }), t4;
    };
  });
  function ki(e6, n6, t4) {
    e6.issues.length && n6.issues.push(...ae2(t4, e6.issues)), n6.value[t4] = e6.value;
  }
  var wi = a4("$ZodArray", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (t4, i4) => {
      const r3 = t4.value;
      if (!Array.isArray(r3))
        return t4.issues.push({ expected: "array", code: "invalid_type", input: r3, inst: e6 }), t4;
      t4.value = Array(r3.length);
      const a5 = [];
      for (let e7 = 0; e7 < r3.length; e7++) {
        const o4 = r3[e7], s5 = n6.element._zod.run({ value: o4, issues: [] }, i4);
        s5 instanceof Promise ? a5.push(s5.then((n7) => ki(n7, t4, e7))) : ki(s5, t4, e7);
      }
      return a5.length ? Promise.all(a5).then(() => t4) : t4;
    };
  });
  function Ii(e6, n6, t4, i4) {
    e6.issues.length && n6.issues.push(...ae2(t4, e6.issues)), void 0 === e6.value ? t4 in i4 && (n6.value[t4] = void 0) : n6.value[t4] = e6.value;
  }
  function Si(e6) {
    var n6, t4, i4, r3;
    const a5 = Object.keys(e6.shape);
    for (const o5 of a5)
      if (!(null == (r3 = null == (i4 = null == (t4 = null == (n6 = e6.shape) ? void 0 : n6[o5]) ? void 0 : t4._zod) ? void 0 : i4.traits) ? void 0 : r3.has("$ZodType")))
        throw new Error(`Invalid element at key "${o5}": expected a Zod schema`);
    const o4 = K2(e6.shape);
    return { ...e6, keys: a5, keySet: new Set(a5), numKeys: a5.length, optionalKeys: new Set(o4) };
  }
  function zi(e6, n6, t4, i4, r3, a5) {
    const o4 = [], s5 = r3.keySet, u3 = r3.catchall._zod, l3 = u3.def.type;
    for (const r4 of Object.keys(n6)) {
      if (s5.has(r4))
        continue;
      if ("never" === l3) {
        o4.push(r4);
        continue;
      }
      const a6 = u3.run({ value: n6[r4], issues: [] }, i4);
      a6 instanceof Promise ? e6.push(a6.then((e7) => Ii(e7, t4, r4, n6))) : Ii(a6, t4, r4, n6);
    }
    return o4.length && t4.issues.push({ code: "unrecognized_keys", keys: o4, input: n6, inst: a5 }), e6.length ? Promise.all(e6).then(() => t4) : t4;
  }
  var xi = a4("$ZodObject", (e6, n6) => {
    Dt.init(e6, n6);
    const t4 = Object.getOwnPropertyDescriptor(n6, "shape");
    if (!(null == t4 ? void 0 : t4.get)) {
      const e7 = n6.shape;
      Object.defineProperty(n6, "shape", { get: () => {
        const t5 = { ...e7 };
        return Object.defineProperty(n6, "shape", { value: t5 }), t5;
      } });
    }
    const i4 = $2(() => Si(n6));
    S3(e6._zod, "propValues", () => {
      const e7 = n6.shape, t5 = {};
      for (const n7 in e7) {
        const i5 = e7[n7]._zod;
        if (i5.values) {
          null != t5[n7] || (t5[n7] = /* @__PURE__ */ new Set());
          for (const e8 of i5.values)
            t5[n7].add(e8);
        }
      }
      return t5;
    });
    const r3 = E2, a5 = n6.catchall;
    let o4;
    e6._zod.parse = (n7, t5) => {
      null != o4 || (o4 = i4.value);
      const s5 = n7.value;
      if (!r3(s5))
        return n7.issues.push({ expected: "object", code: "invalid_type", input: s5, inst: e6 }), n7;
      n7.value = {};
      const u3 = [], l3 = o4.shape;
      for (const e7 of o4.keys) {
        const i5 = l3[e7]._zod.run({ value: s5[e7], issues: [] }, t5);
        i5 instanceof Promise ? u3.push(i5.then((t6) => Ii(t6, n7, e7, s5))) : Ii(i5, n7, e7, s5);
      }
      return a5 ? zi(u3, s5, n7, t5, i4.value, e6) : u3.length ? Promise.all(u3).then(() => n7) : n7;
    };
  });
  var ji = a4("$ZodObjectJIT", (e6, n6) => {
    xi.init(e6, n6);
    const t4 = e6._zod.parse, i4 = $2(() => Si(n6));
    let r3;
    const a5 = E2, o4 = !l2.jitless, s5 = o4 && T3.value, u3 = n6.catchall;
    let c3;
    e6._zod.parse = (l3, d2) => {
      null != c3 || (c3 = i4.value);
      const m2 = l3.value;
      return a5(m2) ? o4 && s5 && false === (null == d2 ? void 0 : d2.async) && true !== d2.jitless ? (r3 || (r3 = ((e7) => {
        const n7 = new Nt(["shape", "payload", "ctx"]), t5 = i4.value, r4 = (e8) => {
          const n8 = D2(e8);
          return `shape[${n8}]._zod.run({ value: input[${n8}], issues: [] }, ctx)`;
        };
        n7.write("const input = payload.value;");
        const a6 = /* @__PURE__ */ Object.create(null);
        let o5 = 0;
        for (const e8 of t5.keys)
          a6[e8] = "key_" + o5++;
        n7.write("const newResult = {};");
        for (const e8 of t5.keys) {
          const t6 = a6[e8], i5 = D2(e8);
          n7.write(`const ${t6} = ${r4(e8)};`), n7.write(`
        if (${t6}.issues.length) {
          payload.issues = payload.issues.concat(${t6}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${i5}, ...iss.path] : [${i5}]
          })));
        }
        
        
        if (${t6}.value === undefined) {
          if (${i5} in input) {
            newResult[${i5}] = undefined;
          }
        } else {
          newResult[${i5}] = ${t6}.value;
        }
        
      `);
        }
        n7.write("payload.value = newResult;"), n7.write("return payload;");
        const s6 = n7.compile();
        return (n8, t6) => s6(e7, n8, t6);
      })(n6.shape)), l3 = r3(l3, d2), u3 ? zi([], m2, l3, d2, c3, e6) : l3) : t4(l3, d2) : (l3.issues.push({ expected: "object", code: "invalid_type", input: m2, inst: e6 }), l3);
    };
  });
  function Oi(e6, n6, t4, i4) {
    for (const t5 of e6)
      if (0 === t5.issues.length)
        return n6.value = t5.value, n6;
    const r3 = e6.filter((e7) => !re2(e7));
    return 1 === r3.length ? (n6.value = r3[0].value, r3[0]) : (n6.issues.push({ code: "invalid_union", input: n6.value, inst: t4, errors: e6.map((e7) => e7.issues.map((e8) => se2(e8, i4, c2()))) }), n6);
  }
  var Ui = a4("$ZodUnion", (e6, n6) => {
    Dt.init(e6, n6), S3(e6._zod, "optin", () => n6.options.some((e7) => "optional" === e7._zod.optin) ? "optional" : void 0), S3(e6._zod, "optout", () => n6.options.some((e7) => "optional" === e7._zod.optout) ? "optional" : void 0), S3(e6._zod, "values", () => {
      if (n6.options.every((e7) => e7._zod.values))
        return new Set(n6.options.flatMap((e7) => Array.from(e7._zod.values)));
    }), S3(e6._zod, "pattern", () => {
      if (n6.options.every((e7) => e7._zod.pattern)) {
        const e7 = n6.options.map((e8) => e8._zod.pattern);
        return new RegExp(`^(${e7.map((e8) => k3(e8.source)).join("|")})$`);
      }
    });
    const t4 = 1 === n6.options.length, i4 = n6.options[0]._zod.run;
    e6._zod.parse = (r3, a5) => {
      if (t4)
        return i4(r3, a5);
      let o4 = false;
      const s5 = [];
      for (const e7 of n6.options) {
        const n7 = e7._zod.run({ value: r3.value, issues: [] }, a5);
        if (n7 instanceof Promise)
          s5.push(n7), o4 = true;
        else {
          if (0 === n7.issues.length)
            return n7;
          s5.push(n7);
        }
      }
      return o4 ? Promise.all(s5).then((n7) => Oi(n7, r3, e6, a5)) : Oi(s5, r3, e6, a5);
    };
  });
  var Ni = a4("$ZodDiscriminatedUnion", (e6, n6) => {
    Ui.init(e6, n6);
    const t4 = e6._zod.parse;
    S3(e6._zod, "propValues", () => {
      const e7 = {};
      for (const t5 of n6.options) {
        const i5 = t5._zod.propValues;
        if (!i5 || 0 === Object.keys(i5).length)
          throw new Error(`Invalid discriminated union option at index "${n6.options.indexOf(t5)}"`);
        for (const [n7, t6] of Object.entries(i5)) {
          e7[n7] || (e7[n7] = /* @__PURE__ */ new Set());
          for (const i6 of t6)
            e7[n7].add(i6);
        }
      }
      return e7;
    });
    const i4 = $2(() => {
      var e7;
      const t5 = n6.options, i5 = /* @__PURE__ */ new Map();
      for (const r3 of t5) {
        const t6 = null == (e7 = r3._zod.propValues) ? void 0 : e7[n6.discriminator];
        if (!t6 || 0 === t6.size)
          throw new Error(`Invalid discriminated union option at index "${n6.options.indexOf(r3)}"`);
        for (const e8 of t6) {
          if (i5.has(e8))
            throw new Error(`Duplicate discriminator value "${String(e8)}"`);
          i5.set(e8, r3);
        }
      }
      return i5;
    });
    e6._zod.parse = (r3, a5) => {
      const o4 = r3.value;
      if (!E2(o4))
        return r3.issues.push({ code: "invalid_type", expected: "object", input: o4, inst: e6 }), r3;
      const s5 = i4.value.get(null == o4 ? void 0 : o4[n6.discriminator]);
      return s5 ? s5._zod.run(r3, a5) : n6.unionFallback ? t4(r3, a5) : (r3.issues.push({ code: "invalid_union", errors: [], note: "No matching discriminator", discriminator: n6.discriminator, input: o4, path: [n6.discriminator], inst: e6 }), r3);
    };
  });
  var Pi = a4("$ZodIntersection", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (e7, t4) => {
      const i4 = e7.value, r3 = n6.left._zod.run({ value: i4, issues: [] }, t4), a5 = n6.right._zod.run({ value: i4, issues: [] }, t4);
      return r3 instanceof Promise || a5 instanceof Promise ? Promise.all([r3, a5]).then(([n7, t5]) => Zi(e7, n7, t5)) : Zi(e7, r3, a5);
    };
  });
  function Di(e6, n6) {
    if (e6 === n6)
      return { valid: true, data: e6 };
    if (e6 instanceof Date && n6 instanceof Date && +e6 === +n6)
      return { valid: true, data: e6 };
    if (A3(e6) && A3(n6)) {
      const t4 = Object.keys(n6), i4 = Object.keys(e6).filter((e7) => -1 !== t4.indexOf(e7)), r3 = { ...e6, ...n6 };
      for (const t5 of i4) {
        const i5 = Di(e6[t5], n6[t5]);
        if (!i5.valid)
          return { valid: false, mergeErrorPath: [t5, ...i5.mergeErrorPath] };
        r3[t5] = i5.data;
      }
      return { valid: true, data: r3 };
    }
    if (Array.isArray(e6) && Array.isArray(n6)) {
      if (e6.length !== n6.length)
        return { valid: false, mergeErrorPath: [] };
      const t4 = [];
      for (let i4 = 0; i4 < e6.length; i4++) {
        const r3 = Di(e6[i4], n6[i4]);
        if (!r3.valid)
          return { valid: false, mergeErrorPath: [i4, ...r3.mergeErrorPath] };
        t4.push(r3.data);
      }
      return { valid: true, data: t4 };
    }
    return { valid: false, mergeErrorPath: [] };
  }
  function Zi(e6, n6, t4) {
    if (n6.issues.length && e6.issues.push(...n6.issues), t4.issues.length && e6.issues.push(...t4.issues), re2(e6))
      return e6;
    const i4 = Di(n6.value, t4.value);
    if (!i4.valid)
      throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(i4.mergeErrorPath)}`);
    return e6.value = i4.data, e6;
  }
  var Ei = a4("$ZodTuple", (e6, n6) => {
    Dt.init(e6, n6);
    const t4 = n6.items, i4 = t4.length - [...t4].reverse().findIndex((e7) => "optional" !== e7._zod.optin);
    e6._zod.parse = (r3, a5) => {
      const o4 = r3.value;
      if (!Array.isArray(o4))
        return r3.issues.push({ input: o4, inst: e6, expected: "tuple", code: "invalid_type" }), r3;
      r3.value = [];
      const s5 = [];
      if (!n6.rest) {
        const n7 = o4.length > t4.length, a6 = o4.length < i4 - 1;
        if (n7 || a6)
          return r3.issues.push({ ...n7 ? { code: "too_big", maximum: t4.length } : { code: "too_small", minimum: t4.length }, input: o4, inst: e6, origin: "array" }), r3;
      }
      let u3 = -1;
      for (const e7 of t4) {
        if (u3++, u3 >= o4.length && u3 >= i4)
          continue;
        const n7 = e7._zod.run({ value: o4[u3], issues: [] }, a5);
        n7 instanceof Promise ? s5.push(n7.then((e8) => Ti(e8, r3, u3))) : Ti(n7, r3, u3);
      }
      if (n6.rest) {
        const e7 = o4.slice(t4.length);
        for (const t5 of e7) {
          u3++;
          const e8 = n6.rest._zod.run({ value: t5, issues: [] }, a5);
          e8 instanceof Promise ? s5.push(e8.then((e9) => Ti(e9, r3, u3))) : Ti(e8, r3, u3);
        }
      }
      return s5.length ? Promise.all(s5).then(() => r3) : r3;
    };
  });
  function Ti(e6, n6, t4) {
    e6.issues.length && n6.issues.push(...ae2(t4, e6.issues)), n6.value[t4] = e6.value;
  }
  var Ai = a4("$ZodRecord", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (t4, i4) => {
      const r3 = t4.value;
      if (!A3(r3))
        return t4.issues.push({ expected: "record", code: "invalid_type", input: r3, inst: e6 }), t4;
      const a5 = [];
      if (n6.keyType._zod.values) {
        const o4 = n6.keyType._zod.values;
        t4.value = {};
        for (const e7 of o4)
          if ("string" == typeof e7 || "number" == typeof e7 || "symbol" == typeof e7) {
            const o5 = n6.valueType._zod.run({ value: r3[e7], issues: [] }, i4);
            o5 instanceof Promise ? a5.push(o5.then((n7) => {
              n7.issues.length && t4.issues.push(...ae2(e7, n7.issues)), t4.value[e7] = n7.value;
            })) : (o5.issues.length && t4.issues.push(...ae2(e7, o5.issues)), t4.value[e7] = o5.value);
          }
        let s5;
        for (const e7 in r3)
          o4.has(e7) || (s5 = null != s5 ? s5 : [], s5.push(e7));
        s5 && s5.length > 0 && t4.issues.push({ code: "unrecognized_keys", input: r3, inst: e6, keys: s5 });
      } else {
        t4.value = {};
        for (const o4 of Reflect.ownKeys(r3)) {
          if ("__proto__" === o4)
            continue;
          const s5 = n6.keyType._zod.run({ value: o4, issues: [] }, i4);
          if (s5 instanceof Promise)
            throw new Error("Async schemas not supported in object keys currently");
          if (s5.issues.length) {
            t4.issues.push({ code: "invalid_key", origin: "record", issues: s5.issues.map((e7) => se2(e7, i4, c2())), input: o4, path: [o4], inst: e6 }), t4.value[s5.value] = s5.value;
            continue;
          }
          const u3 = n6.valueType._zod.run({ value: r3[o4], issues: [] }, i4);
          u3 instanceof Promise ? a5.push(u3.then((e7) => {
            e7.issues.length && t4.issues.push(...ae2(o4, e7.issues)), t4.value[s5.value] = e7.value;
          })) : (u3.issues.length && t4.issues.push(...ae2(o4, u3.issues)), t4.value[s5.value] = u3.value);
        }
      }
      return a5.length ? Promise.all(a5).then(() => t4) : t4;
    };
  });
  var Ci = a4("$ZodMap", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (t4, i4) => {
      const r3 = t4.value;
      if (!(r3 instanceof Map))
        return t4.issues.push({ expected: "map", code: "invalid_type", input: r3, inst: e6 }), t4;
      const a5 = [];
      t4.value = /* @__PURE__ */ new Map();
      for (const [o4, s5] of r3) {
        const u3 = n6.keyType._zod.run({ value: o4, issues: [] }, i4), l3 = n6.valueType._zod.run({ value: s5, issues: [] }, i4);
        u3 instanceof Promise || l3 instanceof Promise ? a5.push(Promise.all([u3, l3]).then(([n7, a6]) => {
          Ji(n7, a6, t4, o4, r3, e6, i4);
        })) : Ji(u3, l3, t4, o4, r3, e6, i4);
      }
      return a5.length ? Promise.all(a5).then(() => t4) : t4;
    };
  });
  function Ji(e6, n6, t4, i4, r3, a5, o4) {
    e6.issues.length && (R2.has(typeof i4) ? t4.issues.push(...ae2(i4, e6.issues)) : t4.issues.push({ code: "invalid_key", origin: "map", input: r3, inst: a5, issues: e6.issues.map((e7) => se2(e7, o4, c2())) })), n6.issues.length && (R2.has(typeof i4) ? t4.issues.push(...ae2(i4, n6.issues)) : t4.issues.push({ origin: "map", code: "invalid_element", input: r3, inst: a5, key: i4, issues: n6.issues.map((e7) => se2(e7, o4, c2())) })), t4.value.set(e6.value, n6.value);
  }
  var Li = a4("$ZodSet", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (t4, i4) => {
      const r3 = t4.value;
      if (!(r3 instanceof Set))
        return t4.issues.push({ input: r3, inst: e6, expected: "set", code: "invalid_type" }), t4;
      const a5 = [];
      t4.value = /* @__PURE__ */ new Set();
      for (const e7 of r3) {
        const r4 = n6.valueType._zod.run({ value: e7, issues: [] }, i4);
        r4 instanceof Promise ? a5.push(r4.then((e8) => Ri(e8, t4))) : Ri(r4, t4);
      }
      return a5.length ? Promise.all(a5).then(() => t4) : t4;
    };
  });
  function Ri(e6, n6) {
    e6.issues.length && n6.issues.push(...e6.issues), n6.value.add(e6.value);
  }
  var Fi = a4("$ZodEnum", (e6, n6) => {
    Dt.init(e6, n6);
    const t4 = h3(n6.entries), i4 = new Set(t4);
    e6._zod.values = i4, e6._zod.pattern = new RegExp(`^(${t4.filter((e7) => R2.has(typeof e7)).map((e7) => "string" == typeof e7 ? M2(e7) : e7.toString()).join("|")})$`), e6._zod.parse = (n7, r3) => {
      const a5 = n7.value;
      return i4.has(a5) || n7.issues.push({ code: "invalid_value", values: t4, input: a5, inst: e6 }), n7;
    };
  });
  var Mi = a4("$ZodLiteral", (e6, n6) => {
    if (Dt.init(e6, n6), 0 === n6.values.length)
      throw new Error("Cannot create literal schema with no valid values");
    e6._zod.values = new Set(n6.values), e6._zod.pattern = new RegExp(`^(${n6.values.map((e7) => "string" == typeof e7 ? M2(e7) : e7 ? M2(e7.toString()) : String(e7)).join("|")})$`), e6._zod.parse = (t4, i4) => {
      const r3 = t4.value;
      return e6._zod.values.has(r3) || t4.issues.push({ code: "invalid_value", values: n6.values, input: r3, inst: e6 }), t4;
    };
  });
  var Wi = a4("$ZodFile", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (n7, t4) => {
      const i4 = n7.value;
      return i4 instanceof File || n7.issues.push({ expected: "file", code: "invalid_type", input: i4, inst: e6 }), n7;
    };
  });
  var Vi = a4("$ZodTransform", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (t4, i4) => {
      if ("backward" === i4.direction)
        throw new u2(e6.constructor.name);
      const r3 = n6.transform(t4.value, t4);
      if (i4.async) {
        return (r3 instanceof Promise ? r3 : Promise.resolve(r3)).then((e7) => (t4.value = e7, t4));
      }
      if (r3 instanceof Promise)
        throw new s4();
      return t4.value = r3, t4;
    };
  });
  function Gi(e6, n6) {
    return e6.issues.length && void 0 === n6 ? { issues: [], value: void 0 } : e6;
  }
  var Bi = a4("$ZodOptional", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.optin = "optional", e6._zod.optout = "optional", S3(e6._zod, "values", () => n6.innerType._zod.values ? /* @__PURE__ */ new Set([...n6.innerType._zod.values, void 0]) : void 0), S3(e6._zod, "pattern", () => {
      const e7 = n6.innerType._zod.pattern;
      return e7 ? new RegExp(`^(${k3(e7.source)})?$`) : void 0;
    }), e6._zod.parse = (e7, t4) => {
      if ("optional" === n6.innerType._zod.optin) {
        const i4 = n6.innerType._zod.run(e7, t4);
        return i4 instanceof Promise ? i4.then((n7) => Gi(n7, e7.value)) : Gi(i4, e7.value);
      }
      return void 0 === e7.value ? e7 : n6.innerType._zod.run(e7, t4);
    };
  });
  var Ki = a4("$ZodNullable", (e6, n6) => {
    Dt.init(e6, n6), S3(e6._zod, "optin", () => n6.innerType._zod.optin), S3(e6._zod, "optout", () => n6.innerType._zod.optout), S3(e6._zod, "pattern", () => {
      const e7 = n6.innerType._zod.pattern;
      return e7 ? new RegExp(`^(${k3(e7.source)}|null)$`) : void 0;
    }), S3(e6._zod, "values", () => n6.innerType._zod.values ? /* @__PURE__ */ new Set([...n6.innerType._zod.values, null]) : void 0), e6._zod.parse = (e7, t4) => null === e7.value ? e7 : n6.innerType._zod.run(e7, t4);
  });
  var qi = a4("$ZodDefault", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.optin = "optional", S3(e6._zod, "values", () => n6.innerType._zod.values), e6._zod.parse = (e7, t4) => {
      if ("backward" === t4.direction)
        return n6.innerType._zod.run(e7, t4);
      if (void 0 === e7.value)
        return e7.value = n6.defaultValue, e7;
      const i4 = n6.innerType._zod.run(e7, t4);
      return i4 instanceof Promise ? i4.then((e8) => Xi(e8, n6)) : Xi(i4, n6);
    };
  });
  function Xi(e6, n6) {
    return void 0 === e6.value && (e6.value = n6.defaultValue), e6;
  }
  var Hi = a4("$ZodPrefault", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.optin = "optional", S3(e6._zod, "values", () => n6.innerType._zod.values), e6._zod.parse = (e7, t4) => ("backward" === t4.direction || void 0 === e7.value && (e7.value = n6.defaultValue), n6.innerType._zod.run(e7, t4));
  });
  var Yi = a4("$ZodNonOptional", (e6, n6) => {
    Dt.init(e6, n6), S3(e6._zod, "values", () => {
      const e7 = n6.innerType._zod.values;
      return e7 ? new Set([...e7].filter((e8) => void 0 !== e8)) : void 0;
    }), e6._zod.parse = (t4, i4) => {
      const r3 = n6.innerType._zod.run(t4, i4);
      return r3 instanceof Promise ? r3.then((n7) => Qi(n7, e6)) : Qi(r3, e6);
    };
  });
  function Qi(e6, n6) {
    return e6.issues.length || void 0 !== e6.value || e6.issues.push({ code: "invalid_type", expected: "nonoptional", input: e6.value, inst: n6 }), e6;
  }
  var er = a4("$ZodSuccess", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (e7, t4) => {
      if ("backward" === t4.direction)
        throw new u2("ZodSuccess");
      const i4 = n6.innerType._zod.run(e7, t4);
      return i4 instanceof Promise ? i4.then((n7) => (e7.value = 0 === n7.issues.length, e7)) : (e7.value = 0 === i4.issues.length, e7);
    };
  });
  var nr = a4("$ZodCatch", (e6, n6) => {
    Dt.init(e6, n6), S3(e6._zod, "optin", () => n6.innerType._zod.optin), S3(e6._zod, "optout", () => n6.innerType._zod.optout), S3(e6._zod, "values", () => n6.innerType._zod.values), e6._zod.parse = (e7, t4) => {
      if ("backward" === t4.direction)
        return n6.innerType._zod.run(e7, t4);
      const i4 = n6.innerType._zod.run(e7, t4);
      return i4 instanceof Promise ? i4.then((i5) => (e7.value = i5.value, i5.issues.length && (e7.value = n6.catchValue({ ...e7, error: { issues: i5.issues.map((e8) => se2(e8, t4, c2())) }, input: e7.value }), e7.issues = []), e7)) : (e7.value = i4.value, i4.issues.length && (e7.value = n6.catchValue({ ...e7, error: { issues: i4.issues.map((e8) => se2(e8, t4, c2())) }, input: e7.value }), e7.issues = []), e7);
    };
  });
  var tr = a4("$ZodNaN", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (n7, t4) => ("number" == typeof n7.value && Number.isNaN(n7.value) || n7.issues.push({ input: n7.value, inst: e6, expected: "nan", code: "invalid_type" }), n7);
  });
  var ir = a4("$ZodPipe", (e6, n6) => {
    Dt.init(e6, n6), S3(e6._zod, "values", () => n6.in._zod.values), S3(e6._zod, "optin", () => n6.in._zod.optin), S3(e6._zod, "optout", () => n6.out._zod.optout), S3(e6._zod, "propValues", () => n6.in._zod.propValues), e6._zod.parse = (e7, t4) => {
      if ("backward" === t4.direction) {
        const i5 = n6.out._zod.run(e7, t4);
        return i5 instanceof Promise ? i5.then((e8) => rr(e8, n6.in, t4)) : rr(i5, n6.in, t4);
      }
      const i4 = n6.in._zod.run(e7, t4);
      return i4 instanceof Promise ? i4.then((e8) => rr(e8, n6.out, t4)) : rr(i4, n6.out, t4);
    };
  });
  function rr(e6, n6, t4) {
    return e6.issues.length ? (e6.aborted = true, e6) : n6._zod.run({ value: e6.value, issues: e6.issues }, t4);
  }
  var ar = a4("$ZodCodec", (e6, n6) => {
    Dt.init(e6, n6), S3(e6._zod, "values", () => n6.in._zod.values), S3(e6._zod, "optin", () => n6.in._zod.optin), S3(e6._zod, "optout", () => n6.out._zod.optout), S3(e6._zod, "propValues", () => n6.in._zod.propValues), e6._zod.parse = (e7, t4) => {
      if ("forward" === (t4.direction || "forward")) {
        const i4 = n6.in._zod.run(e7, t4);
        return i4 instanceof Promise ? i4.then((e8) => or(e8, n6, t4)) : or(i4, n6, t4);
      }
      {
        const i4 = n6.out._zod.run(e7, t4);
        return i4 instanceof Promise ? i4.then((e8) => or(e8, n6, t4)) : or(i4, n6, t4);
      }
    };
  });
  function or(e6, n6, t4) {
    if (e6.issues.length)
      return e6.aborted = true, e6;
    if ("forward" === (t4.direction || "forward")) {
      const i4 = n6.transform(e6.value, e6);
      return i4 instanceof Promise ? i4.then((i5) => sr(e6, i5, n6.out, t4)) : sr(e6, i4, n6.out, t4);
    }
    {
      const i4 = n6.reverseTransform(e6.value, e6);
      return i4 instanceof Promise ? i4.then((i5) => sr(e6, i5, n6.in, t4)) : sr(e6, i4, n6.in, t4);
    }
  }
  function sr(e6, n6, t4, i4) {
    return e6.issues.length ? (e6.aborted = true, e6) : t4._zod.run({ value: n6, issues: e6.issues }, i4);
  }
  var ur = a4("$ZodReadonly", (e6, n6) => {
    Dt.init(e6, n6), S3(e6._zod, "propValues", () => n6.innerType._zod.propValues), S3(e6._zod, "values", () => n6.innerType._zod.values), S3(e6._zod, "optin", () => n6.innerType._zod.optin), S3(e6._zod, "optout", () => n6.innerType._zod.optout), e6._zod.parse = (e7, t4) => {
      if ("backward" === t4.direction)
        return n6.innerType._zod.run(e7, t4);
      const i4 = n6.innerType._zod.run(e7, t4);
      return i4 instanceof Promise ? i4.then(lr) : lr(i4);
    };
  });
  function lr(e6) {
    return e6.value = Object.freeze(e6.value), e6;
  }
  var cr = a4("$ZodTemplateLiteral", (e6, n6) => {
    Dt.init(e6, n6);
    const t4 = [];
    for (const e7 of n6.parts)
      if ("object" == typeof e7 && null !== e7) {
        if (!e7._zod.pattern)
          throw new Error(`Invalid template literal part, no pattern found: ${[...e7._zod.traits].shift()}`);
        const n7 = e7._zod.pattern instanceof RegExp ? e7._zod.pattern.source : e7._zod.pattern;
        if (!n7)
          throw new Error(`Invalid template literal part: ${e7._zod.traits}`);
        const i4 = n7.startsWith("^") ? 1 : 0, r3 = n7.endsWith("$") ? n7.length - 1 : n7.length;
        t4.push(n7.slice(i4, r3));
      } else {
        if (null !== e7 && !F2.has(typeof e7))
          throw new Error(`Invalid template literal part: ${e7}`);
        t4.push(M2(`${e7}`));
      }
    e6._zod.pattern = new RegExp(`^${t4.join("")}$`), e6._zod.parse = (t5, i4) => {
      var r3;
      return "string" != typeof t5.value ? (t5.issues.push({ input: t5.value, inst: e6, expected: "template_literal", code: "invalid_type" }), t5) : (e6._zod.pattern.lastIndex = 0, e6._zod.pattern.test(t5.value) || t5.issues.push({ input: t5.value, inst: e6, code: "invalid_format", format: null != (r3 = n6.format) ? r3 : "template_literal", pattern: e6._zod.pattern.source }), t5);
    };
  });
  var dr = a4("$ZodFunction", (e6, n6) => (Dt.init(e6, n6), e6._def = n6, e6._zod.def = n6, e6.implement = (n7) => {
    if ("function" != typeof n7)
      throw new Error("implement() must be called with a function");
    return function(...t4) {
      const i4 = e6._def.input ? je2(e6._def.input, t4) : t4, r3 = Reflect.apply(n7, this, i4);
      return e6._def.output ? je2(e6._def.output, r3) : r3;
    };
  }, e6.implementAsync = (n7) => {
    if ("function" != typeof n7)
      throw new Error("implementAsync() must be called with a function");
    return async function(...t4) {
      const i4 = e6._def.input ? await Ue2(e6._def.input, t4) : t4, r3 = await Reflect.apply(n7, this, i4);
      return e6._def.output ? await Ue2(e6._def.output, r3) : r3;
    };
  }, e6._zod.parse = (n7, t4) => {
    if ("function" != typeof n7.value)
      return n7.issues.push({ code: "invalid_type", expected: "function", input: n7.value, inst: e6 }), n7;
    const i4 = e6._def.output && "promise" === e6._def.output._zod.def.type;
    return n7.value = i4 ? e6.implementAsync(n7.value) : e6.implement(n7.value), n7;
  }, e6.input = (...n7) => {
    const t4 = e6.constructor;
    return Array.isArray(n7[0]) ? new t4({ type: "function", input: new Ei({ type: "tuple", items: n7[0], rest: n7[1] }), output: e6._def.output }) : new t4({ type: "function", input: n7[0], output: e6._def.output });
  }, e6.output = (n7) => new (0, e6.constructor)({ type: "function", input: e6._def.input, output: n7 }), e6));
  var mr = a4("$ZodPromise", (e6, n6) => {
    Dt.init(e6, n6), e6._zod.parse = (e7, t4) => Promise.resolve(e7.value).then((e8) => n6.innerType._zod.run({ value: e8, issues: [] }, t4));
  });
  var pr = a4("$ZodLazy", (e6, n6) => {
    Dt.init(e6, n6), S3(e6._zod, "innerType", () => n6.getter()), S3(e6._zod, "pattern", () => e6._zod.innerType._zod.pattern), S3(e6._zod, "propValues", () => e6._zod.innerType._zod.propValues), S3(e6._zod, "optin", () => {
      var n7;
      return null != (n7 = e6._zod.innerType._zod.optin) ? n7 : void 0;
    }), S3(e6._zod, "optout", () => {
      var n7;
      return null != (n7 = e6._zod.innerType._zod.optout) ? n7 : void 0;
    }), e6._zod.parse = (n7, t4) => e6._zod.innerType._zod.run(n7, t4);
  });
  var vr = a4("$ZodCustom", (e6, n6) => {
    st2.init(e6, n6), Dt.init(e6, n6), e6._zod.parse = (e7, n7) => e7, e6._zod.check = (t4) => {
      const i4 = t4.value, r3 = n6.fn(i4);
      if (r3 instanceof Promise)
        return r3.then((n7) => fr(n7, t4, i4, e6));
      fr(r3, t4, i4, e6);
    };
  });
  function fr(e6, n6, t4, i4) {
    var r3;
    if (!e6) {
      const e7 = { code: "custom", input: t4, inst: i4, path: [...null != (r3 = i4._zod.def.path) ? r3 : []], continue: !i4._zod.def.abort };
      i4._zod.def.params && (e7.params = i4._zod.def.params), n6.issues.push(ce2(e7));
    }
  }
  var gr = {};
  n5(gr, { ar: () => br, az: () => $r, be: () => wr, bg: () => Sr, ca: () => xr, cs: () => Or, da: () => Nr, de: () => Dr, en: () => Er, eo: () => Ar, es: () => Jr, fa: () => Rr, fi: () => Mr, fr: () => Vr, frCA: () => Br, he: () => qr, hu: () => Hr, id: () => Qr, is: () => na, it: () => ia, ja: () => aa, ka: () => sa, kh: () => ca, km: () => la, ko: () => ma, lt: () => ha, mk: () => ya, ms: () => _a, nl: () => wa, no: () => Sa, ota: () => xa, pl: () => Na, ps: () => Oa, pt: () => Da, ru: () => Ta, sl: () => Ca, sv: () => La, ta: () => Fa, th: () => Wa, tr: () => Ga, ua: () => qa, uk: () => Ka, ur: () => Ha, vi: () => Qa, yo: () => ao, zhCN: () => no, zhTW: () => io });
  var hr = () => {
    const e6 = { string: { unit: "\u062D\u0631\u0641", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" }, file: { unit: "\u0628\u0627\u064A\u062A", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" }, array: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" }, set: { unit: "\u0639\u0646\u0635\u0631", verb: "\u0623\u0646 \u064A\u062D\u0648\u064A" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0645\u062F\u062E\u0644", email: "\u0628\u0631\u064A\u062F \u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A", url: "\u0631\u0627\u0628\u0637", emoji: "\u0625\u064A\u0645\u0648\u062C\u064A", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u062A\u0627\u0631\u064A\u062E \u0648\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO", date: "\u062A\u0627\u0631\u064A\u062E \u0628\u0645\u0639\u064A\u0627\u0631 ISO", time: "\u0648\u0642\u062A \u0628\u0645\u0639\u064A\u0627\u0631 ISO", duration: "\u0645\u062F\u0629 \u0628\u0645\u0639\u064A\u0627\u0631 ISO", ipv4: "\u0639\u0646\u0648\u0627\u0646 IPv4", ipv6: "\u0639\u0646\u0648\u0627\u0646 IPv6", cidrv4: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv4", cidrv6: "\u0645\u062F\u0649 \u0639\u0646\u0627\u0648\u064A\u0646 \u0628\u0635\u064A\u063A\u0629 IPv6", base64: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64-encoded", base64url: "\u0646\u064E\u0635 \u0628\u062A\u0631\u0645\u064A\u0632 base64url-encoded", json_string: "\u0646\u064E\u0635 \u0639\u0644\u0649 \u0647\u064A\u0626\u0629 JSON", e164: "\u0631\u0642\u0645 \u0647\u0627\u062A\u0641 \u0628\u0645\u0639\u064A\u0627\u0631 E.164", jwt: "JWT", template_literal: "\u0645\u062F\u062E\u0644" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${e7.expected}\u060C \u0648\u0644\u0643\u0646 \u062A\u0645 \u0625\u062F\u062E\u0627\u0644 ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u0645\u062F\u062E\u0644\u0627\u062A \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644\u0629: \u064A\u0641\u062A\u0631\u0636 \u0625\u062F\u062E\u0627\u0644 ${B3(e7.values[0])}` : `\u0627\u062E\u062A\u064A\u0627\u0631 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062A\u0648\u0642\u0639 \u0627\u0646\u062A\u0642\u0627\u0621 \u0623\u062D\u062F \u0647\u0630\u0647 \u0627\u0644\u062E\u064A\u0627\u0631\u0627\u062A: ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? ` \u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${null != (i4 = e7.origin) ? i4 : "\u0627\u0644\u0642\u064A\u0645\u0629"} ${t5} ${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u0639\u0646\u0635\u0631"}` : `\u0623\u0643\u0628\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0623\u0646 \u062A\u0643\u0648\u0646 ${null != (a5 = e7.origin) ? a5 : "\u0627\u0644\u0642\u064A\u0645\u0629"} ${t5} ${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${e7.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${t5} ${e7.minimum.toString()} ${i5.unit}` : `\u0623\u0635\u063A\u0631 \u0645\u0646 \u0627\u0644\u0644\u0627\u0632\u0645: \u064A\u0641\u062A\u0631\u0636 \u0644\u0640 ${e7.origin} \u0623\u0646 \u064A\u0643\u0648\u0646 ${t5} ${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0628\u062F\u0623 \u0628\u0640 "${e7.prefix}"` : "ends_with" === n7.format ? `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0646\u062A\u0647\u064A \u0628\u0640 "${n7.suffix}"` : "includes" === n7.format ? `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u062A\u0636\u0645\u0651\u064E\u0646 "${n7.includes}"` : "regex" === n7.format ? `\u0646\u064E\u0635 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0637\u0627\u0628\u0642 \u0627\u0644\u0646\u0645\u0637 ${n7.pattern}` : `${null != (o4 = t4[n7.format]) ? o4 : e7.format} \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644`;
        }
        case "not_multiple_of":
          return `\u0631\u0642\u0645 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644: \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0646 \u0645\u0636\u0627\u0639\u0641\u0627\u062A ${e7.divisor}`;
        case "unrecognized_keys":
          return `\u0645\u0639\u0631\u0641${e7.keys.length > 1 ? "\u0627\u062A" : ""} \u063A\u0631\u064A\u0628${e7.keys.length > 1 ? "\u0629" : ""}: ${b(e7.keys, "\u060C ")}`;
        case "invalid_key":
          return `\u0645\u0639\u0631\u0641 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${e7.origin}`;
        case "invalid_union":
        default:
          return "\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644";
        case "invalid_element":
          return `\u0645\u062F\u062E\u0644 \u063A\u064A\u0631 \u0645\u0642\u0628\u0648\u0644 \u0641\u064A ${e7.origin}`;
      }
    };
  };
  function br() {
    return { localeError: hr() };
  }
  var yr = () => {
    const e6 = { string: { unit: "simvol", verb: "olmal\u0131d\u0131r" }, file: { unit: "bayt", verb: "olmal\u0131d\u0131r" }, array: { unit: "element", verb: "olmal\u0131d\u0131r" }, set: { unit: "element", verb: "olmal\u0131d\u0131r" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "input", email: "email address", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO datetime", date: "ISO date", time: "ISO time", duration: "ISO duration", ipv4: "IPv4 address", ipv6: "IPv6 address", cidrv4: "IPv4 range", cidrv6: "IPv6 range", base64: "base64-encoded string", base64url: "base64url-encoded string", json_string: "JSON string", e164: "E.164 number", jwt: "JWT", template_literal: "input" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${e7.expected}, daxil olan ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Yanl\u0131\u015F d\u0259y\u0259r: g\xF6zl\u0259nil\u0259n ${B3(e7.values[0])}` : `Yanl\u0131\u015F se\xE7im: a\u015Fa\u011F\u0131dak\u0131lardan biri olmal\u0131d\u0131r: ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${null != (i4 = e7.origin) ? i4 : "d\u0259y\u0259r"} ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "element"}` : `\xC7ox b\xF6y\xFCk: g\xF6zl\u0259nil\u0259n ${null != (a5 = e7.origin) ? a5 : "d\u0259y\u0259r"} ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${e7.origin} ${t5}${e7.minimum.toString()} ${i5.unit}` : `\xC7ox ki\xE7ik: g\xF6zl\u0259nil\u0259n ${e7.origin} ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Yanl\u0131\u015F m\u0259tn: "${n7.prefix}" il\u0259 ba\u015Flamal\u0131d\u0131r` : "ends_with" === n7.format ? `Yanl\u0131\u015F m\u0259tn: "${n7.suffix}" il\u0259 bitm\u0259lidir` : "includes" === n7.format ? `Yanl\u0131\u015F m\u0259tn: "${n7.includes}" daxil olmal\u0131d\u0131r` : "regex" === n7.format ? `Yanl\u0131\u015F m\u0259tn: ${n7.pattern} \u015Fablonuna uy\u011Fun olmal\u0131d\u0131r` : `Yanl\u0131\u015F ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `Yanl\u0131\u015F \u0259d\u0259d: ${e7.divisor} il\u0259 b\xF6l\xFCn\u0259 bil\u0259n olmal\u0131d\u0131r`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan a\xE7ar${e7.keys.length > 1 ? "lar" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `${e7.origin} daxilind\u0259 yanl\u0131\u015F a\xE7ar`;
        case "invalid_union":
        default:
          return "Yanl\u0131\u015F d\u0259y\u0259r";
        case "invalid_element":
          return `${e7.origin} daxilind\u0259 yanl\u0131\u015F d\u0259y\u0259r`;
      }
    };
  };
  function $r() {
    return { localeError: yr() };
  }
  function _r(e6, n6, t4, i4) {
    const r3 = Math.abs(e6), a5 = r3 % 10, o4 = r3 % 100;
    return o4 >= 11 && o4 <= 19 ? i4 : 1 === a5 ? n6 : a5 >= 2 && a5 <= 4 ? t4 : i4;
  }
  var kr = () => {
    const e6 = { string: { unit: { one: "\u0441\u0456\u043C\u0432\u0430\u043B", few: "\u0441\u0456\u043C\u0432\u0430\u043B\u044B", many: "\u0441\u0456\u043C\u0432\u0430\u043B\u0430\u045E" }, verb: "\u043C\u0435\u0446\u044C" }, array: { unit: { one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442", few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B", many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E" }, verb: "\u043C\u0435\u0446\u044C" }, set: { unit: { one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442", few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u044B", many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430\u045E" }, verb: "\u043C\u0435\u0446\u044C" }, file: { unit: { one: "\u0431\u0430\u0439\u0442", few: "\u0431\u0430\u0439\u0442\u044B", many: "\u0431\u0430\u0439\u0442\u0430\u045E" }, verb: "\u043C\u0435\u0446\u044C" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0443\u0432\u043E\u0434", email: "email \u0430\u0434\u0440\u0430\u0441", url: "URL", emoji: "\u044D\u043C\u043E\u0434\u0437\u0456", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u0434\u0430\u0442\u0430 \u0456 \u0447\u0430\u0441", date: "ISO \u0434\u0430\u0442\u0430", time: "ISO \u0447\u0430\u0441", duration: "ISO \u043F\u0440\u0430\u0446\u044F\u0433\u043B\u0430\u0441\u0446\u044C", ipv4: "IPv4 \u0430\u0434\u0440\u0430\u0441", ipv6: "IPv6 \u0430\u0434\u0440\u0430\u0441", cidrv4: "IPv4 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D", cidrv6: "IPv6 \u0434\u044B\u044F\u043F\u0430\u0437\u043E\u043D", base64: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64", base64url: "\u0440\u0430\u0434\u043E\u043A \u0443 \u0444\u0430\u0440\u043C\u0430\u0446\u0435 base64url", json_string: "JSON \u0440\u0430\u0434\u043E\u043A", e164: "\u043D\u0443\u043C\u0430\u0440 E.164", jwt: "JWT", template_literal: "\u0443\u0432\u043E\u0434" };
    return (e7) => {
      var i4, r3, a5;
      switch (e7.code) {
        case "invalid_type":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u045E\u0441\u044F ${e7.expected}, \u0430\u0442\u0440\u044B\u043C\u0430\u043D\u0430 ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u043B\u0456\u043A";
              case "object":
                if (Array.isArray(e8))
                  return "\u043C\u0430\u0441\u0456\u045E";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F ${B3(e7.values[0])}` : `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0432\u0430\u0440\u044B\u044F\u043D\u0442: \u0447\u0430\u043A\u0430\u045E\u0441\u044F \u0430\u0434\u0437\u0456\u043D \u0437 ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", a6 = n6(e7.origin);
          if (a6) {
            const n7 = _r(Number(e7.maximum), a6.unit.one, a6.unit.few, a6.unit.many);
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${null != (i4 = e7.origin) ? i4 : "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${a6.verb} ${t5}${e7.maximum.toString()} ${n7}`;
          }
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u0432\u044F\u043B\u0456\u043A\u0456: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${null != (r3 = e7.origin) ? r3 : "\u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435"} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          if (i5) {
            const n7 = _r(Number(e7.minimum), i5.unit.one, i5.unit.few, i5.unit.many);
            return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${e7.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 ${i5.verb} ${t5}${e7.minimum.toString()} ${n7}`;
          }
          return `\u0417\u0430\u043D\u0430\u0434\u0442\u0430 \u043C\u0430\u043B\u044B: \u0447\u0430\u043A\u0430\u043B\u0430\u0441\u044F, \u0448\u0442\u043E ${e7.origin} \u043F\u0430\u0432\u0456\u043D\u043D\u0430 \u0431\u044B\u0446\u044C ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u043F\u0430\u0447\u044B\u043D\u0430\u0446\u0446\u0430 \u0437 "${n7.prefix}"` : "ends_with" === n7.format ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u0430\u043A\u0430\u043D\u0447\u0432\u0430\u0446\u0446\u0430 \u043D\u0430 "${n7.suffix}"` : "includes" === n7.format ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0437\u043C\u044F\u0448\u0447\u0430\u0446\u044C "${n7.includes}"` : "regex" === n7.format ? `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u0440\u0430\u0434\u043E\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0430\u0434\u043F\u0430\u0432\u044F\u0434\u0430\u0446\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${n7.pattern}` : `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B ${null != (a5 = t4[n7.format]) ? a5 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043B\u0456\u043A: \u043F\u0430\u0432\u0456\u043D\u0435\u043D \u0431\u044B\u0446\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${e7.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0441\u043F\u0430\u0437\u043D\u0430\u043D\u044B ${e7.keys.length > 1 ? "\u043A\u043B\u044E\u0447\u044B" : "\u043A\u043B\u044E\u0447"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u043A\u043B\u044E\u0447 \u0443 ${e7.origin}`;
        case "invalid_union":
        default:
          return "\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u044B \u045E\u0432\u043E\u0434";
        case "invalid_element":
          return `\u041D\u044F\u043F\u0440\u0430\u0432\u0456\u043B\u044C\u043D\u0430\u0435 \u0437\u043D\u0430\u0447\u044D\u043D\u043D\u0435 \u045E ${e7.origin}`;
      }
    };
  };
  function wr() {
    return { localeError: kr() };
  }
  var Ir = () => {
    const e6 = { string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" }, file: { unit: "\u0431\u0430\u0439\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" }, array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" }, set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430", verb: "\u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0432\u0445\u043E\u0434", email: "\u0438\u043C\u0435\u0439\u043B \u0430\u0434\u0440\u0435\u0441", url: "URL", emoji: "\u0435\u043C\u043E\u0434\u0436\u0438", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u0432\u0440\u0435\u043C\u0435", date: "ISO \u0434\u0430\u0442\u0430", time: "ISO \u0432\u0440\u0435\u043C\u0435", duration: "ISO \u043F\u0440\u043E\u0434\u044A\u043B\u0436\u0438\u0442\u0435\u043B\u043D\u043E\u0441\u0442", ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441", ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441", cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D", cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D", base64: "base64-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437", base64url: "base64url-\u043A\u043E\u0434\u0438\u0440\u0430\u043D \u043D\u0438\u0437", json_string: "JSON \u043D\u0438\u0437", e164: "E.164 \u043D\u043E\u043C\u0435\u0440", jwt: "JWT", template_literal: "\u0432\u0445\u043E\u0434" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${e7.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
              case "object":
                if (Array.isArray(e8))
                  return "\u043C\u0430\u0441\u0438\u0432";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434: \u043E\u0447\u0430\u043A\u0432\u0430\u043D ${B3(e7.values[0])}` : `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u043E\u043F\u0446\u0438\u044F: \u043E\u0447\u0430\u043A\u0432\u0430\u043D\u043E \u0435\u0434\u043D\u043E \u043E\u0442 ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${null != (i4 = e7.origin) ? i4 : "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0430"}` : `\u0422\u0432\u044A\u0440\u0434\u0435 \u0433\u043E\u043B\u044F\u043C\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${null != (a5 = e7.origin) ? a5 : "\u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442"} \u0434\u0430 \u0431\u044A\u0434\u0435 ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${e7.origin} \u0434\u0430 \u0441\u044A\u0434\u044A\u0440\u0436\u0430 ${t5}${e7.minimum.toString()} ${i5.unit}` : `\u0422\u0432\u044A\u0440\u0434\u0435 \u043C\u0430\u043B\u043A\u043E: \u043E\u0447\u0430\u043A\u0432\u0430 \u0441\u0435 ${e7.origin} \u0434\u0430 \u0431\u044A\u0434\u0435 ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          if ("starts_with" === n7.format)
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u0432\u0430 \u0441 "${n7.prefix}"`;
          if ("ends_with" === n7.format)
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0437\u0430\u0432\u044A\u0440\u0448\u0432\u0430 \u0441 "${n7.suffix}"`;
          if ("includes" === n7.format)
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0432\u043A\u043B\u044E\u0447\u0432\u0430 "${n7.includes}"`;
          if ("regex" === n7.format)
            return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043D\u0438\u0437: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0441\u044A\u0432\u043F\u0430\u0434\u0430 \u0441 ${n7.pattern}`;
          let i5 = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D";
          return "emoji" === n7.format && (i5 = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E"), "datetime" === n7.format && (i5 = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E"), "date" === n7.format && (i5 = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430"), "time" === n7.format && (i5 = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E"), "duration" === n7.format && (i5 = "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430"), `${i5} ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u043E \u0447\u0438\u0441\u043B\u043E: \u0442\u0440\u044F\u0431\u0432\u0430 \u0434\u0430 \u0431\u044A\u0434\u0435 \u043A\u0440\u0430\u0442\u043D\u043E \u043D\u0430 ${e7.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0437\u043F\u043E\u0437\u043D\u0430\u0442${e7.keys.length > 1 ? "\u0438" : ""} \u043A\u043B\u044E\u0447${e7.keys.length > 1 ? "\u043E\u0432\u0435" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u043A\u043B\u044E\u0447 \u0432 ${e7.origin}`;
        case "invalid_union":
        default:
          return "\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u0435\u043D \u0432\u0445\u043E\u0434";
        case "invalid_element":
          return `\u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u0430 \u0441\u0442\u043E\u0439\u043D\u043E\u0441\u0442 \u0432 ${e7.origin}`;
      }
    };
  };
  function Sr() {
    return { localeError: Ir() };
  }
  var zr = () => {
    const e6 = { string: { unit: "car\xE0cters", verb: "contenir" }, file: { unit: "bytes", verb: "contenir" }, array: { unit: "elements", verb: "contenir" }, set: { unit: "elements", verb: "contenir" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "entrada", email: "adre\xE7a electr\xF2nica", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "data i hora ISO", date: "data ISO", time: "hora ISO", duration: "durada ISO", ipv4: "adre\xE7a IPv4", ipv6: "adre\xE7a IPv6", cidrv4: "rang IPv4", cidrv6: "rang IPv6", base64: "cadena codificada en base64", base64url: "cadena codificada en base64url", json_string: "cadena JSON", e164: "n\xFAmero E.164", jwt: "JWT", template_literal: "entrada" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Tipus inv\xE0lid: s'esperava ${e7.expected}, s'ha rebut ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Valor inv\xE0lid: s'esperava ${B3(e7.values[0])}` : `Opci\xF3 inv\xE0lida: s'esperava una de ${b(e7.values, " o ")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "com a m\xE0xim" : "menys de", o5 = n6(e7.origin);
          return o5 ? `Massa gran: s'esperava que ${null != (i4 = e7.origin) ? i4 : "el valor"} contingu\xE9s ${t5} ${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elements"}` : `Massa gran: s'esperava que ${null != (a5 = e7.origin) ? a5 : "el valor"} fos ${t5} ${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? "com a m\xEDnim" : "m\xE9s de", i5 = n6(e7.origin);
          return i5 ? `Massa petit: s'esperava que ${e7.origin} contingu\xE9s ${t5} ${e7.minimum.toString()} ${i5.unit}` : `Massa petit: s'esperava que ${e7.origin} fos ${t5} ${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Format inv\xE0lid: ha de comen\xE7ar amb "${n7.prefix}"` : "ends_with" === n7.format ? `Format inv\xE0lid: ha d'acabar amb "${n7.suffix}"` : "includes" === n7.format ? `Format inv\xE0lid: ha d'incloure "${n7.includes}"` : "regex" === n7.format ? `Format inv\xE0lid: ha de coincidir amb el patr\xF3 ${n7.pattern}` : `Format inv\xE0lid per a ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE0lid: ha de ser m\xFAltiple de ${e7.divisor}`;
        case "unrecognized_keys":
          return `Clau${e7.keys.length > 1 ? "s" : ""} no reconeguda${e7.keys.length > 1 ? "s" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Clau inv\xE0lida a ${e7.origin}`;
        case "invalid_union":
        default:
          return "Entrada inv\xE0lida";
        case "invalid_element":
          return `Element inv\xE0lid a ${e7.origin}`;
      }
    };
  };
  function xr() {
    return { localeError: zr() };
  }
  var jr = () => {
    const e6 = { string: { unit: "znak\u016F", verb: "m\xEDt" }, file: { unit: "bajt\u016F", verb: "m\xEDt" }, array: { unit: "prvk\u016F", verb: "m\xEDt" }, set: { unit: "prvk\u016F", verb: "m\xEDt" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "regul\xE1rn\xED v\xFDraz", email: "e-mailov\xE1 adresa", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "datum a \u010Das ve form\xE1tu ISO", date: "datum ve form\xE1tu ISO", time: "\u010Das ve form\xE1tu ISO", duration: "doba trv\xE1n\xED ISO", ipv4: "IPv4 adresa", ipv6: "IPv6 adresa", cidrv4: "rozsah IPv4", cidrv6: "rozsah IPv6", base64: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64", base64url: "\u0159et\u011Bzec zak\xF3dovan\xFD ve form\xE1tu base64url", json_string: "\u0159et\u011Bzec ve form\xE1tu JSON", e164: "\u010D\xEDslo E.164", jwt: "JWT", template_literal: "vstup" };
    return (e7) => {
      var i4, r3, a5, o4, s5, u3, l3;
      switch (e7.code) {
        case "invalid_type":
          return `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${e7.expected}, obdr\u017Eeno ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u010D\xEDslo";
              case "string":
                return "\u0159et\u011Bzec";
              case "boolean":
                return "boolean";
              case "bigint":
                return "bigint";
              case "function":
                return "funkce";
              case "symbol":
                return "symbol";
              case "undefined":
                return "undefined";
              case "object":
                if (Array.isArray(e8))
                  return "pole";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Neplatn\xFD vstup: o\u010Dek\xE1v\xE1no ${B3(e7.values[0])}` : `Neplatn\xE1 mo\u017Enost: o\u010Dek\xE1v\xE1na jedna z hodnot ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${null != (i4 = e7.origin) ? i4 : "hodnota"} mus\xED m\xEDt ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "prvk\u016F"}` : `Hodnota je p\u0159\xEDli\u0161 velk\xE1: ${null != (a5 = e7.origin) ? a5 : "hodnota"} mus\xED b\xFDt ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${null != (o4 = e7.origin) ? o4 : "hodnota"} mus\xED m\xEDt ${t5}${e7.minimum.toString()} ${null != (s5 = i5.unit) ? s5 : "prvk\u016F"}` : `Hodnota je p\u0159\xEDli\u0161 mal\xE1: ${null != (u3 = e7.origin) ? u3 : "hodnota"} mus\xED b\xFDt ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Neplatn\xFD \u0159et\u011Bzec: mus\xED za\u010D\xEDnat na "${n7.prefix}"` : "ends_with" === n7.format ? `Neplatn\xFD \u0159et\u011Bzec: mus\xED kon\u010Dit na "${n7.suffix}"` : "includes" === n7.format ? `Neplatn\xFD \u0159et\u011Bzec: mus\xED obsahovat "${n7.includes}"` : "regex" === n7.format ? `Neplatn\xFD \u0159et\u011Bzec: mus\xED odpov\xEDdat vzoru ${n7.pattern}` : `Neplatn\xFD form\xE1t ${null != (l3 = t4[n7.format]) ? l3 : e7.format}`;
        }
        case "not_multiple_of":
          return `Neplatn\xE9 \u010D\xEDslo: mus\xED b\xFDt n\xE1sobkem ${e7.divisor}`;
        case "unrecognized_keys":
          return `Nezn\xE1m\xE9 kl\xED\u010De: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Neplatn\xFD kl\xED\u010D v ${e7.origin}`;
        case "invalid_union":
        default:
          return "Neplatn\xFD vstup";
        case "invalid_element":
          return `Neplatn\xE1 hodnota v ${e7.origin}`;
      }
    };
  };
  function Or() {
    return { localeError: jr() };
  }
  var Ur = () => {
    const e6 = { string: { unit: "tegn", verb: "havde" }, file: { unit: "bytes", verb: "havde" }, array: { unit: "elementer", verb: "indeholdt" }, set: { unit: "elementer", verb: "indeholdt" } }, n6 = { string: "streng", number: "tal", boolean: "boolean", array: "liste", object: "objekt", set: "s\xE6t", file: "fil" };
    function t4(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    function i4(e7) {
      var t5;
      return null != (t5 = n6[e7]) ? t5 : e7;
    }
    const r3 = { regex: "input", email: "e-mailadresse", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO dato- og klokkesl\xE6t", date: "ISO-dato", time: "ISO-klokkesl\xE6t", duration: "ISO-varighed", ipv4: "IPv4-omr\xE5de", ipv6: "IPv6-omr\xE5de", cidrv4: "IPv4-spektrum", cidrv6: "IPv6-spektrum", base64: "base64-kodet streng", base64url: "base64url-kodet streng", json_string: "JSON-streng", e164: "E.164-nummer", jwt: "JWT", template_literal: "input" };
    return (e7) => {
      var n7, a5;
      switch (e7.code) {
        case "invalid_type":
          return `Ugyldigt input: forventede ${i4(e7.expected)}, fik ${i4(((e8) => {
            const n8 = typeof e8;
            switch (n8) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "tal";
              case "object":
                return Array.isArray(e8) ? "liste" : null === e8 ? "null" : Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor ? e8.constructor.name : "objekt";
            }
            return n8;
          })(e7.input))}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Ugyldig v\xE6rdi: forventede ${B3(e7.values[0])}` : `Ugyldigt valg: forventede en af f\xF8lgende ${b(e7.values, "|")}`;
        case "too_big": {
          const r4 = e7.inclusive ? "<=" : "<", a6 = t4(e7.origin), o4 = i4(e7.origin);
          return a6 ? `For stor: forventede ${null != o4 ? o4 : "value"} ${a6.verb} ${r4} ${e7.maximum.toString()} ${null != (n7 = a6.unit) ? n7 : "elementer"}` : `For stor: forventede ${null != o4 ? o4 : "value"} havde ${r4} ${e7.maximum.toString()}`;
        }
        case "too_small": {
          const n8 = e7.inclusive ? ">=" : ">", r4 = t4(e7.origin), a6 = i4(e7.origin);
          return r4 ? `For lille: forventede ${a6} ${r4.verb} ${n8} ${e7.minimum.toString()} ${r4.unit}` : `For lille: forventede ${a6} havde ${n8} ${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n8 = e7;
          return "starts_with" === n8.format ? `Ugyldig streng: skal starte med "${n8.prefix}"` : "ends_with" === n8.format ? `Ugyldig streng: skal ende med "${n8.suffix}"` : "includes" === n8.format ? `Ugyldig streng: skal indeholde "${n8.includes}"` : "regex" === n8.format ? `Ugyldig streng: skal matche m\xF8nsteret ${n8.pattern}` : `Ugyldig ${null != (a5 = r3[n8.format]) ? a5 : e7.format}`;
        }
        case "not_multiple_of":
          return `Ugyldigt tal: skal v\xE6re deleligt med ${e7.divisor}`;
        case "unrecognized_keys":
          return `${e7.keys.length > 1 ? "Ukendte n\xF8gler" : "Ukendt n\xF8gle"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8gle i ${e7.origin}`;
        case "invalid_union":
          return "Ugyldigt input: matcher ingen af de tilladte typer";
        case "invalid_element":
          return `Ugyldig v\xE6rdi i ${e7.origin}`;
        default:
          return "Ugyldigt input";
      }
    };
  };
  function Nr() {
    return { localeError: Ur() };
  }
  var Pr = () => {
    const e6 = { string: { unit: "Zeichen", verb: "zu haben" }, file: { unit: "Bytes", verb: "zu haben" }, array: { unit: "Elemente", verb: "zu haben" }, set: { unit: "Elemente", verb: "zu haben" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "Eingabe", email: "E-Mail-Adresse", url: "URL", emoji: "Emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO-Datum und -Uhrzeit", date: "ISO-Datum", time: "ISO-Uhrzeit", duration: "ISO-Dauer", ipv4: "IPv4-Adresse", ipv6: "IPv6-Adresse", cidrv4: "IPv4-Bereich", cidrv6: "IPv6-Bereich", base64: "Base64-codierter String", base64url: "Base64-URL-codierter String", json_string: "JSON-String", e164: "E.164-Nummer", jwt: "JWT", template_literal: "Eingabe" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Ung\xFCltige Eingabe: erwartet ${e7.expected}, erhalten ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "Zahl";
              case "object":
                if (Array.isArray(e8))
                  return "Array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Ung\xFCltige Eingabe: erwartet ${B3(e7.values[0])}` : `Ung\xFCltige Option: erwartet eine von ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Zu gro\xDF: erwartet, dass ${null != (i4 = e7.origin) ? i4 : "Wert"} ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "Elemente"} hat` : `Zu gro\xDF: erwartet, dass ${null != (a5 = e7.origin) ? a5 : "Wert"} ${t5}${e7.maximum.toString()} ist`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Zu klein: erwartet, dass ${e7.origin} ${t5}${e7.minimum.toString()} ${i5.unit} hat` : `Zu klein: erwartet, dass ${e7.origin} ${t5}${e7.minimum.toString()} ist`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Ung\xFCltiger String: muss mit "${n7.prefix}" beginnen` : "ends_with" === n7.format ? `Ung\xFCltiger String: muss mit "${n7.suffix}" enden` : "includes" === n7.format ? `Ung\xFCltiger String: muss "${n7.includes}" enthalten` : "regex" === n7.format ? `Ung\xFCltiger String: muss dem Muster ${n7.pattern} entsprechen` : `Ung\xFCltig: ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `Ung\xFCltige Zahl: muss ein Vielfaches von ${e7.divisor} sein`;
        case "unrecognized_keys":
          return `${e7.keys.length > 1 ? "Unbekannte Schl\xFCssel" : "Unbekannter Schl\xFCssel"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Ung\xFCltiger Schl\xFCssel in ${e7.origin}`;
        case "invalid_union":
        default:
          return "Ung\xFCltige Eingabe";
        case "invalid_element":
          return `Ung\xFCltiger Wert in ${e7.origin}`;
      }
    };
  };
  function Dr() {
    return { localeError: Pr() };
  }
  var Zr = () => {
    const e6 = { string: { unit: "characters", verb: "to have" }, file: { unit: "bytes", verb: "to have" }, array: { unit: "items", verb: "to have" }, set: { unit: "items", verb: "to have" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "input", email: "email address", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO datetime", date: "ISO date", time: "ISO time", duration: "ISO duration", ipv4: "IPv4 address", ipv6: "IPv6 address", cidrv4: "IPv4 range", cidrv6: "IPv6 range", base64: "base64-encoded string", base64url: "base64url-encoded string", json_string: "JSON string", e164: "E.164 number", jwt: "JWT", template_literal: "input" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Invalid input: expected ${e7.expected}, received ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Invalid input: expected ${B3(e7.values[0])}` : `Invalid option: expected one of ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Too big: expected ${null != (i4 = e7.origin) ? i4 : "value"} to have ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elements"}` : `Too big: expected ${null != (a5 = e7.origin) ? a5 : "value"} to be ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Too small: expected ${e7.origin} to have ${t5}${e7.minimum.toString()} ${i5.unit}` : `Too small: expected ${e7.origin} to be ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Invalid string: must start with "${n7.prefix}"` : "ends_with" === n7.format ? `Invalid string: must end with "${n7.suffix}"` : "includes" === n7.format ? `Invalid string: must include "${n7.includes}"` : "regex" === n7.format ? `Invalid string: must match pattern ${n7.pattern}` : `Invalid ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `Invalid number: must be a multiple of ${e7.divisor}`;
        case "unrecognized_keys":
          return `Unrecognized key${e7.keys.length > 1 ? "s" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Invalid key in ${e7.origin}`;
        case "invalid_union":
        default:
          return "Invalid input";
        case "invalid_element":
          return `Invalid value in ${e7.origin}`;
      }
    };
  };
  function Er() {
    return { localeError: Zr() };
  }
  var Tr = () => {
    const e6 = { string: { unit: "karaktrojn", verb: "havi" }, file: { unit: "bajtojn", verb: "havi" }, array: { unit: "elementojn", verb: "havi" }, set: { unit: "elementojn", verb: "havi" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "enigo", email: "retadreso", url: "URL", emoji: "emo\u011Dio", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO-datotempo", date: "ISO-dato", time: "ISO-tempo", duration: "ISO-da\u016Dro", ipv4: "IPv4-adreso", ipv6: "IPv6-adreso", cidrv4: "IPv4-rango", cidrv6: "IPv6-rango", base64: "64-ume kodita karaktraro", base64url: "URL-64-ume kodita karaktraro", json_string: "JSON-karaktraro", e164: "E.164-nombro", jwt: "JWT", template_literal: "enigo" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Nevalida enigo: atendi\u011Dis ${e7.expected}, ricevi\u011Dis ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "nombro";
              case "object":
                if (Array.isArray(e8))
                  return "tabelo";
                if (null === e8)
                  return "senvalora";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Nevalida enigo: atendi\u011Dis ${B3(e7.values[0])}` : `Nevalida opcio: atendi\u011Dis unu el ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Tro granda: atendi\u011Dis ke ${null != (i4 = e7.origin) ? i4 : "valoro"} havu ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elementojn"}` : `Tro granda: atendi\u011Dis ke ${null != (a5 = e7.origin) ? a5 : "valoro"} havu ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Tro malgranda: atendi\u011Dis ke ${e7.origin} havu ${t5}${e7.minimum.toString()} ${i5.unit}` : `Tro malgranda: atendi\u011Dis ke ${e7.origin} estu ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Nevalida karaktraro: devas komenci\u011Di per "${n7.prefix}"` : "ends_with" === n7.format ? `Nevalida karaktraro: devas fini\u011Di per "${n7.suffix}"` : "includes" === n7.format ? `Nevalida karaktraro: devas inkluzivi "${n7.includes}"` : "regex" === n7.format ? `Nevalida karaktraro: devas kongrui kun la modelo ${n7.pattern}` : `Nevalida ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `Nevalida nombro: devas esti oblo de ${e7.divisor}`;
        case "unrecognized_keys":
          return `Nekonata${e7.keys.length > 1 ? "j" : ""} \u015Dlosilo${e7.keys.length > 1 ? "j" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Nevalida \u015Dlosilo en ${e7.origin}`;
        case "invalid_union":
        default:
          return "Nevalida enigo";
        case "invalid_element":
          return `Nevalida valoro en ${e7.origin}`;
      }
    };
  };
  function Ar() {
    return { localeError: Tr() };
  }
  var Cr = () => {
    const e6 = { string: { unit: "caracteres", verb: "tener" }, file: { unit: "bytes", verb: "tener" }, array: { unit: "elementos", verb: "tener" }, set: { unit: "elementos", verb: "tener" } }, n6 = { string: "texto", number: "n\xFAmero", boolean: "booleano", array: "arreglo", object: "objeto", set: "conjunto", file: "archivo", date: "fecha", bigint: "n\xFAmero grande", symbol: "s\xEDmbolo", undefined: "indefinido", null: "nulo", function: "funci\xF3n", map: "mapa", record: "registro", tuple: "tupla", enum: "enumeraci\xF3n", union: "uni\xF3n", literal: "literal", promise: "promesa", void: "vac\xEDo", never: "nunca", unknown: "desconocido", any: "cualquiera" };
    function t4(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    function i4(e7) {
      var t5;
      return null != (t5 = n6[e7]) ? t5 : e7;
    }
    const r3 = { regex: "entrada", email: "direcci\xF3n de correo electr\xF3nico", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "fecha y hora ISO", date: "fecha ISO", time: "hora ISO", duration: "duraci\xF3n ISO", ipv4: "direcci\xF3n IPv4", ipv6: "direcci\xF3n IPv6", cidrv4: "rango IPv4", cidrv6: "rango IPv6", base64: "cadena codificada en base64", base64url: "URL codificada en base64", json_string: "cadena JSON", e164: "n\xFAmero E.164", jwt: "JWT", template_literal: "entrada" };
    return (e7) => {
      var n7, a5;
      switch (e7.code) {
        case "invalid_type":
          return `Entrada inv\xE1lida: se esperaba ${i4(e7.expected)}, recibido ${i4(((e8) => {
            const n8 = typeof e8;
            switch (n8) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                return Array.isArray(e8) ? "array" : null === e8 ? "null" : Object.getPrototypeOf(e8) !== Object.prototype ? e8.constructor.name : "object";
            }
            return n8;
          })(e7.input))}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Entrada inv\xE1lida: se esperaba ${B3(e7.values[0])}` : `Opci\xF3n inv\xE1lida: se esperaba una de ${b(e7.values, "|")}`;
        case "too_big": {
          const r4 = e7.inclusive ? "<=" : "<", a6 = t4(e7.origin), o4 = i4(e7.origin);
          return a6 ? `Demasiado grande: se esperaba que ${null != o4 ? o4 : "valor"} tuviera ${r4}${e7.maximum.toString()} ${null != (n7 = a6.unit) ? n7 : "elementos"}` : `Demasiado grande: se esperaba que ${null != o4 ? o4 : "valor"} fuera ${r4}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const n8 = e7.inclusive ? ">=" : ">", r4 = t4(e7.origin), a6 = i4(e7.origin);
          return r4 ? `Demasiado peque\xF1o: se esperaba que ${a6} tuviera ${n8}${e7.minimum.toString()} ${r4.unit}` : `Demasiado peque\xF1o: se esperaba que ${a6} fuera ${n8}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n8 = e7;
          return "starts_with" === n8.format ? `Cadena inv\xE1lida: debe comenzar con "${n8.prefix}"` : "ends_with" === n8.format ? `Cadena inv\xE1lida: debe terminar en "${n8.suffix}"` : "includes" === n8.format ? `Cadena inv\xE1lida: debe incluir "${n8.includes}"` : "regex" === n8.format ? `Cadena inv\xE1lida: debe coincidir con el patr\xF3n ${n8.pattern}` : `Inv\xE1lido ${null != (a5 = r3[n8.format]) ? a5 : e7.format}`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE1lido: debe ser m\xFAltiplo de ${e7.divisor}`;
        case "unrecognized_keys":
          return `Llave${e7.keys.length > 1 ? "s" : ""} desconocida${e7.keys.length > 1 ? "s" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Llave inv\xE1lida en ${i4(e7.origin)}`;
        case "invalid_union":
        default:
          return "Entrada inv\xE1lida";
        case "invalid_element":
          return `Valor inv\xE1lido en ${i4(e7.origin)}`;
      }
    };
  };
  function Jr() {
    return { localeError: Cr() };
  }
  var Lr = () => {
    const e6 = { string: { unit: "\u06A9\u0627\u0631\u0627\u06A9\u062A\u0631", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" }, file: { unit: "\u0628\u0627\u06CC\u062A", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" }, array: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" }, set: { unit: "\u0622\u06CC\u062A\u0645", verb: "\u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0648\u0631\u0648\u062F\u06CC", email: "\u0622\u062F\u0631\u0633 \u0627\u06CC\u0645\u06CC\u0644", url: "URL", emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u062A\u0627\u0631\u06CC\u062E \u0648 \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648", date: "\u062A\u0627\u0631\u06CC\u062E \u0627\u06CC\u0632\u0648", time: "\u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648", duration: "\u0645\u062F\u062A \u0632\u0645\u0627\u0646 \u0627\u06CC\u0632\u0648", ipv4: "IPv4 \u0622\u062F\u0631\u0633", ipv6: "IPv6 \u0622\u062F\u0631\u0633", cidrv4: "IPv4 \u062F\u0627\u0645\u0646\u0647", cidrv6: "IPv6 \u062F\u0627\u0645\u0646\u0647", base64: "base64-encoded \u0631\u0634\u062A\u0647", base64url: "base64url-encoded \u0631\u0634\u062A\u0647", json_string: "JSON \u0631\u0634\u062A\u0647", e164: "E.164 \u0639\u062F\u062F", jwt: "JWT", template_literal: "\u0648\u0631\u0648\u062F\u06CC" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${e7.expected} \u0645\u06CC\u200C\u0628\u0648\u062F\u060C ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u0639\u062F\u062F";
              case "object":
                if (Array.isArray(e8))
                  return "\u0622\u0631\u0627\u06CC\u0647";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)} \u062F\u0631\u06CC\u0627\u0641\u062A \u0634\u062F`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A ${B3(e7.values[0])} \u0645\u06CC\u200C\u0628\u0648\u062F` : `\u06AF\u0632\u06CC\u0646\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0645\u06CC\u200C\u0628\u0627\u06CC\u0633\u062A \u06CC\u06A9\u06CC \u0627\u0632 ${b(e7.values, "|")} \u0645\u06CC\u200C\u0628\u0648\u062F`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${null != (i4 = e7.origin) ? i4 : "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u0639\u0646\u0635\u0631"} \u0628\u0627\u0634\u062F` : `\u062E\u06CC\u0644\u06CC \u0628\u0632\u0631\u06AF: ${null != (a5 = e7.origin) ? a5 : "\u0645\u0642\u062F\u0627\u0631"} \u0628\u0627\u06CC\u062F ${t5}${e7.maximum.toString()} \u0628\u0627\u0634\u062F`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${e7.origin} \u0628\u0627\u06CC\u062F ${t5}${e7.minimum.toString()} ${i5.unit} \u0628\u0627\u0634\u062F` : `\u062E\u06CC\u0644\u06CC \u06A9\u0648\u0686\u06A9: ${e7.origin} \u0628\u0627\u06CC\u062F ${t5}${e7.minimum.toString()} \u0628\u0627\u0634\u062F`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${n7.prefix}" \u0634\u0631\u0648\u0639 \u0634\u0648\u062F` : "ends_with" === n7.format ? `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 "${n7.suffix}" \u062A\u0645\u0627\u0645 \u0634\u0648\u062F` : "includes" === n7.format ? `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0634\u0627\u0645\u0644 "${n7.includes}" \u0628\u0627\u0634\u062F` : "regex" === n7.format ? `\u0631\u0634\u062A\u0647 \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0628\u0627 \u0627\u0644\u06AF\u0648\u06CC ${n7.pattern} \u0645\u0637\u0627\u0628\u0642\u062A \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F` : `${null != (o4 = t4[n7.format]) ? o4 : e7.format} \u0646\u0627\u0645\u0639\u062A\u0628\u0631`;
        }
        case "not_multiple_of":
          return `\u0639\u062F\u062F \u0646\u0627\u0645\u0639\u062A\u0628\u0631: \u0628\u0627\u06CC\u062F \u0645\u0636\u0631\u0628 ${e7.divisor} \u0628\u0627\u0634\u062F`;
        case "unrecognized_keys":
          return `\u06A9\u0644\u06CC\u062F${e7.keys.length > 1 ? "\u0647\u0627\u06CC" : ""} \u0646\u0627\u0634\u0646\u0627\u0633: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u06A9\u0644\u06CC\u062F \u0646\u0627\u0634\u0646\u0627\u0633 \u062F\u0631 ${e7.origin}`;
        case "invalid_union":
        default:
          return "\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631";
        case "invalid_element":
          return `\u0645\u0642\u062F\u0627\u0631 \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u062F\u0631 ${e7.origin}`;
      }
    };
  };
  function Rr() {
    return { localeError: Lr() };
  }
  var Fr = () => {
    const e6 = { string: { unit: "merkki\xE4", subject: "merkkijonon" }, file: { unit: "tavua", subject: "tiedoston" }, array: { unit: "alkiota", subject: "listan" }, set: { unit: "alkiota", subject: "joukon" }, number: { unit: "", subject: "luvun" }, bigint: { unit: "", subject: "suuren kokonaisluvun" }, int: { unit: "", subject: "kokonaisluvun" }, date: { unit: "", subject: "p\xE4iv\xE4m\xE4\xE4r\xE4n" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "s\xE4\xE4nn\xF6llinen lauseke", email: "s\xE4hk\xF6postiosoite", url: "URL-osoite", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO-aikaleima", date: "ISO-p\xE4iv\xE4m\xE4\xE4r\xE4", time: "ISO-aika", duration: "ISO-kesto", ipv4: "IPv4-osoite", ipv6: "IPv6-osoite", cidrv4: "IPv4-alue", cidrv6: "IPv6-alue", base64: "base64-koodattu merkkijono", base64url: "base64url-koodattu merkkijono", json_string: "JSON-merkkijono", e164: "E.164-luku", jwt: "JWT", template_literal: "templaattimerkkijono" };
    return (e7) => {
      var i4;
      switch (e7.code) {
        case "invalid_type":
          return `Virheellinen tyyppi: odotettiin ${e7.expected}, oli ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Virheellinen sy\xF6te: t\xE4ytyy olla ${B3(e7.values[0])}` : `Virheellinen valinta: t\xE4ytyy olla yksi seuraavista: ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", i5 = n6(e7.origin);
          return i5 ? `Liian suuri: ${i5.subject} t\xE4ytyy olla ${t5}${e7.maximum.toString()} ${i5.unit}`.trim() : `Liian suuri: arvon t\xE4ytyy olla ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Liian pieni: ${i5.subject} t\xE4ytyy olla ${t5}${e7.minimum.toString()} ${i5.unit}`.trim() : `Liian pieni: arvon t\xE4ytyy olla ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Virheellinen sy\xF6te: t\xE4ytyy alkaa "${n7.prefix}"` : "ends_with" === n7.format ? `Virheellinen sy\xF6te: t\xE4ytyy loppua "${n7.suffix}"` : "includes" === n7.format ? `Virheellinen sy\xF6te: t\xE4ytyy sis\xE4lt\xE4\xE4 "${n7.includes}"` : "regex" === n7.format ? `Virheellinen sy\xF6te: t\xE4ytyy vastata s\xE4\xE4nn\xF6llist\xE4 lauseketta ${n7.pattern}` : `Virheellinen ${null != (i4 = t4[n7.format]) ? i4 : e7.format}`;
        }
        case "not_multiple_of":
          return `Virheellinen luku: t\xE4ytyy olla luvun ${e7.divisor} monikerta`;
        case "unrecognized_keys":
          return `${e7.keys.length > 1 ? "Tuntemattomat avaimet" : "Tuntematon avain"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return "Virheellinen avain tietueessa";
        case "invalid_union":
          return "Virheellinen unioni";
        case "invalid_element":
          return "Virheellinen arvo joukossa";
        default:
          return "Virheellinen sy\xF6te";
      }
    };
  };
  function Mr() {
    return { localeError: Fr() };
  }
  var Wr = () => {
    const e6 = { string: { unit: "caract\xE8res", verb: "avoir" }, file: { unit: "octets", verb: "avoir" }, array: { unit: "\xE9l\xE9ments", verb: "avoir" }, set: { unit: "\xE9l\xE9ments", verb: "avoir" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "entr\xE9e", email: "adresse e-mail", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "date et heure ISO", date: "date ISO", time: "heure ISO", duration: "dur\xE9e ISO", ipv4: "adresse IPv4", ipv6: "adresse IPv6", cidrv4: "plage IPv4", cidrv6: "plage IPv6", base64: "cha\xEEne encod\xE9e en base64", base64url: "cha\xEEne encod\xE9e en base64url", json_string: "cha\xEEne JSON", e164: "num\xE9ro E.164", jwt: "JWT", template_literal: "entr\xE9e" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Entr\xE9e invalide : ${e7.expected} attendu, ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "nombre";
              case "object":
                if (Array.isArray(e8))
                  return "tableau";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)} re\xE7u`;
        case "invalid_value":
          return 1 === e7.values.length ? `Entr\xE9e invalide : ${B3(e7.values[0])} attendu` : `Option invalide : une valeur parmi ${b(e7.values, "|")} attendue`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Trop grand : ${null != (i4 = e7.origin) ? i4 : "valeur"} doit ${o5.verb} ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\xE9l\xE9ment(s)"}` : `Trop grand : ${null != (a5 = e7.origin) ? a5 : "valeur"} doit \xEAtre ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Trop petit : ${e7.origin} doit ${i5.verb} ${t5}${e7.minimum.toString()} ${i5.unit}` : `Trop petit : ${e7.origin} doit \xEAtre ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Cha\xEEne invalide : doit commencer par "${n7.prefix}"` : "ends_with" === n7.format ? `Cha\xEEne invalide : doit se terminer par "${n7.suffix}"` : "includes" === n7.format ? `Cha\xEEne invalide : doit inclure "${n7.includes}"` : "regex" === n7.format ? `Cha\xEEne invalide : doit correspondre au mod\xE8le ${n7.pattern}` : `${null != (o4 = t4[n7.format]) ? o4 : e7.format} invalide`;
        }
        case "not_multiple_of":
          return `Nombre invalide : doit \xEAtre un multiple de ${e7.divisor}`;
        case "unrecognized_keys":
          return `Cl\xE9${e7.keys.length > 1 ? "s" : ""} non reconnue${e7.keys.length > 1 ? "s" : ""} : ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Cl\xE9 invalide dans ${e7.origin}`;
        case "invalid_union":
        default:
          return "Entr\xE9e invalide";
        case "invalid_element":
          return `Valeur invalide dans ${e7.origin}`;
      }
    };
  };
  function Vr() {
    return { localeError: Wr() };
  }
  var Gr = () => {
    const e6 = { string: { unit: "caract\xE8res", verb: "avoir" }, file: { unit: "octets", verb: "avoir" }, array: { unit: "\xE9l\xE9ments", verb: "avoir" }, set: { unit: "\xE9l\xE9ments", verb: "avoir" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "entr\xE9e", email: "adresse courriel", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "date-heure ISO", date: "date ISO", time: "heure ISO", duration: "dur\xE9e ISO", ipv4: "adresse IPv4", ipv6: "adresse IPv6", cidrv4: "plage IPv4", cidrv6: "plage IPv6", base64: "cha\xEEne encod\xE9e en base64", base64url: "cha\xEEne encod\xE9e en base64url", json_string: "cha\xEEne JSON", e164: "num\xE9ro E.164", jwt: "JWT", template_literal: "entr\xE9e" };
    return (e7) => {
      var i4, r3, a5;
      switch (e7.code) {
        case "invalid_type":
          return `Entr\xE9e invalide : attendu ${e7.expected}, re\xE7u ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Entr\xE9e invalide : attendu ${B3(e7.values[0])}` : `Option invalide : attendu l'une des valeurs suivantes ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "\u2264" : "<", a6 = n6(e7.origin);
          return a6 ? `Trop grand : attendu que ${null != (i4 = e7.origin) ? i4 : "la valeur"} ait ${t5}${e7.maximum.toString()} ${a6.unit}` : `Trop grand : attendu que ${null != (r3 = e7.origin) ? r3 : "la valeur"} soit ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? "\u2265" : ">", i5 = n6(e7.origin);
          return i5 ? `Trop petit : attendu que ${e7.origin} ait ${t5}${e7.minimum.toString()} ${i5.unit}` : `Trop petit : attendu que ${e7.origin} soit ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Cha\xEEne invalide : doit commencer par "${n7.prefix}"` : "ends_with" === n7.format ? `Cha\xEEne invalide : doit se terminer par "${n7.suffix}"` : "includes" === n7.format ? `Cha\xEEne invalide : doit inclure "${n7.includes}"` : "regex" === n7.format ? `Cha\xEEne invalide : doit correspondre au motif ${n7.pattern}` : `${null != (a5 = t4[n7.format]) ? a5 : e7.format} invalide`;
        }
        case "not_multiple_of":
          return `Nombre invalide : doit \xEAtre un multiple de ${e7.divisor}`;
        case "unrecognized_keys":
          return `Cl\xE9${e7.keys.length > 1 ? "s" : ""} non reconnue${e7.keys.length > 1 ? "s" : ""} : ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Cl\xE9 invalide dans ${e7.origin}`;
        case "invalid_union":
        default:
          return "Entr\xE9e invalide";
        case "invalid_element":
          return `Valeur invalide dans ${e7.origin}`;
      }
    };
  };
  function Br() {
    return { localeError: Gr() };
  }
  var Kr = () => {
    const e6 = { string: { unit: "\u05D0\u05D5\u05EA\u05D9\u05D5\u05EA", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" }, file: { unit: "\u05D1\u05D9\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" }, array: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" }, set: { unit: "\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD", verb: "\u05DC\u05DB\u05DC\u05D5\u05DC" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u05E7\u05DC\u05D8", email: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05D0\u05D9\u05DE\u05D9\u05D9\u05DC", url: "\u05DB\u05EA\u05D5\u05D1\u05EA \u05E8\u05E9\u05EA", emoji: "\u05D0\u05D9\u05DE\u05D5\u05D2'\u05D9", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u05EA\u05D0\u05E8\u05D9\u05DA \u05D5\u05D6\u05DE\u05DF ISO", date: "\u05EA\u05D0\u05E8\u05D9\u05DA ISO", time: "\u05D6\u05DE\u05DF ISO", duration: "\u05DE\u05E9\u05DA \u05D6\u05DE\u05DF ISO", ipv4: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv4", ipv6: "\u05DB\u05EA\u05D5\u05D1\u05EA IPv6", cidrv4: "\u05D8\u05D5\u05D5\u05D7 IPv4", cidrv6: "\u05D8\u05D5\u05D5\u05D7 IPv6", base64: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64", base64url: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05D1\u05D1\u05E1\u05D9\u05E1 64 \u05DC\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05E8\u05E9\u05EA", json_string: "\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA JSON", e164: "\u05DE\u05E1\u05E4\u05E8 E.164", jwt: "JWT", template_literal: "\u05E7\u05DC\u05D8" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA ${e7.expected}, \u05D4\u05EA\u05E7\u05D1\u05DC ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA ${B3(e7.values[0])}` : `\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05E6\u05E8\u05D9\u05DA \u05D0\u05D7\u05EA \u05DE\u05D4\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA  ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${null != (i4 = e7.origin) ? i4 : "value"} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elements"}` : `\u05D2\u05D3\u05D5\u05DC \u05DE\u05D3\u05D9: ${null != (a5 = e7.origin) ? a5 : "value"} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${e7.origin} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${t5}${e7.minimum.toString()} ${i5.unit}` : `\u05E7\u05D8\u05DF \u05DE\u05D3\u05D9: ${e7.origin} \u05E6\u05E8\u05D9\u05DA \u05DC\u05D4\u05D9\u05D5\u05EA ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D7\u05D9\u05DC \u05D1"${n7.prefix}"` : "ends_with" === n7.format ? `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05E1\u05EA\u05D9\u05D9\u05DD \u05D1 "${n7.suffix}"` : "includes" === n7.format ? `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05DB\u05DC\u05D5\u05DC "${n7.includes}"` : "regex" === n7.format ? `\u05DE\u05D7\u05E8\u05D5\u05D6\u05EA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05E0\u05D4: \u05D7\u05D9\u05D9\u05D1\u05EA \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05DC\u05EA\u05D1\u05E0\u05D9\u05EA ${n7.pattern}` : `${null != (o4 = t4[n7.format]) ? o4 : e7.format} \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF`;
        }
        case "not_multiple_of":
          return `\u05DE\u05E1\u05E4\u05E8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF: \u05D7\u05D9\u05D9\u05D1 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DE\u05DB\u05E4\u05DC\u05D4 \u05E9\u05DC ${e7.divisor}`;
        case "unrecognized_keys":
          return `\u05DE\u05E4\u05EA\u05D7${e7.keys.length > 1 ? "\u05D5\u05EA" : ""} \u05DC\u05D0 \u05DE\u05D6\u05D5\u05D4${e7.keys.length > 1 ? "\u05D9\u05DD" : "\u05D4"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u05DE\u05E4\u05EA\u05D7 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${e7.origin}`;
        case "invalid_union":
        default:
          return "\u05E7\u05DC\u05D8 \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF";
        case "invalid_element":
          return `\u05E2\u05E8\u05DA \u05DC\u05D0 \u05EA\u05E7\u05D9\u05DF \u05D1${e7.origin}`;
      }
    };
  };
  function qr() {
    return { localeError: Kr() };
  }
  var Xr = () => {
    const e6 = { string: { unit: "karakter", verb: "legyen" }, file: { unit: "byte", verb: "legyen" }, array: { unit: "elem", verb: "legyen" }, set: { unit: "elem", verb: "legyen" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "bemenet", email: "email c\xEDm", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO id\u0151b\xE9lyeg", date: "ISO d\xE1tum", time: "ISO id\u0151", duration: "ISO id\u0151intervallum", ipv4: "IPv4 c\xEDm", ipv6: "IPv6 c\xEDm", cidrv4: "IPv4 tartom\xE1ny", cidrv6: "IPv6 tartom\xE1ny", base64: "base64-k\xF3dolt string", base64url: "base64url-k\xF3dolt string", json_string: "JSON string", e164: "E.164 sz\xE1m", jwt: "JWT", template_literal: "bemenet" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${e7.expected}, a kapott \xE9rt\xE9k ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "sz\xE1m";
              case "object":
                if (Array.isArray(e8))
                  return "t\xF6mb";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\xC9rv\xE9nytelen bemenet: a v\xE1rt \xE9rt\xE9k ${B3(e7.values[0])}` : `\xC9rv\xE9nytelen opci\xF3: valamelyik \xE9rt\xE9k v\xE1rt ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `T\xFAl nagy: ${null != (i4 = e7.origin) ? i4 : "\xE9rt\xE9k"} m\xE9rete t\xFAl nagy ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elem"}` : `T\xFAl nagy: a bemeneti \xE9rt\xE9k ${null != (a5 = e7.origin) ? a5 : "\xE9rt\xE9k"} t\xFAl nagy: ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${e7.origin} m\xE9rete t\xFAl kicsi ${t5}${e7.minimum.toString()} ${i5.unit}` : `T\xFAl kicsi: a bemeneti \xE9rt\xE9k ${e7.origin} t\xFAl kicsi ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\xC9rv\xE9nytelen string: "${n7.prefix}" \xE9rt\xE9kkel kell kezd\u0151dnie` : "ends_with" === n7.format ? `\xC9rv\xE9nytelen string: "${n7.suffix}" \xE9rt\xE9kkel kell v\xE9gz\u0151dnie` : "includes" === n7.format ? `\xC9rv\xE9nytelen string: "${n7.includes}" \xE9rt\xE9ket kell tartalmaznia` : "regex" === n7.format ? `\xC9rv\xE9nytelen string: ${n7.pattern} mint\xE1nak kell megfelelnie` : `\xC9rv\xE9nytelen ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\xC9rv\xE9nytelen sz\xE1m: ${e7.divisor} t\xF6bbsz\xF6r\xF6s\xE9nek kell lennie`;
        case "unrecognized_keys":
          return `Ismeretlen kulcs${e7.keys.length > 1 ? "s" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\xC9rv\xE9nytelen kulcs ${e7.origin}`;
        case "invalid_union":
        default:
          return "\xC9rv\xE9nytelen bemenet";
        case "invalid_element":
          return `\xC9rv\xE9nytelen \xE9rt\xE9k: ${e7.origin}`;
      }
    };
  };
  function Hr() {
    return { localeError: Xr() };
  }
  var Yr = () => {
    const e6 = { string: { unit: "karakter", verb: "memiliki" }, file: { unit: "byte", verb: "memiliki" }, array: { unit: "item", verb: "memiliki" }, set: { unit: "item", verb: "memiliki" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "input", email: "alamat email", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "tanggal dan waktu format ISO", date: "tanggal format ISO", time: "jam format ISO", duration: "durasi format ISO", ipv4: "alamat IPv4", ipv6: "alamat IPv6", cidrv4: "rentang alamat IPv4", cidrv6: "rentang alamat IPv6", base64: "string dengan enkode base64", base64url: "string dengan enkode base64url", json_string: "string JSON", e164: "angka E.164", jwt: "JWT", template_literal: "input" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Input tidak valid: diharapkan ${e7.expected}, diterima ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Input tidak valid: diharapkan ${B3(e7.values[0])}` : `Pilihan tidak valid: diharapkan salah satu dari ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Terlalu besar: diharapkan ${null != (i4 = e7.origin) ? i4 : "value"} memiliki ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elemen"}` : `Terlalu besar: diharapkan ${null != (a5 = e7.origin) ? a5 : "value"} menjadi ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Terlalu kecil: diharapkan ${e7.origin} memiliki ${t5}${e7.minimum.toString()} ${i5.unit}` : `Terlalu kecil: diharapkan ${e7.origin} menjadi ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `String tidak valid: harus dimulai dengan "${n7.prefix}"` : "ends_with" === n7.format ? `String tidak valid: harus berakhir dengan "${n7.suffix}"` : "includes" === n7.format ? `String tidak valid: harus menyertakan "${n7.includes}"` : "regex" === n7.format ? `String tidak valid: harus sesuai pola ${n7.pattern}` : `${null != (o4 = t4[n7.format]) ? o4 : e7.format} tidak valid`;
        }
        case "not_multiple_of":
          return `Angka tidak valid: harus kelipatan dari ${e7.divisor}`;
        case "unrecognized_keys":
          return `Kunci tidak dikenali ${e7.keys.length > 1 ? "s" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Kunci tidak valid di ${e7.origin}`;
        case "invalid_union":
        default:
          return "Input tidak valid";
        case "invalid_element":
          return `Nilai tidak valid di ${e7.origin}`;
      }
    };
  };
  function Qr() {
    return { localeError: Yr() };
  }
  var ea = () => {
    const e6 = { string: { unit: "stafi", verb: "a\xF0 hafa" }, file: { unit: "b\xE6ti", verb: "a\xF0 hafa" }, array: { unit: "hluti", verb: "a\xF0 hafa" }, set: { unit: "hluti", verb: "a\xF0 hafa" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "gildi", email: "netfang", url: "vefsl\xF3\xF0", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO dagsetning og t\xEDmi", date: "ISO dagsetning", time: "ISO t\xEDmi", duration: "ISO t\xEDmalengd", ipv4: "IPv4 address", ipv6: "IPv6 address", cidrv4: "IPv4 range", cidrv6: "IPv6 range", base64: "base64-encoded strengur", base64url: "base64url-encoded strengur", json_string: "JSON strengur", e164: "E.164 t\xF6lugildi", jwt: "JWT", template_literal: "gildi" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Rangt gildi: \xDE\xFA sl\xF3st inn ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "n\xFAmer";
              case "object":
                if (Array.isArray(e8))
                  return "fylki";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)} \xFEar sem \xE1 a\xF0 vera ${e7.expected}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Rangt gildi: gert r\xE1\xF0 fyrir ${B3(e7.values[0])}` : `\xD3gilt val: m\xE1 vera eitt af eftirfarandi ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${null != (i4 = e7.origin) ? i4 : "gildi"} hafi ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "hluti"}` : `Of st\xF3rt: gert er r\xE1\xF0 fyrir a\xF0 ${null != (a5 = e7.origin) ? a5 : "gildi"} s\xE9 ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${e7.origin} hafi ${t5}${e7.minimum.toString()} ${i5.unit}` : `Of l\xEDti\xF0: gert er r\xE1\xF0 fyrir a\xF0 ${e7.origin} s\xE9 ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\xD3gildur strengur: ver\xF0ur a\xF0 byrja \xE1 "${n7.prefix}"` : "ends_with" === n7.format ? `\xD3gildur strengur: ver\xF0ur a\xF0 enda \xE1 "${n7.suffix}"` : "includes" === n7.format ? `\xD3gildur strengur: ver\xF0ur a\xF0 innihalda "${n7.includes}"` : "regex" === n7.format ? `\xD3gildur strengur: ver\xF0ur a\xF0 fylgja mynstri ${n7.pattern}` : `Rangt ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `R\xF6ng tala: ver\xF0ur a\xF0 vera margfeldi af ${e7.divisor}`;
        case "unrecognized_keys":
          return `\xD3\xFEekkt ${e7.keys.length > 1 ? "ir lyklar" : "ur lykill"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Rangur lykill \xED ${e7.origin}`;
        case "invalid_union":
        default:
          return "Rangt gildi";
        case "invalid_element":
          return `Rangt gildi \xED ${e7.origin}`;
      }
    };
  };
  function na() {
    return { localeError: ea() };
  }
  var ta = () => {
    const e6 = { string: { unit: "caratteri", verb: "avere" }, file: { unit: "byte", verb: "avere" }, array: { unit: "elementi", verb: "avere" }, set: { unit: "elementi", verb: "avere" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "input", email: "indirizzo email", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "data e ora ISO", date: "data ISO", time: "ora ISO", duration: "durata ISO", ipv4: "indirizzo IPv4", ipv6: "indirizzo IPv6", cidrv4: "intervallo IPv4", cidrv6: "intervallo IPv6", base64: "stringa codificata in base64", base64url: "URL codificata in base64", json_string: "stringa JSON", e164: "numero E.164", jwt: "JWT", template_literal: "input" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Input non valido: atteso ${e7.expected}, ricevuto ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "numero";
              case "object":
                if (Array.isArray(e8))
                  return "vettore";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Input non valido: atteso ${B3(e7.values[0])}` : `Opzione non valida: atteso uno tra ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Troppo grande: ${null != (i4 = e7.origin) ? i4 : "valore"} deve avere ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elementi"}` : `Troppo grande: ${null != (a5 = e7.origin) ? a5 : "valore"} deve essere ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Troppo piccolo: ${e7.origin} deve avere ${t5}${e7.minimum.toString()} ${i5.unit}` : `Troppo piccolo: ${e7.origin} deve essere ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Stringa non valida: deve iniziare con "${n7.prefix}"` : "ends_with" === n7.format ? `Stringa non valida: deve terminare con "${n7.suffix}"` : "includes" === n7.format ? `Stringa non valida: deve includere "${n7.includes}"` : "regex" === n7.format ? `Stringa non valida: deve corrispondere al pattern ${n7.pattern}` : `Invalid ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `Numero non valido: deve essere un multiplo di ${e7.divisor}`;
        case "unrecognized_keys":
          return `Chiav${e7.keys.length > 1 ? "i" : "e"} non riconosciut${e7.keys.length > 1 ? "e" : "a"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Chiave non valida in ${e7.origin}`;
        case "invalid_union":
        default:
          return "Input non valido";
        case "invalid_element":
          return `Valore non valido in ${e7.origin}`;
      }
    };
  };
  function ia() {
    return { localeError: ta() };
  }
  var ra = () => {
    const e6 = { string: { unit: "\u6587\u5B57", verb: "\u3067\u3042\u308B" }, file: { unit: "\u30D0\u30A4\u30C8", verb: "\u3067\u3042\u308B" }, array: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" }, set: { unit: "\u8981\u7D20", verb: "\u3067\u3042\u308B" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u5165\u529B\u5024", email: "\u30E1\u30FC\u30EB\u30A2\u30C9\u30EC\u30B9", url: "URL", emoji: "\u7D75\u6587\u5B57", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO\u65E5\u6642", date: "ISO\u65E5\u4ED8", time: "ISO\u6642\u523B", duration: "ISO\u671F\u9593", ipv4: "IPv4\u30A2\u30C9\u30EC\u30B9", ipv6: "IPv6\u30A2\u30C9\u30EC\u30B9", cidrv4: "IPv4\u7BC4\u56F2", cidrv6: "IPv6\u7BC4\u56F2", base64: "base64\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217", base64url: "base64url\u30A8\u30F3\u30B3\u30FC\u30C9\u6587\u5B57\u5217", json_string: "JSON\u6587\u5B57\u5217", e164: "E.164\u756A\u53F7", jwt: "JWT", template_literal: "\u5165\u529B\u5024" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u7121\u52B9\u306A\u5165\u529B: ${e7.expected}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F\u304C\u3001${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u6570\u5024";
              case "object":
                if (Array.isArray(e8))
                  return "\u914D\u5217";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}\u304C\u5165\u529B\u3055\u308C\u307E\u3057\u305F`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u7121\u52B9\u306A\u5165\u529B: ${B3(e7.values[0])}\u304C\u671F\u5F85\u3055\u308C\u307E\u3057\u305F` : `\u7121\u52B9\u306A\u9078\u629E: ${b(e7.values, "\u3001")}\u306E\u3044\u305A\u308C\u304B\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        case "too_big": {
          const t5 = e7.inclusive ? "\u4EE5\u4E0B\u3067\u3042\u308B" : "\u3088\u308A\u5C0F\u3055\u3044", o5 = n6(e7.origin);
          return o5 ? `\u5927\u304D\u3059\u304E\u308B\u5024: ${null != (i4 = e7.origin) ? i4 : "\u5024"}\u306F${e7.maximum.toString()}${null != (r3 = o5.unit) ? r3 : "\u8981\u7D20"}${t5}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059` : `\u5927\u304D\u3059\u304E\u308B\u5024: ${null != (a5 = e7.origin) ? a5 : "\u5024"}\u306F${e7.maximum.toString()}${t5}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? "\u4EE5\u4E0A\u3067\u3042\u308B" : "\u3088\u308A\u5927\u304D\u3044", i5 = n6(e7.origin);
          return i5 ? `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${e7.origin}\u306F${e7.minimum.toString()}${i5.unit}${t5}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059` : `\u5C0F\u3055\u3059\u304E\u308B\u5024: ${e7.origin}\u306F${e7.minimum.toString()}${t5}\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${n7.prefix}"\u3067\u59CB\u307E\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059` : "ends_with" === n7.format ? `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${n7.suffix}"\u3067\u7D42\u308F\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059` : "includes" === n7.format ? `\u7121\u52B9\u306A\u6587\u5B57\u5217: "${n7.includes}"\u3092\u542B\u3080\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059` : "regex" === n7.format ? `\u7121\u52B9\u306A\u6587\u5B57\u5217: \u30D1\u30BF\u30FC\u30F3${n7.pattern}\u306B\u4E00\u81F4\u3059\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059` : `\u7121\u52B9\u306A${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u7121\u52B9\u306A\u6570\u5024: ${e7.divisor}\u306E\u500D\u6570\u3067\u3042\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059`;
        case "unrecognized_keys":
          return `\u8A8D\u8B58\u3055\u308C\u3066\u3044\u306A\u3044\u30AD\u30FC${e7.keys.length > 1 ? "\u7FA4" : ""}: ${b(e7.keys, "\u3001")}`;
        case "invalid_key":
          return `${e7.origin}\u5185\u306E\u7121\u52B9\u306A\u30AD\u30FC`;
        case "invalid_union":
        default:
          return "\u7121\u52B9\u306A\u5165\u529B";
        case "invalid_element":
          return `${e7.origin}\u5185\u306E\u7121\u52B9\u306A\u5024`;
      }
    };
  };
  function aa() {
    return { localeError: ra() };
  }
  var oa = () => {
    const e6 = { string: { unit: "\u10E1\u10D8\u10DB\u10D1\u10DD\u10DA\u10DD", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" }, file: { unit: "\u10D1\u10D0\u10D8\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" }, array: { unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" }, set: { unit: "\u10D4\u10DA\u10D4\u10DB\u10D4\u10DC\u10E2\u10D8", verb: "\u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0", email: "\u10D4\u10DA-\u10E4\u10DD\u10E1\u10E2\u10D8\u10E1 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8", url: "URL", emoji: "\u10D4\u10DB\u10DD\u10EF\u10D8", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8-\u10D3\u10E0\u10DD", date: "\u10D7\u10D0\u10E0\u10D8\u10E6\u10D8", time: "\u10D3\u10E0\u10DD", duration: "\u10EE\u10D0\u10DC\u10D2\u10E0\u10EB\u10DA\u10D8\u10D5\u10DD\u10D1\u10D0", ipv4: "IPv4 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8", ipv6: "IPv6 \u10DB\u10D8\u10E1\u10D0\u10DB\u10D0\u10E0\u10D7\u10D8", cidrv4: "IPv4 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8", cidrv6: "IPv6 \u10D3\u10D8\u10D0\u10DE\u10D0\u10D6\u10DD\u10DC\u10D8", base64: "base64-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8", base64url: "base64url-\u10D9\u10DD\u10D3\u10D8\u10E0\u10D4\u10D1\u10E3\u10DA\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8", json_string: "JSON \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8", e164: "E.164 \u10DC\u10DD\u10DB\u10D4\u10E0\u10D8", jwt: "JWT", template_literal: "\u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0" };
    return (e7) => {
      var i4, r3, a5;
      switch (e7.code) {
        case "invalid_type":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${e7.expected}, \u10DB\u10D8\u10E6\u10D4\u10D1\u10E3\u10DA\u10D8 ${((e8) => {
            var n7;
            const t5 = typeof e8;
            switch (t5) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u10E0\u10D8\u10EA\u10EE\u10D5\u10D8";
              case "object":
                if (Array.isArray(e8))
                  return "\u10DB\u10D0\u10E1\u10D8\u10D5\u10D8";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return null != (n7 = { string: "\u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8", boolean: "\u10D1\u10E3\u10DA\u10D4\u10D0\u10DC\u10D8", undefined: "undefined", bigint: "bigint", symbol: "symbol", function: "\u10E4\u10E3\u10DC\u10E5\u10EA\u10D8\u10D0" }[t5]) ? n7 : t5;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${B3(e7.values[0])}` : `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D5\u10D0\u10E0\u10D8\u10D0\u10DC\u10E2\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8\u10D0 \u10D4\u10E0\u10D7-\u10D4\u10E0\u10D7\u10D8 ${b(e7.values, "|")}-\u10D3\u10D0\u10DC`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", a6 = n6(e7.origin);
          return a6 ? `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${null != (i4 = e7.origin) ? i4 : "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} ${a6.verb} ${t5}${e7.maximum.toString()} ${a6.unit}` : `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10D3\u10D8\u10D3\u10D8: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${null != (r3 = e7.origin) ? r3 : "\u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0"} \u10D8\u10E7\u10DD\u10E1 ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${e7.origin} ${i5.verb} ${t5}${e7.minimum.toString()} ${i5.unit}` : `\u10D6\u10D4\u10D3\u10DB\u10D4\u10E2\u10D0\u10D3 \u10DE\u10D0\u10E2\u10D0\u10E0\u10D0: \u10DB\u10DD\u10E1\u10D0\u10DA\u10DD\u10D3\u10DC\u10D4\u10DA\u10D8 ${e7.origin} \u10D8\u10E7\u10DD\u10E1 ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10EC\u10E7\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${n7.prefix}"-\u10D8\u10D7` : "ends_with" === n7.format ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10DB\u10D7\u10D0\u10D5\u10E0\u10D3\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 "${n7.suffix}"-\u10D8\u10D7` : "includes" === n7.format ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D8\u10EA\u10D0\u10D5\u10D3\u10D4\u10E1 "${n7.includes}"-\u10E1` : "regex" === n7.format ? `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E1\u10E2\u10E0\u10D8\u10DC\u10D2\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10E8\u10D4\u10D4\u10E1\u10D0\u10D1\u10D0\u10DB\u10D4\u10D1\u10DD\u10D3\u10D4\u10E1 \u10E8\u10D0\u10D1\u10DA\u10DD\u10DC\u10E1 ${n7.pattern}` : `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 ${null != (a5 = t4[n7.format]) ? a5 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E0\u10D8\u10EA\u10EE\u10D5\u10D8: \u10E3\u10DC\u10D3\u10D0 \u10D8\u10E7\u10DD\u10E1 ${e7.divisor}-\u10D8\u10E1 \u10EF\u10D4\u10E0\u10D0\u10D3\u10D8`;
        case "unrecognized_keys":
          return `\u10E3\u10EA\u10DC\u10DD\u10D1\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1${e7.keys.length > 1 ? "\u10D4\u10D1\u10D8" : "\u10D8"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10D2\u10D0\u10E1\u10D0\u10E6\u10D4\u10D1\u10D8 ${e7.origin}-\u10E8\u10D8`;
        case "invalid_union":
        default:
          return "\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10E8\u10D4\u10E7\u10D5\u10D0\u10DC\u10D0";
        case "invalid_element":
          return `\u10D0\u10E0\u10D0\u10E1\u10EC\u10DD\u10E0\u10D8 \u10DB\u10DC\u10D8\u10E8\u10D5\u10DC\u10D4\u10DA\u10DD\u10D1\u10D0 ${e7.origin}-\u10E8\u10D8`;
      }
    };
  };
  function sa() {
    return { localeError: oa() };
  }
  var ua = () => {
    const e6 = { string: { unit: "\u178F\u17BD\u17A2\u1780\u17D2\u179F\u179A", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" }, file: { unit: "\u1794\u17C3", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" }, array: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" }, set: { unit: "\u1792\u17B6\u178F\u17BB", verb: "\u1782\u17BD\u179A\u1798\u17B6\u1793" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B", email: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793\u17A2\u17CA\u17B8\u1798\u17C2\u179B", url: "URL", emoji: "\u179F\u1789\u17D2\u1789\u17B6\u17A2\u17B6\u179A\u1798\u17D2\u1798\u178E\u17CD", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 \u1793\u17B7\u1784\u1798\u17C9\u17C4\u1784 ISO", date: "\u1780\u17B6\u179B\u1794\u179A\u17B7\u1785\u17D2\u1786\u17C1\u1791 ISO", time: "\u1798\u17C9\u17C4\u1784 ISO", duration: "\u179A\u1799\u17C8\u1796\u17C1\u179B ISO", ipv4: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4", ipv6: "\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6", cidrv4: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv4", cidrv6: "\u178A\u17C2\u1793\u17A2\u17B6\u179F\u1799\u178A\u17D2\u178B\u17B6\u1793 IPv6", base64: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64", base64url: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u17A2\u17CA\u17B7\u1780\u17BC\u178A base64url", json_string: "\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A JSON", e164: "\u179B\u17C1\u1781 E.164", jwt: "JWT", template_literal: "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${e7.expected} \u1794\u17C9\u17BB\u1793\u17D2\u178F\u17C2\u1791\u1791\u17BD\u179B\u1794\u17B6\u1793 ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "\u1798\u17B7\u1793\u1798\u17C2\u1793\u1787\u17B6\u179B\u17C1\u1781 (NaN)" : "\u179B\u17C1\u1781";
              case "object":
                if (Array.isArray(e8))
                  return "\u17A2\u17B6\u179A\u17C1 (Array)";
                if (null === e8)
                  return "\u1782\u17D2\u1798\u17B6\u1793\u178F\u1798\u17D2\u179B\u17C3 (null)";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1794\u1789\u17D2\u1785\u17BC\u179B\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${B3(e7.values[0])}` : `\u1787\u1798\u17D2\u179A\u17BE\u179F\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1787\u17B6\u1798\u17BD\u1799\u1780\u17D2\u1793\u17BB\u1784\u1785\u17C6\u178E\u17C4\u1798 ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${null != (i4 = e7.origin) ? i4 : "\u178F\u1798\u17D2\u179B\u17C3"} ${t5} ${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u1792\u17B6\u178F\u17BB"}` : `\u1792\u17C6\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${null != (a5 = e7.origin) ? a5 : "\u178F\u1798\u17D2\u179B\u17C3"} ${t5} ${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${e7.origin} ${t5} ${e7.minimum.toString()} ${i5.unit}` : `\u178F\u17BC\u1785\u1796\u17C1\u1780\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1780\u17B6\u179A ${e7.origin} ${t5} ${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1785\u17B6\u1794\u17CB\u1795\u17D2\u178F\u17BE\u1798\u178A\u17C4\u1799 "${n7.prefix}"` : "ends_with" === n7.format ? `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1794\u1789\u17D2\u1785\u1794\u17CB\u178A\u17C4\u1799 "${n7.suffix}"` : "includes" === n7.format ? `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u1798\u17B6\u1793 "${n7.includes}"` : "regex" === n7.format ? `\u1781\u17D2\u179F\u17C2\u17A2\u1780\u17D2\u179F\u179A\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1795\u17D2\u1782\u17BC\u1795\u17D2\u1782\u1784\u1793\u17B9\u1784\u1791\u1798\u17D2\u179A\u1784\u17CB\u178A\u17C2\u179B\u1794\u17B6\u1793\u1780\u17C6\u178E\u178F\u17CB ${n7.pattern}` : `\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u179B\u17C1\u1781\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u17D6 \u178F\u17D2\u179A\u17BC\u179C\u178F\u17C2\u1787\u17B6\u1796\u17A0\u17BB\u1782\u17BB\u178E\u1793\u17C3 ${e7.divisor}`;
        case "unrecognized_keys":
          return `\u179A\u1780\u1783\u17BE\u1789\u179F\u17C4\u1798\u17B7\u1793\u179F\u17D2\u1782\u17B6\u179B\u17CB\u17D6 ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u179F\u17C4\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${e7.origin}`;
        case "invalid_union":
        default:
          return "\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C";
        case "invalid_element":
          return `\u1791\u17B7\u1793\u17D2\u1793\u1793\u17D0\u1799\u1798\u17B7\u1793\u178F\u17D2\u179A\u17B9\u1798\u178F\u17D2\u179A\u17BC\u179C\u1793\u17C5\u1780\u17D2\u1793\u17BB\u1784 ${e7.origin}`;
      }
    };
  };
  function la() {
    return { localeError: ua() };
  }
  function ca() {
    return la();
  }
  var da = () => {
    const e6 = { string: { unit: "\uBB38\uC790", verb: "to have" }, file: { unit: "\uBC14\uC774\uD2B8", verb: "to have" }, array: { unit: "\uAC1C", verb: "to have" }, set: { unit: "\uAC1C", verb: "to have" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\uC785\uB825", email: "\uC774\uBA54\uC77C \uC8FC\uC18C", url: "URL", emoji: "\uC774\uBAA8\uC9C0", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \uB0A0\uC9DC\uC2DC\uAC04", date: "ISO \uB0A0\uC9DC", time: "ISO \uC2DC\uAC04", duration: "ISO \uAE30\uAC04", ipv4: "IPv4 \uC8FC\uC18C", ipv6: "IPv6 \uC8FC\uC18C", cidrv4: "IPv4 \uBC94\uC704", cidrv6: "IPv6 \uBC94\uC704", base64: "base64 \uC778\uCF54\uB529 \uBB38\uC790\uC5F4", base64url: "base64url \uC778\uCF54\uB529 \uBB38\uC790\uC5F4", json_string: "JSON \uBB38\uC790\uC5F4", e164: "E.164 \uBC88\uD638", jwt: "JWT", template_literal: "\uC785\uB825" };
    return (e7) => {
      var i4, r3, a5, o4, s5, u3, l3;
      switch (e7.code) {
        case "invalid_type":
          return `\uC798\uBABB\uB41C \uC785\uB825: \uC608\uC0C1 \uD0C0\uC785\uC740 ${e7.expected}, \uBC1B\uC740 \uD0C0\uC785\uC740 ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}\uC785\uB2C8\uB2E4`;
        case "invalid_value":
          return 1 === e7.values.length ? `\uC798\uBABB\uB41C \uC785\uB825: \uAC12\uC740 ${B3(e7.values[0])} \uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4` : `\uC798\uBABB\uB41C \uC635\uC158: ${b(e7.values, "\uB610\uB294 ")} \uC911 \uD558\uB098\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
        case "too_big": {
          const t5 = e7.inclusive ? "\uC774\uD558" : "\uBBF8\uB9CC", o5 = "\uBBF8\uB9CC" === t5 ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4", s6 = n6(e7.origin), u4 = null != (i4 = null == s6 ? void 0 : s6.unit) ? i4 : "\uC694\uC18C";
          return s6 ? `${null != (r3 = e7.origin) ? r3 : "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${e7.maximum.toString()}${u4} ${t5}${o5}` : `${null != (a5 = e7.origin) ? a5 : "\uAC12"}\uC774 \uB108\uBB34 \uD07D\uB2C8\uB2E4: ${e7.maximum.toString()} ${t5}${o5}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? "\uC774\uC0C1" : "\uCD08\uACFC", i5 = "\uC774\uC0C1" === t5 ? "\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4" : "\uC5EC\uC57C \uD569\uB2C8\uB2E4", r4 = n6(e7.origin), a6 = null != (o4 = null == r4 ? void 0 : r4.unit) ? o4 : "\uC694\uC18C";
          return r4 ? `${null != (s5 = e7.origin) ? s5 : "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${e7.minimum.toString()}${a6} ${t5}${i5}` : `${null != (u3 = e7.origin) ? u3 : "\uAC12"}\uC774 \uB108\uBB34 \uC791\uC2B5\uB2C8\uB2E4: ${e7.minimum.toString()} ${t5}${i5}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${n7.prefix}"(\uC73C)\uB85C \uC2DC\uC791\uD574\uC57C \uD569\uB2C8\uB2E4` : "ends_with" === n7.format ? `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${n7.suffix}"(\uC73C)\uB85C \uB05D\uB098\uC57C \uD569\uB2C8\uB2E4` : "includes" === n7.format ? `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: "${n7.includes}"\uC744(\uB97C) \uD3EC\uD568\uD574\uC57C \uD569\uB2C8\uB2E4` : "regex" === n7.format ? `\uC798\uBABB\uB41C \uBB38\uC790\uC5F4: \uC815\uADDC\uC2DD ${n7.pattern} \uD328\uD134\uACFC \uC77C\uCE58\uD574\uC57C \uD569\uB2C8\uB2E4` : `\uC798\uBABB\uB41C ${null != (l3 = t4[n7.format]) ? l3 : e7.format}`;
        }
        case "not_multiple_of":
          return `\uC798\uBABB\uB41C \uC22B\uC790: ${e7.divisor}\uC758 \uBC30\uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4`;
        case "unrecognized_keys":
          return `\uC778\uC2DD\uD560 \uC218 \uC5C6\uB294 \uD0A4: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\uC798\uBABB\uB41C \uD0A4: ${e7.origin}`;
        case "invalid_union":
        default:
          return "\uC798\uBABB\uB41C \uC785\uB825";
        case "invalid_element":
          return `\uC798\uBABB\uB41C \uAC12: ${e7.origin}`;
      }
    };
  };
  function ma() {
    return { localeError: da() };
  }
  var pa = (e6, n6 = void 0) => {
    switch (e6) {
      case "number":
        return Number.isNaN(n6) ? "NaN" : "skai\u010Dius";
      case "bigint":
        return "sveikasis skai\u010Dius";
      case "string":
        return "eilut\u0117";
      case "boolean":
        return "login\u0117 reik\u0161m\u0117";
      case "undefined":
      case "void":
        return "neapibr\u0117\u017Eta reik\u0161m\u0117";
      case "function":
        return "funkcija";
      case "symbol":
        return "simbolis";
      case "object":
        return void 0 === n6 ? "ne\u017Einomas objektas" : null === n6 ? "nulin\u0117 reik\u0161m\u0117" : Array.isArray(n6) ? "masyvas" : Object.getPrototypeOf(n6) !== Object.prototype && n6.constructor ? n6.constructor.name : "objektas";
      case "null":
        return "nulin\u0117 reik\u0161m\u0117";
    }
    return e6;
  };
  var va = (e6) => e6.charAt(0).toUpperCase() + e6.slice(1);
  function fa(e6) {
    const n6 = Math.abs(e6), t4 = n6 % 10, i4 = n6 % 100;
    return i4 >= 11 && i4 <= 19 || 0 === t4 ? "many" : 1 === t4 ? "one" : "few";
  }
  var ga = () => {
    const e6 = { string: { unit: { one: "simbolis", few: "simboliai", many: "simboli\u0173" }, verb: { smaller: { inclusive: "turi b\u016Bti ne ilgesn\u0117 kaip", notInclusive: "turi b\u016Bti trumpesn\u0117 kaip" }, bigger: { inclusive: "turi b\u016Bti ne trumpesn\u0117 kaip", notInclusive: "turi b\u016Bti ilgesn\u0117 kaip" } } }, file: { unit: { one: "baitas", few: "baitai", many: "bait\u0173" }, verb: { smaller: { inclusive: "turi b\u016Bti ne didesnis kaip", notInclusive: "turi b\u016Bti ma\u017Eesnis kaip" }, bigger: { inclusive: "turi b\u016Bti ne ma\u017Eesnis kaip", notInclusive: "turi b\u016Bti didesnis kaip" } } }, array: { unit: { one: "element\u0105", few: "elementus", many: "element\u0173" }, verb: { smaller: { inclusive: "turi tur\u0117ti ne daugiau kaip", notInclusive: "turi tur\u0117ti ma\u017Eiau kaip" }, bigger: { inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip", notInclusive: "turi tur\u0117ti daugiau kaip" } } }, set: { unit: { one: "element\u0105", few: "elementus", many: "element\u0173" }, verb: { smaller: { inclusive: "turi tur\u0117ti ne daugiau kaip", notInclusive: "turi tur\u0117ti ma\u017Eiau kaip" }, bigger: { inclusive: "turi tur\u0117ti ne ma\u017Eiau kaip", notInclusive: "turi tur\u0117ti daugiau kaip" } } } };
    function n6(n7, t5, i4, r3) {
      var a5;
      const o4 = null != (a5 = e6[n7]) ? a5 : null;
      return null === o4 ? o4 : { unit: o4.unit[t5], verb: o4.verb[r3][i4 ? "inclusive" : "notInclusive"] };
    }
    const t4 = { regex: "\u012Fvestis", email: "el. pa\u0161to adresas", url: "URL", emoji: "jaustukas", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO data ir laikas", date: "ISO data", time: "ISO laikas", duration: "ISO trukm\u0117", ipv4: "IPv4 adresas", ipv6: "IPv6 adresas", cidrv4: "IPv4 tinklo prefiksas (CIDR)", cidrv6: "IPv6 tinklo prefiksas (CIDR)", base64: "base64 u\u017Ekoduota eilut\u0117", base64url: "base64url u\u017Ekoduota eilut\u0117", json_string: "JSON eilut\u0117", e164: "E.164 numeris", jwt: "JWT", template_literal: "\u012Fvestis" };
    return (e7) => {
      var i4, r3, a5, o4, s5, u3, l3, c3, d2, m2, p2;
      switch (e7.code) {
        case "invalid_type":
          return `Gautas tipas ${p2 = e7.input, pa(typeof p2, p2)}, o tik\u0117tasi - ${pa(e7.expected)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Privalo b\u016Bti ${B3(e7.values[0])}` : `Privalo b\u016Bti vienas i\u0161 ${b(e7.values, "|")} pasirinkim\u0173`;
        case "too_big": {
          const t5 = pa(e7.origin), s6 = n6(e7.origin, fa(Number(e7.maximum)), null != (i4 = e7.inclusive) && i4, "smaller");
          if (null == s6 ? void 0 : s6.verb)
            return `${va(null != (r3 = null != t5 ? t5 : e7.origin) ? r3 : "reik\u0161m\u0117")} ${s6.verb} ${e7.maximum.toString()} ${null != (a5 = s6.unit) ? a5 : "element\u0173"}`;
          const u4 = e7.inclusive ? "ne didesnis kaip" : "ma\u017Eesnis kaip";
          return `${va(null != (o4 = null != t5 ? t5 : e7.origin) ? o4 : "reik\u0161m\u0117")} turi b\u016Bti ${u4} ${e7.maximum.toString()} ${null == s6 ? void 0 : s6.unit}`;
        }
        case "too_small": {
          const t5 = pa(e7.origin), i5 = n6(e7.origin, fa(Number(e7.minimum)), null != (s5 = e7.inclusive) && s5, "bigger");
          if (null == i5 ? void 0 : i5.verb)
            return `${va(null != (u3 = null != t5 ? t5 : e7.origin) ? u3 : "reik\u0161m\u0117")} ${i5.verb} ${e7.minimum.toString()} ${null != (l3 = i5.unit) ? l3 : "element\u0173"}`;
          const r4 = e7.inclusive ? "ne ma\u017Eesnis kaip" : "didesnis kaip";
          return `${va(null != (c3 = null != t5 ? t5 : e7.origin) ? c3 : "reik\u0161m\u0117")} turi b\u016Bti ${r4} ${e7.minimum.toString()} ${null == i5 ? void 0 : i5.unit}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Eilut\u0117 privalo prasid\u0117ti "${n7.prefix}"` : "ends_with" === n7.format ? `Eilut\u0117 privalo pasibaigti "${n7.suffix}"` : "includes" === n7.format ? `Eilut\u0117 privalo \u012Ftraukti "${n7.includes}"` : "regex" === n7.format ? `Eilut\u0117 privalo atitikti ${n7.pattern}` : `Neteisingas ${null != (d2 = t4[n7.format]) ? d2 : e7.format}`;
        }
        case "not_multiple_of":
          return `Skai\u010Dius privalo b\u016Bti ${e7.divisor} kartotinis.`;
        case "unrecognized_keys":
          return `Neatpa\u017Eint${e7.keys.length > 1 ? "i" : "as"} rakt${e7.keys.length > 1 ? "ai" : "as"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return "Rastas klaidingas raktas";
        case "invalid_union":
        default:
          return "Klaidinga \u012Fvestis";
        case "invalid_element": {
          const n7 = pa(e7.origin);
          return `${va(null != (m2 = null != n7 ? n7 : e7.origin) ? m2 : "reik\u0161m\u0117")} turi klaiding\u0105 \u012Fvest\u012F`;
        }
      }
    };
  };
  function ha() {
    return { localeError: ga() };
  }
  var ba = () => {
    const e6 = { string: { unit: "\u0437\u043D\u0430\u0446\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" }, file: { unit: "\u0431\u0430\u0458\u0442\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" }, array: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" }, set: { unit: "\u0441\u0442\u0430\u0432\u043A\u0438", verb: "\u0434\u0430 \u0438\u043C\u0430\u0430\u0442" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0432\u043D\u0435\u0441", email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u043D\u0430 \u0435-\u043F\u043E\u0448\u0442\u0430", url: "URL", emoji: "\u0435\u043C\u043E\u045F\u0438", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u0434\u0430\u0442\u0443\u043C \u0438 \u0432\u0440\u0435\u043C\u0435", date: "ISO \u0434\u0430\u0442\u0443\u043C", time: "ISO \u0432\u0440\u0435\u043C\u0435", duration: "ISO \u0432\u0440\u0435\u043C\u0435\u0442\u0440\u0430\u0435\u045A\u0435", ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441\u0430", ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441\u0430", cidrv4: "IPv4 \u043E\u043F\u0441\u0435\u0433", cidrv6: "IPv6 \u043E\u043F\u0441\u0435\u0433", base64: "base64-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430", base64url: "base64url-\u0435\u043D\u043A\u043E\u0434\u0438\u0440\u0430\u043D\u0430 \u043D\u0438\u0437\u0430", json_string: "JSON \u043D\u0438\u0437\u0430", e164: "E.164 \u0431\u0440\u043E\u0458", jwt: "JWT", template_literal: "\u0432\u043D\u0435\u0441" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${e7.expected}, \u043F\u0440\u0438\u043C\u0435\u043D\u043E ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u0431\u0440\u043E\u0458";
              case "object":
                if (Array.isArray(e8))
                  return "\u043D\u0438\u0437\u0430";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Invalid input: expected ${B3(e7.values[0])}` : `\u0413\u0440\u0435\u0448\u0430\u043D\u0430 \u043E\u043F\u0446\u0438\u0458\u0430: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 \u0435\u0434\u043D\u0430 ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${null != (i4 = e7.origin) ? i4 : "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0438\u043C\u0430 ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0438"}` : `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u0433\u043E\u043B\u0435\u043C: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${null != (a5 = e7.origin) ? a5 : "\u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442\u0430"} \u0434\u0430 \u0431\u0438\u0434\u0435 ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${e7.origin} \u0434\u0430 \u0438\u043C\u0430 ${t5}${e7.minimum.toString()} ${i5.unit}` : `\u041F\u0440\u0435\u043C\u043D\u043E\u0433\u0443 \u043C\u0430\u043B: \u0441\u0435 \u043E\u0447\u0435\u043A\u0443\u0432\u0430 ${e7.origin} \u0434\u0430 \u0431\u0438\u0434\u0435 ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u043F\u043E\u0447\u043D\u0443\u0432\u0430 \u0441\u043E "${n7.prefix}"` : "ends_with" === n7.format ? `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0437\u0430\u0432\u0440\u0448\u0443\u0432\u0430 \u0441\u043E "${n7.suffix}"` : "includes" === n7.format ? `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0432\u043A\u043B\u0443\u0447\u0443\u0432\u0430 "${n7.includes}"` : "regex" === n7.format ? `\u041D\u0435\u0432\u0430\u0436\u0435\u0447\u043A\u0430 \u043D\u0438\u0437\u0430: \u043C\u043E\u0440\u0430 \u0434\u0430 \u043E\u0434\u0433\u043E\u0430\u0440\u0430 \u043D\u0430 \u043F\u0430\u0442\u0435\u0440\u043D\u043E\u0442 ${n7.pattern}` : `Invalid ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u0431\u0440\u043E\u0458: \u043C\u043E\u0440\u0430 \u0434\u0430 \u0431\u0438\u0434\u0435 \u0434\u0435\u043B\u0438\u0432 \u0441\u043E ${e7.divisor}`;
        case "unrecognized_keys":
          return `${e7.keys.length > 1 ? "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D\u0438 \u043A\u043B\u0443\u0447\u0435\u0432\u0438" : "\u041D\u0435\u043F\u0440\u0435\u043F\u043E\u0437\u043D\u0430\u0435\u043D \u043A\u043B\u0443\u0447"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u0413\u0440\u0435\u0448\u0435\u043D \u043A\u043B\u0443\u0447 \u0432\u043E ${e7.origin}`;
        case "invalid_union":
        default:
          return "\u0413\u0440\u0435\u0448\u0435\u043D \u0432\u043D\u0435\u0441";
        case "invalid_element":
          return `\u0413\u0440\u0435\u0448\u043D\u0430 \u0432\u0440\u0435\u0434\u043D\u043E\u0441\u0442 \u0432\u043E ${e7.origin}`;
      }
    };
  };
  function ya() {
    return { localeError: ba() };
  }
  var $a = () => {
    const e6 = { string: { unit: "aksara", verb: "mempunyai" }, file: { unit: "bait", verb: "mempunyai" }, array: { unit: "elemen", verb: "mempunyai" }, set: { unit: "elemen", verb: "mempunyai" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "input", email: "alamat e-mel", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "tarikh masa ISO", date: "tarikh ISO", time: "masa ISO", duration: "tempoh ISO", ipv4: "alamat IPv4", ipv6: "alamat IPv6", cidrv4: "julat IPv4", cidrv6: "julat IPv6", base64: "string dikodkan base64", base64url: "string dikodkan base64url", json_string: "string JSON", e164: "nombor E.164", jwt: "JWT", template_literal: "input" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Input tidak sah: dijangka ${e7.expected}, diterima ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "nombor";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Input tidak sah: dijangka ${B3(e7.values[0])}` : `Pilihan tidak sah: dijangka salah satu daripada ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Terlalu besar: dijangka ${null != (i4 = e7.origin) ? i4 : "nilai"} ${o5.verb} ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elemen"}` : `Terlalu besar: dijangka ${null != (a5 = e7.origin) ? a5 : "nilai"} adalah ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Terlalu kecil: dijangka ${e7.origin} ${i5.verb} ${t5}${e7.minimum.toString()} ${i5.unit}` : `Terlalu kecil: dijangka ${e7.origin} adalah ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `String tidak sah: mesti bermula dengan "${n7.prefix}"` : "ends_with" === n7.format ? `String tidak sah: mesti berakhir dengan "${n7.suffix}"` : "includes" === n7.format ? `String tidak sah: mesti mengandungi "${n7.includes}"` : "regex" === n7.format ? `String tidak sah: mesti sepadan dengan corak ${n7.pattern}` : `${null != (o4 = t4[n7.format]) ? o4 : e7.format} tidak sah`;
        }
        case "not_multiple_of":
          return `Nombor tidak sah: perlu gandaan ${e7.divisor}`;
        case "unrecognized_keys":
          return `Kunci tidak dikenali: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Kunci tidak sah dalam ${e7.origin}`;
        case "invalid_union":
        default:
          return "Input tidak sah";
        case "invalid_element":
          return `Nilai tidak sah dalam ${e7.origin}`;
      }
    };
  };
  function _a() {
    return { localeError: $a() };
  }
  var ka = () => {
    const e6 = { string: { unit: "tekens" }, file: { unit: "bytes" }, array: { unit: "elementen" }, set: { unit: "elementen" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "invoer", email: "emailadres", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO datum en tijd", date: "ISO datum", time: "ISO tijd", duration: "ISO duur", ipv4: "IPv4-adres", ipv6: "IPv6-adres", cidrv4: "IPv4-bereik", cidrv6: "IPv6-bereik", base64: "base64-gecodeerde tekst", base64url: "base64 URL-gecodeerde tekst", json_string: "JSON string", e164: "E.164-nummer", jwt: "JWT", template_literal: "invoer" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Ongeldige invoer: verwacht ${e7.expected}, ontving ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "getal";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Ongeldige invoer: verwacht ${B3(e7.values[0])}` : `Ongeldige optie: verwacht \xE9\xE9n van ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Te lang: verwacht dat ${null != (i4 = e7.origin) ? i4 : "waarde"} ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elementen"} bevat` : `Te lang: verwacht dat ${null != (a5 = e7.origin) ? a5 : "waarde"} ${t5}${e7.maximum.toString()} is`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Te kort: verwacht dat ${e7.origin} ${t5}${e7.minimum.toString()} ${i5.unit} bevat` : `Te kort: verwacht dat ${e7.origin} ${t5}${e7.minimum.toString()} is`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Ongeldige tekst: moet met "${n7.prefix}" beginnen` : "ends_with" === n7.format ? `Ongeldige tekst: moet op "${n7.suffix}" eindigen` : "includes" === n7.format ? `Ongeldige tekst: moet "${n7.includes}" bevatten` : "regex" === n7.format ? `Ongeldige tekst: moet overeenkomen met patroon ${n7.pattern}` : `Ongeldig: ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `Ongeldig getal: moet een veelvoud van ${e7.divisor} zijn`;
        case "unrecognized_keys":
          return `Onbekende key${e7.keys.length > 1 ? "s" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Ongeldige key in ${e7.origin}`;
        case "invalid_union":
        default:
          return "Ongeldige invoer";
        case "invalid_element":
          return `Ongeldige waarde in ${e7.origin}`;
      }
    };
  };
  function wa() {
    return { localeError: ka() };
  }
  var Ia = () => {
    const e6 = { string: { unit: "tegn", verb: "\xE5 ha" }, file: { unit: "bytes", verb: "\xE5 ha" }, array: { unit: "elementer", verb: "\xE5 inneholde" }, set: { unit: "elementer", verb: "\xE5 inneholde" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "input", email: "e-postadresse", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO dato- og klokkeslett", date: "ISO-dato", time: "ISO-klokkeslett", duration: "ISO-varighet", ipv4: "IPv4-omr\xE5de", ipv6: "IPv6-omr\xE5de", cidrv4: "IPv4-spekter", cidrv6: "IPv6-spekter", base64: "base64-enkodet streng", base64url: "base64url-enkodet streng", json_string: "JSON-streng", e164: "E.164-nummer", jwt: "JWT", template_literal: "input" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Ugyldig input: forventet ${e7.expected}, fikk ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "tall";
              case "object":
                if (Array.isArray(e8))
                  return "liste";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Ugyldig verdi: forventet ${B3(e7.values[0])}` : `Ugyldig valg: forventet en av ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `For stor(t): forventet ${null != (i4 = e7.origin) ? i4 : "value"} til \xE5 ha ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elementer"}` : `For stor(t): forventet ${null != (a5 = e7.origin) ? a5 : "value"} til \xE5 ha ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `For lite(n): forventet ${e7.origin} til \xE5 ha ${t5}${e7.minimum.toString()} ${i5.unit}` : `For lite(n): forventet ${e7.origin} til \xE5 ha ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Ugyldig streng: m\xE5 starte med "${n7.prefix}"` : "ends_with" === n7.format ? `Ugyldig streng: m\xE5 ende med "${n7.suffix}"` : "includes" === n7.format ? `Ugyldig streng: m\xE5 inneholde "${n7.includes}"` : "regex" === n7.format ? `Ugyldig streng: m\xE5 matche m\xF8nsteret ${n7.pattern}` : `Ugyldig ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `Ugyldig tall: m\xE5 v\xE6re et multiplum av ${e7.divisor}`;
        case "unrecognized_keys":
          return `${e7.keys.length > 1 ? "Ukjente n\xF8kler" : "Ukjent n\xF8kkel"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Ugyldig n\xF8kkel i ${e7.origin}`;
        case "invalid_union":
        default:
          return "Ugyldig input";
        case "invalid_element":
          return `Ugyldig verdi i ${e7.origin}`;
      }
    };
  };
  function Sa() {
    return { localeError: Ia() };
  }
  var za = () => {
    const e6 = { string: { unit: "harf", verb: "olmal\u0131d\u0131r" }, file: { unit: "bayt", verb: "olmal\u0131d\u0131r" }, array: { unit: "unsur", verb: "olmal\u0131d\u0131r" }, set: { unit: "unsur", verb: "olmal\u0131d\u0131r" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "giren", email: "epostag\xE2h", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO heng\xE2m\u0131", date: "ISO tarihi", time: "ISO zaman\u0131", duration: "ISO m\xFCddeti", ipv4: "IPv4 ni\u015F\xE2n\u0131", ipv6: "IPv6 ni\u015F\xE2n\u0131", cidrv4: "IPv4 menzili", cidrv6: "IPv6 menzili", base64: "base64-\u015Fifreli metin", base64url: "base64url-\u015Fifreli metin", json_string: "JSON metin", e164: "E.164 say\u0131s\u0131", jwt: "JWT", template_literal: "giren" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `F\xE2sit giren: umulan ${e7.expected}, al\u0131nan ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "numara";
              case "object":
                if (Array.isArray(e8))
                  return "saf";
                if (null === e8)
                  return "gayb";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `F\xE2sit giren: umulan ${B3(e7.values[0])}` : `F\xE2sit tercih: m\xFBteberler ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Fazla b\xFCy\xFCk: ${null != (i4 = e7.origin) ? i4 : "value"}, ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elements"} sahip olmal\u0131yd\u0131.` : `Fazla b\xFCy\xFCk: ${null != (a5 = e7.origin) ? a5 : "value"}, ${t5}${e7.maximum.toString()} olmal\u0131yd\u0131.`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Fazla k\xFC\xE7\xFCk: ${e7.origin}, ${t5}${e7.minimum.toString()} ${i5.unit} sahip olmal\u0131yd\u0131.` : `Fazla k\xFC\xE7\xFCk: ${e7.origin}, ${t5}${e7.minimum.toString()} olmal\u0131yd\u0131.`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `F\xE2sit metin: "${n7.prefix}" ile ba\u015Flamal\u0131.` : "ends_with" === n7.format ? `F\xE2sit metin: "${n7.suffix}" ile bitmeli.` : "includes" === n7.format ? `F\xE2sit metin: "${n7.includes}" ihtiv\xE2 etmeli.` : "regex" === n7.format ? `F\xE2sit metin: ${n7.pattern} nak\u015F\u0131na uymal\u0131.` : `F\xE2sit ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `F\xE2sit say\u0131: ${e7.divisor} kat\u0131 olmal\u0131yd\u0131.`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan anahtar ${e7.keys.length > 1 ? "s" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `${e7.origin} i\xE7in tan\u0131nmayan anahtar var.`;
        case "invalid_union":
          return "Giren tan\u0131namad\u0131.";
        case "invalid_element":
          return `${e7.origin} i\xE7in tan\u0131nmayan k\u0131ymet var.`;
        default:
          return "K\u0131ymet tan\u0131namad\u0131.";
      }
    };
  };
  function xa() {
    return { localeError: za() };
  }
  var ja = () => {
    const e6 = { string: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" }, file: { unit: "\u0628\u0627\u06CC\u067C\u0633", verb: "\u0648\u0644\u0631\u064A" }, array: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" }, set: { unit: "\u062A\u0648\u06A9\u064A", verb: "\u0648\u0644\u0631\u064A" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0648\u0631\u0648\u062F\u064A", email: "\u0628\u0631\u06CC\u069A\u0646\u0627\u0644\u06CC\u06A9", url: "\u06CC\u0648 \u0622\u0631 \u0627\u0644", emoji: "\u0627\u06CC\u0645\u0648\u062C\u064A", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u0646\u06CC\u067C\u0647 \u0627\u0648 \u0648\u062E\u062A", date: "\u0646\u06D0\u067C\u0647", time: "\u0648\u062E\u062A", duration: "\u0645\u0648\u062F\u0647", ipv4: "\u062F IPv4 \u067E\u062A\u0647", ipv6: "\u062F IPv6 \u067E\u062A\u0647", cidrv4: "\u062F IPv4 \u0633\u0627\u062D\u0647", cidrv6: "\u062F IPv6 \u0633\u0627\u062D\u0647", base64: "base64-encoded \u0645\u062A\u0646", base64url: "base64url-encoded \u0645\u062A\u0646", json_string: "JSON \u0645\u062A\u0646", e164: "\u062F E.164 \u0634\u0645\u06D0\u0631\u0647", jwt: "JWT", template_literal: "\u0648\u0631\u0648\u062F\u064A" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${e7.expected} \u0648\u0627\u06CC, \u0645\u06AB\u0631 ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u0639\u062F\u062F";
              case "object":
                if (Array.isArray(e8))
                  return "\u0627\u0631\u06D0";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)} \u062A\u0631\u0644\u0627\u0633\u0647 \u0634\u0648`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u0646\u0627\u0633\u0645 \u0648\u0631\u0648\u062F\u064A: \u0628\u0627\u06CC\u062F ${B3(e7.values[0])} \u0648\u0627\u06CC` : `\u0646\u0627\u0633\u0645 \u0627\u0646\u062A\u062E\u0627\u0628: \u0628\u0627\u06CC\u062F \u06CC\u0648 \u0644\u0647 ${b(e7.values, "|")} \u0685\u062E\u0647 \u0648\u0627\u06CC`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${null != (i4 = e7.origin) ? i4 : "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u0639\u0646\u0635\u0631\u0648\u0646\u0647"} \u0648\u0644\u0631\u064A` : `\u0689\u06CC\u0631 \u0644\u0648\u06CC: ${null != (a5 = e7.origin) ? a5 : "\u0627\u0631\u0632\u069A\u062A"} \u0628\u0627\u06CC\u062F ${t5}${e7.maximum.toString()} \u0648\u064A`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${e7.origin} \u0628\u0627\u06CC\u062F ${t5}${e7.minimum.toString()} ${i5.unit} \u0648\u0644\u0631\u064A` : `\u0689\u06CC\u0631 \u06A9\u0648\u0686\u0646\u06CC: ${e7.origin} \u0628\u0627\u06CC\u062F ${t5}${e7.minimum.toString()} \u0648\u064A`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${n7.prefix}" \u0633\u0631\u0647 \u067E\u06CC\u0644 \u0634\u064A` : "ends_with" === n7.format ? `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F "${n7.suffix}" \u0633\u0631\u0647 \u067E\u0627\u06CC \u062A\u0647 \u0648\u0631\u0633\u064A\u0696\u064A` : "includes" === n7.format ? `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F "${n7.includes}" \u0648\u0644\u0631\u064A` : "regex" === n7.format ? `\u0646\u0627\u0633\u0645 \u0645\u062A\u0646: \u0628\u0627\u06CC\u062F \u062F ${n7.pattern} \u0633\u0631\u0647 \u0645\u0637\u0627\u0628\u0642\u062A \u0648\u0644\u0631\u064A` : `${null != (o4 = t4[n7.format]) ? o4 : e7.format} \u0646\u0627\u0633\u0645 \u062F\u06CC`;
        }
        case "not_multiple_of":
          return `\u0646\u0627\u0633\u0645 \u0639\u062F\u062F: \u0628\u0627\u06CC\u062F \u062F ${e7.divisor} \u0645\u0636\u0631\u0628 \u0648\u064A`;
        case "unrecognized_keys":
          return `\u0646\u0627\u0633\u0645 ${e7.keys.length > 1 ? "\u06A9\u0644\u06CC\u0689\u0648\u0646\u0647" : "\u06A9\u0644\u06CC\u0689"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u0646\u0627\u0633\u0645 \u06A9\u0644\u06CC\u0689 \u067E\u0647 ${e7.origin} \u06A9\u06D0`;
        case "invalid_union":
        default:
          return "\u0646\u0627\u0633\u0645\u0647 \u0648\u0631\u0648\u062F\u064A";
        case "invalid_element":
          return `\u0646\u0627\u0633\u0645 \u0639\u0646\u0635\u0631 \u067E\u0647 ${e7.origin} \u06A9\u06D0`;
      }
    };
  };
  function Oa() {
    return { localeError: ja() };
  }
  var Ua = () => {
    const e6 = { string: { unit: "znak\xF3w", verb: "mie\u0107" }, file: { unit: "bajt\xF3w", verb: "mie\u0107" }, array: { unit: "element\xF3w", verb: "mie\u0107" }, set: { unit: "element\xF3w", verb: "mie\u0107" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "wyra\u017Cenie", email: "adres email", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "data i godzina w formacie ISO", date: "data w formacie ISO", time: "godzina w formacie ISO", duration: "czas trwania ISO", ipv4: "adres IPv4", ipv6: "adres IPv6", cidrv4: "zakres IPv4", cidrv6: "zakres IPv6", base64: "ci\u0105g znak\xF3w zakodowany w formacie base64", base64url: "ci\u0105g znak\xF3w zakodowany w formacie base64url", json_string: "ci\u0105g znak\xF3w w formacie JSON", e164: "liczba E.164", jwt: "JWT", template_literal: "wej\u015Bcie" };
    return (e7) => {
      var i4, r3, a5, o4, s5, u3, l3;
      switch (e7.code) {
        case "invalid_type":
          return `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${e7.expected}, otrzymano ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "liczba";
              case "object":
                if (Array.isArray(e8))
                  return "tablica";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Nieprawid\u0142owe dane wej\u015Bciowe: oczekiwano ${B3(e7.values[0])}` : `Nieprawid\u0142owa opcja: oczekiwano jednej z warto\u015Bci ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Za du\u017Ca warto\u015B\u0107: oczekiwano, \u017Ce ${null != (i4 = e7.origin) ? i4 : "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "element\xF3w"}` : `Zbyt du\u017C(y/a/e): oczekiwano, \u017Ce ${null != (a5 = e7.origin) ? a5 : "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Za ma\u0142a warto\u015B\u0107: oczekiwano, \u017Ce ${null != (o4 = e7.origin) ? o4 : "warto\u015B\u0107"} b\u0119dzie mie\u0107 ${t5}${e7.minimum.toString()} ${null != (s5 = i5.unit) ? s5 : "element\xF3w"}` : `Zbyt ma\u0142(y/a/e): oczekiwano, \u017Ce ${null != (u3 = e7.origin) ? u3 : "warto\u015B\u0107"} b\u0119dzie wynosi\u0107 ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zaczyna\u0107 si\u0119 od "${n7.prefix}"` : "ends_with" === n7.format ? `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi ko\u0144czy\u0107 si\u0119 na "${n7.suffix}"` : "includes" === n7.format ? `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi zawiera\u0107 "${n7.includes}"` : "regex" === n7.format ? `Nieprawid\u0142owy ci\u0105g znak\xF3w: musi odpowiada\u0107 wzorcowi ${n7.pattern}` : `Nieprawid\u0142ow(y/a/e) ${null != (l3 = t4[n7.format]) ? l3 : e7.format}`;
        }
        case "not_multiple_of":
          return `Nieprawid\u0142owa liczba: musi by\u0107 wielokrotno\u015Bci\u0105 ${e7.divisor}`;
        case "unrecognized_keys":
          return `Nierozpoznane klucze${e7.keys.length > 1 ? "s" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Nieprawid\u0142owy klucz w ${e7.origin}`;
        case "invalid_union":
        default:
          return "Nieprawid\u0142owe dane wej\u015Bciowe";
        case "invalid_element":
          return `Nieprawid\u0142owa warto\u015B\u0107 w ${e7.origin}`;
      }
    };
  };
  function Na() {
    return { localeError: Ua() };
  }
  var Pa = () => {
    const e6 = { string: { unit: "caracteres", verb: "ter" }, file: { unit: "bytes", verb: "ter" }, array: { unit: "itens", verb: "ter" }, set: { unit: "itens", verb: "ter" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "padr\xE3o", email: "endere\xE7o de e-mail", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "data e hora ISO", date: "data ISO", time: "hora ISO", duration: "dura\xE7\xE3o ISO", ipv4: "endere\xE7o IPv4", ipv6: "endere\xE7o IPv6", cidrv4: "faixa de IPv4", cidrv6: "faixa de IPv6", base64: "texto codificado em base64", base64url: "URL codificada em base64", json_string: "texto JSON", e164: "n\xFAmero E.164", jwt: "JWT", template_literal: "entrada" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Tipo inv\xE1lido: esperado ${e7.expected}, recebido ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "n\xFAmero";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "nulo";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Entrada inv\xE1lida: esperado ${B3(e7.values[0])}` : `Op\xE7\xE3o inv\xE1lida: esperada uma das ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Muito grande: esperado que ${null != (i4 = e7.origin) ? i4 : "valor"} tivesse ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elementos"}` : `Muito grande: esperado que ${null != (a5 = e7.origin) ? a5 : "valor"} fosse ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Muito pequeno: esperado que ${e7.origin} tivesse ${t5}${e7.minimum.toString()} ${i5.unit}` : `Muito pequeno: esperado que ${e7.origin} fosse ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Texto inv\xE1lido: deve come\xE7ar com "${n7.prefix}"` : "ends_with" === n7.format ? `Texto inv\xE1lido: deve terminar com "${n7.suffix}"` : "includes" === n7.format ? `Texto inv\xE1lido: deve incluir "${n7.includes}"` : "regex" === n7.format ? `Texto inv\xE1lido: deve corresponder ao padr\xE3o ${n7.pattern}` : `${null != (o4 = t4[n7.format]) ? o4 : e7.format} inv\xE1lido`;
        }
        case "not_multiple_of":
          return `N\xFAmero inv\xE1lido: deve ser m\xFAltiplo de ${e7.divisor}`;
        case "unrecognized_keys":
          return `Chave${e7.keys.length > 1 ? "s" : ""} desconhecida${e7.keys.length > 1 ? "s" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Chave inv\xE1lida em ${e7.origin}`;
        case "invalid_union":
          return "Entrada inv\xE1lida";
        case "invalid_element":
          return `Valor inv\xE1lido em ${e7.origin}`;
        default:
          return "Campo inv\xE1lido";
      }
    };
  };
  function Da() {
    return { localeError: Pa() };
  }
  function Za(e6, n6, t4, i4) {
    const r3 = Math.abs(e6), a5 = r3 % 10, o4 = r3 % 100;
    return o4 >= 11 && o4 <= 19 ? i4 : 1 === a5 ? n6 : a5 >= 2 && a5 <= 4 ? t4 : i4;
  }
  var Ea = () => {
    const e6 = { string: { unit: { one: "\u0441\u0438\u043C\u0432\u043E\u043B", few: "\u0441\u0438\u043C\u0432\u043E\u043B\u0430", many: "\u0441\u0438\u043C\u0432\u043E\u043B\u043E\u0432" }, verb: "\u0438\u043C\u0435\u0442\u044C" }, file: { unit: { one: "\u0431\u0430\u0439\u0442", few: "\u0431\u0430\u0439\u0442\u0430", many: "\u0431\u0430\u0439\u0442" }, verb: "\u0438\u043C\u0435\u0442\u044C" }, array: { unit: { one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442", few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430", many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432" }, verb: "\u0438\u043C\u0435\u0442\u044C" }, set: { unit: { one: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442", few: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u0430", many: "\u044D\u043B\u0435\u043C\u0435\u043D\u0442\u043E\u0432" }, verb: "\u0438\u043C\u0435\u0442\u044C" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0432\u0432\u043E\u0434", email: "email \u0430\u0434\u0440\u0435\u0441", url: "URL", emoji: "\u044D\u043C\u043E\u0434\u0437\u0438", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u0434\u0430\u0442\u0430 \u0438 \u0432\u0440\u0435\u043C\u044F", date: "ISO \u0434\u0430\u0442\u0430", time: "ISO \u0432\u0440\u0435\u043C\u044F", duration: "ISO \u0434\u043B\u0438\u0442\u0435\u043B\u044C\u043D\u043E\u0441\u0442\u044C", ipv4: "IPv4 \u0430\u0434\u0440\u0435\u0441", ipv6: "IPv6 \u0430\u0434\u0440\u0435\u0441", cidrv4: "IPv4 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D", cidrv6: "IPv6 \u0434\u0438\u0430\u043F\u0430\u0437\u043E\u043D", base64: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64", base64url: "\u0441\u0442\u0440\u043E\u043A\u0430 \u0432 \u0444\u043E\u0440\u043C\u0430\u0442\u0435 base64url", json_string: "JSON \u0441\u0442\u0440\u043E\u043A\u0430", e164: "\u043D\u043E\u043C\u0435\u0440 E.164", jwt: "JWT", template_literal: "\u0432\u0432\u043E\u0434" };
    return (e7) => {
      var i4, r3, a5;
      switch (e7.code) {
        case "invalid_type":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${e7.expected}, \u043F\u043E\u043B\u0443\u0447\u0435\u043D\u043E ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
              case "object":
                if (Array.isArray(e8))
                  return "\u043C\u0430\u0441\u0441\u0438\u0432";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0432\u043E\u0434: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C ${B3(e7.values[0])}` : `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0432\u0430\u0440\u0438\u0430\u043D\u0442: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C \u043E\u0434\u043D\u043E \u0438\u0437 ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", a6 = n6(e7.origin);
          if (a6) {
            const n7 = Za(Number(e7.maximum), a6.unit.one, a6.unit.few, a6.unit.many);
            return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${null != (i4 = e7.origin) ? i4 : "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${t5}${e7.maximum.toString()} ${n7}`;
          }
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${null != (r3 = e7.origin) ? r3 : "\u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435"} \u0431\u0443\u0434\u0435\u0442 ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          if (i5) {
            const n7 = Za(Number(e7.minimum), i5.unit.one, i5.unit.few, i5.unit.many);
            return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${e7.origin} \u0431\u0443\u0434\u0435\u0442 \u0438\u043C\u0435\u0442\u044C ${t5}${e7.minimum.toString()} ${n7}`;
          }
          return `\u0421\u043B\u0438\u0448\u043A\u043E\u043C \u043C\u0430\u043B\u0435\u043D\u044C\u043A\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435: \u043E\u0436\u0438\u0434\u0430\u043B\u043E\u0441\u044C, \u0447\u0442\u043E ${e7.origin} \u0431\u0443\u0434\u0435\u0442 ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u043D\u0430\u0447\u0438\u043D\u0430\u0442\u044C\u0441\u044F \u0441 "${n7.prefix}"` : "ends_with" === n7.format ? `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0442\u044C\u0441\u044F \u043D\u0430 "${n7.suffix}"` : "includes" === n7.format ? `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u0442\u044C "${n7.includes}"` : "regex" === n7.format ? `\u041D\u0435\u0432\u0435\u0440\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430: \u0434\u043E\u043B\u0436\u043D\u0430 \u0441\u043E\u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u043E\u0432\u0430\u0442\u044C \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${n7.pattern}` : `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 ${null != (a5 = t4[n7.format]) ? a5 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0447\u0438\u0441\u043B\u043E: \u0434\u043E\u043B\u0436\u043D\u043E \u0431\u044B\u0442\u044C \u043A\u0440\u0430\u0442\u043D\u044B\u043C ${e7.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u0430\u0441\u043F\u043E\u0437\u043D\u0430\u043D\u043D${e7.keys.length > 1 ? "\u044B\u0435" : "\u044B\u0439"} \u043A\u043B\u044E\u0447${e7.keys.length > 1 ? "\u0438" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 \u0432 ${e7.origin}`;
        case "invalid_union":
        default:
          return "\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0435 \u0432\u0445\u043E\u0434\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435";
        case "invalid_element":
          return `\u041D\u0435\u0432\u0435\u0440\u043D\u043E\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u0438\u0435 \u0432 ${e7.origin}`;
      }
    };
  };
  function Ta() {
    return { localeError: Ea() };
  }
  var Aa = () => {
    const e6 = { string: { unit: "znakov", verb: "imeti" }, file: { unit: "bajtov", verb: "imeti" }, array: { unit: "elementov", verb: "imeti" }, set: { unit: "elementov", verb: "imeti" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "vnos", email: "e-po\u0161tni naslov", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO datum in \u010Das", date: "ISO datum", time: "ISO \u010Das", duration: "ISO trajanje", ipv4: "IPv4 naslov", ipv6: "IPv6 naslov", cidrv4: "obseg IPv4", cidrv6: "obseg IPv6", base64: "base64 kodiran niz", base64url: "base64url kodiran niz", json_string: "JSON niz", e164: "E.164 \u0161tevilka", jwt: "JWT", template_literal: "vnos" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Neveljaven vnos: pri\u010Dakovano ${e7.expected}, prejeto ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u0161tevilo";
              case "object":
                if (Array.isArray(e8))
                  return "tabela";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Neveljaven vnos: pri\u010Dakovano ${B3(e7.values[0])}` : `Neveljavna mo\u017Enost: pri\u010Dakovano eno izmed ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Preveliko: pri\u010Dakovano, da bo ${null != (i4 = e7.origin) ? i4 : "vrednost"} imelo ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "elementov"}` : `Preveliko: pri\u010Dakovano, da bo ${null != (a5 = e7.origin) ? a5 : "vrednost"} ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Premajhno: pri\u010Dakovano, da bo ${e7.origin} imelo ${t5}${e7.minimum.toString()} ${i5.unit}` : `Premajhno: pri\u010Dakovano, da bo ${e7.origin} ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Neveljaven niz: mora se za\u010Deti z "${n7.prefix}"` : "ends_with" === n7.format ? `Neveljaven niz: mora se kon\u010Dati z "${n7.suffix}"` : "includes" === n7.format ? `Neveljaven niz: mora vsebovati "${n7.includes}"` : "regex" === n7.format ? `Neveljaven niz: mora ustrezati vzorcu ${n7.pattern}` : `Neveljaven ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `Neveljavno \u0161tevilo: mora biti ve\u010Dkratnik ${e7.divisor}`;
        case "unrecognized_keys":
          return `Neprepoznan${e7.keys.length > 1 ? "i klju\u010Di" : " klju\u010D"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Neveljaven klju\u010D v ${e7.origin}`;
        case "invalid_union":
        default:
          return "Neveljaven vnos";
        case "invalid_element":
          return `Neveljavna vrednost v ${e7.origin}`;
      }
    };
  };
  function Ca() {
    return { localeError: Aa() };
  }
  var Ja = () => {
    const e6 = { string: { unit: "tecken", verb: "att ha" }, file: { unit: "bytes", verb: "att ha" }, array: { unit: "objekt", verb: "att inneh\xE5lla" }, set: { unit: "objekt", verb: "att inneh\xE5lla" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "regulj\xE4rt uttryck", email: "e-postadress", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO-datum och tid", date: "ISO-datum", time: "ISO-tid", duration: "ISO-varaktighet", ipv4: "IPv4-intervall", ipv6: "IPv6-intervall", cidrv4: "IPv4-spektrum", cidrv6: "IPv6-spektrum", base64: "base64-kodad str\xE4ng", base64url: "base64url-kodad str\xE4ng", json_string: "JSON-str\xE4ng", e164: "E.164-nummer", jwt: "JWT", template_literal: "mall-literal" };
    return (e7) => {
      var i4, r3, a5, o4, s5, u3, l3, c3;
      switch (e7.code) {
        case "invalid_type":
          return `Ogiltig inmatning: f\xF6rv\xE4ntat ${e7.expected}, fick ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "antal";
              case "object":
                if (Array.isArray(e8))
                  return "lista";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Ogiltig inmatning: f\xF6rv\xE4ntat ${B3(e7.values[0])}` : `Ogiltigt val: f\xF6rv\xE4ntade en av ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `F\xF6r stor(t): f\xF6rv\xE4ntade ${null != (i4 = e7.origin) ? i4 : "v\xE4rdet"} att ha ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "element"}` : `F\xF6r stor(t): f\xF6rv\xE4ntat ${null != (a5 = e7.origin) ? a5 : "v\xE4rdet"} att ha ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `F\xF6r lite(t): f\xF6rv\xE4ntade ${null != (o4 = e7.origin) ? o4 : "v\xE4rdet"} att ha ${t5}${e7.minimum.toString()} ${i5.unit}` : `F\xF6r lite(t): f\xF6rv\xE4ntade ${null != (s5 = e7.origin) ? s5 : "v\xE4rdet"} att ha ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Ogiltig str\xE4ng: m\xE5ste b\xF6rja med "${n7.prefix}"` : "ends_with" === n7.format ? `Ogiltig str\xE4ng: m\xE5ste sluta med "${n7.suffix}"` : "includes" === n7.format ? `Ogiltig str\xE4ng: m\xE5ste inneh\xE5lla "${n7.includes}"` : "regex" === n7.format ? `Ogiltig str\xE4ng: m\xE5ste matcha m\xF6nstret "${n7.pattern}"` : `Ogiltig(t) ${null != (u3 = t4[n7.format]) ? u3 : e7.format}`;
        }
        case "not_multiple_of":
          return `Ogiltigt tal: m\xE5ste vara en multipel av ${e7.divisor}`;
        case "unrecognized_keys":
          return `${e7.keys.length > 1 ? "Ok\xE4nda nycklar" : "Ok\xE4nd nyckel"}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Ogiltig nyckel i ${null != (l3 = e7.origin) ? l3 : "v\xE4rdet"}`;
        case "invalid_union":
        default:
          return "Ogiltig input";
        case "invalid_element":
          return `Ogiltigt v\xE4rde i ${null != (c3 = e7.origin) ? c3 : "v\xE4rdet"}`;
      }
    };
  };
  function La() {
    return { localeError: Ja() };
  }
  var Ra = () => {
    const e6 = { string: { unit: "\u0B8E\u0BB4\u0BC1\u0BA4\u0BCD\u0BA4\u0BC1\u0B95\u0BCD\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" }, file: { unit: "\u0BAA\u0BC8\u0B9F\u0BCD\u0B9F\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" }, array: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" }, set: { unit: "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD", verb: "\u0B95\u0BCA\u0BA3\u0BCD\u0B9F\u0BBF\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1", email: "\u0BAE\u0BBF\u0BA9\u0BCD\u0BA9\u0B9E\u0BCD\u0B9A\u0BB2\u0BCD \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u0BA4\u0BC7\u0BA4\u0BBF \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD", date: "ISO \u0BA4\u0BC7\u0BA4\u0BBF", time: "ISO \u0BA8\u0BC7\u0BB0\u0BAE\u0BCD", duration: "ISO \u0B95\u0BBE\u0BB2 \u0B85\u0BB3\u0BB5\u0BC1", ipv4: "IPv4 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF", ipv6: "IPv6 \u0BAE\u0BC1\u0B95\u0BB5\u0BB0\u0BBF", cidrv4: "IPv4 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1", cidrv6: "IPv6 \u0BB5\u0BB0\u0BAE\u0BCD\u0BAA\u0BC1", base64: "base64-encoded \u0B9A\u0BB0\u0BAE\u0BCD", base64url: "base64url-encoded \u0B9A\u0BB0\u0BAE\u0BCD", json_string: "JSON \u0B9A\u0BB0\u0BAE\u0BCD", e164: "E.164 \u0B8E\u0BA3\u0BCD", jwt: "JWT", template_literal: "input" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${e7.expected}, \u0BAA\u0BC6\u0BB1\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "\u0B8E\u0BA3\u0BCD \u0B85\u0BB2\u0BCD\u0BB2\u0BBE\u0BA4\u0BA4\u0BC1" : "\u0B8E\u0BA3\u0BCD";
              case "object":
                if (Array.isArray(e8))
                  return "\u0B85\u0BA3\u0BBF";
                if (null === e8)
                  return "\u0BB5\u0BC6\u0BB1\u0BC1\u0BAE\u0BC8";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${B3(e7.values[0])}` : `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0BB0\u0BC1\u0BAA\u0BCD\u0BAA\u0BAE\u0BCD: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${b(e7.values, "|")} \u0B87\u0BB2\u0BCD \u0B92\u0BA9\u0BCD\u0BB1\u0BC1`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${null != (i4 = e7.origin) ? i4 : "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u0B89\u0BB1\u0BC1\u0BAA\u0BCD\u0BAA\u0BC1\u0B95\u0BB3\u0BCD"} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD` : `\u0BAE\u0BBF\u0B95 \u0BAA\u0BC6\u0BB0\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${null != (a5 = e7.origin) ? a5 : "\u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1"} ${t5}${e7.maximum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${e7.origin} ${t5}${e7.minimum.toString()} ${i5.unit} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD` : `\u0BAE\u0BBF\u0B95\u0B9A\u0BCD \u0B9A\u0BBF\u0BB1\u0BBF\u0BAF\u0BA4\u0BC1: \u0B8E\u0BA4\u0BBF\u0BB0\u0BCD\u0BAA\u0BBE\u0BB0\u0BCD\u0B95\u0BCD\u0B95\u0BAA\u0BCD\u0BAA\u0B9F\u0BCD\u0B9F\u0BA4\u0BC1 ${e7.origin} ${t5}${e7.minimum.toString()} \u0B86\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${n7.prefix}" \u0B87\u0BB2\u0BCD \u0BA4\u0BCA\u0B9F\u0B99\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD` : "ends_with" === n7.format ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${n7.suffix}" \u0B87\u0BB2\u0BCD \u0BAE\u0BC1\u0B9F\u0BBF\u0BB5\u0B9F\u0BC8\u0BAF \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD` : "includes" === n7.format ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: "${n7.includes}" \u0B90 \u0B89\u0BB3\u0BCD\u0BB3\u0B9F\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD` : "regex" === n7.format ? `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B9A\u0BB0\u0BAE\u0BCD: ${n7.pattern} \u0BAE\u0BC1\u0BB1\u0BC8\u0BAA\u0BBE\u0B9F\u0BCD\u0B9F\u0BC1\u0B9F\u0BA9\u0BCD \u0BAA\u0BCA\u0BB0\u0BC1\u0BA8\u0BCD\u0BA4 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD` : `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B8E\u0BA3\u0BCD: ${e7.divisor} \u0B87\u0BA9\u0BCD \u0BAA\u0BB2\u0BAE\u0BBE\u0B95 \u0B87\u0BB0\u0BC1\u0B95\u0BCD\u0B95 \u0BB5\u0BC7\u0BA3\u0BCD\u0B9F\u0BC1\u0BAE\u0BCD`;
        case "unrecognized_keys":
          return `\u0B85\u0B9F\u0BC8\u0BAF\u0BBE\u0BB3\u0BAE\u0BCD \u0BA4\u0BC6\u0BB0\u0BBF\u0BAF\u0BBE\u0BA4 \u0BB5\u0BBF\u0B9A\u0BC8${e7.keys.length > 1 ? "\u0B95\u0BB3\u0BCD" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `${e7.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BB5\u0BBF\u0B9A\u0BC8`;
        case "invalid_union":
        default:
          return "\u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0B89\u0BB3\u0BCD\u0BB3\u0BC0\u0B9F\u0BC1";
        case "invalid_element":
          return `${e7.origin} \u0B87\u0BB2\u0BCD \u0BA4\u0BB5\u0BB1\u0BBE\u0BA9 \u0BAE\u0BA4\u0BBF\u0BAA\u0BCD\u0BAA\u0BC1`;
      }
    };
  };
  function Fa() {
    return { localeError: Ra() };
  }
  var Ma = () => {
    const e6 = { string: { unit: "\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" }, file: { unit: "\u0E44\u0E1A\u0E15\u0E4C", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" }, array: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" }, set: { unit: "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23", verb: "\u0E04\u0E27\u0E23\u0E21\u0E35" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19", email: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48\u0E2D\u0E35\u0E40\u0E21\u0E25", url: "URL", emoji: "\u0E2D\u0E34\u0E42\u0E21\u0E08\u0E34", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO", date: "\u0E27\u0E31\u0E19\u0E17\u0E35\u0E48\u0E41\u0E1A\u0E1A ISO", time: "\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO", duration: "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E41\u0E1A\u0E1A ISO", ipv4: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv4", ipv6: "\u0E17\u0E35\u0E48\u0E2D\u0E22\u0E39\u0E48 IPv6", cidrv4: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv4", cidrv6: "\u0E0A\u0E48\u0E27\u0E07 IP \u0E41\u0E1A\u0E1A IPv6", base64: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64", base64url: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A Base64 \u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A URL", json_string: "\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E41\u0E1A\u0E1A JSON", e164: "\u0E40\u0E1A\u0E2D\u0E23\u0E4C\u0E42\u0E17\u0E23\u0E28\u0E31\u0E1E\u0E17\u0E4C\u0E23\u0E30\u0E2B\u0E27\u0E48\u0E32\u0E07\u0E1B\u0E23\u0E30\u0E40\u0E17\u0E28 (E.164)", jwt: "\u0E42\u0E17\u0E40\u0E04\u0E19 JWT", template_literal: "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E17\u0E35\u0E48\u0E1B\u0E49\u0E2D\u0E19" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${e7.expected} \u0E41\u0E15\u0E48\u0E44\u0E14\u0E49\u0E23\u0E31\u0E1A ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "\u0E44\u0E21\u0E48\u0E43\u0E0A\u0E48\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02 (NaN)" : "\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02";
              case "object":
                if (Array.isArray(e8))
                  return "\u0E2D\u0E32\u0E23\u0E4C\u0E40\u0E23\u0E22\u0E4C (Array)";
                if (null === e8)
                  return "\u0E44\u0E21\u0E48\u0E21\u0E35\u0E04\u0E48\u0E32 (null)";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u0E04\u0E48\u0E32\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19 ${B3(e7.values[0])}` : `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E04\u0E27\u0E23\u0E40\u0E1B\u0E47\u0E19\u0E2B\u0E19\u0E36\u0E48\u0E07\u0E43\u0E19 ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "\u0E44\u0E21\u0E48\u0E40\u0E01\u0E34\u0E19" : "\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32", o5 = n6(e7.origin);
          return o5 ? `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${null != (i4 = e7.origin) ? i4 : "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${t5} ${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u0E23\u0E32\u0E22\u0E01\u0E32\u0E23"}` : `\u0E40\u0E01\u0E34\u0E19\u0E01\u0E33\u0E2B\u0E19\u0E14: ${null != (a5 = e7.origin) ? a5 : "\u0E04\u0E48\u0E32"} \u0E04\u0E27\u0E23\u0E21\u0E35${t5} ${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? "\u0E2D\u0E22\u0E48\u0E32\u0E07\u0E19\u0E49\u0E2D\u0E22" : "\u0E21\u0E32\u0E01\u0E01\u0E27\u0E48\u0E32", i5 = n6(e7.origin);
          return i5 ? `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${e7.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${t5} ${e7.minimum.toString()} ${i5.unit}` : `\u0E19\u0E49\u0E2D\u0E22\u0E01\u0E27\u0E48\u0E32\u0E01\u0E33\u0E2B\u0E19\u0E14: ${e7.origin} \u0E04\u0E27\u0E23\u0E21\u0E35${t5} ${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E02\u0E36\u0E49\u0E19\u0E15\u0E49\u0E19\u0E14\u0E49\u0E27\u0E22 "${n7.prefix}"` : "ends_with" === n7.format ? `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E25\u0E07\u0E17\u0E49\u0E32\u0E22\u0E14\u0E49\u0E27\u0E22 "${n7.suffix}"` : "includes" === n7.format ? `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21\u0E15\u0E49\u0E2D\u0E07\u0E21\u0E35 "${n7.includes}" \u0E2D\u0E22\u0E39\u0E48\u0E43\u0E19\u0E02\u0E49\u0E2D\u0E04\u0E27\u0E32\u0E21` : "regex" === n7.format ? `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14 ${n7.pattern}` : `\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u0E15\u0E31\u0E27\u0E40\u0E25\u0E02\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E15\u0E49\u0E2D\u0E07\u0E40\u0E1B\u0E47\u0E19\u0E08\u0E33\u0E19\u0E27\u0E19\u0E17\u0E35\u0E48\u0E2B\u0E32\u0E23\u0E14\u0E49\u0E27\u0E22 ${e7.divisor} \u0E44\u0E14\u0E49\u0E25\u0E07\u0E15\u0E31\u0E27`;
        case "unrecognized_keys":
          return `\u0E1E\u0E1A\u0E04\u0E35\u0E22\u0E4C\u0E17\u0E35\u0E48\u0E44\u0E21\u0E48\u0E23\u0E39\u0E49\u0E08\u0E31\u0E01: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u0E04\u0E35\u0E22\u0E4C\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${e7.origin}`;
        case "invalid_union":
          return "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07: \u0E44\u0E21\u0E48\u0E15\u0E23\u0E07\u0E01\u0E31\u0E1A\u0E23\u0E39\u0E1B\u0E41\u0E1A\u0E1A\u0E22\u0E39\u0E40\u0E19\u0E35\u0E22\u0E19\u0E17\u0E35\u0E48\u0E01\u0E33\u0E2B\u0E19\u0E14\u0E44\u0E27\u0E49";
        case "invalid_element":
          return `\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07\u0E43\u0E19 ${e7.origin}`;
        default:
          return "\u0E02\u0E49\u0E2D\u0E21\u0E39\u0E25\u0E44\u0E21\u0E48\u0E16\u0E39\u0E01\u0E15\u0E49\u0E2D\u0E07";
      }
    };
  };
  function Wa() {
    return { localeError: Ma() };
  }
  var Va = () => {
    const e6 = { string: { unit: "karakter", verb: "olmal\u0131" }, file: { unit: "bayt", verb: "olmal\u0131" }, array: { unit: "\xF6\u011Fe", verb: "olmal\u0131" }, set: { unit: "\xF6\u011Fe", verb: "olmal\u0131" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "girdi", email: "e-posta adresi", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO tarih ve saat", date: "ISO tarih", time: "ISO saat", duration: "ISO s\xFCre", ipv4: "IPv4 adresi", ipv6: "IPv6 adresi", cidrv4: "IPv4 aral\u0131\u011F\u0131", cidrv6: "IPv6 aral\u0131\u011F\u0131", base64: "base64 ile \u015Fifrelenmi\u015F metin", base64url: "base64url ile \u015Fifrelenmi\u015F metin", json_string: "JSON dizesi", e164: "E.164 say\u0131s\u0131", jwt: "JWT", template_literal: "\u015Eablon dizesi" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `Ge\xE7ersiz de\u011Fer: beklenen ${e7.expected}, al\u0131nan ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `Ge\xE7ersiz de\u011Fer: beklenen ${B3(e7.values[0])}` : `Ge\xE7ersiz se\xE7enek: a\u015Fa\u011F\u0131dakilerden biri olmal\u0131: ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\xC7ok b\xFCy\xFCk: beklenen ${null != (i4 = e7.origin) ? i4 : "de\u011Fer"} ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\xF6\u011Fe"}` : `\xC7ok b\xFCy\xFCk: beklenen ${null != (a5 = e7.origin) ? a5 : "de\u011Fer"} ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\xC7ok k\xFC\xE7\xFCk: beklenen ${e7.origin} ${t5}${e7.minimum.toString()} ${i5.unit}` : `\xC7ok k\xFC\xE7\xFCk: beklenen ${e7.origin} ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Ge\xE7ersiz metin: "${n7.prefix}" ile ba\u015Flamal\u0131` : "ends_with" === n7.format ? `Ge\xE7ersiz metin: "${n7.suffix}" ile bitmeli` : "includes" === n7.format ? `Ge\xE7ersiz metin: "${n7.includes}" i\xE7ermeli` : "regex" === n7.format ? `Ge\xE7ersiz metin: ${n7.pattern} desenine uymal\u0131` : `Ge\xE7ersiz ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `Ge\xE7ersiz say\u0131: ${e7.divisor} ile tam b\xF6l\xFCnebilmeli`;
        case "unrecognized_keys":
          return `Tan\u0131nmayan anahtar${e7.keys.length > 1 ? "lar" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `${e7.origin} i\xE7inde ge\xE7ersiz anahtar`;
        case "invalid_union":
        default:
          return "Ge\xE7ersiz de\u011Fer";
        case "invalid_element":
          return `${e7.origin} i\xE7inde ge\xE7ersiz de\u011Fer`;
      }
    };
  };
  function Ga() {
    return { localeError: Va() };
  }
  var Ba = () => {
    const e6 = { string: { unit: "\u0441\u0438\u043C\u0432\u043E\u043B\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" }, file: { unit: "\u0431\u0430\u0439\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" }, array: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" }, set: { unit: "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432", verb: "\u043C\u0430\u0442\u0438\u043C\u0435" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456", email: "\u0430\u0434\u0440\u0435\u0441\u0430 \u0435\u043B\u0435\u043A\u0442\u0440\u043E\u043D\u043D\u043E\u0457 \u043F\u043E\u0448\u0442\u0438", url: "URL", emoji: "\u0435\u043C\u043E\u0434\u0437\u0456", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\u0434\u0430\u0442\u0430 \u0442\u0430 \u0447\u0430\u0441 ISO", date: "\u0434\u0430\u0442\u0430 ISO", time: "\u0447\u0430\u0441 ISO", duration: "\u0442\u0440\u0438\u0432\u0430\u043B\u0456\u0441\u0442\u044C ISO", ipv4: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv4", ipv6: "\u0430\u0434\u0440\u0435\u0441\u0430 IPv6", cidrv4: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv4", cidrv6: "\u0434\u0456\u0430\u043F\u0430\u0437\u043E\u043D IPv6", base64: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64", base64url: "\u0440\u044F\u0434\u043E\u043A \u0443 \u043A\u043E\u0434\u0443\u0432\u0430\u043D\u043D\u0456 base64url", json_string: "\u0440\u044F\u0434\u043E\u043A JSON", e164: "\u043D\u043E\u043C\u0435\u0440 E.164", jwt: "JWT", template_literal: "\u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${e7.expected}, \u043E\u0442\u0440\u0438\u043C\u0430\u043D\u043E ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u0447\u0438\u0441\u043B\u043E";
              case "object":
                if (Array.isArray(e8))
                  return "\u043C\u0430\u0441\u0438\u0432";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F ${B3(e7.values[0])}` : `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0430 \u043E\u043F\u0446\u0456\u044F: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F \u043E\u0434\u043D\u0435 \u0437 ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${null != (i4 = e7.origin) ? i4 : "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} ${o5.verb} ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u0435\u043B\u0435\u043C\u0435\u043D\u0442\u0456\u0432"}` : `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u0432\u0435\u043B\u0438\u043A\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${null != (a5 = e7.origin) ? a5 : "\u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F"} \u0431\u0443\u0434\u0435 ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${e7.origin} ${i5.verb} ${t5}${e7.minimum.toString()} ${i5.unit}` : `\u0417\u0430\u043D\u0430\u0434\u0442\u043E \u043C\u0430\u043B\u0435: \u043E\u0447\u0456\u043A\u0443\u0454\u0442\u044C\u0441\u044F, \u0449\u043E ${e7.origin} \u0431\u0443\u0434\u0435 ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043F\u043E\u0447\u0438\u043D\u0430\u0442\u0438\u0441\u044F \u0437 "${n7.prefix}"` : "ends_with" === n7.format ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0437\u0430\u043A\u0456\u043D\u0447\u0443\u0432\u0430\u0442\u0438\u0441\u044F \u043D\u0430 "${n7.suffix}"` : "includes" === n7.format ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u043C\u0456\u0441\u0442\u0438\u0442\u0438 "${n7.includes}"` : "regex" === n7.format ? `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u0440\u044F\u0434\u043E\u043A: \u043F\u043E\u0432\u0438\u043D\u0435\u043D \u0432\u0456\u0434\u043F\u043E\u0432\u0456\u0434\u0430\u0442\u0438 \u0448\u0430\u0431\u043B\u043E\u043D\u0443 ${n7.pattern}` : `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0447\u0438\u0441\u043B\u043E: \u043F\u043E\u0432\u0438\u043D\u043D\u043E \u0431\u0443\u0442\u0438 \u043A\u0440\u0430\u0442\u043D\u0438\u043C ${e7.divisor}`;
        case "unrecognized_keys":
          return `\u041D\u0435\u0440\u043E\u0437\u043F\u0456\u0437\u043D\u0430\u043D\u0438\u0439 \u043A\u043B\u044E\u0447${e7.keys.length > 1 ? "\u0456" : ""}: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0438\u0439 \u043A\u043B\u044E\u0447 \u0443 ${e7.origin}`;
        case "invalid_union":
        default:
          return "\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0456 \u0432\u0445\u0456\u0434\u043D\u0456 \u0434\u0430\u043D\u0456";
        case "invalid_element":
          return `\u041D\u0435\u043F\u0440\u0430\u0432\u0438\u043B\u044C\u043D\u0435 \u0437\u043D\u0430\u0447\u0435\u043D\u043D\u044F \u0443 ${e7.origin}`;
      }
    };
  };
  function Ka() {
    return { localeError: Ba() };
  }
  function qa() {
    return Ka();
  }
  var Xa = () => {
    const e6 = { string: { unit: "\u062D\u0631\u0648\u0641", verb: "\u06C1\u0648\u0646\u0627" }, file: { unit: "\u0628\u0627\u0626\u0679\u0633", verb: "\u06C1\u0648\u0646\u0627" }, array: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" }, set: { unit: "\u0622\u0626\u0679\u0645\u0632", verb: "\u06C1\u0648\u0646\u0627" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0627\u0646 \u067E\u0679", email: "\u0627\u06CC \u0645\u06CC\u0644 \u0627\u06CC\u0688\u0631\u06CC\u0633", url: "\u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644", emoji: "\u0627\u06CC\u0645\u0648\u062C\u06CC", uuid: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC", uuidv4: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 4", uuidv6: "\u06CC\u0648 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC \u0648\u06CC 6", nanoid: "\u0646\u06CC\u0646\u0648 \u0622\u0626\u06CC \u0688\u06CC", guid: "\u062C\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC", cuid: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC", cuid2: "\u0633\u06CC \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC 2", ulid: "\u06CC\u0648 \u0627\u06CC\u0644 \u0622\u0626\u06CC \u0688\u06CC", xid: "\u0627\u06CC\u06A9\u0633 \u0622\u0626\u06CC \u0688\u06CC", ksuid: "\u06A9\u06D2 \u0627\u06CC\u0633 \u06CC\u0648 \u0622\u0626\u06CC \u0688\u06CC", datetime: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0688\u06CC\u0679 \u0679\u0627\u0626\u0645", date: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u062A\u0627\u0631\u06CC\u062E", time: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0648\u0642\u062A", duration: "\u0622\u0626\u06CC \u0627\u06CC\u0633 \u0627\u0648 \u0645\u062F\u062A", ipv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0627\u06CC\u0688\u0631\u06CC\u0633", ipv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0627\u06CC\u0688\u0631\u06CC\u0633", cidrv4: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 4 \u0631\u06CC\u0646\u062C", cidrv6: "\u0622\u0626\u06CC \u067E\u06CC \u0648\u06CC 6 \u0631\u06CC\u0646\u062C", base64: "\u0628\u06CC\u0633 64 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF", base64url: "\u0628\u06CC\u0633 64 \u06CC\u0648 \u0622\u0631 \u0627\u06CC\u0644 \u0627\u0646 \u06A9\u0648\u0688\u0688 \u0633\u0679\u0631\u0646\u06AF", json_string: "\u062C\u06D2 \u0627\u06CC\u0633 \u0627\u0648 \u0627\u06CC\u0646 \u0633\u0679\u0631\u0646\u06AF", e164: "\u0627\u06CC 164 \u0646\u0645\u0628\u0631", jwt: "\u062C\u06D2 \u0688\u0628\u0644\u06CC\u0648 \u0679\u06CC", template_literal: "\u0627\u0646 \u067E\u0679" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${e7.expected} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627\u060C ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "\u0646\u0645\u0628\u0631";
              case "object":
                if (Array.isArray(e8))
                  return "\u0622\u0631\u06D2";
                if (null === e8)
                  return "\u0646\u0644";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)} \u0645\u0648\u0635\u0648\u0644 \u06C1\u0648\u0627`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679: ${B3(e7.values[0])} \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627` : `\u063A\u0644\u0637 \u0622\u067E\u0634\u0646: ${b(e7.values, "|")} \u0645\u06CC\u06BA \u0633\u06D2 \u0627\u06CC\u06A9 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u0628\u06C1\u062A \u0628\u0691\u0627: ${null != (i4 = e7.origin) ? i4 : "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u06D2 ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u0639\u0646\u0627\u0635\u0631"} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2` : `\u0628\u06C1\u062A \u0628\u0691\u0627: ${null != (a5 = e7.origin) ? a5 : "\u0648\u06CC\u0644\u06CC\u0648"} \u06A9\u0627 ${t5}${e7.maximum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${e7.origin} \u06A9\u06D2 ${t5}${e7.minimum.toString()} ${i5.unit} \u06C1\u0648\u0646\u06D2 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u06D2` : `\u0628\u06C1\u062A \u0686\u06BE\u0648\u0679\u0627: ${e7.origin} \u06A9\u0627 ${t5}${e7.minimum.toString()} \u06C1\u0648\u0646\u0627 \u0645\u062A\u0648\u0642\u0639 \u062A\u06BE\u0627`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${n7.prefix}" \u0633\u06D2 \u0634\u0631\u0648\u0639 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2` : "ends_with" === n7.format ? `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${n7.suffix}" \u067E\u0631 \u062E\u062A\u0645 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2` : "includes" === n7.format ? `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: "${n7.includes}" \u0634\u0627\u0645\u0644 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2` : "regex" === n7.format ? `\u063A\u0644\u0637 \u0633\u0679\u0631\u0646\u06AF: \u067E\u06CC\u0679\u0631\u0646 ${n7.pattern} \u0633\u06D2 \u0645\u06CC\u0686 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2` : `\u063A\u0644\u0637 ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u063A\u0644\u0637 \u0646\u0645\u0628\u0631: ${e7.divisor} \u06A9\u0627 \u0645\u0636\u0627\u0639\u0641 \u06C1\u0648\u0646\u0627 \u0686\u0627\u06C1\u06CC\u06D2`;
        case "unrecognized_keys":
          return `\u063A\u06CC\u0631 \u062A\u0633\u0644\u06CC\u0645 \u0634\u062F\u06C1 \u06A9\u06CC${e7.keys.length > 1 ? "\u0632" : ""}: ${b(e7.keys, "\u060C ")}`;
        case "invalid_key":
          return `${e7.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u06A9\u06CC`;
        case "invalid_union":
        default:
          return "\u063A\u0644\u0637 \u0627\u0646 \u067E\u0679";
        case "invalid_element":
          return `${e7.origin} \u0645\u06CC\u06BA \u063A\u0644\u0637 \u0648\u06CC\u0644\u06CC\u0648`;
      }
    };
  };
  function Ha() {
    return { localeError: Xa() };
  }
  var Ya = () => {
    const e6 = { string: { unit: "k\xFD t\u1EF1", verb: "c\xF3" }, file: { unit: "byte", verb: "c\xF3" }, array: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" }, set: { unit: "ph\u1EA7n t\u1EED", verb: "c\xF3" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u0111\u1EA7u v\xE0o", email: "\u0111\u1ECBa ch\u1EC9 email", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ng\xE0y gi\u1EDD ISO", date: "ng\xE0y ISO", time: "gi\u1EDD ISO", duration: "kho\u1EA3ng th\u1EDDi gian ISO", ipv4: "\u0111\u1ECBa ch\u1EC9 IPv4", ipv6: "\u0111\u1ECBa ch\u1EC9 IPv6", cidrv4: "d\u1EA3i IPv4", cidrv6: "d\u1EA3i IPv6", base64: "chu\u1ED7i m\xE3 h\xF3a base64", base64url: "chu\u1ED7i m\xE3 h\xF3a base64url", json_string: "chu\u1ED7i JSON", e164: "s\u1ED1 E.164", jwt: "JWT", template_literal: "\u0111\u1EA7u v\xE0o" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${e7.expected}, nh\u1EADn \u0111\u01B0\u1EE3c ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "s\u1ED1";
              case "object":
                if (Array.isArray(e8))
                  return "m\u1EA3ng";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i ${B3(e7.values[0])}` : `T\xF9y ch\u1ECDn kh\xF4ng h\u1EE3p l\u1EC7: mong \u0111\u1EE3i m\u1ED9t trong c\xE1c gi\xE1 tr\u1ECB ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${null != (i4 = e7.origin) ? i4 : "gi\xE1 tr\u1ECB"} ${o5.verb} ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "ph\u1EA7n t\u1EED"}` : `Qu\xE1 l\u1EDBn: mong \u0111\u1EE3i ${null != (a5 = e7.origin) ? a5 : "gi\xE1 tr\u1ECB"} ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${e7.origin} ${i5.verb} ${t5}${e7.minimum.toString()} ${i5.unit}` : `Qu\xE1 nh\u1ECF: mong \u0111\u1EE3i ${e7.origin} ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i b\u1EAFt \u0111\u1EA7u b\u1EB1ng "${n7.prefix}"` : "ends_with" === n7.format ? `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i k\u1EBFt th\xFAc b\u1EB1ng "${n7.suffix}"` : "includes" === n7.format ? `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i bao g\u1ED3m "${n7.includes}"` : "regex" === n7.format ? `Chu\u1ED7i kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i kh\u1EDBp v\u1EDBi m\u1EABu ${n7.pattern}` : `${null != (o4 = t4[n7.format]) ? o4 : e7.format} kh\xF4ng h\u1EE3p l\u1EC7`;
        }
        case "not_multiple_of":
          return `S\u1ED1 kh\xF4ng h\u1EE3p l\u1EC7: ph\u1EA3i l\xE0 b\u1ED9i s\u1ED1 c\u1EE7a ${e7.divisor}`;
        case "unrecognized_keys":
          return `Kh\xF3a kh\xF4ng \u0111\u01B0\u1EE3c nh\u1EADn d\u1EA1ng: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `Kh\xF3a kh\xF4ng h\u1EE3p l\u1EC7 trong ${e7.origin}`;
        case "invalid_union":
        default:
          return "\u0110\u1EA7u v\xE0o kh\xF4ng h\u1EE3p l\u1EC7";
        case "invalid_element":
          return `Gi\xE1 tr\u1ECB kh\xF4ng h\u1EE3p l\u1EC7 trong ${e7.origin}`;
      }
    };
  };
  function Qa() {
    return { localeError: Ya() };
  }
  var eo = () => {
    const e6 = { string: { unit: "\u5B57\u7B26", verb: "\u5305\u542B" }, file: { unit: "\u5B57\u8282", verb: "\u5305\u542B" }, array: { unit: "\u9879", verb: "\u5305\u542B" }, set: { unit: "\u9879", verb: "\u5305\u542B" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u8F93\u5165", email: "\u7535\u5B50\u90AE\u4EF6", url: "URL", emoji: "\u8868\u60C5\u7B26\u53F7", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO\u65E5\u671F\u65F6\u95F4", date: "ISO\u65E5\u671F", time: "ISO\u65F6\u95F4", duration: "ISO\u65F6\u957F", ipv4: "IPv4\u5730\u5740", ipv6: "IPv6\u5730\u5740", cidrv4: "IPv4\u7F51\u6BB5", cidrv6: "IPv6\u7F51\u6BB5", base64: "base64\u7F16\u7801\u5B57\u7B26\u4E32", base64url: "base64url\u7F16\u7801\u5B57\u7B26\u4E32", json_string: "JSON\u5B57\u7B26\u4E32", e164: "E.164\u53F7\u7801", jwt: "JWT", template_literal: "\u8F93\u5165" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${e7.expected}\uFF0C\u5B9E\u9645\u63A5\u6536 ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "\u975E\u6570\u5B57(NaN)" : "\u6570\u5B57";
              case "object":
                if (Array.isArray(e8))
                  return "\u6570\u7EC4";
                if (null === e8)
                  return "\u7A7A\u503C(null)";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u65E0\u6548\u8F93\u5165\uFF1A\u671F\u671B ${B3(e7.values[0])}` : `\u65E0\u6548\u9009\u9879\uFF1A\u671F\u671B\u4EE5\u4E0B\u4E4B\u4E00 ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${null != (i4 = e7.origin) ? i4 : "\u503C"} ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u4E2A\u5143\u7D20"}` : `\u6570\u503C\u8FC7\u5927\uFF1A\u671F\u671B ${null != (a5 = e7.origin) ? a5 : "\u503C"} ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${e7.origin} ${t5}${e7.minimum.toString()} ${i5.unit}` : `\u6570\u503C\u8FC7\u5C0F\uFF1A\u671F\u671B ${e7.origin} ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${n7.prefix}" \u5F00\u5934` : "ends_with" === n7.format ? `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u4EE5 "${n7.suffix}" \u7ED3\u5C3E` : "includes" === n7.format ? `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u5305\u542B "${n7.includes}"` : "regex" === n7.format ? `\u65E0\u6548\u5B57\u7B26\u4E32\uFF1A\u5FC5\u987B\u6EE1\u8DB3\u6B63\u5219\u8868\u8FBE\u5F0F ${n7.pattern}` : `\u65E0\u6548${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u65E0\u6548\u6570\u5B57\uFF1A\u5FC5\u987B\u662F ${e7.divisor} \u7684\u500D\u6570`;
        case "unrecognized_keys":
          return `\u51FA\u73B0\u672A\u77E5\u7684\u952E(key): ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `${e7.origin} \u4E2D\u7684\u952E(key)\u65E0\u6548`;
        case "invalid_union":
        default:
          return "\u65E0\u6548\u8F93\u5165";
        case "invalid_element":
          return `${e7.origin} \u4E2D\u5305\u542B\u65E0\u6548\u503C(value)`;
      }
    };
  };
  function no() {
    return { localeError: eo() };
  }
  var to = () => {
    const e6 = { string: { unit: "\u5B57\u5143", verb: "\u64C1\u6709" }, file: { unit: "\u4F4D\u5143\u7D44", verb: "\u64C1\u6709" }, array: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" }, set: { unit: "\u9805\u76EE", verb: "\u64C1\u6709" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u8F38\u5165", email: "\u90F5\u4EF6\u5730\u5740", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "ISO \u65E5\u671F\u6642\u9593", date: "ISO \u65E5\u671F", time: "ISO \u6642\u9593", duration: "ISO \u671F\u9593", ipv4: "IPv4 \u4F4D\u5740", ipv6: "IPv6 \u4F4D\u5740", cidrv4: "IPv4 \u7BC4\u570D", cidrv6: "IPv6 \u7BC4\u570D", base64: "base64 \u7DE8\u78BC\u5B57\u4E32", base64url: "base64url \u7DE8\u78BC\u5B57\u4E32", json_string: "JSON \u5B57\u4E32", e164: "E.164 \u6578\u503C", jwt: "JWT", template_literal: "\u8F38\u5165" };
    return (e7) => {
      var i4, r3, a5, o4;
      switch (e7.code) {
        case "invalid_type":
          return `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${e7.expected}\uFF0C\u4F46\u6536\u5230 ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "number";
              case "object":
                if (Array.isArray(e8))
                  return "array";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\u7121\u6548\u7684\u8F38\u5165\u503C\uFF1A\u9810\u671F\u70BA ${B3(e7.values[0])}` : `\u7121\u6548\u7684\u9078\u9805\uFF1A\u9810\u671F\u70BA\u4EE5\u4E0B\u5176\u4E2D\u4E4B\u4E00 ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", o5 = n6(e7.origin);
          return o5 ? `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${null != (i4 = e7.origin) ? i4 : "\u503C"} \u61C9\u70BA ${t5}${e7.maximum.toString()} ${null != (r3 = o5.unit) ? r3 : "\u500B\u5143\u7D20"}` : `\u6578\u503C\u904E\u5927\uFF1A\u9810\u671F ${null != (a5 = e7.origin) ? a5 : "\u503C"} \u61C9\u70BA ${t5}${e7.maximum.toString()}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${e7.origin} \u61C9\u70BA ${t5}${e7.minimum.toString()} ${i5.unit}` : `\u6578\u503C\u904E\u5C0F\uFF1A\u9810\u671F ${e7.origin} \u61C9\u70BA ${t5}${e7.minimum.toString()}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${n7.prefix}" \u958B\u982D` : "ends_with" === n7.format ? `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u4EE5 "${n7.suffix}" \u7D50\u5C3E` : "includes" === n7.format ? `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u5305\u542B "${n7.includes}"` : "regex" === n7.format ? `\u7121\u6548\u7684\u5B57\u4E32\uFF1A\u5FC5\u9808\u7B26\u5408\u683C\u5F0F ${n7.pattern}` : `\u7121\u6548\u7684 ${null != (o4 = t4[n7.format]) ? o4 : e7.format}`;
        }
        case "not_multiple_of":
          return `\u7121\u6548\u7684\u6578\u5B57\uFF1A\u5FC5\u9808\u70BA ${e7.divisor} \u7684\u500D\u6578`;
        case "unrecognized_keys":
          return `\u7121\u6CD5\u8B58\u5225\u7684\u9375\u503C${e7.keys.length > 1 ? "\u5011" : ""}\uFF1A${b(e7.keys, "\u3001")}`;
        case "invalid_key":
          return `${e7.origin} \u4E2D\u6709\u7121\u6548\u7684\u9375\u503C`;
        case "invalid_union":
        default:
          return "\u7121\u6548\u7684\u8F38\u5165\u503C";
        case "invalid_element":
          return `${e7.origin} \u4E2D\u6709\u7121\u6548\u7684\u503C`;
      }
    };
  };
  function io() {
    return { localeError: to() };
  }
  var ro = () => {
    const e6 = { string: { unit: "\xE0mi", verb: "n\xED" }, file: { unit: "bytes", verb: "n\xED" }, array: { unit: "nkan", verb: "n\xED" }, set: { unit: "nkan", verb: "n\xED" } };
    function n6(n7) {
      var t5;
      return null != (t5 = e6[n7]) ? t5 : null;
    }
    const t4 = { regex: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9", email: "\xE0d\xEDr\u1EB9\u0301s\xEC \xECm\u1EB9\u0301l\xEC", url: "URL", emoji: "emoji", uuid: "UUID", uuidv4: "UUIDv4", uuidv6: "UUIDv6", nanoid: "nanoid", guid: "GUID", cuid: "cuid", cuid2: "cuid2", ulid: "ULID", xid: "XID", ksuid: "KSUID", datetime: "\xE0k\xF3k\xF2 ISO", date: "\u1ECDj\u1ECD\u0301 ISO", time: "\xE0k\xF3k\xF2 ISO", duration: "\xE0k\xF3k\xF2 t\xF3 p\xE9 ISO", ipv4: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv4", ipv6: "\xE0d\xEDr\u1EB9\u0301s\xEC IPv6", cidrv4: "\xE0gb\xE8gb\xE8 IPv4", cidrv6: "\xE0gb\xE8gb\xE8 IPv6", base64: "\u1ECD\u0300r\u1ECD\u0300 t\xED a k\u1ECD\u0301 n\xED base64", base64url: "\u1ECD\u0300r\u1ECD\u0300 base64url", json_string: "\u1ECD\u0300r\u1ECD\u0300 JSON", e164: "n\u1ECD\u0301mb\xE0 E.164", jwt: "JWT", template_literal: "\u1EB9\u0300r\u1ECD \xECb\xE1w\u1ECDl\xE9" };
    return (e7) => {
      var i4, r3;
      switch (e7.code) {
        case "invalid_type":
          return `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${e7.expected}, \xE0m\u1ECD\u0300 a r\xED ${((e8) => {
            const n7 = typeof e8;
            switch (n7) {
              case "number":
                return Number.isNaN(e8) ? "NaN" : "n\u1ECD\u0301mb\xE0";
              case "object":
                if (Array.isArray(e8))
                  return "akop\u1ECD";
                if (null === e8)
                  return "null";
                if (Object.getPrototypeOf(e8) !== Object.prototype && e8.constructor)
                  return e8.constructor.name;
            }
            return n7;
          })(e7.input)}`;
        case "invalid_value":
          return 1 === e7.values.length ? `\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e: a n\xED l\xE1ti fi ${B3(e7.values[0])}` : `\xC0\u1E63\xE0y\xE0n a\u1E63\xEC\u1E63e: yan \u1ECD\u0300kan l\xE1ra ${b(e7.values, "|")}`;
        case "too_big": {
          const t5 = e7.inclusive ? "<=" : "<", r4 = n6(e7.origin);
          return r4 ? `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${null != (i4 = e7.origin) ? i4 : "iye"} ${r4.verb} ${t5}${e7.maximum} ${r4.unit}` : `T\xF3 p\u1ECD\u0300 j\xF9: a n\xED l\xE1ti j\u1EB9\u0301 ${t5}${e7.maximum}`;
        }
        case "too_small": {
          const t5 = e7.inclusive ? ">=" : ">", i5 = n6(e7.origin);
          return i5 ? `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 p\xE9 ${e7.origin} ${i5.verb} ${t5}${e7.minimum} ${i5.unit}` : `K\xE9r\xE9 ju: a n\xED l\xE1ti j\u1EB9\u0301 ${t5}${e7.minimum}`;
        }
        case "invalid_format": {
          const n7 = e7;
          return "starts_with" === n7.format ? `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\u1EB9\u0300r\u1EB9\u0300 p\u1EB9\u0300l\xFA "${n7.prefix}"` : "ends_with" === n7.format ? `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 par\xED p\u1EB9\u0300l\xFA "${n7.suffix}"` : "includes" === n7.format ? `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 n\xED "${n7.includes}"` : "regex" === n7.format ? `\u1ECC\u0300r\u1ECD\u0300 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 b\xE1 \xE0p\u1EB9\u1EB9r\u1EB9 mu ${n7.pattern}` : `A\u1E63\xEC\u1E63e: ${null != (r3 = t4[n7.format]) ? r3 : e7.format}`;
        }
        case "not_multiple_of":
          return `N\u1ECD\u0301mb\xE0 a\u1E63\xEC\u1E63e: gb\u1ECD\u0301d\u1ECD\u0300 j\u1EB9\u0301 \xE8y\xE0 p\xEDp\xEDn ti ${e7.divisor}`;
        case "unrecognized_keys":
          return `B\u1ECDt\xECn\xEC \xE0\xECm\u1ECD\u0300: ${b(e7.keys, ", ")}`;
        case "invalid_key":
          return `B\u1ECDt\xECn\xEC a\u1E63\xEC\u1E63e n\xEDn\xFA ${e7.origin}`;
        case "invalid_union":
        default:
          return "\xCCb\xE1w\u1ECDl\xE9 a\u1E63\xEC\u1E63e";
        case "invalid_element":
          return `Iye a\u1E63\xEC\u1E63e n\xEDn\xFA ${e7.origin}`;
      }
    };
  };
  function ao() {
    return { localeError: ro() };
  }
  var oo = Symbol("ZodOutput");
  var so = Symbol("ZodInput");
  var uo = class {
    constructor() {
      this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map();
    }
    add(e6, ...n6) {
      const t4 = n6[0];
      if (this._map.set(e6, t4), t4 && "object" == typeof t4 && "id" in t4) {
        if (this._idmap.has(t4.id))
          throw new Error(`ID ${t4.id} already exists in the registry`);
        this._idmap.set(t4.id, e6);
      }
      return this;
    }
    clear() {
      return this._map = /* @__PURE__ */ new WeakMap(), this._idmap = /* @__PURE__ */ new Map(), this;
    }
    remove(e6) {
      const n6 = this._map.get(e6);
      return n6 && "object" == typeof n6 && "id" in n6 && this._idmap.delete(n6.id), this._map.delete(e6), this;
    }
    get(e6) {
      var n6;
      const t4 = e6._zod.parent;
      if (t4) {
        const i4 = { ...null != (n6 = this.get(t4)) ? n6 : {} };
        delete i4.id;
        const r3 = { ...i4, ...this._map.get(e6) };
        return Object.keys(r3).length ? r3 : void 0;
      }
      return this._map.get(e6);
    }
    has(e6) {
      return this._map.has(e6);
    }
  };
  function lo() {
    return new uo();
  }
  var co = lo();
  function mo(e6, n6) {
    return new e6({ type: "string", ...V2(n6) });
  }
  function po(e6, n6) {
    return new e6({ type: "string", coerce: true, ...V2(n6) });
  }
  function vo(e6, n6) {
    return new e6({ type: "string", format: "email", check: "string_format", abort: false, ...V2(n6) });
  }
  function fo(e6, n6) {
    return new e6({ type: "string", format: "guid", check: "string_format", abort: false, ...V2(n6) });
  }
  function go(e6, n6) {
    return new e6({ type: "string", format: "uuid", check: "string_format", abort: false, ...V2(n6) });
  }
  function ho(e6, n6) {
    return new e6({ type: "string", format: "uuid", check: "string_format", abort: false, version: "v4", ...V2(n6) });
  }
  function bo(e6, n6) {
    return new e6({ type: "string", format: "uuid", check: "string_format", abort: false, version: "v6", ...V2(n6) });
  }
  function yo(e6, n6) {
    return new e6({ type: "string", format: "uuid", check: "string_format", abort: false, version: "v7", ...V2(n6) });
  }
  function $o(e6, n6) {
    return new e6({ type: "string", format: "url", check: "string_format", abort: false, ...V2(n6) });
  }
  function _o(e6, n6) {
    return new e6({ type: "string", format: "emoji", check: "string_format", abort: false, ...V2(n6) });
  }
  function ko(e6, n6) {
    return new e6({ type: "string", format: "nanoid", check: "string_format", abort: false, ...V2(n6) });
  }
  function wo(e6, n6) {
    return new e6({ type: "string", format: "cuid", check: "string_format", abort: false, ...V2(n6) });
  }
  function Io(e6, n6) {
    return new e6({ type: "string", format: "cuid2", check: "string_format", abort: false, ...V2(n6) });
  }
  function So(e6, n6) {
    return new e6({ type: "string", format: "ulid", check: "string_format", abort: false, ...V2(n6) });
  }
  function zo(e6, n6) {
    return new e6({ type: "string", format: "xid", check: "string_format", abort: false, ...V2(n6) });
  }
  function xo(e6, n6) {
    return new e6({ type: "string", format: "ksuid", check: "string_format", abort: false, ...V2(n6) });
  }
  function jo(e6, n6) {
    return new e6({ type: "string", format: "ipv4", check: "string_format", abort: false, ...V2(n6) });
  }
  function Oo(e6, n6) {
    return new e6({ type: "string", format: "ipv6", check: "string_format", abort: false, ...V2(n6) });
  }
  function Uo(e6, n6) {
    return new e6({ type: "string", format: "cidrv4", check: "string_format", abort: false, ...V2(n6) });
  }
  function No(e6, n6) {
    return new e6({ type: "string", format: "cidrv6", check: "string_format", abort: false, ...V2(n6) });
  }
  function Po(e6, n6) {
    return new e6({ type: "string", format: "base64", check: "string_format", abort: false, ...V2(n6) });
  }
  function Do(e6, n6) {
    return new e6({ type: "string", format: "base64url", check: "string_format", abort: false, ...V2(n6) });
  }
  function Zo(e6, n6) {
    return new e6({ type: "string", format: "e164", check: "string_format", abort: false, ...V2(n6) });
  }
  function Eo(e6, n6) {
    return new e6({ type: "string", format: "jwt", check: "string_format", abort: false, ...V2(n6) });
  }
  var To = { Any: null, Minute: -1, Second: 0, Millisecond: 3, Microsecond: 6 };
  function Ao(e6, n6) {
    return new e6({ type: "string", format: "datetime", check: "string_format", offset: false, local: false, precision: null, ...V2(n6) });
  }
  function Co(e6, n6) {
    return new e6({ type: "string", format: "date", check: "string_format", ...V2(n6) });
  }
  function Jo(e6, n6) {
    return new e6({ type: "string", format: "time", check: "string_format", precision: null, ...V2(n6) });
  }
  function Lo(e6, n6) {
    return new e6({ type: "string", format: "duration", check: "string_format", ...V2(n6) });
  }
  function Ro(e6, n6) {
    return new e6({ type: "number", checks: [], ...V2(n6) });
  }
  function Fo(e6, n6) {
    return new e6({ type: "number", coerce: true, checks: [], ...V2(n6) });
  }
  function Mo(e6, n6) {
    return new e6({ type: "number", check: "number_format", abort: false, format: "safeint", ...V2(n6) });
  }
  function Wo(e6, n6) {
    return new e6({ type: "number", check: "number_format", abort: false, format: "float32", ...V2(n6) });
  }
  function Vo(e6, n6) {
    return new e6({ type: "number", check: "number_format", abort: false, format: "float64", ...V2(n6) });
  }
  function Go(e6, n6) {
    return new e6({ type: "number", check: "number_format", abort: false, format: "int32", ...V2(n6) });
  }
  function Bo(e6, n6) {
    return new e6({ type: "number", check: "number_format", abort: false, format: "uint32", ...V2(n6) });
  }
  function Ko(e6, n6) {
    return new e6({ type: "boolean", ...V2(n6) });
  }
  function qo(e6, n6) {
    return new e6({ type: "boolean", coerce: true, ...V2(n6) });
  }
  function Xo(e6, n6) {
    return new e6({ type: "bigint", ...V2(n6) });
  }
  function Ho(e6, n6) {
    return new e6({ type: "bigint", coerce: true, ...V2(n6) });
  }
  function Yo(e6, n6) {
    return new e6({ type: "bigint", check: "bigint_format", abort: false, format: "int64", ...V2(n6) });
  }
  function Qo(e6, n6) {
    return new e6({ type: "bigint", check: "bigint_format", abort: false, format: "uint64", ...V2(n6) });
  }
  function es(e6, n6) {
    return new e6({ type: "symbol", ...V2(n6) });
  }
  function ns(e6, n6) {
    return new e6({ type: "undefined", ...V2(n6) });
  }
  function ts(e6, n6) {
    return new e6({ type: "null", ...V2(n6) });
  }
  function is(e6) {
    return new e6({ type: "any" });
  }
  function rs(e6) {
    return new e6({ type: "unknown" });
  }
  function as(e6, n6) {
    return new e6({ type: "never", ...V2(n6) });
  }
  function os(e6, n6) {
    return new e6({ type: "void", ...V2(n6) });
  }
  function ss(e6, n6) {
    return new e6({ type: "date", ...V2(n6) });
  }
  function us(e6, n6) {
    return new e6({ type: "date", coerce: true, ...V2(n6) });
  }
  function ls(e6, n6) {
    return new e6({ type: "nan", ...V2(n6) });
  }
  function cs(e6, n6) {
    return new lt2({ check: "less_than", ...V2(n6), value: e6, inclusive: false });
  }
  function ds(e6, n6) {
    return new lt2({ check: "less_than", ...V2(n6), value: e6, inclusive: true });
  }
  function ms(e6, n6) {
    return new ct2({ check: "greater_than", ...V2(n6), value: e6, inclusive: false });
  }
  function ps(e6, n6) {
    return new ct2({ check: "greater_than", ...V2(n6), value: e6, inclusive: true });
  }
  function vs(e6) {
    return ms(0, e6);
  }
  function fs(e6) {
    return cs(0, e6);
  }
  function gs(e6) {
    return ds(0, e6);
  }
  function hs(e6) {
    return ps(0, e6);
  }
  function bs(e6, n6) {
    return new dt2({ check: "multiple_of", ...V2(n6), value: e6 });
  }
  function ys(e6, n6) {
    return new vt2({ check: "max_size", ...V2(n6), maximum: e6 });
  }
  function $s(e6, n6) {
    return new ft({ check: "min_size", ...V2(n6), minimum: e6 });
  }
  function _s(e6, n6) {
    return new gt({ check: "size_equals", ...V2(n6), size: e6 });
  }
  function ks(e6, n6) {
    return new ht({ check: "max_length", ...V2(n6), maximum: e6 });
  }
  function ws(e6, n6) {
    return new bt({ check: "min_length", ...V2(n6), minimum: e6 });
  }
  function Is(e6, n6) {
    return new yt2({ check: "length_equals", ...V2(n6), length: e6 });
  }
  function Ss(e6, n6) {
    return new _t2({ check: "string_format", format: "regex", ...V2(n6), pattern: e6 });
  }
  function zs(e6) {
    return new kt2({ check: "string_format", format: "lowercase", ...V2(e6) });
  }
  function xs(e6) {
    return new wt2({ check: "string_format", format: "uppercase", ...V2(e6) });
  }
  function js(e6, n6) {
    return new It2({ check: "string_format", format: "includes", ...V2(n6), includes: e6 });
  }
  function Os(e6, n6) {
    return new St({ check: "string_format", format: "starts_with", ...V2(n6), prefix: e6 });
  }
  function Us(e6, n6) {
    return new zt2({ check: "string_format", format: "ends_with", ...V2(n6), suffix: e6 });
  }
  function Ns(e6, n6, t4) {
    return new jt({ check: "property", property: e6, schema: n6, ...V2(t4) });
  }
  function Ps(e6, n6) {
    return new Ot2({ check: "mime_type", mime: e6, ...V2(n6) });
  }
  function Ds(e6) {
    return new Ut({ check: "overwrite", tx: e6 });
  }
  function Zs(e6) {
    return Ds((n6) => n6.normalize(e6));
  }
  function Es() {
    return Ds((e6) => e6.trim());
  }
  function Ts() {
    return Ds((e6) => e6.toLowerCase());
  }
  function As() {
    return Ds((e6) => e6.toUpperCase());
  }
  function Cs(e6, n6, t4) {
    return new e6({ type: "array", element: n6, ...V2(t4) });
  }
  function Js(e6, n6, t4) {
    return new e6({ type: "union", options: n6, ...V2(t4) });
  }
  function Ls(e6, n6, t4, i4) {
    return new e6({ type: "union", options: t4, discriminator: n6, ...V2(i4) });
  }
  function Rs(e6, n6, t4) {
    return new e6({ type: "intersection", left: n6, right: t4 });
  }
  function Fs(e6, n6, t4, i4) {
    const r3 = t4 instanceof Dt;
    return new e6({ type: "tuple", items: n6, rest: r3 ? t4 : null, ...V2(r3 ? i4 : t4) });
  }
  function Ms(e6, n6, t4, i4) {
    return new e6({ type: "record", keyType: n6, valueType: t4, ...V2(i4) });
  }
  function Ws(e6, n6, t4, i4) {
    return new e6({ type: "map", keyType: n6, valueType: t4, ...V2(i4) });
  }
  function Vs(e6, n6, t4) {
    return new e6({ type: "set", valueType: n6, ...V2(t4) });
  }
  function Gs(e6, n6, t4) {
    return new e6({ type: "enum", entries: Array.isArray(n6) ? Object.fromEntries(n6.map((e7) => [e7, e7])) : n6, ...V2(t4) });
  }
  function Bs(e6, n6, t4) {
    return new e6({ type: "enum", entries: n6, ...V2(t4) });
  }
  function Ks(e6, n6, t4) {
    return new e6({ type: "literal", values: Array.isArray(n6) ? n6 : [n6], ...V2(t4) });
  }
  function qs(e6, n6) {
    return new e6({ type: "file", ...V2(n6) });
  }
  function Xs(e6, n6) {
    return new e6({ type: "transform", transform: n6 });
  }
  function Hs(e6, n6) {
    return new e6({ type: "optional", innerType: n6 });
  }
  function Ys(e6, n6) {
    return new e6({ type: "nullable", innerType: n6 });
  }
  function Qs(e6, n6, t4) {
    return new e6({ type: "default", innerType: n6, get defaultValue() {
      return "function" == typeof t4 ? t4() : C3(t4);
    } });
  }
  function eu(e6, n6, t4) {
    return new e6({ type: "nonoptional", innerType: n6, ...V2(t4) });
  }
  function nu(e6, n6) {
    return new e6({ type: "success", innerType: n6 });
  }
  function tu(e6, n6, t4) {
    return new e6({ type: "catch", innerType: n6, catchValue: "function" == typeof t4 ? t4 : () => t4 });
  }
  function iu(e6, n6, t4) {
    return new e6({ type: "pipe", in: n6, out: t4 });
  }
  function ru(e6, n6) {
    return new e6({ type: "readonly", innerType: n6 });
  }
  function au(e6, n6, t4) {
    return new e6({ type: "template_literal", parts: n6, ...V2(t4) });
  }
  function ou(e6, n6) {
    return new e6({ type: "lazy", getter: n6 });
  }
  function su(e6, n6) {
    return new e6({ type: "promise", innerType: n6 });
  }
  function uu(e6, n6, t4) {
    const i4 = V2(t4);
    null != i4.abort || (i4.abort = true);
    return new e6({ type: "custom", check: "custom", fn: n6, ...i4 });
  }
  function lu(e6, n6, t4) {
    return new e6({ type: "custom", check: "custom", fn: n6, ...V2(t4) });
  }
  function cu(e6) {
    const n6 = du((t4) => (t4.addIssue = (e7) => {
      if ("string" == typeof e7)
        t4.issues.push(ce2(e7, t4.value, n6._zod.def));
      else {
        const i4 = e7;
        i4.fatal && (i4.continue = false), null != i4.code || (i4.code = "custom"), null != i4.input || (i4.input = t4.value), null != i4.inst || (i4.inst = n6), null != i4.continue || (i4.continue = !n6._zod.def.abort), t4.issues.push(ce2(i4));
      }
    }, e6(t4.value, t4)));
    return n6;
  }
  function du(e6, n6) {
    const t4 = new st2({ check: "custom", ...V2(n6) });
    return t4._zod.check = e6, t4;
  }
  function mu(e6, n6) {
    var t4, i4, r3, a5, o4;
    const s5 = V2(n6);
    let u3 = null != (t4 = s5.truthy) ? t4 : ["true", "1", "yes", "on", "y", "enabled"], l3 = null != (i4 = s5.falsy) ? i4 : ["false", "0", "no", "off", "n", "disabled"];
    "sensitive" !== s5.case && (u3 = u3.map((e7) => "string" == typeof e7 ? e7.toLowerCase() : e7), l3 = l3.map((e7) => "string" == typeof e7 ? e7.toLowerCase() : e7));
    const c3 = new Set(u3), d2 = new Set(l3), m2 = null != (r3 = e6.Codec) ? r3 : ar, p2 = null != (a5 = e6.Boolean) ? a5 : di, v4 = new m2({ type: "pipe", in: new (null != (o4 = e6.String) ? o4 : Zt)({ type: "string", error: s5.error }), out: new p2({ type: "boolean", error: s5.error }), transform: (e7, n7) => {
      let t5 = e7;
      return "sensitive" !== s5.case && (t5 = t5.toLowerCase()), !!c3.has(t5) || !d2.has(t5) && (n7.issues.push({ code: "invalid_value", expected: "stringbool", values: [...c3, ...d2], input: n7.value, inst: v4, continue: false }), {});
    }, reverseTransform: (e7, n7) => true === e7 ? u3[0] || "true" : l3[0] || "false", error: s5.error });
    return v4;
  }
  function pu(e6, n6, t4, i4 = {}) {
    const r3 = V2(i4), a5 = { ...V2(i4), check: "string_format", type: "string", format: n6, fn: "function" == typeof t4 ? t4 : (e7) => t4.test(e7), ...r3 };
    t4 instanceof RegExp && (a5.pattern = t4);
    return new e6(a5);
  }
  var vu = class {
    constructor(e6) {
      var n6, t4, i4, r3, a5;
      this.counter = 0, this.metadataRegistry = null != (n6 = null == e6 ? void 0 : e6.metadata) ? n6 : co, this.target = null != (t4 = null == e6 ? void 0 : e6.target) ? t4 : "draft-2020-12", this.unrepresentable = null != (i4 = null == e6 ? void 0 : e6.unrepresentable) ? i4 : "throw", this.override = null != (r3 = null == e6 ? void 0 : e6.override) ? r3 : () => {
      }, this.io = null != (a5 = null == e6 ? void 0 : e6.io) ? a5 : "output", this.seen = /* @__PURE__ */ new Map();
    }
    process(e6, n6 = { path: [], schemaPath: [] }) {
      var t4, i4, r3, a5, o4;
      const s5 = e6._zod.def, u3 = { guid: "uuid", url: "uri", datetime: "date-time", json_string: "json-string", regex: "" }, l3 = this.seen.get(e6);
      if (l3) {
        l3.count++;
        return n6.schemaPath.includes(e6) && (l3.cycle = n6.path), l3.schema;
      }
      const c3 = { schema: {}, count: 1, cycle: void 0, path: n6.path };
      this.seen.set(e6, c3);
      const d2 = null == (i4 = (t4 = e6._zod).toJSONSchema) ? void 0 : i4.call(t4);
      if (d2)
        c3.schema = d2;
      else {
        const t5 = { ...n6, schemaPath: [...n6.schemaPath, e6], path: n6.path }, i5 = e6._zod.parent;
        if (i5)
          c3.ref = i5, this.process(i5, t5), this.seen.get(i5).isParent = true;
        else {
          const n7 = c3.schema;
          switch (s5.type) {
            case "string": {
              const t6 = n7;
              t6.type = "string";
              const { minimum: i6, maximum: a6, format: o5, patterns: s6, contentEncoding: l4 } = e6._zod.bag;
              if ("number" == typeof i6 && (t6.minLength = i6), "number" == typeof a6 && (t6.maxLength = a6), o5 && (t6.format = null != (r3 = u3[o5]) ? r3 : o5, "" === t6.format && delete t6.format), l4 && (t6.contentEncoding = l4), s6 && s6.size > 0) {
                const e7 = [...s6];
                1 === e7.length ? t6.pattern = e7[0].source : e7.length > 1 && (c3.schema.allOf = [...e7.map((e8) => ({ ..."draft-7" === this.target || "draft-4" === this.target || "openapi-3.0" === this.target ? { type: "string" } : {}, pattern: e8.source }))]);
              }
              break;
            }
            case "number": {
              const t6 = n7, { minimum: i6, maximum: r4, format: a6, multipleOf: o5, exclusiveMaximum: s6, exclusiveMinimum: u4 } = e6._zod.bag;
              "string" == typeof a6 && a6.includes("int") ? t6.type = "integer" : t6.type = "number", "number" == typeof u4 && ("draft-4" === this.target || "openapi-3.0" === this.target ? (t6.minimum = u4, t6.exclusiveMinimum = true) : t6.exclusiveMinimum = u4), "number" == typeof i6 && (t6.minimum = i6, "number" == typeof u4 && "draft-4" !== this.target && (u4 >= i6 ? delete t6.minimum : delete t6.exclusiveMinimum)), "number" == typeof s6 && ("draft-4" === this.target || "openapi-3.0" === this.target ? (t6.maximum = s6, t6.exclusiveMaximum = true) : t6.exclusiveMaximum = s6), "number" == typeof r4 && (t6.maximum = r4, "number" == typeof s6 && "draft-4" !== this.target && (s6 <= r4 ? delete t6.maximum : delete t6.exclusiveMaximum)), "number" == typeof o5 && (t6.multipleOf = o5);
              break;
            }
            case "boolean":
              n7.type = "boolean";
              break;
            case "bigint":
              if ("throw" === this.unrepresentable)
                throw new Error("BigInt cannot be represented in JSON Schema");
              break;
            case "symbol":
              if ("throw" === this.unrepresentable)
                throw new Error("Symbols cannot be represented in JSON Schema");
              break;
            case "null":
              "openapi-3.0" === this.target ? (n7.type = "string", n7.nullable = true, n7.enum = [null]) : n7.type = "null";
              break;
            case "any":
            case "unknown":
              break;
            case "undefined":
              if ("throw" === this.unrepresentable)
                throw new Error("Undefined cannot be represented in JSON Schema");
              break;
            case "void":
              if ("throw" === this.unrepresentable)
                throw new Error("Void cannot be represented in JSON Schema");
              break;
            case "never":
              n7.not = {};
              break;
            case "date":
              if ("throw" === this.unrepresentable)
                throw new Error("Date cannot be represented in JSON Schema");
              break;
            case "array": {
              const i6 = n7, { minimum: r4, maximum: a6 } = e6._zod.bag;
              "number" == typeof r4 && (i6.minItems = r4), "number" == typeof a6 && (i6.maxItems = a6), i6.type = "array", i6.items = this.process(s5.element, { ...t5, path: [...t5.path, "items"] });
              break;
            }
            case "object": {
              const e7 = n7;
              e7.type = "object", e7.properties = {};
              const i6 = s5.shape;
              for (const n8 in i6)
                e7.properties[n8] = this.process(i6[n8], { ...t5, path: [...t5.path, "properties", n8] });
              const r4 = new Set(Object.keys(i6)), o5 = new Set([...r4].filter((e8) => {
                const n8 = s5.shape[e8]._zod;
                return "input" === this.io ? void 0 === n8.optin : void 0 === n8.optout;
              }));
              o5.size > 0 && (e7.required = Array.from(o5)), "never" === (null == (a5 = s5.catchall) ? void 0 : a5._zod.def.type) ? e7.additionalProperties = false : s5.catchall ? s5.catchall && (e7.additionalProperties = this.process(s5.catchall, { ...t5, path: [...t5.path, "additionalProperties"] })) : "output" === this.io && (e7.additionalProperties = false);
              break;
            }
            case "union": {
              const e7 = n7, i6 = s5.options.map((e8, n8) => this.process(e8, { ...t5, path: [...t5.path, "anyOf", n8] }));
              e7.anyOf = i6;
              break;
            }
            case "intersection": {
              const e7 = n7, i6 = this.process(s5.left, { ...t5, path: [...t5.path, "allOf", 0] }), r4 = this.process(s5.right, { ...t5, path: [...t5.path, "allOf", 1] }), a6 = (e8) => "allOf" in e8 && 1 === Object.keys(e8).length, o5 = [...a6(i6) ? i6.allOf : [i6], ...a6(r4) ? r4.allOf : [r4]];
              e7.allOf = o5;
              break;
            }
            case "tuple": {
              const i6 = n7;
              i6.type = "array";
              const r4 = "draft-2020-12" === this.target ? "prefixItems" : "items", a6 = "draft-2020-12" === this.target || "openapi-3.0" === this.target ? "items" : "additionalItems", o5 = s5.items.map((e7, n8) => this.process(e7, { ...t5, path: [...t5.path, r4, n8] })), u4 = s5.rest ? this.process(s5.rest, { ...t5, path: [...t5.path, a6, ..."openapi-3.0" === this.target ? [s5.items.length] : []] }) : null;
              "draft-2020-12" === this.target ? (i6.prefixItems = o5, u4 && (i6.items = u4)) : "openapi-3.0" === this.target ? (i6.items = { anyOf: o5 }, u4 && i6.items.anyOf.push(u4), i6.minItems = o5.length, u4 || (i6.maxItems = o5.length)) : (i6.items = o5, u4 && (i6.additionalItems = u4));
              const { minimum: l4, maximum: c4 } = e6._zod.bag;
              "number" == typeof l4 && (i6.minItems = l4), "number" == typeof c4 && (i6.maxItems = c4);
              break;
            }
            case "record": {
              const e7 = n7;
              e7.type = "object", "draft-7" !== this.target && "draft-2020-12" !== this.target || (e7.propertyNames = this.process(s5.keyType, { ...t5, path: [...t5.path, "propertyNames"] })), e7.additionalProperties = this.process(s5.valueType, { ...t5, path: [...t5.path, "additionalProperties"] });
              break;
            }
            case "map":
              if ("throw" === this.unrepresentable)
                throw new Error("Map cannot be represented in JSON Schema");
              break;
            case "set":
              if ("throw" === this.unrepresentable)
                throw new Error("Set cannot be represented in JSON Schema");
              break;
            case "enum": {
              const e7 = n7, t6 = h3(s5.entries);
              t6.every((e8) => "number" == typeof e8) && (e7.type = "number"), t6.every((e8) => "string" == typeof e8) && (e7.type = "string"), e7.enum = t6;
              break;
            }
            case "literal": {
              const e7 = n7, t6 = [];
              for (const e8 of s5.values)
                if (void 0 === e8) {
                  if ("throw" === this.unrepresentable)
                    throw new Error("Literal `undefined` cannot be represented in JSON Schema");
                } else if ("bigint" == typeof e8) {
                  if ("throw" === this.unrepresentable)
                    throw new Error("BigInt literals cannot be represented in JSON Schema");
                  t6.push(Number(e8));
                } else
                  t6.push(e8);
              if (0 === t6.length)
                ;
              else if (1 === t6.length) {
                const n8 = t6[0];
                e7.type = null === n8 ? "null" : typeof n8, "draft-4" === this.target || "openapi-3.0" === this.target ? e7.enum = [n8] : e7.const = n8;
              } else
                t6.every((e8) => "number" == typeof e8) && (e7.type = "number"), t6.every((e8) => "string" == typeof e8) && (e7.type = "string"), t6.every((e8) => "boolean" == typeof e8) && (e7.type = "string"), t6.every((e8) => null === e8) && (e7.type = "null"), e7.enum = t6;
              break;
            }
            case "file": {
              const t6 = n7, i6 = { type: "string", format: "binary", contentEncoding: "binary" }, { minimum: r4, maximum: a6, mime: o5 } = e6._zod.bag;
              void 0 !== r4 && (i6.minLength = r4), void 0 !== a6 && (i6.maxLength = a6), o5 ? 1 === o5.length ? (i6.contentMediaType = o5[0], Object.assign(t6, i6)) : t6.anyOf = o5.map((e7) => ({ ...i6, contentMediaType: e7 })) : Object.assign(t6, i6);
              break;
            }
            case "transform":
              if ("throw" === this.unrepresentable)
                throw new Error("Transforms cannot be represented in JSON Schema");
              break;
            case "nullable": {
              const e7 = this.process(s5.innerType, t5);
              "openapi-3.0" === this.target ? (c3.ref = s5.innerType, n7.nullable = true) : n7.anyOf = [e7, { type: "null" }];
              break;
            }
            case "nonoptional":
            case "promise":
            case "optional":
              this.process(s5.innerType, t5), c3.ref = s5.innerType;
              break;
            case "success":
              n7.type = "boolean";
              break;
            case "default":
              this.process(s5.innerType, t5), c3.ref = s5.innerType, n7.default = JSON.parse(JSON.stringify(s5.defaultValue));
              break;
            case "prefault":
              this.process(s5.innerType, t5), c3.ref = s5.innerType, "input" === this.io && (n7._prefault = JSON.parse(JSON.stringify(s5.defaultValue)));
              break;
            case "catch": {
              let e7;
              this.process(s5.innerType, t5), c3.ref = s5.innerType;
              try {
                e7 = s5.catchValue(void 0);
              } catch (e8) {
                throw new Error("Dynamic catch values are not supported in JSON Schema");
              }
              n7.default = e7;
              break;
            }
            case "nan":
              if ("throw" === this.unrepresentable)
                throw new Error("NaN cannot be represented in JSON Schema");
              break;
            case "template_literal": {
              const t6 = n7, i6 = e6._zod.pattern;
              if (!i6)
                throw new Error("Pattern not found in template literal");
              t6.type = "string", t6.pattern = i6.source;
              break;
            }
            case "pipe": {
              const e7 = "input" === this.io ? "transform" === s5.in._zod.def.type ? s5.out : s5.in : s5.out;
              this.process(e7, t5), c3.ref = e7;
              break;
            }
            case "readonly":
              this.process(s5.innerType, t5), c3.ref = s5.innerType, n7.readOnly = true;
              break;
            case "lazy": {
              const n8 = e6._zod.innerType;
              this.process(n8, t5), c3.ref = n8;
              break;
            }
            case "custom":
              if ("throw" === this.unrepresentable)
                throw new Error("Custom types cannot be represented in JSON Schema");
              break;
            case "function":
              if ("throw" === this.unrepresentable)
                throw new Error("Function types cannot be represented in JSON Schema");
          }
        }
      }
      const m2 = this.metadataRegistry.get(e6);
      m2 && Object.assign(c3.schema, m2), "input" === this.io && gu(e6) && (delete c3.schema.examples, delete c3.schema.default), "input" === this.io && c3.schema._prefault && (null != (o4 = c3.schema).default || (o4.default = c3.schema._prefault)), delete c3.schema._prefault;
      return this.seen.get(e6).schema;
    }
    emit(e6, n6) {
      var t4, i4, r3, a5, o4, s5, u3, l3, c3, d2;
      const m2 = { cycles: null != (t4 = null == n6 ? void 0 : n6.cycles) ? t4 : "ref", reused: null != (i4 = null == n6 ? void 0 : n6.reused) ? i4 : "inline", external: null != (r3 = null == n6 ? void 0 : n6.external) ? r3 : void 0 }, p2 = this.seen.get(e6);
      if (!p2)
        throw new Error("Unprocessed schema. This is a bug in Zod.");
      const v4 = (e7) => {
        var n7, t5, i5, r4, a6;
        const o5 = "draft-2020-12" === this.target ? "$defs" : "definitions";
        if (m2.external) {
          const a7 = null == (n7 = m2.external.registry.get(e7[0])) ? void 0 : n7.id, s7 = null != (t5 = m2.external.uri) ? t5 : (e8) => e8;
          if (a7)
            return { ref: s7(a7) };
          const u5 = null != (r4 = null != (i5 = e7[1].defId) ? i5 : e7[1].schema.id) ? r4 : "schema" + this.counter++;
          return e7[1].defId = u5, { defId: u5, ref: `${s7("__shared")}#/${o5}/${u5}` };
        }
        if (e7[1] === p2)
          return { ref: "#" };
        const s6 = `#/${o5}/`, u4 = null != (a6 = e7[1].schema.id) ? a6 : "__schema" + this.counter++;
        return { defId: u4, ref: s6 + u4 };
      }, f2 = (e7) => {
        if (e7[1].schema.$ref)
          return;
        const n7 = e7[1], { ref: t5, defId: i5 } = v4(e7);
        n7.def = { ...n7.schema }, i5 && (n7.defId = i5);
        const r4 = n7.schema;
        for (const e8 in r4)
          delete r4[e8];
        r4.$ref = t5;
      };
      if ("throw" === m2.cycles)
        for (const e7 of this.seen.entries()) {
          const n7 = e7[1];
          if (n7.cycle)
            throw new Error(`Cycle detected: #/${null == (a5 = n7.cycle) ? void 0 : a5.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
        }
      for (const n7 of this.seen.entries()) {
        const t5 = n7[1];
        if (e6 === n7[0]) {
          f2(n7);
          continue;
        }
        if (m2.external) {
          const t6 = null == (o4 = m2.external.registry.get(n7[0])) ? void 0 : o4.id;
          if (e6 !== n7[0] && t6) {
            f2(n7);
            continue;
          }
        }
        (null == (s5 = this.metadataRegistry.get(n7[0])) ? void 0 : s5.id) ? f2(n7) : (t5.cycle || t5.count > 1 && "ref" === m2.reused) && f2(n7);
      }
      const g3 = (e7, n7) => {
        var t5, i5, r4;
        const a6 = this.seen.get(e7), o5 = null != (t5 = a6.def) ? t5 : a6.schema, s6 = { ...o5 };
        if (null === a6.ref)
          return;
        const u4 = a6.ref;
        if (a6.ref = null, u4) {
          g3(u4, n7);
          const e8 = this.seen.get(u4).schema;
          !e8.$ref || "draft-7" !== n7.target && "draft-4" !== n7.target && "openapi-3.0" !== n7.target ? (Object.assign(o5, e8), Object.assign(o5, s6)) : (o5.allOf = null != (i5 = o5.allOf) ? i5 : [], o5.allOf.push(e8));
        }
        a6.isParent || this.override({ zodSchema: e7, jsonSchema: o5, path: null != (r4 = a6.path) ? r4 : [] });
      };
      for (const e7 of [...this.seen.entries()].reverse())
        g3(e7[0], { target: this.target });
      const h4 = {};
      if ("draft-2020-12" === this.target ? h4.$schema = "https://json-schema.org/draft/2020-12/schema" : "draft-7" === this.target ? h4.$schema = "http://json-schema.org/draft-07/schema#" : "draft-4" === this.target ? h4.$schema = "http://json-schema.org/draft-04/schema#" : "openapi-3.0" === this.target || console.warn(`Invalid target: ${this.target}`), null == (u3 = m2.external) ? void 0 : u3.uri) {
        const n7 = null == (l3 = m2.external.registry.get(e6)) ? void 0 : l3.id;
        if (!n7)
          throw new Error("Schema is missing an `id` property");
        h4.$id = m2.external.uri(n7);
      }
      Object.assign(h4, p2.def);
      const b2 = null != (d2 = null == (c3 = m2.external) ? void 0 : c3.defs) ? d2 : {};
      for (const e7 of this.seen.entries()) {
        const n7 = e7[1];
        n7.def && n7.defId && (b2[n7.defId] = n7.def);
      }
      m2.external || Object.keys(b2).length > 0 && ("draft-2020-12" === this.target ? h4.$defs = b2 : h4.definitions = b2);
      try {
        return JSON.parse(JSON.stringify(h4));
      } catch (e7) {
        throw new Error("Error converting schema to JSON.");
      }
    }
  };
  function fu(e6, n6) {
    if (e6 instanceof uo) {
      const t5 = new vu(n6), i4 = {};
      for (const n7 of e6._idmap.entries()) {
        const [e7, i5] = n7;
        t5.process(i5);
      }
      const r3 = {}, a5 = { registry: e6, uri: null == n6 ? void 0 : n6.uri, defs: i4 };
      for (const i5 of e6._idmap.entries()) {
        const [e7, o4] = i5;
        r3[e7] = t5.emit(o4, { ...n6, external: a5 });
      }
      if (Object.keys(i4).length > 0) {
        const e7 = "draft-2020-12" === t5.target ? "$defs" : "definitions";
        r3.__shared = { [e7]: i4 };
      }
      return { schemas: r3 };
    }
    const t4 = new vu(n6);
    return t4.process(e6), t4.emit(e6, n6);
  }
  function gu(e6, n6) {
    const t4 = null != n6 ? n6 : { seen: /* @__PURE__ */ new Set() };
    if (t4.seen.has(e6))
      return false;
    t4.seen.add(e6);
    const i4 = e6._zod.def;
    switch (i4.type) {
      case "string":
      case "number":
      case "bigint":
      case "boolean":
      case "date":
      case "symbol":
      case "undefined":
      case "null":
      case "any":
      case "unknown":
      case "never":
      case "void":
      case "literal":
      case "enum":
      case "nan":
      case "file":
      case "template_literal":
      case "custom":
      case "success":
      case "catch":
      case "function":
        return false;
      case "array":
        return gu(i4.element, t4);
      case "object":
        for (const e7 in i4.shape)
          if (gu(i4.shape[e7], t4))
            return true;
        return false;
      case "union":
        for (const e7 of i4.options)
          if (gu(e7, t4))
            return true;
        return false;
      case "intersection":
        return gu(i4.left, t4) || gu(i4.right, t4);
      case "tuple":
        for (const e7 of i4.items)
          if (gu(e7, t4))
            return true;
        return !(!i4.rest || !gu(i4.rest, t4));
      case "record":
      case "map":
        return gu(i4.keyType, t4) || gu(i4.valueType, t4);
      case "set":
        return gu(i4.valueType, t4);
      case "promise":
      case "optional":
      case "nonoptional":
      case "nullable":
      case "readonly":
      case "default":
      case "prefault":
        return gu(i4.innerType, t4);
      case "lazy":
        return gu(i4.getter(), t4);
      case "transform":
        return true;
      case "pipe":
        return gu(i4.in, t4) || gu(i4.out, t4);
    }
    throw new Error(`Unknown schema type: ${i4.type}`);
  }
  var hu = {};
  var bu = {};
  n5(bu, { ZodISODate: () => _u, ZodISODateTime: () => yu, ZodISODuration: () => Su, ZodISOTime: () => wu, date: () => ku, datetime: () => $u, duration: () => zu, time: () => Iu });
  var yu = a4("ZodISODateTime", (e6, n6) => {
    Bt.init(e6, n6), Gu.init(e6, n6);
  });
  function $u(e6) {
    return Ao(yu, e6);
  }
  var _u = a4("ZodISODate", (e6, n6) => {
    Kt2.init(e6, n6), Gu.init(e6, n6);
  });
  function ku(e6) {
    return Co(_u, e6);
  }
  var wu = a4("ZodISOTime", (e6, n6) => {
    qt.init(e6, n6), Gu.init(e6, n6);
  });
  function Iu(e6) {
    return Jo(wu, e6);
  }
  var Su = a4("ZodISODuration", (e6, n6) => {
    Xt2.init(e6, n6), Gu.init(e6, n6);
  });
  function zu(e6) {
    return Lo(Su, e6);
  }
  var xu = (e6, n6) => {
    $e2.init(e6, n6), e6.name = "ZodError", Object.defineProperties(e6, { format: { value: (n7) => we2(e6, n7) }, flatten: { value: (n7) => ke2(e6, n7) }, addIssue: { value: (n7) => {
      e6.issues.push(n7), e6.message = JSON.stringify(e6.issues, y2, 2);
    } }, addIssues: { value: (n7) => {
      e6.issues.push(...n7), e6.message = JSON.stringify(e6.issues, y2, 2);
    } }, isEmpty: { get: () => 0 === e6.issues.length } });
  };
  var ju = a4("ZodError", xu);
  var Ou = a4("ZodError", xu, { Parent: Error });
  var Uu = xe2(Ou);
  var Nu = Oe2(Ou);
  var Pu = Ne2(Ou);
  var Du = De2(Ou);
  var Zu = Ee2(Ou);
  var Eu = Ae2(Ou);
  var Tu = Je2(Ou);
  var Au = Re2(Ou);
  var Cu = Me2(Ou);
  var Ju = Ve2(Ou);
  var Lu = Be2(Ou);
  var Ru = qe2(Ou);
  var Fu = a4("ZodType", (e6, n6) => (Dt.init(e6, n6), e6.def = n6, e6.type = n6.type, Object.defineProperty(e6, "_def", { value: n6 }), e6.check = (...t4) => {
    var i4;
    return e6.clone(d.mergeDefs(n6, { checks: [...null != (i4 = n6.checks) ? i4 : [], ...t4.map((e7) => "function" == typeof e7 ? { _zod: { check: e7, def: { check: "custom" }, onattach: [] } } : e7)] }));
  }, e6.clone = (n7, t4) => W2(e6, n7, t4), e6.brand = () => e6, e6.register = (n7, t4) => (n7.add(e6, t4), e6), e6.parse = (n7, t4) => Uu(e6, n7, t4, { callee: e6.parse }), e6.safeParse = (n7, t4) => Pu(e6, n7, t4), e6.parseAsync = async (n7, t4) => Nu(e6, n7, t4, { callee: e6.parseAsync }), e6.safeParseAsync = async (n7, t4) => Du(e6, n7, t4), e6.spa = e6.safeParseAsync, e6.encode = (n7, t4) => Zu(e6, n7, t4), e6.decode = (n7, t4) => Eu(e6, n7, t4), e6.encodeAsync = async (n7, t4) => Tu(e6, n7, t4), e6.decodeAsync = async (n7, t4) => Au(e6, n7, t4), e6.safeEncode = (n7, t4) => Cu(e6, n7, t4), e6.safeDecode = (n7, t4) => Ju(e6, n7, t4), e6.safeEncodeAsync = async (n7, t4) => Lu(e6, n7, t4), e6.safeDecodeAsync = async (n7, t4) => Ru(e6, n7, t4), e6.refine = (n7, t4) => e6.check(jd(n7, t4)), e6.superRefine = (n7) => e6.check(Od(n7)), e6.overwrite = (n7) => e6.check(Ds(n7)), e6.optional = () => qc(e6), e6.nullable = () => Hc(e6), e6.nullish = () => qc(Hc(e6)), e6.nonoptional = (n7) => rd(e6, n7), e6.array = () => bc(e6), e6.or = (n7) => Sc([e6, n7]), e6.and = (n7) => Oc(e6, n7), e6.transform = (n7) => md(e6, Bc(n7)), e6.default = (n7) => ed(e6, n7), e6.prefault = (n7) => td(e6, n7), e6.catch = (n7) => ud(e6, n7), e6.pipe = (n7) => md(e6, n7), e6.readonly = () => gd(e6), e6.describe = (n7) => {
    const t4 = e6.clone();
    return co.add(t4, { description: n7 }), t4;
  }, Object.defineProperty(e6, "description", { get() {
    var n7;
    return null == (n7 = co.get(e6)) ? void 0 : n7.description;
  }, configurable: true }), e6.meta = (...n7) => {
    if (0 === n7.length)
      return co.get(e6);
    const t4 = e6.clone();
    return co.add(t4, n7[0]), t4;
  }, e6.isOptional = () => e6.safeParse(void 0).success, e6.isNullable = () => e6.safeParse(null).success, e6));
  var Mu = a4("_ZodString", (e6, n6) => {
    var t4, i4, r3;
    Zt.init(e6, n6), Fu.init(e6, n6);
    const a5 = e6._zod.bag;
    e6.format = null != (t4 = a5.format) ? t4 : null, e6.minLength = null != (i4 = a5.minimum) ? i4 : null, e6.maxLength = null != (r3 = a5.maximum) ? r3 : null, e6.regex = (...n7) => e6.check(Ss(...n7)), e6.includes = (...n7) => e6.check(js(...n7)), e6.startsWith = (...n7) => e6.check(Os(...n7)), e6.endsWith = (...n7) => e6.check(Us(...n7)), e6.min = (...n7) => e6.check(ws(...n7)), e6.max = (...n7) => e6.check(ks(...n7)), e6.length = (...n7) => e6.check(Is(...n7)), e6.nonempty = (...n7) => e6.check(ws(1, ...n7)), e6.lowercase = (n7) => e6.check(zs(n7)), e6.uppercase = (n7) => e6.check(xs(n7)), e6.trim = () => e6.check(Es()), e6.normalize = (...n7) => e6.check(Zs(...n7)), e6.toLowerCase = () => e6.check(Ts()), e6.toUpperCase = () => e6.check(As());
  });
  var Wu = a4("ZodString", (e6, n6) => {
    Zt.init(e6, n6), Mu.init(e6, n6), e6.email = (n7) => e6.check(vo(Bu, n7)), e6.url = (n7) => e6.check($o(tl, n7)), e6.jwt = (n7) => e6.check(Eo(Dl, n7)), e6.emoji = (n7) => e6.check(_o(al, n7)), e6.guid = (n7) => e6.check(fo(qu, n7)), e6.uuid = (n7) => e6.check(go(Hu, n7)), e6.uuidv4 = (n7) => e6.check(ho(Hu, n7)), e6.uuidv6 = (n7) => e6.check(bo(Hu, n7)), e6.uuidv7 = (n7) => e6.check(yo(Hu, n7)), e6.nanoid = (n7) => e6.check(ko(sl, n7)), e6.guid = (n7) => e6.check(fo(qu, n7)), e6.cuid = (n7) => e6.check(wo(ll, n7)), e6.cuid2 = (n7) => e6.check(Io(dl, n7)), e6.ulid = (n7) => e6.check(So(pl, n7)), e6.base64 = (n7) => e6.check(Po(xl, n7)), e6.base64url = (n7) => e6.check(Do(Ol, n7)), e6.xid = (n7) => e6.check(zo(fl, n7)), e6.ksuid = (n7) => e6.check(xo(hl, n7)), e6.ipv4 = (n7) => e6.check(jo(yl, n7)), e6.ipv6 = (n7) => e6.check(Oo(_l, n7)), e6.cidrv4 = (n7) => e6.check(Uo(wl, n7)), e6.cidrv6 = (n7) => e6.check(No(Sl, n7)), e6.e164 = (n7) => e6.check(Zo(Nl, n7)), e6.datetime = (n7) => e6.check($u(n7)), e6.date = (n7) => e6.check(ku(n7)), e6.time = (n7) => e6.check(Iu(n7)), e6.duration = (n7) => e6.check(zu(n7));
  });
  function Vu(e6) {
    return mo(Wu, e6);
  }
  var Gu = a4("ZodStringFormat", (e6, n6) => {
    Et.init(e6, n6), Mu.init(e6, n6);
  });
  var Bu = a4("ZodEmail", (e6, n6) => {
    Ct2.init(e6, n6), Gu.init(e6, n6);
  });
  function Ku(e6) {
    return vo(Bu, e6);
  }
  var qu = a4("ZodGUID", (e6, n6) => {
    Tt2.init(e6, n6), Gu.init(e6, n6);
  });
  function Xu(e6) {
    return fo(qu, e6);
  }
  var Hu = a4("ZodUUID", (e6, n6) => {
    At.init(e6, n6), Gu.init(e6, n6);
  });
  function Yu(e6) {
    return go(Hu, e6);
  }
  function Qu(e6) {
    return ho(Hu, e6);
  }
  function el(e6) {
    return bo(Hu, e6);
  }
  function nl(e6) {
    return yo(Hu, e6);
  }
  var tl = a4("ZodURL", (e6, n6) => {
    Jt2.init(e6, n6), Gu.init(e6, n6);
  });
  function il(e6) {
    return $o(tl, e6);
  }
  function rl(e6) {
    return $o(tl, { protocol: /^https?$/, hostname: He2.domain, ...d.normalizeParams(e6) });
  }
  var al = a4("ZodEmoji", (e6, n6) => {
    Lt2.init(e6, n6), Gu.init(e6, n6);
  });
  function ol(e6) {
    return _o(al, e6);
  }
  var sl = a4("ZodNanoID", (e6, n6) => {
    Rt.init(e6, n6), Gu.init(e6, n6);
  });
  function ul(e6) {
    return ko(sl, e6);
  }
  var ll = a4("ZodCUID", (e6, n6) => {
    Ft2.init(e6, n6), Gu.init(e6, n6);
  });
  function cl(e6) {
    return wo(ll, e6);
  }
  var dl = a4("ZodCUID2", (e6, n6) => {
    Mt2.init(e6, n6), Gu.init(e6, n6);
  });
  function ml(e6) {
    return Io(dl, e6);
  }
  var pl = a4("ZodULID", (e6, n6) => {
    Wt2.init(e6, n6), Gu.init(e6, n6);
  });
  function vl(e6) {
    return So(pl, e6);
  }
  var fl = a4("ZodXID", (e6, n6) => {
    Vt.init(e6, n6), Gu.init(e6, n6);
  });
  function gl(e6) {
    return zo(fl, e6);
  }
  var hl = a4("ZodKSUID", (e6, n6) => {
    Gt2.init(e6, n6), Gu.init(e6, n6);
  });
  function bl(e6) {
    return xo(hl, e6);
  }
  var yl = a4("ZodIPv4", (e6, n6) => {
    Ht2.init(e6, n6), Gu.init(e6, n6);
  });
  function $l(e6) {
    return jo(yl, e6);
  }
  var _l = a4("ZodIPv6", (e6, n6) => {
    Yt.init(e6, n6), Gu.init(e6, n6);
  });
  function kl(e6) {
    return Oo(_l, e6);
  }
  var wl = a4("ZodCIDRv4", (e6, n6) => {
    Qt2.init(e6, n6), Gu.init(e6, n6);
  });
  function Il(e6) {
    return Uo(wl, e6);
  }
  var Sl = a4("ZodCIDRv6", (e6, n6) => {
    ei2.init(e6, n6), Gu.init(e6, n6);
  });
  function zl(e6) {
    return No(Sl, e6);
  }
  var xl = a4("ZodBase64", (e6, n6) => {
    ti.init(e6, n6), Gu.init(e6, n6);
  });
  function jl(e6) {
    return Po(xl, e6);
  }
  var Ol = a4("ZodBase64URL", (e6, n6) => {
    ri.init(e6, n6), Gu.init(e6, n6);
  });
  function Ul(e6) {
    return Do(Ol, e6);
  }
  var Nl = a4("ZodE164", (e6, n6) => {
    ai2.init(e6, n6), Gu.init(e6, n6);
  });
  function Pl(e6) {
    return Zo(Nl, e6);
  }
  var Dl = a4("ZodJWT", (e6, n6) => {
    si.init(e6, n6), Gu.init(e6, n6);
  });
  function Zl(e6) {
    return Eo(Dl, e6);
  }
  var El = a4("ZodCustomStringFormat", (e6, n6) => {
    ui.init(e6, n6), Gu.init(e6, n6);
  });
  function Tl(e6, n6, t4 = {}) {
    return pu(El, e6, n6, t4);
  }
  function Al(e6) {
    return pu(El, "hostname", He2.hostname, e6);
  }
  function Cl(e6) {
    return pu(El, "hex", He2.hex, e6);
  }
  function Jl(e6, n6) {
    var t4;
    const i4 = `${e6}_${null != (t4 = null == n6 ? void 0 : n6.enc) ? t4 : "hex"}`, r3 = He2[i4];
    if (!r3)
      throw new Error(`Unrecognized hash format: ${i4}`);
    return pu(El, i4, r3, n6);
  }
  var Ll = a4("ZodNumber", (e6, n6) => {
    var t4, i4, r3, a5, o4, s5, u3, l3, c3;
    li.init(e6, n6), Fu.init(e6, n6), e6.gt = (n7, t5) => e6.check(ms(n7, t5)), e6.gte = (n7, t5) => e6.check(ps(n7, t5)), e6.min = (n7, t5) => e6.check(ps(n7, t5)), e6.lt = (n7, t5) => e6.check(cs(n7, t5)), e6.lte = (n7, t5) => e6.check(ds(n7, t5)), e6.max = (n7, t5) => e6.check(ds(n7, t5)), e6.int = (n7) => e6.check(Ml(n7)), e6.safe = (n7) => e6.check(Ml(n7)), e6.positive = (n7) => e6.check(ms(0, n7)), e6.nonnegative = (n7) => e6.check(ps(0, n7)), e6.negative = (n7) => e6.check(cs(0, n7)), e6.nonpositive = (n7) => e6.check(ds(0, n7)), e6.multipleOf = (n7, t5) => e6.check(bs(n7, t5)), e6.step = (n7, t5) => e6.check(bs(n7, t5)), e6.finite = () => e6;
    const d2 = e6._zod.bag;
    e6.minValue = null != (r3 = Math.max(null != (t4 = d2.minimum) ? t4 : Number.NEGATIVE_INFINITY, null != (i4 = d2.exclusiveMinimum) ? i4 : Number.NEGATIVE_INFINITY)) ? r3 : null, e6.maxValue = null != (s5 = Math.min(null != (a5 = d2.maximum) ? a5 : Number.POSITIVE_INFINITY, null != (o4 = d2.exclusiveMaximum) ? o4 : Number.POSITIVE_INFINITY)) ? s5 : null, e6.isInt = (null != (u3 = d2.format) ? u3 : "").includes("int") || Number.isSafeInteger(null != (l3 = d2.multipleOf) ? l3 : 0.5), e6.isFinite = true, e6.format = null != (c3 = d2.format) ? c3 : null;
  });
  function Rl(e6) {
    return Ro(Ll, e6);
  }
  var Fl = a4("ZodNumberFormat", (e6, n6) => {
    ci.init(e6, n6), Ll.init(e6, n6);
  });
  function Ml(e6) {
    return Mo(Fl, e6);
  }
  function Wl(e6) {
    return Wo(Fl, e6);
  }
  function Vl(e6) {
    return Vo(Fl, e6);
  }
  function Gl(e6) {
    return Go(Fl, e6);
  }
  function Bl(e6) {
    return Bo(Fl, e6);
  }
  var Kl = a4("ZodBoolean", (e6, n6) => {
    di.init(e6, n6), Fu.init(e6, n6);
  });
  function ql(e6) {
    return Ko(Kl, e6);
  }
  var Xl = a4("ZodBigInt", (e6, n6) => {
    var t4, i4, r3;
    mi.init(e6, n6), Fu.init(e6, n6), e6.gte = (n7, t5) => e6.check(ps(n7, t5)), e6.min = (n7, t5) => e6.check(ps(n7, t5)), e6.gt = (n7, t5) => e6.check(ms(n7, t5)), e6.gte = (n7, t5) => e6.check(ps(n7, t5)), e6.min = (n7, t5) => e6.check(ps(n7, t5)), e6.lt = (n7, t5) => e6.check(cs(n7, t5)), e6.lte = (n7, t5) => e6.check(ds(n7, t5)), e6.max = (n7, t5) => e6.check(ds(n7, t5)), e6.positive = (n7) => e6.check(ms(BigInt(0), n7)), e6.negative = (n7) => e6.check(cs(BigInt(0), n7)), e6.nonpositive = (n7) => e6.check(ds(BigInt(0), n7)), e6.nonnegative = (n7) => e6.check(ps(BigInt(0), n7)), e6.multipleOf = (n7, t5) => e6.check(bs(n7, t5));
    const a5 = e6._zod.bag;
    e6.minValue = null != (t4 = a5.minimum) ? t4 : null, e6.maxValue = null != (i4 = a5.maximum) ? i4 : null, e6.format = null != (r3 = a5.format) ? r3 : null;
  });
  function Hl(e6) {
    return Xo(Xl, e6);
  }
  var Yl = a4("ZodBigIntFormat", (e6, n6) => {
    pi.init(e6, n6), Xl.init(e6, n6);
  });
  function Ql(e6) {
    return Yo(Yl, e6);
  }
  function ec(e6) {
    return Qo(Yl, e6);
  }
  var nc = a4("ZodSymbol", (e6, n6) => {
    vi.init(e6, n6), Fu.init(e6, n6);
  });
  function tc(e6) {
    return es(nc, e6);
  }
  var ic = a4("ZodUndefined", (e6, n6) => {
    fi.init(e6, n6), Fu.init(e6, n6);
  });
  function rc(e6) {
    return ns(ic, e6);
  }
  var ac = a4("ZodNull", (e6, n6) => {
    gi.init(e6, n6), Fu.init(e6, n6);
  });
  function oc(e6) {
    return ts(ac, e6);
  }
  var sc = a4("ZodAny", (e6, n6) => {
    hi.init(e6, n6), Fu.init(e6, n6);
  });
  function uc() {
    return is(sc);
  }
  var lc = a4("ZodUnknown", (e6, n6) => {
    bi.init(e6, n6), Fu.init(e6, n6);
  });
  function cc() {
    return rs(lc);
  }
  var dc = a4("ZodNever", (e6, n6) => {
    yi.init(e6, n6), Fu.init(e6, n6);
  });
  function mc(e6) {
    return as(dc, e6);
  }
  var pc = a4("ZodVoid", (e6, n6) => {
    $i.init(e6, n6), Fu.init(e6, n6);
  });
  function vc(e6) {
    return os(pc, e6);
  }
  var fc = a4("ZodDate", (e6, n6) => {
    _i.init(e6, n6), Fu.init(e6, n6), e6.min = (n7, t5) => e6.check(ps(n7, t5)), e6.max = (n7, t5) => e6.check(ds(n7, t5));
    const t4 = e6._zod.bag;
    e6.minDate = t4.minimum ? new Date(t4.minimum) : null, e6.maxDate = t4.maximum ? new Date(t4.maximum) : null;
  });
  function gc(e6) {
    return ss(fc, e6);
  }
  var hc = a4("ZodArray", (e6, n6) => {
    wi.init(e6, n6), Fu.init(e6, n6), e6.element = n6.element, e6.min = (n7, t4) => e6.check(ws(n7, t4)), e6.nonempty = (n7) => e6.check(ws(1, n7)), e6.max = (n7, t4) => e6.check(ks(n7, t4)), e6.length = (n7, t4) => e6.check(Is(n7, t4)), e6.unwrap = () => e6.element;
  });
  function bc(e6, n6) {
    return Cs(hc, e6, n6);
  }
  function yc(e6) {
    const n6 = e6._zod.def.shape;
    return Lc(Object.keys(n6));
  }
  var $c = a4("ZodObject", (e6, n6) => {
    ji.init(e6, n6), Fu.init(e6, n6), d.defineLazy(e6, "shape", () => n6.shape), e6.keyof = () => Lc(Object.keys(e6._zod.def.shape)), e6.catchall = (n7) => e6.clone({ ...e6._zod.def, catchall: n7 }), e6.passthrough = () => e6.clone({ ...e6._zod.def, catchall: cc() }), e6.loose = () => e6.clone({ ...e6._zod.def, catchall: cc() }), e6.strict = () => e6.clone({ ...e6._zod.def, catchall: mc() }), e6.strip = () => e6.clone({ ...e6._zod.def, catchall: void 0 }), e6.extend = (n7) => d.extend(e6, n7), e6.safeExtend = (n7) => d.safeExtend(e6, n7), e6.merge = (n7) => d.merge(e6, n7), e6.pick = (n7) => d.pick(e6, n7), e6.omit = (n7) => d.omit(e6, n7), e6.partial = (...n7) => d.partial(Kc, e6, n7[0]), e6.required = (...n7) => d.required(id, e6, n7[0]);
  });
  function _c(e6, n6) {
    const t4 = { type: "object", shape: null != e6 ? e6 : {}, ...d.normalizeParams(n6) };
    return new $c(t4);
  }
  function kc(e6, n6) {
    return new $c({ type: "object", shape: e6, catchall: mc(), ...d.normalizeParams(n6) });
  }
  function wc(e6, n6) {
    return new $c({ type: "object", shape: e6, catchall: cc(), ...d.normalizeParams(n6) });
  }
  var Ic = a4("ZodUnion", (e6, n6) => {
    Ui.init(e6, n6), Fu.init(e6, n6), e6.options = n6.options;
  });
  function Sc(e6, n6) {
    return new Ic({ type: "union", options: e6, ...d.normalizeParams(n6) });
  }
  var zc = a4("ZodDiscriminatedUnion", (e6, n6) => {
    Ic.init(e6, n6), Ni.init(e6, n6);
  });
  function xc(e6, n6, t4) {
    return new zc({ type: "union", options: n6, discriminator: e6, ...d.normalizeParams(t4) });
  }
  var jc = a4("ZodIntersection", (e6, n6) => {
    Pi.init(e6, n6), Fu.init(e6, n6);
  });
  function Oc(e6, n6) {
    return new jc({ type: "intersection", left: e6, right: n6 });
  }
  var Uc = a4("ZodTuple", (e6, n6) => {
    Ei.init(e6, n6), Fu.init(e6, n6), e6.rest = (n7) => e6.clone({ ...e6._zod.def, rest: n7 });
  });
  function Nc(e6, n6, t4) {
    const i4 = n6 instanceof Dt, r3 = i4 ? t4 : n6;
    return new Uc({ type: "tuple", items: e6, rest: i4 ? n6 : null, ...d.normalizeParams(r3) });
  }
  var Pc = a4("ZodRecord", (e6, n6) => {
    Ai.init(e6, n6), Fu.init(e6, n6), e6.keyType = n6.keyType, e6.valueType = n6.valueType;
  });
  function Dc(e6, n6, t4) {
    return new Pc({ type: "record", keyType: e6, valueType: n6, ...d.normalizeParams(t4) });
  }
  function Zc(e6, n6, t4) {
    const i4 = W2(e6);
    return i4._zod.values = void 0, new Pc({ type: "record", keyType: i4, valueType: n6, ...d.normalizeParams(t4) });
  }
  var Ec = a4("ZodMap", (e6, n6) => {
    Ci.init(e6, n6), Fu.init(e6, n6), e6.keyType = n6.keyType, e6.valueType = n6.valueType;
  });
  function Tc(e6, n6, t4) {
    return new Ec({ type: "map", keyType: e6, valueType: n6, ...d.normalizeParams(t4) });
  }
  var Ac = a4("ZodSet", (e6, n6) => {
    Li.init(e6, n6), Fu.init(e6, n6), e6.min = (...n7) => e6.check($s(...n7)), e6.nonempty = (n7) => e6.check($s(1, n7)), e6.max = (...n7) => e6.check(ys(...n7)), e6.size = (...n7) => e6.check(_s(...n7));
  });
  function Cc(e6, n6) {
    return new Ac({ type: "set", valueType: e6, ...d.normalizeParams(n6) });
  }
  var Jc = a4("ZodEnum", (e6, n6) => {
    Fi.init(e6, n6), Fu.init(e6, n6), e6.enum = n6.entries, e6.options = Object.values(n6.entries);
    const t4 = new Set(Object.keys(n6.entries));
    e6.extract = (e7, i4) => {
      const r3 = {};
      for (const i5 of e7) {
        if (!t4.has(i5))
          throw new Error(`Key ${i5} not found in enum`);
        r3[i5] = n6.entries[i5];
      }
      return new Jc({ ...n6, checks: [], ...d.normalizeParams(i4), entries: r3 });
    }, e6.exclude = (e7, i4) => {
      const r3 = { ...n6.entries };
      for (const n7 of e7) {
        if (!t4.has(n7))
          throw new Error(`Key ${n7} not found in enum`);
        delete r3[n7];
      }
      return new Jc({ ...n6, checks: [], ...d.normalizeParams(i4), entries: r3 });
    };
  });
  function Lc(e6, n6) {
    const t4 = Array.isArray(e6) ? Object.fromEntries(e6.map((e7) => [e7, e7])) : e6;
    return new Jc({ type: "enum", entries: t4, ...d.normalizeParams(n6) });
  }
  function Rc(e6, n6) {
    return new Jc({ type: "enum", entries: e6, ...d.normalizeParams(n6) });
  }
  var Fc = a4("ZodLiteral", (e6, n6) => {
    Mi.init(e6, n6), Fu.init(e6, n6), e6.values = new Set(n6.values), Object.defineProperty(e6, "value", { get() {
      if (n6.values.length > 1)
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      return n6.values[0];
    } });
  });
  function Mc(e6, n6) {
    return new Fc({ type: "literal", values: Array.isArray(e6) ? e6 : [e6], ...d.normalizeParams(n6) });
  }
  var Wc = a4("ZodFile", (e6, n6) => {
    Wi.init(e6, n6), Fu.init(e6, n6), e6.min = (n7, t4) => e6.check($s(n7, t4)), e6.max = (n7, t4) => e6.check(ys(n7, t4)), e6.mime = (n7, t4) => e6.check(Ps(Array.isArray(n7) ? n7 : [n7], t4));
  });
  function Vc(e6) {
    return qs(Wc, e6);
  }
  var Gc = a4("ZodTransform", (e6, n6) => {
    Vi.init(e6, n6), Fu.init(e6, n6), e6._zod.parse = (t4, i4) => {
      if ("backward" === i4.direction)
        throw new u2(e6.constructor.name);
      t4.addIssue = (i5) => {
        if ("string" == typeof i5)
          t4.issues.push(d.issue(i5, t4.value, n6));
        else {
          const n7 = i5;
          n7.fatal && (n7.continue = false), null != n7.code || (n7.code = "custom"), null != n7.input || (n7.input = t4.value), null != n7.inst || (n7.inst = e6), t4.issues.push(d.issue(n7));
        }
      };
      const r3 = n6.transform(t4.value, t4);
      return r3 instanceof Promise ? r3.then((e7) => (t4.value = e7, t4)) : (t4.value = r3, t4);
    };
  });
  function Bc(e6) {
    return new Gc({ type: "transform", transform: e6 });
  }
  var Kc = a4("ZodOptional", (e6, n6) => {
    Bi.init(e6, n6), Fu.init(e6, n6), e6.unwrap = () => e6._zod.def.innerType;
  });
  function qc(e6) {
    return new Kc({ type: "optional", innerType: e6 });
  }
  var Xc = a4("ZodNullable", (e6, n6) => {
    Ki.init(e6, n6), Fu.init(e6, n6), e6.unwrap = () => e6._zod.def.innerType;
  });
  function Hc(e6) {
    return new Xc({ type: "nullable", innerType: e6 });
  }
  function Yc(e6) {
    return qc(Hc(e6));
  }
  var Qc = a4("ZodDefault", (e6, n6) => {
    qi.init(e6, n6), Fu.init(e6, n6), e6.unwrap = () => e6._zod.def.innerType, e6.removeDefault = e6.unwrap;
  });
  function ed(e6, n6) {
    return new Qc({ type: "default", innerType: e6, get defaultValue() {
      return "function" == typeof n6 ? n6() : d.shallowClone(n6);
    } });
  }
  var nd = a4("ZodPrefault", (e6, n6) => {
    Hi.init(e6, n6), Fu.init(e6, n6), e6.unwrap = () => e6._zod.def.innerType;
  });
  function td(e6, n6) {
    return new nd({ type: "prefault", innerType: e6, get defaultValue() {
      return "function" == typeof n6 ? n6() : d.shallowClone(n6);
    } });
  }
  var id = a4("ZodNonOptional", (e6, n6) => {
    Yi.init(e6, n6), Fu.init(e6, n6), e6.unwrap = () => e6._zod.def.innerType;
  });
  function rd(e6, n6) {
    return new id({ type: "nonoptional", innerType: e6, ...d.normalizeParams(n6) });
  }
  var ad = a4("ZodSuccess", (e6, n6) => {
    er.init(e6, n6), Fu.init(e6, n6), e6.unwrap = () => e6._zod.def.innerType;
  });
  function od(e6) {
    return new ad({ type: "success", innerType: e6 });
  }
  var sd = a4("ZodCatch", (e6, n6) => {
    nr.init(e6, n6), Fu.init(e6, n6), e6.unwrap = () => e6._zod.def.innerType, e6.removeCatch = e6.unwrap;
  });
  function ud(e6, n6) {
    return new sd({ type: "catch", innerType: e6, catchValue: "function" == typeof n6 ? n6 : () => n6 });
  }
  var ld = a4("ZodNaN", (e6, n6) => {
    tr.init(e6, n6), Fu.init(e6, n6);
  });
  function cd(e6) {
    return ls(ld, e6);
  }
  var dd = a4("ZodPipe", (e6, n6) => {
    ir.init(e6, n6), Fu.init(e6, n6), e6.in = n6.in, e6.out = n6.out;
  });
  function md(e6, n6) {
    return new dd({ type: "pipe", in: e6, out: n6 });
  }
  var pd = a4("ZodCodec", (e6, n6) => {
    dd.init(e6, n6), ar.init(e6, n6);
  });
  function vd(e6, n6, t4) {
    return new pd({ type: "pipe", in: e6, out: n6, transform: t4.decode, reverseTransform: t4.encode });
  }
  var fd = a4("ZodReadonly", (e6, n6) => {
    ur.init(e6, n6), Fu.init(e6, n6), e6.unwrap = () => e6._zod.def.innerType;
  });
  function gd(e6) {
    return new fd({ type: "readonly", innerType: e6 });
  }
  var hd = a4("ZodTemplateLiteral", (e6, n6) => {
    cr.init(e6, n6), Fu.init(e6, n6);
  });
  function bd(e6, n6) {
    return new hd({ type: "template_literal", parts: e6, ...d.normalizeParams(n6) });
  }
  var yd = a4("ZodLazy", (e6, n6) => {
    pr.init(e6, n6), Fu.init(e6, n6), e6.unwrap = () => e6._zod.def.getter();
  });
  function $d(e6) {
    return new yd({ type: "lazy", getter: e6 });
  }
  var _d = a4("ZodPromise", (e6, n6) => {
    mr.init(e6, n6), Fu.init(e6, n6), e6.unwrap = () => e6._zod.def.innerType;
  });
  function kd(e6) {
    return new _d({ type: "promise", innerType: e6 });
  }
  var wd = a4("ZodFunction", (e6, n6) => {
    dr.init(e6, n6), Fu.init(e6, n6);
  });
  function Id(e6) {
    var n6, t4;
    return new wd({ type: "function", input: Array.isArray(null == e6 ? void 0 : e6.input) ? Nc(null == e6 ? void 0 : e6.input) : null != (n6 = null == e6 ? void 0 : e6.input) ? n6 : bc(cc()), output: null != (t4 = null == e6 ? void 0 : e6.output) ? t4 : cc() });
  }
  var Sd = a4("ZodCustom", (e6, n6) => {
    vr.init(e6, n6), Fu.init(e6, n6);
  });
  function zd(e6) {
    const n6 = new st2({ check: "custom" });
    return n6._zod.check = e6, n6;
  }
  function xd(e6, n6) {
    return uu(Sd, null != e6 ? e6 : () => true, n6);
  }
  function jd(e6, n6 = {}) {
    return lu(Sd, e6, n6);
  }
  function Od(e6) {
    return cu(e6);
  }
  function Ud(e6, n6 = { error: `Input not instance of ${e6.name}` }) {
    const t4 = new Sd({ type: "custom", check: "custom", fn: (n7) => n7 instanceof e6, abort: true, ...d.normalizeParams(n6) });
    return t4._zod.bag.Class = e6, t4;
  }
  var Nd = (...e6) => mu({ Codec: pd, Boolean: Kl, String: Wu }, ...e6);
  function Pd(e6) {
    const n6 = $d(() => Sc([Vu(e6), Rl(), ql(), oc(), bc(n6), Dc(Vu(), n6)]));
    return n6;
  }
  function Dd(e6, n6) {
    return md(Bc(e6), n6);
  }
  var Zd;
  var Ed = { invalid_type: "invalid_type", too_big: "too_big", too_small: "too_small", invalid_format: "invalid_format", not_multiple_of: "not_multiple_of", unrecognized_keys: "unrecognized_keys", invalid_union: "invalid_union", invalid_key: "invalid_key", invalid_element: "invalid_element", invalid_value: "invalid_value", custom: "custom" };
  function Td(e6) {
    c2({ customError: e6 });
  }
  function Ad() {
    return c2().customError;
  }
  Zd || (Zd = {});
  var Cd = {};
  function Jd(e6) {
    return po(Wu, e6);
  }
  function Ld(e6) {
    return Fo(Ll, e6);
  }
  function Rd(e6) {
    return qo(Kl, e6);
  }
  function Fd(e6) {
    return Ho(Xl, e6);
  }
  function Md(e6) {
    return us(fc, e6);
  }
  n5(Cd, { bigint: () => Fd, boolean: () => Rd, date: () => Md, number: () => Ld, string: () => Jd }), c2(Er());
  var Wd = Object.defineProperty;
  var Vd = (e6, n6) => {
    for (var t4 in n6)
      Wd(e6, t4, { get: n6[t4], enumerable: true });
  };
  function Gd(e6, n6, i4 = "draft-7") {
    return t3.toJSONSchema(e6, { target: i4 });
  }
  var Bd = t3.string();
  var Kd = t3.number();
  var qd = (t3.boolean(), t3.string().min(1));
  var Xd = t3.number().int().positive();
  var Hd = t3.number().int().nonnegative();
  var Yd = t3.number().describe("Tagging version number");
  t3.union([t3.string(), t3.number(), t3.boolean()]).optional();
  Vd({}, { ErrorHandlerSchema: () => tm, HandlerSchema: () => rm, LogHandlerSchema: () => im, StorageSchema: () => nm, StorageTypeSchema: () => em, errorHandlerJsonSchema: () => sm, handlerJsonSchema: () => lm, logHandlerJsonSchema: () => um, storageJsonSchema: () => om, storageTypeJsonSchema: () => am });
  var Qd;
  var em = t3.enum(["local", "session", "cookie"]).describe("Storage mechanism: local, session, or cookie");
  var nm = t3.object({ Local: t3.literal("local"), Session: t3.literal("session"), Cookie: t3.literal("cookie") }).describe("Storage type constants for type-safe references");
  var tm = t3.any().describe("Error handler function: (error, state?) => void");
  var im = t3.any().describe("Log handler function: (message, verbose?) => void");
  var rm = t3.object({ Error: tm.describe("Error handler function"), Log: im.describe("Log handler function") }).describe("Handler interface with error and log functions");
  var am = Gd(em);
  var om = Gd(nm);
  var sm = Gd(tm);
  var um = Gd(im);
  var lm = Gd(rm);
  t3.object({ onError: tm.optional().describe("Error handler function: (error, state?) => void"), onLog: im.optional().describe("Log handler function: (message, verbose?) => void") }).partial(), t3.object({ verbose: t3.boolean().describe("Enable verbose logging for debugging").optional() }).partial(), t3.object({ queue: t3.boolean().describe("Whether to queue events when consent is not granted").optional() }).partial(), t3.object({}).partial(), t3.object({ init: t3.boolean().describe("Whether to initialize immediately").optional(), loadScript: t3.boolean().describe("Whether to load external script (for web destinations)").optional() }).partial(), t3.object({ disabled: t3.boolean().describe("Set to true to disable").optional() }).partial(), t3.object({ primary: t3.boolean().describe("Mark as primary (only one can be primary)").optional() }).partial(), t3.object({ settings: t3.any().optional().describe("Implementation-specific configuration") }).partial(), t3.object({ env: t3.any().optional().describe("Environment dependencies (platform-specific)") }).partial(), t3.object({ type: t3.string().optional().describe("Instance type identifier"), config: t3.unknown().describe("Instance configuration") }).partial(), t3.object({ collector: t3.unknown().describe("Collector instance (runtime object)"), config: t3.unknown().describe("Configuration"), env: t3.unknown().describe("Environment dependencies") }).partial(), t3.object({ batch: t3.number().optional().describe("Batch size: bundle N events for batch processing"), batched: t3.unknown().optional().describe("Batch of events to be processed") }).partial(), t3.object({ ignore: t3.boolean().describe("Set to true to skip processing").optional(), condition: t3.string().optional().describe("Condition function: return true to process") }).partial(), t3.object({ sources: t3.record(t3.string(), t3.unknown()).describe("Map of source instances") }).partial(), t3.object({ destinations: t3.record(t3.string(), t3.unknown()).describe("Map of destination instances") }).partial();
  Vd({}, { ConsentSchema: () => fm, DeepPartialEventSchema: () => wm, EntitiesSchema: () => $m, EntitySchema: () => ym, EventSchema: () => _m, OrderedPropertiesSchema: () => pm, PartialEventSchema: () => km, PropertiesSchema: () => mm, PropertySchema: () => dm, PropertyTypeSchema: () => cm, SourceSchema: () => bm, SourceTypeSchema: () => vm, UserSchema: () => gm, VersionSchema: () => hm, consentJsonSchema: () => Nm, entityJsonSchema: () => Om, eventJsonSchema: () => Im, orderedPropertiesJsonSchema: () => jm, partialEventJsonSchema: () => Sm, propertiesJsonSchema: () => xm, sourceTypeJsonSchema: () => Um, userJsonSchema: () => zm });
  var cm = t3.lazy(() => t3.union([t3.boolean(), t3.string(), t3.number(), t3.record(t3.string(), dm)]));
  var dm = t3.lazy(() => t3.union([cm, t3.array(cm)]));
  var mm = t3.record(t3.string(), dm.optional()).describe("Flexible property collection with optional values");
  var pm = t3.record(t3.string(), t3.tuple([dm, t3.number()]).optional()).describe("Ordered properties with [value, order] tuples for priority control");
  var vm = t3.union([t3.enum(["web", "server", "app", "other"]), t3.string()]).describe("Source type: web, server, app, other, or custom");
  var fm = t3.record(t3.string(), t3.boolean()).describe("Consent requirement mapping (group name \u2192 state)");
  var gm = mm.and(t3.object({ id: t3.string().optional().describe("User identifier"), device: t3.string().optional().describe("Device identifier"), session: t3.string().optional().describe("Session identifier"), hash: t3.string().optional().describe("Hashed identifier"), address: t3.string().optional().describe("User address"), email: t3.string().email().optional().describe("User email address"), phone: t3.string().optional().describe("User phone number"), userAgent: t3.string().optional().describe("Browser user agent string"), browser: t3.string().optional().describe("Browser name"), browserVersion: t3.string().optional().describe("Browser version"), deviceType: t3.string().optional().describe("Device type (mobile, desktop, tablet)"), os: t3.string().optional().describe("Operating system"), osVersion: t3.string().optional().describe("Operating system version"), screenSize: t3.string().optional().describe("Screen dimensions"), language: t3.string().optional().describe("User language"), country: t3.string().optional().describe("User country"), region: t3.string().optional().describe("User region/state"), city: t3.string().optional().describe("User city"), zip: t3.string().optional().describe("User postal code"), timezone: t3.string().optional().describe("User timezone"), ip: t3.string().optional().describe("User IP address"), internal: t3.boolean().optional().describe("Internal user flag (employee, test user)") })).describe("User identification and properties");
  var hm = mm.and(t3.object({ source: Bd.describe('Walker implementation version (e.g., "2.0.0")'), tagging: Yd })).describe("Walker version information");
  var bm = mm.and(t3.object({ type: vm.describe("Source type identifier"), id: Bd.describe("Source identifier (typically URL on web)"), previous_id: Bd.describe("Previous source identifier (typically referrer on web)") })).describe("Event source information");
  var ym = t3.lazy(() => t3.object({ entity: t3.string().describe("Entity name"), data: mm.describe("Entity-specific properties"), nested: t3.array(ym).describe("Nested child entities"), context: pm.describe("Entity context data") })).describe("Nested entity structure with recursive nesting support");
  var $m = t3.array(ym).describe("Array of nested entities");
  var _m = t3.object({ name: t3.string().describe('Event name in "entity action" format (e.g., "page view", "product add")'), data: mm.describe("Event-specific properties"), context: pm.describe("Ordered context properties with priorities"), globals: mm.describe("Global properties shared across events"), custom: mm.describe("Custom implementation-specific properties"), user: gm.describe("User identification and attributes"), nested: $m.describe("Related nested entities"), consent: fm.describe("Consent states at event time"), id: qd.describe("Unique event identifier (timestamp-based)"), trigger: Bd.describe("Event trigger identifier"), entity: Bd.describe("Parsed entity from event name"), action: Bd.describe("Parsed action from event name"), timestamp: Xd.describe("Unix timestamp in milliseconds since epoch"), timing: Kd.describe("Event processing timing information"), group: Bd.describe("Event grouping identifier"), count: Hd.describe("Event count in session"), version: hm.describe("Walker version information"), source: bm.describe("Event source information") }).describe("Complete walkerOS event structure");
  var km = _m.partial().describe("Partial event structure with all fields optional");
  var wm = _m.partial().describe("Partial event structure with all top-level fields optional");
  var Im = Gd(_m);
  var Sm = Gd(km);
  var zm = Gd(gm);
  var xm = Gd(mm);
  var jm = Gd(pm);
  var Om = Gd(ym);
  var Um = Gd(vm);
  var Nm = Gd(fm);
  Vd({}, { ConfigSchema: () => Rm, LoopSchema: () => Zm, MapSchema: () => Tm, PolicySchema: () => Cm, ResultSchema: () => Fm, RuleSchema: () => Jm, RulesSchema: () => Lm, SetSchema: () => Em, ValueConfigSchema: () => Am, ValueSchema: () => Pm, ValuesSchema: () => Dm, configJsonSchema: () => Hm, loopJsonSchema: () => Vm, mapJsonSchema: () => Bm, policyJsonSchema: () => Km, ruleJsonSchema: () => qm, rulesJsonSchema: () => Xm, setJsonSchema: () => Gm, valueConfigJsonSchema: () => Wm, valueJsonSchema: () => Mm });
  var Pm = t3.lazy(() => t3.union([t3.string().describe('String value or property path (e.g., "data.id")'), t3.number().describe("Numeric value"), t3.boolean().describe("Boolean value"), t3.lazy(() => Qd), t3.array(Pm).describe("Array of values")]));
  var Dm = t3.array(Pm).describe("Array of transformation values");
  var Zm = t3.lazy(() => t3.tuple([Pm, Pm]).describe("Loop transformation: [source, transform] tuple for array processing"));
  var Em = t3.lazy(() => t3.array(Pm).describe("Set: Array of values for selection or combination"));
  var Tm = t3.lazy(() => t3.record(t3.string(), Pm).describe("Map: Object mapping keys to transformation values"));
  var Am = Qd = t3.object({ key: t3.string().optional().describe('Property path to extract from event (e.g., "data.id", "user.email")'), value: t3.union([t3.string(), t3.number(), t3.boolean()]).optional().describe("Static primitive value"), fn: t3.string().optional().describe("Custom transformation function as string (serialized)"), map: Tm.optional().describe("Object mapping: transform event data to structured output"), loop: Zm.optional().describe("Loop transformation: [source, transform] for array processing"), set: Em.optional().describe("Set of values: combine or select from multiple values"), consent: fm.optional().describe("Required consent states to include this value"), condition: t3.string().optional().describe("Condition function as string: return true to include value"), validate: t3.string().optional().describe("Validation function as string: return true if value is valid") }).refine((e6) => Object.keys(e6).length > 0, { message: "ValueConfig must have at least one property" }).describe("Value transformation configuration with multiple strategies");
  var Cm = t3.record(t3.string(), Pm).describe("Policy rules for event pre-processing (key \u2192 value mapping)");
  var Jm = t3.object({ batch: t3.number().optional().describe("Batch size: bundle N events for batch processing"), condition: t3.string().optional().describe("Condition function as string: return true to process event"), consent: fm.optional().describe("Required consent states to process this event"), settings: t3.any().optional().describe("Destination-specific settings for this event mapping"), data: t3.union([Pm, Dm]).optional().describe("Data transformation rules for event"), ignore: t3.boolean().optional().describe("Set to true to skip processing this event"), name: t3.string().optional().describe('Custom event name override (e.g., "view_item" for "product view")'), policy: Cm.optional().describe("Event-level policy overrides (applied after config-level policy)") }).describe("Mapping rule for specific entity-action combination");
  var Lm = t3.record(t3.string(), t3.record(t3.string(), t3.union([Jm, t3.array(Jm)])).optional()).describe("Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support");
  var Rm = t3.object({ consent: fm.optional().describe("Required consent states to process any events"), data: t3.union([Pm, Dm]).optional().describe("Global data transformation applied to all events"), mapping: Lm.optional().describe("Entity-action specific mapping rules"), policy: Cm.optional().describe("Pre-processing policy rules applied before mapping") }).describe("Shared mapping configuration for sources and destinations");
  var Fm = t3.object({ eventMapping: Jm.optional().describe("Resolved mapping rule for event"), mappingKey: t3.string().optional().describe('Mapping key used (e.g., "product.view")') }).describe("Mapping resolution result");
  var Mm = Gd(Pm);
  var Wm = Gd(Am);
  var Vm = Gd(Zm);
  var Gm = Gd(Em);
  var Bm = Gd(Tm);
  var Km = Gd(Cm);
  var qm = Gd(Jm);
  var Xm = Gd(Lm);
  var Hm = Gd(Rm);
  Vd({}, { BatchSchema: () => op, ConfigSchema: () => Ym, ContextSchema: () => np, DLQSchema: () => fp, DataSchema: () => sp, DestinationPolicySchema: () => ep, DestinationsSchema: () => dp, InitDestinationsSchema: () => cp, InitSchema: () => lp, InstanceSchema: () => up, PartialConfigSchema: () => Qm, PushBatchContextSchema: () => ip, PushContextSchema: () => tp, PushEventSchema: () => rp, PushEventsSchema: () => ap, PushResultSchema: () => pp, RefSchema: () => mp, ResultSchema: () => vp, batchJsonSchema: () => $p, configJsonSchema: () => gp, contextJsonSchema: () => bp, instanceJsonSchema: () => _p, partialConfigJsonSchema: () => hp, pushContextJsonSchema: () => yp, resultJsonSchema: () => kp });
  var Ym = t3.object({ consent: fm.optional().describe("Required consent states to send events to this destination"), settings: t3.any().describe("Implementation-specific configuration").optional(), data: t3.union([Pm, Dm]).optional().describe("Global data transformation applied to all events for this destination"), env: t3.any().describe("Environment dependencies (platform-specific)").optional(), id: qd.describe("Destination instance identifier (defaults to destination key)").optional(), init: t3.boolean().describe("Whether to initialize immediately").optional(), loadScript: t3.boolean().describe("Whether to load external script (for web destinations)").optional(), mapping: Lm.optional().describe("Entity-action specific mapping rules for this destination"), policy: Cm.optional().describe("Pre-processing policy rules applied before event mapping"), queue: t3.boolean().describe("Whether to queue events when consent is not granted").optional(), verbose: t3.boolean().describe("Enable verbose logging for debugging").optional(), onError: tm.optional(), onLog: im.optional() }).describe("Destination configuration");
  var Qm = Ym.partial().describe("Partial destination configuration with all fields optional");
  var ep = Cm.describe("Destination policy rules for event pre-processing");
  var np = t3.object({ collector: t3.unknown().describe("Collector instance (runtime object)"), config: Ym.describe("Destination configuration"), data: t3.union([t3.unknown(), t3.array(t3.unknown())]).optional().describe("Transformed event data"), env: t3.unknown().describe("Environment dependencies") }).describe("Destination context for init and push functions");
  var tp = np.extend({ mapping: Jm.optional().describe("Resolved mapping rule for this specific event") }).describe("Push context with event-specific mapping");
  var ip = tp.describe("Batch push context with event-specific mapping");
  var rp = t3.object({ event: _m.describe("The event to process"), mapping: Jm.optional().describe("Mapping rule for this event") }).describe("Event with optional mapping for batch processing");
  var ap = t3.array(rp).describe("Array of events with mappings");
  var op = t3.object({ key: t3.string().describe('Batch key (usually mapping key like "product.view")'), events: t3.array(_m).describe("Array of events in batch"), data: t3.array(t3.union([t3.unknown(), t3.array(t3.unknown())]).optional()).describe("Transformed data for each event"), mapping: Jm.optional().describe("Shared mapping rule for batch") }).describe("Batch of events grouped by mapping key");
  var sp = t3.union([t3.unknown(), t3.array(t3.unknown())]).optional().describe("Transformed event data (Property, undefined, or array)");
  var up = t3.object({ config: Ym.describe("Destination configuration"), queue: t3.array(_m).optional().describe("Queued events awaiting consent"), dlq: t3.array(t3.tuple([_m, t3.unknown()])).optional().describe("Dead letter queue (failed events with errors)"), type: t3.string().optional().describe("Destination type identifier"), env: t3.unknown().optional().describe("Environment dependencies"), init: t3.unknown().optional().describe("Initialization function"), push: t3.unknown().describe("Push function for single events"), pushBatch: t3.unknown().optional().describe("Batch push function"), on: t3.unknown().optional().describe("Event lifecycle hook function") }).describe("Destination instance (runtime object with functions)");
  var lp = t3.object({ code: up.describe("Destination instance with implementation"), config: Qm.optional().describe("Partial configuration overrides"), env: t3.unknown().optional().describe("Partial environment overrides") }).describe("Destination initialization configuration");
  var cp = t3.record(t3.string(), lp).describe("Map of destination IDs to initialization configurations");
  var dp = t3.record(t3.string(), up).describe("Map of destination IDs to runtime instances");
  var mp = t3.object({ id: t3.string().describe("Destination ID"), destination: up.describe("Destination instance") }).describe("Destination reference (ID + instance)");
  var pp = t3.object({ queue: t3.array(_m).optional().describe("Events queued (awaiting consent)"), error: t3.unknown().optional().describe("Error if push failed") }).describe("Push operation result");
  var vp = t3.object({ successful: t3.array(mp).describe("Destinations that processed successfully"), queued: t3.array(mp).describe("Destinations that queued events"), failed: t3.array(mp).describe("Destinations that failed to process") }).describe("Overall destination processing result");
  var fp = t3.array(t3.tuple([_m, t3.unknown()])).describe("Dead letter queue: [(event, error), ...]");
  var gp = Gd(Ym);
  var hp = Gd(Qm);
  var bp = Gd(np);
  var yp = Gd(tp);
  var $p = Gd(op);
  var _p = Gd(up);
  var kp = Gd(vp);
  Vd({}, { CommandTypeSchema: () => wp, ConfigSchema: () => Ip, DestinationsSchema: () => Op, InitConfigSchema: () => zp, InstanceSchema: () => Up, PushContextSchema: () => xp, SessionDataSchema: () => Sp, SourcesSchema: () => jp, commandTypeJsonSchema: () => Np, configJsonSchema: () => Pp, initConfigJsonSchema: () => Zp, instanceJsonSchema: () => Tp, pushContextJsonSchema: () => Ep, sessionDataJsonSchema: () => Dp });
  var wp = t3.union([t3.enum(["action", "config", "consent", "context", "destination", "elb", "globals", "hook", "init", "link", "run", "user", "walker"]), t3.string()]).describe("Collector command type: standard commands or custom string for extensions");
  var Ip = t3.object({ run: t3.boolean().describe("Whether to run collector automatically on initialization").optional(), tagging: Yd, globalsStatic: mm.describe("Static global properties that persist across collector runs"), sessionStatic: t3.record(t3.string(), t3.unknown()).describe("Static session data that persists across collector runs"), verbose: t3.boolean().describe("Enable verbose logging for debugging"), onError: tm.optional(), onLog: im.optional() }).describe("Core collector configuration");
  var Sp = mm.and(t3.object({ isStart: t3.boolean().describe("Whether this is a new session start"), storage: t3.boolean().describe("Whether storage is available"), id: qd.describe("Session identifier").optional(), start: Xd.describe("Session start timestamp").optional(), marketing: t3.literal(true).optional().describe("Marketing attribution flag"), updated: Xd.describe("Last update timestamp").optional(), isNew: t3.boolean().describe("Whether this is a new session").optional(), device: qd.describe("Device identifier").optional(), count: Hd.describe("Event count in session").optional(), runs: Hd.describe("Number of runs").optional() })).describe("Session state and tracking data");
  var zp = Ip.partial().extend({ consent: fm.optional().describe("Initial consent state"), user: gm.optional().describe("Initial user data"), globals: mm.optional().describe("Initial global properties"), sources: t3.unknown().optional().describe("Source configurations"), destinations: t3.unknown().optional().describe("Destination configurations"), custom: mm.optional().describe("Initial custom implementation-specific properties") }).describe("Collector initialization configuration with initial state");
  var xp = t3.object({ mapping: Rm.optional().describe("Source-level mapping configuration") }).describe("Push context with optional source mapping");
  var jp = t3.record(t3.string(), t3.unknown()).describe("Map of source IDs to source instances");
  var Op = t3.record(t3.string(), t3.unknown()).describe("Map of destination IDs to destination instances");
  var Up = t3.object({ push: t3.unknown().describe("Push function for processing events"), command: t3.unknown().describe("Command function for walker commands"), allowed: t3.boolean().describe("Whether event processing is allowed"), config: Ip.describe("Current collector configuration"), consent: fm.describe("Current consent state"), count: t3.number().describe("Event count (increments with each event)"), custom: mm.describe("Custom implementation-specific properties"), sources: jp.describe("Registered source instances"), destinations: Op.describe("Registered destination instances"), globals: mm.describe("Current global properties"), group: t3.string().describe("Event grouping identifier"), hooks: t3.unknown().describe("Lifecycle hook functions"), on: t3.unknown().describe("Event lifecycle configuration"), queue: t3.array(_m).describe("Queued events awaiting processing"), round: t3.number().describe("Collector run count (increments with each run)"), session: t3.union([Sp]).describe("Current session state"), timing: t3.number().describe("Event processing timing information"), user: gm.describe("Current user data"), version: t3.string().describe("Walker implementation version") }).describe("Collector instance with state and methods");
  var Np = Gd(wp);
  var Pp = Gd(Ip);
  var Dp = Gd(Sp);
  var Zp = Gd(zp);
  var Ep = Gd(xp);
  var Tp = Gd(Up);
  Vd({}, { BaseEnvSchema: () => Ap, ConfigSchema: () => Cp, InitSchema: () => Rp, InitSourceSchema: () => Fp, InitSourcesSchema: () => Mp, InstanceSchema: () => Lp, PartialConfigSchema: () => Jp, baseEnvJsonSchema: () => Wp, configJsonSchema: () => Vp, initSourceJsonSchema: () => Kp, initSourcesJsonSchema: () => qp, instanceJsonSchema: () => Bp, partialConfigJsonSchema: () => Gp });
  var Ap = t3.object({ push: t3.unknown().describe("Collector push function"), command: t3.unknown().describe("Collector command function"), sources: t3.unknown().optional().describe("Map of registered source instances"), elb: t3.unknown().describe("Public API function (alias for collector.push)") }).catchall(t3.unknown()).describe("Base environment for dependency injection - platform-specific sources extend this");
  var Cp = Rm.extend({ settings: t3.any().describe("Implementation-specific configuration").optional(), env: Ap.optional().describe("Environment dependencies (platform-specific)"), id: qd.describe("Source identifier (defaults to source key)").optional(), onError: tm.optional(), disabled: t3.boolean().describe("Set to true to disable").optional(), primary: t3.boolean().describe("Mark as primary (only one can be primary)").optional() }).describe("Source configuration with mapping and environment");
  var Jp = Cp.partial().describe("Partial source configuration with all fields optional");
  var Lp = t3.object({ type: t3.string().describe('Source type identifier (e.g., "browser", "dataLayer")'), config: Cp.describe("Current source configuration"), push: t3.any().describe("Push function - THE HANDLER (flexible signature for platform compatibility)"), destroy: t3.any().optional().describe("Cleanup function called when source is removed"), on: t3.unknown().optional().describe("Lifecycle hook function for event types") }).describe("Source instance with push handler and lifecycle methods");
  var Rp = t3.any().describe("Source initialization function: (config, env) => Instance | Promise<Instance>");
  var Fp = t3.object({ code: Rp.describe("Source initialization function"), config: Jp.optional().describe("Partial configuration overrides"), env: Ap.partial().optional().describe("Partial environment overrides"), primary: t3.boolean().optional().describe("Mark as primary source (only one can be primary)") }).describe("Source initialization configuration");
  var Mp = t3.record(t3.string(), Fp).describe("Map of source IDs to initialization configurations");
  var Wp = Gd(Ap);
  var Vp = Gd(Cp);
  var Gp = Gd(Jp);
  var Bp = Gd(Lp);
  var Kp = Gd(Fp);
  var qp = Gd(Mp);
  Vd({}, { ConfigSchema: () => Qp, DestinationReferenceSchema: () => Yp, PrimitiveSchema: () => Xp, SetupSchema: () => ev, SourceReferenceSchema: () => Hp, configJsonSchema: () => ov, destinationReferenceJsonSchema: () => uv, parseConfig: () => iv, parseSetup: () => nv, safeParseConfig: () => rv, safeParseSetup: () => tv, setupJsonSchema: () => av, sourceReferenceJsonSchema: () => sv });
  var Xp = t3.union([t3.string(), t3.number(), t3.boolean()]).describe("Primitive value: string, number, or boolean");
  var Hp = t3.object({ package: t3.string().min(1, "Package name cannot be empty").describe('Package specifier with optional version (e.g., "@walkeros/web-source-browser@2.0.0")'), config: t3.unknown().optional().describe("Source-specific configuration object"), env: t3.unknown().optional().describe("Source environment configuration"), primary: t3.boolean().optional().describe("Mark as primary source (provides main elb). Only one source should be primary.") }).describe("Source package reference with configuration");
  var Yp = t3.object({ package: t3.string().min(1, "Package name cannot be empty").describe('Package specifier with optional version (e.g., "@walkeros/web-destination-gtag@2.0.0")'), config: t3.unknown().optional().describe("Destination-specific configuration object"), env: t3.unknown().optional().describe("Destination environment configuration") }).describe("Destination package reference with configuration");
  var Qp = t3.object({ platform: t3.enum(["web", "server"], { error: 'Platform must be "web" or "server"' }).describe('Target platform: "web" for browser-based tracking, "server" for Node.js server-side collection'), sources: t3.record(t3.string(), Hp).optional().describe("Source configurations (data capture) keyed by unique identifier"), destinations: t3.record(t3.string(), Yp).optional().describe("Destination configurations (data output) keyed by unique identifier"), collector: t3.unknown().optional().describe("Collector configuration for event processing (uses Collector.InitConfig)"), env: t3.record(t3.string(), t3.string()).optional().describe("Environment-specific variables (override root-level variables)") }).passthrough().describe("Single environment configuration for one deployment target");
  var ev = t3.object({ version: t3.literal(1, { error: "Only version 1 is currently supported" }).describe("Configuration schema version (currently only 1 is supported)"), $schema: t3.string().url("Schema URL must be a valid URL").optional().describe('JSON Schema reference for IDE validation (e.g., "https://walkeros.io/schema/flow/v1.json")'), variables: t3.record(t3.string(), Xp).optional().describe("Shared variables for interpolation across all environments (use ${VAR_NAME:default} syntax)"), definitions: t3.record(t3.string(), t3.unknown()).optional().describe("Reusable configuration definitions (reference with JSON Schema $ref syntax)"), environments: t3.record(t3.string(), Qp).refine((e6) => Object.keys(e6).length > 0, { message: "At least one environment is required" }).describe("Named environment configurations (e.g., web_prod, server_stage)") }).describe("Complete multi-environment walkerOS configuration (walkeros.config.json)");
  function nv(e6) {
    return ev.parse(e6);
  }
  function tv(e6) {
    return ev.safeParse(e6);
  }
  function iv(e6) {
    return Qp.parse(e6);
  }
  function rv(e6) {
    return Qp.safeParse(e6);
  }
  var av = t3.toJSONSchema(ev, { target: "draft-7" });
  var ov = Gd(Qp);
  var sv = Gd(Hp);
  var uv = Gd(Yp);
  function lv(e6) {
    return t3.toJSONSchema(e6, { target: "draft-7" });
  }
  var cv = { merge: true, shallow: true, extend: true };
  function dv(e6, n6 = {}, t4 = {}) {
    t4 = { ...cv, ...t4 };
    const i4 = Object.entries(n6).reduce((n7, [i5, r3]) => {
      const a5 = e6[i5];
      return t4.merge && Array.isArray(a5) && Array.isArray(r3) ? n7[i5] = r3.reduce((e7, n8) => e7.includes(n8) ? e7 : [...e7, n8], [...a5]) : (t4.extend || i5 in e6) && (n7[i5] = r3), n7;
    }, {});
    return t4.shallow ? { ...e6, ...i4 } : (Object.assign(e6, i4), e6);
  }
  function mv(e6 = "entity action", n6 = {}) {
    const t4 = n6.timestamp || (/* @__PURE__ */ new Date()).setHours(0, 13, 37, 0), i4 = { data: { id: "ers", name: "Everyday Ruck Snack", color: "black", size: "l", price: 420 } }, r3 = { data: { id: "cc", name: "Cool Cap", size: "one size", price: 42 } };
    return function(e7 = {}) {
      var n7;
      const t5 = e7.timestamp || (/* @__PURE__ */ new Date()).setHours(0, 13, 37, 0), i5 = e7.group || "gr0up", r4 = e7.count || 1, a5 = dv({ name: "entity action", data: { string: "foo", number: 1, boolean: true, array: [0, "text", false], not: void 0 }, context: { dev: ["test", 1] }, globals: { lang: "elb" }, custom: { completely: "random" }, user: { id: "us3r", device: "c00k13", session: "s3ss10n" }, nested: [{ entity: "child", data: { is: "subordinated" }, nested: [], context: { element: ["child", 0] } }], consent: { functional: true }, id: `${t5}-${i5}-${r4}`, trigger: "test", entity: "entity", action: "action", timestamp: t5, timing: 3.14, group: i5, count: r4, version: { source: "0.3.1", tagging: 1 }, source: { type: "web", id: "https://localhost:80", previous_id: "http://remotehost:9001" } }, e7, { merge: false });
      if (e7.name) {
        const [t6, i6] = null != (n7 = e7.name.split(" ")) ? n7 : [];
        t6 && i6 && (a5.entity = t6, a5.action = i6);
      }
      return a5;
    }({ ...{ "cart view": { data: { currency: "EUR", value: 2 * i4.data.price }, context: { shopping: ["cart", 0] }, globals: { pagegroup: "shop" }, nested: [{ entity: "product", data: { ...i4.data, quantity: 2 }, context: { shopping: ["cart", 0] }, nested: [] }], trigger: "load" }, "checkout view": { data: { step: "payment", currency: "EUR", value: i4.data.price + r3.data.price }, context: { shopping: ["checkout", 0] }, globals: { pagegroup: "shop" }, nested: [{ entity: "product", ...i4, context: { shopping: ["checkout", 0] }, nested: [] }, { entity: "product", ...r3, context: { shopping: ["checkout", 0] }, nested: [] }], trigger: "load" }, "order complete": { data: { id: "0rd3r1d", currency: "EUR", shipping: 5.22, taxes: 73.76, total: 555 }, context: { shopping: ["complete", 0] }, globals: { pagegroup: "shop" }, nested: [{ entity: "product", ...i4, context: { shopping: ["complete", 0] }, nested: [] }, { entity: "product", ...r3, context: { shopping: ["complete", 0] }, nested: [] }, { entity: "gift", data: { name: "Surprise" }, context: { shopping: ["complete", 0] }, nested: [] }], trigger: "load" }, "page view": { data: { domain: "www.example.com", title: "walkerOS documentation", referrer: "https://www.elbwalker.com/", search: "?foo=bar", hash: "#hash", id: "/docs/" }, globals: { pagegroup: "docs" }, trigger: "load" }, "product add": { ...i4, context: { shopping: ["intent", 0] }, globals: { pagegroup: "shop" }, nested: [], trigger: "click" }, "product view": { ...i4, context: { shopping: ["detail", 0] }, globals: { pagegroup: "shop" }, nested: [], trigger: "load" }, "product visible": { data: { ...i4.data, position: 3, promo: true }, context: { shopping: ["discover", 0] }, globals: { pagegroup: "shop" }, nested: [], trigger: "load" }, "promotion visible": { data: { name: "Setting up tracking easily", position: "hero" }, context: { ab_test: ["engagement", 0] }, globals: { pagegroup: "homepage" }, trigger: "visible" }, "session start": { data: { id: "s3ss10n", start: t4, isNew: true, count: 1, runs: 1, isStart: true, storage: true, referrer: "", device: "c00k13" }, user: { id: "us3r", device: "c00k13", session: "s3ss10n", hash: "h4sh", address: "street number", email: "user@example.com", phone: "+49 123 456 789", userAgent: "Mozilla...", browser: "Chrome", browserVersion: "90", deviceType: "desktop", language: "de-DE", country: "DE", region: "HH", city: "Hamburg", zip: "20354", timezone: "Berlin", os: "walkerOS", osVersion: "1.0", screenSize: "1337x420", ip: "127.0.0.0", internal: true, custom: "value" } } }[e6], ...n6, name: e6 });
  }
  function pv(e6, n6, t4) {
    return function(...i4) {
      try {
        return e6(...i4);
      } catch (e7) {
        if (!n6)
          return;
        return n6(e7);
      } finally {
        null == t4 || t4();
      }
    };
  }
  function vv(e6) {
    return void 0 === e6 || /* @__PURE__ */ function(e7, n6) {
      return typeof e7 == typeof n6;
    }(e6, "") ? e6 : JSON.stringify(e6);
  }
  function fv(e6 = {}) {
    return dv({ "Content-Type": "application/json; charset=utf-8" }, e6);
  }
  function gv(e6, n6, t4 = { transport: "fetch" }) {
    switch (t4.transport || "fetch") {
      case "beacon":
        return function(e7, n7) {
          const t5 = vv(n7), i4 = navigator.sendBeacon(e7, t5);
          return { ok: i4, error: i4 ? void 0 : "Failed to send beacon" };
        }(e6, n6);
      case "xhr":
        return function(e7, n7, t5 = {}) {
          const i4 = fv(t5.headers), r3 = t5.method || "POST", a5 = vv(n7);
          return pv(() => {
            const n8 = new XMLHttpRequest();
            n8.open(r3, e7, false);
            for (const e8 in i4)
              n8.setRequestHeader(e8, i4[e8]);
            n8.send(a5);
            const t6 = n8.status >= 200 && n8.status < 300;
            return { ok: t6, data: pv(JSON.parse, () => n8.response)(n8.response), error: t6 ? void 0 : `${n8.status} ${n8.statusText}` };
          }, (e8) => ({ ok: false, error: e8.message }))();
        }(e6, n6, t4);
      default:
        return async function(e7, n7, t5 = {}) {
          const i4 = fv(t5.headers), r3 = vv(n7);
          return (/* @__PURE__ */ function(e8, n8, t6) {
            return async function(...i5) {
              try {
                return await e8(...i5);
              } catch (e9) {
                if (!n8)
                  return;
                return await n8(e9);
              } finally {
                await (null == t6 ? void 0 : t6());
              }
            };
          }(async () => {
            const n8 = await fetch(e7, { method: t5.method || "POST", headers: i4, keepalive: true, credentials: t5.credentials || "same-origin", mode: t5.noCors ? "no-cors" : "cors", body: r3 }), a5 = t5.noCors ? "" : await n8.text();
            return { ok: n8.ok, data: a5, error: n8.ok ? void 0 : n8.statusText };
          }, (e8) => ({ ok: false, error: e8.message })))();
        }(e6, n6, t4);
    }
  }
  var bv = {};
  n5(bv, { env: () => yv, events: () => wv, mapping: () => Sv });
  var yv = {};
  n5(yv, { init: () => $v, push: () => _v, simulation: () => kv });
  var $v = { sendWeb: void 0 };
  var _v = { sendWeb: Object.assign(() => {
  }, {}) };
  var kv = ["call:sendWeb"];
  var wv = {};
  function Iv() {
    const e6 = mv("entity action");
    return JSON.stringify(e6.data);
  }
  n5(wv, { entity_action: () => Iv });
  var Sv = {};
  n5(Sv, { config: () => xv, entity_action: () => zv });
  var zv = { data: "data" };
  var xv = { entity: { action: zv } };
  var jv = {};
  n5(jv, { MappingSchema: () => Uv, SettingsSchema: () => Ov, mapping: () => Pv, settings: () => Nv });
  var Ov = t3.object({ url: t3.string().url().describe("The HTTP endpoint URL to send events to (like https://api.example.com/events)"), headers: t3.record(t3.string(), t3.string()).describe("Additional HTTP headers to include with requests (like { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' })").optional(), method: t3.string().default("POST").describe("HTTP method for the request"), transform: t3.any().describe("Function to transform event data before sending (like (data, config, mapping) => JSON.stringify(data))").optional(), transport: t3.enum(["fetch", "xhr", "beacon"]).default("fetch").describe("Transport method for sending requests") });
  var Uv = t3.object({});
  var Nv = lv(Ov);
  var Pv = lv(Uv);
  var Dv = { type: "api", config: {}, push(e6, { config: n6, mapping: t4, data: i4, env: r3 }) {
    const { settings: a5 } = n6, { url: o4, headers: s5, method: u3, transform: l3, transport: c3 = "fetch" } = a5 || {};
    if (!o4)
      return;
    const d2 = void 0 !== i4 ? i4 : e6;
    const m2 = l3 ? l3(d2, n6, t4) : JSON.stringify(d2);
    ((null == r3 ? void 0 : r3.sendWeb) || gv)(o4, m2, { headers: s5, method: u3, transport: c3 });
  } };

  // entry.js
  async function entry_default(context = {}) {
    const { tracker } = context;
    const __simulationTracker = tracker;
    const window = typeof globalThis.window !== "undefined" ? globalThis.window : void 0;
    const document2 = typeof globalThis.document !== "undefined" ? globalThis.document : void 0;
    const config2 = {
      sources: {
        demo: {
          code: c,
          config: {
            settings: {
              events: [
                {
                  name: "page view",
                  data: {
                    title: "Home",
                    path: "/"
                  },
                  delay: 0
                },
                {
                  name: "product view",
                  data: {
                    id: "P123",
                    name: "Test Product",
                    price: 99.99
                  },
                  delay: 100
                }
              ]
            }
          }
        }
      },
      destinations: {
        demo: {
          code: g,
          config: {
            settings: {
              name: "demo"
            }
          }
        },
        api: {
          code: Dv,
          config: {
            settings: {
              url: "http://localhost:8080/collect"
            }
          }
        }
      },
      ...{
        run: true,
        globals: {
          language: "en"
        }
      }
    };
    const result = await T2(config2);
    return result;
  }
  return __toCommonJS(entry_exports);
})();
