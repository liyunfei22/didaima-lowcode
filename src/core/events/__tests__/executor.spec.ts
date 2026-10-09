/**
 * 子系统 ⑥：动作执行器（executor）单元测试
 * 验证 amis 动作链语义：
 *   - 顺序执行 + condition 条件放行
 *   - outputVar 写共享内存，下游动作可读
 *   - updateState 的表达式参数语义（state.count + 1）
 *   - fetch 写回 state[dataField]
 *   - ignoreError 容错
 */

import { describe, expect, it } from 'vitest'
import { registerBuiltinActions } from '../actions'
import { executeChain, type ActionContext } from '../registry'
import type { RuntimeApi } from '../registry'

registerBuiltinActions()

/** 造一个带内存实现的测试 RuntimeApi */
function makeRuntime(overrides: Partial<RuntimeApi> = {}): RuntimeApi {
  return {
    toast: () => {},
    confirm: () => Promise.resolve(true),
    openUrl: () => {},
    fetchJson: async () => ({ hello: 'world' }),
    ...overrides,
  }
}

function makeCtx(state: Record<string, unknown>, runtime: RuntimeApi = makeRuntime()): ActionContext {
  return {
    nodeId: 'n1',
    scope: { state },
    runtime,
    event: { data: {} },
  }
}

describe('executeChain 顺序与条件', () => {
  it('按序执行所有动作', async () => {
    const order: string[] = []
    const ctx = makeCtx({})
    ctx.runtime.toast = (msg) => order.push(`toast:${msg}`)
    await executeChain(
      [
        { actionType: 'toast', args: { message: '1' } },
        { actionType: 'toast', args: { message: '2' } },
      ],
      ctx,
    )
    expect(order).toEqual(['toast:1', 'toast:2'])
  })

  it('condition 为假跳过，为真执行', async () => {
    const order: string[] = []
    const ctx = makeCtx({ hide: true, count: 1 })
    ctx.runtime.toast = (msg) => order.push(msg)
    await executeChain(
      [
        { actionType: 'toast', args: { message: 'A' }, condition: 'state.hide === false' },
        { actionType: 'toast', args: { message: 'B' }, condition: 'state.count > 0' },
      ],
      ctx,
    )
    expect(order).toEqual(['B'])
  })

  it('未注册动作类型告警跳过，不中断链条', async () => {
    const order: string[] = []
    const ctx = makeCtx({})
    ctx.runtime.toast = (msg) => order.push(msg)
    await executeChain([{ actionType: 'ghostAction' }, { actionType: 'toast', args: { message: 'ok' } }], ctx)
    expect(order).toEqual(['ok'])
  })
})

describe('updateState（改 state，表达式参数）', () => {
  it('state.count + 1 自增；纯文本原样写入（Appsmith 语义）', async () => {
    const state = { count: 0, greeting: 'hi' }
    await executeChain(
      [{ actionType: 'updateState', args: { count: 'state.count + 1', greeting: '早上好' } }],
      makeCtx(state),
    )
    expect(state.count).toBe(1)
    expect(state.greeting).toBe('早上好')
  })

  it('点路径写入嵌套字段 user.name', async () => {
    const state = { user: {} }
    await executeChain([{ actionType: 'updateState', args: { 'user.name': '李雷' } }], makeCtx(state))
    expect((state.user as Record<string, unknown>).name).toBe('李雷')
  })
})

describe('outputVar（动作链共享内存）', () => {
  it('confirm 结果写入 event.data，下游 toast 引用', async () => {
    const event: { data: Record<string, unknown> } = { data: {} }
    const ctx = makeCtx({}, makeRuntime({ confirm: () => Promise.resolve(true) }))
    ctx.event = event
    await executeChain([{ actionType: 'confirm', args: { message: '确定？' }, outputVar: 'ok' }], ctx)
    expect(event.data.ok).toBe(true)
  })
})

describe('fetch 写回 state', () => {
  it('拉取数据写入指定字段', async () => {
    const state = { list: [] }
    const ctx = makeCtx(state, makeRuntime({ fetchJson: async () => [1, 2, 3] }))
    await executeChain([{ actionType: 'fetch', args: { uri: '/mock/x.json', dataField: 'list' } }], ctx)
    expect(state.list).toEqual([1, 2, 3])
  })

  it('fetch 失败时 ignoreError 吞错', async () => {
    const state = {}
    const ctx = makeCtx(state, makeRuntime({ fetchJson: async () => Promise.reject(new Error('500')) }))
    await expect(
      executeChain([{ actionType: 'fetch', args: { uri: '/mock/bad.json' }, ignoreError: true }], ctx),
    ).resolves.toBeUndefined()
  })
})