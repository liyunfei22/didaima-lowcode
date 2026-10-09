<script setup lang="ts">
/** 对象 JSON setter（object/json 属性：如 Form 的 model、DatePicker 的 options 等） */
import { ElInput } from 'element-plus'
import type { SetterProps } from './SetterTypes'

const props = defineProps<SetterProps>()

function toText(v: unknown): string {
  if (v == null) return '{}'
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return ''
  }
}

function onInput(v: string) {
  try {
    const parsed = JSON.parse(v)
    if (parsed && typeof parsed === 'object') props.onChange(parsed)
  } catch {
    /* 非法 JSON 时静默保留编辑 */
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
    placeholder='{ "key": "value" }'
    @update:model-value="onInput"
  />
</template>

<style scoped>
.json-input {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
</style>