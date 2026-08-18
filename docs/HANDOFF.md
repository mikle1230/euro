# Euro Atlas — 跨机迁移 / 开发交接手册

> 用途：换一台电脑继续开发时的「记忆传递」清单 + 一次性初始化步骤。
> 权威开发规则见仓库根 `CLAUDE.md`；架构不变量见 `docs/architecture.md`；图片规范见 `docs/image-spec.md`。
> 本文件随 git 一起传递，克隆仓库即得到。

---

## 0. 项目一句话定位

**Euro Atlas** — 欧洲地接社（KuoniTumlare / JTB）行程规划 + QUOS 报价工作台。
Next.js 16.3 App Router + Turbopack · Tailwind 4 · Leaflet · localStorage · DeepSeek AI 解析行程文件。

## 1. 记忆存在哪里（传递机制）

| 记忆类别 | 存放位置 | 传递方式 |
|---|---|---|
| 代码、组件、数据、图片、测试 | 本仓库 | `git clone` 即得 |
| 开发规则 | `CLAUDE.md`（权威）、`AGENTS.md` | git 自动 |
| 架构不变量 | `docs/architecture.md` | git 自动 |
| 图片规范 | `docs/image-spec.md` | git 自动 |
| 历史设计决策 | `.claude/design-decisions.md`、`.claude/conversation-context.md` | git 自动 |
| 图片命名对照表 | 根目录 `城市图命名对照表.md`、`景点图命名对照表.md` | git 自动 |
| 环境变量 / 密钥 | `.env.local`、`~/.modlens/config.json` | **手动拷贝（见 §3）** |
| 构建源 xlsx | `Cities.xlsx`、KT 的 `巴黎景点.xlsx` | **手动拷贝** |
| dsh 插件配置 | `~/.dsh/profiles/web/` | **手动拷贝 / 重建** |

> 一句话：**代码和文档全部在 git，克隆即完整体现「记忆」；只有密钥和几个被 gitignore 的源文件需要手动拷。**

## 2. 新电脑一次性初始化

### 2.1 拉代码

```bash
git clone https://github.com/mikle1230/euro.git
cd euro
```

### 2.2 装依赖

- Node ≥ 20（本机 26.7.0），npm 11。
- `npm install`

### 2.3 环境变量 `.env.local`

仓库里 `.env*` 被 gitignore，`.env.local` 不会克隆下来，需手动创建（内容见 §3）：

```bash
# .env.local
DEEPSEEK_API_KEY=sk-你的key
PARSE_API_TOKEN=你的鉴权token        # 可选；部署公网时必填
```

### 2.4 dsh + modlens 视觉插件（可选，用于读图）

```bash
# 1) 装 dsh 本体（全局 npm 包）
npm install -g @deepseek-ai/dsh

# 2) 重建 web profile 并装 modlens 插件
mkdir -p ~/.dsh/profiles/web
#    把旧机的 package.json / pnpm-workspace.yaml / pnpm-lock.yaml 拷到该目录（见 §3）
cd ~/.dsh/profiles/web && pnpm install

# 3) modlens 视觉引擎 key（gemini-api）
mkdir -p ~/.modlens
#    复制旧机 ~/.modlens/config.json，或重新设置：
npx @liustack/modlens@3.17.3 config set gemini-api.apiKey <你的key>
npx @liustack/modlens@3.17.3 doctor   # 验证引擎可用
```

> 坑：modlens 正确包名是作用域包 `@liustack/modlens`（裸名 `modlens` 在 npm 404），版本锁 **3.17.3**（新版本行为可能不同）。

### 2.5 跑起来

```bash
npm run dev            # http://localhost:3000
npm test               # node:test，当前 54 通过
npm run images:check   # 图片规范检查，应全 ✓
npm run build          # 生产构建（部署 Vercel 前）
```

## 3. 需手动拷贝的清单（不在 git 里）

| 项 | 旧机路径 | 说明 |
|---|---|---|
| 环境变量 | `euro/.env.local` | `DEEPSEEK_API_KEY` + `PARSE_API_TOKEN`，含密钥勿入 git |
| 城市码表源 | `euro/Cities.xlsx` | `build:data` 用；**产物 `quos-cities.json` 已 git 化，日常无需重建** |
| 巴黎景点源 | `~/Projects/KT/系统拷贝列表/巴黎景点.xlsx` | `build-quos-cities.js` 读它生成 `quos-attractions.json` |
| KT 知识库 | `~/Projects/KT` | 纯文档项目（非代码），含上述 xlsx |
| LDC 价目 | `euro/LDC Summer 2026 CN ACTIVE.xlsx` | 报价参考，未进构建脚本 |
| 行程样例 | `euro/*.pdf`、`euro/*.docx` | AI 解析测试/导入样例 |
| dsh profile | `~/.dsh/profiles/web/`（`package.json` + `pnpm-workspace.yaml` + `pnpm-lock.yaml`） | 只需这三个小文件，`node_modules` 用 `pnpm install` 重建 |
| modlens 配置 | `~/.modlens/config.json` | gemini-api key（视觉读图用），含密钥 |

**profile 关键文件内容**（`~/.dsh/profiles/web/package.json`，重建时照抄）：

```json
{
  "name": "dsh-profile-web",
  "private": true,
  "dependencies": { "@liustack/modlens": "3.17.3" },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-web-app",
        "@liustack/modlens"
      ]
    }
  }
}
```

`pnpm-workspace.yaml`：

```yaml
packages:
  - .
nodeLinker: hoisted
autoInstallPeers: false
minimumReleaseAgeExclude:
  - '@liustack/modlens@3.17.3'
```

> `.remember/` 是本地 remember 框架的运行日志，未入 git，非项目必需，可选拷贝。

## 4. 图片工作流（最高频任务，务必记住）

用户会**分批新增城市/景点图**（Unsplash 下载，文件名常大写开头）放到 `public/images/{countries,cities,attractions}/`，然后：

```bash
npm run images:fix      # 自动：小写重命名 + 竖图裁剪 + 缩放 + 压缩
npm run images:check    # 验证全 ✓
curl -I http://localhost:3000/images/cities/<id>.jpg   # 抽查 200
```

- 尺寸：国家 1200px/q75（竖图裁 4:3）；城市/景点 1600px/q80（竖图裁 3:2）。
- 文件名必须 = 全小写 id（否则 Linux/Vercel 部署 404）。
- 完整规范见 `docs/image-spec.md`；命名对照表在仓库根目录两个 `.md`。
- 当前规模：国家图 36、城市图 71、景点图 10。

## 5. 当前完成状态快照

- **景点富内容**：533 条全部补齐（`src/data/attraction-details.js`，含官网/简介/章节/参观指南），详情页全 200。
- **图片体系**：三类图全部规范化，`images:check` 全 ✓。
- **报价规则**：LDC 用车（THROUGH COACH / EMPTY RUN / PRE-POST / 接送机）、免费/收费判定、12 种 QUOS 类型映射，均已实现并有测试（54 通过）。
- **酒店推荐**：静态参考库 `src/data/hotel-recommendations.js`（评分 ≥7 + 欧元参考价）。
- **AI 解析**：文件上传 → `/api/parse-itinerary` → 自动导入 + 反馈重解析闭环。

## 6. 避雷要点

- Next 16.3 有 breaking changes —— 写码前先读 `node_modules/next/dist/docs/` 相关指南。
- pdf2json 是唯一兼容 Turbopack 的 PDF 解析库（pdf-parse / pdfjs-dist 均有 worker 冲突）。
- `sips` 裁剪+缩放要**分步**执行（一条命令组合有坑）。
- 纯函数库（quos-mapping / coach-plan / ldc-mapping / quote-rates / geo）**不要加 `'use client'`**；localStorage 访问用 `typeof window` 守卫。
- 主按钮底色用 `var(--accent-strong)`（`--accent` 配白字深色模式对比度不足）。
- 改报价规则 / LDC 判定 / QUOS 映射后必须跑 `npm test`。

## 7. 工作流约定（用户确认 2026-08-18）

- **每次改完直接 commit 并 push 到 GitHub**（`mikle1230/euro` main），不用等用户发话。commit 信息用英文短句（如 `feat: ...` / `fix: ...`）。
- 若直连 GitHub 不稳（公司网络），push/pull 用 `git -c http.schannelCheckRevoke=false ...` 或 ghfast.top 镜像（`https://ghfast.top/https://github.com/mikle1230/euro.git`）。
- 用户会持续更新 `hotel list.xlsx`（酒店 PP 价/星级/评分），更新后跑 `npm run build:hotels` 同步 `src/data/hotel-prices.json`；星级/评分补充表在 `scripts/hotel-extra-data.mjs`（xlsx 有值则优先）。
- 补城市 → 改 `scripts/add-missing-cities.mjs` 重跑，再跑 `node scripts/build-city-coords.js`，并检查 `npm test` 的「数据漂移」用例（城市名变体走 `src/data/city-aliases.js`）。
