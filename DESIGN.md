# Design

> Euro Atlas 设计系统快照（由 impeccable 生成于 2026-08）。视觉规则见 `src/app/globals.css`；「目录/资料库」页的编辑/展示风与 MICE 暖色为新增约定。

## Theme

浅/深双主题，CSS 变量 token 全部集中在 `src/app/globals.css`。配色为「专业蓝系」：
- 浅色：`--bg-primary #E7EEF8` · 卡片 `--bg-card #f7fafd` · 主色 `--accent #08739D` · 辅蓝 `--accent-dim #4984AC` · 价格/青柠 `--gold #5f7113`
- 深色：夜蓝 `--bg-primary #071521` · `--accent #63a0c8` · `--gold #AEC60C`

所有 token 均按 WCAG AA 校验（正文 ≥4.5:1），新增色彩需两套主题都过。

## Color

默认 Restrained（产品工具）。**例外**：两个「目录」表面 —— 酒店库保持冷蓝系；MICE 用专属暖色点缀以区分品类。

### MICE 专属点缀色（新增，用于标识「活动/现场」能量）
| token | light | dark | 用途 |
|---|---|---|---|
| `--mice-accent` | `#C2410C` | `#F2762E` | 类别徽章文字、价格、链接 |
| `--mice-accent-subtle` | `rgba(194,65,12,.12)` | `rgba(242,118,46,.16)` | 类别徽章底 |
| `--mice-accent-strong` | `#C2410C` | `#C2410C` | 主按钮/激活 chip 填充（**深浅同用**，白字 ≥4.5:1） |
| `--mice-accent-hover` | `#B13A0A` | `#F28A4D` | 悬停 |

> 规则：`--mice-accent` 在深色会提亮，**不能**作白字按钮/激活 chip 的底（白字仅 ~2.8:1）；这类实心填充一律用 `--mice-accent-strong`。

## Typography

- `--font-sans` / `--font-display` 同为 `Geist` + `Noto Sans SC`（CJK 兜底）。
- 目录页标题用 `font-display` + `text-2xl/3xl`，加 `text-wrap: balance`。
- 正文 line-length 上限 65–75ch；数据/清单可更密。
- 不用高对比 display/body 配对；单一家族靠字重/字号拉开层级（product register）。

## Components

- **卡片**：圆角 `rounded-2xl`（12–16px，勿再用 32px+），边框 `--border-color` + 1px 投影（`0 1px 2px`，勿配宽模糊+边框）。
- **酒店卡**（`hotels/page.js`）：顶部 monogram 渐变锚点（`var(--accent)→var(--accent-dim)`，白字首字）+ 信息区（名称/评分/星级/近X标签/价格）。评分配色：≥9 深绿 / ≥8 品牌蓝 / ≥7 琥珀。
- **MICE 卡**（`mice/page.js`）：图片主导（`h-36`，hover 微缩放），类别徽章用 `--mice-accent`/`--mice-accent-subtle`，价格用 `--mice-accent`。
- **MICE 图片占位**（`mice-image.jsx`）：加载中/失败显示渐变 + emoji，`<img>` 设 `alt=""`（装饰性），语义放容器 `role="img"` + `aria-label`，避免坏图 alt 文字铺满。
- **按钮**：主按钮底色 `var(--accent-strong)`（酒店/SITE 通用）或 `var(--mice-accent-strong)`（MICE 页主 CTA）；白字。
- **筛选**：pill chip（激活=`--accent-strong`/`--mice-accent-strong` 白字），下拉 `select` 统一圆角/字号。
- **focus**：`.focus-ring`（蓝）/ `.focus-ring-mice`（橙），全键盘可达。

## Layout

- 目录列表/网格 `repeat(auto-fit, minmax(280px,1fr))` 或用 `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`、MICE `xl:grid-cols-4`。
- 页面容器：masthead（渐变底、标题+统计 chips）+ 主内容 `max-w-6xl/7xl`、`bg-secondary` 全出血。
- 榜单/资料库卡片做克制入场 `fade-up`（0.4s ease-out + 错峰），`prefers-reduced-motion` 关闭。

## Motion

- 仅状态/入场动效，150–400ms，ease-out。`@media (prefers-reduced-motion: reduce)` 关闭全部动画与平滑滚动。
