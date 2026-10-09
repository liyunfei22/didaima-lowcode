<script setup lang="ts">
/** 数字 setter：步进数字输入（number 属性） */
import { ElInputNumber } from 'element-plus'
import type { SetterProps } from './SetterTypes'

defineProps<SetterProps>()
</script>

<template>
  <el-input-number
    :model-value="(value as number) ?? undefined"
    size="small"
    :min="(config.setter as { props?: { min?: number } } | null)?.props?.min"
    :max="(config.setter as { props?: { max?: number } } | null)?.props?.max"
    controls-position="right"
    @update:model-value="(v: number | undefined) => onChange(v ?? 0)"
  />
</template>