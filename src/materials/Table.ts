/**
 * ============================================================
 * 物料：表格 (Table) / 表格列 (TableColumn)
 * ============================================================
 * 内部工具平台的核心组件。
 * Table：<el-table> 容器，data 用绑定表达式指向 state 里的数组。
 * TableColumn：<el-table-column>，prop/label 声明字段；children 是单元格自定义内容，
 *   渲染进 el-table-column 的 scoped 插槽（#default="{ row }"）——SchemaNode 的
 *   #default="slotProps" 机制在这里把 row 叠进 children 的作用域，即 amis 数据链。
 */

import { defineComponent, h } from 'vue'
import { ElTable, ElTableColumn } from 'element-plus'
import type { Material } from '@/core/material/types'

const TableWidget = defineComponent({
  name: 'M.Table',
  setup(_props, { attrs, slots }) {
    return () => h(ElTable, { ...attrs }, slots)
  },
})

const TableColumnWidget = defineComponent({
  name: 'M.TableColumn',
  setup(_props, { attrs, slots }) {
    return () => h(ElTableColumn, { ...attrs }, slots)
  },
})

export const TableMaterial: Material = {
  meta: {
    componentName: 'Table',
    title: '表格',
    group: 'data',
    icon: '📊',
    isContainer: true,
    childWhitelist: ['TableColumn'],
    description: '数据表格（data 绑定 state.xxx 数组）',
    configure: {
      props: [
        { name: 'data', label: '数据', setter: 'array', default: [], tip: '建议用表达式绑定 state.xxx 数组' },
        { name: 'border', label: '边框', setter: 'boolean', default: true },
        { name: 'stripe', label: '斑马纹', setter: 'boolean', default: true },
        { name: 'emptyText', label: '空数据文案', setter: 'text', default: '暂无数据' },
      ],
    },
    snippets: [
      {
        title: '表格',
        schema: {
          componentName: 'Table',
          props: { data: [], border: true },
          children: [
            { componentName: 'TableColumn', props: { prop: 'name', label: '姓名' }, children: [] },
            { componentName: 'TableColumn', props: { prop: 'age', label: '年龄' }, children: [] },
          ],
        },
      },
    ],
  },
  component: TableWidget,
}

export const TableColumnMaterial: Material = {
  meta: {
    componentName: 'TableColumn',
    title: '表格列',
    group: 'data',
    icon: '🧶',
    isContainer: true,
    parentWhitelist: ['Table'],
    slots: { default: { scoped: true } }, // 优化：告诉编辑器这个插槽是有 { row } 作用域的
    description: '表格列（子节点会在每行单元格里渲染，作用域带 row）',
    configure: {
      props: [
        { name: 'prop', label: '字段名', setter: 'text', default: '', tip: '对应行数据里的键（空 = 用自定义单元格）' },
        { name: 'label', label: '列标题', setter: 'text', default: '列' },
        { name: 'width', label: '宽度', setter: 'text', default: '', tip: '如 120 / auto' },
        {
          name: 'align',
          label: '对齐',
          setter: 'select',
          options: [
            { label: '左', value: 'left' },
            { label: '中', value: 'center' },
            { label: '右', value: 'right' },
          ],
          default: 'left',
        },
      ],
    },
    snippets: [{ title: '表格列', schema: { componentName: 'TableColumn', props: { prop: 'name', label: '姓名' }, children: [] } }],
  },
  component: TableColumnWidget,
}