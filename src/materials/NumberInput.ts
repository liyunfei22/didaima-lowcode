/**
 * ============================================================
 * 物料：数字输入框 (NumberInput)
 * ============================================================
 * 薄封装 el-input-number（v-model 数字），全量透传。
 */

import { defineComponent, h } from 'vue'
import { ElInputNumber } from 'element-plus'
import type { Material } from '@/core/material/types'

const NumberInputWidget = defineComponent({
  name: 'M.NumberInput',
  setup(_props, { attrs, slots }) {
    return () => h(ElInputNumber, { ...attrs }, slots)
  },
})

export const NumberInputMaterial: Material = {
  meta: {
    componentName: 'NumberInput',
    title: '数字输入',
    group: 'form',
    icon: '#️⃣',
    description: '数字步进输入框',
    configure: {
      props: [
        { name: 'modelValue', label: '值', setter: 'number', default: 0, tip: '建议用表达式绑定 state.xxx' },
        { name: 'min', label: '最小值', setter: 'number', default: undefined },
        { name: 'max', label: '最大值', setter: 'number', default: undefined },
        { name: 'step', label: '步长', setter: 'number', default: 1 },
        { name: 'placeholder', label: '占位文本', setter: 'text', default: '' },
      ],
    },
    snippets: [{ title: '数字输入', schema: { componentName: 'NumberInput', props: { modelValue: 0 } } }],
  },
  component: NumberInputWidget,
}