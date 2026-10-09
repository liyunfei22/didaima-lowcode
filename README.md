# didaima · 教学级低代码平台

> 从一个空目录开始，**亲手实现覆盖全部核心原理的低代码平台**，每行代码有中文注释，配学习文档，对照业界开源实现（lowcode-engine / amis / craft.js）讲解。

"didaima" = 低代码（dī dài mǎ）拼音。

## 快速开始

```bash
npm install
npm run dev      # 打开 http://localhost:5173
```

## 你要学到的内容（7 大子系统）

1. **DSL 协议**：一份描述页面的 schema（组件树 + 属性 + 数据 + 事件），一切从它开始
2. **渲染引擎**："JSON 进、页面出"的运行时渲染器（递归 + 注册表 + 作用域链）
3. **可视化编辑器**：三面板编辑器（物料面板 / 画布 / 属性面板），拖拽搭建
4. **物料体系**：一份 meta 同时驱动 物料面板 / 画布渲染 / 拖拽约束 / 属性面板（lowcode-engine 精髓）
5. **数据绑定与表达式**：`{{ }}` 求值器（jsep 解析 + 自研 AST 求值器 + 沙箱）
6. **事件动作编排**：amis 风格的「事件 → 动作链」声明式逻辑
7. **出码 vs 运行时渲染**：schema 一键生成 Vue SFC 源码

## 目录导航

| 路径 | 内容 |
|---|---|
| `docs/research/` | 调研文档：平台全景 / 核心原理 / 参考资料清单 |
| `docs/architecture.md` | 架构设计：协议定义 + 逐条对照业界的取舍理由 |
| `docs/implementation-notes.md` | 实现笔记：原理 + 对照 + 踩坑（随里程碑滚动） |
| `src/core/` | 框架无关的核心原理层（纯 TS） |
| `src/renderer/` | 渲染引擎 |
| `src/editor/` | 可视化编辑器（状态 / 画布 / 面板 / setter） |
| `src/materials/` | 物料：Element Plus 的适配层 + meta |
| `src/runtime/` | 运行时渲染入口（预览） |

## 技术栈

Vue 3 + TypeScript + Vite · Pinia · immer · jsep · SortableJS · Element Plus

选型与理由见 `docs/architecture.md` §8。

## 里程碑

M0 调研+骨架 ✅ → M1 协议+渲染引擎 ✅ → M2 物料体系 ✅ → M3 编辑器骨架 ✅ → M4 拖拽系统 ✅ → M5 属性面板+setter ✅ → M6 undo/redo+持久化 ✅ → M7 数据绑定与表达式 ✅ → M8 事件动作系统 ✅ → M9 数据源+出码 ✅

## 目前能做到什么（M9 完成验收）

- **三面板可视化编辑器**：物料面板拖入/点按添加、画布点选/删除/复制/上移下移、大纲树联动、属性面板由物料 meta 自动生成（setter 体系 + 字面量⇄表达式切换）、undo/redo（补丁栈）、localStorage 自动保存、JSON 导入导出
- **数据绑定**：`{{ }}` 模板插值 + 完整表达式（jsep 解析 + 自研 AST 沙箱求值），condition / loop 渲染
- **事件动作**：amis 式声明式动作链（updateState / toast / confirm / openUrl / fetch / reloadDataSource），预览态真实执行
- **数据源**：声明式取数（isInit 自动请求 → 写 state）
- **出码**：schema → Vue SFC 一键生成，产物已在独立 vite 工程真实编译通过（`vite build ✓`）

## 测试

```bash
npm test          # 57 个 vitest 单测（树操作/求值器/历史栈/动作执行器/出码结构）
npm run build     # vue-tsc 类型检查 + vite 构建
npm run dev       # 打开编辑器，localhost:5173
```

学习路线：先读 `docs/research/01·02·03`（调研结论），再看 `docs/architecture.md`（架构取舍），实现细节跟 `docs/implementation-notes.md`（每里程碑的原理+对照+踩坑）。