# Euro Atlas — 欧洲地接行程规划工作台

为欧洲地接社（KuoniTumlare / JTB）操作员/计调打造的**行程规划 + QUOS 报价辅助工具**。内部工具，不面向公众。

## 核心闭环

```
导入行程文件(PDF/Word/Excel) → AI 解析为结构化行程 → 隐藏免费项 → 收费项列表填入 KT/QUOS 报价系统
```

把"少切几个 tab、少敲几次 Excel"作为成功标准：导入行程 → AI 自动解析出天数/城市/项目 → 操作员按收费项勾选录入报价 → 导出/复制进 QUOS。

## 功能概览

| 模块 | 说明 |
|---|---|
| 工作台（`/explore`） | 全屏地图 + 右侧浮动面板；导入解析、行程编辑、QUOS 勾选录入 |
| 酒店库（`/hotels`） | 静态参考酒店（Booking 评分≥7 + 欧元参考价，非实时） |
| MICE 活动库（`/mice`） | 1697 条欧洲活动/技术参访目录，Excel 生成、可增量扩充 |
| 知识库（`/knowledge`） | 国家/城市/景点资料页 |
| 设置（`/settings`） | 数据备份导出/导入（localStorage 全量 JSON） |

## 技术栈

- **框架**: Next.js 16.3 App Router + Turbopack（`src/app/`）
- **地图**: Leaflet + React-Leaflet（CSR only，`dynamic(..., { ssr: false })`）
- **样式**: Tailwind CSS 4 + CSS 变量双主题（浅色蓝灰 / 深色夜蓝）
- **存储**: localStorage（`euro-itineraries` / `euro-entities` / `euro-templates`），约 5MB 上限
- **AI**: DeepSeek API（`deepseek-chat`，OpenAI 兼容 SDK，`response_format: json_object`）
- **文件解析**: pdf2json（PDF）/ mammoth（Word）/ xlsx（Excel）
- **测试**: `npm test`（node:test）

## 快速开始

```bash
npm install

# 环境变量（.env.local，已被 gitignore，需手动创建）
# DEEPSEEK_API_KEY=...         # AI 行程解析
# PARSE_API_TOKEN=...          # 可选；部署公网时解析接口鉴权

npm run dev
```

## 文档导航

| 文档 | 内容 |
|---|---|
| `CLAUDE.md` | **权威开发规则**（架构、用车规则、AI 解析、数据模型、改动守则） |
| `docs/architecture.md` | 架构速览（响应式 store 数据流、模块地图、不变量） |
| `docs/coach-rules.md` | 用车规则（R1-R4 场景）中文说明 |
| `docs/mice.md` | MICE 活动模块说明 |
| `context.md` | 北欧 MICE 行程解析规则（Viking Line / NGS / 路桥税） |
| `PRODUCT.md` / `DESIGN.md` | 产品定位与设计系统 |
| `docs/HANDOFF.md` | 跨机迁移/开发交接手册 |
| `.claude/design-decisions.md` | 历史设计决策（32 轮访谈沉淀） |

## 数据安全

- 全部数据在 localStorage，**写满时行程列表显示红色警告横幅**，指引去 `/settings` 备份
- `exportAllData()` / `importAllData()` 打包行程+实体+模板为单个 JSON
- 跨标签页自动同步（`storage` 事件）
- 解析接口鉴权：请求需带 `Authorization: Bearer <token>`（`.env.local` 的 `PARSE_API_TOKEN`）
