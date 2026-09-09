# Euro 项目更新总纲(2026-09 周末 harness 执行清单)

> 生成:2026-09-09 | 用途:**周末用 harness 统一更新 euro 项目时逐条执行**
> 知识资产完整存档于:`/Users/michael/.openclaw/workspace/references/euro/`(12 文件)
> 本清单 = 各文件的"可执行要点"汇总,harness 改代码/数据前先读本文件 + 对应细节文件。
> ⚠️ 原则:促销价/合同价/停车费是**参考情报**;真正影响报价正确性的代码改动集中在 A 组,数据更新在 B 组。

---

## A. 代码逻辑改动(按优先级)

### A1. 🟢 冰岛 LDC 支持(最高优先,需求已确认)
- **状态**:✅ Michael 确认冰岛是重要目的地,euro 必须支持冰岛团。
- **文件**:`src/lib/ldc-mapping.js`
- **改动**:KNOWN_COUNTRY_CODES 加 IS;MONO_MAP 加 IS → 供应商。
- **供应商边界**:
  - 雷克雅未克/南部/环线起止 → **TEITUR (LDC)**,打包 `Reykjavik - X DAYS`
  - 北部**阿克雷里起止 + 邮轮业务** → **SBA Nordurleid**(Supplier ID `CPHMTC2192`),勿用于雷克雅未克段
- **参考价**(模板团实测):TEITUR 3 天 54,222 / 4 天 72,297 ISK;超公里 0.91 ISK/km;半天机场起 12,651 ISK;单接送机 57,915 ISK(注意后者是 TEITUR 非 LDC 档)
- **细节文件**:rules-log(9/8 冰岛条目 + 9/9 SBA 条目)、euro-knowledge #8 #15 #19

### A2. 🟢 fx.js 补冰岛克朗
- **文件**:`src/lib/fx.js` 货币下拉数组加 `ISK`(countries.js 里 IS 配置已正确)
- 注意北欧四国货币符号都叫 kr(SEK/NOK/DKK/ISK),显示时区分

### A3. 🟡 ER(空驶)逻辑校准(规则已确认,待改)
- **用户规则**(2026-09-08 确认):①LDC 算 ER 用**段起止城市**;②供应商下拉有该起止城市 → 直接选预设项;③没有 → 查实际车程公里 → 选**能涵盖该公里的最低档**;④ER 是**系统预设服务项(自带价)**,不是 km×单价现算。
- **文件**:coach-plan.js makeEmptyRun / ldc-mapping.js ER_RULES / route.js patchEmptyRunRoadKm
- **北欧 SE STO 档**:200-600km=1天 / 601-1150=2天 / 1151-1900=3天 / 1901+=4天(≈820 EUR)
- ⚠️ **挪威 GLS 档不同**:200-500km(≈1073 NOK),别套斯堪的纳维亚档
- **细节文件**:euro-knowledge #11 #12、coach-knowledge-2026.md、rules-log(9/8 ER 条目)

### A4. 🟡 已知缺口核对(等 LDC 新表/Tony)
- germanyGls 1000+、franceMono 1500+、italyMono 1200+ 阶梯尾部(代码注释"待确认")
- 波兰 PL WAW dailyRate=null(官方表无波兰行)
- BCN-BCN €630、UK lon-lon £700 例外未拆
- 瑞士固定 ER(如 ZRH-SM 450 CHF)未入 ER_RULES
- 北欧单国费率(DK/SE/NO/FI)已编码 ✅ 无需改

### A5. ✅ 已确认无需改(避免重复劳动)
- 中欧 CZ/HU/SK→CZ PRG;DE+AT→DE BER;纯意→IT ROM GLS 590(代码已正确)
- 西欧多国→IT ROM NGS 650(代码已正确)

---

## B. 酒店数据更新(euro 酒店库,量大)

### B1. 🟡 北欧 17 城酒店清单(最高价值)
- **文件**:`references/euro/nordic-bid-hotels-2026-09.md`(31KB,完整分城表格,每家标 euro 已有/欠缺+评分)
- 覆盖:雷克雅未克、Hella、Höfn、Keflavik、Vík、赫尔辛基、Turku、塔林、斯德哥尔摩、哥本哈根、奥斯陆、卑尔根、哥德堡、Malmö、Jönköping、Linköping、卢塞恩 + 小镇(Voss/Ulvik/Flåm/Hvolsvöllur/教堂镇/Borgarnes/Charlottenberg/Karlstad)
- **合计 ~450 家系统实拍,euro 欠缺 ~240 家**;优先补冰岛(~43)+ 斯德哥尔摩(52)
- 更新时注意:**北欧改名极多**,录当前名(COMFORT PANORAMA、HEMEN、SCANDIC KOKSTAD、RADISSON RED CITY CENTRE、AIDEN/SURE by BW、WALDORF ASTORIA HELSINKI 等),新旧名都要可查
- 录入细节:奥斯陆/哥德堡部分 no SGL 需升 DLX(+1600 NOK);哥本哈根 TSU=SGL

### B2. 小镇酒店(补库重点)
- 挪威峡湾:Voss 4 家(FLEISCHERS 强制晚餐!)、Ulvik 3 家、Flåm 2 家(euro 全缺)
- 冰岛:Hvolsvöllur 3、教堂镇 3、Borgarnes 4、Charlottenberg 1(唯一)、Karlstad 10
- 参考价与系统名见 nordic-bid-hotels-2026-09.md 小镇节

### B3. 卢塞恩 5 家(2026-09-09 EDM)
- Schweizerhof 5*、Radisson Blu 5*、**Waldstätterhof 4*Sup(缺)**、AVA 4*、**Kreuz by b_smart 3*(缺)**
- 连锁名宽泛匹配命中的可能是其他城市门店,需按卢塞恩门店精确核对

### B4. 冰岛酒店参考码(DeepSeek 补充)
- FOSSHOTEL NUPAR/STRACTA/GRANDI BY CENTER HOTELS/KATLA/COURTYARD KEF 等
- 地区代称映射:西部小镇=Borgarnes;南部小镇=Hella/Hvolsvöllur/Vík/Kirkjubæjarklaustur;冰河湖附近=Hof/Höfn

---

## C. 用车/供应商知识(参考,改报价逻辑时调用)

- **LDC 官方表**:`ldc-rates-summer-2026.md` + 原件 xlsx(22 区域费率/ER/空驶档/前后夜)
- **用车知识手册**:`coach-knowledge-2026.md`(报价项体系/分段规则/R2-R4/杂费/税)
- **模板团选项库**:`template-tour-BJSLH30004-2026-09.md`(各城当地 MTC 服务名与价、SE STO ER 820EUR、冰岛 TEITUR 打包价、停车费精确价、活动供应商、桥费/轮渡)
- **DeepSeek 总结对照**:`deepseek-quos-knowledge-20260908.md`(参考第二意见)+ `ldc-corrections-to-deepseek-20260908.md`(已纠偏 4 点,可回传 DeepSeek)
- 供应商下拉实拍:SE STO NGS 全表(#11)、冰岛 TEITUR/PARKING FEES(#8)

---

## D. 合同/促销情报(报价用,不一定要进代码)

- **合同台账**:`contract-ledger-2026-09.md`(55 条唯一合同,按国家分类;查"哪家有合同底价")
- **促销价快查**(2026-09 邮件):
  - 德累斯顿 2027.1-4:Radisson Blu Park 70/95€、Ramada 65/90€,标准房 -5€/间夜
  - 萨尔布吕肯 Intercity 2027 全年:Twin 38€/人(合同 41.4,视房态)、SGL 55€
  - 瑞士 Parkhotel du Sauvage 2026.11-2027.3:75 CHF/人 twin(合同 82.5)
  - Charlottenberg/Arjang 2027/28:HS 412 / LS 360 SEK
- **冰岛停车费表**(2 xlsx + 2 md)+ **MHQ 玛丽港**(HEL-MHQ-STO 对报价无影响,#9)

---

## E. 冰岛特殊规则(已挂 rules-log)

- Hornafjörður 收费公路 2026-09-01 生效:≤19 座 2350 ISK / 20-69 座 5000 ISK,摄像头自动计费,默认走新路,预算受限须注明
- PARKING FEES ICELAND 各景点精确价 + 司机餐补(LUNCH 585/DINNER 974 ISK)→ 模板团文件

---

## F. 执行建议(harness 工作流)

1. 先读本文件 → 再按需读 references/euro/ 各细节文件
2. **A1(冰岛)+ A2(ISK)** 是代码必改,优先做
3. **B1-B3(酒店)** 数据量大,建议按城市分批(冰岛→斯德哥尔摩→奥斯陆→哥本哈根→其余),边补边核对改名
4. C/D/E 是**参考情报库**,报价功能如需引用再编码(如把促销价做成可选费率源)
5. 每完成一项,在 euro 项目 docs/rules-log.md 对应条目标记 🛠️已实现
