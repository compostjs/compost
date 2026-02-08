(function() {
  "use strict";
  function isArrayLike(x) {
    return Array.isArray(x) || ArrayBuffer.isView(x);
  }
  function isEnumerable(x) {
    return x != null && typeof x.GetEnumerator === "function";
  }
  function isComparable(x) {
    return x != null && typeof x.CompareTo === "function";
  }
  function isEquatable(x) {
    return x != null && typeof x.Equals === "function";
  }
  function isHashable(x) {
    return x != null && typeof x.GetHashCode === "function";
  }
  function isDisposable(x) {
    return x != null && typeof x.Dispose === "function";
  }
  function disposeSafe(x) {
    if (isDisposable(x)) {
      x.Dispose();
    }
  }
  function defaultOf() {
    return null;
  }
  function sameConstructor(x, y) {
    var _a, _b;
    return ((_a = Object.getPrototypeOf(x)) == null ? void 0 : _a.constructor) === ((_b = Object.getPrototypeOf(y)) == null ? void 0 : _b.constructor);
  }
  class Enumerator {
    constructor(iter) {
      this.iter = iter;
      this.current = defaultOf();
    }
    ["System.Collections.Generic.IEnumerator`1.get_Current"]() {
      return this.current;
    }
    ["System.Collections.IEnumerator.get_Current"]() {
      return this.current;
    }
    ["System.Collections.IEnumerator.MoveNext"]() {
      const cur = this.iter.next();
      this.current = cur.value;
      return !cur.done;
    }
    ["System.Collections.IEnumerator.Reset"]() {
      throw new Error("JS iterators cannot be reset");
    }
    Dispose() {
      return;
    }
  }
  function getEnumerator(e) {
    if (isEnumerable(e)) {
      return e.GetEnumerator();
    } else {
      return new Enumerator(e[Symbol.iterator]());
    }
  }
  function toIterator(en) {
    return {
      next() {
        const hasNext = en["System.Collections.IEnumerator.MoveNext"]();
        const current = hasNext ? en["System.Collections.Generic.IEnumerator`1.get_Current"]() : void 0;
        return { done: !hasNext, value: current };
      }
    };
  }
  function padWithZeros(i, length) {
    return i.toString(10).padStart(length, "0");
  }
  function dateOffset(date) {
    const date1 = date;
    return typeof date1.offset === "number" ? date1.offset : date.kind === 1 ? 0 : date.getTimezoneOffset() * -6e4;
  }
  function int32ToString(i, radix) {
    i = i;
    return i.toString(radix);
  }
  class ObjectRef {
    static id(o) {
      if (!ObjectRef.idMap.has(o)) {
        ObjectRef.idMap.set(o, ++ObjectRef.count);
      }
      return ObjectRef.idMap.get(o);
    }
  }
  ObjectRef.idMap = /* @__PURE__ */ new WeakMap();
  ObjectRef.count = 0;
  function stringHash(s2) {
    let i = 0;
    let h2 = 5381;
    const len = s2.length;
    while (i < len) {
      h2 = h2 * 33 ^ s2.charCodeAt(i++);
    }
    return h2;
  }
  function numberHash(x) {
    return x * 2654435761 | 0;
  }
  function bigintHash(x) {
    return stringHash(x.toString(32));
  }
  function combineHashCodes(hashes) {
    let h1 = 0;
    const len = hashes.length;
    for (let i = 0; i < len; i++) {
      const h2 = hashes[i];
      h1 = (h1 << 5) + h1 ^ h2;
    }
    return h1;
  }
  function physicalHash(x) {
    if (x == null) {
      return 0;
    }
    switch (typeof x) {
      case "boolean":
        return x ? 1 : 0;
      case "number":
        return numberHash(x);
      case "bigint":
        return bigintHash(x);
      case "string":
        return stringHash(x);
      default:
        return numberHash(ObjectRef.id(x));
    }
  }
  function identityHash(x) {
    if (isHashable(x)) {
      return x.GetHashCode();
    } else {
      return physicalHash(x);
    }
  }
  function dateHash(x) {
    return x.getTime();
  }
  function arrayHash(x) {
    const len = x.length;
    const hashes = new Array(len);
    for (let i = 0; i < len; i++) {
      hashes[i] = structuralHash(x[i]);
    }
    return combineHashCodes(hashes);
  }
  function structuralHash(x) {
    var _a;
    if (x == null) {
      return 0;
    }
    switch (typeof x) {
      case "boolean":
        return x ? 1 : 0;
      case "number":
        return numberHash(x);
      case "bigint":
        return bigintHash(x);
      case "string":
        return stringHash(x);
      default: {
        if (isHashable(x)) {
          return x.GetHashCode();
        } else if (isArrayLike(x)) {
          return arrayHash(x);
        } else if (x instanceof Date) {
          return dateHash(x);
        } else if (((_a = Object.getPrototypeOf(x)) == null ? void 0 : _a.constructor) === Object) {
          const hashes = Object.values(x).map((v) => structuralHash(v));
          return combineHashCodes(hashes);
        } else {
          return numberHash(ObjectRef.id(x));
        }
      }
    }
  }
  function safeHash(x) {
    return identityHash(x);
  }
  function equalArraysWith(x, y, eq) {
    if (x == null) {
      return y == null;
    }
    if (y == null) {
      return false;
    }
    if (x.length !== y.length) {
      return false;
    }
    for (let i = 0; i < x.length; i++) {
      if (!eq(x[i], y[i])) {
        return false;
      }
    }
    return true;
  }
  function equalArrays(x, y) {
    return equalArraysWith(x, y, equals);
  }
  function equalObjects(x, y) {
    const xKeys = Object.keys(x);
    const yKeys = Object.keys(y);
    if (xKeys.length !== yKeys.length) {
      return false;
    }
    xKeys.sort();
    yKeys.sort();
    for (let i = 0; i < xKeys.length; i++) {
      if (xKeys[i] !== yKeys[i] || !equals(x[xKeys[i]], y[yKeys[i]])) {
        return false;
      }
    }
    return true;
  }
  function equals(x, y) {
    var _a;
    if (x === y) {
      return true;
    } else if (x == null) {
      return y == null;
    } else if (y == null) {
      return false;
    } else if (isEquatable(x)) {
      return x.Equals(y);
    } else if (isArrayLike(x)) {
      return isArrayLike(y) && equalArrays(x, y);
    } else if (typeof x !== "object") {
      return false;
    } else if (x instanceof Date) {
      return y instanceof Date && compareDates(x, y) === 0;
    } else {
      return ((_a = Object.getPrototypeOf(x)) == null ? void 0 : _a.constructor) === Object && equalObjects(x, y);
    }
  }
  function compareDates(x, y) {
    let xtime;
    let ytime;
    if ("offset" in x && "offset" in y) {
      xtime = x.getTime();
      ytime = y.getTime();
    } else {
      xtime = x.getTime() + dateOffset(x);
      ytime = y.getTime() + dateOffset(y);
    }
    return xtime === ytime ? 0 : xtime < ytime ? -1 : 1;
  }
  function comparePrimitives(x, y) {
    return x === y ? 0 : x < y ? -1 : 1;
  }
  function compareArraysWith(x, y, comp) {
    if (x == null) {
      return y == null ? 0 : 1;
    }
    if (y == null) {
      return -1;
    }
    if (x.length !== y.length) {
      return x.length < y.length ? -1 : 1;
    }
    for (let i = 0, j = 0; i < x.length; i++) {
      j = comp(x[i], y[i]);
      if (j !== 0) {
        return j;
      }
    }
    return 0;
  }
  function compareArrays(x, y) {
    return compareArraysWith(x, y, compare$1);
  }
  function compareObjects(x, y) {
    const xKeys = Object.keys(x);
    const yKeys = Object.keys(y);
    if (xKeys.length !== yKeys.length) {
      return xKeys.length < yKeys.length ? -1 : 1;
    }
    xKeys.sort();
    yKeys.sort();
    for (let i = 0, j = 0; i < xKeys.length; i++) {
      const key = xKeys[i];
      if (key !== yKeys[i]) {
        return key < yKeys[i] ? -1 : 1;
      } else {
        j = compare$1(x[key], y[key]);
        if (j !== 0) {
          return j;
        }
      }
    }
    return 0;
  }
  function compare$1(x, y) {
    var _a;
    if (x === y) {
      return 0;
    } else if (x == null) {
      return y == null ? 0 : -1;
    } else if (y == null) {
      return 1;
    } else if (isComparable(x)) {
      return x.CompareTo(y);
    } else if (isArrayLike(x)) {
      return isArrayLike(y) ? compareArrays(x, y) : -1;
    } else if (typeof x !== "object") {
      return x < y ? -1 : 1;
    } else if (x instanceof Date) {
      return y instanceof Date ? compareDates(x, y) : -1;
    } else {
      return ((_a = Object.getPrototypeOf(x)) == null ? void 0 : _a.constructor) === Object ? compareObjects(x, y) : -1;
    }
  }
  function min$3(comparer, x, y) {
    return comparer(x, y) < 0 ? x : y;
  }
  function max$3(comparer, x, y) {
    return comparer(x, y) > 0 ? x : y;
  }
  function createObj(fields) {
    const obj = {};
    for (const kv of fields) {
      obj[kv[0]] = kv[1];
    }
    return obj;
  }
  function round(value2, digits = 0) {
    const m = Math.pow(10, digits);
    const n = +(digits ? value2 * m : value2).toFixed(8);
    const i = Math.floor(n);
    const f = n - i;
    const e = 1e-8;
    const r = f > 0.5 - e && f < 0.5 + e ? i % 2 === 0 ? i : i + 1 : Math.round(n);
    return digits ? r / m : r;
  }
  const curried = /* @__PURE__ */ new WeakMap();
  function uncurry2(f) {
    if (f == null) {
      return null;
    }
    const f2 = (a1, a2) => f(a1)(a2);
    curried.set(f2, f);
    return f2;
  }
  function curry2(f) {
    return curried.get(f) ?? ((a1) => (a2) => f(a1, a2));
  }
  function curry3(f) {
    return curried.get(f) ?? ((a1) => (a2) => (a3) => f(a1, a2, a3));
  }
  function seqToString(self2) {
    let count = 0;
    let str = "[";
    for (const x of self2) {
      if (count === 0) {
        str += toString$1(x);
      } else if (count === 100) {
        str += "; ...";
        break;
      } else {
        str += "; " + toString$1(x);
      }
      count++;
    }
    return str + "]";
  }
  function toString$1(x, callStack = 0) {
    var _a;
    if (x != null && typeof x === "object") {
      if (typeof x.toString === "function") {
        return x.toString();
      } else if (Symbol.iterator in x) {
        return seqToString(x);
      } else {
        const cons2 = (_a = Object.getPrototypeOf(x)) == null ? void 0 : _a.constructor;
        return cons2 === Object && callStack < 10 ? "{ " + Object.entries(x).map(([k, v]) => k + " = " + toString$1(v, callStack + 1)).join("\n  ") + " }" : (cons2 == null ? void 0 : cons2.name) ?? "";
      }
    }
    return String(x);
  }
  function unionToString(name, fields) {
    if (fields.length === 0) {
      return name;
    } else {
      let fieldStr;
      let withParens = true;
      if (fields.length === 1) {
        fieldStr = toString$1(fields[0]);
        withParens = fieldStr.indexOf(" ") >= 0;
      } else {
        fieldStr = fields.map((x) => toString$1(x)).join(", ");
      }
      return name + (withParens ? " (" : " ") + fieldStr + (withParens ? ")" : "");
    }
  }
  class Union {
    get name() {
      return this.cases()[this.tag];
    }
    toJSON() {
      return this.fields.length === 0 ? this.name : [this.name].concat(this.fields);
    }
    toString() {
      return unionToString(this.name, this.fields);
    }
    GetHashCode() {
      const hashes = this.fields.map((x) => structuralHash(x));
      hashes.splice(0, 0, numberHash(this.tag));
      return combineHashCodes(hashes);
    }
    Equals(other) {
      if (this === other) {
        return true;
      } else if (!sameConstructor(this, other)) {
        return false;
      } else if (this.tag === other.tag) {
        return equalArrays(this.fields, other.fields);
      } else {
        return false;
      }
    }
    CompareTo(other) {
      if (this === other) {
        return 0;
      } else if (!sameConstructor(this, other)) {
        return -1;
      } else if (this.tag === other.tag) {
        return compareArrays(this.fields, other.fields);
      } else {
        return this.tag < other.tag ? -1 : 1;
      }
    }
  }
  function recordToJSON(self2) {
    const o = {};
    const keys = Object.keys(self2);
    for (let i = 0; i < keys.length; i++) {
      o[keys[i]] = self2[keys[i]];
    }
    return o;
  }
  function recordToString(self2) {
    return "{ " + Object.entries(self2).map(([k, v]) => k + " = " + toString$1(v)).join("\n  ") + " }";
  }
  function recordGetHashCode(self2) {
    const hashes = Object.values(self2).map((v) => structuralHash(v));
    return combineHashCodes(hashes);
  }
  function recordEquals(self2, other) {
    if (self2 === other) {
      return true;
    } else if (!sameConstructor(self2, other)) {
      return false;
    } else {
      const thisNames = Object.keys(self2);
      for (let i = 0; i < thisNames.length; i++) {
        if (!equals(self2[thisNames[i]], other[thisNames[i]])) {
          return false;
        }
      }
      return true;
    }
  }
  function recordCompareTo(self2, other) {
    if (self2 === other) {
      return 0;
    } else if (!sameConstructor(self2, other)) {
      return -1;
    } else {
      const thisNames = Object.keys(self2);
      for (let i = 0; i < thisNames.length; i++) {
        const result = compare$1(self2[thisNames[i]], other[thisNames[i]]);
        if (result !== 0) {
          return result;
        }
      }
      return 0;
    }
  }
  class Record {
    toJSON() {
      return recordToJSON(this);
    }
    toString() {
      return recordToString(this);
    }
    GetHashCode() {
      return recordGetHashCode(this);
    }
    Equals(other) {
      return recordEquals(this, other);
    }
    CompareTo(other) {
      return recordCompareTo(this, other);
    }
  }
  class FSharpRef {
    get contents() {
      return this.getter();
    }
    set contents(v) {
      this.setter(v);
    }
    constructor(contentsOrGetter, setter) {
      if (typeof setter === "function") {
        this.getter = contentsOrGetter;
        this.setter = setter;
      } else {
        this.getter = () => contentsOrGetter;
        this.setter = (v) => {
          contentsOrGetter = v;
        };
      }
    }
  }
  const symbol = Symbol("numeric");
  function isNumeric(x) {
    return typeof x === "number" || typeof x === "bigint" || (x == null ? void 0 : x[symbol]);
  }
  function compare(x, y) {
    if (typeof x === "number") {
      return x < y ? -1 : x > y ? 1 : 0;
    } else if (typeof x === "bigint") {
      return x < y ? -1 : x > y ? 1 : 0;
    } else {
      return x.CompareTo(y);
    }
  }
  function multiply(x, y) {
    if (typeof x === "number") {
      return x * y;
    } else if (typeof x === "bigint") {
      return x * BigInt(y);
    } else {
      return x[symbol]().multiply(y);
    }
  }
  function toFixed(x, dp) {
    if (typeof x === "number") {
      return x.toFixed(dp);
    } else if (typeof x === "bigint") {
      return x;
    } else {
      return x[symbol]().toFixed(dp);
    }
  }
  function toPrecision(x, sd) {
    if (typeof x === "number") {
      return x.toPrecision(sd);
    } else if (typeof x === "bigint") {
      return x;
    } else {
      return x[symbol]().toPrecision(sd);
    }
  }
  function toExponential(x, dp) {
    if (typeof x === "number") {
      return x.toExponential(dp);
    } else if (typeof x === "bigint") {
      return x;
    } else {
      return x[symbol]().toExponential(dp);
    }
  }
  function toHex(x) {
    if (typeof x === "number") {
      return (Number(x) >>> 0).toString(16);
    } else if (typeof x === "bigint") {
      return BigInt.asUintN(64, x).toString(16);
    } else {
      return x[symbol]().toHex();
    }
  }
  function dateOffsetToString(offset) {
    const isMinus = offset < 0;
    offset = Math.abs(offset);
    const hours = ~~(offset / 36e5);
    const minutes = offset % 36e5 / 6e4;
    return (isMinus ? "-" : "+") + padWithZeros(hours, 2) + ":" + padWithZeros(minutes, 2);
  }
  function dateToStringWithOffset(date, format) {
    const d = new Date(date.getTime() + (date.offset ?? 0));
    {
      return d.toISOString().replace(/\.\d+/, "").replace(/[A-Z]|\.\d+/g, " ") + dateOffsetToString(date.offset ?? 0);
    }
  }
  function dateToStringWithKind(date, format) {
    const utc = date.kind === 1;
    {
      return utc ? date.toUTCString() : date.toLocaleString();
    }
  }
  function toString(date, format, _provider) {
    return date.offset != null ? dateToStringWithOffset(date) : dateToStringWithKind(date);
  }
  function escape(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }
  const fsFormatRegExp = /(^|[^%])%([0+\- ]*)(\*|\d+)?(?:\.(\d+))?(\w)/g;
  function isLessThan(x, y) {
    return compare(x, y) < 0;
  }
  function printf(input) {
    return {
      input,
      cont: fsFormat(input)
    };
  }
  function continuePrint(cont, arg) {
    return typeof arg === "string" ? cont(arg) : arg.cont(cont);
  }
  function toText(arg) {
    return continuePrint((x) => x, arg);
  }
  function toFail(arg) {
    return continuePrint((x) => {
      throw new Error(x);
    }, arg);
  }
  function formatReplacement(rep, flags, padLength, precision, format) {
    let sign = "";
    flags = flags || "";
    format = format || "";
    if (isNumeric(rep)) {
      if (format.toLowerCase() !== "x") {
        if (isLessThan(rep, 0)) {
          rep = multiply(rep, -1);
          sign = "-";
        } else {
          if (flags.indexOf(" ") >= 0) {
            sign = " ";
          } else if (flags.indexOf("+") >= 0) {
            sign = "+";
          }
        }
      }
      precision = precision == null ? null : parseInt(precision, 10);
      switch (format) {
        case "f":
        case "F":
          precision = precision != null ? precision : 6;
          rep = toFixed(rep, precision);
          break;
        case "g":
        case "G":
          rep = precision != null ? toPrecision(rep, precision) : toPrecision(rep);
          break;
        case "e":
        case "E":
          rep = precision != null ? toExponential(rep, precision) : toExponential(rep);
          break;
        case "x":
          rep = toHex(rep);
          break;
        case "X":
          rep = toHex(rep).toUpperCase();
          break;
        default:
          rep = String(rep);
          break;
      }
    } else if (rep instanceof Date) {
      rep = toString(rep);
    } else {
      rep = toString$1(rep);
    }
    padLength = typeof padLength === "number" ? padLength : parseInt(padLength, 10);
    if (!isNaN(padLength)) {
      const zeroFlag = flags.indexOf("0") >= 0;
      const minusFlag = flags.indexOf("-") >= 0;
      const ch = minusFlag || !zeroFlag ? " " : "0";
      if (ch === "0") {
        rep = pad(rep, padLength - sign.length, ch, minusFlag);
        rep = sign + rep;
      } else {
        rep = pad(sign + rep, padLength, ch, minusFlag);
      }
    } else {
      rep = sign + rep;
    }
    return rep;
  }
  function createPrinter(cont, _strParts, _matches, _result = "", padArg = -1) {
    return (...args) => {
      let result = _result;
      const strParts = _strParts.slice();
      const matches = _matches.slice();
      for (const arg of args) {
        const [, , flags, _padLength, precision, format] = matches[0];
        let padLength = _padLength;
        if (padArg >= 0) {
          padLength = padArg;
          padArg = -1;
        } else if (padLength === "*") {
          if (arg < 0) {
            throw new Error("Non-negative number required");
          }
          padArg = arg;
          continue;
        }
        result += strParts[0];
        result += formatReplacement(arg, flags, padLength, precision, format);
        strParts.splice(0, 1);
        matches.splice(0, 1);
      }
      if (matches.length === 0) {
        result += strParts[0];
        return cont(result);
      } else {
        return createPrinter(cont, strParts, matches, result, padArg);
      }
    };
  }
  function fsFormat(str) {
    return (cont) => {
      fsFormatRegExp.lastIndex = 0;
      const strParts = [];
      const matches = [];
      let strIdx = 0;
      let match = fsFormatRegExp.exec(str);
      while (match) {
        const matchIndex = match.index + (match[1] || "").length;
        strParts.push(str.substring(strIdx, matchIndex).replace(/%%/g, "%"));
        matches.push(match);
        strIdx = fsFormatRegExp.lastIndex;
        fsFormatRegExp.lastIndex -= 1;
        match = fsFormatRegExp.exec(str);
      }
      if (strParts.length === 0) {
        return cont(str.replace(/%%/g, "%"));
      } else {
        strParts.push(str.substring(strIdx).replace(/%%/g, "%"));
        return createPrinter(cont, strParts, matches);
      }
    };
  }
  function insert(str, startIndex, value2) {
    if (startIndex < 0 || startIndex > str.length) {
      throw new Error("startIndex is negative or greater than the length of this instance.");
    }
    return str.substring(0, startIndex) + value2 + str.substring(startIndex);
  }
  function join(delimiter, xs) {
    if (Array.isArray(xs)) {
      return xs.join(delimiter);
    } else {
      return Array.from(xs).join(delimiter);
    }
  }
  function pad(str, len, ch, isRight) {
    ch = ch || " ";
    len = len - str.length;
    for (let i = 0; i < len; i++) {
      str = isRight ? str + ch : ch + str;
    }
    return str;
  }
  function replace(str, search, replace2) {
    return str.replace(new RegExp(escape(search), "g"), replace2);
  }
  function split(str, splitters, count, options) {
    count = typeof count === "number" ? count : void 0;
    options = typeof options === "number" ? options : 0;
    if (count && count < 0) {
      throw new Error("Count cannot be less than zero");
    }
    if (count === 0) {
      return [];
    }
    const removeEmpty = (options & 1) === 1;
    const trim = (options & 2) === 2;
    splitters = splitters || [];
    splitters = splitters.filter((x) => x).map(escape);
    splitters = splitters.length > 0 ? splitters : ["\\s"];
    const splits = [];
    const reg = new RegExp(splitters.join("|"), "g");
    let findSplits = true;
    let i = 0;
    do {
      const match = reg.exec(str);
      if (match === null) {
        const candidate = trim ? str.substring(i).trim() : str.substring(i);
        if (!removeEmpty || candidate.length > 0) {
          splits.push(candidate);
        }
        findSplits = false;
      } else {
        const candidate = trim ? str.substring(i, match.index).trim() : str.substring(i, match.index);
        if (!removeEmpty || candidate.length > 0) {
          if (count != null && splits.length + 1 === count) {
            splits.push(trim ? str.substring(i).trim() : str.substring(i));
            findSplits = false;
          } else {
            splits.push(candidate);
          }
        }
        i = reg.lastIndex;
      }
    } while (findSplits);
    return splits;
  }
  function substring(str, startIndex, length) {
    if (startIndex + (length || 0) > str.length) {
      throw new Error("Invalid startIndex and/or length");
    }
    return length != null ? str.substr(startIndex, length) : str.substr(startIndex);
  }
  class Some {
    constructor(value2) {
      this.value = value2;
    }
    toJSON() {
      return this.value;
    }
    // Don't add "Some" for consistency with erased options
    toString() {
      return String(this.value);
    }
    GetHashCode() {
      return structuralHash(this.value);
    }
    Equals(other) {
      if (other == null) {
        return false;
      } else {
        return equals(this.value, other instanceof Some ? other.value : other);
      }
    }
    CompareTo(other) {
      if (other == null) {
        return 1;
      } else {
        return compare$1(this.value, other instanceof Some ? other.value : other);
      }
    }
  }
  function value(x) {
    if (x == null) {
      throw new Error("Option has no value");
    } else {
      return x instanceof Some ? x.value : x;
    }
  }
  function some(x) {
    return x == null || x instanceof Some ? new Some(x) : x;
  }
  function defaultArg(opt, defaultValue) {
    return opt != null ? value(opt) : defaultValue;
  }
  const SR_inputWasEmpty = "Collection was empty.";
  function Helpers_allocateArrayFromCons(cons2, len) {
    {
      return new Array(len);
    }
  }
  function max$2(x, y) {
    return x > y ? x : y;
  }
  function min$2(x, y) {
    return x < y ? x : y;
  }
  function indexNotFound() {
    throw new Error("An index satisfying the predicate was not found in the collection.");
  }
  function append$2(array1, array2, cons2) {
    const len1 = array1.length | 0;
    const len2 = array2.length | 0;
    const newArray = Helpers_allocateArrayFromCons(cons2, len1 + len2);
    for (let i = 0; i <= len1 - 1; i++) {
      setItem(newArray, i, item(i, array1));
    }
    for (let i_1 = 0; i_1 <= len2 - 1; i_1++) {
      setItem(newArray, i_1 + len1, item(i_1, array2));
    }
    return newArray;
  }
  function fill(target, targetIndex, count, value2) {
    const start = targetIndex | 0;
    return target.fill(value2, start, start + count);
  }
  function map$1(f, source, cons2) {
    const len = source.length | 0;
    const target = Helpers_allocateArrayFromCons(cons2, len);
    for (let i = 0; i <= len - 1; i++) {
      setItem(target, i, f(item(i, source)));
    }
    return target;
  }
  function singleton$2(value2, cons2) {
    const ar = Helpers_allocateArrayFromCons(cons2, 1);
    setItem(ar, 0, value2);
    return ar;
  }
  function findIndex(predicate, array) {
    const matchValue = array.findIndex(predicate) | 0;
    if (matchValue > -1) {
      return matchValue | 0;
    } else {
      indexNotFound();
      return -1;
    }
  }
  function fold$2(folder, state, array) {
    const folder_1 = folder;
    return array.reduce(folder_1, state);
  }
  function tryHead$2(array) {
    if (array.length === 0) {
      return void 0;
    } else {
      return some(item(0, array));
    }
  }
  function item(index, array) {
    if (index < 0 ? true : index >= array.length) {
      throw new Error("Index was outside the bounds of the array.\\nParameter name: index");
    } else {
      return array[index];
    }
  }
  function setItem(array, index, value2) {
    if (index < 0 ? true : index >= array.length) {
      throw new Error("Index was outside the bounds of the array.\\nParameter name: index");
    } else {
      array[index] = value2;
    }
  }
  class FSharpList extends Record {
    constructor(head2, tail2) {
      super();
      this.head = head2;
      this.tail = tail2;
    }
    toString() {
      const xs = this;
      return "[" + join("; ", xs) + "]";
    }
    Equals(other) {
      const xs = this;
      if (xs === other) {
        return true;
      } else {
        const loop = (xs_1_mut, ys_1_mut) => {
          loop: while (true) {
            const xs_1 = xs_1_mut, ys_1 = ys_1_mut;
            const matchValue = xs_1.tail;
            const matchValue_1 = ys_1.tail;
            if (matchValue != null) {
              if (matchValue_1 != null) {
                const xt = value(matchValue);
                const yt = value(matchValue_1);
                if (equals(xs_1.head, ys_1.head)) {
                  xs_1_mut = xt;
                  ys_1_mut = yt;
                  continue loop;
                } else {
                  return false;
                }
              } else {
                return false;
              }
            } else if (matchValue_1 != null) {
              return false;
            } else {
              return true;
            }
          }
        };
        return loop(xs, other);
      }
    }
    GetHashCode() {
      const xs = this;
      const loop = (i_mut, h_mut, xs_1_mut) => {
        loop: while (true) {
          const i = i_mut, h2 = h_mut, xs_1 = xs_1_mut;
          const matchValue = xs_1.tail;
          if (matchValue != null) {
            const t = value(matchValue);
            if (i > 18) {
              return h2 | 0;
            } else {
              i_mut = i + 1;
              h_mut = (h2 << 1) + structuralHash(xs_1.head) + 631 * i;
              xs_1_mut = t;
              continue loop;
            }
          } else {
            return h2 | 0;
          }
        }
      };
      return loop(0, 0, xs) | 0;
    }
    toJSON() {
      const this$ = this;
      return Array.from(this$);
    }
    CompareTo(other) {
      const xs = this;
      const loop = (xs_1_mut, ys_1_mut) => {
        loop: while (true) {
          const xs_1 = xs_1_mut, ys_1 = ys_1_mut;
          const matchValue = xs_1.tail;
          const matchValue_1 = ys_1.tail;
          if (matchValue != null) {
            if (matchValue_1 != null) {
              const xt = value(matchValue);
              const yt = value(matchValue_1);
              const c = compare$1(xs_1.head, ys_1.head) | 0;
              if (c === 0) {
                xs_1_mut = xt;
                ys_1_mut = yt;
                continue loop;
              } else {
                return c | 0;
              }
            } else {
              return 1;
            }
          } else if (matchValue_1 != null) {
            return -1;
          } else {
            return 0;
          }
        }
      };
      return loop(xs, other) | 0;
    }
    GetEnumerator() {
      const xs = this;
      return ListEnumerator$1_$ctor_3002E699(xs);
    }
    [Symbol.iterator]() {
      return toIterator(getEnumerator(this));
    }
    "System.Collections.IEnumerable.GetEnumerator"() {
      const xs = this;
      return getEnumerator(xs);
    }
  }
  class ListEnumerator$1 {
    constructor(xs) {
      this.xs = xs;
      this.it = this.xs;
      this.current = defaultOf();
    }
    "System.Collections.Generic.IEnumerator`1.get_Current"() {
      const _ = this;
      return _.current;
    }
    "System.Collections.IEnumerator.get_Current"() {
      const _ = this;
      return _.current;
    }
    "System.Collections.IEnumerator.MoveNext"() {
      const _ = this;
      const matchValue = _.it.tail;
      if (matchValue != null) {
        const t = value(matchValue);
        _.current = _.it.head;
        _.it = t;
        return true;
      } else {
        return false;
      }
    }
    "System.Collections.IEnumerator.Reset"() {
      const _ = this;
      _.it = _.xs;
      _.current = defaultOf();
    }
    Dispose() {
    }
  }
  function ListEnumerator$1_$ctor_3002E699(xs) {
    return new ListEnumerator$1(xs);
  }
  function FSharpList_get_Empty() {
    return new FSharpList(defaultOf(), void 0);
  }
  function FSharpList_Cons_305B8EAC(x, xs) {
    return new FSharpList(x, xs);
  }
  function FSharpList__get_IsEmpty(xs) {
    return xs.tail == null;
  }
  function FSharpList__get_Length(xs) {
    const loop = (i_mut, xs_1_mut) => {
      loop: while (true) {
        const i = i_mut, xs_1 = xs_1_mut;
        const matchValue = xs_1.tail;
        if (matchValue != null) {
          i_mut = i + 1;
          xs_1_mut = value(matchValue);
          continue loop;
        } else {
          return i | 0;
        }
      }
    };
    return loop(0, xs) | 0;
  }
  function FSharpList__get_Head(xs) {
    const matchValue = xs.tail;
    if (matchValue != null) {
      return xs.head;
    } else {
      throw new Error(SR_inputWasEmpty + "\\nParameter name: list");
    }
  }
  function FSharpList__get_Tail(xs) {
    const matchValue = xs.tail;
    if (matchValue != null) {
      return value(matchValue);
    } else {
      throw new Error(SR_inputWasEmpty + "\\nParameter name: list");
    }
  }
  function empty$1() {
    return FSharpList_get_Empty();
  }
  function cons(x, xs) {
    return FSharpList_Cons_305B8EAC(x, xs);
  }
  function singleton$1(x) {
    return FSharpList_Cons_305B8EAC(x, FSharpList_get_Empty());
  }
  function isEmpty$1(xs) {
    return FSharpList__get_IsEmpty(xs);
  }
  function head$1(xs) {
    return FSharpList__get_Head(xs);
  }
  function tryHead$1(xs) {
    if (FSharpList__get_IsEmpty(xs)) {
      return void 0;
    } else {
      return some(FSharpList__get_Head(xs));
    }
  }
  function tail(xs) {
    return FSharpList__get_Tail(xs);
  }
  function toArray$1(xs) {
    const len = FSharpList__get_Length(xs) | 0;
    const res = fill(new Array(len), 0, len, null);
    const loop = (i_mut, xs_1_mut) => {
      loop: while (true) {
        const i = i_mut, xs_1 = xs_1_mut;
        if (!FSharpList__get_IsEmpty(xs_1)) {
          setItem(res, i, FSharpList__get_Head(xs_1));
          i_mut = i + 1;
          xs_1_mut = FSharpList__get_Tail(xs_1);
          continue loop;
        }
        break;
      }
    };
    loop(0, xs);
    return res;
  }
  function fold$1(folder, state, xs) {
    let acc = state;
    let xs_1 = xs;
    while (!FSharpList__get_IsEmpty(xs_1)) {
      acc = folder(acc, head$1(xs_1));
      xs_1 = FSharpList__get_Tail(xs_1);
    }
    return acc;
  }
  function reverse(xs) {
    return fold$1((acc, x) => FSharpList_Cons_305B8EAC(x, acc), FSharpList_get_Empty(), xs);
  }
  function ofArrayWithTail(xs, tail_1) {
    let res = tail_1;
    for (let i = xs.length - 1; i >= 0; i--) {
      res = FSharpList_Cons_305B8EAC(item(i, xs), res);
    }
    return res;
  }
  function ofArray(xs) {
    return ofArrayWithTail(xs, FSharpList_get_Empty());
  }
  function ofSeq$1(xs) {
    let xs_3, t;
    if (isArrayLike(xs)) {
      return ofArray(xs);
    } else if (xs instanceof FSharpList) {
      return xs;
    } else {
      const root = FSharpList_get_Empty();
      let node = root;
      const enumerator = getEnumerator(xs);
      try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
          const x = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
          node = (xs_3 = node, t = new FSharpList(x, void 0), xs_3.tail = t, t);
        }
      } finally {
        disposeSafe(enumerator);
      }
      const xs_5 = node;
      const t_2 = FSharpList_get_Empty();
      xs_5.tail = t_2;
      return FSharpList__get_Tail(root);
    }
  }
  function append$1(xs, ys) {
    return fold$1((acc, x) => FSharpList_Cons_305B8EAC(x, acc), ys, reverse(xs));
  }
  function reduce$1(f, xs) {
    if (FSharpList__get_IsEmpty(xs)) {
      throw new Error(SR_inputWasEmpty);
    } else {
      return fold$1(f, head$1(xs), tail(xs));
    }
  }
  function max$1(xs, comparer) {
    return reduce$1((x, y) => comparer.Compare(y, x) > 0 ? y : x, xs);
  }
  function min$1(xs, comparer) {
    return reduce$1((x, y) => comparer.Compare(y, x) > 0 ? x : y, xs);
  }
  function Operators_NullArg(x) {
    throw new Error(x);
  }
  const SR_enumerationAlreadyFinished = "Enumeration already finished.";
  const SR_enumerationNotStarted = "Enumeration has not started. Call MoveNext.";
  const SR_inputSequenceEmpty = "The input sequence was empty.";
  const SR_notEnoughElements = "The input sequence has an insufficient number of elements.";
  const SR_resetNotSupported = "Reset is not supported on this enumerator.";
  function Enumerator_noReset() {
    throw new Error(SR_resetNotSupported);
  }
  function Enumerator_notStarted() {
    throw new Error(SR_enumerationNotStarted);
  }
  function Enumerator_alreadyFinished() {
    throw new Error(SR_enumerationAlreadyFinished);
  }
  class Enumerator_Seq {
    constructor(f) {
      this.f = f;
    }
    toString() {
      const xs = this;
      let i = 0;
      let str = "seq [";
      const e = getEnumerator(xs);
      try {
        while (i < 4 && e["System.Collections.IEnumerator.MoveNext"]()) {
          if (i > 0) {
            str = str + "; ";
          }
          str = str + toString$1(e["System.Collections.Generic.IEnumerator`1.get_Current"]());
          i = i + 1 | 0;
        }
        if (i === 4) {
          str = str + "; ...";
        }
        return str + "]";
      } finally {
        disposeSafe(e);
      }
    }
    GetEnumerator() {
      const x = this;
      return x.f();
    }
    [Symbol.iterator]() {
      return toIterator(getEnumerator(this));
    }
    "System.Collections.IEnumerable.GetEnumerator"() {
      const x = this;
      return x.f();
    }
  }
  function Enumerator_Seq_$ctor_673A07F2(f) {
    return new Enumerator_Seq(f);
  }
  class Enumerator_FromFunctions$1 {
    constructor(current, next, dispose) {
      this.current = current;
      this.next = next;
      this.dispose = dispose;
    }
    "System.Collections.Generic.IEnumerator`1.get_Current"() {
      const _ = this;
      return _.current();
    }
    "System.Collections.IEnumerator.get_Current"() {
      const _ = this;
      return _.current();
    }
    "System.Collections.IEnumerator.MoveNext"() {
      const _ = this;
      return _.next();
    }
    "System.Collections.IEnumerator.Reset"() {
      Enumerator_noReset();
    }
    Dispose() {
      const _ = this;
      _.dispose();
    }
  }
  function Enumerator_FromFunctions$1_$ctor_58C54629(current, next, dispose) {
    return new Enumerator_FromFunctions$1(current, next, dispose);
  }
  function Enumerator_concat(sources) {
    let outerOpt = void 0;
    let innerOpt = void 0;
    let started = false;
    let finished = false;
    let curr = void 0;
    const finish = () => {
      finished = true;
      if (innerOpt != null) {
        const inner = value(innerOpt);
        try {
          disposeSafe(inner);
        } finally {
          innerOpt = void 0;
        }
      }
      if (outerOpt != null) {
        const outer = value(outerOpt);
        try {
          disposeSafe(outer);
        } finally {
          outerOpt = void 0;
        }
      }
    };
    return Enumerator_FromFunctions$1_$ctor_58C54629(() => {
      if (!started) {
        Enumerator_notStarted();
      } else if (finished) {
        Enumerator_alreadyFinished();
      }
      if (curr != null) {
        return value(curr);
      } else {
        return Enumerator_alreadyFinished();
      }
    }, () => {
      let copyOfStruct;
      if (!started) {
        started = true;
      }
      if (finished) {
        return false;
      } else {
        let res = void 0;
        while (res == null) {
          const outerOpt_1 = outerOpt;
          const innerOpt_1 = innerOpt;
          if (outerOpt_1 != null) {
            if (innerOpt_1 != null) {
              const inner_1 = value(innerOpt_1);
              if (inner_1["System.Collections.IEnumerator.MoveNext"]()) {
                curr = some(inner_1["System.Collections.Generic.IEnumerator`1.get_Current"]());
                res = true;
              } else {
                try {
                  disposeSafe(inner_1);
                } finally {
                  innerOpt = void 0;
                }
              }
            } else {
              const outer_1 = value(outerOpt_1);
              if (outer_1["System.Collections.IEnumerator.MoveNext"]()) {
                const ie = outer_1["System.Collections.Generic.IEnumerator`1.get_Current"]();
                innerOpt = (copyOfStruct = ie, getEnumerator(copyOfStruct));
              } else {
                finish();
                res = false;
              }
            }
          } else {
            outerOpt = getEnumerator(sources);
          }
        }
        return value(res);
      }
    }, () => {
      if (!finished) {
        finish();
      }
    });
  }
  function Enumerator_enumerateThenFinally(f, e) {
    return Enumerator_FromFunctions$1_$ctor_58C54629(() => e["System.Collections.Generic.IEnumerator`1.get_Current"](), () => e["System.Collections.IEnumerator.MoveNext"](), () => {
      try {
        disposeSafe(e);
      } finally {
      }
    });
  }
  function Enumerator_generateWhileSome(openf, compute, closef) {
    let started = false;
    let curr = void 0;
    let state = some(openf());
    const dispose = () => {
      if (state != null) {
        const x_1 = value(state);
        try {
          closef(x_1);
        } finally {
          state = void 0;
        }
      }
    };
    const finish = () => {
      try {
        dispose();
      } finally {
        curr = void 0;
      }
    };
    return Enumerator_FromFunctions$1_$ctor_58C54629(() => {
      if (!started) {
        Enumerator_notStarted();
      }
      if (curr != null) {
        return value(curr);
      } else {
        return Enumerator_alreadyFinished();
      }
    }, () => {
      if (!started) {
        started = true;
      }
      if (state != null) {
        const s2 = value(state);
        let matchValue_1;
        try {
          matchValue_1 = compute(s2);
        } catch (matchValue) {
          finish();
          throw matchValue;
        }
        if (matchValue_1 != null) {
          curr = matchValue_1;
          return true;
        } else {
          finish();
          return false;
        }
      } else {
        return false;
      }
    }, dispose);
  }
  function Enumerator_unfold(f, state) {
    let curr = void 0;
    let acc = state;
    return Enumerator_FromFunctions$1_$ctor_58C54629(() => {
      if (curr != null) {
        const x = value(curr)[0];
        value(curr)[1];
        return x;
      } else {
        return Enumerator_notStarted();
      }
    }, () => {
      curr = f(acc);
      if (curr != null) {
        value(curr)[0];
        const st_1 = value(curr)[1];
        acc = st_1;
        return true;
      } else {
        return false;
      }
    }, () => {
    });
  }
  function checkNonNull(argName, arg) {
    if (arg == null) {
      Operators_NullArg(argName);
    }
  }
  function mkSeq(f) {
    return Enumerator_Seq_$ctor_673A07F2(f);
  }
  function ofSeq(xs) {
    checkNonNull("source", xs);
    return getEnumerator(xs);
  }
  function delay(generator) {
    return mkSeq(() => getEnumerator(generator()));
  }
  function concat(sources) {
    return mkSeq(() => Enumerator_concat(sources));
  }
  function unfold(generator, state) {
    return mkSeq(() => Enumerator_unfold(generator, state));
  }
  function empty() {
    return delay(() => new Array(0));
  }
  function singleton(x) {
    return delay(() => singleton$2(x));
  }
  function toArray(xs) {
    if (xs instanceof FSharpList) {
      const a = xs;
      return toArray$1(a);
    } else {
      return Array.from(xs);
    }
  }
  function toList(xs) {
    if (isArrayLike(xs)) {
      return ofArray(xs);
    } else if (xs instanceof FSharpList) {
      return xs;
    } else {
      return ofSeq$1(xs);
    }
  }
  function generate(create, compute, dispose) {
    return mkSeq(() => Enumerator_generateWhileSome(create, compute, dispose));
  }
  function append(xs, ys) {
    return concat([xs, ys]);
  }
  function choose(chooser, xs) {
    return generate(() => ofSeq(xs), (e) => {
      let curr = void 0;
      while (curr == null && e["System.Collections.IEnumerator.MoveNext"]()) {
        curr = chooser(e["System.Collections.Generic.IEnumerator`1.get_Current"]());
      }
      return curr;
    }, (e_1) => {
      disposeSafe(e_1);
    });
  }
  function filter(f, xs) {
    return choose((x) => {
      if (f(x)) {
        return some(x);
      } else {
        return void 0;
      }
    }, xs);
  }
  function exists(predicate, xs) {
    const e = ofSeq(xs);
    try {
      let found = false;
      while (!found && e["System.Collections.IEnumerator.MoveNext"]()) {
        found = predicate(e["System.Collections.Generic.IEnumerator`1.get_Current"]());
      }
      return found;
    } finally {
      disposeSafe(e);
    }
  }
  function fold(folder, state, xs) {
    const e = ofSeq(xs);
    try {
      let acc = state;
      while (e["System.Collections.IEnumerator.MoveNext"]()) {
        acc = folder(acc, e["System.Collections.Generic.IEnumerator`1.get_Current"]());
      }
      return acc;
    } finally {
      disposeSafe(e);
    }
  }
  function forAll(predicate, xs) {
    return !exists((x) => !predicate(x), xs);
  }
  function tryHead(xs) {
    if (isArrayLike(xs)) {
      return tryHead$2(xs);
    } else if (xs instanceof FSharpList) {
      return tryHead$1(xs);
    } else {
      const e = ofSeq(xs);
      try {
        return e["System.Collections.IEnumerator.MoveNext"]() ? some(e["System.Collections.Generic.IEnumerator`1.get_Current"]()) : void 0;
      } finally {
        disposeSafe(e);
      }
    }
  }
  function head(xs) {
    const matchValue = tryHead(xs);
    if (matchValue == null) {
      throw new Error(SR_inputSequenceEmpty + "\\nParameter name: source");
    } else {
      return value(matchValue);
    }
  }
  function isEmpty(xs) {
    if (isArrayLike(xs)) {
      const a = xs;
      return a.length === 0;
    } else if (xs instanceof FSharpList) {
      return isEmpty$1(xs);
    } else {
      const e = ofSeq(xs);
      try {
        return !e["System.Collections.IEnumerator.MoveNext"]();
      } finally {
        disposeSafe(e);
      }
    }
  }
  function iterate(action, xs) {
    fold((unitVar, x) => {
      action(x);
    }, void 0, xs);
  }
  function iterateIndexed(action, xs) {
    fold((i, x) => {
      action(i, x);
      return i + 1 | 0;
    }, 0, xs);
  }
  function map(mapping, xs) {
    return generate(() => ofSeq(xs), (e) => e["System.Collections.IEnumerator.MoveNext"]() ? some(mapping(e["System.Collections.Generic.IEnumerator`1.get_Current"]())) : void 0, (e_1) => {
      disposeSafe(e_1);
    });
  }
  function reduce(folder, xs) {
    const e = ofSeq(xs);
    try {
      const loop = (acc_mut) => {
        loop: while (true) {
          const acc = acc_mut;
          if (e["System.Collections.IEnumerator.MoveNext"]()) {
            acc_mut = folder(acc, e["System.Collections.Generic.IEnumerator`1.get_Current"]());
            continue loop;
          } else {
            return acc;
          }
          break;
        }
      };
      if (e["System.Collections.IEnumerator.MoveNext"]()) {
        return loop(e["System.Collections.Generic.IEnumerator`1.get_Current"]());
      } else {
        throw new Error(SR_inputSequenceEmpty);
      }
    } finally {
      disposeSafe(e);
    }
  }
  function skip(count, source) {
    return mkSeq(() => {
      const e = ofSeq(source);
      try {
        for (let _ = 1; _ <= count; _++) {
          if (!e["System.Collections.IEnumerator.MoveNext"]()) {
            throw new Error(SR_notEnoughElements + "\\nParameter name: source");
          }
        }
        return Enumerator_enumerateThenFinally(() => {
        }, e);
      } catch (matchValue) {
        disposeSafe(e);
        throw matchValue;
      }
    });
  }
  function collect(mapping, xs) {
    return delay(() => concat(map(mapping, xs)));
  }
  function max(xs, comparer) {
    return reduce((x, y) => comparer.Compare(y, x) > 0 ? y : x, xs);
  }
  function min(xs, comparer) {
    return reduce((x, y) => comparer.Compare(y, x) > 0 ? x : y, xs);
  }
  function makeRangeStepFunction(step, stop, zero, add2) {
    const stepComparedWithZero = compare$1(step, zero) | 0;
    if (stepComparedWithZero === 0) {
      throw new Error("The step of a range cannot be zero");
    }
    const stepGreaterThanZero = stepComparedWithZero > 0;
    return (x) => {
      const comparedWithLast = compare$1(x, stop) | 0;
      return (stepGreaterThanZero && comparedWithLast <= 0 ? true : !stepGreaterThanZero && comparedWithLast >= 0) ? [x, add2(x, step)] : void 0;
    };
  }
  function integralRangeStep(start, step, stop, zero, add2) {
    const stepFn = makeRangeStepFunction(step, stop, zero, add2);
    return delay(() => unfold(stepFn, start));
  }
  function rangeDouble(start, step, stop) {
    return integralRangeStep(start, step, stop, 0, (x, y) => x + y);
  }
  var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
  function getAugmentedNamespace(n) {
    if (Object.prototype.hasOwnProperty.call(n, "__esModule")) return n;
    var f = n.default;
    if (typeof f == "function") {
      var a = function a2() {
        if (this instanceof a2) {
          return Reflect.construct(f, arguments, this.constructor);
        }
        return f.apply(this, arguments);
      };
      a.prototype = f.prototype;
    } else a = {};
    Object.defineProperty(a, "__esModule", { value: true });
    Object.keys(n).forEach(function(k) {
      var d = Object.getOwnPropertyDescriptor(n, k);
      Object.defineProperty(a, k, d.get ? d : {
        enumerable: true,
        get: function() {
          return n[k];
        }
      });
    });
    return a;
  }
  var xIsArray;
  var hasRequiredXIsArray;
  function requireXIsArray() {
    if (hasRequiredXIsArray) return xIsArray;
    hasRequiredXIsArray = 1;
    var nativeIsArray = Array.isArray;
    var toString2 = Object.prototype.toString;
    xIsArray = nativeIsArray || isArray;
    function isArray(obj) {
      return toString2.call(obj) === "[object Array]";
    }
    return xIsArray;
  }
  var version;
  var hasRequiredVersion;
  function requireVersion() {
    if (hasRequiredVersion) return version;
    hasRequiredVersion = 1;
    version = "2";
    return version;
  }
  var vpatch;
  var hasRequiredVpatch;
  function requireVpatch() {
    if (hasRequiredVpatch) return vpatch;
    hasRequiredVpatch = 1;
    var version2 = requireVersion();
    VirtualPatch.NONE = 0;
    VirtualPatch.VTEXT = 1;
    VirtualPatch.VNODE = 2;
    VirtualPatch.WIDGET = 3;
    VirtualPatch.PROPS = 4;
    VirtualPatch.ORDER = 5;
    VirtualPatch.INSERT = 6;
    VirtualPatch.REMOVE = 7;
    VirtualPatch.THUNK = 8;
    vpatch = VirtualPatch;
    function VirtualPatch(type, vNode, patch) {
      this.type = Number(type);
      this.vNode = vNode;
      this.patch = patch;
    }
    VirtualPatch.prototype.version = version2;
    VirtualPatch.prototype.type = "VirtualPatch";
    return vpatch;
  }
  var isVnode;
  var hasRequiredIsVnode;
  function requireIsVnode() {
    if (hasRequiredIsVnode) return isVnode;
    hasRequiredIsVnode = 1;
    var version2 = requireVersion();
    isVnode = isVirtualNode;
    function isVirtualNode(x) {
      return x && x.type === "VirtualNode" && x.version === version2;
    }
    return isVnode;
  }
  var isVtext;
  var hasRequiredIsVtext;
  function requireIsVtext() {
    if (hasRequiredIsVtext) return isVtext;
    hasRequiredIsVtext = 1;
    var version2 = requireVersion();
    isVtext = isVirtualText;
    function isVirtualText(x) {
      return x && x.type === "VirtualText" && x.version === version2;
    }
    return isVtext;
  }
  var isWidget_1;
  var hasRequiredIsWidget;
  function requireIsWidget() {
    if (hasRequiredIsWidget) return isWidget_1;
    hasRequiredIsWidget = 1;
    isWidget_1 = isWidget;
    function isWidget(w) {
      return w && w.type === "Widget";
    }
    return isWidget_1;
  }
  var isThunk_1;
  var hasRequiredIsThunk;
  function requireIsThunk() {
    if (hasRequiredIsThunk) return isThunk_1;
    hasRequiredIsThunk = 1;
    isThunk_1 = isThunk;
    function isThunk(t) {
      return t && t.type === "Thunk";
    }
    return isThunk_1;
  }
  var handleThunk_1;
  var hasRequiredHandleThunk;
  function requireHandleThunk() {
    if (hasRequiredHandleThunk) return handleThunk_1;
    hasRequiredHandleThunk = 1;
    var isVNode = requireIsVnode();
    var isVText = requireIsVtext();
    var isWidget = requireIsWidget();
    var isThunk = requireIsThunk();
    handleThunk_1 = handleThunk;
    function handleThunk(a, b) {
      var renderedA = a;
      var renderedB = b;
      if (isThunk(b)) {
        renderedB = renderThunk(b, a);
      }
      if (isThunk(a)) {
        renderedA = renderThunk(a, null);
      }
      return {
        a: renderedA,
        b: renderedB
      };
    }
    function renderThunk(thunk, previous) {
      var renderedThunk = thunk.vnode;
      if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous);
      }
      if (!(isVNode(renderedThunk) || isVText(renderedThunk) || isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
      }
      return renderedThunk;
    }
    return handleThunk_1;
  }
  var isObject;
  var hasRequiredIsObject;
  function requireIsObject() {
    if (hasRequiredIsObject) return isObject;
    hasRequiredIsObject = 1;
    isObject = function isObject2(x) {
      return typeof x === "object" && x !== null;
    };
    return isObject;
  }
  var isVhook;
  var hasRequiredIsVhook;
  function requireIsVhook() {
    if (hasRequiredIsVhook) return isVhook;
    hasRequiredIsVhook = 1;
    isVhook = isHook;
    function isHook(hook) {
      return hook && (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") || typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"));
    }
    return isVhook;
  }
  var diffProps_1;
  var hasRequiredDiffProps;
  function requireDiffProps() {
    if (hasRequiredDiffProps) return diffProps_1;
    hasRequiredDiffProps = 1;
    var isObject2 = requireIsObject();
    var isHook = requireIsVhook();
    diffProps_1 = diffProps;
    function diffProps(a, b) {
      var diff;
      for (var aKey in a) {
        if (!(aKey in b)) {
          diff = diff || {};
          diff[aKey] = void 0;
        }
        var aValue = a[aKey];
        var bValue = b[aKey];
        if (aValue === bValue) {
          continue;
        } else if (isObject2(aValue) && isObject2(bValue)) {
          if (getPrototype(bValue) !== getPrototype(aValue)) {
            diff = diff || {};
            diff[aKey] = bValue;
          } else if (isHook(bValue)) {
            diff = diff || {};
            diff[aKey] = bValue;
          } else {
            var objectDiff = diffProps(aValue, bValue);
            if (objectDiff) {
              diff = diff || {};
              diff[aKey] = objectDiff;
            }
          }
        } else {
          diff = diff || {};
          diff[aKey] = bValue;
        }
      }
      for (var bKey in b) {
        if (!(bKey in a)) {
          diff = diff || {};
          diff[bKey] = b[bKey];
        }
      }
      return diff;
    }
    function getPrototype(value2) {
      if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value2);
      } else if (value2.__proto__) {
        return value2.__proto__;
      } else if (value2.constructor) {
        return value2.constructor.prototype;
      }
    }
    return diffProps_1;
  }
  var diff_1$1;
  var hasRequiredDiff$1;
  function requireDiff$1() {
    if (hasRequiredDiff$1) return diff_1$1;
    hasRequiredDiff$1 = 1;
    var isArray = requireXIsArray();
    var VPatch = requireVpatch();
    var isVNode = requireIsVnode();
    var isVText = requireIsVtext();
    var isWidget = requireIsWidget();
    var isThunk = requireIsThunk();
    var handleThunk = requireHandleThunk();
    var diffProps = requireDiffProps();
    diff_1$1 = diff;
    function diff(a, b) {
      var patch = { a };
      walk(a, b, patch, 0);
      return patch;
    }
    function walk(a, b, patch, index) {
      if (a === b) {
        return;
      }
      var apply = patch[index];
      var applyClear = false;
      if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index);
      } else if (b == null) {
        if (!isWidget(a)) {
          clearState(a, patch, index);
          apply = patch[index];
        }
        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b));
      } else if (isVNode(b)) {
        if (isVNode(a)) {
          if (a.tagName === b.tagName && a.namespace === b.namespace && a.key === b.key) {
            var propsPatch = diffProps(a.properties, b.properties);
            if (propsPatch) {
              apply = appendPatch(
                apply,
                new VPatch(VPatch.PROPS, a, propsPatch)
              );
            }
            apply = diffChildren(a, b, patch, apply, index);
          } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b));
            applyClear = true;
          }
        } else {
          apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b));
          applyClear = true;
        }
      } else if (isVText(b)) {
        if (!isVText(a)) {
          apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b));
          applyClear = true;
        } else if (a.text !== b.text) {
          apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b));
        }
      } else if (isWidget(b)) {
        if (!isWidget(a)) {
          applyClear = true;
        }
        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b));
      }
      if (apply) {
        patch[index] = apply;
      }
      if (applyClear) {
        clearState(a, patch, index);
      }
    }
    function diffChildren(a, b, patch, apply, index) {
      var aChildren = a.children;
      var orderedSet = reorder(aChildren, b.children);
      var bChildren = orderedSet.children;
      var aLen = aChildren.length;
      var bLen = bChildren.length;
      var len = aLen > bLen ? aLen : bLen;
      for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i];
        var rightNode = bChildren[i];
        index += 1;
        if (!leftNode) {
          if (rightNode) {
            apply = appendPatch(
              apply,
              new VPatch(VPatch.INSERT, null, rightNode)
            );
          }
        } else {
          walk(leftNode, rightNode, patch, index);
        }
        if (isVNode(leftNode) && leftNode.count) {
          index += leftNode.count;
        }
      }
      if (orderedSet.moves) {
        apply = appendPatch(apply, new VPatch(
          VPatch.ORDER,
          a,
          orderedSet.moves
        ));
      }
      return apply;
    }
    function clearState(vNode, patch, index) {
      unhook(vNode, patch, index);
      destroyWidgets(vNode, patch, index);
    }
    function destroyWidgets(vNode, patch, index) {
      if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
          patch[index] = appendPatch(
            patch[index],
            new VPatch(VPatch.REMOVE, vNode, null)
          );
        }
      } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children;
        var len = children.length;
        for (var i = 0; i < len; i++) {
          var child = children[i];
          index += 1;
          destroyWidgets(child, patch, index);
          if (isVNode(child) && child.count) {
            index += child.count;
          }
        }
      } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index);
      }
    }
    function thunks(a, b, patch, index) {
      var nodes = handleThunk(a, b);
      var thunkPatch = diff(nodes.a, nodes.b);
      if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch);
      }
    }
    function hasPatches(patch) {
      for (var index in patch) {
        if (index !== "a") {
          return true;
        }
      }
      return false;
    }
    function unhook(vNode, patch, index) {
      if (isVNode(vNode)) {
        if (vNode.hooks) {
          patch[index] = appendPatch(
            patch[index],
            new VPatch(
              VPatch.PROPS,
              vNode,
              undefinedKeys(vNode.hooks)
            )
          );
        }
        if (vNode.descendantHooks || vNode.hasThunks) {
          var children = vNode.children;
          var len = children.length;
          for (var i = 0; i < len; i++) {
            var child = children[i];
            index += 1;
            unhook(child, patch, index);
            if (isVNode(child) && child.count) {
              index += child.count;
            }
          }
        }
      } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index);
      }
    }
    function undefinedKeys(obj) {
      var result = {};
      for (var key in obj) {
        result[key] = void 0;
      }
      return result;
    }
    function reorder(aChildren, bChildren) {
      var bChildIndex = keyIndex(bChildren);
      var bKeys = bChildIndex.keys;
      var bFree = bChildIndex.free;
      if (bFree.length === bChildren.length) {
        return {
          children: bChildren,
          moves: null
        };
      }
      var aChildIndex = keyIndex(aChildren);
      var aKeys = aChildIndex.keys;
      var aFree = aChildIndex.free;
      if (aFree.length === aChildren.length) {
        return {
          children: bChildren,
          moves: null
        };
      }
      var newChildren = [];
      var freeIndex = 0;
      var freeCount = bFree.length;
      var deletedItems = 0;
      for (var i = 0; i < aChildren.length; i++) {
        var aItem = aChildren[i];
        var itemIndex;
        if (aItem.key) {
          if (bKeys.hasOwnProperty(aItem.key)) {
            itemIndex = bKeys[aItem.key];
            newChildren.push(bChildren[itemIndex]);
          } else {
            itemIndex = i - deletedItems++;
            newChildren.push(null);
          }
        } else {
          if (freeIndex < freeCount) {
            itemIndex = bFree[freeIndex++];
            newChildren.push(bChildren[itemIndex]);
          } else {
            itemIndex = i - deletedItems++;
            newChildren.push(null);
          }
        }
      }
      var lastFreeIndex = freeIndex >= bFree.length ? bChildren.length : bFree[freeIndex];
      for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j];
        if (newItem.key) {
          if (!aKeys.hasOwnProperty(newItem.key)) {
            newChildren.push(newItem);
          }
        } else if (j >= lastFreeIndex) {
          newChildren.push(newItem);
        }
      }
      var simulate = newChildren.slice();
      var simulateIndex = 0;
      var removes = [];
      var inserts = [];
      var simulateItem;
      for (var k = 0; k < bChildren.length; ) {
        var wantedItem = bChildren[k];
        simulateItem = simulate[simulateIndex];
        while (simulateItem === null && simulate.length) {
          removes.push(remove(simulate, simulateIndex, null));
          simulateItem = simulate[simulateIndex];
        }
        if (!simulateItem || simulateItem.key !== wantedItem.key) {
          if (wantedItem.key) {
            if (simulateItem && simulateItem.key) {
              if (bKeys[simulateItem.key] !== k + 1) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key));
                simulateItem = simulate[simulateIndex];
                if (!simulateItem || simulateItem.key !== wantedItem.key) {
                  inserts.push({ key: wantedItem.key, to: k });
                } else {
                  simulateIndex++;
                }
              } else {
                inserts.push({ key: wantedItem.key, to: k });
              }
            } else {
              inserts.push({ key: wantedItem.key, to: k });
            }
            k++;
          } else if (simulateItem && simulateItem.key) {
            removes.push(remove(simulate, simulateIndex, simulateItem.key));
          }
        } else {
          simulateIndex++;
          k++;
        }
      }
      while (simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex];
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key));
      }
      if (removes.length === deletedItems && !inserts.length) {
        return {
          children: newChildren,
          moves: null
        };
      }
      return {
        children: newChildren,
        moves: {
          removes,
          inserts
        }
      };
    }
    function remove(arr, index, key) {
      arr.splice(index, 1);
      return {
        from: index,
        key
      };
    }
    function keyIndex(children) {
      var keys = {};
      var free = [];
      var length = children.length;
      for (var i = 0; i < length; i++) {
        var child = children[i];
        if (child.key) {
          keys[child.key] = i;
        } else {
          free.push(i);
        }
      }
      return {
        keys,
        // A hash of key name to index
        free
        // An array of unkeyed item indices
      };
    }
    function appendPatch(apply, patch) {
      if (apply) {
        if (isArray(apply)) {
          apply.push(patch);
        } else {
          apply = [apply, patch];
        }
        return apply;
      } else {
        return patch;
      }
    }
    return diff_1$1;
  }
  var diff_1;
  var hasRequiredDiff;
  function requireDiff() {
    if (hasRequiredDiff) return diff_1;
    hasRequiredDiff = 1;
    var diff = requireDiff$1();
    diff_1 = diff;
    return diff_1;
  }
  const __viteBrowserExternal = {};
  const __viteBrowserExternal$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
    __proto__: null,
    default: __viteBrowserExternal
  }, Symbol.toStringTag, { value: "Module" }));
  const require$$0 = /* @__PURE__ */ getAugmentedNamespace(__viteBrowserExternal$1);
  var document_1;
  var hasRequiredDocument;
  function requireDocument() {
    if (hasRequiredDocument) return document_1;
    hasRequiredDocument = 1;
    var topLevel = typeof commonjsGlobal !== "undefined" ? commonjsGlobal : typeof window !== "undefined" ? window : {};
    var minDoc = require$$0;
    var doccy;
    if (typeof document !== "undefined") {
      doccy = document;
    } else {
      doccy = topLevel["__GLOBAL_DOCUMENT_CACHE@4"];
      if (!doccy) {
        doccy = topLevel["__GLOBAL_DOCUMENT_CACHE@4"] = minDoc;
      }
    }
    document_1 = doccy;
    return document_1;
  }
  var applyProperties_1;
  var hasRequiredApplyProperties;
  function requireApplyProperties() {
    if (hasRequiredApplyProperties) return applyProperties_1;
    hasRequiredApplyProperties = 1;
    var isObject2 = requireIsObject();
    var isHook = requireIsVhook();
    applyProperties_1 = applyProperties;
    function applyProperties(node, props, previous) {
      for (var propName in props) {
        var propValue = props[propName];
        if (propValue === void 0) {
          removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
          removeProperty(node, propName, propValue, previous);
          if (propValue.hook) {
            propValue.hook(
              node,
              propName,
              previous ? previous[propName] : void 0
            );
          }
        } else {
          if (isObject2(propValue)) {
            patchObject(node, props, previous, propName, propValue);
          } else {
            node[propName] = propValue;
          }
        }
      }
    }
    function removeProperty(node, propName, propValue, previous) {
      if (previous) {
        var previousValue = previous[propName];
        if (!isHook(previousValue)) {
          if (propName === "attributes") {
            for (var attrName in previousValue) {
              node.removeAttribute(attrName);
            }
          } else if (propName === "style") {
            for (var i in previousValue) {
              node.style[i] = "";
            }
          } else if (typeof previousValue === "string") {
            node[propName] = "";
          } else {
            node[propName] = null;
          }
        } else if (previousValue.unhook) {
          previousValue.unhook(node, propName, propValue);
        }
      }
    }
    function patchObject(node, props, previous, propName, propValue) {
      var previousValue = previous ? previous[propName] : void 0;
      if (propName === "attributes") {
        for (var attrName in propValue) {
          var attrValue = propValue[attrName];
          if (attrValue === void 0) {
            node.removeAttribute(attrName);
          } else {
            node.setAttribute(attrName, attrValue);
          }
        }
        return;
      }
      if (previousValue && isObject2(previousValue) && getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue;
        return;
      }
      if (!isObject2(node[propName])) {
        node[propName] = {};
      }
      var replacer = propName === "style" ? "" : void 0;
      for (var k in propValue) {
        var value2 = propValue[k];
        node[propName][k] = value2 === void 0 ? replacer : value2;
      }
    }
    function getPrototype(value2) {
      if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value2);
      } else if (value2.__proto__) {
        return value2.__proto__;
      } else if (value2.constructor) {
        return value2.constructor.prototype;
      }
    }
    return applyProperties_1;
  }
  var createElement_1$1;
  var hasRequiredCreateElement$1;
  function requireCreateElement$1() {
    if (hasRequiredCreateElement$1) return createElement_1$1;
    hasRequiredCreateElement$1 = 1;
    var document2 = requireDocument();
    var applyProperties = requireApplyProperties();
    var isVNode = requireIsVnode();
    var isVText = requireIsVtext();
    var isWidget = requireIsWidget();
    var handleThunk = requireHandleThunk();
    createElement_1$1 = createElement;
    function createElement(vnode2, opts) {
      var doc = opts ? opts.document || document2 : document2;
      var warn = opts ? opts.warn : null;
      vnode2 = handleThunk(vnode2).a;
      if (isWidget(vnode2)) {
        return vnode2.init();
      } else if (isVText(vnode2)) {
        return doc.createTextNode(vnode2.text);
      } else if (!isVNode(vnode2)) {
        if (warn) {
          warn("Item is not a valid virtual dom node", vnode2);
        }
        return null;
      }
      var node = vnode2.namespace === null ? doc.createElement(vnode2.tagName) : doc.createElementNS(vnode2.namespace, vnode2.tagName);
      var props = vnode2.properties;
      applyProperties(node, props);
      var children = vnode2.children;
      for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts);
        if (childNode) {
          node.appendChild(childNode);
        }
      }
      return node;
    }
    return createElement_1$1;
  }
  var domIndex_1;
  var hasRequiredDomIndex;
  function requireDomIndex() {
    if (hasRequiredDomIndex) return domIndex_1;
    hasRequiredDomIndex = 1;
    var noChild = {};
    domIndex_1 = domIndex;
    function domIndex(rootNode, tree, indices, nodes) {
      if (!indices || indices.length === 0) {
        return {};
      } else {
        indices.sort(ascending);
        return recurse(rootNode, tree, indices, nodes, 0);
      }
    }
    function recurse(rootNode, tree, indices, nodes, rootIndex) {
      nodes = nodes || {};
      if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
          nodes[rootIndex] = rootNode;
        }
        var vChildren = tree.children;
        if (vChildren) {
          var childNodes = rootNode.childNodes;
          for (var i = 0; i < tree.children.length; i++) {
            rootIndex += 1;
            var vChild = vChildren[i] || noChild;
            var nextIndex = rootIndex + (vChild.count || 0);
            if (indexInRange(indices, rootIndex, nextIndex)) {
              recurse(childNodes[i], vChild, indices, nodes, rootIndex);
            }
            rootIndex = nextIndex;
          }
        }
      }
      return nodes;
    }
    function indexInRange(indices, left, right) {
      if (indices.length === 0) {
        return false;
      }
      var minIndex = 0;
      var maxIndex = indices.length - 1;
      var currentIndex;
      var currentItem;
      while (minIndex <= maxIndex) {
        currentIndex = (maxIndex + minIndex) / 2 >> 0;
        currentItem = indices[currentIndex];
        if (minIndex === maxIndex) {
          return currentItem >= left && currentItem <= right;
        } else if (currentItem < left) {
          minIndex = currentIndex + 1;
        } else if (currentItem > right) {
          maxIndex = currentIndex - 1;
        } else {
          return true;
        }
      }
      return false;
    }
    function ascending(a, b) {
      return a > b ? 1 : -1;
    }
    return domIndex_1;
  }
  var updateWidget_1;
  var hasRequiredUpdateWidget;
  function requireUpdateWidget() {
    if (hasRequiredUpdateWidget) return updateWidget_1;
    hasRequiredUpdateWidget = 1;
    var isWidget = requireIsWidget();
    updateWidget_1 = updateWidget;
    function updateWidget(a, b) {
      if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
          return a.id === b.id;
        } else {
          return a.init === b.init;
        }
      }
      return false;
    }
    return updateWidget_1;
  }
  var patchOp;
  var hasRequiredPatchOp;
  function requirePatchOp() {
    if (hasRequiredPatchOp) return patchOp;
    hasRequiredPatchOp = 1;
    var applyProperties = requireApplyProperties();
    var isWidget = requireIsWidget();
    var VPatch = requireVpatch();
    var updateWidget = requireUpdateWidget();
    patchOp = applyPatch;
    function applyPatch(vpatch2, domNode, renderOptions) {
      var type = vpatch2.type;
      var vNode = vpatch2.vNode;
      var patch = vpatch2.patch;
      switch (type) {
        case VPatch.REMOVE:
          return removeNode(domNode, vNode);
        case VPatch.INSERT:
          return insertNode(domNode, patch, renderOptions);
        case VPatch.VTEXT:
          return stringPatch(domNode, vNode, patch, renderOptions);
        case VPatch.WIDGET:
          return widgetPatch(domNode, vNode, patch, renderOptions);
        case VPatch.VNODE:
          return vNodePatch(domNode, vNode, patch, renderOptions);
        case VPatch.ORDER:
          reorderChildren(domNode, patch);
          return domNode;
        case VPatch.PROPS:
          applyProperties(domNode, patch, vNode.properties);
          return domNode;
        case VPatch.THUNK:
          return replaceRoot(
            domNode,
            renderOptions.patch(domNode, patch, renderOptions)
          );
        default:
          return domNode;
      }
    }
    function removeNode(domNode, vNode) {
      var parentNode = domNode.parentNode;
      if (parentNode) {
        parentNode.removeChild(domNode);
      }
      destroyWidget(domNode, vNode);
      return null;
    }
    function insertNode(parentNode, vNode, renderOptions) {
      var newNode = renderOptions.render(vNode, renderOptions);
      if (parentNode) {
        parentNode.appendChild(newNode);
      }
      return parentNode;
    }
    function stringPatch(domNode, leftVNode, vText, renderOptions) {
      var newNode;
      if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text);
        newNode = domNode;
      } else {
        var parentNode = domNode.parentNode;
        newNode = renderOptions.render(vText, renderOptions);
        if (parentNode && newNode !== domNode) {
          parentNode.replaceChild(newNode, domNode);
        }
      }
      return newNode;
    }
    function widgetPatch(domNode, leftVNode, widget, renderOptions) {
      var updating = updateWidget(leftVNode, widget);
      var newNode;
      if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode;
      } else {
        newNode = renderOptions.render(widget, renderOptions);
      }
      var parentNode = domNode.parentNode;
      if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode);
      }
      if (!updating) {
        destroyWidget(domNode, leftVNode);
      }
      return newNode;
    }
    function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
      var parentNode = domNode.parentNode;
      var newNode = renderOptions.render(vNode, renderOptions);
      if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode);
      }
      return newNode;
    }
    function destroyWidget(domNode, w) {
      if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode);
      }
    }
    function reorderChildren(domNode, moves) {
      var childNodes = domNode.childNodes;
      var keyMap = {};
      var node;
      var remove;
      var insert2;
      for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i];
        node = childNodes[remove.from];
        if (remove.key) {
          keyMap[remove.key] = node;
        }
        domNode.removeChild(node);
      }
      var length = childNodes.length;
      for (var j = 0; j < moves.inserts.length; j++) {
        insert2 = moves.inserts[j];
        node = keyMap[insert2.key];
        domNode.insertBefore(node, insert2.to >= length++ ? null : childNodes[insert2.to]);
      }
    }
    function replaceRoot(oldRoot, newRoot) {
      if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot);
      }
      return newRoot;
    }
    return patchOp;
  }
  var patch_1$1;
  var hasRequiredPatch$1;
  function requirePatch$1() {
    if (hasRequiredPatch$1) return patch_1$1;
    hasRequiredPatch$1 = 1;
    var document2 = requireDocument();
    var isArray = requireXIsArray();
    var render2 = requireCreateElement$1();
    var domIndex = requireDomIndex();
    var patchOp2 = requirePatchOp();
    patch_1$1 = patch;
    function patch(rootNode, patches, renderOptions) {
      renderOptions = renderOptions || {};
      renderOptions.patch = renderOptions.patch && renderOptions.patch !== patch ? renderOptions.patch : patchRecursive;
      renderOptions.render = renderOptions.render || render2;
      return renderOptions.patch(rootNode, patches, renderOptions);
    }
    function patchRecursive(rootNode, patches, renderOptions) {
      var indices = patchIndices(patches);
      if (indices.length === 0) {
        return rootNode;
      }
      var index = domIndex(rootNode, patches.a, indices);
      var ownerDocument = rootNode.ownerDocument;
      if (!renderOptions.document && ownerDocument !== document2) {
        renderOptions.document = ownerDocument;
      }
      for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i];
        rootNode = applyPatch(
          rootNode,
          index[nodeIndex],
          patches[nodeIndex],
          renderOptions
        );
      }
      return rootNode;
    }
    function applyPatch(rootNode, domNode, patchList, renderOptions) {
      if (!domNode) {
        return rootNode;
      }
      var newNode;
      if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
          newNode = patchOp2(patchList[i], domNode, renderOptions);
          if (domNode === rootNode) {
            rootNode = newNode;
          }
        }
      } else {
        newNode = patchOp2(patchList, domNode, renderOptions);
        if (domNode === rootNode) {
          rootNode = newNode;
        }
      }
      return rootNode;
    }
    function patchIndices(patches) {
      var indices = [];
      for (var key in patches) {
        if (key !== "a") {
          indices.push(Number(key));
        }
      }
      return indices;
    }
    return patch_1$1;
  }
  var patch_1;
  var hasRequiredPatch;
  function requirePatch() {
    if (hasRequiredPatch) return patch_1;
    hasRequiredPatch = 1;
    var patch = requirePatch$1();
    patch_1 = patch;
    return patch_1;
  }
  var vnode;
  var hasRequiredVnode;
  function requireVnode() {
    if (hasRequiredVnode) return vnode;
    hasRequiredVnode = 1;
    var version2 = requireVersion();
    var isVNode = requireIsVnode();
    var isWidget = requireIsWidget();
    var isThunk = requireIsThunk();
    var isVHook = requireIsVhook();
    vnode = VirtualNode;
    var noProperties = {};
    var noChildren = [];
    function VirtualNode(tagName, properties, children, key, namespace) {
      this.tagName = tagName;
      this.properties = properties || noProperties;
      this.children = children || noChildren;
      this.key = key != null ? String(key) : void 0;
      this.namespace = typeof namespace === "string" ? namespace : null;
      var count = children && children.length || 0;
      var descendants = 0;
      var hasWidgets = false;
      var hasThunks = false;
      var descendantHooks = false;
      var hooks;
      for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
          var property = properties[propName];
          if (isVHook(property) && property.unhook) {
            if (!hooks) {
              hooks = {};
            }
            hooks[propName] = property;
          }
        }
      }
      for (var i = 0; i < count; i++) {
        var child = children[i];
        if (isVNode(child)) {
          descendants += child.count || 0;
          if (!hasWidgets && child.hasWidgets) {
            hasWidgets = true;
          }
          if (!hasThunks && child.hasThunks) {
            hasThunks = true;
          }
          if (!descendantHooks && (child.hooks || child.descendantHooks)) {
            descendantHooks = true;
          }
        } else if (!hasWidgets && isWidget(child)) {
          if (typeof child.destroy === "function") {
            hasWidgets = true;
          }
        } else if (!hasThunks && isThunk(child)) {
          hasThunks = true;
        }
      }
      this.count = count + descendants;
      this.hasWidgets = hasWidgets;
      this.hasThunks = hasThunks;
      this.hooks = hooks;
      this.descendantHooks = descendantHooks;
    }
    VirtualNode.prototype.version = version2;
    VirtualNode.prototype.type = "VirtualNode";
    return vnode;
  }
  var vtext;
  var hasRequiredVtext;
  function requireVtext() {
    if (hasRequiredVtext) return vtext;
    hasRequiredVtext = 1;
    var version2 = requireVersion();
    vtext = VirtualText;
    function VirtualText(text2) {
      this.text = String(text2);
    }
    VirtualText.prototype.version = version2;
    VirtualText.prototype.type = "VirtualText";
    return vtext;
  }
  /*!
   * Cross-Browser Split 1.1.1
   * Copyright 2007-2012 Steven Levithan <stevenlevithan.com>
   * Available under the MIT License
   * ECMAScript compliant, uniform cross-browser split method
   */
  var browserSplit;
  var hasRequiredBrowserSplit;
  function requireBrowserSplit() {
    if (hasRequiredBrowserSplit) return browserSplit;
    hasRequiredBrowserSplit = 1;
    browserSplit = (function split2(undef) {
      var nativeSplit = String.prototype.split, compliantExecNpcg = /()??/.exec("")[1] === undef, self2;
      self2 = function(str, separator, limit) {
        if (Object.prototype.toString.call(separator) !== "[object RegExp]") {
          return nativeSplit.call(str, separator, limit);
        }
        var output = [], flags = (separator.ignoreCase ? "i" : "") + (separator.multiline ? "m" : "") + (separator.extended ? "x" : "") + // Proposed for ES6
        (separator.sticky ? "y" : ""), lastLastIndex = 0, separator = new RegExp(separator.source, flags + "g"), separator2, match, lastIndex, lastLength;
        str += "";
        if (!compliantExecNpcg) {
          separator2 = new RegExp("^" + separator.source + "$(?!\\s)", flags);
        }
        limit = limit === undef ? -1 >>> 0 : (
          // Math.pow(2, 32) - 1
          limit >>> 0
        );
        while (match = separator.exec(str)) {
          lastIndex = match.index + match[0].length;
          if (lastIndex > lastLastIndex) {
            output.push(str.slice(lastLastIndex, match.index));
            if (!compliantExecNpcg && match.length > 1) {
              match[0].replace(separator2, function() {
                for (var i = 1; i < arguments.length - 2; i++) {
                  if (arguments[i] === undef) {
                    match[i] = undef;
                  }
                }
              });
            }
            if (match.length > 1 && match.index < str.length) {
              Array.prototype.push.apply(output, match.slice(1));
            }
            lastLength = match[0].length;
            lastLastIndex = lastIndex;
            if (output.length >= limit) {
              break;
            }
          }
          if (separator.lastIndex === match.index) {
            separator.lastIndex++;
          }
        }
        if (lastLastIndex === str.length) {
          if (lastLength || !separator.test("")) {
            output.push("");
          }
        } else {
          output.push(str.slice(lastLastIndex));
        }
        return output.length > limit ? output.slice(0, limit) : output;
      };
      return self2;
    })();
    return browserSplit;
  }
  var parseTag_1;
  var hasRequiredParseTag;
  function requireParseTag() {
    if (hasRequiredParseTag) return parseTag_1;
    hasRequiredParseTag = 1;
    var split2 = requireBrowserSplit();
    var classIdSplit = /([\.#]?[a-zA-Z0-9\u007F-\uFFFF_:-]+)/;
    var notClassId = /^\.|#/;
    parseTag_1 = parseTag;
    function parseTag(tag, props) {
      if (!tag) {
        return "DIV";
      }
      var noId = !props.hasOwnProperty("id");
      var tagParts = split2(tag, classIdSplit);
      var tagName = null;
      if (notClassId.test(tagParts[1])) {
        tagName = "DIV";
      }
      var classes, part, type, i;
      for (i = 0; i < tagParts.length; i++) {
        part = tagParts[i];
        if (!part) {
          continue;
        }
        type = part.charAt(0);
        if (!tagName) {
          tagName = part;
        } else if (type === ".") {
          classes = classes || [];
          classes.push(part.substring(1, part.length));
        } else if (type === "#" && noId) {
          props.id = part.substring(1, part.length);
        }
      }
      if (classes) {
        if (props.className) {
          classes.push(props.className);
        }
        props.className = classes.join(" ");
      }
      return props.namespace ? tagName : tagName.toUpperCase();
    }
    return parseTag_1;
  }
  var softSetHook;
  var hasRequiredSoftSetHook;
  function requireSoftSetHook() {
    if (hasRequiredSoftSetHook) return softSetHook;
    hasRequiredSoftSetHook = 1;
    softSetHook = SoftSetHook;
    function SoftSetHook(value2) {
      if (!(this instanceof SoftSetHook)) {
        return new SoftSetHook(value2);
      }
      this.value = value2;
    }
    SoftSetHook.prototype.hook = function(node, propertyName) {
      if (node[propertyName] !== this.value) {
        node[propertyName] = this.value;
      }
    };
    return softSetHook;
  }
  var individual;
  var hasRequiredIndividual;
  function requireIndividual() {
    if (hasRequiredIndividual) return individual;
    hasRequiredIndividual = 1;
    var root = typeof window !== "undefined" ? window : typeof commonjsGlobal !== "undefined" ? commonjsGlobal : {};
    individual = Individual;
    function Individual(key, value2) {
      if (key in root) {
        return root[key];
      }
      root[key] = value2;
      return value2;
    }
    return individual;
  }
  var oneVersion;
  var hasRequiredOneVersion;
  function requireOneVersion() {
    if (hasRequiredOneVersion) return oneVersion;
    hasRequiredOneVersion = 1;
    var Individual = requireIndividual();
    oneVersion = OneVersion;
    function OneVersion(moduleName, version2, defaultValue) {
      var key = "__INDIVIDUAL_ONE_VERSION_" + moduleName;
      var enforceKey = key + "_ENFORCE_SINGLETON";
      var versionValue = Individual(enforceKey, version2);
      if (versionValue !== version2) {
        throw new Error("Can only have one copy of " + moduleName + ".\nYou already have version " + versionValue + " installed.\nThis means you cannot install version " + version2);
      }
      return Individual(key, defaultValue);
    }
    return oneVersion;
  }
  var evStore;
  var hasRequiredEvStore;
  function requireEvStore() {
    if (hasRequiredEvStore) return evStore;
    hasRequiredEvStore = 1;
    var OneVersionConstraint = requireOneVersion();
    var MY_VERSION = "7";
    OneVersionConstraint("ev-store", MY_VERSION);
    var hashKey = "__EV_STORE_KEY@" + MY_VERSION;
    evStore = EvStore;
    function EvStore(elem) {
      var hash = elem[hashKey];
      if (!hash) {
        hash = elem[hashKey] = {};
      }
      return hash;
    }
    return evStore;
  }
  var evHook;
  var hasRequiredEvHook;
  function requireEvHook() {
    if (hasRequiredEvHook) return evHook;
    hasRequiredEvHook = 1;
    var EvStore = requireEvStore();
    evHook = EvHook;
    function EvHook(value2) {
      if (!(this instanceof EvHook)) {
        return new EvHook(value2);
      }
      this.value = value2;
    }
    EvHook.prototype.hook = function(node, propertyName) {
      var es = EvStore(node);
      var propName = propertyName.substr(3);
      es[propName] = this.value;
    };
    EvHook.prototype.unhook = function(node, propertyName) {
      var es = EvStore(node);
      var propName = propertyName.substr(3);
      es[propName] = void 0;
    };
    return evHook;
  }
  var virtualHyperscript;
  var hasRequiredVirtualHyperscript;
  function requireVirtualHyperscript() {
    if (hasRequiredVirtualHyperscript) return virtualHyperscript;
    hasRequiredVirtualHyperscript = 1;
    var isArray = requireXIsArray();
    var VNode = requireVnode();
    var VText = requireVtext();
    var isVNode = requireIsVnode();
    var isVText = requireIsVtext();
    var isWidget = requireIsWidget();
    var isHook = requireIsVhook();
    var isVThunk = requireIsThunk();
    var parseTag = requireParseTag();
    var softSetHook2 = requireSoftSetHook();
    var evHook2 = requireEvHook();
    virtualHyperscript = h2;
    function h2(tagName, properties, children) {
      var childNodes = [];
      var tag, props, key, namespace;
      if (!children && isChildren(properties)) {
        children = properties;
        props = {};
      }
      props = props || properties || {};
      tag = parseTag(tagName, props);
      if (props.hasOwnProperty("key")) {
        key = props.key;
        props.key = void 0;
      }
      if (props.hasOwnProperty("namespace")) {
        namespace = props.namespace;
        props.namespace = void 0;
      }
      if (tag === "INPUT" && !namespace && props.hasOwnProperty("value") && props.value !== void 0 && !isHook(props.value)) {
        props.value = softSetHook2(props.value);
      }
      transformProperties(props);
      if (children !== void 0 && children !== null) {
        addChild(children, childNodes, tag, props);
      }
      return new VNode(tag, props, childNodes, key, namespace);
    }
    function addChild(c, childNodes, tag, props) {
      if (typeof c === "string") {
        childNodes.push(new VText(c));
      } else if (typeof c === "number") {
        childNodes.push(new VText(String(c)));
      } else if (isChild(c)) {
        childNodes.push(c);
      } else if (isArray(c)) {
        for (var i = 0; i < c.length; i++) {
          addChild(c[i], childNodes, tag, props);
        }
      } else if (c === null || c === void 0) {
        return;
      } else {
        throw UnexpectedVirtualElement({
          foreignObject: c,
          parentVnode: {
            tagName: tag,
            properties: props
          }
        });
      }
    }
    function transformProperties(props) {
      for (var propName in props) {
        if (props.hasOwnProperty(propName)) {
          var value2 = props[propName];
          if (isHook(value2)) {
            continue;
          }
          if (propName.substr(0, 3) === "ev-") {
            props[propName] = evHook2(value2);
          }
        }
      }
    }
    function isChild(x) {
      return isVNode(x) || isVText(x) || isWidget(x) || isVThunk(x);
    }
    function isChildren(x) {
      return typeof x === "string" || isArray(x) || isChild(x);
    }
    function UnexpectedVirtualElement(data) {
      var err = new Error();
      err.type = "virtual-hyperscript.unexpected.virtual-element";
      err.message = "Unexpected virtual child passed to h().\nExpected a VNode / Vthunk / VWidget / string but:\ngot:\n" + errorString(data.foreignObject) + ".\nThe parent vnode is:\n" + errorString(data.parentVnode);
      err.foreignObject = data.foreignObject;
      err.parentVnode = data.parentVnode;
      return err;
    }
    function errorString(obj) {
      try {
        return JSON.stringify(obj, null, "    ");
      } catch (e) {
        return String(obj);
      }
    }
    return virtualHyperscript;
  }
  var h_1;
  var hasRequiredH;
  function requireH() {
    if (hasRequiredH) return h_1;
    hasRequiredH = 1;
    var h2 = requireVirtualHyperscript();
    h_1 = h2;
    return h_1;
  }
  var createElement_1;
  var hasRequiredCreateElement;
  function requireCreateElement() {
    if (hasRequiredCreateElement) return createElement_1;
    hasRequiredCreateElement = 1;
    var createElement = requireCreateElement$1();
    createElement_1 = createElement;
    return createElement_1;
  }
  var virtualDom;
  var hasRequiredVirtualDom;
  function requireVirtualDom() {
    if (hasRequiredVirtualDom) return virtualDom;
    hasRequiredVirtualDom = 1;
    var diff = requireDiff();
    var patch = requirePatch();
    var h2 = requireH();
    var create = requireCreateElement();
    var VNode = requireVnode();
    var VText = requireVtext();
    virtualDom = {
      diff,
      patch,
      h: h2,
      create,
      VNode,
      VText
    };
    return virtualDom;
  }
  var virtualDomExports = requireVirtualDom();
  class FSharpChoice$3 extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Choice1Of3", "Choice2Of3", "Choice3Of3"];
    }
  }
  class Observer {
    constructor(onNext, onError, onCompleted) {
      this.OnNext = onNext;
      this.OnError = onError || ((_e) => {
        return;
      });
      this.OnCompleted = onCompleted || (() => {
        return;
      });
    }
  }
  function add(callback, source) {
    source.Subscribe(new Observer(callback));
  }
  class Event$2 {
    constructor() {
      this.delegates = [];
    }
    _add(d) {
      this.delegates.push(d);
    }
    _remove(d) {
      const index = this.delegates.indexOf(d);
      if (index > -1) {
        this.delegates.splice(index, 1);
      }
    }
    get Publish() {
      return createEvent((h2) => {
        this._add(h2);
      }, (h2) => {
        this._remove(h2);
      });
    }
    Trigger(senderOrValue, valueOrUndefined) {
      let sender = null;
      const value2 = valueOrUndefined === void 0 ? senderOrValue : (sender = senderOrValue, valueOrUndefined);
      this.delegates.forEach((f) => {
        f(sender, value2);
      });
    }
  }
  class Event extends Event$2 {
  }
  function createEvent(addHandler, removeHandler) {
    return {
      AddHandler(h2) {
        addHandler(h2);
      },
      RemoveHandler(h2) {
        removeHandler(h2);
      },
      Subscribe(r) {
        const h2 = ((_, args) => r.OnNext(args));
        addHandler(h2);
        return {
          Dispose() {
            removeHandler(h2);
          }
        };
      }
    };
  }
  class DomAttribute extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Event", "Attribute", "Property"];
    }
  }
  class DomNode extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Text", "Element"];
    }
  }
  function createTree(ns, tag, args, children) {
    const attrs = [];
    const props = [];
    const enumerator = getEnumerator(args);
    try {
      while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
        const forLoopVar = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
        const v = forLoopVar[1];
        const k = forLoopVar[0];
        switch (v.tag) {
          case 2: {
            const o = v.fields[0];
            const k_2 = k;
            void props.push([k_2, o]);
            break;
          }
          case 0: {
            const k_3 = k;
            const f = v.fields[0];
            void props.push(["on" + k_3, (o_1) => {
              f(o_1["target"], event);
            }]);
            break;
          }
          default: {
            const v_1 = v.fields[0];
            const k_1 = k;
            void attrs.push([k_1, v_1]);
          }
        }
      }
    } finally {
      disposeSafe(enumerator);
    }
    const attrs_1 = createObj(attrs);
    const ns_1 = (ns === defaultOf() ? true : ns === "") ? empty$1() : singleton$1(["namespace", ns]);
    const props_1 = createObj(append(append$1(ns_1, singleton$1(["attributes", attrs_1])), props));
    const elem = virtualDomExports.h(tag, props_1, children);
    return elem;
  }
  function renderVirtual(node) {
    if (node.tag === 1) {
      const tag = node.fields[1];
      const ns = node.fields[0];
      const children = node.fields[3];
      const attrs = node.fields[2];
      return createTree(ns, tag, attrs, map$1(renderVirtual, children));
    } else {
      const s_1 = node.fields[0];
      return s_1;
    }
  }
  function render(node) {
    if (node.tag === 1) {
      const tag = node.fields[1];
      const ns = node.fields[0];
      const children = node.fields[3];
      const attrs = node.fields[2];
      const el = (ns === defaultOf() ? true : ns === "") ? document.createElement(tag) : document.createElementNS(ns, tag);
      const rc = map$1(render, children);
      for (let idx = 0; idx <= rc.length - 1; idx++) {
        const c = item(idx, rc);
        el.appendChild(c);
      }
      for (let idx_1 = 0; idx_1 <= attrs.length - 1; idx_1++) {
        const forLoopVar = item(idx_1, attrs);
        const k = forLoopVar[0];
        const a = forLoopVar[1];
        switch (a.tag) {
          case 1: {
            const v = a.fields[0];
            el.setAttribute(k, v);
            break;
          }
          case 0: {
            a.fields[0];
            break;
          }
          default: {
            const o = a.fields[0];
            el[k] = o;
          }
        }
      }
      return el;
    } else {
      const s_1 = node.fields[0];
      return document.createTextNode(s_1);
    }
  }
  function renderTo(node, dom) {
    while (!equals(node.lastChild, defaultOf())) {
      node.removeChild(node.lastChild);
    }
    const el = render(dom);
    node.appendChild(el);
  }
  function createVirtualDomApp(id, initial, r, u) {
    const event2 = new Event();
    const trigger = (e) => {
      event2.Trigger(e);
    };
    let container = document.createElement("div");
    document.getElementById(id).innerHTML = "";
    document.getElementById(id).appendChild(container);
    let tree = {};
    let state = initial;
    const handleEvent = (evt) => {
      let e_1;
      state = evt != null ? (e_1 = value(evt), u(state, e_1)) : state;
      const newTree = renderVirtual(r(trigger, state));
      const patches = virtualDomExports.diff(tree, newTree);
      container = virtualDomExports.patch(container, patches);
      tree = newTree;
    };
    handleEvent(void 0);
    add((arg) => {
      handleEvent(some(arg));
    }, event2.Publish);
  }
  function text(s_1) {
    return new DomNode(0, [s_1]);
  }
  function op_EqualsGreater(k, v) {
    return [k, new DomAttribute(1, [v])];
  }
  function op_EqualsBangGreater(k, f) {
    return [k, new DomAttribute(0, [f])];
  }
  class El {
    constructor(ns) {
      this.ns = ns;
    }
  }
  function El_$ctor_Z721C83C5(ns) {
    return new El(ns);
  }
  function El__get_Namespace(x) {
    return x.ns;
  }
  function El_op_Dynamic_Z451691CD(el, n) {
    return (a) => ((b) => new DomNode(1, [El__get_Namespace(el), n, toArray$1(a), toArray$1(b)]));
  }
  const h = El_$ctor_Z721C83C5(defaultOf());
  const s = El_$ctor_Z721C83C5("http://www.w3.org/2000/svg");
  function newGuid() {
    let b = "";
    for (let a = 0; a++ < 36; ) {
      b += a * 51 & 52 ? (a ^ 15 ? 8 ^ Math.random() * (a ^ 20 ? 16 : 4) : 4).toString(16) : "-";
    }
    return b;
  }
  function tryGetValue(map2, key, defaultValue) {
    if (map2.has(key)) {
      defaultValue.contents = map2.get(key);
      return true;
    }
    return false;
  }
  function addToSet(v, set) {
    if (set.has(v)) {
      return false;
    }
    set.add(v);
    return true;
  }
  function getItemFromDict(map2, key) {
    if (map2.has(key)) {
      return map2.get(key);
    } else {
      throw new Error(`The given key '${key}' was not present in the dictionary.`);
    }
  }
  class HashSet {
    constructor(items, comparer) {
      const this$ = new FSharpRef(defaultOf());
      this.comparer = comparer;
      this$.contents = this;
      this.hashMap = /* @__PURE__ */ new Map([]);
      this["init@9"] = 1;
      const enumerator = getEnumerator(items);
      try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
          const item2 = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
          HashSet__Add_2B595(this$.contents, item2);
        }
      } finally {
        disposeSafe(enumerator);
      }
    }
    get [Symbol.toStringTag]() {
      return "HashSet";
    }
    toJSON() {
      const this$ = this;
      return Array.from(this$);
    }
    "System.Collections.IEnumerable.GetEnumerator"() {
      const this$ = this;
      return getEnumerator(this$);
    }
    GetEnumerator() {
      const this$ = this;
      return getEnumerator(concat(this$.hashMap.values()));
    }
    [Symbol.iterator]() {
      return toIterator(getEnumerator(this));
    }
    "System.Collections.Generic.ICollection`1.Add2B595"(item2) {
      const this$ = this;
      HashSet__Add_2B595(this$, item2);
    }
    "System.Collections.Generic.ICollection`1.Clear"() {
      const this$ = this;
      HashSet__Clear(this$);
    }
    "System.Collections.Generic.ICollection`1.Contains2B595"(item2) {
      const this$ = this;
      return HashSet__Contains_2B595(this$, item2);
    }
    "System.Collections.Generic.ICollection`1.CopyToZ3B4C077E"(array, arrayIndex) {
      const this$ = this;
      iterateIndexed((i, e) => {
        setItem(array, arrayIndex + i, e);
      }, this$);
    }
    "System.Collections.Generic.ICollection`1.get_Count"() {
      const this$ = this;
      return HashSet__get_Count(this$) | 0;
    }
    "System.Collections.Generic.ICollection`1.get_IsReadOnly"() {
      return false;
    }
    "System.Collections.Generic.ICollection`1.Remove2B595"(item2) {
      const this$ = this;
      return HashSet__Remove_2B595(this$, item2);
    }
    get size() {
      const this$ = this;
      return HashSet__get_Count(this$) | 0;
    }
    add(k) {
      const this$ = this;
      HashSet__Add_2B595(this$, k);
      return this$;
    }
    clear() {
      const this$ = this;
      HashSet__Clear(this$);
    }
    delete(k) {
      const this$ = this;
      return HashSet__Remove_2B595(this$, k);
    }
    has(k) {
      const this$ = this;
      return HashSet__Contains_2B595(this$, k);
    }
    keys() {
      const this$ = this;
      return map((x) => x, this$);
    }
    values() {
      const this$ = this;
      return map((x) => x, this$);
    }
    entries() {
      const this$ = this;
      return map((v) => [v, v], this$);
    }
    forEach(f, thisArg) {
      const this$ = this;
      iterate((x) => {
        f(x, x, this$);
      }, this$);
    }
  }
  function HashSet__TryFindIndex_2B595(this$, k) {
    const h2 = this$.comparer.GetHashCode(k) | 0;
    let matchValue;
    let outArg = defaultOf();
    matchValue = [tryGetValue(this$.hashMap, h2, new FSharpRef(() => outArg, (v) => {
      outArg = v;
    })), outArg];
    if (matchValue[0]) {
      return [true, h2, matchValue[1].findIndex((v_1) => this$.comparer.Equals(k, v_1))];
    } else {
      return [false, h2, -1];
    }
  }
  function HashSet__Clear(this$) {
    this$.hashMap.clear();
  }
  function HashSet__get_Count(this$) {
    let count = 0;
    let enumerator = getEnumerator(this$.hashMap.values());
    try {
      while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
        const items = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
        count = count + items.length | 0;
      }
    } finally {
      disposeSafe(enumerator);
    }
    return count | 0;
  }
  function HashSet__Add_2B595(this$, k) {
    const matchValue = HashSet__TryFindIndex_2B595(this$, k);
    if (matchValue[0]) {
      if (matchValue[2] > -1) {
        return false;
      } else {
        void getItemFromDict(this$.hashMap, matchValue[1]).push(k);
        return true;
      }
    } else {
      this$.hashMap.set(matchValue[1], [k]);
      return true;
    }
  }
  function HashSet__Contains_2B595(this$, k) {
    const matchValue = HashSet__TryFindIndex_2B595(this$, k);
    let matchResult;
    if (matchValue[0]) {
      if (matchValue[2] > -1) {
        matchResult = 0;
      } else {
        matchResult = 1;
      }
    } else {
      matchResult = 1;
    }
    switch (matchResult) {
      case 0:
        return true;
      default:
        return false;
    }
  }
  function HashSet__Remove_2B595(this$, k) {
    const matchValue = HashSet__TryFindIndex_2B595(this$, k);
    let matchResult;
    if (matchValue[0]) {
      if (matchValue[2] > -1) {
        matchResult = 0;
      } else {
        matchResult = 1;
      }
    } else {
      matchResult = 1;
    }
    switch (matchResult) {
      case 0: {
        getItemFromDict(this$.hashMap, matchValue[1]).splice(matchValue[2], 1);
        return true;
      }
      default:
        return false;
    }
  }
  function distinct(xs, comparer) {
    return delay(() => {
      const hashSet = new HashSet([], comparer);
      return filter((x) => addToSet(x, hashSet), xs);
    });
  }
  function Array_distinct(xs, comparer) {
    return toArray(distinct(xs, comparer));
  }
  class Color extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["RGB", "HTML"];
    }
  }
  class Width extends Union {
    constructor(Item) {
      super();
      this.tag = 0;
      this.fields = [Item];
    }
    cases() {
      return ["Pixels"];
    }
  }
  class FillStyle extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Solid", "LinearGradient"];
    }
  }
  class HorizontalAlign extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Start", "Center", "End"];
    }
  }
  class VerticalAlign extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Baseline", "Middle", "Hanging"];
    }
  }
  class continuous extends Union {
    constructor(Item) {
      super();
      this.tag = 0;
      this.fields = [Item];
    }
    cases() {
      return ["CO"];
    }
  }
  class categorical extends Union {
    constructor(Item) {
      super();
      this.tag = 0;
      this.fields = [Item];
    }
    cases() {
      return ["CA"];
    }
  }
  class Value extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["CAR", "COV"];
    }
  }
  class Scale extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Continuous", "Categorical"];
    }
  }
  class Style extends Record {
    constructor(StrokeColor, StrokeWidth, StrokeDashArray, Fill, Animation, Font, Cursor, PreserveAspectRatio, FormatAxisXLabel, FormatAxisYLabel) {
      super();
      this.StrokeColor = StrokeColor;
      this.StrokeWidth = StrokeWidth;
      this.StrokeDashArray = StrokeDashArray;
      this.Fill = Fill;
      this.Animation = Animation;
      this.Font = Font;
      this.Cursor = Cursor;
      this.PreserveAspectRatio = PreserveAspectRatio;
      this.FormatAxisXLabel = FormatAxisXLabel;
      this.FormatAxisYLabel = FormatAxisYLabel;
    }
  }
  class EventHandler extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["MouseMove", "MouseUp", "MouseDown", "Click", "TouchStart", "TouchMove", "TouchEnd", "MouseLeave"];
    }
  }
  class Shape extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Image", "Style", "Text", "AutoScale", "InnerScale", "NestX", "NestY", "Line", "Bubble", "Shape", "Layered", "Axes", "Interactive", "Padding", "Offset"];
    }
  }
  class Svg_StringBuilder {
    constructor() {
      this.strs = empty$1();
    }
    toString() {
      const x = this;
      return join("", reverse(x.strs));
    }
  }
  function Svg_StringBuilder_$ctor() {
    return new Svg_StringBuilder();
  }
  function Svg_StringBuilder__Append_Z721C83C5(x, s2) {
    x.strs = cons(s2, x.strs);
  }
  class Svg_PathSegment extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["MoveTo", "LineTo"];
    }
  }
  class Svg_Svg extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Image", "Path", "Ellipse", "Rect", "Text", "Combine", "Empty"];
    }
  }
  function Svg_formatPath(path) {
    const sb = Svg_StringBuilder_$ctor();
    const enumerator = getEnumerator(path);
    try {
      while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
        const ps = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
        if (ps.tag === 1) {
          const y_1 = ps.fields[0][1];
          const x_1 = ps.fields[0][0];
          Svg_StringBuilder__Append_Z721C83C5(sb, "L" + x_1.toString() + " " + y_1.toString() + " ");
        } else {
          const y = ps.fields[0][1];
          const x = ps.fields[0][0];
          Svg_StringBuilder__Append_Z721C83C5(sb, "M" + x.toString() + " " + y.toString() + " ");
        }
      }
    } finally {
      disposeSafe(enumerator);
    }
    return toString$1(sb);
  }
  class Svg_RenderingContext extends Record {
    constructor(Definitions) {
      super();
      this.Definitions = Definitions;
    }
  }
  function Svg_renderSvg(ctx, svg) {
    return delay(() => {
      switch (svg.tag) {
        case 4: {
          const y = svg.fields[0][1];
          const x = svg.fields[0][0];
          const t = svg.fields[1];
          const style = svg.fields[3];
          const rotation = svg.fields[2];
          const attrs = toList(delay(() => append(singleton(op_EqualsGreater("style", style)), delay(() => rotation === 0 ? append(singleton(op_EqualsGreater("x", x.toString())), delay(() => singleton(op_EqualsGreater("y", y.toString())))) : append(singleton(op_EqualsGreater("x", "0")), delay(() => append(singleton(op_EqualsGreater("y", "0")), delay(() => singleton(op_EqualsGreater("transform", toText(printf("translate(%f,%f) rotate(%f)"))(x)(y)(rotation)))))))))));
          return singleton(El_op_Dynamic_Z451691CD(s, "text")(attrs)(singleton$1(text(t))));
        }
        case 5: {
          const ss = svg.fields[0];
          return collect((s2) => Svg_renderSvg(ctx, s2), ss);
        }
        case 2: {
          const style_1 = svg.fields[2];
          const ry = svg.fields[1][1];
          const rx = svg.fields[1][0];
          const cy = svg.fields[0][1];
          const cx = svg.fields[0][0];
          const attrs_1 = ofArray([op_EqualsGreater("cx", cx.toString()), op_EqualsGreater("cy", cy.toString()), op_EqualsGreater("rx", rx.toString()), op_EqualsGreater("ry", ry.toString()), op_EqualsGreater("style", style_1)]);
          return singleton(El_op_Dynamic_Z451691CD(s, "ellipse")(attrs_1)(empty$1()));
        }
        case 0: {
          const y_1 = svg.fields[1][1];
          const x_1 = svg.fields[1][0];
          const w = svg.fields[2][0];
          const preserveAspectRatio = svg.fields[3];
          const href = svg.fields[0];
          const h2 = svg.fields[2][1];
          const attrs_2 = ofArray([op_EqualsGreater("href", href), op_EqualsGreater("preserveAspectRatio", preserveAspectRatio), op_EqualsGreater("x", x_1.toString()), op_EqualsGreater("y", y_1.toString()), op_EqualsGreater("width", w.toString()), op_EqualsGreater("height", h2.toString())]);
          return singleton(El_op_Dynamic_Z451691CD(s, "image")(attrs_2)(empty$1()));
        }
        case 3: {
          const y2 = svg.fields[1][1];
          const y1 = svg.fields[0][1];
          const x2 = svg.fields[1][0];
          const x1 = svg.fields[0][0];
          const style_2 = svg.fields[2];
          const matchValue = min$2(x1, x2);
          const t_1 = min$2(y1, y2);
          const l = matchValue;
          const w_1 = Math.abs(x1 - x2);
          const h_12 = Math.abs(y1 - y2);
          const attrs_3 = ofArray([op_EqualsGreater("x", l.toString()), op_EqualsGreater("y", t_1.toString()), op_EqualsGreater("width", w_1.toString()), op_EqualsGreater("height", h_12.toString()), op_EqualsGreater("style", style_2)]);
          return singleton(El_op_Dynamic_Z451691CD(s, "rect")(attrs_3)(empty$1()));
        }
        case 1: {
          const style_3 = svg.fields[1];
          const p = svg.fields[0];
          const attrs_4 = ofArray([op_EqualsGreater("d", Svg_formatPath(p)), op_EqualsGreater("style", style_3)]);
          return singleton(El_op_Dynamic_Z451691CD(s, "path")(attrs_4)(empty$1()));
        }
        default: {
          return empty();
        }
      }
    });
  }
  function Svg_formatColor(_arg) {
    if (_arg.tag === 1) {
      const clr = _arg.fields[0];
      return clr;
    } else {
      const r = _arg.fields[0] | 0;
      const g = _arg.fields[1] | 0;
      const b = _arg.fields[2] | 0;
      return toText(printf("rgb(%d, %d, %d)"))(r)(g)(b);
    }
  }
  function Svg_formatNumber(_arg) {
    if (_arg.tag === 1) {
      const p = _arg.fields[0];
      return p.toString() + "%";
    } else {
      const n = _arg.fields[0] | 0;
      return int32ToString(n);
    }
  }
  function Svg_formatStyle(defs, style) {
    let copyOfStruct, bind$0040, patternInput_1, so, clr, sw, arg_10, matchValue_1, fo, clr_2, arg_17, points, id_1, copyOfStruct_1, item_1;
    let patternInput;
    const matchValue = style.Animation;
    if (matchValue == null) {
      patternInput = [style, ""];
    } else {
      const ms = matchValue[0] | 0;
      const ease = matchValue[1];
      const anim = matchValue[2];
      const id = "anim_" + replace((copyOfStruct = newGuid(), copyOfStruct), "-", "");
      const fromstyle = Svg_formatStyle(defs, new Style(style.StrokeColor, style.StrokeWidth, style.StrokeDashArray, style.Fill, void 0, style.Font, style.Cursor, style.PreserveAspectRatio, style.FormatAxisXLabel, style.FormatAxisYLabel));
      const tostyle = Svg_formatStyle(defs, (bind$0040 = anim(style), new Style(bind$0040.StrokeColor, bind$0040.StrokeWidth, bind$0040.StrokeDashArray, bind$0040.Fill, void 0, bind$0040.Font, bind$0040.Cursor, bind$0040.PreserveAspectRatio, bind$0040.FormatAxisXLabel, bind$0040.FormatAxisYLabel)));
      const item2 = El_op_Dynamic_Z451691CD(h, "style")(empty$1())(singleton$1(text(toText(printf("@keyframes %s { from { %s } to { %s } }"))(id)(fromstyle)(tostyle))));
      void defs.push(item2);
      patternInput = [anim(style), toText(printf("animation: %s %dms %s; "))(id)(ms)(ease)];
    }
    const style_1 = patternInput[0];
    const anim_1 = patternInput[1];
    return anim_1 + join("", toList(delay(() => map((c) => "cursor:" + c + ";", split(style_1.Cursor, [","], void 0, 0))))) + ("font:" + style_1.Font + ";") + (patternInput_1 = style_1.StrokeColor, so = patternInput_1[0], clr = patternInput_1[1], sw = style_1.StrokeWidth.fields[0] | 0, arg_10 = Svg_formatColor(clr), toText(printf("stroke-opacity:%f; stroke-width:%dpx; stroke:%s; "))(so)(sw)(arg_10)) + (isEmpty(style_1.StrokeDashArray) ? "" : "stroke-dasharray:" + join(",", map(Svg_formatNumber, style_1.StrokeDashArray)) + ";") + (matchValue_1 = style_1.Fill, matchValue_1.tag === 0 ? (fo = matchValue_1.fields[0][0], clr_2 = matchValue_1.fields[0][1], arg_17 = Svg_formatColor(clr_2), toText(printf("fill-opacity:%f; fill:%s; "))(fo)(arg_17)) : (points = matchValue_1.fields[0], id_1 = "gradient_" + replace((copyOfStruct_1 = newGuid(), copyOfStruct_1), "-", ""), item_1 = El_op_Dynamic_Z451691CD(s, "linearGradient")(singleton$1(op_EqualsGreater("id", id_1)))(toList(delay(() => collect((matchValue_2) => {
      const pt = matchValue_2[0];
      const o = matchValue_2[1][0];
      const clr_1 = matchValue_2[1][1];
      return singleton(El_op_Dynamic_Z451691CD(s, "stop")(ofArray([op_EqualsGreater("offset", pt.toString() + "%"), op_EqualsGreater("stop-color", Svg_formatColor(clr_1)), op_EqualsGreater("stop-opacity", o.toString())]))(empty$1()));
    }, points)))), void defs.push(item_1), toText(printf("fill:url(#%s)"))(id_1)));
  }
  class Scales_ScaledShape extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["ScaledStyle", "ScaledText", "ScaledLine", "ScaledBubble", "ScaledShape", "ScaledImage", "ScaledLayered", "ScaledInteractive", "ScaledPadding", "ScaledOffset", "ScaledNestX", "ScaledNestY"];
    }
  }
  function Scales_getExtremes(_arg) {
    if (_arg.tag === 1) {
      const vals = _arg.fields[0];
      return [new Value(0, [item(0, vals), 0]), new Value(0, [item(vals.length - 1, vals), 1])];
    } else {
      const l = _arg.fields[0];
      const h2 = _arg.fields[1];
      return [new Value(1, [l]), new Value(1, [h2])];
    }
  }
  function Scales_calculateMagnitudeAndRange(lo, hi) {
    let magnitude;
    const arg1__1 = round(Math.log10(hi - lo));
    magnitude = Math.pow(10, arg1__1);
    const magnitude_1 = magnitude / 2;
    return [magnitude_1, [Math.floor(lo / magnitude_1) * magnitude_1, Math.ceil(hi / magnitude_1) * magnitude_1]];
  }
  function Scales_decimalPoints(range_, range__1) {
    const range = [range_, range__1];
    const magnitude = Scales_calculateMagnitudeAndRange(range[0], range[1])[0];
    return max$2(0, Math.ceil(-Math.log10(magnitude)));
  }
  function Scales_adjustRange(range_, range__1) {
    const range = [range_, range__1];
    return Scales_calculateMagnitudeAndRange(range[0], range[1])[1];
  }
  function Scales_adjustRangeUnits(l, h2) {
    const patternInput = Scales_adjustRange(l, h2);
    const l_1 = patternInput[0];
    const h_12 = patternInput[1];
    return [l_1, h_12];
  }
  function Scales_toArray(s2) {
    return Array.from(s2);
  }
  function Scales_generateSteps(count, k, lo, hi) {
    const patternInput = Scales_calculateMagnitudeAndRange(lo, hi);
    const nlo = patternInput[1][0];
    const nhi = patternInput[1][1];
    const magnitude = patternInput[0];
    const dividers = ofArray([0.2, 0.5, 1, 2, 5, 10, 20, 40, 50, 60, 80, 100]);
    const magnitudes = map((d) => magnitude / d, dividers);
    const step = tryHead(filter((m) => (hi - lo) / m >= count, magnitudes));
    const step_1 = defaultArg(step, magnitude / 100);
    return Scales_toArray(delay(() => collect((v) => v >= lo && v <= hi ? singleton(v) : empty(), rangeDouble(nlo, step_1 * k, nhi))));
  }
  function Scales_generateAxisSteps(s2) {
    if (s2.tag === 1) {
      const vs = s2.fields[0];
      return toArray(delay(() => collect((matchValue) => {
        const s_1 = matchValue.fields[0];
        return singleton(new Value(0, [new categorical(s_1), 0.5]));
      }, vs)));
    } else {
      const l = s2.fields[0].fields[0];
      const h2 = s2.fields[1].fields[0];
      return map$1((f) => new Value(1, [new continuous(f)]), Scales_generateSteps(6, 1, l, h2));
    }
  }
  function Scales_generateAxisLabels(fmt, s2) {
    const sunit = s2;
    if (s2.tag === 1) {
      const vs = s2.fields[0];
      return toArray(delay(() => collect((matchValue) => {
        const s_1 = matchValue.fields[0];
        return singleton([new Value(0, [new categorical(s_1), 0.5]), fmt(sunit, new Value(0, [new categorical(s_1), 0.5]))]);
      }, vs)));
    } else {
      const l = s2.fields[0].fields[0];
      const h2 = s2.fields[1].fields[0];
      return map$1((f) => [new Value(1, [new continuous(f)]), fmt(sunit, new Value(1, [new continuous(f)]))], Scales_generateSteps(6, 2, l, h2));
    }
  }
  function Scales_unionScales(s1, s2) {
    let matchResult, h1, h2, l1, l2, v1, v2;
    if (s1.tag === 1) {
      if (s2.tag === 1) {
        matchResult = 1;
        v1 = s1.fields[0];
        v2 = s2.fields[0];
      } else {
        matchResult = 2;
      }
    } else if (s2.tag === 0) {
      matchResult = 0;
      h1 = s1.fields[1];
      h2 = s2.fields[1];
      l1 = s1.fields[0];
      l2 = s2.fields[0];
    } else {
      matchResult = 2;
    }
    switch (matchResult) {
      case 0:
        return new Scale(0, [min$3(compare$1, l1, l2), max$3(compare$1, h1, h2)]);
      case 1:
        return new Scale(1, [Array_distinct(append$2(v1, v2), {
          Equals: equals,
          GetHashCode: safeHash
        })]);
      default:
        throw new Error("Cannot union continuous with categorical");
    }
  }
  function Scales_calculateShapeScale(vals) {
    const scales = fold$2((state, value2) => {
      let matchResult, v, v_1, vs, x, x_1, xs;
      switch (state.tag) {
        case 1: {
          if (value2.tag === 1) {
            matchResult = 1;
            v_1 = value2.fields[0].fields[0];
            vs = state.fields[0];
          } else {
            matchResult = 4;
          }
          break;
        }
        case 2: {
          if (value2.tag === 0) {
            matchResult = 3;
            x_1 = value2.fields[0].fields[0];
            xs = state.fields[0];
          } else {
            matchResult = 4;
          }
          break;
        }
        default:
          if (value2.tag === 0) {
            matchResult = 2;
            x = value2.fields[0].fields[0];
          } else {
            matchResult = 0;
            v = value2.fields[0].fields[0];
          }
      }
      switch (matchResult) {
        case 0:
          return new FSharpChoice$3(1, [singleton$1(v)]);
        case 1:
          return new FSharpChoice$3(1, [cons(v_1, vs)]);
        case 2:
          return new FSharpChoice$3(2, [singleton$1(x)]);
        case 3:
          return new FSharpChoice$3(2, [cons(x_1, xs)]);
        default:
          throw new Error("Values with mismatching scales");
      }
    }, new FSharpChoice$3(0, [void 0]), vals);
    switch (scales.tag) {
      case 1: {
        const vs_1 = scales.fields[0];
        return new Scale(0, [new continuous(min$1(vs_1, {
          Compare: comparePrimitives
        })), new continuous(max$1(vs_1, {
          Compare: comparePrimitives
        }))]);
      }
      case 2: {
        const xs_1 = scales.fields[0];
        return new Scale(1, [Array_distinct(toArray(delay(() => map((x_4) => new categorical(x_4), reverse(xs_1)))), {
          Equals: equals,
          GetHashCode: safeHash
        })]);
      }
      default:
        throw new Error("No values for calculating a scale");
    }
  }
  function Scales_calculateShapeScales(points) {
    const xs = map$1((tuple) => tuple[0], points);
    const ys = map$1((tuple_1) => tuple_1[1], points);
    return [Scales_calculateShapeScale(xs), Scales_calculateShapeScale(ys)];
  }
  function Scales_calculateScales(style, shape) {
    const calculateScalesStyle = Scales_calculateScales;
    const calculateScales = (shape_2) => Scales_calculateScales(style, shape_2);
    switch (shape.tag) {
      case 5: {
        const shape_5 = shape.fields[2];
        const nx2 = shape.fields[1];
        const nx1 = shape.fields[0];
        const patternInput_1 = calculateScales(shape_5);
        const shape_6 = patternInput_1[1];
        const isy = patternInput_1[0][1];
        const isx = patternInput_1[0][0];
        return [[Scales_calculateShapeScale([nx1, nx2]), isy], new Scales_ScaledShape(10, [nx1, nx2, isx, shape_6])];
      }
      case 6: {
        const shape_7 = shape.fields[2];
        const ny2 = shape.fields[1];
        const ny1 = shape.fields[0];
        const patternInput_2 = calculateScales(shape_7);
        const shape_8 = patternInput_2[1];
        const isy_1 = patternInput_2[0][1];
        const isx_1 = patternInput_2[0][0];
        return [[isx_1, Scales_calculateShapeScale([ny1, ny2])], new Scales_ScaledShape(11, [ny1, ny2, isy_1, shape_8])];
      }
      case 4: {
        const sy = shape.fields[1];
        const sx = shape.fields[0];
        const shape_9 = shape.fields[2];
        const patternInput_3 = calculateScales(shape_9);
        const shape_10 = patternInput_3[1];
        const isy_2 = patternInput_3[0][1];
        const isx_2 = patternInput_3[0][0];
        let sx_2;
        if (sx != null) {
          const sx_1 = sx;
          sx_2 = sx_1;
        } else {
          sx_2 = isx_2;
        }
        let sy_2;
        if (sy != null) {
          const sy_1 = sy;
          sy_2 = sy_1;
        } else {
          sy_2 = isy_2;
        }
        return [[sx_2, sy_2], shape_10];
      }
      case 3: {
        const shape_11 = shape.fields[2];
        const ay = shape.fields[1];
        const ax = shape.fields[0];
        const patternInput_4 = calculateScales(shape_11);
        const shape_12 = patternInput_4[1];
        const isy_3 = patternInput_4[0][1];
        const isx_3 = patternInput_4[0][0];
        const autoScale = (_arg) => {
          if (_arg.tag === 0) {
            const l = _arg.fields[0].fields[0];
            const h2 = _arg.fields[1].fields[0];
            const patternInput_5 = Scales_adjustRangeUnits(l, h2);
            const l_1 = patternInput_5[0];
            const h_12 = patternInput_5[1];
            return new Scale(0, [new continuous(l_1), new continuous(h_12)]);
          } else {
            const scale2 = _arg;
            return scale2;
          }
        };
        const scales_1 = [ax ? autoScale(isx_3) : isx_3, ay ? autoScale(isy_3) : isy_3];
        return [scales_1, shape_12];
      }
      case 14: {
        const shape_13 = shape.fields[1];
        const offs = shape.fields[0];
        const patternInput_6 = calculateScales(shape_13);
        const shape_14 = patternInput_6[1];
        const scales_2 = patternInput_6[0];
        return [scales_2, new Scales_ScaledShape(9, [offs, shape_14])];
      }
      case 13: {
        const shape_15 = shape.fields[1];
        const pads = shape.fields[0];
        const patternInput_7 = calculateScales(shape_15);
        const sy_3 = patternInput_7[0][1];
        const sx_3 = patternInput_7[0][0];
        const shape_16 = patternInput_7[1];
        return [[sx_3, sy_3], new Scales_ScaledShape(8, [pads, sx_3, sy_3, shape_16])];
      }
      case 8: {
        const y = shape.fields[1];
        const x = shape.fields[0];
        const ry = shape.fields[3];
        const rx = shape.fields[2];
        const makeSingletonScale = (_arg_1) => {
          if (_arg_1.tag === 0) {
            const v_1 = _arg_1.fields[0];
            return new Scale(1, [[v_1]]);
          } else {
            const v = _arg_1.fields[0];
            return new Scale(0, [v, v]);
          }
        };
        const scales_3 = [makeSingletonScale(x), makeSingletonScale(y)];
        return [scales_3, new Scales_ScaledShape(3, [x, y, rx, ry])];
      }
      case 2: {
        const y_1 = shape.fields[1];
        const x_1 = shape.fields[0];
        const va = shape.fields[2];
        const t = shape.fields[5];
        const r = shape.fields[4];
        const ha = shape.fields[3];
        const makeSingletonScale_1 = (_arg_2) => {
          if (_arg_2.tag === 0) {
            const v_3 = _arg_2.fields[0];
            return new Scale(1, [[v_3]]);
          } else {
            const v_2 = _arg_2.fields[0];
            return new Scale(0, [v_2, v_2]);
          }
        };
        const scales_4 = [makeSingletonScale_1(x_1), makeSingletonScale_1(y_1)];
        return [scales_4, new Scales_ScaledShape(1, [x_1, y_1, va, ha, r, t])];
      }
      case 7: {
        const line = shape.fields[0];
        const line_1 = toArray(line);
        const scales_5 = Scales_calculateShapeScales(line_1);
        return [scales_5, new Scales_ScaledShape(2, [line_1])];
      }
      case 0: {
        const pt2 = shape.fields[2];
        const pt1 = shape.fields[1];
        const href = shape.fields[0];
        const scales_6 = Scales_calculateShapeScales([pt1, pt2]);
        return [scales_6, new Scales_ScaledShape(5, [href, pt1, pt2])];
      }
      case 9: {
        const points = shape.fields[0];
        const points_1 = toArray(points);
        const scales_7 = Scales_calculateShapeScales(points_1);
        return [scales_7, new Scales_ScaledShape(4, [points_1])];
      }
      case 11: {
        const showTop = shape.fields[0];
        const showRight = shape.fields[1];
        const showLeft = shape.fields[3];
        const showBottom = shape.fields[2];
        const shape_17 = shape.fields[4];
        const patternInput_8 = calculateScales(shape_17);
        const sy_4 = patternInput_8[0][1];
        const sx_4 = patternInput_8[0][0];
        patternInput_8[0];
        const matchValue = Scales_getExtremes(sx_4);
        const matchValue_1 = Scales_getExtremes(sy_4);
        const ly = matchValue_1[0];
        const lx = matchValue[0];
        const hy = matchValue_1[1];
        const hx = matchValue[1];
        const LineStyle = (clr, alpha, width, shape_18) => new Shape(1, [(s2) => new Style([alpha, new Color(1, [clr])], new Width(width), s2.StrokeDashArray, new FillStyle(0, [[1, new Color(1, ["transparent"])]]), s2.Animation, s2.Font, s2.Cursor, s2.PreserveAspectRatio, s2.FormatAxisXLabel, s2.FormatAxisYLabel), shape_18]);
        const FontStyle = (style_2, shape_19) => new Shape(1, [(s_1) => new Style([0, new Color(1, ["transparent"])], s_1.StrokeWidth, s_1.StrokeDashArray, new FillStyle(0, [[1, new Color(1, ["black"])]]), s_1.Animation, style_2, s_1.Cursor, s_1.PreserveAspectRatio, s_1.FormatAxisXLabel, s_1.FormatAxisYLabel), shape_19]);
        const shape_20 = new Shape(10, [toList(delay(() => append(singleton(new Shape(4, [sx_4, sy_4, new Shape(10, [toList(delay(() => append(map((x_2) => LineStyle("#e4e4e4", 1, 1, new Shape(7, [[[x_2, ly], [x_2, hy]]])), Scales_generateAxisSteps(sx_4)), delay(() => map((y_2) => LineStyle("#e4e4e4", 1, 1, new Shape(7, [[[lx, y_2], [hx, y_2]]])), Scales_generateAxisSteps(sy_4))))))])])), delay(() => append(showTop ? append(singleton(LineStyle("black", 1, 2, new Shape(7, [[[lx, hy], [hx, hy]]]))), delay(() => collect((matchValue_2) => {
          const x_3 = matchValue_2[0];
          const l_2 = matchValue_2[1];
          return singleton(FontStyle("9pt sans-serif", new Shape(14, [[0, -10], new Shape(2, [x_3, hy, new VerticalAlign(0, []), new HorizontalAlign(1, []), 0, l_2])])));
        }, Scales_generateAxisLabels(style.FormatAxisXLabel, sx_4)))) : empty(), delay(() => append(showRight ? append(singleton(LineStyle("black", 1, 2, new Shape(7, [[[hx, hy], [hx, ly]]]))), delay(() => collect((matchValue_3) => {
          const y_3 = matchValue_3[0];
          const l_3 = matchValue_3[1];
          return singleton(FontStyle("9pt sans-serif", new Shape(14, [[10, 0], new Shape(2, [hx, y_3, new VerticalAlign(1, []), new HorizontalAlign(0, []), 0, l_3])])));
        }, Scales_generateAxisLabels(style.FormatAxisYLabel, sy_4)))) : empty(), delay(() => append(showBottom ? append(singleton(LineStyle("black", 1, 2, new Shape(7, [[[lx, ly], [hx, ly]]]))), delay(() => collect((matchValue_4) => {
          const x_4 = matchValue_4[0];
          const l_4 = matchValue_4[1];
          return singleton(FontStyle("9pt sans-serif", new Shape(14, [[0, 10], new Shape(2, [x_4, ly, new VerticalAlign(2, []), new HorizontalAlign(1, []), 0, l_4])])));
        }, Scales_generateAxisLabels(style.FormatAxisXLabel, sx_4)))) : empty(), delay(() => append(showLeft ? append(singleton(LineStyle("black", 1, 2, new Shape(7, [[[lx, hy], [lx, ly]]]))), delay(() => collect((matchValue_5) => {
          const y_4 = matchValue_5[0];
          const l_5 = matchValue_5[1];
          return singleton(FontStyle("9pt sans-serif", new Shape(14, [[-10, 0], new Shape(2, [lx, y_4, new VerticalAlign(1, []), new HorizontalAlign(2, []), 0, l_5])])));
        }, Scales_generateAxisLabels(style.FormatAxisYLabel, sy_4)))) : empty(), delay(() => singleton(shape_17)))))))))))))]);
        const padding = [showTop ? 30 : 0, showRight ? 50 : 0, showBottom ? 30 : 0, showLeft ? 50 : 0];
        return calculateScales(new Shape(13, [padding, shape_20]));
      }
      case 10: {
        const shapes = shape.fields[0];
        const shapes_1 = Array.from(shapes);
        const scaled = map$1(calculateScales, shapes_1);
        const sxs = map$1((tupledArg) => {
          const sx_5 = tupledArg[0][0];
          return sx_5;
        }, scaled);
        const sys = map$1((tupledArg_1) => {
          const sy_5 = tupledArg_1[0][1];
          return sy_5;
        }, scaled);
        const scales_8 = [sxs.reduce(Scales_unionScales), sys.reduce(Scales_unionScales)];
        return [scales_8, new Scales_ScaledShape(6, [map$1((tuple) => tuple[1], scaled)])];
      }
      case 12: {
        const shape_21 = shape.fields[1];
        const f_1 = shape.fields[0];
        const patternInput_10 = calculateScales(shape_21);
        const shape_22 = patternInput_10[1];
        const scales_9 = patternInput_10[0];
        return [scales_9, new Scales_ScaledShape(7, [f_1, scales_9[0], scales_9[1], shape_22])];
      }
      default: {
        const shape_3 = shape.fields[1];
        const f = shape.fields[0];
        const patternInput = calculateScalesStyle(f(style), shape_3);
        const shape_4 = patternInput[1];
        const scales = patternInput[0];
        return [scales, new Scales_ScaledShape(0, [f, shape_4])];
      }
    }
  }
  function Projections_projectOne(reversed, tlv, thv, scale2, coord) {
    if (scale2.tag === 0) {
      if (coord.tag === 0) {
        return toFail(printf("Cannot project categorical value (%A) on a continuous scale (%A)."))(coord)(scale2);
      } else {
        const shv = scale2.fields[1].fields[0];
        const slv = scale2.fields[0].fields[0];
        const v_1 = coord.fields[0].fields[0];
        if (reversed) {
          return thv - (v_1 - slv) / (shv - slv) * (thv - tlv);
        } else {
          return tlv + (v_1 - slv) / (shv - slv) * (thv - tlv);
        }
      }
    } else if (coord.tag === 1) {
      return toFail(printf("Cannot project continuous value (%A) on a categorical scale (%A)."))(coord)(scale2);
    } else {
      const f = coord.fields[1];
      const v = coord.fields[0].fields[0];
      const vals = scale2.fields[0];
      const size = (thv - tlv) / vals.length;
      const i = findIndex((_arg) => {
        const vv = _arg.fields[0];
        return v === vv;
      }, vals) | 0;
      const i_1 = i + f;
      if (reversed) {
        return thv - i_1 * size;
      } else {
        return tlv + i_1 * size;
      }
    }
  }
  function Projections_projectOneX(a_, a__1) {
    const a = [a_, a__1];
    return (scale2) => ((coord) => Projections_projectOne(false, a[0], a[1], scale2, coord));
  }
  function Projections_projectOneY(a_, a__1) {
    const a = [a_, a__1];
    return (scale2) => ((coord) => Projections_projectOne(true, a[0], a[1], scale2, coord));
  }
  function Projections_projectInvOne(reversed, l, h2, s2, v) {
    if (s2.tag === 1) {
      const cats = s2.fields[0];
      const size = (h2 - l) / cats.length;
      const i = reversed ? Math.floor((h2 - v) / size) : Math.floor((v - l) / size);
      const f = reversed ? (h2 - v) / size - i : (v - l) / size - i;
      const i_1 = size < 0 ? cats.length + i : i;
      if (~~i_1 < 0 ? true : ~~i_1 >= cats.length) {
        return new Value(0, [new categorical("<outside-of-range>"), f]);
      } else {
        return new Value(0, [item(~~i_1, cats), f]);
      }
    } else {
      const slv = s2.fields[0].fields[0];
      const shv = s2.fields[1].fields[0];
      if (reversed) {
        return new Value(1, [new continuous(shv - (v - l) / (h2 - l) * (shv - slv))]);
      } else {
        return new Value(1, [new continuous(slv + (v - l) / (h2 - l) * (shv - slv))]);
      }
    }
  }
  function Projections_projectInv(x1, y1, x2, y2, sx, sy, x, y) {
    return [Projections_projectInvOne(false, x1, x2, sx, x), Projections_projectInvOne(true, y1, y2, sy, y)];
  }
  class Drawing_DrawingContext extends Record {
    constructor(Style2, Definitions) {
      super();
      this.Style = Style2;
      this.Definitions = Definitions;
    }
  }
  function Drawing_hideFill(style) {
    let matchValue, n, f, e;
    return new Style(style.StrokeColor, style.StrokeWidth, style.StrokeDashArray, new FillStyle(0, [[0, new Color(0, [0, 0, 0])]]), (matchValue = style.Animation, matchValue != null ? (n = matchValue[0] | 0, f = matchValue[2], e = matchValue[1], [n, e, (arg) => Drawing_hideFill(f(arg))]) : void 0), style.Font, style.Cursor, style.PreserveAspectRatio, style.FormatAxisXLabel, style.FormatAxisYLabel);
  }
  function Drawing_hideStroke(style) {
    let matchValue, n, f, e;
    return new Style([0, style.StrokeColor[1]], style.StrokeWidth, style.StrokeDashArray, style.Fill, (matchValue = style.Animation, matchValue != null ? (n = matchValue[0] | 0, f = matchValue[2], e = matchValue[1], [n, e, (arg) => Drawing_hideStroke(f(arg))]) : void 0), style.Font, style.Cursor, style.PreserveAspectRatio, style.FormatAxisXLabel, style.FormatAxisYLabel);
  }
  function Drawing_drawShape(ctx_mut, area__mut, area__1_mut, area__2_mut, area__3_mut, scales__mut, scales__1_mut, shape_mut) {
    Drawing_drawShape:
      while (true) {
        const ctx = ctx_mut, area_ = area__mut, area__1 = area__1_mut, area__2 = area__2_mut, area__3 = area__3_mut, scales_ = scales__mut, scales__1 = scales__1_mut, shape = shape_mut;
        const area = [area_, area__1, area__2, area__3];
        const scales = [scales_, scales__1];
        const area_1 = area;
        const y2 = area_1[3];
        const y1 = area_1[1];
        const x2 = area_1[2];
        const x1 = area_1[0];
        const scales_1 = scales;
        const sy = scales_1[1];
        const sx = scales_1[0];
        const project = (tupledArg) => {
          const vx = tupledArg[0];
          const vy = tupledArg[1];
          return [Projections_projectOneX(x1, x2)(sx)(vx), Projections_projectOneY(y1, y2)(sy)(vy)];
        };
        switch (shape.tag) {
          case 11: {
            const shape_2 = shape.fields[3];
            const p2_1 = shape.fields[1];
            const p1_1 = shape.fields[0];
            const isy = shape.fields[2];
            const y1$0027 = Projections_projectOneY(y1, y2)(sy)(p1_1);
            const y2$0027 = Projections_projectOneY(y1, y2)(sy)(p2_1);
            ctx_mut = ctx;
            area__mut = x1;
            area__1_mut = y1$0027;
            area__2_mut = x2;
            area__3_mut = y2$0027;
            scales__mut = sx;
            scales__1_mut = isy;
            shape_mut = shape_2;
            continue Drawing_drawShape;
          }
          case 9: {
            const shape_3 = shape.fields[1];
            const dy = shape.fields[0][1];
            const dx = shape.fields[0][0];
            ctx_mut = ctx;
            area__mut = x1 + dx;
            area__1_mut = y1 + dy;
            area__2_mut = x2 + dx;
            area__3_mut = y2 + dy;
            scales__mut = scales_1[0];
            scales__1_mut = scales_1[1];
            shape_mut = shape_3;
            continue Drawing_drawShape;
          }
          case 6: {
            const shapes = shape.fields[0];
            return new Svg_Svg(5, [map$1((shape_4) => Drawing_drawShape(ctx, area_1[0], area_1[1], area_1[2], area_1[3], scales_1[0], scales_1[1], shape_4), shapes)]);
          }
          case 0: {
            const shape_5 = shape.fields[1];
            const f = shape.fields[0];
            ctx_mut = new Drawing_DrawingContext(f(ctx.Style), ctx.Definitions);
            area__mut = area_1[0];
            area__1_mut = area_1[1];
            area__2_mut = area_1[2];
            area__3_mut = area_1[3];
            scales__mut = scales_1[0];
            scales__1_mut = scales_1[1];
            shape_mut = shape_5;
            continue Drawing_drawShape;
          }
          case 4: {
            const points = shape.fields[0];
            const path = toArray(delay(() => append(singleton(new Svg_PathSegment(0, [project(item(0, points))])), delay(() => append(map((pt) => new Svg_PathSegment(1, [project(pt)]), skip(1, points)), delay(() => singleton(new Svg_PathSegment(1, [project(item(0, points))]))))))));
            return new Svg_Svg(1, [path, Svg_formatStyle(ctx.Definitions, Drawing_hideStroke(ctx.Style))]);
          }
          case 5: {
            const pt2 = shape.fields[2];
            const pt1 = shape.fields[1];
            const href = shape.fields[0];
            const patternInput = project(pt1);
            const y1_1 = patternInput[1];
            const x1_1 = patternInput[0];
            const patternInput_1 = project(pt2);
            const y2_1 = patternInput_1[1];
            const x2_1 = patternInput_1[0];
            return new Svg_Svg(0, [href, [min$2(x1_1, x2_1), min$2(y1_1, y2_1)], [Math.abs(x2_1 - x1_1), Math.abs(y2_1 - y1_1)], ctx.Style.PreserveAspectRatio]);
          }
          case 8: {
            const t = shape.fields[0][0];
            const shape_6 = shape.fields[3];
            const r = shape.fields[0][1];
            const l = shape.fields[0][3];
            const isy_1 = shape.fields[2];
            const isx_1 = shape.fields[1];
            const b = shape.fields[0][2];
            const calculateNestedRange = (rev) => ((tupledArg_1) => ((ins) => {
              const v1 = tupledArg_1[0];
              const v2 = tupledArg_1[1];
              return (outs) => {
                if (ins.tag === 1) {
                  const vals = ins.fields[0];
                  const pos_1 = collect((v) => ofArray([Projections_projectOne(rev, v1, v2, outs, new Value(0, [v, 0])), Projections_projectOne(rev, v1, v2, outs, new Value(0, [v, 1]))]), vals);
                  return [min(pos_1, {
                    Compare: comparePrimitives
                  }), max(pos_1, {
                    Compare: comparePrimitives
                  })];
                } else {
                  const l_1 = ins.fields[0].fields[0];
                  const h2 = ins.fields[1].fields[0];
                  const pos = ofArray([Projections_projectOne(rev, v1, v2, outs, new Value(1, [new continuous(l_1)])), Projections_projectOne(rev, v1, v2, outs, new Value(1, [new continuous(h2)]))]);
                  return [min(pos, {
                    Compare: comparePrimitives
                  }), max(pos, {
                    Compare: comparePrimitives
                  })];
                }
              };
            }));
            const patternInput_2 = calculateNestedRange(false)([x1, x2])(isx_1)(sx);
            const x2$0027_1 = patternInput_2[1];
            const x1$0027_1 = patternInput_2[0];
            const patternInput_3 = calculateNestedRange(true)([y1, y2])(isy_1)(sy);
            const y2$0027_1 = patternInput_3[1];
            const y1$0027_1 = patternInput_3[0];
            ctx_mut = ctx;
            area__mut = x1$0027_1 + l;
            area__1_mut = y1$0027_1 + t;
            area__2_mut = x2$0027_1 - r;
            area__3_mut = y2$0027_1 - b;
            scales__mut = isx_1;
            scales__1_mut = isy_1;
            shape_mut = shape_6;
            continue Drawing_drawShape;
          }
          case 2: {
            const line = shape.fields[0];
            const path_1 = Array.from(delay(() => append(singleton(new Svg_PathSegment(0, [project(head(line))])), delay(() => map((pt_1) => new Svg_PathSegment(1, [project(pt_1)]), skip(1, line))))));
            return new Svg_Svg(1, [path_1, Svg_formatStyle(ctx.Definitions, Drawing_hideFill(ctx.Style))]);
          }
          case 1: {
            const y_4 = shape.fields[1];
            const x_4 = shape.fields[0];
            const va = shape.fields[2];
            const t_1 = shape.fields[5];
            const r_1 = shape.fields[4];
            const ha = shape.fields[3];
            const va_1 = va.tag === 2 ? "hanging" : va.tag === 1 ? "middle" : "baseline";
            const ha_1 = ha.tag === 1 ? "middle" : ha.tag === 2 ? "end" : "start";
            const xy = project([x_4, y_4]);
            return new Svg_Svg(4, [xy, t_1, r_1, toText(printf("alignment-baseline:%s; text-anchor:%s;"))(va_1)(ha_1) + Svg_formatStyle(ctx.Definitions, ctx.Style)]);
          }
          case 3: {
            const y_5 = shape.fields[1];
            const x_5 = shape.fields[0];
            const ry = shape.fields[3];
            const rx = shape.fields[2];
            return new Svg_Svg(2, [project([x_5, y_5]), [rx, ry], Svg_formatStyle(ctx.Definitions, ctx.Style)]);
          }
          case 7: {
            const shape_7 = shape.fields[3];
            shape.fields[0];
            ctx_mut = ctx;
            area__mut = area_1[0];
            area__1_mut = area_1[1];
            area__2_mut = area_1[2];
            area__3_mut = area_1[3];
            scales__mut = scales_1[0];
            scales__1_mut = scales_1[1];
            shape_mut = shape_7;
            continue Drawing_drawShape;
          }
          default: {
            const shape_1 = shape.fields[3];
            const p2 = shape.fields[1];
            const p1 = shape.fields[0];
            const isx = shape.fields[2];
            const x1$0027 = Projections_projectOneX(x1, x2)(sx)(p1);
            const x2$0027 = Projections_projectOneX(x1, x2)(sx)(p2);
            ctx_mut = ctx;
            area__mut = x1$0027;
            area__1_mut = y1;
            area__2_mut = x2$0027;
            area__3_mut = y2;
            scales__mut = isx;
            scales__1_mut = sy;
            shape_mut = shape_1;
            continue Drawing_drawShape;
          }
        }
      }
  }
  class Events_MouseEventKind extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Click", "Move", "Up", "Down"];
    }
  }
  class Events_TouchEventKind extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["Move", "Start"];
    }
  }
  class Events_InteractiveEvent extends Union {
    constructor(tag, fields) {
      super();
      this.tag = tag;
      this.fields = fields;
    }
    cases() {
      return ["MouseEvent", "TouchEvent", "TouchEnd", "MouseLeave"];
    }
  }
  function Events_projectEvent(area_, area__1, area__2, area__3, scales_, scales__1, event2) {
    const area = [area_, area__1, area__2, area__3];
    const scales = [scales_, scales__1];
    let matchResult, kind, x, y, kind_1, x_3, y_3;
    switch (event2.tag) {
      case 1: {
        if (event2.fields[1][0].tag === 1) {
          if (event2.fields[1][1].tag === 1) {
            matchResult = 1;
            kind_1 = event2.fields[0];
            x_3 = event2.fields[1][0].fields[0].fields[0];
            y_3 = event2.fields[1][1].fields[0].fields[0];
          } else {
            matchResult = 2;
          }
        } else {
          matchResult = 2;
        }
        break;
      }
      case 2: {
        matchResult = 3;
        break;
      }
      case 3: {
        matchResult = 4;
        break;
      }
      default:
        if (event2.fields[1][0].tag === 1) {
          if (event2.fields[1][1].tag === 1) {
            matchResult = 0;
            kind = event2.fields[0];
            x = event2.fields[1][0].fields[0].fields[0];
            y = event2.fields[1][1].fields[0].fields[0];
          } else {
            matchResult = 2;
          }
        } else {
          matchResult = 2;
        }
    }
    switch (matchResult) {
      case 0:
        return new Events_InteractiveEvent(0, [kind, Projections_projectInv(area[0], area[1], area[2], area[3], scales[0], scales[1], x, y)]);
      case 1:
        return new Events_InteractiveEvent(1, [kind_1, Projections_projectInv(area[0], area[1], area[2], area[3], scales[0], scales[1], x_3, y_3)]);
      case 2:
        throw new Error("TODO: projectEvent - not continuous");
      case 3:
        return new Events_InteractiveEvent(2, []);
      default:
        return new Events_InteractiveEvent(3, []);
    }
  }
  function Events_inScale(s2, v) {
    if (s2.tag === 1) {
      if (v.tag === 1) {
        throw new Error("inScale: Cannot test if continuous value is in categorical scale");
      } else {
        const cats = s2.fields[0];
        const v_2 = v.fields[0];
        return exists((y) => equals(v_2, y), cats);
      }
    } else if (v.tag === 0) {
      throw new Error("inScale: Cannot test if categorical value is in continuous scale");
    } else {
      const h2 = s2.fields[1].fields[0];
      const l = s2.fields[0].fields[0];
      const v_1 = v.fields[0].fields[0];
      if (v_1 >= min$2(l, h2)) {
        return v_1 <= max$2(l, h2);
      } else {
        return false;
      }
    }
  }
  function Events_inScales(sx, sy, event2) {
    let matchResult, x, y;
    switch (event2.tag) {
      case 2: {
        matchResult = 1;
        break;
      }
      case 0: {
        matchResult = 2;
        x = event2.fields[1][0];
        y = event2.fields[1][1];
        break;
      }
      case 1: {
        matchResult = 2;
        x = event2.fields[1][0];
        y = event2.fields[1][1];
        break;
      }
      default:
        matchResult = 0;
    }
    switch (matchResult) {
      case 0:
        return true;
      case 1:
        return true;
      default:
        if (Events_inScale(sx, x)) {
          return Events_inScale(sy, y);
        } else {
          return false;
        }
    }
  }
  function Events_triggerEvent(area__mut, area__1_mut, area__2_mut, area__3_mut, scales__mut, scales__1_mut, shape_mut, jse_mut, event_mut) {
    Events_triggerEvent:
      while (true) {
        const area_ = area__mut, area__1 = area__1_mut, area__2 = area__2_mut, area__3 = area__3_mut, scales_ = scales__mut, scales__1 = scales__1_mut, shape = shape_mut, jse = jse_mut, event2 = event_mut;
        const area = [area_, area__1, area__2, area__3];
        const scales = [scales_, scales__1];
        const area_1 = area;
        const y2 = area_1[3];
        const y1 = area_1[1];
        const x2 = area_1[2];
        const x1 = area_1[0];
        const scales_1 = scales;
        const sy = scales_1[1];
        const sx = scales_1[0];
        switch (shape.tag) {
          case 0: {
            const shape_1 = shape.fields[1];
            area__mut = area_1[0];
            area__1_mut = area_1[1];
            area__2_mut = area_1[2];
            area__3_mut = area_1[3];
            scales__mut = scales_1[0];
            scales__1_mut = scales_1[1];
            shape_mut = shape_1;
            jse_mut = jse;
            event_mut = event2;
            continue Events_triggerEvent;
          }
          case 9: {
            const shape_2 = shape.fields[1];
            const dy = shape.fields[0][1];
            const dx = shape.fields[0][0];
            area__mut = x1 + dx;
            area__1_mut = y1 + dy;
            area__2_mut = x2 + dx;
            area__3_mut = y2 + dy;
            scales__mut = scales_1[0];
            scales__1_mut = scales_1[1];
            shape_mut = shape_2;
            jse_mut = jse;
            event_mut = event2;
            continue Events_triggerEvent;
          }
          case 10: {
            const shape_3 = shape.fields[3];
            const p2 = shape.fields[1];
            const p1 = shape.fields[0];
            const isx = shape.fields[2];
            const x1$0027 = Projections_projectOneX(x1, x2)(sx)(p1);
            const x2$0027 = Projections_projectOneX(x1, x2)(sx)(p2);
            area__mut = x1$0027;
            area__1_mut = y1;
            area__2_mut = x2$0027;
            area__3_mut = y2;
            scales__mut = isx;
            scales__1_mut = sy;
            shape_mut = shape_3;
            jse_mut = jse;
            event_mut = event2;
            continue Events_triggerEvent;
          }
          case 11: {
            const shape_4 = shape.fields[3];
            const p2_1 = shape.fields[1];
            const p1_1 = shape.fields[0];
            const isy = shape.fields[2];
            const y1$0027 = Projections_projectOneY(y1, y2)(sy)(p1_1);
            const y2$0027 = Projections_projectOneY(y1, y2)(sy)(p2_1);
            area__mut = x1;
            area__1_mut = y1$0027;
            area__2_mut = x2;
            area__3_mut = y2$0027;
            scales__mut = sx;
            scales__1_mut = isy;
            shape_mut = shape_4;
            jse_mut = jse;
            event_mut = event2;
            continue Events_triggerEvent;
          }
          case 8: {
            const t = shape.fields[0][0];
            const shape_5 = shape.fields[3];
            const r = shape.fields[0][1];
            const l = shape.fields[0][3];
            const isy_1 = shape.fields[2];
            const isx_1 = shape.fields[1];
            const b = shape.fields[0][2];
            const calculateNestedRange = (rev) => ((tupledArg) => ((ins) => {
              const v1 = tupledArg[0];
              const v2 = tupledArg[1];
              return (outs) => {
                if (ins.tag === 1) {
                  const vals = ins.fields[0];
                  const pos_1 = collect((v) => ofArray([Projections_projectOne(rev, v1, v2, outs, new Value(0, [v, 0])), Projections_projectOne(rev, v1, v2, outs, new Value(0, [v, 1]))]), vals);
                  return [min(pos_1, {
                    Compare: comparePrimitives
                  }), max(pos_1, {
                    Compare: comparePrimitives
                  })];
                } else {
                  const l_1 = ins.fields[0].fields[0];
                  const h2 = ins.fields[1].fields[0];
                  const pos = ofArray([Projections_projectOne(rev, v1, v2, outs, new Value(1, [new continuous(l_1)])), Projections_projectOne(rev, v1, v2, outs, new Value(1, [new continuous(h2)]))]);
                  return [min(pos, {
                    Compare: comparePrimitives
                  }), max(pos, {
                    Compare: comparePrimitives
                  })];
                }
              };
            }));
            const patternInput = calculateNestedRange(false)([x1, x2])(isx_1)(sx);
            const x2$0027_1 = patternInput[1];
            const x1$0027_1 = patternInput[0];
            const patternInput_1 = calculateNestedRange(true)([y1, y2])(isy_1)(sy);
            const y2$0027_1 = patternInput_1[1];
            const y1$0027_1 = patternInput_1[0];
            area__mut = x1$0027_1 + l;
            area__1_mut = y1$0027_1 + t;
            area__2_mut = x2$0027_1 - r;
            area__3_mut = y2$0027_1 - b;
            scales__mut = isx_1;
            scales__1_mut = isy_1;
            shape_mut = shape_5;
            jse_mut = jse;
            event_mut = event2;
            continue Events_triggerEvent;
          }
          case 6: {
            const shapes = shape.fields[0];
            for (let idx = 0; idx <= shapes.length - 1; idx++) {
              const shape_6 = item(idx, shapes);
              Events_triggerEvent(area_1[0], area_1[1], area_1[2], area_1[3], scales_1[0], scales_1[1], shape_6, jse, event2);
            }
            break;
          }
          case 7: {
            shape.fields[2];
            shape.fields[1];
            const shape_7 = shape.fields[3];
            const handlers = shape.fields[0];
            const localEvent = Events_projectEvent(area_1[0], area_1[1], area_1[2], area_1[3], scales_1[0], scales_1[1], event2);
            if (Events_inScales(scales_1[0], scales_1[1], localEvent)) {
              const enumerator = getEnumerator(handlers);
              try {
                while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
                  const handler = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]();
                  let matchResult, f, pt, f_1, pt_1, f_2, f_3;
                  switch (localEvent.tag) {
                    case 1: {
                      if (localEvent.fields[0].tag === 1) {
                        if (handler.tag === 4) {
                          matchResult = 1;
                          f_1 = curry2(handler.fields[0]);
                          pt_1 = localEvent.fields[1];
                        } else {
                          matchResult = 4;
                        }
                      } else if (handler.tag === 5) {
                        matchResult = 1;
                        f_1 = curry2(handler.fields[0]);
                        pt_1 = localEvent.fields[1];
                      } else {
                        matchResult = 4;
                      }
                      break;
                    }
                    case 2: {
                      if (handler.tag === 6) {
                        matchResult = 2;
                        f_2 = handler.fields[0];
                      } else {
                        matchResult = 4;
                      }
                      break;
                    }
                    case 3: {
                      if (handler.tag === 7) {
                        matchResult = 3;
                        f_3 = handler.fields[0];
                      } else {
                        matchResult = 4;
                      }
                      break;
                    }
                    default:
                      switch (localEvent.fields[0].tag) {
                        case 1: {
                          if (handler.tag === 0) {
                            matchResult = 0;
                            f = curry2(handler.fields[0]);
                            pt = localEvent.fields[1];
                          } else {
                            matchResult = 4;
                          }
                          break;
                        }
                        case 2: {
                          if (handler.tag === 1) {
                            matchResult = 0;
                            f = curry2(handler.fields[0]);
                            pt = localEvent.fields[1];
                          } else {
                            matchResult = 4;
                          }
                          break;
                        }
                        case 3: {
                          if (handler.tag === 2) {
                            matchResult = 0;
                            f = curry2(handler.fields[0]);
                            pt = localEvent.fields[1];
                          } else {
                            matchResult = 4;
                          }
                          break;
                        }
                        default:
                          if (handler.tag === 3) {
                            matchResult = 0;
                            f = curry2(handler.fields[0]);
                            pt = localEvent.fields[1];
                          } else {
                            matchResult = 4;
                          }
                      }
                  }
                  switch (matchResult) {
                    case 0: {
                      if (!equals(jse, defaultOf())) {
                        jse.preventDefault();
                      }
                      f(jse)(pt);
                      break;
                    }
                    case 1: {
                      if (!equals(jse, defaultOf())) {
                        jse.preventDefault();
                      }
                      f_1(jse)(pt_1);
                      break;
                    }
                    case 2: {
                      f_2(jse);
                      break;
                    }
                    case 3: {
                      f_3(jse);
                      break;
                    }
                  }
                }
              } finally {
                disposeSafe(enumerator);
              }
            }
            area__mut = area_1[0];
            area__1_mut = area_1[1];
            area__2_mut = area_1[2];
            area__3_mut = area_1[3];
            scales__mut = scales_1[0];
            scales__1_mut = scales_1[1];
            shape_mut = shape_7;
            jse_mut = jse;
            event_mut = event2;
            continue Events_triggerEvent;
          }
        }
        break;
      }
  }
  function Derived_PreserveAspectRatio(pa, s2) {
    return new Shape(1, [(s_1) => new Style(s_1.StrokeColor, s_1.StrokeWidth, s_1.StrokeDashArray, s_1.Fill, s_1.Animation, s_1.Font, s_1.Cursor, pa, s_1.FormatAxisXLabel, s_1.FormatAxisYLabel), s2]);
  }
  function Derived_StrokeColor(clr, s2) {
    return new Shape(1, [(s_1) => new Style([1, new Color(1, [clr])], s_1.StrokeWidth, s_1.StrokeDashArray, s_1.Fill, s_1.Animation, s_1.Font, s_1.Cursor, s_1.PreserveAspectRatio, s_1.FormatAxisXLabel, s_1.FormatAxisYLabel), s2]);
  }
  function Derived_FillColor(clr, s2) {
    return new Shape(1, [(s_1) => new Style(s_1.StrokeColor, s_1.StrokeWidth, s_1.StrokeDashArray, new FillStyle(0, [[1, new Color(1, [clr])]]), s_1.Animation, s_1.Font, s_1.Cursor, s_1.PreserveAspectRatio, s_1.FormatAxisXLabel, s_1.FormatAxisYLabel), s2]);
  }
  function Derived_Font(font, clr, s2) {
    return new Shape(1, [(s_1) => new Style([0, new Color(1, [clr])], s_1.StrokeWidth, s_1.StrokeDashArray, new FillStyle(0, [[1, new Color(1, [clr])]]), s_1.Animation, font, s_1.Cursor, s_1.PreserveAspectRatio, s_1.FormatAxisXLabel, s_1.FormatAxisYLabel), s2]);
  }
  function Derived_Bar(x, y) {
    return new Shape(9, [delay(() => append(singleton([new Value(1, [x]), new Value(0, [y, 0])]), delay(() => append(singleton([new Value(1, [x]), new Value(0, [y, 1])]), delay(() => append(singleton([new Value(1, [new continuous(0)]), new Value(0, [y, 1])]), delay(() => singleton([new Value(1, [new continuous(0)]), new Value(0, [y, 0])]))))))))]);
  }
  function Derived_Column(x, y) {
    return new Shape(9, [delay(() => append(singleton([new Value(0, [x, 0]), new Value(1, [y])]), delay(() => append(singleton([new Value(0, [x, 1]), new Value(1, [y])]), delay(() => append(singleton([new Value(0, [x, 1]), new Value(1, [new continuous(0)])]), delay(() => singleton([new Value(0, [x, 0]), new Value(1, [new continuous(0)])]))))))))]);
  }
  function Compost_niceNumber(num, decs) {
    const str = toString$1(num);
    const dot = str.indexOf(".") | 0;
    const patternInput = dot === -1 ? [str, ""] : [substring(str, 0, dot), substring(str, dot + 1, min$2(decs, str.length - dot - 1))];
    const before = patternInput[0];
    const after = patternInput[1];
    const after_1 = after.length < decs ? after + toArray(delay(() => map((i) => "0", rangeDouble(1, 1, decs - after.length)))).join("") : after;
    let res = before;
    if (before.length > 5) {
      const enumerator = getEnumerator(rangeDouble(before.length - 1, -1, 0));
      try {
        while (enumerator["System.Collections.IEnumerator.MoveNext"]()) {
          const i_1 = enumerator["System.Collections.Generic.IEnumerator`1.get_Current"]() | 0;
          const j = before.length - i_1 | 0;
          if (i_1 !== 0 && j % 3 === 0) {
            res = insert(res, i_1, ",");
          }
        }
      } finally {
        disposeSafe(enumerator);
      }
    }
    if (forAll((y) => "0" === y, after_1.split(""))) {
      return res;
    } else {
      return res + "." + after_1;
    }
  }
  function Compost_defaultFormat(scale2, value2) {
    if (value2.tag === 1) {
      const v = value2.fields[0].fields[0];
      let dec;
      if (scale2.tag === 0) {
        const l = scale2.fields[0].fields[0];
        const h2 = scale2.fields[1].fields[0];
        dec = Scales_decimalPoints(l, h2);
      } else {
        dec = 0;
      }
      return Compost_niceNumber(round(v, ~~dec), ~~dec);
    } else {
      const s2 = value2.fields[0].fields[0];
      return s2;
    }
  }
  const Compost_defstyle = new Style([1, new Color(0, [256, 0, 0])], new Width(2), [], new FillStyle(0, [[1, new Color(0, [196, 196, 196])]]), void 0, "10pt sans-serif", "default", "", Compost_defaultFormat, Compost_defaultFormat);
  function Compost_getRelativeLocation(el, x, y) {
    const getOffset = (parent_mut, tupledArg_mut) => {
      getOffset:
        while (true) {
          const parent = parent_mut, tupledArg = tupledArg_mut;
          const x_1 = tupledArg[0];
          const y_1 = tupledArg[1];
          if (equals(parent, defaultOf())) {
            return [x_1, y_1];
          } else {
            parent_mut = parent.offsetParent;
            tupledArg_mut = [x_1 - parent.offsetLeft, y_1 - parent.offsetTop];
            continue getOffset;
          }
        }
    };
    const getParent = (parent_1_mut) => {
      getParent:
        while (true) {
          const parent_1 = parent_1_mut;
          if (parent_1.namespaceURI === "http://www.w3.org/2000/svg" && parent_1.tagName !== "svg") {
            if (!equals(parent_1.parentElement, defaultOf())) {
              parent_1_mut = parent_1.parentElement;
              continue getParent;
            } else {
              parent_1_mut = parent_1.parentNode;
              continue getParent;
            }
          } else if (!equals(parent_1.offsetParent, defaultOf())) {
            return parent_1;
          } else if (!equals(parent_1.parentElement, defaultOf())) {
            parent_1_mut = parent_1.parentElement;
            continue getParent;
          } else {
            parent_1_mut = parent_1.parentNode;
            continue getParent;
          }
        }
    };
    return getOffset(getParent(el), [x, y]);
  }
  function Compost_createSvg(revX, revY, width, height, viz) {
    const patternInput = Scales_calculateScales(Compost_defstyle, viz);
    const sy = patternInput[0][1];
    const sx = patternInput[0][0];
    const shape = patternInput[1];
    const defs = [];
    const area = [0, 0, width, height];
    const svg = Drawing_drawShape(new Drawing_DrawingContext(Compost_defstyle, defs), area[0], area[1], area[2], area[3], sx, sy, shape);
    const triggerEvent = (e, event2) => {
      Events_triggerEvent(area[0], area[1], area[2], area[3], sx, sy, shape, e, event2);
    };
    const mouseHandler = (kind, el, evt) => {
      const evt_1 = evt;
      const patternInput_1 = Compost_getRelativeLocation(el, evt_1.pageX, evt_1.pageY);
      const y = patternInput_1[1];
      const x = patternInput_1[0];
      triggerEvent(evt_1, new Events_InteractiveEvent(0, [kind, [new Value(1, [new continuous(x)]), new Value(1, [new continuous(y)])]]));
    };
    const touchHandler = (kind_1, el_1, evt_2) => {
      const evt_3 = evt_2;
      const touch = item(0, evt_3.touches);
      const patternInput_2 = Compost_getRelativeLocation(el_1, touch.pageX, touch.pageY);
      const y_1 = patternInput_2[1];
      const x_1 = patternInput_2[0];
      triggerEvent(evt_3, new Events_InteractiveEvent(1, [kind_1, [new Value(1, [new continuous(x_1)]), new Value(1, [new continuous(y_1)])]]));
    };
    return El_op_Dynamic_Z451691CD(h, "div")(empty$1())(singleton$1(El_op_Dynamic_Z451691CD(s, "svg")(ofArray([op_EqualsGreater("style", "overflow:visible"), op_EqualsGreater("width", int32ToString(~~width)), op_EqualsGreater("height", int32ToString(~~height)), op_EqualsBangGreater("click", uncurry2(curry3(mouseHandler)(new Events_MouseEventKind(0, [])))), op_EqualsBangGreater("mousemove", uncurry2(curry3(mouseHandler)(new Events_MouseEventKind(1, [])))), op_EqualsBangGreater("mousedown", uncurry2(curry3(mouseHandler)(new Events_MouseEventKind(3, [])))), op_EqualsBangGreater("mouseup", uncurry2(curry3(mouseHandler)(new Events_MouseEventKind(2, [])))), op_EqualsBangGreater("mouseleave", (_arg, evt_4) => {
      triggerEvent(evt_4, new Events_InteractiveEvent(3, []));
    }), op_EqualsBangGreater("touchmove", uncurry2(curry3(touchHandler)(new Events_TouchEventKind(0, [])))), op_EqualsBangGreater("touchstart", uncurry2(curry3(touchHandler)(new Events_TouchEventKind(1, [])))), op_EqualsBangGreater("touchend", (_arg_1, evt_5) => {
      triggerEvent(evt_5, new Events_InteractiveEvent(2, []));
    })]))(toList(delay(() => {
      const renderCtx = new Svg_RenderingContext(defs);
      const body = Array.from(Svg_renderSvg(renderCtx, svg));
      return append(defs, delay(() => body));
    })))));
  }
  function Helpers_formatValue(v) {
    if (v.tag === 1) {
      const v_1 = v.fields[0].fields[0];
      return v_1;
    } else {
      const r = v.fields[1];
      const c = v.fields[0].fields[0];
      return [c, r];
    }
  }
  function Helpers_parseValue(v) {
    if (typeof v == "number") {
      return new Value(1, [new continuous(v)]);
    } else if (Array.isArray(v)) {
      const a = v;
      if (a.length !== 2) {
        toFail(printf("Cannot parse value: %A. Expected a number or an array with two elements."))(a);
      }
      if (!(typeof item(1, a) == "number")) {
        toFail(printf("Cannot parse value: %A. The second element should be a number."))(a);
      }
      return new Value(0, [new categorical(item(0, a)), item(1, a)]);
    } else {
      return toFail(printf("Cannot parse value: %A. Expected a number or an array with two elements."))(v);
    }
  }
  const scale = {
    continuous(lo, hi) {
      return new Scale(0, [new continuous(lo), new continuous(hi)]);
    },
    categorical(cats) {
      return new Scale(1, [toArray(delay(() => map((c) => new categorical(c), cats)))]);
    }
  };
  const compost = {
    scaleX(sc, sh) {
      return new Shape(4, [sc, void 0, sh]);
    },
    scaleY(sc_1, sh_1) {
      return new Shape(4, [void 0, sc_1, sh_1]);
    },
    scale(sx, sy, sh_2) {
      return new Shape(4, [sx, sy, sh_2]);
    },
    nestX(lx, hx, s2) {
      return new Shape(5, [Helpers_parseValue(lx), Helpers_parseValue(hx), s2]);
    },
    nestY(ly, hy, s_1) {
      return new Shape(6, [Helpers_parseValue(ly), Helpers_parseValue(hy), s_1]);
    },
    nest(lx_1, hx_1, ly_1, hy_1, s_2) {
      return new Shape(6, [Helpers_parseValue(ly_1), Helpers_parseValue(hy_1), new Shape(5, [Helpers_parseValue(lx_1), Helpers_parseValue(hx_1), s_2])]);
    },
    overlay(sh_3) {
      return new Shape(10, [ofArray(sh_3)]);
    },
    padding(t, r, b, l, s_3) {
      return new Shape(13, [[t, r, b, l], s_3]);
    },
    fillColor(c, s_4) {
      return Derived_FillColor(c, s_4);
    },
    preserveAspectRatio(pa, s_5) {
      return Derived_PreserveAspectRatio(pa, s_5);
    },
    strokeColor(c_1, s_6) {
      return Derived_StrokeColor(c_1, s_6);
    },
    font(f, c_2, s_7) {
      return Derived_Font(f, c_2, s_7);
    },
    column(xp, yp) {
      return Derived_Column(new categorical(xp), new continuous(yp));
    },
    bar(xp_1, yp_1) {
      return Derived_Bar(new continuous(xp_1), new categorical(yp_1));
    },
    bubble(xp_2, yp_2, w, h2) {
      return new Shape(8, [Helpers_parseValue(xp_2), Helpers_parseValue(yp_2), w, h2]);
    },
    text(xp_3, yp_3, t_1, s_8, r_1) {
      const r_2 = equals(r_1, defaultOf()) ? 0 : r_1;
      const s_9 = equals(s_8, defaultOf()) ? "" : s_8;
      const va = s_9.indexOf("baseline") >= 0 ? new VerticalAlign(0, []) : s_9.indexOf("hanging") >= 0 ? new VerticalAlign(2, []) : new VerticalAlign(1, []);
      const ha = s_9.indexOf("start") >= 0 ? new HorizontalAlign(0, []) : s_9.indexOf("end") >= 0 ? new HorizontalAlign(2, []) : new HorizontalAlign(1, []);
      return new Shape(2, [Helpers_parseValue(xp_3), Helpers_parseValue(yp_3), va, ha, r_2, t_1]);
    },
    shape(a) {
      return new Shape(9, [toList(delay(() => map((p) => [Helpers_parseValue(item(0, p)), Helpers_parseValue(item(1, p))], a)))]);
    },
    line(a_1) {
      return new Shape(7, [toList(delay(() => map((p_1) => [Helpers_parseValue(item(0, p_1)), Helpers_parseValue(item(1, p_1))], a_1)))]);
    },
    image(href, pt1, pt2) {
      return new Shape(0, [href, [Helpers_parseValue(item(0, pt1)), Helpers_parseValue(item(1, pt1))], [Helpers_parseValue(item(0, pt2)), Helpers_parseValue(item(1, pt2))]]);
    },
    axes(a_2, s_10) {
      return new Shape(11, [a_2.indexOf("top") >= 0, a_2.indexOf("right") >= 0, a_2.indexOf("bottom") >= 0, a_2.indexOf("left") >= 0, s_10]);
    },
    on(o, s_11) {
      return new Shape(12, [toList(delay(() => map((k) => {
        let f_2;
        const f_1 = o[k];
        f_2 = ((args) => {
          f_1(...args);
        });
        switch (k) {
          case "mousedown":
            return new EventHandler(2, [(me, tupledArg) => {
              const x_21 = tupledArg[0];
              const y = tupledArg[1];
              f_2([Helpers_formatValue(x_21), Helpers_formatValue(y), me]);
            }]);
          case "mouseup":
            return new EventHandler(1, [(me_1, tupledArg_1) => {
              const x_22 = tupledArg_1[0];
              const y_1 = tupledArg_1[1];
              f_2([Helpers_formatValue(x_22), Helpers_formatValue(y_1), me_1]);
            }]);
          case "mousemove":
            return new EventHandler(0, [(me_2, tupledArg_2) => {
              const x_23 = tupledArg_2[0];
              const y_2 = tupledArg_2[1];
              f_2([Helpers_formatValue(x_23), Helpers_formatValue(y_2), me_2]);
            }]);
          case "touchstart":
            return new EventHandler(4, [(me_3, tupledArg_3) => {
              const x_24 = tupledArg_3[0];
              const y_3 = tupledArg_3[1];
              f_2([Helpers_formatValue(x_24), Helpers_formatValue(y_3), me_3]);
            }]);
          case "touchmove":
            return new EventHandler(5, [(me_4, tupledArg_4) => {
              const x_25 = tupledArg_4[0];
              const y_4 = tupledArg_4[1];
              f_2([Helpers_formatValue(x_25), Helpers_formatValue(y_4), me_4]);
            }]);
          case "click":
            return new EventHandler(3, [(me_5, tupledArg_5) => {
              const x_26 = tupledArg_5[0];
              const y_5 = tupledArg_5[1];
              f_2([Helpers_formatValue(x_26), Helpers_formatValue(y_5), me_5]);
            }]);
          case "mouseleave":
            return new EventHandler(7, [(me_6) => {
              f_2([me_6]);
            }]);
          case "touchend":
            return new EventHandler(6, [(me_7) => {
              f_2([me_7]);
            }]);
          default: {
            const s_12 = k;
            return toFail(printf("Unsupported event type '%s' passed to the 'on' primitive."))(s_12);
          }
        }
      }, Object.keys(o)))), s_11]);
    },
    svg(w_1, h_12, shape) {
      return Compost_createSvg(false, false, w_1, h_12, shape);
    },
    html(tag, attrs, children) {
      const attrs_1 = toArray(delay(() => map((a_3) => {
        const p_2 = attrs[a_3];
        return typeof p_2 === "function" ? [a_3, new DomAttribute(0, [(e, h_2) => {
          p_2(...[e, h_2]);
        }])] : [a_3, new DomAttribute(1, [p_2])];
      }, Object.keys(attrs))));
      const children_1 = map$1((c_3) => {
        if (typeof c_3 === "string") {
          return new DomNode(0, [c_3]);
        } else {
          return c_3;
        }
      }, children);
      return new DomNode(1, [defaultOf(), tag, attrs_1, children_1]);
    },
    interactive(id, init, update, render2) {
      const render_1 = (t_2, s_13) => {
        const el = document.getElementById(id);
        const res = render2(t_2, s_13);
        if (equals(res["constructor"], new DomNode(0, [""])["constructor"])) {
          return res;
        } else {
          return Compost_createSvg(false, false, el.clientWidth, el.clientHeight, res);
        }
      };
      createVirtualDomApp(id, init, render_1, update);
    },
    render(id_1, viz) {
      const el_1 = document.getElementById(id_1);
      const svg = Compost_createSvg(false, false, el_1.clientWidth, el_1.clientHeight, viz);
      renderTo(el_1, svg);
    }
  };
  window.c = compost;
  window.s = scale;
})();
