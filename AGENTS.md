# Repository instructions

## Context7

<!-- context7 -->
Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service — even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer — your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

### Steps

1. Always start with `resolve-library-id` using the library name and what to look up in the library's documentation, unless the user provides an exact library ID in `/org/project` format.
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version.
3. `query-docs` with the selected library ID and what to look up in the library's documentation (not single words), scoped to a single concept. If the question spans multiple distinct concepts (e.g. routing and auth and caching), make a separate `query-docs` call per concept with the same library ID, unless the question is about how the concepts interact — combined queries dilute ranking and return shallow results for each topic.
4. Answer using the fetched docs.
<!-- context7 -->

## Agent skills

### Issue tracker

Issues and specs are local Markdown files under `.scratch/<feature>/`; use [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) for paths, status and operations.

### Triage labels

Use the five default triage role strings defined in [docs/agents/triage-labels.md](docs/agents/triage-labels.md).

### Domain docs

Use the single-context layout: root `CONTEXT.md` and `docs/adr/`. Read [docs/agents/domain.md](docs/agents/domain.md) before domain exploration.

## 星空改版设计

处理星空博客的设计、拆票或实现时，先读 [docs/design/starry-blog.md](docs/design/starry-blog.md)。遵循其中已确认的决定，并保留“待整体复核”的默认规则状态；工程技能配置不代表这些规则已经获批。
