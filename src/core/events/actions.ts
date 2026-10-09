/**
 * ============================================================
 * 子系统 ⑥：内置动作集（registerAction 的初始化装配）
 * ============================================================
 * 六个动作覆盖内部工具页面的常见逻辑：
 *   updateState 改数据域（计数/表单回写等一切"改 state"）
 *   toast / confirm / openUrl 属于"反馈与跳转"（直接用运行时能力）
 *   fetch / reloadDataSource 拉数据写回 state
 *
 * 参数求值约定（教学点）：
 *   args 的值如果是字符串 → 用 evalExpr 求值：
 *     "count": "state.count + 1" → 4（表达式）
 *     "name": "张三"              → '张三'（纯文本按原样，Appsmith 语义）
 *   键名支持点路径："user.name" → 写入嵌套字段。
 */

import { registerAction, type ActionContext } from './registry'
import { evalExpr } from '@/core/expression/evaluator'
import { setByPath } from '@/core/utils/path'

/** 求 args 中一个字段的值：字符串走表达式语义，其余字面量穿透 */
function resolveArg(value: unknown, ctx: ActionContext): unknown {
  if (typeof value === 'string') {
    try {
      return evalExpr(value, ctx.scope)
    } catch {
      return value // 表达式写错了也按原文本兜底，不中断链条
    }
  }
  return value
}

/** 把 { key: value } 的每一项按点路径写进 state */
function writeState(ctx: ActionContext, args: Record<string, unknown>): void {
  const state = ctx.scope.state
  for (const [key, raw] of Object.entries(args)) {
    const path = key.split('.').filter(Boolean)
    if (path.length === 0) continue
    setByPath(state, path, resolveArg(raw, ctx))
  }
}

export function registerBuiltinActions(): void {
  /* ---------- 修改数据域 ---------- */
  registerAction({
    type: 'updateState',
    label: '修改数据 state',
    group: '数据',
    argDefs: [
      { name: 'args', label: '字段=值', setter: 'json', default: { count: 'state.count + 1' }, tip: '如 { "count": "state.count + 1", "user.name": "\"\" " }' },
    ],
    run(item, ctx) {
      const args = (item.args as Record<string, unknown> | undefined) ?? {}
      writeState(ctx, args)
    },
  })

  /* ---------- 反馈提示 ---------- */
  registerAction({
    type: 'toast',
    label: '消息提示 toast',
    group: '反馈',
    argDefs: [
      { name: 'message', label: '内容', setter: 'text', default: '操作成功' },
      {
        name: 'type',
        label: '类型',
        setter: 'select',
        options: [
          { label: '成功', value: 'success' },
          { label: '信息', value: 'info' },
          { label: '警告', value: 'warning' },
          { label: '错误', value: 'error' },
        ],
        default: 'success',
      },
    ],
    run(item, ctx) {
      const args = item.args ?? {}
      ctx.runtime.toast(String(resolveArg(args['message'], ctx) ?? ''), (args['type'] as 'info' | 'success' | 'warning' | 'error') ?? 'info')
    },
  })

  /* ---------- 二次确认（返回值写 outputVar，后续动作拿它做条件） ---------- */
  registerAction({
    type: 'confirm',
    label: '确认框 confirm',
    group: '反馈',
    argDefs: [
      { name: 'message', label: '提示内容', setter: 'text', default: '确定执行吗？' },
      { name: 'title', label: '标题', setter: 'text', default: '提示' },
    ],
    async run(item, ctx) {
      const args = item.args ?? {}
      return ctx.runtime.confirm(String(resolveArg(args['message'], ctx) ?? ''), String(resolveArg(args['title'], ctx) ?? ''))
    },
  })

  /* ---------- 跳转 ---------- */
  registerAction({
    type: 'openUrl',
    label: '打开链接 openUrl',
    group: '导航',
    argDefs: [
      { name: 'url', label: '地址', setter: 'text', default: 'https://' },
      {
        name: 'target',
        label: '打开方式',
        setter: 'select',
        options: [
          { label: '新窗口', value: '_blank' },
          { label: '当前页', value: '_self' },
        ],
        default: '_blank',
      },
    ],
    run(item, ctx) {
      const args = item.args ?? {}
      ctx.runtime.openUrl(String(resolveArg(args['url'], ctx) ?? ''), (args['target'] as '_blank' | '_self') ?? '_blank')
    },
  })

  /* ---------- 拉取数据写 state ---------- */
  registerAction({
    type: 'fetch',
    label: '请求数据 fetch',
    group: '数据',
    argDefs: [
      { name: 'uri', label: '地址', setter: 'text', default: '/mock/list.json' },
      { name: 'dataField', label: '写入 state 字段', setter: 'text', default: 'list', tip: '如 list 或 user.profile' },
    ],
    async run(item, ctx) {
      const args = item.args ?? {}
      const uri = String(resolveArg(args['uri'], ctx) ?? '')
      if (!uri) return undefined
      const data = await ctx.runtime.fetchJson(uri)
      const field = String(args['dataField'] ?? 'list')
      setByPath(ctx.scope.state, field.split('.'), data)
      return data // outputVar 可拿到响应
    },
  })

  /* ---------- 重跑声明式数据源---------- */
  registerAction({
    type: 'reloadDataSource',
    label: '刷新数据源',
    group: '数据',
    argDefs: [
      { name: 'id', label: '数据源 id', setter: 'text', default: '', tip: '对应 schema.dataSource 里的 id' },
    ],
    async run(item, ctx) {
      const id = String(item.args?.['id'] ?? '')
      const ds = ctx.dataSources?.find((d) => d.id === id)
      if (!ds) {
        console.warn(`[events] 找不到数据源 id: ${id}`)
        return undefined
      }
      const data = await ctx.runtime.fetchJson(ds.uri)
      setByPath(ctx.scope.state, (ds.dataField ?? ds.id).split('.'), data)
      return data
    },
  })
}