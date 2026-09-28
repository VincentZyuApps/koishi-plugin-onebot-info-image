const pkg = require('../package.json')

const detailsStyle = 'margin:10px 0;border:1px solid var(--k-color-border, #909399);border-radius:8px;background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit);overflow:hidden;box-shadow:var(--k-card-shadow, 0 1px 3px rgb(0 0 0 / 12%));transition:var(--color-transition, border-color .2s ease, background-color .2s ease)'
const summaryStyle = 'padding:9px 12px;background:var(--k-hover-bg, rgba(127, 127, 127, .12));color:var(--k-text-dark, inherit);cursor:pointer;user-select:none'
const detailsBodyStyle = 'padding:4px 14px 10px;border-top:1px solid var(--k-color-divider, rgba(127, 127, 127, .28));background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit)'

export const usage = `
<h1>Koishi 插件：onebot-info-image 获取群员信息 渲染成图像</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-onebot-info-image" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-onebot-info-image?style=flat-square" alt="npm version">
  </a>
  <a href="https://npm-stat.com/charts.html?package=koishi-plugin-onebot-info-image" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-onebot-info-image?style=flat-square" alt="npm downloads">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-onebot-info-image" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-onebot-info-image" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://forum.koishi.xyz/t/topic/12077" target="_blank">
    <img src="https://img.shields.io/badge/Koishi%20Forum-12077-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white" alt="Forum">
  </a>
  <a href="https://qm.qq.com/q/ZN7fxZ3qCq" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="QQ群">
  </a>
</p>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了）</del></p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b style="color: #12B7F5;">1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<p><b>💡 提示：</b>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-onebot-info-image" target="_blank">
    前往 GitHub 查看完整图文 README →
  </a>
  &nbsp;|&nbsp;
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-onebot-info-image" target="_blank">
    Gitee 镜像 →
  </a>
</p>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #e74c3c;">⚙️ 前置与可选服务依赖</b></summary>
<div style="${detailsBodyStyle}">
<p><b>必需服务与依赖：</b></p>
<ul>
  <li><b style="color: #e74c3c;">http</b>：Koishi 内置网络请求服务，用于下载头像、公告配图与字体资源。<span style="color: #e74c3c; font-weight: bold;">【必需】</span></li>
  <li><b style="color: #f39c12;">@resvg/resvg-js</b>：轻量级 SVG 极速渲染引擎（npm 依赖），用于无需无头浏览器的纯原生图像渲染。<span style="color: #e74c3c; font-weight: bold;">【必需】</span></li>
</ul>
<p><b>可选服务扩展：</b></p>
<ul>
  <li><b style="color: #27ae60;">puppeteer</b>：基于 Chromium 的网页级图片渲染服务，启用 Puppeteer 渲染风格时需要。<span style="color: #27ae60;">【可选】</span></li>
  <li><b style="color: #27ae60;">notifier</b>：Koishi 控制台通知服务，用于在控制台顶部输出当前插件配置生效摘要。<span style="color: #27ae60;">【可选】</span></li>
  <li><b style="color: #27ae60;">console</b>：Koishi 控制台数据服务，用于 WebUI 样式卡片预览。<span style="color: #27ae60;">【可选】</span></li>
</ul>
<blockquote style="margin: 12px 0; padding: 10px 14px; border-left: 5px solid #27ae60; border-radius: 6px; background: rgba(39, 174, 96, .1);">
💡 <b>建议：</b>推荐开启 <code>resvg</code> 渲染模式，生成毫秒级即时响应，内存开销极低且排版优美！
</blockquote>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #3b82f6;">🤖 OneBot 协议端适配情况与推荐</b></summary>
<div style="${detailsBodyStyle}">
<p>本插件专为 <b>OneBot V11</b> 生态打造，已全面适配当前主流协议端：</p>
<table style="width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 14px;">
  <thead>
    <tr style="border-bottom: 2px solid var(--k-color-divider, rgba(127, 127, 127, 0.3)); text-align: left;">
      <th style="padding: 6px 8px;">协议端</th>
      <th style="padding: 6px 8px;">适配状态</th>
      <th style="padding: 6px 8px;">说明</th>
    </tr>
  </thead>
  <tbody>
    <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
      <td style="padding: 6px 8px;"><b>🐈 NapCat</b></td>
      <td style="padding: 6px 8px;"><span style="color: #4ade80; font-weight: bold;">✅ 完全适配</span></td>
      <td style="padding: 6px 8px;">推荐使用，支持完整的拓展字段、QQ 在线状态与富文本精华。</td>
    </tr>
    <tr style="border-bottom: 1px solid var(--k-color-divider, rgba(127, 127, 127, 0.15));">
      <td style="padding: 6px 8px;"><b>🤖 Lucky Lillia Bot (LLBot)</b></td>
      <td style="padding: 6px 8px;"><span style="color: #4ade80; font-weight: bold;">✅ 完全适配</span></td>
      <td style="padding: 6px 8px;">推荐使用，插件已内置群精华消息异步 <code>getMsg</code> 自适应补全机制。</td>
    </tr>
    <tr>
      <td style="padding: 6px 8px;"><b>🧐 Lagrange.OneBot</b></td>
      <td style="padding: 6px 8px;"><span style="color: #4ade80; font-weight: bold;">✅ 完全适配</span></td>
      <td style="padding: 6px 8px;">支持用户资料、群成员管理列表与群公告等核心能力。</td>
    </tr>
  </tbody>
</table>

<p style="margin-top: 10px;">
  <a href="https://napcat.apifox.cn/" target="_blank"><img src="https://img.shields.io/badge/Apifox-Napcat文档-ff99cc?logo=apifox" alt="Napcat文档" style="vertical-align: middle; margin-right: 8px;"></a>
  <a href="https://napneko.github.io/" target="_blank"><img src="https://img.shields.io/badge/GitHub%20Pages-Napcat文档-3b82f6?logo=github" alt="Napcat文档" style="vertical-align: middle; margin-right: 8px;"></a>
  <a href="https://github.com/LLOneBot/LuckyLilliaBot" target="_blank"><img src="https://img.shields.io/badge/GitHub-LuckyLilliaBot-pink?logo=github" alt="LLBot" style="vertical-align: middle;"></a>
</p>
<blockquote style="margin: 12px 0; padding: 10px 14px; border-left: 5px solid #3b82f6; border-radius: 6px; background: rgba(59, 130, 246, .1);">
💡 <b>提示：</b>仅面向 OneBot V11 会话协议，若在官方 Bot 平台或其他适配器下调用将返回不支持提示。
</blockquote>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #f59e0b;">📌 常用指令与输出形式速查</b></summary>
<div style="${detailsBodyStyle}">
<p>插件提供多种指令，支持在群聊中直接查询或配合参数使用：</p>
<ul>
  <li><code>用户信息 [user]</code>（别名：<code>查信息</code>、<code>个人信息</code>）：查询指定成员或自己的详细资料卡片。</li>
  <li><code>群管理</code>（别名：<code>管理员列表</code>、<code>群管理员</code>）：查看当前群的群主及所有管理人员列表与头衔。</li>
  <li><code>群精华 [page]</code>（别名：<code>精华列表</code>）：分页查看群精华消息记录。</li>
  <li><code>群精华详情 &lt;序号&gt;</code>（别名：<code>精华详情</code>）：查看单条精华消息详细图文内容。</li>
  <li><code>群公告 [page]</code>（别名：<code>公告列表</code>）：分页查看群发布的公告。</li>
  <li><code>群公告详情 &lt;序号&gt;</code>（别名：<code>公告详情</code>）：查看指定群公告完整内容与发布者。</li>
  <li><code>查看onebot信息插件的puppeteer图片样式</code>（别名：<code>awa_onebot_info_image_styles_list</code>、<code>aoiisl</code>、<code>ais</code>）：查看并罗列所有可用的 Puppeteer 图片主题样式。</li>
</ul>
<blockquote style="margin: 12px 0; padding: 10px 14px; border-left: 5px solid #f59e0b; border-radius: 6px; background: rgba(245, 158, 11, .1);">
<b>支持输出形式：</b>纯文本、OneBot 合并转发消息、Puppeteer 渲染图片、resvg 极速 SVG 图片，可在配置项中自由勾选切换。
</blockquote>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #10b981;">🎨 字体使用与开源授权</b></summary>
<div style="${detailsBodyStyle}">
<p>本插件用于图片生成的字体遵循开源许可，启动时会自动校验并下载：</p>
<ul>
  <li><b style="color: #3498db;"><a href="https://github.com/adobe-fonts/source-han-serif/tree/master" target="_blank">思源宋体（Source Han Serif SC）</a></b>：由 Adobe 与 Google 联合开发维护，遵循 <a href="https://openfontlicense.org" target="_blank">SIL Open Font License 1.1</a> 协议。</li>
  <li><b style="color: #3498db;"><a href="https://github.com/lxgw/LxgwWenkai" target="_blank">霞鹜文楷（LXGW WenKai）</a></b>：由开源作者 LXGW 开发并维护，遵循 <a href="https://openfontlicense.org" target="_blank">SIL Open Font License 1.1</a> 协议。</li>
</ul>
<blockquote style="margin: 12px 0; padding: 10px 14px; border-left: 5px solid #10b981; border-radius: 6px; background: rgba(16, 185, 129, .1);">
两款字体均为自由商用字体，可自由用于本插件及二次开发。
</blockquote>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #8b5cf6;">📜 插件开源许可与致谢</b></summary>
<div style="${detailsBodyStyle}">
<p>本插件为开源免费项目，基于 <b>MIT License</b> 开放，欢迎 Issue、PR 与二次创作！</p>
<p>如果您觉得插件对您有所帮助，欢迎在 GitHub / Gitee 点一个 ⭐ <b>Star</b> 给予支持！</p>
<blockquote style="margin: 12px 0; padding: 10px 14px; border-left: 5px solid #8b5cf6; border-radius: 6px; background: rgba(139, 92, 246, .1);">
感谢所有开源协议实现端（NapCat、Lucky Lillia Bot、Lagrange）与开源字体的贡献者！❤️
</blockquote>
</div>
</details>
`
