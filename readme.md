![koishi-plugin-onebot-info-image](https://socialify.git.ci/VincentZyuApps/koishi-plugin-onebot-info-image/image?custom_description=%E7%94%A8onebot+api%E8%8E%B7%E5%8F%96%E4%B8%80%E4%BA%9B%E4%BF%A1%E6%81%AF%EF%BC%8C%E6%AF%94%E5%A6%82%EF%BC%9A%E7%94%A8%E6%88%B7%E8%AF%A6%E7%BB%86%E4%BF%A1%E6%81%AF%2F%E7%BE%A4%E7%AE%A1%E7%90%86%E5%91%98%E5%88%97%E8%A1%A8%E4%BF%A1%E6%81%AF%2F%E7%BE%A4%E5%85%AC%E5%91%8A%2F%E7%BE%A4%E7%B2%BE%E5%8D%8E%EF%BC%8C%E5%8F%AF%E4%BB%A5%E5%8F%91%E7%BA%AF%E6%96%87%E6%9C%AC%2F%E5%90%88%E5%B9%B6%E8%BD%AC%E5%8F%91%2F%E6%B8%B2%E6%9F%93%E5%9B%BE%E7%89%87%E3%80%82+%E6%8E%A8%E8%8D%90%E5%AF%B9%E6%8E%A5napcat&description=1&font=Bitter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&name=1&owner=1&pattern=Plus&pulls=1&stargazers=1&theme=Auto)

# koishi-plugin-onebot-info-image

使用 OneBot V11 API 获取用户信息、群管理员列表、群公告和群精华消息，并以文本、Puppeteer 图片、resvg 图片或合并转发消息发送结果。

[![npm](https://img.shields.io/npm/v/koishi-plugin-onebot-info-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-onebot-info-image)
[![npm-download](https://img.shields.io/npm/dm/koishi-plugin-onebot-info-image?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-onebot-info-image)

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/VincentZyuApps/koishi-plugin-onebot-info-image)
[![Gitee](https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white)](https://gitee.com/vincent-zyu/koishi-plugin-onebot-info-image)

[![Koishi Forum](https://img.shields.io/badge/Koishi%20Forum-12077-5546A3?style=for-the-badge&logo=https%3A%2F%2Fupload.wikimedia.org%2Fwikipedia%2Fcommons%2Ff%2Ff3%2FKoishi.js_Logo.png&logoColor=white)](https://forum.koishi.xyz/t/topic/12077)
[![QQ群](https://img.shields.io/badge/QQ群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white)](https://qm.qq.com/q/ZN7fxZ3qCq)

> 推荐接入 [NapCat](https://napneko.github.io/)，可获取的用户与群聊字段更加完整。并且作者开发测试和生产环境用的就是NapCat捏。
>
> npm 或 Koishi 市场页面可能无法完整加载仓库内图片，建议前往 [GitHub](https://github.com/VincentZyuApps/koishi-plugin-onebot-info-image) 或 [Gitee](https://gitee.com/vincent-zyu/koishi-plugin-onebot-info-image) 查看。

## 目录

- [主要功能](#主要功能)
- [协议兼容性](#协议兼容性)
- [依赖说明](#依赖说明)
- [默认指令](#默认指令)
- [输出格式](#输出格式)
- [效果预览](#效果预览)
- [协议数据样例](#协议数据样例)
- [交流反馈](#交流反馈)

## 主要功能

| 功能 | 支持内容 |
| --- | --- |
| 用户信息 | 基础资料、群成员信息、QQ 状态及协议端扩展字段 |
| 群管理员列表 | 群主与管理员资料、群信息及头像 |
| 群精华 | 精华消息列表、分页浏览和单条详情 |
| 群公告 | 公告列表、分页浏览和单条详情 |
| 多种输出 | 文本、Puppeteer 图片、resvg 图片和 OneBot 合并转发 |
| 辅助能力 | 图片样式切换、深色模式、自动撤回和 WebUI 配置汇总 |

## 协议兼容性

| 协议端 | 状态 | 说明 |
| --- | --- | --- |
| NapCat | 完整适配 | 推荐使用，可获取更多扩展字段 |
| Lagrange.OneBot | 已适配 | 支持用户信息与群聊相关功能 |
| LLOneBot / Lucky Lillia Bot | 未适配 | 部分返回格式与 NapCat 相同，可自行尝试 |

本插件仅面向 OneBot V11 会话，使用其他协议时相关指令会返回不支持提示。

## 依赖说明

| 依赖 | 类型 | 用途 |
| --- | --- | --- |
| `http` | 必需服务 | 请求头像、公告图片和字体资源 |
| `@resvg/resvg-js` | npm 运行时依赖 | 轻量级 SVG 图片渲染，由插件依赖自动安装 |
| `puppeteer` | 可选服务 | 启用 Puppeteer 图片输出时需要 |
| `notifier` | 可选服务 | 在 Koishi WebUI 中展示配置汇总与提示 |
| `console` | 可选服务 | 启用 WebUI 渲染预览时需要 |

默认仅开启 Puppeteer 图片输出，因此使用默认配置时需要启用一个提供 `puppeteer` 服务的插件。未启用 Puppeteer 时，可改用文本、resvg 图片或合并转发输出。

## 默认指令

所有指令名都可以在插件配置中修改。

| 默认指令 | 常用别名 | 功能 |
| --- | --- | --- |
| `用户信息 [QQ号或@用户]` | `aui`、`awa_user_info` | 查询用户及群成员详细信息 |
| `群管理列表` | `al`、`awa_group_admin_list` | 查询当前群的群主和管理员 |
| `群精华列表` | `群精华`、`age` | 分页查看群精华消息 |
| `群精华详情 <序号>` | `aged` | 查看指定精华消息详情 |
| `群公告列表` | `群公告`、`agn` | 分页查看群公告 |
| `群公告详情 <序号>` | `agnd` | 查看指定公告详情 |
| `查看puppeteer图片样式` | - | 查看可用的 Puppeteer 图片样式 |

常用选项如下：

- `-i, --index <序号>`：选择 Puppeteer 图片样式。
- `--mode <light|dark>`：覆盖 resvg 图片的明暗模式。
- `-p, --page <页码>`：指定群公告或群精华列表页码。
- `-s, --pagesize <数量>`：指定列表每页显示数量。

## 输出格式

| 格式 | 配置项 | 说明 |
| --- | --- | --- |
| 文本消息 | `sendText` | 直接发送易于复制的文本内容 |
| Puppeteer 图片 | `sendImage` | 支持 Source、LXGW 和 Flat 图片样式 |
| resvg 图片 | `sendImageSvg` | 资源占用较低，适合快速稳定出图 |
| 合并转发 | `sendForward` | 使用 OneBot 合并转发消息展示结构化信息 |

至少需要启用一种输出格式。多种格式可以同时开启；当 Puppeteer 服务不可用时，插件会跳过 Puppeteer 图片并继续发送其他已启用格式。

## 效果预览

以下图片均使用 NapCat 平台生成。

### WebUI 配置汇总

![Koishi WebUI Notifier](docs/images/preview/koishi-webui-notifier.png)

<details>
<summary><strong>用户信息预览（4 张）</strong></summary>

#### Source 样式（Puppeteer）

![NapCat 用户信息 Source Puppeteer](docs/images/preview/napcat-用户信息-source-pptr.png)

#### LXGW 样式（Puppeteer）

![NapCat 用户信息 LXGW Puppeteer](docs/images/preview/napcat-用户信息-lxgw-pptr.png)

#### Flat 样式（Puppeteer）

![NapCat 用户信息 Flat Puppeteer](docs/images/preview/napcat-用户信息-flat-pptr.png)

#### resvg 渲染

![NapCat 用户信息 SVG](docs/images/preview/napcat-用户信息-svg.png)

</details>

<details>
<summary><strong>管理员列表预览（4 张）</strong></summary>

#### Source 样式（Puppeteer）

![NapCat 管理员列表 Source Puppeteer](docs/images/preview/napcat-管理员列表-source-pptr.png)

#### LXGW 样式（Puppeteer）

![NapCat 管理员列表 LXGW Puppeteer](docs/images/preview/napcat-管理员列表-lxgw-pptr.png)

#### Flat 样式（Puppeteer）

![NapCat 管理员列表 Flat Puppeteer](docs/images/preview/napcat-管理员列表-flat-pptr.png)

#### resvg 渲染

![NapCat 管理员列表 SVG](docs/images/preview/napcat-管理员列表-svg.png)

</details>

<details>
<summary><strong>群公告预览（4 张）</strong></summary>

#### 群公告列表（Puppeteer）

![NapCat 群公告列表 Source Puppeteer](docs/images/preview/napcat-群公告列表-source-pptr.png)

#### 群公告列表（resvg）

![NapCat 群公告列表 SVG](docs/images/preview/napcat-群公告列表-svg.png)

#### 群公告详情（Puppeteer）

![NapCat 群公告详情 Source Puppeteer](docs/images/preview/napcat-群公告详情-source-pptr.png)

#### 群公告详情（resvg）

![NapCat 群公告详情 SVG](docs/images/preview/napcat-群公告详情-svg.png)

</details>

<details>
<summary><strong>群精华预览（4 张）</strong></summary>

#### 群精华列表（Puppeteer）

![NapCat 群精华列表 Source Puppeteer](docs/images/preview/napcat-群精华列表-source-pptr.png)

#### 群精华列表（resvg）

![NapCat 群精华列表 SVG](docs/images/preview/napcat-群精华列表-svg.png)

#### 群精华详情（Puppeteer）

![NapCat 群精华详情 Source Puppeteer](docs/images/preview/napcat-群精华详情-source-pptr.png)

#### 群精华详情（resvg）

![NapCat 群精华详情 SVG](docs/images/preview/napcat-群精华详情-svg.png)

</details>

### 样式说明

- **Source**：使用思源宋体渲染的现代信息卡片样式。
- **LXGW**：使用霞鹜文楷渲染的黑白信息卡片样式。
- **Flat**：色块清晰的扁平化信息卡片样式。
- **resvg**：使用 SVG 模板与 resvg 引擎渲染的轻量图片。

## 协议数据样例

以下文档保留了不同 OneBot 实现返回的原始 JSON 数据，方便对照字段差异和排查协议适配问题。

跨实现的稳定字段另提供一份文档型 [Proto3 Schema](docs/protobuf/onebot-info-image.proto)，其设计说明见 [Protocol Buffer 数据模型](docs/protobuf/README.md)。该 Schema 不参与插件运行或代码生成。

| 协议端 | 用户信息 | 管理员列表 |
| --- | --- | --- |
| Lagrange.OneBot | [查看样例](docs/protocol/lagrange-用户信息.md) | [查看样例](docs/protocol/lagrange-管理员列表.md) |
| NapCat | [查看样例](docs/protocol/napcat-用户信息.md) | [查看样例](docs/protocol/napcat-管理员列表.md) |

## 字体与许可

图片渲染使用以下开源字体：

- [思源宋体（Source Han Serif SC）](https://github.com/adobe-fonts/source-han-serif/tree/master)，遵循 SIL Open Font License 1.1。
- [霞鹜文楷（LXGW WenKai）](https://github.com/lxgw/LxgwWenkai)，遵循 SIL Open Font License 1.1。

本插件基于 [MIT License](LICENSE) 开源，欢迎修改、分发和二次开发。

## 交流反馈

Bug 反馈、功能建议和插件开发交流可加入 QQ 群 `1085190201`，也可以通过 [Koishi 论坛主题](https://forum.koishi.xyz/t/topic/12077) 或仓库 Issue 反馈。

## 相关文档

- [更新日志](changelog.md)
- [开发指南](dev.md)
- [Protocol Buffer 数据模型](docs/protobuf/README.md)
- [NapCat 文档](https://napneko.github.io/)
