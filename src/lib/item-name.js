// 统一英文名查找（单一实现）：
// 优先级 1: AI 解析的 nameEn（覆盖景点/酒店等）
// 优先级 2: QUOS 标准名（KT 巴黎景点.xlsx）
// 优先级 3: 实体库（localStorage euro-entities）
import { getAttractionNameEn } from './quos-mapping'
import { getAllEntities } from './entity-store'

export function getItemNameEn(item) {
  if (!item) return ''
  if (item.nameEn) return item.nameEn
  if (item.type === 'attraction') {
    const quosName = getAttractionNameEn(item.name)
    if (quosName) return quosName
  }
  if (typeof window !== 'undefined') {
    const entities = getAllEntities()
    const match = entities.find((e) => e.type === item.type && e.name === item.name)
    if (match?.nameEn) return match.nameEn
  }
  return ''
}
