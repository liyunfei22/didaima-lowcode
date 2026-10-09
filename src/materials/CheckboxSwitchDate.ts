/**
 * ============================================================
 * 物料：复选框 (Checkbox) / 开关 (Switch) / 日期选择器 (DatePicker)
 * ============================================================
 * 三个都是"模型值单一、全量透传"的薄封装，合并在一个文件里（教学上属于同一族）。
 */

import { defineComponent, h } from 'vue'
import { ElCheckbox, ElDatePicker, ElSwitch } from 'element-plus'
import type { Material } from '@/core/material/types'

/* ---------- 复选框（单值布尔） ---------- */
const CheckboxWidget = defineComponent({
  name: 'M.Checkbox',
  props: { label: { type: String, default: '选项' } },
  setup(props, { attrs, slots }) {
    return () => h(ElCheckbox, { ...attrs }, { default: () => slots.default?.() ?? [props.label] })
  },
})

/* ---------- 开关 ---------- */
const SwitchWidget = defineComponent({
  name: 'M.Switch',
  setup(_props, { attrs, slots }) {
    return () => h(ElSwitch, { ...attrs }, slots)
  },
})

/* ---------- 日期选择器 ---------- */
const DatePickerWidget = defineComponent({
  name: 'M.DatePicker',
  setup(_props, { attrs, slots }) {
    return () => h(ElDatePicker, { ...attrs }, slots)
  },
})

export const CheckboxMaterial: Material = {
  meta: {
    componentName: 'Checkbox',
    title: '复选框',
    group: 'form',
    icon: '✅',
    configure: {
      props: [
        { name: 'modelValue', label: '选中', setter: 'boolean', default: false, tip: '建议用表达式绑定 state.xxx' },
        { name: 'label', label: '文案', setter: 'text', default: '选项' },
      ],
    },
    snippets: [{ title: '复选框', schema: { componentName: 'Checkbox', props: { label: '同意协议' } } }],
  },
  component: CheckboxWidget,
}

export const SwitchMaterial: Material = {
  meta: {
    componentName: 'Switch',
    title: '开关',
    group: 'form',
    icon: '🔛',
    configure: {
      props: [
        { name: 'modelValue', label: '是否开启', setter: 'boolean', default: false, tip: '建议用表达式绑定 state.xxx' },
        { name: 'activeText', label: '开启文案', setter: 'text', default: '' },
        { name: 'inactiveText', label: '关闭文案', setter: 'text', default: '' },
      ],
    },
    snippets: [{ title: '开关', schema: { componentName: 'Switch', props: {} } }],
  },
  component: SwitchWidget,
}

export const DatePickerMaterial: Material = {
  meta: {
    componentName: 'DatePicker',
    title: '日期选择',
    group: 'form',
    icon: '📅',
    configure: {
      props: [
        { name: 'modelValue', label: '值', setter: 'text', default: '', tip: '建议用表达式绑定 state.xxx' },
        {
          name: 'type',
          label: '类型',
          setter: 'select',
          options: [
            { label: '日期', value: 'date' },
            { label: '日期+时间', value: 'datetime' },
            { label: '日期范围', value: 'daterange' },
          ],
          default: 'date',
        },
        { name: 'placeholder', label: '占位文本', setter: 'text', default: '选择日期' },
      ],
    },
    snippets: [{ title: '日期选择', schema: { componentName: 'DatePicker', props: {} } }],
  },
  component: DatePickerWidget,
}