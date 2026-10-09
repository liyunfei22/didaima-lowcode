<script setup lang="ts">
/**
 * ============================================================
 * 子系统 ③：大纲树（OutlinePanel）
 * ============================================================
 * 树 = 递归。整个组件用自身递归渲染（SFC 里组件可以引用自己的文件名标签）。
 * 点击节点 → 选中（与画布高亮联动）；hover → 画布悬停高亮（M3 简化：仅选中联动）。
 */

import { useEditorStore } from '../store/editor'
import { materialRegistry } from '@/core/material/registry'
import type { SchemaNode } from '@/core/schema/types'

defineProps<{ node: SchemaNode; depth?: number }>()

const store = useEditorStore()

function displayName(node: SchemaNode): string {
  return node.title ?? materialRegistry.getMeta(node.componentName).title ?? node.componentName
}

function onNodeClick(nodeId: string) {
  store.selectNode(nodeId)
}
</script>

<template>
  <!-- 自身递归：children 继续渲染 <OutlinePanel>（SFC 隐式自引用） -->
  <div class="outline-node" :class="{ 'outline-selected': store.selectedId === node.id }">
    <div
      class="outline-row"
      :style="{ paddingLeft: `${(depth ?? 0) * 12 + 8}px` }"
      @click.stop="onNodeClick(node.id)"
    >
      <span class="outline-arrow" :class="{ 'is-leaf': !node.children?.length }">
        {{ node.children?.length ? '▾' : '·' }}
      </span>
      <span class="outline-name">{{ displayName(node) }}</span>
      <span class="outline-type">{{ node.componentName }}</span>
      <!-- 行操作：上移/下移/复制/删除（M4：画布拖不到的排序在这里兜底） -->
      <span class="outline-actions" @click.stop>
        <button class="oa" title="上移" :disabled="(depth ?? 0) === 0 && !node.id.includes('page')" @click="store.moveStep(node.id, -1)">↑</button>
        <button class="oa" title="下移" @click="store.moveStep(node.id, 1)">↓</button>
        <button class="oa" title="复制" @click="store.duplicateNode(node.id)">⧉</button>
        <button class="oa oa-danger" title="删除" :disabled="String(node.id).startsWith('page_')" @click="store.deleteNode(node.id)">✕</button>
      </span>
    </div>
    <template v-if="node.children?.length">
      <OutlinePanel v-for="child in node.children" :key="child.id" :node="child" :depth="(depth ?? 0) + 1" />
    </template>
  </div>
</template>

<style scoped>
.outline-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 6px;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  border-left: 2px solid transparent;
}
.outline-row:hover {
  background: #f5f7fa;
}
.outline-selected .outline-row {
  background: rgba(64, 158, 255, 0.1);
  border-left-color: #409eff;
}
.outline-arrow {
  color: #909399;
  width: 10px;
  flex: none;
}
.outline-name {
  color: #303133;
  flex: none;
}
.outline-type {
  color: #c0c4cc;
  font-size: 11px;
}
/* 行操作按钮：默认隐藏，悬停显示（画布拖不到的排序在这里兜底） */
.outline-actions {
  margin-left: auto;
  display: none;
  gap: 2px;
}
.outline-row:hover .outline-actions {
  display: flex;
}
.oa {
  border: none;
  background: transparent;
  color: #909399;
  font-size: 12px;
  line-height: 1;
  padding: 2px 3px;
  cursor: pointer;
  border-radius: 3px;
}
.oa:hover:not(:disabled) {
  background: #e6f1ff;
  color: #409eff;
}
.oa-danger:hover:not(:disabled) {
  background: #fef0f0;
  color: #f56c6c;
}
.oa:disabled {
  color: #dcdfe6;
  cursor: not-allowed;
}
</style>