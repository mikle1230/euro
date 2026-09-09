# Euro Atlas — 规则记账本（Rules Log）

> 用途：记录 Michael 逐步口述的业务规则（用车/报价/价格等），每条从「口述 → 文档化 → 实现 → 测试」流转。
> 权威开发规则见 `CLAUDE.md`；本文件是「规则流入管道」，Michael 口述的新规则先记在这里，确认后同步进 CLAUDE.md / 代码。
> 状态图例：🟡待确认 / ✅已确认 / 🛠️已实现 / 💰待定价

---

## 2026-08-29 — 接机/送机用车规则（统一逻辑）

**来源**：Michael 口述（2026-08-29 15:43，15:46 确认「以口述为准，逐步修改进化」）
**状态**：✅已确认（已同步 CLAUDE.md + docs/coach-rules.md；代码实现待跟进）
**涉及模块**：`coach-plan.js`（分段引擎）、`docs/coach-rules.md`、`CLAUDE.md` 用车规则段
**核心原则**：**成本性价比**——活动量决定用车档次，避免"为省事用贵车"或"为省钱频繁换车"。

### 接机日（首日抵达）

| 当天情况 | 用车方案 |
|---|---|
| 无活动（纯抵达） | 单独 STD MTC 接机：`{城} - APT/HTL` |
| 活动少（约 1-2 小时） | 接机 + 几小时活动（STD MTC），然后送酒店：`{城} - APT/HTL` + `{城} - X HOURS` |
| 活动多 | **直接用 LDC 长途车，从第一天开始**（THROUGH COACH 段从 Day 1 起） |

### 送机日（离境日）

| 当天情况 | 用车方案 |
|---|---|
| 前面活动已由 LDC 完成，当天纯送机 | 断段：THROUGH COACH 止于前一天，单独 STD MTC 送机 `{城} - HTL/APT` |
| 当天仍有大量活动 | **LDC 一路穿到最后一天**（THROUGH COACH 覆盖离境日，不换车） |

### 待量化细节（🟡）

1. 「活动多 vs 活动少」的量化标准？—— 建议：按当天活动总时长（如 ≥4 小时算"多"，<4 小时算"少"），或按活动数量；需 Michael 确认
2. 接机当天活动多、直接用 LDC 时：接机本身由 LDC 完成（THROUGH COACH 首日含接机），还是仍需 STD MTC 接机 + LDC 从当天稍后开始？需确认
3. 与现有 R1-R4 规则（400km 阈值、同城多天脱离 LDC）的交互：新规则是否优先于 R2 的"同城停留多天脱离 LDC"？需确认

### 与现有文档的冲突

- CLAUDE.md「抵达日分两种」：现写"首个地面日抵达 → 一律 STD MTC 接机、段从第 2 天起"——**与本次口述冲突**（活动多时应第一天直接 LDC），待确认后修正
- CLAUDE.md「送机 MTC」（2026-08-21 版）：与本次口述一致（有活动 → LDC 覆盖；纯送机 → 单独注入）✅

---

---

## 2026-09-07 — 冰岛 Hornafjörður 收费公路(运营知识更新)

**来源**:Melissa Yung(冰岛采购运营经理)邮件,2026-09-07 转发 Michael
**状态**:🟡待确认(是否入库影响路线/报价逻辑)
**涉及**:冰岛 1 号公路 Höfn 段行程、coach 路线默认值

### 事实
- 新收费路 2026-09-01 生效:Hornafjörður ring road toll,Route 1 上 Höfn 附近 12 km 捷径,跨 Hornafjarðarfljót 堤道/桥
- 绕过 3 座单车道老桥,省时省油
- 收费(每车每次,含 11% VAT):≤19 座 2,350 ISK;20-69 座 5,000 ISK
- 无收费站,摄像头拍车牌自动计费 → **直接向合作 coach 运营商收取**(开上新路即收费,与预订/报价无关)
- 内部系统代码:IS-REK-Parking Fee(2026-09-02 系统可见)
- 老路:冬季服务(除雪/撒沙)优先级预计转移至新路,可能减弱;含多座老旧单车道桥

### 操作规则(建议)
1. 默认:coach 行程走**新收费路**(效率/安全/油费综合更优)
2. 若团队预算不允许:OP 必须在行程单**注明不走新路** + 与车队**确认实际走老路**(防自动计费),同时评估老路冬季服务风险

---

---

## 2026-09-08 — LDC/用车知识纠偏核对(🟡待集中修改,暂不动代码)

**来源**:Michael 提供 DeepSeek 版 QUOS 知识总结;T 以 euro 代码 + LDC Summer 2026 官方表 + Michael 口述逐条对照(euro 代码本身无此 bug,仅为知识校准;完整记录见 workspace references/euro/ldc-corrections-to-deepseek-20260908.md)
**状态**:✅ 需求已确认 | **🛠️ 已实现(2026-09-09 A1:冰岛 IS→TEITUR 分支入 ldc-mapping.js)**;其余(ER 阶梯尾部等)仍待 LDC 新表核对

### 校准结论(对 euro 代码的影响)
1. **中欧 ≠ DE BER**:CZ/HU/SK(含 AT)= CZ PRG €550;DE BER 仅德国单国与 DE+AT 组合。euro 代码已正确(centralEurope→CZ PRG;DE+AT→germanyNgs),**无需改**。
2. **纯意 Mono = GLS €590 vs 西欧多国 NGS €650**:代码已正确区分(italyMono GLS / westernEurope NGS),**无需改**。
3. **冰岛 = TEITUR (LDC) 本地打包,非 SE STO**:euro `ldc-mapping.js` 原 KNOWN_COUNTRY_CODES/MONO_MAP 无 IS → 纯冰岛团 resolveLdcSupplier=null、不注入 LDC 项。**🛠️ 2026-09-09 A1 已实现**:KNOWN_COUNTRY_CODES 加 IS、MONO_MAP IS→icelandMono、SUPPLIERS.icelandMono = TEITUR (LDC)(IS REK,vehicleType LDC,dailyRate=null 参考价入 note、prepost=null)、ER_RULES.icelandMono=none(A3 校准前不计价)。
4. 冰岛 140€/天:官方表无,来源存疑,勿用。
5. ER 阶梯尾部(germanyGls 1000+/franceMono 1500+/italyMono 1200+)与波兰 PL WAW null:等 LDC 新表核对。

**结论**:真正可能动代码 = 冰岛 IS 支持(待需求确认)+ ER 尾部核对(等新表);其余为知识级校准。

---

---

## 2026-09-08 — LDC ER(空驶)选择规则(🟡待集中修改,暂不动代码)

**来源**:Michael 口述 2026-09-08,已确认 ✅
**状态**:✅已确认 | 🛠️ 待集中修改(改 ER 逻辑时按此校准;现不动代码)
**影响模块**:coach-plan.js makeEmptyRun / ldc-mapping.js ER_RULES / route.js patchEmptyRunRoadKm

### 规则
1. LDC 算 ER **原则上用段起止城市**(起=车开始接团城市,止=车最终送/结束城市)。
2. 下拉有该起止城市 → 直接选(北欧较全,西欧少有)。
3. 下拉没有 → 查实际车程公里 → 选**能涵盖该公里的最低档**(580km→200-600 档;700km→601-1150 档)。
4. 北欧档:200-600=1天/601-1150=2天/1151-1900=3天/1901+=4天。
5. ER 是**系统预设服务项(自带价)**,非 km×单价现算。

### 与现有实现的差异(集中修改时处理)
- 现在:euro 用 OSRM 查 from→to 真实车程 → ER_RULES 按公里算金额/次数(count 型 unit=null 只显示次数不计价)。
- 实际 KT:在供应商服务下拉选**预设 ER 项**(具体线路 or 公里档),每项自带价格。
- 校准方向:ER 输出应对齐系统预设项(线路名/档位/价格),而非自算单价。北欧下拉清单已存 euro-knowledge #11(SE STO NGS 全表)。

---

---

## 2026-09-08 — fx.js 汇率插件缺冰岛克朗 ISK(🟡待集中修改)

**发现**:Michael(2026-09-08):euro 汇率兑换插件没有冰岛货币。
**核实**:`src/lib/fx.js` 货币下拉缺 **ISK**;`src/data/countries.js` 的 IS 配置正确(ISK 冰岛克朗 kr)——只需往 fx.js 下拉补 ISK 项即可。
**冰岛货币**:冰岛克朗 Icelandic Króna,代码 ISK,符号 kr(与 DKK/SEK/NOK 同显 kr,注意区分)。
**涉及**:src/lib/fx.js(currency 下拉数组)。
**状态**:🛠️ 已实现(2026-09-09 A2:fx.js CURRENCIES 已补 ISK,条目 `{ code: 'ISK', label: '冰岛克朗 ISK' }`,置于 DKK 后北欧组;名称区分 kr 符号;countries.js 的 IS 配置原本正确无需动)。

---

---

## 2026-09-08 — 北欧/冰岛竞标参考酒店清单(🟡待集中更新酒店库)

**来源**:Michael 提供客户竞标材料截图 10 张(北欧四国+冰岛+荷比卢产品参考酒店列),2026-09-08。
**状态**:🛠️ **已实现(2026-09-09 B1 Iceland 批)**——冰岛 7 城 51 家已入 `hotel-recommendations.js`(雷克雅未克 27/凯夫拉维克 5/霍芬含冰河湖-斯卡夫塔方向 7/霍尔斯沃德吕尔 2/教堂镇 3/博尔加内斯 5/塞尔福斯 2);🛠️ **已实现(2026-09-09 B1 Stockholm 批)**——斯德哥尔摩大区 72 家(市区+北郊 Kista/Solna/Upplands Väsby/Arlanda+南郊);🛠️ **已实现(2026-09-09 B1 Oslo 批)**——奥斯陆 52 家 + 加勒穆恩(奥斯陆机场)10 家 = 62 家;🛠️ **已实现(2026-09-09 B1 Copenhagen 批)**——哥本哈根 46 家(市区/凯斯楚普机场区/西郊等);调研产物+QA 纠错分别存档 `scripts/data/hotel-research-2026-09-iceland|stockholm|oslo|copenhagen/`;其余城市(赫尔辛基/卑尔根/哥德堡/塔林/Malmö 等)留待后续分批。
**完整清单**:workspace references/euro/nordic-bid-hotels-2026-09.md
**涉及**:src/data/hotel-recommendations.js(入库)、scripts/data/hotel-research-2026-09-*/ (调研存档)

### 摘要
- 提取 87 条(去重约 70 家),euro 库疑似已有 46、**缺失/未匹配 41 家**。
- 缺失重点:**冰岛 17 家**(Midgardur/Konvin/Grow/Bifrost/Vesturland/Varmaland/Kanslarinn/Kria/Burfell/Volcano/Stracta×2/Arnanes/Smyrlabjorg/Fosshotel Glacier Lagoon/Fosshotel Vatnajokull/Leirubakki)→ 冰岛是重点目的地,优先补。
- 其余缺失:斯德哥尔摩 3、赫尔辛基 3、奥斯陆 3、哥德堡 6、丹麦 Comwell 3、塔林 Ilmarine、荷比卢若干。
- ⚠️ 转录自截图,个别名称/评分有 OCR 误差(Park Hotel Vossevangen 曾显 6.3/8.3),更新前以原始材料复核。

---

---

## 2026-09-08 — KT 模板团选项库 BJSLH30004(🟡待统一修改参考)

**来源**:Michael 同事模板团截图 7 张(Model,15客,2026-08-26~09-14),2026-09-08。
**状态**:🟡存档备用(等统一修改 euro 时调用)
**完整梳理**:workspace references/euro/template-tour-BJSLH30004-2026-09.md
**价值**:KT 系统真实服务名/供应商/价格币种/计价(P/G)——比 LDC 表更贴近实操。含:各城当地 MTC 接送价、SE STO LDC ER 820EUR、挪威 GLS ER(200-500 档≠斯堪 200-600)、桥费(Hardanger 42.5/Øresund 244.88-340.43/Storebælt 145.74)、Tallink/DFDS 轮渡舱型档、**冰岛 TEITUR 打包价(3天54222/4天72297 ISK)+ 各景点停车费精确价 + 活动供应商**(ELDING 观鲸/BLUE LAGOON/ICELANDIA 冰川/ARCTIC ADVENTURES/JÖKULSÁRLÓN 水陆船)、大量酒店候选、手动价项(manual GRP/PP)。
**注意**:保险 2.66 USD/人 P 挂 CN;币种按国家(ISK/SEK/DKK/NOK/EUR)。

---

---

## 2026-09-09 — 冰岛北部阿克雷里 SBA 供应商(🟡知识入库,邮轮业务)

**来源**:Melissa Yung(Iceland)→ 2026-09-08,Michael 转。
**状态**:🟡存档(边界已写入 `ldc-mapping.js` icelandMono 条目注释+note;A1 已落地 IS→TEITUR 分支,**SBA 未编码**——等真实邮轮/阿克雷里起止团型出现再扩展,euro 行程模型暂无「邮轮业务」字段)
**要点**:
- 新供应商 **SBA Nordurleid**(ID **CPHMTC2192**):仅阿克雷里(Akureyri)起止、**邮轮业务**;含车+导游(不可单独订)+司机兼导游(≤19座);价期 2027-05-01~09-30;邮轮价>普通价。
- **边界**:雷克雅未克起止的 LT/LDC 大巴仍 = **TEITUR**,非 SBA。
- euro 冰岛支持(IS→TEITUR 分支)扩展时:阿克雷里邮轮业务 → SBA;勿把 SBA 用于雷克雅未克段。

---

---

## 2026-09-09 — 卢塞恩冬季产品与酒店(KT China EDM,🟡待补目的地库)

**来源**:KT China 卢塞恩冬季 2026/27 营销邮件(2026-09-08);询价联系 Yali Hong。
**状态**:🟡待集中更新(euro 酒店库/目的地知识)
**酒店 5 家**(Lucerne LUZ):Schweizerhof 5*(已有同名,需核对门店)、Radisson Blu 5*(同名核对)、**Waldstätterhof 4*Sup(缺)**、AVA 4*(同名核对)、**Kreuz by b_smart 3*(缺)**。
**冬季活动产品**:LILU 灯光节(2027.1.14-24)、狂欢节(2027.2.4-9)、Stoos 滑雪初体验/雪鞋徒步+雪橇、Glasi Hergiswil 玻璃厂、Lindt 巧克力工坊、购物。完整存档 workspace euro-knowledge #21。
**报价价值**:客户询瑞士冬季团直接套产品包+酒店清单。
