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
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // entry.js
  var entry_exports = {};
  __export(entry_exports, {
    default: () => entry_default
  });

  // node_modules/zod/v3/external.js
  var external_exports = {};
  __export(external_exports, {
    BRAND: () => BRAND,
    DIRTY: () => DIRTY,
    EMPTY_PATH: () => EMPTY_PATH,
    INVALID: () => INVALID,
    NEVER: () => NEVER,
    OK: () => OK,
    ParseStatus: () => ParseStatus,
    Schema: () => ZodType,
    ZodAny: () => ZodAny,
    ZodArray: () => ZodArray,
    ZodBigInt: () => ZodBigInt,
    ZodBoolean: () => ZodBoolean,
    ZodBranded: () => ZodBranded,
    ZodCatch: () => ZodCatch,
    ZodDate: () => ZodDate,
    ZodDefault: () => ZodDefault,
    ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
    ZodEffects: () => ZodEffects,
    ZodEnum: () => ZodEnum,
    ZodError: () => ZodError,
    ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
    ZodFunction: () => ZodFunction,
    ZodIntersection: () => ZodIntersection,
    ZodIssueCode: () => ZodIssueCode,
    ZodLazy: () => ZodLazy,
    ZodLiteral: () => ZodLiteral,
    ZodMap: () => ZodMap,
    ZodNaN: () => ZodNaN,
    ZodNativeEnum: () => ZodNativeEnum,
    ZodNever: () => ZodNever,
    ZodNull: () => ZodNull,
    ZodNullable: () => ZodNullable,
    ZodNumber: () => ZodNumber,
    ZodObject: () => ZodObject,
    ZodOptional: () => ZodOptional,
    ZodParsedType: () => ZodParsedType,
    ZodPipeline: () => ZodPipeline,
    ZodPromise: () => ZodPromise,
    ZodReadonly: () => ZodReadonly,
    ZodRecord: () => ZodRecord,
    ZodSchema: () => ZodType,
    ZodSet: () => ZodSet,
    ZodString: () => ZodString,
    ZodSymbol: () => ZodSymbol,
    ZodTransformer: () => ZodEffects,
    ZodTuple: () => ZodTuple,
    ZodType: () => ZodType,
    ZodUndefined: () => ZodUndefined,
    ZodUnion: () => ZodUnion,
    ZodUnknown: () => ZodUnknown,
    ZodVoid: () => ZodVoid,
    addIssueToContext: () => addIssueToContext,
    any: () => anyType,
    array: () => arrayType,
    bigint: () => bigIntType,
    boolean: () => booleanType,
    coerce: () => coerce,
    custom: () => custom,
    date: () => dateType,
    datetimeRegex: () => datetimeRegex,
    defaultErrorMap: () => en_default,
    discriminatedUnion: () => discriminatedUnionType,
    effect: () => effectsType,
    enum: () => enumType,
    function: () => functionType,
    getErrorMap: () => getErrorMap,
    getParsedType: () => getParsedType,
    instanceof: () => instanceOfType,
    intersection: () => intersectionType,
    isAborted: () => isAborted,
    isAsync: () => isAsync,
    isDirty: () => isDirty,
    isValid: () => isValid,
    late: () => late,
    lazy: () => lazyType,
    literal: () => literalType,
    makeIssue: () => makeIssue,
    map: () => mapType,
    nan: () => nanType,
    nativeEnum: () => nativeEnumType,
    never: () => neverType,
    null: () => nullType,
    nullable: () => nullableType,
    number: () => numberType,
    object: () => objectType,
    objectUtil: () => objectUtil,
    oboolean: () => oboolean,
    onumber: () => onumber,
    optional: () => optionalType,
    ostring: () => ostring,
    pipeline: () => pipelineType,
    preprocess: () => preprocessType,
    promise: () => promiseType,
    quotelessJson: () => quotelessJson,
    record: () => recordType,
    set: () => setType,
    setErrorMap: () => setErrorMap,
    strictObject: () => strictObjectType,
    string: () => stringType,
    symbol: () => symbolType,
    transformer: () => effectsType,
    tuple: () => tupleType,
    undefined: () => undefinedType,
    union: () => unionType,
    unknown: () => unknownType,
    util: () => util,
    void: () => voidType
  });

  // node_modules/zod/v3/helpers/util.js
  var util;
  (function(util2) {
    util2.assertEqual = (_4) => {
    };
    function assertIs(_arg) {
    }
    util2.assertIs = assertIs;
    function assertNever(_x) {
      throw new Error();
    }
    util2.assertNever = assertNever;
    util2.arrayToEnum = (items) => {
      const obj = {};
      for (const item of items) {
        obj[item] = item;
      }
      return obj;
    };
    util2.getValidEnumValues = (obj) => {
      const validKeys = util2.objectKeys(obj).filter((k3) => typeof obj[obj[k3]] !== "number");
      const filtered = {};
      for (const k3 of validKeys) {
        filtered[k3] = obj[k3];
      }
      return util2.objectValues(filtered);
    };
    util2.objectValues = (obj) => {
      return util2.objectKeys(obj).map(function(e14) {
        return obj[e14];
      });
    };
    util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
      const keys = [];
      for (const key in object) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
          keys.push(key);
        }
      }
      return keys;
    };
    util2.find = (arr, checker) => {
      for (const item of arr) {
        if (checker(item))
          return item;
      }
      return void 0;
    };
    util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
    function joinValues(array, separator = " | ") {
      return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
    }
    util2.joinValues = joinValues;
    util2.jsonStringifyReplacer = (_4, value) => {
      if (typeof value === "bigint") {
        return value.toString();
      }
      return value;
    };
  })(util || (util = {}));
  var objectUtil;
  (function(objectUtil2) {
    objectUtil2.mergeShapes = (first, second) => {
      return {
        ...first,
        ...second
        // second overwrites first
      };
    };
  })(objectUtil || (objectUtil = {}));
  var ZodParsedType = util.arrayToEnum([
    "string",
    "nan",
    "number",
    "integer",
    "float",
    "boolean",
    "date",
    "bigint",
    "symbol",
    "function",
    "undefined",
    "null",
    "array",
    "object",
    "unknown",
    "promise",
    "void",
    "never",
    "map",
    "set"
  ]);
  var getParsedType = (data) => {
    const t12 = typeof data;
    switch (t12) {
      case "undefined":
        return ZodParsedType.undefined;
      case "string":
        return ZodParsedType.string;
      case "number":
        return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
      case "boolean":
        return ZodParsedType.boolean;
      case "function":
        return ZodParsedType.function;
      case "bigint":
        return ZodParsedType.bigint;
      case "symbol":
        return ZodParsedType.symbol;
      case "object":
        if (Array.isArray(data)) {
          return ZodParsedType.array;
        }
        if (data === null) {
          return ZodParsedType.null;
        }
        if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
          return ZodParsedType.promise;
        }
        if (typeof Map !== "undefined" && data instanceof Map) {
          return ZodParsedType.map;
        }
        if (typeof Set !== "undefined" && data instanceof Set) {
          return ZodParsedType.set;
        }
        if (typeof Date !== "undefined" && data instanceof Date) {
          return ZodParsedType.date;
        }
        return ZodParsedType.object;
      default:
        return ZodParsedType.unknown;
    }
  };

  // node_modules/zod/v3/ZodError.js
  var ZodIssueCode = util.arrayToEnum([
    "invalid_type",
    "invalid_literal",
    "custom",
    "invalid_union",
    "invalid_union_discriminator",
    "invalid_enum_value",
    "unrecognized_keys",
    "invalid_arguments",
    "invalid_return_type",
    "invalid_date",
    "invalid_string",
    "too_small",
    "too_big",
    "invalid_intersection_types",
    "not_multiple_of",
    "not_finite"
  ]);
  var quotelessJson = (obj) => {
    const json = JSON.stringify(obj, null, 2);
    return json.replace(/"([^"]+)":/g, "$1:");
  };
  var ZodError = class _ZodError extends Error {
    get errors() {
      return this.issues;
    }
    constructor(issues) {
      super();
      this.issues = [];
      this.addIssue = (sub) => {
        this.issues = [...this.issues, sub];
      };
      this.addIssues = (subs = []) => {
        this.issues = [...this.issues, ...subs];
      };
      const actualProto = new.target.prototype;
      if (Object.setPrototypeOf) {
        Object.setPrototypeOf(this, actualProto);
      } else {
        this.__proto__ = actualProto;
      }
      this.name = "ZodError";
      this.issues = issues;
    }
    format(_mapper) {
      const mapper = _mapper || function(issue) {
        return issue.message;
      };
      const fieldErrors = { _errors: [] };
      const processError = (error) => {
        for (const issue of error.issues) {
          if (issue.code === "invalid_union") {
            issue.unionErrors.map(processError);
          } else if (issue.code === "invalid_return_type") {
            processError(issue.returnTypeError);
          } else if (issue.code === "invalid_arguments") {
            processError(issue.argumentsError);
          } else if (issue.path.length === 0) {
            fieldErrors._errors.push(mapper(issue));
          } else {
            let curr = fieldErrors;
            let i4 = 0;
            while (i4 < issue.path.length) {
              const el = issue.path[i4];
              const terminal = i4 === issue.path.length - 1;
              if (!terminal) {
                curr[el] = curr[el] || { _errors: [] };
              } else {
                curr[el] = curr[el] || { _errors: [] };
                curr[el]._errors.push(mapper(issue));
              }
              curr = curr[el];
              i4++;
            }
          }
        }
      };
      processError(this);
      return fieldErrors;
    }
    static assert(value) {
      if (!(value instanceof _ZodError)) {
        throw new Error(`Not a ZodError: ${value}`);
      }
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return this.issues.length === 0;
    }
    flatten(mapper = (issue) => issue.message) {
      const fieldErrors = {};
      const formErrors = [];
      for (const sub of this.issues) {
        if (sub.path.length > 0) {
          const firstEl = sub.path[0];
          fieldErrors[firstEl] = fieldErrors[firstEl] || [];
          fieldErrors[firstEl].push(mapper(sub));
        } else {
          formErrors.push(mapper(sub));
        }
      }
      return { formErrors, fieldErrors };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  ZodError.create = (issues) => {
    const error = new ZodError(issues);
    return error;
  };

  // node_modules/zod/v3/locales/en.js
  var errorMap = (issue, _ctx) => {
    let message;
    switch (issue.code) {
      case ZodIssueCode.invalid_type:
        if (issue.received === ZodParsedType.undefined) {
          message = "Required";
        } else {
          message = `Expected ${issue.expected}, received ${issue.received}`;
        }
        break;
      case ZodIssueCode.invalid_literal:
        message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
        break;
      case ZodIssueCode.unrecognized_keys:
        message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
        break;
      case ZodIssueCode.invalid_union:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_union_discriminator:
        message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
        break;
      case ZodIssueCode.invalid_enum_value:
        message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
        break;
      case ZodIssueCode.invalid_arguments:
        message = `Invalid function arguments`;
        break;
      case ZodIssueCode.invalid_return_type:
        message = `Invalid function return type`;
        break;
      case ZodIssueCode.invalid_date:
        message = `Invalid date`;
        break;
      case ZodIssueCode.invalid_string:
        if (typeof issue.validation === "object") {
          if ("includes" in issue.validation) {
            message = `Invalid input: must include "${issue.validation.includes}"`;
            if (typeof issue.validation.position === "number") {
              message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
            }
          } else if ("startsWith" in issue.validation) {
            message = `Invalid input: must start with "${issue.validation.startsWith}"`;
          } else if ("endsWith" in issue.validation) {
            message = `Invalid input: must end with "${issue.validation.endsWith}"`;
          } else {
            util.assertNever(issue.validation);
          }
        } else if (issue.validation !== "regex") {
          message = `Invalid ${issue.validation}`;
        } else {
          message = "Invalid";
        }
        break;
      case ZodIssueCode.too_small:
        if (issue.type === "array")
          message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
        else if (issue.type === "string")
          message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
        else if (issue.type === "number")
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
        else if (issue.type === "bigint")
          message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
        else if (issue.type === "date")
          message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.too_big:
        if (issue.type === "array")
          message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
        else if (issue.type === "string")
          message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
        else if (issue.type === "number")
          message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
        else if (issue.type === "bigint")
          message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
        else if (issue.type === "date")
          message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
        else
          message = "Invalid input";
        break;
      case ZodIssueCode.custom:
        message = `Invalid input`;
        break;
      case ZodIssueCode.invalid_intersection_types:
        message = `Intersection results could not be merged`;
        break;
      case ZodIssueCode.not_multiple_of:
        message = `Number must be a multiple of ${issue.multipleOf}`;
        break;
      case ZodIssueCode.not_finite:
        message = "Number must be finite";
        break;
      default:
        message = _ctx.defaultError;
        util.assertNever(issue);
    }
    return { message };
  };
  var en_default = errorMap;

  // node_modules/zod/v3/errors.js
  var overrideErrorMap = en_default;
  function setErrorMap(map) {
    overrideErrorMap = map;
  }
  function getErrorMap() {
    return overrideErrorMap;
  }

  // node_modules/zod/v3/helpers/parseUtil.js
  var makeIssue = (params) => {
    const { data, path, errorMaps, issueData } = params;
    const fullPath = [...path, ...issueData.path || []];
    const fullIssue = {
      ...issueData,
      path: fullPath
    };
    if (issueData.message !== void 0) {
      return {
        ...issueData,
        path: fullPath,
        message: issueData.message
      };
    }
    let errorMessage = "";
    const maps = errorMaps.filter((m2) => !!m2).slice().reverse();
    for (const map of maps) {
      errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
    }
    return {
      ...issueData,
      path: fullPath,
      message: errorMessage
    };
  };
  var EMPTY_PATH = [];
  function addIssueToContext(ctx, issueData) {
    const overrideMap = getErrorMap();
    const issue = makeIssue({
      issueData,
      data: ctx.data,
      path: ctx.path,
      errorMaps: [
        ctx.common.contextualErrorMap,
        // contextual error map is first priority
        ctx.schemaErrorMap,
        // then schema-bound map if available
        overrideMap,
        // then global override map
        overrideMap === en_default ? void 0 : en_default
        // then global default map
      ].filter((x3) => !!x3)
    });
    ctx.common.issues.push(issue);
  }
  var ParseStatus = class _ParseStatus {
    constructor() {
      this.value = "valid";
    }
    dirty() {
      if (this.value === "valid")
        this.value = "dirty";
    }
    abort() {
      if (this.value !== "aborted")
        this.value = "aborted";
    }
    static mergeArray(status, results) {
      const arrayValue = [];
      for (const s5 of results) {
        if (s5.status === "aborted")
          return INVALID;
        if (s5.status === "dirty")
          status.dirty();
        arrayValue.push(s5.value);
      }
      return { status: status.value, value: arrayValue };
    }
    static async mergeObjectAsync(status, pairs) {
      const syncPairs = [];
      for (const pair of pairs) {
        const key = await pair.key;
        const value = await pair.value;
        syncPairs.push({
          key,
          value
        });
      }
      return _ParseStatus.mergeObjectSync(status, syncPairs);
    }
    static mergeObjectSync(status, pairs) {
      const finalObject = {};
      for (const pair of pairs) {
        const { key, value } = pair;
        if (key.status === "aborted")
          return INVALID;
        if (value.status === "aborted")
          return INVALID;
        if (key.status === "dirty")
          status.dirty();
        if (value.status === "dirty")
          status.dirty();
        if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
          finalObject[key.value] = value.value;
        }
      }
      return { status: status.value, value: finalObject };
    }
  };
  var INVALID = Object.freeze({
    status: "aborted"
  });
  var DIRTY = (value) => ({ status: "dirty", value });
  var OK = (value) => ({ status: "valid", value });
  var isAborted = (x3) => x3.status === "aborted";
  var isDirty = (x3) => x3.status === "dirty";
  var isValid = (x3) => x3.status === "valid";
  var isAsync = (x3) => typeof Promise !== "undefined" && x3 instanceof Promise;

  // node_modules/zod/v3/helpers/errorUtil.js
  var errorUtil;
  (function(errorUtil2) {
    errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
    errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
  })(errorUtil || (errorUtil = {}));

  // node_modules/zod/v3/types.js
  var ParseInputLazyPath = class {
    constructor(parent, value, path, key) {
      this._cachedPath = [];
      this.parent = parent;
      this.data = value;
      this._path = path;
      this._key = key;
    }
    get path() {
      if (!this._cachedPath.length) {
        if (Array.isArray(this._key)) {
          this._cachedPath.push(...this._path, ...this._key);
        } else {
          this._cachedPath.push(...this._path, this._key);
        }
      }
      return this._cachedPath;
    }
  };
  var handleResult = (ctx, result) => {
    if (isValid(result)) {
      return { success: true, data: result.value };
    } else {
      if (!ctx.common.issues.length) {
        throw new Error("Validation failed but no issues detected.");
      }
      return {
        success: false,
        get error() {
          if (this._error)
            return this._error;
          const error = new ZodError(ctx.common.issues);
          this._error = error;
          return this._error;
        }
      };
    }
  };
  function processCreateParams(params) {
    if (!params)
      return {};
    const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
    if (errorMap2 && (invalid_type_error || required_error)) {
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    }
    if (errorMap2)
      return { errorMap: errorMap2, description };
    const customMap = (iss, ctx) => {
      const { message } = params;
      if (iss.code === "invalid_enum_value") {
        return { message: message ?? ctx.defaultError };
      }
      if (typeof ctx.data === "undefined") {
        return { message: message ?? required_error ?? ctx.defaultError };
      }
      if (iss.code !== "invalid_type")
        return { message: ctx.defaultError };
      return { message: message ?? invalid_type_error ?? ctx.defaultError };
    };
    return { errorMap: customMap, description };
  }
  var ZodType = class {
    get description() {
      return this._def.description;
    }
    _getType(input) {
      return getParsedType(input.data);
    }
    _getOrReturnCtx(input, ctx) {
      return ctx || {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      };
    }
    _processInputParams(input) {
      return {
        status: new ParseStatus(),
        ctx: {
          common: input.parent.common,
          data: input.data,
          parsedType: getParsedType(input.data),
          schemaErrorMap: this._def.errorMap,
          path: input.path,
          parent: input.parent
        }
      };
    }
    _parseSync(input) {
      const result = this._parse(input);
      if (isAsync(result)) {
        throw new Error("Synchronous parse encountered promise.");
      }
      return result;
    }
    _parseAsync(input) {
      const result = this._parse(input);
      return Promise.resolve(result);
    }
    parse(data, params) {
      const result = this.safeParse(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    safeParse(data, params) {
      const ctx = {
        common: {
          issues: [],
          async: params?.async ?? false,
          contextualErrorMap: params?.errorMap
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const result = this._parseSync({ data, path: ctx.path, parent: ctx });
      return handleResult(ctx, result);
    }
    "~validate"(data) {
      const ctx = {
        common: {
          issues: [],
          async: !!this["~standard"].async
        },
        path: [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      if (!this["~standard"].async) {
        try {
          const result = this._parseSync({ data, path: [], parent: ctx });
          return isValid(result) ? {
            value: result.value
          } : {
            issues: ctx.common.issues
          };
        } catch (err) {
          if (err?.message?.toLowerCase()?.includes("encountered")) {
            this["~standard"].async = true;
          }
          ctx.common = {
            issues: [],
            async: true
          };
        }
      }
      return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
        value: result.value
      } : {
        issues: ctx.common.issues
      });
    }
    async parseAsync(data, params) {
      const result = await this.safeParseAsync(data, params);
      if (result.success)
        return result.data;
      throw result.error;
    }
    async safeParseAsync(data, params) {
      const ctx = {
        common: {
          issues: [],
          contextualErrorMap: params?.errorMap,
          async: true
        },
        path: params?.path || [],
        schemaErrorMap: this._def.errorMap,
        parent: null,
        data,
        parsedType: getParsedType(data)
      };
      const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
      const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
      return handleResult(ctx, result);
    }
    refine(check, message) {
      const getIssueProperties = (val) => {
        if (typeof message === "string" || typeof message === "undefined") {
          return { message };
        } else if (typeof message === "function") {
          return message(val);
        } else {
          return message;
        }
      };
      return this._refinement((val, ctx) => {
        const result = check(val);
        const setError = () => ctx.addIssue({
          code: ZodIssueCode.custom,
          ...getIssueProperties(val)
        });
        if (typeof Promise !== "undefined" && result instanceof Promise) {
          return result.then((data) => {
            if (!data) {
              setError();
              return false;
            } else {
              return true;
            }
          });
        }
        if (!result) {
          setError();
          return false;
        } else {
          return true;
        }
      });
    }
    refinement(check, refinementData) {
      return this._refinement((val, ctx) => {
        if (!check(val)) {
          ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
          return false;
        } else {
          return true;
        }
      });
    }
    _refinement(refinement) {
      return new ZodEffects({
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "refinement", refinement }
      });
    }
    superRefine(refinement) {
      return this._refinement(refinement);
    }
    constructor(def) {
      this.spa = this.safeParseAsync;
      this._def = def;
      this.parse = this.parse.bind(this);
      this.safeParse = this.safeParse.bind(this);
      this.parseAsync = this.parseAsync.bind(this);
      this.safeParseAsync = this.safeParseAsync.bind(this);
      this.spa = this.spa.bind(this);
      this.refine = this.refine.bind(this);
      this.refinement = this.refinement.bind(this);
      this.superRefine = this.superRefine.bind(this);
      this.optional = this.optional.bind(this);
      this.nullable = this.nullable.bind(this);
      this.nullish = this.nullish.bind(this);
      this.array = this.array.bind(this);
      this.promise = this.promise.bind(this);
      this.or = this.or.bind(this);
      this.and = this.and.bind(this);
      this.transform = this.transform.bind(this);
      this.brand = this.brand.bind(this);
      this.default = this.default.bind(this);
      this.catch = this.catch.bind(this);
      this.describe = this.describe.bind(this);
      this.pipe = this.pipe.bind(this);
      this.readonly = this.readonly.bind(this);
      this.isNullable = this.isNullable.bind(this);
      this.isOptional = this.isOptional.bind(this);
      this["~standard"] = {
        version: 1,
        vendor: "zod",
        validate: (data) => this["~validate"](data)
      };
    }
    optional() {
      return ZodOptional.create(this, this._def);
    }
    nullable() {
      return ZodNullable.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return ZodArray.create(this);
    }
    promise() {
      return ZodPromise.create(this, this._def);
    }
    or(option) {
      return ZodUnion.create([this, option], this._def);
    }
    and(incoming) {
      return ZodIntersection.create(this, incoming, this._def);
    }
    transform(transform) {
      return new ZodEffects({
        ...processCreateParams(this._def),
        schema: this,
        typeName: ZodFirstPartyTypeKind.ZodEffects,
        effect: { type: "transform", transform }
      });
    }
    default(def) {
      const defaultValueFunc = typeof def === "function" ? def : () => def;
      return new ZodDefault({
        ...processCreateParams(this._def),
        innerType: this,
        defaultValue: defaultValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodDefault
      });
    }
    brand() {
      return new ZodBranded({
        typeName: ZodFirstPartyTypeKind.ZodBranded,
        type: this,
        ...processCreateParams(this._def)
      });
    }
    catch(def) {
      const catchValueFunc = typeof def === "function" ? def : () => def;
      return new ZodCatch({
        ...processCreateParams(this._def),
        innerType: this,
        catchValue: catchValueFunc,
        typeName: ZodFirstPartyTypeKind.ZodCatch
      });
    }
    describe(description) {
      const This = this.constructor;
      return new This({
        ...this._def,
        description
      });
    }
    pipe(target) {
      return ZodPipeline.create(this, target);
    }
    readonly() {
      return ZodReadonly.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  };
  var cuidRegex = /^c[^\s-]{8,}$/i;
  var cuid2Regex = /^[0-9a-z]+$/;
  var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
  var nanoidRegex = /^[a-z0-9_-]{21}$/i;
  var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
  var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
  var emojiRegex;
  var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
  var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
  var dateRegex = new RegExp(`^${dateRegexSource}$`);
  function timeRegexSource(args) {
    let secondsRegexSource = `[0-5]\\d`;
    if (args.precision) {
      secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
    } else if (args.precision == null) {
      secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
    }
    const secondsQuantifier = args.precision ? "+" : "?";
    return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
  }
  function timeRegex(args) {
    return new RegExp(`^${timeRegexSource(args)}$`);
  }
  function datetimeRegex(args) {
    let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
    const opts = [];
    opts.push(args.local ? `Z?` : `Z`);
    if (args.offset)
      opts.push(`([+-]\\d{2}:?\\d{2})`);
    regex = `${regex}(${opts.join("|")})`;
    return new RegExp(`^${regex}$`);
  }
  function isValidIP(ip, version) {
    if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
      return true;
    }
    if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
      return true;
    }
    return false;
  }
  function isValidJWT(jwt, alg) {
    if (!jwtRegex.test(jwt))
      return false;
    try {
      const [header] = jwt.split(".");
      if (!header)
        return false;
      const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
      const decoded = JSON.parse(atob(base64));
      if (typeof decoded !== "object" || decoded === null)
        return false;
      if ("typ" in decoded && decoded?.typ !== "JWT")
        return false;
      if (!decoded.alg)
        return false;
      if (alg && decoded.alg !== alg)
        return false;
      return true;
    } catch {
      return false;
    }
  }
  function isValidCidr(ip, version) {
    if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
      return true;
    }
    if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
      return true;
    }
    return false;
  }
  var ZodString = class _ZodString extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = String(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.string) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.string,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.length < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.length > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "length") {
          const tooBig = input.data.length > check.value;
          const tooSmall = input.data.length < check.value;
          if (tooBig || tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            if (tooBig) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_big,
                maximum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            } else if (tooSmall) {
              addIssueToContext(ctx, {
                code: ZodIssueCode.too_small,
                minimum: check.value,
                type: "string",
                inclusive: true,
                exact: true,
                message: check.message
              });
            }
            status.dirty();
          }
        } else if (check.kind === "email") {
          if (!emailRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "email",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "emoji") {
          if (!emojiRegex) {
            emojiRegex = new RegExp(_emojiRegex, "u");
          }
          if (!emojiRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "emoji",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "uuid") {
          if (!uuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "uuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "nanoid") {
          if (!nanoidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "nanoid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid") {
          if (!cuidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cuid2") {
          if (!cuid2Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cuid2",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ulid") {
          if (!ulidRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ulid",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "url") {
          try {
            new URL(input.data);
          } catch {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "regex") {
          check.regex.lastIndex = 0;
          const testResult = check.regex.test(input.data);
          if (!testResult) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "regex",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "trim") {
          input.data = input.data.trim();
        } else if (check.kind === "includes") {
          if (!input.data.includes(check.value, check.position)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { includes: check.value, position: check.position },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "toLowerCase") {
          input.data = input.data.toLowerCase();
        } else if (check.kind === "toUpperCase") {
          input.data = input.data.toUpperCase();
        } else if (check.kind === "startsWith") {
          if (!input.data.startsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { startsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "endsWith") {
          if (!input.data.endsWith(check.value)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: { endsWith: check.value },
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "datetime") {
          const regex = datetimeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "datetime",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "date") {
          const regex = dateRegex;
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "date",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "time") {
          const regex = timeRegex(check);
          if (!regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_string,
              validation: "time",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "duration") {
          if (!durationRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "duration",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "ip") {
          if (!isValidIP(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "ip",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "jwt") {
          if (!isValidJWT(input.data, check.alg)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "jwt",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "cidr") {
          if (!isValidCidr(input.data, check.version)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "cidr",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64") {
          if (!base64Regex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "base64url") {
          if (!base64urlRegex.test(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              validation: "base64url",
              code: ZodIssueCode.invalid_string,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _regex(regex, validation, message) {
      return this.refinement((data) => regex.test(data), {
        validation,
        code: ZodIssueCode.invalid_string,
        ...errorUtil.errToObj(message)
      });
    }
    _addCheck(check) {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    email(message) {
      return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
    }
    url(message) {
      return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
    }
    emoji(message) {
      return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
    }
    uuid(message) {
      return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
    }
    nanoid(message) {
      return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
    }
    cuid(message) {
      return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
    }
    cuid2(message) {
      return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
    }
    ulid(message) {
      return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
    }
    base64(message) {
      return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
    }
    base64url(message) {
      return this._addCheck({
        kind: "base64url",
        ...errorUtil.errToObj(message)
      });
    }
    jwt(options) {
      return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
    }
    ip(options) {
      return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
    }
    cidr(options) {
      return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
    }
    datetime(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "datetime",
          precision: null,
          offset: false,
          local: false,
          message: options
        });
      }
      return this._addCheck({
        kind: "datetime",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        offset: options?.offset ?? false,
        local: options?.local ?? false,
        ...errorUtil.errToObj(options?.message)
      });
    }
    date(message) {
      return this._addCheck({ kind: "date", message });
    }
    time(options) {
      if (typeof options === "string") {
        return this._addCheck({
          kind: "time",
          precision: null,
          message: options
        });
      }
      return this._addCheck({
        kind: "time",
        precision: typeof options?.precision === "undefined" ? null : options?.precision,
        ...errorUtil.errToObj(options?.message)
      });
    }
    duration(message) {
      return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
    }
    regex(regex, message) {
      return this._addCheck({
        kind: "regex",
        regex,
        ...errorUtil.errToObj(message)
      });
    }
    includes(value, options) {
      return this._addCheck({
        kind: "includes",
        value,
        position: options?.position,
        ...errorUtil.errToObj(options?.message)
      });
    }
    startsWith(value, message) {
      return this._addCheck({
        kind: "startsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    endsWith(value, message) {
      return this._addCheck({
        kind: "endsWith",
        value,
        ...errorUtil.errToObj(message)
      });
    }
    min(minLength, message) {
      return this._addCheck({
        kind: "min",
        value: minLength,
        ...errorUtil.errToObj(message)
      });
    }
    max(maxLength, message) {
      return this._addCheck({
        kind: "max",
        value: maxLength,
        ...errorUtil.errToObj(message)
      });
    }
    length(len, message) {
      return this._addCheck({
        kind: "length",
        value: len,
        ...errorUtil.errToObj(message)
      });
    }
    /**
     * Equivalent to `.min(1)`
     */
    nonempty(message) {
      return this.min(1, errorUtil.errToObj(message));
    }
    trim() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "trim" }]
      });
    }
    toLowerCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toLowerCase" }]
      });
    }
    toUpperCase() {
      return new _ZodString({
        ...this._def,
        checks: [...this._def.checks, { kind: "toUpperCase" }]
      });
    }
    get isDatetime() {
      return !!this._def.checks.find((ch) => ch.kind === "datetime");
    }
    get isDate() {
      return !!this._def.checks.find((ch) => ch.kind === "date");
    }
    get isTime() {
      return !!this._def.checks.find((ch) => ch.kind === "time");
    }
    get isDuration() {
      return !!this._def.checks.find((ch) => ch.kind === "duration");
    }
    get isEmail() {
      return !!this._def.checks.find((ch) => ch.kind === "email");
    }
    get isURL() {
      return !!this._def.checks.find((ch) => ch.kind === "url");
    }
    get isEmoji() {
      return !!this._def.checks.find((ch) => ch.kind === "emoji");
    }
    get isUUID() {
      return !!this._def.checks.find((ch) => ch.kind === "uuid");
    }
    get isNANOID() {
      return !!this._def.checks.find((ch) => ch.kind === "nanoid");
    }
    get isCUID() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid");
    }
    get isCUID2() {
      return !!this._def.checks.find((ch) => ch.kind === "cuid2");
    }
    get isULID() {
      return !!this._def.checks.find((ch) => ch.kind === "ulid");
    }
    get isIP() {
      return !!this._def.checks.find((ch) => ch.kind === "ip");
    }
    get isCIDR() {
      return !!this._def.checks.find((ch) => ch.kind === "cidr");
    }
    get isBase64() {
      return !!this._def.checks.find((ch) => ch.kind === "base64");
    }
    get isBase64url() {
      return !!this._def.checks.find((ch) => ch.kind === "base64url");
    }
    get minLength() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxLength() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodString.create = (params) => {
    return new ZodString({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodString,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  function floatSafeRemainder(val, step) {
    const valDecCount = (val.toString().split(".")[1] || "").length;
    const stepDecCount = (step.toString().split(".")[1] || "").length;
    const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
    const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
    const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
    return valInt % stepInt / 10 ** decCount;
  }
  var ZodNumber = class _ZodNumber extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
      this.step = this.multipleOf;
    }
    _parse(input) {
      if (this._def.coerce) {
        input.data = Number(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.number) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.number,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check of this._def.checks) {
        if (check.kind === "int") {
          if (!util.isInteger(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.invalid_type,
              expected: "integer",
              received: "float",
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "number",
              inclusive: check.inclusive,
              exact: false,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (floatSafeRemainder(input.data, check.value) !== 0) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "finite") {
          if (!Number.isFinite(input.data)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_finite,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodNumber({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodNumber({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    int(message) {
      return this._addCheck({
        kind: "int",
        message: errorUtil.toString(message)
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: 0,
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    finite(message) {
      return this._addCheck({
        kind: "finite",
        message: errorUtil.toString(message)
      });
    }
    safe(message) {
      return this._addCheck({
        kind: "min",
        inclusive: true,
        value: Number.MIN_SAFE_INTEGER,
        message: errorUtil.toString(message)
      })._addCheck({
        kind: "max",
        inclusive: true,
        value: Number.MAX_SAFE_INTEGER,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
    get isInt() {
      return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
    }
    get isFinite() {
      let max = null;
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
          return true;
        } else if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        } else if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return Number.isFinite(min) && Number.isFinite(max);
    }
  };
  ZodNumber.create = (params) => {
    return new ZodNumber({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodNumber,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  var ZodBigInt = class _ZodBigInt extends ZodType {
    constructor() {
      super(...arguments);
      this.min = this.gte;
      this.max = this.lte;
    }
    _parse(input) {
      if (this._def.coerce) {
        try {
          input.data = BigInt(input.data);
        } catch {
          return this._getInvalidInput(input);
        }
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.bigint) {
        return this._getInvalidInput(input);
      }
      let ctx = void 0;
      const status = new ParseStatus();
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
          if (tooSmall) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              type: "bigint",
              minimum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
          if (tooBig) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              type: "bigint",
              maximum: check.value,
              inclusive: check.inclusive,
              message: check.message
            });
            status.dirty();
          }
        } else if (check.kind === "multipleOf") {
          if (input.data % check.value !== BigInt(0)) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.not_multiple_of,
              multipleOf: check.value,
              message: check.message
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return { status: status.value, value: input.data };
    }
    _getInvalidInput(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.bigint,
        received: ctx.parsedType
      });
      return INVALID;
    }
    gte(value, message) {
      return this.setLimit("min", value, true, errorUtil.toString(message));
    }
    gt(value, message) {
      return this.setLimit("min", value, false, errorUtil.toString(message));
    }
    lte(value, message) {
      return this.setLimit("max", value, true, errorUtil.toString(message));
    }
    lt(value, message) {
      return this.setLimit("max", value, false, errorUtil.toString(message));
    }
    setLimit(kind, value, inclusive, message) {
      return new _ZodBigInt({
        ...this._def,
        checks: [
          ...this._def.checks,
          {
            kind,
            value,
            inclusive,
            message: errorUtil.toString(message)
          }
        ]
      });
    }
    _addCheck(check) {
      return new _ZodBigInt({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    positive(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    negative(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: false,
        message: errorUtil.toString(message)
      });
    }
    nonpositive(message) {
      return this._addCheck({
        kind: "max",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    nonnegative(message) {
      return this._addCheck({
        kind: "min",
        value: BigInt(0),
        inclusive: true,
        message: errorUtil.toString(message)
      });
    }
    multipleOf(value, message) {
      return this._addCheck({
        kind: "multipleOf",
        value,
        message: errorUtil.toString(message)
      });
    }
    get minValue() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min;
    }
    get maxValue() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max;
    }
  };
  ZodBigInt.create = (params) => {
    return new ZodBigInt({
      checks: [],
      typeName: ZodFirstPartyTypeKind.ZodBigInt,
      coerce: params?.coerce ?? false,
      ...processCreateParams(params)
    });
  };
  var ZodBoolean = class extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = Boolean(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.boolean) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.boolean,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodBoolean.create = (params) => {
    return new ZodBoolean({
      typeName: ZodFirstPartyTypeKind.ZodBoolean,
      coerce: params?.coerce || false,
      ...processCreateParams(params)
    });
  };
  var ZodDate = class _ZodDate extends ZodType {
    _parse(input) {
      if (this._def.coerce) {
        input.data = new Date(input.data);
      }
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.date) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.date,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      if (Number.isNaN(input.data.getTime())) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_date
        });
        return INVALID;
      }
      const status = new ParseStatus();
      let ctx = void 0;
      for (const check of this._def.checks) {
        if (check.kind === "min") {
          if (input.data.getTime() < check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              message: check.message,
              inclusive: true,
              exact: false,
              minimum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else if (check.kind === "max") {
          if (input.data.getTime() > check.value) {
            ctx = this._getOrReturnCtx(input, ctx);
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              message: check.message,
              inclusive: true,
              exact: false,
              maximum: check.value,
              type: "date"
            });
            status.dirty();
          }
        } else {
          util.assertNever(check);
        }
      }
      return {
        status: status.value,
        value: new Date(input.data.getTime())
      };
    }
    _addCheck(check) {
      return new _ZodDate({
        ...this._def,
        checks: [...this._def.checks, check]
      });
    }
    min(minDate, message) {
      return this._addCheck({
        kind: "min",
        value: minDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    max(maxDate, message) {
      return this._addCheck({
        kind: "max",
        value: maxDate.getTime(),
        message: errorUtil.toString(message)
      });
    }
    get minDate() {
      let min = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "min") {
          if (min === null || ch.value > min)
            min = ch.value;
        }
      }
      return min != null ? new Date(min) : null;
    }
    get maxDate() {
      let max = null;
      for (const ch of this._def.checks) {
        if (ch.kind === "max") {
          if (max === null || ch.value < max)
            max = ch.value;
        }
      }
      return max != null ? new Date(max) : null;
    }
  };
  ZodDate.create = (params) => {
    return new ZodDate({
      checks: [],
      coerce: params?.coerce || false,
      typeName: ZodFirstPartyTypeKind.ZodDate,
      ...processCreateParams(params)
    });
  };
  var ZodSymbol = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.symbol) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.symbol,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodSymbol.create = (params) => {
    return new ZodSymbol({
      typeName: ZodFirstPartyTypeKind.ZodSymbol,
      ...processCreateParams(params)
    });
  };
  var ZodUndefined = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.undefined,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodUndefined.create = (params) => {
    return new ZodUndefined({
      typeName: ZodFirstPartyTypeKind.ZodUndefined,
      ...processCreateParams(params)
    });
  };
  var ZodNull = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.null) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.null,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodNull.create = (params) => {
    return new ZodNull({
      typeName: ZodFirstPartyTypeKind.ZodNull,
      ...processCreateParams(params)
    });
  };
  var ZodAny = class extends ZodType {
    constructor() {
      super(...arguments);
      this._any = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodAny.create = (params) => {
    return new ZodAny({
      typeName: ZodFirstPartyTypeKind.ZodAny,
      ...processCreateParams(params)
    });
  };
  var ZodUnknown = class extends ZodType {
    constructor() {
      super(...arguments);
      this._unknown = true;
    }
    _parse(input) {
      return OK(input.data);
    }
  };
  ZodUnknown.create = (params) => {
    return new ZodUnknown({
      typeName: ZodFirstPartyTypeKind.ZodUnknown,
      ...processCreateParams(params)
    });
  };
  var ZodNever = class extends ZodType {
    _parse(input) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.never,
        received: ctx.parsedType
      });
      return INVALID;
    }
  };
  ZodNever.create = (params) => {
    return new ZodNever({
      typeName: ZodFirstPartyTypeKind.ZodNever,
      ...processCreateParams(params)
    });
  };
  var ZodVoid = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.undefined) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.void,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return OK(input.data);
    }
  };
  ZodVoid.create = (params) => {
    return new ZodVoid({
      typeName: ZodFirstPartyTypeKind.ZodVoid,
      ...processCreateParams(params)
    });
  };
  var ZodArray = class _ZodArray extends ZodType {
    _parse(input) {
      const { ctx, status } = this._processInputParams(input);
      const def = this._def;
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (def.exactLength !== null) {
        const tooBig = ctx.data.length > def.exactLength.value;
        const tooSmall = ctx.data.length < def.exactLength.value;
        if (tooBig || tooSmall) {
          addIssueToContext(ctx, {
            code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
            minimum: tooSmall ? def.exactLength.value : void 0,
            maximum: tooBig ? def.exactLength.value : void 0,
            type: "array",
            inclusive: true,
            exact: true,
            message: def.exactLength.message
          });
          status.dirty();
        }
      }
      if (def.minLength !== null) {
        if (ctx.data.length < def.minLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.minLength.message
          });
          status.dirty();
        }
      }
      if (def.maxLength !== null) {
        if (ctx.data.length > def.maxLength.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxLength.value,
            type: "array",
            inclusive: true,
            exact: false,
            message: def.maxLength.message
          });
          status.dirty();
        }
      }
      if (ctx.common.async) {
        return Promise.all([...ctx.data].map((item, i4) => {
          return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i4));
        })).then((result2) => {
          return ParseStatus.mergeArray(status, result2);
        });
      }
      const result = [...ctx.data].map((item, i4) => {
        return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i4));
      });
      return ParseStatus.mergeArray(status, result);
    }
    get element() {
      return this._def.type;
    }
    min(minLength, message) {
      return new _ZodArray({
        ...this._def,
        minLength: { value: minLength, message: errorUtil.toString(message) }
      });
    }
    max(maxLength, message) {
      return new _ZodArray({
        ...this._def,
        maxLength: { value: maxLength, message: errorUtil.toString(message) }
      });
    }
    length(len, message) {
      return new _ZodArray({
        ...this._def,
        exactLength: { value: len, message: errorUtil.toString(message) }
      });
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodArray.create = (schema, params) => {
    return new ZodArray({
      type: schema,
      minLength: null,
      maxLength: null,
      exactLength: null,
      typeName: ZodFirstPartyTypeKind.ZodArray,
      ...processCreateParams(params)
    });
  };
  function deepPartialify(schema) {
    if (schema instanceof ZodObject) {
      const newShape = {};
      for (const key in schema.shape) {
        const fieldSchema = schema.shape[key];
        newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
      }
      return new ZodObject({
        ...schema._def,
        shape: () => newShape
      });
    } else if (schema instanceof ZodArray) {
      return new ZodArray({
        ...schema._def,
        type: deepPartialify(schema.element)
      });
    } else if (schema instanceof ZodOptional) {
      return ZodOptional.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodNullable) {
      return ZodNullable.create(deepPartialify(schema.unwrap()));
    } else if (schema instanceof ZodTuple) {
      return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
    } else {
      return schema;
    }
  }
  var ZodObject = class _ZodObject extends ZodType {
    constructor() {
      super(...arguments);
      this._cached = null;
      this.nonstrict = this.passthrough;
      this.augment = this.extend;
    }
    _getCached() {
      if (this._cached !== null)
        return this._cached;
      const shape = this._def.shape();
      const keys = util.objectKeys(shape);
      this._cached = { shape, keys };
      return this._cached;
    }
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.object) {
        const ctx2 = this._getOrReturnCtx(input);
        addIssueToContext(ctx2, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx2.parsedType
        });
        return INVALID;
      }
      const { status, ctx } = this._processInputParams(input);
      const { shape, keys: shapeKeys } = this._getCached();
      const extraKeys = [];
      if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
        for (const key in ctx.data) {
          if (!shapeKeys.includes(key)) {
            extraKeys.push(key);
          }
        }
      }
      const pairs = [];
      for (const key of shapeKeys) {
        const keyValidator = shape[key];
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (this._def.catchall instanceof ZodNever) {
        const unknownKeys = this._def.unknownKeys;
        if (unknownKeys === "passthrough") {
          for (const key of extraKeys) {
            pairs.push({
              key: { status: "valid", value: key },
              value: { status: "valid", value: ctx.data[key] }
            });
          }
        } else if (unknownKeys === "strict") {
          if (extraKeys.length > 0) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.unrecognized_keys,
              keys: extraKeys
            });
            status.dirty();
          }
        } else if (unknownKeys === "strip") {
        } else {
          throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
        }
      } else {
        const catchall = this._def.catchall;
        for (const key of extraKeys) {
          const value = ctx.data[key];
          pairs.push({
            key: { status: "valid", value: key },
            value: catchall._parse(
              new ParseInputLazyPath(ctx, value, ctx.path, key)
              //, ctx.child(key), value, getParsedType(value)
            ),
            alwaysSet: key in ctx.data
          });
        }
      }
      if (ctx.common.async) {
        return Promise.resolve().then(async () => {
          const syncPairs = [];
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            syncPairs.push({
              key,
              value,
              alwaysSet: pair.alwaysSet
            });
          }
          return syncPairs;
        }).then((syncPairs) => {
          return ParseStatus.mergeObjectSync(status, syncPairs);
        });
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get shape() {
      return this._def.shape();
    }
    strict(message) {
      errorUtil.errToObj;
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strict",
        ...message !== void 0 ? {
          errorMap: (issue, ctx) => {
            const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
            if (issue.code === "unrecognized_keys")
              return {
                message: errorUtil.errToObj(message).message ?? defaultError
              };
            return {
              message: defaultError
            };
          }
        } : {}
      });
    }
    strip() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "strip"
      });
    }
    passthrough() {
      return new _ZodObject({
        ...this._def,
        unknownKeys: "passthrough"
      });
    }
    // const AugmentFactory =
    //   <Def extends ZodObjectDef>(def: Def) =>
    //   <Augmentation extends ZodRawShape>(
    //     augmentation: Augmentation
    //   ): ZodObject<
    //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
    //     Def["unknownKeys"],
    //     Def["catchall"]
    //   > => {
    //     return new ZodObject({
    //       ...def,
    //       shape: () => ({
    //         ...def.shape(),
    //         ...augmentation,
    //       }),
    //     }) as any;
    //   };
    extend(augmentation) {
      return new _ZodObject({
        ...this._def,
        shape: () => ({
          ...this._def.shape(),
          ...augmentation
        })
      });
    }
    /**
     * Prior to zod@1.0.12 there was a bug in the
     * inferred type of merged objects. Please
     * upgrade if you are experiencing issues.
     */
    merge(merging) {
      const merged = new _ZodObject({
        unknownKeys: merging._def.unknownKeys,
        catchall: merging._def.catchall,
        shape: () => ({
          ...this._def.shape(),
          ...merging._def.shape()
        }),
        typeName: ZodFirstPartyTypeKind.ZodObject
      });
      return merged;
    }
    // merge<
    //   Incoming extends AnyZodObject,
    //   Augmentation extends Incoming["shape"],
    //   NewOutput extends {
    //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
    //       ? Augmentation[k]["_output"]
    //       : k extends keyof Output
    //       ? Output[k]
    //       : never;
    //   },
    //   NewInput extends {
    //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
    //       ? Augmentation[k]["_input"]
    //       : k extends keyof Input
    //       ? Input[k]
    //       : never;
    //   }
    // >(
    //   merging: Incoming
    // ): ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"],
    //   NewOutput,
    //   NewInput
    // > {
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    setKey(key, schema) {
      return this.augment({ [key]: schema });
    }
    // merge<Incoming extends AnyZodObject>(
    //   merging: Incoming
    // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
    // ZodObject<
    //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
    //   Incoming["_def"]["unknownKeys"],
    //   Incoming["_def"]["catchall"]
    // > {
    //   // const mergedShape = objectUtil.mergeShapes(
    //   //   this._def.shape(),
    //   //   merging._def.shape()
    //   // );
    //   const merged: any = new ZodObject({
    //     unknownKeys: merging._def.unknownKeys,
    //     catchall: merging._def.catchall,
    //     shape: () =>
    //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
    //     typeName: ZodFirstPartyTypeKind.ZodObject,
    //   }) as any;
    //   return merged;
    // }
    catchall(index) {
      return new _ZodObject({
        ...this._def,
        catchall: index
      });
    }
    pick(mask) {
      const shape = {};
      for (const key of util.objectKeys(mask)) {
        if (mask[key] && this.shape[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    omit(mask) {
      const shape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (!mask[key]) {
          shape[key] = this.shape[key];
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => shape
      });
    }
    /**
     * @deprecated
     */
    deepPartial() {
      return deepPartialify(this);
    }
    partial(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        const fieldSchema = this.shape[key];
        if (mask && !mask[key]) {
          newShape[key] = fieldSchema;
        } else {
          newShape[key] = fieldSchema.optional();
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    required(mask) {
      const newShape = {};
      for (const key of util.objectKeys(this.shape)) {
        if (mask && !mask[key]) {
          newShape[key] = this.shape[key];
        } else {
          const fieldSchema = this.shape[key];
          let newField = fieldSchema;
          while (newField instanceof ZodOptional) {
            newField = newField._def.innerType;
          }
          newShape[key] = newField;
        }
      }
      return new _ZodObject({
        ...this._def,
        shape: () => newShape
      });
    }
    keyof() {
      return createZodEnum(util.objectKeys(this.shape));
    }
  };
  ZodObject.create = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.strictCreate = (shape, params) => {
    return new ZodObject({
      shape: () => shape,
      unknownKeys: "strict",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  ZodObject.lazycreate = (shape, params) => {
    return new ZodObject({
      shape,
      unknownKeys: "strip",
      catchall: ZodNever.create(),
      typeName: ZodFirstPartyTypeKind.ZodObject,
      ...processCreateParams(params)
    });
  };
  var ZodUnion = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const options = this._def.options;
      function handleResults(results) {
        for (const result of results) {
          if (result.result.status === "valid") {
            return result.result;
          }
        }
        for (const result of results) {
          if (result.result.status === "dirty") {
            ctx.common.issues.push(...result.ctx.common.issues);
            return result.result;
          }
        }
        const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return Promise.all(options.map(async (option) => {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          return {
            result: await option._parseAsync({
              data: ctx.data,
              path: ctx.path,
              parent: childCtx
            }),
            ctx: childCtx
          };
        })).then(handleResults);
      } else {
        let dirty = void 0;
        const issues = [];
        for (const option of options) {
          const childCtx = {
            ...ctx,
            common: {
              ...ctx.common,
              issues: []
            },
            parent: null
          };
          const result = option._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          });
          if (result.status === "valid") {
            return result;
          } else if (result.status === "dirty" && !dirty) {
            dirty = { result, ctx: childCtx };
          }
          if (childCtx.common.issues.length) {
            issues.push(childCtx.common.issues);
          }
        }
        if (dirty) {
          ctx.common.issues.push(...dirty.ctx.common.issues);
          return dirty.result;
        }
        const unionErrors = issues.map((issues2) => new ZodError(issues2));
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union,
          unionErrors
        });
        return INVALID;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  ZodUnion.create = (types, params) => {
    return new ZodUnion({
      options: types,
      typeName: ZodFirstPartyTypeKind.ZodUnion,
      ...processCreateParams(params)
    });
  };
  var getDiscriminator = (type) => {
    if (type instanceof ZodLazy) {
      return getDiscriminator(type.schema);
    } else if (type instanceof ZodEffects) {
      return getDiscriminator(type.innerType());
    } else if (type instanceof ZodLiteral) {
      return [type.value];
    } else if (type instanceof ZodEnum) {
      return type.options;
    } else if (type instanceof ZodNativeEnum) {
      return util.objectValues(type.enum);
    } else if (type instanceof ZodDefault) {
      return getDiscriminator(type._def.innerType);
    } else if (type instanceof ZodUndefined) {
      return [void 0];
    } else if (type instanceof ZodNull) {
      return [null];
    } else if (type instanceof ZodOptional) {
      return [void 0, ...getDiscriminator(type.unwrap())];
    } else if (type instanceof ZodNullable) {
      return [null, ...getDiscriminator(type.unwrap())];
    } else if (type instanceof ZodBranded) {
      return getDiscriminator(type.unwrap());
    } else if (type instanceof ZodReadonly) {
      return getDiscriminator(type.unwrap());
    } else if (type instanceof ZodCatch) {
      return getDiscriminator(type._def.innerType);
    } else {
      return [];
    }
  };
  var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const discriminator = this.discriminator;
      const discriminatorValue = ctx.data[discriminator];
      const option = this.optionsMap.get(discriminatorValue);
      if (!option) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_union_discriminator,
          options: Array.from(this.optionsMap.keys()),
          path: [discriminator]
        });
        return INVALID;
      }
      if (ctx.common.async) {
        return option._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      } else {
        return option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
      }
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
    /**
     * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
     * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
     * have a different value for each object in the union.
     * @param discriminator the name of the discriminator property
     * @param types an array of object schemas
     * @param params
     */
    static create(discriminator, options, params) {
      const optionsMap = /* @__PURE__ */ new Map();
      for (const type of options) {
        const discriminatorValues = getDiscriminator(type.shape[discriminator]);
        if (!discriminatorValues.length) {
          throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
        }
        for (const value of discriminatorValues) {
          if (optionsMap.has(value)) {
            throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
          }
          optionsMap.set(value, type);
        }
      }
      return new _ZodDiscriminatedUnion({
        typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
        discriminator,
        options,
        optionsMap,
        ...processCreateParams(params)
      });
    }
  };
  function mergeValues(a5, b2) {
    const aType = getParsedType(a5);
    const bType = getParsedType(b2);
    if (a5 === b2) {
      return { valid: true, data: a5 };
    } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
      const bKeys = util.objectKeys(b2);
      const sharedKeys = util.objectKeys(a5).filter((key) => bKeys.indexOf(key) !== -1);
      const newObj = { ...a5, ...b2 };
      for (const key of sharedKeys) {
        const sharedValue = mergeValues(a5[key], b2[key]);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newObj[key] = sharedValue.data;
      }
      return { valid: true, data: newObj };
    } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
      if (a5.length !== b2.length) {
        return { valid: false };
      }
      const newArray = [];
      for (let index = 0; index < a5.length; index++) {
        const itemA = a5[index];
        const itemB = b2[index];
        const sharedValue = mergeValues(itemA, itemB);
        if (!sharedValue.valid) {
          return { valid: false };
        }
        newArray.push(sharedValue.data);
      }
      return { valid: true, data: newArray };
    } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a5 === +b2) {
      return { valid: true, data: a5 };
    } else {
      return { valid: false };
    }
  }
  var ZodIntersection = class extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const handleParsed = (parsedLeft, parsedRight) => {
        if (isAborted(parsedLeft) || isAborted(parsedRight)) {
          return INVALID;
        }
        const merged = mergeValues(parsedLeft.value, parsedRight.value);
        if (!merged.valid) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_intersection_types
          });
          return INVALID;
        }
        if (isDirty(parsedLeft) || isDirty(parsedRight)) {
          status.dirty();
        }
        return { status: status.value, value: merged.data };
      };
      if (ctx.common.async) {
        return Promise.all([
          this._def.left._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          }),
          this._def.right._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          })
        ]).then(([left, right]) => handleParsed(left, right));
      } else {
        return handleParsed(this._def.left._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }), this._def.right._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }));
      }
    }
  };
  ZodIntersection.create = (left, right, params) => {
    return new ZodIntersection({
      left,
      right,
      typeName: ZodFirstPartyTypeKind.ZodIntersection,
      ...processCreateParams(params)
    });
  };
  var ZodTuple = class _ZodTuple extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.array) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.array,
          received: ctx.parsedType
        });
        return INVALID;
      }
      if (ctx.data.length < this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        return INVALID;
      }
      const rest = this._def.rest;
      if (!rest && ctx.data.length > this._def.items.length) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: this._def.items.length,
          inclusive: true,
          exact: false,
          type: "array"
        });
        status.dirty();
      }
      const items = [...ctx.data].map((item, itemIndex) => {
        const schema = this._def.items[itemIndex] || this._def.rest;
        if (!schema)
          return null;
        return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
      }).filter((x3) => !!x3);
      if (ctx.common.async) {
        return Promise.all(items).then((results) => {
          return ParseStatus.mergeArray(status, results);
        });
      } else {
        return ParseStatus.mergeArray(status, items);
      }
    }
    get items() {
      return this._def.items;
    }
    rest(rest) {
      return new _ZodTuple({
        ...this._def,
        rest
      });
    }
  };
  ZodTuple.create = (schemas, params) => {
    if (!Array.isArray(schemas)) {
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    }
    return new ZodTuple({
      items: schemas,
      typeName: ZodFirstPartyTypeKind.ZodTuple,
      rest: null,
      ...processCreateParams(params)
    });
  };
  var ZodRecord = class _ZodRecord extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.object) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.object,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const pairs = [];
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      for (const key in ctx.data) {
        pairs.push({
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
          value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
          alwaysSet: key in ctx.data
        });
      }
      if (ctx.common.async) {
        return ParseStatus.mergeObjectAsync(status, pairs);
      } else {
        return ParseStatus.mergeObjectSync(status, pairs);
      }
    }
    get element() {
      return this._def.valueType;
    }
    static create(first, second, third) {
      if (second instanceof ZodType) {
        return new _ZodRecord({
          keyType: first,
          valueType: second,
          typeName: ZodFirstPartyTypeKind.ZodRecord,
          ...processCreateParams(third)
        });
      }
      return new _ZodRecord({
        keyType: ZodString.create(),
        valueType: first,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(second)
      });
    }
  };
  var ZodMap = class extends ZodType {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.map) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.map,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const keyType = this._def.keyType;
      const valueType = this._def.valueType;
      const pairs = [...ctx.data.entries()].map(([key, value], index) => {
        return {
          key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
          value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
        };
      });
      if (ctx.common.async) {
        const finalMap = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (const pair of pairs) {
            const key = await pair.key;
            const value = await pair.value;
            if (key.status === "aborted" || value.status === "aborted") {
              return INVALID;
            }
            if (key.status === "dirty" || value.status === "dirty") {
              status.dirty();
            }
            finalMap.set(key.value, value.value);
          }
          return { status: status.value, value: finalMap };
        });
      } else {
        const finalMap = /* @__PURE__ */ new Map();
        for (const pair of pairs) {
          const key = pair.key;
          const value = pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      }
    }
  };
  ZodMap.create = (keyType, valueType, params) => {
    return new ZodMap({
      valueType,
      keyType,
      typeName: ZodFirstPartyTypeKind.ZodMap,
      ...processCreateParams(params)
    });
  };
  var ZodSet = class _ZodSet extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.set) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.set,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const def = this._def;
      if (def.minSize !== null) {
        if (ctx.data.size < def.minSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: def.minSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.minSize.message
          });
          status.dirty();
        }
      }
      if (def.maxSize !== null) {
        if (ctx.data.size > def.maxSize.value) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: def.maxSize.value,
            type: "set",
            inclusive: true,
            exact: false,
            message: def.maxSize.message
          });
          status.dirty();
        }
      }
      const valueType = this._def.valueType;
      function finalizeSet(elements2) {
        const parsedSet = /* @__PURE__ */ new Set();
        for (const element of elements2) {
          if (element.status === "aborted")
            return INVALID;
          if (element.status === "dirty")
            status.dirty();
          parsedSet.add(element.value);
        }
        return { status: status.value, value: parsedSet };
      }
      const elements = [...ctx.data.values()].map((item, i4) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i4)));
      if (ctx.common.async) {
        return Promise.all(elements).then((elements2) => finalizeSet(elements2));
      } else {
        return finalizeSet(elements);
      }
    }
    min(minSize, message) {
      return new _ZodSet({
        ...this._def,
        minSize: { value: minSize, message: errorUtil.toString(message) }
      });
    }
    max(maxSize, message) {
      return new _ZodSet({
        ...this._def,
        maxSize: { value: maxSize, message: errorUtil.toString(message) }
      });
    }
    size(size, message) {
      return this.min(size, message).max(size, message);
    }
    nonempty(message) {
      return this.min(1, message);
    }
  };
  ZodSet.create = (valueType, params) => {
    return new ZodSet({
      valueType,
      minSize: null,
      maxSize: null,
      typeName: ZodFirstPartyTypeKind.ZodSet,
      ...processCreateParams(params)
    });
  };
  var ZodFunction = class _ZodFunction extends ZodType {
    constructor() {
      super(...arguments);
      this.validate = this.implement;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.function) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.function,
          received: ctx.parsedType
        });
        return INVALID;
      }
      function makeArgsIssue(args, error) {
        return makeIssue({
          data: args,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x3) => !!x3),
          issueData: {
            code: ZodIssueCode.invalid_arguments,
            argumentsError: error
          }
        });
      }
      function makeReturnsIssue(returns, error) {
        return makeIssue({
          data: returns,
          path: ctx.path,
          errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x3) => !!x3),
          issueData: {
            code: ZodIssueCode.invalid_return_type,
            returnTypeError: error
          }
        });
      }
      const params = { errorMap: ctx.common.contextualErrorMap };
      const fn2 = ctx.data;
      if (this._def.returns instanceof ZodPromise) {
        const me3 = this;
        return OK(async function(...args) {
          const error = new ZodError([]);
          const parsedArgs = await me3._def.args.parseAsync(args, params).catch((e14) => {
            error.addIssue(makeArgsIssue(args, e14));
            throw error;
          });
          const result = await Reflect.apply(fn2, this, parsedArgs);
          const parsedReturns = await me3._def.returns._def.type.parseAsync(result, params).catch((e14) => {
            error.addIssue(makeReturnsIssue(result, e14));
            throw error;
          });
          return parsedReturns;
        });
      } else {
        const me3 = this;
        return OK(function(...args) {
          const parsedArgs = me3._def.args.safeParse(args, params);
          if (!parsedArgs.success) {
            throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
          }
          const result = Reflect.apply(fn2, this, parsedArgs.data);
          const parsedReturns = me3._def.returns.safeParse(result, params);
          if (!parsedReturns.success) {
            throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
          }
          return parsedReturns.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...items) {
      return new _ZodFunction({
        ...this._def,
        args: ZodTuple.create(items).rest(ZodUnknown.create())
      });
    }
    returns(returnType) {
      return new _ZodFunction({
        ...this._def,
        returns: returnType
      });
    }
    implement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    strictImplement(func) {
      const validatedFunc = this.parse(func);
      return validatedFunc;
    }
    static create(args, returns, params) {
      return new _ZodFunction({
        args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
        returns: returns || ZodUnknown.create(),
        typeName: ZodFirstPartyTypeKind.ZodFunction,
        ...processCreateParams(params)
      });
    }
  };
  var ZodLazy = class extends ZodType {
    get schema() {
      return this._def.getter();
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const lazySchema = this._def.getter();
      return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
    }
  };
  ZodLazy.create = (getter, params) => {
    return new ZodLazy({
      getter,
      typeName: ZodFirstPartyTypeKind.ZodLazy,
      ...processCreateParams(params)
    });
  };
  var ZodLiteral = class extends ZodType {
    _parse(input) {
      if (input.data !== this._def.value) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_literal,
          expected: this._def.value
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
    get value() {
      return this._def.value;
    }
  };
  ZodLiteral.create = (value, params) => {
    return new ZodLiteral({
      value,
      typeName: ZodFirstPartyTypeKind.ZodLiteral,
      ...processCreateParams(params)
    });
  };
  function createZodEnum(values, params) {
    return new ZodEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodEnum,
      ...processCreateParams(params)
    });
  }
  var ZodEnum = class _ZodEnum extends ZodType {
    _parse(input) {
      if (typeof input.data !== "string") {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(this._def.values);
      }
      if (!this._cache.has(input.data)) {
        const ctx = this._getOrReturnCtx(input);
        const expectedValues = this._def.values;
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Values() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    get Enum() {
      const enumValues = {};
      for (const val of this._def.values) {
        enumValues[val] = val;
      }
      return enumValues;
    }
    extract(values, newDef = this._def) {
      return _ZodEnum.create(values, {
        ...this._def,
        ...newDef
      });
    }
    exclude(values, newDef = this._def) {
      return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
        ...this._def,
        ...newDef
      });
    }
  };
  ZodEnum.create = createZodEnum;
  var ZodNativeEnum = class extends ZodType {
    _parse(input) {
      const nativeEnumValues = util.getValidEnumValues(this._def.values);
      const ctx = this._getOrReturnCtx(input);
      if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          expected: util.joinValues(expectedValues),
          received: ctx.parsedType,
          code: ZodIssueCode.invalid_type
        });
        return INVALID;
      }
      if (!this._cache) {
        this._cache = new Set(util.getValidEnumValues(this._def.values));
      }
      if (!this._cache.has(input.data)) {
        const expectedValues = util.objectValues(nativeEnumValues);
        addIssueToContext(ctx, {
          received: ctx.data,
          code: ZodIssueCode.invalid_enum_value,
          options: expectedValues
        });
        return INVALID;
      }
      return OK(input.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  ZodNativeEnum.create = (values, params) => {
    return new ZodNativeEnum({
      values,
      typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
      ...processCreateParams(params)
    });
  };
  var ZodPromise = class extends ZodType {
    unwrap() {
      return this._def.type;
    }
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.promise,
          received: ctx.parsedType
        });
        return INVALID;
      }
      const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
      return OK(promisified.then((data) => {
        return this._def.type.parseAsync(data, {
          path: ctx.path,
          errorMap: ctx.common.contextualErrorMap
        });
      }));
    }
  };
  ZodPromise.create = (schema, params) => {
    return new ZodPromise({
      type: schema,
      typeName: ZodFirstPartyTypeKind.ZodPromise,
      ...processCreateParams(params)
    });
  };
  var ZodEffects = class extends ZodType {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      const effect = this._def.effect || null;
      const checkCtx = {
        addIssue: (arg) => {
          addIssueToContext(ctx, arg);
          if (arg.fatal) {
            status.abort();
          } else {
            status.dirty();
          }
        },
        get path() {
          return ctx.path;
        }
      };
      checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
      if (effect.type === "preprocess") {
        const processed = effect.transform(ctx.data, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(processed).then(async (processed2) => {
            if (status.value === "aborted")
              return INVALID;
            const result = await this._def.schema._parseAsync({
              data: processed2,
              path: ctx.path,
              parent: ctx
            });
            if (result.status === "aborted")
              return INVALID;
            if (result.status === "dirty")
              return DIRTY(result.value);
            if (status.value === "dirty")
              return DIRTY(result.value);
            return result;
          });
        } else {
          if (status.value === "aborted")
            return INVALID;
          const result = this._def.schema._parseSync({
            data: processed,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        }
      }
      if (effect.type === "refinement") {
        const executeRefinement = (acc) => {
          const result = effect.refinement(acc, checkCtx);
          if (ctx.common.async) {
            return Promise.resolve(result);
          }
          if (result instanceof Promise) {
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          }
          return acc;
        };
        if (ctx.common.async === false) {
          const inner = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          executeRefinement(inner.value);
          return { status: status.value, value: inner.value };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
            if (inner.status === "aborted")
              return INVALID;
            if (inner.status === "dirty")
              status.dirty();
            return executeRefinement(inner.value).then(() => {
              return { status: status.value, value: inner.value };
            });
          });
        }
      }
      if (effect.type === "transform") {
        if (ctx.common.async === false) {
          const base = this._def.schema._parseSync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (!isValid(base))
            return INVALID;
          const result = effect.transform(base.value, checkCtx);
          if (result instanceof Promise) {
            throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
          }
          return { status: status.value, value: result };
        } else {
          return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
            if (!isValid(base))
              return INVALID;
            return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
              status: status.value,
              value: result
            }));
          });
        }
      }
      util.assertNever(effect);
    }
  };
  ZodEffects.create = (schema, effect, params) => {
    return new ZodEffects({
      schema,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect,
      ...processCreateParams(params)
    });
  };
  ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
    return new ZodEffects({
      schema,
      effect: { type: "preprocess", transform: preprocess },
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      ...processCreateParams(params)
    });
  };
  var ZodOptional = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.undefined) {
        return OK(void 0);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodOptional.create = (type, params) => {
    return new ZodOptional({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodOptional,
      ...processCreateParams(params)
    });
  };
  var ZodNullable = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType === ZodParsedType.null) {
        return OK(null);
      }
      return this._def.innerType._parse(input);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodNullable.create = (type, params) => {
    return new ZodNullable({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodNullable,
      ...processCreateParams(params)
    });
  };
  var ZodDefault = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      let data = ctx.data;
      if (ctx.parsedType === ZodParsedType.undefined) {
        data = this._def.defaultValue();
      }
      return this._def.innerType._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  ZodDefault.create = (type, params) => {
    return new ZodDefault({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodDefault,
      defaultValue: typeof params.default === "function" ? params.default : () => params.default,
      ...processCreateParams(params)
    });
  };
  var ZodCatch = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const newCtx = {
        ...ctx,
        common: {
          ...ctx.common,
          issues: []
        }
      };
      const result = this._def.innerType._parse({
        data: newCtx.data,
        path: newCtx.path,
        parent: {
          ...newCtx
        }
      });
      if (isAsync(result)) {
        return result.then((result2) => {
          return {
            status: "valid",
            value: result2.status === "valid" ? result2.value : this._def.catchValue({
              get error() {
                return new ZodError(newCtx.common.issues);
              },
              input: newCtx.data
            })
          };
        });
      } else {
        return {
          status: "valid",
          value: result.status === "valid" ? result.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      }
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  ZodCatch.create = (type, params) => {
    return new ZodCatch({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodCatch,
      catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
      ...processCreateParams(params)
    });
  };
  var ZodNaN = class extends ZodType {
    _parse(input) {
      const parsedType = this._getType(input);
      if (parsedType !== ZodParsedType.nan) {
        const ctx = this._getOrReturnCtx(input);
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_type,
          expected: ZodParsedType.nan,
          received: ctx.parsedType
        });
        return INVALID;
      }
      return { status: "valid", value: input.data };
    }
  };
  ZodNaN.create = (params) => {
    return new ZodNaN({
      typeName: ZodFirstPartyTypeKind.ZodNaN,
      ...processCreateParams(params)
    });
  };
  var BRAND = Symbol("zod_brand");
  var ZodBranded = class extends ZodType {
    _parse(input) {
      const { ctx } = this._processInputParams(input);
      const data = ctx.data;
      return this._def.type._parse({
        data,
        path: ctx.path,
        parent: ctx
      });
    }
    unwrap() {
      return this._def.type;
    }
  };
  var ZodPipeline = class _ZodPipeline extends ZodType {
    _parse(input) {
      const { status, ctx } = this._processInputParams(input);
      if (ctx.common.async) {
        const handleAsync = async () => {
          const inResult = await this._def.in._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: ctx
          });
          if (inResult.status === "aborted")
            return INVALID;
          if (inResult.status === "dirty") {
            status.dirty();
            return DIRTY(inResult.value);
          } else {
            return this._def.out._parseAsync({
              data: inResult.value,
              path: ctx.path,
              parent: ctx
            });
          }
        };
        return handleAsync();
      } else {
        const inResult = this._def.in._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return {
            status: "dirty",
            value: inResult.value
          };
        } else {
          return this._def.out._parseSync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      }
    }
    static create(a5, b2) {
      return new _ZodPipeline({
        in: a5,
        out: b2,
        typeName: ZodFirstPartyTypeKind.ZodPipeline
      });
    }
  };
  var ZodReadonly = class extends ZodType {
    _parse(input) {
      const result = this._def.innerType._parse(input);
      const freeze = (data) => {
        if (isValid(data)) {
          data.value = Object.freeze(data.value);
        }
        return data;
      };
      return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  ZodReadonly.create = (type, params) => {
    return new ZodReadonly({
      innerType: type,
      typeName: ZodFirstPartyTypeKind.ZodReadonly,
      ...processCreateParams(params)
    });
  };
  function cleanParams(params, data) {
    const p2 = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
    const p22 = typeof p2 === "string" ? { message: p2 } : p2;
    return p22;
  }
  function custom(check, _params = {}, fatal) {
    if (check)
      return ZodAny.create().superRefine((data, ctx) => {
        const r3 = check(data);
        if (r3 instanceof Promise) {
          return r3.then((r4) => {
            if (!r4) {
              const params = cleanParams(_params, data);
              const _fatal = params.fatal ?? fatal ?? true;
              ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
            }
          });
        }
        if (!r3) {
          const params = cleanParams(_params, data);
          const _fatal = params.fatal ?? fatal ?? true;
          ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
        }
        return;
      });
    return ZodAny.create();
  }
  var late = {
    object: ZodObject.lazycreate
  };
  var ZodFirstPartyTypeKind;
  (function(ZodFirstPartyTypeKind2) {
    ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
    ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
    ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
    ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
    ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
    ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
    ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
    ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
    ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
    ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
    ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
    ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
    ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
    ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
    ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
    ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
    ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
    ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
    ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
    ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
    ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
    ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
    ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
    ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
    ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
    ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
    ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
    ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
    ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
    ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
    ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
    ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
    ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
    ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
    ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
    ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
  })(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
  var instanceOfType = (cls, params = {
    message: `Input not instance of ${cls.name}`
  }) => custom((data) => data instanceof cls, params);
  var stringType = ZodString.create;
  var numberType = ZodNumber.create;
  var nanType = ZodNaN.create;
  var bigIntType = ZodBigInt.create;
  var booleanType = ZodBoolean.create;
  var dateType = ZodDate.create;
  var symbolType = ZodSymbol.create;
  var undefinedType = ZodUndefined.create;
  var nullType = ZodNull.create;
  var anyType = ZodAny.create;
  var unknownType = ZodUnknown.create;
  var neverType = ZodNever.create;
  var voidType = ZodVoid.create;
  var arrayType = ZodArray.create;
  var objectType = ZodObject.create;
  var strictObjectType = ZodObject.strictCreate;
  var unionType = ZodUnion.create;
  var discriminatedUnionType = ZodDiscriminatedUnion.create;
  var intersectionType = ZodIntersection.create;
  var tupleType = ZodTuple.create;
  var recordType = ZodRecord.create;
  var mapType = ZodMap.create;
  var setType = ZodSet.create;
  var functionType = ZodFunction.create;
  var lazyType = ZodLazy.create;
  var literalType = ZodLiteral.create;
  var enumType = ZodEnum.create;
  var nativeEnumType = ZodNativeEnum.create;
  var promiseType = ZodPromise.create;
  var effectsType = ZodEffects.create;
  var optionalType = ZodOptional.create;
  var nullableType = ZodNullable.create;
  var preprocessType = ZodEffects.createWithPreprocess;
  var pipelineType = ZodPipeline.create;
  var ostring = () => stringType().optional();
  var onumber = () => numberType().optional();
  var oboolean = () => booleanType().optional();
  var coerce = {
    string: (arg) => ZodString.create({ ...arg, coerce: true }),
    number: (arg) => ZodNumber.create({ ...arg, coerce: true }),
    boolean: (arg) => ZodBoolean.create({
      ...arg,
      coerce: true
    }),
    bigint: (arg) => ZodBigInt.create({ ...arg, coerce: true }),
    date: (arg) => ZodDate.create({ ...arg, coerce: true })
  };
  var NEVER = INVALID;

  // node_modules/zod-to-json-schema/dist/esm/Options.js
  var ignoreOverride = Symbol("Let zodToJsonSchema decide on which parser to use");
  var defaultOptions = {
    name: void 0,
    $refStrategy: "root",
    basePath: ["#"],
    effectStrategy: "input",
    pipeStrategy: "all",
    dateStrategy: "format:date-time",
    mapStrategy: "entries",
    removeAdditionalStrategy: "passthrough",
    allowedAdditionalProperties: true,
    rejectedAdditionalProperties: false,
    definitionPath: "definitions",
    target: "jsonSchema7",
    strictUnions: false,
    definitions: {},
    errorMessages: false,
    markdownDescription: false,
    patternStrategy: "escape",
    applyRegexFlags: false,
    emailStrategy: "format:email",
    base64Strategy: "contentEncoding:base64",
    nameStrategy: "ref",
    openAiAnyTypeName: "OpenAiAnyType"
  };
  var getDefaultOptions = (options) => typeof options === "string" ? {
    ...defaultOptions,
    name: options
  } : {
    ...defaultOptions,
    ...options
  };

  // node_modules/zod-to-json-schema/dist/esm/Refs.js
  var getRefs = (options) => {
    const _options = getDefaultOptions(options);
    const currentPath = _options.name !== void 0 ? [..._options.basePath, _options.definitionPath, _options.name] : _options.basePath;
    return {
      ..._options,
      flags: { hasReferencedOpenAiAnyType: false },
      currentPath,
      propertyPath: void 0,
      seen: new Map(Object.entries(_options.definitions).map(([name, def]) => [
        def._def,
        {
          def: def._def,
          path: [..._options.basePath, _options.definitionPath, name],
          // Resolution of references will be forced even though seen, so it's ok that the schema is undefined here for now.
          jsonSchema: void 0
        }
      ]))
    };
  };

  // node_modules/zod-to-json-schema/dist/esm/errorMessages.js
  function addErrorMessage(res, key, errorMessage, refs) {
    if (!refs?.errorMessages)
      return;
    if (errorMessage) {
      res.errorMessage = {
        ...res.errorMessage,
        [key]: errorMessage
      };
    }
  }
  function setResponseValueAndErrors(res, key, value, errorMessage, refs) {
    res[key] = value;
    addErrorMessage(res, key, errorMessage, refs);
  }

  // node_modules/zod-to-json-schema/dist/esm/getRelativePath.js
  var getRelativePath = (pathA, pathB) => {
    let i4 = 0;
    for (; i4 < pathA.length && i4 < pathB.length; i4++) {
      if (pathA[i4] !== pathB[i4])
        break;
    }
    return [(pathA.length - i4).toString(), ...pathB.slice(i4)].join("/");
  };

  // node_modules/zod-to-json-schema/dist/esm/parsers/any.js
  function parseAnyDef(refs) {
    if (refs.target !== "openAi") {
      return {};
    }
    const anyDefinitionPath = [
      ...refs.basePath,
      refs.definitionPath,
      refs.openAiAnyTypeName
    ];
    refs.flags.hasReferencedOpenAiAnyType = true;
    return {
      $ref: refs.$refStrategy === "relative" ? getRelativePath(anyDefinitionPath, refs.currentPath) : anyDefinitionPath.join("/")
    };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/array.js
  function parseArrayDef(def, refs) {
    const res = {
      type: "array"
    };
    if (def.type?._def && def.type?._def?.typeName !== ZodFirstPartyTypeKind.ZodAny) {
      res.items = parseDef(def.type._def, {
        ...refs,
        currentPath: [...refs.currentPath, "items"]
      });
    }
    if (def.minLength) {
      setResponseValueAndErrors(res, "minItems", def.minLength.value, def.minLength.message, refs);
    }
    if (def.maxLength) {
      setResponseValueAndErrors(res, "maxItems", def.maxLength.value, def.maxLength.message, refs);
    }
    if (def.exactLength) {
      setResponseValueAndErrors(res, "minItems", def.exactLength.value, def.exactLength.message, refs);
      setResponseValueAndErrors(res, "maxItems", def.exactLength.value, def.exactLength.message, refs);
    }
    return res;
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/bigint.js
  function parseBigintDef(def, refs) {
    const res = {
      type: "integer",
      format: "int64"
    };
    if (!def.checks)
      return res;
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          if (refs.target === "jsonSchema7") {
            if (check.inclusive) {
              setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
            } else {
              setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
            }
          } else {
            if (!check.inclusive) {
              res.exclusiveMinimum = true;
            }
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          }
          break;
        case "max":
          if (refs.target === "jsonSchema7") {
            if (check.inclusive) {
              setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
            } else {
              setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
            }
          } else {
            if (!check.inclusive) {
              res.exclusiveMaximum = true;
            }
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          }
          break;
        case "multipleOf":
          setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
          break;
      }
    }
    return res;
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/boolean.js
  function parseBooleanDef() {
    return {
      type: "boolean"
    };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/branded.js
  function parseBrandedDef(_def, refs) {
    return parseDef(_def.type._def, refs);
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/catch.js
  var parseCatchDef = (def, refs) => {
    return parseDef(def.innerType._def, refs);
  };

  // node_modules/zod-to-json-schema/dist/esm/parsers/date.js
  function parseDateDef(def, refs, overrideDateStrategy) {
    const strategy = overrideDateStrategy ?? refs.dateStrategy;
    if (Array.isArray(strategy)) {
      return {
        anyOf: strategy.map((item, i4) => parseDateDef(def, refs, item))
      };
    }
    switch (strategy) {
      case "string":
      case "format:date-time":
        return {
          type: "string",
          format: "date-time"
        };
      case "format:date":
        return {
          type: "string",
          format: "date"
        };
      case "integer":
        return integerDateParser(def, refs);
    }
  }
  var integerDateParser = (def, refs) => {
    const res = {
      type: "integer",
      format: "unix-time"
    };
    if (refs.target === "openApi3") {
      return res;
    }
    for (const check of def.checks) {
      switch (check.kind) {
        case "min":
          setResponseValueAndErrors(
            res,
            "minimum",
            check.value,
            // This is in milliseconds
            check.message,
            refs
          );
          break;
        case "max":
          setResponseValueAndErrors(
            res,
            "maximum",
            check.value,
            // This is in milliseconds
            check.message,
            refs
          );
          break;
      }
    }
    return res;
  };

  // node_modules/zod-to-json-schema/dist/esm/parsers/default.js
  function parseDefaultDef(_def, refs) {
    return {
      ...parseDef(_def.innerType._def, refs),
      default: _def.defaultValue()
    };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/effects.js
  function parseEffectsDef(_def, refs) {
    return refs.effectStrategy === "input" ? parseDef(_def.schema._def, refs) : parseAnyDef(refs);
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/enum.js
  function parseEnumDef(def) {
    return {
      type: "string",
      enum: Array.from(def.values)
    };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/intersection.js
  var isJsonSchema7AllOfType = (type) => {
    if ("type" in type && type.type === "string")
      return false;
    return "allOf" in type;
  };
  function parseIntersectionDef(def, refs) {
    const allOf = [
      parseDef(def.left._def, {
        ...refs,
        currentPath: [...refs.currentPath, "allOf", "0"]
      }),
      parseDef(def.right._def, {
        ...refs,
        currentPath: [...refs.currentPath, "allOf", "1"]
      })
    ].filter((x3) => !!x3);
    let unevaluatedProperties = refs.target === "jsonSchema2019-09" ? { unevaluatedProperties: false } : void 0;
    const mergedAllOf = [];
    allOf.forEach((schema) => {
      if (isJsonSchema7AllOfType(schema)) {
        mergedAllOf.push(...schema.allOf);
        if (schema.unevaluatedProperties === void 0) {
          unevaluatedProperties = void 0;
        }
      } else {
        let nestedSchema = schema;
        if ("additionalProperties" in schema && schema.additionalProperties === false) {
          const { additionalProperties, ...rest } = schema;
          nestedSchema = rest;
        } else {
          unevaluatedProperties = void 0;
        }
        mergedAllOf.push(nestedSchema);
      }
    });
    return mergedAllOf.length ? {
      allOf: mergedAllOf,
      ...unevaluatedProperties
    } : void 0;
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/literal.js
  function parseLiteralDef(def, refs) {
    const parsedType = typeof def.value;
    if (parsedType !== "bigint" && parsedType !== "number" && parsedType !== "boolean" && parsedType !== "string") {
      return {
        type: Array.isArray(def.value) ? "array" : "object"
      };
    }
    if (refs.target === "openApi3") {
      return {
        type: parsedType === "bigint" ? "integer" : parsedType,
        enum: [def.value]
      };
    }
    return {
      type: parsedType === "bigint" ? "integer" : parsedType,
      const: def.value
    };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/string.js
  var emojiRegex2 = void 0;
  var zodPatterns = {
    /**
     * `c` was changed to `[cC]` to replicate /i flag
     */
    cuid: /^[cC][^\s-]{8,}$/,
    cuid2: /^[0-9a-z]+$/,
    ulid: /^[0-9A-HJKMNP-TV-Z]{26}$/,
    /**
     * `a-z` was added to replicate /i flag
     */
    email: /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/,
    /**
     * Constructed a valid Unicode RegExp
     *
     * Lazily instantiate since this type of regex isn't supported
     * in all envs (e.g. React Native).
     *
     * See:
     * https://github.com/colinhacks/zod/issues/2433
     * Fix in Zod:
     * https://github.com/colinhacks/zod/commit/9340fd51e48576a75adc919bff65dbc4a5d4c99b
     */
    emoji: () => {
      if (emojiRegex2 === void 0) {
        emojiRegex2 = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u");
      }
      return emojiRegex2;
    },
    /**
     * Unused
     */
    uuid: /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/,
    /**
     * Unused
     */
    ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/,
    ipv4Cidr: /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/,
    /**
     * Unused
     */
    ipv6: /^(([a-f0-9]{1,4}:){7}|::([a-f0-9]{1,4}:){0,6}|([a-f0-9]{1,4}:){1}:([a-f0-9]{1,4}:){0,5}|([a-f0-9]{1,4}:){2}:([a-f0-9]{1,4}:){0,4}|([a-f0-9]{1,4}:){3}:([a-f0-9]{1,4}:){0,3}|([a-f0-9]{1,4}:){4}:([a-f0-9]{1,4}:){0,2}|([a-f0-9]{1,4}:){5}:([a-f0-9]{1,4}:){0,1})([a-f0-9]{1,4}|(((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2}))\.){3}((25[0-5])|(2[0-4][0-9])|(1[0-9]{2})|([0-9]{1,2})))$/,
    ipv6Cidr: /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/,
    base64: /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/,
    base64url: /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/,
    nanoid: /^[a-zA-Z0-9_-]{21}$/,
    jwt: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/
  };
  function parseStringDef(def, refs) {
    const res = {
      type: "string"
    };
    if (def.checks) {
      for (const check of def.checks) {
        switch (check.kind) {
          case "min":
            setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
            break;
          case "max":
            setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
            break;
          case "email":
            switch (refs.emailStrategy) {
              case "format:email":
                addFormat(res, "email", check.message, refs);
                break;
              case "format:idn-email":
                addFormat(res, "idn-email", check.message, refs);
                break;
              case "pattern:zod":
                addPattern(res, zodPatterns.email, check.message, refs);
                break;
            }
            break;
          case "url":
            addFormat(res, "uri", check.message, refs);
            break;
          case "uuid":
            addFormat(res, "uuid", check.message, refs);
            break;
          case "regex":
            addPattern(res, check.regex, check.message, refs);
            break;
          case "cuid":
            addPattern(res, zodPatterns.cuid, check.message, refs);
            break;
          case "cuid2":
            addPattern(res, zodPatterns.cuid2, check.message, refs);
            break;
          case "startsWith":
            addPattern(res, RegExp(`^${escapeLiteralCheckValue(check.value, refs)}`), check.message, refs);
            break;
          case "endsWith":
            addPattern(res, RegExp(`${escapeLiteralCheckValue(check.value, refs)}$`), check.message, refs);
            break;
          case "datetime":
            addFormat(res, "date-time", check.message, refs);
            break;
          case "date":
            addFormat(res, "date", check.message, refs);
            break;
          case "time":
            addFormat(res, "time", check.message, refs);
            break;
          case "duration":
            addFormat(res, "duration", check.message, refs);
            break;
          case "length":
            setResponseValueAndErrors(res, "minLength", typeof res.minLength === "number" ? Math.max(res.minLength, check.value) : check.value, check.message, refs);
            setResponseValueAndErrors(res, "maxLength", typeof res.maxLength === "number" ? Math.min(res.maxLength, check.value) : check.value, check.message, refs);
            break;
          case "includes": {
            addPattern(res, RegExp(escapeLiteralCheckValue(check.value, refs)), check.message, refs);
            break;
          }
          case "ip": {
            if (check.version !== "v6") {
              addFormat(res, "ipv4", check.message, refs);
            }
            if (check.version !== "v4") {
              addFormat(res, "ipv6", check.message, refs);
            }
            break;
          }
          case "base64url":
            addPattern(res, zodPatterns.base64url, check.message, refs);
            break;
          case "jwt":
            addPattern(res, zodPatterns.jwt, check.message, refs);
            break;
          case "cidr": {
            if (check.version !== "v6") {
              addPattern(res, zodPatterns.ipv4Cidr, check.message, refs);
            }
            if (check.version !== "v4") {
              addPattern(res, zodPatterns.ipv6Cidr, check.message, refs);
            }
            break;
          }
          case "emoji":
            addPattern(res, zodPatterns.emoji(), check.message, refs);
            break;
          case "ulid": {
            addPattern(res, zodPatterns.ulid, check.message, refs);
            break;
          }
          case "base64": {
            switch (refs.base64Strategy) {
              case "format:binary": {
                addFormat(res, "binary", check.message, refs);
                break;
              }
              case "contentEncoding:base64": {
                setResponseValueAndErrors(res, "contentEncoding", "base64", check.message, refs);
                break;
              }
              case "pattern:zod": {
                addPattern(res, zodPatterns.base64, check.message, refs);
                break;
              }
            }
            break;
          }
          case "nanoid": {
            addPattern(res, zodPatterns.nanoid, check.message, refs);
          }
          case "toLowerCase":
          case "toUpperCase":
          case "trim":
            break;
          default:
            /* @__PURE__ */ ((_4) => {
            })(check);
        }
      }
    }
    return res;
  }
  function escapeLiteralCheckValue(literal, refs) {
    return refs.patternStrategy === "escape" ? escapeNonAlphaNumeric(literal) : literal;
  }
  var ALPHA_NUMERIC = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
  function escapeNonAlphaNumeric(source) {
    let result = "";
    for (let i4 = 0; i4 < source.length; i4++) {
      if (!ALPHA_NUMERIC.has(source[i4])) {
        result += "\\";
      }
      result += source[i4];
    }
    return result;
  }
  function addFormat(schema, value, message, refs) {
    if (schema.format || schema.anyOf?.some((x3) => x3.format)) {
      if (!schema.anyOf) {
        schema.anyOf = [];
      }
      if (schema.format) {
        schema.anyOf.push({
          format: schema.format,
          ...schema.errorMessage && refs.errorMessages && {
            errorMessage: { format: schema.errorMessage.format }
          }
        });
        delete schema.format;
        if (schema.errorMessage) {
          delete schema.errorMessage.format;
          if (Object.keys(schema.errorMessage).length === 0) {
            delete schema.errorMessage;
          }
        }
      }
      schema.anyOf.push({
        format: value,
        ...message && refs.errorMessages && { errorMessage: { format: message } }
      });
    } else {
      setResponseValueAndErrors(schema, "format", value, message, refs);
    }
  }
  function addPattern(schema, regex, message, refs) {
    if (schema.pattern || schema.allOf?.some((x3) => x3.pattern)) {
      if (!schema.allOf) {
        schema.allOf = [];
      }
      if (schema.pattern) {
        schema.allOf.push({
          pattern: schema.pattern,
          ...schema.errorMessage && refs.errorMessages && {
            errorMessage: { pattern: schema.errorMessage.pattern }
          }
        });
        delete schema.pattern;
        if (schema.errorMessage) {
          delete schema.errorMessage.pattern;
          if (Object.keys(schema.errorMessage).length === 0) {
            delete schema.errorMessage;
          }
        }
      }
      schema.allOf.push({
        pattern: stringifyRegExpWithFlags(regex, refs),
        ...message && refs.errorMessages && { errorMessage: { pattern: message } }
      });
    } else {
      setResponseValueAndErrors(schema, "pattern", stringifyRegExpWithFlags(regex, refs), message, refs);
    }
  }
  function stringifyRegExpWithFlags(regex, refs) {
    if (!refs.applyRegexFlags || !regex.flags) {
      return regex.source;
    }
    const flags = {
      i: regex.flags.includes("i"),
      m: regex.flags.includes("m"),
      s: regex.flags.includes("s")
      // `.` matches newlines
    };
    const source = flags.i ? regex.source.toLowerCase() : regex.source;
    let pattern = "";
    let isEscaped = false;
    let inCharGroup = false;
    let inCharRange = false;
    for (let i4 = 0; i4 < source.length; i4++) {
      if (isEscaped) {
        pattern += source[i4];
        isEscaped = false;
        continue;
      }
      if (flags.i) {
        if (inCharGroup) {
          if (source[i4].match(/[a-z]/)) {
            if (inCharRange) {
              pattern += source[i4];
              pattern += `${source[i4 - 2]}-${source[i4]}`.toUpperCase();
              inCharRange = false;
            } else if (source[i4 + 1] === "-" && source[i4 + 2]?.match(/[a-z]/)) {
              pattern += source[i4];
              inCharRange = true;
            } else {
              pattern += `${source[i4]}${source[i4].toUpperCase()}`;
            }
            continue;
          }
        } else if (source[i4].match(/[a-z]/)) {
          pattern += `[${source[i4]}${source[i4].toUpperCase()}]`;
          continue;
        }
      }
      if (flags.m) {
        if (source[i4] === "^") {
          pattern += `(^|(?<=[\r
]))`;
          continue;
        } else if (source[i4] === "$") {
          pattern += `($|(?=[\r
]))`;
          continue;
        }
      }
      if (flags.s && source[i4] === ".") {
        pattern += inCharGroup ? `${source[i4]}\r
` : `[${source[i4]}\r
]`;
        continue;
      }
      pattern += source[i4];
      if (source[i4] === "\\") {
        isEscaped = true;
      } else if (inCharGroup && source[i4] === "]") {
        inCharGroup = false;
      } else if (!inCharGroup && source[i4] === "[") {
        inCharGroup = true;
      }
    }
    try {
      new RegExp(pattern);
    } catch {
      console.warn(`Could not convert regex pattern at ${refs.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`);
      return regex.source;
    }
    return pattern;
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/record.js
  function parseRecordDef(def, refs) {
    if (refs.target === "openAi") {
      console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead.");
    }
    if (refs.target === "openApi3" && def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
      return {
        type: "object",
        required: def.keyType._def.values,
        properties: def.keyType._def.values.reduce((acc, key) => ({
          ...acc,
          [key]: parseDef(def.valueType._def, {
            ...refs,
            currentPath: [...refs.currentPath, "properties", key]
          }) ?? parseAnyDef(refs)
        }), {}),
        additionalProperties: refs.rejectedAdditionalProperties
      };
    }
    const schema = {
      type: "object",
      additionalProperties: parseDef(def.valueType._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalProperties"]
      }) ?? refs.allowedAdditionalProperties
    };
    if (refs.target === "openApi3") {
      return schema;
    }
    if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.checks?.length) {
      const { type, ...keyType } = parseStringDef(def.keyType._def, refs);
      return {
        ...schema,
        propertyNames: keyType
      };
    } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodEnum) {
      return {
        ...schema,
        propertyNames: {
          enum: def.keyType._def.values
        }
      };
    } else if (def.keyType?._def.typeName === ZodFirstPartyTypeKind.ZodBranded && def.keyType._def.type._def.typeName === ZodFirstPartyTypeKind.ZodString && def.keyType._def.type._def.checks?.length) {
      const { type, ...keyType } = parseBrandedDef(def.keyType._def, refs);
      return {
        ...schema,
        propertyNames: keyType
      };
    }
    return schema;
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/map.js
  function parseMapDef(def, refs) {
    if (refs.mapStrategy === "record") {
      return parseRecordDef(def, refs);
    }
    const keys = parseDef(def.keyType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items", "items", "0"]
    }) || parseAnyDef(refs);
    const values = parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items", "items", "1"]
    }) || parseAnyDef(refs);
    return {
      type: "array",
      maxItems: 125,
      items: {
        type: "array",
        items: [keys, values],
        minItems: 2,
        maxItems: 2
      }
    };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/nativeEnum.js
  function parseNativeEnumDef(def) {
    const object = def.values;
    const actualKeys = Object.keys(def.values).filter((key) => {
      return typeof object[object[key]] !== "number";
    });
    const actualValues = actualKeys.map((key) => object[key]);
    const parsedTypes = Array.from(new Set(actualValues.map((values) => typeof values)));
    return {
      type: parsedTypes.length === 1 ? parsedTypes[0] === "string" ? "string" : "number" : ["string", "number"],
      enum: actualValues
    };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/never.js
  function parseNeverDef(refs) {
    return refs.target === "openAi" ? void 0 : {
      not: parseAnyDef({
        ...refs,
        currentPath: [...refs.currentPath, "not"]
      })
    };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/null.js
  function parseNullDef(refs) {
    return refs.target === "openApi3" ? {
      enum: ["null"],
      nullable: true
    } : {
      type: "null"
    };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/union.js
  var primitiveMappings = {
    ZodString: "string",
    ZodNumber: "number",
    ZodBigInt: "integer",
    ZodBoolean: "boolean",
    ZodNull: "null"
  };
  function parseUnionDef(def, refs) {
    if (refs.target === "openApi3")
      return asAnyOf(def, refs);
    const options = def.options instanceof Map ? Array.from(def.options.values()) : def.options;
    if (options.every((x3) => x3._def.typeName in primitiveMappings && (!x3._def.checks || !x3._def.checks.length))) {
      const types = options.reduce((types2, x3) => {
        const type = primitiveMappings[x3._def.typeName];
        return type && !types2.includes(type) ? [...types2, type] : types2;
      }, []);
      return {
        type: types.length > 1 ? types : types[0]
      };
    } else if (options.every((x3) => x3._def.typeName === "ZodLiteral" && !x3.description)) {
      const types = options.reduce((acc, x3) => {
        const type = typeof x3._def.value;
        switch (type) {
          case "string":
          case "number":
          case "boolean":
            return [...acc, type];
          case "bigint":
            return [...acc, "integer"];
          case "object":
            if (x3._def.value === null)
              return [...acc, "null"];
          case "symbol":
          case "undefined":
          case "function":
          default:
            return acc;
        }
      }, []);
      if (types.length === options.length) {
        const uniqueTypes = types.filter((x3, i4, a5) => a5.indexOf(x3) === i4);
        return {
          type: uniqueTypes.length > 1 ? uniqueTypes : uniqueTypes[0],
          enum: options.reduce((acc, x3) => {
            return acc.includes(x3._def.value) ? acc : [...acc, x3._def.value];
          }, [])
        };
      }
    } else if (options.every((x3) => x3._def.typeName === "ZodEnum")) {
      return {
        type: "string",
        enum: options.reduce((acc, x3) => [
          ...acc,
          ...x3._def.values.filter((x4) => !acc.includes(x4))
        ], [])
      };
    }
    return asAnyOf(def, refs);
  }
  var asAnyOf = (def, refs) => {
    const anyOf = (def.options instanceof Map ? Array.from(def.options.values()) : def.options).map((x3, i4) => parseDef(x3._def, {
      ...refs,
      currentPath: [...refs.currentPath, "anyOf", `${i4}`]
    })).filter((x3) => !!x3 && (!refs.strictUnions || typeof x3 === "object" && Object.keys(x3).length > 0));
    return anyOf.length ? { anyOf } : void 0;
  };

  // node_modules/zod-to-json-schema/dist/esm/parsers/nullable.js
  function parseNullableDef(def, refs) {
    if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(def.innerType._def.typeName) && (!def.innerType._def.checks || !def.innerType._def.checks.length)) {
      if (refs.target === "openApi3") {
        return {
          type: primitiveMappings[def.innerType._def.typeName],
          nullable: true
        };
      }
      return {
        type: [
          primitiveMappings[def.innerType._def.typeName],
          "null"
        ]
      };
    }
    if (refs.target === "openApi3") {
      const base2 = parseDef(def.innerType._def, {
        ...refs,
        currentPath: [...refs.currentPath]
      });
      if (base2 && "$ref" in base2)
        return { allOf: [base2], nullable: true };
      return base2 && { ...base2, nullable: true };
    }
    const base = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "anyOf", "0"]
    });
    return base && { anyOf: [base, { type: "null" }] };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/number.js
  function parseNumberDef(def, refs) {
    const res = {
      type: "number"
    };
    if (!def.checks)
      return res;
    for (const check of def.checks) {
      switch (check.kind) {
        case "int":
          res.type = "integer";
          addErrorMessage(res, "type", check.message, refs);
          break;
        case "min":
          if (refs.target === "jsonSchema7") {
            if (check.inclusive) {
              setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
            } else {
              setResponseValueAndErrors(res, "exclusiveMinimum", check.value, check.message, refs);
            }
          } else {
            if (!check.inclusive) {
              res.exclusiveMinimum = true;
            }
            setResponseValueAndErrors(res, "minimum", check.value, check.message, refs);
          }
          break;
        case "max":
          if (refs.target === "jsonSchema7") {
            if (check.inclusive) {
              setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
            } else {
              setResponseValueAndErrors(res, "exclusiveMaximum", check.value, check.message, refs);
            }
          } else {
            if (!check.inclusive) {
              res.exclusiveMaximum = true;
            }
            setResponseValueAndErrors(res, "maximum", check.value, check.message, refs);
          }
          break;
        case "multipleOf":
          setResponseValueAndErrors(res, "multipleOf", check.value, check.message, refs);
          break;
      }
    }
    return res;
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/object.js
  function parseObjectDef(def, refs) {
    const forceOptionalIntoNullable = refs.target === "openAi";
    const result = {
      type: "object",
      properties: {}
    };
    const required = [];
    const shape = def.shape();
    for (const propName in shape) {
      let propDef = shape[propName];
      if (propDef === void 0 || propDef._def === void 0) {
        continue;
      }
      let propOptional = safeIsOptional(propDef);
      if (propOptional && forceOptionalIntoNullable) {
        if (propDef._def.typeName === "ZodOptional") {
          propDef = propDef._def.innerType;
        }
        if (!propDef.isNullable()) {
          propDef = propDef.nullable();
        }
        propOptional = false;
      }
      const parsedDef = parseDef(propDef._def, {
        ...refs,
        currentPath: [...refs.currentPath, "properties", propName],
        propertyPath: [...refs.currentPath, "properties", propName]
      });
      if (parsedDef === void 0) {
        continue;
      }
      result.properties[propName] = parsedDef;
      if (!propOptional) {
        required.push(propName);
      }
    }
    if (required.length) {
      result.required = required;
    }
    const additionalProperties = decideAdditionalProperties(def, refs);
    if (additionalProperties !== void 0) {
      result.additionalProperties = additionalProperties;
    }
    return result;
  }
  function decideAdditionalProperties(def, refs) {
    if (def.catchall._def.typeName !== "ZodNever") {
      return parseDef(def.catchall._def, {
        ...refs,
        currentPath: [...refs.currentPath, "additionalProperties"]
      });
    }
    switch (def.unknownKeys) {
      case "passthrough":
        return refs.allowedAdditionalProperties;
      case "strict":
        return refs.rejectedAdditionalProperties;
      case "strip":
        return refs.removeAdditionalStrategy === "strict" ? refs.allowedAdditionalProperties : refs.rejectedAdditionalProperties;
    }
  }
  function safeIsOptional(schema) {
    try {
      return schema.isOptional();
    } catch {
      return true;
    }
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/optional.js
  var parseOptionalDef = (def, refs) => {
    if (refs.currentPath.toString() === refs.propertyPath?.toString()) {
      return parseDef(def.innerType._def, refs);
    }
    const innerSchema = parseDef(def.innerType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "anyOf", "1"]
    });
    return innerSchema ? {
      anyOf: [
        {
          not: parseAnyDef(refs)
        },
        innerSchema
      ]
    } : parseAnyDef(refs);
  };

  // node_modules/zod-to-json-schema/dist/esm/parsers/pipeline.js
  var parsePipelineDef = (def, refs) => {
    if (refs.pipeStrategy === "input") {
      return parseDef(def.in._def, refs);
    } else if (refs.pipeStrategy === "output") {
      return parseDef(def.out._def, refs);
    }
    const a5 = parseDef(def.in._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", "0"]
    });
    const b2 = parseDef(def.out._def, {
      ...refs,
      currentPath: [...refs.currentPath, "allOf", a5 ? "1" : "0"]
    });
    return {
      allOf: [a5, b2].filter((x3) => x3 !== void 0)
    };
  };

  // node_modules/zod-to-json-schema/dist/esm/parsers/promise.js
  function parsePromiseDef(def, refs) {
    return parseDef(def.type._def, refs);
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/set.js
  function parseSetDef(def, refs) {
    const items = parseDef(def.valueType._def, {
      ...refs,
      currentPath: [...refs.currentPath, "items"]
    });
    const schema = {
      type: "array",
      uniqueItems: true,
      items
    };
    if (def.minSize) {
      setResponseValueAndErrors(schema, "minItems", def.minSize.value, def.minSize.message, refs);
    }
    if (def.maxSize) {
      setResponseValueAndErrors(schema, "maxItems", def.maxSize.value, def.maxSize.message, refs);
    }
    return schema;
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/tuple.js
  function parseTupleDef(def, refs) {
    if (def.rest) {
      return {
        type: "array",
        minItems: def.items.length,
        items: def.items.map((x3, i4) => parseDef(x3._def, {
          ...refs,
          currentPath: [...refs.currentPath, "items", `${i4}`]
        })).reduce((acc, x3) => x3 === void 0 ? acc : [...acc, x3], []),
        additionalItems: parseDef(def.rest._def, {
          ...refs,
          currentPath: [...refs.currentPath, "additionalItems"]
        })
      };
    } else {
      return {
        type: "array",
        minItems: def.items.length,
        maxItems: def.items.length,
        items: def.items.map((x3, i4) => parseDef(x3._def, {
          ...refs,
          currentPath: [...refs.currentPath, "items", `${i4}`]
        })).reduce((acc, x3) => x3 === void 0 ? acc : [...acc, x3], [])
      };
    }
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/undefined.js
  function parseUndefinedDef(refs) {
    return {
      not: parseAnyDef(refs)
    };
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/unknown.js
  function parseUnknownDef(refs) {
    return parseAnyDef(refs);
  }

  // node_modules/zod-to-json-schema/dist/esm/parsers/readonly.js
  var parseReadonlyDef = (def, refs) => {
    return parseDef(def.innerType._def, refs);
  };

  // node_modules/zod-to-json-schema/dist/esm/selectParser.js
  var selectParser = (def, typeName, refs) => {
    switch (typeName) {
      case ZodFirstPartyTypeKind.ZodString:
        return parseStringDef(def, refs);
      case ZodFirstPartyTypeKind.ZodNumber:
        return parseNumberDef(def, refs);
      case ZodFirstPartyTypeKind.ZodObject:
        return parseObjectDef(def, refs);
      case ZodFirstPartyTypeKind.ZodBigInt:
        return parseBigintDef(def, refs);
      case ZodFirstPartyTypeKind.ZodBoolean:
        return parseBooleanDef();
      case ZodFirstPartyTypeKind.ZodDate:
        return parseDateDef(def, refs);
      case ZodFirstPartyTypeKind.ZodUndefined:
        return parseUndefinedDef(refs);
      case ZodFirstPartyTypeKind.ZodNull:
        return parseNullDef(refs);
      case ZodFirstPartyTypeKind.ZodArray:
        return parseArrayDef(def, refs);
      case ZodFirstPartyTypeKind.ZodUnion:
      case ZodFirstPartyTypeKind.ZodDiscriminatedUnion:
        return parseUnionDef(def, refs);
      case ZodFirstPartyTypeKind.ZodIntersection:
        return parseIntersectionDef(def, refs);
      case ZodFirstPartyTypeKind.ZodTuple:
        return parseTupleDef(def, refs);
      case ZodFirstPartyTypeKind.ZodRecord:
        return parseRecordDef(def, refs);
      case ZodFirstPartyTypeKind.ZodLiteral:
        return parseLiteralDef(def, refs);
      case ZodFirstPartyTypeKind.ZodEnum:
        return parseEnumDef(def);
      case ZodFirstPartyTypeKind.ZodNativeEnum:
        return parseNativeEnumDef(def);
      case ZodFirstPartyTypeKind.ZodNullable:
        return parseNullableDef(def, refs);
      case ZodFirstPartyTypeKind.ZodOptional:
        return parseOptionalDef(def, refs);
      case ZodFirstPartyTypeKind.ZodMap:
        return parseMapDef(def, refs);
      case ZodFirstPartyTypeKind.ZodSet:
        return parseSetDef(def, refs);
      case ZodFirstPartyTypeKind.ZodLazy:
        return () => def.getter()._def;
      case ZodFirstPartyTypeKind.ZodPromise:
        return parsePromiseDef(def, refs);
      case ZodFirstPartyTypeKind.ZodNaN:
      case ZodFirstPartyTypeKind.ZodNever:
        return parseNeverDef(refs);
      case ZodFirstPartyTypeKind.ZodEffects:
        return parseEffectsDef(def, refs);
      case ZodFirstPartyTypeKind.ZodAny:
        return parseAnyDef(refs);
      case ZodFirstPartyTypeKind.ZodUnknown:
        return parseUnknownDef(refs);
      case ZodFirstPartyTypeKind.ZodDefault:
        return parseDefaultDef(def, refs);
      case ZodFirstPartyTypeKind.ZodBranded:
        return parseBrandedDef(def, refs);
      case ZodFirstPartyTypeKind.ZodReadonly:
        return parseReadonlyDef(def, refs);
      case ZodFirstPartyTypeKind.ZodCatch:
        return parseCatchDef(def, refs);
      case ZodFirstPartyTypeKind.ZodPipeline:
        return parsePipelineDef(def, refs);
      case ZodFirstPartyTypeKind.ZodFunction:
      case ZodFirstPartyTypeKind.ZodVoid:
      case ZodFirstPartyTypeKind.ZodSymbol:
        return void 0;
      default:
        return /* @__PURE__ */ ((_4) => void 0)(typeName);
    }
  };

  // node_modules/zod-to-json-schema/dist/esm/parseDef.js
  function parseDef(def, refs, forceResolution = false) {
    const seenItem = refs.seen.get(def);
    if (refs.override) {
      const overrideResult = refs.override?.(def, refs, seenItem, forceResolution);
      if (overrideResult !== ignoreOverride) {
        return overrideResult;
      }
    }
    if (seenItem && !forceResolution) {
      const seenSchema = get$ref(seenItem, refs);
      if (seenSchema !== void 0) {
        return seenSchema;
      }
    }
    const newItem = { def, path: refs.currentPath, jsonSchema: void 0 };
    refs.seen.set(def, newItem);
    const jsonSchemaOrGetter = selectParser(def, def.typeName, refs);
    const jsonSchema = typeof jsonSchemaOrGetter === "function" ? parseDef(jsonSchemaOrGetter(), refs) : jsonSchemaOrGetter;
    if (jsonSchema) {
      addMeta(def, refs, jsonSchema);
    }
    if (refs.postProcess) {
      const postProcessResult = refs.postProcess(jsonSchema, def, refs);
      newItem.jsonSchema = jsonSchema;
      return postProcessResult;
    }
    newItem.jsonSchema = jsonSchema;
    return jsonSchema;
  }
  var get$ref = (item, refs) => {
    switch (refs.$refStrategy) {
      case "root":
        return { $ref: item.path.join("/") };
      case "relative":
        return { $ref: getRelativePath(refs.currentPath, item.path) };
      case "none":
      case "seen": {
        if (item.path.length < refs.currentPath.length && item.path.every((value, index) => refs.currentPath[index] === value)) {
          console.warn(`Recursive reference detected at ${refs.currentPath.join("/")}! Defaulting to any`);
          return parseAnyDef(refs);
        }
        return refs.$refStrategy === "seen" ? parseAnyDef(refs) : void 0;
      }
    }
  };
  var addMeta = (def, refs, jsonSchema) => {
    if (def.description) {
      jsonSchema.description = def.description;
      if (refs.markdownDescription) {
        jsonSchema.markdownDescription = def.description;
      }
    }
    return jsonSchema;
  };

  // node_modules/zod-to-json-schema/dist/esm/zodToJsonSchema.js
  var zodToJsonSchema = (schema, options) => {
    const refs = getRefs(options);
    let definitions = typeof options === "object" && options.definitions ? Object.entries(options.definitions).reduce((acc, [name2, schema2]) => ({
      ...acc,
      [name2]: parseDef(schema2._def, {
        ...refs,
        currentPath: [...refs.basePath, refs.definitionPath, name2]
      }, true) ?? parseAnyDef(refs)
    }), {}) : void 0;
    const name = typeof options === "string" ? options : options?.nameStrategy === "title" ? void 0 : options?.name;
    const main = parseDef(schema._def, name === void 0 ? refs : {
      ...refs,
      currentPath: [...refs.basePath, refs.definitionPath, name]
    }, false) ?? parseAnyDef(refs);
    const title = typeof options === "object" && options.name !== void 0 && options.nameStrategy === "title" ? options.name : void 0;
    if (title !== void 0) {
      main.title = title;
    }
    if (refs.flags.hasReferencedOpenAiAnyType) {
      if (!definitions) {
        definitions = {};
      }
      if (!definitions[refs.openAiAnyTypeName]) {
        definitions[refs.openAiAnyTypeName] = {
          // Skipping "object" as no properties can be defined and additionalProperties must be "false"
          type: ["string", "number", "integer", "boolean", "array", "null"],
          items: {
            $ref: refs.$refStrategy === "relative" ? "1" : [
              ...refs.basePath,
              refs.definitionPath,
              refs.openAiAnyTypeName
            ].join("/")
          }
        };
      }
    }
    const combined = name === void 0 ? definitions ? {
      ...main,
      [refs.definitionPath]: definitions
    } : main : {
      $ref: [
        ...refs.$refStrategy === "relative" ? [] : refs.basePath,
        refs.definitionPath,
        name
      ].join("/"),
      [refs.definitionPath]: {
        ...definitions,
        [name]: main
      }
    };
    if (refs.target === "jsonSchema7") {
      combined.$schema = "http://json-schema.org/draft-07/schema#";
    } else if (refs.target === "jsonSchema2019-09" || refs.target === "openAi") {
      combined.$schema = "https://json-schema.org/draft/2019-09/schema#";
    }
    if (refs.target === "openAi" && ("anyOf" in combined || "oneOf" in combined || "allOf" in combined || "type" in combined && Array.isArray(combined.type))) {
      console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property.");
    }
    return combined;
  };

  // node_modules/@walkeros/core/dist/index.mjs
  var e = Object.defineProperty;
  var t = (t12, n5) => {
    for (var i4 in n5)
      e(t12, i4, { get: n5[i4], enumerable: true });
  };
  var h = external_exports.string();
  var y = external_exports.number();
  var S = external_exports.boolean();
  var v = external_exports.string().min(1);
  var j = external_exports.number().int().positive();
  var w = external_exports.number().int().nonnegative();
  var x = external_exports.number().describe("Tagging version number");
  var E = external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()]);
  var C = E.optional();
  var P = {};
  t(P, { ErrorHandlerSchema: () => O, HandlerSchema: () => L, LogHandlerSchema: () => J, StorageSchema: () => I, StorageTypeSchema: () => $, errorHandlerJsonSchema: () => R, handlerJsonSchema: () => q, logHandlerJsonSchema: () => A, storageJsonSchema: () => M, storageTypeJsonSchema: () => T });
  var $ = external_exports.enum(["local", "session", "cookie"]).describe("Storage mechanism: local, session, or cookie");
  var I = external_exports.object({ Local: external_exports.literal("local"), Session: external_exports.literal("session"), Cookie: external_exports.literal("cookie") }).describe("Storage type constants for type-safe references");
  var O = external_exports.any().describe("Error handler function: (error, state?) => void");
  var J = external_exports.any().describe("Log handler function: (message, verbose?) => void");
  var L = external_exports.object({ Error: O.describe("Error handler function"), Log: J.describe("Log handler function") }).describe("Handler interface with error and log functions");
  var T = zodToJsonSchema($, { target: "jsonSchema7", $refStrategy: "relative", name: "StorageType" });
  var M = zodToJsonSchema(I, { target: "jsonSchema7", $refStrategy: "relative", name: "Storage" });
  var R = zodToJsonSchema(O, { target: "jsonSchema7", $refStrategy: "relative", name: "ErrorHandler" });
  var A = zodToJsonSchema(J, { target: "jsonSchema7", $refStrategy: "relative", name: "LogHandler" });
  var q = zodToJsonSchema(L, { target: "jsonSchema7", $refStrategy: "relative", name: "Handler" });
  var U = external_exports.object({ onError: O.optional().describe("Error handler function: (error, state?) => void"), onLog: J.optional().describe("Log handler function: (message, verbose?) => void") }).partial();
  var N = external_exports.object({ verbose: external_exports.boolean().describe("Enable verbose logging for debugging").optional() }).partial();
  var B = external_exports.object({ queue: external_exports.boolean().describe("Whether to queue events when consent is not granted").optional() }).partial();
  var W = external_exports.object({}).partial();
  var V = external_exports.object({ init: external_exports.boolean().describe("Whether to initialize immediately").optional(), loadScript: external_exports.boolean().describe("Whether to load external script (for web destinations)").optional() }).partial();
  var H = external_exports.object({ disabled: external_exports.boolean().describe("Set to true to disable").optional() }).partial();
  var _ = external_exports.object({ primary: external_exports.boolean().describe("Mark as primary (only one can be primary)").optional() }).partial();
  var K = external_exports.object({ settings: external_exports.any().optional().describe("Implementation-specific configuration") }).partial();
  var F = external_exports.object({ env: external_exports.any().optional().describe("Environment dependencies (platform-specific)") }).partial();
  var Z = external_exports.object({ type: external_exports.string().optional().describe("Instance type identifier"), config: external_exports.any().describe("Instance configuration") }).partial();
  var ee = external_exports.object({ collector: external_exports.any().describe("Collector instance (runtime object)"), config: external_exports.any().describe("Configuration"), env: external_exports.any().describe("Environment dependencies") }).partial();
  var te = external_exports.object({ batch: external_exports.number().optional().describe("Batch size: bundle N events for batch processing"), batched: external_exports.any().optional().describe("Batch of events to be processed") }).partial();
  var ne = external_exports.object({ ignore: external_exports.boolean().describe("Set to true to skip processing").optional(), condition: external_exports.string().optional().describe("Condition function: return true to process") }).partial();
  var ie = external_exports.object({ sources: external_exports.record(external_exports.string(), external_exports.any()).describe("Map of source instances") }).partial();
  var oe = external_exports.object({ destinations: external_exports.record(external_exports.string(), external_exports.any()).describe("Map of destination instances") }).partial();
  var re = {};
  t(re, { ConsentSchema: () => me, DeepPartialEventSchema: () => je, EntitiesSchema: () => ye, EntitySchema: () => he, EventSchema: () => Se, OrderedPropertiesSchema: () => pe, PartialEventSchema: () => ve, PropertiesSchema: () => de, PropertySchema: () => le, PropertyTypeSchema: () => ce, SourceSchema: () => fe, SourceTypeSchema: () => ue, UserSchema: () => ge, VersionSchema: () => be, consentJsonSchema: () => De, entityJsonSchema: () => Pe, eventJsonSchema: () => we, orderedPropertiesJsonSchema: () => ke, partialEventJsonSchema: () => xe, propertiesJsonSchema: () => Ce, sourceTypeJsonSchema: () => ze, userJsonSchema: () => Ee });
  var ce = external_exports.lazy(() => external_exports.union([external_exports.boolean(), external_exports.string(), external_exports.number(), external_exports.record(external_exports.string(), le)]));
  var le = external_exports.lazy(() => external_exports.union([ce, external_exports.array(ce)]));
  var de = external_exports.record(external_exports.string(), le.optional()).describe("Flexible property collection with optional values");
  var pe = external_exports.record(external_exports.string(), external_exports.tuple([le, external_exports.number()]).optional()).describe("Ordered properties with [value, order] tuples for priority control");
  var ue = external_exports.union([external_exports.enum(["web", "server", "app", "other"]), external_exports.string()]).describe("Source type: web, server, app, other, or custom");
  var me = external_exports.record(external_exports.string(), external_exports.boolean()).describe("Consent requirement mapping (group name \u2192 state)");
  var ge = de.and(external_exports.object({ id: external_exports.string().optional().describe("User identifier"), device: external_exports.string().optional().describe("Device identifier"), session: external_exports.string().optional().describe("Session identifier"), hash: external_exports.string().optional().describe("Hashed identifier"), address: external_exports.string().optional().describe("User address"), email: external_exports.string().email().optional().describe("User email address"), phone: external_exports.string().optional().describe("User phone number"), userAgent: external_exports.string().optional().describe("Browser user agent string"), browser: external_exports.string().optional().describe("Browser name"), browserVersion: external_exports.string().optional().describe("Browser version"), deviceType: external_exports.string().optional().describe("Device type (mobile, desktop, tablet)"), os: external_exports.string().optional().describe("Operating system"), osVersion: external_exports.string().optional().describe("Operating system version"), screenSize: external_exports.string().optional().describe("Screen dimensions"), language: external_exports.string().optional().describe("User language"), country: external_exports.string().optional().describe("User country"), region: external_exports.string().optional().describe("User region/state"), city: external_exports.string().optional().describe("User city"), zip: external_exports.string().optional().describe("User postal code"), timezone: external_exports.string().optional().describe("User timezone"), ip: external_exports.string().optional().describe("User IP address"), internal: external_exports.boolean().optional().describe("Internal user flag (employee, test user)") })).describe("User identification and properties");
  var be = de.and(external_exports.object({ source: h.describe('Walker implementation version (e.g., "2.0.0")'), tagging: x })).describe("Walker version information");
  var fe = de.and(external_exports.object({ type: ue.describe("Source type identifier"), id: h.describe("Source identifier (typically URL on web)"), previous_id: h.describe("Previous source identifier (typically referrer on web)") })).describe("Event source information");
  var he = external_exports.lazy(() => external_exports.object({ entity: external_exports.string().describe("Entity name"), data: de.describe("Entity-specific properties"), nested: external_exports.array(he).describe("Nested child entities"), context: pe.describe("Entity context data") })).describe("Nested entity structure with recursive nesting support");
  var ye = external_exports.array(he).describe("Array of nested entities");
  var Se = external_exports.object({ name: external_exports.string().describe('Event name in "entity action" format (e.g., "page view", "product add")'), data: de.describe("Event-specific properties"), context: pe.describe("Ordered context properties with priorities"), globals: de.describe("Global properties shared across events"), custom: de.describe("Custom implementation-specific properties"), user: ge.describe("User identification and attributes"), nested: ye.describe("Related nested entities"), consent: me.describe("Consent states at event time"), id: v.describe("Unique event identifier (timestamp-based)"), trigger: h.describe("Event trigger identifier"), entity: h.describe("Parsed entity from event name"), action: h.describe("Parsed action from event name"), timestamp: j.describe("Unix timestamp in milliseconds since epoch"), timing: y.describe("Event processing timing information"), group: h.describe("Event grouping identifier"), count: w.describe("Event count in session"), version: be.describe("Walker version information"), source: fe.describe("Event source information") }).describe("Complete walkerOS event structure");
  var ve = Se.partial().describe("Partial event structure with all fields optional");
  var je = external_exports.lazy(() => Se.deepPartial()).describe("Deep partial event structure with all nested fields optional");
  var we = zodToJsonSchema(Se, { target: "jsonSchema7", $refStrategy: "relative", name: "Event" });
  var xe = zodToJsonSchema(ve, { target: "jsonSchema7", $refStrategy: "relative", name: "PartialEvent" });
  var Ee = zodToJsonSchema(ge, { target: "jsonSchema7", $refStrategy: "relative", name: "User" });
  var Ce = zodToJsonSchema(de, { target: "jsonSchema7", $refStrategy: "relative", name: "Properties" });
  var ke = zodToJsonSchema(pe, { target: "jsonSchema7", $refStrategy: "relative", name: "OrderedProperties" });
  var Pe = zodToJsonSchema(he, { target: "jsonSchema7", $refStrategy: "relative", name: "Entity" });
  var ze = zodToJsonSchema(ue, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceType" });
  var De = zodToJsonSchema(me, { target: "jsonSchema7", $refStrategy: "relative", name: "Consent" });
  var $e = {};
  t($e, { ConfigSchema: () => Be, LoopSchema: () => Te, MapSchema: () => Re, PolicySchema: () => qe, ResultSchema: () => We, RuleSchema: () => Ue, RulesSchema: () => Ne, SetSchema: () => Me, ValueConfigSchema: () => Ae, ValueSchema: () => Je, ValuesSchema: () => Le, configJsonSchema: () => Ye, loopJsonSchema: () => _e, mapJsonSchema: () => Fe, policyJsonSchema: () => Ge, ruleJsonSchema: () => Qe, rulesJsonSchema: () => Xe, setJsonSchema: () => Ke, valueConfigJsonSchema: () => He, valueJsonSchema: () => Ve });
  var Je = external_exports.lazy(() => external_exports.union([external_exports.string().describe('String value or property path (e.g., "data.id")'), external_exports.number().describe("Numeric value"), external_exports.boolean().describe("Boolean value"), Ae, external_exports.array(Je).describe("Array of values")]));
  var Le = external_exports.array(Je).describe("Array of transformation values");
  var Te = external_exports.tuple([Je, Je]).describe("Loop transformation: [source, transform] tuple for array processing");
  var Me = external_exports.array(Je).describe("Set: Array of values for selection or combination");
  var Re = external_exports.record(external_exports.string(), Je).describe("Map: Object mapping keys to transformation values");
  var Ae = external_exports.object({ key: external_exports.string().optional().describe('Property path to extract from event (e.g., "data.id", "user.email")'), value: external_exports.union([external_exports.string(), external_exports.number(), external_exports.boolean()]).optional().describe("Static primitive value"), fn: external_exports.string().optional().describe("Custom transformation function as string (serialized)"), map: Re.optional().describe("Object mapping: transform event data to structured output"), loop: Te.optional().describe("Loop transformation: [source, transform] for array processing"), set: Me.optional().describe("Set of values: combine or select from multiple values"), consent: me.optional().describe("Required consent states to include this value"), condition: external_exports.string().optional().describe("Condition function as string: return true to include value"), validate: external_exports.string().optional().describe("Validation function as string: return true if value is valid") }).refine((e14) => Object.keys(e14).length > 0, { message: "ValueConfig must have at least one property" }).describe("Value transformation configuration with multiple strategies");
  var qe = external_exports.record(external_exports.string(), Je).describe("Policy rules for event pre-processing (key \u2192 value mapping)");
  var Ue = external_exports.object({ batch: external_exports.number().optional().describe("Batch size: bundle N events for batch processing"), condition: external_exports.string().optional().describe("Condition function as string: return true to process event"), consent: me.optional().describe("Required consent states to process this event"), settings: external_exports.any().optional().describe("Destination-specific settings for this event mapping"), data: external_exports.union([Je, Le]).optional().describe("Data transformation rules for event"), ignore: external_exports.boolean().optional().describe("Set to true to skip processing this event"), name: external_exports.string().optional().describe('Custom event name override (e.g., "view_item" for "product view")'), policy: qe.optional().describe("Event-level policy overrides (applied after config-level policy)") }).describe("Mapping rule for specific entity-action combination");
  var Ne = external_exports.record(external_exports.string(), external_exports.record(external_exports.string(), external_exports.union([Ue, external_exports.array(Ue)])).optional()).describe("Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support");
  var Be = external_exports.object({ consent: me.optional().describe("Required consent states to process any events"), data: external_exports.union([Je, Le]).optional().describe("Global data transformation applied to all events"), mapping: Ne.optional().describe("Entity-action specific mapping rules"), policy: qe.optional().describe("Pre-processing policy rules applied before mapping") }).describe("Shared mapping configuration for sources and destinations");
  var We = external_exports.object({ eventMapping: Ue.optional().describe("Resolved mapping rule for event"), mappingKey: external_exports.string().optional().describe('Mapping key used (e.g., "product.view")') }).describe("Mapping resolution result");
  var Ve = zodToJsonSchema(Je, { target: "jsonSchema7", $refStrategy: "relative", name: "Value" });
  var He = zodToJsonSchema(Ae, { target: "jsonSchema7", $refStrategy: "relative", name: "ValueConfig" });
  var _e = zodToJsonSchema(Te, { target: "jsonSchema7", $refStrategy: "relative", name: "Loop" });
  var Ke = zodToJsonSchema(Me, { target: "jsonSchema7", $refStrategy: "relative", name: "Set" });
  var Fe = zodToJsonSchema(Re, { target: "jsonSchema7", $refStrategy: "relative", name: "Map" });
  var Ge = zodToJsonSchema(qe, { target: "jsonSchema7", $refStrategy: "relative", name: "Policy" });
  var Qe = zodToJsonSchema(Ue, { target: "jsonSchema7", $refStrategy: "relative", name: "Rule" });
  var Xe = zodToJsonSchema(Ne, { target: "jsonSchema7", $refStrategy: "relative", name: "Rules" });
  var Ye = zodToJsonSchema(Be, { target: "jsonSchema7", $refStrategy: "relative", name: "MappingConfig" });
  var Ze = {};
  t(Ze, { BatchSchema: () => dt, ConfigSchema: () => nt, ContextSchema: () => rt, DLQSchema: () => St, DataSchema: () => pt, DestinationPolicySchema: () => ot, DestinationsSchema: () => bt, InitDestinationsSchema: () => gt, InitSchema: () => mt, InstanceSchema: () => ut, PartialConfigSchema: () => it, PushBatchContextSchema: () => st, PushContextSchema: () => at, PushEventSchema: () => ct, PushEventsSchema: () => lt, PushResultSchema: () => ht, RefSchema: () => ft, ResultSchema: () => yt, batchJsonSchema: () => Et, configJsonSchema: () => vt, contextJsonSchema: () => wt, instanceJsonSchema: () => Ct, partialConfigJsonSchema: () => jt, pushContextJsonSchema: () => xt, resultJsonSchema: () => kt });
  var nt = external_exports.object({ consent: me.optional().describe("Required consent states to send events to this destination"), settings: external_exports.any().describe("Implementation-specific configuration").optional(), data: external_exports.union([Je, Le]).optional().describe("Global data transformation applied to all events for this destination"), env: external_exports.any().describe("Environment dependencies (platform-specific)").optional(), id: v.describe("Destination instance identifier (defaults to destination key)").optional(), init: external_exports.boolean().describe("Whether to initialize immediately").optional(), loadScript: external_exports.boolean().describe("Whether to load external script (for web destinations)").optional(), mapping: Ne.optional().describe("Entity-action specific mapping rules for this destination"), policy: qe.optional().describe("Pre-processing policy rules applied before event mapping"), queue: external_exports.boolean().describe("Whether to queue events when consent is not granted").optional(), verbose: external_exports.boolean().describe("Enable verbose logging for debugging").optional(), onError: O.optional(), onLog: J.optional() }).describe("Destination configuration");
  var it = nt.deepPartial().describe("Partial destination configuration with all fields deeply optional");
  var ot = qe.describe("Destination policy rules for event pre-processing");
  var rt = external_exports.object({ collector: external_exports.any().describe("Collector instance (runtime object)"), config: nt.describe("Destination configuration"), data: external_exports.union([external_exports.any(), external_exports.undefined(), external_exports.array(external_exports.union([external_exports.any(), external_exports.undefined()]))]).optional().describe("Transformed event data"), env: external_exports.any().describe("Environment dependencies") }).describe("Destination context for init and push functions");
  var at = rt.extend({ mapping: Ue.optional().describe("Resolved mapping rule for this specific event") }).describe("Push context with event-specific mapping");
  var st = at.describe("Batch push context with event-specific mapping");
  var ct = external_exports.object({ event: Se.describe("The event to process"), mapping: Ue.optional().describe("Mapping rule for this event") }).describe("Event with optional mapping for batch processing");
  var lt = external_exports.array(ct).describe("Array of events with mappings");
  var dt = external_exports.object({ key: external_exports.string().describe('Batch key (usually mapping key like "product.view")'), events: external_exports.array(Se).describe("Array of events in batch"), data: external_exports.array(external_exports.union([external_exports.any(), external_exports.undefined(), external_exports.array(external_exports.union([external_exports.any(), external_exports.undefined()]))])).describe("Transformed data for each event"), mapping: Ue.optional().describe("Shared mapping rule for batch") }).describe("Batch of events grouped by mapping key");
  var pt = external_exports.union([external_exports.any(), external_exports.undefined(), external_exports.array(external_exports.union([external_exports.any(), external_exports.undefined()]))]).describe("Transformed event data (Property, undefined, or array)");
  var ut = external_exports.object({ config: nt.describe("Destination configuration"), queue: external_exports.array(Se).optional().describe("Queued events awaiting consent"), dlq: external_exports.array(external_exports.tuple([Se, external_exports.any()])).optional().describe("Dead letter queue (failed events with errors)"), type: external_exports.string().optional().describe("Destination type identifier"), env: external_exports.any().optional().describe("Environment dependencies"), init: external_exports.any().optional().describe("Initialization function"), push: external_exports.any().describe("Push function for single events"), pushBatch: external_exports.any().optional().describe("Batch push function"), on: external_exports.any().optional().describe("Event lifecycle hook function") }).describe("Destination instance (runtime object with functions)");
  var mt = external_exports.object({ code: ut.describe("Destination instance with implementation"), config: it.optional().describe("Partial configuration overrides"), env: external_exports.any().optional().describe("Partial environment overrides") }).describe("Destination initialization configuration");
  var gt = external_exports.record(external_exports.string(), mt).describe("Map of destination IDs to initialization configurations");
  var bt = external_exports.record(external_exports.string(), ut).describe("Map of destination IDs to runtime instances");
  var ft = external_exports.object({ id: external_exports.string().describe("Destination ID"), destination: ut.describe("Destination instance") }).describe("Destination reference (ID + instance)");
  var ht = external_exports.object({ queue: external_exports.array(Se).optional().describe("Events queued (awaiting consent)"), error: external_exports.any().optional().describe("Error if push failed") }).describe("Push operation result");
  var yt = external_exports.object({ successful: external_exports.array(ft).describe("Destinations that processed successfully"), queued: external_exports.array(ft).describe("Destinations that queued events"), failed: external_exports.array(ft).describe("Destinations that failed to process") }).describe("Overall destination processing result");
  var St = external_exports.array(external_exports.tuple([Se, external_exports.any()])).describe("Dead letter queue: [(event, error), ...]");
  var vt = zodToJsonSchema(nt, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationConfig" });
  var jt = zodToJsonSchema(it, { target: "jsonSchema7", $refStrategy: "relative", name: "PartialDestinationConfig" });
  var wt = zodToJsonSchema(rt, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationContext" });
  var xt = zodToJsonSchema(at, { target: "jsonSchema7", $refStrategy: "relative", name: "PushContext" });
  var Et = zodToJsonSchema(dt, { target: "jsonSchema7", $refStrategy: "relative", name: "Batch" });
  var Ct = zodToJsonSchema(ut, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationInstance" });
  var kt = zodToJsonSchema(yt, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationResult" });
  var Pt = {};
  t(Pt, { CommandTypeSchema: () => $t, ConfigSchema: () => It, DestinationsSchema: () => Mt, InitConfigSchema: () => Jt, InstanceSchema: () => Rt, PushContextSchema: () => Lt, SessionDataSchema: () => Ot, SourcesSchema: () => Tt, commandTypeJsonSchema: () => At, configJsonSchema: () => qt, initConfigJsonSchema: () => Nt, instanceJsonSchema: () => Wt, pushContextJsonSchema: () => Bt, sessionDataJsonSchema: () => Ut });
  var $t = external_exports.union([external_exports.enum(["action", "config", "consent", "context", "destination", "elb", "globals", "hook", "init", "link", "run", "user", "walker"]), external_exports.string()]).describe("Collector command type: standard commands or custom string for extensions");
  var It = external_exports.object({ run: external_exports.boolean().describe("Whether to run collector automatically on initialization").optional(), tagging: x, globalsStatic: de.describe("Static global properties that persist across collector runs"), sessionStatic: external_exports.record(external_exports.any()).describe("Static session data that persists across collector runs"), verbose: external_exports.boolean().describe("Enable verbose logging for debugging"), onError: O.optional(), onLog: J.optional() }).describe("Core collector configuration");
  var Ot = de.and(external_exports.object({ isStart: external_exports.boolean().describe("Whether this is a new session start"), storage: external_exports.boolean().describe("Whether storage is available"), id: v.describe("Session identifier").optional(), start: j.describe("Session start timestamp").optional(), marketing: external_exports.literal(true).optional().describe("Marketing attribution flag"), updated: j.describe("Last update timestamp").optional(), isNew: external_exports.boolean().describe("Whether this is a new session").optional(), device: v.describe("Device identifier").optional(), count: w.describe("Event count in session").optional(), runs: w.describe("Number of runs").optional() })).describe("Session state and tracking data");
  var Jt = It.partial().extend({ consent: me.optional().describe("Initial consent state"), user: ge.optional().describe("Initial user data"), globals: de.optional().describe("Initial global properties"), sources: external_exports.any().optional().describe("Source configurations"), destinations: external_exports.any().optional().describe("Destination configurations"), custom: de.optional().describe("Initial custom implementation-specific properties") }).describe("Collector initialization configuration with initial state");
  var Lt = external_exports.object({ mapping: Be.optional().describe("Source-level mapping configuration") }).describe("Push context with optional source mapping");
  var Tt = external_exports.record(external_exports.string(), external_exports.any()).describe("Map of source IDs to source instances");
  var Mt = external_exports.record(external_exports.string(), external_exports.any()).describe("Map of destination IDs to destination instances");
  var Rt = external_exports.object({ push: external_exports.any().describe("Push function for processing events"), command: external_exports.any().describe("Command function for walker commands"), allowed: external_exports.boolean().describe("Whether event processing is allowed"), config: It.describe("Current collector configuration"), consent: me.describe("Current consent state"), count: external_exports.number().describe("Event count (increments with each event)"), custom: de.describe("Custom implementation-specific properties"), sources: Tt.describe("Registered source instances"), destinations: Mt.describe("Registered destination instances"), globals: de.describe("Current global properties"), group: external_exports.string().describe("Event grouping identifier"), hooks: external_exports.any().describe("Lifecycle hook functions"), on: external_exports.any().describe("Event lifecycle configuration"), queue: external_exports.array(Se).describe("Queued events awaiting processing"), round: external_exports.number().describe("Collector run count (increments with each run)"), session: external_exports.union([external_exports.undefined(), Ot]).describe("Current session state"), timing: external_exports.number().describe("Event processing timing information"), user: ge.describe("Current user data"), version: external_exports.string().describe("Walker implementation version") }).describe("Collector instance with state and methods");
  var At = zodToJsonSchema($t, { target: "jsonSchema7", $refStrategy: "relative", name: "CommandType" });
  var qt = zodToJsonSchema(It, { target: "jsonSchema7", $refStrategy: "relative", name: "CollectorConfig" });
  var Ut = zodToJsonSchema(Ot, { target: "jsonSchema7", $refStrategy: "relative", name: "SessionData" });
  var Nt = zodToJsonSchema(Jt, { target: "jsonSchema7", $refStrategy: "relative", name: "InitConfig" });
  var Bt = zodToJsonSchema(Lt, { target: "jsonSchema7", $refStrategy: "relative", name: "CollectorPushContext" });
  var Wt = zodToJsonSchema(Rt, { target: "jsonSchema7", $refStrategy: "relative", name: "CollectorInstance" });
  var Vt = {};
  t(Vt, { BaseEnvSchema: () => Kt, ConfigSchema: () => Ft, InitSchema: () => Xt, InitSourceSchema: () => Yt, InitSourcesSchema: () => Zt, InstanceSchema: () => Qt, PartialConfigSchema: () => Gt, baseEnvJsonSchema: () => en, configJsonSchema: () => tn, initSourceJsonSchema: () => rn, initSourcesJsonSchema: () => an, instanceJsonSchema: () => on, partialConfigJsonSchema: () => nn });
  var Kt = external_exports.object({ push: external_exports.any().describe("Collector push function"), command: external_exports.any().describe("Collector command function"), sources: external_exports.any().optional().describe("Map of registered source instances"), elb: external_exports.any().describe("Public API function (alias for collector.push)") }).catchall(external_exports.unknown()).describe("Base environment for dependency injection - platform-specific sources extend this");
  var Ft = Be.extend({ settings: external_exports.any().describe("Implementation-specific configuration").optional(), env: Kt.optional().describe("Environment dependencies (platform-specific)"), id: v.describe("Source identifier (defaults to source key)").optional(), onError: O.optional(), disabled: external_exports.boolean().describe("Set to true to disable").optional(), primary: external_exports.boolean().describe("Mark as primary (only one can be primary)").optional() }).describe("Source configuration with mapping and environment");
  var Gt = Ft.deepPartial().describe("Partial source configuration with all fields deeply optional");
  var Qt = external_exports.object({ type: external_exports.string().describe('Source type identifier (e.g., "browser", "dataLayer")'), config: Ft.describe("Current source configuration"), push: external_exports.any().describe("Push function - THE HANDLER (flexible signature for platform compatibility)"), destroy: external_exports.any().optional().describe("Cleanup function called when source is removed"), on: external_exports.any().optional().describe("Lifecycle hook function for event types") }).describe("Source instance with push handler and lifecycle methods");
  var Xt = external_exports.any().describe("Source initialization function: (config, env) => Instance | Promise<Instance>");
  var Yt = external_exports.object({ code: Xt.describe("Source initialization function"), config: Gt.optional().describe("Partial configuration overrides"), env: Kt.partial().optional().describe("Partial environment overrides"), primary: external_exports.boolean().optional().describe("Mark as primary source (only one can be primary)") }).describe("Source initialization configuration");
  var Zt = external_exports.record(external_exports.string(), Yt).describe("Map of source IDs to initialization configurations");
  var en = zodToJsonSchema(Kt, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceBaseEnv" });
  var tn = zodToJsonSchema(Ft, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceConfig" });
  var nn = zodToJsonSchema(Gt, { target: "jsonSchema7", $refStrategy: "relative", name: "PartialSourceConfig" });
  var on = zodToJsonSchema(Qt, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceInstance" });
  var rn = zodToJsonSchema(Yt, { target: "jsonSchema7", $refStrategy: "relative", name: "InitSource" });
  var an = zodToJsonSchema(Zt, { target: "jsonSchema7", $refStrategy: "relative", name: "InitSources" });
  var hn = { merge: true, shallow: true, extend: true };
  function yn(e14, t12 = {}, n5 = {}) {
    n5 = { ...hn, ...n5 };
    const i4 = Object.entries(t12).reduce((t13, [i5, o4]) => {
      const r3 = e14[i5];
      return n5.merge && Array.isArray(r3) && Array.isArray(o4) ? t13[i5] = o4.reduce((e15, t14) => e15.includes(t14) ? e15 : [...e15, t14], [...r3]) : (n5.extend || i5 in e14) && (t13[i5] = o4), t13;
    }, {});
    return n5.shallow ? { ...e14, ...i4 } : (Object.assign(e14, i4), e14);
  }
  function vn(e14) {
    return Array.isArray(e14);
  }
  function jn(e14) {
    return "boolean" == typeof e14;
  }
  function xn(e14) {
    return void 0 !== e14;
  }
  function Cn(e14) {
    return "function" == typeof e14;
  }
  function kn(e14) {
    return "number" == typeof e14 && !Number.isNaN(e14);
  }
  function Pn(e14) {
    return "object" == typeof e14 && null !== e14 && !vn(e14) && "[object Object]" === Object.prototype.toString.call(e14);
  }
  function Dn(e14) {
    return "string" == typeof e14;
  }
  function $n(e14, t12 = /* @__PURE__ */ new WeakMap()) {
    if ("object" != typeof e14 || null === e14)
      return e14;
    if (t12.has(e14))
      return t12.get(e14);
    const n5 = Object.prototype.toString.call(e14);
    if ("[object Object]" === n5) {
      const n6 = {};
      t12.set(e14, n6);
      for (const i4 in e14)
        Object.prototype.hasOwnProperty.call(e14, i4) && (n6[i4] = $n(e14[i4], t12));
      return n6;
    }
    if ("[object Array]" === n5) {
      const n6 = [];
      return t12.set(e14, n6), e14.forEach((e15) => {
        n6.push($n(e15, t12));
      }), n6;
    }
    if ("[object Date]" === n5)
      return new Date(e14.getTime());
    if ("[object RegExp]" === n5) {
      const t13 = e14;
      return new RegExp(t13.source, t13.flags);
    }
    return e14;
  }
  function In(e14, t12 = "", n5) {
    const i4 = t12.split(".");
    let o4 = e14;
    for (let e15 = 0; e15 < i4.length; e15++) {
      const t13 = i4[e15];
      if ("*" === t13 && vn(o4)) {
        const t14 = i4.slice(e15 + 1).join("."), r3 = [];
        for (const e16 of o4) {
          const i5 = In(e16, t14, n5);
          r3.push(i5);
        }
        return r3;
      }
      if (o4 = o4 instanceof Object ? o4[t13] : void 0, !o4)
        break;
    }
    return xn(o4) ? o4 : n5;
  }
  function On(e14, t12, n5) {
    if (!Pn(e14))
      return e14;
    const i4 = $n(e14), o4 = t12.split(".");
    let r3 = i4;
    for (let e15 = 0; e15 < o4.length; e15++) {
      const t13 = o4[e15];
      e15 === o4.length - 1 ? r3[t13] = n5 : (t13 in r3 && "object" == typeof r3[t13] && null !== r3[t13] || (r3[t13] = {}), r3 = r3[t13]);
    }
    return i4;
  }
  function Ln(e14, t12 = {}, n5 = {}) {
    const i4 = { ...t12, ...n5 }, o4 = {};
    let r3 = void 0 === e14;
    return Object.keys(i4).forEach((t13) => {
      i4[t13] && (o4[t13] = true, e14 && e14[t13] && (r3 = true));
    }), !!r3 && o4;
  }
  function An(e14 = 6) {
    let t12 = "";
    for (let n5 = 36; t12.length < e14; )
      t12 += (Math.random() * n5 | 0).toString(n5);
    return t12;
  }
  function Un(e14, t12 = 1e3, n5 = false) {
    let i4, o4 = null, r3 = false;
    return (...a5) => new Promise((s5) => {
      const c3 = n5 && !r3;
      o4 && clearTimeout(o4), o4 = setTimeout(() => {
        o4 = null, n5 && !r3 || (i4 = e14(...a5), s5(i4));
      }, t12), c3 && (r3 = true, i4 = e14(...a5), s5(i4));
    });
  }
  function Bn(e14) {
    return jn(e14) || Dn(e14) || kn(e14) || !xn(e14) || vn(e14) && e14.every(Bn) || Pn(e14) && Object.values(e14).every(Bn);
  }
  function Vn(e14) {
    return Bn(e14) ? e14 : void 0;
  }
  function Hn(e14, t12, n5) {
    return function(...i4) {
      try {
        return e14(...i4);
      } catch (e15) {
        if (!t12)
          return;
        return t12(e15);
      } finally {
        n5?.();
      }
    };
  }
  function _n(e14, t12, n5) {
    return async function(...i4) {
      try {
        return await e14(...i4);
      } catch (e15) {
        if (!t12)
          return;
        return await t12(e15);
      } finally {
        await n5?.();
      }
    };
  }
  async function Kn(e14, t12) {
    const [n5, i4] = (e14.name || "").split(" ");
    if (!t12 || !n5 || !i4)
      return {};
    let o4, r3 = "", a5 = n5, s5 = i4;
    const c3 = (t13) => {
      if (t13)
        return (t13 = vn(t13) ? t13 : [t13]).find((t14) => !t14.condition || t14.condition(e14));
    };
    t12[a5] || (a5 = "*");
    const l3 = t12[a5];
    return l3 && (l3[s5] || (s5 = "*"), o4 = c3(l3[s5])), o4 || (a5 = "*", s5 = "*", o4 = c3(t12[a5]?.[s5])), o4 && (r3 = `${a5} ${s5}`), { eventMapping: o4, mappingKey: r3 };
  }
  async function Fn(e14, t12 = {}, n5 = {}) {
    if (!xn(e14))
      return;
    const i4 = Pn(e14) && e14.consent || n5.consent || n5.collector?.consent, o4 = vn(t12) ? t12 : [t12];
    for (const t13 of o4) {
      const o5 = await _n(Gn)(e14, t13, { ...n5, consent: i4 });
      if (xn(o5))
        return o5;
    }
  }
  async function Gn(e14, t12, n5 = {}) {
    const { collector: i4, consent: o4 } = n5;
    return (vn(t12) ? t12 : [t12]).reduce(async (t13, r3) => {
      const a5 = await t13;
      if (a5)
        return a5;
      const s5 = Dn(r3) ? { key: r3 } : r3;
      if (!Object.keys(s5).length)
        return;
      const { condition: c3, consent: l3, fn: d2, key: p2, loop: u3, map: m2, set: g3, validate: b2, value: f2 } = s5;
      if (c3 && !await _n(c3)(e14, r3, i4))
        return;
      if (l3 && !Ln(l3, o4))
        return f2;
      let h4 = xn(f2) ? f2 : e14;
      if (d2 && (h4 = await _n(d2)(e14, r3, n5)), p2 && (h4 = In(e14, p2, f2)), u3) {
        const [t14, i5] = u3, o5 = "this" === t14 ? [e14] : await Fn(e14, t14, n5);
        vn(o5) && (h4 = (await Promise.all(o5.map((e15) => Fn(e15, i5, n5)))).filter(xn));
      } else
        m2 ? h4 = await Object.entries(m2).reduce(async (t14, [i5, o5]) => {
          const r4 = await t14, a6 = await Fn(e14, o5, n5);
          return xn(a6) && (r4[i5] = a6), r4;
        }, Promise.resolve({})) : g3 && (h4 = await Promise.all(g3.map((t14) => Gn(e14, t14, n5))));
      b2 && !await _n(b2)(h4) && (h4 = void 0);
      const y4 = Vn(h4);
      return xn(y4) ? y4 : Vn(f2);
    }, Promise.resolve(void 0));
  }
  async function Qn(e14, t12, n5) {
    t12.policy && await Promise.all(Object.entries(t12.policy).map(async ([t13, i5]) => {
      const o5 = await Fn(e14, i5, { collector: n5 });
      e14 = On(e14, t13, o5);
    }));
    const { eventMapping: i4, mappingKey: o4 } = await Kn(e14, t12.mapping);
    i4?.policy && await Promise.all(Object.entries(i4.policy).map(async ([t13, i5]) => {
      const o5 = await Fn(e14, i5, { collector: n5 });
      e14 = On(e14, t13, o5);
    }));
    let r3 = t12.data && await Fn(e14, t12.data, { collector: n5 });
    if (i4) {
      if (i4.ignore)
        return { event: e14, data: r3, mapping: i4, mappingKey: o4, ignore: true };
      if (i4.name && (e14.name = i4.name), i4.data) {
        const t13 = i4.data && await Fn(e14, i4.data, { collector: n5 });
        r3 = Pn(r3) && Pn(t13) ? yn(r3, t13) : t13;
      }
    }
    return { event: e14, data: r3, mapping: i4, mappingKey: o4, ignore: false };
  }
  function Zn(e14, t12 = false) {
    t12 && console.dir(e14, { depth: 4 });
  }
  function ai(e14, t12, n5) {
    return function(...i4) {
      let o4;
      const r3 = "post" + t12, a5 = n5["pre" + t12], s5 = n5[r3];
      return o4 = a5 ? a5({ fn: e14 }, ...i4) : e14(...i4), s5 && (o4 = s5({ fn: e14, result: o4 }, ...i4)), o4;
    };
  }

  // node_modules/@walkeros/collector/dist/index.mjs
  var e2 = Object.defineProperty;
  var n = { Action: "action", Actions: "actions", Config: "config", Consent: "consent", Context: "context", Custom: "custom", Destination: "destination", Elb: "elb", Globals: "globals", Hook: "hook", Init: "init", Link: "link", On: "on", Prefix: "data-elb", Ready: "ready", Run: "run", Session: "session", User: "user", Walker: "walker" };
  var o = { Commands: n, Utils: { Storage: { Cookie: "cookie", Local: "local", Session: "session" } } };
  var t2 = {};
  ((n5, o4) => {
    for (var t12 in o4)
      e2(n5, t12, { get: o4[t12], enumerable: true });
  })(t2, { schemas: () => a, settingsSchema: () => s });
  var s = { type: "object", properties: { run: { type: "boolean", description: "Automatically start the collector pipeline on initialization" }, sources: { type: "object", description: "Configurations for sources providing events to the collector" }, destinations: { type: "object", description: "Configurations for destinations receiving processed events" }, consent: { type: "object", description: "Initial consent state to control routing of events" }, verbose: { type: "boolean", description: "Enable verbose logging for debugging" }, onError: { type: "string", description: "Error handler triggered when the collector encounters failures" }, onLog: { type: "string", description: "Custom log handler for collector messages" } } };
  var a = { settings: s };
  async function h2(e14, n5, o4) {
    const { code: t12, config: s5 = {}, env: a5 = {} } = n5, i4 = o4 || s5 || { init: false }, c3 = { ...t12, config: i4, env: q2(t12.env, a5) };
    let r3 = c3.config.id;
    if (!r3)
      do {
        r3 = An(4);
      } while (e14.destinations[r3]);
    return e14.destinations[r3] = c3, false !== c3.config.queue && (c3.queue = [...e14.queue]), y2(e14, void 0, { [r3]: c3 });
  }
  async function y2(e14, n5, o4) {
    const { allowed: t12, consent: s5, globals: a5, user: i4 } = e14;
    if (!t12)
      return w2({ ok: false });
    n5 && e14.queue.push(n5), o4 || (o4 = e14.destinations);
    const u3 = await Promise.all(Object.entries(o4 || {}).map(async ([o5, t13]) => {
      let u4 = (t13.queue || []).map((e15) => ({ ...e15, consent: s5 }));
      if (t13.queue = [], n5) {
        const e15 = $n(n5);
        u4.push(e15);
      }
      if (!u4.length)
        return { id: o5, destination: t13, skipped: true };
      const l4 = [], m3 = u4.filter((e15) => {
        const n6 = Ln(t13.config.consent, s5, e15.consent);
        return !n6 || (e15.consent = n6, l4.push(e15), false);
      });
      if (t13.queue.concat(m3), !l4.length)
        return { id: o5, destination: t13, queue: u4 };
      if (!await _n(v2)(e14, t13))
        return { id: o5, destination: t13, queue: u4 };
      let f3 = false;
      return t13.dlq || (t13.dlq = []), await Promise.all(l4.map(async (n6) => (n6.globals = yn(a5, n6.globals), n6.user = yn(i4, n6.user), await _n(k, (o6) => (e14.config.onError && e14.config.onError(o6, e14), f3 = true, t13.dlq.push([n6, o6]), false))(e14, t13, n6), n6))), { id: o5, destination: t13, error: f3 };
    })), l3 = [], m2 = [], f2 = [];
    for (const e15 of u3) {
      if (e15.skipped)
        continue;
      const n6 = e15.destination, o5 = { id: e15.id, destination: n6 };
      e15.error ? f2.push(o5) : e15.queue && e15.queue.length ? (n6.queue = (n6.queue || []).concat(e15.queue), m2.push(o5)) : l3.push(o5);
    }
    return w2({ ok: !f2.length, event: n5, successful: l3, queued: m2, failed: f2 });
  }
  async function v2(e14, n5) {
    if (n5.init && !n5.config.init) {
      const o4 = { collector: e14, config: n5.config, env: q2(n5.env, n5.config.env) }, t12 = await ai(n5.init, "DestinationInit", e14.hooks)(o4);
      if (false === t12)
        return t12;
      n5.config = { ...t12 || n5.config, init: true };
    }
    return true;
  }
  async function k(e14, n5, o4) {
    const { config: t12 } = n5, s5 = await Qn(o4, t12, e14);
    if (s5.ignore)
      return false;
    const a5 = { collector: e14, config: t12, data: s5.data, mapping: s5.mapping, env: q2(n5.env, t12.env) }, i4 = s5.mapping;
    if (i4?.batch && n5.pushBatch) {
      const o5 = i4.batched || { key: s5.mappingKey || "", events: [], data: [] };
      o5.events.push(s5.event), xn(s5.data) && o5.data.push(s5.data), i4.batchFn = i4.batchFn || Un((e15, n6) => {
        const a6 = { collector: n6, config: t12, data: s5.data, mapping: i4, env: q2(e15.env, t12.env) };
        ai(e15.pushBatch, "DestinationPushBatch", n6.hooks)(o5, a6), o5.events = [], o5.data = [];
      }, i4.batch), i4.batched = o5, i4.batchFn?.(n5, e14);
    } else
      await ai(n5.push, "DestinationPush", e14.hooks)(s5.event, a5);
    return true;
  }
  function w2(e14) {
    return yn({ ok: !e14?.failed?.length, successful: [], queued: [], failed: [] }, e14);
  }
  async function C2(e14, n5 = {}) {
    const o4 = {};
    for (const [e15, t12] of Object.entries(n5)) {
      const { code: n6, config: s5 = {}, env: a5 = {} } = t12, i4 = { ...n6.config, ...s5 }, c3 = q2(n6.env, a5);
      o4[e15] = { ...n6, config: i4, env: c3 };
    }
    return o4;
  }
  function q2(e14, n5) {
    return e14 || n5 ? n5 ? e14 && Pn(e14) && Pn(n5) ? { ...e14, ...n5 } : n5 : e14 : {};
  }
  function O2(e14, n5, o4) {
    const t12 = e14.on, s5 = t12[n5] || [], a5 = vn(o4) ? o4 : [o4];
    a5.forEach((e15) => {
      s5.push(e15);
    }), t12[n5] = s5, A2(e14, n5, a5);
  }
  function A2(e14, n5, t12, s5) {
    let a5, i4 = t12 || [];
    switch (t12 || (i4 = e14.on[n5] || []), n5) {
      case o.Commands.Consent:
        a5 = s5 || e14.consent;
        break;
      case o.Commands.Session:
        a5 = e14.session;
        break;
      case o.Commands.Ready:
      case o.Commands.Run:
      default:
        a5 = void 0;
    }
    if (Object.values(e14.sources).forEach((e15) => {
      e15.on && Hn(e15.on)(n5, a5);
    }), Object.values(e14.destinations).forEach((e15) => {
      if (e15.on) {
        const o4 = e15.on;
        Hn(o4)(n5, a5);
      }
    }), i4.length)
      switch (n5) {
        case o.Commands.Consent:
          !function(e15, n6, o4) {
            const t13 = o4 || e15.consent;
            n6.forEach((n7) => {
              Object.keys(t13).filter((e16) => e16 in n7).forEach((o5) => {
                Hn(n7[o5])(e15, t13);
              });
            });
          }(e14, i4, s5);
          break;
        case o.Commands.Ready:
        case o.Commands.Run:
          !function(e15, n6) {
            e15.allowed && n6.forEach((n7) => {
              Hn(n7)(e15);
            });
          }(e14, i4);
          break;
        case o.Commands.Session:
          !function(e15, n6) {
            if (!e15.session)
              return;
            n6.forEach((n7) => {
              Hn(n7)(e15, e15.session);
            });
          }(e14, i4);
      }
  }
  async function S2(e14, n5) {
    const { consent: o4 } = e14;
    let t12 = false;
    const s5 = {};
    return Object.entries(n5).forEach(([e15, n6]) => {
      const o5 = !!n6;
      s5[e15] = o5, t12 = t12 || o5;
    }), e14.consent = yn(o4, s5), A2(e14, "consent", void 0, s5), t12 ? y2(e14) : w2({ ok: true });
  }
  async function B2(e14, n5, t12, s5) {
    let a5;
    switch (n5) {
      case o.Commands.Config:
        Pn(t12) && yn(e14.config, t12, { shallow: false });
        break;
      case o.Commands.Consent:
        Pn(t12) && (a5 = await S2(e14, t12));
        break;
      case o.Commands.Custom:
        Pn(t12) && (e14.custom = yn(e14.custom, t12));
        break;
      case o.Commands.Destination:
        Pn(t12) && Cn(t12.push) && (a5 = await h2(e14, { code: t12 }, s5));
        break;
      case o.Commands.Globals:
        Pn(t12) && (e14.globals = yn(e14.globals, t12));
        break;
      case o.Commands.On:
        Dn(t12) && O2(e14, t12, s5);
        break;
      case o.Commands.Ready:
        A2(e14, "ready");
        break;
      case o.Commands.Run:
        a5 = await G(e14, t12);
        break;
      case o.Commands.Session:
        A2(e14, "session");
        break;
      case o.Commands.User:
        Pn(t12) && yn(e14.user, t12, { shallow: false });
    }
    return a5 || { ok: true, successful: [], queued: [], failed: [] };
  }
  function F2(e14, n5) {
    if (!n5.name)
      throw new Error("Event name is required");
    const [o4, t12] = n5.name.split(" ");
    if (!o4 || !t12)
      throw new Error("Event name is invalid");
    ++e14.count;
    const { timestamp: s5 = Date.now(), group: a5 = e14.group, count: i4 = e14.count } = n5, { name: c3 = `${o4} ${t12}`, data: r3 = {}, context: u3 = {}, globals: l3 = e14.globals, custom: d2 = {}, user: m2 = e14.user, nested: f2 = [], consent: g3 = e14.consent, id: p2 = `${s5}-${a5}-${i4}`, trigger: b2 = "", entity: h4 = o4, action: y4 = t12, timing: v4 = 0, version: k3 = { source: e14.version, tagging: e14.config.tagging || 0 }, source: w4 = { type: "collector", id: "", previous_id: "" } } = n5;
    return { name: c3, data: r3, context: u3, globals: l3, custom: d2, user: m2, nested: f2, consent: g3, id: p2, trigger: b2, entity: h4, action: y4, timestamp: s5, timing: v4, group: a5, count: i4, version: k3, source: w4 };
  }
  async function G(e14, n5) {
    e14.allowed = true, e14.count = 0, e14.group = An(), e14.timing = Date.now(), n5 && (n5.consent && (e14.consent = yn(e14.consent, n5.consent)), n5.user && (e14.user = yn(e14.user, n5.user)), n5.globals && (e14.globals = yn(e14.config.globalsStatic || {}, n5.globals)), n5.custom && (e14.custom = yn(e14.custom, n5.custom))), Object.values(e14.destinations).forEach((e15) => {
      e15.queue = [];
    }), e14.queue = [], e14.round++;
    const o4 = await y2(e14);
    return A2(e14, "run"), o4;
  }
  function _2(e14, n5) {
    return ai(async (o4, t12 = {}) => await _n(async () => {
      let s5 = o4;
      if (t12.mapping) {
        const n6 = await Qn(s5, t12.mapping, e14);
        if (n6.ignore)
          return w2({ ok: true });
        if (t12.mapping.consent) {
          if (!Ln(t12.mapping.consent, e14.consent, n6.event.consent))
            return w2({ ok: true });
        }
        s5 = n6.event;
      }
      const a5 = n5(s5), i4 = F2(e14, a5);
      return await y2(e14, i4);
    }, () => w2({ ok: false }))(), "Push", e14.hooks);
  }
  async function J2(e14) {
    const n5 = yn({ globalsStatic: {}, sessionStatic: {}, tagging: 0, verbose: false, onLog: o4, run: true }, e14, { merge: false, extend: false });
    function o4(e15, o5) {
      Zn({ message: e15 }, o5 || n5.verbose);
    }
    n5.onLog = o4;
    const t12 = { ...n5.globalsStatic, ...e14.globals }, s5 = { allowed: false, config: n5, consent: e14.consent || {}, count: 0, custom: e14.custom || {}, destinations: {}, globals: t12, group: "", hooks: {}, on: {}, queue: [], round: 0, session: void 0, timing: Date.now(), user: e14.user || {}, version: "0.3.0", sources: {}, push: void 0, command: void 0 };
    return s5.push = _2(s5, (e15) => ({ timing: Math.round((Date.now() - s5.timing) / 10) / 100, source: { type: "collector", id: "", previous_id: "" }, ...e15 })), s5.command = function(e15, n6) {
      return ai(async (o5, t13, s6) => await _n(async () => await n6(e15, o5, t13, s6), () => w2({ ok: false }))(), "Command", e15.hooks);
    }(s5, B2), s5.destinations = await C2(0, e14.destinations || {}), s5;
  }
  async function Q(e14, n5 = {}) {
    const o4 = {};
    for (const [t12, s5] of Object.entries(n5)) {
      const { code: n6, config: a5 = {}, env: i4 = {}, primary: c3 } = s5, r3 = { push: (n7, o5 = {}) => e14.push(n7, { ...o5, mapping: a5 }), command: e14.command, sources: e14.sources, elb: e14.sources.elb.push, ...i4 }, u3 = await _n(n6)(a5, r3);
      u3 && (c3 && (u3.config = { ...u3.config, primary: c3 }), o4[t12] = u3);
    }
    return o4;
  }
  async function T2(e14) {
    e14 = e14 || {};
    const n5 = await J2(e14), o4 = (t12 = n5, { type: "elb", config: {}, push: async (e15, n6, o5, s6, a6, i5) => {
      if ("string" == typeof e15 && e15.startsWith("walker ")) {
        const s7 = e15.replace("walker ", "");
        return t12.command(s7, n6, o5);
      }
      let c4;
      if ("string" == typeof e15)
        c4 = { name: e15 }, n6 && "object" == typeof n6 && !Array.isArray(n6) && (c4.data = n6);
      else {
        if (!e15 || "object" != typeof e15)
          return { ok: false, successful: [], queued: [], failed: [] };
        c4 = e15, n6 && "object" == typeof n6 && !Array.isArray(n6) && (c4.data = { ...c4.data || {}, ...n6 });
      }
      return s6 && "object" == typeof s6 && (c4.context = s6), a6 && Array.isArray(a6) && (c4.nested = a6), i5 && "object" == typeof i5 && (c4.custom = i5), t12.push(c4);
    } });
    var t12;
    n5.sources.elb = o4;
    const s5 = await Q(n5, e14.sources || {});
    Object.assign(n5.sources, s5);
    const { consent: a5, user: i4, globals: c3, custom: r3 } = e14;
    a5 && await n5.command("consent", a5), i4 && await n5.command("user", i4), c3 && Object.assign(n5.globals, c3), r3 && Object.assign(n5.custom, r3), n5.config.run && await n5.command("run");
    let u3 = o4.push;
    const l3 = Object.values(n5.sources).filter((e15) => "elb" !== e15.type), d2 = l3.find((e15) => e15.config.primary);
    return d2 ? u3 = d2.push : l3.length > 0 && (u3 = l3[0].push), { collector: n5, elb: u3 };
  }

  // node_modules/@walkeros/source-demo/dist/index.mjs
  var e3 = Object.defineProperty;
  var s2 = (s5, t12) => {
    for (var a5 in t12)
      e3(s5, a5, { get: t12[a5], enumerable: true });
  };
  var a2 = {};
  s2(a2, { env: () => n2 });
  var n2 = {};
  s2(n2, { init: () => i, push: () => r, simulation: () => u });
  var o2 = async () => ({ ok: true, successful: [], queued: [], failed: [] });
  var i = void 0;
  var r = { push: o2, command: o2, elb: o2 };
  var u = ["call:elb"];
  var c = async (e14, s5) => {
    const { elb: t12 } = s5, a5 = { ...e14, settings: e14?.settings || { events: [] } };
    return (a5.settings?.events || []).forEach((e15) => {
      const { delay: s6, ...a6 } = e15;
      setTimeout(() => t12(a6), s6 || 0);
    }), { type: "demo", config: a5, push: t12 };
  };

  // node_modules/@walkeros/destination-demo/dist/index.mjs
  var e4 = Object.defineProperty;
  var n3 = (n5, o4) => {
    for (var i4 in o4)
      e4(n5, i4, { get: o4[i4], enumerable: true });
  };
  var i2 = {};
  n3(i2, { env: () => t3 });
  var t3 = {};
  n3(t3, { init: () => s3, push: () => a3, simulation: () => l });
  var s3 = { log: void 0 };
  var a3 = { log: Object.assign(() => {
  }, {}) };
  var l = ["call:log"];
  var g = { type: "demo", config: { settings: { name: "demo" } }, init({ config: e14, env: n5 }) {
    (n5?.log || console.log)(`[${{ name: "demo", ...e14?.settings }.name}] initialized`);
  }, push(e14, { config: n5, env: o4 }) {
    const i4 = o4?.log || console.log, t12 = { name: "demo", ...n5?.settings }, s5 = t12.values ? function(e15, n6) {
      const o5 = {};
      for (const i5 of n6) {
        const n7 = i5.split(".").reduce((e16, n8) => e16?.[n8], e15);
        void 0 !== n7 && (o5[i5] = n7);
      }
      return o5;
    }(e14, t12.values) : e14;
    i4(`[${t12.name}] ${JSON.stringify(s5, null, 2)}`);
  } };

  // node_modules/@walkeros/web-destination-api/dist/index.mjs
  var e5;
  var t4;
  var n4;
  var a4 = Object.defineProperty;
  var r2 = (e14, t12) => {
    for (var n5 in t12)
      a4(e14, n5, { get: t12[n5], enumerable: true });
  };
  var i3 = {};
  r2(i3, { BRAND: () => De2, DIRTY: () => k2, EMPTY_PATH: () => g2, INVALID: () => S3, NEVER: () => Nt2, OK: () => x2, ParseStatus: () => _3, Schema: () => E2, ZodAny: () => ue2, ZodArray: () => he2, ZodBigInt: () => re2, ZodBoolean: () => ie2, ZodBranded: () => Le2, ZodCatch: () => Me2, ZodDate: () => se, ZodDefault: () => Re2, ZodDiscriminatedUnion: () => be2, ZodEffects: () => Ne2, ZodEnum: () => Oe, ZodError: () => u2, ZodFirstPartyTypeKind: () => Be2, ZodFunction: () => je2, ZodIntersection: () => Se2, ZodIssueCode: () => c2, ZodLazy: () => Pe2, ZodLiteral: () => Te2, ZodMap: () => we2, ZodNaN: () => ze2, ZodNativeEnum: () => Ce2, ZodNever: () => pe2, ZodNull: () => de2, ZodNullable: () => Ie, ZodNumber: () => ae, ZodObject: () => ge2, ZodOptional: () => $e2, ZodParsedType: () => s4, ZodPipeline: () => Fe2, ZodPromise: () => Ee2, ZodReadonly: () => Ue2, ZodRecord: () => xe2, ZodSchema: () => E2, ZodSet: () => Ze2, ZodString: () => te2, ZodSymbol: () => oe2, ZodTransformer: () => Ne2, ZodTuple: () => ke2, ZodType: () => E2, ZodUndefined: () => ce2, ZodUnion: () => ye2, ZodUnknown: () => le2, ZodVoid: () => me2, addIssueToContext: () => y3, any: () => rt2, array: () => ct2, bigint: () => Qe2, boolean: () => Xe2, coerce: () => Et2, custom: () => Ve2, date: () => et, datetimeRegex: () => Y, defaultErrorMap: () => l2, discriminatedUnion: () => pt2, effect: () => wt2, enum: () => St2, function: () => vt2, getErrorMap: () => h3, getParsedType: () => o3, instanceof: () => Ke2, intersection: () => mt2, isAborted: () => w3, isAsync: () => P2, isDirty: () => Z2, isValid: () => j2, late: () => We2, lazy: () => bt2, literal: () => _t, makeIssue: () => f, map: () => gt2, nan: () => Ye2, nativeEnum: () => kt2, never: () => st2, null: () => at2, nullable: () => jt2, number: () => Ge2, object: () => dt2, objectUtil: () => n4, oboolean: () => Ct2, onumber: () => Ot2, optional: () => Zt2, ostring: () => At2, pipeline: () => Tt2, preprocess: () => Pt2, promise: () => xt2, quotelessJson: () => d, record: () => ft2, set: () => yt2, setErrorMap: () => m, strictObject: () => ut2, string: () => He2, symbol: () => tt, transformer: () => wt2, tuple: () => ht2, undefined: () => nt2, union: () => lt2, unknown: () => it2, util: () => e5, void: () => ot2 }), (t4 = e5 || (e5 = {})).assertEqual = (e14) => {
  }, t4.assertIs = function(e14) {
  }, t4.assertNever = function(e14) {
    throw new Error();
  }, t4.arrayToEnum = (e14) => {
    const t12 = {};
    for (const n5 of e14)
      t12[n5] = n5;
    return t12;
  }, t4.getValidEnumValues = (e14) => {
    const n5 = t4.objectKeys(e14).filter((t12) => "number" != typeof e14[e14[t12]]), a5 = {};
    for (const t12 of n5)
      a5[t12] = e14[t12];
    return t4.objectValues(a5);
  }, t4.objectValues = (e14) => t4.objectKeys(e14).map(function(t12) {
    return e14[t12];
  }), t4.objectKeys = "function" == typeof Object.keys ? (e14) => Object.keys(e14) : (e14) => {
    const t12 = [];
    for (const n5 in e14)
      Object.prototype.hasOwnProperty.call(e14, n5) && t12.push(n5);
    return t12;
  }, t4.find = (e14, t12) => {
    for (const n5 of e14)
      if (t12(n5))
        return n5;
  }, t4.isInteger = "function" == typeof Number.isInteger ? (e14) => Number.isInteger(e14) : (e14) => "number" == typeof e14 && Number.isFinite(e14) && Math.floor(e14) === e14, t4.joinValues = function(e14, t12 = " | ") {
    return e14.map((e15) => "string" == typeof e15 ? `'${e15}'` : e15).join(t12);
  }, t4.jsonStringifyReplacer = (e14, t12) => "bigint" == typeof t12 ? t12.toString() : t12, (n4 || (n4 = {})).mergeShapes = (e14, t12) => ({ ...e14, ...t12 });
  var s4 = e5.arrayToEnum(["string", "nan", "number", "integer", "float", "boolean", "date", "bigint", "symbol", "function", "undefined", "null", "array", "object", "unknown", "promise", "void", "never", "map", "set"]);
  var o3 = (e14) => {
    switch (typeof e14) {
      case "undefined":
        return s4.undefined;
      case "string":
        return s4.string;
      case "number":
        return Number.isNaN(e14) ? s4.nan : s4.number;
      case "boolean":
        return s4.boolean;
      case "function":
        return s4.function;
      case "bigint":
        return s4.bigint;
      case "symbol":
        return s4.symbol;
      case "object":
        return Array.isArray(e14) ? s4.array : null === e14 ? s4.null : e14.then && "function" == typeof e14.then && e14.catch && "function" == typeof e14.catch ? s4.promise : "undefined" != typeof Map && e14 instanceof Map ? s4.map : "undefined" != typeof Set && e14 instanceof Set ? s4.set : "undefined" != typeof Date && e14 instanceof Date ? s4.date : s4.object;
      default:
        return s4.unknown;
    }
  };
  var c2 = e5.arrayToEnum(["invalid_type", "invalid_literal", "custom", "invalid_union", "invalid_union_discriminator", "invalid_enum_value", "unrecognized_keys", "invalid_arguments", "invalid_return_type", "invalid_date", "invalid_string", "too_small", "too_big", "invalid_intersection_types", "not_multiple_of", "not_finite"]);
  var d = (e14) => JSON.stringify(e14, null, 2).replace(/"([^"]+)":/g, "$1:");
  var u2 = class t5 extends Error {
    get errors() {
      return this.issues;
    }
    constructor(e14) {
      super(), this.issues = [], this.addIssue = (e15) => {
        this.issues = [...this.issues, e15];
      }, this.addIssues = (e15 = []) => {
        this.issues = [...this.issues, ...e15];
      };
      const t12 = new.target.prototype;
      Object.setPrototypeOf ? Object.setPrototypeOf(this, t12) : this.__proto__ = t12, this.name = "ZodError", this.issues = e14;
    }
    format(e14) {
      const t12 = e14 || function(e15) {
        return e15.message;
      }, n5 = { _errors: [] }, a5 = (e15) => {
        for (const r3 of e15.issues)
          if ("invalid_union" === r3.code)
            r3.unionErrors.map(a5);
          else if ("invalid_return_type" === r3.code)
            a5(r3.returnTypeError);
          else if ("invalid_arguments" === r3.code)
            a5(r3.argumentsError);
          else if (0 === r3.path.length)
            n5._errors.push(t12(r3));
          else {
            let e16 = n5, a6 = 0;
            for (; a6 < r3.path.length; ) {
              const n6 = r3.path[a6];
              a6 === r3.path.length - 1 ? (e16[n6] = e16[n6] || { _errors: [] }, e16[n6]._errors.push(t12(r3))) : e16[n6] = e16[n6] || { _errors: [] }, e16 = e16[n6], a6++;
            }
          }
      };
      return a5(this), n5;
    }
    static assert(e14) {
      if (!(e14 instanceof t5))
        throw new Error(`Not a ZodError: ${e14}`);
    }
    toString() {
      return this.message;
    }
    get message() {
      return JSON.stringify(this.issues, e5.jsonStringifyReplacer, 2);
    }
    get isEmpty() {
      return 0 === this.issues.length;
    }
    flatten(e14 = (e15) => e15.message) {
      const t12 = {}, n5 = [];
      for (const a5 of this.issues)
        if (a5.path.length > 0) {
          const n6 = a5.path[0];
          t12[n6] = t12[n6] || [], t12[n6].push(e14(a5));
        } else
          n5.push(e14(a5));
      return { formErrors: n5, fieldErrors: t12 };
    }
    get formErrors() {
      return this.flatten();
    }
  };
  u2.create = (e14) => new u2(e14);
  var l2 = (t12, n5) => {
    let a5;
    switch (t12.code) {
      case c2.invalid_type:
        a5 = t12.received === s4.undefined ? "Required" : `Expected ${t12.expected}, received ${t12.received}`;
        break;
      case c2.invalid_literal:
        a5 = `Invalid literal value, expected ${JSON.stringify(t12.expected, e5.jsonStringifyReplacer)}`;
        break;
      case c2.unrecognized_keys:
        a5 = `Unrecognized key(s) in object: ${e5.joinValues(t12.keys, ", ")}`;
        break;
      case c2.invalid_union:
        a5 = "Invalid input";
        break;
      case c2.invalid_union_discriminator:
        a5 = `Invalid discriminator value. Expected ${e5.joinValues(t12.options)}`;
        break;
      case c2.invalid_enum_value:
        a5 = `Invalid enum value. Expected ${e5.joinValues(t12.options)}, received '${t12.received}'`;
        break;
      case c2.invalid_arguments:
        a5 = "Invalid function arguments";
        break;
      case c2.invalid_return_type:
        a5 = "Invalid function return type";
        break;
      case c2.invalid_date:
        a5 = "Invalid date";
        break;
      case c2.invalid_string:
        "object" == typeof t12.validation ? "includes" in t12.validation ? (a5 = `Invalid input: must include "${t12.validation.includes}"`, "number" == typeof t12.validation.position && (a5 = `${a5} at one or more positions greater than or equal to ${t12.validation.position}`)) : "startsWith" in t12.validation ? a5 = `Invalid input: must start with "${t12.validation.startsWith}"` : "endsWith" in t12.validation ? a5 = `Invalid input: must end with "${t12.validation.endsWith}"` : e5.assertNever(t12.validation) : a5 = "regex" !== t12.validation ? `Invalid ${t12.validation}` : "Invalid";
        break;
      case c2.too_small:
        a5 = "array" === t12.type ? `Array must contain ${t12.exact ? "exactly" : t12.inclusive ? "at least" : "more than"} ${t12.minimum} element(s)` : "string" === t12.type ? `String must contain ${t12.exact ? "exactly" : t12.inclusive ? "at least" : "over"} ${t12.minimum} character(s)` : "number" === t12.type || "bigint" === t12.type ? `Number must be ${t12.exact ? "exactly equal to " : t12.inclusive ? "greater than or equal to " : "greater than "}${t12.minimum}` : "date" === t12.type ? `Date must be ${t12.exact ? "exactly equal to " : t12.inclusive ? "greater than or equal to " : "greater than "}${new Date(Number(t12.minimum))}` : "Invalid input";
        break;
      case c2.too_big:
        a5 = "array" === t12.type ? `Array must contain ${t12.exact ? "exactly" : t12.inclusive ? "at most" : "less than"} ${t12.maximum} element(s)` : "string" === t12.type ? `String must contain ${t12.exact ? "exactly" : t12.inclusive ? "at most" : "under"} ${t12.maximum} character(s)` : "number" === t12.type ? `Number must be ${t12.exact ? "exactly" : t12.inclusive ? "less than or equal to" : "less than"} ${t12.maximum}` : "bigint" === t12.type ? `BigInt must be ${t12.exact ? "exactly" : t12.inclusive ? "less than or equal to" : "less than"} ${t12.maximum}` : "date" === t12.type ? `Date must be ${t12.exact ? "exactly" : t12.inclusive ? "smaller than or equal to" : "smaller than"} ${new Date(Number(t12.maximum))}` : "Invalid input";
        break;
      case c2.custom:
        a5 = "Invalid input";
        break;
      case c2.invalid_intersection_types:
        a5 = "Intersection results could not be merged";
        break;
      case c2.not_multiple_of:
        a5 = `Number must be a multiple of ${t12.multipleOf}`;
        break;
      case c2.not_finite:
        a5 = "Number must be finite";
        break;
      default:
        a5 = n5.defaultError, e5.assertNever(t12);
    }
    return { message: a5 };
  };
  var p = l2;
  function m(e14) {
    p = e14;
  }
  function h3() {
    return p;
  }
  var f = (e14) => {
    const { data: t12, path: n5, errorMaps: a5, issueData: r3 } = e14, i4 = [...n5, ...r3.path || []], s5 = { ...r3, path: i4 };
    if (void 0 !== r3.message)
      return { ...r3, path: i4, message: r3.message };
    let o4 = "";
    const c3 = a5.filter((e15) => !!e15).slice().reverse();
    for (const e15 of c3)
      o4 = e15(s5, { data: t12, defaultError: o4 }).message;
    return { ...r3, path: i4, message: o4 };
  };
  var g2 = [];
  function y3(e14, t12) {
    const n5 = h3(), a5 = f({ issueData: t12, data: e14.data, path: e14.path, errorMaps: [e14.common.contextualErrorMap, e14.schemaErrorMap, n5, n5 === l2 ? void 0 : l2].filter((e15) => !!e15) });
    e14.common.issues.push(a5);
  }
  var v3;
  var b;
  var _3 = class e6 {
    constructor() {
      this.value = "valid";
    }
    dirty() {
      "valid" === this.value && (this.value = "dirty");
    }
    abort() {
      "aborted" !== this.value && (this.value = "aborted");
    }
    static mergeArray(e14, t12) {
      const n5 = [];
      for (const a5 of t12) {
        if ("aborted" === a5.status)
          return S3;
        "dirty" === a5.status && e14.dirty(), n5.push(a5.value);
      }
      return { status: e14.value, value: n5 };
    }
    static async mergeObjectAsync(t12, n5) {
      const a5 = [];
      for (const e14 of n5) {
        const t13 = await e14.key, n6 = await e14.value;
        a5.push({ key: t13, value: n6 });
      }
      return e6.mergeObjectSync(t12, a5);
    }
    static mergeObjectSync(e14, t12) {
      const n5 = {};
      for (const a5 of t12) {
        const { key: t13, value: r3 } = a5;
        if ("aborted" === t13.status)
          return S3;
        if ("aborted" === r3.status)
          return S3;
        "dirty" === t13.status && e14.dirty(), "dirty" === r3.status && e14.dirty(), "__proto__" === t13.value || void 0 === r3.value && !a5.alwaysSet || (n5[t13.value] = r3.value);
      }
      return { status: e14.value, value: n5 };
    }
  };
  var S3 = Object.freeze({ status: "aborted" });
  var k2 = (e14) => ({ status: "dirty", value: e14 });
  var x2 = (e14) => ({ status: "valid", value: e14 });
  var w3 = (e14) => "aborted" === e14.status;
  var Z2 = (e14) => "dirty" === e14.status;
  var j2 = (e14) => "valid" === e14.status;
  var P2 = (e14) => "undefined" != typeof Promise && e14 instanceof Promise;
  (b = v3 || (v3 = {})).errToObj = (e14) => "string" == typeof e14 ? { message: e14 } : e14 || {}, b.toString = (e14) => "string" == typeof e14 ? e14 : null == e14 ? void 0 : e14.message;
  var T3 = class {
    constructor(e14, t12, n5, a5) {
      this._cachedPath = [], this.parent = e14, this.data = t12, this._path = n5, this._key = a5;
    }
    get path() {
      return this._cachedPath.length || (Array.isArray(this._key) ? this._cachedPath.push(...this._path, ...this._key) : this._cachedPath.push(...this._path, this._key)), this._cachedPath;
    }
  };
  var A3 = (e14, t12) => {
    if (j2(t12))
      return { success: true, data: t12.value };
    if (!e14.common.issues.length)
      throw new Error("Validation failed but no issues detected.");
    return { success: false, get error() {
      if (this._error)
        return this._error;
      const t13 = new u2(e14.common.issues);
      return this._error = t13, this._error;
    } };
  };
  function O3(e14) {
    if (!e14)
      return {};
    const { errorMap: t12, invalid_type_error: n5, required_error: a5, description: r3 } = e14;
    if (t12 && (n5 || a5))
      throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
    if (t12)
      return { errorMap: t12, description: r3 };
    return { errorMap: (t13, r4) => {
      var i4, s5;
      const { message: o4 } = e14;
      return "invalid_enum_value" === t13.code ? { message: null != o4 ? o4 : r4.defaultError } : void 0 === r4.data ? { message: null != (i4 = null != o4 ? o4 : a5) ? i4 : r4.defaultError } : "invalid_type" !== t13.code ? { message: r4.defaultError } : { message: null != (s5 = null != o4 ? o4 : n5) ? s5 : r4.defaultError };
    }, description: r3 };
  }
  var C3;
  var E2 = class {
    get description() {
      return this._def.description;
    }
    _getType(e14) {
      return o3(e14.data);
    }
    _getOrReturnCtx(e14, t12) {
      return t12 || { common: e14.parent.common, data: e14.data, parsedType: o3(e14.data), schemaErrorMap: this._def.errorMap, path: e14.path, parent: e14.parent };
    }
    _processInputParams(e14) {
      return { status: new _3(), ctx: { common: e14.parent.common, data: e14.data, parsedType: o3(e14.data), schemaErrorMap: this._def.errorMap, path: e14.path, parent: e14.parent } };
    }
    _parseSync(e14) {
      const t12 = this._parse(e14);
      if (P2(t12))
        throw new Error("Synchronous parse encountered promise.");
      return t12;
    }
    _parseAsync(e14) {
      const t12 = this._parse(e14);
      return Promise.resolve(t12);
    }
    parse(e14, t12) {
      const n5 = this.safeParse(e14, t12);
      if (n5.success)
        return n5.data;
      throw n5.error;
    }
    safeParse(e14, t12) {
      var n5;
      const a5 = { common: { issues: [], async: null != (n5 = null == t12 ? void 0 : t12.async) && n5, contextualErrorMap: null == t12 ? void 0 : t12.errorMap }, path: (null == t12 ? void 0 : t12.path) || [], schemaErrorMap: this._def.errorMap, parent: null, data: e14, parsedType: o3(e14) }, r3 = this._parseSync({ data: e14, path: a5.path, parent: a5 });
      return A3(a5, r3);
    }
    "~validate"(e14) {
      var t12, n5;
      const a5 = { common: { issues: [], async: !!this["~standard"].async }, path: [], schemaErrorMap: this._def.errorMap, parent: null, data: e14, parsedType: o3(e14) };
      if (!this["~standard"].async)
        try {
          const t13 = this._parseSync({ data: e14, path: [], parent: a5 });
          return j2(t13) ? { value: t13.value } : { issues: a5.common.issues };
        } catch (e15) {
          (null == (n5 = null == (t12 = null == e15 ? void 0 : e15.message) ? void 0 : t12.toLowerCase()) ? void 0 : n5.includes("encountered")) && (this["~standard"].async = true), a5.common = { issues: [], async: true };
        }
      return this._parseAsync({ data: e14, path: [], parent: a5 }).then((e15) => j2(e15) ? { value: e15.value } : { issues: a5.common.issues });
    }
    async parseAsync(e14, t12) {
      const n5 = await this.safeParseAsync(e14, t12);
      if (n5.success)
        return n5.data;
      throw n5.error;
    }
    async safeParseAsync(e14, t12) {
      const n5 = { common: { issues: [], contextualErrorMap: null == t12 ? void 0 : t12.errorMap, async: true }, path: (null == t12 ? void 0 : t12.path) || [], schemaErrorMap: this._def.errorMap, parent: null, data: e14, parsedType: o3(e14) }, a5 = this._parse({ data: e14, path: n5.path, parent: n5 }), r3 = await (P2(a5) ? a5 : Promise.resolve(a5));
      return A3(n5, r3);
    }
    refine(e14, t12) {
      const n5 = (e15) => "string" == typeof t12 || void 0 === t12 ? { message: t12 } : "function" == typeof t12 ? t12(e15) : t12;
      return this._refinement((t13, a5) => {
        const r3 = e14(t13), i4 = () => a5.addIssue({ code: c2.custom, ...n5(t13) });
        return "undefined" != typeof Promise && r3 instanceof Promise ? r3.then((e15) => !!e15 || (i4(), false)) : !!r3 || (i4(), false);
      });
    }
    refinement(e14, t12) {
      return this._refinement((n5, a5) => !!e14(n5) || (a5.addIssue("function" == typeof t12 ? t12(n5, a5) : t12), false));
    }
    _refinement(e14) {
      return new Ne2({ schema: this, typeName: Be2.ZodEffects, effect: { type: "refinement", refinement: e14 } });
    }
    superRefine(e14) {
      return this._refinement(e14);
    }
    constructor(e14) {
      this.spa = this.safeParseAsync, this._def = e14, this.parse = this.parse.bind(this), this.safeParse = this.safeParse.bind(this), this.parseAsync = this.parseAsync.bind(this), this.safeParseAsync = this.safeParseAsync.bind(this), this.spa = this.spa.bind(this), this.refine = this.refine.bind(this), this.refinement = this.refinement.bind(this), this.superRefine = this.superRefine.bind(this), this.optional = this.optional.bind(this), this.nullable = this.nullable.bind(this), this.nullish = this.nullish.bind(this), this.array = this.array.bind(this), this.promise = this.promise.bind(this), this.or = this.or.bind(this), this.and = this.and.bind(this), this.transform = this.transform.bind(this), this.brand = this.brand.bind(this), this.default = this.default.bind(this), this.catch = this.catch.bind(this), this.describe = this.describe.bind(this), this.pipe = this.pipe.bind(this), this.readonly = this.readonly.bind(this), this.isNullable = this.isNullable.bind(this), this.isOptional = this.isOptional.bind(this), this["~standard"] = { version: 1, vendor: "zod", validate: (e15) => this["~validate"](e15) };
    }
    optional() {
      return $e2.create(this, this._def);
    }
    nullable() {
      return Ie.create(this, this._def);
    }
    nullish() {
      return this.nullable().optional();
    }
    array() {
      return he2.create(this);
    }
    promise() {
      return Ee2.create(this, this._def);
    }
    or(e14) {
      return ye2.create([this, e14], this._def);
    }
    and(e14) {
      return Se2.create(this, e14, this._def);
    }
    transform(e14) {
      return new Ne2({ ...O3(this._def), schema: this, typeName: Be2.ZodEffects, effect: { type: "transform", transform: e14 } });
    }
    default(e14) {
      const t12 = "function" == typeof e14 ? e14 : () => e14;
      return new Re2({ ...O3(this._def), innerType: this, defaultValue: t12, typeName: Be2.ZodDefault });
    }
    brand() {
      return new Le2({ typeName: Be2.ZodBranded, type: this, ...O3(this._def) });
    }
    catch(e14) {
      const t12 = "function" == typeof e14 ? e14 : () => e14;
      return new Me2({ ...O3(this._def), innerType: this, catchValue: t12, typeName: Be2.ZodCatch });
    }
    describe(e14) {
      return new (0, this.constructor)({ ...this._def, description: e14 });
    }
    pipe(e14) {
      return Fe2.create(this, e14);
    }
    readonly() {
      return Ue2.create(this);
    }
    isOptional() {
      return this.safeParse(void 0).success;
    }
    isNullable() {
      return this.safeParse(null).success;
    }
  };
  var N2 = /^c[^\s-]{8,}$/i;
  var $2 = /^[0-9a-z]+$/;
  var I2 = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
  var R2 = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
  var M2 = /^[a-z0-9_-]{21}$/i;
  var z = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  var D = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
  var L2 = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
  var F3 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
  var U2 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
  var J3 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  var V2 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var B3 = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  var q3 = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  var W2 = "((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))";
  var K2 = new RegExp(`^${W2}$`);
  function H2(e14) {
    let t12 = "[0-5]\\d";
    e14.precision ? t12 = `${t12}\\.\\d{${e14.precision}}` : null == e14.precision && (t12 = `${t12}(\\.\\d+)?`);
    return `([01]\\d|2[0-3]):[0-5]\\d(:${t12})${e14.precision ? "+" : "?"}`;
  }
  function G2(e14) {
    return new RegExp(`^${H2(e14)}$`);
  }
  function Y(e14) {
    let t12 = `${W2}T${H2(e14)}`;
    const n5 = [];
    return n5.push(e14.local ? "Z?" : "Z"), e14.offset && n5.push("([+-]\\d{2}:?\\d{2})"), t12 = `${t12}(${n5.join("|")})`, new RegExp(`^${t12}$`);
  }
  function Q2(e14, t12) {
    return !("v4" !== t12 && t12 || !F3.test(e14)) || !("v6" !== t12 && t12 || !J3.test(e14));
  }
  function X(e14, t12) {
    if (!z.test(e14))
      return false;
    try {
      const [n5] = e14.split(".");
      if (!n5)
        return false;
      const a5 = n5.replace(/-/g, "+").replace(/_/g, "/").padEnd(n5.length + (4 - n5.length % 4) % 4, "="), r3 = JSON.parse(atob(a5));
      return "object" == typeof r3 && null !== r3 && ((!("typ" in r3) || "JWT" === (null == r3 ? void 0 : r3.typ)) && (!!r3.alg && (!t12 || r3.alg === t12)));
    } catch (e15) {
      return false;
    }
  }
  function ee2(e14, t12) {
    return !("v4" !== t12 && t12 || !U2.test(e14)) || !("v6" !== t12 && t12 || !V2.test(e14));
  }
  var te2 = class t6 extends E2 {
    _parse(t12) {
      this._def.coerce && (t12.data = String(t12.data));
      if (this._getType(t12) !== s4.string) {
        const e14 = this._getOrReturnCtx(t12);
        return y3(e14, { code: c2.invalid_type, expected: s4.string, received: e14.parsedType }), S3;
      }
      const n5 = new _3();
      let a5;
      for (const r3 of this._def.checks)
        if ("min" === r3.kind)
          t12.data.length < r3.value && (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { code: c2.too_small, minimum: r3.value, type: "string", inclusive: true, exact: false, message: r3.message }), n5.dirty());
        else if ("max" === r3.kind)
          t12.data.length > r3.value && (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { code: c2.too_big, maximum: r3.value, type: "string", inclusive: true, exact: false, message: r3.message }), n5.dirty());
        else if ("length" === r3.kind) {
          const e14 = t12.data.length > r3.value, i4 = t12.data.length < r3.value;
          (e14 || i4) && (a5 = this._getOrReturnCtx(t12, a5), e14 ? y3(a5, { code: c2.too_big, maximum: r3.value, type: "string", inclusive: true, exact: true, message: r3.message }) : i4 && y3(a5, { code: c2.too_small, minimum: r3.value, type: "string", inclusive: true, exact: true, message: r3.message }), n5.dirty());
        } else if ("email" === r3.kind)
          L2.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "email", code: c2.invalid_string, message: r3.message }), n5.dirty());
        else if ("emoji" === r3.kind)
          C3 || (C3 = new RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u")), C3.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "emoji", code: c2.invalid_string, message: r3.message }), n5.dirty());
        else if ("uuid" === r3.kind)
          R2.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "uuid", code: c2.invalid_string, message: r3.message }), n5.dirty());
        else if ("nanoid" === r3.kind)
          M2.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "nanoid", code: c2.invalid_string, message: r3.message }), n5.dirty());
        else if ("cuid" === r3.kind)
          N2.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "cuid", code: c2.invalid_string, message: r3.message }), n5.dirty());
        else if ("cuid2" === r3.kind)
          $2.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "cuid2", code: c2.invalid_string, message: r3.message }), n5.dirty());
        else if ("ulid" === r3.kind)
          I2.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "ulid", code: c2.invalid_string, message: r3.message }), n5.dirty());
        else if ("url" === r3.kind)
          try {
            new URL(t12.data);
          } catch (e14) {
            a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "url", code: c2.invalid_string, message: r3.message }), n5.dirty();
          }
        else if ("regex" === r3.kind) {
          r3.regex.lastIndex = 0;
          r3.regex.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "regex", code: c2.invalid_string, message: r3.message }), n5.dirty());
        } else if ("trim" === r3.kind)
          t12.data = t12.data.trim();
        else if ("includes" === r3.kind)
          t12.data.includes(r3.value, r3.position) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { code: c2.invalid_string, validation: { includes: r3.value, position: r3.position }, message: r3.message }), n5.dirty());
        else if ("toLowerCase" === r3.kind)
          t12.data = t12.data.toLowerCase();
        else if ("toUpperCase" === r3.kind)
          t12.data = t12.data.toUpperCase();
        else if ("startsWith" === r3.kind)
          t12.data.startsWith(r3.value) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { code: c2.invalid_string, validation: { startsWith: r3.value }, message: r3.message }), n5.dirty());
        else if ("endsWith" === r3.kind)
          t12.data.endsWith(r3.value) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { code: c2.invalid_string, validation: { endsWith: r3.value }, message: r3.message }), n5.dirty());
        else if ("datetime" === r3.kind) {
          Y(r3).test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { code: c2.invalid_string, validation: "datetime", message: r3.message }), n5.dirty());
        } else if ("date" === r3.kind) {
          K2.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { code: c2.invalid_string, validation: "date", message: r3.message }), n5.dirty());
        } else if ("time" === r3.kind) {
          G2(r3).test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { code: c2.invalid_string, validation: "time", message: r3.message }), n5.dirty());
        } else
          "duration" === r3.kind ? D.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "duration", code: c2.invalid_string, message: r3.message }), n5.dirty()) : "ip" === r3.kind ? Q2(t12.data, r3.version) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "ip", code: c2.invalid_string, message: r3.message }), n5.dirty()) : "jwt" === r3.kind ? X(t12.data, r3.alg) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "jwt", code: c2.invalid_string, message: r3.message }), n5.dirty()) : "cidr" === r3.kind ? ee2(t12.data, r3.version) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "cidr", code: c2.invalid_string, message: r3.message }), n5.dirty()) : "base64" === r3.kind ? B3.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "base64", code: c2.invalid_string, message: r3.message }), n5.dirty()) : "base64url" === r3.kind ? q3.test(t12.data) || (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { validation: "base64url", code: c2.invalid_string, message: r3.message }), n5.dirty()) : e5.assertNever(r3);
      return { status: n5.value, value: t12.data };
    }
    _regex(e14, t12, n5) {
      return this.refinement((t13) => e14.test(t13), { validation: t12, code: c2.invalid_string, ...v3.errToObj(n5) });
    }
    _addCheck(e14) {
      return new t6({ ...this._def, checks: [...this._def.checks, e14] });
    }
    email(e14) {
      return this._addCheck({ kind: "email", ...v3.errToObj(e14) });
    }
    url(e14) {
      return this._addCheck({ kind: "url", ...v3.errToObj(e14) });
    }
    emoji(e14) {
      return this._addCheck({ kind: "emoji", ...v3.errToObj(e14) });
    }
    uuid(e14) {
      return this._addCheck({ kind: "uuid", ...v3.errToObj(e14) });
    }
    nanoid(e14) {
      return this._addCheck({ kind: "nanoid", ...v3.errToObj(e14) });
    }
    cuid(e14) {
      return this._addCheck({ kind: "cuid", ...v3.errToObj(e14) });
    }
    cuid2(e14) {
      return this._addCheck({ kind: "cuid2", ...v3.errToObj(e14) });
    }
    ulid(e14) {
      return this._addCheck({ kind: "ulid", ...v3.errToObj(e14) });
    }
    base64(e14) {
      return this._addCheck({ kind: "base64", ...v3.errToObj(e14) });
    }
    base64url(e14) {
      return this._addCheck({ kind: "base64url", ...v3.errToObj(e14) });
    }
    jwt(e14) {
      return this._addCheck({ kind: "jwt", ...v3.errToObj(e14) });
    }
    ip(e14) {
      return this._addCheck({ kind: "ip", ...v3.errToObj(e14) });
    }
    cidr(e14) {
      return this._addCheck({ kind: "cidr", ...v3.errToObj(e14) });
    }
    datetime(e14) {
      var t12, n5;
      return "string" == typeof e14 ? this._addCheck({ kind: "datetime", precision: null, offset: false, local: false, message: e14 }) : this._addCheck({ kind: "datetime", precision: void 0 === (null == e14 ? void 0 : e14.precision) ? null : null == e14 ? void 0 : e14.precision, offset: null != (t12 = null == e14 ? void 0 : e14.offset) && t12, local: null != (n5 = null == e14 ? void 0 : e14.local) && n5, ...v3.errToObj(null == e14 ? void 0 : e14.message) });
    }
    date(e14) {
      return this._addCheck({ kind: "date", message: e14 });
    }
    time(e14) {
      return "string" == typeof e14 ? this._addCheck({ kind: "time", precision: null, message: e14 }) : this._addCheck({ kind: "time", precision: void 0 === (null == e14 ? void 0 : e14.precision) ? null : null == e14 ? void 0 : e14.precision, ...v3.errToObj(null == e14 ? void 0 : e14.message) });
    }
    duration(e14) {
      return this._addCheck({ kind: "duration", ...v3.errToObj(e14) });
    }
    regex(e14, t12) {
      return this._addCheck({ kind: "regex", regex: e14, ...v3.errToObj(t12) });
    }
    includes(e14, t12) {
      return this._addCheck({ kind: "includes", value: e14, position: null == t12 ? void 0 : t12.position, ...v3.errToObj(null == t12 ? void 0 : t12.message) });
    }
    startsWith(e14, t12) {
      return this._addCheck({ kind: "startsWith", value: e14, ...v3.errToObj(t12) });
    }
    endsWith(e14, t12) {
      return this._addCheck({ kind: "endsWith", value: e14, ...v3.errToObj(t12) });
    }
    min(e14, t12) {
      return this._addCheck({ kind: "min", value: e14, ...v3.errToObj(t12) });
    }
    max(e14, t12) {
      return this._addCheck({ kind: "max", value: e14, ...v3.errToObj(t12) });
    }
    length(e14, t12) {
      return this._addCheck({ kind: "length", value: e14, ...v3.errToObj(t12) });
    }
    nonempty(e14) {
      return this.min(1, v3.errToObj(e14));
    }
    trim() {
      return new t6({ ...this._def, checks: [...this._def.checks, { kind: "trim" }] });
    }
    toLowerCase() {
      return new t6({ ...this._def, checks: [...this._def.checks, { kind: "toLowerCase" }] });
    }
    toUpperCase() {
      return new t6({ ...this._def, checks: [...this._def.checks, { kind: "toUpperCase" }] });
    }
    get isDatetime() {
      return !!this._def.checks.find((e14) => "datetime" === e14.kind);
    }
    get isDate() {
      return !!this._def.checks.find((e14) => "date" === e14.kind);
    }
    get isTime() {
      return !!this._def.checks.find((e14) => "time" === e14.kind);
    }
    get isDuration() {
      return !!this._def.checks.find((e14) => "duration" === e14.kind);
    }
    get isEmail() {
      return !!this._def.checks.find((e14) => "email" === e14.kind);
    }
    get isURL() {
      return !!this._def.checks.find((e14) => "url" === e14.kind);
    }
    get isEmoji() {
      return !!this._def.checks.find((e14) => "emoji" === e14.kind);
    }
    get isUUID() {
      return !!this._def.checks.find((e14) => "uuid" === e14.kind);
    }
    get isNANOID() {
      return !!this._def.checks.find((e14) => "nanoid" === e14.kind);
    }
    get isCUID() {
      return !!this._def.checks.find((e14) => "cuid" === e14.kind);
    }
    get isCUID2() {
      return !!this._def.checks.find((e14) => "cuid2" === e14.kind);
    }
    get isULID() {
      return !!this._def.checks.find((e14) => "ulid" === e14.kind);
    }
    get isIP() {
      return !!this._def.checks.find((e14) => "ip" === e14.kind);
    }
    get isCIDR() {
      return !!this._def.checks.find((e14) => "cidr" === e14.kind);
    }
    get isBase64() {
      return !!this._def.checks.find((e14) => "base64" === e14.kind);
    }
    get isBase64url() {
      return !!this._def.checks.find((e14) => "base64url" === e14.kind);
    }
    get minLength() {
      let e14 = null;
      for (const t12 of this._def.checks)
        "min" === t12.kind && (null === e14 || t12.value > e14) && (e14 = t12.value);
      return e14;
    }
    get maxLength() {
      let e14 = null;
      for (const t12 of this._def.checks)
        "max" === t12.kind && (null === e14 || t12.value < e14) && (e14 = t12.value);
      return e14;
    }
  };
  function ne2(e14, t12) {
    const n5 = (e14.toString().split(".")[1] || "").length, a5 = (t12.toString().split(".")[1] || "").length, r3 = n5 > a5 ? n5 : a5;
    return Number.parseInt(e14.toFixed(r3).replace(".", "")) % Number.parseInt(t12.toFixed(r3).replace(".", "")) / 10 ** r3;
  }
  te2.create = (e14) => {
    var t12;
    return new te2({ checks: [], typeName: Be2.ZodString, coerce: null != (t12 = null == e14 ? void 0 : e14.coerce) && t12, ...O3(e14) });
  };
  var ae = class t7 extends E2 {
    constructor() {
      super(...arguments), this.min = this.gte, this.max = this.lte, this.step = this.multipleOf;
    }
    _parse(t12) {
      this._def.coerce && (t12.data = Number(t12.data));
      if (this._getType(t12) !== s4.number) {
        const e14 = this._getOrReturnCtx(t12);
        return y3(e14, { code: c2.invalid_type, expected: s4.number, received: e14.parsedType }), S3;
      }
      let n5;
      const a5 = new _3();
      for (const r3 of this._def.checks)
        if ("int" === r3.kind)
          e5.isInteger(t12.data) || (n5 = this._getOrReturnCtx(t12, n5), y3(n5, { code: c2.invalid_type, expected: "integer", received: "float", message: r3.message }), a5.dirty());
        else if ("min" === r3.kind) {
          (r3.inclusive ? t12.data < r3.value : t12.data <= r3.value) && (n5 = this._getOrReturnCtx(t12, n5), y3(n5, { code: c2.too_small, minimum: r3.value, type: "number", inclusive: r3.inclusive, exact: false, message: r3.message }), a5.dirty());
        } else if ("max" === r3.kind) {
          (r3.inclusive ? t12.data > r3.value : t12.data >= r3.value) && (n5 = this._getOrReturnCtx(t12, n5), y3(n5, { code: c2.too_big, maximum: r3.value, type: "number", inclusive: r3.inclusive, exact: false, message: r3.message }), a5.dirty());
        } else
          "multipleOf" === r3.kind ? 0 !== ne2(t12.data, r3.value) && (n5 = this._getOrReturnCtx(t12, n5), y3(n5, { code: c2.not_multiple_of, multipleOf: r3.value, message: r3.message }), a5.dirty()) : "finite" === r3.kind ? Number.isFinite(t12.data) || (n5 = this._getOrReturnCtx(t12, n5), y3(n5, { code: c2.not_finite, message: r3.message }), a5.dirty()) : e5.assertNever(r3);
      return { status: a5.value, value: t12.data };
    }
    gte(e14, t12) {
      return this.setLimit("min", e14, true, v3.toString(t12));
    }
    gt(e14, t12) {
      return this.setLimit("min", e14, false, v3.toString(t12));
    }
    lte(e14, t12) {
      return this.setLimit("max", e14, true, v3.toString(t12));
    }
    lt(e14, t12) {
      return this.setLimit("max", e14, false, v3.toString(t12));
    }
    setLimit(e14, n5, a5, r3) {
      return new t7({ ...this._def, checks: [...this._def.checks, { kind: e14, value: n5, inclusive: a5, message: v3.toString(r3) }] });
    }
    _addCheck(e14) {
      return new t7({ ...this._def, checks: [...this._def.checks, e14] });
    }
    int(e14) {
      return this._addCheck({ kind: "int", message: v3.toString(e14) });
    }
    positive(e14) {
      return this._addCheck({ kind: "min", value: 0, inclusive: false, message: v3.toString(e14) });
    }
    negative(e14) {
      return this._addCheck({ kind: "max", value: 0, inclusive: false, message: v3.toString(e14) });
    }
    nonpositive(e14) {
      return this._addCheck({ kind: "max", value: 0, inclusive: true, message: v3.toString(e14) });
    }
    nonnegative(e14) {
      return this._addCheck({ kind: "min", value: 0, inclusive: true, message: v3.toString(e14) });
    }
    multipleOf(e14, t12) {
      return this._addCheck({ kind: "multipleOf", value: e14, message: v3.toString(t12) });
    }
    finite(e14) {
      return this._addCheck({ kind: "finite", message: v3.toString(e14) });
    }
    safe(e14) {
      return this._addCheck({ kind: "min", inclusive: true, value: Number.MIN_SAFE_INTEGER, message: v3.toString(e14) })._addCheck({ kind: "max", inclusive: true, value: Number.MAX_SAFE_INTEGER, message: v3.toString(e14) });
    }
    get minValue() {
      let e14 = null;
      for (const t12 of this._def.checks)
        "min" === t12.kind && (null === e14 || t12.value > e14) && (e14 = t12.value);
      return e14;
    }
    get maxValue() {
      let e14 = null;
      for (const t12 of this._def.checks)
        "max" === t12.kind && (null === e14 || t12.value < e14) && (e14 = t12.value);
      return e14;
    }
    get isInt() {
      return !!this._def.checks.find((t12) => "int" === t12.kind || "multipleOf" === t12.kind && e5.isInteger(t12.value));
    }
    get isFinite() {
      let e14 = null, t12 = null;
      for (const n5 of this._def.checks) {
        if ("finite" === n5.kind || "int" === n5.kind || "multipleOf" === n5.kind)
          return true;
        "min" === n5.kind ? (null === t12 || n5.value > t12) && (t12 = n5.value) : "max" === n5.kind && (null === e14 || n5.value < e14) && (e14 = n5.value);
      }
      return Number.isFinite(t12) && Number.isFinite(e14);
    }
  };
  ae.create = (e14) => new ae({ checks: [], typeName: Be2.ZodNumber, coerce: (null == e14 ? void 0 : e14.coerce) || false, ...O3(e14) });
  var re2 = class t8 extends E2 {
    constructor() {
      super(...arguments), this.min = this.gte, this.max = this.lte;
    }
    _parse(t12) {
      if (this._def.coerce)
        try {
          t12.data = BigInt(t12.data);
        } catch (e14) {
          return this._getInvalidInput(t12);
        }
      if (this._getType(t12) !== s4.bigint)
        return this._getInvalidInput(t12);
      let n5;
      const a5 = new _3();
      for (const r3 of this._def.checks)
        if ("min" === r3.kind) {
          (r3.inclusive ? t12.data < r3.value : t12.data <= r3.value) && (n5 = this._getOrReturnCtx(t12, n5), y3(n5, { code: c2.too_small, type: "bigint", minimum: r3.value, inclusive: r3.inclusive, message: r3.message }), a5.dirty());
        } else if ("max" === r3.kind) {
          (r3.inclusive ? t12.data > r3.value : t12.data >= r3.value) && (n5 = this._getOrReturnCtx(t12, n5), y3(n5, { code: c2.too_big, type: "bigint", maximum: r3.value, inclusive: r3.inclusive, message: r3.message }), a5.dirty());
        } else
          "multipleOf" === r3.kind ? t12.data % r3.value !== BigInt(0) && (n5 = this._getOrReturnCtx(t12, n5), y3(n5, { code: c2.not_multiple_of, multipleOf: r3.value, message: r3.message }), a5.dirty()) : e5.assertNever(r3);
      return { status: a5.value, value: t12.data };
    }
    _getInvalidInput(e14) {
      const t12 = this._getOrReturnCtx(e14);
      return y3(t12, { code: c2.invalid_type, expected: s4.bigint, received: t12.parsedType }), S3;
    }
    gte(e14, t12) {
      return this.setLimit("min", e14, true, v3.toString(t12));
    }
    gt(e14, t12) {
      return this.setLimit("min", e14, false, v3.toString(t12));
    }
    lte(e14, t12) {
      return this.setLimit("max", e14, true, v3.toString(t12));
    }
    lt(e14, t12) {
      return this.setLimit("max", e14, false, v3.toString(t12));
    }
    setLimit(e14, n5, a5, r3) {
      return new t8({ ...this._def, checks: [...this._def.checks, { kind: e14, value: n5, inclusive: a5, message: v3.toString(r3) }] });
    }
    _addCheck(e14) {
      return new t8({ ...this._def, checks: [...this._def.checks, e14] });
    }
    positive(e14) {
      return this._addCheck({ kind: "min", value: BigInt(0), inclusive: false, message: v3.toString(e14) });
    }
    negative(e14) {
      return this._addCheck({ kind: "max", value: BigInt(0), inclusive: false, message: v3.toString(e14) });
    }
    nonpositive(e14) {
      return this._addCheck({ kind: "max", value: BigInt(0), inclusive: true, message: v3.toString(e14) });
    }
    nonnegative(e14) {
      return this._addCheck({ kind: "min", value: BigInt(0), inclusive: true, message: v3.toString(e14) });
    }
    multipleOf(e14, t12) {
      return this._addCheck({ kind: "multipleOf", value: e14, message: v3.toString(t12) });
    }
    get minValue() {
      let e14 = null;
      for (const t12 of this._def.checks)
        "min" === t12.kind && (null === e14 || t12.value > e14) && (e14 = t12.value);
      return e14;
    }
    get maxValue() {
      let e14 = null;
      for (const t12 of this._def.checks)
        "max" === t12.kind && (null === e14 || t12.value < e14) && (e14 = t12.value);
      return e14;
    }
  };
  re2.create = (e14) => {
    var t12;
    return new re2({ checks: [], typeName: Be2.ZodBigInt, coerce: null != (t12 = null == e14 ? void 0 : e14.coerce) && t12, ...O3(e14) });
  };
  var ie2 = class extends E2 {
    _parse(e14) {
      this._def.coerce && (e14.data = Boolean(e14.data));
      if (this._getType(e14) !== s4.boolean) {
        const t12 = this._getOrReturnCtx(e14);
        return y3(t12, { code: c2.invalid_type, expected: s4.boolean, received: t12.parsedType }), S3;
      }
      return x2(e14.data);
    }
  };
  ie2.create = (e14) => new ie2({ typeName: Be2.ZodBoolean, coerce: (null == e14 ? void 0 : e14.coerce) || false, ...O3(e14) });
  var se = class t9 extends E2 {
    _parse(t12) {
      this._def.coerce && (t12.data = new Date(t12.data));
      if (this._getType(t12) !== s4.date) {
        const e14 = this._getOrReturnCtx(t12);
        return y3(e14, { code: c2.invalid_type, expected: s4.date, received: e14.parsedType }), S3;
      }
      if (Number.isNaN(t12.data.getTime())) {
        return y3(this._getOrReturnCtx(t12), { code: c2.invalid_date }), S3;
      }
      const n5 = new _3();
      let a5;
      for (const r3 of this._def.checks)
        "min" === r3.kind ? t12.data.getTime() < r3.value && (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { code: c2.too_small, message: r3.message, inclusive: true, exact: false, minimum: r3.value, type: "date" }), n5.dirty()) : "max" === r3.kind ? t12.data.getTime() > r3.value && (a5 = this._getOrReturnCtx(t12, a5), y3(a5, { code: c2.too_big, message: r3.message, inclusive: true, exact: false, maximum: r3.value, type: "date" }), n5.dirty()) : e5.assertNever(r3);
      return { status: n5.value, value: new Date(t12.data.getTime()) };
    }
    _addCheck(e14) {
      return new t9({ ...this._def, checks: [...this._def.checks, e14] });
    }
    min(e14, t12) {
      return this._addCheck({ kind: "min", value: e14.getTime(), message: v3.toString(t12) });
    }
    max(e14, t12) {
      return this._addCheck({ kind: "max", value: e14.getTime(), message: v3.toString(t12) });
    }
    get minDate() {
      let e14 = null;
      for (const t12 of this._def.checks)
        "min" === t12.kind && (null === e14 || t12.value > e14) && (e14 = t12.value);
      return null != e14 ? new Date(e14) : null;
    }
    get maxDate() {
      let e14 = null;
      for (const t12 of this._def.checks)
        "max" === t12.kind && (null === e14 || t12.value < e14) && (e14 = t12.value);
      return null != e14 ? new Date(e14) : null;
    }
  };
  se.create = (e14) => new se({ checks: [], coerce: (null == e14 ? void 0 : e14.coerce) || false, typeName: Be2.ZodDate, ...O3(e14) });
  var oe2 = class extends E2 {
    _parse(e14) {
      if (this._getType(e14) !== s4.symbol) {
        const t12 = this._getOrReturnCtx(e14);
        return y3(t12, { code: c2.invalid_type, expected: s4.symbol, received: t12.parsedType }), S3;
      }
      return x2(e14.data);
    }
  };
  oe2.create = (e14) => new oe2({ typeName: Be2.ZodSymbol, ...O3(e14) });
  var ce2 = class extends E2 {
    _parse(e14) {
      if (this._getType(e14) !== s4.undefined) {
        const t12 = this._getOrReturnCtx(e14);
        return y3(t12, { code: c2.invalid_type, expected: s4.undefined, received: t12.parsedType }), S3;
      }
      return x2(e14.data);
    }
  };
  ce2.create = (e14) => new ce2({ typeName: Be2.ZodUndefined, ...O3(e14) });
  var de2 = class extends E2 {
    _parse(e14) {
      if (this._getType(e14) !== s4.null) {
        const t12 = this._getOrReturnCtx(e14);
        return y3(t12, { code: c2.invalid_type, expected: s4.null, received: t12.parsedType }), S3;
      }
      return x2(e14.data);
    }
  };
  de2.create = (e14) => new de2({ typeName: Be2.ZodNull, ...O3(e14) });
  var ue2 = class extends E2 {
    constructor() {
      super(...arguments), this._any = true;
    }
    _parse(e14) {
      return x2(e14.data);
    }
  };
  ue2.create = (e14) => new ue2({ typeName: Be2.ZodAny, ...O3(e14) });
  var le2 = class extends E2 {
    constructor() {
      super(...arguments), this._unknown = true;
    }
    _parse(e14) {
      return x2(e14.data);
    }
  };
  le2.create = (e14) => new le2({ typeName: Be2.ZodUnknown, ...O3(e14) });
  var pe2 = class extends E2 {
    _parse(e14) {
      const t12 = this._getOrReturnCtx(e14);
      return y3(t12, { code: c2.invalid_type, expected: s4.never, received: t12.parsedType }), S3;
    }
  };
  pe2.create = (e14) => new pe2({ typeName: Be2.ZodNever, ...O3(e14) });
  var me2 = class extends E2 {
    _parse(e14) {
      if (this._getType(e14) !== s4.undefined) {
        const t12 = this._getOrReturnCtx(e14);
        return y3(t12, { code: c2.invalid_type, expected: s4.void, received: t12.parsedType }), S3;
      }
      return x2(e14.data);
    }
  };
  me2.create = (e14) => new me2({ typeName: Be2.ZodVoid, ...O3(e14) });
  var he2 = class e7 extends E2 {
    _parse(e14) {
      const { ctx: t12, status: n5 } = this._processInputParams(e14), a5 = this._def;
      if (t12.parsedType !== s4.array)
        return y3(t12, { code: c2.invalid_type, expected: s4.array, received: t12.parsedType }), S3;
      if (null !== a5.exactLength) {
        const e15 = t12.data.length > a5.exactLength.value, r4 = t12.data.length < a5.exactLength.value;
        (e15 || r4) && (y3(t12, { code: e15 ? c2.too_big : c2.too_small, minimum: r4 ? a5.exactLength.value : void 0, maximum: e15 ? a5.exactLength.value : void 0, type: "array", inclusive: true, exact: true, message: a5.exactLength.message }), n5.dirty());
      }
      if (null !== a5.minLength && t12.data.length < a5.minLength.value && (y3(t12, { code: c2.too_small, minimum: a5.minLength.value, type: "array", inclusive: true, exact: false, message: a5.minLength.message }), n5.dirty()), null !== a5.maxLength && t12.data.length > a5.maxLength.value && (y3(t12, { code: c2.too_big, maximum: a5.maxLength.value, type: "array", inclusive: true, exact: false, message: a5.maxLength.message }), n5.dirty()), t12.common.async)
        return Promise.all([...t12.data].map((e15, n6) => a5.type._parseAsync(new T3(t12, e15, t12.path, n6)))).then((e15) => _3.mergeArray(n5, e15));
      const r3 = [...t12.data].map((e15, n6) => a5.type._parseSync(new T3(t12, e15, t12.path, n6)));
      return _3.mergeArray(n5, r3);
    }
    get element() {
      return this._def.type;
    }
    min(t12, n5) {
      return new e7({ ...this._def, minLength: { value: t12, message: v3.toString(n5) } });
    }
    max(t12, n5) {
      return new e7({ ...this._def, maxLength: { value: t12, message: v3.toString(n5) } });
    }
    length(t12, n5) {
      return new e7({ ...this._def, exactLength: { value: t12, message: v3.toString(n5) } });
    }
    nonempty(e14) {
      return this.min(1, e14);
    }
  };
  function fe2(e14) {
    if (e14 instanceof ge2) {
      const t12 = {};
      for (const n5 in e14.shape) {
        const a5 = e14.shape[n5];
        t12[n5] = $e2.create(fe2(a5));
      }
      return new ge2({ ...e14._def, shape: () => t12 });
    }
    return e14 instanceof he2 ? new he2({ ...e14._def, type: fe2(e14.element) }) : e14 instanceof $e2 ? $e2.create(fe2(e14.unwrap())) : e14 instanceof Ie ? Ie.create(fe2(e14.unwrap())) : e14 instanceof ke2 ? ke2.create(e14.items.map((e15) => fe2(e15))) : e14;
  }
  he2.create = (e14, t12) => new he2({ type: e14, minLength: null, maxLength: null, exactLength: null, typeName: Be2.ZodArray, ...O3(t12) });
  var ge2 = class t10 extends E2 {
    constructor() {
      super(...arguments), this._cached = null, this.nonstrict = this.passthrough, this.augment = this.extend;
    }
    _getCached() {
      if (null !== this._cached)
        return this._cached;
      const t12 = this._def.shape(), n5 = e5.objectKeys(t12);
      return this._cached = { shape: t12, keys: n5 }, this._cached;
    }
    _parse(e14) {
      if (this._getType(e14) !== s4.object) {
        const t13 = this._getOrReturnCtx(e14);
        return y3(t13, { code: c2.invalid_type, expected: s4.object, received: t13.parsedType }), S3;
      }
      const { status: t12, ctx: n5 } = this._processInputParams(e14), { shape: a5, keys: r3 } = this._getCached(), i4 = [];
      if (!(this._def.catchall instanceof pe2 && "strip" === this._def.unknownKeys))
        for (const e15 in n5.data)
          r3.includes(e15) || i4.push(e15);
      const o4 = [];
      for (const e15 of r3) {
        const t13 = a5[e15], r4 = n5.data[e15];
        o4.push({ key: { status: "valid", value: e15 }, value: t13._parse(new T3(n5, r4, n5.path, e15)), alwaysSet: e15 in n5.data });
      }
      if (this._def.catchall instanceof pe2) {
        const e15 = this._def.unknownKeys;
        if ("passthrough" === e15)
          for (const e16 of i4)
            o4.push({ key: { status: "valid", value: e16 }, value: { status: "valid", value: n5.data[e16] } });
        else if ("strict" === e15)
          i4.length > 0 && (y3(n5, { code: c2.unrecognized_keys, keys: i4 }), t12.dirty());
        else if ("strip" !== e15)
          throw new Error("Internal ZodObject error: invalid unknownKeys value.");
      } else {
        const e15 = this._def.catchall;
        for (const t13 of i4) {
          const a6 = n5.data[t13];
          o4.push({ key: { status: "valid", value: t13 }, value: e15._parse(new T3(n5, a6, n5.path, t13)), alwaysSet: t13 in n5.data });
        }
      }
      return n5.common.async ? Promise.resolve().then(async () => {
        const e15 = [];
        for (const t13 of o4) {
          const n6 = await t13.key, a6 = await t13.value;
          e15.push({ key: n6, value: a6, alwaysSet: t13.alwaysSet });
        }
        return e15;
      }).then((e15) => _3.mergeObjectSync(t12, e15)) : _3.mergeObjectSync(t12, o4);
    }
    get shape() {
      return this._def.shape();
    }
    strict(e14) {
      return v3.errToObj, new t10({ ...this._def, unknownKeys: "strict", ...void 0 !== e14 ? { errorMap: (t12, n5) => {
        var a5, r3, i4, s5;
        const o4 = null != (i4 = null == (r3 = (a5 = this._def).errorMap) ? void 0 : r3.call(a5, t12, n5).message) ? i4 : n5.defaultError;
        return "unrecognized_keys" === t12.code ? { message: null != (s5 = v3.errToObj(e14).message) ? s5 : o4 } : { message: o4 };
      } } : {} });
    }
    strip() {
      return new t10({ ...this._def, unknownKeys: "strip" });
    }
    passthrough() {
      return new t10({ ...this._def, unknownKeys: "passthrough" });
    }
    extend(e14) {
      return new t10({ ...this._def, shape: () => ({ ...this._def.shape(), ...e14 }) });
    }
    merge(e14) {
      return new t10({ unknownKeys: e14._def.unknownKeys, catchall: e14._def.catchall, shape: () => ({ ...this._def.shape(), ...e14._def.shape() }), typeName: Be2.ZodObject });
    }
    setKey(e14, t12) {
      return this.augment({ [e14]: t12 });
    }
    catchall(e14) {
      return new t10({ ...this._def, catchall: e14 });
    }
    pick(n5) {
      const a5 = {};
      for (const t12 of e5.objectKeys(n5))
        n5[t12] && this.shape[t12] && (a5[t12] = this.shape[t12]);
      return new t10({ ...this._def, shape: () => a5 });
    }
    omit(n5) {
      const a5 = {};
      for (const t12 of e5.objectKeys(this.shape))
        n5[t12] || (a5[t12] = this.shape[t12]);
      return new t10({ ...this._def, shape: () => a5 });
    }
    deepPartial() {
      return fe2(this);
    }
    partial(n5) {
      const a5 = {};
      for (const t12 of e5.objectKeys(this.shape)) {
        const e14 = this.shape[t12];
        n5 && !n5[t12] ? a5[t12] = e14 : a5[t12] = e14.optional();
      }
      return new t10({ ...this._def, shape: () => a5 });
    }
    required(n5) {
      const a5 = {};
      for (const t12 of e5.objectKeys(this.shape))
        if (n5 && !n5[t12])
          a5[t12] = this.shape[t12];
        else {
          let e14 = this.shape[t12];
          for (; e14 instanceof $e2; )
            e14 = e14._def.innerType;
          a5[t12] = e14;
        }
      return new t10({ ...this._def, shape: () => a5 });
    }
    keyof() {
      return Ae2(e5.objectKeys(this.shape));
    }
  };
  ge2.create = (e14, t12) => new ge2({ shape: () => e14, unknownKeys: "strip", catchall: pe2.create(), typeName: Be2.ZodObject, ...O3(t12) }), ge2.strictCreate = (e14, t12) => new ge2({ shape: () => e14, unknownKeys: "strict", catchall: pe2.create(), typeName: Be2.ZodObject, ...O3(t12) }), ge2.lazycreate = (e14, t12) => new ge2({ shape: e14, unknownKeys: "strip", catchall: pe2.create(), typeName: Be2.ZodObject, ...O3(t12) });
  var ye2 = class extends E2 {
    _parse(e14) {
      const { ctx: t12 } = this._processInputParams(e14), n5 = this._def.options;
      if (t12.common.async)
        return Promise.all(n5.map(async (e15) => {
          const n6 = { ...t12, common: { ...t12.common, issues: [] }, parent: null };
          return { result: await e15._parseAsync({ data: t12.data, path: t12.path, parent: n6 }), ctx: n6 };
        })).then(function(e15) {
          for (const t13 of e15)
            if ("valid" === t13.result.status)
              return t13.result;
          for (const n7 of e15)
            if ("dirty" === n7.result.status)
              return t12.common.issues.push(...n7.ctx.common.issues), n7.result;
          const n6 = e15.map((e16) => new u2(e16.ctx.common.issues));
          return y3(t12, { code: c2.invalid_union, unionErrors: n6 }), S3;
        });
      {
        let e15;
        const a5 = [];
        for (const r4 of n5) {
          const n6 = { ...t12, common: { ...t12.common, issues: [] }, parent: null }, i4 = r4._parseSync({ data: t12.data, path: t12.path, parent: n6 });
          if ("valid" === i4.status)
            return i4;
          "dirty" !== i4.status || e15 || (e15 = { result: i4, ctx: n6 }), n6.common.issues.length && a5.push(n6.common.issues);
        }
        if (e15)
          return t12.common.issues.push(...e15.ctx.common.issues), e15.result;
        const r3 = a5.map((e16) => new u2(e16));
        return y3(t12, { code: c2.invalid_union, unionErrors: r3 }), S3;
      }
    }
    get options() {
      return this._def.options;
    }
  };
  ye2.create = (e14, t12) => new ye2({ options: e14, typeName: Be2.ZodUnion, ...O3(t12) });
  var ve2 = (t12) => t12 instanceof Pe2 ? ve2(t12.schema) : t12 instanceof Ne2 ? ve2(t12.innerType()) : t12 instanceof Te2 ? [t12.value] : t12 instanceof Oe ? t12.options : t12 instanceof Ce2 ? e5.objectValues(t12.enum) : t12 instanceof Re2 ? ve2(t12._def.innerType) : t12 instanceof ce2 ? [void 0] : t12 instanceof de2 ? [null] : t12 instanceof $e2 ? [void 0, ...ve2(t12.unwrap())] : t12 instanceof Ie ? [null, ...ve2(t12.unwrap())] : t12 instanceof Le2 || t12 instanceof Ue2 ? ve2(t12.unwrap()) : t12 instanceof Me2 ? ve2(t12._def.innerType) : [];
  var be2 = class e8 extends E2 {
    _parse(e14) {
      const { ctx: t12 } = this._processInputParams(e14);
      if (t12.parsedType !== s4.object)
        return y3(t12, { code: c2.invalid_type, expected: s4.object, received: t12.parsedType }), S3;
      const n5 = this.discriminator, a5 = t12.data[n5], r3 = this.optionsMap.get(a5);
      return r3 ? t12.common.async ? r3._parseAsync({ data: t12.data, path: t12.path, parent: t12 }) : r3._parseSync({ data: t12.data, path: t12.path, parent: t12 }) : (y3(t12, { code: c2.invalid_union_discriminator, options: Array.from(this.optionsMap.keys()), path: [n5] }), S3);
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
    static create(t12, n5, a5) {
      const r3 = /* @__PURE__ */ new Map();
      for (const e14 of n5) {
        const n6 = ve2(e14.shape[t12]);
        if (!n6.length)
          throw new Error(`A discriminator value for key \`${t12}\` could not be extracted from all schema options`);
        for (const a6 of n6) {
          if (r3.has(a6))
            throw new Error(`Discriminator property ${String(t12)} has duplicate value ${String(a6)}`);
          r3.set(a6, e14);
        }
      }
      return new e8({ typeName: Be2.ZodDiscriminatedUnion, discriminator: t12, options: n5, optionsMap: r3, ...O3(a5) });
    }
  };
  function _e2(t12, n5) {
    const a5 = o3(t12), r3 = o3(n5);
    if (t12 === n5)
      return { valid: true, data: t12 };
    if (a5 === s4.object && r3 === s4.object) {
      const a6 = e5.objectKeys(n5), r4 = e5.objectKeys(t12).filter((e14) => -1 !== a6.indexOf(e14)), i4 = { ...t12, ...n5 };
      for (const e14 of r4) {
        const a7 = _e2(t12[e14], n5[e14]);
        if (!a7.valid)
          return { valid: false };
        i4[e14] = a7.data;
      }
      return { valid: true, data: i4 };
    }
    if (a5 === s4.array && r3 === s4.array) {
      if (t12.length !== n5.length)
        return { valid: false };
      const e14 = [];
      for (let a6 = 0; a6 < t12.length; a6++) {
        const r4 = _e2(t12[a6], n5[a6]);
        if (!r4.valid)
          return { valid: false };
        e14.push(r4.data);
      }
      return { valid: true, data: e14 };
    }
    return a5 === s4.date && r3 === s4.date && +t12 === +n5 ? { valid: true, data: t12 } : { valid: false };
  }
  var Se2 = class extends E2 {
    _parse(e14) {
      const { status: t12, ctx: n5 } = this._processInputParams(e14), a5 = (e15, a6) => {
        if (w3(e15) || w3(a6))
          return S3;
        const r3 = _e2(e15.value, a6.value);
        return r3.valid ? ((Z2(e15) || Z2(a6)) && t12.dirty(), { status: t12.value, value: r3.data }) : (y3(n5, { code: c2.invalid_intersection_types }), S3);
      };
      return n5.common.async ? Promise.all([this._def.left._parseAsync({ data: n5.data, path: n5.path, parent: n5 }), this._def.right._parseAsync({ data: n5.data, path: n5.path, parent: n5 })]).then(([e15, t13]) => a5(e15, t13)) : a5(this._def.left._parseSync({ data: n5.data, path: n5.path, parent: n5 }), this._def.right._parseSync({ data: n5.data, path: n5.path, parent: n5 }));
    }
  };
  Se2.create = (e14, t12, n5) => new Se2({ left: e14, right: t12, typeName: Be2.ZodIntersection, ...O3(n5) });
  var ke2 = class e9 extends E2 {
    _parse(e14) {
      const { status: t12, ctx: n5 } = this._processInputParams(e14);
      if (n5.parsedType !== s4.array)
        return y3(n5, { code: c2.invalid_type, expected: s4.array, received: n5.parsedType }), S3;
      if (n5.data.length < this._def.items.length)
        return y3(n5, { code: c2.too_small, minimum: this._def.items.length, inclusive: true, exact: false, type: "array" }), S3;
      !this._def.rest && n5.data.length > this._def.items.length && (y3(n5, { code: c2.too_big, maximum: this._def.items.length, inclusive: true, exact: false, type: "array" }), t12.dirty());
      const a5 = [...n5.data].map((e15, t13) => {
        const a6 = this._def.items[t13] || this._def.rest;
        return a6 ? a6._parse(new T3(n5, e15, n5.path, t13)) : null;
      }).filter((e15) => !!e15);
      return n5.common.async ? Promise.all(a5).then((e15) => _3.mergeArray(t12, e15)) : _3.mergeArray(t12, a5);
    }
    get items() {
      return this._def.items;
    }
    rest(t12) {
      return new e9({ ...this._def, rest: t12 });
    }
  };
  ke2.create = (e14, t12) => {
    if (!Array.isArray(e14))
      throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
    return new ke2({ items: e14, typeName: Be2.ZodTuple, rest: null, ...O3(t12) });
  };
  var xe2 = class e10 extends E2 {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(e14) {
      const { status: t12, ctx: n5 } = this._processInputParams(e14);
      if (n5.parsedType !== s4.object)
        return y3(n5, { code: c2.invalid_type, expected: s4.object, received: n5.parsedType }), S3;
      const a5 = [], r3 = this._def.keyType, i4 = this._def.valueType;
      for (const e15 in n5.data)
        a5.push({ key: r3._parse(new T3(n5, e15, n5.path, e15)), value: i4._parse(new T3(n5, n5.data[e15], n5.path, e15)), alwaysSet: e15 in n5.data });
      return n5.common.async ? _3.mergeObjectAsync(t12, a5) : _3.mergeObjectSync(t12, a5);
    }
    get element() {
      return this._def.valueType;
    }
    static create(t12, n5, a5) {
      return new e10(n5 instanceof E2 ? { keyType: t12, valueType: n5, typeName: Be2.ZodRecord, ...O3(a5) } : { keyType: te2.create(), valueType: t12, typeName: Be2.ZodRecord, ...O3(n5) });
    }
  };
  var we2 = class extends E2 {
    get keySchema() {
      return this._def.keyType;
    }
    get valueSchema() {
      return this._def.valueType;
    }
    _parse(e14) {
      const { status: t12, ctx: n5 } = this._processInputParams(e14);
      if (n5.parsedType !== s4.map)
        return y3(n5, { code: c2.invalid_type, expected: s4.map, received: n5.parsedType }), S3;
      const a5 = this._def.keyType, r3 = this._def.valueType, i4 = [...n5.data.entries()].map(([e15, t13], i5) => ({ key: a5._parse(new T3(n5, e15, n5.path, [i5, "key"])), value: r3._parse(new T3(n5, t13, n5.path, [i5, "value"])) }));
      if (n5.common.async) {
        const e15 = /* @__PURE__ */ new Map();
        return Promise.resolve().then(async () => {
          for (const n6 of i4) {
            const a6 = await n6.key, r4 = await n6.value;
            if ("aborted" === a6.status || "aborted" === r4.status)
              return S3;
            "dirty" !== a6.status && "dirty" !== r4.status || t12.dirty(), e15.set(a6.value, r4.value);
          }
          return { status: t12.value, value: e15 };
        });
      }
      {
        const e15 = /* @__PURE__ */ new Map();
        for (const n6 of i4) {
          const a6 = n6.key, r4 = n6.value;
          if ("aborted" === a6.status || "aborted" === r4.status)
            return S3;
          "dirty" !== a6.status && "dirty" !== r4.status || t12.dirty(), e15.set(a6.value, r4.value);
        }
        return { status: t12.value, value: e15 };
      }
    }
  };
  we2.create = (e14, t12, n5) => new we2({ valueType: t12, keyType: e14, typeName: Be2.ZodMap, ...O3(n5) });
  var Ze2 = class e11 extends E2 {
    _parse(e14) {
      const { status: t12, ctx: n5 } = this._processInputParams(e14);
      if (n5.parsedType !== s4.set)
        return y3(n5, { code: c2.invalid_type, expected: s4.set, received: n5.parsedType }), S3;
      const a5 = this._def;
      null !== a5.minSize && n5.data.size < a5.minSize.value && (y3(n5, { code: c2.too_small, minimum: a5.minSize.value, type: "set", inclusive: true, exact: false, message: a5.minSize.message }), t12.dirty()), null !== a5.maxSize && n5.data.size > a5.maxSize.value && (y3(n5, { code: c2.too_big, maximum: a5.maxSize.value, type: "set", inclusive: true, exact: false, message: a5.maxSize.message }), t12.dirty());
      const r3 = this._def.valueType;
      function i4(e15) {
        const n6 = /* @__PURE__ */ new Set();
        for (const a6 of e15) {
          if ("aborted" === a6.status)
            return S3;
          "dirty" === a6.status && t12.dirty(), n6.add(a6.value);
        }
        return { status: t12.value, value: n6 };
      }
      const o4 = [...n5.data.values()].map((e15, t13) => r3._parse(new T3(n5, e15, n5.path, t13)));
      return n5.common.async ? Promise.all(o4).then((e15) => i4(e15)) : i4(o4);
    }
    min(t12, n5) {
      return new e11({ ...this._def, minSize: { value: t12, message: v3.toString(n5) } });
    }
    max(t12, n5) {
      return new e11({ ...this._def, maxSize: { value: t12, message: v3.toString(n5) } });
    }
    size(e14, t12) {
      return this.min(e14, t12).max(e14, t12);
    }
    nonempty(e14) {
      return this.min(1, e14);
    }
  };
  Ze2.create = (e14, t12) => new Ze2({ valueType: e14, minSize: null, maxSize: null, typeName: Be2.ZodSet, ...O3(t12) });
  var je2 = class e12 extends E2 {
    constructor() {
      super(...arguments), this.validate = this.implement;
    }
    _parse(e14) {
      const { ctx: t12 } = this._processInputParams(e14);
      if (t12.parsedType !== s4.function)
        return y3(t12, { code: c2.invalid_type, expected: s4.function, received: t12.parsedType }), S3;
      function n5(e15, n6) {
        return f({ data: e15, path: t12.path, errorMaps: [t12.common.contextualErrorMap, t12.schemaErrorMap, h3(), l2].filter((e16) => !!e16), issueData: { code: c2.invalid_arguments, argumentsError: n6 } });
      }
      function a5(e15, n6) {
        return f({ data: e15, path: t12.path, errorMaps: [t12.common.contextualErrorMap, t12.schemaErrorMap, h3(), l2].filter((e16) => !!e16), issueData: { code: c2.invalid_return_type, returnTypeError: n6 } });
      }
      const r3 = { errorMap: t12.common.contextualErrorMap }, i4 = t12.data;
      if (this._def.returns instanceof Ee2) {
        const e15 = this;
        return x2(async function(...t13) {
          const s5 = new u2([]), o4 = await e15._def.args.parseAsync(t13, r3).catch((e16) => {
            throw s5.addIssue(n5(t13, e16)), s5;
          }), c3 = await Reflect.apply(i4, this, o4);
          return await e15._def.returns._def.type.parseAsync(c3, r3).catch((e16) => {
            throw s5.addIssue(a5(c3, e16)), s5;
          });
        });
      }
      {
        const e15 = this;
        return x2(function(...t13) {
          const s5 = e15._def.args.safeParse(t13, r3);
          if (!s5.success)
            throw new u2([n5(t13, s5.error)]);
          const o4 = Reflect.apply(i4, this, s5.data), c3 = e15._def.returns.safeParse(o4, r3);
          if (!c3.success)
            throw new u2([a5(o4, c3.error)]);
          return c3.data;
        });
      }
    }
    parameters() {
      return this._def.args;
    }
    returnType() {
      return this._def.returns;
    }
    args(...t12) {
      return new e12({ ...this._def, args: ke2.create(t12).rest(le2.create()) });
    }
    returns(t12) {
      return new e12({ ...this._def, returns: t12 });
    }
    implement(e14) {
      return this.parse(e14);
    }
    strictImplement(e14) {
      return this.parse(e14);
    }
    static create(t12, n5, a5) {
      return new e12({ args: t12 || ke2.create([]).rest(le2.create()), returns: n5 || le2.create(), typeName: Be2.ZodFunction, ...O3(a5) });
    }
  };
  var Pe2 = class extends E2 {
    get schema() {
      return this._def.getter();
    }
    _parse(e14) {
      const { ctx: t12 } = this._processInputParams(e14);
      return this._def.getter()._parse({ data: t12.data, path: t12.path, parent: t12 });
    }
  };
  Pe2.create = (e14, t12) => new Pe2({ getter: e14, typeName: Be2.ZodLazy, ...O3(t12) });
  var Te2 = class extends E2 {
    _parse(e14) {
      if (e14.data !== this._def.value) {
        const t12 = this._getOrReturnCtx(e14);
        return y3(t12, { received: t12.data, code: c2.invalid_literal, expected: this._def.value }), S3;
      }
      return { status: "valid", value: e14.data };
    }
    get value() {
      return this._def.value;
    }
  };
  function Ae2(e14, t12) {
    return new Oe({ values: e14, typeName: Be2.ZodEnum, ...O3(t12) });
  }
  Te2.create = (e14, t12) => new Te2({ value: e14, typeName: Be2.ZodLiteral, ...O3(t12) });
  var Oe = class t11 extends E2 {
    _parse(t12) {
      if ("string" != typeof t12.data) {
        const n5 = this._getOrReturnCtx(t12), a5 = this._def.values;
        return y3(n5, { expected: e5.joinValues(a5), received: n5.parsedType, code: c2.invalid_type }), S3;
      }
      if (this._cache || (this._cache = new Set(this._def.values)), !this._cache.has(t12.data)) {
        const e14 = this._getOrReturnCtx(t12), n5 = this._def.values;
        return y3(e14, { received: e14.data, code: c2.invalid_enum_value, options: n5 }), S3;
      }
      return x2(t12.data);
    }
    get options() {
      return this._def.values;
    }
    get enum() {
      const e14 = {};
      for (const t12 of this._def.values)
        e14[t12] = t12;
      return e14;
    }
    get Values() {
      const e14 = {};
      for (const t12 of this._def.values)
        e14[t12] = t12;
      return e14;
    }
    get Enum() {
      const e14 = {};
      for (const t12 of this._def.values)
        e14[t12] = t12;
      return e14;
    }
    extract(e14, n5 = this._def) {
      return t11.create(e14, { ...this._def, ...n5 });
    }
    exclude(e14, n5 = this._def) {
      return t11.create(this.options.filter((t12) => !e14.includes(t12)), { ...this._def, ...n5 });
    }
  };
  Oe.create = Ae2;
  var Ce2 = class extends E2 {
    _parse(t12) {
      const n5 = e5.getValidEnumValues(this._def.values), a5 = this._getOrReturnCtx(t12);
      if (a5.parsedType !== s4.string && a5.parsedType !== s4.number) {
        const t13 = e5.objectValues(n5);
        return y3(a5, { expected: e5.joinValues(t13), received: a5.parsedType, code: c2.invalid_type }), S3;
      }
      if (this._cache || (this._cache = new Set(e5.getValidEnumValues(this._def.values))), !this._cache.has(t12.data)) {
        const t13 = e5.objectValues(n5);
        return y3(a5, { received: a5.data, code: c2.invalid_enum_value, options: t13 }), S3;
      }
      return x2(t12.data);
    }
    get enum() {
      return this._def.values;
    }
  };
  Ce2.create = (e14, t12) => new Ce2({ values: e14, typeName: Be2.ZodNativeEnum, ...O3(t12) });
  var Ee2 = class extends E2 {
    unwrap() {
      return this._def.type;
    }
    _parse(e14) {
      const { ctx: t12 } = this._processInputParams(e14);
      if (t12.parsedType !== s4.promise && false === t12.common.async)
        return y3(t12, { code: c2.invalid_type, expected: s4.promise, received: t12.parsedType }), S3;
      const n5 = t12.parsedType === s4.promise ? t12.data : Promise.resolve(t12.data);
      return x2(n5.then((e15) => this._def.type.parseAsync(e15, { path: t12.path, errorMap: t12.common.contextualErrorMap })));
    }
  };
  Ee2.create = (e14, t12) => new Ee2({ type: e14, typeName: Be2.ZodPromise, ...O3(t12) });
  var Ne2 = class extends E2 {
    innerType() {
      return this._def.schema;
    }
    sourceType() {
      return this._def.schema._def.typeName === Be2.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
    }
    _parse(t12) {
      const { status: n5, ctx: a5 } = this._processInputParams(t12), r3 = this._def.effect || null, i4 = { addIssue: (e14) => {
        y3(a5, e14), e14.fatal ? n5.abort() : n5.dirty();
      }, get path() {
        return a5.path;
      } };
      if (i4.addIssue = i4.addIssue.bind(i4), "preprocess" === r3.type) {
        const e14 = r3.transform(a5.data, i4);
        if (a5.common.async)
          return Promise.resolve(e14).then(async (e15) => {
            if ("aborted" === n5.value)
              return S3;
            const t13 = await this._def.schema._parseAsync({ data: e15, path: a5.path, parent: a5 });
            return "aborted" === t13.status ? S3 : "dirty" === t13.status || "dirty" === n5.value ? k2(t13.value) : t13;
          });
        {
          if ("aborted" === n5.value)
            return S3;
          const t13 = this._def.schema._parseSync({ data: e14, path: a5.path, parent: a5 });
          return "aborted" === t13.status ? S3 : "dirty" === t13.status || "dirty" === n5.value ? k2(t13.value) : t13;
        }
      }
      if ("refinement" === r3.type) {
        const e14 = (e15) => {
          const t13 = r3.refinement(e15, i4);
          if (a5.common.async)
            return Promise.resolve(t13);
          if (t13 instanceof Promise)
            throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
          return e15;
        };
        if (false === a5.common.async) {
          const t13 = this._def.schema._parseSync({ data: a5.data, path: a5.path, parent: a5 });
          return "aborted" === t13.status ? S3 : ("dirty" === t13.status && n5.dirty(), e14(t13.value), { status: n5.value, value: t13.value });
        }
        return this._def.schema._parseAsync({ data: a5.data, path: a5.path, parent: a5 }).then((t13) => "aborted" === t13.status ? S3 : ("dirty" === t13.status && n5.dirty(), e14(t13.value).then(() => ({ status: n5.value, value: t13.value }))));
      }
      if ("transform" === r3.type) {
        if (false === a5.common.async) {
          const e14 = this._def.schema._parseSync({ data: a5.data, path: a5.path, parent: a5 });
          if (!j2(e14))
            return S3;
          const t13 = r3.transform(e14.value, i4);
          if (t13 instanceof Promise)
            throw new Error("Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.");
          return { status: n5.value, value: t13 };
        }
        return this._def.schema._parseAsync({ data: a5.data, path: a5.path, parent: a5 }).then((e14) => j2(e14) ? Promise.resolve(r3.transform(e14.value, i4)).then((e15) => ({ status: n5.value, value: e15 })) : S3);
      }
      e5.assertNever(r3);
    }
  };
  Ne2.create = (e14, t12, n5) => new Ne2({ schema: e14, typeName: Be2.ZodEffects, effect: t12, ...O3(n5) }), Ne2.createWithPreprocess = (e14, t12, n5) => new Ne2({ schema: t12, effect: { type: "preprocess", transform: e14 }, typeName: Be2.ZodEffects, ...O3(n5) });
  var $e2 = class extends E2 {
    _parse(e14) {
      return this._getType(e14) === s4.undefined ? x2(void 0) : this._def.innerType._parse(e14);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  $e2.create = (e14, t12) => new $e2({ innerType: e14, typeName: Be2.ZodOptional, ...O3(t12) });
  var Ie = class extends E2 {
    _parse(e14) {
      return this._getType(e14) === s4.null ? x2(null) : this._def.innerType._parse(e14);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  Ie.create = (e14, t12) => new Ie({ innerType: e14, typeName: Be2.ZodNullable, ...O3(t12) });
  var Re2 = class extends E2 {
    _parse(e14) {
      const { ctx: t12 } = this._processInputParams(e14);
      let n5 = t12.data;
      return t12.parsedType === s4.undefined && (n5 = this._def.defaultValue()), this._def.innerType._parse({ data: n5, path: t12.path, parent: t12 });
    }
    removeDefault() {
      return this._def.innerType;
    }
  };
  Re2.create = (e14, t12) => new Re2({ innerType: e14, typeName: Be2.ZodDefault, defaultValue: "function" == typeof t12.default ? t12.default : () => t12.default, ...O3(t12) });
  var Me2 = class extends E2 {
    _parse(e14) {
      const { ctx: t12 } = this._processInputParams(e14), n5 = { ...t12, common: { ...t12.common, issues: [] } }, a5 = this._def.innerType._parse({ data: n5.data, path: n5.path, parent: { ...n5 } });
      return P2(a5) ? a5.then((e15) => ({ status: "valid", value: "valid" === e15.status ? e15.value : this._def.catchValue({ get error() {
        return new u2(n5.common.issues);
      }, input: n5.data }) })) : { status: "valid", value: "valid" === a5.status ? a5.value : this._def.catchValue({ get error() {
        return new u2(n5.common.issues);
      }, input: n5.data }) };
    }
    removeCatch() {
      return this._def.innerType;
    }
  };
  Me2.create = (e14, t12) => new Me2({ innerType: e14, typeName: Be2.ZodCatch, catchValue: "function" == typeof t12.catch ? t12.catch : () => t12.catch, ...O3(t12) });
  var ze2 = class extends E2 {
    _parse(e14) {
      if (this._getType(e14) !== s4.nan) {
        const t12 = this._getOrReturnCtx(e14);
        return y3(t12, { code: c2.invalid_type, expected: s4.nan, received: t12.parsedType }), S3;
      }
      return { status: "valid", value: e14.data };
    }
  };
  ze2.create = (e14) => new ze2({ typeName: Be2.ZodNaN, ...O3(e14) });
  var De2 = Symbol("zod_brand");
  var Le2 = class extends E2 {
    _parse(e14) {
      const { ctx: t12 } = this._processInputParams(e14), n5 = t12.data;
      return this._def.type._parse({ data: n5, path: t12.path, parent: t12 });
    }
    unwrap() {
      return this._def.type;
    }
  };
  var Fe2 = class e13 extends E2 {
    _parse(e14) {
      const { status: t12, ctx: n5 } = this._processInputParams(e14);
      if (n5.common.async) {
        return (async () => {
          const e15 = await this._def.in._parseAsync({ data: n5.data, path: n5.path, parent: n5 });
          return "aborted" === e15.status ? S3 : "dirty" === e15.status ? (t12.dirty(), k2(e15.value)) : this._def.out._parseAsync({ data: e15.value, path: n5.path, parent: n5 });
        })();
      }
      {
        const e15 = this._def.in._parseSync({ data: n5.data, path: n5.path, parent: n5 });
        return "aborted" === e15.status ? S3 : "dirty" === e15.status ? (t12.dirty(), { status: "dirty", value: e15.value }) : this._def.out._parseSync({ data: e15.value, path: n5.path, parent: n5 });
      }
    }
    static create(t12, n5) {
      return new e13({ in: t12, out: n5, typeName: Be2.ZodPipeline });
    }
  };
  var Ue2 = class extends E2 {
    _parse(e14) {
      const t12 = this._def.innerType._parse(e14), n5 = (e15) => (j2(e15) && (e15.value = Object.freeze(e15.value)), e15);
      return P2(t12) ? t12.then((e15) => n5(e15)) : n5(t12);
    }
    unwrap() {
      return this._def.innerType;
    }
  };
  function Je2(e14, t12) {
    const n5 = "function" == typeof e14 ? e14(t12) : "string" == typeof e14 ? { message: e14 } : e14;
    return "string" == typeof n5 ? { message: n5 } : n5;
  }
  function Ve2(e14, t12 = {}, n5) {
    return e14 ? ue2.create().superRefine((a5, r3) => {
      var i4, s5;
      const o4 = e14(a5);
      if (o4 instanceof Promise)
        return o4.then((e15) => {
          var i5, s6;
          if (!e15) {
            const e16 = Je2(t12, a5), o5 = null == (s6 = null != (i5 = e16.fatal) ? i5 : n5) || s6;
            r3.addIssue({ code: "custom", ...e16, fatal: o5 });
          }
        });
      if (!o4) {
        const e15 = Je2(t12, a5), o5 = null == (s5 = null != (i4 = e15.fatal) ? i4 : n5) || s5;
        r3.addIssue({ code: "custom", ...e15, fatal: o5 });
      }
    }) : ue2.create();
  }
  Ue2.create = (e14, t12) => new Ue2({ innerType: e14, typeName: Be2.ZodReadonly, ...O3(t12) });
  var Be2;
  var qe2;
  var We2 = { object: ge2.lazycreate };
  (qe2 = Be2 || (Be2 = {})).ZodString = "ZodString", qe2.ZodNumber = "ZodNumber", qe2.ZodNaN = "ZodNaN", qe2.ZodBigInt = "ZodBigInt", qe2.ZodBoolean = "ZodBoolean", qe2.ZodDate = "ZodDate", qe2.ZodSymbol = "ZodSymbol", qe2.ZodUndefined = "ZodUndefined", qe2.ZodNull = "ZodNull", qe2.ZodAny = "ZodAny", qe2.ZodUnknown = "ZodUnknown", qe2.ZodNever = "ZodNever", qe2.ZodVoid = "ZodVoid", qe2.ZodArray = "ZodArray", qe2.ZodObject = "ZodObject", qe2.ZodUnion = "ZodUnion", qe2.ZodDiscriminatedUnion = "ZodDiscriminatedUnion", qe2.ZodIntersection = "ZodIntersection", qe2.ZodTuple = "ZodTuple", qe2.ZodRecord = "ZodRecord", qe2.ZodMap = "ZodMap", qe2.ZodSet = "ZodSet", qe2.ZodFunction = "ZodFunction", qe2.ZodLazy = "ZodLazy", qe2.ZodLiteral = "ZodLiteral", qe2.ZodEnum = "ZodEnum", qe2.ZodEffects = "ZodEffects", qe2.ZodNativeEnum = "ZodNativeEnum", qe2.ZodOptional = "ZodOptional", qe2.ZodNullable = "ZodNullable", qe2.ZodDefault = "ZodDefault", qe2.ZodCatch = "ZodCatch", qe2.ZodPromise = "ZodPromise", qe2.ZodBranded = "ZodBranded", qe2.ZodPipeline = "ZodPipeline", qe2.ZodReadonly = "ZodReadonly";
  var Ke2 = (e14, t12 = { message: `Input not instance of ${e14.name}` }) => Ve2((t13) => t13 instanceof e14, t12);
  var He2 = te2.create;
  var Ge2 = ae.create;
  var Ye2 = ze2.create;
  var Qe2 = re2.create;
  var Xe2 = ie2.create;
  var et = se.create;
  var tt = oe2.create;
  var nt2 = ce2.create;
  var at2 = de2.create;
  var rt2 = ue2.create;
  var it2 = le2.create;
  var st2 = pe2.create;
  var ot2 = me2.create;
  var ct2 = he2.create;
  var dt2 = ge2.create;
  var ut2 = ge2.strictCreate;
  var lt2 = ye2.create;
  var pt2 = be2.create;
  var mt2 = Se2.create;
  var ht2 = ke2.create;
  var ft2 = xe2.create;
  var gt2 = we2.create;
  var yt2 = Ze2.create;
  var vt2 = je2.create;
  var bt2 = Pe2.create;
  var _t = Te2.create;
  var St2 = Oe.create;
  var kt2 = Ce2.create;
  var xt2 = Ee2.create;
  var wt2 = Ne2.create;
  var Zt2 = $e2.create;
  var jt2 = Ie.create;
  var Pt2 = Ne2.createWithPreprocess;
  var Tt2 = Fe2.create;
  var At2 = () => He2().optional();
  var Ot2 = () => Ge2().optional();
  var Ct2 = () => Xe2().optional();
  var Et2 = { string: (e14) => te2.create({ ...e14, coerce: true }), number: (e14) => ae.create({ ...e14, coerce: true }), boolean: (e14) => ie2.create({ ...e14, coerce: true }), bigint: (e14) => re2.create({ ...e14, coerce: true }), date: (e14) => se.create({ ...e14, coerce: true }) };
  var Nt2 = S3;
  var $t2 = Symbol("Let zodToJsonSchema decide on which parser to use");
  var It2 = { name: void 0, $refStrategy: "root", basePath: ["#"], effectStrategy: "input", pipeStrategy: "all", dateStrategy: "format:date-time", mapStrategy: "entries", removeAdditionalStrategy: "passthrough", allowedAdditionalProperties: true, rejectedAdditionalProperties: false, definitionPath: "definitions", target: "jsonSchema7", strictUnions: false, definitions: {}, errorMessages: false, markdownDescription: false, patternStrategy: "escape", applyRegexFlags: false, emailStrategy: "format:email", base64Strategy: "contentEncoding:base64", nameStrategy: "ref", openAiAnyTypeName: "OpenAiAnyType" };
  var Rt2 = (e14) => {
    const t12 = ((e15) => "string" == typeof e15 ? { ...It2, name: e15 } : { ...It2, ...e15 })(e14), n5 = void 0 !== t12.name ? [...t12.basePath, t12.definitionPath, t12.name] : t12.basePath;
    return { ...t12, flags: { hasReferencedOpenAiAnyType: false }, currentPath: n5, propertyPath: void 0, seen: new Map(Object.entries(t12.definitions).map(([e15, n6]) => [n6._def, { def: n6._def, path: [...t12.basePath, t12.definitionPath, e15], jsonSchema: void 0 }])) };
  };
  function Mt2(e14, t12, n5, a5) {
    (null == a5 ? void 0 : a5.errorMessages) && n5 && (e14.errorMessage = { ...e14.errorMessage, [t12]: n5 });
  }
  function zt(e14, t12, n5, a5, r3) {
    e14[t12] = n5, Mt2(e14, t12, a5, r3);
  }
  var Dt = (e14, t12) => {
    let n5 = 0;
    for (; n5 < e14.length && n5 < t12.length && e14[n5] === t12[n5]; n5++)
      ;
    return [(e14.length - n5).toString(), ...t12.slice(n5)].join("/");
  };
  function Lt2(e14) {
    if ("openAi" !== e14.target)
      return {};
    const t12 = [...e14.basePath, e14.definitionPath, e14.openAiAnyTypeName];
    return e14.flags.hasReferencedOpenAiAnyType = true, { $ref: "relative" === e14.$refStrategy ? Dt(t12, e14.currentPath) : t12.join("/") };
  }
  function Ft2(e14, t12) {
    return fn(e14.type._def, t12);
  }
  function Ut2(e14, t12, n5) {
    const a5 = null != n5 ? n5 : t12.dateStrategy;
    if (Array.isArray(a5))
      return { anyOf: a5.map((n6, a6) => Ut2(e14, t12, n6)) };
    switch (a5) {
      case "string":
      case "format:date-time":
        return { type: "string", format: "date-time" };
      case "format:date":
        return { type: "string", format: "date" };
      case "integer":
        return Jt2(e14, t12);
    }
  }
  var Jt2 = (e14, t12) => {
    const n5 = { type: "integer", format: "unix-time" };
    if ("openApi3" === t12.target)
      return n5;
    for (const a5 of e14.checks)
      switch (a5.kind) {
        case "min":
          zt(n5, "minimum", a5.value, a5.message, t12);
          break;
        case "max":
          zt(n5, "maximum", a5.value, a5.message, t12);
      }
    return n5;
  };
  var Vt2 = void 0;
  var Bt2 = /^[cC][^\s-]{8,}$/;
  var qt2 = /^[0-9a-z]+$/;
  var Wt2 = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  var Kt2 = /^(?!\.)(?!.*\.\.)([a-zA-Z0-9_'+\-\.]*)[a-zA-Z0-9_+-]@([a-zA-Z0-9][a-zA-Z0-9\-]*\.)+[a-zA-Z]{2,}$/;
  var Ht = () => (void 0 === Vt2 && (Vt2 = RegExp("^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$", "u")), Vt2);
  var Gt2 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
  var Yt2 = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
  var Qt2 = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
  var Xt2 = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
  var en2 = /^[a-zA-Z0-9_-]{21}$/;
  var tn2 = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
  function nn2(e14, t12) {
    const n5 = { type: "string" };
    if (e14.checks)
      for (const a5 of e14.checks)
        switch (a5.kind) {
          case "min":
            zt(n5, "minLength", "number" == typeof n5.minLength ? Math.max(n5.minLength, a5.value) : a5.value, a5.message, t12);
            break;
          case "max":
            zt(n5, "maxLength", "number" == typeof n5.maxLength ? Math.min(n5.maxLength, a5.value) : a5.value, a5.message, t12);
            break;
          case "email":
            switch (t12.emailStrategy) {
              case "format:email":
                sn(n5, "email", a5.message, t12);
                break;
              case "format:idn-email":
                sn(n5, "idn-email", a5.message, t12);
                break;
              case "pattern:zod":
                on2(n5, Kt2, a5.message, t12);
            }
            break;
          case "url":
            sn(n5, "uri", a5.message, t12);
            break;
          case "uuid":
            sn(n5, "uuid", a5.message, t12);
            break;
          case "regex":
            on2(n5, a5.regex, a5.message, t12);
            break;
          case "cuid":
            on2(n5, Bt2, a5.message, t12);
            break;
          case "cuid2":
            on2(n5, qt2, a5.message, t12);
            break;
          case "startsWith":
            on2(n5, RegExp(`^${an2(a5.value, t12)}`), a5.message, t12);
            break;
          case "endsWith":
            on2(n5, RegExp(`${an2(a5.value, t12)}$`), a5.message, t12);
            break;
          case "datetime":
            sn(n5, "date-time", a5.message, t12);
            break;
          case "date":
            sn(n5, "date", a5.message, t12);
            break;
          case "time":
            sn(n5, "time", a5.message, t12);
            break;
          case "duration":
            sn(n5, "duration", a5.message, t12);
            break;
          case "length":
            zt(n5, "minLength", "number" == typeof n5.minLength ? Math.max(n5.minLength, a5.value) : a5.value, a5.message, t12), zt(n5, "maxLength", "number" == typeof n5.maxLength ? Math.min(n5.maxLength, a5.value) : a5.value, a5.message, t12);
            break;
          case "includes":
            on2(n5, RegExp(an2(a5.value, t12)), a5.message, t12);
            break;
          case "ip":
            "v6" !== a5.version && sn(n5, "ipv4", a5.message, t12), "v4" !== a5.version && sn(n5, "ipv6", a5.message, t12);
            break;
          case "base64url":
            on2(n5, Xt2, a5.message, t12);
            break;
          case "jwt":
            on2(n5, tn2, a5.message, t12);
            break;
          case "cidr":
            "v6" !== a5.version && on2(n5, Gt2, a5.message, t12), "v4" !== a5.version && on2(n5, Yt2, a5.message, t12);
            break;
          case "emoji":
            on2(n5, Ht(), a5.message, t12);
            break;
          case "ulid":
            on2(n5, Wt2, a5.message, t12);
            break;
          case "base64":
            switch (t12.base64Strategy) {
              case "format:binary":
                sn(n5, "binary", a5.message, t12);
                break;
              case "contentEncoding:base64":
                zt(n5, "contentEncoding", "base64", a5.message, t12);
                break;
              case "pattern:zod":
                on2(n5, Qt2, a5.message, t12);
            }
            break;
          case "nanoid":
            on2(n5, en2, a5.message, t12);
        }
    return n5;
  }
  function an2(e14, t12) {
    return "escape" === t12.patternStrategy ? function(e15) {
      let t13 = "";
      for (let n5 = 0; n5 < e15.length; n5++)
        rn2.has(e15[n5]) || (t13 += "\\"), t13 += e15[n5];
      return t13;
    }(e14) : e14;
  }
  var rn2 = new Set("ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvxyz0123456789");
  function sn(e14, t12, n5, a5) {
    var r3;
    e14.format || (null == (r3 = e14.anyOf) ? void 0 : r3.some((e15) => e15.format)) ? (e14.anyOf || (e14.anyOf = []), e14.format && (e14.anyOf.push({ format: e14.format, ...e14.errorMessage && a5.errorMessages && { errorMessage: { format: e14.errorMessage.format } } }), delete e14.format, e14.errorMessage && (delete e14.errorMessage.format, 0 === Object.keys(e14.errorMessage).length && delete e14.errorMessage)), e14.anyOf.push({ format: t12, ...n5 && a5.errorMessages && { errorMessage: { format: n5 } } })) : zt(e14, "format", t12, n5, a5);
  }
  function on2(e14, t12, n5, a5) {
    var r3;
    e14.pattern || (null == (r3 = e14.allOf) ? void 0 : r3.some((e15) => e15.pattern)) ? (e14.allOf || (e14.allOf = []), e14.pattern && (e14.allOf.push({ pattern: e14.pattern, ...e14.errorMessage && a5.errorMessages && { errorMessage: { pattern: e14.errorMessage.pattern } } }), delete e14.pattern, e14.errorMessage && (delete e14.errorMessage.pattern, 0 === Object.keys(e14.errorMessage).length && delete e14.errorMessage)), e14.allOf.push({ pattern: cn(t12, a5), ...n5 && a5.errorMessages && { errorMessage: { pattern: n5 } } })) : zt(e14, "pattern", cn(t12, a5), n5, a5);
  }
  function cn(e14, t12) {
    var n5;
    if (!t12.applyRegexFlags || !e14.flags)
      return e14.source;
    const a5 = e14.flags.includes("i"), r3 = e14.flags.includes("m"), i4 = e14.flags.includes("s"), s5 = a5 ? e14.source.toLowerCase() : e14.source;
    let o4 = "", c3 = false, d2 = false, u3 = false;
    for (let e15 = 0; e15 < s5.length; e15++)
      if (c3)
        o4 += s5[e15], c3 = false;
      else {
        if (a5) {
          if (d2) {
            if (s5[e15].match(/[a-z]/)) {
              u3 ? (o4 += s5[e15], o4 += `${s5[e15 - 2]}-${s5[e15]}`.toUpperCase(), u3 = false) : "-" === s5[e15 + 1] && (null == (n5 = s5[e15 + 2]) ? void 0 : n5.match(/[a-z]/)) ? (o4 += s5[e15], u3 = true) : o4 += `${s5[e15]}${s5[e15].toUpperCase()}`;
              continue;
            }
          } else if (s5[e15].match(/[a-z]/)) {
            o4 += `[${s5[e15]}${s5[e15].toUpperCase()}]`;
            continue;
          }
        }
        if (r3) {
          if ("^" === s5[e15]) {
            o4 += "(^|(?<=[\r\n]))";
            continue;
          }
          if ("$" === s5[e15]) {
            o4 += "($|(?=[\r\n]))";
            continue;
          }
        }
        i4 && "." === s5[e15] ? o4 += d2 ? `${s5[e15]}\r
` : `[${s5[e15]}\r
]` : (o4 += s5[e15], "\\" === s5[e15] ? c3 = true : d2 && "]" === s5[e15] ? d2 = false : d2 || "[" !== s5[e15] || (d2 = true));
      }
    try {
      new RegExp(o4);
    } catch (n6) {
      return console.warn(`Could not convert regex pattern at ${t12.currentPath.join("/")} to a flag-independent form! Falling back to the flag-ignorant source`), e14.source;
    }
    return o4;
  }
  function dn(e14, t12) {
    var n5, a5, r3, i4, s5, o4, c3;
    if ("openAi" === t12.target && console.warn("Warning: OpenAI may not support records in schemas! Try an array of key-value pairs instead."), "openApi3" === t12.target && (null == (n5 = e14.keyType) ? void 0 : n5._def.typeName) === Be2.ZodEnum)
      return { type: "object", required: e14.keyType._def.values, properties: e14.keyType._def.values.reduce((n6, a6) => {
        var r4;
        return { ...n6, [a6]: null != (r4 = fn(e14.valueType._def, { ...t12, currentPath: [...t12.currentPath, "properties", a6] })) ? r4 : Lt2(t12) };
      }, {}), additionalProperties: t12.rejectedAdditionalProperties };
    const d2 = { type: "object", additionalProperties: null != (a5 = fn(e14.valueType._def, { ...t12, currentPath: [...t12.currentPath, "additionalProperties"] })) ? a5 : t12.allowedAdditionalProperties };
    if ("openApi3" === t12.target)
      return d2;
    if ((null == (r3 = e14.keyType) ? void 0 : r3._def.typeName) === Be2.ZodString && (null == (i4 = e14.keyType._def.checks) ? void 0 : i4.length)) {
      const { type: n6, ...a6 } = nn2(e14.keyType._def, t12);
      return { ...d2, propertyNames: a6 };
    }
    if ((null == (s5 = e14.keyType) ? void 0 : s5._def.typeName) === Be2.ZodEnum)
      return { ...d2, propertyNames: { enum: e14.keyType._def.values } };
    if ((null == (o4 = e14.keyType) ? void 0 : o4._def.typeName) === Be2.ZodBranded && e14.keyType._def.type._def.typeName === Be2.ZodString && (null == (c3 = e14.keyType._def.type._def.checks) ? void 0 : c3.length)) {
      const { type: n6, ...a6 } = Ft2(e14.keyType._def, t12);
      return { ...d2, propertyNames: a6 };
    }
    return d2;
  }
  var un = { ZodString: "string", ZodNumber: "number", ZodBigInt: "integer", ZodBoolean: "boolean", ZodNull: "null" };
  var ln = (e14, t12) => {
    const n5 = (e14.options instanceof Map ? Array.from(e14.options.values()) : e14.options).map((e15, n6) => fn(e15._def, { ...t12, currentPath: [...t12.currentPath, "anyOf", `${n6}`] })).filter((e15) => !!e15 && (!t12.strictUnions || "object" == typeof e15 && Object.keys(e15).length > 0));
    return n5.length ? { anyOf: n5 } : void 0;
  };
  function pn(e14, t12) {
    const n5 = "openAi" === t12.target, a5 = { type: "object", properties: {} }, r3 = [], i4 = e14.shape();
    for (const e15 in i4) {
      let s6 = i4[e15];
      if (void 0 === s6 || void 0 === s6._def)
        continue;
      let o4 = mn(s6);
      o4 && n5 && ("ZodOptional" === s6._def.typeName && (s6 = s6._def.innerType), s6.isNullable() || (s6 = s6.nullable()), o4 = false);
      const c3 = fn(s6._def, { ...t12, currentPath: [...t12.currentPath, "properties", e15], propertyPath: [...t12.currentPath, "properties", e15] });
      void 0 !== c3 && (a5.properties[e15] = c3, o4 || r3.push(e15));
    }
    r3.length && (a5.required = r3);
    const s5 = function(e15, t13) {
      if ("ZodNever" !== e15.catchall._def.typeName)
        return fn(e15.catchall._def, { ...t13, currentPath: [...t13.currentPath, "additionalProperties"] });
      switch (e15.unknownKeys) {
        case "passthrough":
          return t13.allowedAdditionalProperties;
        case "strict":
          return t13.rejectedAdditionalProperties;
        case "strip":
          return "strict" === t13.removeAdditionalStrategy ? t13.allowedAdditionalProperties : t13.rejectedAdditionalProperties;
      }
    }(e14, t12);
    return void 0 !== s5 && (a5.additionalProperties = s5), a5;
  }
  function mn(e14) {
    try {
      return e14.isOptional();
    } catch (e15) {
      return true;
    }
  }
  var hn2 = (e14, t12, n5) => {
    switch (t12) {
      case Be2.ZodString:
        return nn2(e14, n5);
      case Be2.ZodNumber:
        return function(e15, t13) {
          const n6 = { type: "number" };
          if (!e15.checks)
            return n6;
          for (const a5 of e15.checks)
            switch (a5.kind) {
              case "int":
                n6.type = "integer", Mt2(n6, "type", a5.message, t13);
                break;
              case "min":
                "jsonSchema7" === t13.target ? a5.inclusive ? zt(n6, "minimum", a5.value, a5.message, t13) : zt(n6, "exclusiveMinimum", a5.value, a5.message, t13) : (a5.inclusive || (n6.exclusiveMinimum = true), zt(n6, "minimum", a5.value, a5.message, t13));
                break;
              case "max":
                "jsonSchema7" === t13.target ? a5.inclusive ? zt(n6, "maximum", a5.value, a5.message, t13) : zt(n6, "exclusiveMaximum", a5.value, a5.message, t13) : (a5.inclusive || (n6.exclusiveMaximum = true), zt(n6, "maximum", a5.value, a5.message, t13));
                break;
              case "multipleOf":
                zt(n6, "multipleOf", a5.value, a5.message, t13);
            }
          return n6;
        }(e14, n5);
      case Be2.ZodObject:
        return pn(e14, n5);
      case Be2.ZodBigInt:
        return function(e15, t13) {
          const n6 = { type: "integer", format: "int64" };
          if (!e15.checks)
            return n6;
          for (const a5 of e15.checks)
            switch (a5.kind) {
              case "min":
                "jsonSchema7" === t13.target ? a5.inclusive ? zt(n6, "minimum", a5.value, a5.message, t13) : zt(n6, "exclusiveMinimum", a5.value, a5.message, t13) : (a5.inclusive || (n6.exclusiveMinimum = true), zt(n6, "minimum", a5.value, a5.message, t13));
                break;
              case "max":
                "jsonSchema7" === t13.target ? a5.inclusive ? zt(n6, "maximum", a5.value, a5.message, t13) : zt(n6, "exclusiveMaximum", a5.value, a5.message, t13) : (a5.inclusive || (n6.exclusiveMaximum = true), zt(n6, "maximum", a5.value, a5.message, t13));
                break;
              case "multipleOf":
                zt(n6, "multipleOf", a5.value, a5.message, t13);
            }
          return n6;
        }(e14, n5);
      case Be2.ZodBoolean:
        return { type: "boolean" };
      case Be2.ZodDate:
        return Ut2(e14, n5);
      case Be2.ZodUndefined:
        return function(e15) {
          return { not: Lt2(e15) };
        }(n5);
      case Be2.ZodNull:
        return function(e15) {
          return "openApi3" === e15.target ? { enum: ["null"], nullable: true } : { type: "null" };
        }(n5);
      case Be2.ZodArray:
        return function(e15, t13) {
          var n6, a5, r3;
          const i4 = { type: "array" };
          return (null == (n6 = e15.type) ? void 0 : n6._def) && (null == (r3 = null == (a5 = e15.type) ? void 0 : a5._def) ? void 0 : r3.typeName) !== Be2.ZodAny && (i4.items = fn(e15.type._def, { ...t13, currentPath: [...t13.currentPath, "items"] })), e15.minLength && zt(i4, "minItems", e15.minLength.value, e15.minLength.message, t13), e15.maxLength && zt(i4, "maxItems", e15.maxLength.value, e15.maxLength.message, t13), e15.exactLength && (zt(i4, "minItems", e15.exactLength.value, e15.exactLength.message, t13), zt(i4, "maxItems", e15.exactLength.value, e15.exactLength.message, t13)), i4;
        }(e14, n5);
      case Be2.ZodUnion:
      case Be2.ZodDiscriminatedUnion:
        return function(e15, t13) {
          if ("openApi3" === t13.target)
            return ln(e15, t13);
          const n6 = e15.options instanceof Map ? Array.from(e15.options.values()) : e15.options;
          if (n6.every((e16) => e16._def.typeName in un && (!e16._def.checks || !e16._def.checks.length))) {
            const e16 = n6.reduce((e17, t14) => {
              const n7 = un[t14._def.typeName];
              return n7 && !e17.includes(n7) ? [...e17, n7] : e17;
            }, []);
            return { type: e16.length > 1 ? e16 : e16[0] };
          }
          if (n6.every((e16) => "ZodLiteral" === e16._def.typeName && !e16.description)) {
            const e16 = n6.reduce((e17, t14) => {
              const n7 = typeof t14._def.value;
              switch (n7) {
                case "string":
                case "number":
                case "boolean":
                  return [...e17, n7];
                case "bigint":
                  return [...e17, "integer"];
                case "object":
                  if (null === t14._def.value)
                    return [...e17, "null"];
                default:
                  return e17;
              }
            }, []);
            if (e16.length === n6.length) {
              const t14 = e16.filter((e17, t15, n7) => n7.indexOf(e17) === t15);
              return { type: t14.length > 1 ? t14 : t14[0], enum: n6.reduce((e17, t15) => e17.includes(t15._def.value) ? e17 : [...e17, t15._def.value], []) };
            }
          } else if (n6.every((e16) => "ZodEnum" === e16._def.typeName))
            return { type: "string", enum: n6.reduce((e16, t14) => [...e16, ...t14._def.values.filter((t15) => !e16.includes(t15))], []) };
          return ln(e15, t13);
        }(e14, n5);
      case Be2.ZodIntersection:
        return function(e15, t13) {
          const n6 = [fn(e15.left._def, { ...t13, currentPath: [...t13.currentPath, "allOf", "0"] }), fn(e15.right._def, { ...t13, currentPath: [...t13.currentPath, "allOf", "1"] })].filter((e16) => !!e16);
          let a5 = "jsonSchema2019-09" === t13.target ? { unevaluatedProperties: false } : void 0;
          const r3 = [];
          return n6.forEach((e16) => {
            if ("type" in (t14 = e16) && "string" === t14.type || !("allOf" in t14)) {
              let t15 = e16;
              if ("additionalProperties" in e16 && false === e16.additionalProperties) {
                const { additionalProperties: n7, ...a6 } = e16;
                t15 = a6;
              } else
                a5 = void 0;
              r3.push(t15);
            } else
              r3.push(...e16.allOf), void 0 === e16.unevaluatedProperties && (a5 = void 0);
            var t14;
          }), r3.length ? { allOf: r3, ...a5 } : void 0;
        }(e14, n5);
      case Be2.ZodTuple:
        return function(e15, t13) {
          return e15.rest ? { type: "array", minItems: e15.items.length, items: e15.items.map((e16, n6) => fn(e16._def, { ...t13, currentPath: [...t13.currentPath, "items", `${n6}`] })).reduce((e16, t14) => void 0 === t14 ? e16 : [...e16, t14], []), additionalItems: fn(e15.rest._def, { ...t13, currentPath: [...t13.currentPath, "additionalItems"] }) } : { type: "array", minItems: e15.items.length, maxItems: e15.items.length, items: e15.items.map((e16, n6) => fn(e16._def, { ...t13, currentPath: [...t13.currentPath, "items", `${n6}`] })).reduce((e16, t14) => void 0 === t14 ? e16 : [...e16, t14], []) };
        }(e14, n5);
      case Be2.ZodRecord:
        return dn(e14, n5);
      case Be2.ZodLiteral:
        return function(e15, t13) {
          const n6 = typeof e15.value;
          return "bigint" !== n6 && "number" !== n6 && "boolean" !== n6 && "string" !== n6 ? { type: Array.isArray(e15.value) ? "array" : "object" } : "openApi3" === t13.target ? { type: "bigint" === n6 ? "integer" : n6, enum: [e15.value] } : { type: "bigint" === n6 ? "integer" : n6, const: e15.value };
        }(e14, n5);
      case Be2.ZodEnum:
        return function(e15) {
          return { type: "string", enum: Array.from(e15.values) };
        }(e14);
      case Be2.ZodNativeEnum:
        return function(e15) {
          const t13 = e15.values, n6 = Object.keys(e15.values).filter((e16) => "number" != typeof t13[t13[e16]]).map((e16) => t13[e16]), a5 = Array.from(new Set(n6.map((e16) => typeof e16)));
          return { type: 1 === a5.length ? "string" === a5[0] ? "string" : "number" : ["string", "number"], enum: n6 };
        }(e14);
      case Be2.ZodNullable:
        return function(e15, t13) {
          if (["ZodString", "ZodNumber", "ZodBigInt", "ZodBoolean", "ZodNull"].includes(e15.innerType._def.typeName) && (!e15.innerType._def.checks || !e15.innerType._def.checks.length))
            return "openApi3" === t13.target ? { type: un[e15.innerType._def.typeName], nullable: true } : { type: [un[e15.innerType._def.typeName], "null"] };
          if ("openApi3" === t13.target) {
            const n7 = fn(e15.innerType._def, { ...t13, currentPath: [...t13.currentPath] });
            return n7 && "$ref" in n7 ? { allOf: [n7], nullable: true } : n7 && { ...n7, nullable: true };
          }
          const n6 = fn(e15.innerType._def, { ...t13, currentPath: [...t13.currentPath, "anyOf", "0"] });
          return n6 && { anyOf: [n6, { type: "null" }] };
        }(e14, n5);
      case Be2.ZodOptional:
        return ((e15, t13) => {
          var n6;
          if (t13.currentPath.toString() === (null == (n6 = t13.propertyPath) ? void 0 : n6.toString()))
            return fn(e15.innerType._def, t13);
          const a5 = fn(e15.innerType._def, { ...t13, currentPath: [...t13.currentPath, "anyOf", "1"] });
          return a5 ? { anyOf: [{ not: Lt2(t13) }, a5] } : Lt2(t13);
        })(e14, n5);
      case Be2.ZodMap:
        return function(e15, t13) {
          return "record" === t13.mapStrategy ? dn(e15, t13) : { type: "array", maxItems: 125, items: { type: "array", items: [fn(e15.keyType._def, { ...t13, currentPath: [...t13.currentPath, "items", "items", "0"] }) || Lt2(t13), fn(e15.valueType._def, { ...t13, currentPath: [...t13.currentPath, "items", "items", "1"] }) || Lt2(t13)], minItems: 2, maxItems: 2 } };
        }(e14, n5);
      case Be2.ZodSet:
        return function(e15, t13) {
          const n6 = { type: "array", uniqueItems: true, items: fn(e15.valueType._def, { ...t13, currentPath: [...t13.currentPath, "items"] }) };
          return e15.minSize && zt(n6, "minItems", e15.minSize.value, e15.minSize.message, t13), e15.maxSize && zt(n6, "maxItems", e15.maxSize.value, e15.maxSize.message, t13), n6;
        }(e14, n5);
      case Be2.ZodLazy:
        return () => e14.getter()._def;
      case Be2.ZodPromise:
        return function(e15, t13) {
          return fn(e15.type._def, t13);
        }(e14, n5);
      case Be2.ZodNaN:
      case Be2.ZodNever:
        return function(e15) {
          return "openAi" === e15.target ? void 0 : { not: Lt2({ ...e15, currentPath: [...e15.currentPath, "not"] }) };
        }(n5);
      case Be2.ZodEffects:
        return function(e15, t13) {
          return "input" === t13.effectStrategy ? fn(e15.schema._def, t13) : Lt2(t13);
        }(e14, n5);
      case Be2.ZodAny:
        return Lt2(n5);
      case Be2.ZodUnknown:
        return function(e15) {
          return Lt2(e15);
        }(n5);
      case Be2.ZodDefault:
        return function(e15, t13) {
          return { ...fn(e15.innerType._def, t13), default: e15.defaultValue() };
        }(e14, n5);
      case Be2.ZodBranded:
        return Ft2(e14, n5);
      case Be2.ZodReadonly:
      case Be2.ZodCatch:
        return ((e15, t13) => fn(e15.innerType._def, t13))(e14, n5);
      case Be2.ZodPipeline:
        return ((e15, t13) => {
          if ("input" === t13.pipeStrategy)
            return fn(e15.in._def, t13);
          if ("output" === t13.pipeStrategy)
            return fn(e15.out._def, t13);
          const n6 = fn(e15.in._def, { ...t13, currentPath: [...t13.currentPath, "allOf", "0"] });
          return { allOf: [n6, fn(e15.out._def, { ...t13, currentPath: [...t13.currentPath, "allOf", n6 ? "1" : "0"] })].filter((e16) => void 0 !== e16) };
        })(e14, n5);
      case Be2.ZodFunction:
      case Be2.ZodVoid:
      case Be2.ZodSymbol:
      default:
        return;
    }
  };
  function fn(e14, t12, n5 = false) {
    var a5;
    const r3 = t12.seen.get(e14);
    if (t12.override) {
      const i5 = null == (a5 = t12.override) ? void 0 : a5.call(t12, e14, t12, r3, n5);
      if (i5 !== $t2)
        return i5;
    }
    if (r3 && !n5) {
      const e15 = gn(r3, t12);
      if (void 0 !== e15)
        return e15;
    }
    const i4 = { def: e14, path: t12.currentPath, jsonSchema: void 0 };
    t12.seen.set(e14, i4);
    const s5 = hn2(e14, e14.typeName, t12), o4 = "function" == typeof s5 ? fn(s5(), t12) : s5;
    if (o4 && yn2(e14, t12, o4), t12.postProcess) {
      const n6 = t12.postProcess(o4, e14, t12);
      return i4.jsonSchema = o4, n6;
    }
    return i4.jsonSchema = o4, o4;
  }
  var gn = (e14, t12) => {
    switch (t12.$refStrategy) {
      case "root":
        return { $ref: e14.path.join("/") };
      case "relative":
        return { $ref: Dt(t12.currentPath, e14.path) };
      case "none":
      case "seen":
        return e14.path.length < t12.currentPath.length && e14.path.every((e15, n5) => t12.currentPath[n5] === e15) ? (console.warn(`Recursive reference detected at ${t12.currentPath.join("/")}! Defaulting to any`), Lt2(t12)) : "seen" === t12.$refStrategy ? Lt2(t12) : void 0;
    }
  };
  var yn2 = (e14, t12, n5) => (e14.description && (n5.description = e14.description, t12.markdownDescription && (n5.markdownDescription = e14.description)), n5);
  var vn2 = (e14, t12) => {
    var n5;
    const a5 = Rt2(t12);
    let r3 = "object" == typeof t12 && t12.definitions ? Object.entries(t12.definitions).reduce((e15, [t13, n6]) => {
      var r4;
      return { ...e15, [t13]: null != (r4 = fn(n6._def, { ...a5, currentPath: [...a5.basePath, a5.definitionPath, t13] }, true)) ? r4 : Lt2(a5) };
    }, {}) : void 0;
    const i4 = "string" == typeof t12 ? t12 : "title" === (null == t12 ? void 0 : t12.nameStrategy) || null == t12 ? void 0 : t12.name, s5 = null != (n5 = fn(e14._def, void 0 === i4 ? a5 : { ...a5, currentPath: [...a5.basePath, a5.definitionPath, i4] }, false)) ? n5 : Lt2(a5), o4 = "object" == typeof t12 && void 0 !== t12.name && "title" === t12.nameStrategy ? t12.name : void 0;
    void 0 !== o4 && (s5.title = o4), a5.flags.hasReferencedOpenAiAnyType && (r3 || (r3 = {}), r3[a5.openAiAnyTypeName] || (r3[a5.openAiAnyTypeName] = { type: ["string", "number", "integer", "boolean", "array", "null"], items: { $ref: "relative" === a5.$refStrategy ? "1" : [...a5.basePath, a5.definitionPath, a5.openAiAnyTypeName].join("/") } }));
    const c3 = void 0 === i4 ? r3 ? { ...s5, [a5.definitionPath]: r3 } : s5 : { $ref: [..."relative" === a5.$refStrategy ? [] : a5.basePath, a5.definitionPath, i4].join("/"), [a5.definitionPath]: { ...r3, [i4]: s5 } };
    return "jsonSchema7" === a5.target ? c3.$schema = "http://json-schema.org/draft-07/schema#" : "jsonSchema2019-09" !== a5.target && "openAi" !== a5.target || (c3.$schema = "https://json-schema.org/draft/2019-09/schema#"), "openAi" === a5.target && ("anyOf" in c3 || "oneOf" in c3 || "allOf" in c3 || "type" in c3 && Array.isArray(c3.type)) && console.warn("Warning: OpenAI may not support schemas with unions as roots! Try wrapping it in an object property."), c3;
  };
  var bn = Object.defineProperty;
  var _n2 = (e14, t12) => {
    for (var n5 in t12)
      bn(e14, n5, { get: t12[n5], enumerable: true });
  };
  var Sn = i3.string();
  var kn2 = i3.number();
  var xn2 = (i3.boolean(), i3.string().min(1));
  var wn = i3.number().int().positive();
  var Zn2 = i3.number().int().nonnegative();
  var jn2 = i3.number().describe("Tagging version number");
  i3.union([i3.string(), i3.number(), i3.boolean()]).optional();
  _n2({}, { ErrorHandlerSchema: () => An2, HandlerSchema: () => Cn2, LogHandlerSchema: () => On2, StorageSchema: () => Tn, StorageTypeSchema: () => Pn2, errorHandlerJsonSchema: () => $n2, handlerJsonSchema: () => Rn, logHandlerJsonSchema: () => In2, storageJsonSchema: () => Nn, storageTypeJsonSchema: () => En });
  var Pn2 = i3.enum(["local", "session", "cookie"]).describe("Storage mechanism: local, session, or cookie");
  var Tn = i3.object({ Local: i3.literal("local"), Session: i3.literal("session"), Cookie: i3.literal("cookie") }).describe("Storage type constants for type-safe references");
  var An2 = i3.any().describe("Error handler function: (error, state?) => void");
  var On2 = i3.any().describe("Log handler function: (message, verbose?) => void");
  var Cn2 = i3.object({ Error: An2.describe("Error handler function"), Log: On2.describe("Log handler function") }).describe("Handler interface with error and log functions");
  var En = vn2(Pn2, { target: "jsonSchema7", $refStrategy: "relative", name: "StorageType" });
  var Nn = vn2(Tn, { target: "jsonSchema7", $refStrategy: "relative", name: "Storage" });
  var $n2 = vn2(An2, { target: "jsonSchema7", $refStrategy: "relative", name: "ErrorHandler" });
  var In2 = vn2(On2, { target: "jsonSchema7", $refStrategy: "relative", name: "LogHandler" });
  var Rn = vn2(Cn2, { target: "jsonSchema7", $refStrategy: "relative", name: "Handler" });
  i3.object({ onError: An2.optional().describe("Error handler function: (error, state?) => void"), onLog: On2.optional().describe("Log handler function: (message, verbose?) => void") }).partial(), i3.object({ verbose: i3.boolean().describe("Enable verbose logging for debugging").optional() }).partial(), i3.object({ queue: i3.boolean().describe("Whether to queue events when consent is not granted").optional() }).partial(), i3.object({}).partial(), i3.object({ init: i3.boolean().describe("Whether to initialize immediately").optional(), loadScript: i3.boolean().describe("Whether to load external script (for web destinations)").optional() }).partial(), i3.object({ disabled: i3.boolean().describe("Set to true to disable").optional() }).partial(), i3.object({ primary: i3.boolean().describe("Mark as primary (only one can be primary)").optional() }).partial(), i3.object({ settings: i3.any().optional().describe("Implementation-specific configuration") }).partial(), i3.object({ env: i3.any().optional().describe("Environment dependencies (platform-specific)") }).partial(), i3.object({ type: i3.string().optional().describe("Instance type identifier"), config: i3.any().describe("Instance configuration") }).partial(), i3.object({ collector: i3.any().describe("Collector instance (runtime object)"), config: i3.any().describe("Configuration"), env: i3.any().describe("Environment dependencies") }).partial(), i3.object({ batch: i3.number().optional().describe("Batch size: bundle N events for batch processing"), batched: i3.any().optional().describe("Batch of events to be processed") }).partial(), i3.object({ ignore: i3.boolean().describe("Set to true to skip processing").optional(), condition: i3.string().optional().describe("Condition function: return true to process") }).partial(), i3.object({ sources: i3.record(i3.string(), i3.any()).describe("Map of source instances") }).partial(), i3.object({ destinations: i3.record(i3.string(), i3.any()).describe("Map of destination instances") }).partial();
  _n2({}, { ConsentSchema: () => Un2, DeepPartialEventSchema: () => Gn2, EntitiesSchema: () => Wn, EntitySchema: () => qn, EventSchema: () => Kn2, OrderedPropertiesSchema: () => Ln2, PartialEventSchema: () => Hn2, PropertiesSchema: () => Dn2, PropertySchema: () => zn, PropertyTypeSchema: () => Mn, SourceSchema: () => Bn2, SourceTypeSchema: () => Fn2, UserSchema: () => Jn, VersionSchema: () => Vn2, consentJsonSchema: () => ra, entityJsonSchema: () => na, eventJsonSchema: () => Yn, orderedPropertiesJsonSchema: () => ta, partialEventJsonSchema: () => Qn2, propertiesJsonSchema: () => ea, sourceTypeJsonSchema: () => aa, userJsonSchema: () => Xn });
  var Mn = i3.lazy(() => i3.union([i3.boolean(), i3.string(), i3.number(), i3.record(i3.string(), zn)]));
  var zn = i3.lazy(() => i3.union([Mn, i3.array(Mn)]));
  var Dn2 = i3.record(i3.string(), zn.optional()).describe("Flexible property collection with optional values");
  var Ln2 = i3.record(i3.string(), i3.tuple([zn, i3.number()]).optional()).describe("Ordered properties with [value, order] tuples for priority control");
  var Fn2 = i3.union([i3.enum(["web", "server", "app", "other"]), i3.string()]).describe("Source type: web, server, app, other, or custom");
  var Un2 = i3.record(i3.string(), i3.boolean()).describe("Consent requirement mapping (group name \u2192 state)");
  var Jn = Dn2.and(i3.object({ id: i3.string().optional().describe("User identifier"), device: i3.string().optional().describe("Device identifier"), session: i3.string().optional().describe("Session identifier"), hash: i3.string().optional().describe("Hashed identifier"), address: i3.string().optional().describe("User address"), email: i3.string().email().optional().describe("User email address"), phone: i3.string().optional().describe("User phone number"), userAgent: i3.string().optional().describe("Browser user agent string"), browser: i3.string().optional().describe("Browser name"), browserVersion: i3.string().optional().describe("Browser version"), deviceType: i3.string().optional().describe("Device type (mobile, desktop, tablet)"), os: i3.string().optional().describe("Operating system"), osVersion: i3.string().optional().describe("Operating system version"), screenSize: i3.string().optional().describe("Screen dimensions"), language: i3.string().optional().describe("User language"), country: i3.string().optional().describe("User country"), region: i3.string().optional().describe("User region/state"), city: i3.string().optional().describe("User city"), zip: i3.string().optional().describe("User postal code"), timezone: i3.string().optional().describe("User timezone"), ip: i3.string().optional().describe("User IP address"), internal: i3.boolean().optional().describe("Internal user flag (employee, test user)") })).describe("User identification and properties");
  var Vn2 = Dn2.and(i3.object({ source: Sn.describe('Walker implementation version (e.g., "2.0.0")'), tagging: jn2 })).describe("Walker version information");
  var Bn2 = Dn2.and(i3.object({ type: Fn2.describe("Source type identifier"), id: Sn.describe("Source identifier (typically URL on web)"), previous_id: Sn.describe("Previous source identifier (typically referrer on web)") })).describe("Event source information");
  var qn = i3.lazy(() => i3.object({ entity: i3.string().describe("Entity name"), data: Dn2.describe("Entity-specific properties"), nested: i3.array(qn).describe("Nested child entities"), context: Ln2.describe("Entity context data") })).describe("Nested entity structure with recursive nesting support");
  var Wn = i3.array(qn).describe("Array of nested entities");
  var Kn2 = i3.object({ name: i3.string().describe('Event name in "entity action" format (e.g., "page view", "product add")'), data: Dn2.describe("Event-specific properties"), context: Ln2.describe("Ordered context properties with priorities"), globals: Dn2.describe("Global properties shared across events"), custom: Dn2.describe("Custom implementation-specific properties"), user: Jn.describe("User identification and attributes"), nested: Wn.describe("Related nested entities"), consent: Un2.describe("Consent states at event time"), id: xn2.describe("Unique event identifier (timestamp-based)"), trigger: Sn.describe("Event trigger identifier"), entity: Sn.describe("Parsed entity from event name"), action: Sn.describe("Parsed action from event name"), timestamp: wn.describe("Unix timestamp in milliseconds since epoch"), timing: kn2.describe("Event processing timing information"), group: Sn.describe("Event grouping identifier"), count: Zn2.describe("Event count in session"), version: Vn2.describe("Walker version information"), source: Bn2.describe("Event source information") }).describe("Complete walkerOS event structure");
  var Hn2 = Kn2.partial().describe("Partial event structure with all fields optional");
  var Gn2 = i3.lazy(() => Kn2.deepPartial()).describe("Deep partial event structure with all nested fields optional");
  var Yn = vn2(Kn2, { target: "jsonSchema7", $refStrategy: "relative", name: "Event" });
  var Qn2 = vn2(Hn2, { target: "jsonSchema7", $refStrategy: "relative", name: "PartialEvent" });
  var Xn = vn2(Jn, { target: "jsonSchema7", $refStrategy: "relative", name: "User" });
  var ea = vn2(Dn2, { target: "jsonSchema7", $refStrategy: "relative", name: "Properties" });
  var ta = vn2(Ln2, { target: "jsonSchema7", $refStrategy: "relative", name: "OrderedProperties" });
  var na = vn2(qn, { target: "jsonSchema7", $refStrategy: "relative", name: "Entity" });
  var aa = vn2(Fn2, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceType" });
  var ra = vn2(Un2, { target: "jsonSchema7", $refStrategy: "relative", name: "Consent" });
  _n2({}, { ConfigSchema: () => ha, LoopSchema: () => oa, MapSchema: () => da, PolicySchema: () => la, ResultSchema: () => fa, RuleSchema: () => pa, RulesSchema: () => ma, SetSchema: () => ca, ValueConfigSchema: () => ua, ValueSchema: () => ia, ValuesSchema: () => sa, configJsonSchema: () => wa, loopJsonSchema: () => va, mapJsonSchema: () => _a, policyJsonSchema: () => Sa, ruleJsonSchema: () => ka, rulesJsonSchema: () => xa, setJsonSchema: () => ba, valueConfigJsonSchema: () => ya, valueJsonSchema: () => ga });
  var ia = i3.lazy(() => i3.union([i3.string().describe('String value or property path (e.g., "data.id")'), i3.number().describe("Numeric value"), i3.boolean().describe("Boolean value"), ua, i3.array(ia).describe("Array of values")]));
  var sa = i3.array(ia).describe("Array of transformation values");
  var oa = i3.tuple([ia, ia]).describe("Loop transformation: [source, transform] tuple for array processing");
  var ca = i3.array(ia).describe("Set: Array of values for selection or combination");
  var da = i3.record(i3.string(), ia).describe("Map: Object mapping keys to transformation values");
  var ua = i3.object({ key: i3.string().optional().describe('Property path to extract from event (e.g., "data.id", "user.email")'), value: i3.union([i3.string(), i3.number(), i3.boolean()]).optional().describe("Static primitive value"), fn: i3.string().optional().describe("Custom transformation function as string (serialized)"), map: da.optional().describe("Object mapping: transform event data to structured output"), loop: oa.optional().describe("Loop transformation: [source, transform] for array processing"), set: ca.optional().describe("Set of values: combine or select from multiple values"), consent: Un2.optional().describe("Required consent states to include this value"), condition: i3.string().optional().describe("Condition function as string: return true to include value"), validate: i3.string().optional().describe("Validation function as string: return true if value is valid") }).refine((e14) => Object.keys(e14).length > 0, { message: "ValueConfig must have at least one property" }).describe("Value transformation configuration with multiple strategies");
  var la = i3.record(i3.string(), ia).describe("Policy rules for event pre-processing (key \u2192 value mapping)");
  var pa = i3.object({ batch: i3.number().optional().describe("Batch size: bundle N events for batch processing"), condition: i3.string().optional().describe("Condition function as string: return true to process event"), consent: Un2.optional().describe("Required consent states to process this event"), settings: i3.any().optional().describe("Destination-specific settings for this event mapping"), data: i3.union([ia, sa]).optional().describe("Data transformation rules for event"), ignore: i3.boolean().optional().describe("Set to true to skip processing this event"), name: i3.string().optional().describe('Custom event name override (e.g., "view_item" for "product view")'), policy: la.optional().describe("Event-level policy overrides (applied after config-level policy)") }).describe("Mapping rule for specific entity-action combination");
  var ma = i3.record(i3.string(), i3.record(i3.string(), i3.union([pa, i3.array(pa)])).optional()).describe("Nested mapping rules: { entity: { action: Rule | Rule[] } } with wildcard support");
  var ha = i3.object({ consent: Un2.optional().describe("Required consent states to process any events"), data: i3.union([ia, sa]).optional().describe("Global data transformation applied to all events"), mapping: ma.optional().describe("Entity-action specific mapping rules"), policy: la.optional().describe("Pre-processing policy rules applied before mapping") }).describe("Shared mapping configuration for sources and destinations");
  var fa = i3.object({ eventMapping: pa.optional().describe("Resolved mapping rule for event"), mappingKey: i3.string().optional().describe('Mapping key used (e.g., "product.view")') }).describe("Mapping resolution result");
  var ga = vn2(ia, { target: "jsonSchema7", $refStrategy: "relative", name: "Value" });
  var ya = vn2(ua, { target: "jsonSchema7", $refStrategy: "relative", name: "ValueConfig" });
  var va = vn2(oa, { target: "jsonSchema7", $refStrategy: "relative", name: "Loop" });
  var ba = vn2(ca, { target: "jsonSchema7", $refStrategy: "relative", name: "Set" });
  var _a = vn2(da, { target: "jsonSchema7", $refStrategy: "relative", name: "Map" });
  var Sa = vn2(la, { target: "jsonSchema7", $refStrategy: "relative", name: "Policy" });
  var ka = vn2(pa, { target: "jsonSchema7", $refStrategy: "relative", name: "Rule" });
  var xa = vn2(ma, { target: "jsonSchema7", $refStrategy: "relative", name: "Rules" });
  var wa = vn2(ha, { target: "jsonSchema7", $refStrategy: "relative", name: "MappingConfig" });
  _n2({}, { BatchSchema: () => Na, ConfigSchema: () => Za, ContextSchema: () => Ta, DLQSchema: () => Ua, DataSchema: () => $a, DestinationPolicySchema: () => Pa, DestinationsSchema: () => za, InitDestinationsSchema: () => Ma, InitSchema: () => Ra, InstanceSchema: () => Ia, PartialConfigSchema: () => ja, PushBatchContextSchema: () => Oa, PushContextSchema: () => Aa, PushEventSchema: () => Ca, PushEventsSchema: () => Ea, PushResultSchema: () => La, RefSchema: () => Da, ResultSchema: () => Fa, batchJsonSchema: () => Wa, configJsonSchema: () => Ja, contextJsonSchema: () => Ba, instanceJsonSchema: () => Ka, partialConfigJsonSchema: () => Va, pushContextJsonSchema: () => qa, resultJsonSchema: () => Ha });
  var Za = i3.object({ consent: Un2.optional().describe("Required consent states to send events to this destination"), settings: i3.any().describe("Implementation-specific configuration").optional(), data: i3.union([ia, sa]).optional().describe("Global data transformation applied to all events for this destination"), env: i3.any().describe("Environment dependencies (platform-specific)").optional(), id: xn2.describe("Destination instance identifier (defaults to destination key)").optional(), init: i3.boolean().describe("Whether to initialize immediately").optional(), loadScript: i3.boolean().describe("Whether to load external script (for web destinations)").optional(), mapping: ma.optional().describe("Entity-action specific mapping rules for this destination"), policy: la.optional().describe("Pre-processing policy rules applied before event mapping"), queue: i3.boolean().describe("Whether to queue events when consent is not granted").optional(), verbose: i3.boolean().describe("Enable verbose logging for debugging").optional(), onError: An2.optional(), onLog: On2.optional() }).describe("Destination configuration");
  var ja = Za.deepPartial().describe("Partial destination configuration with all fields deeply optional");
  var Pa = la.describe("Destination policy rules for event pre-processing");
  var Ta = i3.object({ collector: i3.any().describe("Collector instance (runtime object)"), config: Za.describe("Destination configuration"), data: i3.union([i3.any(), i3.undefined(), i3.array(i3.union([i3.any(), i3.undefined()]))]).optional().describe("Transformed event data"), env: i3.any().describe("Environment dependencies") }).describe("Destination context for init and push functions");
  var Aa = Ta.extend({ mapping: pa.optional().describe("Resolved mapping rule for this specific event") }).describe("Push context with event-specific mapping");
  var Oa = Aa.describe("Batch push context with event-specific mapping");
  var Ca = i3.object({ event: Kn2.describe("The event to process"), mapping: pa.optional().describe("Mapping rule for this event") }).describe("Event with optional mapping for batch processing");
  var Ea = i3.array(Ca).describe("Array of events with mappings");
  var Na = i3.object({ key: i3.string().describe('Batch key (usually mapping key like "product.view")'), events: i3.array(Kn2).describe("Array of events in batch"), data: i3.array(i3.union([i3.any(), i3.undefined(), i3.array(i3.union([i3.any(), i3.undefined()]))])).describe("Transformed data for each event"), mapping: pa.optional().describe("Shared mapping rule for batch") }).describe("Batch of events grouped by mapping key");
  var $a = i3.union([i3.any(), i3.undefined(), i3.array(i3.union([i3.any(), i3.undefined()]))]).describe("Transformed event data (Property, undefined, or array)");
  var Ia = i3.object({ config: Za.describe("Destination configuration"), queue: i3.array(Kn2).optional().describe("Queued events awaiting consent"), dlq: i3.array(i3.tuple([Kn2, i3.any()])).optional().describe("Dead letter queue (failed events with errors)"), type: i3.string().optional().describe("Destination type identifier"), env: i3.any().optional().describe("Environment dependencies"), init: i3.any().optional().describe("Initialization function"), push: i3.any().describe("Push function for single events"), pushBatch: i3.any().optional().describe("Batch push function"), on: i3.any().optional().describe("Event lifecycle hook function") }).describe("Destination instance (runtime object with functions)");
  var Ra = i3.object({ code: Ia.describe("Destination instance with implementation"), config: ja.optional().describe("Partial configuration overrides"), env: i3.any().optional().describe("Partial environment overrides") }).describe("Destination initialization configuration");
  var Ma = i3.record(i3.string(), Ra).describe("Map of destination IDs to initialization configurations");
  var za = i3.record(i3.string(), Ia).describe("Map of destination IDs to runtime instances");
  var Da = i3.object({ id: i3.string().describe("Destination ID"), destination: Ia.describe("Destination instance") }).describe("Destination reference (ID + instance)");
  var La = i3.object({ queue: i3.array(Kn2).optional().describe("Events queued (awaiting consent)"), error: i3.any().optional().describe("Error if push failed") }).describe("Push operation result");
  var Fa = i3.object({ successful: i3.array(Da).describe("Destinations that processed successfully"), queued: i3.array(Da).describe("Destinations that queued events"), failed: i3.array(Da).describe("Destinations that failed to process") }).describe("Overall destination processing result");
  var Ua = i3.array(i3.tuple([Kn2, i3.any()])).describe("Dead letter queue: [(event, error), ...]");
  var Ja = vn2(Za, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationConfig" });
  var Va = vn2(ja, { target: "jsonSchema7", $refStrategy: "relative", name: "PartialDestinationConfig" });
  var Ba = vn2(Ta, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationContext" });
  var qa = vn2(Aa, { target: "jsonSchema7", $refStrategy: "relative", name: "PushContext" });
  var Wa = vn2(Na, { target: "jsonSchema7", $refStrategy: "relative", name: "Batch" });
  var Ka = vn2(Ia, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationInstance" });
  var Ha = vn2(Fa, { target: "jsonSchema7", $refStrategy: "relative", name: "DestinationResult" });
  _n2({}, { CommandTypeSchema: () => Ga, ConfigSchema: () => Ya, DestinationsSchema: () => nr, InitConfigSchema: () => Xa, InstanceSchema: () => ar, PushContextSchema: () => er, SessionDataSchema: () => Qa, SourcesSchema: () => tr, commandTypeJsonSchema: () => rr, configJsonSchema: () => ir, initConfigJsonSchema: () => or, instanceJsonSchema: () => dr, pushContextJsonSchema: () => cr, sessionDataJsonSchema: () => sr });
  var Ga = i3.union([i3.enum(["action", "config", "consent", "context", "destination", "elb", "globals", "hook", "init", "link", "run", "user", "walker"]), i3.string()]).describe("Collector command type: standard commands or custom string for extensions");
  var Ya = i3.object({ run: i3.boolean().describe("Whether to run collector automatically on initialization").optional(), tagging: jn2, globalsStatic: Dn2.describe("Static global properties that persist across collector runs"), sessionStatic: i3.record(i3.any()).describe("Static session data that persists across collector runs"), verbose: i3.boolean().describe("Enable verbose logging for debugging"), onError: An2.optional(), onLog: On2.optional() }).describe("Core collector configuration");
  var Qa = Dn2.and(i3.object({ isStart: i3.boolean().describe("Whether this is a new session start"), storage: i3.boolean().describe("Whether storage is available"), id: xn2.describe("Session identifier").optional(), start: wn.describe("Session start timestamp").optional(), marketing: i3.literal(true).optional().describe("Marketing attribution flag"), updated: wn.describe("Last update timestamp").optional(), isNew: i3.boolean().describe("Whether this is a new session").optional(), device: xn2.describe("Device identifier").optional(), count: Zn2.describe("Event count in session").optional(), runs: Zn2.describe("Number of runs").optional() })).describe("Session state and tracking data");
  var Xa = Ya.partial().extend({ consent: Un2.optional().describe("Initial consent state"), user: Jn.optional().describe("Initial user data"), globals: Dn2.optional().describe("Initial global properties"), sources: i3.any().optional().describe("Source configurations"), destinations: i3.any().optional().describe("Destination configurations"), custom: Dn2.optional().describe("Initial custom implementation-specific properties") }).describe("Collector initialization configuration with initial state");
  var er = i3.object({ mapping: ha.optional().describe("Source-level mapping configuration") }).describe("Push context with optional source mapping");
  var tr = i3.record(i3.string(), i3.any()).describe("Map of source IDs to source instances");
  var nr = i3.record(i3.string(), i3.any()).describe("Map of destination IDs to destination instances");
  var ar = i3.object({ push: i3.any().describe("Push function for processing events"), command: i3.any().describe("Command function for walker commands"), allowed: i3.boolean().describe("Whether event processing is allowed"), config: Ya.describe("Current collector configuration"), consent: Un2.describe("Current consent state"), count: i3.number().describe("Event count (increments with each event)"), custom: Dn2.describe("Custom implementation-specific properties"), sources: tr.describe("Registered source instances"), destinations: nr.describe("Registered destination instances"), globals: Dn2.describe("Current global properties"), group: i3.string().describe("Event grouping identifier"), hooks: i3.any().describe("Lifecycle hook functions"), on: i3.any().describe("Event lifecycle configuration"), queue: i3.array(Kn2).describe("Queued events awaiting processing"), round: i3.number().describe("Collector run count (increments with each run)"), session: i3.union([i3.undefined(), Qa]).describe("Current session state"), timing: i3.number().describe("Event processing timing information"), user: Jn.describe("Current user data"), version: i3.string().describe("Walker implementation version") }).describe("Collector instance with state and methods");
  var rr = vn2(Ga, { target: "jsonSchema7", $refStrategy: "relative", name: "CommandType" });
  var ir = vn2(Ya, { target: "jsonSchema7", $refStrategy: "relative", name: "CollectorConfig" });
  var sr = vn2(Qa, { target: "jsonSchema7", $refStrategy: "relative", name: "SessionData" });
  var or = vn2(Xa, { target: "jsonSchema7", $refStrategy: "relative", name: "InitConfig" });
  var cr = vn2(er, { target: "jsonSchema7", $refStrategy: "relative", name: "CollectorPushContext" });
  var dr = vn2(ar, { target: "jsonSchema7", $refStrategy: "relative", name: "CollectorInstance" });
  _n2({}, { BaseEnvSchema: () => ur, ConfigSchema: () => lr, InitSchema: () => hr, InitSourceSchema: () => fr, InitSourcesSchema: () => gr, InstanceSchema: () => mr, PartialConfigSchema: () => pr, baseEnvJsonSchema: () => yr, configJsonSchema: () => vr, initSourceJsonSchema: () => Sr, initSourcesJsonSchema: () => kr, instanceJsonSchema: () => _r, partialConfigJsonSchema: () => br });
  var ur = i3.object({ push: i3.any().describe("Collector push function"), command: i3.any().describe("Collector command function"), sources: i3.any().optional().describe("Map of registered source instances"), elb: i3.any().describe("Public API function (alias for collector.push)") }).catchall(i3.unknown()).describe("Base environment for dependency injection - platform-specific sources extend this");
  var lr = ha.extend({ settings: i3.any().describe("Implementation-specific configuration").optional(), env: ur.optional().describe("Environment dependencies (platform-specific)"), id: xn2.describe("Source identifier (defaults to source key)").optional(), onError: An2.optional(), disabled: i3.boolean().describe("Set to true to disable").optional(), primary: i3.boolean().describe("Mark as primary (only one can be primary)").optional() }).describe("Source configuration with mapping and environment");
  var pr = lr.deepPartial().describe("Partial source configuration with all fields deeply optional");
  var mr = i3.object({ type: i3.string().describe('Source type identifier (e.g., "browser", "dataLayer")'), config: lr.describe("Current source configuration"), push: i3.any().describe("Push function - THE HANDLER (flexible signature for platform compatibility)"), destroy: i3.any().optional().describe("Cleanup function called when source is removed"), on: i3.any().optional().describe("Lifecycle hook function for event types") }).describe("Source instance with push handler and lifecycle methods");
  var hr = i3.any().describe("Source initialization function: (config, env) => Instance | Promise<Instance>");
  var fr = i3.object({ code: hr.describe("Source initialization function"), config: pr.optional().describe("Partial configuration overrides"), env: ur.partial().optional().describe("Partial environment overrides"), primary: i3.boolean().optional().describe("Mark as primary source (only one can be primary)") }).describe("Source initialization configuration");
  var gr = i3.record(i3.string(), fr).describe("Map of source IDs to initialization configurations");
  var yr = vn2(ur, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceBaseEnv" });
  var vr = vn2(lr, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceConfig" });
  var br = vn2(pr, { target: "jsonSchema7", $refStrategy: "relative", name: "PartialSourceConfig" });
  var _r = vn2(mr, { target: "jsonSchema7", $refStrategy: "relative", name: "SourceInstance" });
  var Sr = vn2(fr, { target: "jsonSchema7", $refStrategy: "relative", name: "InitSource" });
  var kr = vn2(gr, { target: "jsonSchema7", $refStrategy: "relative", name: "InitSources" });
  function xr(e14) {
    return vn2(e14, { target: "jsonSchema7", $refStrategy: "none" });
  }
  var wr = { merge: true, shallow: true, extend: true };
  function Zr(e14, t12 = {}, n5 = {}) {
    n5 = { ...wr, ...n5 };
    const a5 = Object.entries(t12).reduce((t13, [a6, r3]) => {
      const i4 = e14[a6];
      return n5.merge && Array.isArray(i4) && Array.isArray(r3) ? t13[a6] = r3.reduce((e15, t14) => e15.includes(t14) ? e15 : [...e15, t14], [...i4]) : (n5.extend || a6 in e14) && (t13[a6] = r3), t13;
    }, {});
    return n5.shallow ? { ...e14, ...a5 } : (Object.assign(e14, a5), e14);
  }
  function jr(e14 = "entity action", t12 = {}) {
    const n5 = t12.timestamp || (/* @__PURE__ */ new Date()).setHours(0, 13, 37, 0), a5 = { data: { id: "ers", name: "Everyday Ruck Snack", color: "black", size: "l", price: 420 } }, r3 = { data: { id: "cc", name: "Cool Cap", size: "one size", price: 42 } };
    return function(e15 = {}) {
      var t13;
      const n6 = e15.timestamp || (/* @__PURE__ */ new Date()).setHours(0, 13, 37, 0), a6 = e15.group || "gr0up", r4 = e15.count || 1, i4 = Zr({ name: "entity action", data: { string: "foo", number: 1, boolean: true, array: [0, "text", false], not: void 0 }, context: { dev: ["test", 1] }, globals: { lang: "elb" }, custom: { completely: "random" }, user: { id: "us3r", device: "c00k13", session: "s3ss10n" }, nested: [{ entity: "child", data: { is: "subordinated" }, nested: [], context: { element: ["child", 0] } }], consent: { functional: true }, id: `${n6}-${a6}-${r4}`, trigger: "test", entity: "entity", action: "action", timestamp: n6, timing: 3.14, group: a6, count: r4, version: { source: "0.3.0", tagging: 1 }, source: { type: "web", id: "https://localhost:80", previous_id: "http://remotehost:9001" } }, e15, { merge: false });
      if (e15.name) {
        const [n7, a7] = null != (t13 = e15.name.split(" ")) ? t13 : [];
        n7 && a7 && (i4.entity = n7, i4.action = a7);
      }
      return i4;
    }({ ...{ "cart view": { data: { currency: "EUR", value: 2 * a5.data.price }, context: { shopping: ["cart", 0] }, globals: { pagegroup: "shop" }, nested: [{ entity: "product", data: { ...a5.data, quantity: 2 }, context: { shopping: ["cart", 0] }, nested: [] }], trigger: "load" }, "checkout view": { data: { step: "payment", currency: "EUR", value: a5.data.price + r3.data.price }, context: { shopping: ["checkout", 0] }, globals: { pagegroup: "shop" }, nested: [{ entity: "product", ...a5, context: { shopping: ["checkout", 0] }, nested: [] }, { entity: "product", ...r3, context: { shopping: ["checkout", 0] }, nested: [] }], trigger: "load" }, "order complete": { data: { id: "0rd3r1d", currency: "EUR", shipping: 5.22, taxes: 73.76, total: 555 }, context: { shopping: ["complete", 0] }, globals: { pagegroup: "shop" }, nested: [{ entity: "product", ...a5, context: { shopping: ["complete", 0] }, nested: [] }, { entity: "product", ...r3, context: { shopping: ["complete", 0] }, nested: [] }, { entity: "gift", data: { name: "Surprise" }, context: { shopping: ["complete", 0] }, nested: [] }], trigger: "load" }, "page view": { data: { domain: "www.example.com", title: "walkerOS documentation", referrer: "https://www.elbwalker.com/", search: "?foo=bar", hash: "#hash", id: "/docs/" }, globals: { pagegroup: "docs" }, trigger: "load" }, "product add": { ...a5, context: { shopping: ["intent", 0] }, globals: { pagegroup: "shop" }, nested: [], trigger: "click" }, "product view": { ...a5, context: { shopping: ["detail", 0] }, globals: { pagegroup: "shop" }, nested: [], trigger: "load" }, "product visible": { data: { ...a5.data, position: 3, promo: true }, context: { shopping: ["discover", 0] }, globals: { pagegroup: "shop" }, nested: [], trigger: "load" }, "promotion visible": { data: { name: "Setting up tracking easily", position: "hero" }, context: { ab_test: ["engagement", 0] }, globals: { pagegroup: "homepage" }, trigger: "visible" }, "session start": { data: { id: "s3ss10n", start: n5, isNew: true, count: 1, runs: 1, isStart: true, storage: true, referrer: "", device: "c00k13" }, user: { id: "us3r", device: "c00k13", session: "s3ss10n", hash: "h4sh", address: "street number", email: "user@example.com", phone: "+49 123 456 789", userAgent: "Mozilla...", browser: "Chrome", browserVersion: "90", deviceType: "desktop", language: "de-DE", country: "DE", region: "HH", city: "Hamburg", zip: "20354", timezone: "Berlin", os: "walkerOS", osVersion: "1.0", screenSize: "1337x420", ip: "127.0.0.0", internal: true, custom: "value" } } }[e14], ...t12, name: e14 });
  }
  function Pr(e14, t12, n5) {
    return function(...a5) {
      try {
        return e14(...a5);
      } catch (e15) {
        if (!t12)
          return;
        return t12(e15);
      } finally {
        null == n5 || n5();
      }
    };
  }
  function Tr(e14) {
    return void 0 === e14 || /* @__PURE__ */ function(e15, t12) {
      return typeof e15 == typeof t12;
    }(e14, "") ? e14 : JSON.stringify(e14);
  }
  function Ar(e14 = {}) {
    return Zr({ "Content-Type": "application/json; charset=utf-8" }, e14);
  }
  function Or(e14, t12, n5 = { transport: "fetch" }) {
    switch (n5.transport || "fetch") {
      case "beacon":
        return function(e15, t13) {
          const n6 = Tr(t13), a5 = navigator.sendBeacon(e15, n6);
          return { ok: a5, error: a5 ? void 0 : "Failed to send beacon" };
        }(e14, t12);
      case "xhr":
        return function(e15, t13, n6 = {}) {
          const a5 = Ar(n6.headers), r3 = n6.method || "POST", i4 = Tr(t13);
          return Pr(() => {
            const t14 = new XMLHttpRequest();
            t14.open(r3, e15, false);
            for (const e16 in a5)
              t14.setRequestHeader(e16, a5[e16]);
            t14.send(i4);
            const n7 = t14.status >= 200 && t14.status < 300;
            return { ok: n7, data: Pr(JSON.parse, () => t14.response)(t14.response), error: n7 ? void 0 : `${t14.status} ${t14.statusText}` };
          }, (e16) => ({ ok: false, error: e16.message }))();
        }(e14, t12, n5);
      default:
        return async function(e15, t13, n6 = {}) {
          const a5 = Ar(n6.headers), r3 = Tr(t13);
          return (/* @__PURE__ */ function(e16, t14, n7) {
            return async function(...a6) {
              try {
                return await e16(...a6);
              } catch (e17) {
                if (!t14)
                  return;
                return await t14(e17);
              } finally {
                await (null == n7 ? void 0 : n7());
              }
            };
          }(async () => {
            const t14 = await fetch(e15, { method: n6.method || "POST", headers: a5, keepalive: true, credentials: n6.credentials || "same-origin", mode: n6.noCors ? "no-cors" : "cors", body: r3 }), i4 = n6.noCors ? "" : await t14.text();
            return { ok: t14.ok, data: i4, error: t14.ok ? void 0 : t14.statusText };
          }, (e16) => ({ ok: false, error: e16.message })))();
        }(e14, t12, n5);
    }
  }
  var Er = {};
  r2(Er, { env: () => Nr, events: () => Rr, mapping: () => zr });
  var Nr = {};
  r2(Nr, { init: () => $r, push: () => Ir });
  var $r = { sendWeb: void 0 };
  var Ir = { sendWeb: Object.assign(() => {
  }, {}) };
  var Rr = {};
  function Mr() {
    const e14 = jr("entity action");
    return JSON.stringify(e14.data);
  }
  r2(Rr, { entity_action: () => Mr });
  var zr = {};
  r2(zr, { config: () => Lr, entity_action: () => Dr });
  var Dr = { data: "data" };
  var Lr = { entity: { action: Dr } };
  var Fr = {};
  r2(Fr, { MappingSchema: () => Jr, SettingsSchema: () => Ur, mapping: () => Br, settings: () => Vr });
  var Ur = i3.object({ url: i3.string().url().describe("The HTTP endpoint URL to send events to (like https://api.example.com/events)"), headers: i3.record(i3.string()).describe("Additional HTTP headers to include with requests (like { 'Authorization': 'Bearer token', 'Content-Type': 'application/json' })").optional(), method: i3.string().default("POST").describe("HTTP method for the request"), transform: i3.any().describe("Function to transform event data before sending (like (data, config, mapping) => JSON.stringify(data))").optional(), transport: i3.enum(["fetch", "xhr", "beacon"]).default("fetch").describe("Transport method for sending requests") });
  var Jr = i3.object({});
  var Vr = xr(Ur);
  var Br = xr(Jr);
  var qr = { type: "api", config: {}, push(e14, { config: t12, mapping: n5, data: a5, env: r3 }) {
    const { settings: i4 } = t12, { url: s5, headers: o4, method: c3, transform: d2, transport: u3 = "fetch" } = i4 || {};
    if (!s5)
      return;
    const l3 = void 0 !== a5 ? a5 : e14;
    const p2 = d2 ? d2(l3, t12, n5) : JSON.stringify(l3);
    ((null == r3 ? void 0 : r3.sendWeb) || Or)(s5, p2, { headers: o4, method: c3, transport: u3 });
  } };

  // entry.js
  async function entry_default(context = {}) {
    const { tracker } = context;
    const __simulationTracker = tracker;
    const window = typeof globalThis.window !== "undefined" ? globalThis.window : void 0;
    const document2 = typeof globalThis.document !== "undefined" ? globalThis.document : void 0;
    const config = {
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
          code: qr,
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
    const result = await T2(config);
    return result;
  }
  return __toCommonJS(entry_exports);
})();
//# sourceMappingURL=web-serve.mjs.map
