/**
 * ============================================================
 * 子系统 ④：物料协议（MaterialMeta）
 * ============================================================
 * 一份 meta 同时驱动四件事（lowcode-engine 的精髓）：
 *   1. 物料面板      —— title / group / snippets
 *   2. 画布渲染      —— component（真实组件对象）
 *   3. 拖拽约束      —— isContainer / childWhitelist / parentWhitelist
 *   4. 属性面板      —— configure.props（setter 指定录入控件，自动生成表单）
 * 另：codegen 字段在 M9 驱动"出码映射"（文件第 5 个消费者）。
 *
 * 教学对比：craft.js 用 Component.craft = { props, rules } ；amis 用注册表 + 组件自身
 * 的 config。lowcode-engine 把这一套做成协议（material-spec），最完整。
 */

// 注：core 层本应零 Vue 依赖，但物料的"组件对象"必然要指到 Vue 组件。
// 这里用 `import type`（编译期擦除，不产生运行时代码），保持协议逻辑框架无关。
import type { Component } from 'vue'
import type { PropValue } from '../schema/types'

/** snippet 里的 schema 片段：不需要 id（节点拖入画布时由 createNode 生成） */
export interface SnippetNode {
  componentName: string
  props?: Record<string, PropValue>
  children?: SnippetNode[]
}

/**
 * setter 描述符：属性面板把某属性映射成哪种录入控件
 * （对应 lowcode-engine 的 StringSetter / NumberSetter / SelectSetter ...；都是受控组件）
 */
export type SetterDescriptor =
  | 'text'      // 单行文本
  | 'number'    // 数字
  | 'boolean'   // 开关
  | 'select'    // 下拉
  | 'color'     // 颜色
  | 'array'     // 数组
  | 'object'    // 对象（JSON）
  | 'json'      // 任意 JSON

/** 属性配置：驱动属性面板自动生成一行表单 */
export interface PropConfig {
  /** 属性名（对应 node.props[key]） */
  name: string
  /** 面板上显示的标签 */
  label: string
  /** 录入控件；对象形式可携带控件预设（如 select 的 options 写在顶层 options） */
  setter: SetterDescriptor | { type: SetterDescriptor; props?: Record<string, unknown> }
  /** select 等控件的数据源 */
  options?: { label: string; value: string | number | boolean }[]
  /** 默认值（节点创建 snippet 时会带上） */
  default?: PropValue
  /** 帮助提示 */
  tip?: string
  /** 分组（属性面板内 Section 分组，缺省归"通用"） */
  group?: string
}

/** M9 出码映射：schema 的 componentName → 生成出来的 Vue 标签/import */
export interface CodegenSpec {
  /** 生成代码里 import 的标识符（如 ElButton）；缺省表示原生标签无需 import */
  importName?: string
  /** 从哪个包 import（如 element-plus） */
  importFrom?: string
  /** 生成的标签（el-button） */
  tag: string
  /** wrapper prop 名 → el 组件 prop 名的映射（大多数是透传可以省略） */
  propMap?: Record<string, string>
  /** 该 prop 的值作为文本内容渲染进标签缝隙，而不是属性（如 Button.text 渲染成 {{text}}） */
  textProp?: string
  /** 子节点是否要包一层 scoped 默认插槽（如 el-table-column 的 #default="{ row }"） */
  scopedChildren?: boolean
}

export interface MaterialMeta {
  /** 注册表 key，等于 schema 节点的 componentName */
  componentName: string
  /** 面板/大纲显示名 */
  title: string
  /** 物料面板分组：layout（布局）/ form（表单）/ data（数据展示）/ action（操作）/ basic（基础） */
  group: string
  /** 二级分类（可选） */
  category?: string
  /** 面板图标（emoji 或 el-icon 名，教学项目先用 emoji） */
  icon?: string
  description?: string
  /** 是否为容器（能拖入子节点） */
  isContainer?: boolean
  /** 允许的子组件列表（缺省 = 不限） */
  childWhitelist?: string[]
  /** 允许的父组件列表（缺省 = 不限） */
  parentWhitelist?: string[]
  /** 插槽语义：{ default: { scoped: true } } 表示 default 插槽带作用域（表格列 { row }） */
  slots?: Record<string, { scoped?: boolean }>
  /** 该物料是否支持 condition / loop（属性面板显示"显隐/循环"开关，缺省 true） */
  supports?: { condition?: boolean; loop?: boolean }
  /** 属性配置（驱动属性面板自动表单） */
  configure: { props: PropConfig[] }
  /** 物料面板的拖入入口：snippet 为 schema 片段（无 id，拖入时补 id） */
  snippets?: { title: string; schema: SnippetNode }[]
  /** 出码映射（M9） */
  codegen?: CodegenSpec
}

/** 注册进 MaterialRegistry 的一条完整物料 */
export interface Material {
  meta: MaterialMeta
  /** 真实组件对象（能被 <component :is> 接收） */
  component: Component
}