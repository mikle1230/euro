# MICE 特色活动模块

为销售/操作人员提供的**欧洲活动目录**（MICE 会展与奖励旅游 + 特色活动 + 专业技术参访），用于制定 MICE 行程时快速检索、筛选、调用活动资源。

## 页面结构

| 路由 | 说明 |
|---|---|
| `/mice` | 活动目录主列表：卡片网格（大图/标题/国家/城市/价格/容量/标签）+ 全局搜索 + 高级筛选 |
| `/mice/[id]` | 活动详情：大图、完整描述、行程示例（Tour program example）、容量/时长/营业时间/地址/官网/价格单位、状态徽章；预留「复制到报价单」入口（当前为复制活动信息到剪贴板，后续对接 Tour Maker Add Serv 自动填充 OTH/RST 条目） |

**筛选器**：国家（下拉，含中文名/旗帜/数量，随数据自动扩充）、活动类别（Activity / Technical Visit chips）、目标团型（MICE/Premium/FIT/Standard (Leisure)）、价格区间（≤€50 / €50–100 / €100–300 / €300–1000 / €1000+）、标签（前 40 高频）、隐藏/显示关闭状态（Temporarily/Permanently Closed 灰化 + 徽章，不可加入行程）。

## 数据流

```
MICE/*.xlsx（用户提供，可增量补充）
   ↓ scripts/build-mice.js（解析 + 字段映射 + 国家智能解析）
src/data/mice-activities.js（1697 条静态数据，勿手改）
   ↓ src/lib/mice.js（纯函数查询：加载/国家解析/筛选）
/mice 列表页 + /mice/[id] 详情页
```

**扩充数据**：把新国家活动 Excel 放入 `../MICE/` 目录（与现有文件同列结构），重跑 `node scripts/build-mice.js` 即自动并入（国家列表、标签、团型均从数据自动生成，无需改代码）。

## 数据模型（MiceActivity）

| 字段 | Excel 列 | 说明 |
|---|---|---|
| `id` | — | 由标题生成的稳定 id（`mice-` 前缀） |
| `title` | Title | 活动标题 |
| `category` | Category | Activity / Technical Visit |
| `targetTourCategories` | Target Tour Categories | 团型数组（`;#` 分隔拆分），如 MICE/Premium/FIT/Standard (Leisure) |
| `tags` | Tag (s) | 标签数组（`;#` 分隔拆分） |
| `description` | Description | 详细描述 |
| `tourProgramExample` | Tour program example | 行程示例（时间安排/流程） |
| `officialWebsite` | Official website | 官网链接 |
| `capacityMin` / `capacityMax` | Capacity (min) / Max Capacity (pax) | 人数容量下限/上限（0=未填） |
| `capacityDetails` | Capacity details | 容量细节 |
| `priceMin` / `priceMax` | Minimum/Maximum price (EUR) | 欧元价格区间（0=未填） |
| `priceUnit` | Price unit | 计费单位：pax / group / hour / course / rental / set menus/pax |
| `country` | Country (Lookup) | 国家英文名（原样保留） |
| `city` | City | 城市 |
| `streetAddress` | Street address | 街道地址 |
| `openingHours` | Opening hours | 营业时间 |
| `googleMapLink` | Google map link | 地图链接 |
| `bestTimeToVisit` | Best time to visit | 最佳到访月份数组 |
| `productStatus` | Product status | Available / Temporarily Closed / Permanently Closed |
| `officeInCharge` | Office in charge (auto-fill) | 负责办公室 |
| `subCategoryForActivity` | Sub-category for Activity | 子类目（History/Art/Culinary/…） |
| `activityDuration` | Activity/Tour duration | 活动时长 |
| `salesNotes` | Any other information for Sales | 销售提示 |
| `previewImageUrl` | Preview image | SharePoint 图片 URL（从 JSON 字段解析） |

## 国家智能解析（src/lib/mice.js `resolveCountry`）

Excel 国家英文名 → `{ code, nameZh, flag }`（数据源 `data/countries.js` 的 `COUNTRIES`）：
- 精确匹配英文名（Austria → AT/奥地利）
- 兼容括号写法：`Ireland (Republic of Ireland)` → IE/爱尔兰
- 别名：Czech Republic → CZ、United Kingdom/UK → GB 等
- 未命中时保留英文名展示，不阻断

## 与现有系统集成（规划）

MICE 活动本质是 **Supplier Database** 的一部分。后续在 Tour Maker 的 Add Serv 中可从本目录检索并关联活动（自动填充名称/地址/价格，生成 OTH/RST 条目）；`Temporarily Closed` 的活动不可加入行程（列表灰化 + 详情禁用按钮）。
