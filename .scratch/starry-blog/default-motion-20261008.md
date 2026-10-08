# 默认镜头推进与隐藏动效选择

日期：2026-10-08。作者要求默认镜头推进，保留轻过渡逻辑供以后简单改回，并删除界面中的方式选择；完成后按改动内容提交当前工作区的全部修改。

本主题 `_config.yml` 新增 `scene.motion: full`，模板将它输出为 `data-default-motion`。窗边控制器和星空读取同一模式，原来的 `entry-motion`、`motion-toggle` 两个按钮及绑定、专属样式已删除。现有轻过渡路径、`createRoom().setSoft()`、开发用 `?motion=soft`／`?motion=full` 覆盖保留。以后把配置值改为 `soft` 并重新生成，即可启用轻过渡。

实际页面验证桌面及手机默认都是 `full`，窗边与星空均无切换入口，推进途中显示三维变换，完整进入和回到窗边成功，正文仍可打开与关闭。系统减少动态环境下也采用作者设定的默认 `full`。将页面输出的配置属性临时设为 `soft`，验证短过渡进出窗边及静态剪影回退；URL 覆盖也成功启用 `soft`。全部场景控制台无运行错误，见[浏览器检查](evidence/default-motion-20261008/checks.json)。

截图：[桌面窗边](evidence/default-motion-20261008/desktop-full-room.png)、[桌面星空](evidence/default-motion-20261008/desktop-full-sky.png)、[手机窗边](evidence/default-motion-20261008/mobile-full-room.png)、[手机星空](evidence/default-motion-20261008/mobile-full-sky.png)。

Node 22.19.0、npm 10.9.3 下，26 项现有检查通过，预览及正式主题构建各生成 149 个文件；`git diff --check` 通过。前序声波、人物连续步行、方位入口移除、面板下移与本次默认动效按五组提交。预览位于 <http://127.0.0.1:4175/>。
