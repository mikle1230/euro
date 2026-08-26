# Euro Atlas — 北欧 MICE 行程解析规则（context.md）

> 用途：沉淀北欧（斯堪的纳维亚 / 波罗的海）行程的**报价注入与录入规则**，供后续指导用户操作与 AI 解析。
> 数据来源：KuoniTumlare「Tour Maker」练习副本团号 **BJSJ.H00005**（30 + 1 人，报价币种 EUR）。
> 日期（如 301026）为模拟练习数据，**重点学逻辑与规则，勿套用具体日期**。
> 相关实现模块：`coach-plan.js`（报价注入）、`ldc-mapping.js`（LDC 供应商判定）、`quos-mapping.js`（12 种 QUOS 服务）、`prompt.js`（AI 解析提示词）。

---

## 1. 本团行程概览（BJSJ.H00005）

- **团号**：BJSJ.H00005
- **人数**：30 + 1
- **路线**：北京(BJS) → 斯德哥尔摩(STO) → 赫尔辛基(HEL) → 塔林(TLL) → 挪威峡湾(BNM/ULV) → 奥斯陆(OSL) → 哥本哈根(CPH)
- **报价币种**：EUR（保险另按 USD）

> 塔林 QUOS 码 = **TLL**（TLX 是内部员工数据库专用码，勿用）。万塔 = **VAT**（赫尔辛基机场城市，国家 FIN）。

---

## 2. 接送机规则（不变）

- **落地第一天（Day 1）接机**：`Stockholm - APT/HTL`，用**当地车 `KT STD MTC`**，按 **G（Group 团组）** 计价。
- **最后送机**：同样用当地车 `KT STD MTC`。
- 接送机的国/城 = **当天城市**（如 Stockholm / STO）。

---

## 3. 跨国渡轮规则（Viking Line）

- 北欧跨海行程使用 **`Viking Line`**（北海/波罗的海渡轮供应商），不是其它船公司。
- **过夜渡轮 `OFR`** 与 **白班渡轮 `DFR`** **各单独列出**，且包含包价：
  - `OFR`：包价如 `A2 - Seaside Standard`（海景标准舱）、`B-Class / inside`（内舱）。
  - `DFR`：包价如 `Deck place`（甲板位）。
- 例（Day 2，HEL⇄STO 跨海）：`OFR A2 - Seaside Standard (Viking Line)`、`OFR B-Class / inside (Viking Line)`、`DFR Deck place (Viking Line)`。

> 区分：`OFR`=Overnight Ferry（过夜渡轮），`DFR`=Day Ferry（白班渡轮），两者是不同 QUOS 服务类型，不可混为一条。

---

## 4. 跨国长途大巴（LDC）规则 —— 北欧用 NGS

- 本次长途大巴使用 **`THROUGH COACH (NGS)`**，包名 **`Stockholm - 5 DAYS`**，总价 `6223.4 EUR`，按 **G（团组）** 计价。
- **关键区分**：此处是**北欧（瑞典）本地的大巴供应商 NGS**，而**不是西欧（罗马 IT ROM）的大巴**。
  - 西欧多国（法意瑞）→ `IT ROM`（如 `Warsaw - 9 DAYS` 类命名）。
  - **德奥组合 → `DE BER`**（曾误录 IT ROM，2026-08-21 修正）。
  - **北欧（瑞典）本地 → 用 NGS 大巴**，代码/供应商按 `ldc-mapping.js` 查表。
- THROUGH COACH 的国/城 = **大巴供应商所在地**（不是当天城市）。

---

## 5. 自动路桥费/税费规则

### 5.1 挪威路税（跨入挪威时自动添加）
- `Stockholm - OSLO ROAD TAX 1 DAY` — 30.3 EUR（从瑞典跨入挪威的首个路税，挂 STO 出发段）
- `OSLO ROAD TAX 1 DAY` — 38.3 EUR（奥斯陆本地路税）
- 由 `coach-plan.js` 按当天过夜国家命中 `[NO, CH, AT, DE, HU, CZ, SI, SK, CR]` 强制生成，`quoteKind: 'road-tax'`，**金额/计费单位待操作员实填（price=0）**。

### 5.2 跨海/跨桥费
- **哈当厄尔大桥费**：`Brimnes - HARDANGER BRIDGE (EUR)` — 42.55 EUR（挪威哈当厄尔峡湾跨桥）。
- **厄勒海峡大桥费（跨到哥本哈根）**：`Copenhagen - Oresund bridge fee one-way` — **2376.9 EUR**（大额），该笔费用挂载在 **`KT STD MTC`（当地协作车）** 之下。
  - 说明：这是一笔**一次性跨境大桥费**，金额较大，且录入时挂在本地的 MTC（当地车）服务下，而非挂在 THROUGH COACH。

### 5.3 每日用车杂费 / 德国增值税
- 部分城市段每日用车杂费（`daily-fees.js`）命中则注入 `{城市英文名} - {备注}`，THROUGH COACH (GLS)。
- 德国境内每天另注 `Base - GERMAN VAT`（€90.43/天）。

---

## 6. 酒店录入规则

- 所有酒店统一用 **`HTL`** 服务，**标准包价（Standard）**，按 **P（Person）** 或 **G（Group）** 计价。
- 例：`BW TEN`（442.55 EUR）、`SKYLINE AIRPORT`（414.49 EUR）、`TALLINK SPA`（429.79 EUR）等。

---

## 7. 保险规则

- 统一使用 **`TRAVEL INSURANCE`**，**美元结算（USD）**，按 **P（Person）** 计价。
- 例：`TRAVEL INSURANCE` — 2.66 USD/人（保单费率见 `quote-rates.js` 的 `insurance`）。

---

## 8. 按天明细结构（供参考，勿套日期）

- **Day 1 (300926)**
  - OTH: TRAVEL INSURANCE — 2.66 USD
  - MTC: Stockholm - APT/HTL (KT STD MTC) — 340.33 EUR（接机，G 计价）
  - HTL: BW TEN — 442.55 EUR
- **Day 2 (301026)**
  - OFR: A2 - Seaside Standard (Viking Line) — 10844.7 EUR
  - OFR: 646.55 EUR
  - HTL: SKYLINE AIRPORT — 414.49 EUR
  - DFR: Deck place (Viking Line) — 19.89 EUR
  - OFR: B-Class / inside (Viking Line) — 102.92 EUR
  - HTL: TALLINK SPA — 429.79 EUR
- **后续天数**：依次包含 `KT STD MTC`（本地短途）、`THROUGH COACH (NGS)`（长途）、各大路桥税等。

---

## 9. 给后续操作/AI 的要点（速查）

1. 北欧渡轮 = **Viking Line**，`OFR` 过夜 / `DFR` 白班**分开列**，各带包价。
2. 北欧长途大巴 = **`THROUGH COACH (NGS)`（瑞典本地 NGS）**，包名 `{起始城市英文名} - {N} DAYS`，**不是**西欧 ROM。
3. 跨入挪威自动加 **挪威路税**；过哈当厄尔加 **Hardanger Bridge**；跨到哥本哈根加 **Øresund bridge fee one-way**（挂当地车 `KT STD MTC` 下）。
4. 酒店统一 `HTL` + Standard，P 或 G 计价；保险 `TRAVEL INSURANCE` USD / 人。
5. 首末接送机用当地车 `KT STD MTC`，G 计价，国/城=当天城市。
6. 具体天数金额以实际为准，练习副本数值仅用于理解逻辑。
