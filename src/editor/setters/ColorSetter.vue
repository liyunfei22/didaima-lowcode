<script setup lang="ts">
/** 颜色 setter：Element Plus 取色器（color 属性） */
import { ElColorPicker } from 'element-plus'
import type { SetterProps } from './SetterTypes'

defineProps<SetterProps>()
</script>

<template>
  <el-color-picker
    :model-value="(value as string) || undefined"
    size="small"
    @update:model-value="(v: string | null) => onChange(v ?? '#000000')"
  />
</template>