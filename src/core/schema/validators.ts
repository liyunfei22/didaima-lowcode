/**
 * ============================================================
 * 子系统 ①：Schema 校验器
 * ============================================================
 * 用于：JSON 导入时的合法性检查（M6）、调试期排错、防止脏数据进 renderer。
 * 教学点：schema 是"可校验的数据"，这正是它优于代码的地方——同一份数据
 * 可以被校验、被 diff（历史）、被传输（协作）、被序列化（持久化）。
 */

import type { NodeId, Schema, SchemaNode } from './types'
import { dfs } from './tree'

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

/** 校验一棵 Schema（或其子树）：id 唯一性 + 必需字段 + children 结构 */
export function validateSchema(root: SchemaNode): ValidationResult {
  const errors: string[] = []
  const seen = new Map<NodeId, string>()

  dfs(root, (node, parent) => {
    if (!node.id) errors.push(`${node.componentName ?? '?'}: 缺少 id`)
    else if (seen.has(node.id)) errors.push(`id "${node.id}" 重复（出现 ${seen.get(node.id)} 与 ${parent ? parent.id : 'root'}）`)
    else seen.set(node.id, parent ? parent.id : 'root')

    if (!node.componentName) errors.push(`${node.id}: 缺少 componentName`)
    if (node.props && typeof node.props !== 'object') errors.push(`${node.id}: props 必须是对象`)
    if (node.children && !Array.isArray(node.children)) errors.push(`${node.id}: children 必须是数组`)
  })

  const isSchema = 'version' in (root as Schema)
  if (isSchema) {
    const schema = root as Schema
    if (!schema.version) errors.push('缺少 version')
    if (!Array.isArray(schema.state) && schema.state && typeof schema.state !== 'object')
      errors.push('state 必须是对象')
  }

  return { ok: errors.length === 0, errors }
}