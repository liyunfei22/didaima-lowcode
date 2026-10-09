<script setup lang="ts">
/**
 * ============================================================
 * 子系统 ④：物料面板（MaterialPanel）
 * ============================================================
 * 由注册表按 group 驱动渲染 —— 不需要硬编码任何物料列表。
 * M4：拖拽（pull:'clone' 复制拖入画布）+ 保留点击添加。
 * 每个条目可拖，且带 data-material-id（Sortable 克隆时随元素带走，
 * 画布 onAdd 时据此判断是"新物料"还是"已有节点移动"）。
 */

import { useEditorStore } from '../store/editor'
import { materialRegistry } from '@/core/material/registry'
import { vDraggable, type DragEvents } from '../directives/draggable'

const store = useEditorStore()

const groups = materialRegistry.groups()

/** 分组英文名 → 中文标题（meta.group 用英文做 key，UI 用中文） */
const GROUP_LABELS: Record<string, string> = {
  layout: '布局',
  basic: '基础',
  form: '表单',
  data: '数据',
  action: '操作',
}

function groupLabel(key: string): string {
  return GROUP_LABELS[key] ?? key
}

/** 物料面板拖拽：只负责 begin/end（画布侧 onAdd 已经知道目标与位置） */
const dragEvents: DragEvents = {
  onStart() {
    store.beginDrag()
  },
  onEnd() {
    store.endDrag()
  },
}
</script>

<template>
  <aside class="panel material-panel">
    <div class="panel-title">物料</div>
    <div class="panel-scroll">
      <div v-for="g in groups" :key="g.group" class="mat-group">
        <div class="mat-group-title">{{ groupLabel(g.group) }}</div>
        <!-- v-draggable:material：pull:'clone'，条目可被"复制"拖进画布 -->
        <div v-draggable:material="dragEvents" class="mat-items">
          <div
            v-for="m in g.materials"
            :key="m.meta.componentName"
            class="mat-item"
            :data-material-id="m.meta.componentName"
            :title="`${m.meta.title} — ${m.meta.description ?? ''}`"
            @click="store.addMaterial(m.meta.componentName)"
          >
            <span class="mat-icon">{{ m.meta.icon ?? '▢' }}</span>
            <span class="mat-name">{{ m.meta.title }}</span>
          </div>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.material-panel {
  width: 220px;
  border-right: 1px solid #e4e7ed;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.mat-group {
  margin-bottom: 12px;
}
.mat-group-title {
  font-size: 12px;
  color: #909399;
  padding: 0 12px 6px;
}
.mat-items {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 0 12px;
}
.mat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 8px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #303133;
  transition: all 0.15s;
  user-select: none;
}
.mat-item:hover {
  border-color: #409eff;
  color: #409eff;
  background: rgba(64, 158, 255, 0.06);
}
.mat-icon {
  font-size: 14px;
}
.mat-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>