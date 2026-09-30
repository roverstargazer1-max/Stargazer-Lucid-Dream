# Issue tracker: Local Markdown

本仓库的需求、规格和工单使用本地 Markdown 文件记录。远程仓库存在于 GitHub，但本工作流以本地文件为工单来源；“发布工单”表示写文件，不表示创建 GitHub Issue。

## 文件约定

- 一个功能一个目录：`.scratch/<feature-slug>/`。
- 功能规格：`.scratch/<feature-slug>/spec.md`。
- 实施工单：`.scratch/<feature-slug>/issues/<NN>-<slug>.md`，从 `01` 编号，一张工单一个文件。
- 路径均相对于仓库根目录。已有编号保持稳定；创建新工单时使用该功能目录内下一个未使用编号。
- 普通工单在顶部用 `Status:` 记录分诊角色，取值见 [triage-labels.md](triage-labels.md)。
- `State: open` 或 `State: closed` 单独记录工单是否关闭；完成实现或决定不处理时关闭工单，并记录原因。
- 分诊过的工单用 `Category: bug` 或 `Category: enhancement` 记录分类，且只有一个当前分诊状态。
- 评论与讨论追加在 `## Comments` 下；保留原有讨论内容。

示例结构：

```markdown
# 工单标题

Status: needs-triage
State: open
Category: enhancement

## Description

问题、目标与范围。

## Acceptance criteria

可检查的完成条件。

## Comments
```

目录与文件在需要规格或工单时再创建；配置阶段不生成空规格或虚构任务。

## 技能操作的本地含义

- **Publish to the issue tracker**：创建相应规格或独立工单文件；更新已有项时修改原文件。
- **Fetch the relevant ticket**：读取用户给出的路径。裸编号只有在当前功能目录明确时才能解析；重名时先确定所属功能。
- **List issues**：列出对应 `.scratch/` 目录的工单，读取状态、分类与关闭标记。
- **Apply a triage label**：按角色映射更新 `Status:`；分类写入 `Category:`。
- **Close an issue**：设为 `State: closed`，在评论记录完成或不处理的依据；保留文件。
- **Comment**：在 `## Comments` 下追加，沿用调用技能要求的日期、来源或 AI 标识。

## Wayfinder

Wayfinder 的探索工单使用自己的状态约定，不能与普通分诊工单的 `Status:` 混用。

- 地图：`.scratch/<effort>/map.md`，含 Notes、Decisions-so-far、Fog。
- 子工单：`.scratch/<effort>/issues/NN-<slug>.md`，从 `01` 开始。
- `Type:` 为 `research`、`prototype`、`grilling` 或 `task`，问题写在正文中。
- `Status:` 为 `open`、`claimed` 或 `resolved`；新探索工单为 `open`。
- `Blocked by: NN, NN` 指向同一 effort 目录中的前置工单；全部 `resolved` 后才解除阻塞。
- Frontier：按编号扫描，取第一个 `open` 且无未解决依赖的工单。
- Claim：开始工作前保存 `Status: claimed`。
- Resolve：在 `## Answer` 追加答案，保存 `Status: resolved`，并在地图 Decisions-so-far 中追加结论摘要和文件链接。

## 现有设计文档

星空博客当前设计主文档为 [docs/design/starry-blog.md](../design/starry-blog.md)。后续创建该功能的 `spec.md` 时，明确引用这份设计及其确认状态，避免维护两份独立漂移的设计正文。此次配置不迁移设计、不生成工单，也不改变待复核项的状态。
