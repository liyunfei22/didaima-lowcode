/**
 * ============================================================
 * 物料：下拉选择 (Select)
 * ============================================================
 * 适配层特例：options 是"配置型数据"，组件层把它展开成 <el-option> 列表。
 * 这也是 amis 等平台的常规处理——选项是 schema 数据，不是拖进去的节点。
 * （进阶：也可以把 Option 做成独立物料用 children 拖拽，这里是配置式。）
 */

import { defineComponent, h } from 'vue'
import { ElOption, ElSelect } from 'element-plus'
import type { Material } from '@/core/material/types'

interface OptionLike {
  label?: unknown
  value?: string | number | boolean
}

const SelectWidget = defineComponent({
  name: 'M.Select',
  props: {
    options: { type: Array, default: () => [] },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        ElSelect,
        { ...attrs },
        {
          default: () => [
            ...(slots.default?.() ?? []), // 允许 schema 拖入子节点（进阶用法）
            ...(props.options as OptionLike[]).map((o, i) =>
              h(ElOption, { key: String(o.value ?? i), label: String(o.label ?? ''), value: o.value ?? i }),
            ),
          ],
        },
      )
  },
})

export const SelectMaterial: Material = {
  meta: {
    componentName: 'Select',
    title: '下拉选择',
    group: 'form',
    icon: '📋',
    description: '配置式下拉选项（options 展开为 el-option）',
    configure: {
      props: [
        { name: 'modelValue', label: '值', setter: 'text', default: '', tip: '建议用表达式绑定 state.xxx' },
        { name: 'options', label: '选项', setter: 'array', default: [], tip: '[{ label: "苹果", value: 1 }, ...]' },
        { name: 'placeholder', label: '占位文本', setter: 'text', default: '请选择' },
        { name: 'multiple', label: '多选', setter: 'boolean', default: false },
        { name: 'clearable', label: '可清空', setter: 'boolean', default: false },
      ],
    },
    snippets: [
      {
        title: '下拉选择',
        schema: {
          componentName: 'Select',
          props: {
            placeholder: '请选择',
            options: [
              { label: '选项1', value: 'a' },
              { label: '选项2', value: 'b' },
            ],
          },
        },
      },
    ],
  },
  component: SelectWidget,
}