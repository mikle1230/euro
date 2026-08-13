@AGENTS.md

# Euro Atlas — 欧洲地接行程工作台

为欧洲地接社（KuoniTumlare / JTB）构建的行程规划与报价辅助工具。

> **架构速览见 [docs/architecture.md](docs/architecture.md)** —— 含响应式 store 数据流、item 工厂、免费/收费判定、地图常量等关键不变量，改动前先读。

## 技术栈

- **框架**: Next.js 16.3 App Router + Turbopack（`src/app/` 目录）
- **地图**: Leaflet + React-Leaflet（CSR only，`dynamic(..., { ssr: false })`）
- **样式**: Tailwind CSS 4 + CSS 变量双主题（`var(--bg-card)`, `var(--text-primary)` 等）
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
    floating-panel.jsx               # 右侧侧边栏面板（行程列表 + 当前行程详情）
    upload-modal.jsx                 # 导入弹窗（上传 → AI解析 → 预览 → 导入）
    panel-views/
      itinerary-list.jsx             # 行程列表 Tab
      day-detail.jsx                 # 天数详情 Tab（隐藏免费/全展开/收起）
      database.jsx                   # 数据库（已从面板移除，保留文件）
      overview.jsx                   # 总览（已从面板移除，保留文件）
      entity-manager.jsx             # 实体管理（已从面板移除，保留文件）
  lib/
    data.js                          # 城市/景点数据查询（惰性 Map 索引）
    itinerary-store.js               # 响应式行程 store（useSyncExternalStore + localStorage）
    entity-store.js                  # 实体存储（localStorage euro-entities）
    config.js                        # SITE / 类型标签 / 地图常量 MAP（defaultZoom=4.5）
    prompt.js                        # AI 解析 system prompt（SYSTEM_PROMPT）
    quos-mapping.js                  # QUOS 类型映射（12 种服务类型）
    id.js                            # 共享 uid()
```

## 面板架构

- FloatingPanel 是右侧固定侧栏，覆盖在地图上（overlay 模式）
- 仅保留 2 个 Tab：**📋 行程列表** + **📅 当前行程详情**
- 面板宽度 360-700px，默认 50vw，左边缘可拖拽调整
- 展开/收起：展开时 map 容器 `right: panelWidth` + `map.invalidateSize()` 重新居中
- 面板状态（collapsed, panelWidth）提升到 `explore/page.js`，同时传递给 MapCore 和 FloatingPanel

## 行程数据模型

```js
itinerary = {
  id, name, tourCode, startDate, endDate, groupSize,
  days: [{
    id, dayNumber, cityId, cityName,
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

### 免费/收费判断逻辑（`isFreeItem` in day-detail.jsx）
1. `costCategory === 'free'` → 免费
2. `costCategory === 'paid'` → 收费
3. 无 costCategory 字段 → `price === 0` 则为免费

## AI 解析流程

1. 用户在顶栏点 📤 → UploadModal 打开
2. 拖拽/选择 PDF/Word/Excel 文件 → POST `/api/parse-itinerary`
3. 服务端解析文件文本 → 调 DeepSeek API → 返回结构化 JSON
4. 前端预览（可切换隐藏免费项目）→ 确认导入
5. `importItinerary()` 写入 localStorage，同时种子化酒店实体

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
