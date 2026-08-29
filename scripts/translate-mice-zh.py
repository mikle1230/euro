#!/usr/bin/env python3
"""MICE 数据中文翻译脚本 v2：批量翻译标题/城市/子类目，输出 mice-zh.js 映射文件。
用法：python3 scripts/translate-mice-zh.py
- 用纯文本行格式（`key|译文`），不用 json_object（解析更稳）
- key 直接用原始 id/城市名，避免索引错位
- 不修改 mice-activities.js（脚本生成文件），只生成独立中文映射
"""
import json, re, sqlite3, sys, time, urllib.request

def get_deepseek_key():
    db = sqlite3.connect('/Users/michael/.openclaw/agents/main/agent/openclaw-agent.sqlite')
    cur = db.cursor()
    cur.execute("SELECT store_json FROM auth_profile_store LIMIT 1")
    row = cur.fetchone()
    if not row: raise SystemExit("auth store 为空")
    data = json.loads(row[0])
    prof = data.get('profiles', {}).get('deepseek:default', {})
    key = prof.get('key')
    if not key: raise SystemExit("未找到 deepseek key")
    return key

KEY = get_deepseek_key()
URL = "https://api.deepseek.com/chat/completions"

def llm_translate(items, system):
    """items: [(key, text)]，返回 {key: 译文}。纯文本行格式，key 直配。"""
    if not items: return {}
    out = {}
    BATCH = 30
    total_batches = (len(items) + BATCH - 1) // BATCH
    for bi in range(0, len(items), BATCH):
        batch = items[bi:bi+BATCH]
        lines = "\n".join(f"{k}||{t}" for k, t in batch)  # 双竖线分隔，避免标题内含 |
        prompt = (
            "把以下每条翻译成简体中文（旅游行业用语，地名/专有名词用通用译名）。\n"
            "输出格式：每行 `key||译文`，key 原样保留，逐条对应，不要输出其他内容。\n\n"
            + lines
        )
        body = json.dumps({
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": 6000,
        }).encode()
        req = urllib.request.Request(URL, data=body, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {KEY}",
        })
        got = {}
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=120) as resp:
                    data = json.loads(resp.read())
                content = data["choices"][0]["message"]["content"]
                # 解析 `key||译文` 行（可能包裹在 ``` 或 JSON 里，逐行找）
                for line in content.splitlines():
                    line = line.strip().rstrip(',')
                    m = re.match(r'^"?([^"|]+?)\|\|(.+?)"?$', line)
                    if m:
                        k, v = m.group(1).strip(), m.group(2).strip().strip('"')
                        if v: got[k] = v
                if got: break
                if attempt == 3:
                    print(f"  ⚠️ 批次 {bi//BATCH+1}/{total_batches} 解析失败，原文: {content[:120]!r}")
            except Exception as e:
                if attempt == 3:
                    print(f"  ⚠️ 批次 {bi//BATCH+1}/{total_batches} 请求失败: {e}")
                time.sleep(3)
        # 合并
        for k, _ in batch:
            if k in got: out[k] = got[k]
        if len(got) < len(batch):
            print(f"  批次 {bi//BATCH+1}/{total_batches}: {len(got)}/{len(batch)} 成功（漏 {len(batch)-len(got)}）")
        else:
            print(f"  批次 {bi//BATCH+1}/{total_batches}: {len(got)}/{len(batch)} ✅")
        sys.stdout.flush()
        time.sleep(0.4)
    return out

# ---- 收集数据 ----
src = open('src/data/mice-activities.js').read()
arr_match = re.search(r'export default\s*(\[.*\])\s*;?\s*$', src, re.S)
activities = json.loads(arr_match.group(1))

title_items = [(a['id'], a['title']) for a in activities if a.get('title')]
city_set = sorted({a['city'] for a in activities if a.get('city')})
city_items = [(c, c) for c in city_set]
sub_set = sorted({s.strip() for a in activities for s in (a.get('subCategoryForActivity') or '').split(';#') if s.strip()})
sub_items = [(s, s) for s in sub_set]

print(f"标题 {len(title_items)} 条（{len(title_items)//30+1} 批） / 城市 {len(city_set)} 个 / 子类目 {len(sub_set)} 个", flush=True)

# ---- 翻译 ----
print("翻译标题...", flush=True)
title_zh = llm_translate(title_items, "你是旅游行业翻译，把欧洲活动标题翻译成简体中文，简洁准确，保留品牌名。")
print(f"✅ 标题完成 {len(title_zh)}/{len(title_items)}", flush=True)

print("翻译城市...", flush=True)
city_zh = llm_translate(city_items, "你是旅游行业翻译，把欧洲城市名翻译成简体中文通用译名（如 Salzburg→萨尔茨堡、Aarhus→奥胡斯）。")
print(f"✅ 城市完成 {len(city_zh)}/{len(city_set)}", flush=True)

print("翻译子类目...", flush=True)
sub_zh = llm_translate(sub_items, "你是旅游行业翻译，把活动子类目翻译成简体中文（如 Wine Experience→葡萄酒体验）。")
print(f"✅ 子类目完成 {len(sub_zh)}/{len(sub_set)}", flush=True)

# ---- 合并 curated-cities（人工权威表覆盖 AI 翻译）----
try:
    curated_src = open('scripts/curated-cities.cjs').read()
    pairs = re.findall(r"\['([^']+)', '([^']+)'\]", curated_src)
    for zh, en in pairs:
        city_zh[en] = zh  # curated 人工表优先
    print(f"✅ 合并 curated-cities {len(pairs)} 条", flush=True)
except Exception as e:
    print(f"curated 合并跳过: {e}", flush=True)

# ---- 生成映射文件 ----
out_lines = [
    "// MICE 数据中文映射（由 scripts/translate-mice-zh.py 生成，勿手改）",
    "// 与 mice-activities.js（英文原文）配合使用：详情/列表渲染中英对照，搜索纳入中文字段",
    "export const MICE_ZH = {",
    "  titles: " + json.dumps(title_zh, ensure_ascii=False, indent=1).replace('\n', '\n  ') + ",",
    "  cities: " + json.dumps(city_zh, ensure_ascii=False, indent=1).replace('\n', '\n  ') + ",",
    "  subCategories: " + json.dumps(sub_zh, ensure_ascii=False, indent=1).replace('\n', '\n  ') + ",",
    "}",
    "",
]
open('src/data/mice-zh.js', 'w').write("\n".join(out_lines))
print(f"✅ 已生成 src/data/mice-zh.js（标题 {len(title_zh)} · 城市 {len(city_zh)} · 子类目 {len(sub_zh)}）", flush=True)
