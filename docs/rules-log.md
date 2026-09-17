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

---

## 2026-09-10 — 城市码补录 + OSM 酒店补库 + 去重(🛠️ 已实现)

**来源**:Michael 从 KT 系统查到冰岛码
**状态**:🛠️ 已实现

### 城市码(重要更正)
- **Hella(冰岛)= HLL**(注:quos-cities 里 "Hella" 原为挪威 HLN,故冰岛用区分名 **"Hella (Iceland)"**)
- **Vík í Mýrdal(冰岛)= VKK**(原 "Vik" 为挪威 VII,冰岛用 **"Vik i Myrdal"**)
- **Höfn = HFN**(原有,正确)
- **更正**:冰岛**没有** Hof 这个城市(我此前备注有误)——`Hof` 是**德国**的(HOF/DE),冰岛只有 Höfn。
- 已补:`quos-cities.json`(Hella (Iceland)/Vik i Myrdal + 中文键 海拉/维克)、`curated-cities.cjs`、`europe-travel.json`(冰岛城市新增 海拉/维克)

### 酒店补库(OSM 免费路线,替代 AI 研究)
- 新增 12 城 437 家(赫尔辛基/卑尔根/哥德堡/塔林/马尔默/延雪平/林雪平/Voss/Ulvik/Flåm/夏洛滕贝里/卡尔斯塔德)+ 卢塞恩追加
- 冰岛 Hella 2 家、Vík í Mýrdal 3 家
- 工具:`scripts/fetch-hotels-osm.py`(抓取)、`scripts/merge-osm-hotels-2026-09.py`

### 去重(两个维度都归零)
- 库内重复 10 组 → 0(`scripts/dedupe-hotels-2026-09.py`)
- 与 KT 报价库重叠 6 条 → 0(保留 KT 报价侧;`scripts/remove-kt-overlaps-2026-09.py`)

---

## 2026-09-17 — 固定金额型 ER 落码(A-4 + A-5 例外)(🛠️ 已实现)

**来源**：Michael 口径；唯一权威 = `references/euro/ldc-region-er-determination-2026-09.md` §2（LDC Summer 2026 CN ACTIVE 表）+ 待办 A-4 / A-5。
**状态**：🛠️ 已实现（`ldc-mapping.js` / `coach-plan.js`，`npm test` 84/84）

### 新形态 `ER_RULES[key].fixed`
- `{ from, to, price, currency, note }`：城市对固定价，**QUOS 城市码**，双向各写一条（`fixedBoth` 展开）。
- `{ liveDays, price, currency, note }`：按段内 live days 命中（西西里：2 live days → 1 empty）。
- 命中优先级：**固定项 → 区域原有算法**（阶梯/次数/按公里）；缺城市码/天数或未命中 → 行为与加固定对之前**完全一致**。
- `erPrice(ldc, km, ctx)` 新增 `ctx = { fromCode, toCode, liveDays }`；`makeEmptyRun` 用 `getCityCode` 解析段起止城市码并写入 `erFromCode/erToCode/erLiveDays`（OSRM 重算时复用）；返回增加 `currency`（固定项币种 → `item.currency`）。

### 本次入库的固定项
| 区域 | 城市对（双向） | 金额 | 币种 |
|---|---|---|---|
| switzerlandMono | ZRH-SMR / GVA-TAC / GVA-ZRH / ZRH-TAC / SMR-TAC / GVA-LUZ | 450 | CHF |
| scandinavia | CPH-OSL / CPH-STO / CPH-BGO（厄勒大桥特殊线路 ER 已含） | 770 | EUR |
| finlandNorthMono（Lapland） | RVN-ALF 900 / RVN-TOS 1000 / KRN-KRN 1000 | 900 / 1000 | EUR |
| benelux | PAR-AMS 550 / PAR-BRU 450 | 550 / 450 | EUR |
| iberia（例外） | BCN-BCN | 630 | EUR |
| uk（例外） | LON-LON | 700 | GBP |
| sicilyMono（live days 触发，非城市对） | 2 live days → 1 empty | 450 | EUR |

### 未做 / 待裁决（详见本条目报告）
- 瑞士固定清单里的 `INT/LRR/GRW-TAC`：表内斜杠写法，**未确认是 3 对** → 未编码。
- 瑞士 `GVA-SMR`、`ZRH/GVA-MIL` = 1 ER（次数型，单价表内未给）→ 按设计不计价。
- Lapland 固定对与西西里 450 目前**端到端不可达**：`resolveLdcSupplier` 对 `FI+NO`/`FI+SE` 返回 null（无供应商）、且西西里岛内判定（IT PMO）尚未实现 → 只在数据层就位。
- Benelux PAR-AMS/PAR-BRU 挂在 `benelux` key 下（照抄表），但 Paris 属 FR → 实际场景判给 `westernEurope`，该对是否改挂 westernEurope 待裁决。

---

## 2026-09-17 — 地图真实里程 + 天序号（刀1/刀2）

**状态**：🛠️ 已实现（`npm test` 105/105，`npm run build` 通过）
**来源**：Michael 口径 —— 地图上的公里数一直是「直线 × 1.35」估算，要换成真实驾驶距离；路线要按天分段着色、城市点带天序号。
**范围**：只做刀1（真实里程）+ 刀2（天序号徽章 + 线按天着色）；抽屉/详情面板（刀3/刀4）、酒店级坐标、渡轮段、QUOS 条目逻辑一律不碰。

### 改了哪些文件
| 文件 | 改动 |
|---|---|
| `src/lib/route-plan.js`（新） | 路线计划：`buildRoutePlan(points)` → OSRM 真实 km/时长 + 逐段几何；纯函数（去重、天→leg 映射、step 几何拼接、DP 抽稀、标签格式化）+ 可注入 `fetchImpl` 的 fetch 封装；按点集签名缓存（成功才缓存，失败下次重试），>30 点按 29 点重叠分片 |
| `src/components/map-core.jsx` | 用真实几何画线（按 leg 分色）+ 保留金色流动虚线；段标签改 `446 km · 6h36`（estimate 加 `~` 且不显示时长）；OSRM 失败回退直线；`DAY_COLORS_LIGHT/DARK` 按天配色 |
| `src/app/explore/page.js` | `routeLine` → `routePoints`（`{ key, lat, lng, dayNumber }`）；天序号徽章分隔符 `D3,D7` → `D3/D7` |
| `scripts/tests/route-plan.test.mjs`（新） | 17 个纯函数测试（去重 / 天→leg / 几何换序拼接 / 抽稀 / 失败兜底 / 分片 / 缓存 / 标签），OSRM 全部 mock，不联网 |
| `docs/architecture.md` | 补 `route-plan.js` 说明 + 地图绘制口径 |

### 为什么这么做
- **口径分离**：`road-distance.js`（空驶计价：直线 × 1.3、吸附 5km 倍数）保持原样不动；地图显示走新模块，**不套任何系数、不吸附**，数字只来自 OSRM 返回。
- **失败是常态**：公共 `router.project-osrm.org` 是演示服务器（实测 12 点请求 5–15s、1.7MB）。兜底路径 = `estimate`（直线 × 1.35、无几何、标签带 `~`），画线回退到原来的点对点直线，**不白屏、不显示假数字**。
- **几何抽稀**：`overview=full` 整条几何 57524 点（2898KB），`overview=simplified` 只有 62 点（1721KB），而 **step 几何两种口径点数完全相同**（逐段几何只能靠 step 拼接）；故取 simplified 白拿体积，渲染前再 Douglas-Peucker(0.35km) + 400 点/段硬上限 —— 实测同一条 12 点 / 3962km 路线：58032 点 → **949 点**（单段最多 328），视觉无损（容差 ≈ zoom 10 下 2px）。
- **缓存不进 localStorage**：点集签名（去重坐标 FNV-1a）+ 模块内 LRU 12 条，不动 `euro-itineraries` 结构，旧数据零影响。

### 遗留 / 风险
- 公共 OSRM 有限速，长行程（>30 天）会分 2+ 次请求；失败时整条路线降级为 `~` 估算。
- 主题切换（深/浅色）不会重绘已画的路线（沿用既有行为，需改行程/重挂载才取新色板）。
- 渡轮/跨海段 OSRM 会绕行（如雅典→圣托里尼走轮渡由 OSRM 驱动路线决定），未做特殊处理（按本次范围明确排除）。

---

## 2026-09-18 — 段抽屉 + 行程条（刀3）

**状态**：🛠️ 已实现（`npm test` 120/120，`npm run build` 通过，`npm run lint` 错误数与改动前持平；真机 Chromium 点击实测 42 项断言全过）
**来源**：A 方案第三刀 —— 地图当主角、QUOS 条目降为「点开才看的详情」。
**范围**：① 底部行程条 day chips；② 点「地图某段」或「某天 chip」→ 左侧滑出抽屉（移动端 bottom sheet）；③ 地图按天分段的 polyline 可点击 + hover 反馈。
**明确不做**：不改 `FloatingPanel` 默认展开/收起与宽度（刀4）；不碰 `api/*`、`ai-parse.js`、`prompt.js`、`road-distance.js`、`coach-plan.js`、`ldc-mapping.js` 的现有导出行为、`src/data/*`；不渡轮段、不做酒店级坐标、不做报价合理性对照。

### 改了哪些文件
| 文件 | 改动 |
|---|---|
| `src/lib/day-route.js`（新） | 天 → 段派生（纯函数）：`buildDayPlans` 出当天各段 km/时长、当日累计、全行程累计、`dayDate`（出发日 = 第 1 天）、`canPlan`（点集 <2 点 = 本来就没有段）；`legsByDay`/`totalRouteLabel`/`formatDayRoute` |
| `src/lib/quos-rows.js`（新） | **QUOS 条目派生唯一实现**：从 `quos-list.jsx` 抽出 `buildQuosRows`（含酒店归当晚过夜城市、cityCode 回退链、过滤）+ `quosSortKey`/`fmtPrice`/`rowsForDay`/`formatQuosRowsText` |
| `src/components/day-strip.jsx`（新） | 底部行程条：`D1 奥斯陆` chips，当天多城合成一个 chip；选中高亮；行程为空不渲染 |
| `src/components/segment-drawer.jsx`（新） | 段抽屉：桌面 `left:0, top:56, width:380`；移动端底部半屏；内容顺序 = 标题 `D2 · 9/18` → `起点 → 终点` → 各段 km/时长 + 当日/全程累计 → 分隔线 → `▸ 这段的报价条目`（默认折叠）→ `复制全部条目` / `全部条目 >` |
| `src/components/map-core.jsx` | 段 polyline 挂 click（`onSegmentClick(dayNumber)`）+ hover 加粗（3→6px）；金色虚线叠加层 `interactive:false` 不抢点击；estimate 兜底与「计划未就绪」的直线也按天可点；map `click` → 关抽屉（排除 marker/popup pane 与非边界 SVG path） |
| `src/app/explore/page.js` | 抽屉/行程条状态与装配；自己订阅 `buildRoutePlan`（复用 route-plan 模块级缓存+并发去重，不重复打 OSRM）；Esc/空白处关闭；`全部条目 >` 请求面板切 quos 视图 |
| `src/components/floating-panel.jsx` | 新增**可选** prop `viewRequest={view, nonce}`（不传 = 行为完全不变）；`全部条目 >` 会显式展开面板并切到行程详情（用户主动点击，不是默认状态） |
| `src/components/panel-views/quos-list.jsx` | 内联条目派生/排序/`fmtPrice` 删掉，改 import `@/lib/quos-rows`（同一份实现，面板与抽屉不会分叉） |
| `src/lib/item-name.js`、`src/lib/entity-store.js` | 相对 import 补 `.js` 扩展名（Node ESM 直跑测试需要；Next 两种写法都支持） |
| `scripts/tests/day-route.test.mjs`、`scripts/tests/quos-rows.test.mjs`（新） | 15 个纯函数测试（天→段归属、累计、estimate `~` 前缀、日期、条目按天分组/排序/复制文本），全部不联网 |
| `docs/architecture.md` | lib 清单 + 地图段补刀3说明 |

### 为什么这么做
- **条目只有一套推导**：抽屉要「该天条目」时，若再写一遍筛选/城市码逻辑，面板与抽屉迟早分叉。抽出 `quos-rows.js` 后两边同一个函数——面板显示什么，抽屉就是什么。
- **数字口径不退化**：抽屉的 km 全部来自 `route-plan.js`（OSRM）；`estimate` 时走同一个 `formatLegLabel` → `~637 km` 且不显示时长；没有计划就不显示数字（`—`），绝不拿估算冒充实测。
- **段的「天」归属沿用刀2**：`routePoints[leg.fromIdx].dayNumber`（= 离开该天城市的那条 leg），与地图按天配色、段标签完全一致，不引入第二套坐标。
- **Leaflet 点击会同时派发给图层和 map**：段点击里 `L.DomEvent.stopPropagation(e)`（传 Leaflet 事件，靠 `originalEvent._stopped` 掐断内部派发），否则刚开的抽屉会被随后的 map click 立刻关掉——这是实测抓到的真 bug。

### 实测（真机 Chromium，headless，42 项断言全过）
- 点 chip → 抽屉滑出（`D3 · 9/19` / `尼斯 → 罗马` / `693 km · 7h44`）；点段 → 开对应天（段的天号与地图配色一致）；Esc / ✕ / 点地图空白处 → 关闭；条目默认折叠、展开显示该天条目、复制得到 `D3 · 尼斯\nHTL\tFR\tNCE\tHotel in Nice`。
- `全部条目 >` → 右侧面板切到行程详情且保持展开；抽屉打开前后面板几何完全一致（740/700）。
- OSRM 拦截场景（estimate）：`~637 km`、无时长、可点可关、不白屏。
- 面板收起状态可开抽屉且不强行展开；空行程不渲染行程条/抽屉；单天行程提示「当天无跨城移动」；移动端仍是纯面板（无地图/行程条）。

### 遗留 / 风险
- **抽屉与右侧面板同开**：互不遮挡（左 380px / 右面板 ≥360px），窄视口（<800px）下两者可能贴到一起但仍有各自层级（抽屉 1050 / 面板 1000）；本刀未做联动（如开抽屉自动收面板）——留给刀4。
- **移动端没有触发入口**：`explore/page.js` 移动端本就 `showMap=false`（不渲染地图），故行程条/抽屉在移动端不渲染；抽屉的 bottom-sheet 样式已按 `isMobile` 写好，等移动端有地图时直接可用。
- **段的天号语义**：leg 归「离开第 N 天城市」的那一条（刀2 口径）；因此 `D2 巴黎 → 尼斯` 表示「第 2 天离开巴黎去尼斯」，与行程页「第 3 天到尼斯」可能差一天，属既有口径，未改。
- **地图空白处判定**：点国土边界/海洋/瓦片算空白（关抽屉）；点城市点（circleMarker）或景点点不算（不关抽屉，弹窗照常）。若日后新增非边界 SVG 图层，需同步 `isBlankTarget` 判定。
- **hover 反馈只改 stroke**（3→6px + 不透明度），未做动效；主题切换不重绘（沿用刀1 既有行为）。
