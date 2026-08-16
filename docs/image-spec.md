# 图片规范（城市库 · 国家/城市/景点图）

> 适用范围：`public/images/` 下供「城市库」页面使用的三类图片。
> 目标：让网页**即时加载**（体积小、尺寸适中），且文件名能精确命中数据里的 id。

## 一、目录与命名

| 类别 | 目录 | 文件名 | 示例 |
|---|---|---|---|
| 国家封面 | `public/images/countries/` | `<国家id>.jpg` | `united-kingdom.jpg` |
| 城市图 | `public/images/cities/` | `<城市id>.jpg` | `manchester.jpg` |
| 景点图 | `public/images/attractions/` | `<景点id>.jpg` | `eiffel.jpg` |

- **id 一律小写**，与 `src/data/europe-travel.json` 里的 `country.id / city.id / attraction.id` 完全一致（含大小写）。
- 扩展名统一为 `.jpg`（JPEG）。
- 文件名里的 id 若出现大写（如 `Manchester.jpg`）必须改成小写，否则部署到 Linux 或大小写敏感环境会 404。

## 二、尺寸与质量

| 类别 | 长边上限 | JPEG 质量 | 竖图处理 |
|---|---|---|---|
| 国家封面 | **1200 px** | **75** | 竖图中心裁剪到 4:3 |
| 城市图 | **1600 px** | **80** | 竖图中心裁剪到 3:2 |
| 景点图 | **1600 px** | **80** | 竖图中心裁剪到 3:2 |

- 横图（宽 ≥ 高）：**保持原始比例**，仅把长边缩到上限（页面用 `object-cover` 自适应裁剪显示）。
- 竖图（高 > 宽）：先**中心裁剪**成横图（国家 4:3、城市/景点 3:2），再缩放，避免竖图在横版卡片/Hero 里被裁得只剩一条。
- 体积不做单独硬性规定：由「长边 + 质量」决定，处理后通常国家 200–420 KB、城市/景点 300–800 KB，配合页面的懒加载即可即时呈现。

## 三、自动化脚本

脚本：`scripts/normalize-images.mjs`（零依赖，用 macOS 自带 `sips`）。

```bash
npm run images:check    # 只检查 + 报告，不改文件
npm run images:fix      # 检查并自动处理（重命名/裁剪/缩放/压缩）
npm run images:watch    # 后台监听 public/images，新增图片自动处理
```

**每次新增图片后**，跑一次 `npm run images:fix` 即可自动把新图处理到符合规范；或起一个 `npm run images:watch` 让它常驻自动处理。

### 脚本会做什么
1. 扫描三个目录下的所有图片（jpg/jpeg/png/webp/gif/heic/tif）。
2. 对每张图检查：
   - 文件名 id 是否存在且小写（孤儿/大小写错误会报告并在 fix 时重命名）；
   - 长边是否超上限（超了会缩放）；
   - 是否竖图（竖图会中心裁剪成横图）；
   - 格式/质量（统一转 JPEG 并压缩到目标质量）。
3. 处理过程输出到临时文件、成功后原子替换，不会损坏原图。

## 四、手动处理（不想用脚本时）

以一张 6000×4000、4MB 的城市图 `Manchester.jpg` 为例：

```bash
# 1) 重命名为小写 id（两步，避免大小写不敏感文件系统的问题）
mv Manchester.jpg __tmp.jpg && mv __tmp.jpg manchester.jpg

# 2) 缩放到长边 1600 + 压缩到 q80（横图保持比例）
sips -Z 1600 -s format jpeg -s formatOptions 80 manchester.jpg --out manchester.jpg

# 竖图额外先中心裁剪到 3:2（cropH = 宽 × 2/3）
sips -c <cropH> <宽> in.jpg --out tmp.jpg
```
