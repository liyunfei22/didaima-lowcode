/**
 * ============================================================
 * 物料：单选框 (Radio)
 * ============================================================
 * el-radio-group + options 配置 → 展开一组 el-radio。
 * 注意：新版 Element Plus 的 el-radio 用 `value` 承载选中值、默认插槽显示文案
 * （老版本用 label 一身两役，已废弃）——写物料时踩过一次就记住了。
 */

import { defineComponent, h } from 'vue'
import { ElRadio, ElRadioGroup } from 'element-plus'
import type { Material } from '@/core/material/types'

interface OptionLike {
  label?: unknown
  value?: string | number | boolean
}

const RadioWidget = defineComponent({
  name: 'M.Radio',
  props: {
    options: { type: Array, default: () => [] },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        ElRadioGroup,
        { ...attrs },
        {
          default: () => [
            ...(slots.default?.() ?? []),
            ...(props.options as OptionLike[]).map((o, i) =>
              h(ElRadio, { key: String(o.value ?? i), value: o.value }, () => String(o.label ?? '')),
            ),
          ],
        },
      )
  },
})

export const RadioMaterial: Material = {
  meta: {
    componentName: 'Radio',
    title: '单选',
    group: 'form',
    icon: '🔘',
    description: '一组互斥选项（options 配置）',
    configure: {
      props: [
        { name: 'modelValue', label: '值', setter: 'text', default: '', tip: '建议用表达式绑定 state.xxx' },
        { name: 'options', label: '选项', setter: 'array', default: [], tip: '[{ label: "男", value: 1 }, ...]' },
      ],
    },
    snippets: [
      {
        title: '单选',
        schema: {
          componentName: 'Radio',
          props: {
            options: [
              { label: '男', value: 'm' },
              { label: '女', value: 'f' },
            ],
          },
        },
      },
    ],
  },
  component: RadioWidget,
}