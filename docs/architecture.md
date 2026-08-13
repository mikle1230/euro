# Euro Atlas 架构速览

给后续开发者/Agent 的地图 —— 读完这份比重新扫一遍代码省 token。

## 数据流：响应式行程 store

行程数据统一走 `src/lib/itinerary-store.js`（响应式），是唯一数据源。

```
组件调 mutation（addItem / addDay / removeItem ...）
  → 改内存 state（原地 mutate）
  → commit()：写 localStorage + version++ + 通知订阅者
  → 用 useItineraries() 订阅的组件自动重渲染
```

**关键设计**（`useSyncExternalStore` + version 计数器，无第三方依赖）：

- `state` 是模块级单例，惰性从 localStorage 加载一次后缓存。
- `commit()` 用 `version++` 作为变化信号，而非替换对象引用（state 是原地 mutate 的）。
- `useItineraries()` 订阅 version，返回 `{ itineraries, activeId }`。

**⚠️ 重要推论**：因为对象是原地 mutate 的，`itinerary`/`activeItinerary` 的**引用始终稳定**。因此：

- 组件里派生数据（routeLine、dayLabels 等）要**每次 render 内联计算**，不要 `useMemo` 依赖对象引用，否则不会在变更后重算。
- 子组件（day-detail / quos-list / itinerary-list）**不需要手动 refresh**，也不需要 `onItineraryChange` 回调 —— mutation 后父组件订阅触发整棵树重渲染，子组件重新读 `itinerary.days` 即得新数据。

订阅链：`explore/page.js`（`useItineraries()`）→ 重渲染 → `FloatingPanel` → `DayDetail`/`ItineraryList`（非 memo，跟随重渲染）。

`activeId` 驱动当前行程；`deleteItinerary` 会自动把 `activeId` 指向剩余首个。

## 行程数据模型

```js
itinerary = {
  id, serialNumber, name, tourCode, startDate, endDate, groupSize,
  days: [{ id, dayNumber, cityId, cityName, cityNameEn, items: [...] }]
}
```

item 统一由 `makeItem()` 工厂（itinerary-store 内部）创建，AI 导入与手动添加共用，避免字段漂移。item 关键字段：`type / name / nameEn / costCategory / estimatedCost / price / priceUnit / quantity / quosChecked / quosOverride / transportMode / transportSubtype`。

**免费/收费判定 `isFreeItem(item)`**（day-detail.jsx / quos-list.jsx 各有一份）：
1. `costCategory === 'free'` → 免费
2. `costCategory === 'paid'` → 收费
3. 无 costCategory → `!price || price === 0` 为免费

## 其他模块

- `src/lib/data.js`：静态 JSON（欧洲 24 国）查询。`getCityById` / `getAttractionById` 走惰性 `Map` 索引（O(1)），`getAllCitiesWithCoords` / `getAllAttractionsFlat` 结果缓存。
- `src/lib/entity-store.js`：实体（景点/酒店/餐厅）存 `euro-entities`，非响应式，CRUD 直接读写 localStorage。
- `src/lib/config.js`：`SITE` / `TYPE_LABELS` / `TYPE_ICONS` / `ENTITY_MARKER_COLORS` / **`MAP`**。
  - `MAP.defaultZoom = 4.5` —— **已确认固定值，勿改**（用户曾回滚过 4.3）。
  - `MAP.entityVisibleZoom = 8` —— 实体标记显示阈值。
- `src/lib/prompt.js`：AI 行程解析的 system prompt（`SYSTEM_PROMPT`），与 `app/api/parse-itinerary/route.js` 解耦。
- `src/lib/quos-mapping.js`：QUOS 类型映射（12 种服务类型 HTL/MTC/GUI/...）。
- `src/lib/id.js`：共享 `uid()`。

## 地图（map-core.jsx）

- 必须 `dynamic(..., { ssr: false })` 加载，Leaflet 图标需手动设默认路径。
- 面板状态（collapsed/panelWidth）提升到 explore/page.js，同时传 MapCore 与 FloatingPanel。
- 展开面板时 `map.invalidateSize()` 重新计算尺寸。

## 改动守则

- 加/改 item 字段 → 同步 `makeItem()`。
- 改免费/收费判定 → 同步 day-detail 与 quos-list 两份 `isFreeItem`。
- 改地图默认缩放 → 只动 `config.js` 的 `MAP.defaultZoom`。
- 改 AI 提示词 → 只动 `lib/prompt.js`。
- 新增 store 消费者 → 用 `useItineraries()` 订阅，不要自己读 localStorage 再 refresh。
