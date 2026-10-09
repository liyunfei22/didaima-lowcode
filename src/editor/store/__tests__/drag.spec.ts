/**
 * 子系统 ③：编辑器 store 的"拖拽相关动作"单元测试
 * 用 Pinia 的测试模式（setActivePinia + createPinia）在 node 环境跑，
 * 验证「Sortable 事件 → 树操作」的数据层契约：
 *   - addMaterialTo：物料 clone 落到指定容器指定位置
 *   - moveNodeTo：跨容器 / 同容器下标修正
 *   - 一次拖拽的多个 move 被 mergeKey 合并成单个 undo 步骤（关键！）
 *   - moveStep：上移 / 下移
 * （Sortable 本身的 DOM 行为由浏览器人工验证，见 implementation-notes）
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { enablePatches } from 'immer'
import { useEditorStore } from '../editor'
import { materialRegistry } from '@/core/material/registry'
import { materials } from '@/materials'
import { findById } from '@/core/schema/tree'

// store 的 commit 用 produceWithPatches，必须启用 patches 插件（main.ts 同样调了一次）
enablePatches()

beforeEach(() => {
  setActivePinia(createPinia())
  materialRegistry.registerAll(materials)
})

/** 当前 schema 的根 children 顺序（只读快照；启动 schema 保证有 children） */
function rootIds(store: ReturnType<typeof useEditorStore>): string[] {
  return store.schema.children!.map((n) => n.id)
}

describe('addMaterialTo（物料 clone 拖入指定容器）', () => {
  it('把物料加到指定容器指定位置，并自动选中新节点', () => {
    const store = useEditorStore()
    store.addMaterialTo('Divider', 'page_root', 0)
    expect(store.schema.children![0].componentName).toBe('Divider')
    expect(store.selectedId).toBe(store.schema.children![0].id)
  })

  it('支持拖进深层容器（Card 内）', () => {
    const store = useEditorStore()
    const card = findById(store.schema, 'card_form')!.node
    const before = card.children!.length
    store.addMaterialTo('Text', 'card_form', 0)
    const after = findById(store.schema, 'card_form')!.node.children!.length
    expect(after).toBe(before + 1)
  })
})

describe('moveNodeTo（画布内移动/排序）', () => {
  it('同容器排序会修正前面删掉一个元素导致的下标偏差', () => {
    const store = useEditorStore()
    // 初始顺序: [card_form, card_table, card_tabs, divider_1]
    // divider_1(now index 3) → index 1：删除前移一位后插入，无需补偿（toIndex < fromIndex）
    store.moveNodeTo('divider_1', 'page_root', 1)
    expect(rootIds(store)).toEqual(['card_form', 'divider_1', 'card_table', 'card_tabs'])
  })

  it('同容器下移（toIndex > fromIndex）会补偿下标偏移', () => {
    const store = useEditorStore()
    // card_form(now index 0) → index 3：删除后原本的 index 3 前移到 2，目标等价 2
    // 排序语义 = 移动到 [card_table, card_tabs, divider_1] 之后
    store.moveNodeTo('card_form', 'page_root', 3)
    expect(rootIds(store)).toEqual(['card_table', 'card_tabs', 'divider_1', 'card_form'])
  })

  it('跨容器移动（Page → Card）', () => {
    const store = useEditorStore()
    // 先把 divider_1 拖进 card_form
    store.moveNodeTo('divider_1', 'card_form', 0)
    expect(rootIds(store)).not.toContain('divider_1')
    expect(findById(store.schema, 'card_form')!.node.children!.map((n) => n.id)).toContain('divider_1')
  })

  it('自嵌套 / 目标不存在被拒绝（树操作防御，不崩）', () => {
    const store = useEditorStore()
    const order0 = rootIds(store)
    store.moveNodeTo('card_form', 'card_form', 0) // 移进自己 → 拒绝
    expect(rootIds(store)).toEqual(order0)
    store.moveNodeTo('card_form', 'ghost_container', 0) // 目标不存在 → 拒绝且不崩
    expect(rootIds(store)).toEqual(order0)
    // 说明：底层 moveNode 只做树语义防御（回环/自嵌套/id 存在）；
    // "目标必须是非容器"这类业务约束由调用方（canDropInto/画布）负责
  })
})

describe('拖拽合并（mergeKey → 一次拖拽 = 一步 undo）', () => {
  it('拖拽会话内多次 move 撤销一次即整体回退', () => {
    const store = useEditorStore()
    const order0 = rootIds(store)

    // 模拟一次拖拽：开始会话 → 多次变更 → 结束会话
    // 注意序列要选"最终不回原点"的（发生过 3→0→2→3 转回原位的乌龙）
    store.beginDrag()
    store.moveNodeTo('divider_1', 'page_root', 0)
    store.moveNodeTo('divider_1', 'page_root', 1)
    store.endDrag()
    expect(rootIds(store)).not.toEqual(order0)

    // 只撤销一次 → 恢复初始顺序（说明多次 move 被合并成了一步）
    store.undo()
    expect(rootIds(store)).toEqual(order0)
  })

  it('拖拽后普通的非拖拽提交是新的一步（各自可撤销）', () => {
    const store = useEditorStore()
    const order0 = rootIds(store)

    store.beginDrag()
    store.moveNodeTo('divider_1', 'page_root', 0)
    store.endDrag()
    store.addMaterialTo('Divider', 'page_root', 0)
    const mid = rootIds(store)

    store.undo() // 退掉 add（新提交与拖拽会话是不同步）
    expect(rootIds(store)[0]).toBe('divider_1')
    expect(rootIds(store)).toHaveLength(order0.length) // 4 个：没加新节点

    store.undo() // 再退掉拖拽 → 完全恢复初始
    expect(rootIds(store)).toEqual(order0)
    void mid
  })
})

describe('moveStep（上移/下移）', () => {
  it('上移一位', () => {
    const store = useEditorStore()
    const order0 = rootIds(store)
    store.moveStep(order0[3], -1)
    const order1 = rootIds(store)
    expect(order1[2]).toBe(order0[3])
    expect(order1[3]).toBe(order0[2])
  })
  it('已在顶部时上移被忽略', () => {
    const store = useEditorStore()
    const order0 = rootIds(store)
    store.moveStep(order0[0], -1)
    expect(rootIds(store)).toEqual(order0)
  })
})