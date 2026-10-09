<script setup lang="ts">
/**
 * ============================================================
 * 子系统 ③：画布视口（CanvasViewport）
 * ============================================================
 * 画布 = 一个模拟浏览器页面的白色区域，里面递归渲染 CanvasNode（编辑态壳）。
 * 点击空白处取消选中。M4 会把每个容器包一层可拖拽的 slot。
 */

import { computed } from 'vue'
import { useEditorStore } from '../store/editor'
import CanvasNode from './CanvasNode.vue'

const store = useEditorStore()

// 设计态根作用域：state = schema.state 的默认值（编辑时数据用默认值渲染）
const designScope = computed(() => store.designScope)
</script>

<template>
  <div class="canvas-viewport" @click.self="store.selectNode(null)">
    <!-- 页面条：显示当前页名 -->
    <div class="canvas-page-bar">
      <span class="page-dot">●</span>
      {{ store.schema.title ?? store.schema.fileName }}
      <span v-if="store.schema.children?.length" class="page-count">
        {{ store.schema.children.length }} 个顶层节点
      </span>
    </div>

    <!-- 可滚动模拟浏览器窗口 -->
    <div class="canvas-scroll">
      <div class="canvas-page">
        <CanvasNode
          v-if="store.schema"
          :node="store.schema"
          :scope="designScope"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-viewport {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #eef1f6;
}
.canvas-page-bar {
  padding: 8px 16px;
  font-size: 13px;
  color: #606266;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 6px;
}
.page-dot {
  color: #67c23a;
  font-size: 10px;
}
.page-count {
  color: #909399;
  font-size: 12px;
}
/* 滚动容器：模拟"浏览器" */
.canvas-scroll {
  flex: 1;
  overflow: auto;
  padding: 24px;
}
/* 模拟页面本体：居中白底 800px 宽 */
.canvas-page {
  width: 800px;
  margin: 0 auto;
  min-height: 100%;
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  padding: 1px; /* 内部默认边距其实由 Page 物料自己处理 */
}
</style>