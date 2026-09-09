# LDC 长途车价目表(Summer 2026 CN ACTIVE · 权威版)

> 来源:KT 官方 Excel《LDC_Summer_2026_CN_ACTIVE.xlsx》,2026-09-08 由 Michael 提供
> 原件:同目录 `LDC-Summer-2026-CN-ACTIVE.xlsx`
> 性质:**euro 项目 src/lib/ldc-mapping.js 的权威依据**(代码注释标注"以 KT「LDC Summer 2026 CN ACTIVE」为准")
> 计价口径:标准车 40-54 座、最多 48 客+1 大件行李;夏季价 01APR-31OCT(冬季另表)
> ⚠️ 版本状态:2026-09-07 部门例会确认此表有**版本问题待更新**(Tony 去要新表);改代码前以最新版为准

## 图例(Legend / sheet2)
- 🟢 绿:修改已更新进 QUOS
- 🔴 红:建议修改、**尚未**更新进 QUOS
- 🟣 紫:仅 guideline 文件的附加修改
- ⚪ 灰:已移除
- ❓ Pending:Separate rate for India/China market?

## 全表费率(Rates)

| 区域 | 车型 | QUOS 代码 | 日费率(夏季) | 含餐 | Max km/d | 超公里 | EMPTY RUN | PRE/POST | 备注要点 |
|---|---|---|---|---|---|---|---|---|---|
| Western Europe Planning(西欧跨国) | NGS | IT ROM Through Coach (NGS) | **EUR 650** | 含 | 375km | €2/km | 0-350免;351-600=450;601-1000=800;1001-1400=1000;1401-1999=1500 | €120 | CN 特价;含司机餐/多数路桥/VAT(德国 VAT 除外);TL 不付时另加 |
| Benelux(荷比卢) | GLS | NL AMS | **EUR 740** | 含 | 350km | €1.40 | 200-699=1ER;700-1674=2ER;1675+=3ER;境内无空驶;2个live days 1 full empty;3+ live days 起 PAR-AMS 550/PAR-BRU 450 | €135 | CN 特价;专业供应商 |
| Germany(德国) | NGS | DE BER | **EUR 630** | 含 | 375km | €2 | 同西欧阶梯 | €120 | CN 特价;不限国籍;德语 VAT 不含;德国行程另加 €85/天;起止德国适用;Min €50/day |
| Germany(德国) | GLS | DE BER | **EUR 800** | 含 | 375km | €2 | 200-400=1ER;401-599=1.5ER;600-999=2ER;1000-1699=3ER;1700-1999=4ER;2000+=5ER | €120 | CN 特价 High End/Adhoc/VIP;德/奥供应商 |
| France Mono(法国单国) | GLS | FR PAR | **EUR 750**(Paris 起止) | 含 | 350km | €1.50 | 200-600=1ER;601-900=1.5ER;900-1500=2ER;NCE/PAR=1500 | €120 | 仅 Mono France;12h/day 服务上限 |
| **Italy Mono(意大利单国)** | GLS | IT ROM | **EUR 590** | 含 | 350km | €1.80 | 351-600=1ER;601-999=1.5ER;1000-1200=2ER | €120 | 仅 Mono Italy;含 VAT/路税/司机餐/停车;Min €50/day |
| Mono Sicily(西西里岛内) | GLS | IT PMO | **EUR 640** | 含 | 300km | €1.80 | 3+ live days 无空驶;2 days 报 1 empty €450 | €120 | 仅西西里岛内(不上本土) |
| Switzerland Mono(瑞士单国) | GLS | CH ZRH | **CHF 880** | 含 | 250km | CHF1.50 | GVA-GVA/ZRH-ZRH 无;特殊线路固定价;ZRH/GVA-MIL 1ER | CHF130 | 仅 Mono CH;含司机餐/VAT/路税 |
| Central Europe(匈捷斯) | NGS | CZ PRG | **EUR 550** | 含 | 375km | €2 | 同西欧阶梯 | €120 | 7 年内新车;TL 不付另加停车 |
| Iberia(西葡伊比利亚) | GLS | ES MAD | **EUR 590**(BCN-BCN 630) | 含 | 350km | €1.60 | 200-699=1ER;700-1674=2ER;1675+=3ER | €110 | 350km/day;含司机餐;额外:司机住宿等 |
| Portugal Mono(葡萄牙单国) | GLS | PT LIS | **EUR 580** | 含 | 350km | €1.60 | 葡境内无空驶 | €100(或€40/€2pp) | 仅 Mono Portugal;7 年内车;英语司机不保证 |
| Baltic Republics Mono(波罗的海) | GLS | LT VNO | **EUR 550** | 含 | 300km | €1.20 | 220-600=1ER;601-1200=2ER;1201+=3ER;Tallinn-Vilnius 1 empty | €90 | 仅爱/立/拉境内;10 年内车(7 年可request) |
| UK(英国) | GLS | GB LON | **GBP 720**(lon-lon 700) | 含 | 350km | £1.50 | 200-699=1ER;700-1674=2ER;1675+=3ER;北爱/爱尔兰渡轮另报 | £110 | UK & UK+IE;含司机餐 |
| Ireland Mono(爱尔兰单国) | GLS | IE DUB | **EUR 700** | 含 | 250km | £1.30 | 起止城距>50km 报空驶(£1.30×km) | €110 | IE & N.Ireland;含爱尔兰岛则 adhoc |
| Scandinavia(挪南/瑞典/丹跨境) | NGS | SE STO | **EUR 670** | 含 | 370km | €1.60 | 200-600=1ER;601-1150=2ER;1151-1900=3ER;1901+=4ER;Øresund 桥特殊含 | — | 斯堪的纳维亚跨国 |
| Mono-Denmark(丹麦单国) | GLS | DK CPH | **DKK 9200** | 含 | 330km | DKK20 | 200-699=1ER;700-1674=2ER;1675+=3ER;基座哥本哈根 | DKK1200 | 单国价(80% ITI,丹起止);GLS=Scandi 供应商;Go Ahead ≥25 天 |
| Mono-Sweden(瑞典单国) | GLS | SE STO | **SEK 13300** | 含 | 330km | SEK14 | 200-600=1ER;601-1200=2ER;1201+=3ER;基座斯京 | SEK1340 | 单国(80% ITI);GLS=瑞典/芬供应商;≥15 天 |
| Mono-Norway South(挪威南) | GLS | NO OSL | **NOK 12900** | 含 | 300km | NOK20 | 200-500=1ER;501-850=2ER;851-1100=3ER;1101+=4ER;Bergen-Bergen=1ER(车在Oslo) | NOK1750 | 车基座 Oslo;非常规线路需与 LDC 采购确认 |
| Mono-Norway North(挪威北/极地) | GLS | NO ALT | **NOK 13100** | 含 | 300km | NOK28 | 0-200=1ER;201-400=1.5ER;401+=2ER;Tromso-Alta/Evenes 等=1ER | — | 极地线路 |
| Mono-Finland South(芬兰南) | GLS | FI HEL | **EUR 784** | 含 | 350km | €1.90 | ≤150km 无空驶;151km+ €1.9/km;基座赫尔辛基 | €151 | 单国(80% ITI,芬起止);≥30 天;€40 或 €2pp/day |
| Mono-Finland North Lapland(芬北拉普兰) | GLS | FI ROV | **EUR 822** | 含 | 350km | €1.90 | 151-499=1ER;500-999=2ER;1000-1499=3ER;1500-2000=4ER;Rovaniemi-Alta 900/Rovaniemi-Tromso 1000/Kiruna-Kiruna 1000 | €146 | 芬北/瑞北/挪北单国;€40 或 €2pp/day |
| Mono-Finland North Lapland | NGS | FI ROV | **ON REQUEST** | — | 350km | €1.90 | 同上 | €146 | 同 Lapland GLS;Min €50/day |

## 与 ldc-mapping.js 现有代码对照(2026-09-08)

| 代码键 | 代码费率 | 官方表 | 一致? |
|---|---|---|---|
| westernEurope | 650 | 650 | ✅ |
| benelux | 740 | 740 | ✅ |
| germanyNgs / germanyGls | 630 / 800 | 630 / 800 | ✅ |
| franceMono | 750 | 750 | ✅ |
| italyMono | 590 | 590 | ✅ |
| sicilyMono | 640 | 640 | ✅ |
| switzerlandMono | 880 | 880(CHF) | ✅ |
| centralEurope | 550 | 550 | ✅ |
| iberia | 590 | 590(BCN 630) | ✅(BCN 例外未编码) |
| portugalMono | 580 | 580 | ✅ |
| balticMono | 550 | 550 | ✅ |
| uk | 720 | 720(700 lon-lon) | ✅ |
| irelandMono | 700 | 700 | ✅ |
| scandinavia | 670 | 670 | ✅ |
| denmarkMono / swedenMono | DKK 9200 / SEK 13300 | 同 | ✅(本币已编码) |
| norwaySouth / norwayNorth | NOK 12900 / 13100 | 同 | ✅(已编码) |
| finlandSouth / finlandNorth | €784 / €822 | 同 | ✅(已编码) |
| finlandNorthNgs | ON REQUEST | 同 | ✅ |
| **polandMono** | **null(费率缺)** | **官方表无波兰行** | ⚠️ 待补充 |
| **EMPTY RUN** | 三型(tiers/count/perKm)已编码 | 各区域不同 | ⚠️ 见结论 |

> **修订说明(2026-09-08 晚,已通读全代码)**:上午初读时误判"北欧单国未编码"——实际 ldc-mapping.js SUPPLIERS 已含丹/瑞/挪/芬全部单国本币费率,现纠正。
>
> **真正缺口/存疑**:
> 1. **波兰 PL WAW** dailyRate=null(官方表无波兰行,代码有供应商但费率待补);
> 2. **count 型 ER 单次价 unit=null**(官方表只给 ER 次数不给单价)→ 报价只显示"ER ×N"不计价,待补 unit;
> 3. **BCN-BCN 630**(伊比利亚 590 例外)与 **UK lon-lon 700**(720 例外)未单独编码;
> 4. 阶梯尾部待确认:germanyGls 1000+、franceMono 1500+、italyMono 1200+;
> 5. 瑞士固定 ER 价(如 ZRH-SM 450 CHF)未入 ER_RULES(switzerlandMono=none 型+note)。
