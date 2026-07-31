# Protocol Buffer 数据模型

本目录提供 `koishi-plugin-onebot-info-image` 的跨实现统一数据模型。

## 定位

- `onebot-info-image.proto` 是仅用于文档与跨语言参考的有效 Proto3 Schema。
- 插件运行时不读取、编译或生成 Protocol Buffer 消息。
- Schema 以 `src/types.ts` 中的 `UnifiedUserInfo`、`UnifiedAdminInfo` 和 `UnifiedContextInfo` 为基础。
- `qid/q_id`、`regTime/reg_time/RegisterTime` 等协议端历史别名在 Schema 中合并为单一语义字段。
- 无法稳定结构化的实现端扩展字段使用 `*_json` 保存，完整原始响应由结果消息中的 `raw_json` 承载。

## 与原始协议样例的关系

Proto Schema 描述跨 NapCat 与 Lagrange.OneBot 的稳定字段，原始 JSON 样例继续保存在 `docs/protocol/`：

| 协议端 | 用户信息 | 管理员列表 |
| --- | --- | --- |
| Lagrange.OneBot | [查看样例](../protocol/lagrange-用户信息.md) | [查看样例](../protocol/lagrange-管理员列表.md) |
| NapCat | [查看样例](../protocol/napcat-用户信息.md) | [查看样例](../protocol/napcat-管理员列表.md) |

## 编辑器支持

`.proto` 文件使用标准 Proto3 语法。VS Code 可安装以下任一扩展获得语法高亮、格式化和基础诊断：

- [Buf](https://marketplace.visualstudio.com/items?itemName=bufbuild.vscode-buf)
- [vscode-proto3](https://marketplace.visualstudio.com/items?itemName=zxh404.vscode-proto3)

## GitHub 语言统计

Protocol Buffer 在 GitHub Linguist 中属于 `data` 类型，默认不进入仓库语言统计。仓库根目录的 `.gitattributes` 已将本目录下的 `.proto` 文件标记为可检测语言，因此提交并推送后 GitHub 语言栏会显示 Protocol Buffer。
