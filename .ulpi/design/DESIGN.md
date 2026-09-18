---
project: euro · 查询板 (Query Board)
register: product
aesthetic_direction: industrial / signage
color_strategy: restrained
design_system: Radix UI primitives + shadcn/ui copy-in（全量重着色）
design_variance: 5
motion_intensity: 2
visual_density: 9
---

# euro · 锁定设计语言

> **每屏并排放在一起，必须读起来是同一个产品。**
> 本文件是唯一的视觉真理源。屏幕之间允许构图变化，**不允许**调色板、字体、圆角、语音漂移。
> 任何新屏幕开工前先读本文件；写在本文件之外的值即为缺陷。

---

## Design Read

**一个人的资料查表台，不是旅行 App。** 感觉：欧洲车站的出发看板（Solari 翻牌式）+ 高速公路指路牌。
冷石墨底、墨黑细规线、方角双段代码牌，视线扫过就能读到代码，一键粘进 QUOS。
**押注：把「读码」这个动作本身做成产品身份**，而不是把页面做得像消费级内容库。

## 为什么是 industrial / signage（而不是别的方向）

反默认测试：换一份「内部数据工具」的 brief，我给出的默认答案会是深色 slate + 单一强调色的仪表盘，或者
shadcn 原味（zinc 灰 + `rounded-lg` + Inter）。那是本 category 的可预测答案，因此出局。

选择 signage 的理由**来自 brief 本身**：

- 用户的工作是**读码、抄码、填码**：`DK/CPH`、`HTL`、`OFR`、`IT ROM`、`NGS`。这是**路牌语言**，不是内容消费语言。
- 用户的参照物是 **QUOS 录入界面**：他要一边看 euro 一边往另一个系统敲字。看板式排版天然服务「隔屏对读」。
- 数据本身是**编码化的世界**：8458 条城市码、12 个服务类型码、9 个路税国家码。把代码做成视觉主角，比把图片做成主角更贴合任务。
- 手机端不是主战场（桌面为主、每天高频 8 小时），所以身份可以走「锐利、方正、高对比」，不必为移动端的圆润友好让步。

**明确不继承的**：现有 `docs`/`DESIGN.md` 快照里的「专业蓝系」（`#08739D`）。蓝是 travel + SaaS 双重条件反射，
也是「AI 配色」最高频的 tell；现有 4 个页面各带一套卡片语言（酒店冷蓝卡、MICE 暖卡、城市渐变蒙版），本身就是身份漂移。

---

## Signature（唯一一处花哨）

### 代码牌 · CodePlate + 看板行 · Code Board

**这是产品被记住的那一个元素，其余全部安静、克制。**

- **看板行（Board Strip）**：每个视图顶部一条**满宽墨黑带**（`--board`），里面是单行 mono 查询输入。
  不是 ⌘K 弹窗，是**常驻的、可点的、永远在同一个位置**的一行。字形是 amber 的等宽体，光标是一条 2px 立竖线（非闪烁，聚焦时才动）。
- **代码牌（CodePlate）**：城市/服务代码的最小单元，**两段式**，像路线牌：`DK` 一段 + `CPH` 一段，
  方角，1px 墨线边框，等宽大写，段间一条 1px 竖分线。**每一段独立可点、可复制**（QUOS 要的是哪一段就点哪一段）。
  静止：浅底墨字。悬停：墨底浅字。**已复制：ochre 实底墨字，600ms 后回落**。
- 支撑规则（不额外花哨，只强化上面这一件事）：**复制预览条**常驻在台账底部，用 mono 明示当前焦点行**将要粘贴出来的确切字符串**。
  「所见即所粘」是查询台的信任基础。

为什么贴合 brief：用户每天做的动作就是「从一块板上读到代码，然后敲进另一个系统」。这个身份不是装饰，
是任务的形状本身。

---

## Color（锁定 · 冷石墨底 + 单一 ochre 强调）

**策略：restrained。** ochre 强调合计 ≤ 10% 视觉面积，只出现在：代码牌复制态、看板查询行、焦点环、当前 scope chip、
「钉住」标记。其余全部是冷石墨中性色 + 墨黑规线。

**故意的偏离（记录在案）**：中性色**没有**朝强调色（ochre，hue 63）偏移，而是朝冷石墨（hue 255，chroma 0.006 到 0.021）偏移。
理由：朝 ochre 偏移会得到暖米色底，即 anti-slop 明令禁止的 cream/sand 默认底色。signage 的对比逻辑本身就是
**冷基底 + 暖信号**；让暖色只由唯一的强调色承担，比把暖色稀释进底色更有力。

### Light（默认）

| role | OKLCH | hex | use |
|---|---|---|---|
| `--bg` | `oklch(0.968 0.006 255)` | `#F2F5F8` | 页面底 |
| `--surface` | `oklch(0.995 0.002 255)` | `#FCFDFF` | 台账行、dock 面 |
| `--sunken` | `oklch(0.938 0.008 255)` | `#E7EBF0` | 列头、看板外框、参考表底 |
| `--elevated` | `oklch(0.999 0.001 255)` | `#FEFFFF` | 浮层（popover / tooltip / toast） |
| `--ink` | `oklch(0.245 0.021 255)` | `#1A212A` | 正文、规线（强）、主按钮底 |
| `--muted` | `oklch(0.452 0.020 255)` | `#4F5761` | 次要文字 |
| `--subtle` | `oklch(0.520 0.018 255)` | `#626A73` | 元信息小字（任意底均达标，见下表） |
| `--border` | `oklch(0.870 0.010 255)` | `#D0D5DB` | 1px 规线（行分隔、输入框） |
| `--accent` | `oklch(0.520 0.112 63)` | `#955811` | **唯一强调**：ochre 文字/图标/焦点/激活 chip 字 |
| `--accent-fill` | `oklch(0.760 0.130 70)` | `#E5A14B` | 复制态填充、激活 chip 底（**配墨字**） |
| `--accent-soft` | `oklch(0.940 0.030 70)` | `#F9E8D6` | 强调软底（选中行、钉住行） |
| `--success` | `oklch(0.500 0.110 150)` | `#2B7440` | 有报价 / 数据完整 |
| `--warning-fill` | `oklch(0.760 0.150 88)` | `#D9AA1B` | **仅作填充**（待实填、价格缺失提示），配墨字 |
| `--danger` | `oklch(0.500 0.190 27)` | `#B7191C` | 错误、复制失败 |
| `--info` | `oklch(0.480 0.030 250)` | `#515F6E` | 中性提示（离线、FX 参考） |
| `--board` | `oklch(0.205 0.014 255)` | `#13181E` | 看板带底 |
| `--board-ink` | `oklch(0.968 0.006 255)` | `#F2F5F8` | 看板带正文 |
| `--board-muted` | `oklch(0.640 0.018 255)` | `#858D97` | 看板带提示字 |
| `--board-amber` | `oklch(0.790 0.140 72)` | `#F1AA47` | 看板带查询字形（＝代码牌在带上的颜色） |

**规则：黄色永远是「面」，不是「字」。** `--warning-fill` 不提供文字色变体（signage 里黄底黑字是唯一正确用法）。

### Dark（重新推导，不是反相）

| role | OKLCH | hex |
|---|---|---|
| `--bg` | `oklch(0.175 0.008 255)` | `#0E1114` |
| `--surface` | `oklch(0.235 0.010 255)` | `#1B1E23` |
| `--sunken` | `oklch(0.140 0.007 255)` | `#07090C` |
| `--ink` | `oklch(0.955 0.005 255)` | `#EEF0F3` |
| `--muted` | `oklch(0.760 0.010 255)` | `#ADB1B7` |
| `--subtle` | `oklch(0.680 0.010 255)` | `#94999E` |
| `--border` | `oklch(0.330 0.014 255)` | `#31363D` |
| `--accent` | `oklch(0.780 0.115 72)` | `#E5AB60` |
| `--accent-fill` | `oklch(0.800 0.130 72)` | `#F1AF57` |
| `--success` | `oklch(0.760 0.110 150)` | `#7CC58C` |
| `--warning-fill` | `oklch(0.820 0.150 88)` | `#ECBD3A` |
| `--danger` | `oklch(0.700 0.160 27)` | `#F27166` |
| `--info` | `oklch(0.740 0.040 250)` | `#98ADC4` |

暗色不提供独立 `--board`：暗色下看板带用 `--sunken`（`#07090C`）＋ 顶部 1px `--border` 划界，避免「黑色大块里再嵌黑块」。

### 实测对比度（WCAG）

**Light**

| 配对 | 比值 | 要求 | 结论 |
|---|---|---|---|
| `--ink` on `--bg` / `--surface` | 14.79 / 15.99 | 4.5 | 通过 |
| `--muted` on `--surface` / `--bg` | 7.26 / 6.72 | 4.5 | 通过 |
| `--subtle` on `--surface` / `--bg` / `--sunken` | 5.42 / 5.02 / 4.59 | 4.5 | 通过 |
| `--accent` on `--surface` / `--bg` / `--sunken` / `--accent-soft` | 5.60 / 5.18 / 4.74 / 4.75 | 4.5 | 通过 |
| `--ink` on `--accent-fill` | 7.38 | 4.5 | 通过 |
| `--ink` on `--warning-fill` | 7.50 | 4.5 | 通过 |
| `--success` on `--surface` | 5.62 | 4.5 | 通过 |
| `--danger` on `--surface` | 6.53 | 4.5 | 通过 |
| `--info` on `--surface` | 6.43 | 4.5 | 通过 |
| `--board-ink` on `--board` | 16.33 | 4.5 | 通过 |
| `--board-muted` on `--board` | 5.33 | 4.5 | 通过 |
| `--board-amber` on `--board` | 9.06 | 4.5 | 通过 |
| 焦点环 `--accent` 对 `--surface` | 5.60 | 3.0 | 通过 |

**Dark**

| 配对 | 比值 | 要求 | 结论 |
|---|---|---|---|
| `--ink` on `--bg` / `--surface` / `--sunken` | 16.64 / 14.62 / 17.46 | 4.5 | 通过 |
| `--muted` on `--surface` / `--bg` | 7.77 / 8.84 | 4.5 | 通过 |
| `--subtle` on `--surface` | 5.79 | 4.5 | 通过 |
| `--accent` on `--surface` / `--sunken` | 8.19 / 9.78 | 4.5 | 通过 |
| `--ink`(暗底墨字) on `--accent-fill` | **8.51** | 4.5 | 通过 |
| `--success` / `--danger` / `--info` on `--surface` | 8.10 / 5.82 / 7.25 | 4.5 | 通过 |

**统一硬规则（因为上面两条实测结果）**：`--accent-fill` 与 `--warning-fill` 上**永远用 `--ink` 文字**，
两种主题皆然。白字压 ochre/黄在任何主题都不达标，禁止出现。

---

## Type（锁定）

| role | family | stack | use |
|---|---|---|---|
| signage | **Barlow Semi Condensed** 500/600/700 | `var(--font-barlow-sc)` | 看板带查询行、列头、scope chip、微标签（11px 大写 tracking 0.08em） |
| body | **Barlow** 400/500/600 | `var(--font-barlow)` | 台账行文字、dock 正文、说明（measure 65 到 75ch） |
| data | **IBM Plex Mono** 400/500/600 | `var(--font-plex-mono)` | 代码牌、价格、数量、路税/费率数值、复制预览条 |
| CJK | **Noto Sans SC** 400/500/700 | `var(--font-noto-sc)` | 中文兜底（Barlow 无 CJK 字形时接管） |

**配对轴**：signage grotesque（比例字体）↔ mono（等宽）。等价于「人读的句子」与「机器读的代码」的对比，
主题上正好对应这个产品的双语事实：中文解释 + 英文代码。

**为什么 Barlow**：它的字形直接来自**高速公路指路牌lettering**（低对比、微圆角 grotesque），
与导航/编码主题同源；它同时提供 **Semi Condensed 宽度**，让看板带与列头能在同一屏塞进更多字符而不牺牲辨识。
Barlow 与 IBM Plex Mono 均可自托管（`next/font/google` 构建期下载，离线运行不受影响）。
不选 Inter / Roboto / system-ui（条件反射默认），不选 Fraunces / Playfair / Space Grotesk（条件反射「有个性」）。
**不选衬线**：这是工具，不是杂志。

**字号阶梯（固定）**：42/44（仅空台账 h1）· 28 · 20 · 16 · 15（代码牌）· 14（正文默认）· 13（行辅文）· 11（微标签）。
行高：display 1.15 · body 1.4 · 台账行 1.25。行尾上限：正文 72ch（dock 内）。
`font-variant-numeric: tabular-nums` 在**所有**数字上开启，价格右对齐按位对齐。
`text-wrap: balance` 用于 h1/h2；`text-wrap: pretty` 用于 dock 段落。
**中文断行**：标签与按钮永不断行；台账行的中文列允许两行截断（`-webkit-line-clamp: 2`）。

---

## Scales（锁定）

**Spacing**（4px 基频）：`0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128`。
台账行内边距固定 `8px 12px`，行高固定 32px（紧凑）/ 40px（含副行的行）。
唯一例外：代码牌内部使用 `6px`（2px 微网格，仅限牌内）。

**Radius（一套到底，方角语言）**：`sm 2 · md 3 · lg 4 · xl 6 · full 9999`。
`full` **只**允许出现在枚举行标记（钉住点）。卡片、输入、按钮、chip、dock 一律 `md`，最大 `lg`。
**禁止** `rounded-2xl` 及以上的大圆角、禁止药丸型按钮、禁止 `backdrop-blur` 玻璃拟态。

**Shadow**：`none`（默认）· `sm: 0 1px 0 rgba(26,33,42,.06)` · `lg: 0 8px 24px rgba(26,33,42,.14)`。
默认**不用影子**，层级用**规线 + 底差**表达（signage 是印刷逻辑）。`lg` 仅给浮层（popover / dock 升起 / toast）。

**Z 层（命名）**：`base 0 · ledger 10 · stickyBoard 30 · dock 40 · backdrop 45 · overlay 50 · popover 60 · toast 70 · skipLink 80`。

**Breakpoints**：`sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536`。台账内容宽 `max-w-[1600px]`，dock 出现于 `≥lg`。

**Motion（预算极低，2/10）**：`fast 120ms · base 280ms · emphasis 480ms`，唯一曲线 `cubic-bezier(0.2, 0.8, 0.2, 1)`。
**无回弹/弹性**。只有三个动效被允许，各自都要能一句话说出动机：

1. **看板落定**（提交查询时）：台账行以 12ms/行 错峰淡入 + 4px 上移，共 180ms。动机：行来自不同分组，
   错峰让「分组边界」可见，避免整块闪跳。
2. **代码牌复制翻转**：填充 120ms 切到 ochre，600ms 后回落。动机：确认复制成功，且不需要 toast 抢注意力。
3. **详情 dock 滑入**：横向 280ms，`prefers-reduced-motion` 下改为瞬时出现。

其余一切（悬停、chip 切换、tab）都是**即时**，无过渡。`prefers-reduced-motion: reduce` 下全部动效时长归零。

---

## Voice

- `register:` **命令式 + 名词短语**。不寒暄、不拟人、不用感叹号。
- **双语分工（硬规则）**：英文专有名词、代码、服务名**原样大写**（`CPH` / `HTL` / `OFR` / `LOUVRE MUSEUM` / `IT ROM`），
  可复制、不翻译、不换大小写；中文只用于**解释、标签、动作**。
- `action vocabulary:` 动作词固定为：**查询 · 复制 · 钉住 · 展开 · 重置 · 比价**。
  「复制」的结果恒为「已复制」；禁止出现「拷贝 / 复制到剪贴板 / Copied to clipboard」等同义变体。
- 按钮文案=动词+宾语（`复制行` `钉住城市` `重置筛选`），状态文案=过去式/名词（`已复制` `已钉住` `无结果`）。
- **禁止**：em dash 作修辞、感叹号、emoji 装饰、营销类空词（不举实例，一律不用）、假精确数字
  （无出处的百分比与倍数，一律不写）。数字只用真实值（如 `2.66 USD/人`、`90.43 EUR/天`、`380 NOK/天`）。
- **emoji 彻底退出 chrome**：原来用 emoji 表达的类型徽章（🏨🏛️🚌）改为 **QUOS 三字码 mono 徽章**（`HTL` `ENT` `MTC`）。
  这既是去 slop，也是身份：用户认的本来就是码，不是图标。
- 图标：能用等宽字形就用字形（`⧉` 复制 · `▸` 展开 · `×` 关闭 · `↑↓` 上下）。必须用图标时只用 **Lucide**
  一个家族，16px，1.5px 描边，`currentColor`。
- 空态文案写「板在此，等你敲」。不写「开始你的探索之旅」。

---

## 与既有资产的边界

- 本文件取代 `DESIGN.md`（仓库根）中的配色与卡片约定。旧 token 值（`--bg-primary #E7EEF8` / `--accent #08739D` /
  `--gold #5f7113` / `--mice-accent #C2410C` / `--accent-gradient`）**全部作废**，不得与新 token 并存。
  MICE 不再拥有专属暖色：全站只有一个强调色，MICE 用**类型码**区分（`ENT` / `MICE`），不靠色相。
- `src/data/*`、`src/lib/*` 为只读数据资产，本设计不改变任何字段与语义，只改变呈现。
- `public/` 图片策略：图片**只出现在详情 dock 与 MICE 详情**，固定 16:9；无图时**不用** emoji/渐变占位，
  改用「无图牌」（`--sunken` 底 + 城市码 + 名称，等宽），坏图不再产生视觉事故。
