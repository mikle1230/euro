# Euro 项目知识档案(Euro Knowledge Base)

> 用途:Michael 口述的 euro 项目业务知识/规则/背景,逐条存档。
> 调用场景:回头改代码、更新规则、调价、修 bug 时,T 先查本文件。
> 关联:代码在 /Users/michael/Projects/euro(权威实现见 CLAUDE.md + src/);
> 规则流水见该仓库 docs/rules-log.md;本文件是 Michael 侧的知识收集桶。
> 维护:T · 建档 2026-09-07

## 条目(按日期追加)

<!-- Michael 逐条口述,2026-09-07 起 -->

### 2026-09-07 #1 — 冰岛:冰河湖与蓝冰洞(景点知识)

- **杰古沙龙冰河湖(Jökulsárlón Glacier Lagoon)**:冰岛最大冰川湖,位于瓦特纳冰川南端。行程中"上午看冰河湖"= 在此看浮冰流向大海;旁边有著名**钻石沙滩(Diamond Beach)**。
- **蓝冰洞 = 瓦特纳冰川(Vatnajökull)内部的水晶蓝冰洞(Crystal Ice Cave)**:冰岛最著名的蓝冰洞。
- 两者同在冰岛**东南部、挨得很近**,通常同一天游览。
- **蓝冰洞为冬季限定:每年 11 月 - 次年 3 月开放**(与该团报价周期吻合,报价时需确保冬季团期)。
- 体验流程:杰古沙龙冰河湖集合 → 换乘**超级吉普车约 40 分钟**到冰川边缘 → 短途冰川徒步 → 步行约 15 分钟到冰洞入口 → 入内参观。需**专业向导带领**,全程约 **2.5-3 小时**。

### 2026-09-07 #3 — 冰岛停车费总表(Parking by Geography,2026-09-03 版)

- **来源**:KT 邮件附件 Parking_by_Geography-updated_for_DOS_03.09.2026.xlsx,生效期 **2026-09-03 → 2028-04-30**。
- **存档**:原件 references/euro/Iceland-Parking-by-Geography-2026-09-03.xlsx;结构化数据 references/euro/iceland-parking-fees-2026-09.md(9 大区域全表)。
- **要点**:计价 per bus/group(ISK),按座位分档(1-19/30-39/40-49/50-57/58-69);产品名除机场外统一 "Reykjavik-[Region]-Parking Fee";景区停车费可随时无预警变动。
- **颜色标注官方含义**(Melissa Yung 2026-09-03 邮件原文):黄=产品归档(Hotel Arnarstapi)/ 红=一般涨价 / 红=Geysir 有效期变更 2027-01-01→2028-04-30(起始日不确定,最可能 2027 年开始)/ 绿=新增停车费 / 蓝=价格不变、有效期延至 2028-04-30。
- **⚠️ 重要提示**(Melissa + Mona Zhao 均强调):本表**仅作参考**(帮 Sales/Quoter 按区域地点识别停车费),**不持续更新**——报价/录入**始终以 DOS/QUOS 当期价格为准**。
- **2026-09-03 版变更**:涨价(Bruarhlod/Geysir 大巴9657/Reykjadalur/Jokulsarlon/Skaftafell/Landmannalaugar 大涨/Urridafoss/Dynjandi);新增收费 Malarrif(原 No fee→4440/8325);归档取消 Hotel Arnarstapi;Geysir 有效期特殊 2027-01-01 起。

### 2026-09-07 #4 — 冰岛停车费·中文译名对照表(与 #3 配套)

- **来源**:KT 附件《冰岛停车费.xlsx》(2026-09-07 收到);含每个停车费产品名的**英文原文 → 中文标准译名 → 景点备注**。
- **存档**:references/euro/iceland-parking-fees-zh-2026-09.md(全表)+ 原件《冰岛停车费-中文对照-2026-09.xlsx》。
- **用途**:euro 项目中文文案/产品名翻译标准;与 #3 价格表配套(#3 管价格,本表管命名/中文译名)。
- **要点**:Thingvellir 中文统一「辛格维利尔国家公园」;Vadlaheidagong 为**隧道通行费非停车费**;Bruarhlod 是 Bruarfoss 旁另一停车场易混淆;多处景点备注含观光特征(海鹦/火山/瀑布等)便于文案。

### 2026-09-08 #5 — LDC Summer 2026 CN ACTIVE 官方价目表(权威版)

- **来源**:KT 官方 Excel《LDC_Summer_2026_CN_ACTIVE.xlsx》(Michael 2026-09-08 提供)——**euro 项目 src/lib/ldc-mapping.js 的权威依据**。
- **存档**:原件 references/euro/LDC-Summer-2026-CN-ACTIVE.xlsx;结构化全表 references/euro/ldc-rates-summer-2026.md(含与代码的逐项对照)。
- **要点**:标准车 40-54 座 ≤48 客;夏季价 01APR-31OCT;含司机餐/多数路桥/VAT(德国 VAT 除外);意大利单国 IT ROM 590、葡萄牙 580、伊比利亚 590(BCN 630)、法国 750、瑞士 CHF880、德国 NGS 630/GLS 800、荷比卢 740、UK £720(lon-lon 700)等。
- **代码对照结论**:主要欧元区 Mono 费率与 ldc-mapping.js **一致**;缺口在**北欧单国(DK/SE/NO/FI,本币计价 DKK/SEK/NOK/EUR)**与 **EMPTY RUN 详细阶梯**(各区域不同)。改代码时优先补。
- **⚠️ 版本状态**:2026-09-07 部门例会确认此表有**版本问题待更新**(Tony 去要新表)——改代码前确认是否已有新版。图例:绿=已进 QUOS/红=建议未进/紫=仅 guideline/灰=移除。

### 2026-09-08 #6 — 用车知识问答手册(euro 项目 Coach Knowledge 重建理解)

- **缘起**:Michael 说用车知识之前提供给 DSH 已 json 化,但常有理解错误;希望 T 重新理解、以后直接问 T 拿答案。T 通读全部代码(ldc-mapping/coach-plan/quote-rates/coach-rules/std-mtc-options/daily-fees)后重建。
- **存档**:references/euro/coach-knowledge-2026.md(手册,直接可答)。
- **修正**:上午误判"北欧单国未编码"——实际已全部编码(ldc-rates-summer-2026.md 已改)。
- **核心要点**:报价项体系(insurance/pickup/dropoff/local-mtc/through-coach/daily-fee/road-tax/empty-run/prepost);LDC 判定(单国映射+多国规则:含PL→华沙、DE+AT→DE BER 不能落罗马、其余西欧→IT ROM);ER 三型计价;断段规则(只断跨城交通、活动多≥4h 直上 LDC、R2/R3/R4、400km 阈值);固定费率(保险 2.66USD/人、GERMAN VAT 90.43/天);已知缺口(波兰费率 null、count 型 ER 无单价、BCN 630/lon-lon 700 例外、阶梯尾部待确认、活动阈值待确认)。

### 2026-09-07 #2 — 冰岛:第 7 天行程「观鲸」与「蓝湖」

- **观鲸**:从**雷克雅未克旧港(Reykjavík Old Harbour)**出发,前往**法赫萨湾(Faxaflói Bay)**海上观鲸。
  - 出海港口:旧港距市区酒店很近,通常可**步行前往**或由导游安排接送。
  - 运营公司:常见 **Elding** 和 **Special Tours** 等;**QUOS 系统直接搜供应商 `ELDING`**。
- **蓝湖(Blue Lagoon)**:指位于**雷克雅尼斯半岛(Reykjanes)格林达维克(Grindavík)**的**地热温泉**——不是普通的湖,是地热温泉景点。
  - 距雷克雅未克市区约 **39 公里**;距凯夫拉维克国际机场(KEF)仅约 **13 公里**。行程 D7 住机场酒店 → 去蓝湖很近,合理。
  - 冬季水温约 **37-39°C**;常见门票套餐:**Comfort / Premium** 等。**QUOS 录入选供应商 `BLUE LAGOON` + 对应套餐**。

### 2026-09-08 #7 — DeepSeek 版 QUOS 业务知识总结(参考第二意见)

- **来源**:Michael 让 DeepSeek 总结的已知内容 md(2026-09-08 发来),存档 references/euro/deepseek-quos-knowledge-20260908.md。
- **定性**:参考第二意见,**与代码/手册冲突处以 Michael 口述 + 官方表 + euro 代码为准**。逐条对照见 coach-knowledge-2026.md「DeepSeek 对照」。
- **可用补充**(代码手册没有,已采纳):冰岛每天 DRIVER LUNCH/DINNER ALLOWANCE 餐补、景区 PARKING FEES ICELAND 按 G 计价、网格标志位 P/G·E·D·C·M·P·S 含义、冰岛酒店参考码(FOSSHOTEL NUPAR/STRACTA 等)、冰岛地区代称映射(西部小镇=Borgarnes;南部小镇=Hella/Hvolsvöllur/Vík/Kirkjubæjarklaustur;冰河湖附近=Hof/Höfn)。
- **纠偏点**:①中欧(匈/捷/斯/奥)是 CZ PRG €550,**不是** DE BER——DE BER 仅限德国单国与德奥组合;②冰岛用本地 TEITUR,**不属** SE STO;③"西欧一律 IT ROM"只对**多国混搭**成立,单国各走 Mono(法 FR PAR 750/意 IT ROM 590 GLS/瑞 CH ZRH);④"冰岛 140 欧/天"来源存疑(LDC 表无冰岛),待确认。
- **euro 代码影响**:已挂 euro 项目 docs/rules-log.md(🟡待集中修改)——真正可能动代码 = 冰岛 IS→TEITUR 支持(✅ 2026-09-08 Michael 确认冰岛是重要目的地,euro 必须支持)+ ER 尾部核对(等新表);中欧/纯意判定代码已正确无需改。纠偏全文:references/euro/ldc-corrections-to-deepseek-20260908.md。

### 2026-09-08 #8 — 冰岛供应商实锤(KT 系统截图确认)

- **来源**:Michael 提供 KT 系统「Add Single Service」截图(2026-09-08),供应商下拉实况。
- **确认**:冰岛(IS/Reykjavik,Service Type=MTC)供应商下拉选项(**系统内标准写法**):
  1. `PARKING FEES ICELAND - Reykjavik`(停车费,按团;如 `Keflavik - AIRPORT PARKING FEE`,Service Text「Airport (Keflavik) parking, applicable for pickup only」)
  2. `TEITUR - Reykjavik`
  3. `TEITUR (LDC) - Reykjavik` ← **冰岛长途车打包供应商即此**(LDC 档)
  4. `THROUGH COACH GLS - Reykjavik`(界面显示首字母被截,疑为 THROUGH)
- **结论**:euro 改冰岛支持时,IS→ 供应商码用 **TEITUR (LDC)**,打包 `Reykjavik - X DAYS`;机场接送停车等杂费走 `PARKING FEES ICELAND`。
- **界面字段参考**:Pax Type ISU、Duration、TurnService Name=MTC-STD、Breakfast/Lunch/Dinner/Luggage 勾选位、Must/Include in ITI/Pre-Booking 标志——与 DeepSeek 文档网格标志位描述吻合。

### 2026-09-08 #9 — MHQ(玛丽港)对报价无影响(用户确认)

- **MHQ = Maarianhamina / Mariehamn 玛丽港**,奥兰群岛(Åland)首府,国家码 FI。euro 城市码表已有:Maarianhamina => { cityCode: MHQ, countryCode: FI }。
- **背景**:赫尔辛基→斯德哥尔摩渡轮(Viking Line / Tallink Silja)必经奥兰靠港(玛丽港或 Långnäs)——免税销售的法律设计,非顺路。
- **✅ 用户确认(2026-09-08)**:QUOS 系统把航线严谨表达为 `HEL-MHQ-STO`(标出经停港),但**对报价无影响**——只是服务选择时看到多一处名称,不需要为 MHQ 单独加项目/计费。euro 处理渡轮段时把 HEL-STO 当直达即可。

### 2026-09-08 #10 — KT 团名规范 + 报价练习(UTOUR WIN 14D NE CPH/STO)

- **团名逻辑(用户口述,KT 录入规范)**:`客户名+(BJS)+淡旺季+天数+区域+起/止城市`,例:**UTOUR(BJS) WIN 14D NE CPH/STO**(客户 UTOUR、北京出发、冬季 WIN、14天、北欧 NE、哥本哈根起/斯德哥尔摩止)。
- **Segment 段**:全选添加即可,主要作用是"调整需要报价的天数范围",一般用处不大;**重头戏在 Tour Maker 逐天加服务**。
- **报价练习行程(2026-09-08)**:质品北欧四国+冰岛+爱沙尼亚 14天12晚,25+1 人,无导游。底稿:reports/quote-practice-14d-nordic-iceland-2026.md。
- **三段用车结构**:①北欧大陆 CPH→GOT→OSL→松恩峡湾→卑尔根→OSL = SE STO (NGS) Through Coach D2-D6 共5天一车到底;②冰岛 OSL✈KEF→南部→黄金圈 = TEITUR (LDC) D7-D9 + PARKING FEES + DRIVER 餐补;③波罗的海 HEL→TLL(日船)→STO(夜船)= 无跨国大巴,各城当地 STD MTC + DFR/OFR。
- **D10 定稿**:赫尔辛基落地 14:00 有室内活动 → 接机 + 5 小时用车(当地 STD MTC)。
- **夜船 D12**:塔林→斯德哥尔摩 OFR,2 人外舱含早晚餐(含餐不另录 RST)。

### 2026-09-08 #11 — SE STO (THROUGH COACH NGS) 服务下拉全表(系统实拍)

- **来源**:Michael 截图 6 张(KT 系统 Modify Single Service,Supplier = THROUGH COACH (NGS) - Stockholm,City SE/Stockholm,Pax Type G)。逐项抄录。
- **价格参考**:截图中 EMPTY RUN 类服务价 ≈ **819.15/819.16 SS**(单位 SS 待确认,可能=系统币种标记)。

#### 主服务(天数打包)
- `Stockholm - 3/4/5/6/7/8/9/10 DAYS`(THROUGH COACH 按天)

#### EMPTY RUN(与 ER_RULES scandinavia 分档吻合:200-600=1ER/601-1150=2ER/1151-1900=3ER/1901+=4ER)
- `Stockholm - EMPTY RUN (200-600kms) - 1 DAY`
- `Stockholm - EMPTY RUN (601-1150 KMS) 2 DAYS`
- `Stockholm - EMPTY RUN (1151-1900 KMS) 3 DAYS`
- `Stockholm - EMPTY RUN (over 1901 KMS) 4 DAYS`
- 具体线路(双向 or wv):`EMPTY RUN COPENHAGEN-OSLO/STOCKHOLM or wv`、`EMPTY RUN COPENHAGEN-BERGEN or wv`、`EMPTY RUN STOCKHOLM-OSLO or wv`
- ⚠️ Price Text 提示:**"For patterns in/out CPH, suppliers may invoice for HEL/HELS ferry or Oresund Bridge for the empty run"**——进出哥本哈根模式,供应商空驶可能另收赫尔辛基/赫尔辛堡渡轮费或厄勒海峡大桥费。

#### 路税(按天)
- `Stockholm - OSLO ROAD TAX 1~10 days`(挪威路税,按过夜挪威天数选对应项)

#### 司机相关
- `Stockholm - PRE/POST NIGHT DRIVER ACCOMMODATION`(前后夜住宿)
- `Stockholm - Tips LDC Driver 01~12 days`(司机小费按天)

#### 其他杂项
- `Stockholm - EXCESS KMS`(超公里)
- `Stockholm - ALL PARKING FEES PAID BY TOUR LEADER`(停车费全由领队付,TL 不付时用)
- `Stockholm - WATER PER BOTTLE (MAX. 500 ML)`(瓶装水)
- `Stockholm - WHIP PER DAY (MAX 1.5B)`(疑为 WIFI/其他,待确认)

**用途**:录斯堪的纳维亚跨国段(SE STO NGS)时,从以上下拉选服务;我们练习团 D2-D6(CPH→GOT→OSL→峡湾→OSL)即属此供应商。

### 2026-09-08 #12 — LDC ER(空驶)选择规则(用户口述,已确认)

**规则(2026-09-08 Michael 确认)**:
1. **所有 LDC 用车算 ER,原则上用「段起止城市」计算**(车从哪开始接团 → 最终送到哪/结束在哪)。
2. **优先**:供应商下拉里正好有该起止城市 → **直接选那条**(北欧下拉较全,如 CPH-OSLO/STO-OSLO/CPH-BERGEN;西欧较少有)。
   - 练习团实例:CPH→OSL 段 → 直接选 `EMPTY RUN COPENHAGEN-OSLO/STOCKHOLM or wv`。
3. **没有对应起止城市** → 地图查起止城市**实际车程公里** → 在下拉选**能涵盖该公里数的最低档**:
   - 例 580km → `EMPTY RUN (200-600kms) - 1 DAY`;700km → `(601-1150 KMS) 2 DAYS`。
4. **北欧公里档**:200-600km=1天 / 601-1150=2天 / 1151-1900=3天 / 1901+=4天(与 LDC 表 ER 一致)。
5. ⚠️ 每个 ER 档/线路是**系统预设服务项(自带价格,如 819 SS)**,不是按 km×单价现算。

**对 euro 代码影响**:现有 ER 逻辑(OSRM 真实车程 + ER_RULES 单价/次数现算)与 KT 实际录入(下拉选预设服务项)是两套做法——集中改代码时按本规则校准。

### 2026-09-08 #13 — 冰岛货币 ISK + fx.js 缺失项

- **冰岛货币**:冰岛克朗 Icelandic Króna,代码 **ISK**,符号 **kr**。北欧多国货币符号都叫 kr(SEK/NOK/DKK/ISK),注意区分。
- **euro bug**:src/lib/fx.js 汇率下拉缺 ISK(countries.js 里 IS 配置正确)。已挂 euro rules-log 🟡待集中修改。

### 2026-09-08 #14 — 北欧/冰岛竞标参考酒店清单(待更新酒店库)

- 10 张客户竞标材料截图 → 完整清单存档 references/euro/nordic-bid-hotels-2026-09.md(分国别/城市表格,标注 euro 库已有/缺失+评分)。
- 提取约 70 家(去重),euro 缺失 41 家,冰岛 17 家优先。已挂 euro rules-log 🟡待集中更新酒店库。

### 2026-09-08 #15 — KT 模板团选项库(同事 BJSLH30004)

- 7 张截图完整梳理存档 references/euro/template-tour-BJSLH30004-2026-09.md(选项库:接送/LDC ER/轮渡/冰岛 TEITUR+停车费+活动/桥费/酒店/手动价)。
- 关键校准点:冰岛 TEITUR 3天 54,222 / 4天 72,297 ISK;挪威 GLS ER 档(200-500)≠ 斯堪的纳维亚 NGS ER 档(200-600);Øresund 桥单程 244.88 / 12h往返 340.43 EUR。
- 已挂 euro rules-log 🟡待统一修改参考。

### 2026-09-09 #16 — 北欧主要城市 QUOS 酒店收集完成(7+1 城)

- 用户批量截图 QUOS 酒店下拉(9/8-9/9),全部存档 references/euro/nordic-bid-hotels-2026-09.md:
  冰岛(雷克雅未克/Hella/Höfn/Keflavik/Vík)、赫尔辛基、Turku、塔林、斯德哥尔摩、哥本哈根、奥斯陆、卑尔根。
- 合计系统可见 ~350 家,euro 酒店库欠缺 ~197 家(冰岛 ~43、斯德哥尔摩 52、赫尔辛基 24、奥斯陆 32、哥本哈根 31、卑尔根 20、塔林 11、Turku 6 等)。
- **待办**:等 Michael 说"更新 euro 酒店库"时一次性补齐(建议按城市分批,冰岛/斯德哥尔摩优先)。
- 共性发现:①北欧换牌/改名极多(录单必须用当前名);②部分酒店无 SGL 单人间需升 DLX(奥斯陆补差 1600 NOK);③哥本哈根 TSU=SGL 价注意;④Thon 系奥斯陆约 20 家最密。
- 9/9 追加:卑尔根(32 家,缺 20)、哥德堡(32 家,缺 18)。累计收集 10 城 ~410 家,缺 ~235 家。
- 9/9 追加:Jönköping(11 家,缺 8;用户口称林雪平实为延雪平)。
- 9/9 追加:Linköping(9 家,缺 4)。北欧累计 ~430 家,缺 ~240。
- 9/9 追加:Malmö(18 家,缺 9)。北欧累计 ~450 家,缺 ~250。

### 2026-09-09 #17 — 德国德累斯顿冬季酒店促销(2027,KT 内部邮件)

- **来源**:Emilia Sobczynska(KT 酒店采购 Germany)→ All Sales,2026-09-08。用户 9/9 转 .eml。
- **促销**:Dresden 两家 4★,标准房含早餐,每间每晚减 €5:
  - **Radisson Blu Park Hotel & Conference Centre Dresden**:STD SGL €70 / STD DBL €95
  - **Ramada by Wyndham Dresden**:STD SGL €65 / STD DBL €90
- **适用**:2027-01-01~04-30 出行(05-01 最后离店);预订窗口立即~2027-04-30;**仅新询价**;房量沿用 2027 团组合约;blackout 日期仍有效;酒店可随时 stop sales。
- **报价用途**:2027 冬春住德累斯顿的新团可引用;注意 per room/night 含早、查 blackout。
- **机制**:Michael 表示此类内部邮件每天很多,将陆续转来丰富知识库(T 逐封提炼存档)。

### 2026-09-09 #18 — 瑞士 Parkhotel du Sauvage 冬季特价(CH/MQF)

- **来源**:Mona Zhao(Procurement China)→ ChinaTeam,2026-09-08。
- **酒店**:CH/MQF/Parkhotel du Sauvage 4*(瑞士,近法语区)。
- **特价**:2026-11-01 ~ 2027-03-31,**75 CHF/人/晚(双人 twin)**,合同价 82.5 CHF pppn。
- **适用**:所有预订;系统已确认的 booking 需把 rate 更新为 **DOS Special**。
- **已确认团 8 个**(BJS260001055/685/686、SHA260001129/392、BJS270000035/036/073,各 1 晚,12-15 间夜,SeBrina/Charlotte/Ashley/Lena 操作)——说明这家冬季走量好,报价可积极用。
- **报价用途**:2026 冬-2027 春瑞士团(尤其法语区/日内瓦湖方向)可引用 75 CHF;合同价 82.5 作底。

### 2026-09-09 #19 — 冰岛北部阿克雷里邮轮大巴新供应商 SBA(Melissa 签约)

- **来源**:Melissa Yung(Iceland Procurement & Ops Mgr)→ Mona → ChinaTeam,2026-09-08。
- **新供应商**:**SBA Nordurleid**,Supplier ID **CPHMTC2192**,位于冰岛北部,已 onboard。
- **适用范围**:**仅限阿克雷里(Akureyri)起止**的邮轮业务/乘客服务。
- **服务内容**:车辆、导游(**不可单独订**,必须配 SBA 大巴、邮轮业务产品)、司机兼导游(≤19 座)。
- **价格有效期**:2027-05-01 ~ 2027-09-30;**邮轮业务车价高于普通非邮轮业务**。
- **状态**:DOS 已可用,QUOS 即将可见。
- **⚠️ 关键边界(Melissa 原文强调)**:所有**雷克雅未克起止**的 LT/LDC 大巴服务仍由 **TEITUR** 执行,**不是 SBA**。
- **对 euro 意义**:冰岛用车 = 南部/环线(雷克雅未克起止)→ TEITUR;北部阿克雷里邮轮 → SBA(CPHMTC2192)。改冰岛支持时注意区分地域+业务类型。

### 2026-09-09 #20 — 德国 IntercityHotel Saarbrücken 2027 促销价(更新)

- **来源**:Mona Zhao → ChinaTeam,2026-09-08(Update 邮件)。
- **酒店**:DE/SCN/IntercityHotel Saarbrücken 4*(萨尔布吕肯,德法边境,距梅斯 Metz 70km,巴黎→法兰克福途中;梅茨/法国东北部限房时的替代)。
- **2027 全年促销价(含早)**:
  - Twin:**38€/人**(合同价 41.4€)
  - Single:**55€/间**
- **⚠️ 注意**:2027 promote rate **取决于当天房态**——房源紧张时酒店按**合同价 41.4€** 收取(促销价不保证)。
- 两档价都已在系统。
- **卖点**:Booking 8.0 分、比梅茨合同酒店(Mercure Metz Centre)便宜约 10€、H World 成员(华住系)、账期 30 天。现用 97 间夜。
- **报价用途**:2027 全年法国东北/德国西南方向团可报 38€ Twin;注明视房态、紧张时回合同价。

### 2026-09-09 #21 — 卢塞恩冬季 2026/27 产品与酒店(KT China EDM)

- **来源**:Kuoni Tumlare China <China@kuonitumlare.com> 营销邮件(2026-09-08,EDM/SITELAUNCH),发给客户渠道;询价联系 Yali Hong(yali.hong@kuonitumlare.com)。
- **定位**:瑞士卢塞恩(Lucerne)冬季目的地产品目录,销售可直接推销给客户。

#### 冬季活动/体验(可订产品)
1. **LILU 灯光节**(Lucerne Festival of Light):2027-01-14~24,18:00-22:00,老城/教堂/博物馆灯光投影夜游。
2. **卢塞恩狂欢节**:2027-02-04~09,瑞士最大狂欢节,街头派对+奇装异服。
3. **Stoos 滑雪初体验**:2 小时初学者套餐(Stoos 滑雪区,瑞士原汁原味冬季体验)。
4. **Stoos 雪鞋徒步 & 雪橇**:山地火车上 Stoos,结冰湖面+高山森林徒步,雪鞋/雪橇可结合;可选山间小屋瑞士火锅午餐。
5. **Glasi Hergiswil 玻璃厂**(卢塞恩湖畔):瑞士最古老仍在运营玻璃厂,吹玻璃演示+博物馆+儿童工坊。
6. **Lindt 巧克力工坊**:2 小时大师课+品尝,送自制巧克力礼盒;雨天备选(因特拉肯约10分钟?原文如此,疑为苏黎世近郊 Lindt)。
7. **卢塞恩购物**:湖滨→老城步行区。

#### 卢塞恩合作酒店(推荐清单)
| 酒店 | 星级 | 房数 | 卖点 |
|---|---|---|---|
| Hotel Schweizerhof Luzern | 5* | 101 | 湖滨;LUZERN LIVE/音乐节期间首选;180°湖景房、温水泳池、水疗 |
| Radisson Blu Hotel Luzern | 5* | 189 | 老城与车站枢纽;设计感 |
| Waldstätterhof Luzern | 4* Superior | 91 | 老城,步行达湖畔/车站;50 间湖景房 |
| Hotel AVA | 4* | 44 | 住宅区,性价比;含早停车/健身房/桑拿,步行车站老城 |
| Hotel Kreuz by b_smart | 3* | 23 | 卢塞恩-苏黎世间,经济型,免费停车/Wi-Fi,雨天室内备选 |

#### 报价用途
- 客户询卢塞恩/瑞士冬季团 → 直接套此产品包+酒店清单;EDM 内含现成询价模板(Take me to Lucerne)。
- euro 后续可把这些冬季活动产品(灯光节/狂欢节/Stoos/Lindt)与酒店纳入目的地知识。
