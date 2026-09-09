# 冰岛酒店补库 QA 记录(2026-09-09, B1 Iceland batch)

> 本目录存放本次 8+3 个调研子代理的原始输出与中间产物,供复核与后续批次(斯德哥尔摩/奥斯陆/哥本哈根等)复用方法。

## 一、数据源方法(后续批次直接套用)
- booking.com 属性页直连被 AWS WAF 反爬(HTTP 202),**勿再逐店直抓**。
- 可用来源(优先级):
  1. **Booking 静态城市页** `/city/is/{镇}.en-gb.html` / `.zh-cn.html`(含当前评分/点评数/最低起价 CNY;列表可能截断,取到几条算几条)——西岸/塞尔福斯组验证成功。
  2. **hotelclub.net**(页面原文转述 "X.X/10 rating on Booking.com";www 域名直连成功,注意 www/裸域重定向循环,从 www 进)。
  3. **zenhotels.com**(0-10 聚合分 + en-de 页 EUR 直显 from 价;Booking 评论聚合口径)。
  4. is-southerniceland.com(带 Booking 标识镜像,冰岛南岸适用)、HotelsCombined(Booking 来源 avgScore)、trivago/kayak 搜索页标题(星级/币种价)。
  5. 官网:islandshotel.is(fosshotel.is 已跳转)、keahotels.is、centerhotels.is、stractahotel.com、hotelork.is、konvin.is、hotelklaustur.is 等。
- priceEur 口径多为聚合站"from 价/无日期起价",随季节大幅浮动(冰岛夏季显著更高),每店 note 均已注明;EUR 不可得时可用 CNY÷7.81 或 ISK÷~143/147 换算并在 note 注明。

## 二、knowledge 源清单纠错(重要,后续别照搬)
1. **Best Western Plus Ten / Grow / Park Airport Hotel 均位于瑞典(阿兰达/斯德哥尔摩),不是冰岛**——竞标材料把瑞典机场店混进了冰岛组(评分 7.9/8.6/8.2 对应瑞典店)。冰岛批剔除;若斯德哥尔摩批做,它们应收在 Arlanda 组。
2. **Hotel Örk 实际在 Hveragerði**(非 Hvolsvöllur/Hella)。
3. **Hotel Búrfell 实际靠 Vík 侧**(Steig, 871 Vík)。
4. **Árnanes Country Hotel 实际靠 Höfn**(781 Höfn 方向,距 Hvolsvöllur 约 340km)。
5. **Stracta Hotel 实际在海拉镇**(Rangarflatir 4, 850 Hella;Booking 归 Hella,非 Hvolsvöllur);**Stracta Hotel Mosfell 也在海拉侧**(Þrúðvangur 6, 850 Hella,"Mosfell" 是海拉附近农场地名,与雷克雅未克大区 Mosfellsbær 无关)。
6. 地区上"Hof(冰河湖附近)"指 Hof/Höfn 方向;euro quos-cities 中 Hof→DE(德国霍夫)是错配,后续城市码轮需处理(与 Hella/Vík í Mýrdal 同理——本批未见真实 IS 码来源,勿猜码)。
7. 雷克雅未克 2026-09 更名批处理:Hilton Reykjavik Nordica→**Hilton Reykjavik**(2026-09 Íslandshótel 运营);Berjaya Reykjavik Natura→**Hotel Reykjavík Askja**(2026-09-01);Center Hotel Grandi→**Grandi by Center Hotels**;Midgardur→**Midgardur by Center Hotels**(2026-05);Reykjavik Centrum 现运营 **Hotel Reykjavík Centrum**(Íslandshótel);Radisson Blu Saga 旧物业已改非酒店用途,**Hotel Reykjavík Saga** 为独立新实体。
8. Hotel Hamar 评分口径:Booking 城市页(Borgarnes 目的地)9.0/1253 vs zenhotels 8.6/821,以 Booking 现页为准(本批录 9.0)。

## 三、入库统计(本次 commit)
- 新增 7 城条目、51 家酒店:雷克雅未克 27、凯夫拉维克 5、霍芬(含冰河湖/斯卡夫塔方向)7、霍尔斯沃德吕尔 2、教堂镇 3、博尔加内斯 5、塞尔福斯 2。
- 所有 rating/priceEur 均有真实来源(见各条目 note 与 ratingSource);因 booking 直读受限,部分评分取聚合/镜像转述,建议有时间时用 Booking 现页抽验。
- **海拉(Hella)镇 4 家**(Stracta/Kanslarinn/Lækur/Leirubakki)存于 `hella-pending-hotels.json`,待 euro quos-cities 补 Hella(IS)码后建条目。
- **维克(Vík í Mýrdal)/海拉城市码缺口**未在本批解决(仓库无真实码来源),影响:LDC 国家集合判定(南岸线过夜点)+ 酒店城市匹配,见 A1 汇报。
