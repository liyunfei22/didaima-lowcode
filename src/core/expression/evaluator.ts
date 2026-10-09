/**
 * ============================================================
 * 子系统 ⑤：表达式求值器（M7 完整版：jsep 解析 → AST 手工求值）
 * ============================================================
 * 管线：字符串 → (jsep) → AST → 这份文件里逐节点解释。
 *   tokenizer/parser 借 jsep（见 parser.ts 的取舍），求值与安全全在这里。
 *
 * 求值语义（对照研究文档 02 §5）：
 *   - 标识符沿作用域解析：state / item / index / params（amis 数据链的本地版）
 *   - 成员访问：obj.key / obj[key]，逐层做黑名单校验，缺属性返回 undefined
 *   - 函数调用：只有白名单 safeFns 能调；对数据值的方法调用走方法黑名单
 *   - && || ?? 必须短路求值（保持 JS 语义）
 *   - 双语法：`{{ }}` 模板插值（Appsmith 风格）与完整表达式
 *
 * M7 之前这里是"简易求值器"，行为由 __tests__/evaluator.spec.ts 守住，
 * 本版本让之前"暂不支持"的语法全部生效，签名保持不变。
 */

import type { Expression } from './parser'
import { parseExpr } from './parser'
import { EvaluatorError } from './errors'
import { isBlacklistedMember, isBlacklistedMethod, safeFns } from './sandbox'

export { EvaluatorError } from './errors'

/** 表达式求值作用域 */
export interface Scope {
  /** 页面数据域 */
  state: Record<string, unknown>
  /** loop 当前项 */
  item?: unknown
  /** loop 下标 */
  index?: number
  /** 页面参数 */
  params?: Record<string, unknown>
  [extra: string]: unknown
}

/* ================= 标识符/成员解析 ================= */

/** 解析顶层标识符：只在作用域自身的键里找（hasOwnProperty 防原型链） */
function resolveIdentifier(name: string, scope: Scope): unknown {
  if (Object.prototype.hasOwnProperty.call(scope, name)) return scope[name]
  throw new EvaluatorError(`未知变量: ${name}`, name)
}

/** 读取对象成员：先过黑名单，再取值（null/undefined 容错返回 undefined） */
function readMember(obj: unknown, key: string, exprSrc: string): unknown {
  if (isBlacklistedMember(key)) throw new EvaluatorError(`禁止访问属性: ${key}`, exprSrc)
  if (obj == null) return undefined
  try {
    return (obj as Record<string, unknown>)[key]
  } catch {
    return undefined
  }
}

/** 调用数据对象上的方法（如 state.items.join(',')）：过方法黑名单，绑定 this */
function callMethod(obj: unknown, method: string, args: unknown[], exprSrc: string): unknown {
  if (isBlacklistedMethod(method)) throw new EvaluatorError(`禁止调用方法: ${method}`, exprSrc)
  if (obj == null) throw new EvaluatorError(`无法在 null/undefined 上调用 .${method}`, exprSrc)
  const fn = (obj as Record<string, unknown>)[method]
  if (typeof fn !== 'function') throw new EvaluatorError(`没有方法 .${method}`, exprSrc)
  try {
    return fn.apply(obj, args)
  } catch (err) {
    throw new EvaluatorError(`调用 .${method} 失败: ${(err as Error).message}`, exprSrc)
  }
}

/* ================= AST 求值器 ================= */

export function evalNode(node: Expression, scope: Scope, src: string): unknown {
  switch (node.type) {
    case 'Literal': {
      return (node as unknown as unknown as { value: unknown }).value
    }

    case 'Identifier': {
      const name = (node as unknown as unknown as { name: string }).name
      if (name in safeFns) return safeFns[name] // 白名单函数本身就是"值"
      return resolveIdentifier(name, scope)
    }

    case 'UnaryExpression': {
      const un = node as unknown as { operator: string; argument: Expression }
      const arg = evalNode(un.argument, scope, src)
      switch (un.operator) {
        case '!':
          return !toBoolean(arg)
        case '-':
          return -Number(arg)
        case '+':
          return Number(arg)
        case 'typeof':
          return typeof arg
        default:
          throw new EvaluatorError(`不支持的一元运算: ${un.operator}`, src)
      }
    }

    case 'BinaryExpression':
    case 'LogicalExpression': {
      const bin = node as unknown as { operator: string; left: Expression; right: Expression }
      // 短路运算：不先求右值
      if (bin.operator === '&&') {
        const l = evalNode(bin.left, scope, src)
        return toBoolean(l) ? evalNode(bin.right, scope, src) : l
      }
      if (bin.operator === '||') {
        const l = evalNode(bin.left, scope, src)
        return toBoolean(l) ? l : evalNode(bin.right, scope, src)
      }
      if (bin.operator === '??') {
        const l = evalNode(bin.left, scope, src)
        return l == null ? evalNode(bin.right, scope, src) : l
      }
      const left = evalNode(bin.left, scope, src)
      const right = evalNode(bin.right, scope, src)
      return applyBinary(bin.operator, left, right, src)
    }

    case 'ConditionalExpression': {
      const cond = node as unknown as { test: Expression; consequent: Expression; alternate: Expression }
      return toBoolean(evalNode(cond.test, scope, src))
        ? evalNode(cond.consequent, scope, src)
        : evalNode(cond.alternate, scope, src)
    }

    case 'MemberExpression': {
      const mem = node as unknown as { computed: boolean; object: Expression; property: Expression }
      const obj = evalNode(mem.object, scope, src)
      const key = mem.computed ? String(evalNode(mem.property, scope, src)) : (mem.property as unknown as { name: string }).name
      return readMember(obj, key, src)
    }

    case 'CallExpression': {
      const call = node as unknown as { callee: Expression; arguments: Expression[] }
      const args = call.arguments.map((a) => evalNode(a, scope, src))

      // 1) 白名单函数：sum(...) / upper(...)
      if (call.callee.type === 'Identifier') {
        const name = (call.callee as unknown as { name: string }).name
        const fn = safeFns[name]
        if (!fn) throw new EvaluatorError(`未知函数: ${name}（只能在白名单 safeFns 里取）`, src)
        return fn(...args)
      }
      // 2) 数据对象方法：state.arr.join(',') / 'abc'.toUpperCase()
      if (call.callee.type === 'MemberExpression') {
        const cx = call.callee as unknown as { object: Expression; property: Expression; computed: boolean }
        const obj = evalNode(cx.object, scope, src)
        const method = cx.computed ? String(evalNode(cx.property, scope, src)) : (cx.property as unknown as { name: string }).name
        return callMethod(obj, method, args, src)
      }
      throw new EvaluatorError('不支持的调用形式', src)
    }

    case 'ArrayExpression': {
      const arr = node as unknown as { elements: Expression[] }
      return getSpread(arr.elements).flatMap((el) => {
        if (el.type === 'SpreadElement') {
          const val = evalNode((el as unknown as { argument: Expression }).argument, scope, src)
          return Array.isArray(val) ? val : []
        }
        return [evalNode(el, scope, src)]
      })
    }

    case 'ObjectExpression': {
      const obj = node as unknown as { properties: Array<{ type: string; key: Expression; value: Expression; computed: boolean }> }
      const out: Record<string, unknown> = {}
      for (const prop of obj.properties) {
        if (prop.type === 'Property') {
          const key = prop.computed
            ? String(evalNode(prop.key, scope, src))
            : ((prop.key as unknown as { name?: string }).name ?? String((prop.key as unknown as { value?: unknown }).value))
          out[key] = evalNode(prop.value, scope, src)
        }
      }
      return out
    }

    case 'Compound': {
      const body = (node as unknown as unknown as { body: Expression[] }).body
      if (body.length === 0) return undefined
      let last: unknown
      for (const part of body) last = evalNode(part, scope, src)
      return last
    }

    default:
      throw new EvaluatorError(`未实现的 AST 节点类型: ${(node as unknown as unknown as { type: string }).type}`, src)
  }
}

function getSpread(elements: Expression[]): Expression[] {
  return elements
}

/** 二元运算分发（含比较、算数、位运算的常用子集） */
function applyBinary(op: string, left: unknown, right: unknown, src: string): unknown {
  switch (op) {
    case '+':
      // 任一为字符串 → 拼接（JS 语义）
      if (typeof left === 'string' || typeof right === 'string') return String(left ?? '') + String(right ?? '')
      return Number(left) + Number(right)
    case '-':
      return Number(left) - Number(right)
    case '*':
      return Number(left) * Number(right)
    case '/':
      return Number(left) / Number(right)
    case '%':
      return Number(left) % Number(right)
    case '**':
      return Math.pow(Number(left), Number(right))
    case '===':
      return left === right
    case '!==':
      return left !== right
    case '==':
      return looseEqual(left, right)
    case '!=':
      return !looseEqual(left, right)
    case '<':
      return Number(left) < Number(right)
    case '<=':
      return Number(left) <= Number(right)
    case '>':
      return Number(left) > Number(right)
    case '>=':
      return Number(left) >= Number(right)
    case '&':
      return Number(left) & Number(right)
    case '|':
      return Number(left) | Number(right)
    case '^':
      return Number(left) ^ Number(right)
    default:
      throw new EvaluatorError(`未支持的二元运算: ${op}`, src)
  }
}

/** 简易宽松相等：空值相等 / 数字化比较兜底（教学版够用） */
function looseEqual(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return a == b
  if (typeof a === 'boolean' || typeof b === 'boolean') return toBoolean(a) === toBoolean(b)
  const an = Number(a)
  const bn = Number(b)
  if (!Number.isNaN(an) && !Number.isNaN(bn)) return an === bn
  return String(a) === String(b)
}

/* ================= 对外 API（保持 M1 以来的签名） ================= */

/**
 * 模板插值：'A {{x}} B' → 逐段求值拼字符串
 * 实现：用 ({{...}}) 分组把字符串切成 [text, expr, text, expr, text]。
 */
export function evalTemplate(src: string, scope: Scope): string {
  const parts = src.split(/\{\{(.+?)\}\}/g)
  let out = ''
  for (let i = 0; i < parts.length; i += 2) {
    out += parts[i]
    if (i + 1 < parts.length) {
      const value = evalExpr(parts[i + 1].trim(), scope)
      out += value == null ? '' : String(value)
    }
  }
  return out
}

/**
 * 完整表达式求值入口：模板模式 | 表达式 | 纯文本原样返回
 *   evalExpr('hello {{state.count}}', ...) → 'hello 3'（插值）
 *   evalExpr('state.count > 2', ...)       → true
 *   evalExpr('纯文本', ...)                 → '纯文本'（原样）
 * 注：纯文本语义 = Appsmith 风格（不含运算符号的字串是文本，不是表达式），
 *     不匹配时会走一次"看起来像表达式就报错"的判定（M1 定下的契约）。
 */
export function evalExpr(src: string, scope: Scope): unknown {
  const srcTrim = src.trim()
  if (!srcTrim) return ''
  if (srcTrim.includes('{{')) return evalTemplate(src, scope)
  if (!looksLikeExpression(srcTrim)) return src
  return evalNode(parseExpr(srcTrim), scope, src)
}

/** 严格求值：必须是一个表达式，纯文本会抛错（binding 描述符/动作 args 用） */
export function evalSimple(expr: string, scope: Scope): unknown {
  const trimmed = expr.trim()
  if (!looksLikeExpression(trimmed)) throw new EvaluatorError('不是表达式，而是纯文本', expr)
  return evalNode(parseExpr(trimmed), scope, expr)
}

/**
 * 判断一个字符串"看起来像表达式"：用于把模板字符串与纯文本区分开
 * （Appsmith 语义：`{{ }}` 才是表达式，其余是文本；但 `item` / `true` / `7 % 3`
 * 这类"标识符/数字/带运算符"的写法要按表达式处理，不能误判成文本）。
 */
function looksLikeExpression(expr: string): boolean {
  if (!expr) return false
  // 1) 纯标识符：item / true / state
  if (/^[A-Za-z_$][\w$]*$/.test(expr)) return true
  // 2) 数字 / 引号字符串字面量
  if (/^[-+]?\d+(\.\d+)?$/.test(expr)) return true
  if (/^(['"]).*\1$/.test(expr)) return true
  // 3) 以标识符/数字/引号/括号/花括号开头，且含运算符号
  return /^[A-Za-z_$0-9'"(\[{]/.test(expr) && /[>.<\]\[()+\-*%&|=!/?:]/.test(expr)
}

/** 冒烟检测当前能否求单个值（属性面板红点提示用） */
export function tryEvaluate(src: string, scope: Scope): { ok: true; value: unknown } | { ok: false; error: EvaluatorError } {
  try {
    return { ok: true, value: evalExpr(src, scope) }
  } catch (err) {
    return { ok: false, error: err instanceof EvaluatorError ? err : new EvaluatorError(String(err), src) }
  }
}

/**
 * 解析一个 PropValue：
 *   - 绑定描述符 { type:'binding' } → 求值
 *   - 普通字符串内含 {{ }} → 模板求值（Appsmith 风格）
 *   - 其他字面量 → 原样返回
 */
export function resolvePropValue(pv: unknown, scope: Scope): unknown {
  if (pv && typeof pv === 'object' && (pv as unknown as { type?: string }).type === 'binding') {
    const value = (pv as unknown as { value: string }).value
    return value.includes('{{') ? evalTemplate(value, scope) : evalExpr(value.trim(), scope)
  }
  if (typeof pv === 'string' && pv.includes('{{')) return evalTemplate(pv, scope)
  return pv
}

/** 把求值结果安全转换为 boolean（v-if / condition 用） */
export function toBoolean(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0 && !Number.isNaN(value)
  if (typeof value === 'string') return value !== '' && value !== 'false'
  if (Array.isArray(value)) return value.length > 0
  return true
}