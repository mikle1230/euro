# 用车规则（Coach Rules）

> 用户口径，2026-08-19 整理。规则配置在 `src/data/coach-rules.js`（机器可读，改这里即生效）；
> 城市当地 STD MTC 选项在 `src/data/std-mtc-options.js`；本文件是中文说明，供审阅与更新。

## 场景与规则

| # | 场景 | 规则 | 用车选择 |
|---|---|---|---|
| R1 | 首日抵达，**当天无活动**（纯抵达） | 单接机 STD MTC | `{城} - APT/HTL` |
| R1 | 首日抵达，**当天活动少**（约 1-2 小时） | 接机 + 几小时活动，然后送酒店（STD MTC） | `{城} - APT/HTL` + `{城} - X HOURS` |
| R1 | 首日抵达，**当天活动多** | **直接用 LDC，THROUGH COACH 段从 Day 1 起**（不一律 STD MTC） | THROUGH COACH (LDC) |
| R1 | 末日离境，**当天纯送机** | 单送机 STD MTC | `{城} - HTL/APT` |
| R1 | 末日离境，**当天仍有大量活动** | LDC 一路穿到最后一天（THROUGH COACH 覆盖离境日，不换车） | THROUGH COACH (LDC) |
| R2 | **断开后同城停留多天**（落地后无地面跨城移动，下次移动是飞机/火车断开） | **当地车，脱离 LDC** | 每天 `{城} - X HOURS`（当地 STD MTC，不注入 THROUGH COACH） |
| R3 | **断开 ≤ 400km**（上飞机/火车后行进距离 ≤ 阈值） | 两策略可选：<br>a) `local-then-ldc`：断开前城市当地车 + 落地后开始 THROUGH COACH（普通团默认）<br>b) `ldc-continuous`：断开前直接起 THROUGH COACH 跨断开连续（**不换车**，适合高端团/客户指定团） | `breakStrategy` 配置 |
| R4 | **断开 > 400km** | 断开前**起始城市当地车** + 落地城市开始 THROUGH COACH | 强制 |
| F | 连续地面移动（无断开） | THROUGH COACH 段连续覆盖 | 现有逻辑 |

## 参数

- `breakThresholdKm = 400`：断开距离阈值（可改）
- `localMtcHours = '05 HOURS'`：当地车默认小时数（凭经验，多留 buffer；可从城市选项表精确匹配）
- `pickupOnly / dropoffOnly`：单接机/单送机选项

## 更新方式

1. 改 `src/data/coach-rules.js` 参数（阈值/策略/小时数）
2. 城市当地用车选项 → `src/data/std-mtc-options.js` 按城市码补充
3. 规则逻辑变更 → `src/lib/coach-plan.js`（分段引擎），改后跑 `npm test`
