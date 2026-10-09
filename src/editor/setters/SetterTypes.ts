/**
 * ============================================================
 * 子系统 ④：setter 体系（低代码引擎的属性面板"0 代码自动生成"来源）
 * ============================================================
 * 每个 setter 是一个受控组件：接收 { config, value, onChange }，
 * 内部渲染对应的 Element Plus 录入控件。
 * SetterRegistry = setter 描述符（core/material/types 的 SetterDescriptor）→ 组件。
 *
 * 教学对照：
 *   - lowcode-engine 的 configure.props[i].setter.componentName（StringSetter/
 *     SelectSetter/evaluate...）—— 它内置 20+ setter 且可注册自定义 setter，
 *     我们做的是同一个抽象的一小份。
 *   - 属性面板 = 遍历物料 meta 的 configure.props，逐项用注册表换成控件。
 *     "写物料不用写面板"就是这么来的。
 */

import type { Component } from 'vue'
import type { PropConfig, SetterDescriptor } from '@/core/material/types'
import type { PropValue } from '@/core/schema/types'

/** 所有 setter 的通用契约（受控组件） */
export interface SetterProps {
  /** 属性配置（options / tip 等） */
  config: PropConfig
  /** 当前值（字面量；绑定模式由 PropRow 拦截，不走到这里） */
  value: PropValue | undefined
  onChange(v: PropValue): void
}

/** setter 描述符 → 组件 的注册表（PropPanel 遍历 configure.props 时会查它） */
export const SetterRegistry: Record<SetterDescriptor, Component> = Object.create(null)