# euro 产品规格 v2 —— 「报价取数台」（磁贴墙版）· 已定案

> 2026-09-19 · 依据：9/17 深夜定位决策 + 9/18 全天设计与战略讨论 + **9/19 11:21 Michael 三条拍板**
> 仓库：`/Users/michael/projects/euro`（Next.js 16 App Router + React 19 + Tailwind v4，纯 JS/JSX）
> ⚠️ **对外零透露**（与愿景文档同等级保密）

---

## 0. 三条已定案（2026-09-19 11:21 Michael）

| # | 裁决 | 原话 | 设计后果 |
|---|---|---|---|
| **D1** | euro **只到「查 / 看」** | "抄写条你给我就行了吧，我**不需要在 euro 重复显示**" | **砍掉篮子 + 抄写条 + 载荷预览条**；抄写层由 agent 层（飞书 + `quos-fill-sheet` 技能）承担。euro 保留轻量：点码牌/值 → 复制单个值 |
| **D2** | 费率/规则**只做只读展示** | "1 同意" | 不做交互式 LDC/车费计算器；`coach-plan` / `ldc-mapping` / `quote-rates` 在 euro 里只以**资料**形态呈现 |
| **D3** | 身份 = **E｜磁贴墙**，唯一锁定 | "3 确认" | 仓库里已 commit 的 `.ulpi/design/*`（industrial/signage 冷看板）与根 `DESIGN.md` **作废**，换成 E 规范 |

**一句话**：euro 是 Michael 一个人的**报价取数台** —— 打开就"愿意看"，输入就能查到，符号随手可取；**它只负责查得准、看得清**，抄与算是我的活。

---

## 1. 执行摘要

| 项 | 内容 |
|---|---|
| 要解决的问题 | 记不住的码 / 价 / 条款要 3 秒查到；现在 euro 是三座内容岛（`/knowledge` `/hotels` `/mice`），查到还要跳页，而且**越查越乱**（实体、符号、费率混在同一维度） |
| 受益者 | 只有 Michael 一人（单人工具，不为多人协作/通用性买单） |
| 成功的样子 | 打开 euro 不点按钮就"愿意多看一眼"；输入中文/英文/码，结果分组浮出；实体在墙上、符号在抽屉里 |
| 本次做什么 | ① 钉死产品与设计身份（本文件）② 按 E 重写信息架构与界面 ③ 清掉上轮的失效规范与死管道 |
| 本次不做什么 | 不做篮子/抄写条/载荷预览（D1）· 不做计算器（D2）· 不恢复 AI 解析 / 地图画线 · 不做首页内容运营 · 不做登录/协作/对外 · 不追数据全覆盖 |

---

## 2. Facts（实读证据，全部来自 9/19 盘点）

### 2.1 结构与规模

- `src/` 共 **93 个文件**：`app` 2,779 行 / `components` 3,445 行 / `lib` 3,123 行；`npm test` = **96 通过 / 0 失败**。
- `src/app/page.js` = **5 行**，只有 `redirect('/knowledge')` → **当前没有主页**。
- 路由：`/knowledge`（+ `[countryId]` / `[cityId]` / `[attractionId]` 三层）｜`/hotels`(463)｜`/mice`(295)｜`/mice/[id]`(222)｜`/settings`(213)｜`/api/fx`。
- ⭐ **从任一 page 不可达的文件有 12 个**：`map-core.jsx`、`floating-panel.jsx`、`panel-views/quos-list.jsx`、`confirm-dialog.jsx`、`modal.jsx`、`hotel-map.jsx`、`coach-plan.js`、`ldc-mapping.js`、`quote-rates.js`、`road-distance.js`、`city-coords.js`、`use-is-mobile.js`、`city-match.js`、`flags.js`。
- ⭐ **最重的矛盾**：`coach-plan.js`(740) + `ldc-mapping.js`(420) + 4 张配套数据表 + 2 个测试（1,182 行）构成一个**完整但界面不可达**的报价规则引擎 —— 被 `npm test` 保护着，却没有任何页面能触发它。⇒ **euro 现在根本不"算"，也不"展示费率"**。这正是 D2 要修的地方。
- 死文件（无任何引入方）：`confirm-dialog.jsx`、`hotel-map.jsx`、`city-match.js`、`flags.js`、`use-is-mobile.js`（后者传递性死）；`modal.jsx` 传递性死；`floating-panel.jsx` / `panel-views/quos-list.jsx` 休眠（仅互相引用）。
- ⚠️ **注意保留**：`road-distance.js` 被 `coach-plan.js` 依赖（`cfaa47b` 曾误判"零引用"），**不能删**；`page-hero.jsx` 仍被 3 个在用页面引用（P1 替换那三页时再删）。
- `itinerary-store.js` **半活**（`/settings` 的导入导出在用）；`entity-store.js` 部分活（knowledge/global-search 在用）。
- `quos-rows.js`(92) + 测试：是"排成 QUOS 顺序"的唯一实现，**界面不可达**；D1 之后它作为**契约参考实现**保留（不删）。

### 2.2 数据资产（真实计数）

| 资产 | 计数 | 谁在用 |
|---|---|---|
| `quos-cities.json` | **8,458 条**城市码 | `lib/quos-mapping.js`（全仓被引最多，7 处） |
| `quos-attractions.json` | **17 条** | 同上 |
| `europe-travel.json` | **39 国 / 248 城 / 613 景点** | `lib/data.js`、hotels 页、测试 |
| `attraction-details.js` | **585 条**详情 | `[attractionId]` 页 |
| `hotel-prices.json` | **62 城码 / 89 家 / 17 国** | `lib/hotel-prices.js` |
| `hotel-recommendations.js` | **68 城 / 772 家** | `lib/hotel-recommend.js` |
| `mice-activities.js` | **1,697 条**（3.58 MB） | `lib/mice.js`（**必须按需加载**） |
| `mice-zh.js` | **1,657 条**标题（1.62 MB） | 同上 |
| `ancillary-fees.js` | **154 条 / 15 region** | **零 UI 引用**（悬挂资产）→ P2 挂上"费率"展示 |
| `daily-fees.js` / `std-mtc-options.js` / `coach-rules.js` | 3 条 / 1 城 36 项 / 5 键 | 仅 `coach-plan.js`（不可达）→ P2 展示 |
| `city-hints.js` | 146 条 | **零引用**（原给 AI prompt 用）→ 死资产 |
| `manual-codes.js` / `hotel-coords.js` | **空对象** | 兜底位保留 |
| 图片 | cities 83 / countries 39 / attractions 13 / flags 36 / **mice-images 1 张** | MICE 1,697 条配 1 张图 → E 的墙在 MICE 上会大面积"无图牌" |

### 2.3 文档漂移（必须在 P0 纠正）

- `docs/architecture.md` 整节仍按**已删除**的 `useItineraries()` / `explore/page.js` / `FloatingPanel` / `ItineraryList` 描述；`README.md` / `CLAUDE.md` / `PRODUCT.md` / `docs/HANDOFF.md` 仍宣传 **AI 解析**（相关文件早已 ABSENT）。
- 文档里的国家数（24 国）与代码实际（`europe-travel.json` 39 国 / `countries.js` 36 国）不一致。
- ⚠️ **不可复现的构建**：仓库根无 `Cities.xlsx` / `hotel list.xlsx`，`build:data` / `build:hotels` / `build:ancillary` 在本机跑不通（脚本指向 KT 目录或 Windows 路径）→ 数据更新只能手工/换机时注意。

---

## 3. Assumptions / Unknowns / Risks-relevant

### 3.1 Assumptions

- A1 用户 = 1 人，桌面为主（QUOS 与 euro 并排双窗），高密度可接受。
- A2 D1 之后 euro 仍保留**单值复制**（点码牌复制 `CPH`）作为"查/看"的自然延伸；不做载荷串与预览条。
- A3 数据缺口属内容运营，不进本次结构重构；MICE 缺图用"无图牌"兜住。

### 3.2 Unknowns

- U1 QUOS 真实录入列序（周日核对时验证）—— 现在只影响 agent 层契约，不再阻塞 euro。
- U2 MICE 在墙上的呈现强度：1,697 条 × 1 张图 → 可能只做"色块卡 + 名称"，不做图片主导。
- U3 `city-hints.js`（146 条，零引用）是删是留：删前先确认它不含独有信息（`curated-cities.cjs` 是它的上游）。

---

## 4. 产品定位与边界

```
【三块拼图】
  QUOS = 真源（合同价 / 规则 / Sales Sheet）  —— 只能人工核对
  euro = 资料库 + 可视化（查 / 看）            —— 只读；不解析、不计算、不收集
  我(T) = 引擎 + 界面（解析行程 → 成本 → markup → 人等价 → 报价 + 抄写条）—— 移动端就是飞书
```

**Non-goals（写死）**
- 不做篮子 / 抄写条 / 载荷预览（D1）
- 不做定价计算器（D2）；费率与规则**只读展示**
- 不恢复 AI 解析 / 地图画线
- 不做首页内容运营（hero / 推荐流 / 精选）—— `page-hero.jsx` 在 P1 一并删除
- 不做对外访问 / 多人协作 / 权限
- 不追数据全覆盖：查不到就明说"库里没有"

---

## 5. 设计简报 · E｜磁贴墙

### 5.1 信息架构：按「任务」分家

| 任务 | 对象 | 心理 | 位置 |
|---|---|---|---|
| **挑 Pick** | 城市 / 酒店 / 景点 / MICE | 浏览·比较·要好看 | **页面主体（磁贴墙）** |
| **查 Lookup** | 服务码 / 城市码 / 国家码 / 币种 / 费率 / 规则 | 确认一个值 | **⌘K 浮层（与实体物理分离）** |

（原第三类「抄 Transcribe」**已按 D1 移出 euro**，由 agent 层承担。）

### 5.2 目标结构

```
/  工作台（唯一入口）
├ 顶栏 56px          深色实底；左＝标识；右＝设置齿轮（篮子已取消）
├ 查询带（吸顶）       范围 chips：全部·城市·酒店·景点·MICE ｜搜索框｜命中条数｜↑↓ ⏎ 键盘提示
├ 磁贴墙（4 列 flex 分列，高矮混排）
│   城市大卡（整图 340px＋底部渐变压字＋酒店/景点条数）
│   酒店卡（图 150px＋中英名＋价格"贴纸"＋编号）
│   景点卡（图 210px＋开放时间＋门票贴纸）
│   服务码/费率色块卡（无图，纯色＋等宽大字 HTL / MTC / ROAD TAX）
│   每卡：左上城市码牌（FR/PAR）· 右上分类圆点 · 无图时"无图牌"
├ 详情 dock（右侧，不跳页；保留查询状态）
└ ⌘K 浮层            服务码 / 城市码 / 国家码 / 币种 / 费率 / 规则（跨层搜时分组：实体 N / 代码 N / 费率 N）
```

- `/knowledge` `/hotels` `/mice` → 收敛为 chips；旧 URL 保留为 deep-link 预设过滤（`/?scope=hotel&city=CPH`）。
- `/settings` → 齿轮 + 面板，不再同级导航。
- `/hotels` 的**比价矩阵**是"多酒店 × 多月"的矩阵任务，保留为独立台（`/hotels`）。

### 5.3 视觉语言（E 身份，替代已失效的 `.ulpi/design/*`）

| 维度 | 取值 |
|---|---|
| 底色 | 暖纸底 + 极轻点阵纹 |
| 顶栏 | 深色实底（禁玻璃拟态、禁渐变） |
| 编码 | 卡片左侧 6px **国家色条** + 右上分类圆点；**颜色只做编码** |
| 码牌 | 深色底 + 等宽大写双段（`DK｜CPH`），点击复制单值 |
| 价格 | 红棕等宽字 / "贴纸"方块 |
| 圆角 | 小圆角（2–6px），以方角为主 |
| 字体 | 中英混排；英文代码一律大写等宽，中文只做解释 |
| 装饰 | 点阵、打孔、票据感；**禁止**大 hero、装饰留白、emoji 徽章、`backdrop-blur`、渐变文字、紫色 AI 默认配色 |

### 5.4 交互与键盘链

`/` 聚焦搜索 → 输入即筛（无防抖）→ `↑↓` 跨组移动（不停组头）→ `Enter` 开 dock → `Esc` 关 dock → `Esc` 清查询。`⌘K` 随时呼出符号抽屉（正在查东西时确认一个码，不该离开当前页）。

### 5.5 状态与降级

- 空态 = 有用的休息态：最近查询 ≤6 chip + 钉住 ≤12 + 参考表（12 服务码 / 9 路税国 / 3 条每日杂费 / ROM 36 项 STD MTC / 保险 2.66 USD），每行可复制。
- 缺价格 → 「待实填」黄牌；**全站禁止用 0 冒充价格**。
- 无结果 → 近似建议 + 「记录临时码」入口（写 localStorage，立即可检索、可导出补丁 JSON）。
- FX 失败 → 价格主值不受影响，换算降级为"离线"辅文。
- `< lg` → dock 变全屏 sheet；墙降为单列；键盘提示隐藏（功能不减）。

---

## 6. 重构 Phase Plan

> 每阶段结束：`npm test` / `npm run build` / `npm run lint` 全绿 + 可上线（**push 即 Vercel 生产**）。

- **P0 清场与纠偏（零风险，不含视觉）**
  1. 作废失效规范：`git rm .ulpi/design/DESIGN.md .ulpi/design/query-platform.md`；根 `DESIGN.md` 改为指向新规范的短指针；新增 `docs/product-spec-2026-09.md`（本文件的仓库版）
  2. 删死文件（每个都要附 grep 证据）：`map-core.jsx`、`hotel-map.jsx`、`lib/hotel-map.js`、`lib/city-coords.js`、`lib/city-match.js`、`lib/flags.js`、`lib/use-is-mobile.js`、`confirm-dialog.jsx`、`modal.jsx`、`floating-panel.jsx`、`panel-views/quos-list.jsx`（`src/data/city-coords.js` 待查：若仅被不可达链引用则同删）
  3. **保留**：`road-distance.js`（coach-plan 依赖）、`page-hero.jsx`（P1 再删）、`itinerary-store.js` / `entity-store.js`（部分在用）、规则引擎与全部数据资产
  4. 补测试：`quote-rates` / `daily-fees` / `hotel-prices`（9 个导出，几乎无覆盖）／`ancillary-fees`（数据完整性：region 唯一、rate 数值）
  5. 文档纠偏：重写 `docs/architecture.md` 到当前事实；给 `README.md` / `CLAUDE.md` / `PRODUCT.md` / `docs/HANDOFF.md` 加"AI 解析已退役"横幅；纠正国家数（24→39/36）
  - **验收**：`npm test` 新增 4 个测试文件全绿；被删文件新 grep 零引用；`build` / `lint` 通过
- **P1 工作台骨架（E 皮）**
  - `/` 重写为工作台：顶栏 + 吸顶查询带 + chips + 磁贴墙（城市/酒店/景点/服务码四类卡，一套卡片语言）+ 详情 dock
  - 旧路由带参重定向 `/?scope=…`；删 `page-hero.jsx`
  - **验收**：打开 `/` 不点按钮就能看出"城市数/酒店数"且愿意多看一眼；输入 `CPH`/`哥本哈根`/`HTL` 均命中并分组
- **P2 ⌘K 符号抽屉（含 D2 的只读费率）**
  - 服务码 / 城市码 / 国家码 / 币种 / 费率 / 规则；把零引用的 `ancillary-fees`(154) / `daily-fees` / `std-mtc-options` / `coach-rules` 挂上**只读**展示（标注出处，不给计算按钮）
  - **验收**：查 `MTC` / `OFR` / `DTR vs OTR` / `road tax` 不丢当前查询；费率行显示出处与币种
- **P3 比价台 + 设置 + 收口**
  - `/hotels` 矩阵（行=酒店，列=月/星级/评分，勾选 ≤3 对比）；`/settings` 面板（主题 / 码序 / FX / 数据补丁导入导出 / 关于-各源条目数）
  - 移动端降级、可访问性、性能（MICE 索引不进首屏）收口
- **不做**：篮子与抄写条（D1）、计算器（D2）

---

## 7. 验收标准（总）

```
[ ] 打开 / 不点任何按钮：能看出这是"能查东西的墙"，且愿意多看一眼（花哨美观 + 实用）
[ ] 输入 CPH / DK / copenh / 哥本哈根 / HTL / road tax / NGS 均命中，精确码命中置顶并分组
[ ] 实体在墙、符号在 ⌘K，两处物理分离；⌘K 打开不丢当前筛选
[ ] 缺价格显示「待实填」，全站 0 处 price=0 冒充价格
[ ] 全站：0 emoji 徽章 / 0 backdrop-blur / 0 大 hero / 0 渐变文字
[ ] /knowledge /mice /hotels 带参重定向到 /?scope=… 且生效；/hotels 保留矩阵台
[ ] 费率/规则为只读展示（有出处、有币种），全站 0 处计算按钮
[ ] euro 内 0 处篮子/抄写条/载荷预览
[ ] npm test / npm run build / npm run lint 全绿
[ ] push 后 euro.831225.xyz 可达且与 HEAD 一致
```

---

## 8. 风险

- **R1 身份返工（最高）**：仓库已 commit 的工业/标识规范与你的选择相反 → P0 第一刀必须作废它。
- **R2 大手术回归**：三岛并一台 → 先补测试（费率/酒店价）、每片可独立上线。
- **R3 首屏性能**：`mice-activities.js` 3.58 MB 若进首屏必慢 → 索引按需加载 + 内联"加载中"行。
- **R4 MICE 缺图**：1,697 条只 1 张图 → 墙上大面积"无图牌"，需在色块卡方案上定稿（见 U2）。
- **R5 文档继续漂移**：仓库文档仍在宣传已删功能 → P0 纠偏，之后文档只留一份真理（`docs/product-spec-2026-09.md`）。
