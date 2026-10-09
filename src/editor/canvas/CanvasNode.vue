<script setup lang="ts">
/**
 * ============================================================
 * 子系统 ③：画布编辑态节点（CanvasNode）—— M4 拖拽版
 * ============================================================
 * M3 版本基础上加入拖拽：
 *   - 容器节点（Card/Form/Page/FormItem…）的 children 槽包一层可拖拽 slot
 *     （Sortable 要求被排元素是列表的直接子元素）
 *   - Table / Tabs / TableColumn 例外：它们的 children 必须直接挂在组件
 *     插槽下（el-table 认 el-table-column 的直接 vnode、el-tabs 认 el-tab-pane），
 *     包 div 会弄丢列/页签 —— 这类高阶容器在画布不提供拖拽，列排序走大纲按钮。
 *
 * ⚠️ 容器节点（isContainer）通过 data-nodrag 排除在画布拖拽之外：
 *   SortableJS 在处理"容器套容器"的嵌套列表拖拽时存在已知死锁（拖容器 A
 *   经过容器 B 的内部槽 → 嵌套递归卡死页面）。M4 先做平铺安全区：
 *   - 物料拖入画布任意容器槽（clone）✓
 *   - 非容器节点画布内排序 / 跨容器移动 ✓
 *   - 容器节点排序 → 大纲/工具按钮（上移下移）✓
 *   嵌套容器画布级拖拽记为进阶改进（见 implementation-notes M4 → M5）。
 *
 * 事件 → 树操作的映射（craft.js 思想的落地）：
 *   onStart → beginDrag()（开启 mergeKey，一次拖拽 = 一个 undo 步骤）
 *   onUpdate（同容器排序）→ moveNodeTo(nodeId, 同容器, newIndex)
 *   onAdd（clone 拖入 / 跨容器移动）→ addMaterialTo() 或 moveNodeTo()
 *   onEnd → endDrag()
 */

import { computed } from 'vue'
import { useEditorStore } from '../store/editor'
import { vDraggable, type DragEvents } from '../directives/draggable'
import { childScope, resolveCondition, resolveRender, type RuntimeHandlers } from '@/renderer/renderer'
import type { SchemaNode } from '@/core/schema/types'
import type { Scope } from '@/core/expression/evaluator'
import { materialRegistry } from '@/core/material/registry'

const props = defineProps<{ node: SchemaNode; scope: Scope }>()
const store = useEditorStore()

const isSelected = computed(() => store.selectedId === props.node.id)
const isHovered = computed(() => store.hoverId === props.node.id)
/** condition 求值结果 —— 为假时半透明（不隐藏，编辑器可读性优先） */
const renderable = computed(() => resolveCondition(props.node, props.scope))

const materialMeta = computed(() => materialRegistry.getMeta(props.node.componentName))

/** 本节点是否提供可拖拽 children 槽（容器 && 结构允许包一层 div 的） */
const isDroppable = computed(() => {
  if (!materialMeta.value.isContainer) return false
  // 这些组件的 children 语义依赖"直接 vnode 子元素"，包 div 会破坏结构
  return !['Table', 'Tabs', 'TableColumn'].includes(props.node.componentName)
})

const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)

// 设计态处理器：事件/双向绑定均 no-op
const designHandlers: RuntimeHandlers = {
  onModelUpdate: () => {
    /* 设计态不写回 state */
  },
}

const resolved = computed(() => resolveRender(props.node, props.scope, designHandlers))

/**
 * 拖拽事件 → 树操作（对外部 Sortable 库的零感知，全在这里翻译）。
 *
 * ⚠️ 关键细节（本项目 M4 踩的大坑）：
 * Sortable 的 onAdd/onUpdate 在 mouseup 收尾流程**中途**同步触发。若在这里
 * 同步 commit → Vue 立即重渲染 → 拖拽元素被 Vue 移走 → Sortable 发现自己
 * "拖的东西不见了"就会无限重试，浏览器直接卡死。
 * 解法：把树操作推迟到下一个宏任务（setTimeout 0），让 Sortable 先完成
 * 整个拖拽周期，再由 Vue 按新 schema 重排 DOM（顺序一致，无冲突）。
 */
let pendingApply = false
function deferApply(fn: () => void) {
  if (pendingApply) return // 同一瞬间的重复事件（如嵌套列表双触发）只应用一次
  pendingApply = true
  setTimeout(() => {
    pendingApply = false
    fn()
  }, 0)
}

const dragEvents: DragEvents = {
  onStart() {
    store.beginDrag()
  },
  onEnd() {
    store.endDrag()
  },
  /** 同列表内排序：读 item 的 node-id 直接 moveNodeTo */
  onUpdate(evt) {
    const nodeId = (evt.item as HTMLElement).dataset.nodeId
    const containerId = (evt.to as HTMLElement).dataset.nodeId
    const newIndex = evt.newIndex
    if (nodeId && containerId && newIndex !== undefined) {
      deferApply(() => store.moveNodeTo(nodeId, containerId, newIndex))
    }
  },
  /** 有元素进入本列表：查 item 身上的标记区分 "物料 clone" 还是 "画布节点移动" */
  onAdd(evt) {
    const materialId = (evt.item as HTMLElement).dataset.materialId
    const nodeId = (evt.item as HTMLElement).dataset.nodeId
    const containerId = (evt.to as HTMLElement).dataset.nodeId
    const newIndex = evt.newIndex
    if (!containerId || newIndex === undefined) return
    if (materialId) {
      deferApply(() => store.addMaterialTo(materialId, containerId, newIndex))
    } else if (nodeId) {
      deferApply(() => store.moveNodeTo(nodeId, containerId, newIndex))
    }
  },
}

function onSelfClick() {
  store.selectNode(props.node.id)
}
</script>

<template>
  <div
    class="canvas-node"
    :class="{ 'can-selected': isSelected, 'can-hovered': isHovered }"
    :data-node-id="node.id"
    :data-nodrag="materialMeta.isContainer ? '1' : undefined"
    @click.stop="onSelfClick"
    @mouseenter="store.hoverNode(node.id)"
    @mouseleave="store.hoverNode(null)"
  >
    <!-- 遮罩：拦截组件原生交互 -->
    <div class="canvas-mask" />

    <!-- 选中/悬停框 -->
    <div v-if="isSelected || isHovered" class="canvas-outline" :class="{ 'can-solid': isSelected }" />

    <!-- 选中工具栏 -->
    <div v-if="isSelected" class="canvas-tools" @click.stop>
      <button class="canvas-tool-btn" title="复制" @click="store.duplicateNode(node.id)">⧉</button>
      <button class="canvas-tool-btn" title="上移" @click="store.moveStep(node.id, -1)">↑</button>
      <button class="canvas-tool-btn" title="下移" @click="store.moveStep(node.id, 1)">↓</button>
      <button class="canvas-tool-btn can-danger" title="删除" @click="store.deleteNode(node.id)">✕</button>
    </div>

    <!-- 循环 / 条件徽标 -->
    <div v-if="node.loop" class="canvas-badge">循环</div>
    <div v-if="node.condition" class="canvas-badge can-cond">条件</div>

    <!-- 组件本体 -->
    <component
      :is="resolved.comp"
      v-bind="resolved.attrs"
      v-on="resolved.listeners"
      :class="{ 'canvas-dim': !renderable }"
    >
      <!--
        children 插槽：容器可拖拽用 div 包一层（v-draggable:canvas），
        结构敏感的组件走直接插槽（保持 el-table/el-tabs 的直接 vnode 子树）。
      -->
      <template v-if="hasChildren || isDroppable" #default="slotProps">
        <div
          v-if="isDroppable"
          v-draggable:canvas="dragEvents"
          class="canvas-children"
          :data-node-id="node.id"
        >
          <CanvasNode
            v-for="child in node.children"
            :key="child.id"
            :node="child"
            :scope="childScope(scope, slotProps)"
          />
          <!-- 空容器提示（可投放区域） -->
          <div v-if="!hasChildren" class="canvas-children-empty">拖入组件</div>
        </div>
        <template v-else>
          <CanvasNode
            v-for="child in node.children"
            :key="child.id"
            :node="child"
            :scope="childScope(scope, slotProps)"
          />
        </template>
      </template>
    </component>
  </div>
</template>

<style scoped>
.canvas-node {
  position: relative;
}

/* 遮罩 */
.canvas-mask {
  position: absolute;
  inset: 0;
  z-index: 2;
}

/* 悬停/选中框 */
.canvas-outline {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  border: 1px dashed rgba(64, 158, 255, 0.5);
}
.canvas-outline.can-solid {
  border: 1.5px solid var(--lc-accent, #409eff);
  box-shadow: 0 0 0 1px rgba(64, 158, 255, 0.2);
}

/* 选中工具栏 */
.canvas-tools {
  position: absolute;
  top: -10px;
  right: 4px;
  z-index: 3;
  display: flex;
  gap: 2px;
  background: var(--lc-accent, #409eff);
  border-radius: 4px;
  padding: 1px;
}
.canvas-tool-btn {
  border: none;
  background: transparent;
  color: #fff;
  font-size: 12px;
  line-height: 1;
  padding: 4px 6px;
  cursor: pointer;
  border-radius: 3px;
}
.canvas-tool-btn:hover {
  background: rgba(255, 255, 255, 0.25);
}
.canvas-tool-btn.can-danger:hover {
  background: #f56c6c;
}

/* 循环 / 条件徽标 */
.canvas-badge {
  position: absolute;
  top: -8px;
  left: 4px;
  z-index: 3;
  background: #f0a020;
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 3px;
  line-height: 1.4;
}
.canvas-badge.can-cond {
  background: #909399;
}

/* condition 为假：半透明 */
.canvas-dim {
  opacity: 0.35;
}

/* 可拖拽 children 槽：最小高度保证空容器也能接住拖拽 */
.canvas-children {
  min-height: 18px;
}
.canvas-children-empty {
  color: #c0c4cc;
  font-size: 12px;
  border: 1px dashed #e4e7ed;
  border-radius: 4px;
  padding: 6px 10px;
  text-align: center;
  user-select: none;
}
</style>