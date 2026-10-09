/**
 * ============================================================
 * setter 注册表装配：把 setter 组件挂到 SetterDescriptor 上
 * ============================================================
 * PropPanel 渲染 configure.props 时按 config.setter 查这张表：`setter 描述符 → 控件`。
 */

import { SetterRegistry } from './SetterTypes'
import TextSetter from './TextSetter.vue'
import NumberSetter from './NumberSetter.vue'
import BooleanSetter from './BooleanSetter.vue'
import SelectSetter from './SelectSetter.vue'
import ColorSetter from './ColorSetter.vue'
import ArraySetter from './ArraySetter.vue'
import ObjectSetter from './ObjectSetter.vue'

SetterRegistry['text'] = TextSetter
SetterRegistry['number'] = NumberSetter
SetterRegistry['boolean'] = BooleanSetter
SetterRegistry['select'] = SelectSetter
SetterRegistry['color'] = ColorSetter
SetterRegistry['array'] = ArraySetter
SetterRegistry['object'] = ObjectSetter
SetterRegistry['json'] = ObjectSetter // json 复用对象编辑（MVP 简化）

export { SetterRegistry }