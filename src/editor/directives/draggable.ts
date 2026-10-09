/**
 * ============================================================
 * 子系统 ③：SortableJS 薄封装指令（v-draggable）
 * ============================================================
 * 为什么自研薄封装而不是用 vuedraggable / vue-draggable-plus：
 *   那两个库的核心卖点是 <Draggable v-model="array"> 自动同步数组——但我们的
 *   数据流必须是「Sortable 事件 → 算插槽位置 → commit(treeOps) 写 schema 树」，
 *   schema 是树不是平面数组，v-model 模型接管会绕死嵌套语义（architecture.md §8）。
 *
 * 本指令只做生命周期与事件透传（onMounted 创建 / onUnmounted 销毁，
 * 框架无关 DOM 库如何安家 Vue 的标准示范），不含任何数据绑定逻辑。
 *
 * 组（group）设计：
 *   - 物料面板：pull: 'clone'（拖走的是副本，原物料不动）put: false
 *   - 画布容器：pull: true, put: true（允许互相移动，同组通过 group name 互通）
 * 三者共用 group.name: 'lowcode' —— SortableJS 同组拖拽开箱即用。
 */

import type { Directive } from 'vue'
import Sortable from 'sortablejs'

export interface DragEvents {
  onStart?(evt: Sortable.SortableEvent): void
  onEnd?(evt: Sortable.SortableEvent): void
  onAdd?(evt: Sortable.SortableEvent): void // 有元素被放入这个列表（clone 或跨列表移动）
  onUpdate?(evt: Sortable.SortableEvent): void // 同列表内排序
  onRemove?(evt: Sortable.SortableEvent): void
}

type SortableScope = HTMLElement & { __sortable?: Sortable }

/**
 * v-draggable:canvas="handlers"   画布容器 slot
 * v-draggable:material="handlers" 物料面板
 */
export const vDraggable: Directive<SortableScope, DragEvents> = {
  mounted(el, binding) {
    const arg = binding.arg ?? 'canvas'
    const handlers = binding.value ?? {}
    const isMaterialList = arg === 'material'

    el.__sortable = Sortable.create(el, {
      group: isMaterialList
        ? { name: 'lowcode', pull: 'clone', put: false } // 物料面板只能被"复制"走
        : { name: 'lowcode', pull: true, put: true }, // 画布容器之间可互相移动
      draggable: isMaterialList
        ? '.mat-item'
        : '.canvas-node:not([data-nodrag])', // 容器节点不参与画布拖拽（见 CanvasNode 注释）
      // 物料面板内不排序（它是"仓库"不是列表）
      sort: !isMaterialList,
      animation: 150,
      ghostClass: 'lc-ghost',
      fallbackOnBody: true,
      onStart: (evt) => handlers.onStart?.(evt),
      onEnd: (evt) => handlers.onEnd?.(evt),
      onAdd: (evt) => handlers.onAdd?.(evt),
      onUpdate: (evt) => handlers.onUpdate?.(evt),
      onRemove: (evt) => handlers.onRemove?.(evt),
    })
  },
  unmounted(el) {
    el.__sortable?.destroy()
    delete el.__sortable
  },
}