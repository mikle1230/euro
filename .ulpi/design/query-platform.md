# 查询板 · 特性设计规范（euro 查询优先重设计）

> 绑定文件：`.ulpi/design/DESIGN.md`（锁定设计语言，唯一视觉真理源）。
> 本文件只描述**本特性**的 IA、流、状态、组件与交接；一切视觉值指回 `DESIGN.md`，本文件不重新定义任何 token。
> **每屏并排放在一起，必须读起来是同一个产品。**
> 本规范不写生产 UI 代码：产出规范 + 交接 brief，由工程 agent 实现。

**Register**：product · **Direction**：industrial / signage · **Design system**：Radix UI primitives + shadcn/ui copy-in（全量重着色）

---

## 1. 现状诊断（为什么必须重设计）

| 观察（来自代码） | 问题 | 结论 |
|---|---|---|
| `/` redirect → `/knowledge`；导航 5 项：首页 / 城市库 / 酒店库 / MICE / 设置 | 四个**孤岛**，同一份「City + QUOS 码」的知识被三套卡片刻画 | 查询优先的现实是**一个入口 + 分组结果**，不是四座岛 |
| `global-search.jsx` 建议 10 条结果、跳到页面路由 | 查到就**跳页**，跳页即丢查询；没有代码复制，没有价格 | 需要台账 + dock，不是跳转 |
| 酒店=MICE=城市 各一套卡片语言（渐变蒙版 / 暖色卡 / 图片主导） | 身份漂移：并排看像三个产品 | 一套 `DESIGN.md` 身份，MICE 不再靠色相区分 |
| emoji 类型徽章（🏨🏛️🚌）、`rounded-2xl`、`backdrop-blur` tab | AI-slop 特征 | 换 QUOS 三字码 mono 徽章 + 方角 + 去玻璃拟态 |
| `mice-activities.js` 3.5 MB、`mice-zh.js` 1.6 MB 被 `/mice` 整包引入 | 查询入口首屏会被 MICE 拖慢 | MICE 索引**按需**加载（见 §12 性能预算） |
| 数据资产齐备：8458 条城市码 / 12 个 QUOS 服务码 / 9 个路税国家 / 36 项 ROM STD MTC / 62 城 89 行酒店报价 | **码与费率就是产品**，但它们散在 4 个页面的不同角落 | 全部收进一个索引，一个查询台 |

**核心任务（本设计的唯一 KPI）**：「我记不住的东西，**3 秒内查到，然后能直接粘进 QUOS**。」

---

## 2. 用户与使用语境（约束，不是背景）

| 项 | 值 | 对设计的影响 |
|---|---|---|
| 用户数 | **1 人**（北京某旅行社欧洲线 AE，Michael） | 不做引导流程、不做权限、不做分享；做「快」和「记住我的习惯」 |
| 设备 | **桌面为主**，双窗口：一边 QUOS（TourMaker 录入），一边 euro | 高密度、小字号可接受；隔屏对读要求**大对比、少滚动、码显眼** |
| 频次 | 每天高频，单次使用 30 秒到 5 分钟，一天几十次 | 常驻看板不弹窗；空态必须有用；无横幅、无营销、无动效噪音 |
| 输入 | 键盘为主（手在键盘上填 QUOS） | 全键盘可达；`/` 聚焦查询行；`Y` 复制行；`Esc` 两级退出 |
| 语言 | 中英混排 | 英文代码原样大写可复制；中文只做解释与动作 |
| 场景 | 客户/同事在旁或电话中，需要**立刻**报出码与价 | 「复制预览条」所见即所粘，避免粘错 |

---

## 3. 信息架构（新）

### 3.1 决定

**三岛合并为一台，保留一个专用台，设置降级为工具入口。**

```
                          查询板 /  (Query Board)  ← 唯一主入口
                          ┌───────────────────────────────────────┐
  看板带（常驻）           │  [ scope: 全部 城市 酒店 景点 MICE 费率 服务码 ] │
                          │  ▸ 查询行：_________________________________  │
                          └───────────────────────────────────────┘
  台账（分组带）            城市   · 代码牌 DK|CPH · 中文/英文 · 酒店数 · 景点数
                          服务码 · HTL / MTC / ENT / RST / GUI / FLT / DTR / OTR / DFR / OFR / LUG / OTH
                          酒店   · 城市码 · 服务名 · 包价 · 星级 · 评分 · 报价月
                          景点   · 城市码 · 英文名 · 中文名 · 有无详情
                          MICE   · 城市码 · 活动名 · 类别 · 价格
                          费率   · 路税 / 每日杂费 / 保险 / 司机夜费 / 德国 VAT
                          规则   · LDC 供应商 · coach 规则 · 手册码 · STD MTC 选项
  ───────────────────────────────────────────────────────────────────────────
  预览条（常驻）            复制预览：CPH⇥DK⇥HTL⇥BW TEN (Standard)⇥442.55⇥EUR
  ───────────────────────────────────────────────────────────────────────────
  详情 dock（右侧，≥lg）     城市码大牌 · 报价 · 条款/备注 · 图片 · 关联 · 复制区

  比价台 /hotels          ← 独立保留：酒店价格对比是**矩阵**任务，不是检索任务
  设置   /settings        ← 齿轮入口，不进 tab 条
  详情路由 /knowledge/... · /mice/[id]  ← 降级为深链目标（新标签/分享/dock 的独立页版本）
```

### 3.2 导航

| 位置 | 项 | 说明 |
|---|---|---|
| tab 条 | **查询板 `/`** · **比价台 `/hotels`** | 2 项（原 5 项） |
| 右上 | **设置齿轮** | 工具入口，非同级导航 |
| 旧路由 | `/knowledge` → `/?scope=city` · `/mice` → `/?scope=mice` | 重定向保留，避免书签失效 |

**为什么导航砍到 2 项**：四个页面回答的是同一句话（「这个实体，码/价/条款是什么」），
拆成四页只是历史包袱；而「比价」是唯一需要**不同布局**（多酒店 × 多月的矩阵）的任务，值得独立成台。
每一项都有存在理由，没有一项只是因为「以前有」。

### 3.3 为什么不是「四个页面 + 全局搜索强化」

那会保留四套卡片语言（身份漂移）、四次重复的筛选控件、四个各自演进的结果渲染，
并且仍然是「先选岛、再找东西」。查询优先意味着**先找东西，岛的边界由结果分组表达**。
范围（scope）不消失，它从「页面」降级为「筛选维度」，所以浏览能力没有丢：
`/?scope=hotel&city=CPH` 就是过去的酒店库页，只是不再需要一次跳转。

---

## 4. 路由映射（工程可执行）

| 路由 | 角色 | 状态 |
|---|---|---|
| `/` | 查询板（默认 `scope=all`） | 重写（原 redirect 到 `/knowledge` 取消） |
| `/?q=&scope=&sel=&cmp=&pin=` | 同一页面的可深链状态 | 新增 |
| `/hotels?city=&sort=&cmp=` | 比价台 | 重做（保留路由，替换为矩阵布局） |
| `/knowledge/[countryId]` `/[cityId]` `/[attractionId]` | 详情路由（dock 的独立页版本） | 保留，不再是层级导航 |
| `/mice/[id]` | MICE 详情 | 保留 |
| `/knowledge` `/mice` | → 重定向到 `/?scope=city` `/?scope=mice` | 变更 |
| `/settings` | 设置 | 保留，内容重组为 5 个 section |
| `not-found` | 404 = 空台账样式（「板在此」+ 回查询板） | 重做 |

---

## 5. 索引与查询语义

### 5.1 索引来源（全部只读，不改数据）

| 分组（band） | 来源 | 命中字段 |
|---|---|---|
| 城市 | `europe-travel.json` + `quos-cities.json`(8458) + `city-aliases.js` + `manual-codes.js` | 中文名、英文名、别名（三级链）、**城市码**、国家码 |
| 国家 | `countries.js` / `europe-travel.json` | 中文名、英文名、国家二字码 |
| 服务码 | `quos-mapping.js` 的 12 个 Type | 码（`HTL`）、英文标签、中文标签 |
| 景点 | `attraction-details.js`(613) + `quos-attractions.json` | 中文名、英文标准名 |
| 酒店 | `hotel-prices.json`(62 城 89 行) + `hotel-recommendations.js`(68 城块) | 酒店名、`bookingName`、城市码/城市名 |
| MICE | `mice-activities.js` + `mice-zh.js` | 活动名（中/英）、类别、城市 |
| 费率 | `quote-rates.js` / `ancillary-fees.js` / `daily-fees.js` | 条目名、国家码、关键词（`road tax` / `VAT` / `insurance`） |
| 规则 | `ldc-mapping.js` / `coach-rules.js` / `std-mtc-options.js` | 供应商码（`IT ROM`）、车型（`NGS`/`GLS`）、条目名（`Rome - APT - 05 HOURS`） |

### 5.2 匹配规则（优先级从高到低）

1. **码精确命中**：`CPH` / `DK` / `HTL` / `NO` → 直接置顶（这是最高频的真实输入）。
2. 名称精确 → 2. 名称前缀 → 3. 名称包含。
4. 别名链命中（复用 `city-aliases.js` 的中文↔英文↔本地拼写链，最多 3 跳）。
5. 中文命中中文列；**不做拼音**（数据里没有，不发明；留给 `city-aliases.js` 未来扩展）。
6. 大小写、全/半角、空格与连字符不敏感（复用 `normalize.js`）。

**排序**：先按分组顺序（城市 → 服务码 → 酒店 → 景点 → MICE → 费率 → 规则），组内按匹配强度，
同分按数据源顺序（稳定）。**不做「智能排序」**：可预测性比聪明更重要，用户会形成肌肉记忆。

### 5.3 分组与上限

- 每组默认展示 **5 行**，组头右侧 `+ 23` 可展开该组（`aria-expanded`）；展开状态进 URL（`?g=hotel`）。
- 全局上限 200 行后截断并提示「已截断，请缩小范围」。
- 组头显示**命中数**（如 `城市 3`），零命中的组不渲染（不显示空组头）。

### 5.4 输入即出（响应）

- 输入 → `useDeferredValue` 渲染 → 无防抖阈值（本地索引，无需等）；索引首次构建期显示细进度条。
- 查询词保留在 URL（`?q=`）但**不写历史**（`replaceState`），避免键盘操作把 back 键塞满。

---

## 6. 用户流

### F1 · 查码即用（主流程，目标 ≤ 3 秒）

**目标**：客户电话里提到一个城市，要在 QUOS 里填对码。

```
[在 QUOS 里遇到需要填的地方]
        │
        ▼
[/ 查询板已开着] ──按 "/" 或直接点看板带──▶ 焦点进入查询行
        │
        ▼
  输入 "copenh" / "哥本哈根" / "CPH" / "DK"
        │
        ▼
◇ 有命中？
   ├── 否 ──▶ 空结果带（F3：记录临时码）
   └── 是 ──▶ 分组台账（城市 1 · 酒店 4 · 景点 12）
                │
                ├── ↑/↓ 在**跨分组**的扁平行上移动（组头不可聚焦）
                ├── 预览条实时显示该行将粘贴的字符串
                └── ◇ 下一步
                      ├── Y（或 ⧉） ──▶ 复制行 TSV ──▶ 代码牌翻 ochre「已复制」──▶ 切回 QUOS 粘贴【主出口】
                      ├── Enter ──▶ 详情 dock 打开（焦点移入 dock，查询与台账状态保留）
                      ├── P ──▶ 钉住（写入本地钉住表，空态与看板常驻显示）
                      └── C ──▶ 只复制代码牌（城市码一段）
```

**状态**：`typing`（行实时更新，无 loading 闪烁）· `resolved` · `no-match` · `partial`（组内某行缺价格 → 该格显示 `待实填` 黄牌，行本身照常可复制）· `clipboard-error`。

---

### F2 · 酒店比价

**目标**：同一城市里选一个酒店，或报给客户一个价格区间。

```
[/ 查询板] 输入城市（"CPH"） ──▶ 城市行 ──▶ 按 B 或点「比价」──▶ /hotels?city=CPH
                                                                    │
                                                                    ▼
                                                        矩阵：行=酒店，列=报价月/星级/评分/近X
                                                                    │
                    ┌───────────────────────────────────────────────┤
                    ▼                                               ▼
        点列头排序（价格↑ / 价格↓ / 星级 / 评分）        勾选 ≤3 家 ──▶ 对比条（差异高亮）
                    │                                               │
                    └──────────▶ 复制选中行 / 复制整列 / 复制单行 TSV ◀──┘
```

**状态**：`city-not-found`（该城无报价库）· `no-price`（有酒店无报价 → 显示 `待实填`，不显示 `0`）· `empty`（选中 0 家时对比条显示「勾选 2 到 3 家开始对比」）· `max`（选满 3 家，第 4 次勾选禁用并给出 `aria-live` 提示）。
**边界**：低于 `lg` 时矩阵退化为「每家酒店一块 + 3 个月列」的堆叠表（不横向滚动到不可用）。

---

### F3 · 查不到码 → 记录临时码（闭环，不是死路）

```
无结果带 [ 未命中 "埃沃内斯码头" ]
  ├── 近似建议（按前缀/别名给出最近 5 条）──▶ 点击即换查询
  └── 「记录临时码」──▶ 小表单（中文名 / 英文名 / 城市码 / 国家码）
                         │
                         ▼
              存 localStorage `euro-manual-codes`（形状 = `MANUAL_CODES`）
                         │
                         ▼
              立即可检索，行尾打「本地补充」标记（`--accent-soft` 底）
              提供「导出补丁 JSON」→ 复制给开发者并入 `manual-codes.js`
```

**为什么必须做**：`manual-codes.js` 目前是空表且已有「补码」先例（`getCityCode` 会兜底），
说明「表外城市」是真实存在的工作流。把死路变成入口，是查询台的完整性。

---

### F4 · 查费率与规则

输入 `road tax` / `挪威` / `VAT` / `NGS` / `IT ROM` / `OFR` / `insurance` → 费率/规则带。

- 每行显示：条目名（英文原样）+ 价格 + 币种 + **出处注释**（如 `LDC 附表 ROAD TAX PER DAY €12`）。
- 金额未定案的条目（`price: 0` 口径）显示 `待实填` 黄牌，**绝不显示 0 也不显示参考价为主值**；
  参考价只出现在 `note` 里，且视觉上是辅文。
- 复制载荷 = `国家码 \t OTH \t 条目名 \t 价格（可空） \t 币种`。

---

### F5 · 详情 dock

`Enter` 打开，右侧 420 到 520px，`sticky`，不跳页（**关键**：跳页会丢查询，用户要反复查同一个城市的多个实体）。

区块顺序：**码（大号双段代码牌）→ 报价 → 条款/备注 → 图片（有则 16:9，无则「无图牌」）→ 关联（同城酒店/景点/费率/QUOS 行）→ 复制区（列出全部可选载荷）**。

**状态**：`empty`（未选：显示该 scope 的用法提示）· `loading`（图片懒加载）· `missing-image`（无图牌）· `error`（详情数据缺失：显示已知字段 + 提示，不白屏）。
**焦点**：打开时焦点移到 dock 的 `<h2>`（`tabindex="-1"`），`Esc` 关闭并把焦点**还给来源行**。
**移动端**：dock 变为全屏 sheet（`overlay 50` 层），带「返回台账」。

---

### F6 · 设置与数据维护（不是查询目标）

`/settings` 五个 section（每节一条规线分隔，不再用卡片堆叠）：主题（浅/深/跟随系统）· QUOS 类型排序（保留现有 ▲▼ 交互，改为键盘可拖的列表）· 汇率与离线状态 · 数据补丁（自定义城市 / 临时码 的导出与导入）· 关于（各数据源条目数与最后更新时间，可用于判断数据新旧）。

---

## 7. 状态模型（全局）

| 层 | 状态 | 呈现 |
|---|---|---|
| 看板带 | `rest`（空查询）· `typing` · `resolved` · `no-match` · `error` | 见 `DESIGN.md` 看板带 token；`no-match` 不改变带色（不把整条带染红），只在台账区出状态带 |
| 索引 | `bootstrapping` · `ready` · `mice-loading` · `index-error` | 带底 2px 细进度条（`--accent`）；`index-error` 显示状态带 + 「重试」 |
| 行 | `default` · `hover` · `focus` · `copied` · `pinned` · `pending-value`（缺价格） · `copy-error` | 见 §9 组件规格 |
| dock | `empty` · `loading` · `loaded` · `missing-image` · `error` | 见 F5 |
| 空态 | `board-at-rest`（最近查询 ≤6 / 钉住 ≤12 / 参考表折叠 3 栏） | 见 §7.2 |
| 全局 | `offline` · `reduced-motion` · `theme` · `mobile` | FX 值显示「离线·最后更新 <时间>」；台账与复制**不依赖网络** |

### 7.1 空态定义（`board-at-rest`）

空台账不是空白，是**有用的休息态**：

1. **最近查询**：`localStorage euro-recent-queries`，≤ 6 条，每条=一个代码牌 chip，点击即重放查询。
2. **钉住**：`euro-pinned`，≤ 12 条，跨会话保留（多标签页用 `storage` 事件同步）。
3. **参考表（折叠 3 栏，规线表格）**：`12 个 QUOS 服务码` · `9 个路税国家` · `3 条每日杂费` · `ROM 36 项 STD MTC 选项` · `保险 2.66 USD/人`。
   每一行都可复制（码本身即是可粘贴内容）。

### 7.2 部分结果 / 降级

| 情形 | 处理 |
|---|---|
| 组内部分行缺价格 | 该格 `待实填` 黄牌 + 复制载荷价格列为空（不写 0，不写假数） |
| MICE 未加载 | MICE 组显示「索引加载中」内联行，其余分组照常可查 |
| FX 接口失败 | 价格主值（EUR/USD/NOK）不受影响；换算值降级为 `离线` 辅文；**复制永远复制源币种金额** |
| 索引构建失败 | 状态带（`--danger` 左规线 + 墨字）+ 重试按钮；保留最近查询可点击（部分可用） |

### 7.3 边界情形

| 情形 | 处理 |
|---|---|
| 刷新 | 全部状态在 URL：`?q=&scope=&sel=&cmp=&pin=&g=` |
| 后退键 | 因为查询用 `replaceState`，back 不会在字符级堆积；`Esc` 先关 dock、再清 `q`、再退出（两级） |
| 会话过期 | 无登录，不适用 |
| 离线 | 数据已打包，台账与复制完全可用；只有 FX 标记离线 |
| 多标签页 | 钉住/最近通过 `storage` 事件同步 |
| 剪贴板不可用 | `navigator.clipboard` 失败 → 隐藏 textarea + `execCommand('copy')`；仍失败 → 行内 `--danger` 提示 + 预览条文本可选中手动复制 |
| 超长名称 | 单行截断 + `title` 全文；中文列最多两行 |
| 200 行以上 | 截断提示 + 虚拟滚动（仅当组展开超过 100 行时启用） |

---

## 8. 复制契约（**本设计的核心交付**）

**原则：所见即所粘。** 台账底部常驻「复制预览条」，用 mono **逐字**展示当前焦点行将粘贴的字符串；
预览条与剪贴板内容由**同一个序列化函数**产出（不允许两处各写一遍）。

### 8.1 载荷格式

- 分隔符：**Tab**（下文表格中记作 **⇥**，实际载荷为字面 Tab 字符）· 行分隔：**换行** · **无表头** · **无引号** · 末尾空列省略。
- 列序恒为 **QUOS 录入顺序**：`定位码 → 国家码 → Type → 服务名 → 价格 → 币种`；缺项跳过但不改相对顺序。
- **价格原样**：源币种金额（`442.55`），不带 `€` 符号、不带千分位、不改小数位。币种单独一列。

| 行类型 | Tab 分隔载荷 | 实例 |
|---|---|---|
| 城市 | 城市码·国家码·英文名·中文名 | `CPH⇥DK⇥Copenhagen⇥哥本哈根` |
| 国家 | 国家码·英文名·中文名 | `DK⇥Denmark⇥丹麦` |
| 服务码 | 码·英文标签·中文标签 | `HTL⇥Hotel⇥酒店` |
| 酒店 | 城市码·国家码·`HTL`·服务名+包价·价格·币种 | `CPH⇥DK⇥HTL⇥BW TEN (Standard)⇥442.55⇥EUR` |
| 景点 | 城市码·国家码·`ENT`·英文名·价格·币种 | `PAR⇥FR⇥ENT⇥LOUVRE MUSEUM` |
| MICE | 城市码·国家码·`ENT`·活动英文名·价格·币种 | `BCN⇥ES⇥ENT⇥FLAMENCO SHOW⇥38⇥EUR` |
| 费率（路税） | 国家码·`OTH`·条目名·价格·币种 | `NO⇥OTH⇥LDC ROAD TAX⇥380⇥NOK` |
| 费率（杂费） | 城市码·国家码·`OTH`·条目名·价格·币种 | `CKV⇥CZ⇥OTH⇥PARKING BUS STOP LD IN ADVANCE⇥98.49⇥EUR` |
| 保险 | 国家码·`OTH`·条目名·价格·币种 | `CN⇥OTH⇥TRAVEL INSURANCE⇥2.66⇥USD` |
| LDC 供应商 | 供应商码·车型·日费率·币种 | `IT ROM⇥NGS⇥650⇥EUR` |
| STD MTC 选项 | 城市码·`MTC`·条目名 | `ROM⇥MTC⇥Rome - APT - 05 HOURS` |

### 8.2 复制触发点

| 触发 | 复制内容 |
|---|---|
| 点代码牌任一段 | **该段的值**（`CPH` 或 `DK`），单值，无 Tab |
| 代码牌上的 `⧉` | 两段拼接（`DK/CPH`，与屏上标签一致） |
| 行内 `⧉` 或按 `Y` | 该行完整载荷（§8.1） |
| 多选后 `Y` / `复制选中行` | 每行一条，`\n` 连接（可直接粘成表格块） |
| dock 复制区 | 该实体的全部变体载荷，逐条列出（点哪条复制哪条） |

### 8.3 反馈

- 代码牌填充切 `--accent-fill` + 墨字 `已复制`，`600ms` 回落（**不弹 toast**，避免打断连续查询）。
- 多行复制、或剪贴板降级路径，才用 toast（`toast 70` 层），文案 `已复制 3 行`。
- 屏幕阅读器：`aria-live="polite"` 播报 `已复制 CPH DK HTL BW TEN 442.55 EUR`（最多播前 80 字符，超出省略）。
- **FX 永不参与复制**：换算只是屏上辅文。

---

## 9. 组件规格

> 所有视觉值来自 `DESIGN.md`；此处只写行为契约。组件**必须**用 Radix 原语（见 §14），不得手写可访问性逻辑。

### 9.1 `CodeBoard`（看板带）

- **用途**：每个视图的顶部常驻带，承载查询行、scope 选择、命中统计。
- **结构**：`<header role="search">` · scope 组（`role="tablist"`? 否：范围是筛选，用 `role="group"` + `aria-pressed` 的 chip，避免与 tab 语义混淆）· 查询行（`role="combobox"`）· 计数（`aria-live="polite"`）。
- **Props**：`value, onChange, scope, onScopeChange, counts, indexState`。
- **状态**：`rest` · `typing` · `busy`（索引构建中，2px 细进度条）· `index-error`。
- **键盘**：`/` 或 `⌘K` 聚焦查询行；`Tab` 依次到 scope chips；`Esc` 清空并失焦（若已有 dock 打开，则先关 dock）。
- **无障碍**：输入框 `aria-label="查询城市、代码、服务或费率"`；`aria-expanded` / `aria-controls` / `aria-activedescendant` 指向当前行；`role="combobox"` + `aria-autocomplete="list"`。
- **响应式**：`< md` 时 scope chips 横向滚动（不换行），查询行保持第一行。

### 9.2 `CodePlate`（**Signature**）

- **用途**：代码的最小可视单元，两段式，可点可复制。
- **Props**：`segments: [{value, label, title}]`（1 到 2 段）· `size: 'row' | 'dock'` · `copied: string | null`（哪个段处于复制态）。
- **状态**：`default`（浅底墨字 + 1px 规线）· `hover`（墨底浅字）· `focus-visible`（`--accent` 环）· `copied`（`--accent-fill` 底 + 墨字 `已复制`）· `pending`（值缺失：显示 `待实填` 黄牌，不可复制）。
- **无障碍**：每段是一个真 `<button>`，`aria-label="复制城市码 CPH"`；复制后同一按钮的 `aria-live` 区域播报。**不是** `role="button"` 的 div。
- **响应式**：行内尺寸固定宽度（3 段码用 `ch` 宽度），避免台账抖动。

### 9.3 `ResultLedger` + `LedgerRow`

- **用途**：分组台账，全宽带状行，固定列模板（所有分组共用同一列网格，保证竖向对齐）。
- **Props**：`groups: [{key, label, count, expanded, rows}]` · `activeId` · `onActivate` · `onCopy` · `onPin`。
- **列模板**（12 列网格）：`码牌(11ch) · 名称(main, 1fr) · 副名(1fr) · 数值(9ch, 右对齐 mono) · 单位(5ch) · 标记(auto)`。
- **状态**：行 `default/hover/focus/copied/pinned/pending-value/copy-error`；组 `collapsed(5 行)/expanded`。
- **无障碍**：`role="listbox"`（`aria-multiselectable="true"`），组为 `role="group"` + `aria-label="城市 3 条"`，行为 `role="option"` + `aria-selected`。班表头是 `role="presentation"`（不作为 option）。
  焦点用 **roving tabindex** 在行上，输入框保持 DOM 焦点时用 `aria-activedescendant`。
- **键盘**：`↑↓` 跨组移动（**不得停在组头**）· `Home/End` · `Enter` 开 dock · `Y` 复制行 · `C` 复制码 · `P` 钉住 · `B` 比价（仅城市/酒店行）· `Esc` 两级退出。

### 9.4 `CopyPreview`（复制预览条）

- **用途**：常驻显示焦点行将粘贴的确切字符串；与剪贴板同源。
- **Props**：`text` · `rowLabel`。
- **状态**：`empty`（`↑↓ 选择一行，预览将粘贴的内容`）· `ready` · `multi`（`3 行`）· `error`（剪贴板不可用时，文本可选中，提示 `剪贴板不可用，请手动选中复制`）。
- **规格**：单行 mono，溢出横向滚动（不换行、不截断首字符）；`role="status"` `aria-live="polite"`，但**只在内容变化时更新**，避免逐字符刷屏。

### 9.5 `ScopeChips`

- **用途**：范围筛选（全部/城市/酒店/景点/MICE/费率/服务码）。
- **Props**：`scope, onChange, counts`。
- **状态**：`default` · `active`（`--accent-fill` 底 + 墨字）· `empty-count`（该 scope 零命中 → 保持可选但显示 `0`，并在选中后显示空结果带）。
- **无障碍**：容器 `role="group" aria-label="结果范围"`；每个 chip `<button aria-pressed>`；`→/←` 在同组内移动焦点（**手动激活**，`Enter`/`Space` 才切换）。

### 9.6 `DetailDock`

- **用途**：右侧详情面板（≥lg），不跳页，保留台账状态。
- **Props**：`entity` · `open` · `onClose` · `onCopy`。
- **状态**：`empty` · `loading` · `loaded` · `missing-image` · `error`。
- **无障碍**：`<aside aria-labelledby>`（**非 modal**，因为台账仍可操作）；打开时焦点移到 `h2[tabindex=-1]`；`Esc` 关闭并把焦点还给来源行；关闭后来源行保持 `aria-selected`。
- **响应式**：`< lg` 变为全屏 sheet（`overlay` + `modal` 层，此时**是** modal，需 `focus-trap`）。

### 9.7 `CompareMatrix`（比价台）

- **用途**：酒店价格对比矩阵（行=酒店，列=报价月/星级/评分/距离标签）。真实 `<table>` 语义：`<th scope="col">` 可排序（`aria-sort`）。
- **状态**：`no-price`（`待实填` 黄牌）· `comparing(1..3)` · `max(3)` · `empty`。
- **响应式**：`< lg` 退化为逐家堆叠块 + 3 个月列的子表。
- **复制**：单行 / 选中行 / 整列（整列 = 同一个月全部酒店的行载荷，`\n` 连接）。

### 9.8 `StatusBand`（状态带）

- **用途**：空结果、部分数据、错误、离线。左规线 3px 上色，墨字正文，右侧一个动作。
- **变体**：`neutral`（无结果 + 近似建议）· `pending`（黄牌，待实填）· `danger`（索引错误 + 重试）· `info`（离线/FX）。
- **无障碍**：`role="status"`（非阻断）或 `role="alert"`（索引失败）；**不自动聚焦**。

### 9.9 `ReferenceSheet`（参考表，空态与设置用）

- **用途**：3 栏规线表格呈现 12 个服务码 / 9 个路税国家 / 3 条杂费 / ROM 36 项 STD MTC。
- **规格**：无卡片、无阴影；列头 11px 大写 mono；每行可复制。
- **无障碍**：真 `<table>` + `<caption>`（视觉隐藏的 caption 说明用途）。

### 9.10 `ImageOrPlate`（图片或牌）

- **用途**：替代现有 `image-with-placeholder` / `mice-image` 的 emoji 渐变占位。
- **行为**：有图 → 16:9 `next/image`，`loading="lazy"`，`sizes` 按 dock 宽度；无图/失败 → 「无图牌」（`--sunken` 底 + 城市码 mono + 名称），`role="img"` + `aria-label="<名称>无图片"`。**不使用 emoji、不使用装饰性 alt 文字**。

---

## 10. 移动端降级策略（次要，但不能坏）

这里的主战场是桌面；移动端是「在客户现场/路上临时查一下」。

| 桌面 | `< lg` | `< md` |
|---|---|---|
| 台账全宽带（12 列网格） | 保留台账，列合并（副名进主名第二行） | 行变两行块：名称 + 码牌 / 数值右对齐 |
| 右侧 dock | 全屏 sheet | 全屏 sheet |
| 键位提示（`↑↓ Y Enter`） | 隐藏 | 隐藏 |
| 比价矩阵 | 堆叠块 + 3 月列 | 单列卡片式堆叠（仍是表格语义） |
| 参考表 3 栏 | 2 栏 | 1 栏 |
| 触控目标 | ≥ 44px 行高与 chip 高度 | 同 |

移动端**不引入**任何新的视觉语言（不换字体、不加圆角、不换色）。键盘提示只是隐藏，功能不减。

---

## 11. 可访问性（硬约束）

| 项 | 规格 |
|---|---|
| 对比度 | 全部配对已实测并记录在 `DESIGN.md`（正文 ≥ 4.5:1，UI/大字 ≥ 3:1）。`--accent-fill` / `--warning-fill` 上恒用墨字 |
| 键盘路径 | `/` 聚焦查询 → 打字 → `↑↓` 跨组选行 → `Y` 复制 / `Enter` 开 dock → `Esc` 关 dock → `Esc` 清查询。全流程不需要鼠标，`Tab` 只用于进/出看板带与 dock |
| 焦点可见 | `:focus-visible` 2px `--accent` 环 + 2px offset；看板带上用 `--board-amber` 环；**从不用 `outline: none` 而不给替代** |
| 屏幕阅读器 | 查询行 `combobox` 语义；命中统计 `aria-live="polite"`（「找到 17 条，4 组」）；复制播报；`StatusBand` 用 `status`/`alert` |
| 定位 | 排序表用 `aria-sort`；代码牌是 `<button>`；无 `div` 假按钮 |
| 动效 | `prefers-reduced-motion` 下全部归零（`DESIGN.md` §Motion） |
| 触控 | `< md` 触控目标 ≥ 44×44px |
| 语言 | `<html lang="zh-CN">`；纯英文数据片段用 `<span lang="en">`（服务名、代码） |
| 缩放 | 200% 缩放下台账不横向溢出（列模板用 `ch` 与 `1fr`，不用固定 px 宽度） |
| 色盲 | 类型**不只**靠色相区分（QUOS 三字码徽章）；状态牌带文字（`待实填` / `已复制`），颜色是冗余编码 |

---

## 12. 性能预算（3 秒目标的物理保证）

| 项 | 预算 | 手段 |
|---|---|---|
| 索引构建 | < 300ms | 一次构建、模块级缓存（沿用 `data.js` 的惰性索引先例）；城市码索引复用 `quos-mapping` 的既有 Map |
| 输入到出结果 | < 50ms | `useDeferredValue`；本地同步索引；不做网络请求 |
| 首屏（查询板首个可交互） | < 1.5s | **MICE 索引不进首屏包**：优先构建期产出精简索引（`scripts/` 已有 builder 先例，如 `scripts/build-city-hints.js`）；否则用 `dynamic import` 懒加载，MICE 组显示内联「索引加载中」 |
| 台账渲染 | 首 40 行 < 16ms | 组默认 5 行；展开超 100 行启用虚拟滚动 |
| 图片 | 不阻塞 | `next/image` + `loading="lazy"`，只在 dock 内出现 |
| FX | 不阻塞 | 异步，失败即离线标记，台账不等它 |

---

## 13. Design Pre-Flight（Step 6）

### 13.1 身份锁

- [x] 每屏只用 `DESIGN.md` 的值；系统外取值 **0**（旧 `--accent #08739D` / `--gold` / `--mice-accent` / `--accent-gradient` 全部作废）
- [x] 一个强调色（ochre）· 一套圆角（2/3/4/6）· 一个图标家族（Lucide，仅必要时）· 一套字体配对（Barlow + IBM Plex Mono）
- [x] 并排看是同一产品：台账、比价台、dock、设置共用同一列网格与规线语言
- [x] 本特性是首份 spec，`DESIGN.md` 同时产出；与根目录旧 `DESIGN.md` 的冲突已在 `DESIGN.md` §`与既有资产的边界` 显式声明（不并存）

### 13.2 反 slop

- [x] 禁用字体 0（无 Inter/Roboto/system-ui；无 Fraunces/Playfair/Space Grotesk）
- [x] 禁用配色 0（无紫蓝光晕、无紫蓝渐变、无 cream/sand 米色默认底、无渐变文字、无「近黑 + 单一酸绿」）
- [x] 禁用布局 0（无三张等宽卡、无嵌套卡、无 eyebrow 编号、无居中深色 mesh hero、无玻璃拟态、无装饰性状态点、无假截图）
- [x] 空词 0 · 假名 0 · 假精确数字 0 · em dash 0（可见文案中）
- [x] slop 测试：把「8458 条城市码 + 出发看板式双段代码牌 + 方角规线台账」摆出来，没人会说这是通用模板
- [x] 反事实测试：这是「欧洲地接读码工作台」的答案，不是任何数据工具的答案（我若拿到「CRM 仪表盘」brief 不会给出它）
- [x] Signature 在场且贴合 brief：看板带 + 双段代码牌 + 所见即所粘预览条
- [x] 无参考链接，故无克隆风险

### 13.3 状态与流

- [x] 每个交互元素覆盖 loading / empty / error（§7，逐组件在 §9 声明状态）
- [x] 边界：刷新（URL 全量状态）· 后退（`replaceState` + 两级 `Esc`）· 离线（可用，仅 FX 降级）· 多标签同步 · 剪贴板失败降级

### 13.4 可访问性

- [x] 对比度实测并记录（含 3 处不达标已修，见 13.7）
- [x] 可见焦点 + 完整键盘路径（§11）
- [x] `prefers-reduced-motion` 处理；三个动效各有动机
- [x] 复杂组件给了 ARIA 角色与播报规格（combobox / listbox / group / status / alert）
- [x] 触控目标 ≥ 44px（移动端）

### 13.5 布局工艺

- [x] ≥ 3 个不同布局家族：① 看板带（满宽深带）② 带状台账（全宽规线行）③ 详情 dock（窄栏 + 72ch 正文）④ 比价矩阵（行列表格）⑤ 参考表（多栏印刷式）⑥ 状态带
- [x] 层级清晰，每屏一个焦点：查询板=看板带；比价台=矩阵；dock=大号代码牌
- [x] 留白有意图：行高 32px 的密排是刻意的（扫读），区块间用 32/48，不撒 12px 均匀间距

### 13.6 认知负荷

- [x] 主导航 2 项 + 1 齿轮（原 5 项）；scope 7 个 chip 属于筛选不属导航
- [x] 每屏一个主动作：查询板=`查询/复制`；比价台=`比价`；设置=`保存`
- [x] 大面积内容已分块：结果按组分带、每次默认 5 行；参考表分栏；设置分 5 节

### 13.7 评分与修订（0 到 4，诚实打分）

| 轴 | 分 | 依据 |
|---|---|---|
| distinctiveness | **4** | 方向来自 domain 的编码事实（路牌/看板），非 category 默认；且 Signature 是任务形状本身 |
| hierarchy & focus | **3** | 每屏单焦点清楚；风险是密排台账容易「一片均匀」，靠组头 + 唯一强调色兜住，不是 4 |
| consistency with DESIGN.md | **4** | 两文件均由本 spec 定义并逐值绑定；无系统外值 |
| accessibility | **4** | 全部配对实测；键盘路径、ARIA、reduced-motion、触控、缩放均给出可验收条文 |
| state / edge coverage | **4** | 空/加载/无结果/部分/错误/离线/剪贴板失败/多标签/截断全部有处理；空态本身可用 |
| copy quality | **3** | 中英分工与动作词表已锁；但双语词汇最终需 Michael 拍板（另见 §15 Q5），故不给自己 4 |
| restraint | **4** | 一个强调色、一处花哨、默认无阴影、无 emoji、无装饰 |
| motion motivation | **3** | 只有 3 个动效且各有一句动机；预算刻意压到 2/10，属于「少而必要」而非「惊艳」 |

**合计 29 / 32。无 ≤2 轴。**

**闸门前后的修订（改了什么 + 为什么）**

1. 强调色从「信号黄作文字色」改为「ochre 棕作强调 + 黄色只作填充」：实测 `warning` 文字 on `--surface` 仅 **2.47:1**，不达标；signage 里黄底黑字本就是唯一正确用法，规则即设计。
2. `--subtle` 从 `oklch(0.56 0.018 255)` 加深到 `oklch(0.52 0.018 255)`：原值在 `--sunken` 上只有 3.88:1，改后 5.00:1（三底全过）。
3. 深色主题的 `--accent-fill` 文字从浅字改为墨字：实测浅字 on 填充只有 **1.67:1**；现在统一「填充恒配墨字」，两主题 7.38 / 8.51。
4. 导航从 5 项（首页/城市库/酒店库/MICE/设置）砍到 2 项 + 齿轮：四岛回答同一问题，认知负荷与身份漂移双重理由。
5. 圆角从 `rounded-2xl`（12 到 16px）与玻璃拟态 tab 改为 2/3/4/6 方角、去 `backdrop-blur`：原方案命中 anti-slop 的玻璃拟态与大圆角默认。
6. 结果呈现从卡片网格改为全宽带状台账 + 固定列网格：查询要求竖列对齐以支持跨行扫读与数值比对。
7. 类型徽章从 emoji 改为 QUOS 三字码 mono 徽章：去 slop，同时把 domain 语言变为视觉语言。
8. 图片占位的 emoji 渐变改为「无图牌」（城市码 + 名称）：坏图不再产生视觉事故，且无图时仍传递信息。
9. 移动端原计划「横向滚动矩阵」改为堆叠块 + 3 月列子表：横向滚动在小屏不可用。
10. `CodeBoard` 的范围控件从 `role="tablist"` 改为 `role="group"` + `aria-pressed`：它是筛选不是视图切换，用 tab 语义会让屏幕阅读器误报。

---

## 14. 交接 brief（Step 7 · 委派实现）

**目标工程 agent**：`nextjs-senior-engineer`（Next.js 16 App Router + React 19 + Tailwind v4，服务端渲染 / 数据层在 `src/lib`）。

**design_system**：**Radix UI primitives**（`@radix-ui/react-combobox` / `dialog` / `popover` / `tooltip` / `visually-hidden`）+ **shadcn/ui copy-in 层**。
- 安装说明：`npx shadcn@latest init` 后按需 `add` 组件（copy-in 到 `src/components/ui/`），底层依赖 Radix；或直接引 `radix-ui` 原语。
- **必须**：用 `DESIGN.md` 的 token 覆盖主题层（`src/app/globals.css` 的 `@theme inline` + CSS 变量），
  并**删除** shadcn 默认主题（zinc 灰、`--radius: 0.625rem`、Inter 字体、`rounded-lg` 默认）与仓库旧配色（`#08739D` / `#5f7113` / `--mice-accent` / `--accent-gradient`）。
- **禁止**：重新实现 Radix 的组件行为（focus trap、combobox 键盘逻辑、popover 定位）；**只做主题与外观**。

**给实现者的指令（原文照抄）**：

> **Implement exactly this spec. Theme the design system with our locked tokens; do NOT redesign or re-implement its components.**
> 逐条实现 `.ulpi/design/DESIGN.md` 与 `.ulpi/design/query-platform.md`。任何视觉值若在 `DESIGN.md` 中找不到，
> 先停下来问，不要自创。`src/data/*` 与 `src/lib/*` 为只读数据资产，只消费不改语义。

**验收标准（原文，可逐条勾选）**

```
[ ] 导航只剩 2 项（查询板 / 比价台）+ 齿轮；/knowledge 与 /mice 重定向到 /?scope=... 且带参生效
[ ] "/" 键聚焦查询行；↑↓ 可跨分组移动且不在组头上停留；Enter 开 dock；Y 复制行；C 复制代码牌；Esc 两级退出
[ ] 输入 "CPH"、"DK"、"copenh"、"哥本哈根"、"HTL"、"road tax"、"NGS" 均能命中对应分组并置顶精确码命中
[ ] 复制载荷与 §8.1 表格逐字一致（Tab 分隔、无表头、行尾空列省略、价格无符号无千分位）
[ ] 复制预览条内容与剪贴板内容由同一函数产出（不允许两处实现）
[ ] 代码牌两段可分别复制；复制后填充变 ochre + 墨字「已复制」，600ms 回落，不弹 toast
[ ] 空态含：最近查询 ≤6、钉住 ≤12、折叠参考表（12 服务码 / 9 路税国 / 3 杂费 / ROM 36 项 / 保险 2.66 USD）
[ ] 无结果提供近似建议 + 「记录临时码」入口，写入 localStorage 并立即可检索、可导出补丁 JSON
[ ] 缺价格处显示「待实填」黄牌（墨字），复制载荷价格列为空；全站不出现 price=0 冒充价格
[ ] FX 换算值仅为辅文，复制内容永远为源币种金额
[ ] 剪贴板不可用时降级到 execCommand，仍失败则提示并允许手动选中复制
[ ] 对比度实测达标（DESIGN.md 表格内的全部配对，浅/深两套）：正文 ≥4.5:1，UI/大字 ≥3:1
[ ] 200% 缩放与 lg/md 断点下台账无横向溢出；<lg dock 为全屏 sheet 且有 focus-trap
[ ] prefers-reduced-motion 下三个动效全部归零
[ ] 全站 0 emoji 于 chrome；类型标记为 QUOS 三字码 mono 徽章
[ ] 全站 0 处 backdrop-blur / rounded-2xl 及以上圆角 / 渐变文字 / em dash / 感叹号
[ ] 旧配色 token 已从 globals.css 移除，不留双份调色板
[ ] 首屏可交互 <1.5s（MICE 索引不阻塞首屏）；输入到出结果 <50ms
```

---

## 15. 待 Michael 拍板（5 个问题）

1. **美学口味（最关键）**：我押「冷石墨底 + 单一 ochre 强调（欧洲旅游路牌棕）+ 方角 + 看板带」，把现有的「专业蓝系 + 圆角卡片 + emoji 徽章」整体替换。
   接受这个身份，还是你想保留蓝系、只做结构重排？**（我的建议：换，蓝系是这个 category 最可预测的答案，而你要的是每天看 8 小时的自己的台子。）**
2. **信息架构取舍**：`/knowledge` + `/hotels` + `/mice` 合并为「查询板一个入口 + scope 筛选」，只保留 `/hotels` 作为独立的**比价台**，旧路由重定向。
   你接受 MICE 从「一个页面」变成「一个筛选范围」吗？（代价：不能像现在这样漫无目的地翻 MICE 美图。）
3. **详情呈现方式**：详情用**右侧 dock**（不跳页、保留查询状态，适合连续查同城多个实体）还是保留**独立页面**（可新标签打开/可收藏，但会丢查询）？我建议 dock 为主 + 独立路由并存（dock 里有「在新标签打开」）。
4. **复制契约的列序与分隔符**：我定的是 `定位码 → 国家码 → Type → 服务名 → 价格 → 币种`，Tab 分隔、无表头、行尾空列省略。
   请对着 QUOS 的录入顺序确认列序（尤其「服务名」要不要带括号包价，如 `BW TEN (Standard)`），以及 Tab 是否真的比「空格分隔」更好粘。
5. **是否接受新增依赖**：可访问组件层用 Radix + shadcn copy-in（换取 focus trap / combobox / popover 的正确性与省工），
   还是继续纯手写 Tailwind（无新依赖，但要自己写完可访问性逻辑）？另外确认动作词用中文（复制/钉住/比价）、代码与数据全英文大写。
