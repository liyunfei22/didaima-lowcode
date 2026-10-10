---
layout: home

hero:
  name: didaima
  text: 教学级低代码平台
  tagline: 从调研到实现的完整旅程：7 大子系统 · 18 个物料 · 57 个单测 · 出码可编译
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 先读调研
      link: /research/01-platform-overview

features:
  - title: 调研先行 🔍
    details: 六类主流平台全景（Retool/Appsmith/Mendix/amis/lowcode-engine…）、7 大子系统原理、36+ 条核实过的资料清单——先搞懂「低代码到底在做什么」，再动手。
  - title: 亲手实现 🛠️
    details: DSL 协议 / 渲染引擎 / 可视化编辑器 / 物料体系 / 数据绑定与表达式 / 事件动作编排 / 出码，7 个子系统全部自研、中文注释、对照业界开源实现讲解。
  - title: 运行可验证 ✅
    details: Vue 3 + TS + Vite 实现的三面板编辑器可直接使用；57 个单测守住行为契约；schema 一键出码成 Vue SFC，已在独立 vite 工程真实编译通过。
---

## 你将在源码里看到什么

用 **一份 schema 同时驱动 渲染/编辑/物料/出码** 的声明式体系（lowcode-engine 的核心）；
**数据链 + 表达式 + 动作链** 的表达力（amis 的核心）；
把拖拽、编辑等一切交互**降维成对一棵树的纯函数操作**（craft.js 的核心）。

```jsonc
{
  "componentName": "Button",
  "props": { "text": "点击 {{state.count}} 次" },
  "onEvent": { "click": [{ "actionType": "updateState", "args": { "count": "state.count + 1" } }] }
}
```

## 文档地图

| 栏目 | 内容 |
|---|---|
| **调研** | `01` 平台全景（六大类平台 + 架构对比 + 原理结论）· `02` 核心原理（7 大子系统 + 实现技术）· `03` 资料清单 |
| **架构** | 自有 Schema 协议定义、8 段 Vue 生态取合理由、风险登记簿 |
| **实现笔记** | M0–M9 每个里程碑：做了什么 / 怎么验证 / 关键设计 / 踩过的坑 |

源码同步维护于 [github.com/liyunfei22/didaima-lowcode](https://github.com/liyunfei22/didaima-lowcode)。