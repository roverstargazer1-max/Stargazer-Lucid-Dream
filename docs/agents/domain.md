# Domain docs

本仓库采用 **single-context** 布局。现有 `pnpm-workspace.yaml` 只有依赖构建设置，没有多包上下文，不据此建立多上下文文档。

## 探索前按需读取

1. 仓库根目录的 `CONTEXT.md`：领域术语与上下文。
2. 根目录 `docs/adr/` 中与当前改动有关的决策。
3. 星空改版相关任务还需读取 [docs/design/starry-blog.md](../design/starry-blog.md)，区分已确认设计与待复核规则。

`CONTEXT.md` 或 ADR 不存在时，直接继续，不将其缺失当作阻塞或建议预先创建空文档。由 `domain-modeling` 等技能在实际确定术语或决策时按需创建。

## 布局

```text
CONTEXT.md
docs/
  adr/
    0001-<decision-slug>.md
  design/
    starry-blog.md
```

现有 `.gitignore` 将 `CONTEXT.md` 视为本地文档；本设置沿用该约定。配置文件、工单与 ADR 不因本地 Markdown 工作流而自动加入忽略列表。

## 使用约定

- 工单标题、设计说明、假设和测试名称使用 `CONTEXT.md` 定义的术语，遵守其中明确避免的同义词。
- 需要的新概念不在词汇表时，先判断是否必要；实际存在的术语缺口交给 `domain-modeling` 补齐。
- 提案与已有 ADR 冲突时，明确引用该 ADR 并说明重新讨论的理由，不静默覆盖决策。
- 当前只配置读取规则和路径，不创建 `CONTEXT-MAP.md`，也不编造领域术语或 ADR。
