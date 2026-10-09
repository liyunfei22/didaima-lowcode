/**
 * ============================================================
 * 横切主题：undo/redo 补丁历史栈（patchStack）
 * ============================================================
 * 在 immer 的 produceWithPatches 之上实现：
 *   commit 时拿到 [next, forwardPatches, inversePatches]，
 *   正补丁 push 进 past；undo 回放逆补丁、redo 回放正补丁。
 * 教学点：
 *   - 补丁 = 最小 diff（对比"全量快照栈"的内存优势）
 *   - 补丁协议与 Yjs / OT 协作协议同族（同一份补丁可以广播给协作方）
 *   - mergeKey：一次拖拽会产生大量 move 补丁，用 mergeKey 合并成"一个操作"，
 *     否则 undo 一次只退一步（体验灾难）。合并规则：正补丁拼接、逆补丁反插。
 */

import type { Patch } from 'immer'

export interface HistoryStep {
  /** 步骤序号（调试用） */
  id: number
  /** 正补丁：redo 时回放（从旧态 → 新态） */
  patches: Patch[]
  /** 逆补丁：undo 时回放（从新态 → 旧态） */
  inversePatches: Patch[]
  /** 合并键：相邻的同键步骤合并成一步（拖拽操作） */
  mergeKey?: string
}

export interface PatchStack {
  push(step: { patches: Patch[]; inversePatches: Patch[] }, mergeKey?: string): void
  /** 出栈一步（含正逆补丁） */
  undo(): HistoryStep | null
  redo(): HistoryStep | null
  canUndo(): boolean
  canRedo(): boolean
  clear(): void
  get size(): number
}

export function createPatchStack(limit = 100): PatchStack {
  let stack: HistoryStep[] = []
  let future: HistoryStep[] = []
  let seq = 0

  return {
    push(step, mergeKey) {
      const last = stack[stack.length - 1]
      if (mergeKey && last?.mergeKey === mergeKey) {
        // 合并：把新步骤并入最后一步
        last.patches = [...last.patches, ...step.patches]
        last.inversePatches = [...step.inversePatches, ...last.inversePatches]
      } else {
        stack.push({ id: ++seq, ...step, mergeKey })
        if (stack.length > limit) stack.shift()
      }
      // 任何新操作都会清空 redo 栈
      future = []
    },

    undo() {
      const step = stack.pop()
      if (!step) return null
      future.push(step)
      return step
    },

    redo() {
      const step = future.pop()
      if (!step) return null
      stack.push(step)
      return step
    },

    canUndo() {
      return stack.length > 0
    },

    canRedo() {
      return future.length > 0
    },

    clear() {
      stack = []
      future = []
    },

    get size() {
      return stack.length
    },
  }
}