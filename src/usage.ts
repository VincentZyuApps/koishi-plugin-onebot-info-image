const pkg = require('../package.json')

export const usage = `
<h1>Koishi 插件：onebot-info-image 获取群员信息 渲染成图像</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-onebot-info-image" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-onebot-info-image?style=flat-square" alt="npm version">
  </a>
  <a href="https://github.com/VincentZyu233/koishi-plugin-onebot-image" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-onebot-image" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <a href="https://qm.qq.com/q/ZN7fxZ3qCq" target="_blank">
    <img src="https://img.shields.io/badge/QQ群-1085190201-1AAD19?style=flat-square" alt="QQ群">
  </a>
  <a href="https://forum.koishi.xyz/t/topic/12077" target="_blank">
    <img src="https://img.shields.io/badge/Koishi Forum-12077-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white" alt="Forum">
  </a>
</p>

<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>

<p><b>💡 提示：</b>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-onebot-image" target="_blank">
    前往 Gitee README 获得更佳观感 →
    <i>https://gitee.com/vincent-zyu/koishi-plugin-onebot-image</i>
  </a>
</p>

<hr>

<details>
<summary><h2>📖 插件详细说明（点击展开）</h2></summary>

<h3 style="color: #e74c3c;">⚙️ 前置依赖</h3>
<p>本插件需要以下依赖才能正常工作：</p>
<ul>
  <li><b style="color: #e74c3c;">http</b> - Koishi 内置服务，用于 HTTP 服务器功能 <span style="color: #e74c3c;">【必须】</span></li>
  <li><b style="color: #f39c12;">@resvg/resvg-js</b> - npm 包，用于 resvg 轻量级 SVG 渲染 <span style="color: #e74c3c;">【必须】</span></li>
</ul>
<p>以下服务为可选依赖，按需启用：</p>
<ul>
  <li><b style="color: #27ae60;">puppeteer</b> - Koishi 服务，用于 Puppeteer 渲染图片 <span style="color: #27ae60;">【可选】</span></li>
  <li><b style="color: #27ae60;">notifier</b> - Koishi 服务，用于 WebUI 通知显示 <span style="color: #27ae60;">【可选】</span></li>
  <li><b style="color: #27ae60;">console</b> - Koishi 服务，用于 WebUI 数据服务 <span style="color: #27ae60;">【可选】</span></li>
</ul>
<p style="color: #27ae60;">💡 推荐开启 resvg 渲染，出图速度快，体验更好！</p>

<hr>

<p style="background: linear-gradient(90deg, #3b82f6, #93c5fd, #ffffff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-weight: bold; font-size: 18px;"><strong>✨ Napcat能拿到的东西更多，为了更好的使用体验，推荐使用 Napcat！</strong></p>
<p style="margin-top: 8px;">
  <a href="https://napcat.apifox.cn/" target="_blank"><img src="https://img.shields.io/badge/Apifox-Napcat文档-ff99cc?logo=apifox" alt="Napcat文档" style="vertical-align: middle; margin-right: 10px;"></a>
  <a href="https://napneko.github.io/" target="_blank"><img src="https://img.shields.io/badge/GitHub%20Pages-Napcat文档-3b82f6?logo=github" alt="Napcat文档" style="vertical-align: middle;"></a>
</p>
<p style="color: #ffffff; font-size: 16px; margin-top: 8px;"><strong>📋 协议适配情况：</strong></p>
<p style="color: #ffffff; font-size: 15px; margin-left: 20px;">• <strong>Napcat</strong> - <span style="color: #4ade80;">✅ 完全适配</span></p>
<p style="color: #ffffff; font-size: 15px; margin-left: 20px;">• <strong>Lagrange.OneBot</strong> - <span style="color: #4ade80;">✅ 完全适配</span></p>
<p style="color: #ffffff; font-size: 15px; margin-left: 20px;">• <strong>LLOneBot</strong> (现<strong>Lucky Lillia Bot</strong>)- <span style="color: #fca5a5;">⚠️ 未适配，部分API可能可用</span></p>
<p style="color: #ffffff; font-size: 14px; margin-top: 10px; font-style: italic;">若需适配其他协议端或格式，欢迎提 issue 或进群艾特我反馈~</p>

<hr>

<h3 style="color: #27ae60;">字体使用声明</h3>
<p>本插件使用以下开源字体进行图像渲染：</p>
<ul>
  <li><b style="color: #3498db;"><a href="https://github.com/adobe-fonts/source-han-serif/tree/master" target="_blank">思源宋体（Source Han Serif SC）</a></b> - 由 Adobe 与 Google 联合开发，遵循 <a href="https://openfontlicense.org">SIL Open Font License 1.1</a> 协议。</li>
  <li><b style="color: #3498db;"><a href="https://github.com/lxgw/LxgwWenkai" target="_blank">霞鹜文楷（LXGW WenKai）</a></b> - 由 LXGW 开发并维护，遵循 <a href="https://openfontlicense.org">SIL Open Font License 1.1</a> 协议。</li>
</ul>
<p>两者均为自由字体，可在本项目中自由使用、修改与发布。若你也在开发相关插件或项目，欢迎一同使用这些优秀的字体。</p>

</details>

<hr>

<h3 style="color: #e67e22;">插件许可声明</h3>
<p>本插件为开源免费项目，基于 MIT 协议开放。欢迎修改、分发、二创。</p>
<p>如果你觉得插件好用，欢迎在 GitHub 上 ⭐ Star 或通过其他方式给予支持（例如提供服务器、API Key 或直接赞助）！</p>
<p style="color: #e91e63;">感谢所有开源字体与项目的贡献者 ❤️</p>
`
