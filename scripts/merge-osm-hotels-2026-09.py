#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 OSM 抓取的酒店 JSON 追加进 src/data/hotel-recommendations.js（保留原格式，仅追加）。
用法: python3 scripts/merge-osm-hotels-2026-09.py
"""
import glob
import json
import os
import re
import unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TARGET = os.path.join(ROOT, 'src/data/hotel-recommendations.js')

META = {
    'Helsinki':        ('helsinki', '赫尔辛基', 'Helsinki', 'FI', 'HEL', '芬兰首都。数据源 OpenStreetMap(Overpass) 2026-09-10；名称+街道地址取自 OSM，星级取自 OSM tags.stars（部分缺失=0），评分/价格为待补。'),
    'Bergen':          ('bergen', '卑尔根', 'Bergen', 'NO', 'BGO', '挪威西海岸峡湾门户。数据源 OpenStreetMap(Overpass) 2026-09-10；评分/价格待补。'),
    'Gothenburg':      ('gothenburg', '哥德堡', 'Gothenburg', 'SE', 'GOT', '瑞典西海岸。数据源 OpenStreetMap(Overpass) 2026-09-10；评分/价格待补。'),
    'Tallinn':         ('tallinn', '塔林', 'Tallinn', 'EE', 'TLL', '爱沙尼亚首都。QUOS 码用 TLL（勿用 TLX）。数据源 OSM 2026-09-10；评分/价格待补。'),
    'Malmö':           ('malmo', '马尔默', 'Malmö', 'SE', 'MMA', '瑞典南部厄勒海峡。数据源 OpenStreetMap(Overpass) 2026-09-10；评分/价格待补。'),
    'Jönköping':       ('jonkoping', '延雪平', 'Jönköping', 'SE', 'JKG', '瑞典南部韦特恩湖。数据源 OSM 2026-09-10；评分/价格待补。'),
    'Linköping':       ('linkoping', '林雪平', 'Linköping', 'SE', 'LPI', '瑞典东部。数据源 OSM 2026-09-10；评分/价格待补。'),
    'Voss':            ('voss', '沃斯', 'Voss', 'NO', 'VOS', '挪威峡湾小镇。数据源 OSM 2026-09-10；评分/价格待补。'),
    'Ulvik':           ('ulvik', '于尔维克', 'Ulvik', 'NO', 'ULV', '挪威哈当厄尔峡湾小镇。数据源 OSM 2026-09-10；评分/价格待补。'),
    'Flåm':            ('flam', '弗洛姆', 'Flåm', 'NO', 'FLA', '挪威松恩峡湾小镇。数据源 OSM 2026-09-10；评分/价格待补。'),
    'Charlottenberg':  ('charlottenberg', '夏洛滕贝里', 'Charlottenberg', 'SE', 'CLB', '瑞典边境购物小镇。数据源 OSM 2026-09-10；评分/价格待补。'),
    'Karlstad':        ('karlstad', '卡尔斯塔德', 'Karlstad', 'SE', 'KSD', '瑞典韦姆兰省。数据源 OSM 2026-09-10；评分/价格待补。'),
    'Luzern':          ('lucerne', '卢塞恩', 'Lucerne', 'CH', 'LUZ', '追加 OSM 抓取酒店（评分/价格待补）。'),
}


def s(v):
    return json.dumps(v, ensure_ascii=False)


def hotel_line(h):
    return ('      { name: %s, nameZh: "", star: %d, rating: 0, priceEur: 0, area: %s, near: "", '
            'ratingSource: "", sources: %s, address: "", chain: "", note: "" },'
            % (s(h.get('name', '')), int(h.get('star') or 0),
               s(h.get('area', '')), s(h.get('sources', []))))


def norm(name):
    n = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]', '', n.lower())


def main():
    lines = open(TARGET, encoding='utf-8').read().split('\n')
    added_cities, added_hotels, skipped = [], 0, 0

    # ---- 1) 已有城市(lucerne)追加 ----
    idx = next(i for i, l in enumerate(lines) if l.strip().startswith('"lucerne": {'))
    end = next(i for i in range(idx, len(lines)) if lines[i] == '    ],')
    existing = set(norm(m.group(1)) for m in
                   (re.search(r'\bname: "([^"]+)"', l) for l in lines[idx:end]) if m)
    new_lines = []
    for f in glob.glob(os.path.join(ROOT, 'scripts/data/hotel-research-2026-09-osm/Luzern.json')):
        for h in json.load(open(f, encoding='utf-8'))['cities'][0]['hotels']:
            if norm(h['name']) in existing:
                skipped += 1
                continue
            new_lines.append(hotel_line(h))
            existing.add(norm(h['name']))
    lines[end:end] = new_lines
    added_hotels += len(new_lines)

    # ---- 2) 新城市：插到文件末尾的 `}` 之前 ----
    last = max(i for i, l in enumerate(lines) if l.strip() == '}')
    blocks = []
    for key, meta in META.items():
        if meta[0] == 'lucerne':
            continue
        path = os.path.join(ROOT, 'scripts/data/hotel-research-2026-09-osm/%s.json' % key)
        if not os.path.exists(path):
            continue
        hs = json.load(open(path, encoding='utf-8'))['cities'][0]['hotels']
        if not hs:
            continue
        blocks.append('  "%s": {' % meta[0])
        blocks.append('    name: %s, nameEn: %s, country: %s, cityCode: %s, note: %s, hotels: ['
                      % (s(meta[1]), s(meta[2]), s(meta[3]), s(meta[4]), s(meta[5])))
        for h in hs:
            blocks.append(hotel_line(h))
        blocks.append('    ],')
        blocks.append('  },')
        added_cities.append(meta[0])
        added_hotels += len(hs)
    lines[last:last] = blocks

    open(TARGET, 'w', encoding='utf-8').write('\n'.join(lines))
    print('新增城市 %d: %s' % (len(added_cities), ', '.join(added_cities)))
    print('新增酒店 %d 家（去重跳过 %d）' % (added_hotels, skipped))


if __name__ == '__main__':
    main()
