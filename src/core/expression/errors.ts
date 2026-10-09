/**
 * 求值错误：带上表达式原文，方便面板红点提示。
 * 独立成模块是为了避免 parser ↔ evaluator 的循环导入。
 */
export class EvaluatorError extends Error {
  readonly expr?: string
  constructor(message: string, expr?: string) {
    super(message)
    this.name = 'EvaluatorError'
    this.expr = expr
  }
}