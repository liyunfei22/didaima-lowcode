/**
 * ============================================================
 * 物料总装：全部物料在这里批量导出（main.ts 统一注册进 MaterialRegistry）
 * ============================================================
 * 新增物料：写一个 <Name>.ts（Widget + meta），在这里追加一行即可。
 */

import type { Material } from '@/core/material/types'
import { ButtonMaterial } from './Button'
import { TextMaterial } from './Text'
import { InputMaterial } from './Input'
import { NumberInputMaterial } from './NumberInput'
import { SelectMaterial } from './Select'
import { RadioMaterial } from './Radio'
import { CheckboxMaterial, SwitchMaterial, DatePickerMaterial } from './CheckboxSwitchDate'
import { FormMaterial, FormItemMaterial } from './Form'
import { TableMaterial, TableColumnMaterial } from './Table'
import { CardMaterial, TabsMaterial, TabPaneMaterial, DividerMaterial, PageMaterial } from './Layout'

/** 全量物料表（M2 共 18 个） */
export const materials: Material[] = [
  // layout 布局
  PageMaterial,
  CardMaterial,
  TabsMaterial,
  TabPaneMaterial,
  // basic 基础
  TextMaterial,
  DividerMaterial,
  // form 表单
  InputMaterial,
  NumberInputMaterial,
  SelectMaterial,
  RadioMaterial,
  CheckboxMaterial,
  SwitchMaterial,
  DatePickerMaterial,
  FormMaterial,
  FormItemMaterial,
  // data 数据
  TableMaterial,
  TableColumnMaterial,
  // action 操作
  ButtonMaterial,
]