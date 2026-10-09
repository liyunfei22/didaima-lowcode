/**
 * ============================================================
 * 物料：输入框 (Input)
 * ============================================================
 * "无 props 声明、全量透传"的适配层典型：
 *   - attrs（modelValue/placeholder/disabled…）原样摊给 el-input；
 *   - onUpdate:modelValue 监听器也来自 attrs（SchemaNode 通过 v-on 注入），
 *     透传到 el-input 后 v-model 整链自动打通，wrapper 一行 emit 都不用写。
 * 这是"物料 = 0 逻辑适配层"的教学范例（底层组件有多强它就有多强）。
 */

import { defineComponent, h } from 'vue'
import { ElInput } from 'element-plus'
import type { Material } from '@/core/material/types'

const InputWidget = defineComponent({
  name: 'M.Input',
  setup(_props, { attrs, slots }) {
    return () => h(ElInput, { ...attrs }, slots)
  },
})

export const InputMaterial: Material = {
  meta: {
    componentName: 'Input',
    title: '输入框',
    group: 'form',
    icon: '✏️',
    description: '单行文本输入（v-model 双向绑定）',
    configure: {
      props: [
        { name: 'modelValue', label: '值', setter: 'text', default: '', tip: '建议用表达式绑定 state.xxx' },
        { name: 'placeholder', label: '占位文本', setter: 'text', default: '请输入' },
        { name: 'clearable', label: '可清空', setter: 'boolean', default: false },
        { name: 'disabled', label: '禁用', setter: 'boolean', default: false },
        {
          name: 'size',
          label: '尺寸',
          setter: 'select',
          options: [
            { label: '大', value: 'large' },
            { label: '默认', value: 'default' },
            { label: '小', value: 'small' },
          ],
          default: 'default',
        },
      ],
    },
    snippets: [{ title: '输入框', schema: { componentName: 'Input', props: { placeholder: '请输入' } } }],
  },
  component: InputWidget,
}