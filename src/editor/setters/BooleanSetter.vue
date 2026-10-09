<script setup lang="ts">
/** 布尔 setter：开关（true/false） */
import { ElSwitch } from 'element-plus'
import type { SetterProps } from './SetterTypes'

defineProps<SetterProps>()
</script>

<template>
  <el-switch
    :model-value="Boolean(value)"
    size="small"
    @update:model-value="(v: boolean | string | number) => onChange(Boolean(v))"
  />
</template>