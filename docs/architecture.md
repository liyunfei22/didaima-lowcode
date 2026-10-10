# 架构设计文档

> 我们自己的低代码平台 `didaima`（"低代码"拼音）的协议与架构设计。全文"结论 + 取舍理由"，对照可参考 `docs/research/01`（平台全景）、`docs/research/02`（核心原理）。
> 里程碑进度见 `implementation-notes.md`。**M1 起本文件随实现逐字校准。**

---

## 0. 设计目标与总原则

1. **教学优先**：7 大子系统全部自研、代码中文注释、每处关键设计有对照说明；"核心原理"必须是框架无关的纯 TS（`src/core/`）。
2. **自研骨架 + 借成熟库**：schema 协议/渲染引擎/编辑器/物料/绑定/事件/出码 自研；Pinia（状态）、immer（不可变变换+历史）、jsep（表达式解析）、SortableJS（拖拽）、Element Plus（UI+物料底座）为 borrowed 底座。
3. **一份 schema 驱动一切**：渲染、编辑、物料、出码消费同一棵树（lowcode-engine 思想）。

---

## 1. Schema 协议（DSL）

**定位**：嵌套树 + 全局唯一 id；属性值「字面量 | binding」双态；事件用 amis 风格声明式动作链。

```ts
// src/core/schema/types.ts（语义定义，代码以其为准）
type NodeId = string
type PropValue = Literal
              | { type: 'binding'; value: string }   // 完整表达式或被 {{ }} 包裹的模板

interface SchemaNode {
  id: NodeId
  componentName: string          // 物料注册表 key
  title?: string                 // 大纲/面板显示名
  props?: Record<string, PropValue>
  children?: SchemaNode[]
  condition?: string             // 求值为假 → 不渲染
  loop?: string                  // 为真 → 外层包 <template v-for>，注入 item/index
  loopKey?: string
  onEvent?: Record<string, ActionItem[]>
  lock?: boolean
}
interface ActionItem { actionType: string; args?: Record<string, unknown>; condition?: string; outputVar?: string }
interface Schema extends SchemaNode {   // Page 根节点即 Schema
  version: string
  fileName?: string
  state?: Record<string, unknown>       // 页面数据域（初始状态）
  dataSource?: { id; uri; method?; isInit?; dataField? }[]
}
```

**取舍**：
- **嵌套树而非扁平 map**：教学直观、`dfs` 好写；craft.js 用扁平 map + parent 指针是性能考虑，教学级规模用不上。
- **binding 描述符 + 字符串模板双语法**（Appsmith 风格）：`{type:'binding', value}` 表达完整表达式；字符串里出现 `&#123;&#123; &#125;&#125;` 视为模板插值。文档明示两种语法的求值规则（见 `core/expression/evaluator.ts`）。
- **事件不绑 JSFunction，绑声明式动作链**（抄 amis 而非 lowcode-engine）：可视化配置优于写函数（见 §6）。

---

## 2. 渲染引擎（① 的实现）

**运行时渲染（非出码）为主**——理由见 research/01 §6.1：反馈闭环快、编辑态=运行态、内部工具场景 JSON 解释开销可忽略。

**三件套**：注册表 + 递归渲染 + props 双态解析。

```
<SchemaNode (node, scope)>
  ├─ condition 求值为假 → 不渲染（v-if）
  ├─ loop      存在 → v-for（item/index 注入子 scope），子节点各自再交给 SchemaNode（同一节点、摘掉 loop 的副本）
  └─ <component :is="registry.get(name).component"  v-bind="attrs" v-on="listeners">
       ├─ 默认插槽：children 逐个递归（作用域插槽用 #default="slotProps" 统一，scope 合并 slotProps）
       └─ meta.slots 声明的具名 scoped 插槽（表格列 #default="{ row }"）
```

**要点/取舍**：
- `<component :is>` 从**自研注册表**取组件对象，不用 Vue `resolveComponent(name)`——后者查 `app.component` 全局注册表，字符串有大小写敏感/命名冲突/tree-shaking 隐患。自研注册表在 React 生态等价物就是 `resolver map`。
- **v-model 是普通 prop**：`modelValue` + `onUpdate:modelValue` 由 `<component v-bind v-on>` 原样透传 —— 渲染层不需要任何 v-model 特判（教学"啊哈"点，写进 notes）。
- 作用域链显式 prop 传递：`{ state, item, index, params }`。不用 provide/inject：可调试、与出码的 scope 概念同构。
- 编辑态 wrapper（CanvasNode）独立递归：渲染引擎保持纯净，编辑器套壳（craft.js: Frame vs EditorNode 分离）。

---

## 3. 状态管理：immer + Pinia 桥（本项目最重要的一段代码）

**为什么不能直接 `reactive`/Pinia state 装 schema**：immer 只支持对 plain object/array produce；Vue 的 deep reactive 代理会让 immer 误判（自带深代理 `Symbol(immer-draftable)` 标记？不——`reactive` 的代理没有 mark，immer 会按 plain 处理失败或污染）。**标准答案：真源用普通对象，Vue 只做读取包装。**

```ts
// src/editor/store/editor.ts（核心结构）
let inner: Schema = cloneDefaultSchema()      // 唯一真相源：普通对象（immer 可 produce）
const schema = computed(() => inner)          // 导出给视图；Pinia reactive 只负责读取包装
function commit(mutator: (draft: Schema) => void) {
  const [next, patches, inversePatches] = produceWithPatches(inner, mutator)
  inner = next
  history.push({ patches, inversePatches })
}
function undo() { const s = history.undo(); if (s) inner = applyPatches(inner, s.inversePatches) }
function redo() { const s = history.redo(); if (s) inner = applyPatches(inner, s.patches) }
```

- 所有写操作必须走 `store.commit(cb)`（纪律，跑测 `tree.ts` 时同样不直接改）；
- **UI 态与 schema 分离**：`selectedId / hoverId` 是 `ref`，不进历史栈（craft.js/编辑器通用划分）；
- **拖拽合并**：M4 拖拽过程的高频 move 用 `commit(..., { mergeKey })` 合并成单个 undo 步骤（进阶：时间窗合并）；
- 持久化：watch schema（防抖 500ms）→ localStorage；JSON 导出/导入。**历史栈不依赖 Pinia**（`core/history/patchStack.ts` 纯 TS）。

---

## 4. 物料体系（④）

**一份 meta 驱动四件事**（lowcode-engine 精髓）：

```ts
// src/core/material/（定义）
interface MaterialMeta {
  componentName; title; group; category?; icon?
  isContainer?; childWhitelist?; parentWhitelist?   // 拖拽约束
  slots?: Record<slotName, { scoped: boolean }>      // 插槽语义（表格列）
  configure: { props: PropConfig[] }                 // 属性面板驱动
  snippets?: { title; schema }[]                     // 物料面板入口
  codegen?: { importName; importFrom; tag; textProp? }  // 出码映射（M9）
}
interface Material { meta: MaterialMeta; component: Component }
class MaterialRegistry { register / get / list / groups / isContainer / canDropInto / canDropInParent }
```

**setter 契约**（受控组件）：`SetterProps = { config: PropConfig; value: PropValue | undefined; onChange(v) }`，`SetterRegistry[name → component]` 一张表。PropPanel = `nodeMeta.configure.props.map(p => h(SetterRegistry[p.setter], ...))` —— **属性面板 0 代码自动生成**。

**"物料 = 对组件库的适配层"**（materials/）：每个物料是薄封装 `Widget.vue`（只 import 自己用到的 el-*）+ meta；类比 amis 包装 antd。Element Plus 同时充当编辑器面板 UI 与物料底座（双层复用）。

---

## 5. 数据绑定与表达式（⑤）

- **求值器四段式**：jsep(解析) → AST → 自研 evaluator。sandbox：scope 用 `Object.create(null)`，成员访问黑名单 `__proto__/constructor/...`，函数调用仅白名单 `safeFns`。
- **双语法求值** `evalExpr(src, scope)`：
  - 含 `&#123;&#123; &#125;&#125;` → 模板模式：切段，每段求值，字符串拼接（String 强转）；
  - 否则 → 完整表达式：jsep → AST walk。
- `resolvePropValue(pv, scope)`：binding 描述符 → `&#123;&#123; &#125;&#125;` 模板或完整表达式；字面量直接透传；**字符串里出现双花括号 `&#123;&#123; &#125;&#125;` 起始标记时，也按模板处理**。
- 作用域：`state`（页面数据域，reactive 普通对象视图）、`item`/`index`（loop）、`params`（页面参数）。设计态用默认值构造。
- 求值失败不 crash 画布：`tryEvaluate` 返回 `{ok, value|error}`，面板红点提示。

---

## 6. 事件动作系统（⑥，amis onEvent 对标）

```
onEvent: { "click": [ { actionType, args, condition?, outputVar? }, ... ] }
```

- `executor.executeChain(actions, ctx)`：顺序执行；`condition` 假则跳过；`event.data` 作动作间共享内存（`outputVar` 写入）；`ignoreError` 容错；未注册 actionType 告警跳过。
- 动作 = `registerAction({ type, label, argDefs: PropConfig[], run })`；`argDefs` 复用 setter 体系 → **EventPanel 动作参数也是自动表单**。
- 内置动作：`updateState`（args 各值求值后 Object.assign 到 state）/ `toast` / `confirm` / `openUrl` / `fetch`（写 `state[dataField]`）/ `reloadDataSource`。
- 运行时注入：预览态用真实 runtimeApi（ElMessage/ElMessageBox/fetch），设计态 no-op（提升老师体验）。

---

## 7. 出码：schema → Vue SFC（⑦的第二通道）

- 递归 `genNode(node, indent, ctx)`：condition→`v-if`、loop→`v-for`、attrs（字面量→静态/字符串、binding→`:attr`/`v-model`）、onEvent→`@evt`、children 递归；
- `<script setup>`：按组件聚合 import（走物料 `codegen.importName/importFrom`）、`reactive(state)`、每个事件生成 async handler、dataSource 生成 `onMounted` 拉取；
- 教学点：**v-model 逐字还原成左值**；`v-if/v-for` 包裹次序 = 渲染引擎求值顺序的镜像。
- 产物可复制进全新 vite+vue 工程直接编译。

---

## 8. 技术栈对照（逐条取舍）

### Vue 生态渲染引擎对照（amis React vs 我们 Vue）
| 原理层 | amis（React） | 我们（Vue） |
|---|---|---|
| 递归渲染 | render(node) 递归返回 ReactElement | `<SchemaNode>` 自调用递归组件 |
| 组件解析 | React.create...(type) / element(type) | `<component :is="registry.get(name).component">` |
| 绑定→props | props 计算 | `resolveRender` + `<component v-bind>` |
| children/插槽 | {children} / render prop | 默认插槽 / 具名 scoped 插槽 |
| 事件 | onClick → action list | `listeners['on'+Cap]` → action list |
| 重渲染 | reconcile + memo | Vue 自动依赖追踪（整树替换时按组件 diff，教学级规模无性能问题） |

### SortableJS vs vuedraggable / vue-draggable-plus
- vuedraggable 核心卖点是 `<Draggable v-model="array">` 自动同步数组——但我们的数据流必须是「Sortable 事件 → 算插槽位置 → commit(treeOps)」；schema 是树不是平面数组，同一子树可能同时是多个容器 slots。**v-model 模型接管会绕死 schema 嵌套语义**。
- 我们需要 SortableJS 三个自定义点：`pull:'clone'`（物料面板）、`evt.to` 定位目标容器、嵌套双端事件去重 → 直接 `Sortable.create` + 自研薄指令（60-80 行），不做数据绑定。教学点：框架无关 DOM 库如何在 Vue 生命周期安家（onMounted 创建 / onUnmounted destroy）。

### jsep vs expr-eval vs amis-formula
- **expr-eval**：内部把表达式编译成 `new Function(...)`、执行环境不受控，不适合渲染未知 schema；API 友好但 AST 不可见，教学价值低。
- **amis-formula**：功能全面但贴近 amis 语义（rootScope/state 约定）、体积 ~50KB；作"重而全的上位替代"对照。
- **jsep + 自研求值器**：parser 最小、AST 标准 JS 语义、我们管求值与安全（教学点：AST 如何被求值 + 为什么天然安全）。代价：不支持模板字符串/正则/`?.` 可选链——文档声明受限清单。

### 明确不引入
`vuedraggable / vue-draggable-plus / expr-eval / amis-formula / zundo / unplugin-auto-import`（隐式 global 化，偏离显式教学）。

---

## 9. 目录结构速查

```
src/
├── core/                纯 TS 层（零 Vue runtime import）——协议/表达式/事件/历史/出码
│   ├── schema/          协议类型 + 树操作（immer draft 变换）+ 校验
│   ├── material/        物料协议 + 注册表
│   ├── expression/      jsep 封装 + AST 求值器 + 沙箱
│   ├── events/          动作注册表 + executor
│   ├── history/         patchStack（补丁栈）
│   └── codegen/         schema → Vue SFC 字符串
├── renderer/            渲染引擎（SchemaNode / resolveRender / runtimeApi）
├── editor/              编辑器（store / canvas / panels / setters / toolbar / directives）
├── materials/           物料：薄封装 Widget.vue + meta + 批量注册
├── runtime/             运行时渲染入口（预览 / 数据源）
└── App.vue              设计/预览两视图
```

**8 个子系统 → 目录映射**：①`core/schema` ②`renderer` ③`editor` ④`core/material + materials` ⑤`core/expression + editor/panels/DataPanel + BindingSetter` ⑥`core/events + editor/panels/EventPanel` ⑦`core/codegen + runtime`；undo/redo → `core/history + editor/store`。

---

## 10. 风险登记簿

| 风险 | 对策 | 阶段 |
|---|---|---|
| SortableJS 嵌套容器双端事件冲突 | 各容器独立实例 + `evt.to` 为准 + onStart 事务消费标记 + draggable 排除锁定 | M4 |
| immer × Vue 响应式互斥 | `let inner + computed` 桥（§3）——先看这段代码 | M3/M6 |
| Element Plus 输入控件设计态可交互 | CanvasNode 遮罩拦截 pointer + 设计态 onUpdate:modelValue no-op | M3 |
| immer 冻结纪律（props 不可变） | wrapper 只读 props + emit 回写；freeze 抛错即教学纪律 | M2 |
| jsep 语法边界 | docs 声明受限清单；`tryEvaluate` 面板报错不白屏 | M7 |
| 表格 scoped 插槽编辑态渲染 | 编辑态列内容 `row` 无数据 → 空态展示，文档说明 | M2/M3 |