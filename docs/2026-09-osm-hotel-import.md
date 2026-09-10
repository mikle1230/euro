# 2026-09 OSM 酒店批量导入 — 交接说明(给 dsh)

> 由 T 于 2026-09-10 用免费数据源(OpenStreetMap/Overpass)生成,**未花 AI 研究成本**。
> 数据位置:`scripts/data/hotel-research-2026-09-osm/*.json`(13 城 / 438 家)
> 抓取脚本:`scripts/fetch-hotels-osm.py`(可复用;支持 --bbox 与城区名两种模式)

## 数据内容
每家酒店包含:`name`(OSM 名称)、`star`(OSM tags.stars,部分缺失=0)、`rating`(0,待补)、`priceEur`(0,待补)、`area`(街道地址)、`sources`(OSM 链接)。

**特点**:名称 + 街道地址齐全;**星级仅部分**(大酒店有);评分/价格按 Michael 要求留空。
**注意**:OSM 名称与 KT 系统名可能不同(如 "Hotel Mestari" ↔ KT "CLARION MESTARI")。

## 城市码对照(已从 quos-cities.json 核准,直接可用)
| 城市 | JSON 文件 | 库键(建议) | cityCode | country |
|---|---|---|---|---|
| Helsinki | Helsinki.json | helsinki(新建) | HEL | FI |
| Bergen | Bergen.json | bergen | BGO | NO |
| Gothenburg | Gothenburg.json | gothenburg | GOT | SE |
| Tallinn | Tallinn.json | tallinn | TLL | EE |
| Malmö | Malmö.json | malmo | MMA | SE |
| Jönköping | Jönköping.json | jonkoping | JKG | SE |
| Linköping | Linköping.json | linkoping | LPI | SE |
| Voss | Voss.json | voss | VOS | NO |
| Ulvik | Ulvik.json | ulvik | ULV | NO |
| Flåm | Flåm.json | flam | FLA | NO |
| Charlottenberg | Charlottenberg.json | charlottenberg | CLB | SE |
| Karlstad | Karlstad.json | karlstad | KSD | SE |
| Luzern | Luzern.json | lucerne(已有)→追加 hotels | LUZ | CH |

## 任务(请按序)
1. 把各 JSON 的 hotels **追加/并入** `src/data/hotel-recommendations.js` 对应城市条目:
   - 已有城市(如 lucerne)→ 追加,并**按规范名去重**(同名/近名不重复录入)
   - 新城市 → 新建条目,填 name/nameEn/country/cityCode/note
2. **rating / priceEur 保留 0**;star 用 JSON 值(0 表示未知)。
3. 代码无需大改:`recommendHotels()` 本身不过滤评分,新酒店会照常显示(排在后部)。
   - 可选优化:`recommendHotels` 排序改为 **star 降序 → rating 降序**(让无评分但高星级的排前面)。
   - `getHotelPriceRange()` 仍按 rating≥7 取价,新酒店不参与 → 显示为空,符合预期。
4. 跑 `npm test`,确认数据漂移测试通过。
5. 提交 + push(Vercel 自动部署)。
6. 在 `docs/rules-log.md` 的"北欧酒店补库"条目标注进度。

## 已知修正(别录错)
- **Hotel Kreuz by b_smart 在 Sachseln**(库码 SA3/CH),不在卢塞恩市区 —— 挂 Sachseln,勿挂 Lucerne。
- 冰岛 **Hella / Vík í Mýrdal / Hof** 的 QUOS 码仍待 Michael 从 KT 系统确认,先跳过。

## 成本说明
数据抓取为纯脚本(0 AI 成本)。本次集成请尽量少 token:直接读本文件 + JSON,勿通读全部知识文件。
