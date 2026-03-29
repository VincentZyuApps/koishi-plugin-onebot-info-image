import { Context, h } from 'koishi'
import { basename } from 'path'
import { Config } from './index'
import { IMAGE_STYLES, IMAGE_STYLE_KEY_ARR } from './type'
import { renderGroupEssence } from './renderGroupEssenceList'
import { svgGroupEssence } from './svgGroupEssenceList'
import { scheduleAutoRecall, getGroupAvatarBase64, getUserAvatarBase64, logCommandToFile, loadResvgFont } from './utils'

// 群精华消息的原始格式
export interface GroupEssenceMessageRaw {
  msg_seq: number;
  msg_random: number;
  sender_id: number;
  sender_nick: string;
  operator_id: number;
  operator_nick: string;
  message_id: number;
  operator_time: number;
  content: Array<{
    type: string;
    data: Record<string, any>;
  }>;
}

// 分页结果
export interface PaginatedEssenceResult {
  records: GroupEssenceMessageRaw[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * 对群精华消息列表进行分页处理
 */
function paginateEssenceMessages(
  essenceList: GroupEssenceMessageRaw[],
  page: number,
  pageSize: number
): PaginatedEssenceResult {
  const totalCount = essenceList.length;
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const records = essenceList.slice(startIndex, endIndex);

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
 * 解析群精华消息内容为可读文本
 */
function parseEssenceContent(content: Array<{ type: string; data: Record<string, any> }>): string {
  if (!content || content.length === 0) {
    return '[空消息]';
  }

  return content.map(item => {
    switch (item.type) {
      case 'text':
        return item.data.text || '';
      case 'image':
        return '[图片]';
      case 'face':
        return `[表情:${item.data.id || ''}]`;
      case 'at':
        return `@${item.data.qq || item.data.name || '某人'}`;
      case 'reply':
        return `[回复:${item.data.id || ''}]`;
      case 'forward':
        return '[转发消息]';
      case 'video':
        return '[视频]';
      case 'record':
        return '[语音]';
      case 'file':
        return '[文件]';
      default:
        return `[${item.type}]`;
    }
  }).join('');
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

export function registerGroupEssenceCommand(ctx: Context, config: Config, responseHint: string) {
  if (!config.enableGroupEssenceCommand) return;

  ctx.command(config.groupEssenceCommandName, `获取群精华列表, 发送${responseHint}`)
    .alias('群精华')
    .alias('age')
    .option('page', '-p, --page <page:number> 页码，从1开始', { fallback: 1 })
    .option('pagesize', '-s, --pagesize <pagesize:number> 每页显示条数', { fallback: config.groupEssencePageSize || 5 })
    .option('imageStyleIdx', '-i, --idx, --index <idx:number> 图片样式索引')
    .option("mode", "--mode <mode:string> 指定 svg 渲染模式 (light/dark)，优先级高于配置项")
    .action(async ({ session, options }) => {
      if (!session.onebot)
        return session.send('❌ 当前会话不支持 onebot 协议。');

      if (!session.guildId)
        return session.send('❌ 当前会话不在群聊中。');

      // 验证分页参数
      const page = Math.max(1, options.page || 1);
      const pageSize = Math.max(1, Math.min(50, options.pagesize || config.groupEssencePageSize || 5));

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

      // 日志收集
      const logs: string[] = [];

      try {
        // 获取群精华消息列表
        const onebotBot = (session as any).onebot;
        const groupEssenceMsgList: GroupEssenceMessageRaw[] = await onebotBot.getEssenceMsgList(session.guildId);

        if (!groupEssenceMsgList || groupEssenceMsgList.length === 0) {
          return session.send('💎 该群暂无精华消息。');
        }

        // 分页处理
        const paginatedResult = paginateEssenceMessages(groupEssenceMsgList, page, pageSize);

        if (paginatedResult.records.length === 0) {
          return session.send(`❌ 第 ${page} 页没有记录，共 ${paginatedResult.totalPages} 页`);
        }

        // 获取群信息
        const groupInfoObj = await session.onebot.getGroupInfo(session.guildId);
        const contextInfo = {
          groupId: parseInt(session.guildId),
          groupName: groupInfoObj.group_name || '未知群聊',
          memberCount: groupInfoObj.member_count || 0,
          maxMemberCount: groupInfoObj.max_member_count || 0,
          groupAvatarUrl: `https://p.qlogo.cn/gh/${session.guildId}/${session.guildId}/640/`
        };

        logs.push(`群精华消息分页结果: ${JSON.stringify(paginatedResult)}`);
        if (config.verboseConsoleOutput) {
          ctx.logger.info(`群精华消息分页结果: ${JSON.stringify(paginatedResult)}`);
        }

        // 发送文本
        if (config.sendText) {
          const textMessage = formatGroupEssenceAsText(paginatedResult, contextInfo, config);
          const textMsgId = await session.send(`${config.enableQuoteWithText ? h.quote(session.messageId) : ''}${textMessage}`);
          scheduleAutoRecall(session, config, String(textMsgId));
        }

        // 发送图片
        if (config.sendImage && ctx.puppeteer) {
          const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🔄正在使用 Puppeteer 渲染群精华列表，请稍候⏳...`);
          const selectedImageStyle = IMAGE_STYLES[selectedStyleDetailObj.styleKey];
          const selectedDarkMode = selectedStyleDetailObj.darkMode;
          const startTime = Date.now();
          const essenceImageBase64 = await renderGroupEssence(
            ctx,
            paginatedResult,
            contextInfo,
            selectedImageStyle,
            selectedDarkMode,
            config.imageType,
            config.screenshotQuality
          );
          // 构建图片消息+分页导航+用法提示
          let imageMessage = `${config.enableQuoteWithImage ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${essenceImageBase64}`)}`;
          // 添加分页导航
          if (paginatedResult.totalPages > 1) {
            imageMessage += `\n📄 第 ${paginatedResult.currentPage}/${paginatedResult.totalPages} 页`;
            if (paginatedResult.hasPrev) {
              imageMessage += ` | ◀ ${config.groupEssenceCommandName} -p ${paginatedResult.currentPage - 1}`;
            }
            if (paginatedResult.hasNext) {
              imageMessage += ` | ▶ ${config.groupEssenceCommandName} -p ${paginatedResult.currentPage + 1}`;
            }
          }
          // 添加用法提示（简化版）
          imageMessage += `\n📖 用法: ${config.groupEssenceCommandName} -p 《页码》 -s 《每页条数》`;
          if (config.imageShowRenderInfo) {
            const elapsed = Date.now() - startTime;
            imageMessage += `\n🖼️ Puppeteer 渲染耗时: ${elapsed}ms | 样式: ${selectedStyleDetailObj.styleKey} | 黑暗模式：${selectedDarkMode ? '开启' : '关闭'} | 类型: ${config.imageType} | 质量: ${config.screenshotQuality}`;
          }
          const imgMsgId = await session.send(imageMessage);
          scheduleAutoRecall(session, config, String(imgMsgId));
          await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
        }

        if (config.sendImageSvg) {
          const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🚀正在用 resvg 渲染群精华列表，请稍候⏳...`);
          const groupAvatarBase64 = await getGroupAvatarBase64(ctx, session.guildId);
          const startTime = Date.now();
          let svgDarkMode = config.svgEnableDarkMode;
          if (options.mode === 'dark') svgDarkMode = true;
          if (options.mode === 'light') svgDarkMode = false;

          // 获取每个发送者的头像
          const avatarsBase64: Record<string, string> = {};
          for (const record of paginatedResult.records) {
            const senderIdStr = String(record.sender_id);
            avatarsBase64[senderIdStr] = await getUserAvatarBase64(ctx, record.sender_id);
          }

          // 获取每条消息中的图片
          const imagesBase64: Record<string, string> = {};
          for (const record of paginatedResult.records) {
            for (const item of record.content) {
              if (item.type === 'image' && item.data.url) {
                let imageUrl = item.data.url;
                // 清理 URL 中的反引号和逗号
                imageUrl = imageUrl.replace(/[`]/g, '').replace(/[,]$/, '').trim();
                logs.push(`[群精华列表] 发现图片URL: ${imageUrl.substring(0, 50)}...`);
                ctx.logger.info(`[群精华列表] 发现图片URL: ${imageUrl.substring(0, 50)}...`);
                if (!imagesBase64[imageUrl]) {
                  try {
                    const response = await ctx.http.get(imageUrl, { responseType: 'arraybuffer' });
                    imagesBase64[imageUrl] = Buffer.from(response).toString('base64');
                    logs.push(`[群精华列表] 图片获取成功: ${imageUrl.substring(0, 50)}..., base64长度: ${imagesBase64[imageUrl].length}`);
                    ctx.logger.info(`[群精华列表] 图片获取成功: ${imageUrl.substring(0, 50)}..., base64长度: ${imagesBase64[imageUrl].length}`);
                  } catch (error) {
                    logs.push(`[群精华列表] 获取精华消息图片失败: ${error.message}, URL: ${imageUrl.substring(0, 50)}...`);
                    ctx.logger.warn(`[群精华列表] 获取精华消息图片失败: ${error.message}, URL: ${imageUrl.substring(0, 50)}...`);
                  }
                } else {
                  logs.push(`[群精华列表] 图片已缓存: ${imageUrl.substring(0, 50)}...`);
                  ctx.logger.info(`[群精华列表] 图片已缓存: ${imageUrl.substring(0, 50)}...`);
                }
              }
            }
          }
          logs.push(`[群精华列表] 总共获取 ${Object.keys(imagesBase64).length} 张图片`);
          ctx.logger.info(`[群精华列表] 总共获取 ${Object.keys(imagesBase64).length} 张图片`);

          const svgImageBase64 = await svgGroupEssence(ctx, {
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
            logs.push(`svgGroupEssence: scale=${config.svgScale}`);
            ctx.logger.info(`svgGroupEssence: scale=${config.svgScale}`);
          }
          const elapsed = Date.now() - startTime;
          logs.push(`resvg 渲染耗时: ${elapsed}ms | 缩放: ${config.svgScale}x`);
          const { fontFiles, fontFamily } = loadResvgFont(config.svgEnableCustomFont, config.svgFontFiles, config.svgFontFamilies)
          const fontFileName = fontFiles.length > 0 ? basename(fontFiles[0]) : '默认'
          const fontFamilyDisplay = config.svgEnableCustomFont ? fontFamily : '默认'
          let imageMessage = `${config.enableQuoteWithImageSvg ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${svgImageBase64}`)}`;
          if (paginatedResult.totalPages > 1) {
            imageMessage += `\n📄 第 ${paginatedResult.currentPage}/${paginatedResult.totalPages} 页`;
            if (paginatedResult.hasPrev) {
              imageMessage += ` | ◀ ${config.groupEssenceCommandName} -p ${paginatedResult.currentPage - 1}`;
            }
            if (paginatedResult.hasNext) {
              imageMessage += ` | ▶ ${config.groupEssenceCommandName} -p ${paginatedResult.currentPage + 1}`;
            }
          }
          imageMessage += `\n📖 用法: ${config.groupEssenceCommandName} -p 《页码》 -s 《每页条数》`;
          if (config.svgShowRenderInfo) {
            imageMessage += `\n🚀 resvg 渲染耗时: ${elapsed}ms | 缩放: ${config.svgScale}x | 字体: ${fontFileName} | font-family: ${fontFamilyDisplay}`;
          }
          const imgMsgId = await session.send(imageMessage);
          scheduleAutoRecall(session, config, String(imgMsgId));
          await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
        }

        // 发送合并转发
        if (config.sendForward) {
          const forwardMessage = formatGroupEssenceAsForward(paginatedResult, contextInfo, config);
          const fwdMsgId = await session.send(h.unescape(forwardMessage));
          scheduleAutoRecall(session, config, String(fwdMsgId));
        }

        // 输出日志到文件
        const protocol = config.onebotImplName.toLowerCase();
        logCommandToFile(ctx, config, protocol, '群精华列表', logs);

      } catch (error) {
        ctx.logger.error(`获取群精华消息失败: ${error}`);
        await session.send(`❌ 获取群精华消息失败: ${error.message}`);
      }
    });
}

interface EssenceContextInfo {
  groupId: number;
  groupName: string;
  memberCount: number;
  maxMemberCount: number;
  groupAvatarUrl: string;
}

/**
 * 格式化群精华为文本消息
 */
function formatGroupEssenceAsText(
  result: PaginatedEssenceResult,
  contextInfo: EssenceContextInfo,
  config: Config
): string {
  let output = '';

  output += `===== 群精华消息列表 =====\n`;
  output += `群名称: ${contextInfo.groupName}\n`;
  output += `群号: ${contextInfo.groupId}\n`;
  output += `第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条精华)\n\n`;

  result.records.forEach((record, index) => {
    const globalIndex = (result.currentPage - 1) * result.pageSize + index + 1;
    output += `-----No. ${globalIndex}-----\n`;
    output += `发送者: ${record.sender_nick} (${record.sender_id})\n`;
    output += `设精华: ${record.operator_nick} (${record.operator_id})\n`;
    output += `时间: ${formatTimestamp(record.operator_time)}\n`;
    output += `内容: ${parseEssenceContent(record.content)}\n\n`;
  });

  // 添加分页导航
  if (result.totalPages > 1) {
    output += `------------------\n`;
    if (result.hasPrev) {
      output += `上一页: ${config.groupEssenceCommandName} -p ${result.currentPage - 1} -s ${result.pageSize}\n`;
    }
    if (result.hasNext) {
      output += `下一页: ${config.groupEssenceCommandName} -p ${result.currentPage + 1} -s ${result.pageSize}\n`;
    }
  }

  // 添加参数用法说明
  output += `\n==================\n`;
  output += `📖 参数用法:\n`;
  output += `  -p, --page 《页码》     指定页码(从1开始)\n`;
  output += `  -s, --pagesize 《条数》 每页显示条数\n`;
  output += `📝 示例:\n`;
  output += `  ${config.groupEssenceCommandName} -p 2        查看第2页\n`;
  output += `  ${config.groupEssenceCommandName} -s 10       每页显示10条\n`;
  output += `  ${config.groupEssenceCommandName} -p 3 -s 8   第3页,每页8条\n`;

  return output;
}

/**
 * 格式化群精华为合并转发消息
 */
function formatGroupEssenceAsForward(
  result: PaginatedEssenceResult,
  contextInfo: EssenceContextInfo,
  config: Config
): string {
  let messages = '';

  const addMessageBlock = (authorId: string | undefined, authorName: string, content: string) => {
    messages += `
      <message>
        <author ${authorId ? `id="${authorId}"` : ''} name="${authorName}"/>
        ${content}
      </message>`;
  };

  // 首条消息：群信息和分页信息
  addMessageBlock(
    undefined,
    '群精华消息列表',
    [
      `群名称: ${contextInfo.groupName}`,
      `群号: ${contextInfo.groupId}`,
      `第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条精华)`
    ].join('\n')
  );

  // 每条精华消息
  result.records.forEach((record, index) => {
    const globalIndex = (result.currentPage - 1) * result.pageSize + index + 1;
    const messageContent = [
      `-----No. ${globalIndex}-----`,
      `发送者: ${record.sender_nick} (${record.sender_id})`,
      `设精华: ${record.operator_nick} (${record.operator_id})`,
      `时间: ${formatTimestamp(record.operator_time)}`,
      `内容: ${parseEssenceContent(record.content)}`
    ].join('\n');

    addMessageBlock(
      record.sender_id.toString(),
      record.sender_nick,
      messageContent
    );
  });

  // 分页导航
  if (result.totalPages > 1) {
    let navText = '';
    if (result.hasPrev) {
      navText += `上一页: ${config.groupEssenceCommandName} -p ${result.currentPage - 1} -s ${result.pageSize}\n`;
    }
    if (result.hasNext) {
      navText += `下一页: ${config.groupEssenceCommandName} -p ${result.currentPage + 1} -s ${result.pageSize}`;
    }
    if (navText) {
      addMessageBlock(undefined, '分页导航', navText);
    }
  }

  // 添加参数用法说明
  const usageText = [
    `📖 参数用法:`,
    `  -p, --page 《页码》     指定页码(从1开始)`,
    `  -s, --pagesize 《条数》 每页显示条数`,
    `📝 示例:`,
    `  ${config.groupEssenceCommandName} -p 2        查看第2页`,
    `  ${config.groupEssenceCommandName} -s 10       每页显示10条`,
    `  ${config.groupEssenceCommandName} -p 3 -s 8   第3页,每页8条`
  ].join('\n');
  addMessageBlock(undefined, '参数用法', usageText);

  return `<message forward>\n${messages}\n</message>`;
}

// 导出解析函数供 render 使用
export { parseEssenceContent };
