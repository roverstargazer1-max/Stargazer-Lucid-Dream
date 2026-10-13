# Triage labels

本仓库采用默认分诊角色名称。普通本地工单通过顶部的 `Status:` 行保存当前角色。

| 技能中的角色 | 本仓库取值 | 含义 |
| --- | --- | --- |
| `needs-triage` | `needs-triage` | 等待维护者评估 |
| `needs-info` | `needs-info` | 等待补充信息 |
| `ready-for-agent` | `ready-for-agent` | 规格充分，可交给 Agent 实现 |
| `ready-for-human` | `ready-for-human` | 需要人工判断或实施 |
| `wontfix` | `wontfix` | 决定不处理 |

分类角色沿用 `bug` 和 `enhancement`，保存在 `Category:`。工单关闭标记和 Wayfinder 专用状态见 [issue-tracker.md](issue-tracker.md)。

后续需要更换词汇时修改此映射及对应记录，避免同一角色出现多套名称。
