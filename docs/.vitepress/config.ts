import { defineConfig } from 'vitepress'

/**
 * VitePress 站点配置
 * 部署在 GitHub Pages 的仓库路径：https://liyunfei22.github.io/didaima-lowcode/
 * base 必须是 '/{{ 仓库名 }}/'，否则静态资源 404。
 */
export default defineConfig({
  title: 'didaima · 教学级低代码平台',
  description: '从零实现一个覆盖全部核心原理的低代码平台：调研 + 源码 + 学习文档',
  lang: 'zh-CN',
  base: '/didaima-lowcode/',
  lastUpdated: true,

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '快速开始', link: '/guide/quick-start' },
      { text: '调研文档', link: '/research/01-platform-overview' },
      { text: '架构设计', link: '/architecture' },
      { text: '实现笔记', link: '/implementation-notes' },
      { text: 'GitHub', link: 'https://github.com/liyunfei22/didaima-lowcode' },
    ],

    sidebar: [
      {
        text: '开始',
        items: [
          { text: '介绍', link: '/' },
          { text: '快速开始', link: '/guide/quick-start' },
        ],
      },
      {
        text: '调研（先读）',
        items: [
          { text: '01 · 平台全景调研', link: '/research/01-platform-overview' },
          { text: '02 · 核心原理详解', link: '/research/02-core-principles' },
          { text: '03 · 参考资料清单', link: '/research/03-references' },
        ],
      },
      {
        text: '设计',
        items: [{ text: '架构设计文档', link: '/architecture' }],
      },
      {
        text: '实现',
        items: [{ text: '实现笔记（M0-M9 全过程）', link: '/implementation-notes' }],
      },
    ],

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新', formatOptions: { dateStyle: 'short', timeStyle: 'short' } },
    darkModeSwitchLabel: '深色模式',
    sidebarMenuLabel: '菜单',
    returnToTopLabel: '回到顶部',
    search: { provider: 'local', options: { placeholder: '搜索文档…' } },
    footer: {
      message: '教学项目 · 对照 lowcode-engine / amis / craft.js 实现',
      copyright: 'MIT License · didaima',
    },
  },
})