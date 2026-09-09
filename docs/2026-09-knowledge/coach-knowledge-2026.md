# Euro 用车知识问答手册(Coach Knowledge)

> 用途:Michael 直接问用车知识,T 直接答。本手册为 euro 项目用车规则的**重建理解汇总**,依据:
> - `src/lib/coach-plan.js`(678 行分段引擎,报价规则注入)
> - `src/lib/ldc-mapping.js`(LDC 供应商判定 + ER_RULES)
> - `src/lib/quote-rates.js`(固定费率)
> - `src/data/coach-rules.js`、`std-mtc-options.js`、`daily-fees.js`
> - `docs/coach-rules.md`、`docs/rules-log.md`、`CLAUDE.md` 用车规则段
> - KT 官方《LDC Summer 2026 CN ACTIVE》表(见 ldc-rates-summer-2026.md)
> 2026-09-08 通读重建。

---

## 一、术语与报价项(quoteKind)

| quoteKind | 中文 | 说明 | quoteOrder |
|---|---|---|---|
| insurance | 旅行保险 | 每团必录,2.66 USD/人 × 客人数(不含领队,40+1 取 40) | 0 |
| pickup | 接机 | 当地 STD MTC `{城} - APT/HTL`(火车→HTL-STA,船→HTL-PIER) | 10 |
| dropoff | 送机 | 纯送机 `{城} - HTL/APT`;有半天活动 `{城} - APT - X HOURS` | 11 |
| local-mtc | 当地用车 | R2/R3a/R4,脱离 LDC,`{城} - X HOURS` 默认 05 HOURS | 12 |
| through-coach | LDC 长途车 | `THROUGH COACH (NGS/GLS)`,国/城=**供应商所在地**,名称=`{起始城} - N DAYS` | 20 |
| daily-fee | 每日杂费 | 停车/许可,仅表内城市当天注入 | 21 |
| road-tax | LDC 路税 | 按过夜国家强制生成,price=0 实填 | 21 |
| empty-run | 空驶 | `MTC EMPTY RUN`,公里=段首→段尾真实车程,ER 计价 | 22 |
| prepost | 司机前后夜 | 有 THROUGH COACH 才有,金额不显示 | 25 |

---

## 二、LDC 供应商判定(resolveLdcSupplier)

输入:地面行程(第一次飞机落地 → 最后返程航班前一天)涉及的国家集合。
**出发/返程地(中国城市)不参与判定。**

### 单国(按国家 → 供应商)
| 国家 | key | 日费率(夏) | 备注 |
|---|---|---|---|
| IT(纯意大利) | italyMono | €590 | GLS,IT ROM,350km/天 |
| IT(西西里岛内) | sicilyMono | €640 | IT PMO,300km/天,≥3 live days 无 ER |
| FR(纯法国) | franceMono | €750 | FR PAR,GLS |
| DE(德国默认) | germanyNgs | €630 | DE BER,**默认 NGS**;特殊团才 GLS €800 |
| CH | switzerlandMono | CHF 880 | CH ZRH,250km/天 |
| ES | iberia | €590 | ES MAD;BCN-BCN 例外 €630(未单独编码) |
| PT | portugalMono | €580 | PT LIS |
| GB | uk | £720 | GB LON;lon-lon £700 例外未拆 |
| IE | irelandMono | €700 | IE DUB |
| NL/BE/LU | benelux | €740 | NL AMS |
| CZ/HU/SK/AT | centralEurope | €550 | CZ PRG(可含奥地利) |
| PL | polandMono | **null** | PL WAW,费率待补,官方表无波兰行 |
| SE | swedenMono | SEK 13300 | 330km/天 |
| DK | denmarkMono | DKK 9200 | 330km/天 |
| NO(非北极) | norwaySouthMono | NOK 12900 | NO OSL;北极→norwayNorthMono NOK 13100 (NO ALT) |
| FI(非北极) | finlandSouthMono | €784 | FI HEL;北极→finlandNorthMono €822 (FI ROV),NGS 版 ON REQUEST |
| EE/LT/LV | balticMono | €550 | LT VNO |

### 多国(明确规则优先,其余西欧统一 IT ROM)
1. **含 PL** → polandMono(华沙调车)
2. 全为 EE/LT/LV → balticMono
3. 全为 NL/BE/LU → benelux
4. 全为 HU/CZ/SK/AT → centralEurope
5. **DE+AT 组合 → germanyNgs(DE BER)!**(绝不能落西欧 IT ROM——KT 曾误录罗马车致财务严重出错,2026-08-21 校准)
6. 全为 NO/SE/DK → scandinavia(€670,SE STO NGS)
7. 全为 GB/IE → uk
8. 全为 ES/PT → iberia
9. 全在西欧组 [FR,IT,DE,CH,NL,BE,LU,AT,ES,PT] → westernEurope(€650,IT ROM NGS)
10. 表外国家 → null(不注入 LDC 项)

### 北极判定
城市名含 特罗姆瑟/阿尔塔/北角/罗瓦涅米/伊瓦洛/列维 等(ARCTIC_CITY_KEYS)→ NO/FI 走"北"。

---

## 三、EMPTY RUN(ER_RULES)三种计价

| type | 区域 | 规则 |
|---|---|---|
| **tiers 金额阶梯** | 西欧/德国NGS/中欧 | 0-350 免;351-600=€450;601-1000=€800;1001-1400=€1000;1401-1999=€1500 |
| **count 次数** | 荷比卢/德国GLS/法国/意/伊比利亚/UK/爱/斯堪/丹/瑞/挪/芬北/波罗的海 | 按公里给 ER 次数(1ER/1.5ER/2ER…),**unit=null 只显示"ER ×N"不计价** |
| **perKm** | 芬兰南 | ≤150km 无;151km+ 按 €1.9/km |
| **none** | 葡萄牙(境内无)/西西里(≥3 live days 无)/瑞士(GVA-GVA/ZRH-ZRH 无) | 无 ER 费 |

各区域 **maxKmPerDay** 与 **excessPerKm**(超公里单价):意 350km/€1.8、法 350/1.5、伊比利亚 350/1.6、荷比卢 350/1.4、德国 375/2、西欧 375/2、中欧 375/2、瑞 250/CHF1.5、葡 350/1.6、爱 250/£1.3、UK 350/£1.5、波罗的海 300/1.2、斯堪 370/1.6、丹 330/DKK20、瑞 330/SEK14、挪 300/NOK20-28、芬 350/1.9、西西里 300/1.8。

ER 公里数:先 `estimateRoadKmFallback`(直线×1.3)同步注入 → route.js 再调 `patchEmptyRunRoadKm` 用 **OSRM 真实驾驶距离**覆盖并重算价格。

---

## 四、分段规则(核心逻辑,coach-plan.js)

### 断段只发生在「跨城交通」处
- **抵达**:航班/火车/船到过夜城市,且过夜城市相对前一天变化
- **返程**:航班终点是中国(罗马→上海)
- 火车/船/一日游(少女峰→因特拉肯同城返程)不断段

### 首日抵达(2026-08-29 口径,成本性价比)
| 当天情况 | 方案 |
|---|---|
| 无活动(纯抵达) | 当地 STD MTC 接机 `{城} - APT/HTL` |
| 活动少(1-2h) | 接机 + `{城} - X HOURS` |
| **活动多(≥4h 待确认)** | **直接用 LDC,THROUGH COACH 从 Day1 起** |
| 首个地面日单晚换城 | 当地接机,段从 Day2 起 |

### 离境日
- 当天**有行程内容**(白天游览)→ THROUGH COACH 覆盖到返程当天(不单独送机)
- **纯送机**(只有早餐)→ 断段,单独 `{城} - HTL/APT`

### R2/R3/R4 断开
- 断开 = 飞机/火车;距离 = 上机前后行进 km
- **R2 落地同城段**:断开落地后同城停留多天、无地面跨城移动 → **当地车**(每天 `{城} - X HOURS`),脱离 LDC,无 THROUGH COACH/ER/PREPOST
- **R3 断开 ≤400km**(breakThresholdKm):默认 `local-then-ldc`(落地后开 LDC 段);高端团可 `ldc-continuous`(不换车跨断开)
- **R4 断开 >400km**:断开前当地车(当天还在原城 → `{城} - APT - X HOURS`)+ 落地后开 LDC 段

### 每 LDC 段注入
段首天:THROUGH COACH + EMPTY RUN + PRE/POST NIGHT;段内每天:命中 DAILY_FEES 注入杂费、德国过夜日注 GERMAN VAT €90.43/天、过夜国家命中路税表强制生成 road-tax。

**DAILY_FEES 表**(仅 3 城):克鲁姆洛夫 €98.49(PARKING BUS STOP)、哈尔施塔特 €117.29(DAY PARKING)、萨尔茨堡 €95.74(PARKING PERMIT)。

**路税国家映射**(price=0 实填):NO/DE/CH→`LDC路税`;AT→`Austria ROAD TAX PAID BY DRIVER`;HU→`Budapest - HUGO ROAD TOLL`;CZ→`Prague - CZ ROAD TAX`;SI→`Ljubljana - ROAD TAX`;SK→`Bratislava - ROAD TAX PER DAY`;CR→`Zagreb - Croatian Road Tax`。

---

## 五、固定费率(quote-rates.js)
- 保险:2.66 USD/人(客人数,领队不计)
- prepostNight 兜底:€120(实际按 LDC 区域:西欧120/荷比卢135/英国£110/北欧€148/瑞CHF130…在 ldc-mapping 各条目 prepost 字段)
- GERMAN VAT:€90.43/天(Base - GERMAN VAT)
- 城市当地 MTC 选项表:目前**只有罗马 36 项**(std-mtc-options.js);其他城市按 KT 系统补充

---

## 六、已知缺口/待确认(改代码时注意)
1. 波兰 PL WAW 费率 null(官方表无)
2. count 型 ER 无单价 → 不计价只显示次数
3. BCN-BCN €630、UK lon-lon £700 例外未拆
4. 阶梯尾部:germanyGls 1000+、franceMono 1500+、italyMono 1200+ 待确认
5. 瑞士固定 ER(ZRH-SM 450 CHF 等)未入 ER_RULES
6. "活动多 vs 少"阈值 ≥4h **待 Michael 确认**
7. LDC 表本身版本待更新(Tony 去要新表)

---

## 七、冰岛特殊(2026-09-07 追加)
Hornafjörður 收费公路 2026-09-01 生效(Höfn 附近 Route 1,12km 捷径,绕 3 座单车道桥):
- ≤19 座 2350 ISK / 20-69 座 5000 ISK(含 11% VAT),摄像头自动计费直接向运营商收
- 系统代码 IS-REK-Parking Fee
- 默认走新路;预算受限须注明不走 + 与车队确认走老路(防自动计费)

---

## 八、DeepSeek 版总结对照(2026-09-08,参考第二意见)

> DeepSeek 文档存档:deepseek-quos-knowledge-20260908.md。对照基准:**Michael 口述 + LDC 官方表 + euro 代码**。

### ✅ 一致(可放心用)
- 接送机当地 STD MTC / 跨城 Through Coach 双源规则
- 西欧多国混搭 → IT ROM NGS €650(仅**多国**成立)
- 德国每天 GERMAN VAT €90.43
- 路税按过夜国家(AT/HU/CZ/SI/SK/CR/NO/CH/DE)
- 服务类型码表(HTL/MTC/GUI/RST/ENT/FLT/DFR/OFR…)、P/G 标志、Free Pax/Go-Ahead/NET 术语
- 打包命名 `{起始城} - N DAYS`
- 北欧渡轮/大桥(VIKING LINE、厄勒海峡等)→ context.md

### ⚠️ 纠偏(DeepSeek 不准,以 euro 代码为准)
1. **中欧≠DE BER**:DeepSeek 写"德国、奥地利、**捷克等** → DE BER €630-800"❌。实际:CZ/HU/SK/AT(不含德)= **CZ PRG €550**(centralEurope);DE BER 只用于**德国单国**和 **DE+AT 组合**(2026-08-21 校准,德奥绝不能落 IT ROM)。**捷克/斯洛伐克/匈牙利单国或组合 = CZ PRG,不是柏林车。**
2. **冰岛≠SE STO**:冰岛行程用本地 **TEITUR (LDC)** 打包;SE STO €670 仅限挪/瑞/丹**跨国**(南挪威/瑞典/丹麦 cross-country)。冰岛不在 LDC 表,不套 IT ROM/SE STO。
3. **"西欧一律 IT ROM"仅限多国**:纯法国=FR PAR €750、纯意大利=IT ROM **GLS €590**(注意:西欧多国 IT ROM 是 NGS €650,纯意是 GLS €590,同城不同价)、纯瑞 CH ZRH、纯德 NGS €630。单国行程不能套 650。
4. **"冰岛 140 欧/天"存疑**:LDC Summer 2026 表无冰岛;此数来源不明,待确认(疑为 TEITUR 或其他口径),勿直接用。

### ➕ 采纳补充(代码手册没有,来自 DeepSeek + 冰岛档案)
- 冰岛每天 DRIVER LUNCH/DINNER ALLOWANCE 司机餐补;景区 PARKING FEES ICELAND 按团(G)计
- 冰岛常用酒店参考码:FOSSHOTEL NUPAR / STRACTA / COURTYARD REYKJAVIK / GRANDI / BORGARNES / HOF
- 冰岛地区代称映射:西部小镇=Borgarnes;南部小镇=Hella/Hvolsvöllur/Vík/Kirkjubæjarklaustur;冰河湖附近=Hof/Höfn
- 网格标志位:E=预估 / D=旺季 / C=切位 / M=必选 / P=预控 / S=半灵活
- 实操样例:冰岛单国 10 日 = TEITUR 打包 Reykjavik-X DAYS + 每日景区停车费 + 司机餐补;转北欧段再切当地车
