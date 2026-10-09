<script setup lang="ts">
/** 文本 setter：单行输入（字符串属性最常用的录入控件） */
import { ElInput } from 'element-plus'
import type { SetterProps } from './SetterTypes'

defineProps<SetterProps>()
</script>

<template>
  <el-input
    :model-value="(value as string) ?? ''"
    size="small"
    clearable
    @update:model-value="(v: string) => onChange(v)"
  />
</template>