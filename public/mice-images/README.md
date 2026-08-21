# MICE 活动图片目录

把活动图片按活动 id 命名放在这里（支持 .jpg / .png / .webp），页面自动显示：

  public/mice-images/<activityId>.jpg

活动 id 见列表页链接或 src/data/mice-activities.js 的 id 字段（如 mice-YWx0YXVzc2VlIHNhbHQgbWlu）。

批量配置：
ode scripts/mice-missing-images.js 可列出所有缺图活动（按国家分组），
把找到的图片按 id 重命名丢进本目录即可，无需改代码。
