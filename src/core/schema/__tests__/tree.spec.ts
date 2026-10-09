/**
 * core/schema/tree.ts 单元测试
 * 用 immer 包一层 commit 来测（与编辑器 store 同一用法），验证"对 draft 的变换"语义。
 */

import { describe, expect, it } from 'vitest'
import { produce } from 'immer'
import { createDefaultSchema, createNode, findById, moveNode, removeNode, addNode, cloneNodeSubtree } from '../tree'
import type { Schema, SchemaNode } from '../types'

/** 造一棵小树：Page > [Button(a), Card > [Text(b)]] */
type Fixture = Schema & { children: SchemaNode[] }
function buildFixture(): Fixture {
  const schema = createDefaultSchema({ fileName: 'fixture', id: 'page_root', state: {} }) as Fixture
  schema.children = [
    { id: 'btn_a', componentName: 'Button', props: { text: 'A' }, children: [] },
    {
      id: 'card_b',
      componentName: 'Card',
      children: [{ id: 'text_c', componentName: 'Text', props: { text: 'C' }, children: [] }],
    },
  ]
  return schema
}

describe('findById', () => {
  it('能找到根节点（parent 为 null）', () => {
    const r = findById(buildFixture(), 'page_root')
    expect(r?.node.componentName).toBe('Page')
    expect(r?.parent).toBeNull()
  })
  it('能找到深层节点并返回祖先链', () => {
    const r = findById(buildFixture(), 'text_c')
    expect(r?.node.id).toBe('text_c')
    expect(r?.parent?.id).toBe('card_b')
    expect(r?.index).toBe(0)
  })
  it('找不到返回 null', () => {
    expect(findById(buildFixture(), 'nope')).toBeNull()
  })
})

describe('addNode / removeNode', () => {
  it('addNode 追加到容器末尾', () => {
    const schema = produce(buildFixture(), (draft) => {
      addNode(draft, 'card_b', createNode({ componentName: 'Button', props: { text: 'X' } }))
    })
    expect(schema.children[1].children!.map((n) => n.id)).toEqual(['text_c', expect.stringMatching(/^node_/)])
  })
  it('addNode 支持指定插入下标', () => {
    const schema = produce(buildFixture(), (draft) => {
      addNode(draft, 'card_b', createNode({ componentName: 'Button' }), 0)
    })
    expect(schema.children[1].children![0].componentName).toBe('Button')
  })
  it('addNode(null, …) 直接加到 root', () => {
    const schema = produce(buildFixture(), (draft) => {
      addNode(draft, null, createNode({ componentName: 'Text' }))
    })
    expect(schema.children).toHaveLength(3)
  })
  it('removeNode 删整棵子树并返回被删节点', () => {
    const schema = produce(buildFixture(), (draft) => {
      const removed = removeNode(draft, 'card_b')
      expect(removed?.id).toBe('card_b')
    })
    expect(schema.children.map((n) => n.id)).toEqual(['btn_a'])
  })
})

describe('moveNode', () => {
  it('跨容器移动到位', () => {
    const schema = produce(buildFixture(), (draft) => {
      const ok = moveNode(draft, 'btn_a', 'card_b', 0)
      expect(ok).toBe(true)
    })
    expect(schema.children.map((n) => n.id)).toEqual(['card_b'])
    expect(schema.children[0].children!.map((n) => n.id)).toEqual(['btn_a', 'text_c'])
  })
  it('同一容器内下移时修正下标', () => {
    const schema = produce(buildFixture(), (draft) => {
      draft.children.push({ id: 'btn_d', componentName: 'Button', children: [] })
      moveNode(draft, 'btn_a', 'page_root', 3)
    })
    expect(schema.children.map((n) => n.id)).toEqual(['card_b', 'btn_d', 'btn_a'])
  })
  it('自嵌套被拒绝', () => {
    let ok = true
    const schema = produce(buildFixture(), (draft) => {
      ok = moveNode(draft, 'card_b', 'card_b', 0)
    })
    expect(ok).toBe(false)
    expect(schema.children[1].id).toBe('card_b')
  })
  it('回环（移入自己后裔）被拒绝', () => {
    let ok = true
    produce(buildFixture(), (draft) => {
      ok = moveNode(draft, 'card_b', 'text_c', 0)
    })
    expect(ok).toBe(false)
  })
  it('不存在的节点返回 false', () => {
    const schema = produce(buildFixture(), (draft) => {
      expect(moveNode(draft, 'nope', 'card_b', 0)).toBe(false)
    })
    expect(schema.children).toHaveLength(2)
  })
})

describe('cloneNodeSubtree', () => {
  it('深拷贝且全部节点换成新 id', () => {
    const src = buildFixture()
    const clone = cloneNodeSubtree(src)
    expect(clone.id).not.toBe(src.id)
    expect(clone.children![0].id).not.toBe(src.children[0].id)
    expect(clone.children![1].children![0].id).not.toBe('text_c')
    // 属性内容保持一致
    expect(clone.children![0].props?.text).toBe('A')
    // 原树不受影响
    expect(src.children[1].children![0].id).toBe('text_c')
  })
})