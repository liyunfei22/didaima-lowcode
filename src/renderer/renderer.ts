/**
 * ============================================================
 * 子系统 ②：渲染引擎（纯函数层）
 * ============================================================
 * 渲染引擎 = 递归遍历 schema 树 + 组件注册表 + props 双态解析 + 作用域链。
 * 这里放所有"与 UI 无关"的解析逻辑（可单测），SchemaNode.vue 只是薄壳：
 *   resolved.comp       → 注册表解析出的组件对象
 *   resolved.attrs      → props 解析后的属性（v-bind）
 *   resolved.listeners  → onEvent 动作链 → v-on 监听器
 * v-model 教学点：modelValue 是普通 prop、onUpdate:modelValue 是普通 listener，
 *   <component v-bind v-on> 原样透传即等价模板里的 v-model —— 渲染层零特判。
 */

import type { Component } from 'vue'
import type { SchemaNode } from '../core/schema/types'
import { materialRegistry } from '../core/material/registry'
import { evalExpr, resolvePropValue, toBoolean } from '../core/expression/evaluator'
import type { Scope } from '../core/expression/evaluator'

/** 事件处理器注入点：设计态 / 预览态由调用方提供（M3/M8 接入动作执行器） */
export interface RuntimeHandlers {
  /** onEvent 动作链触发回调（M8 接入 executor.executeChain） */
  onEvent?: (node: SchemaNode, event: string, payload: unknown, scope: Scope) => void
  /** v-model 值变更回调（预览态写入 state；设计态 no-op） */
  onModelUpdate?: (node: SchemaNode, value: unknown) => void
}

export interface ResolvedRender {
  comp: Component
  attrs: Record<string, unknown>
  listeners: Record<string, (...args: unknown[]) => void>
}

/** 条件渲染：condition 表达式求值为假 → 不渲染（amis visibleOn / lowcode condition） */
export function resolveCondition(node: SchemaNode, scope: Scope): boolean {
  if (!node.condition) return true
  try {
    return toBoolean(evalExpr(node.condition, scope))
  } catch {
    return true // 求值失败按"渲染"处理（面板另做红点提示），避免误隐藏整个子树
  }
}

/** 循环渲染：loop 表达式求值须为数组；非数组/失败 → 空数组（v-for 渲染 0 次） */
export function resolveLoopItems(node: SchemaNode, scope: Scope): unknown[] {
  if (!node.loop) return []
  try {
    const value = evalExpr(node.loop, scope)
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

/** 生成子作用域：parent 加上循环注入的 item/index 或插槽的 slotProps（amis 数据链的分层实现） */
export function childScope(parent: Scope, extra?: Record<string, unknown>): Scope {
  return extra && Object.keys(extra).length > 0 ? { ...parent, ...extra } : parent
}

/**
 * 解析一个节点的完整渲染结果：
 * attrs：遍历 props —— 字面量透传 / binding 求值 / 字符串含 {{ }} 走模板
 * listeners：**事件名 → 监听器**（如 'click'、'update:modelValue'）。
 *   ⚠️ 不能用 onXxx（onClick）形式：模板里 v-on="listeners" 会编译成
 *   _toHandlers(listeners)，它会给每个 key 再补一个 on 前缀，写 onclick 就
 *   变成 onOnClick 而永远触发不了（本项目踩过的坑）。
 */
export function resolveRender(node: SchemaNode, scope: Scope, handlers?: RuntimeHandlers): ResolvedRender {
  const material = materialRegistry.get(node.componentName)
  const attrs: Record<string, unknown> = {}
  const listeners: Record<string, (...args: unknown[]) => void> = {}

  for (const [key, value] of Object.entries(node.props ?? {})) {
    try {
      attrs[key] = resolvePropValue(value, scope)
    } catch {
      attrs[key] = undefined // 求值失败的属性置为空值，避免整棵树渲染崩溃
    }
  }

  // 事件动作链 → 监听器（M8 接入真实 executor）
  for (const [event, actions] of Object.entries(node.onEvent ?? {})) {
    if (!Array.isArray(actions) || actions.length === 0) continue
    listeners[event] = (payload: unknown) => {
      handlers?.onEvent?.(node, event, payload, scope)
      void actions // actions 由 handlers 消费（设计态/预览态走同一入口）
    }
  }

  // v-model：modelValue 是普通 prop，update:modelValue 是普通事件名
  if ('modelValue' in (node.props ?? {})) {
    listeners['update:modelValue'] = (value: unknown) => {
      handlers?.onModelUpdate?.(node, value)
    }
  }

  return { comp: material.component, attrs, listeners }
}