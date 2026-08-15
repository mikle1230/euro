#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""合并各研究子代理的 JSON 输出 → src/data/hotel-recommendations.js
用法: python3 scripts/merge-hotel-research.py <json1> <json2> ...
每个 JSON 格式: {"cities":[{"zh","en","country","cityCode","note","hotels":[{name,nameZh,star,rating,priceEur,area,near,ratingSource,sources}]}]}
"""
import json
import sys

def js(s):
    return json.dumps(s, ensure_ascii=False)

def main():
    files = sys.argv[1:]
    # 已验证的 QUOS 城市码（其余城市保留研究给出的 IATA 码；查询以城市名为主）
    QUOS_CODES = {
        'paris': 'PAR', 'marseille': 'MRS', 'nice': 'NCE', 'saint-tropez': 'JSZ',
        'genoa': 'GOA', 'rome': 'ROM', 'naples': 'NAP', 'palermo': 'PMO',
        'siracusa': 'QIC', 'taormina': 'TOX',
    }
    merged = {}
    for f in files:
        d = json.load(open(f, encoding='utf-8'))
        for c in d.get('cities', []):
            key = (c.get('en') or c.get('zh') or '').strip().lower().replace(' ', '-')
            if not key:
                continue
            hotels = []
            for h in c.get('hotels', []):
                hotels.append({
                    'name': h.get('name', ''),
                    'nameZh': h.get('nameZh', ''),
                    'star': int(h.get('star') or 0),
                    'rating': float(h.get('rating') or 0),
                    'priceEur': int(h.get('priceEur') or 0),
                    'area': h.get('area', ''),
                    'near': h.get('near', ''),
                    'ratingSource': h.get('ratingSource', 'Booking.com'),
                    'sources': h.get('sources', []),
                })
            merged[key] = {
                'name': c.get('zh', ''),
                'nameEn': c.get('en', ''),
                'country': c.get('country', ''),
                'cityCode': QUOS_CODES.get(key) or c.get('cityCode', ''),
                'note': c.get('note', ''),
                'hotels': hotels,
            }

    lines = []
    lines.append('// 酒店参考数据：静态库（Booking 评分/欧元参考价，非实时）')
    lines.append('// 数据来源：联网调研整理（booking.com / Google Hotels / TripAdvisor 等），仅供报价参考')
    lines.append('export default {')
    for key in sorted(merged):
        c = merged[key]
        lines.append(f"  {js(key)}: {{")
        lines.append(f"    name: {js(c['name'])}, nameEn: {js(c['nameEn'])}, country: {js(c['country'])}, cityCode: {js(c['cityCode'])}, note: {js(c['note'])}, hotels: [")
        for h in c['hotels']:
            lines.append('      {')
            for k in ('name', 'nameZh', 'star', 'rating', 'priceEur', 'area', 'near', 'ratingSource'):
                v = h[k]
                lines.append(f"        {k}: {js(v)}," if isinstance(v, str) else f"        {k}: {v},")
            lines.append(f"        sources: {js(h['sources'])}, address: '', chain: '',")
            lines.append('      },')
        lines.append('    ],')
        lines.append('  },')
    lines.append('}')
    out = '\n'.join(lines) + '\n'
    open('src/data/hotel-recommendations.js', 'w', encoding='utf-8').write(out)
    total = sum(len(c['hotels']) for c in merged.values())
    print(f'merged {len(merged)} cities, {total} hotels -> src/data/hotel-recommendations.js')

if __name__ == '__main__':
    main()
