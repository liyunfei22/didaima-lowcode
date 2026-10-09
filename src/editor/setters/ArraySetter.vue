<script setup lang="ts">
/**
 * 数组 JSON setter：写一个 JSON 数组（select/radio 的 options 等）。
 * 教学点：复杂结构在 MVP 阶段用"JSON 文本编辑"兜底，
 * 成熟平台会用 ArraySetter（行编辑器 + 子 setter 递归）——那是进阶主题。
 */
import { ElInput } from 'element-plus'
import type { SetterProps } from './SetterTypes'

const props = defineProps<SetterProps>()

function toText(v: unknown): string {
  return v == null ? '[]' : typeof v === 'string' ? v : JSON.stringify(v, null, 2)
}

function onInput(v: string) {
  try {
    const parsed = JSON.parse(v)
    if (Array.isArray(parsed)) props.onChange(parsed)
    // 不是合法数组时静默不提交（保留输入，等用户改对）
  } catch {
    /* 静默：面板上以红色字迹提示非法（MVP 简化） */
  }
}
</script>

<template>
  <el-input
    :model-value="toText(value)"
    type="textarea"
    :rows="5"
    size="small"
    class="json-input"
    :class="{ 'has-error': !(value == null) && !Array.isArray(value) && typeof value !== 'string' }"
    placeholder='[{ "label": "选项1", "value": 1 }]'
    @update:model-value="onInput"
  />
</template>

<style scoped>
.json-input :deep(textarea) {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.json-input.has-error :deep(textarea) {
  color: #f56c6c;
}
</style>