# Euro 2026-09 更新批次 — Harness 启动指令

> 用途:开 Claude Code 后,把「📋 启动消息」段的内容作为第一句话发给 harness。
> 本文件只是存档备份;也可以直接让 harness 先读本文件再执行。

---

## 📋 启动消息(直接复制粘贴给 harness)

你正在 Euro Atlas 项目(/Users/michael/Projects/euro)执行 **2026-09 知识更新批次**。

第一步,通读以下文件,建立完整上下文后再动手:
1. `CLAUDE.md`(项目架构与全部开发规则,含用车/报价/酒店规则)
2. `docs/2026-09-update-masterlist.md` — **唯一权威任务清单**(A=代码改动,B=酒店数据,C/D/E=参考知识)
3. `docs/rules-log.md` — 既有待办挂账(🟡待集中修改/🛠️已实现)
4. `docs/2026-09-knowledge/` 目录 — 全部知识细节(北欧酒店清单、LDC 费率、合同台账、模板团、卢塞恩、冰岛停车费等 13 个文件)
5. 改动前再读对应源文件:`src/lib/ldc-mapping.js`、`src/lib/fx.js`、`src/lib/coach-plan.js`、`src/data/hotel-recommendations.js`、`src/data/coach-rules.js` 等

执行规则:
- 按 masterlist 顺序逐项做,不要一次全改完;每完成一项:跑相关测试(`npm test`),并在 `docs/rules-log.md` 对应条目标注 🛠️已实现
- 改代码只动任务要求的文件;无关优化不做
- 酒店补库(B 组)数据量大:按 masterlist 建议分批(冰岛→斯德哥尔摩→奥斯陆→哥本哈根→其余),每城核对"当前系统名"(北欧换牌多,存档里已注明)
- 参考情报(C/D/E 组:促销价/合同价/停车费)默认**只读参考**,除非 masterlist 明确要求编码,否则不要写进代码
- 遇到不确定(费率版本、供应商边界、数据歧义)就停下来问 Michael,不要猜

汇报格式:每项完成后给简短小结(改了什么文件/数据、测试结果);全部完成后给总清单(与 masterlist A-F 对照,✅/🛠️/未做+原因)。
