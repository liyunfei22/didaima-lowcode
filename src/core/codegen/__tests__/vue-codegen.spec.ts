/**
 * 子系统 ⑦：出码模块单元测试（结构断言）
 * 更强的验收（"能编译能跑"）在 M9 收尾时用 _scratch 工程跑真实 vite build。
 */

import { describe, expect, it } from 'vitest'
import { generateVueSfc } from '../vue-codegen'
import type { Schema } from '@/core/schema/types'
import { m2DemoSchema } from '@/demo/m2DemoSchema'

/** 一个覆盖：v-model / scoped 列 / 事件动作 / 循环 / 条件 / 数据源的测试 schema */
const testSchema: Schema = {
  ...structuredClone(m2DemoSchema),
  state: { count: 0, form: { name: '' }, user: {}, list: [], items: ['a', 'b'] },
  dataSource: [{ id: 'fetchStaff', uri: '/mock/staff.json', isInit: true, dataField: 'list' }],
  children: [
    {
      id: 'btn_submit',
      componentName: 'Button',
      props: { text: '提交', type: 'primary' },
      onEvent: {
        click: [
          { actionType: 'toast', args: { message: '已提交 {{state.form.name}}', type: 'success' } },
          { actionType: 'updateState', args: { count: 'state.count + 1', 'user.name': '李雷' } },
        ],
      },
    },
    { id: 't_input', componentName: 'Input', props: { modelValue: { type: 'binding', value: 'state.form.name' }, placeholder: '姓名' }, children: [] },
    {
      id: 't_table',
      componentName: 'Table',
      props: { data: { type: 'binding', value: 'state.list' }, border: true },
      children: [
        { id: 'c_name', componentName: 'TableColumn', props: { prop: 'name', label: '姓名' }, children: [] },
        { id: 'c_status', componentName: 'TableColumn', props: { label: '状态' }, children: [{ id: 'c_status_t', componentName: 'Text', props: { text: '{{row.status}}' } }] },
      ],
    },
    { id: 't_loop_text', componentName: 'Text', loop: 'state.items', props: { text: '第 {{index + 1}} 项：{{item}}' }, children: [] },
  ],
}

describe('vue-codegen 出码', () => {
  it('生成 Vue SFC 的关键结构', () => {
    const code = generateVueSfc(testSchema)
    // 结构齐全
    expect(code).toContain('<template>')
    expect(code).toContain('<script setup lang="ts">')
    expect(code).toContain("import { reactive, onMounted } from 'vue'")
    // import 聚合（组件 + ElMessage）
    expect(code).toContain('ElMessage')
    // v-model 左值还原
    expect(code).toContain('v-model="state.form.name"')
    // 属性还原（字面量字符串 → 静态属性）
    expect(code).toContain('placeholder="姓名"')
    // 表格列 scoped 插槽
    expect(code).toContain('<template #default="{ row }">')
    expect(code).toContain('{{row.status}}')
    // loop 还原 v-for
    expect(code).toContain('v-for="(item, index) in state.items"')
    // 事件函数 + state 写入
    expect(code).toContain('__on_')
    expect(code).toContain('state.count = state.count + 1')
    // 数据源 auto init
    expect(code).toContain('fetch("/mock/staff.json")')
  })

  it('启动 schema 也能出码（不抛错 + 有模板根）', () => {
    const code = generateVueSfc(m2DemoSchema)
    expect(code).toContain('<div class="page">')
    expect(code).toContain('state.list')
  })
})
