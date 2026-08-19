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
- `useItineraries()` 订阅 version，返回 `{ itineraries, activeId }`；`useStoreVersion()` 只返回 version。

**⚠️ 重要推论**：因为对象是原地 mutate 的，`itinerary`/`activeItinerary` 的**引用始终稳定**。因此：

- 组件里派生数据（routeLine、dayLabels 等）要 **memo 依赖 `useStoreVersion()` 的 version**，不要 `useMemo` 依赖对象引用，否则不会在变更后重算。
- 子组件（day-detail / quos-list / itinerary-list）**不需要手动 refresh**，也不需要 `onItineraryChange` 回调 —— mutation 后父组件订阅触发整棵树重渲染，子组件重新读 `itinerary.days` 即得新数据。

订阅链：`explore/page.js`（`useItineraries()`）→ 重渲染 → `FloatingPanel` → `DayDetail`/`ItineraryList`/`QUOSList`（非 memo，跟随重渲染）。

`activeId` 驱动当前行程；`deleteItinerary` 会自动把 `activeId` 指向剩余首个。

**数据安全**：
- `exportAllData()` / `importAllData()` 打包行程+实体+模板为单个 JSON（行程列表「🛟 数据备份」）。
- 写满 localStorage 时 `commit()` 置 quotaWarning，行程列表顶部显示红色横幅。
- 监听 `storage` 事件做跨标签页同步（另一标签写入后本标签自动刷新内存 state）。

## 行程数据模型

```js
itinerary = {
  id, serialNumber, name, tourCode, startDate, endDate, groupSize,
  days: [{ id, dayNumber, cityId, cityName, cityNameEn,
           cityCode, countryCode, items: [...] }]
}
```

item 统一由 `makeItem()` 工厂（itinerary-store 内部）创建，AI 导入与手动添加共用，避免字段漂移。item 关键字段：`type / name / nameEn / costCategory / estimatedCost / price / priceUnit / quantity / quosChecked / quosOverride / transportMode / transportSubtype`。

**免费/收费判定 `isFreeItem(item)`**（唯一实现，`src/lib/quos-mapping.js`，day-detail 与 quos-list 均 import）：
1. `costCategory === 'free'` → 免费
2. `costCategory === 'paid'` → 收费
3. 无 costCategory → `!price || price === 0` 为免费

## 其他模块

- `src/lib/data.js`：静态 JSON（欧洲 24 国）查询。`getCityById` / `getAttractionById` 走惰性 `Map` 索引（O(1)），`getAllCitiesWithCoords` / `getAllAttractionsFlat` 结果缓存。
- `src/lib/entity-store.js`：实体（景点/酒店/餐厅）存 `euro-entities`，非响应式，CRUD 直接读写 localStorage；**带内存缓存**（写操作后置脏），渲染循环里反复 `getAllEntities()` 不再重复解析。
- `src/lib/config.js`：`SITE` / `TYPE_LABELS` / `TYPE_ICONS` / `ENTITY_MARKER_COLORS` / **`MAP`**。
  - `MAP.defaultZoom = 4.5` —— **已确认固定值，勿改**（用户曾回滚过 4.3）。
  - `MAP.entityVisibleZoom = 8` —— 实体标记显示阈值。
- `src/lib/prompt.js`：AI 行程解析的 system prompt（`SYSTEM_PROMPT`），与 `app/api/parse-itinerary/route.js` 解耦；文末附常用城市 QUOS 码表（`src/data/city-hints.js`，由 `scripts/build-city-hints.js` 生成），AI 直接输出 `day.cityCode/countryCode`。
- `src/lib/quos-mapping.js`：QUOS 类型映射（12 种服务类型 HTL/MTC/GUI/...）。**纯函数、无 `'use client'`**，服务端/客户端通用。
- `src/lib/quote-rates.js`：固定费率集中配置（旅行保险 2.66 USD/人；前后夜默认 €120/晚，仅兜底）。保险改价只动这里。
- `src/lib/item-name.js`：统一英文名查找（AI nameEn → QUOS 标准 → 实体库）。
- `src/lib/geo.js`：`haversineKm` 距离计算（map-core / city-coords 共用）。
- `src/lib/city-coords.js`：城市坐标查询（中文/英文/变体归一化）+ `estimateRoadKm` 车程估算（haversine×1.3 道路系数，就近取整 5km）；坐标表 `src/data/city-coords.js` 由 `scripts/build-city-coords.js` 从 europe-travel.json + MANUAL 生成（EMPTY RUN 空驶公里数用）。
- `src/lib/coach-plan.js`：报价规则注入（保险 / THROUGH COACH / EMPTY RUN / 接机 / 前后夜 / 每日杂费），纯函数，route.js 调用。**THROUGH COACH 的国/城 = LDC 供应商所在地**（西欧多国→IT ROM、中欧→CZ PRG、波兰→PL WAW；2026-08-19 修正，曾误改为段起始城市），名称 = `{起始城市英文名} - {N} DAYS`（如 Warsaw - 9 DAYS）带车型（NGS/GLS），按 `ldc-mapping.js` 查表注入；**前后夜费率按 LDC 区域细分**（`ldc.prepost`），界面不显示金额；**中国出发/返程日不参与分段**（避免虚段）；**接机/送机只在抵达/离境日**（国/城=当天城市，名称 `{城市英文名} - APT/HTL` / `- HTL/APT`）；**返程离境日总是单独送机**（THROUGH COACH 段不覆盖离境日）；**每日用车杂费**（部分城市，`src/data/daily-fees.js`）段内命中注入；**EMPTY RUN 空驶**（`quoteKind: 'empty-run'`）每段都有（有 THROUGH COACH 就有），加在段首天，公里数 = 该段 from→to 真实车程，按 ER_RULES 阶梯计价，由 route.js `patchEmptyRunRoadKm` 用 OSRM 真实驾驶距离补全（`src/lib/road-distance.js`，失败回退 `estimateRoadKmFallback` 直线×1.3）；day 0 中国出发日不参与判定。
- `src/lib/ldc-mapping.js`：LDC 长途车供应商判定（单国/多国/北极极地），纯函数；`SUPPLIERS` 每条目含 `prepost`（区域前后夜费率）与 `finlandNorthNgs`（ON REQUEST）。
- `src/lib/api-config.js`：客户端 API Token 存取（解析接口鉴权，见 route.js 的 `PARSE_API_TOKEN`）。
- `src/lib/id.js`：共享 `uid()`。

## 主题 token（globals.css）

- 双主题 token：浅色 `#E7EEF8` 蓝灰底 / 深色深夜蓝 `#071521`。
- 品牌 5 色：主蓝 `#08739D`（accent/主按钮）、辅蓝 `#4984AC`（dim/hover）、浅底 `#E7EEF8`、绿 `#6D9D39`（行程城市标记）、青柠 `#AEC60C`（深色价格/高亮环）。
- **`--accent`** 用于文字/标记/选中态（深色模式用辅蓝亮化 `#63a0c8` 保证 ≥4.5:1）；**`--accent-strong`** 用于主按钮底色（白字 5.32:1）——新增按钮一律用它，勿用 `--accent` 配白字。
- `--text-tertiary` / `--gold` 已调至 WCAG AA（≥4.5:1 小字）；浅色价格文字是青柠的深橄榄化 `#5f7113`，深色直接用 `#AEC60C`。
- 地图配色（marker/线路/高亮环）在 map-core.jsx 有独立常量，与新 token 同源（主蓝/辅蓝/绿/青柠）。

## QUOS 行程详情的复制/导出

- `quos-list.jsx`：行/按天/按类型/全部「复制」（Tab 分隔，可直接粘贴进 Excel 类表格）、CSV 导出（带 BOM）、¥预估合计 / €单价合计（按类型视图有小组小计）。
- 复制/导出范围 = 当前可见项（受隐藏免费/用餐/景点/内陆交通 + 只看未录 过滤影响）。

## 地图（map-core.jsx）

- 必须 `dynamic(..., { ssr: false })` 加载，Leaflet 图标需手动设默认路径。
- 面板状态（collapsed/panelWidth）提升到 explore/page.js，同时传 MapCore 与 FloatingPanel。
- 展开面板时 `map.invalidateSize()` 重新计算尺寸。
- explore/page.js 的派生数据（routeLine/dayLabels/itineraryCityIds）用 `useMemo` + `useStoreVersion()`，hover 等无关状态不会重建 markers。

## 测试

- `npm test`（node:test，`scripts/tests/*.test.mjs`）：coach-plan（报价规则）、ldc-mapping（供应商判定）、quos-mapping（类型/免费/城市码）。
- 纯函数库测试要求相对路径 import + `.js` 扩展名；JSON 用 `with { type: 'json' }`。

## 改动守则

- 加/改 item 字段 → 同步 `makeItem()`。
- 改免费/收费判定 → 只动 `quos-mapping.js` 的 `isFreeItem`。
- 改地图默认缩放 → 只动 `config.js` 的 `MAP.defaultZoom`。
- 改 AI 提示词 → 只动 `lib/prompt.js`；改城市码表 → 跑 `scripts/build-city-hints.js`。
- 改固定费率 → 只动 `lib/quote-rates.js`。
- 新增 store 消费者 → 用 `useItineraries()` 订阅，不要自己读 localStorage 再 refresh。
- 改报价规则 / LDC 判定 / QUOS 映射 → 跑 `npm test`。
- 纯函数库不加 `'use client'`。
