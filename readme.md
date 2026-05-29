![koishi-plugin-onebot-info-image](https://socialify.git.ci/VincentZyuApps/koishi-plugin-onebot-info-image/image?custom_description=%E7%94%A8onebot+api%E8%8E%B7%E5%8F%96%E4%B8%80%E4%BA%9B%E4%BF%A1%E6%81%AF%EF%BC%8C%E6%AF%94%E5%A6%82%EF%BC%9A%E7%94%A8%E6%88%B7%E8%AF%A6%E7%BB%86%E4%BF%A1%E6%81%AF%2F%E7%BE%A4%E7%AE%A1%E7%90%86%E5%91%98%E5%88%97%E8%A1%A8%E4%BF%A1%E6%81%AF%2F%E7%BE%A4%E5%85%AC%E5%91%8A%2F%E7%BE%A4%E7%B2%BE%E5%8D%8E%EF%BC%8C%E5%8F%AF%E4%BB%A5%E5%8F%91%E7%BA%AF%E6%96%87%E6%9C%AC%2F%E5%90%88%E5%B9%B6%E8%BD%AC%E5%8F%91%2F%E6%B8%B2%E6%9F%93%E5%9B%BE%E7%89%87%E3%80%82+%E6%8E%A8%E8%8D%90%E5%AF%B9%E6%8E%A5napcat&description=1&font=Bitter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&name=1&owner=1&pattern=Plus&pulls=1&stargazers=1&theme=Auto)

# koishi-plugin-onebot-info-image

💡 readme 中的图片请前往 [GitHub](https://github.com/VincentZyu233/koishi-plugin-onebot-image) 或 [Gitee](https://gitee.com/vincent-zyu/koishi-plugin-onebot-image) 主页查看。

[![npm](https://img.shields.io/npm/v/koishi-plugin-onebot-info-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-onebot-info-image)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-onebot-info-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-onebot-info-image)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-onebot-info-image)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/koishi-plugin-onebot-info-image)
[![Koishi Forum](https://img.shields.io/badge/forum.koishi.xyz_topic_12077-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white)](https://forum.koishi.xyz/t/topic/12077)

<p><del>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>259248174</b>   🎉（这个群G了</del> </p> 
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入QQ群：<b>1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复的更快哦~ ✨</p>


# 获取成员信息/管理员列表/群公告/群精华，发送文字/图片/合并转发消息，仅支持OneBotV11

> 推荐使用[Napcat](https://napneko.github.io/)
> ![Apifox](https://img.shields.io/badge/Apifox-Napcat文档-ff99cc?logo=apifox)
> ![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Napcat文档-3b82f6?logo=github)
>
> 开发时仅适配了 **Napcat** 和 **Lagrange** 的协议，**LLBot** 未适配。
> 部分 LLBot API 返回的 JSON 格式与 Napcat 相同，可尝试使用。
> 若需适配其他协议，欢迎提 issue 或进群艾特我反馈~

### ⚙️ 必须依赖
本插件需要以下依赖才能正常工作：
- **http** - Koishi 内置服务，用于 HTTP 服务器功能
- **puppeteer** - Koishi 服务，用于 Puppeteer 渲染图片
- **notifier** - Koishi 服务，用于 WebUI 通知显示
- **console** - Koishi 服务，用于 WebUI 功能（可选）
- **@resvg/resvg-js** - npm 包，用于 resvg 轻量级 SVG 渲染（快速出图推荐！）

#### Koishi 控制台 插件配置界面 WebUI Notifier UI 效果
![koishi-webui-notifier](docs/other-preview-pic/koishi-webui-notifier.png)

#### Napcat 平台渲染效果:
##### 用户信息：
![napcat_aui_source](docs/napcat_aui_source.png)
![napcat_aui_lxgw](docs/napcat_aui_lxgw.png)
![napcat_aui_flat](docs/napcat_aui_flat.png)
![napcat_aui_svg](docs/napcat_aui_svg.png)

##### 群管理列表：
![napcat_al_source](docs/napcat_al_source.png)
![napcat_al_lxgw](docs/napcat_al_lxgw.png)
![napcat_al_flat](docs/napcat_al_flat.png)
![napcat_al_svg](docs/napcat_al_svg.png)

> 📸 查看更多渲染效果预览图：[所有图片的预览捏](docs/所有图片的预览捏.md)

> 📜 [查看更新日志](./changelog.md) | 🔧 [开发指南](./dev.md)