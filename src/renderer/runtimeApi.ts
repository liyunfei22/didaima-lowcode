/**
 * ============================================================
 * 子系统 ⑥：RuntimeApi 工厂（设计态 no-op / 预览态真实）
 * ============================================================
 * 动作与"宿主能力"解耦：动作只调 RuntimeApi 接口，
 * 设计态注入 no-op 实现（点按钮不弹窗、不发请求），
 * 预览态注入 Element Plus + fetch 的真实实现。
 * 这就是"编辑器里预览感"与"运行时不串台"的边界（amils 同款思路）。
 */

import { ElMessage, ElMessageBox } from 'element-plus'
import type { RuntimeApi } from '@/core/events/registry'

/** 设计态：一切动作都不真的执行（画布上点按钮只选中，不弹窗不发请求） */
export function createDesignRuntime(): RuntimeApi {
  return {
    toast: (message, type) => {
      console.info(`[design] 动作 toast（设计态忽略）[${type ?? 'info'}]`, message)
    },
    confirm: () => Promise.resolve(false),
    openUrl: () => {
      /* 设计态不跳转 */
    },
    fetchJson: async (uri) => {
      console.info('[design] 动作 fetch（设计态忽略）:', uri)
      return undefined
    },
  }
}

/** 预览态：真实的宿主能力 */
export function createPreviewRuntime(): RuntimeApi {
  return {
    toast: (message, type = 'info') => {
      ElMessage({ message, type })
    },
    confirm: async (message, title) => {
      try {
        await ElMessageBox.confirm(message, title ?? '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        })
        return true
      } catch {
        return false // 用户取消
      }
    },
    openUrl: (url, target = '_self') => {
      window.open(url, target, 'noopener')
    },
    fetchJson: async (uri) => {
      const res = await fetch(uri)
      if (!res.ok) throw new Error(`请求失败: ${res.status} ${res.statusText}`)
      return res.json()
    },
  }
}