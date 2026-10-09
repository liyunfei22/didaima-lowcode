/**
 * ============================================================
 * 子系统 ①：Schema 节点树操作
 * ============================================================
 * 所有"改树"的操作都写成【对 draft 的原地修改】——调用方只有两个：
 *   1) editor/store 的 commit(mutator)：用 immer produceWithPatches 包一层；
 *   2) 纯单元测试。
 * 这样设计（craft.js 的思想）：
 *   拖拽、属性编辑、删除复制……一切交互最终都降维成对树的若干个纯函数操作，
 *   Schema 树是不可变数据（immer 生成新树），历史栈拿 patches 做 undo/redo。
 */

import type { NodeId, PropValue, Schema, SchemaNode } from './types'

/** 自增序号 + 时间戳 + 随机段，保证会话内全局唯一 */
let seq = 0
export function genId(prefix = 'node'): NodeId {
  seq += 1
  return `${prefix}_${Date.now().toString(36)}${seq}_${Math.random().toString(36).slice(2, 6)}`
}

/** 查找结果：节点本身 + 父节点（根节点 parent 为 null）+ 在父 children 中的下标 */
export interface FindResult {
  node: SchemaNode
  parent: SchemaNode | null
  index: number
}

/**
 * 按 id 查找节点（深度优先，先序）
 * @param root 子树根（可以是整棵 Schema；因为 Schema 本身就是一棵 Page 节点树）
 * @returns null 表示未找到
 */
export function findById(root: SchemaNode, id: NodeId): FindResult | null {
  if (root.id === id) return { node: root, parent: null, index: -1 }
  const children = root.children ?? []
  for (let i = 0; i < children.length; i++) {
    // 先看直接子节点（省一层递归，逻辑也更直白）
    const child = children[i]
    if (child.id === id) return { node: child, parent: root, index: i }
    // 再递归进子树
    const found = findById(child, id)
    if (found) return found
  }
  return null
}

/** 深度优先遍历（先序）：visit(node, parent) */
export function dfs(root: SchemaNode, visit: (node: SchemaNode, parent: SchemaNode | null) => void): void {
  visit(root, null)
  for (const child of root.children ?? []) dfs(child, visit)
}

/**
 * 判断 id 是否落在 ancestorId 的子树里（用于拖拽"禁自嵌套、禁回环"）
 * 只读函数，不修改树
 */
export function isDescendantOf(root: SchemaNode, ancestorId: NodeId, id: NodeId): boolean {
  const ancestor = findById(root, ancestorId)
  if (!ancestor) return false
  let found = false
  dfs(ancestor.node, (node) => {
    if (node.id === id && node.id !== ancestorId) found = true
  })
  return found
}

/**
 * 创建一个新节点：生成唯一 id + 保证 children 字段存在（方便后续 push）
 */
export function createNode(partial: Partial<SchemaNode> & { componentName: string }): SchemaNode {
  return {
    id: partial.id ?? genId(),
    componentName: partial.componentName,
    title: partial.title,
    props: partial.props,
    children: partial.children ?? [],
    condition: partial.condition,
    loop: partial.loop,
    loopKey: partial.loopKey,
    onEvent: partial.onEvent,
    lock: partial.lock,
  }
}

/**
 * 在容器节点下添加子节点（原地修改 draft）
 * @param targetId 目标容器节点 id；null 表示直接加在 root 下
 * @param newNode  新节点（通常来自 createNode 或物料 snippet）
 * @param index    插入位置；缺省追加到末尾
 */
export function addNode(root: SchemaNode, targetId: NodeId | null, newNode: SchemaNode, index?: number): void {
  const parent = targetId === null ? root : findById(root, targetId)?.node
  if (!parent) throw new Error(`addNode: 找不到容器节点 ${targetId}`)
  parent.children ??= []
  if (typeof index === 'number' && index >= 0 && index <= parent.children.length) {
    parent.children.splice(index, 0, newNode)
  } else {
    parent.children.push(newNode)
  }
}

/**
 * 从树中删除节点，返回被删除的节点（整棵子树一起带走，供历史/剪贴板）
 */
export function removeNode(root: SchemaNode, id: NodeId): SchemaNode | null {
  const children = root.children ?? []
  // 先看直接子节点
  for (let i = 0; i < children.length; i++) {
    if (children[i].id === id) return children.splice(i, 1)[0]
  }
  // 再递归进子树
  for (const child of children) {
    const removed = removeNode(child, id)
    if (removed) return removed
  }
  return null
}

/**
 * 移动节点：把 fromId 节点移到 toContainerId 容器的 toIndex 位置（原地修改 draft）
 * 防御：自嵌套（fromId === toContainerId）、回环（fromId 是把 id 的后裔）都拒绝。
 *
 * ⚠️ toIndex 语义 = "先摘除、再插入"的最终数组下标（SortableJS 的 newIndex 就是
 * 这个语义，社区标准做法 list.splice(newIndex, 0, list.splice(oldIndex, 1)[0])）。
 * 不需要做"同容器下移补偿"——那会让下移永远偏一位（M4 踩坑后修正）。
 */
export function moveNode(root: SchemaNode, fromId: NodeId, toContainerId: NodeId, toIndex: number): boolean {
  if (fromId === toContainerId) return false
  if (isDescendantOf(root, fromId, toContainerId)) return false
  const from = findById(root, fromId)
  const to = findById(root, toContainerId)
  if (!from || !from.parent || !to) return false
  // 先摘除
  from.parent.children!.splice(from.index, 1)[0]
  to.node.children ??= []
  // 再插入（clamp 防越界；toIndex 是"摘除后"数组的插入点）
  const insertAt = Math.min(Math.max(toIndex, 0), to.node.children.length)
  to.node.children.splice(insertAt, 0, from.node)
  return true
}

/** 设置单个属性（当前值被替换） */
export function setProp(root: SchemaNode, id: NodeId, key: string, value: PropValue): void {
  const found = findById(root, id)
  if (!found) throw new Error(`setProp: 找不到节点 ${id}`)
  found.node.props ??= {}
  found.node.props[key] = value
}

/** 批量更新属性；value 为 undefined 表示删除该属性 */
export function updateProps(root: SchemaNode, id: NodeId, patch: Record<string, PropValue | undefined>): void {
  const found = findById(root, id)
  if (!found) throw new Error(`updateProps: 找不到节点 ${id}`)
  found.node.props ??= {}
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) delete found.node.props[key]
    else found.node.props[key] = value
  }
}

/** 设置/移除锁定 */
export function setLocked(root: SchemaNode, id: NodeId, locked: boolean): void {
  const found = findById(root, id)
  if (!found) throw new Error(`setLocked: 找不到节点 ${id}`)
  if (locked) found.node.lock = true
  else delete found.node.lock
}

/**
 * 深拷贝一棵子树，并给所有节点重新分配 id（粘贴/复制用）
 * 纯函数：不修改原树
 */
export function cloneNodeSubtree(node: SchemaNode): SchemaNode {
  const clone: SchemaNode = {
    ...node,
    id: genId(),
  }
  if (node.children) clone.children = node.children.map(cloneNodeSubtree)
  if (node.props) clone.props = structuredClone(node.props)
  if (node.onEvent) clone.onEvent = structuredClone(node.onEvent)
  return clone
}

/** 统计树中节点总数（调试/大纲树用） */
export function countNodes(root: SchemaNode): number {
  let n = 0
  dfs(root, () => {
    n++
  })
  return n
}

/** 构造一棵默认的空白页面（新建页面 / 清空画布用） */
export function createDefaultSchema(schema?: Partial<Schema>): Schema {
  return {
    version: '1.0.0',
    fileName: schema?.fileName ?? 'demo',
    id: 'page_root',
    componentName: 'Page',
    title: schema?.title ?? '页面1',
    state: schema?.state ?? { count: 0, items: [] },
    dataSource: schema?.dataSource ?? [],
    children: schema?.children ?? [],
  }
}