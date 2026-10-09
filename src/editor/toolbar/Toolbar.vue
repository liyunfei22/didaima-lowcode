<script setup lang="ts">
/**
 * ============================================================
 * 子系统 ③：编辑器工具栏（Toolbar）
 * ============================================================
 * 撤销/重做（M3 已可用，patchStack 前置接入）、新建/导出/导入、
 * 设计 ↔ 预览模式切换。
 */

import { useEditorStore } from '../store/editor'
import { ElButton, ElDivider, ElMessage, ElMessageBox, ElSegmented } from 'element-plus'
import { generateVueFile } from '@/core/codegen/vue-codegen'

const store = useEditorStore()

/** 新建页：先确认（自动保存会覆盖草稿，防止误点丢稿） */
async function onNewPage() {
  try {
    await ElMessageBox.confirm('新建页面会清空当前画布（自动保存的草稿会被覆盖），确定？', '提示', {
      confirmButtonText: '新建',
      cancelButtonText: '取消',
      type: 'warning',
    })
    store.newPage()
    ElMessage.success('已新建空白页面')
  } catch {
    /* 用户取消 */
  }
}

/** 导出 JSON：生成并下载 .json 文件 */
function onExport() {
  const text = store.exportJson()
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.schema.fileName ?? 'page'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

/** 导入 JSON：走隐藏 file input 读取 */
function onImportClick() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'application/json,.json'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const text = await file.text()
    const result = store.importJson(text)
    if (result.ok) ElMessage.success('导入成功')
    else ElMessage.error(result.errors?.join('；') ?? '导入失败')
  }
  input.click()
}

/** 出码（M9）：schema → Vue SFC，复制 + 下载 */
async function onCodegen() {
  const code = generateVueFile(store.schema)
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('Vue SFC 已复制到剪贴板')
  } catch {
    ElMessage.info('复制失败，已改为下载文件')
  }
  const blob = new Blob([code], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${store.schema.fileName ?? 'page'}.vue`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <header class="toolbar">
    <div class="toolbar-logo">
      <span class="logo-mark">◧</span>
      <b>didaima</b>
    </div>
    <div class="toolbar-page">{{ store.schema.title ?? '未命名页面' }}</div>

    <!-- 保存状态（M6 自动保存） -->
    <span class="save-state" :class="{ 'is-dirty': store.dirty, 'is-saved': !store.dirty }">
      {{ store.dirty ? '● 未保存' : store.savedAt ? `✓ 已保存 ${store.savedAt}` : '—' }}
    </span>

    <div class="toolbar-actions">
      <el-button size="small" :disabled="!store.history.canUndo()" @click="store.undo()">撤销</el-button>
      <el-button size="small" :disabled="!store.history.canRedo()" @click="store.redo()">重做</el-button>
      <el-divider direction="vertical" />
      <el-button size="small" @click="onNewPage">新建页</el-button>
      <el-button size="small" @click="onExport">导出</el-button>
      <el-button size="small" @click="onImportClick">导入</el-button>
      <el-button size="small" type="primary" plain @click="onCodegen">出码 .vue</el-button>
      <el-divider direction="vertical" />
      <el-segmented
        :model-value="store.mode"
        :options="[
          { label: '设计', value: 'design' },
          { label: '预览', value: 'preview' },
        ]"
        @update:model-value="(v: 'design' | 'preview') => (store.mode = v)"
      />
    </div>
  </header>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 14px;
  height: 44px;
  padding: 0 14px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}
.toolbar-logo {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
}
.logo-mark {
  color: #409eff;
}
.toolbar-page {
  font-size: 13px;
  color: #606266;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.save-state {
  font-size: 12px;
}
.save-state.is-dirty {
  color: #e6a23c;
}
.save-state.is-saved {
  color: #67c23a;
}
.toolbar-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>