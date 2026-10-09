/**
 * ============================================================
 * 子系统 ⑤：表达式沙箱（黑名单 + 白名单）
 * ============================================================
 * 为什么 AST 求值天然比 eval/Function 安全（教学核心）：
 *   求值器是我们自己看着 AST 逐节点解释的，绝不执行宿主代码——没有 eval、
 *   没有 Function 构造、不触碰原型链。剩下的防线是两道"清单"：
 *     1) 成员访问黑名单：禁止触碰任何危险的原型链门把手
 *     2) 函数调用白名单：表达式里能"调"的只有安全函数表里的函数
 *         方法调用（如 state.list.join(',')）只放行数据自带但安全的方法
 */

/** 成员访问黑名单：任何 obj[key] 出现这些 key 都拒绝 */
export const MEMBER_BLACKLIST: string[] = [
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  'caller',
  'callee',
]

/** 方法调用黑名单：对数据值调用这些方法一律拒绝（原型链/元编程门把手） */
export const METHOD_BLACKLIST: string[] = [
  'constructor',
  'call',
  'apply',
  'bind',
  'assign',
  'getPrototypeOf',
  'setPrototypeOf',
  'defineProperty',
  'defineProperties',
  'getOwnPropertyDescriptor',
  'getOwnPropertyDescriptors',
  'hasOwnProperty',
  'propertyIsEnumerable',
  'isPrototypeOf',
  'valueOf',
  'toString',
  '__proto__',
]

export function isBlacklistedMember(key: string): boolean {
  return MEMBER_BLACKLIST.includes(key)
}

export function isBlacklistedMethod(key: string): boolean {
  return METHOD_BLACKLIST.includes(key)
}

/**
 * 函数白名单：表达式里 `sum(1,2)`、`upper(name)` 这类调用只能命中这里的函数。
 * 全部是纯函数/无副作用的工具，不受表达式数据影响。
 */
export const safeFns: Record<string, (...args: unknown[]) => unknown> = {
  // —— 数学 ——
  abs: (x) => Math.abs(Number(x)),
  min: (...xs) => Math.min(...xs.map(Number)),
  max: (...xs) => Math.max(...xs.map(Number)),
  round: (x) => Math.round(Number(x)),
  ceil: (x) => Math.ceil(Number(x)),
  floor: (x) => Math.floor(Number(x)),
  pow: (x, y) => Math.pow(Number(x), Number(y)),
  sqrt: (x) => Math.sqrt(Number(x)),
  /** 求和：sum(state.items) 或 sum(1,2,3) 都行 */
  sum: (...xs: unknown[]) => {
    const flat = xs.flat(Infinity)
    return flat.reduce((acc: number, v) => acc + (Number(v) || 0), 0)
  },
  /** 求均值 */
  avg: (...xs: unknown[]) => {
    const flat: unknown[] = xs.flat(Infinity)
    if (flat.length === 0) return 0
    const total = flat.reduce((acc: number, v) => acc + (Number(v) || 0), 0)
    return total / flat.length
  },

  // —— 字符串 ——
  upper: (s) => String(s ?? '').toUpperCase(),
  lower: (s) => String(s ?? '').toLowerCase(),
  trim: (s) => String(s ?? '').trim(),
  len: (v) => (v == null ? 0 : typeof v === 'string' || Array.isArray(v) ? v.length : String(v).length),
  split: (s, sep) => String(s ?? '').split(String(sep ?? ',')),
  join: (arr, sep) => (Array.isArray(arr) ? arr.map(String).join(String(sep ?? ',')) : ''),
  concat: (...xs) => xs.flat(Infinity).join(''),
  slice: (arr, start, end) => {
    if (Array.isArray(arr)) return arr.slice(Number(start ?? 0), end === undefined ? undefined : Number(end))
    return String(arr ?? '').slice(Number(start ?? 0), end === undefined ? undefined : Number(end))
  },
  replace: (s, from, to) => String(s ?? '').split(String(from)).join(String(to ?? '')),

  // —— 逻辑 ——
  /** 非空保护：第一个非 null/undefined 的值（JS 的 ?? 语义） */
  ifNull: (a, b) => (a == null ? b : a),
  type: (v) => typeof v,
  not: (v) => !toBooleanLike(v),
  // —— 集合 ——
  count: (arr) => (Array.isArray(arr) ? arr.length : 0),
  first: (arr) => (Array.isArray(arr) ? arr[0] : undefined),
  last: (arr) => (Array.isArray(arr) ? arr[arr.length - 1] : undefined),
}

function toBooleanLike(v: unknown): boolean {
  // 与 core 求值器的 toBoolean 保持一致的宽松语义（避免循环依赖，这里内联）
  if (v == null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v !== '' && v !== 'false'
  if (Array.isArray(v)) return v.length > 0
  return true
}