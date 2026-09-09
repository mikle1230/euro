# LDC/QUOS 用车知识纠偏(给 DeepSeek 同步 + euro 待办)

> 日期:2026-09-08 | 基准:euro 项目代码 + KT 官方《LDC Summer 2026 CN ACTIVE》+ Michael 口述
> 用途:① 转发给 DeepSeek 同步;② euro 项目"待集中修改"清单依据

---

## 一、可直接转发 DeepSeek 的纠正文本

以下内容基于 euro 项目代码(ldc-mapping.js / coach-plan.js)、KT 官方《LDC Summer 2026 CN ACTIVE》表及实际操作口径校准,请修正你总结中的相关表述:

### 1. 中欧/德语区供应商锁定(重要修正)

你原文:"中欧/德语区(德国、奥地利、捷克等)选择 DE BER(柏林)Through Coach" ❌

**修正为**:
- **捷克/斯洛伐克/匈牙利**(单国或组合,可含奥地利)= **`CZ PRG` 布拉格车,Through Coach (NGS),€550/天**
- **DE BER 柏林车仅用于两种情况**:
  a. **德国单国**(默认 NGS €630,特殊团 High End/VIP 才切 GLS €800)
  b. **德国+奥地利组合**(必须 DE BER,**绝不能**落入西欧罗马车 IT ROM——曾有实际错误导致成本严重出错)

### 2. 北欧/冰岛供应商(修正)

你原文:"北欧/冰岛区域长途大巴固定使用 SE STO 或冰岛 TEITUR" ❌

**修正为**:
- **SE STO €670/天(Through Coach NGS)** 只用于**挪威南部/瑞典/丹麦三国跨境**(Scandinavia cross-country),不含冰岛
- **冰岛**不在 LDC 表内,单独用本地供应商 **`TEITUR (LDC)`** 打包(如 `Reykjavik - X DAYS`),并另加景区停车费(PARKING FEES ICELAND,按团)与每日司机餐补(DRIVER LUNCH/DINNER ALLOWANCE)

### 3. "西欧一律 IT ROM €650"仅适用于多国(补充限定)

你原文:"西欧区域无论是否包含法国意大利,必须选择 IT ROM(罗马)Through Coach (NGS)€650" ❌

**修正为**:**IT ROM NGS €650 只适用于西欧多国混搭行程**。单国行程各走各的 Mono 价,不能套 650:
- 纯意大利 = IT ROM **GLS €590**(同是罗马,但纯意 Mono 是 GLS 590,与多国 NGS 650 不同)
- 纯法国 = FR PAR GLS €750
- 纯瑞士 = CH ZRH,CHF 880
- 纯葡萄牙 = PT LIS €580 / 纯西班牙 = ES MAD €590(巴塞罗那起止 €630)
- 纯德国 = DE BER NGS €630

### 4. "冰岛 140 欧/天"待确认(存疑)

你第 7 节提到"冰岛 140 欧/天",该数字在 LDC Summer 2026 官方表中**不存在**(表内无冰岛行)。请标注来源或删除,避免误用。

### 5. 补充:北欧单国是独立本币价(你未提及)

- 丹麦单国 = DK CPH,DKK 9200/天
- 瑞典单国 = SE STO,SEK 13300/天
- 挪威单国 = NO OSL NOK 12900(南)/ NO ALT NOK 13100(北)
- 芬兰单国 = FI HEL €784(南)/ FI ROV €822(北,北极拉普兰)

---

## 二、对 euro 项目代码的影响评估(待集中修改,现在不动手)

### 🟡 可能需改代码的点

1. **冰岛行程的 LDC 供应商**:euro 的 `ldc-mapping.js` **KNOWN_COUNTRY_CODES 无 IS(冰岛)**,MONO_MAP 也无 IS → 纯冰岛行程 `resolveLdcSupplier` 返回 null → 不注入 THROUGH COACH/ER/PREPOST。而实际业务冰岛用 **TEITUR (LDC)** 打包 + 停车费 + 司机餐补。
   - 影响:euro 需支持冰岛团报价 → 集中修改时在 ldc-mapping 加 IS→TEITUR 处理(或单独分支)。**✅ Michael 已确认(2026-09-08):冰岛是重要目的地,必须支持**。
2. **意大利用车":纯意 Mono = GLS €590 vs 西欧多国 = NGS €650"**:代码已正确区分(italyMono GLS 590 / westernEurope NGS 650),无需改。仅作知识确认。
3. **中欧 CZ PRG / DE BER 判定**:代码已正确(centralEurope→CZ PRG;DE+AT→germanyNgs DE BER),无需改。DeepSeek 说法错误,但 euro 代码本身没这 bug。
4. **ER 阶梯尾部**(germanyGls 1000+ / franceMono 1500+ / italyMono 1200+):代码有注释"待确认",集中改时可顺带核对 LDC 新表。
5. **波兰 PL WAW 费率 null**:官方表无波兰行,集中改时若需支持波兰团再定价。

### 结论
- 真正可能动代码的 = **冰岛 IS 支持**(待确认需求) + ER 尾部核对(等新表)。
- 其余为知识/文档级纠偏,不影响现有代码逻辑。

> 处理原则(2026-09-08):**现在不动手**,等 Michael 说"集中修改"时,从本文件 + euro 项目 docs/rules-log.md 提出,逐条过。
