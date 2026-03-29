import { Context, h } from 'koishi'
import { basename } from 'path'
import { Config } from './index'
import { IMAGE_STYLES, IMAGE_STYLE_KEY_ARR } from './type'
import { renderGroupNotice } from './renderGroupNoticeList'
import { svgGroupNotice } from './svgGroupNoticeList'
import { scheduleAutoRecall, getGroupAvatarBase64, getUserAvatarBase64, getNoticeImageBase64, logCommandToFile, loadResvgFont } from './utils'

// 群公告的原始格式
export interface GroupNoticeMessageRaw {
  notice_id: string;
  sender_id: number;
  publish_time: number;
  message: {
    text: string;
    image: Array<{
      id: string;
      height: string;
      width: string;
    }>;
    images: Array<{
      id: string;
      height: string;
      width: string;
    }>;
  };
}

// 分页结果
export interface PaginatedNoticeResult {
  records: GroupNoticeMessageRaw[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// 群公告上下文信息
export interface NoticeContextInfo {
  groupId: number;
  groupName: string;
  memberCount: number;
  maxMemberCount: number;
  groupAvatarUrl: string;
}

/**
 * 对群公告列表进行分页处理
 */
function paginateNoticeMessages(
  noticeList: GroupNoticeMessageRaw[],
  page: number,
  pageSize: number
): PaginatedNoticeResult {
  const totalCount = noticeList.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const records = noticeList.slice(startIndex, endIndex);

  return {
    records,
    totalCount,
    currentPage: page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

/**
 * 解析群公告文本内容（处理HTML实体）
 */
export function parseNoticeText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&#10;/g, '\n')           // 换行符
    .replace(/&nbsp;/g, ' ')           // 空格
    .replace(/&lt;/g, '<')             // 小于号
    .replace(/&gt;/g, '>')             // 大于号
    .replace(/&amp;/g, '&')            // &符号
    .replace(/&quot;/g, '"')           // 双引号
    .replace(/&#39;/g, "'");           // 单引号
}

/**
 * 格式化时间戳
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * 格式化群公告列表为文本消息
 */
function formatGroupNoticeAsText(
  result: PaginatedNoticeResult,
  contextInfo: NoticeContextInfo,
  config: Config
): string {
  let output = `📢 群公告列表\n`;
  output += `==================\n`;
  output += `📍 群聊: ${contextInfo.groupName} (${contextInfo.groupId})\n`;
  output += `📊 第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条公告)\n`;
  output += `==================\n\n`;

  result.records.forEach((record, index) => {
    const globalIndex = (result.currentPage - 1) * result.pageSize + index + 1;
    const timeStr = formatTimestamp(record.publish_time);
    const textContent = parseNoticeText(record.message.text);
    const imageCount = record.message.images?.length || 0;

    output += `📌 ${globalIndex}. 发布者: ${record.sender_id}\n`;
    output += `⏰ ${timeStr}\n`;
    output += `💬 ${textContent.substring(0, 100)}${textContent.length > 100 ? '...' : ''}\n`;
    if (imageCount > 0) {
      output += `🖼️ 包含${imageCount}张图片\n`;
    }
    output += `------------------\n`;
  });

  // 翻页提示
  const pageHints: string[] = [];
  if (result.hasPrev) pageHints.push(`上一页: -p ${result.currentPage - 1}`);
  if (result.hasNext) pageHints.push(`下一页: -p ${result.currentPage + 1}`);
  if (pageHints.length > 0) {
    output += `📖 ${pageHints.join(' | ')}\n`;
  }

  return output;
}

/**
 * 格式化群公告列表为合并转发消息
 */
function formatGroupNoticeAsForward(
  result: PaginatedNoticeResult,
  contextInfo: NoticeContextInfo,
  config: Config
): string {
  let messages = '';
  const addMessageBlock = (userId: string | undefined, nickname: string, content: string) => {
    if (userId) {
      messages += `<message user-id="${userId}" nickname="${nickname}">${content}</message>\n`;
    } else {
      messages += `<message nickname="${nickname}">${content}</message>\n`;
    }
  };

  // 标题
  addMessageBlock(undefined, '📢 群公告列表', `${contextInfo.groupName}\n第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条公告)`);

  // 每条公告
  result.records.forEach((record, index) => {
    const globalIndex = (result.currentPage - 1) * result.pageSize + index + 1;
    const timeStr = formatTimestamp(record.publish_time);
    const textContent = parseNoticeText(record.message.text);
    const imageCount = record.message.images?.length || 0;

    let content = `📌 第${globalIndex}条公告\n`;
    content += `⏰ ${timeStr}\n`;
    content += `💬 ${textContent}`;
    if (imageCount > 0) {
      content += `\n🖼️ 包含${imageCount}张图片`;
    }

    addMessageBlock(String(record.sender_id), `发布者 ${record.sender_id}`, content);
  });

  // 翻页提示
  const pageHints: string[] = [];
  if (result.hasPrev) pageHints.push(`上一页: -p ${result.currentPage - 1}`);
  if (result.hasNext) pageHints.push(`下一页: -p ${result.currentPage + 1}`);
  if (pageHints.length > 0) {
    addMessageBlock(undefined, '📖 翻页提示', pageHints.join('\n'));
  }

  return `<message forward>\n${messages}\n</message>`;
}

export function registerGroupNoticeCommand(ctx: Context, config: Config, responseHint: string) {
  if (!config.enableGroupNoticeCommand) return;

  ctx.command(config.groupNoticeCommandName, `获取群公告列表, 发送${responseHint}`)
    .alias('群公告')
    .alias('agn')
    .option('page', '-p, --page <page:number> 页码，从1开始', { fallback: 1 })
    .option('pagesize', '-s, --pagesize <pagesize:number> 每页显示条数', { fallback: config.groupNoticePageSize || 10 })
    .option('imageStyleIdx', '-i, --idx, --index <idx:number> 图片样式索引')
    .option("mode", "--mode <mode:string> 指定 svg 渲染模式 (light/dark)，优先级高于配置项")
    .action(async ({ session, options }) => {
      const logs: string[] = [];
      if (!session.onebot)
        return session.send('❌ 当前会话不支持 onebot 协议。');

      if (!session.guildId)
        return session.send('❌ 当前会话不在群聊中。');

      // 验证分页参数
      const page = Math.max(1, options.page || 1);
      const pageSize = Math.max(1, Math.min(50, options.pagesize || config.groupNoticePageSize || 10));

      // 选择图片样式
      const defaultStyleDetailObj = config.imageStyleDetails.length > 0
        ? config.imageStyleDetails[0]
        : { styleKey: IMAGE_STYLE_KEY_ARR[0], darkMode: false };

      let selectedStyleDetailObj = defaultStyleDetailObj;
      if (options.imageStyleIdx !== undefined) {
        const isIdxValid = (options.imageStyleIdx as number) >= 0
          && (options.imageStyleIdx as number) < config.imageStyleDetails.length;
        if (!isIdxValid) {
          let idxInvalidMsgArr = [
            `🎨 ❌ 图片样式索引不合法！`,
            `\t 合法范围：[0, ${config.imageStyleDetails.length - 1}] 双闭区间`,
            `\t 当前输入：${options.imageStyleIdx}`,
            `\n`,
            `💡 输入指令 ${config.inspectStyleCommandName} 查看图片样式列表。`
          ];
          return await session.send(idxInvalidMsgArr.join('\n'));
        }
        selectedStyleDetailObj = config.imageStyleDetails[options.imageStyleIdx as number];
      }

      try {
        // 获取群公告列表
        const onebotBot = (session as any).onebot;
        const groupNoticeList: GroupNoticeMessageRaw[] = await onebotBot.getGroupNotice(session.guildId);

        if (!groupNoticeList || groupNoticeList.length === 0) {
          return session.send('📢 该群暂无公告。');
        }

        // 验证页码
        const totalPages = Math.ceil(groupNoticeList.length / pageSize);
        if (page > totalPages) {
          return session.send(`❌ 页码超出范围。\n有效范围：[1, ${totalPages}] 双闭区间\n当前输入：${page}`);
        }

        // 分页处理
        const paginatedResult = paginateNoticeMessages(groupNoticeList, page, pageSize);
        logs.push(`群公告列表分页结果: ${JSON.stringify(paginatedResult)}`);
        ctx.logger.info(`群公告列表分页结果: ${JSON.stringify(paginatedResult)}`);

        // 获取群信息
        const groupInfoObj = await session.onebot.getGroupInfo(session.guildId);
        const contextInfo: NoticeContextInfo = {
          groupId: parseInt(session.guildId),
          groupName: groupInfoObj.group_name || '未知群聊',
          memberCount: groupInfoObj.member_count || 0,
          maxMemberCount: groupInfoObj.max_member_count || 0,
          groupAvatarUrl: `https://p.qlogo.cn/gh/${session.guildId}/${session.guildId}/640/`
        };

        // 发送文本
        if (config.sendText) {
          const textMessage = formatGroupNoticeAsText(paginatedResult, contextInfo, config);
          const textMsgId = await session.send(`${config.enableQuoteWithText ? h.quote(session.messageId) : ''}${textMessage}`);
          scheduleAutoRecall(session, config, String(textMsgId));
        }

        // 发送图片
        if (config.sendImage && ctx.puppeteer) {
          const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🔄正在使用 Puppeteer 渲染群公告列表，请稍候⏳...`);
          const selectedImageStyle = IMAGE_STYLES[selectedStyleDetailObj.styleKey];
          const selectedDarkMode = selectedStyleDetailObj.darkMode;
          const startTime = Date.now();
          const noticeImageBase64 = await renderGroupNotice(
            ctx,
            paginatedResult,
            contextInfo,
            selectedImageStyle,
            selectedDarkMode,
            config.imageType,
            config.screenshotQuality
          );
          // 构建图片消息
          let imageMessage = `${config.enableQuoteWithImage ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${noticeImageBase64}`)}`;
          // 添加翻页提示
          const pageHints: string[] = [];
          if (paginatedResult.hasPrev) pageHints.push(`-p ${paginatedResult.currentPage - 1}`);
          if (paginatedResult.hasNext) pageHints.push(`-p ${paginatedResult.currentPage + 1}`);
          imageMessage += `\n📢 第${page}/${totalPages}页 | 共${groupNoticeList.length}条公告`;
          if (pageHints.length > 0) {
            imageMessage += ` | 翻页: ${pageHints.join(' / ')}`;
          }
          imageMessage += `\n📖 用法: ${config.groupNoticeCommandName} -p 《页码》 -s 《每页条数》`;
          if (config.imageShowRenderInfo) {
            const elapsed = Date.now() - startTime;
            imageMessage += `\n🖼️ Puppeteer 渲染耗时: ${elapsed}ms | 样式: ${selectedStyleDetailObj.styleKey} | 黑暗模式：${selectedDarkMode ? '开启' : '关闭'} | 类型: ${config.imageType} | 质量: ${config.screenshotQuality}`;
          }
          const imgMsgId = await session.send(imageMessage);
          scheduleAutoRecall(session, config, String(imgMsgId));
          await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
        }

        if (config.sendImageSvg) {
          const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🚀正在用 resvg 渲染群公告列表，请稍候⏳...`);
          const groupAvatarBase64 = await getGroupAvatarBase64(ctx, session.guildId);
          const startTime = Date.now();
          let svgDarkMode = config.svgEnableDarkMode;
          if (options.mode === 'dark') svgDarkMode = true;
          if (options.mode === 'light') svgDarkMode = false;

          // 获取每个发布者的头像
          const avatarsBase64: Record<string, string> = {};
          for (const record of paginatedResult.records) {
            const senderIdStr = String(record.sender_id);
            avatarsBase64[senderIdStr] = await getUserAvatarBase64(ctx, record.sender_id);
          }

          // 获取每张公告图片
          const imagesBase64: Record<string, string> = {};
          for (const record of paginatedResult.records) {
            if (record.message.images) {
              for (const img of record.message.images) {
                if (!imagesBase64[img.id]) {
                  imagesBase64[img.id] = await getNoticeImageBase64(ctx, img.id);
                  logs.push(`[群公告列表] 公告图片获取成功: id=${img.id}`);
                  ctx.logger.info(`[群公告列表] 公告图片获取成功: id=${img.id}`);
                }
              }
            }
          }
          logs.push(`[群公告列表] 总共获取 ${Object.keys(imagesBase64).length} 张图片`);
          ctx.logger.info(`[群公告列表] 总共获取 ${Object.keys(imagesBase64).length} 张图片`);

          const svgImageBase64 = await svgGroupNotice(ctx, {
            result: paginatedResult,
            contextInfo,
            groupAvatarBase64,
            avatarsBase64,
            imagesBase64,
            enableDarkMode: svgDarkMode,
            scale: config.svgScale,
            enableEmoji: config.svgEnableEmoji,
            enableEmojiCache: config.svgEnableEmojiCache,
            svgThemeColor: config.svgThemeColor,
            enableCustomFont: config.svgEnableCustomFont,
            fontFiles: config.svgFontFiles,
            fontFamilies: config.svgFontFamilies,
          });
          if (config.sendImageSvg) {
            logs.push(`svgGroupNotice: scale=${config.svgScale}`);
            ctx.logger.info(`svgGroupNotice: scale=${config.svgScale}`);
          }
          const elapsed = Date.now() - startTime;
          logs.push(`resvg 渲染耗时: ${elapsed}ms | 缩放: ${config.svgScale}x`);
          const { fontFiles, fontFamily } = loadResvgFont(config.svgEnableCustomFont, config.svgFontFiles, config.svgFontFamilies)
          const fontFileName = fontFiles.length > 0 ? basename(fontFiles[0]) : '默认'
          const fontFamilyDisplay = config.svgEnableCustomFont ? fontFamily : '默认'
          let imageMessage = `${config.enableQuoteWithImageSvg ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${svgImageBase64}`)}`;
          const pageHints: string[] = [];
          if (paginatedResult.hasPrev) pageHints.push(`-p ${paginatedResult.currentPage - 1}`);
          if (paginatedResult.hasNext) pageHints.push(`-p ${paginatedResult.currentPage + 1}`);
          imageMessage += `\n📢 第${page}/${totalPages}页 | 共${groupNoticeList.length}条公告`;
          if (pageHints.length > 0) {
            imageMessage += ` | 翻页: ${pageHints.join(' / ')}`;
          }
          imageMessage += `\n📖 用法: ${config.groupNoticeCommandName} -p 《页码》 -s 《每页条数》`;
          if (config.svgShowRenderInfo) {
            imageMessage += `\n🚀 resvg 渲染耗时: ${elapsed}ms | 缩放: ${config.svgScale}x | 字体: ${fontFileName} | font-family: ${fontFamilyDisplay}`;
          }
          const imgMsgId = await session.send(imageMessage);
          scheduleAutoRecall(session, config, String(imgMsgId));
          await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
        }

        // 发送合并转发
        if (config.sendForward) {
          const forwardMessage = formatGroupNoticeAsForward(paginatedResult, contextInfo, config);
          const fwdMsgId = await session.send(h.unescape(forwardMessage));
          scheduleAutoRecall(session, config, String(fwdMsgId));
        }

        // 输出日志到文件
        const protocol = config.onebotImplName.toLowerCase();
        logCommandToFile(ctx, config, protocol, '群公告列表', logs);

      } catch (error) {
        ctx.logger.error(`获取群公告列表失败: ${error}`);
        await session.send(`❌ 获取群公告列表失败: ${error.message}`);
      }
    });
}
