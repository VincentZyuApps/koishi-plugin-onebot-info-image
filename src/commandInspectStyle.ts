// ===== 📦 外部依赖 =====
import { Context } from 'koishi'

// ===== 🧩 插件配置 =====
import { Config } from './index'

// ===== 📋 类型定义 =====
import { IMAGE_STYLES } from './type'

// ===== 🔧 工具函数 =====
import { scheduleAutoRecall } from './utils'

export function registerInspectStyleCommand(ctx: Context, config: Config) {
  // 注册 ais 指令 - 查看图片样式列表
  ctx.command(config.inspectStyleCommandName, "查看图片样式列表")
    .alias('ais')
    .alias("awa_inspect_style")
    .action(async ({ session }) => {
      let msg = '用户信息图片样式列表：\n';
      for (let i = 0; i < config.imageStyleDetails.length; i++) {
        const o = config.imageStyleDetails[i];
        msg += `\t【${i}】: ${IMAGE_STYLES[o.styleKey]} ${o.darkMode ? '深色模式' : '浅色模式'} (${o.styleKey})\n`;
      }
      const msgId = await session.send(msg);
      scheduleAutoRecall(session, config, String(msgId));
    });
}
