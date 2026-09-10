#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""删除「推荐库」中与 KT 报价库(hotel-prices.json)重叠、且信息为空(评分/价格均 0)的新增条目。
依据 Michael 2026-09-10:跨库重叠时,保留信息更多的一边(KT 报价库有价格+评分),空的 OSM 条目删掉。
用法: python3 scripts/remove-kt-overlaps-2026-09.py [--dry]
"""
import io
import json
import re
import sys

REC = 'src/data/hotel-recommendations.js'
PRICES = 'src/data/hotel-prices.json'

CITY_CODE = {'helsinki': 'HEL', 'bergen': 'BGO', 'gothenburg': 'GOT', 'tallinn': 'TLL',
             'malmo': 'MMA', 'jonkoping': 'JKG', 'linkoping': 'LPI', 'voss': 'VOS',
             'ulvik': 'ULV', 'flam': 'FLA', 'charlottenberg': 'CLB', 'karlstad': 'KSD',
             'lucerne': 'LUZ'}
GENERIC = {'hotel', 'hotell', 'the', 'by', 'bw', 'spa', 'resort', 'inn', 'apartments',
           'apartment', 'studios', 'studio', 'home', 'homes', 'house', 'collection',
           'hostel', 'motel', 'quality', 'first', 'plus'}
LINE_RE = re.compile(r'^\s*\{ name: (?P<name>".*?"), nameZh: .*?, star: (?P<star>\d+), '
                     r'rating: (?P<rating>[\d.]+), priceEur: (?P<priceEur>\d+),')


def strong(name):
    t = re.sub(r'[^a-z0-9\s]', ' ', name.lower())
    return ''.join(w for w in t.split() if w and w not in GENERIC)


def main():
    dry = '--dry' in sys.argv
    prices = json.load(io.open(PRICES, encoding='utf-8'))
    kt = {cc: set(strong(h.get('bookingName') or h.get('hotel') or '') for h in (e.get('hotels') or []))
          for cc, e in prices.items()}

    lines = io.open(REC, encoding='utf-8').read().split('\n')
    city = None
    removed = []
    for i, ln in enumerate(lines):
        m = re.match(r'^\s*"([a-z0-9-]+)": \{$', ln)
        if m:
            city = m.group(1)
            continue
        mm = LINE_RE.match(ln)
        if not mm:
            continue
        cc = CITY_CODE.get(city)
        if not cc:
            continue
        name = json.loads(mm.group('name'))
        if strong(name) in kt.get(cc, set()) and float(mm.group('rating')) == 0 and int(mm.group('priceEur')) == 0:
            removed.append((city, name))
            lines[i] = None
    out = '\n'.join(l for l in lines if l is not None)
    if not dry:
        io.open(REC, 'w', encoding='utf-8').write(out)
    for c, n in removed:
        print(f'  删除 [{c}] "{n}"(KT 报价库已有,保留那边)')
    print(f'共删除 {len(removed)} 条')


if __name__ == '__main__':
    main()
