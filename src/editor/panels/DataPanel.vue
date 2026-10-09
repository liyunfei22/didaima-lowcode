<script setup lang="ts">
/**
 * ============================================================
 * 子系统 ⑤：数据面板（DataPanel）—— M7 完整版
 * ============================================================
 * 编辑页面数据域 state 与数据源声明 dataSource：
 *   - state：JSON 文本编辑（应用即校验）；改动即提交 → 画布/绑定表达式整体重求值
 *   - dataSource：行式编辑（M9 运行时按 isInit 自动请求，写进 state[dataField]）
 *
 * 教学点：数据是 schema 的一部分（声明式数据域），改数据 = 改 schema =
 *   一个 commit + 一次自动保存。这也是"数据驱动 UI"的正向证明。
 */

import { computed, ref, watch } from 'vue'
import { ElButton, ElInput, ElMessage } from 'element-plus'
import { useEditorStore } from '../store/editor'
import type { DataSourceItem } from '@/core/schema/types'

const store = useEditorStore()

/* ---------- state 编辑 ---------- */
const stateDraft = ref('')
watch(
  () => store.schema.state,
  (s) => {
    stateDraft.value = JSON.stringify(s ?? {}, null, 2)
  },
  { immediate: true },
)

const stateError = ref<string | null>(null)

function applyState() {
  try {
    const parsed = JSON.parse(stateDraft.value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      stateError.value = 'state 必须是 JSON 对象'
      return
    }
    store.setPageState(parsed as Record<string, unknown>)
    stateError.value = null
    ElMessage.success('state 已更新')
  } catch (err) {
    stateError.value = `JSON 解析失败: ${(err as Error).message}`
  }
}

/* ---------- dataSource 编辑 ---------- */
const dataSource = computed(() => store.schema.dataSource ?? [])

const emptyRow = (): DataSourceItem => ({ id: `ds_${Date.now().toString(36)}`, uri: '/mock/list.json', method: 'GET', isInit: true, dataField: 'list' })

function addSource() {
  store.setDataSource([...dataSource.value, emptyRow()])
}

function removeSource(index: number) {
  const next = [...dataSource.value]
  next.splice(index, 1)
  store.setDataSource(next)
}

function patchSource(index: number, patch: Partial<DataSourceItem>) {
  const next = [...dataSource.value]
  next[index] = { ...next[index], ...patch }
  store.setDataSource(next)
}
</script>

<template>
  <div class="panel data-panel">
    <div class="panel-title">数据</div>
    <div class="panel-scroll">
      <!-- ============ state 数据域 ============ -->
      <div class="dp-section">
        <div class="dp-section-title">页面 state（数据域，表达式里用 state.xxx）</div>
        <el-input
          v-model="stateDraft"
          type="textarea"
          :rows="8"
          size="small"
          class="dp-state-input"
          :class="{ 'dp-error-input': !!stateError }"
          @keydown.ctrl.enter.prevent="applyState"
          @keydown.meta.enter.prevent="applyState"
        />
        <div v-if="stateError" class="dp-error">⨯ {{ stateError }}</div>
        <el-button size="small" type="primary" class="dp-apply" @click="applyState">应用（Cmd/Ctrl+Enter）</el-button>
      </div>

      <!-- ============ dataSource 声明式取数 ============ -->
      <div class="dp-section">
        <div class="dp-section-title">数据源（isInit 时页面加载自动请求 → 写入 state[dataField]，M9 生效）</div>
        <div v-if="dataSource.length === 0" class="dp-empty">暂无数据源</div>
        <div v-for="(ds, i) in dataSource" :key="ds.id" class="ds-row">
          <el-input :model-value="ds.id" size="small" placeholder="id" class="ds-id" @update:model-value="(v: string | number) => patchSource(i, { id: String(v) })" />
          <el-input :model-value="ds.uri" size="small" placeholder="/mock/xxx.json" class="ds-uri" @update:model-value="(v: string | number) => patchSource(i, { uri: String(v) })" />
          <el-input :model-value="ds.dataField ?? ds.id" size="small" placeholder="写入字段" class="ds-field" @update:model-value="(v: string | number) => patchSource(i, { dataField: String(v) })" />
          <label class="ds-init" :title="'页面加载时自动请求'">
            <el-input :model-value="ds.isInit ? '自动' : '手动'" size="small" readonly class="ds-mode" />
            <button class="ds-del" title="删除数据源" @click="removeSource(i)">✕</button>
          </label>
        </div>
        <el-button size="small" class="dp-apply" @click="addSource">＋ 添加数据源</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dp-section {
  margin-bottom: 18px;
}
.dp-section-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}
.dp-state-input :deep(textarea) {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.dp-error-input :deep(textarea) {
  border-color: #f56c6c;
}
.dp-error {
  color: #f56c6c;
  font-size: 12px;
  margin-top: 4px;
}
.dp-apply {
  margin-top: 8px;
  width: 100%;
}
.dp-empty {
  color: #909399;
  font-size: 12px;
  padding: 6px 0;
}
.ds-row {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
  align-items: center;
}
.ds-id {
  width: 72px;
}
.ds-uri {
  flex: 1;
}
.ds-field {
  width: 84px;
}
.ds-mode {
  width: 48px;
}
.ds-del {
  border: none;
  background: transparent;
  color: #f56c6c;
  cursor: pointer;
  font-size: 12px;
  padding: 2px 4px;
}
</style>