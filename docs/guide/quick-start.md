# 快速开始

didaima = 低代码的拼音，一个**教学级低代码平台**：从空目录开始，亲手实现覆盖全部核心原理的低代码平台，每行代码有中文注释，配学习文档，对照业界开源实现（lowcode-engine / amis / craft.js）讲解。

## 环境要求

- Node.js ≥ 18（建议 20+）
- 包管理器 npm

## 安装与运行

```bash
npm install          # 安装依赖
npm run dev          # 启动编辑器 → http://localhost:5173
```

打开编辑器后你会看到一份演示 schema 渲染出的页面（卡片 + 表单 + 表格 + 标签页）。左侧物料面板可**点按或拖拽**添加组件，中间画布点选组件，右侧属性面板由物料 meta 自动生成表单，改值即时生效。

## 常用脚本

| 命令 | 作用 |
|---|---|
| `npm run dev` | 启动低代码编辑器（Vite dev server） |
| `npm test` | 跑 57 个 vitest 单测（树操作 / 求值器 / 历史栈 / 动作执行器 / 出码结构） |
| `npm run build` | vue-tsc 类型检查 + vite 生产构建 |
| `npm run docs:dev` | 本站在本机预览（VitePress） |
| `npm run docs:build` | 构建文档站产物 |

## 最短的学习路线

1. **先读调研**：`docs/research/01·02·03` —— 知道低代码平台"是什么、业界怎么做"
2. **再看架构**：`docs/architecture.md` —— 我们自己的协议与每一个取舍决定
3. **跟实现笔记**：`docs/implementation-notes.md` —— M0→M9 全过程，每个里程碑"做了什么 / 怎么验证 / 踩的坑"
4. **读代码**：核心原理都在 `src/core/`（纯 TS、框架无关），渲染在 `src/renderer/`，编辑器在 `src/editor/`

## 技术栈

Vue 3 + TypeScript + Vite · Pinia（状态）· immer（不可变 + 补丁历史）· jsep（表达式解析）· SortableJS（拖拽）· Element Plus（UI + 物料底座）

选型理由见 [架构设计文档](/architecture)。

## 测试

```bash
npm test
```

单测既是行为契约也是教学材料——升级求值器后行为不变，全靠它们守住。