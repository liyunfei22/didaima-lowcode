/**
 * ============================================================
 * 物料：卡片 (Card) / 标签页 (Tabs + TabPane) / 分割线 (Divider) / 页面 (Page)
 * ============================================================
 * 布局类容器：孩子走默认插槽递归渲染（SchemaNode 的 #default 槽）。
 * TabPane 的 children 是标签页内容；Page 是根容器（schema 的 componentName 就是它）。
 */

import { defineComponent, h } from 'vue'
import { ElCard, ElDivider, ElTabPane, ElTabs } from 'element-plus'
import type { Material } from '@/core/material/types'

/* ---------- 卡片：容器 ---------- */
const CardWidget = defineComponent({
  name: 'M.Card',
  setup(_props, { attrs, slots }) {
    return () => h(ElCard, { ...attrs }, slots)
  },
})

/* ---------- 标签页：容器（children = TabPane） ---------- */
const TabsWidget = defineComponent({
  name: 'M.Tabs',
  setup(_props, { attrs, slots }) {
    return () => h(ElTabs, { ...attrs }, slots)
  },
})

/* ---------- 标签页 tab：容器（children = 页内容） ---------- */
const TabPaneWidget = defineComponent({
  name: 'M.TabPane',
  setup(_props, { attrs, slots }) {
    return () => h(ElTabPane, { ...attrs }, slots)
  },
})

/* ---------- 分割线：非容器，可带标题 ---------- */
const DividerWidget = defineComponent({
  name: 'M.Divider',
  props: { title: { type: String, default: '' } },
  setup(props, { attrs, slots }) {
    return () => h(ElDivider, { ...attrs }, { default: () => slots.default?.() ?? (props.title ? [props.title] : []) })
  },
})

/* ---------- 页面：根容器（无 Element 对应，纯 div 布局） ---------- */
const PageWidget = defineComponent({
  name: 'M.Page',
  setup(_props, { slots }) {
    return () => h('div', { class: 'm-page' }, slots.default?.())
  },
})

export const CardMaterial: Material = {
  meta: {
    componentName: 'Card',
    title: '卡片',
    group: 'layout',
    icon: '🃏',
    isContainer: true,
    description: '内容容器（有标题栏）',
    configure: {
      props: [
        { name: 'title', label: '标题', setter: 'text', default: '卡片' },
        {
          name: 'shadow',
          label: '阴影',
          setter: 'select',
          options: [
            { label: '始终', value: 'always' },
            { label: '悬停', value: 'hover' },
            { label: '从不', value: 'never' },
          ],
          default: 'always',
        },
      ],
    },
    snippets: [
      {
        title: '卡片',
        schema: {
          componentName: 'Card',
          props: { title: '卡片' },
          children: [{ componentName: 'Text', props: { text: '卡片内容' } }],
        },
      },
    ],
  },
  component: CardWidget,
}

export const TabsMaterial: Material = {
  meta: {
    componentName: 'Tabs',
    title: '标签页',
    group: 'layout',
    icon: '📑',
    isContainer: true,
    childWhitelist: ['TabPane'],
    description: '多标签页容器（children = TabPane）',
    configure: {
      props: [
        {
          name: 'type',
          label: '样式',
          setter: 'select',
          options: [
            { label: '下划线', value: 'line' },
            { label: '卡片', value: 'card' },
          ],
          default: 'line',
        },
      ],
    },
    snippets: [
      {
        title: '标签页',
        schema: {
          componentName: 'Tabs',
          props: {},
          children: [
            { componentName: 'TabPane', props: { label: '页签1', name: 'tab1' }, children: [] },
          ],
        },
      },
    ],
  },
  component: TabsWidget,
}

export const TabPaneMaterial: Material = {
  meta: {
    componentName: 'TabPane',
    title: '页签',
    group: 'layout',
    icon: '🗂️',
    isContainer: true,
    parentWhitelist: ['Tabs'],
    configure: {
      props: [
        { name: 'label', label: '页签标题', setter: 'text', default: '页签' },
        { name: 'name', label: '标识', setter: 'text', default: '', tip: 'v-model 匹配用，不填自动生成' },
      ],
    },
    snippets: [{ title: '页签', schema: { componentName: 'TabPane', props: { label: '页签' }, children: [] } }],
  },
  component: TabPaneWidget,
}

export const DividerMaterial: Material = {
  meta: {
    componentName: 'Divider',
    title: '分割线',
    group: 'basic',
    icon: '➖',
    configure: {
      props: [
        { name: 'title', label: '标题', setter: 'text', default: '' },
        {
          name: 'direction',
          label: '方向',
          setter: 'select',
          options: [
            { label: '水平', value: 'horizontal' },
            { label: '垂直', value: 'vertical' },
          ],
          default: 'horizontal',
        },
      ],
    },
    snippets: [{ title: '分割线', schema: { componentName: 'Divider', props: {} } }],
  },
  component: DividerWidget,
}

export const PageMaterial: Material = {
  meta: {
    componentName: 'Page',
    title: '页面',
    group: 'layout',
    icon: '🗔',
    isContainer: true,
    description: '页面根容器（schema 的顶层节点）',
    configure: {
      props: [{ name: 'pageTitle', label: '页面标题', setter: 'text', default: '页面' }],
    },
    snippets: [{ title: '页面', schema: { componentName: 'Page', props: {} } }],
  },
  component: PageWidget,
}