# Euro Atlas — 对话上下文

## 项目概述

**Euro Atlas** — 欧洲地接行程规划工作台。独立 GitHub 仓库 `mikle1230/euro`，Vercel 部署。

- **技术栈**：Next.js 16.3 App Router (JSX) + Tailwind CSS v4 + Leaflet (react-leaflet)
- **设计**："制图师的旅行手札" — 暖羊皮纸 / 深海军蓝，Teal + Gold
- **字体**：Geist + Noto Sans SC

## 已实现（2026-08-09）

### 数据层
- `src/data/europe-travel.json` — 清理至 20 国 / 34 城 / 55 景點（仅手写数据）
- `src/lib/data.js` — `getAllCitiesWithCoords()` + `getCountryCentroids()` + 原有查询
- `src/lib/itinerary-store.js` — localStorage CRUD：行程/天/项目的增删改查、排序

### 地图
- `src/components/map-core.jsx` — Leaflet 地图，CircleMarker + 行程线路 Polyline + 深浅色切换 + 行程城市金色高亮
- `src/components/interactive-map.jsx` — `next/dynamic` SSR wrapper
- `src/components/map-styles.css` — Leaflet UI 主题覆盖

### 浮动面板
- `src/components/floating-panel.jsx` — 可拖拽/调整尺寸/收起展开，4 视图路由
- `src/components/panel-views/itinerary-list.jsx` — 行程 CRUD
- `src/components/panel-views/day-detail.jsx` — 天数时间轴，添加景点/交通/餐饮/住宿
- `src/components/panel-views/database.jsx` — 城市搜索 + 加入行程
- `src/components/panel-views/overview.jsx` — 统计 + 线路概览

### 页面
- `src/app/page.js` — 全屏地图工作台（'use client'）
- `src/app/layout.js` — 站点元数据
- `src/components/header.jsx` — 精简工作台 header（logo + 主题切换）

### 已删除
- `/explore` 系列 250+ 页面
- `/learn` / `/passport` / `/search` / `sitemap.xml`
- 每日明信片 / 护照 / 学习打卡等组件（未删除但不再引用）
- 82 条自动生成的低质量数据

## MVP 闭环

> 打开网站 → 全屏地图 → 点击城市加入行程 → 面板管理天数 → 添加景点/交通/餐饮/住宿 → 地图显示线路

## 关键文件

| 文件 | 用途 |
|------|------|
| `src/app/page.js` | 全屏地图工作台 |
| `src/lib/itinerary-store.js` | 行程数据持久化 |
| `src/components/map-core.jsx` | Leaflet 地图 |
| `src/components/floating-panel.jsx` | 浮动面板容器 |
| `src/components/panel-views/day-detail.jsx` | 天数编辑器 |
| `src/components/panel-views/itinerary-list.jsx` | 行程管理 |
| `src/components/panel-views/database.jsx` | 城市数据库 |
| `src/components/panel-views/overview.jsx` | 行程总览 |
| `src/data/europe-travel.json` | 核心数据（55 景点） |
| `.claude/design-decisions.md` | 32 轮设计决策文档 |

## 待推进

- 删除不再使用的旧组件文件（breadcrumb, daily-postcard, passport-stamp 等）
- 景点坐标补充（目前仅城市有坐标）
- 分享链接功能
- PDF/Excel 导出
- 服务端数据库替换 localStorage
- 酒店房型/门票类型子实体
- 自定义扩展字段（metadata {}）
- 互联网自动补全（Google Places API）
