# 星空博客开发资料

整理日期：2026-10-10。此目录的日常入口集中在下表；早期原型、想法、截图与旧工单已移入 [历史归档](archive/README.md)。

| 内容 | 入口 |
| --- | --- |
| 当前设计与后续明确更新 | [设计主文档](../../docs/design/starry-blog.md) |
| 新增星图与文章检索设计、底图候选 | [检索设计记录](../starry-search/spec.md)（设计中，未实现） |
| 作者确认的个人站点范围 | [正式化计划](theme-production-plan.md)、[访谈](theme-planning.md) |
| 本地实现进展与验证边界 | [实施记录](implementation-progress.md) |
| 写作、双主题预览与发布 | [操作指南](../../docs/operations/starfield-blog.md) |
| 有效验证结论、摘要及复测代码 | [验证资料](evidence/README.md) |
| Kira 配置和旧工作区恢复资料 | [基线目录](baselines/)、[恢复指南](../../docs/operations/legacy-blog-recovery.md) |
| 历史规格、工单、原型与美术试验 | [归档索引](archive/README.md) |

当前默认输出为新版 `/` 与旧版 `/legacy/`；真实博客预览使用 4175。V20 模拟原型仍独立保存在 `themes/hexo-theme-kira/prototypes/starfield/`，使用 4173，启动方式见 [原型说明](../../themes/hexo-theme-kira/prototypes/starfield/README.md)。

真实文章、保存星位、正式主题素材与根 `tests/` 继续在各自原目录维护。验证脚本按对应日期放在 `evidence/` 中，与结论和摘要一起查找；从仓库根目录执行文档中的复测命令。

## 仍需验证

- 真实触屏设备上的手势与滚动隔离，历史 [07 工单](archive/issues/07-modes-history-interruption.md) 的未勾选项继续保留。
- Netlify 云构建、Deploy Preview、正式域名深链接及上线后的旧版切换，按当前操作指南执行。归档 [15 工单](archive/issues/15-netlify-release-and-rollback.md) 的旧校准依赖不再扩大个人站点范围。
- 第三方音频成功播放，以及此前记录中仍待作者查看的视觉效果。

## 资料维护

新需求按当前设计与正式化计划处理；旧的公开模板和场景校准规格仅供回顾。历史工单 01–18 的编号、原状态与讨论保留在 `archive/issues/`；下次需要新工单时使用活动路径 `issues/19-<slug>.md`，不复用旧编号。

本次移动与删除清单见 [整理清单](archive/cleanup-20261010.json)及[整理记录](archive/cleanup-20261010.md)。作者已于 2026-10-10 确认删除并提交；34 份过期日志和 15 份重复草稿已物理删除，07 的不同验收措辞草稿与全部正式工单继续归档保留。
