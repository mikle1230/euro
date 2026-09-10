#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""从 OpenStreetMap(Overpass)抓取城市酒店：名称 + 星级 + 坐标/地址（免费，无需 AI 研究）。

用法:
    python3 scripts/fetch-hotels-osm.py "Helsinki" FI [--bbox S,W,N,E] [--json out.json]

输出: 控制台清单；--json 写出可并入酒店库的 JSON（rating/priceEur 留 0/空，待后续补）。
数据源: Nominatim(地理编码) + Overpass API(OSM 数据)，均已标注来源链接。
"""
import json
import sys
import time
import urllib.parse
import urllib.request

UA = "euro-hotel-fetch/1.0 (contact: mikle1230)"


def http_get(url, timeout=40):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", "ignore")


def geocode_bbox(city, country):
    q = urllib.parse.quote(f"{city}, {country}")
    url = f"https://nominatim.openstreetmap.org/search?q={q}&format=json&limit=1"
    data = json.loads(http_get(url))
    if not data:
        raise SystemExit(f"地理编码失败: {city}, {country}")
    bb = data[0]["boundingbox"]  # [south, north, west, east]
    return float(bb[0]), float(bb[2]), float(bb[1]), float(bb[3]), data[0]["display_name"]


ENDPOINTS = [
    "https://overpass-api.de/api/interpreter?data=",
    "https://overpass.kumi.systems/api/interpreter?data=",
    "https://overpass.osm.ch/api/interpreter?data=",
]


def overpass_run(q):
    last = None
    for ep in ENDPOINTS:
        try:
            return json.loads(http_get(ep + urllib.parse.quote(q), timeout=90))
        except Exception as ex:  # noqa: BLE001
            last = ex
            continue
    raise SystemExit(f"Overpass 全部端点失败: {last}")


def overpass_hotels_bbox(s, w, n, e):
    q = (f'[out:json][timeout:60];'
         f'(node["tourism"="hotel"]({s},{w},{n},{e});'
         f'way["tourism"="hotel"]({s},{w},{n},{e}););'
         f'out center tags;')
    return overpass_run(q).get("elements", [])


def overpass_hotels_area(city):
    """按行政区名查酒店（免地理编码）。尝试 name:en / name 两种写法。"""
    for key in ('name:en', 'name'):
        q = (f'[out:json][timeout:60];'
             f'area["{key}"="{city}"]["boundary"="administrative"]->.a;'
             f'(node["tourism"="hotel"](area.a);way["tourism"="hotel"](area.a););'
             f'out center tags;')
        els = overpass_run(q).get("elements", [])
        if els:
            return els, f'{city} (area:{key})'
    return [], f'{city} (area:未命中)'


def main():
    args = sys.argv[1:]
    if not args:
        raise SystemExit(__doc__)
    city = args[0]
    country = args[1] if len(args) > 1 and not args[1].startswith("--") else ""
    out_json = None
    if "--json" in args:
        out_json = args[args.index("--json") + 1]

    if "--bbox" in args:
        s, w, n, e = [float(x) for x in args[args.index("--bbox") + 1].split(",")]
        els = overpass_hotels_bbox(s, w, n, e)
        label = f"{city} (bbox)"
    else:
        els, label = overpass_hotels_area(city)
    hotels = []
    for el in els:
        t = el.get("tags", {})
        name = t.get("name") or t.get("name:en")
        if not name:
            continue
        lat = el.get("lat") or (el.get("center") or {}).get("lat")
        lon = el.get("lon") or (el.get("center") or {}).get("lon")
        addr = " ".join(x for x in [t.get("addr:street"), t.get("addr:housenumber")] if x)
        hotels.append({
            "name": name,
            "star": int(t["stars"]) if t.get("stars", "").isdigit() else 0,
            "rating": 0,
            "priceEur": 0,
            "area": addr,
            "near": "",
            "ratingSource": "",
            "sources": [f"https://www.openstreetmap.org/{'node' if el.get('type')=='node' else 'way'}/{el['id']}"],
            "lat": lat, "lon": lon,
            "brand": t.get("brand", ""),
            "website": t.get("website", ""),
        })
    hotels.sort(key=lambda h: (-h["star"], h["name"]))
    withs = [h for h in hotels if h["star"]]
    print(f"# {label}: 抓到酒店 {len(hotels)} 家，其中 {len(withs)} 家有星级")
    for h in hotels:
        st = f"{h['star']}★" if h["star"] else "—"
        print(f"  {st:>3}  {h['name']:<45} {h['area'][:30]} {h['brand']}")

    if out_json:
        city_obj = {"cities": [{
            "zh": city, "en": city, "country": country, "cityCode": "",
            "note": f"来源 OpenStreetMap(Overpass) {time.strftime('%Y-%m-%d')}；星级取自 OSM tags.stars；评分/价格待补。",
            "hotels": [{k: h[k] for k in ("name", "star", "rating", "priceEur", "area", "near", "ratingSource", "sources")} for h in hotels],
        }]}
        json.dump(city_obj, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
        print(f"-> 已写出 {out_json}")


if __name__ == "__main__":
    main()
