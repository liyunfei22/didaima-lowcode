/**
 * ============================================================
 * 物料：表单 (Form) / 表单项 (FormItem)
 * ============================================================
 * Form：<el-form> 容器。model 建议用绑定表达式指向一个 state 对象
 * （如 state.form），labelWidth 控制标签列宽。
 * FormItem：<el-form-item> 容器，label/prop 撕到它身上，子节点放控件。
 * parentWhitelist 让 FormItem 只能出现在 Form / 同级 FormItem 下。
 */

import { defineComponent, h } from 'vue'
import { ElForm, ElFormItem } from 'element-plus'
import type { Material } from '@/core/material/types'

const FormWidget = defineComponent({
  name: 'M.Form',
  setup(_props, { attrs, slots }) {
    return () => h(ElForm, { ...attrs }, slots)
  },
})

const FormItemWidget = defineComponent({
  name: 'M.FormItem',
  setup(_props, { attrs, slots }) {
    return () => h(ElFormItem, { ...attrs }, slots)
  },
})

export const FormMaterial: Material = {
  meta: {
    componentName: 'Form',
    title: '表单',
    group: 'form',
    icon: '📋',
    isContainer: true,
    description: '表单容器（model 建议绑定 state.form 对象）',
    configure: {
      props: [
        { name: 'model', label: '数据模型', setter: 'json', default: {}, tip: '建议用表达式绑定 state.form' },
        { name: 'labelWidth', label: '标签宽度', setter: 'text', default: '80px' },
        {
          name: 'labelPosition',
          label: '标签位置',
          setter: 'select',
          options: [
            { label: '右对齐', value: 'right' },
            { label: '左对齐', value: 'left' },
            { label: '顶部', value: 'top' },
          ],
          default: 'right',
        },
      ],
    },
    snippets: [
      {
        title: '表单',
        schema: {
          componentName: 'Form',
          props: { labelWidth: '80px' },
          children: [
            { componentName: 'FormItem', props: { label: '字段1' }, children: [] },
          ],
        },
      },
    ],
  },
  component: FormWidget,
}

export const FormItemMaterial: Material = {
  meta: {
    componentName: 'FormItem',
    title: '表单项',
    group: 'form',
    icon: '🧩',
    isContainer: true,
    parentWhitelist: ['Form', 'FormItem'],
    description: '字段容器：label 标签 + 内容控件（Input/Select…）',
    configure: {
      props: [
        { name: 'label', label: '标签', setter: 'text', default: '字段' },
        { name: 'prop', label: '字段名', setter: 'text', default: '', tip: '对应 el-form model 里的键' },
        { name: 'required', label: '必填', setter: 'boolean', default: false },
      ],
    },
    snippets: [
      {
        title: '表单项',
        schema: {
          componentName: 'FormItem',
          props: { label: '字段', prop: 'field' },
          children: [],
        },
      },
    ],
  },
  component: FormItemWidget,
}