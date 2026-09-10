#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""去重：把同一城市内重复的酒店条目合并为一条（保留信息最全的，字段取并集）。
仅处理「单行」紧凑条目；重复判定用 strong 归一化（去掉 hotel/hotell/the/spa 等通用词）。
用法: python3 scripts/dedupe-hotels-2026-09.py [--dry]
"""
import io
import json
import re
import sys

PATH = 'src/data/hotel-recommendations.js'
GENERIC = {'hotel', 'hotell', 'the', 'by', 'bw', 'spa', 'resort', 'inn', 'apartments',
           'apartment', 'studios', 'studio', 'home', 'homes', 'house', 'collection',
           'hostel', 'motel', 'quality', 'first', 'plus'}
LINE_RE = re.compile(
    r'^(?P<indent>\s*)\{ name: (?P<name>".*?"), nameZh: (?P<nameZh>".*?"), '
    r'star: (?P<star>\d+), rating: (?P<rating>[\d.]+), priceEur: (?P<priceEur>\d+), '
    r'area: (?P<area>".*?"), near: (?P<near>".*?"), ratingSource: (?P<ratingSource>".*?"), '
    r'sources: (?P<sources>\[.*?\]), address: (?P<address>".*?"), chain: (?P<chain>".*?"), '
    r'note: (?P<note>".*?") \},$'
)


def strong(name):
    t = name.lower()
    t = re.sub(r'[^a-z0-9\s]', ' ', t)
    words = [w for w in t.split() if w and w not in GENERIC]
    return ''.join(words)


def load_str(v):
    try:
        return json.loads(v)
    except Exception:
        return v.strip('"')


def dump_str(v):
    return json.dumps(v, ensure_ascii=False)


def main():
    dry = '--dry' in sys.argv
    lines = io.open(PATH, encoding='utf-8').read().split('\n')
    city_re = re.compile(r'^\s*"([a-z0-9-]+)": \{$')
    city = None
    groups = {}  # (city, key) -> [line_index,...]
    for i, ln in enumerate(lines):
        m = city_re.match(ln)
        if m:
            city = m.group(1)
            continue
        if LINE_RE.match(ln):
            nm = json.loads(LINE_RE.match(ln).group('name'))
            groups.setdefault((city, strong(nm)), []).append(i)

    dup_groups = {k: v for k, v in groups.items() if len(v) > 1}
    removed = 0
    for (cty, key), idxs in sorted(dup_groups.items()):
        parsed = [LINE_RE.match(lines[i]).groupdict() for i in idxs]
        # 选保留项：字段最全（非空计数），并列取名字最长
        def richness(p):
            n = sum(1 for f in ('nameZh', 'area', 'near', 'ratingSource', 'note') if load_str(p[f]))
            n += (1 if int(p['star']) else 0) + (1 if float(p['rating']) else 0) + (1 if int(p['priceEur']) else 0)
            n += 1 if load_str(p['sources']) else 0
            return n
        order = sorted(range(len(parsed)), key=lambda j: (richness(parsed[j]), len(load_str(parsed[j]['name']))), reverse=True)
        keep = order[0]
        kp = parsed[keep]
        merged = {f: kp[f] for f in ('star', 'rating', 'priceEur', 'address', 'chain')}
        # 文本字段取最长非空
        for f in ('nameZh', 'area', 'near', 'ratingSource', 'note'):
            vals = [load_str(p[f]) for p in parsed if load_str(p[f])]
            merged[f] = dump_str(max(vals, key=len) if vals else '')
        # 名称取最长
        merged['name'] = dump_str(max((load_str(p['name']) for p in parsed), key=len))
        # 数值取最大（star/rating/priceEur）
        merged['star'] = str(max(int(p['star']) for p in parsed))
        merged['rating'] = str(max(float(p['rating']) for p in parsed))
        merged['priceEur'] = str(max(int(p['priceEur']) for p in parsed))
        # sources 并集
        src, seen = [], set()
        for p in parsed:
            for u in load_str(p['sources']):
                if u not in seen:
                    seen.add(u)
                    src.append(u)
        merged['sources'] = json.dumps(src, ensure_ascii=False)
        new_line = ('      {{ name: {name}, nameZh: {nameZh}, star: {star}, rating: {rating}, '
                    'priceEur: {priceEur}, area: {area}, near: {near}, ratingSource: {ratingSource}, '
                    'sources: {sources}, address: "", chain: "", note: {note} }},').format(**merged)
        keep_idx = idxs[keep]
        print(f'[{cty}] 合并 {len(idxs)} 条 → 保留 "{load_str(merged["name"])}"  (删除 {len(idxs)-1} 行)')
        for j, i in enumerate(idxs):
            if j == keep:
                lines[i] = new_line
            else:
                lines[i] = None
                removed += 1
    out = '\n'.join(l for l in lines if l is not None)
    if not dry:
        io.open(PATH, 'w', encoding='utf-8').write(out)
    print(f'重复组 {len(dup_groups)}，删除重复行 {removed}')


if __name__ == '__main__':
    main()
