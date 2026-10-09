/**
 * core/expression/evaluator.ts 单元测试（M7 完整求值器）
 * 契约：jsep 解析 + AST 手工求值 + 沙箱白名单。
 * 覆盖：字面量 / 成员链(点与下标) / 四则与比较 / 逻辑短路 / 三元 /
 *       模板插值 / 白名单函数 / 数据方法调用 / 沙箱黑名单。
 */

import { describe, expect, it } from 'vitest'
import { evalExpr, resolvePropValue, toBoolean, evalSimple } from '../evaluator'
import type { Scope } from '../evaluator'

function makeScope(overrides: Partial<Scope> = {}): Scope {
  return {
    state: { count: 3, user: { name: '小明' }, items: ['a', 'b', 'c'], scores: [1, 2, 3] },
    ...overrides,
  }
}

describe('字面量与成员链', () => {
  it('字面量：数字 / 布尔 / null / 字符串', () => {
    expect(evalExpr('42', makeScope())).toBe(42)
    expect(evalExpr('true', makeScope())).toBe(true)
    expect(evalExpr('null', makeScope())).toBe(null)
    expect(evalExpr("'hi'", makeScope())).toBe('hi')
  })

  it('成员链：state.count / state.user.name / state.items[1]（下标）', () => {
    expect(evalExpr('state.count', makeScope())).toBe(3)
    expect(evalExpr('state.user.name', makeScope())).toBe('小明')
    expect(evalExpr('state.items[1]', makeScope())).toBe('b')
  })

  it('不存在的字段取到 undefined 而不是抛错（链式容错）', () => {
    expect(evalExpr('state.nothing.here', makeScope())).toBeUndefined()
  })

  it('循环作用域里解析 item / index', () => {
    expect(evalExpr('item', makeScope({ item: '苹果' }))).toBe('苹果')
    expect(evalExpr('index', makeScope({ index: 1 }))).toBe(1)
  })
})

describe('运算与逻辑', () => {
  it('四则 / 幂 / 取模', () => {
    expect(evalExpr('1 + 2 * 3', makeScope())).toBe(7) // 优先级正确
    expect(evalExpr('10 - 2 - 3', makeScope())).toBe(5) // 左结合
    expect(evalExpr('2 ** 3', makeScope())).toBe(8)
    expect(evalExpr('7 % 3', makeScope())).toBe(1)
    expect(evalExpr('"a" + 1', makeScope())).toBe('a1') // 字符串拼接
    expect(evalExpr('state.count + 1', makeScope())).toBe(4) // 标识符参与运算
  })

  it('比较运算（M1 版本不支持，现在支持）', () => {
    expect(evalExpr('state.count > 2', makeScope())).toBe(true)
    expect(evalExpr('state.count >= 4', makeScope())).toBe(false)
    expect(evalExpr('1 < 2', makeScope())).toBe(true)
    expect(evalExpr("state.user.name === '小明'", makeScope())).toBe(true)
  })

  it('逻辑短路（&& || ??）不提前求右值且返回原值', () => {
    expect(evalExpr('false && 1', makeScope())).toBe(false)
    expect(evalExpr('true && 1', makeScope())).toBe(1)
    expect(evalExpr("'' || '备选'", makeScope())).toBe('备选')
    expect(evalExpr('state.undef ?? "兜底"', makeScope())).toBe('兜底')
  })

  it('三元表达式', () => {
    expect(evalExpr("state.count > 2 ? '大' : '小'", makeScope())).toBe('大')
  })
})

describe('{{ }} 模板插值', () => {
  it('整段插值 + 文字拼接 + 支持完整表达式', () => {
    expect(evalExpr('你好，{{state.user.name}}！计数 {{state.count + 1}}', makeScope())).toBe('你好，小明！计数 4')
  })
  it('无插值普通字符串原样返回', () => {
    expect(evalExpr('纯文本', makeScope())).toBe('纯文本')
  })
  it('null/undefined 插值成空串', () => {
    expect(evalExpr('值:{{state.nope}}', makeScope())).toBe('值:')
  })
})

describe('函数调用（白名单容量）', () => {
  it('白名单函数：sum/upper/len/join', () => {
    expect(evalExpr('sum(1, 2, 3)', makeScope())).toBe(6)
    expect(evalExpr('sum([1,2,3])', makeScope())).toBe(6) // 接受数组
    expect(evalExpr("upper('abc')", makeScope())).toBe('ABC')
    expect(evalExpr("len('hello')", makeScope())).toBe(5)
    expect(evalExpr("join(['a','b'], '-')", makeScope())).toBe('a-b')
  })

  it('数据方法调用：字符串/数组自带方法（white 方法黑名单之外）', () => {
    expect(evalExpr("state.items.join(',')", makeScope())).toBe('a,b,c')
    expect(evalExpr("'abc'.toUpperCase()", makeScope())).toBe('ABC')
    expect(evalExpr('state.items.length', makeScope())).toBe(3)
  })

  it('数组字面量 + 展开', () => {
    expect(evalExpr('[1,2,3][0]', makeScope())).toBe(1)
  })

  it('非白名单函数调用被拒绝', () => {
    expect(() => evalExpr('nope(1)', makeScope())).toThrow()
  })
})

describe('沙箱：成员/方法黑名单', () => {
  it('访问 __proto__ / constructor / prototype 被拒绝', () => {
    expect(() => evalExpr('state.__proto__', makeScope())).toThrow()
    expect(() => evalExpr('state.constructor', makeScope())).toThrow()
    expect(() => evalExpr('[].prototype', makeScope())).toThrow()
  })

  it('调用危险方法（toString / hasOwnProperty / call）被拒绝', () => {
    expect(() => evalExpr("state.items.toString()", makeScope())).toThrow()
    expect(() => evalExpr('state.items.hasOwnProperty("x")', makeScope())).toThrow()
    expect(() => evalExpr('state.items.map.call(null, n => n)', makeScope())).toThrow()
  })
})

describe('resolvePropValue（props 双态解析）', () => {
  it('binding 描述符 → 求值', () => {
    expect(resolvePropValue({ type: 'binding', value: 'state.count' }, makeScope())).toBe(3)
    expect(resolvePropValue({ type: 'binding', value: 'state.count > 2' }, makeScope())).toBe(true)
  })
  it('字符串带 {{ }} → 模板', () => {
    expect(resolvePropValue('第{{index}}项', makeScope({ index: 0 }))).toBe('第0项')
  })
  it('字面量 → 原样透传', () => {
    expect(resolvePropValue(42, makeScope())).toBe(42)
    expect(resolvePropValue(true, makeScope())).toBe(true)
  })
})

describe('evalSimple（严格模式）', () => {
  it('表达式正常求值', () => {
    expect(evalSimple('state.count + 1', makeScope())).toBe(4)
  })
  it('纯文本抛出（不是表达式）', () => {
    expect(() => evalSimple('纯文本', makeScope())).toThrow()
  })
})

describe('toBoolean（condition 语义）', () => {
  it('undefined / 0 / 空串 / 空数组 → 假', () => {
    expect(toBoolean(undefined)).toBe(false)
    expect(toBoolean(0)).toBe(false)
    expect(toBoolean('')).toBe(false)
    expect(toBoolean([])).toBe(false)
  })
  it('非空值 → 真', () => {
    expect(toBoolean(1)).toBe(true)
    expect(toBoolean('x')).toBe(true)
    expect(toBoolean([1])).toBe(true)
    expect(toBoolean({})).toBe(true)
  })
})