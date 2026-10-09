<script setup lang="ts">
/**
 * ============================================================
 * 子系统 ⑥：事件面板（EventPanel）—— M8 完整版
 * ============================================================
 * 对标 amis EventSetter：选事件（click/change…）→ 配动作链。
 * 动作参数表单由动作的 argDefs（PropConfig 数组）自动生成 —— 复用 setter 体系。
 * 每个动作支持 condition（条件放行）/ outputVar（写入 event.data 供下游取用）。
 *
 * 教学点：逻辑也是"配置"，不是代码；动作是平台可扩展注册表。
 */

import { computed, ref } from 'vue'
import { ElButton, ElInput, ElSelect, ElOption } from 'element-plus'
import { useEditorStore } from '../store/editor'
import { listActions } from '@/core/events/registry'
import type { ActionItem } from '@/core/schema/types'

const store = useEditorStore()
const selected = computed(() => store.getSelected())

const actionsLib = listActions()
const actionByType = new Map(actionsLib.map((a) => [a.type, a]))

/** 当前节点已有的事件 */
const events = computed(() => Object.keys(selected.value?.node.onEvent ?? {}))

/** 新事件名输入 */
const newEventName = ref('')

function actionsOf(event: string): ActionItem[] {
  return selected.value?.node.onEvent?.[event] ?? []
}

function addEvent(event: string) {
  if (!selected.value || !event.trim()) return
  store.setNodeOnEvent(selected.value.node.id, event.trim(), [])
  newEventName.value = ''
}

function removeEvent(event: string) {
  if (!selected.value) return
  store.removeNodeEvent(selected.value.node.id, event)
}

function addAction(event: string, type: string) {
  if (!selected.value) return
  const def = actionByType.get(type)
  const defaults: Record<string, unknown> = {}
  for (const arg of def?.argDefs ?? []) if (arg.default !== undefined) defaults[arg.name] = arg.default
  store.setNodeOnEvent(selected.value.node.id, event, [...actionsOf(event), { actionType: type, args: defaults }])
}

function patchAction(event: string, index: number, patch: Partial<ActionItem>) {
  if (!selected.value) return
  const next = actionsOf(event).map((a, i) => (i === index ? { ...a, ...patch } : a))
  store.setNodeOnEvent(selected.value.node.id, event, next)
}

function patchArg(event: string, index: number, key: string, value: string) {
  if (!selected.value) return
  const next = actionsOf(event).map((a, i) => {
    if (i !== index) return a
    return { ...a, args: { ...(a.args ?? {}), [key]: value } }
  })
  store.setNodeOnEvent(selected.value.node.id, event, next)
}

function removeAction(event: string, index: number) {
  if (!selected.value) return
  const next = actionsOf(event).filter((_, i) => i !== index)
  store.setNodeOnEvent(selected.value.node.id, event, next)
}
</script>

<template>
  <div class="panel event-panel">
    <div class="panel-title">事件</div>
    <div class="panel-scroll">
      <div v-if="!selected" class="ep-empty">选中组件后可配置事件</div>

      <template v-else>
        <!-- 已有事件列表 + 添加事件 -->
        <div class="ep-section">
          <div class="ep-section-title">事件（{{ events.length }}）</div>
          <div v-if="events.length === 0" class="ep-empty-small">还没有事件，添加一个（如 click）</div>
          <div v-for="evt in events" :key="evt" class="ep-event-chip">
            <code>{{ evt }}</code>
            <span class="ep-count">{{ actionsOf(evt).length }} 个动作</span>
            <button class="ep-del" title="删除该事件" @click="removeEvent(evt)">✕</button>
          </div>
          <div class="ep-event-add">
            <el-input v-model="newEventName" size="small" placeholder="事件名（如 click）" class="ep-event-input" />
            <el-button size="small" :disabled="!newEventName.trim()" @click="addEvent(newEventName)">＋</el-button>
          </div>
        </div>

        <!-- 每个事件的动作链 -->
        <div v-for="evt in events" :key="evt" class="ep-section">
          <div class="ep-section-title">「{{ evt }}」动作链</div>

          <div v-if="actionsOf(evt).length === 0" class="ep-empty-small">该事件还没有动作</div>

          <div v-for="(action, ai) in actionsOf(evt)" :key="ai" class="action-card">
            <!-- 动作类型 -->
            <div class="action-head">
              <span class="action-index">{{ ai + 1 }}</span>
              <el-select :model-value="action.actionType" size="small" class="action-type" @update:model-value="(v: string | number) => patchAction(evt, ai, { actionType: String(v) })">
                <el-option v-for="a in actionsLib" :key="a.type" :label="a.label" :value="a.type" />
              </el-select>
              <button class="action-del" title="删除该动作" @click="removeAction(evt, ai)">✕</button>
            </div>

            <!-- 条件放行（amis expression） -->
            <div class="action-cond">
              <el-input
                :model-value="action.condition ?? ''"
                size="small"
                placeholder="条件（表达式为假则跳过本动作）"
                class="action-field"
                @update:model-value="(v: string | number) => patchAction(evt, ai, { condition: String(v) || undefined })"
              />
            </div>

            <!-- 参数表单：由动作 argDefs 自动生成 -->
            <div v-for="arg in actionByType.get(action.actionType)?.argDefs ?? []" :key="arg.name" class="action-arg">
              <label>{{ arg.label }}</label>
              <el-input
                :model-value="String((action.args as Record<string, unknown> | undefined)?.[arg.name] ?? '')"
                size="small"
                type="textarea"
                :rows="arg.setter === 'json' ? 4 : 1"
                class="action-arg-input"
                :placeholder="arg.tip ?? ''"
                @update:model-value="(v: string | number) => patchArg(evt, ai, arg.name, String(v))"
              />
            </div>

            <!-- outputVar：写入动作链共享内存 event.data -->
            <div class="action-ov">
              <el-input
                :model-value="action.outputVar ?? ''"
                size="small"
                placeholder="outputVar（结果写入 event.data.xxx 供后续动作引用）"
                class="action-field"
                @update:model-value="(v: string | number) => patchAction(evt, ai, { outputVar: String(v) || undefined })"
              />
            </div>
          </div>

          <el-button size="small" class="ep-add-action" @click="addAction(evt, actionsLib[0]?.type ?? 'toast')">
            ＋ 添加动作
          </el-button>
        </div>

        <div class="ep-tip">
          动作是平台注册表能力；参数支持表达式，如
          <code v-pre>state.count + 1</code>。outputVar 把结果写进 <code v-pre>event.data</code> 供链上后续动作使用。
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ep-empty {
  color: #909399;
  font-size: 13px;
  padding: 20px 0;
  text-align: center;
}
.ep-empty-small {
  color: #909399;
  font-size: 12px;
  padding: 8px 0;
}
.ep-section {
  margin-bottom: 14px;
}
.ep-section-title {
  font-size: 12px;
  color: #909399;
  margin-bottom: 6px;
}
.ep-event-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 5px;
  font-size: 13px;
}
.ep-event-chip code {
  color: #409eff;
  font-weight: 600;
}
.ep-count {
  color: #909399;
  font-size: 11px;
  margin-left: auto;
}
.ep-del {
  border: none;
  background: transparent;
  color: #c0c4cc;
  cursor: pointer;
  font-size: 12px;
}
.ep-del:hover {
  color: #f56c6c;
}
.ep-event-add {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}
.ep-event-input {
  flex: 1;
}
.action-card {
  border: 1px solid #ebeef5;
  border-radius: 6px;
  padding: 8px;
  margin-bottom: 8px;
  background: #fafbfc;
}
.action-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.action-index {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #409eff;
  color: #fff;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.action-type {
  flex: 1;
}
.action-del {
  border: none;
  background: transparent;
  color: #c0c4cc;
  cursor: pointer;
  font-size: 13px;
}
.action-del:hover {
  color: #f56c6c;
}
.action-cond,
.action-ov {
  margin-top: 6px;
}
.action-arg {
  margin-top: 6px;
}
.action-arg label {
  display: block;
  font-size: 11px;
  color: #909399;
  margin-bottom: 3px;
}
.action-arg-input :deep(textarea) {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}
.ep-add-action {
  margin-top: 4px;
  width: 100%;
}
.ep-tip {
  margin-top: 12px;
  font-size: 11px;
  color: #909399;
  background: #f5f7fa;
  border-radius: 4px;
  padding: 8px 10px;
  line-height: 1.6;
}
</style>