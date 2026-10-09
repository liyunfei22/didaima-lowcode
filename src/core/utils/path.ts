/**
 * ============================================================
 * 路径工具：在对象树里按 "a.b.c" 路径读写
 * ============================================================
 * 用途：
 *   - v-model 回写：modelValue 绑定 "state.form.name" → 这里把新值写进 state
 *   - M8 updateState 动作：args 的每项按路径写入
 *   - 绑定路径解析：把 binding 表达式翻译成可写地址
 * 教学点：表达式是"读"的地址语法，路径是"写"的地址语法——两者一一对应，
 * 所以绑定表达式既能读（求值器）也能写（这里）。
 */

/**
 * 解析 "state.form.name" → ['form','name']；不是 state.x.y 形态返回 null。
 * 支持简单成员链（不含下标/引号——教学版够用，M7 求值器升级后可扩展。）
 */
export function parseBindingPath(expr: string): string[] | null {
  const m = /^state\.([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)$/.exec(expr.trim())
  return m ? m[1].split('.') : null
}

/** 按路径读取（用于求值场景下的"取指定字段"） */
export function getByPath(obj: Record<string, unknown>, path: string[]): unknown {
  let cur: unknown = obj
  for (const key of path) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[key]
  }
  return cur
}

/** 按路径写入（沿途自动创建缺失的中间对象） */
export function setByPath(obj: Record<string, unknown>, path: string[], value: unknown): void {
  let cur = obj
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    if (cur[key] == null || typeof cur[key] !== 'object') cur[key] = {}
    cur = cur[key] as Record<string, unknown>
  }
  cur[path[path.length - 1]] = value
}

/** 按路径删除 */
export function deleteByPath(obj: Record<string, unknown>, path: string[]): void {
  if (path.length === 0) return
  let cur = obj
  for (let i = 0; i < path.length - 1; i++) {
    if (cur == null || typeof cur !== 'object') return
    cur = cur[path[i]] as Record<string, unknown>
  }
  delete cur[path[path.length - 1]]
}