# 合并内容、房间缓存与手机退出核查

日期：2026-10-21。审查原发布 `5360482`，对照开发分支末端 `31bc881`。

## 原合并结果

- `dd31f20` 的第一父提交至 `31bc881` 共 10 个新版提交，已全部包含在发布历史中。
- 发布与开发末端的完整文件差异只有本轮已确认的 6 个降级页相关文件；其余改动逐字节保留，包括去猫图片、两端统一房间、文末导航、云层裁切、星盘缓存、正文预热、星图旁注、筛选与索引入场。
- 请求 13 个被这些提交改动的运行资源，12 个线上响应与发布源文件完全一致。唯一例外是未带版本的房间图片 URL。
- 该 URL 响应的 SHA-256 与去猫前的图片一致，`cf-cache-status: HIT`，`age: 35340`，缓存策略为 `max-age=604800, stale-while-revalidate=86400`。
- 同一路径加 `?v=d79d9a54cf3480c0` 后为 CDN MISS，响应与源图、去猫提交、本地预览、生产输出一致，SHA-256 为 `d79d9a54cf3480c095e6e0eb8ffdcde320b89a9e6359d8d4b267a5a5d2d77268`。原因是旧图片缓存，不是图片漏合并。

原始核对摘要见 [merge-audit-summary.json](merge-audit-summary.json)。`audit-merge.py` 固定审查上述原发布；在后续发布后重跑时，新增的预期修改可能使线上响应与原发布产生差异。

## 本轮修复

- `starry_room_url` 从实际房间图片生成 SHA-256 的前 16 位，统一用于图片及预加载。原图片路径、图片内容与裁切不变；每次替换图片后自动更换请求版本。
- 手机宽度不超过 760px 时，原退出 PNG 位于星图面板左上 12px，点击区 44 × 44px；展开与收起 INDEX 后均可关闭。桌面仍在右上。
- 新增输出回归检查在修复前失败、修复后通过：图片及预加载必须请求同一个内容版本。
- `npm test`：98 项通过；`npm run build`：两个主题完整生成。
- 浏览器核对桌面、手机、320px 窄屏、740px 横屏及减少动态效果：图片响应与去猫提交一致；退出按钮可点击，不与标题重叠；切换 INDEX 后仍可退出，无脚本异常。详见 [ui-summary.json](ui-summary.json)。

手机按钮复现时相对面板的位置为 `(294, 496.75)`；修复后为 `(12, 12)`。

## 复核

```sh
python3 .scratch/starry-blog/evidence/release-audit-20261021/audit-merge.py
node .scratch/starry-blog/evidence/release-audit-20261021/verify-ui.mjs
```

浏览器脚本默认使用本机 Chromium，可用 `STARFIELD_BROWSER_PATH` 覆盖。设置 `STARFIELD_TEST_URL=https://blog.stargazer-luciddream.top` 可核对部署后的实际页面。截图及线上报告保留本地，不将本地检查等同于远程发布验收。
