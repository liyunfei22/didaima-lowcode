/**
 * ============================================================
 * 子系统 ⑦：出码（schema → Vue SFC 源码字符串）
 * ============================================================
 * 核心洞察（研究文档 02 §7）：出码 = 复用渲染引擎的树遍历，换 emit 产物。
 *   渲染引擎遍历 schema 求值成 UI；这里遍历同一棵树拼成源码字符串。
 *
 * 教学点：
 *   - 属性双态还原：字面量 → :attr="'字面量'"；binding → :attr="{expr}"
 *   - v-model 在 Vue 可以逐字还原成左值（v-model="state.form.name"）——比 React 简单
 *   - v-if / v-for 包裹次序 = 渲染引擎求值顺序的镜像
 *   - 动作链从声明式 JSON 还原成真实 JS 函数（事件处理器统一收进 script setup）
 *   - import 按用到的组件聚合（扫一遍树收集）
 */

import type { Schema, SchemaNode, PropValue, ActionItem } from '@/core/schema/types'
import { isBinding } from '@/core/schema/types'

/* ================= 组件映射（一颗写死的翻译表；也可改用物料 meta.codegen） ================= */

interface CompSpec {
  /** import 标识符（缺省 = 原生标签，不必 import） */
  importName?: string
  /** 从哪个包 import */
  importFrom?: string
  /** 生成的标签名 */
  tag: string
  /** 该 prop 作为文本内容渲染（而非属性） */
  textProp?: string
  /** 子节点要包一层 scoped 默认插槽（TableColumn 的 { row }） */
  scopedChildren?: boolean
  /** props 的特殊处理：propName → 'v-model' 等 */
  specialProps?: Record<string, 'v-model'>
}

const COMP_MAP: Record<string, CompSpec> = {
  Page: { tag: 'div', textProp: undefined, specialProps: undefined },
  Card: { importName: 'ElCard', importFrom: 'element-plus', tag: 'el-card' },
  Tabs: { importName: 'ElTabs', importFrom: 'element-plus', tag: 'el-tabs' },
  TabPane: { importName: 'ElTabPane', importFrom: 'element-plus', tag: 'el-tab-pane' },
  Text: { tag: 'span', textProp: 'text' },
  Divider: { importName: 'ElDivider', importFrom: 'element-plus', tag: 'el-divider' },
  Button: { importName: 'ElButton', importFrom: 'element-plus', tag: 'el-button', textProp: 'text' },
  Input: { importName: 'ElInput', importFrom: 'element-plus', tag: 'el-input', specialProps: { modelValue: 'v-model' } },
  NumberInput: { importName: 'ElInputNumber', importFrom: 'element-plus', tag: 'el-input-number', specialProps: { modelValue: 'v-model' } },
  Select: { importName: 'ElSelect', importFrom: 'element-plus', tag: 'el-select', specialProps: { modelValue: 'v-model' } },
  Radio: { importName: 'ElRadioGroup', importFrom: 'element-plus', tag: 'el-radio-group', specialProps: { modelValue: 'v-model' } },
  Checkbox: { importName: 'ElCheckbox', importFrom: 'element-plus', tag: 'el-checkbox', specialProps: { modelValue: 'v-model' } },
  Switch: { importName: 'ElSwitch', importFrom: 'element-plus', tag: 'el-switch', specialProps: { modelValue: 'v-model' } },
  DatePicker: { importName: 'ElDatePicker', importFrom: 'element-plus', tag: 'el-date-picker', specialProps: { modelValue: 'v-model' } },
  Form: { importName: 'ElForm', importFrom: 'element-plus', tag: 'el-form' },
  FormItem: { importName: 'ElFormItem', importFrom: 'element-plus', tag: 'el-form-item' },
  Table: { importName: 'ElTable', importFrom: 'element-plus', tag: 'el-table' },
  TableColumn: { importName: 'ElTableColumn', importFrom: 'element-plus', tag: 'el-table-column', scopedChildren: true },
}

/** 把字面量/绑定还原成 JS 表达式文本；undefined 兜底为空串 */
function exprText(pv: PropValue | undefined): string {
  if (pv === undefined) return "''"
  if (isBinding(pv)) return pv.value.trim()
  if (typeof pv === 'string') {
    // 含 {{ }} 的模板字符串 → JS 模板串（反引号内联表达式）
    if (pv.includes('{{')) {
      const parts = pv.split(/\{\{(.+?)\}\}/g)
      let out = '`'
      for (let i = 0; i < parts.length; i += 2) {
        out += parts[i]
        if (i + 1 < parts.length) out += '${' + parts[i + 1].trim() + '}'
      }
      return out + '`'
    }
    return `'${pv.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`
  }
  if (pv === null) return 'null'
  if (typeof pv === 'boolean' || typeof pv === 'number') return String(pv)
  return JSON.stringify(pv) // 数组/对象字面量
}

/** indent 工具 */
const ind = (depth: number) => '  '.repeat(depth)

/** 出码上下文：收集 import + 事件处理函数 */
interface GenCtx {
  imports: Set<string>
  handlers: string[]
}

/** 节点组件 HTML 片段（tag + 属性 + 文本 + children） */
function genNode(node: SchemaNode, depth: number, ctx: GenCtx): string {
  const spec = COMP_MAP[node.componentName] ?? { tag: 'div' }
  if (spec.importName && spec.importFrom) ctx.imports.add(`${spec.importName}: ${spec.importFrom}`)

  // 包围：condition → template v-if；loop → template v-for
  let wrapperOpen = ''
  let wrapperClose = ''
  let extraDepth = 0
  if (node.condition) {
    wrapperOpen += `${ind(depth)}<template v-if="${node.condition.trim()}">\n`
    wrapperClose = `${ind(depth)}</template>\n${wrapperClose}`
    extraDepth++
  }
  if (node.loop) {
    wrapperOpen += `${ind(depth + extraDepth)}<template v-for="(item, index) in ${node.loop.trim()}" :key="index">\n`
    wrapperClose = `${ind(depth + extraDepth)}</template>\n${wrapperClose}`
    extraDepth++
  }

  // 属性还原（跳过 textProp）
  const attrs: string[] = []
  let textContent = ''
  const vModelProp = Object.entries(spec.specialProps ?? {}).find(([, v]) => v === 'v-model')?.[0]

  for (const [key, value] of Object.entries(node.props ?? {})) {
    if (key === spec.textProp) {
      // textProp 是**文本内容**而非属性：Vue 模板文本插值用 {{ }} 语法，
      // 所以带 {{ }} 的模板字符串原样输出；字面量去掉引号包装输出原文。
      if (typeof value === 'string') textContent = value
      else if (isBinding(value)) textContent = `{{ ${value.value.trim()} }}`
      else textContent = String(value)
      continue
    }
    if (key === vModelProp && isBinding(value)) {
      // v-model 逐字还原成左值绑定（Vue 出码比 React 简单的地方）
      attrs.push(`v-model="${value.value.trim()}"`)
      continue
    }
    if (key === vModelProp) {
      attrs.push(`:model-value="${exprText(value)}"`)
      continue
    }
    // 字面量字符串 → 静态属性；其余 → 绑定形式
    if (typeof value === 'string' && !isBinding(value) && !value.includes('{{')) {
      attrs.push(`${key}="${value}"`)
    } else {
      attrs.push(`:${key}="${exprText(value as PropValue)}"`)
    }
  }

  const attrStr = attrs.length ? ' ' + attrs.join(' ') : ''
  const tag = spec.tag

  // children：容器递归；scopedChildren（TableColumn）包 #default="{ row }"
  let inner = ''
  if (node.children?.length) {
    if (spec.scopedChildren) {
      inner += `${ind(depth + extraDepth + 1)}<template #default="{ row }">\n`
      for (const child of node.children) {
        inner += genNode(child, depth + extraDepth + 2, ctx)
      }
      inner += `${ind(depth + extraDepth + 1)}</template>\n`
    } else {
      for (const child of node.children) {
        inner += genNode(child, depth + extraDepth + 1, ctx)
      }
    }
  }

  // 文本内容或 select/radio 的 options 展开
  let optionsHtml = ''
  if (node.componentName === 'Select') {
    const opts = (node.props?.options as Array<{ label: unknown; value: unknown }> | undefined) ?? []
    for (const o of opts) {
      optionsHtml += `${ind(depth + extraDepth + 1)}<el-option label="${String(o.label ?? '')}" :value="${exprText(o.value as PropValue)}" />\n`
    }
    ctx.imports.add('ElOption: element-plus')
  }
  if (node.componentName === 'Radio') {
    const opts = (node.props?.options as Array<{ label: unknown; value: unknown }> | undefined) ?? []
    for (const o of opts) {
      optionsHtml += `${ind(depth + extraDepth + 1)}<el-radio :value="${exprText(o.value as PropValue)}">${String(o.label ?? '')}</el-radio>\n`
    }
    ctx.imports.add('ElRadio: element-plus')
  }

  // Select/Radio 的子节点留给 options 展开；Text 用文本内容
  const hasChildrenContent = inner.length > 0 || optionsHtml.length > 0 || textContent !== ''
  let content = ''
  if (textContent !== '') content += `${ind(depth + extraDepth + 1)}${textContent}\n`
  content += optionsHtml
  content += inner

  if (!hasChildrenContent && !optionsHtml) {
    // 无内容 → 自闭合
    const evtAttr = genEventAttr(node, ctx)
    return `${wrapperOpen}${ind(depth + extraDepth)}<${tag}${attrStr}${evtAttr} />\n${wrapperClose}`
  }
  const evtAttr = genEventAttr(node, ctx)
  return `${wrapperOpen}${ind(depth + extraDepth)}<${tag}${attrStr}${evtAttr}>\n${content}${ind(depth + extraDepth)}</${tag}>\n${wrapperClose}`
}

/** 事件属性：@click="__on_xxx_click"，同时在 ctx.handlers 里生成函数体 */
function genEventAttr(node: SchemaNode, ctx: GenCtx): string {
  const events = Object.entries(node.onEvent ?? {}).filter(([, acts]) => acts?.length)
  if (!events.length) return ''
  let attrStr = ''
  for (const [event, actions] of events) {
    const fnName = `__on_${variableName(node.id)}_${event}`
    ctx.handlers.push(genHandler(fnName, actions, ctx))
    attrStr += ` @${event}="${fnName}"`
  }
  return attrStr
}

/** 安全变量名（节点 id 可能是数字开头/含符号） */
function variableName(raw: string): string {
  return (raw[0].match(/[a-zA-Z_$]/) ? raw : 'n_' + raw).replace(/[^a-zA-Z0-9_$]/g, '_')
}

/** 一条动作链 → 一个 async 函数的完整源代码 */
function genHandler(fnName: string, actions: ActionItem[], ctx: GenCtx): string {
  const lines: string[] = []
  lines.push(`async function ${fnName}(e) {`)
  for (const action of actions) {
    if (action.condition) lines.push(`${ind(1)}if (!(${action.condition.trim()})) return`)
    const args = action.args ?? {}
    switch (action.actionType) {
      case 'updateState': {
        for (const [key, raw] of Object.entries(args)) {
          const path = key.split('.').filter(Boolean)
          const target = `state.${path.join('.')}`
          const valueExpr = typeof raw === 'string' ? raw.trim() : exprText(raw as PropValue)
          lines.push(`${ind(1)}${target} = ${valueExpr}`)
        }
        break
      }
      case 'toast': {
        ctx.imports.add('ElMessage: element-plus')
        lines.push(`${ind(1)}ElMessage({ message: ${exprText(args['message'] as PropValue | undefined)}, type: ${JSON.stringify(args['type'] ?? 'info')} })`)
        break
      }
      case 'confirm': {
        ctx.imports.add('ElMessageBox: element-plus')
        lines.push(`${ind(1)}if (!(await ElMessageBox.confirm(${exprText(args['message'] as PropValue | undefined)}, ${JSON.stringify(args['title'] ?? '提示')}).catch(() => false))) return`)
        break
      }
      case 'openUrl': {
        lines.push(`${ind(1)}window.open(${exprText(args['url'] as PropValue | undefined)}, ${JSON.stringify(args['target'] ?? '_blank')}, 'noopener')`)
        break
      }
      case 'fetch': {
        const dataField = String(args['dataField'] ?? 'list')
        lines.push(`${ind(1)}{ const res = await fetch(${exprText(args['uri'] as PropValue | undefined)}); const data = await res.json(); state.${dataField} = data }`)
        break
      }
      case 'reloadDataSource': {
        const id = String(args['id'] ?? '')
        lines.push(`${ind(1)}// reloadDataSource: ${id || '未指定 id'}（声明式数据源在下方 initData 里已加载）`)
        break
      }
      default:
        lines.push(`${ind(1)}// 未知动作类型: ${action.actionType}`)
    }
  }
  lines.push('}')
  return lines.join('\n')
}

/** 页面级数据源初始化（isInit） */
function genDataSources(schema: Schema, ctx: GenCtx): string {
  const ds = schema.dataSource ?? []
  if (!ds.length) return ''
  ctx.imports.add('onMounted: vue')
  const lines: string[] = ['onMounted(async () => {']
  for (const d of ds) {
    if (!d.isInit) continue
    const field = d.dataField ?? d.id
    lines.push(`${ind(1)}{ const res = await fetch(${JSON.stringify(d.uri)}).catch(() => null); if (res) state.${field} = await res.json() }`)
  }
  lines.push('})')
  return lines.join('\n')
}

/**
 * schema → Vue SFC 字符串
 * @returns .vue 文件完整文本
 */
export function generateVueSfc(schema: Schema): string {
  const ctx: GenCtx = { imports: new Set<string>(), handlers: [] }

  // Page 根用 div.page 包（COMP_MAP 的 Page 是 div + class）
  let template = '<template>\n'
  const rootChildren = schema.children ?? []
  if (rootChildren.length) {
    template += `${ind(1)}<div class="page">\n`
    for (const child of rootChildren) {
      template += genNode(child, 2, ctx)
    }
    template += `${ind(1)}</div>\n`
  } else {
    template += `${ind(1)}<div class="page"></div>\n`
  }
  template += '</template>\n'

  // script setup
  const vueImports = ['reactive']
  if (ctx.handlers.length || (schema.dataSource ?? []).some((d) => d.isInit)) vueImports.push('onMounted')
  let script = `<script setup lang="ts">\n`
  script += `${ind(1)}import { ${vueImports.join(', ')} } from 'vue'\n`
  const fromImports = new Map<string, string[]>()
  for (const entry of ctx.imports) {
    const [name, from] = entry.split(': ')
    if (!fromImports.has(from)) fromImports.set(from, [])
    fromImports.get(from)!.push(name)
  }
  for (const [from, names] of fromImports) {
    script += `${ind(1)}import { ${names.join(', ')} } from '${from}'\n`
  }
  script += '\n'
  script += `${ind(1)}const state = reactive(${JSON.stringify(schema.state ?? {}, null, 2).split('\n').join('\n' + ind(2))})\n\n`
  if ((schema.dataSource ?? []).some((d) => d.isInit)) {
    script += genDataSources(schema, { imports: ctx.imports, handlers: [] }) + '\n\n'
  }
  for (const handler of ctx.handlers) {
    script += handler + '\n'
  }
  script += '</script>\n'

  return template + '\n' + script
}

/** 出码为可下载/复制的完整文件（带 style 骨架，保证可编译） */
export function generateVueFile(schema: Schema): string {
  const sfc = generateVueSfc(schema)
  return (
    sfc +
    '\n<style scoped>\n' +
    '.page { padding: 16px; }\n' +
    '</style>\n'
  )
}