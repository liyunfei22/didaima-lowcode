/**
 * ============================================================
 * 子系统 ③：编辑器状态（immer + Pinia 桥）
 * ============================================================
 * 本项目最重要的 Vue 特化设计（architecture.md §3）：
 *
 *   immer 只认 plain object，而 Vue 的 reactive 会包一层深代理——
 *   在代理上 produce 会让 immer 拿到代理对象而行为异常。
 *   标准答案：真源用【普通对象】，Vue 只做读取包装。
 *
 *     shallowRef<Schema> inner        —— 唯一真相源（每次 commit 整体替换）
 *     const schema = computed(...)    —— 给视图的只读引用
 *     commit(mutator) = produceWithPatches(inner, mutator)  —— 所有写的唯一入口
 *
 *   Schema 树是不可变数据（替换式），所以：
 *     - 状态就是历史：commit 时顺手把补丁推进 patchStack（undo/redo 白送）
 *     - UI 态（选中/悬停/模式）是易失的 ref，不进历史栈
 *     - 拖拽/批量操作可用 mergeKey 把多个 commit 合并成一个 undo 步骤
 */

import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { applyPatches, produceWithPatches } from 'immer'
import type { NodeId, PropValue, Schema, SchemaNode } from '@/core/schema/types'
import {
  addNode,
  cloneNodeSubtree,
  createDefaultSchema,
  createNode,
  findById,
  moveNode,
  removeNode,
  updateProps,
} from '@/core/schema/tree'
import { validateSchema } from '@/core/schema/validators'
import { materialRegistry } from '@/core/material/registry'
import type { SnippetNode } from '@/core/material/types'
import { createPatchStack } from '@/core/history/patchStack'

/** 新页面启动时的演示起点（打开 /dev 就能看到东西） */
import { m2DemoSchema } from '@/demo/m2DemoSchema'

/**
 * 持久化（M6）：localStorage 自动保存。
 * key 用 v1 后缀，方便将来 schema 协议升级时做迁移或弃用。
 */
const STORAGE_KEY = 'didaima:page:v1'

function loadPersisted(): Schema | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const data: unknown = JSON.parse(raw)
    if (!data || typeof data !== 'object' || !('componentName' in data)) return null
    const result = validateSchema(data as SchemaNode)
    if (!result.ok) {
      console.warn('[persist] localStorage 里的 schema 校验失败，丢弃:', result.errors)
      return null
    }
    return data as Schema
  } catch {
    return null // JSON 损坏 / 隐私模式等一律按无草稿处理
  }
}

/** 把物料 snippet 的 schema 片段物化成带 id 的节点树 */
function materializeNode(snippet: SnippetNode): SchemaNode {
  return createNode({
    componentName: snippet.componentName,
    props: snippet.props,
    children: snippet.children?.map(materializeNode),
  })
}

export const useEditorStore = defineStore('editor', () => {
  /* ================= 唯一真相源 + 提交 ================= */

  // 启动时优先恢复 localStorage 草稿，其次用演示起点
  const inner = shallowRef<Schema>(loadPersisted() ?? structuredClone(m2DemoSchema))
  const schema = computed<Schema>(() => inner.value)

  const history = createPatchStack(100)

  /* ---------- 自动保存（M6，防抖 400ms）：所有"写"之后都会进入这条线 ---------- */
  const dirty = ref(false)
  const savedAt = ref<string | null>(null)
  let saveTimer: ReturnType<typeof setTimeout> | undefined

  function scheduleSave() {
    dirty.value = true
    clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(inner.value))
        dirty.value = false
        const d = new Date()
        savedAt.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
      } catch {
        /* 存储不可用（隐私模式/配额超限）静默 */
      }
    }, 400)
  }

  /**
   * 一次拖拽会话的 mergeKey（M4）：拖拽过程会产生多个 move 补丁，
   * 用一个会话 key 把它们合并成一个 undo 步骤（否则撤销一次只退一步）。
   */
  const dragSessionKey = ref<string | null>(null)
  function beginDrag() {
    dragSessionKey.value = 'drag-' + Date.now()
  }
  function endDrag() {
    dragSessionKey.value = null
  }

  /**
   * 所有写操作唯一入口。
   * @param mutator   对 draft 的变换（core/schema/tree.ts 里的树操作）
   * @param opts.mergeKey 相邻同键提交合并成一步历史（拖拽会话用，session 优先）
   */
  function commit(mutator: (draft: Schema) => void, opts?: { mergeKey?: string }) {
    const [next, patches, inversePatches] = produceWithPatches(inner.value, mutator)
    inner.value = next
    history.push({ patches, inversePatches }, opts?.mergeKey ?? dragSessionKey.value ?? undefined)
    scheduleSave()
  }

  /* ================= undo / redo ================= */

  function undo() {
    const step = history.undo()
    if (step) {
      inner.value = applyPatches(inner.value, step.inversePatches)
      scheduleSave()
    }
  }
  function redo() {
    const step = history.redo()
    if (step) {
      inner.value = applyPatches(inner.value, step.patches)
      scheduleSave()
    }
  }

  /* ================= UI 态（易失，不进历史） ================= */

  const selectedId = ref<NodeId | null>(null)
  const hoverId = ref<NodeId | null>(null)
  const mode = ref<'design' | 'preview'>('design')
  /** 画布右上角提示信息（错误等，M7 起做红点） */
  const toast = ref<string | null>(null)

  function selectNode(id: NodeId | null) {
    selectedId.value = id
  }
  function hoverNode(id: NodeId | null) {
    hoverId.value = id
  }

  /* ================= 读视图 ================= */

  /** 当前选中节点（含父节点定位），用于面板和删除/复制 */
  function getSelected(): { node: SchemaNode; parent: SchemaNode | null; index: number } | null {
    return selectedId.value ? findById(inner.value, selectedId.value) : null
  }

  /** 根作用域：设计态渲染给每组件的 state 视图= schema.state 的默认值 */
  const designScope = computed(() => ({ state: inner.value.state ?? {} }))

  /* ================= 写动作（全走 commit） ================= */

  /**
   * 从物料面板添加一个组件：
   *   - 选中了容器 → 追加进容器；
   *   - 选中了非容器 → 插到它后面（同父容器）；
   *   - 没选中 → 追加到根（Page）。
   * 并自动选中新节点。
   */
  function addMaterial(componentName: string, targetId?: NodeId | null) {
    const meta = materialRegistry.getMeta(componentName)
    const node = materializeNode(meta.snippets?.[0]?.schema ?? { componentName })

    commit((draft) => {
      // 定位"投放锚点"：显式 target > 选中节点
      const anchorId = targetId !== undefined ? targetId : selectedId.value
      const anchor = anchorId ? findById(draft, anchorId) : null

      if (anchor) {
        const containerMeta = materialRegistry.getMeta(anchor.node.componentName)
        if (
          containerMeta.isContainer &&
          materialRegistry.canDropInto(anchor.node.componentName, componentName)
        ) {
          addNode(draft, anchor.node.id, node) // 进容器
          return
        }
        if (anchor.parent) {
          addNode(draft, anchor.parent.id, node, anchor.index + 1) // 插到选中节点之后
          return
        }
      }
      addNode(draft, null, node) // 根
    })

    selectNode(node.id)
  }

  function deleteNode(id: NodeId) {
    commit((draft) => {
      removeNode(draft, id)
    })
    if (selectedId.value === id) selectNode(null)
  }

  /**
   * 投放动作（M4 拖拽用）：
   *  - addMaterialTo：从物料面板 clone 拖入按钮位创建节点（snippet → 带 id 节点树）
   *  - moveNodeTo：画布内跨容器移动 / 同容器排序
   * 这两者都配合 beginDrag/endDrag 的 mergeKey 合并成一个 undo 步骤。
   */
  function addMaterialTo(componentName: string, containerId: NodeId, index: number) {
    const meta = materialRegistry.getMeta(componentName)
    const node = materializeNode(meta.snippets?.[0]?.schema ?? { componentName })
    commit((draft) => {
      addNode(draft, containerId, node, index)
    })
    selectNode(node.id)
  }

  function moveNodeTo(fromId: NodeId, toContainerId: NodeId, toIndex: number) {
    commit((draft) => {
      moveNode(draft, fromId, toContainerId, toIndex)
    })
  }

  /** 大纲/工具栏的上移下移 */
  function moveStep(id: NodeId, dir: -1 | 1) {
    const found = findById(inner.value, id)
    if (!found?.parent) return
    const newIndex = found.index + dir
    const length = found.parent.children?.length ?? 0
    if (newIndex < 0 || newIndex >= length) return
    commit((draft) => {
      moveNode(draft, id, found.parent!.id, newIndex)
    })
  }

  /** 复制节点（克隆子树 + 新 id），插到原节点之后 */
  function duplicateNode(id: NodeId) {
    const found = findById(inner.value, id)
    if (!found) return
    const clone = cloneNodeSubtree(found.node)
    commit((draft) => {
      // 重新定位（inner 变了但 id 不变，克隆带新 id）
      const now = findById(draft, id)!
      if (now.parent) addNode(draft, now.parent.id, clone, now.index + 1)
      else addNode(draft, null, clone)
    })
    selectNode(clone.id)
  }

  /** 修改节点属性（M5 属性面板的 setter 写回入口）。
 *   mergeKey 按"节点+属性"分组：同一字段连续编辑（如打字）合并成一个 undo 步骤 */
  function setNodeProp(id: NodeId, key: string, value: unknown) {
    commit(
      (draft) => {
        updateProps(draft, id, { [key]: value as PropValue })
      },
      { mergeKey: `prop:${id}:${key}` },
    )
  }

  /** 设置节点的事件动作链（M8 EventPanel）。空数组 = 保留空事件（占位），删除用 removeNodeEvent */
  function setNodeOnEvent(id: NodeId, event: string, actions: import('@/core/schema/types').ActionItem[]) {
    commit((draft) => {
      const found = findById(draft, id)
      if (!found) return
      found.node.onEvent ??= {}
      found.node.onEvent[event] = actions ?? []
    })
  }

  /** 删除节点上的某个事件 */
  function removeNodeEvent(id: NodeId, event: string) {
    commit((draft) => {
      const found = findById(draft, id)
      if (!found || !found.node.onEvent) return
      delete found.node.onEvent[event]
    })
  }

  /** 整体替换页面数据域 state（M7 DataPanel） */
  function setPageState(state: Record<string, unknown>) {
    commit((draft) => {
      draft.state = state
    })
  }

  /** 整体替换数据源声明（M7 DataPanel / M9 自动化请求用） */
  function setDataSource(list: NonNullable<Schema['dataSource']>) {
    commit((draft) => {
      draft.dataSource = list
    })
  }

  /** 清空并载入一棵 schema（新建/导入共用） */
  function loadSchema(next: Schema) {
    inner.value = next
    history.clear()
    selectNode(null)
    scheduleSave()
  }

  function newPage() {
    loadSchema(createDefaultSchema())
  }

  /** 导出为 JSON 字符串（下载用） */
  function exportJson(): string {
    return JSON.stringify(inner.value, null, 2)
  }

  /** 导入 JSON：解析 + 校验，失败返回错误列表 */
  function importJson(text: string): { ok: boolean; errors?: string[] } {
    let data: unknown
    try {
      data = JSON.parse(text)
    } catch (err) {
      return { ok: false, errors: [`JSON 解析失败: ${String(err)}`] }
    }
    if (!data || typeof data !== 'object' || !('componentName' in data)) {
      return { ok: false, errors: ['不是合法的 schema（缺少 componentName）'] }
    }
    const result = validateSchema(data as SchemaNode)
    if (!result.ok) return { ok: false, errors: result.errors }
    loadSchema(data as Schema)
    return { ok: true }
  }

  return {
    // 数据 + 历史
    inner,
    schema,
    history,
    commit,
    undo,
    redo,
    // 持久化状态
    dirty,
    savedAt,
    // UI 态
    selectedId,
    hoverId,
    mode,
    toast,
    selectNode,
    hoverNode,
    // 拖拽会话
    dragSessionKey,
    beginDrag,
    endDrag,
    // 读
    getSelected,
    designScope,
    // 写
    addMaterial,
    addMaterialTo,
    moveNodeTo,
    moveStep,
    deleteNode,
    duplicateNode,
    setNodeProp,
    setNodeOnEvent,
    removeNodeEvent,
    setPageState,
    setDataSource,
    loadSchema,
    newPage,
    exportJson,
    importJson,
  }
})