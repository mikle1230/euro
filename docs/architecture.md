# Euro Atlas 架构速览

给后续开发者/Agent 的地图 —— 读完这份比重新扫一遍代码省 token。

> ⚠️ **2026-09-18 已退役**：AI 行程解析（`lib/ai-parse.js` / `lib/prompt.js` / `api/parse-itinerary`）与地图线路绘制（`map-core.jsx` / `route-plan.js` / `day-route.js` / 段抽屉）已删除，相关组件与 `/explore` 工作台**不再存在**。
> 2026-09-19 **P0** 又删掉死管道（`map-core` / `hotel-map` / `floating-panel` / `panel-views/quos-list` / `confirm-dialog` / `modal` / `city-match` / `flags` / `use-is-mobile`），并作废 `.ulpi/design/*`。
> 产品与设计真理在 **`docs/product-spec-2026-09.md`**（身份 E｜磁贴墙；D1 只到查/看、D2 费率只读）。本文件只描述**当前代码事实**。

## 路由现状（共 5 条页面 + 1 个 API）

| 路由 | 文件 | 说明 |
|---|---|---|
| `/` | `app/page.js` | 仅 `redirect('/knowledge')` —— **当前没有主页**（P1 重写为工作台） |
| `/knowledge` | `app/knowledge/page.jsx` | 城市库首页；`ensureSeeded`、QUOS 国码反查、自定义城市 |
| `/knowledge/[countryId]` | `.../[countryId]/page.jsx` | 国家页；`dynamic(() => import('@/components/country-map'), { ssr: false })` |
| `/knowledge/[countryId]/[cityId]` | `.../[cityId]/page.jsx` | 城市页 |
| `/knowledge/[countryId]/[cityId]/[attractionId]` | `.../[attractionId]/page.jsx` | 景点详情页 |
| `/hotels` | `app/hotels/page.js` | 酒店库（`hotel-prices` 历史报价 + `hotel-recommend` 推荐库双数据源） |
| `/mice` `/mice/[id]` | `app/mice/page.js` / `app/mice/[id]/page.js` | MICE 列表 / 详情 |
| `/settings` | `app/settings/page.jsx` | QUOS 排序、API Token、数据备份导出/导入 |
| `/api/fx` | `app/api/fx/route.js` | 汇率服务端代理 → `v6.exchangerate-api.com`，读 `EXCHANGE_RATE_API_KEY` |

已删除且不再存在：`/explore`、`/api/parse-itinerary`、`/api/reparse-itinerary`。

## store / 状态

无 Context Provider：`app/layout.js` 直接 `<Header/> {children} <ToastHost/>`，状态靠模块级 store。

### `src/lib/itinerary-store.js`（`'use client'`，**半活**）

2026-09-18 已瘦身，只保留查询平台仍需要的部分。现存导出：

- `exportAllData()` / `importAllData(data)` —— **当前唯一活消费者**：`app/settings/page.jsx` 的「数据备份」。打包 行程 + 实体 + 模板 为单个 JSON；导入时每条 item 过内部 `makeItem()` 归一化字段。
- `getAllTemplates()` —— 内置 3 个模板（`tpl-classic-7` / `tpl-eastern-12` / `tpl-uk-5`），导出时排除。
- `getQuotaWarning()` / `subscribeQuotaWarning(cb)` —— localStorage 写满告警。
- `updateItem()` / `setDayChecked()` —— QUOS 勾选状态写入。

⚠️ **现状**：`getQuotaWarning` / `subscribeQuotaWarning` / `updateItem` / `setDayChecked` **当前无任何界面消费者**（原宿主 `panel-views/quos-list.jsx` 已按 D1 删除）；保留是为了数据备份与 P2 复用。已删除的导出：解析导入、行程/天/条目增删、重命名、模板 CRUD、`useItineraries`。

内部仍是「内存单例 + localStorage + version 计数 + `listeners` 订阅」结构；`commit()` 写 localStorage、`version++`、通知订阅者。监听 `storage` 事件做跨标签同步。写满时置 `quotaWarning`。

### `src/lib/entity-store.js`（**活，部分**）

实体（景点/酒店/餐厅）存 `euro-entities`，非响应式，CRUD 直接读写 localStorage，**带内存缓存**（写操作后置脏），渲染循环里反复 `getAllEntities()` 不重复解析。导出：`ensureSeeded` / `getAllEntities` / `getEntitiesByType` / `getEntityById` / `searchEntities` / `createEntity` / `updateEntity` / `deleteEntity` / `replaceAllEntities` / `getEntityStats`。

活消费者：`app/knowledge/page.jsx`、`components/global-search.jsx`（`ensureSeeded` + `getAllEntities`）；`lib/item-name.js` 与 `lib/itinerary-store.js` 也用 `getAllEntities`。

## 行程数据模型

```js
itinerary = {
  id, serialNumber, name, tourCode, startDate, endDate, groupSize,
  days: [{ id, dayNumber, cityId, cityName, cityNameEn,
           cityCode, countryCode, items: [...] }]
}
```

item 由 `itinerary-store` 内部工厂 `makeItem()` 创建/归一化（导入备份时走它），避免字段漂移。item 关键字段：`type / name / nameEn / costCategory / estimatedCost / price / priceUnit / quantity / quosChecked / quosOverride / transportMode / transportSubtype`。

**免费/收费判定 `isFreeItem(item)`**（唯一实现，`src/lib/quos-mapping.js`）：
1. `costCategory === 'free'` → 免费
2. `costCategory === 'paid'` → 收费
3. 无 costCategory → `!price || price === 0` 为免费

## 模块地图（`src/lib`，22 个文件）

**查询核心**
- `quos-mapping.js`：QUOS 类型映射（12 类 `HTL/MTC/ENT/RST/GUI/FLT/DTR/OTR/DFR/OFR/LUG/OTH`）、免费判定、隐藏开关、城市码查找（中文/英文/别名/归一化/手工码）、QUOS 排序持久化。**全仓被引最多（7 处）**。纯函数、无 `'use client'`。
- `data.js`：静态 JSON 查询层，读 `src/data/europe-travel.json`（**39 国 / 248 城 / 613 景点**）。`getCityById` / `getAttractionById` 走惰性 `Map` 索引（O(1)）；`getAllCitiesWithCoords` / `getAllAttractionsFlat` 结果缓存；`getCustomCities` / `saveCustomCities` 管自定义城市；`getStats` / `getCountryCoverImage`。
- `hotel-prices.js`：供应商历史酒店报价查询（`hotel-prices.json`，€/人/月）。9 个导出：`getBookingInfo` / `getMonthFromDate` / `getHotelQuotes` / `getHotelQuotesOrAll` / `getQuoteRange` / `getQuoteRangeOrAll` / `findHotelQuote` / `searchHotelQuotes` / `getHotelQuoteCatalog`。
- `hotel-recommend.js`：推荐酒店库（`hotel-recommendations.js`，€/晚），`recommendHotels` / `getHotelPriceRange` / `hasHotelData` / `getHotelCatalog` / `searchHotels`，re-export `COUNTRY_NAMES` / `COUNTRY_CURRENCIES`。
- `mice.js`：MICE 查询/筛选，读 `mice-activities.js`（1,697 条 / 3.58 MB）+ `mice-zh.js`。导出 `resolveCountry` / `getAllMiceActivities` / `getMiceActivityById` / `getMiceCountries` / `getMiceTags` / `getMiceTourCategories` / `PRICE_RANGES` / `filterMiceActivities`。
- `fx.js`：`useFx()` hook + `CURRENCIES`（19 币种）+ 5min localStorage 缓存，fetch `/api/fx`。
- `normalize.js`：`normalizeCityName(name)`（city-coords / hotel-recommend / quos-mapping 共用）。
- `geo.js`：`haversineKm`。
- `country-flags.js`：`countryIsoCode(countryId)`（`components/country-flag.jsx` 用）。
- `images.js` / `config.js` / `id.js`：占位色、`SITE`/`TYPE_LABELS`/`TYPE_ICONS`/`MAP` 等常量与 `uid()`。

**报价规则引擎（UNREACHABLE —— 界面不可达，被 `npm test` 保护；D2 决定保留为只读资料）**
- `coach-plan.js`（740 行）：`applyQuoteRules(parsed)` 注入 保险 / THROUGH COACH / EMPTY RUN / 接机 MTC / 送机 MTC / 前后夜 / 每日杂费 / 德国 VAT / 路税 / 人工处理提示；`patchEmptyRunRoadKm(result)`（async OSRM 补全空驶 km，失败回退 `estimateRoadKmFallback`）。
- `ldc-mapping.js`（420 行）：`resolveLdcSupplier` / `matchFixedEr` / `hasArcticCity` / `SUPPLIERS` / `ER_RULES` / `KNOWN_COUNTRY_CODES`。
- `quote-rates.js`：`QUOTE_RATES` 常数（保险 2.66 USD/人、前后夜 120 EUR、德 VAT 90.43 EUR、9 国路税 —— 仅 NO 有定案金额 380 NOK）。
- `road-distance.js`：`estimateRoadKmFallback(a,b)` / `roadKmBetween(a,b)`（async OSRM）。⚠️ 被 `coach-plan.js` 依赖（`cfaa47b` 曾误判「零引用」），**不能删**。
- `city-coords.js`：`getCityCoords(name)` → `[lat,lng]`（数据表 `src/data/city-coords.js`）。被 `road-distance.js` 与（已删的）`hotel-map.js` 引用。
- `quos-rows.js`（92 行）：行程 → 扁平 QUOS 行派生（`buildQuosRows` / `quosSortKey` / `sortQuosRows` / `rowsForDay` / `fmtPrice` / `formatQuosRowsText`）。**当前无 src 消费者**（原宿主 `quos-list.jsx` 已按 D1 删除），仅测试引用；D1 后作为**契约参考实现**保留。
- `item-name.js`：`getItemNameEn(item)`，仅被 `quos-rows.js` 引用。注意其链路第一段「AI nameEn」已退役，现实际只有「QUOS 标准名 → 实体库」两段可用。
- `api-config.js`：`getApiToken` / `setApiToken`（localStorage `euro-parse-token`）。**语义悬空**：唯一消费者 `settings/page.jsx` 还在，但 token 的下游 `/api/parse-itinerary` 已删。

## 数据资产（`src/data`）

JSON：`quos-cities.json`(8,458 城码) / `quos-attractions.json`(17) / `europe-travel.json`(39 国·248 城·613 景点) / `hotel-prices.json`(62 城码·89 家·17 国) / `hotel-price-intros.json`(81) / `attraction-info.json`(21) / `city-meta.json`(33) / `country-meta.json`(27) / `europe-boundaries.json`(GeoJSON 40 features)。

JS：`hotel-recommendations.js`(68 城·772 家) / `attraction-details.js`(585) / `mice-activities.js`(1,697·3.58 MB) / `mice-zh.js`(1,657) / `city-coords.js`(502) / `city-aliases.js`(3 表) / `countries.js`(**36 国** ISO 注册表) / `country-info.js`(36) / `country-intros.js`(36) / `country-images.js`(36) / `hotel-booking-map.js` / `hotel-coords.js`(空) / `manual-codes.js`(空)。

**零 UI 消费的悬挂/死资产**（D2/P2 才挂上或按内容运营处理）：`ancillary-fees.js`(154 条 / 15 region，零 import)、`city-hints.js`(146，原给 AI prompt，零引用)、`coach-rules.js` / `daily-fees.js` / `std-mtc-options.js`(仅 `coach-plan.js`，不可达)、`hotel-coords.js`(空)。

## 组件地图（`src/components`，19 个文件）

- **布局/通用**：`header.jsx`（顶部导航，`layout.js` 引）、`footer.jsx`（`not-found` 引）、`toast.jsx`（`toast()` + host）、`theme-toggle.jsx`、`type-badge.jsx`、`page-hero.jsx`（**仍被 3 个在用页面引用**：knowledge / hotels / mice，P1 替换那三页时再删）、`search-toolbar.jsx`、`bilingual-text.jsx`。
- **搜索**：`global-search.jsx`（portal，knowledge 页 + knowledge-top-bar 引）、`instant-search-dropdown.jsx`（hotels、mice 引）。
- **知识库**：`knowledge-top-bar.jsx`、`country-flag.jsx`、`country-map.jsx`（国家页 Leaflet，唯一动态加载组件；共用 `map-styles.css`）、`image-with-placeholder.jsx`、`attraction-gallery.jsx`。
- **酒店/MICE**：`currency-inline.jsx`（浮层汇率转换）、`mice-gallery.jsx`、`mice-image.jsx`。

已删除（P0 或更早）：`map-core.jsx`、`hotel-map.jsx`、`floating-panel.jsx`、`panel-views/quos-list.jsx`、`confirm-dialog.jsx`、`modal.jsx`、`upload-modal.jsx`、`day-strip.jsx`、`segment-drawer.jsx`、`panel-views/itinerary-list.jsx`。

## 主题 token（`globals.css`）

- 双主题 token：浅色 `#E7EEF8` 蓝灰底 / 深色深夜蓝 `#071521`。
- 品牌 5 色：主蓝 `#08739D`（accent/主按钮）、辅蓝 `#4984AC`（dim/hover）、浅底 `#E7EEF8`、绿 `#6D9D39`、青柠 `#AEC60C`。
- **`--accent`** 用于文字/标记/选中态（深色模式用辅蓝亮化 `#63a0c8` 保证 ≥4.5:1）；**`--accent-strong`** 用于主按钮底色（白字 5.32:1）——新增按钮一律用它，勿用 `--accent` 配白字。
- MICE 专属点缀色：`--mice-accent` / `--mice-accent-subtle` / `--mice-accent-strong`。
- ⚠️ **这套 token 仍是旧蓝系**：E｜磁贴墙（暖纸底 + 深色实底顶栏）尚未落地，P1 才改皮肤；改前先读 `docs/product-spec-2026-09.md` 第 5 节。

## 测试

`npm test`（node:test，`scripts/tests/*.test.mjs`，当前 **123 通过 / 0 失败**）：

| 文件 | 覆盖 |
|---|---|
| `coach-plan.test.mjs` | `applyQuoteRules` 全链路（47） |
| `ldc-mapping.test.mjs` | `resolveLdcSupplier` / ER 规则（19） |
| `quos-mapping.test.mjs` | 类型/免费/隐藏/城市码 + 数据漂移防护（9） |
| `quos-rows.test.mjs` | 条目派生/排序/复制文本（8） |
| `hotel-recommend.test.mjs` | 推荐库命中/完整性（9） |
| `country-images.test.mjs` | 磁盘图 ↔ 注册表一致（4） |
| `quote-rates.test.mjs` | `QUOTE_RATES` 全部费率（6） |
| `daily-fees.test.mjs` | `DAILY_FEES` 3 条（3） |
| `hotel-prices.test.mjs` | `hotel-prices.js` 9 个导出（10） |
| `ancillary-fees.test.mjs` | `ANCILLARY_FEES` 数据完整性现状（8） |

纯函数库测试要求相对路径 import + `.js` 扩展名；JSON 用 `with { type: 'json' }`。

## 改动守则

- 改免费/收费判定 → 只动 `quos-mapping.js` 的 `isFreeItem`。
- 改固定费率 → 只动 `lib/quote-rates.js`。
- 改报价规则 / LDC 判定 / QUOS 映射 / 费率 / 酒店价 → 跑 `npm test`。
- 改 item 字段 → 同步 `itinerary-store.js` 的 `makeItem()`。
- 数据更新脚本在本机不可复现（仓库根无 `Cities.xlsx` / `hotel list.xlsx`，脚本指向 KT 目录或 Windows 路径）→ 数据改动只能手工或换机时注意。
- 纯函数库不加 `'use client'`。
- 设计/产品问题一律以 `docs/product-spec-2026-09.md` 为准。
