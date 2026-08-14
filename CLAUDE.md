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
    floating-panel.jsx               # 右侧侧边栏面板（行程列表 + 行程详情 + 编辑行程）
    upload-modal.jsx                 # 导入弹窗（选文件 → 进度条 → 自动导入，无预览）
    panel-views/
      itinerary-list.jsx             # 行程列表 Tab（含 AI 反馈重解析、存模板）
      day-detail.jsx                 # 编辑行程 Tab（隐藏免费/全展开/收起）
      day-item.jsx                   # ItemRow / ItemForm（天数详情里的条目行与编辑表单）
      quos-list.jsx                  # 行程详情 Tab（QUOS 勾选录入，按天/按类型）
      database.jsx                   # 数据库（已从面板移除，保留文件）
      overview.jsx                   # 总览（已从面板移除，保留文件）
      entity-manager.jsx             # 实体管理（已从面板移除，保留文件）
  lib/
    data.js                          # 城市/景点数据查询（惰性 Map 索引）
    itinerary-store.js               # 响应式行程 store（useSyncExternalStore + localStorage）
    entity-store.js                  # 实体存储（localStorage euro-entities，内存缓存）
    config.js                        # SITE / 类型标签 / 地图常量 MAP（defaultZoom=4.5）
    prompt.js                        # AI 解析 system prompt（SYSTEM_PROMPT，附城市码表）
    quos-mapping.js                  # QUOS 类型映射（12 种服务类型，纯函数，服务端/客户端通用）
    quote-rates.js                   # 报价固定费率集中配置（保险 2.66 USD、前后夜 €120）
    item-name.js                     # 统一英文名查找（AI nameEn → QUOS 标准 → 实体库）
    geo.js                           # 距离计算（haversineKm）
    coach-plan.js                    # 报价规则注入（纯函数，route.js 调用）
    ldc-mapping.js                   # LDC 长途车供应商判定（纯函数）
    api-config.js                    # 客户端 API Token 存取（解析接口鉴权）
    id.js                            # 共享 uid()
```

## 面板架构

- FloatingPanel 是右侧固定侧栏，覆盖在地图上（overlay 模式）
- 两个视图（顶栏右侧是**导航状态指示**，非可点按钮）：**🗂️ 行程列表** ⇄ **📋 行程详情**（选中/导入行程自动进行程详情，左侧 ← 返回列表）；**✏️ 编辑行程**视图已注释（无入口）
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
- **城市码表**：`src/data/city-hints.js` 由 `scripts/build-city-hints.js` 从 quos-cities.json 生成，改表后 `node scripts/build-city-hints.js` 重新生成，勿手改
- **AI 解析字段保持「有内容才填」**（prompt 规则 12 省略空字段，导入端 `makeItem()` 补默认值）——否则大行程输出超 token 上限被截断，报"AI 返回格式异常"（finish_reason=length）
- **改固定费率**（保险/前后夜）→ 只动 `lib/quote-rates.js`
- **主按钮底色一律用 `var(--accent-strong)`**（不要 `--accent` 配白字：深色模式白字在 #2dd4bf 上仅 1.86:1）；改主题色 → `globals.css` token
- **QUOS 行程详情**：行/按天/按类型/全部复制（Tab 分隔可直贴表格）+ CSV 导出 + ¥/€ 合计；**桌面工具栏的「复制/CSV/已录计数」暂时注释**（功能待定，移动端保留）——恢复/移除时改 `quos-list.jsx`
- **JSON import**：纯 Node 环境（测试脚本）要求 `with { type: 'json' }` + 相对路径；Next 里两种写法都支持
