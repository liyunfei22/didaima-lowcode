<script setup lang="ts">
/**
 * ============================================================
 * 属性行（PropRow）：一行属性 = setter 控件 + 「字面量 ⇄ 绑定」切换
 * ============================================================
 * 这是"属性双态"（字面量 | {type:'binding'}）在 UI 上的呈现：
 *   - 字面量模式：按 setter 描述符查 SetterRegistry 渲染录入控件
 *   - 绑定模式：textarea 编辑表达式 + 实时求值预览（tryEvaluate 红点）
 * 绑定求值预览用设计态作用域（schema.state 默认值）——M7 会把它升级成
 * 完整表达式编辑器，这里是好用的第一阶段。
 */

import { computed, ref, watch } from 'vue'
import { ElInput } from 'element-plus'
// ⚠️ 副作用导入：setters/index.ts 把各 setter 组件注册进 SetterRegistry，
// 不 import 这个模块，注册表永远是空的（M5 踩坑：setter 渲染区空白）。
import '@/editor/setters'
import { SetterRegistry } from '@/editor/setters/SetterTypes'
import type { SetterProps } from '@/editor/setters/SetterTypes'
import type { PropConfig } from '@/core/material/types'
import type { PropValue } from '@/core/schema/types'
import { isBinding } from '@/core/schema/types'
import { tryEvaluate } from '@/core/expression/evaluator'
import type { Scope } from '@/core/expression/evaluator'

const props = defineProps<{
  config: PropConfig
  value: PropValue | undefined
  /** 绑定模式实时预览用的设计态作用域 */
  scope: Scope
  onChange(v: PropValue): void
}>()

/** 当前处于绑定模式？ */
const bindingMode = ref(false)
watch(
  () => props.value,
  (v) => {
    bindingMode.value = isBinding(v)
  },
  { immediate: true },
)

/** 绑定模式下的编辑缓冲（避免每个字符都提交历史） */
const bindingDraft = ref('')
watch(
  () => (isBinding(props.value) ? (props.value as { value: string }).value : ''),
  (v) => {
    bindingDraft.value = v
  },
  { immediate: true },
)

/** 实时求值结果：ok → 值；error → 描述 */
const preview = computed(() => {
  const expr = bindingDraft.value.trim()
  if (!expr) return { ok: true as const, value: '(空表达式)' }
  return tryEvaluate(expr, props.scope)
})

function enterBindingMode() {
  bindingMode.value = true
  bindingDraft.value = isBinding(props.value) ? (props.value as { value: string }).value : ''
}

/** 退出绑定模式：写式子面量（把当前求值结果落下成常量） */
function exitBindingMode() {
  bindingMode.value = false
  if (preview.value.ok) props.onChange(preview.value.value as PropValue)
}

function onBindingCommit() {
  props.onChange({ type: 'binding', value: bindingDraft.value })
}

/** 字面量 setter 的 props（绑定模式下组件隐藏，不渲染） */
const setterProps: SetterProps = {
  config: props.config,
  value: props.value,
  onChange: props.onChange,
}

/** "切换为绑定"按钮的文案：{{ }} —— 放 script 里避免模板双大括号冲突 */
const bindBadge = '{{ }}'
</script>

<template>
  <div class="prop-row">
    <label class="prop-label" :title="config.tip">
      {{ config.label }}
      <span v-if="isBinding(value)" class="prop-bind-tag">绑定</span>
    </label>

    <!-- 绑定模式：表达式编辑 + 实时预览 -->
    <div v-if="bindingMode" class="bind-mode">
      <div class="bind-edit">
        <el-input
          v-model="bindingDraft"
          type="textarea"
          :rows="3"
          size="small"
          class="bind-input"
          placeholder="例如 state.count + 1"
          @blur="onBindingCommit"
          @keydown.ctrl.enter.prevent="onBindingCommit"
          @keydown.meta.enter.prevent="onBindingCommit"
        />
        <div class="bind-preview" :class="{ 'bind-error': !preview.ok }">
          <span class="bind-preview-label">{{ preview.ok ? '预览' : '错误' }}</span>
          <code>{{ preview.ok ? String(preview.value) : preview.error.message }}</code>
        </div>
      </div>
      <button class="bind-toggle" title="切换为常量" @click="exitBindingMode">#</button>
    </div>

    <!-- 字面量模式：查注册表渲染 setter 控件 -->
    <div v-else class="literal-mode">
      <component :is="SetterRegistry[config.setter as keyof typeof SetterRegistry] ?? SetterRegistry.text" v-bind="setterProps" :key="config.name" />
      <button class="bind-toggle bind-toggle-exp" title="切换为表达式绑定" @click="enterBindingMode">{{ bindBadge }}</button>
    </div>

    <div v-if="config.tip" class="prop-tip">{{ config.tip }}</div>
  </div>
</template>

<style scoped>
.prop-row {
  padding: 8px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.prop-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #606266;
  margin-bottom: 6px;
}
.prop-bind-tag {
  background: #ecf5ff;
  color: #409eff;
  font-size: 10px;
  padding: 0 5px;
  border-radius: 3px;
}
.literal-mode {
  display: flex;
  align-items: center;
  gap: 6px;
}
.literal-mode > :deep(.el-select),
.literal-mode > :deep(.el-input-number),
.literal-mode > :deep(.el-input) {
  width: 100%;
}
.bind-mode {
  position: relative;
}
.bind-input :deep(textarea) {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.bind-preview {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: #67c23a;
}
.bind-preview-label {
  color: #909399;
  font-size: 11px;
  flex: none;
}
.bind-preview code {
  word-break: break-all;
}
.bind-preview.bind-error {
  color: #f56c6c;
  background: #fef0f0;
}
.bind-toggle {
  flex: none;
  border: none;
  background: #f0f2f5;
  color: #606266;
  border-radius: 4px;
  font-size: 11px;
  padding: 4px 7px;
  cursor: pointer;
  line-height: 1.2;
}
.bind-toggle:hover {
  background: #e6f1ff;
  color: #409eff;
}
.bind-toggle-exp {
  font-family: ui-monospace, monospace;
}
.prop-tip {
  margin-top: 4px;
  font-size: 11px;
  color: #c0c4cc;
  line-height: 1.5;
}
</style>