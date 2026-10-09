/**
 * ============================================================
 * 子系统 ④：物料注册表（MaterialRegistry）
 * ============================================================
 * 渲染引擎的"组件解析表"（低代码领域叫 resolver / renderer 注册表）：
 *   componentName → { meta, component }
 *
 * 为什么不直接用 Vue 全局 app.component / resolveComponent(name)？
 *   1. resolveComponent 字符串查全局注册表，有大写/命名冲突与 tree-shaking 隐患；
 *   2. 我们是"schema 协议层"，注册表应当是一个框架无关、可测试、可序列化的映射；
 *   3. React 生态等价物就是 craft.js 的 resolver map —— 概念处处相通。
 */

import type { Component } from 'vue'
import type { Material, MaterialMeta } from './types'

export class MaterialRegistry {
  private map = new Map<string, Material>()

  /** 注册单条物料 */
  register(material: Material): void {
    if (this.map.has(material.meta.componentName)) {
      console.warn(`[material] 物料 ${material.meta.componentName} 重复注册，已覆盖`)
    }
    this.map.set(material.meta.componentName, material)
  }

  /** 批量注册（materials/index.ts 用） */
  registerAll(list: Material[]): void {
    for (const m of list) this.register(m)
  }

  has(name: string): boolean {
    return this.map.has(name)
  }

  get(name: string): Material {
    const material = this.map.get(name)
    if (!material) throw new Error(`[material] 未注册的物料: ${name}（检查 materials/index.ts 是否注册）`)
    return material
  }

  getMeta(name: string): MaterialMeta {
    return this.get(name).meta
  }

  getComponent(name: string): Component {
    return this.get(name).component
  }

  /** 全部物料（面板/测试用） */
  list(): Material[] {
    return [...this.map.values()]
  }

  /** 按 group 分组（物料面板渲染用），保持注册顺序 */
  groups(): { group: string; materials: Material[] }[] {
    const order: string[] = []
    const byGroup = new Map<string, Material[]>()
    for (const m of this.list()) {
      if (!byGroup.has(m.meta.group)) {
        byGroup.set(m.meta.group, [])
        order.push(m.meta.group)
      }
      byGroup.get(m.meta.group)!.push(m)
    }
    return order.map((group) => ({ group, materials: byGroup.get(group)! }))
  }

  isContainer(name: string): boolean {
    return !!this.getMeta(name).isContainer
  }

  /**
   * 判断 childName 能否拖进 containerName：
   *   容器 non-container 拒绝；childWhitelist 不含 childName 拒绝；
   *   子物料 parentWhitelist 不含同名容器拒绝；否则放行。
   * （M4 拖拽校验 + 物料面板灰显都调用它）
   */
  canDropInto(containerName: string, childName: string): boolean {
    if (!this.has(containerName) || !this.has(childName)) return false
    const containerMeta = this.getMeta(containerName)
    const childMeta = this.getMeta(childName)
    if (!containerMeta.isContainer) return false
    if (containerMeta.childWhitelist && !containerMeta.childWhitelist.includes(childName)) return false
    if (childMeta.parentWhitelist && !childMeta.parentWhitelist.includes(containerName)) return false
    return true
  }

  /** 判断 childName 是否允许作为 root 的直接子节点（Page 之下） */
  canDropToRoot(childName: string): boolean {
    const meta = this.getMeta(childName)
    if (meta.parentWhitelist && !meta.parentWhitelist.includes('Page')) return false
    return true
  }
}

/** 全局唯一注册表实例（整个应用共享同一份物料表） */
export const materialRegistry = new MaterialRegistry()