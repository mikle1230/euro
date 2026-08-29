@AGENTS.md

# Euro Atlas — 欧洲地接行程工作台

为欧洲地接社（KuoniTumlare / JTB）构建的行程规划与报价辅助工具。

> **架构速览见 [docs/architecture.md](docs/architecture.md)** —— 含响应式 store 数据流、item 工厂、免费/收费判定、地图常量等关键不变量，改动前先读。

## 技术栈

- **框架**: Next.js 16.3 App Router + Turbopack（`src/app/` 目录）
- **地图**: Leaflet + React-Leaflet（CSR only，`dynamic(..., { ssr: false })`）
- **样式**: Tailwind CSS 4 + CSS 变量双主题（`var(--bg-card)`, `var(--text-primary)` 等；配色：主蓝 `#08739D` / 辅蓝 `#4984AC` / 浅底 `#E7EEF8` / 绿 `#6D9D39` / 青柠 `#AEC60C`）
- **存储**: localStorage（`euro-itineraries`, `euro-entities`, `euro-templates`）
- **AI**: DeepSeek API（`deepseek-chat` 模型，OpenAI 兼容 SDK，`response_format: json_object`）
- **文件解析**: pdf2json（纯 Node.js），mammoth（Word），xlsx（Excel）
- **包管理**: npm

## 项目结构

```
src/
  app/
    page.js                          # 首页
    explore/page.js                  # 地图探索页（主工作区），动态加载 MapCore
    api/parse-itinerary/route.js     # 文件上传 + AI 解析 API
    knowledge/[countryId]/...        # 知识库页面
  components/
    header.jsx                       # 顶栏（导航 + 搜索 + 导入按钮）
    map-core.jsx                     # Leaflet 地图（接受 panelCollapsed/panelWidth 动态调整）
    floating-panel.jsx               # 右侧侧边栏面板（行程列表 + 行程详情）
    upload-modal.jsx                 # 导入弹窗（选文件 → 进度条 → 自动导入，无预览）
    panel-views/
      itinerary-list.jsx             # 行程列表 Tab（含 AI 反馈重解析、重命名、删除）
      quos-list.jsx                  # 行程详情 Tab（QUOS 勾选录入，按天/按类型）
  lib/
    data.js                          # 城市/景点数据查询（惰性 Map 索引）
    itinerary-store.js               # 响应式行程 store（useSyncExternalStore + localStorage）
    entity-store.js                  # 实体存储（localStorage euro-entities，内存缓存）
    config.js                        # SITE / 类型标签 / 地图常量 MAP（defaultZoom=4.5）
    prompt.js                        # AI 解析 system prompt（SYSTEM_PROMPT，附城市码表）
    quos-mapping.js                  # QUOS 类型映射（12 种服务类型，纯函数，服务端/客户端通用）
    quote-rates.js                   # 报价固定费率集中配置（保险 2.66 USD；前后夜默认 €120 兜底）
    item-name.js                     # 统一英文名查找（AI nameEn → QUOS 标准 → 实体库）
    hotel-recommend.js               # 酒店推荐查询（按城市名/别名/城市码，返回评分≥7 参考酒店）
    geo.js                           # 距离计算（haversineKm）
    city-coords.js                   # 城市坐标查询 + 车程估算（EMPTY RUN 空驶公里数用，道路系数1.3）
    coach-plan.js                    # 报价规则注入（纯函数，route.js 调用）
    ldc-mapping.js                   # LDC 长途车供应商判定（纯函数）
    api-config.js                    # 客户端 API Token 存取（解析接口鉴权）
    id.js                            # 共享 uid()
  data/
    hotel-recommendations.js         # 酒店参考静态库（Booking 评分≥7 + 欧元参考价，非实时）
    mice-activities.js               # MICE 特色活动目录（scripts/build-mice.js 从 Excel 生成，勿手改）
```

## 面板架构

- FloatingPanel 是右侧固定侧栏，覆盖在地图上（overlay 模式）；**移动端（≤768px）不渲染地图**，面板占满全屏（header 之下），列表/详情都在面板内
- 两个视图（顶栏右侧是**导航状态指示**，非可点按钮）：**🗂️ 行程列表** ⇄ **📋 行程详情**（选中/导入行程自动进行程详情，左侧 ← 返回列表）
- **顶部导航（header.jsx）**：移动端为分段胶囊（首页/知识库，选中=品牌蓝底白字）+ 图标操作钮（📤导入/⚙️设置/主题，36px 触控目标）；桌面端（≥sm）为浏览器标签样式
- 面板宽度 360-700px，默认 50vw，左边缘可拖拽调整；收起/展开按钮在左/右缘中部（细长拉条）
- 展开/收起：展开时 map 容器 `right: panelWidth` + `map.invalidateSize()` 重新居中
- 面板状态（collapsed, panelWidth）提升到 `explore/page.js`，同时传递给 MapCore 和 FloatingPanel

## 数据安全

- 全部数据在 localStorage（行程/实体/模板），**约 5MB 上限**；**备份入口在独立页面 `/settings`**（导出/导入 JSON）
- `itinerary-store.js` 提供 `exportAllData()` / `importAllData()`（打包行程+实体+模板）
- 写满时 `commit()` 置 quotaWarning，行程列表显示红色警告横幅（指引去设置备份）
- 跨标签页同步：监听 `storage` 事件刷新内存 state
- 解析接口鉴权：`.env.local` 配 `PARSE_API_TOKEN` 后，请求需带 `Authorization: Bearer <token>`

## 行程数据模型

```js
itinerary = {
  id, name, tourCode, startDate, endDate, groupSize,
  days: [{
    id, dayNumber, cityId, cityName,
    cityCode, countryCode,              // QUOS 城市/国家码（AI 输出或 getCityCode 兜底）
    items: [{
      id, type, name, startTime, endTime, from, to,
      transportMode, price, priceUnit, quantity,
      costCategory: 'free' | 'paid',     // AI 解析写入，手动添加无此字段
      estimatedCost,                       // AI 估算的人均费用（人民币）
      notes
    }]
  }]
}
```

### 免费/收费判断逻辑（`isFreeItem`，唯一实现在 quos-mapping.js）
1. `costCategory === 'free'` → 免费
2. `costCategory === 'paid'` → 收费
3. 无 costCategory 字段 → `price === 0` 则为免费

## AI 解析流程

1. 顶栏点 📤 → **直接打开本地文件选择器**（无预览，弹窗只显示进度条）
2. 选中文件 → POST `/api/parse-itinerary` → 解析成功**自动导入**（toast 带「撤销」）
3. `importItinerary()` 写入 localStorage，同时种子化酒店实体；行程保留 `sourceText`（原文，供反馈重解析复用）
4. 导入后人工检查发现问题 → 行程行 **🤖 反馈重解析** → 填反馈 → POST `/api/reparse-itinerary`（原文 + 反馈 + 上次结果）→ AI 修正后原地替换（`replaceItineraryContent`）

## KT / QUOS 术语对照

用户的报价系统基于 KuoniTumlare 的 QUOS（引用系统），12 种服务类型：
HTL=Hotel, MTC=Motor Coach, GUI=Guide, RST=Restaurant, ENT=Entrance,
FLT=Flight, DTR=Day Train, OTR=Overnight Train, DFR=Day Ferry,
OFR=Overnight Ferry, LUG=Luggage, OTH=Others

item types 已标注 QUOS 码：景点 Attraction (ENT)、交通 Transport (MTC)、住宿 Hotel (HTL) 等。

KT 知识库位于 `/Users/michael/Projects/KT`（纯文档项目，非代码）。

## 用户工作流

导入行程文件 → AI 解析为结构化行程（编号+名称）→ 隐藏免费项目 → 用收费项目列表填入 KT/QUOS 报价系统

## 开发注意事项

- 所有 `'use client'` 组件使用单引号、无分号、2空格缩进
- Leaflet 图标修复：`import L from 'leaflet'` 并设置默认 icon 路径
- MapCore 必须禁用 SSR：`dynamic(() => import('...'), { ssr: false })`
- pdf2json 是唯一兼容 Turbopack 的 PDF 解析库（pdf-parse/pdfjs-dist 均有 worker 冲突）
- Tailwind 4 使用 CSS-first 配置，无 `tailwind.config.js`
- **纯函数库（quos-mapping / coach-plan / ldc-mapping / quote-rates / geo）不要加 `'use client'`**，服务端 route.js 才能复用；localStorage 访问一律 `typeof window` 守卫
- **测试**：`npm test`（node:test，scripts/tests/）。改报价规则 / LDC 判定 / QUOS 映射后必须跑
- **城市/码表**：精选城市表在 `scripts/curated-cities.cjs`（中文→英文），两个构建脚本共用：`build-quos-cities.js` 用它给 quos-cities.json 加中文键（配合 `Cities.xlsx` + europe-travel.json），`build-city-hints.js` 用它生成 AI 提示码表 `city-hints.js`。想给某个城市加中文识别 → 改 `curated-cities.cjs`，再跑两个构建脚本
  - **QUOS 码注意**：`Cities.xlsx` 里有的城市有「多个码」，其中部分是**内部/员工数据库专用码，不是 QUOS 码**，绝不能用于报价。已确认的：
    - **塔林 Tallinn**：QUOS 码 = **`TLL`**；`TLX` 是描述公司员工的数据库专用码，**不要用**（只用 TLL）
    - **万塔 Vantaa**：QUOS 码 = **`VAT`**（赫尔辛基机场城市），国家 FIN
- **AI 解析字段保持「有内容才填」**（prompt 规则 12 省略空字段，导入端 `makeItem()` 补默认值）——否则大行程输出超 token 上限被截断，报"AI 返回格式异常"（finish_reason=length）
- **AI 识别持续优化闭环**（省 token 优先，改识别问题按此分流）：
  1. **城市名变体/中文名没匹配上** → 加 `quos-mapping.js` 的 `CITY_ALIASES`（如 圣特罗佩→Saint Tropez）；连字符/空格写法变体已被 `getCityCode` 归一化兜底自动覆盖
  2. **希望 AI 直接输出代码** → `scripts/build-city-hints.js` 加城市后 `node scripts/build-city-hints.js` 重新生成
  3. **解析结构/规则问题** → 改 `lib/prompt.js`（压缩措辞 + 紧凑示例，勿增 token）
  4. **文件噪声大（页码/页眉重复）** → `lib/ai-parse.js` 的 `cleanText()` 已在两路由生效
  5. **用户反馈** → 行程行 🤖 反馈重解析（原文+反馈+上次结果）
  - token 控制：输入走 `cleanText` 降噪；输出靠规则 12 省略空字段；系统提示词保持精简
- **改固定费率**（保险）→ 只动 `lib/quote-rates.js`；**前后夜已按 LDC 区域细分**（西欧 €120/荷比卢 €135/英国 £110/北欧 €148…）→ 改 `lib/ldc-mapping.js` 各 SUPPLIERS 条目的 `prepost` 字段（`quote-rates.prepostNight` 仅作未命中 LDC 时的兜底；**界面不显示金额**，只显示区域名）
- **北欧 MICE 行程规则**（Viking Line 渡轮、瑞典本地 NGS 大巴、挪威路桥税、哈当厄尔/厄勒海峡大桥费、酒店/保险录入口径）见 **[context.md](context.md)**，沉淀自 Tour Maker 练习团 BJSJ.H00005；处理北欧行程前先读。
- **用车规则**（用户口径，applyQuoteRules 在 coach-plan.js）：
  1. **中国出发/返程日**（上海等 CN 城市，含 day 0）只展示，**不参与分段**（避免返程日产生虚的 THROUGH COACH/PRE-POST）
  2. **THROUGH COACH（LDC）**：每段首天注入，显示 `LDC第{起}-{止}天`（止 = 下次用飞机/火车/船的前一天）；**国/城 = LDC 供应商所在地**（遵从 LDC Summer 2026 表：西欧多国→IT ROM、中欧→CZ PRG、**德奥组合→DE BER**、波兰→PL WAW 从华沙调车；2026-08-19 修正，曾误改为段起始城市——用户录入里的 WAW/PL 正是 polandMono 供应商码；2026-08-21 修正：德奥行程 KT 曾误录 IT ROM，必须 DE BER）；名称 = `{起始城市英文名} - {N} DAYS`（如 Warsaw - 9 DAYS，名称用起始城市、国/城用供应商），nameEn 带车型（NGS/GLS）；**from 取段首日出发城（cityName；抵达日开段则取抵达城），to 取下一段交通日的「出发城」**（车把团送到机场/车站/码头，如巴勒莫→卡塔尼亚；无后续 transit 回退段末日 cityName）
  3. **EMPTY RUN 空驶**：**每段都有**（有 THROUGH COACH 就有），加在段首天，公里数 = 该段 from→to **真实车程**（route.js 调 `patchEmptyRunRoadKm` → OSRM 免费路线服务，失败回退 `estimateRoadKmFallback` 直线×1.3）；`quantity`=公里数，quoteOrder 22
  4. **抵达日用车**（2026-08-29 更新，Michael 口述口径，替代 8-21 版；核心原则：**成本性价比，活动量决定用车档次**）：
     - **首日抵达，当天无活动**（纯抵达）→ 单独当地 STD MTC 接机：`{城} - APT/HTL`（flight→APT/HTL、train→HTL-STA、boat→HTL-PIER）
     - **首日抵达，当天活动少**（约 1-2 小时）→ 当地 STD MTC：接机 + 几小时活动后送酒店（`{城} - APT/HTL` + `{城} - X HOURS`）
     - **首日抵达，当天活动多** → **直接用 LDC 长途车，THROUGH COACH 段从 Day 1 开始**（不再一律 STD MTC 接机）
     - **中途单晚停留的抵达日**（R3/R4 断开落地，realDays 非首日）→ 段从当天开始（THROUGH COACH 负责接机）
     - **同城住宿 ≥2 天** → 第 1 天接机 STD MTC、第 2 天起 LDC（除非首日活动多，按上述口径直接 LDC）
     - **接机/送机的国/城 = 当天城市**（如 Warsaw - APT/HTL → WAW/PL）
     - 「活动多 vs 少」量化阈值待定（暂按活动总时长 ≥4h 为多，待 Michael 确认）
  5. **送机 MTC**（2026-08-29 更新，Michael 口述口径）：离境日（返程航班日）**当天仍有大量活动** → THROUGH COACH 段**覆盖到返程日当天**（大巴白天仍用、送机场也由大巴完成，不单独注入送机，如 B线法意瑞 D11 罗马→北京上午游览）；**纯送机**（无白天活动，早餐不算）→ 断段，THROUGH COACH 止于前一天，单独注入送机（`{城市英文名} - HTL/APT`，国/城=当天城市，quoteKind `dropoff`）；「大量活动」阈值待定
  6. **PRE/POST 前后夜**：每个 LDC 段首天注入（有 THROUGH COACH 才有），金额不显示
  7. **每日用车杂费**（部分城市有，`src/data/daily-fees.js`）：段内每天命中 DAILY_FEES 表（中文名/英文名/城市码）则注入 `{城市英文名} - {备注}`，THROUGH COACH (GLS)，国/城=杂费城市，quoteOrder 21；**德国境内每天另注 GERMAN VAT**（`Base - GERMAN VAT`，€90.43/天，quote-rates.js `germanVat`，quoteOrder 21）；**LDC 路税**（quote-rates.js `roadTax`，quoteOrder 21，quoteKind `road-tax`）：按**过夜国家**命中 `[NO,CH,AT,DE,HU,CZ,SI,SK,CR]` 强制生成（不可遗漏），名称按 KT 映射表（如 AT→`Austria ROAD TAX PAID BY DRIVER`、DE/NO/CH→`LDC路税`、HU→`Budapest - HUGO ROAD TOLL`、CZ→`Prague - CZ ROAD TAX`、SI→`Ljubljana - ROAD TAX`、SK→`Bratislava - ROAD TAX PER DAY`、CR→`Zagreb - Croatian Road Tax`），**金额/计费单位待操作员实填（price=0）**
  8. 无 LDC 供应商（表外国家）→ 上述用车项全部不注入
  9. **当地独立用车规则**（2026-08-19 新增，参数在 `src/data/coach-rules.js`，说明见 `docs/coach-rules.md`）：
     - **R1 单接送机**：首日仅接机 → `{城} - APT/HTL`；末日仅送机 → `{城} - HTL/APT`（有半天活动 → `{城} - APT - X HOURS`）
     - **R2 落地同城段**：被飞机/火车断开后、同城停留多天且无地面跨城移动（段首日前一天是抵达日且**段内每天过夜城市都与抵达日同城**）→ **当地车**（每天一条 `{城} - X HOURS`，quoteKind `local-mtc`，脱离 LDC，不注入 THROUGH COACH/EMPTY RUN/PRE-POST；只比段首尾同城会误判首日抵达后次日换城的段）
     - **R3 断开 ≤400km**（`estimateRoadKmFallback` 断开 from→to）：默认 `local-then-ldc`（落地后开始 THROUGH COACH）；可切 `ldc-continuous`（THROUGH COACH 跨断开连续，**不换车**，高端团/客户指定团）
     - **R4 断开 >400km**：落地后开始 THROUGH COACH（断开前当地车在 AI 数据含出发城当天时注入 `{城} - APT - X HOURS`）
     - 当地车小时数默认 `05 HOURS`（`localMtcHours`，凭经验多留 buffer；从 `std-mtc-options.js` 城市选项表精确匹配）
- **酒店推荐**：静态参考库在 `src/data/hotel-recommendations.js`（每城 2-3 家，Booking 评分≥7 + 欧元参考价，非实时）；查询走 `lib/hotel-recommend.js` 的 `recommendHotels(name, nameEn, limit, cityCode)`（中文/英文/别名/城市码均可命中，自动过滤评分<7）。想加城市 → 调研后直接编辑数据文件，或沿用 `scripts/merge-hotel-research.py` 合并子代理 JSON 输出；**UI 在 quos-list（行程详情按天）**
- **MICE 特色活动**：活动目录在 `src/data/mice-activities.js`（由 `scripts/build-mice.js` 从 `../MICE/*.xlsx` 解析生成，**勿手改**）；查询走 `lib/mice.js`（`getAllMiceActivities` / `getMiceActivityById` / `filterMiceActivities` / `resolveCountry` 国家智能解析）；页面 `/mice`（列表+搜索+筛选）与 `/mice/[id]`（详情，含「复制到报价单」入口）。**扩充数据**：新国家活动 Excel（同列结构）放入 `../MICE/` 后重跑 `node scripts/build-mice.js` 自动并入；国家/标签/团型列表从数据自动生成。详见 `docs/mice.md`
- **主按钮底色一律用 `var(--accent-strong)`**（不要 `--accent` 配白字：深色模式白字在 #2dd4bf 上仅 1.86:1）；改主题色 → `globals.css` token
- **QUOS 行程详情**：勾选录入（按天/按类型）+ 底部合计行 + 移动端 CSV 导出；复制功能已移除
- **JSON import**：纯 Node 环境（测试脚本）要求 `with { type: 'json' }` + 相对路径；Next 里两种写法都支持
