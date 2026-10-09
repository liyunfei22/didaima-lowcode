/**
 * ============================================================
 * 物料：按钮 (Button)
 * ============================================================
 * 教学点："物料 = 对组件库的适配层"（amis 包装 antd、E-Admin 类项目的通用做法）。
 * 每个物料 = 一个薄封装组件 + 一份 meta；meta 驱动 面板/画布/拖拽/属性 四件事。
 *
 * 这里特例：声明了 `text` prop —— Element Plus 的 <el-button> 没有内容属性，
 * 文本要放在默认插槽里（{{ text }}），所以 wrapper 把 text 渲染成插槽内容；
 * 其余所有 attribute（type/size/loading…）原样透传给 el-button。
 */

import { defineComponent, h } from 'vue'
import { ElButton } from 'element-plus'
import type { Material } from '@/core/material/types'

const ButtonWidget = defineComponent({
  name: 'M.Button',
  props: { text: { type: String, default: '按钮' } },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        ElButton,
        { ...attrs },
        {
          // 有 schema 子节点就用子节点（插槽），否则渲染 text 属性
          default: () => slots.default?.() ?? [props.text],
        },
      )
  },
})

export const ButtonMaterial: Material = {
  meta: {
    componentName: 'Button',
    title: '按钮',
    group: 'action',
    icon: '🔘',
    description: '触发事件操作的按钮',
    configure: {
      props: [
        { name: 'text', label: '文案', setter: 'text', default: '按钮', tip: '支持 {{state.xxx}} 模板' },
        {
          name: 'type',
          label: '类型',
          setter: 'select',
          options: [
            { label: '主按钮', value: 'primary' },
            { label: '成功', value: 'success' },
            { label: '警告', value: 'warning' },
            { label: '危险', value: 'danger' },
            { label: '默认', value: 'default' },
            { label: '幽灵', value: 'info' },
          ],
          default: 'primary',
        },
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
        { name: 'plain', label: '朴素', setter: 'boolean', default: false },
        { name: 'round', label: '圆角', setter: 'boolean', default: false },
        { name: 'disabled', label: '禁用', setter: 'boolean', default: false },
      ],
    },
    snippets: [{ title: '按钮', schema: { componentName: 'Button', props: { text: '按钮' } } }],
  },
  component: ButtonWidget,
}