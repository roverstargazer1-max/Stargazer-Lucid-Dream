---
# title：文章标题，可随时修改。
title: {{ title }}
# date：发表时间，例如 2026-10-21 12:00:00；影响显示和时间排序。
date: {{ date }}

# subheading：旧版列表副标题，可写文字或 HTML；留空不显示。
subheading: ""
# tags：标签，例如 [随笔, 生活]；不填保留 []。
tags: []
# categories：分类，例如 [生活, 随笔] 表示逐级分类；不填保留 []。
categories: []

# cover：旧版封面及新版分享图片，例如 /image/covers/sky.webp；不改变新版正文底图。
cover: ""
# cover_mobile：旧版窄屏封面；留空沿用 cover。
cover_mobile: ""

# related：关联文章的文件名，不含 .md，例如 [随笔1]；自动双向，无关联用 []。
related: []

# star：新版星空选项；不填写时为普通星，参与探索。
star:
  # star.rank：博客星等：ordinary（普通）、important（重要）、treasured（珍藏）。
  rank: ordinary
  # star.isolated：true 不生成自动探索路径或时间连线，手填关联仍保留；默认 false。
  isolated: false

# starry_excerpt：新版描述摘要：留空自动提取正文，手写优先，清空恢复自动；不控制旧版列表摘要。
starry_excerpt: ""
# starry_excerpt_generated：程序维护的摘要状态，无需手改；true 自动提取，false 手写。
starry_excerpt_generated: true
---
