# QUOS 录入清单视图 — 设计规格

## Context

用户从客户获取旅游产品文档 → AI 解析为结构化行程 → 对照列表手动录入 QUOS 报价系统。当前 DayDetail 的卡片式视图适合浏览行程，但不适合逐行对照录入。需要一个紧凑的表格视图，带 QUOS 编码、国家/城市代码、排序配置。

## 核心需求

1. 紧凑表格视图，每行一个项目，信息密度高
2. 默认按天顺序排列，可切换按 QUOS 类型分组
3. 每行显示：QUOS 类型 | 国家码 | 城市码 | 项目名称(中+英) | 时间 | 收费/免费 | 预估费用 | 数量 | 备注
4. 用户可自定义 12 种 QUOS 类型的排序（默认 HTL→MTC→ENT→RST→GUI→FLT→DTR→OTR→DFR→OFR→LUG→OTH）
5. QUOS 类型自动映射，可手动下拉调整
6. 国家/城市码从 KT Cities.xlsx 自动匹配
7. 景点英文名优先 KT 巴黎景点标准名
8. 支持隐藏免费项目

## 数据来源

### QUOS 类型映射（通用 type → QUOS code）

| 通用 type | QUOS Code | 说明 |
|-----------|-----------|------|
| hotel | HTL | 酒店住宿 |
| transport (bus) | MTC | 大巴接送 |
| transport (flight) | FLT | 航班 |
| transport (train, daytime) | DTR | 日间火车 |
| transport (train, overnight) | OTR | 夜间火车 |
| transport (ferry, daytime) | DFR | 日间渡轮 |
| transport (ferry, overnight) | OFR | 夜间渡轮 |
| attraction | ENT | 景点门票 |
| breakfast/lunch/dinner | RST | 餐厅用餐 |
| guide | GUI | 导游服务 |
| luggage | LUG | 行李服务 |
| other | OTH | 其他 |

映射函数在 `src/lib/quos-mapping.js`，返回 QUOS code。对于边界情况（如 transport 需区分 day/overnight、train/ferry），AI prompt 增加 `transportSubtype` 字段辅助判断。

### 国家/城市码

来源：`/Users/michael/Projects/KT/系统拷贝列表/Cities.xlsx`
- 列：City Name, City Code (3-letter), Country Code (2-letter)
- 预编译为 JSON：`src/data/quos-cities.json`
- 构建脚本：`scripts/build-quos-cities.js`（读取 xlsx → 输出 JSON Map）
- 匹配逻辑：AI 输出的 cityName 去 Map 查 → 返回 `{ cityCode, countryCode }`
- 匹配不到：标红，留空，用户手动输入

### 景点英文名

优先级：
1. KT 巴黎景点.xlsx 的标准译名（如 `EIFFEL TOWER`）→ 预编译为 `quos-attractions.json`
2. euro-travel.json 的 `nameEn` 字段（55 个景点已添加）
3. 没有匹配的 → 留空

## UI 设计

### 视图位置

在 `day-detail.jsx` 顶部工具栏增加视图切换：
```
[📋 卡片] [📊 清单]   👁️隐藏免费  ⇲全部展开
```

### 清单表格行设计

```
▼ Day 1 — 巴黎 Paris (CDG / FR)
  ENT  FR  CDG  埃菲尔铁塔 Eiffel Tower        09:00-11:00  收费 €25  ×20  含登顶
  MTC  FR  CDG  大巴接送 Coach Transfer         11:00-11:30  免费  €0   ×1   
  RST  FR  CDG  法式午餐 French Lunch           12:00-13:00  收费  €35  ×20  
  HTL  FR  CDG  巴黎万豪 Paris Marriott         14:00        收费  €120 ×10  4★
── Day 2 — 罗马 Rome (ROM / IT) ──
  ENT  IT  ROM  斗兽场 Colosseum                09:00-11:00  收费  €18  ×20  
```

### 按类型分组视图

```
ENT — Entrance (3项)
  D1  FR  CDG  埃菲尔铁塔 Eiffel Tower    09:00  收费  €25  ×20
  D2  IT  ROM  斗兽场 Colosseum            09:00  收费  €18  ×20
  D3  IT  ROM  梵蒂冈 Vatican Museums      10:00  收费  €22  ×20
HTL — Hotel (2项)
  D1  FR  CDG  巴黎万豪 Paris Marriott     14:00  收费  €120 ×10
  D2  IT  ROM  罗马希尔顿 Rome Hilton      15:00  收费  €100 ×10
...
```

### QUOS 类型排序设置

清单顶部 `⚙️ 排序设置` 按钮 → 弹出小面板，12 种类型可拖拽排序。存入 `localStorage` key `euro-quos-order`。

默认顺序：
```
HTL → MTC → ENT → RST → GUI → FLT → DTR → OTR → DFR → OFR → LUG → OTH
```

## 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/quos-mapping.js` | 新增 | QUOS 类型映射 + 城市码匹配 + 排序配置读写 |
| `src/data/quos-cities.json` | 新增 | Cities.xlsx 预编译 JSON |
| `scripts/build-quos-cities.js` | 新增 | 构建脚本（一次性） |
| `src/components/panel-views/quos-list.jsx` | 新增 | QUOS 清单表格组件 |
| `src/components/panel-views/day-detail.jsx` | 修改 | 顶部增加视图切换按钮 |
| `src/app/api/parse-itinerary/route.js` | 修改 | prompt 增加 `transportSubtype` 字段（区分 day/overnight, train/ferry） |
| `src/lib/itinerary-store.js` | 修改 | `importItinerary` 保存 `transportSubtype` 字段 |

## 约束

- Cities.xlsx 8000+ 行 → 预编译 JSON 约 500KB，一次手动运行 `node scripts/build-quos-cities.js`，输出提交到 Git
- 表格行高不超过 40px，保持一屏可见 15-20 行
- 所有自动匹配结果可手动覆盖
- 双主题 CSS 变量适配
- `npm run build` 通过

## 验证

1. `npm run build` 通过
2. Cities.xlsx 预编译 JSON 生成正确
3. 导入行程 → 清单视图显示正确列
4. 按天/按类型切换正常
5. QUOS 类型下拉可手动修改
6. 排序设置可拖拽调整，刷新后保留
7. 隐藏免费项目正常工作
