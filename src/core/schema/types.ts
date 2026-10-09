/**
 * ============================================================
 * 子系统 ①：DSL 协议 —— Schema 类型定义
 * ============================================================
 * 低代码平台的"唯一事实源"：一份描述页面的 JSON，同时驱动
 *   渲染引擎 / 可视化编辑器 / 物料面板 / 属性面板 / 出码器。
 * 设计参考：
 *   - lowcode-engine 的 NodeSchema（componentName / props / children / condition / loop）
 *   - amis 的 schema（type 字段查注册表 + onEvent 声明式动作链）
 *
 * 关键语义（教学重点）：
 *   1. 嵌套树 + 全局唯一 id（可比对 craft.js 的扁平 map + parent 指针）
 *   2. PropValue 是"字面量 | binding 描述符"双态：
 *      - 字面量：渲染时原样透传
 *      - { type: 'binding', value: 'state.count + 1' }：渲染时经求值器求值
 *      - 字符串里带 {{ }} 的：按模板插值（Appsmith 风格，见 core/expression）
 *   3. 事件走 amis 风格声明式动作链：onEvent.click = [ { actionType, args }, ... ]，
 *      不绑 JSFunction（可视化配置优于写函数）
 */

/** 节点全局唯一 id */
export type NodeId = string

/** 绑定描述符：表达一个"运行时才求值"的表达式 */
export interface BindingExpr {
  type: 'binding'
  /** 完整表达式（如 state.count + 1）或含 {{ }} 的模板（如 点击 {{state.count}} 次） */
  value: string
}

/** 属性值 = 字面量 或 绑定描述符 */
export type PropValue =
  | string
  | number
  | boolean
  | null
  | BindingExpr
  | Record<string, unknown>
  | unknown[]

/** 单个动作（amis onEvent 动作链元素） */
export interface ActionItem {
  /** 动作类型，查 core/events 的动作注册表 */
  actionType: string
  /** 动作参数：值可为字面量或表达式字符串（是否求值由具体动作定义决定） */
  args?: Record<string, unknown>
  /** 条件表达式：求值为假则跳过本动作（amis expression 字段） */
  condition?: string
  /** 动作结果写入 ctx.event.data[outputVar]，供链上后续动作取用（amis outputVar） */
  outputVar?: string
  /** 动作执行异常时是否吞掉错误继续（amis ignoreError） */
  ignoreError?: boolean
}

/** 组件树节点 */
export interface SchemaNode {
  /** 全局唯一 id（画布编辑、:key、移动定位全依赖它） */
  id: NodeId
  /** 物料注册表 key（componentName 查 MaterialRegistry 拿到组件 + meta） */
  componentName: string
  /** 大纲树/面板显示名，缺省取物料 meta.title */
  title?: string
  /** 组件属性（字面量 | 绑定双态） */
  props?: Record<string, PropValue>
  /** 子节点（容器物料才有意义） */
  children?: SchemaNode[]
  /** 条件渲染：表达式求值为假则整棵子树不渲染（amis visibleOn / lowcode condition） */
  condition?: string
  /** 循环渲染：表达式求值为数组时，子树按 v-for 展开，作用域注入 item/index */
  loop?: string
  /** v-for 的 :key 取值表达式（缺省用 index） */
  loopKey?: string
  /** 事件 → 动作链：{ click: [action, ...] } */
  onEvent?: Record<string, ActionItem[]>
  /** 锁定：画布中不可选中/拖拽（编辑阶段防误操作） */
  lock?: boolean
}

/** 数据源声明（M9：isInit 时自动拉取写入 state[dataField]） */
export interface DataSourceItem {
  /** 数据源 id（reloadDataSource 用） */
  id: string
  /** 请求地址（静态 mock 用相对路径） */
  uri: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  /** 页面加载时是否自动请求 */
  isInit?: boolean
  /** 响应写入 state 的字段名（缺省取 id） */
  dataField?: string
}

/**
 * 顶层 Schema：Page 根节点本身就是一棵 SchemaNode，
 * 所以协议上"Schema === 一颗含 state/dataSource 的 Page 节点树"。
 * 树操作（core/schema/tree.ts）统一以 SchemaNode 为根递归。
 */
export interface Schema extends SchemaNode {
  version: string
  /** 页面文件名（导出/出码用） */
  fileName?: string
  /** 页面数据域（初始状态）：渲染/直播把 state 放进作用域，表达式可访问 state.xxx */
  state?: Record<string, unknown>
  /** 声明式数据源（M9） */
  dataSource?: DataSourceItem[]
}

/** 类型守卫：判断属性值是否为绑定描述符 */
export function isBinding(pv: PropValue | undefined): pv is BindingExpr {
  return (
    typeof pv === 'object' &&
    pv !== null &&
    (pv as BindingExpr).type === 'binding' &&
    typeof (pv as BindingExpr).value === 'string'
  )
}