/**
 * ============================================================
 * 子系统 ⑥：事件动作系统（register_action：动作注册表 + 执行器）
 * ============================================================
 * 设计对标：amis 的 onEvent 动作链（docs/research/02 §6）：
 *   onEvent: { 事件名: [ { actionType, args, condition?, outputVar? }, ... ] }
 *
 * 这里是"动作"这一侧的协议：
 *   - ActionDefinition：动作注册表条目（type/label/argDefs/run）
 *   - ActionContext：执行上下文（作用域 + 运行时能力 + 动作链共享内存 event.data）
 *   - executeChain：顺序执行 + condition 放行 + outputVar 写共享内存 + ignoreError 容错
 *
 * 教学点：
 *   - 事件不绑 JSFunction，绑"声明式动作链"——可视化配置优于写函数
 *   - 动作参数 argDefs 复用 setter 体系（PropConfig）→ EventPanel 参数表单自动生成
 */

import type { PropConfig } from '@/core/material/types'
import type { NodeId, ActionItem } from '@/core/schema/types'
import { evalExpr, toBoolean } from '@/core/expression/evaluator'
import type { Scope } from '@/core/expression/evaluator'
import type { DataSourceItem } from '@/core/schema/types'

/** 运行时能力：设计态注入 no-op 实现，预览态注入真实实现（ElMessage/fetch/window） */
export interface RuntimeApi {
  toast(message: string, type?: 'info' | 'success' | 'warning' | 'error'): void
  confirm(message: string, title?: string): Promise<boolean>
  openUrl(url: string, target?: '_blank' | '_self'): void
  /** 拉取 JSON（相对路径走 dev server 的 public/mock） */
  fetchJson(uri: string): Promise<unknown>
}

/** 动作执行上下文（由触发方组装：运行时长什么样，动作不关心） */
export interface ActionContext {
  /** 触发动作的节点 id */
  nodeId: NodeId
  /** 事件载荷（如原生 click 事件对象） */
  payload?: unknown
  /** 求值作用域：state/item/index/params（动作里的表达式都在这个 scope 上求值） */
  scope: Scope
  /** 运行时能力 */
  runtime: RuntimeApi
  /** 页面数据源声明（reloadDataSource 用） */
  dataSources?: DataSourceItem[]
  /** 动作链共享内存（amis event.data）：outputVar 写入、下游读取 */
  event: { data: Record<string, unknown> }
}

export interface ActionDefinition {
  type: string
  label: string
  /** 分组（EventPanel 里动作下拉的分组） */
  group?: string
  /** 参数声明：EventPanel 据此自动生成参数表单（复用 setter 体系） */
  argDefs: PropConfig[]
  run(action: ActionItem, ctx: ActionContext): Promise<unknown> | unknown
}

/* ================= 注册表 ================= */

const actionMap = new Map<string, ActionDefinition>()

/** 注册一个动作（动作是平台可扩展能力，amis 的 registerAction 同款） */
export function registerAction(def: ActionDefinition): void {
  actionMap.set(def.type, def)
}

export function getAction(type: string): ActionDefinition | undefined {
  return actionMap.get(type)
}

export function listActions(): ActionDefinition[] {
  return [...actionMap.values()]
}

/* ================= 执行器 ================= */

/**
 * 顺序执行一条动作链（amis executor 的本地版）：
 *   - condition 表达式为假 → 跳过该动作
 *   - outputVar 写进 ctx.event.data（下游动作引用）
 *   - ignoreError: true → 动作异常不中断链条
 */
export async function executeChain(actions: ActionItem[] | undefined, ctx: ActionContext): Promise<void> {
  const list = actions ?? []
  for (const item of list) {
    if (item.condition && !toBoolean(evalExpr(item.condition, ctx.scope))) continue
    const def = getAction(item.actionType)
    if (!def) {
      console.warn(`[events] 未注册的动作类型: ${item.actionType}（检查 registerAction）`)
      continue
    }
    try {
      const result = await def.run(item, ctx)
      if (item.outputVar && ctx.event) ctx.event.data[item.outputVar] = result
    } catch (err) {
      if (!item.ignoreError) throw err
      console.warn(`[events] 动作 ${item.actionType} 失败被 ignoreError 吞掉:`, err)
    }
  }
}