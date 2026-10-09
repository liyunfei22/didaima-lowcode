# 03 · 参考资料清单

> 所有链接均为调研时经官方仓库/文档核实的一手资料（2026-10）。按"值得精读"排序。

## 精读（两张必看 + 一个框架）

### lowcode-engine（阿里）——协议与物料体系
- 主仓库（含三份协议文档 `docs/docs/specs/`）：https://github.com/alibaba/lowcode-engine
- 官网/文档：https://lowcode-engine.cn
- 搭建协议规范：https://github.com/alibaba/lowcode-engine/tree/main/docs/docs/specs（lowcode-spec.md / material-spec.md / assets-spec.md）
- 渲染模块设计：https://lowcode-engine.cn/site/docs/guide/design/renderer
- 物料协议 configure/setter：https://lowcode-engine.cn/site/docs/specs/material-spec
- 出码模块 code-generator：https://www.npmjs.com/package/@alilc/lowcode-code-generator

### amis（百度）——数据链 + 事件动作
- 主仓库：https://github.com/baidu/amis
- 事件动作（onEvent）文档：https://github.com/baidu/amis/blob/main/docs/zh-CN/concepts/event-action.md
- 数据域与数据链：https://github.com/baidu/amis/blob/main/docs/zh-CN/concepts/datascope-and-datachain.md
- 表达式文档：https://github.com/baidu/amis/blob/main/docs/zh-CN/concepts/expression.md
- amis-formula 源码：https://github.com/baidu/amis/tree/master/packages/amis-formula
- amis 在线文档：https://aisuda.github.io/amis-zh-CN/docs

### craft.js——编辑器范式（拖拽=树的纯函数操作)
- 官网/文档：https://craft.js.org/ 、https://craft.js.org/docs/user-components
- 仓库：https://github.com/prevwong/craft.js

## 国外平台（架构对比）

- Retool：https://retool.com/ 、docs：https://docs.retool.com/
- Appsmith（开源，最强参考）：https://github.com/appsmithorg/appsmith 、docs：https://docs.appsmith.com/
- Budibase：https://github.com/Budibase/budibase
- ToolJet：https://github.com/ToolJet/ToolJet
- Mendix：https://www.mendix.com/ 、docs：https://docs.mendix.com/
- OutSystems（codegen 样板）：https://www.outsystems.com/ 、success：https://success.outsystems.com/
- Power Apps / Power Fx：https://learn.microsoft.com/en-us/power-apps/maker/canvas-apps/getting-started 、https://learn.microsoft.com/en-us/power-platform/power-fx/overview 、Power-Fx 开源：https://github.com/microsoft/Power-Fx
- Bubble：https://bubble.io/ 、manual：https://manual.bubble.io/
- react-page：https://github.com/react-page/react-page

## 国内平台

- tmagic-editor（腾讯）：https://github.com/Tencent/tmagic-editor
- 爱速搭：https://aisuda.baidu.com
- 网易 CodeWave：https://www.cloudwave.com.cn
- 钉钉宜搭：https://www.aliwork.com
- 腾讯微搭：https://cloud.tencent.com/product/weda
- 阿里云魔笔：https://www.aliyun.com/product/mobi
- 简道云：https://www.jiandaoyun.com 、明道云：https://www.mingdao.com 、氚云：https://www.creaway.com.cn 、轻流：https://qingflow.com

## 实现技术

### 表达式
- jsep：https://github.com/EricSmekens/jsep
- expr-eval：https://github.com/silentmatt/expr-eval
- mathjs 表达式解析：https://github.com/josdejong/mathjs

### 拖拽
- SortableJS：https://github.com/SortableJS/Sortable
- dnd-kit：https://dndkit.com/ 、https://github.com/clauderic/dnd-kit
- react-dnd：https://github.com/react-dnd/react-dnd
- MDN Drag & Drop API：https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API
- 中点判定插入位算法参考：https://github.com/WebDevSimplified/Drag-and-Drop

### undo/redo
- immer patches 文档：https://immerjs.github.io/immer/patches/
- zundo（<700B 中间件，可抄 API）：https://github.com/charkour/zundo
- redux-undo（快照思想）：https://github.com/omnidan/redux-undo

### 表单/渲染（参考生态）
- react-jsonschema-form：https://github.com/rjsf-team/react-jsonschema-form
- Formily：https://github.com/alibaba/formily

## 说明
- 上表「lerche」曾出现在初版方案中：GitHub/npm 均无同名开源项目（全是无关仓库），已替换为 lowcode-engine code-generator。
- 平铺 URL 检索不了的信息（各 SaaS 内部架构）来自公开产品资料与行业对比，公开源码支撑较弱，重要结论以「开源引擎（lowcode-engine / amis / craft.js / Appsmith）」为准。