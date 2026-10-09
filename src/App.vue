<script setup lang="ts">
/**
 * ============================================================
 * M3：编辑器外壳 —— 设计 / 预览 两视图 + 三面板布局
 * ============================================================
 * 设计态：左侧物料面板 / 中间画布 / 右侧属性·事件·数据页签
 * 预览态：AppRuntime 纯渲染（无编辑器壳，WYSIWYG）
 *
 * 教学点：编辑态与预览态消费同一棵 schema —— 这正是
 *   amis/tmagic 的"编辑态运行态同构"（preview = 真实渲染）。
 */

import { onMounted } from 'vue'
import { ElTabs, ElTabPane } from 'element-plus'
import { useEditorStore } from '@/editor/store/editor'
import Toolbar from '@/editor/toolbar/Toolbar.vue'
import MaterialPanel from '@/editor/panels/MaterialPanel.vue'
import CanvasViewport from '@/editor/canvas/CanvasViewport.vue'
import OutlinePanel from '@/editor/panels/OutlinePanel.vue'
import PropPanel from '@/editor/panels/PropPanel.vue'
import EventPanel from '@/editor/panels/EventPanel.vue'
import DataPanel from '@/editor/panels/DataPanel.vue'
import AppRuntime from '@/runtime/AppRuntime.vue'

const store = useEditorStore()

// 快捷键：Ctrl/Cmd+Z 撤销、Shift+Z / Ctrl+Y 重做、Delete 删除选中（M6 完善）
onMounted(() => {
  const onKey = (e: KeyboardEvent) => {
    const mod = e.metaKey || e.ctrlKey
    if (mod && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      if (e.shiftKey) store.redo()
      else store.undo()
    } else if (mod && e.key.toLowerCase() === 'y') {
      e.preventDefault()
      store.redo()
    } else if (e.key === 'Delete' && store.selectedId) {
      // 不删根节点
      if (store.selectedId !== store.schema.id) store.deleteNode(store.selectedId)
    } else if (mod && e.key === 's') {
      e.preventDefault()
      // M6 加上：自动保存提示
    }
  }
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="app-shell">
    <Toolbar />

    <!-- 预览态：纯渲染（无编辑壳） -->
    <AppRuntime v-if="store.mode === 'preview'" :schema="store.schema" />

    <!-- 设计态：三面板 -->
    <div v-else class="editor-layout">
      <MaterialPanel />

      <CanvasViewport class="canvas-area" />

      <aside class="right-panel">
        <el-tabs :model-value="'props'" class="right-tabs">
          <el-tab-pane label="属性" name="props">
            <PropPanel />
          </el-tab-pane>
          <el-tab-pane label="事件" name="events">
            <EventPanel />
          </el-tab-pane>
          <el-tab-pane label="数据" name="data">
            <DataPanel />
          </el-tab-pane>
          <el-tab-pane label="大纲" name="outline">
            <div class="panel"><div class="panel-title">大纲</div><OutlinePanel :node="store.schema" :depth="0" /></div>
          </el-tab-pane>
        </el-tabs>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}
.editor-layout {
  flex: 1;
  display: flex;
  min-height: 0;
}
.canvas-area {
  flex: 1;
  min-width: 0;
}
.right-panel {
  width: 320px;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}
.right-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.right-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
  padding: 0 8px;
}
.right-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow: auto;
}
</style>