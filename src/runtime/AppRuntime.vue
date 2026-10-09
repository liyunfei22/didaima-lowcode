<script setup lang="ts">
/**
 * ============================================================
 * 子系统 ⑦：运行时渲染入口（预览态）
 * ============================================================
 * 预览 = 去掉编辑外壳的纯渲染：一份 schema + 一个 reactive 数据域。
 * 教学点：编辑态和预览态消费同一棵 schema —— 所见即所得（WYSIWYG）
 *   amis/tmagic 的"编辑态与运行态同构"思想的落地。
 *
 * 数据链路：
 *   v-model 回写（onModelUpdate）→ setByPath 写入 reactive state →
 *   求值器对 state 的读取被 Vue 追踪 → 引用它的组件自动重渲。
 */

import { onMounted, reactive } from 'vue'
import { isBinding } from '@/core/schema/types'
import type { Schema, SchemaNode } from '@/core/schema/types'
import SchemaNodeRenderer from '@/renderer/SchemaNode.vue'
import { createPreviewRuntime } from '@/renderer/runtimeApi'
import { executeChain, type ActionContext } from '@/core/events/registry'
import { parseBindingPath, setByPath } from '@/core/utils/path'

const props = defineProps<{ schema: Schema }>()

// 每次挂载按当前 schema.state 重建数据域（预览切换 = 重新挂载，见 App.vue 的 v-if）
const state = reactive(structuredClone(props.schema.state ?? {}))
const runtime = createPreviewRuntime()

/** M9：声明式数据源 —— isInit 的项页面挂载即请求，响应写进 state[dataField] */
async function loadDataSources() {
  for (const ds of props.schema.dataSource ?? []) {
    if (ds.isInit === false) continue
    try {
      const data = await runtime.fetchJson(ds.uri)
      setByPath(state, (ds.dataField ?? ds.id).split('.'), data)
    } catch (err) {
      console.warn(`[runtime] 数据源 ${ds.id} 加载失败:`, err)
    }
  }
}
onMounted(loadDataSources)

/** v-model 回写：把输入值按绑定路径写进 state（对应 updateState 动作的左值语义） */
function onModelUpdate(node: SchemaNode, value: unknown) {
  const pv = node.props?.modelValue
  if (isBinding(pv)) {
    const path = parseBindingPath(pv.value)
    if (path) setByPath(state, path, value)
    else console.warn('[runtime] 无法解析 v-model 绑定路径:', pv.value)
  }
}

/** 事件动作链：组装 ActionContext 后交给 executor（M8） */
async function onEvent(node: SchemaNode, event: string, payload: unknown) {
  const actions = node.onEvent?.[event]
  if (!actions || actions.length === 0) return
  const ctx: ActionContext = {
    nodeId: node.id,
    payload,
    scope: { state },
    runtime,
    dataSources: props.schema.dataSource ?? [],
    event: { data: {} },
  }
  executeChain(actions, ctx).catch((err) => console.error('[runtime] 动作链执行失败:', err))
}

const handlers = { onModelUpdate, onEvent }
</script>

<template>
  <div class="runtime-page">
    <SchemaNodeRenderer v-if="state" :node="props.schema" :scope="{ state }" :handlers="handlers" />
  </div>
</template>

<style scoped>
.runtime-page {
  min-height: 100vh;
}
</style>