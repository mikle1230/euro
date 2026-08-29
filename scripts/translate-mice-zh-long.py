#!/usr/bin/env python3
"""MICE 长文本翻译脚本：翻译 description（活动介绍）+ tourProgramExample（行程示例）。
用法：python3 scripts/translate-mice-zh-long.py [--only-description]
输出合并进 src/data/mice-zh.js（保留已有 titles/cities/subCategories）。
"""
import json, re, sqlite3, sys, time, urllib.request, argparse

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

def translate_long(items, system, max_tokens=8000, batch=4):
    """items: [(key, long_text)]。长文本按 [n] 标记分块，模型按 [n] 输出译文。
    返回 {key: 中文译文}。"""
    if not items: return {}
    out = {}
    total = (len(items) + batch - 1) // batch
    for bi in range(0, len(items), batch):
        batch_items = items[bi:bi+batch]
        # 组装：每条用 [序号] 包裹（防止长文本内出现 || 干扰）
        blocks = []
        for i, (k, t) in enumerate(batch_items):
            blocks.append(f"[{i+1}]\n{t}")
        prompt = (
            "把下面每条文本完整翻译成简体中文（旅游行业用语，保留数字/品牌名/网址不译）。\n"
            "输出格式：每条以 `[序号]` 开头，后面跟该条的完整中文译文，逐条对应。\n"
            "必须逐条完整翻译，不要省略任何句子。\n\n"
            + "\n\n".join(blocks)
        )
        body = json.dumps({
            "model": "deepseek-chat",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.2,
            "max_tokens": max_tokens,
        }).encode()
        req = urllib.request.Request(URL, data=body, headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {KEY}",
        })
        got = {}
        for attempt in range(4):
            try:
                with urllib.request.urlopen(req, timeout=300) as resp:
                    data = json.loads(resp.read())
                content = data["choices"][0]["message"]["content"]
                # 解析 [n] 分块
                parts = re.split(r'\[\s*(\d+)\s*\]', content)
                # parts: ['', '1', '译文1', '2', '译文2', ...]
                for j in range(1, len(parts) - 1, 2):
                    try:
                        idx = int(parts[j].strip()) - 1
                        text = parts[j+1].strip()
                        if 0 <= idx < len(batch_items) and text:
                            got[batch_items[idx][0]] = text
                    except (ValueError, IndexError):
                        continue
                if got: break
                if attempt == 3:
                    print(f"  ⚠️ 批 {bi//batch+1}/{total} 解析失败，原文前 100: {content[:100]!r}", flush=True)
            except Exception as e:
                if attempt == 3:
                    print(f"  ⚠️ 批 {bi//batch+1}/{total} 请求失败: {e}", flush=True)
                time.sleep(5)
        for k, _ in batch_items:
            if k in got: out[k] = got[k]
        ok = len(got)
        print(f"  批 {bi//batch+1}/{total}: {ok}/{len(batch_items)} ✅" if ok == len(batch_items) else f"  批 {bi//batch+1}/{total}: {ok}/{len(batch_items)}（漏 {len(batch_items)-ok}）", flush=True)
        sys.stdout.flush()
        time.sleep(0.5)
    return out

# ---- 收集 ----
src = open('src/data/mice-activities.js').read()
arr = json.loads(re.search(r'export default\s*(\[.*\])\s*;?\s*$', src, re.S).group(1))

parser = argparse.ArgumentParser()
parser.add_argument('--only-description', action='store_true')
args = parser.parse_args()

desc_items = [(a['id'], a['description']) for a in arr if (a.get('description') or '').strip()]
prog_items = [(a['id'], a['tourProgramExample']) for a in arr if (a.get('tourProgramExample') or '').strip()]
# 超长行程示例（>8000 字符）单独处理：分块翻译
prog_long = [(k, t) for k, t in prog_items if len(t) > 8000]
prog_normal = [(k, t) for k, t in prog_items if len(t) <= 8000]

print(f"description {len(desc_items)} 条 · tourProgram 常规 {len(prog_normal)} 条 + 超长 {len(prog_long)} 条", flush=True)

desc_zh = {}
prog_zh = {}

print("翻译 description...", flush=True)
desc_zh = translate_long(desc_items, "你是旅游行业翻译，把欧洲活动介绍完整翻译成简体中文，保留数字/品牌/网址，不要省略内容。")
print(f"✅ description 完成 {len(desc_zh)}/{len(desc_items)}", flush=True)

if not args.only_description:
    print("翻译 tourProgramExample（常规）...", flush=True)
    prog_zh.update(translate_long(prog_normal, "你是旅游行业翻译，把活动行程示例完整翻译成简体中文，保留时间/数字/地名，不要省略内容。"))
    print(f"✅ tourProgram 常规完成 {len([k for k in prog_zh if k in dict(prog_normal)])}/{len(prog_normal)}", flush=True)

    if prog_long:
        print(f"处理 {len(prog_long)} 条超长行程示例（分块）...", flush=True)
        for k, t in prog_long:
            # 分块：每块 ~6000 字符
            chunks = [t[i:i+6000] for i in range(0, len(t), 6000)]
            translated_parts = []
            ok_all = True
            for ci, ch in enumerate(chunks):
                r = translate_long([(f"{k}#{ci}", ch)], "你是旅游行业翻译，把活动行程示例片段完整翻译成简体中文，保留数字/地名，不要省略。")
                if r: translated_parts.append(r[f"{k}#{ci}"])
                else: ok_all = False; break
            if ok_all and translated_parts:
                prog_zh[k] = "\n\n".join(translated_parts)
            print(f"  超长 {k[:20]}... {'✅' if ok_all else '⚠️ 部分失败'}", flush=True)
        print(f"✅ tourProgram 超长完成 {len([k for k in prog_zh if k in dict(prog_long)])}/{len(prog_long)}", flush=True)

# ---- 合并进 mice-zh.js ----
zh_path = 'src/data/mice-zh.js'
zh_src = open(zh_path).read()
# 读出现有 MICE_ZH 对象
m = re.search(r'export const MICE_ZH = (\{.*\})\s*;?\s*$', zh_src, re.S)
existing = {}
if m:
    # 用 node 解析现有对象比较稳，但这里用简单的 JSON 提取
    # 直接重写整个文件更安全：保留 titles/cities/subCategories 从旧文件读取
    pass

# 重新生成完整文件（保留已有映射）
old = {}
try:
    import subprocess
    r = subprocess.run(['node', '--input-type=module', '-e',
        "import { MICE_ZH } from './src/data/mice-zh.js'; console.log(JSON.stringify(MICE_ZH))"],
        capture_output=True, text=True, cwd='.')
    old = json.loads(r.stdout.strip().split('\n')[-1])
except Exception as e:
    print(f"读取现有映射失败: {e}", flush=True)

# 合并
titles = {**old.get('titles', {}), **desc_zh}  # 占位，下面分开写
final = {
    'titles': old.get('titles', {}),
    'cities': old.get('cities', {}),
    'subCategories': old.get('subCategories', {}),
    'descriptions': {**old.get('descriptions', {}), **desc_zh},
    'tourPrograms': {**old.get('tourPrograms', {}), **prog_zh},
}

out_lines = [
    "// MICE 数据中文映射（由 scripts/translate-mice-zh.py / translate-mice-zh-long.py 生成，勿手改）",
    "// 与 mice-activities.js（英文原文）配合使用：详情/列表渲染中英对照，搜索纳入中文字段",
    "export const MICE_ZH = {",
    "  titles: " + json.dumps(final['titles'], ensure_ascii=False, indent=1).replace('\n', '\n  ') + ",",
    "  cities: " + json.dumps(final['cities'], ensure_ascii=False, indent=1).replace('\n', '\n  ') + ",",
    "  subCategories: " + json.dumps(final['subCategories'], ensure_ascii=False, indent=1).replace('\n', '\n  ') + ",",
    "  descriptions: " + json.dumps(final['descriptions'], ensure_ascii=False, indent=1).replace('\n', '\n  ') + ",",
    "  tourPrograms: " + json.dumps(final['tourPrograms'], ensure_ascii=False, indent=1).replace('\n', '\n  ') + ",",
    "}",
    "",
]
open(zh_path, 'w').write("\n".join(out_lines))
print(f"✅ 已更新 src/data/mice-zh.js（descriptions {len(final['descriptions'])} · tourPrograms {len(final['tourPrograms'])}）", flush=True)
