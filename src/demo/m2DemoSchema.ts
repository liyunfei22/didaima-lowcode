/**
 * M2 演示 schema：16 个真实物料 + 渲染引擎特性展示
 *   - Page > Card(表单) > Form > FormItem>Input / Select / Switch …
 *   - Page > Card(列表) > Table(data 绑定 state.list) + TableColumn
 *     其中一列用 scoped 插槽子节点渲染单元格（作用域注入 row → {{row.status}}）
 *   - v-model 双向绑定：Input 的 modelValue 绑定 state.form.name，
 *     运行时 onModelUpdate 把值写回 state → 响应式整链更新
 *   - 文本联动：页面下方 Text 显示 {{state.form.name}}，跟着输入实时变化
 * 运行：npm run dev（M2 是"预览式"渲染，M3 开始换真编辑器）。
 */

import type { Schema } from '@/core/schema/types'

export const m2DemoSchema: Schema = {
  version: '1.0.0',
  fileName: 'demo',
  id: 'page_root',
  componentName: 'Page',
  title: 'M2 演示页面',
  // 页面数据域：这里就是运行时 demo 的初始 state
  state: {
    form: { name: '小明', plan: 'free', vip: false },
    list: [
      { name: '李雷', age: 28, status: '在职' },
      { name: '韩梅梅', age: 25, status: '请假' },
      { name: '吉姆', age: 31, status: '离职' },
    ],
    greeting: '你好',
  },
  children: [
    // ================= 卡片一：表单区 =================
    {
      id: 'card_form',
      componentName: 'Card',
      props: { title: '信息表单（v-model → state.form）', shadow: 'always' },
      children: [
        {
          id: 'form_1',
          componentName: 'Form',
          props: { labelWidth: '80px', model: { type: 'binding', value: 'state.form' } },
          children: [
            {
              id: 'formitem_name',
              componentName: 'FormItem',
              props: { label: '姓名', prop: 'name' },
              children: [
                {
                  id: 'input_name',
                  componentName: 'Input',
                  props: {
                    modelValue: { type: 'binding', value: 'state.form.name' },
                    placeholder: '请输入姓名',
                  },
                },
              ],
            },
            {
              id: 'formitem_plan',
              componentName: 'FormItem',
              props: { label: '套餐', prop: 'plan' },
              children: [
                {
                  id: 'select_plan',
                  componentName: 'Select',
                  props: {
                    modelValue: { type: 'binding', value: 'state.form.plan' },
                    options: [
                      { label: '免费版', value: 'free' },
                      { label: '专业版', value: 'pro' },
                      { label: '旗舰版', value: 'enterprise' },
                    ],
                  },
                },
              ],
            },
            {
              id: 'formitem_vip',
              componentName: 'FormItem',
              props: { label: 'VIP', prop: 'vip' },
              children: [
                {
                  id: 'switch_vip',
                  componentName: 'Switch',
                  props: {
                    modelValue: { type: 'binding', value: 'state.form.vip' },
                    activeText: '是',
                    inactiveText: '否',
                  },
                },
              ],
            },
          ],
        },
        {
          id: 'text_preview',
          componentName: 'Text',
          props: {
            text: '实时预览：{{state.greeting}}，{{state.form.name}}（{{state.form.plan}}，VIP: {{state.form.vip}}）',
            size: 13,
            color: '#909399',
          },
        },
      ],
    },

    // ================= 卡片二：表格区（数据绑定 + scoped 插槽单元格） =================
    {
      id: 'card_table',
      componentName: 'Card',
      props: { title: '员工列表（data: state.list）', shadow: 'hover' },
      children: [
        {
          id: 'table_1',
          componentName: 'Table',
          props: { data: { type: 'binding', value: 'state.list' }, border: true, stripe: true },
          children: [
            {
              id: 'col_name',
              componentName: 'TableColumn',
              props: { prop: 'name', label: '姓名', width: '120' },
            },
            {
              id: 'col_age',
              componentName: 'TableColumn',
              props: { prop: 'age', label: '年龄', width: '80', align: 'center' },
            },
            {
              id: 'col_status',
              componentName: 'TableColumn',
              props: { label: '状态', align: 'center' },
              // 自定义单元格：TableColumn 的 default 插槽带 { row } 作用域，
              // 子节点 Text 用 {{row.status}} 访问当前行数据（amis 数据链教学点）
              children: [
                {
                  id: 'col_status_text',
                  componentName: 'Text',
                  props: { text: '{{row.status}}', size: 13 },
                },
              ],
            },
          ],
        },
      ],
    },

    // ================= 卡片三：tab 演示 =================
    {
      id: 'card_tabs',
      componentName: 'Card',
      props: { title: '标签页', shadow: 'never' },
      children: [
        {
          id: 'tabs_1',
          componentName: 'Tabs',
          props: {},
          children: [
            {
              id: 'tab_a',
              componentName: 'TabPane',
              props: { label: '页签A', name: 'a' },
              children: [
                { id: 'tab_a_text', componentName: 'Text', props: { text: '这是页签 A 的内容' } },
              ],
            },
            {
              id: 'tab_b',
              componentName: 'TabPane',
              props: { label: '页签B', name: 'b' },
              children: [
                { id: 'tab_b_text', componentName: 'Text', props: { text: '这是页签 B 的内容' } },
              ],
            },
          ],
        },
      ],
    },

    {
      id: 'divider_1',
      componentName: 'Divider',
      props: {},
    },
  ],
}