import { Context } from 'koishi';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { FONT_FILES, type ImageStyle } from './type';
import type { Config } from './index';


/**
 * 调度自动撤回消息
 * 在消息发送后（await session.send 之后）调用此函数，
 * 会在 config.autoRecallDelay 秒后自动撤回该消息。
 * 
 * @param session 会话对象
 * @param config 插件配置
 * @param msgIds 要撤回的消息ID（可以是单个或数组）
 */
export function scheduleAutoRecall(
  session: any,
  config: Config,
  msgIds: string | string[]
): void {
  if (!config.enableAutoRecall) return;
  const ids = Array.isArray(msgIds) ? msgIds : [msgIds];
  const delayMs = (config.autoRecallDelay ?? 45) * 1000;
  for (const msgId of ids) {
    if (!msgId) continue;
    setTimeout(async () => {
      try {
        await session.bot.deleteMessage(session.channelId, String(msgId));
      } catch (e) {
        // 撤回失败静默忽略（消息可能已被手动删除）
      }
    }, delayMs);
  }
}


/**
 * 生成当前时间戳字符串
 * @returns 格式为 YYYY/MM/DD HH:MM:SS 的时间戳字符串
 */
export function generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}



/**
 * 获取群头像的 Base64 编码
 * @param ctx Koishi Context 实例
 * @param groupId 群号
 * @returns Promise<string> 群头像的 base64 编码
 */
export async function getGroupAvatarBase64(ctx: Context, groupId: string): Promise<string> {
    try {
        const groupAvatarUrl = `https://p.qlogo.cn/gh/${groupId}/${groupId}/640/`;
        const response = await ctx.http.get(groupAvatarUrl, { responseType: 'arraybuffer' });
        return Buffer.from(response).toString('base64');
    } catch (error) {
        ctx.logger.warn(`获取群头像失败: ${error.message}`);
        return '';
    }
}


/**
 * 获取字体文件的 Base64 编码
 * @param ctx Koishi Context 实例
 * @param imageStyle 图片样式
 * @returns Promise<string> 字体文件的 base64 编码
 */
export async function getFontBase64(ctx: Context, imageStyle: ImageStyle): Promise<string> {
    try {
        const fontFileName = FONT_FILES[imageStyle];
        const fontPath = join(__dirname, '..', 'assets', fontFileName);
        const fontBuffer = readFileSync(fontPath);
        return fontBuffer.toString('base64');
    } catch (error) {
        ctx.logger.warn(`获取字体文件失败: ${error.message}`);
        return '';
    }
}


/**
 * 验证并下载字体文件
 * @param ctx Koishi Context 实例
 * @returns Promise<void>
 */
export async function validateFonts(ctx: Context): Promise<void> {
    const assetsDir = join(__dirname, '..', 'assets');
    
    // 确保assets目录存在
    if (!existsSync(assetsDir)) {
        mkdirSync(assetsDir, { recursive: true });
    }
    
    const fontConfigs = [
        {
            filename: 'LXGWWenKaiMono-Regular.ttf',
            downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-onebot-image/releases/download/font/LXGWWenKaiMono-Regular.ttf'
        },
        {
            filename: 'SourceHanSerifSC-Medium.otf',
            downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-onebot-image/releases/download/font/SourceHanSerifSC-Medium.otf'
        }
    ];
    
    for (const fontConfig of fontConfigs) {
        const fontPath = join(assetsDir, fontConfig.filename);
        
        // 检查字体文件是否存在
        if (!existsSync(fontPath)) {
            ctx.logger.info(`字体文件 ${fontConfig.filename} 不存在，开始下载...`);
            
            try {
                // 下载字体文件
                const response = await ctx.http.get(fontConfig.downloadUrl, { responseType: 'arraybuffer' });
                const fontBuffer = Buffer.from(response);
                
                // 保存字体文件
                writeFileSync(fontPath, fontBuffer);
                ctx.logger.info(`字体文件 ${fontConfig.filename} 下载完成`);
            } catch (error) {
                ctx.logger.error(`下载字体文件 ${fontConfig.filename} 失败: ${error.message}`);
            }
        } else {
            ctx.logger.debug(`字体文件 ${fontConfig.filename} 已存在`);
        }
    }
}
