---
# 文章标题：自动使用创建命令中的标题，可随时修改。
title: {{ title }}
# 发布时间：自动使用创建时间；影响日期显示和时间排序。
date: {{ date }}

# 旧版列表的副标题，可填写文字或 HTML；留空不显示。
subheading: ""
# 标签：留空保留 []；示例 [随笔, 生活]。
tags: []
# 分类：留空保留 []；示例 [随笔]。多个列表项表示逐级分类。
categories: []

# 旧版列表和文章页的封面；留空使用旧版默认背景，不会自动选图。
# 示例 /image/covers/sky.webp，对应 source/image/covers/sky.webp。
# 新版星空与正文底图不受此字段影响。
cover: ""
# 旧版列表在窄屏使用的可选封面；留空沿用 cover。
cover_mobile: ""

# 新版文章关联：引用 source/_posts/ 中的文件名，不含 .md，不会自动猜测关联。
# 每对文章只写一次，自动双向；理由可不填。无关联时保留 []。
# 有关联时将下一行替换为：
# related:
#   - post: 另一篇文章的文件名
#     reason: 可选的关联理由
related: []

# 新版星空配置：默认是一颗普通、参与探索的文章星。
# rank 可选 ordinary（普通）、important（重要）、treasured（珍藏）。
# isolated 设为 true 时不生成空间探索路径和时间连线，手填的 related 仍保留。
star:
  rank: ordinary
  isolated: false

# 新版描述元信息：默认在预览/构建时自动提取正文，不是旧版列表摘要。
# 要手写摘要：填写 starry_excerpt，并将 starry_excerpt_generated 改为 false。
# 文章身份、原链接和星位同样由预览/构建自动维护，不需要手填。
starry_excerpt: ""
starry_excerpt_generated: true
---
