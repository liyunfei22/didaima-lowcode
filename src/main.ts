import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { enablePatches } from 'immer'
import 'element-plus/dist/index.css'
import './style.css'
import App from './App.vue'
import { materialRegistry } from '@/core/material/registry'
import { materials } from '@/materials'
import { registerBuiltinActions } from '@/core/events/actions'

// ⚠️ immer 的 patches 能力（produceWithPatches / applyPatches）需要显式启用插件。
// 我们历史栈全靠它（undo/redo + 协作协议同族），忘了调会在运行时抛
// "[Immer] The plugin for 'Patches' has not been loaded"。
enablePatches()

// 全局注册物料（M2：真实物料取代 M1 的一次性演示物料）
materialRegistry.registerAll(materials)
// 注册内置动作（M8：事件动作系统的动作表，EventPanel 下拉/executor 都认它）
registerBuiltinActions()

createApp(App).use(createPinia()).mount('#app')