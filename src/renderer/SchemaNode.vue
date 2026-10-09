<script setup lang="ts">
/**
 * ============================================================
 * 子系统 ②：渲染引擎 —— SchemaNode 递归渲染组件
 * ============================================================
 * 一颗 schema 树 = 一层层 SchemaNode：每个节点
 *   1. 求 condition（假则不渲染，v-if）
 *   2. 求 loop（数组则包 v-for，每项注入 item/index 后重新渲染自己）
 *   3. 查注册表拿组件，v-bind 解析后的 props、v-on 绑定事件监听器
 *   4. children 逐个递归（默认插槽 + 具名 scoped 插槽统一到一个 #default 里）
 *
 * 与 craft.js / amis 的对应：
 *   - craft.js Frame 组件递归 node tree + resolver 出组件
 *   - amis 的 Renderer 递归 JSON + type 查注册表
 * 编辑态（拖拽/选中）由 editor/canvas/CanvasNode.vue 另套一层壳——渲染引擎保持纯净。
 */

import { computed } from 'vue'
import type { SchemaNode } from '@/core/schema/types'
import type { Scope } from '@/core/expression/evaluator'
import {
  childScope,
  resolveCondition,
  resolveLoopItems,
  resolveRender,
  type RuntimeHandlers,
} from './renderer'

const props = defineProps<{
  node: SchemaNode
  /** 本节点渲染时所在作用域（父级算好传入） */
  scope: Scope
  /** 事件/双向绑定处理器的运行时入口（预览态由 runtime 注入，设计态由编辑器注入） */
  handlers?: RuntimeHandlers
}>()

/** loop 摘除后的节点副本：循环展开时以它为"骨架"重复渲染，避免死递归 */
const innerNode = computed<SchemaNode>(() => (props.node.loop ? { ...props.node, loop: undefined } : props.node))

/** 条件渲染 */
const pass = computed(() => resolveCondition(props.node, props.scope))

/** 循环数据（null 表示该节点没有 loop） */
const loopItems = computed<unknown[] | null>(() =>
  props.node.loop ? resolveLoopItems(props.node, props.scope) : null,
)

/** 最终渲染解析：组件 + props + 监听器（不含 children，children 在模板里走插槽） */
const resolved = computed(() => resolveRender(innerNode.value, props.scope, props.handlers))

/** 本节点渲染了子节点？（决定是否渲染默认插槽） */
const hasChildren = computed(() => (props.node.children?.length ?? 0) > 0)
</script>

<template>
  <!-- ① condition：假 → 不渲染 -->
  <template v-if="pass">
    <!-- ② loop：数组 → 展开，每项注入 item/index 作用域再渲染同一节点骨架 -->
    <template v-if="loopItems !== null">
      <SchemaNode
        v-for="(item, index) in loopItems"
        :key="node.id + ':' + index"
        :node="innerNode"
        :scope="childScope(scope, { item, index })"
        :handlers="handlers"
      />
    </template>

    <!-- ③ 常规渲染：注册表组件 + 解析后的 props/事件 -->
    <component
      v-else
      :is="resolved.comp"
      v-bind="resolved.attrs"
      v-on="resolved.listeners"
    >
      <!--
        ④ children → 默认插槽。
        教学点：无论容器（Card/Page，插槽无作用域）还是 scoped 插槽（TableColumn，
        插槽带 { row }），统一用 #default="slotProps" 接收；slotProps 为空则作用域不变。
        amis 数据链就在这一层"逐层叠作用域"。
      -->
      <template v-if="hasChildren" #default="slotProps">
        <SchemaNode
          v-for="child in node.children"
          :key="child.id"
          :node="child"
          :scope="childScope(scope, slotProps)"
          :handlers="handlers"
        />
      </template>
    </component>
  </template>
</template>