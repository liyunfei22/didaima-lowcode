# 实现笔记

> 全程记录实现过程中的"原理 + 对照业界 + 踩坑"。随里程碑滚动追加（M1 开始写，这段导言先占位）。

## 进度

- [x] **M0** 调研文档 + 工程骨架（2026-10-09）
- [x] **M1** 协议 + 渲染引擎（2026-10-09）
- [x] **M2** 物料体系（Element Plus，2026-10-09）
- [x] **M3** 编辑器骨架（Pinia + 桥，2026-10-09）
- [x] **M4** 拖拽系统（SortableJS，2026-10-09）
- [x] **M5** 属性面板 + setter 体系（2026-10-09）
- [x] **M6** undo/redo + 持久化（2026-10-09）
- [x] **M7** 数据绑定与表达式（jsep，2026-10-09）
- [x] **M8** 事件动作系统（2026-10-09）
- [x] **M9** 数据源 + 出码（Vue SFC）+ 收尾（2026-10-09）
- [ ] M3 编辑器骨架（Pinia + 桥）
- [ ] M4 拖拽系统（SortableJS）
- [ ] M5 属性面板 + setter 体系
- [ ] M6 undo/redo + 持久化
- [ ] M7 数据绑定与表达式（jsep）
- [ ] M8 事件动作系统
- [ ] M9 数据源 + 出码 + 收尾

## 里程碑笔记

### M0 · 调研与骨架（2026-10-09）

**做了什么**：完成三轮调研（国外平台 / 国内平台 / 实现技术），产出 `docs/research/01·02·03` 与 `docs/architecture.md`；用 Vite 脚手架建立 Vue 3.5 + TS + Vite 8 工程，装齐依赖。

**关键决策回放**：
- 对标对象锁定：低代码引擎抄 **lowcode-engine**（物料 meta 驱动四件事）、数据/事件抄 **amis**（数据链 + onEvent 动作链）、编辑器范式抄 **craft.js**（树操作 + 编辑态/渲染态解耦）。
- 技术栈变化（对比初版 React 计划）：React→Vue、全自研→借库（Pinia/immer/jsep/SortableJS/Element Plus）、出码目标 React JSX→Vue SFC。

**版本记录**：vue 3.5.43 / pinia 2.3.1 / immer 10.2.0 / jsep 1.4.0 / sortablejs 1.15.7 / element-plus 2.14.7 / vite 8.3 / typescript 6.0。

**踩坑**：`@types/sortablejs` 写版本 `^1.15.26`（npm 上最新是 1.15.9）导致 `ETARGET` 安装失败——按 `npm view` 结果修正。

### M1 · 协议 + 渲染引擎（2026-10-09）

**做了什么**：schema 类型 + 树操作 + 校验器；物料协议 + 注册表；M1 阶段求值器（简易，M7 换 jsep AST 版，有测试守住行为契约）；渲染引擎（SchemaNode.vue 递归 + renderer.ts 纯函数）；M1 演示页由一份静态 JSON schema 渲染。

**验证方式**：Playwright 无头渲染 dev server → DOM 文本断言：
```
本页由一份 JSON schema 渲染（M1）
你好，小明！当前计数 3
第 1 项：苹果 / 第 2 项：香蕉 / 第 3 项：橘子   ← loop 展开 + index+1 四则
（condition: state.hidden → undefined，该行被正确隐藏）
零 JS 报错
```
28 个 vitest 单测覆盖树操作与求值器行为契约。

**关键决策回放**：
- **Schema 即一棵 Page 节点树**（`Schema extends SchemaNode`），树操作只认"节点树"一个概念，无第二条抽象。
- **渲染引擎框架无关化**：能放纯 TS 的解析逻辑全放 `renderer.ts`（resolveCondition/resolveLoopItems/resolveRender/childScope），SchemaNode.vue 只是薄壳。
- **作用域显式传 prop**（state/item/index/params），不用 Vue provide/inject——可调试、与出码的 scope 概念同构。
- **v-model 是普通 prop**：渲染层零特判，`<component v-bind v-on>` 原样透传 modelValue/onUpdate:modelValue 即等价模板 v-model（教学"啊哈"点）。

**踩坑**：
1. vue-tsc 的 `--noEmit` 在 solution-style tsconfig（`files: []` + references）下**什么都不查**——`type-check` 脚本必须用 `vue-tsc -b`。
2. TS 6.0 弃用 `baseUrl`；`paths` 直接相对 tsconfig 目录解析即可。
3. `erasableSyntaxOnly`（TS6 / @vue/tsconfig 默认开）禁止构造器**参数属性**（`constructor(msg, readonly expr)`），改显式字段赋值。
4. 模板里写演示用的 `<code>{{表达式}}</code>` 被 Vue 当插值吞了——教学页用 `v-pre` 原样输出。
5. **求值器语义修正**：`evalExpr('纯文本')` 必须返回纯文本而不是抛错（Appsmith 语义：`{{ }}` 才是表达式）；但 `state.count > 2` 这类"看起来是表达式"的要照常抛（面板红点提示的根基）。实现：先求值，只有"解析失败且不含运算符号"才判定为纯文本。

### M2 · 物料体系（Element Plus，2026-10-09）

**做了什么**：18 个物料（Page/Card/Tabs/TabPane/Text/Divider/Input/NumberInput/Select/Radio/Checkbox/Switch/DatePicker/Form/FormItem/Table/TableColumn/Button），每个 = 薄封装 Widget + 完整 meta（configure.props 已配好，M5 属性面板直接消费）；`materials/index.ts` 批量注册进 main.ts；M2 演示页验证 表格 scoped 插槽 + v-model 双向绑定 + tab 切换。

**验证方式**（Playwright 无头交互）：
- 表格三行数据渲染，`TableColumn(label 为空 + 子节点 Text{{row.status}})` 证明 scoped 插槽作用域注入；
- 输入框输入"韩梅梅2" → 预览文本实时变 `你好，韩梅梅2`；下拉选"专业版"→ `pro`；开关"开启"→ `VIP: true`，零报错。

**关键设计**：
- **物料 = 0 逻辑适配层**：绝大多数 wrapper 不声明 props、直接 `h(ElXxx, { ...attrs }, slots)` 全量透传；v-model 的 `modelValue` 是普通 prop、`update:modelValue` 是普通事件名，弹性插槽一走通整个适配层。Button/Text 因"内容走插槽而非属性"而特例声明 `text` prop。
- **deterministic 配置式选项**：Select/Radio 的 options 是 schema 数据（`[{label,value}]`），组件层展开成 `<el-option>/<el-radio>`，不与"拖入子节点做选项"混用（注明进阶做法）。
- **snippet 的 schema 不带 id**：物料协议里 snippet 用 `SnippetNode`（无 id），拖入画布时 `createNode` 补 id —— 避免 schema 里出现假的静态 id。

**大坑（本里程碑最值得记的一条）**：
> **`v-on="listeners"` 的对象键必须写事件名（`click`/`update:modelValue`），绝不能写已带 on 前缀的监听器名（`onClick`/`onUpdate:modelValue`）。**
> 模板编译会把 `v-on="obj"` 转成 `_toHandlers(obj)`——它遍历每个 key 再补一层 `on` + 大写首字母。若 key 已是 `onUpdate:modelValue`，产物变成 `onOnUpdate:modelValue`，事件永远不会触发（源码排查：wrapper 的 attrs 里出现 `onOnUpdate:modelValue` 即中招）。
> 另一层教训：**Element Plus 的 el-radio 用 `value` 承载选中值、插槽显示文案**（老版本 label 一身两役，已废弃）——写物料前先看当前版本的 props。

**遗留说明**：M2 还是"预览式"App（App.vue 直接渲染 schema）；M3 把它换成三面板编辑器 + 设计/预览两视图。

### M3 · 编辑器骨架（Pinia + 桥，2026-10-09）

**做了什么**：immer + Pinia 桥（`let inner + computed` 换成正确的 **`shallowRef + computed`**）；补丁历史栈（`core/history/patchStack`，带 mergeKey 合并 + limit）；三面板编辑器（物料面板点按添加 / 画布 CanvasNode 编辑态壳 / 右侧 属性·事件·数据·大纲 页签）；设计/预览两视图（AppRuntime 纯渲染）；撤销/重做、新建/导出/导入、快捷键（Cmd/Ctrl+Z/Y、Delete）。

**验证方式**（Playwright 无头交互全过）：
- 物料面板 18 条、画布 3 卡片；画布点选 text_preview → 选中框；大纲选 Form → 画布联动
- 点按添加分割线进 Form → `1`；撤销 → `0`；再添加 → 选中工具删除 → `0`（undo/redo 全程生效）
- 切预览 → 表格 3 行、编辑器壳消失、输入"王五"→ 预览文本实时变 `你好，王五`，零报错

**关键设计**：
- **编辑态/预览态同构**：同一棵 schema，设计态 CanvasNode 套壳渲染、预览态 AppRuntime 纯渲染（amis/tmagic 的 WYSIWYG 思想落地）。CanvasNode 是独立递归（craft.js 的 EditorNode 范式）：不展开 loop（只加徽标）、condition 假 → 半透明（编辑器可读性优先，不隐藏）。
- **遮罩层级**：mask z2 / tools z3 / outline z4（pointer-events:none）。父子 mask 同 z 值时子节点 DOM 靠后天然在上，点击子区域选中子节点。
- **历史栈前置**（原计划 M6）：patchStack 在 store 里从第一天就用上（`commit → produceWithPatches → history.push`），M3 就白送了 undo/redo；mergeKey 合并机制也先写好（M4 拖拽用）。

**大坑（两个）**：
1. **immer 10 的 patches 插件必须 `enablePatches()` 显式启用**，否则 `produceWithPatches` 在运行时才抛 `[Immer] The plugin for 'Patches' has not been loaded`。M1 单测只用了 `produce` 所以没暴露——**运行时错误永远比类型错误晚发现**，此类"插件式 API"要在第一批代码就用起来。
2. **Element Plus 组件在模板里用就必须要 import**：App.vue 里 `<el-tabs>`/`<el-tab-pane>`、Toolbar 里 `<el-button>`/`<el-segmented>` 都没 import → Vue 当成**未解析自定义元素**渲染，页头/按钮全是空壳，功能全部失效且无警告。教训 = 我们的架构决策"显式 import、不做全局注册"必须贯彻到页面文件（不只是物料文件）——顺便复习：怎样判断 EP 组件到底解析没解析（查 DOM 里是 `<el-button>` 自定义元素还是 `<button class="el-button">`）。

**遗留说明**：M3 画布已具备选中/添加/删除/撤销；M4 把"点按添加"升级为拖拽（物料面板 clone → 画布），顺带利用 mergeKey 把一次拖拽合并成单个 undo 步骤。

### M4 · 拖拽系统（SortableJS，2026-10-09）

**做了什么**：`v-draggable` 薄指令（生命周期 + 事件透传，不绑 v-model）；物料面板 `pull:'clone'` 复制拖入；画布各容器 children 槽 `pull:true/put:true` 同组互通；事件→树操作映射（onUpdate 排序 / onAdd clone或移动）；大纲树/工具按钮 ↑↓⧉✕ 兜底；一次拖拽的多次变更用 mergeKey 合并成一步 undo。

**验证方式**：
- 浏览器（Playwright）：物料面板"文本"真实拖进画布根 `4 → 5` ✓，Sortable 实例挂在画布槽上 ✓，页面不死 ✓，零 JS 错误
- 单测（vitest，node 环境跑 Pinia store，38 全过）：addMaterialTo 落位+选中、moveNodeTo 同容器/跨容器、**拖拽会话多次 move → 撤销一次整体还原**（mergeKey）、非拖拽提交独立成步、moveStep 上移/下移/边界

**关键设计**：
- **为什么薄封装**：vuedraggable 的 v-model 数组模型管不了"树"；Sortable 事件只表达"从哪个列表、落在哪个位置"的交互语义，应用层翻译成 `commit(treeOps)`（craft.js 思想）。
- **Sortable 的 newIndex 是"先摘除、再插入"的最终数组下标**（社区标准：`splice(old,1); splice(new,0,item)`）。我第一版给 moveNode 加了"同容器下移补偿 −1"，导致下移永远偏一位——单测抓出来删掉了。**这直接证明单测的价值：行为契约由测试锁定，WYSIWYG 的直觉不管用。**

**高风险区两个大坑**：
1. **Sortable 收尾期间的同步 commit 会死锁页面**：onUpdate 在 mouseup 流程中途同步触发，若立即 commit → Vue 重渲染移走拖拽元素 → Sortable 发现"拖的东西不见了"无限重试 → 页面卡死（现象：node 进程 0% CPU 等 page.evaluate，渲染进程无响应）。解法：`setTimeout(0)` 把树操作推迟到 Sortable 收尾之后（`deferApply` + 去重标志）。
2. **嵌套容器拖拽（拖容器 A 经过容器 B 内部槽）仍会卡死**：SortableJS 对"容器套容器"的嵌套列表拖拽有已知冲突。M4 决策：**容器节点（isContainer）打 `data-nodrag` 排除在画布拖拽外**，排序走大纲/工具按钮；非容器节点画布排序/跨容器移动全通。这是计划中"先平铺、再嵌套"风险对策的落地，嵌套容器画布拖拽记为 M5 之后的可选进阶（换 dnd-kit 或深入 Sortable 嵌套配置）。

### M5 · 属性面板 + setter 体系（2026-10-09）

**做了什么**：8 个 setter（text/number/boolean/select/color/array/object/json）按 `SetterDescriptor → 组件` 注册表装配；PropRow（一行属性 = setter 控件 + 「字面量 ⇄ 绑定」切换 + 绑定模式实时求值预览红点）；PropPanel 由 `configure.props` 自动生成表单（分组）。**"一份 meta 驱动四件事"的第 4 件事落地：加物料、加属性只改 meta，面板代码零改动。**

**验证方式**（Playwright）：
- 点按加 Button → 面板自动渲染 6 个字段（文案/类型/尺寸/朴素/圆角/禁用）
- SelectSetter 选"危险" → 画布按钮立即变 `el-button--danger`
- TextSetter 改文案 → 画布按钮文字立即变；撤销一次 → 还原「按钮」
- 零 JS 错误

**关键设计**：
- setter 契约 = 受控组件 `{ config, value, onChange }`；绑定模式由 PropRow 层拦截（不污染 setter 组件本身）。
- `setNodeProp` 用 `mergeKey: prop:{id}:{key}` 把同字段连续编辑合并成一个 undo 步骤（打字不刷屏历史）；patchStack 只合并"连续同键"步骤，天然不会串字段。

**小坑（1 个）**：
> **注册类模块必须被 import 才会执行**。`setters/index.ts` 负责把组件挂进 SetterRegistry，但没有任何文件 import 它 → 注册表空 → 属性面板 setter 渲染区一片空白（只有 `<!---->` 注释节点）。修法：PropRow 里加一行 `import '@/editor/setters'` 副作用导入，并注释说明。这类"注册即副作用"的模块，要么在 main.ts 显式 import，要么在消费方 import，绝不要指望死代码消除之外的魔法。

### M6 · undo/redo + 持久化（2026-10-09）

**做了什么**：undo/redo 在 M3/M4 已前置落地（patchStack + 工具栏按钮 + Ctrl/Cmd+Z/Y/Shift+Z）；M6 补齐**持久化**——localStorage 防抖自动保存（400ms）、启动时恢复草稿（校验失败丢弃）、工具栏"● 未保存 / ✓ 已保存 HH:MM:SS"指示、新建页 ElMessageBox 二次确认。

**验证方式**（Playwright，同一个 browser context 内刷新）：
- 改文本属性 → 保存指示变 `✓ 已保存 15:41:46`（防抖生效）
- `page.reload()` → 画布文本恢复「持久化验证文本」→ **草稿 round-trip 闭环** ✓
- 零 JS 错误

**关键设计**：
- **持久化 = 序列化一棵不可变树**：schema 是纯数据（这也正是 schema 优于代码的地方），直接 JSON 存 localStorage；加载时过 validateSchema 防脏数据。key 带 `v1` 后缀留协议升级余地。
- autosave 走"所有写之后 scheduleSave"的单一入口（commit/undo/redo/loadSchema 都调用），不需要 watch schema 深度比较。

**遗留说明**：预览模式（AppRuntime）M3 已能跑；M6 未做的是"多页面/路由"与"导出完整工程"，记入文档开放主题。

### M7 · 数据绑定与表达式（jsep，2026-10-09）

**做了什么**：把 M1 的简易求值器替换成完整版——`jsep` 解析（仅 `算子` 扩展 `??`）+ **自研 AST 手工求值器**（`evaluator.ts` 逐个节点 switch）；沙箱双清单（`MEMBER_BLACKLIST` 成员访问黑名单 + `safeFns` 函数白名单 + 数据方法调用 `METHOD_BLACKLIST`）；DataPanel 完整版（state JSON 编辑应用 + dataSource 行编辑）；PropRow 绑定模式实时求值预览升级成完整表达式。

**验证方式**：
- 单测 47 个全过，新增覆盖：优先级 `1 + 2*3=7`、左结合、比较、**短路 `&&/||/??` 返回原值**、三元、模板内完整表达式 `{{state.count + 1}}`、白名单 `sum([1,2,3])`、数据方法 `state.items.join(',')`、黑名单 `__proto__`/`constructor` 拒绝、`toString/call/apply` 方法调用拒绝
- 浏览器：DataPanel 改 `greeting` → 画布实时变「M7你好」；绑定 `state.form.vip ? 'VIP 客户' : '普通客户'` → 预览「普通客户」→ 画布渲染「普通客户」，零 JS 错误

**关键设计**：
- **安全栈**：无 eval / 无 Function / 不触碰原型链 → 表达式本身无法越权；再加两道清单——成员访问黑名单（`obj[key]` 逐层校验）+ 调用白名单（函数只能 `safeFns`，数据方法走方法黑名单拦截元编程门把手）。这是"AST 求值比 eval 安全"的完整教学实例。
- **作用域 = Scope 自身键**（hasOwnProperty 严格限定），`constructor`/`__proto__` 从根上碰不到。
- 求值器输出契约（纯文本回传 / 错误抛出）由 evaluator.spec.ts 锁定，M1 的行为在 M7 无缝升级。

**踩过的坑**：
1. `looksLikeExpression` 最初太保守（运算符集合漏了 `%`、裸标识符 `item`/`true` 没算表达式）→ `7 % 3` 按纯文本返回、`{{item}}` 不插值。修法：裸标识符/数字/引号字面量直接算表达式，带运算符才要字符集判定。
2. jsep 的 `Expression` 是联合类型，直接 `node as X` 强转报 TS2352——全部改 `as unknown as X`。

### M8 · 事件动作系统（2026-10-09）

**做了什么**：动作注册表（`registerAction/getAction/listActions`）+ 执行器（`executeChain`：顺序执行 + `condition` 条件放行 + `outputVar` 写 `event.data` 共享内存 + `ignoreError` 容错）；6 个内置动作（updateState/toast/confirm/openUrl/fetch/reloadDataSource，参数用 `argDefs: PropConfig` 驱动表单）；RuntimeApi 工厂（设计态 no-op / 预览态真实：ElMessage/ElMessageBox/fetch）；EventPanel 完整版（选事件 → 配动作链 → 动作参数自动表单 → 条件/输出变量）；AppRuntime 组装 ActionContext 交给 executor。

**验证方式**：
- 单测 10 个（55 全过）：顺序执行、condition 放行、未注册动作跳过不中断、updateState 表达式自增 + 纯文本原样 + 点路径嵌套写、outputVar 写共享内存、fetch 写回 state、ignoreError 吞错
- 浏览器闭环：EventPanel 配 `click → toast(恭喜，操作成功！)` → 预览点击按钮 → **toast 弹出**，零 JS 错误

**关键设计**：
- **动作 = 平台注册表能力**（amis registerAction 同款），事件只声明"动作链数据"，语义可序列化、可审计。
- **参数求值约定**：args 值是字符串 → `evalExpr`（表达式/纯文本双语义由 M7 求值器统一处理）；键名支持点路径（`user.name` → 嵌套写）。
- **RuntimeApi 解耦**：动作不 import Element Plus，只依赖接口；设计态 no-op、预览态真实——画布点按钮"选中"而不弹窗的本质。

**排查实录（值得记）**：
- EventPanel 初始写法 `setNodeOnEvent` 把"空数组 = 删除事件"当作同一语义 → 添加空事件立刻被删（"事件（0）"永不变化）。教训：**"设置"和"删除"是两个语义，别用一个信号兼职**。
- 怀疑点击事件不触发时先加了 debug 打点（onEvent 有进、executor 有出）——发现动作**执行正常**，只是"＋ 添加动作"默认加的是注册表第一个动作 updateState 而不是 toast，测试脚本假设错了。**机制用打点确认，别猜**。
- 预览态验证要手动 dispatch 原生 click（Playwright 的 `.click()` 换过元素仍可疑），`MouseEvent('click', {bubbles:true})` 直接打在按钮上再断言 `.el-message` 出现。

**遗留说明**：confirm 返回值经 outputVar 供下游做条件判断的完整示例可放进 demo；`custom` 脚本动作（amis 逃生舱）记为进阶扩展。

### M9 · 数据源 + 出码（Vue SFC）+ 收尾（2026-10-09）

**做了什么**：声明式数据源运行时（AppRuntime `onMounted` 拉取 isInit 项 → 写 `state[dataField]`，`/mock/staff.json`）；出码模块 `core/codegen/vue-codegen.ts`（组件映射表 + 属性双态还原 + `v-model` 左值逐字还原 + v-if/v-for 包裹 + scopedChildren 插槽 + 动作链转 async 函数 + import 聚合 + 事件函数收集）；Toolbar「出码 .vue」按钮（复制剪贴板 + 下载）；codegen 结构单测。

**验证方式（三层）**：
1. 单测 57 全过（codegen 结构断言：v-model 还原 / scoped 插槽 / v-for / action 函数 / 数据源 init / import 聚合）
2. **真实编译**：把出码 SFC 放进独立 vite 工程（`_gen-scratch`）`npx vite build` → `✓ 1580 modules transformed, built in 222ms`（"出码结果可编译"验收达成，验证后已清理）
3. 浏览器：DataPanel 添加数据源 `/mock/staff.json` → 预览态表格自动填充 **「王五 35 在职 / …」共 3 行**（数据源 + 绑定 + scoped 单元格整链）；出码按钮 → 剪贴板完整 SFC（需 `clipboard-read` 权限，无权限自动转下载）

**关键设计**：
- **出码 = 渲染引擎的同一次遍历、换 emit 产物**：genNode(node, depth, ctx) 递归 + import 收集 + 事件函数收集，与 SchemaNode 递归一一对应——这是"运行时渲染 vs 出码"两条通道共享一棵 schema 的核心。
- **textProp 用 Vue 模板语法、attr 用 JS 表达式**：文本内容直接用原始 `{{ }}` 插值（Vue 原生语法）；属性/绑定还原成 `:attr="..."` / `v-model="..."`（v-model 是 Vue 出码比 React 表达力更好的地方）。

**踩坑**：
1. textProp 一开始用 JS 反引号模板串（`${expr}`），但 Vue 模板的**文本插值**只认 `{{ }}`——反引号会当纯文本渲染。属性和文本是两种语法。出码结构单测先于浏览器发现（断言 `{{row.status}}`）。
2. 出码产物 import 里曾混入 `ElText`（无此组件）——组件映射表是出码安全的边界之一，测试里扫过 import 集合断言。