/**
 * ============================================================
 * 子系统 ⑤：表达式解析（jsep 封装）
 * ============================================================
 * 为什么借 jsep 而不是自己写 tokenizer + Pratt parser：
 *   - 解析是最无聊也最容易错的一环，jsep ~3KB 就是标准 JS 表达式语法；
 *   - 教学点保留在它下游：我们"看着 AST 求值"，这正是低代码求值器
 *     （amis-formula / expr-eval）的同一结构。
 * 选择自研求值器而非 expr-eval 的理由（architecture.md §8）：
 *   expr-eval 内部编译成 new Function，执行环境不受控；我们要的是
 *   "AST → 手工解释 + 白名单沙箱"，安全语义完全透明。
 *
 * jsep 语法边界（docs 明示受限清单）：
 *   支持：字面量/四则/比较/逻辑/三元/成员访问/Call/数组/对象
 *   不支持：模板字符串、正则字面量、?. 可选链、箭头函数、解构
 */

import jsep from 'jsep'
import type { Expression } from 'jsep'
import { EvaluatorError } from './errors'

// jsep 默认不带 ?? 运算符，这里补上（优先级最低的一档）
jsep.addBinaryOp('??', 1)

export type { Expression }

/** 解析一个表达式字符串 → AST（失败抛 EvaluatorError） */
export function parseExpr(src: string): Expression {
  const trimmed = src.trim()
  if (!trimmed) throw new EvaluatorError('空表达式', src)
  try {
    return jsep(trimmed) as Expression
  } catch (err) {
    throw new EvaluatorError(`表达式语法错误: ${(err as Error).message}`, src)
  }
}

/** 尝试解析（面板红点提示用）：不抛错 */
export function tryParseExpr(src: string): { ok: true; node: Expression } | { ok: false; error: EvaluatorError } {
  try {
    return { ok: true, node: parseExpr(src) }
  } catch (err) {
    return { ok: false, error: err instanceof EvaluatorError ? err : new EvaluatorError(String(err), src) }
  }
}