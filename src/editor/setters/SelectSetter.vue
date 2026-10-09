<script setup lang="ts">
/**
 * 下拉 setter：选项来自物料 meta 里 PropConfig.options（select 属性）
 * —— 这里能看到"meta 声明 options → 面板直接变成下拉"的整条链路。
 */
import { ElOption, ElSelect } from 'element-plus'
import type { SetterProps } from './SetterTypes'

defineProps<SetterProps>()
</script>

<template>
  <el-select
    :model-value="(value as string | number) ?? undefined"
    size="small"
    clearable
    class="setter-select"
    @update:model-value="(v: string | number | boolean) => onChange(v)"
  >
    <el-option
      v-for="opt in config.options ?? []"
      :key="String(opt.value)"
      :label="opt.label"
      :value="opt.value as string | number"
    />
  </el-select>
</template>

<style scoped>
.setter-select {
  width: 100%;
}
</style>