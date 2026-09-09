# 哥本哈根批调研备忘(2026-09-09, B1 Copenhagen batch)

## 一、doc 源清单纠错(勿照搬)
1. **Bella Sky → AC Hotel Bella Sky Copenhagen**(2014-12 Comwell→Marriott AC,业主 Bella Center/BC Hospitality;非 Comwell/非 Crowne Plaza)。
2. **Clarion Hotel Copenhagen Airport = ex Hilton Copenhagen Airport**(2017-04 脱离 Hilton,Strawberry 改以 Clarion)。
3. **Best Western Plus Airport Hotel Copenhagen = ex Quality Hotel Airport Dan**(Nordic Choice→BW Plus)。
4. **Copenhagen Island 未更名**(Arp-Hansen,无 Comwell Islands Brygge 一说)。
5. **Høje Taastrup**:ex Thon → 现 **Hoje Taastrup Hotel Copenhagen West, a member of Radisson Individuals**。
6. **Mayfair → Clarion Collection Hotel Mayfair**(Strawberry,前 First Hotel Mayfair;2025 Clarion Collection→Home 仅限北欧 54 店不含此店)。
7. **Four Points Flex by Sheraton Copenhagen**(Zleep 系 2024-10 起经 Marriott/H World 换牌)在售 **City/Ørestad Arena/Airport 三店**(原 Zleep Centrum/Arena/Airport);无 Nordhavn 店。
8. **Scandic Copenhagen Strand 不存在**:现 **Copenhagen Strand**(Arp-Hansen,Havnegade 37 新港旁);与 Amager **Scandic CPH Strandpark**(2021-05 开业)不同店。
9. **Scandic Falkoner**(官方拼写,曾 Radisson Blu Falconer,2019 Scandic 翻新重开)。
10. ProfilHotels Copenhagen Plaza 地址 **Bernstorffsgade 4**(中央站对面,非 Vesterbrogade、非老 Palace);ProfilHotels Mercur/Richmond 均 Ligula 系。
11. **Radisson Collection Hotel Royal Copenhagen** 5★(SAS Royal 1960 Arne Jacobsen→Blu Royal→2018 Collection 旗舰)。
12. Villa Copenhagen 5★(前中央邮政总局,2020);The Square 在营仍 Arp-Hansen;Tivoli Hotel & Congress Center Arp-Hansen 旗舰。
13. Wakeup Copenhagen 仅 **3 店**(Bernstorffsgade/Borgergade/Carsten Niebuhrs Gade),doc 第 4 名 'H.C. ANDERSENS' 查无(旧地址名)。
14. 25hours Hotel Paper Island 2024-07 已开业但评分价不可得(待补);**The Standard Copenhagen 查无**。

## 二、待人工补录/复核
- 25hours Hotel Paper Island(2024-07 开业,评分/€ 价待有 Booking 直连环境补)。
- Scandic CPH Strandpark 星级(暂记 0,疑似 4★);Scandic Webers 6.9 单源(zenhotels)最低值,建议 Booking 复核。
- Wakeup star 2★/3★ 渠道不一(丹麦无官方星级);CPH 全部 star 为 OTA/品牌档位认定。

## 三、入库统计(本次 commit)
- **copenhagen 46 家**;doc 哥本哈根可见 ~49 家,覆盖率约 94%(差 The Standard=查无、Paper Island=评分待补、H.C.Andersens=旧名)。
- 评分过滤提示:BW+ Airport 6.8、4PX City 6.2、Scandic Webers 6.9、ProfilHotels Richmond 6.9 低于常见 7 分参考线(note 均已注明;运行时 recommendHotels 未过滤,价格区间函数按 ≥7 过滤)。
