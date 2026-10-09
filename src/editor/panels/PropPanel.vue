<script setup lang="ts">
/**
 * ============================================================
 * 子系统 ③/④：属性面板（PropPanel）—— M5 自动生成版
 * ============================================================
 * 核心教学点（lowcode-engine 精髓）：
 *   「一份 meta.configure.props 驱动四件事」的第 4 件 —— 属性面板 0 代码自动生成。
 *   PropPanel 只做两件事：
 *     1. 拿到选中节点的物料 meta
 *     2. 遍历 configure.props，逐项渲染 PropRow（setter 控件 + 字面量/绑定切换）
 *   加新物料、加新属性都只需要改物料 meta，面板代码一行不用动。
 *
 * 另：显示名（节点 title）是"节点级字段"而非 props，这里单独给一个输入，
 * 它驱动画布 tooltip / 大纲树的显示名。
 */

import { computed } from 'vue'
import { ElInput } from 'element-plus'
import { useEditorStore } from '../store/editor'
import { materialRegistry } from '@/core/material/registry'
import { findById } from '@/core/schema/tree'
import type { PropConfig } from '@/core/material/types'
import type { PropValue } from '@/core/schema/types'
import PropRow from './PropRow.vue'

const store = useEditorStore()

const selected = computed(() => store.getSelected())
const meta = computed(() => (selected.value ? materialRegistry.getMeta(selected.value.node.componentName) : null))

/** 配置属性按 group 分组（meta 里没写 group 的归"通用"） */
const propGroups = computed<{ group: string; props: PropConfig[] }[]>(() => {
  const configs = meta.value?.configure.props ?? []
  const byGroup = new Map<string, PropConfig[]>()
  for (const c of configs) {
    const g = c.group ?? '通用'
    if (!byGroup.has(g)) byGroup.set(g, [])
    byGroup.get(g)!.push(c)
  }
  return [...byGroup.entries()].map(([group, props]) => ({ group, props }))
})

function getProp(name: string): PropValue | undefined {
  return selected.value?.node.props?.[name]
}

function onPropChange(key: string, value: PropValue) {
  if (!selected.value) return
  // mergeKey：同一字段连续编辑合并成一个 undo 步骤（打字不刷屏历史）
  store.setNodeProp(selected.value.node.id, key, value)
}

/** 显示名：节点字段（title），不是 props —— 单独处理 */
function onTitleInput(value: string) {
  if (!selected.value) return
  store.commit(
    (draft) => {
      const target = findById(draft, selected.value!.node.id)
      if (target) target.node.title = value || undefined
    },
    { mergeKey: `title:${selected.value!.node.id}` },
  )
}
</script>

<template>
  <div class="panel prop-panel">
    <div class="panel-title">属性</div>
    <div class="panel-scroll">
      <!-- 未选中 -->
      <div v-if="!selected" class="prop-empty">
        未选中组件<br />点击画布中的节点来编辑它的属性
      </div>

      <!-- 已选中 -->
      <template v-else>
        <div class="prop-head">
          <span class="prop-icon">{{ meta?.icon ?? '▢' }}</span>
          <b>{{ meta?.title }}</b>
          <code class="prop-comp">{{ selected.node.componentName }}</code>
        </div>

        <!-- 显示名（节点字段） -->
        <div class="prop-field">
          <label class="prop-label">显示名</label>
          <el-input :model-value="selected.node.title ?? ''" size="small" clearable @update:model-value="onTitleInput" />
        </div>

        <!-- configure.props 自动生成的属性表单 -->
        <div v-for="g in propGroups" :key="g.group" class="prop-section">
          <div class="prop-group-title">{{ g.group }}</div>
          <PropRow
            v-for="p in g.props"
            :key="p.name"
            :config="p"
            :value="getProp(p.name)"
            :scope="store.designScope"
            @change="(v) => onPropChange(p.name, v)"
          />
        </div>

        <!-- 容器提示 -->
        <div v-if="meta?.isContainer" class="prop-tip-box">这是一个容器，可拖入/排序子组件</div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.prop-empty {
  color: #909399;
  font-size: 13px;
  line-height: 1.8;
  padding: 20px 0;
  text-align: center;
}
.prop-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.prop-icon {
  font-size: 16px;
}
.prop-comp {
  margin-left: auto;
  font-size: 11px;
  background: #f4f4f5;
  padding: 2px 6px;
  border-radius: 3px;
  color: #606266;
}
.prop-field {
  margin-bottom: 8px;
}
.prop-label {
  display: block;
  font-size: 12px;
  color: #606266;
  margin-bottom: 6px;
}
.prop-section {
  border-top: 1px solid #f0f0f0;
  margin-top: 10px;
  padding-top: 4px;
}
.prop-group-title {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  margin: 8px 0 0;
}
.prop-tip-box {
  margin-top: 12px;
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 8px 10px;
}
</style>