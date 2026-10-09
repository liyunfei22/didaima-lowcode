/**
 * ============================================================
 * 物料：文本 (Text)
 * ============================================================
 * 最朴素的展示组件：渲染一个带样式的 span。
 * text 属性支持 {{ }} 模板插值（M1 已跑通）。
 */

import { defineComponent, h } from 'vue'
import type { Material } from '@/core/material/types'

const TextWidget = defineComponent({
  name: 'M.Text',
  props: {
    text: { type: String, default: '文本' },
    size: { type: Number, default: 14 },
    color: { type: String, default: '#303133' },
    weight: { type: String, default: 'normal' },
  },
  setup(props, { slots }) {
    return () =>
      h(
        'span',
        {
          class: 'm-text',
          style: {
            fontSize: `${props.size}px`,
            color: props.color,
            fontWeight: props.weight === 'bold' ? 600 : 'normal',
          },
        },
        slots.default?.() ?? [props.text],
      )
  },
})

export const TextMaterial: Material = {
  meta: {
    componentName: 'Text',
    title: '文本',
    group: 'basic',
    icon: '📝',
    description: '展示纯文本，支持 {{ }} 模板插值',
    configure: {
      props: [
        { name: 'text', label: '内容', setter: 'text', default: '文本', tip: '支持 {{state.xxx}} 模板' },
        { name: 'size', label: '字号', setter: 'number', default: 14 },
        { name: 'color', label: '颜色', setter: 'color', default: '#303133' },
        {
          name: 'weight',
          label: '字重',
          setter: 'select',
          options: [
            { label: '常规', value: 'normal' },
            { label: '加粗', value: 'bold' },
          ],
          default: 'normal',
        },
      ],
    },
    snippets: [{ title: '文本', schema: { componentName: 'Text', props: { text: '文本' } } }],
  },
  component: TextWidget,
}