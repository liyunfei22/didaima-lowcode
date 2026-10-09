# 02 · 低代码核心原理详解（7 大子系统）

> 任何低代码平台都能拆成 7 个正交子系统：**①DSL 协议 ②渲染引擎 ③可视化编辑器 ④物料体系 ⑤数据绑定与表达式 ⑥事件动作编排 ⑦出码 vs 运行时渲染**。
> 本文逐个讲清"业界怎么做"与"我们自己怎么做/学什么"，每节末尾标注对应我们实现的哪个目录。配套 `README` 里的对接说明。

---

## 子系统 ①：DSL 协议（Schema）——平台的"唯一事实源"

**业界做法**：lowcode-engine 用**三份协议**奠基整个体系：

1. **搭建协议（Schema）**：描述页面/区块/组件树，与渲染、出码**解耦**。顶层 `version / componentsMap / componentsTree / utils / i18n / dataSource`；节点（NodeSchema）核心字段：`componentName / id / props / children / condition / loop / loopArgs`。
2. **物料协议（MaterialMeta）**：组件"接入引擎"的描述文件：`componentName / title / group / icon / snippets / configure`。
3. **资产包协议（Assets）**：一套物料如何按 npm 包/URL 加载进引擎（组件名 → npm 包导出映射）。

**关键设计——三类特殊结构**（渲染器与出码器都能识别，一份 schema 双通道消费）：

```json
{ "type": "JSExpression", "value": "this.state.user.name" }  // 属性/数据绑定
{ "type": "JSFunction",   "value": "function(e){...}" }       // 事件回调
{ "type": "JSSlot",       "value": [子节点...] }               // 具名插槽
```

**我们的协议**（`src/core/schema/types.ts`）：采用**嵌套树 + 全局唯一 id**（低阶但教学直观），属性值是"字面量 | `{type:'binding', value}`"双态，事件直接采用 amis 风格的声明式动作链（`onEvent: { click: [{ actionType, args }] }`）。见 `architecture.md` 的完整定义。

---

## 子系统 ②：渲染引擎——"JSON 进，页面出"

**业界做法**：所有成熟引擎都是"**JSON schema + 组件注册表 + 递归渲染**"三件套：

- amis：节点用 `type` 字段查渲染器注册表，递归渲染；数据通过"数据域（scope）"注入，不做 prop drilling；
- lowcode-engine：schema → 直接构建组件元素树（分 协议层 → 能力层（Props 解析/样式/条件/循环）→ 适配层 → 渲染层 四层）；
- craft.js：`Frame` 递归遍历节点树，用 `resolver`（type→组件映射）出组件。

**核心算法**（自研约 300-500 行）：

1. **注册表**：`Map<type, Component>`。
2. **递归渲染**：`renderNode(node, scope)` → 解 props → 递归 children。
3. **props 双态解析**：字面量直接透传；表达式绑定（`JSExpression`/`{{ }}`）走求值器。**v-model 无特殊处理**：`modelValue` 是普通 prop、`onUpdate:modelValue` 是普通 listener，`<component :is v-bind v-on>` 原样透传即等价模板 `v-model`。
4. **作用域链**：渲染时逐层 push scope，标识符沿链向上查找（类似 JS 闭包）。**loop 注入 `item`/`index`**（lowcode 用 `loop` + `loopArgs: ['item','index']`）。
5. **条件渲染**：`condition` 字段求值，false 返回 null。

**我们的实现**：`src/renderer/SchemaNode.vue`（递归组件）+ `src/renderer/renderer.ts`（`resolveRender` 纯函数）。关键差异点（写进架构文档）：
- Vue 用 `<component :is="registry.get(name).component">` 从**自研注册表**取组件对象，不用 Vue 全局 `resolveComponent(name)`（避免字符串查全局注册表、大小写敏感、tree-shaking 隐患）；
- 作用域链显式 prop 传递（`state / item / index / params`），不推荐 provide/inject——教学透明、可直接打印调试；
- `:key="node.id"` 全局必须（拖拽排序后防 DOM 错位）；
- 表格列等走**具名作用域插槽**（`meta.slots` 声明 scoped）——这是 Vue 版对 React render-prop/function-as-child 的对应物。

---

## 子系统 ④：物料体系——"一份 meta 驱动四件事"

**这是 lowcode-engine 的精髓设计，也是我们整个编辑器的支柱。**

每个物料声明一份 `MaterialMeta`，**同一份声明**喂四个模块：

```
configure.props[i] = { name, title, setter, defaultValue }   → 驱动属性面板（自动生成表单）
snippets = [{ title, schema }]                                → 驱动物料面板（拖入时插入 snippet）
configure.advanced / component: { isContainer, nestingRule }  → 驱动画布渲染 + 拖拽约束
component（真实组件代码）                                     → 驱动画布渲染
```

**setter 体系**：`configure.props[i].setter.componentName` 声明该属性在属性面板用什么录入控件（lowcode-engine 内置 20+ setter：StringSetter/SelectSetter/ExpressionSetter/SlotSetter…，可扩展）。**属性面板 0 代码自动生成**的来源。craft.js 同思想：组件挂 `Component.craft = { props, rules: { canDrag, canDropIn, canMoveIn } }`。

**我们的实现**：`src/core/material/types.ts + registry.ts`，每个物料 = `薄封装 Widget.vue + meta`。meta 定义：`{ componentName, title, group, isContainer, childWhitelist?, parentWhitelist?, configure: { props: PropConfig[] }, snippets, codegen? }`。物料是「对 Element Plus 组件库的适配层」（类比 amis 包装 antd）——这是 M2 的专门学习点。

---

## 子系统 ⑤：数据绑定与表达式——求值器与作用域

**业界做法**（三个代表，思路高度一致）：

| 求值器 | 特点 | 适用 |
|---|---|---|
| jsep | 轻量（~3KB），tokenizer + Pratt parser，输出 ESTree 风格 AST，纯解析无副作用 | 需要自控求值与安全时选它 |
| expr-eval | 自带求值器，明确不用 eval/Function，CSP 安全 | 想开箱即用 |
| amis-formula | tokenizer→parser→evaluator 流水线，支持 `$( )` 插值、IF 表达式、过滤器 | amis 语义的场景 |

**求值器四段式**（tokenizer → Pratt parser → AST → evaluator）：
- **tokenizer**（~100-150 行）：数字/字符串/标识符/运算符/括号 → token 流；
- **Pratt parser**（~200-300 行）：nud/led 思想 + 优先级表，左结合用 `minPrec + 1` 递归即可正确处理 `1 + 2*3`；
- **evaluator**（~150-250 行）：switch 节点类型，标识符沿 scope 链查找，`&& || ?:` 要**短路求值**。

**安全关键**：自研求值器逐节点解释 AST，**没有 eval、没有 Function、原型链不可达**，天然 CSP 安全。scope 用 `Object.create(null)` 防 `__proto__`/`constructor` 污染。对比：`new Function('scope', 'return (' + expr + ')')` 30 行搞定但违反 CSP `unsafe-eval` 且裸 eval 暴露原型链。

**我们的实现**（`src/core/expression/`）：**jsep 只做解析**（parser），**自研 AST 求值器**，`{{ }}` 模板插值 + 完整表达式两种模式，白名单函数 + 黑名单成员。这是 M7 的核心教学点。

---

## 子系统 ⑥：事件动作编排——"事件 → 动作链"（amis 深度对标）

> 这一节是我们事件系统 `src/core/events/` 的直接蓝本。抄 amis，不抄 lowcode-engine（后者走 JSFunction 回调，事件绑定即"绑一段函数"，不够可视化）。

**配置结构**（纯声明式）：

```json
{ "type": "button",
  "onEvent": { "click": { "actions": [
      { "actionType": "toast", "args": { "msgType": "info", "msg": "${name}" } },
      { "actionType": "ajax", "api": { ... } },
      { "actionType": "setValue", "componentId": "form1", "args": { "value": "${event.data.responseResult}" } }
  ]}}}
```

**六大设计要点**：

1. **协议单一**：`事件 → action[]`，每个 action 由 `{ actionType, args, expression?, componentId?, outputVar? }` 构成。
2. **event 对象作为链式"共享内存"**：动作参数可用 `event.data`（事件上下文，可跨动作存活）；动作输出用 `outputVar` 命名的结果写入 `event.data`，**下游动作引用上游结果**——这就是"链"的数据面。`setEventData` 显式写入临时变量。
3. **控制流动作化**：`loop`（迭代中间件把当前项合入数据链）、`wait`、`custom` 本身就是动作，天然可嵌套可视化。
4. **分级钩子**：`preventDefault`/`stopPropagation`/`ignoreError` 动作级声明，非代码控制。
5. **组件动作**：`componentId` + `actionType` 调用任意组件暴露的动作（表单 submit/validate、CRUD reload）——"动作 = 可寻址组件能力"。
6. **扩展机制**：`registerAction('type', { run(action, renderer, event) })` 注册自定义动作。

**我们的实现**：动作表 `updateState / toast / confirm / openUrl / fetch / reloadDataSource`，参数表单复用同一套 setter 体系（`argDefs: PropConfig[]`）。executor 顺序执行 + `condition` 放行 + `event.data` 共享内存。

---

## 子系统 ⑦：出码 vs 运行时渲染

**核心洞察：出码就是"复用渲染器的树遍历，换个 emit 产物"**——你遍历 schema 求值成 UI，它遍历 schema 拼成源码字符串。

自研实现要点（`src/core/codegen/vue-codegen.ts`）：

```
genNode(node, indent):
  1) condition → 包 <template v-if="{expr}">
  2) loop     → 包 <template v-for="(item, index) in {expr}">
  3) tag = 组件映射（Page→div、Button→el-button…）
  4) 收集 root attrs：字面量→静态/字符串；binding→:attr="{expr}"；modelValue→v-model
  5) onEvent → @click="__on_xxx"（handler 生成进 <script setup>）
  6) children 递归
最终拼装：<template>...</template> + <script setup lang="ts">（import 按组件聚合 + state + actions + dataSource）</script>
```

教学要点：**v-model 在 Vue 可以逐字还原成左值绑定**（`v-model="state.input"`），这是 Vue 出码比 React JSX 简单的一处；`v-if/v-for` 包裹次序就是渲染引擎求值顺序的镜像——引擎做了同样的事，只是从"值"变"字符串"。（注：此前资料里的 "lerche" 经核实不存在，正确参考是 lowcode-engine 的 `modules/code-generator`。）

---

## 横切主题 1：拖拽系统（三种路线）

| 路线 | 代表 | 核心思想 |
|---|---|---|
| HTML5 Drag & Drop | react-dnd 默认 backend | Browser 原生；`dragover` 必须 preventDefault 否则不触发 drop |
| Pointer Sensor | dnd-kit | 监听 pointer 事件 + 碰撞检测（rectIntersection/closestCenter）+ DragOverlay portal |
| **DOM 实例库** | **SortableJS** | 直接对列表 DOM 排序，事件回调里自己算树操作 |

**HTML5 自研要点**（我们 M4 会用 SortableJS，但原理文档记录）：
- `dragover` 必须 `preventDefault()`；`dataTransfer.effectAllowed/dropEffect = 'move'`；
- 子元素干扰：`e.target.closest('[data-node-id]')` 归一到节点根；
- **中点判定插入位**：遍历容器直接子元素，`getBoundingClientRect()` 取中线，找"光标越过其中心"的最近元素作为 insertBefore 目标；
- **指示线不动真实 DOM**：只在 store 里记录 hover 位置，渲染一个绝对定位横线，drop 才提交树操作；
- **放置约束**：`childWhitelist` 预校验（禁自嵌套、禁回环），不满足则 `dropEffect='none'`。

**SortableJS 在 Vue 的接入**（我们的选择）：直接 `Sortable.create(el, {...})` 挂 `ref`，外包一层自研薄指令（60-80 行），**不做 v-model 数组绑定**——因为我们的数据流必须是「Sortable 事件 → 算插槽位置 → `commit(treeOps)` 写 schema 树」。带 `pull:'clone'` 的 group 实现物料面板拖入；`evt.to` 定位目标容器；嵌套容器双端事件以 `evt.to` 为准 + onStart 记录事务去重。
> 明确不用 vuedraggable / vue-draggable-plus：它们的 v-model 模型会接管数据流，绕死 schema 嵌套语义。

## 横切主题 2：undo/redo（补丁栈）

三条路：

1. **命令模式**：`{ do(), undo() }`，粒度精细但每个变更写两遍；
2. **全量快照栈**：每次 push state 拷贝，最简单但内存 O(n)；
3. **Immer 补丁栈（当前主流）**：`produceWithPatches(state, recipe)` 一次返回 `[next, forwardPatches, inversePatches]`，undo/redo 用 `applyPatches` 回放。**存的是最小 diff**，内存小、天然可序列化。**patches 协议与 Yjs/OT 协作协议同族**。

关键细节：
- **拖拽是高频 move 序列，必须把一次拖拽合并成单个 undo 步骤**（undo 一次退回整个操作，而不是只退一步）；
- history 设 limit（如 100）；
- immer 只认 plain object：**不能在 Vue reactive/proxy 上 produce**——我们用「`let inner` 普通对象 + `computed` 导出」的桥（`src/editor/store/editor.ts`，本项目最重要的一段代码）。
- 参考：zundo（<700B，zustand temporal 中间件）可抄 API 设计。

## 横切主题 3：状态管理的"UI 态分离"

编辑器状态 = 两半：
- **schema 树**（持久、进历史栈、immutable 替换）；
- **UI 态**（selectedId / hoverId / 拖拽事务，易失、不进历史栈，用普通 ref）。

**这是 craft.js / lowcode-engine 编辑器状态的通用划分**，也是我们 `editor/store/editor.ts` 的设计依据。

---

## 各子系统速查表（我们的实现位置）

| 子系统 | 业界参考 | 我们的代码 |
|---|---|---|
| ① DSL 协议 | lowcode-engine 三份协议 | `src/core/schema/` |
| ② 渲染引擎 | amis / lowcode renderer / craft.js | `src/renderer/` |
| ③ 可视化编辑器 | craft.js / lowcode simulator | `src/editor/` |
| ④ 物料体系 | lowcode MaterialMeta + setter | `src/core/material/` + `src/materials/` |
| ⑤ 数据绑定与表达式 | amis-formula / jsep / Appsmith | `src/core/expression/` |
| ⑥ 事件动作编排 | amis onEvent | `src/core/events/` |
| ⑦ 出码 vs 运行时 | OutSystems / lowcode code-generator | `src/core/codegen/` + `src/runtime/` |
| 横切：历史 | immer patches / zundo | `src/core/history/` |