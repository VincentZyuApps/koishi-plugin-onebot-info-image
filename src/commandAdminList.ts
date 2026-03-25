import { Context, h } from 'koishi'
import { basename } from 'path'
import { Config } from './index'
import { IMAGE_STYLES, IMAGE_STYLE_KEY_ARR } from './type'
import { renderAdminList } from './renderAdminList'
import { svgAdminList } from './svgAdminList'
import { convertToUnifiedAdminInfo, convertToUnifiedContextInfo, UnifiedAdminInfo, UnifiedContextInfo } from './type'
import { scheduleAutoRecall, getGroupAvatarBase64, getUserAvatarBase64, loadResvgFont } from './utils'

export function registerAdminListCommand(ctx: Context, config: Config, responseHint: string) {
  if (!config.enableGroupAdminListCommand) return;

  ctx.command(config.groupAdminListCommandName, `获取群管理员列表, 发送${responseHint}`)
    .alias('al')
    .alias("awa_group_admin_list")
    .option("imageStyleIdx", "-i, --idx, --index <idx:number> 图片样式索引")
    .option("mode", "--mode <mode:string> 指定 svg 渲染模式 (light/dark)，优先级高于配置项")
    .action(async ({ session, options }) => {
      if (!session.onebot)
        return session.send("❌ 当前会话不支持 onebot 协议。");

      if (!session.guildId)
        return session.send("❌ 当前会话不在群聊中。");

      // 选择图片样式
      const IMAGE_STYLE_VALUES = Object.values(IMAGE_STYLES);
      const defaultStyleDetailObj = config.imageStyleDetails.length > 0
        ? config.imageStyleDetails[0]
        : { styleKey: IMAGE_STYLE_KEY_ARR[0], darkMode: false };

      let selectedStyleDetailObj = defaultStyleDetailObj;
      if (options.imageStyleIdx !== undefined) {
        const isIdxValid = (options.imageStyleIdx as number) >= 0
          && (options.imageStyleIdx as number) < config.imageStyleDetails.length;
        if (!isIdxValid) {
          let idxInvalidMsgArr = [
            `图片样式索引不合法。`,
            `\t 合法范围：[0, ${config.imageStyleDetails.length - 1}]双闭区间。`,
            `\t 当前输入：${options.imageStyleIdx}`,
            `\n`,
            `输入指令 ${config.inspectStyleCommandName} 查看图片样式列表。`
          ];
          return await session.send(idxInvalidMsgArr.join('\n'));
        }
        selectedStyleDetailObj = config.imageStyleDetails[options.imageStyleIdx as number];
      }

      try {
        const groupMemberListObj = await session.onebot.getGroupMemberList(session.guildId);
        const groupInfoObj = await session.onebot.getGroupInfo(session.guildId);
        const groupAdminMemberListObj = groupMemberListObj.filter(m => m.role === 'admin' || m.role === 'owner');

        let groupAdminMemberListObjMsg = `groupAdminMemberListObj = \n\t ${JSON.stringify(groupAdminMemberListObj)}`;
        if (config.verboseSessionOutput) await session.send(groupAdminMemberListObjMsg);
        if (config.verboseConsoleOutput) ctx.logger.info(groupAdminMemberListObjMsg);

        if (groupAdminMemberListObj.length === 0) {
          return session.send("📋 该群没有管理员。");
        }

        // 获取管理员头像并转换为 AdminInfo 格式
        const adminListArg: UnifiedAdminInfo[] = [];
        for (const member of groupAdminMemberListObj) {
          try {
            // @ts-ignore - getGroupMemberList()返回的数组里面，每一个member对象 实际包含 user_id 字段，但类型定义中缺失 (here ↓)
            // node_modules/koishi-plugin-adapter-onebot/lib/types.d.ts:  export interface GroupMemberInfo extends SenderInfo
            const userObj = await session.bot.getUser(member.user_id);
            const rawAdminInfo = {
              user_id: member.user_id,
              nickname: member.nickname,
              card: member.card,
              role: member.role as 'owner' | 'admin',
              level: member.level,
              join_time: member.join_time,
              last_sent_time: member.last_sent_time,
              title: member.title,
              avatar: userObj.avatar || ''
            };
            adminListArg.push(convertToUnifiedAdminInfo(rawAdminInfo, config.onebotImplName));
          } catch (error) {
            ctx.logger.error(`获取管理员列表信息失败: ${error}`);
          }
        }

        adminListArg.sort((a, b) => {
          // 群主优先
          if (a.role === 'owner' && b.role !== 'owner') return -1
          if (a.role !== 'owner' && b.role === 'owner') return 1

          // 非群主之间按 card 字典序降序
          const cardA = a.card || ''
          const cardB = b.card || ''
          return cardB.localeCompare(cardA, 'zh') // 支持中文拼音
        })

        const contextInfo = {
          isGroup: true,
          groupId: parseInt(session.guildId),
          groupName: groupInfoObj.group_name || '未知群聊',
          memberCount: groupInfoObj.member_count || 0,
          maxMemberCount: groupInfoObj.max_member_count || 0,
          groupAvatarUrl: `https://p.qlogo.cn/gh/${session.guildId}/${session.guildId}/640/`
        };

        if (config.sendText) {
          const unifiedContextInfo = convertToUnifiedContextInfo(contextInfo, config.onebotImplName);
          const formattedText = formatAdminListDirectText(adminListArg, unifiedContextInfo);
          const textMsgId = await session.send(`${config.enableQuoteWithText ? h.quote(session.messageId) : ''}${formattedText}`);
          scheduleAutoRecall(session, config, String(textMsgId));
        }

        if (config.sendImage) {
          ctx.logger.info(`context info = ${JSON.stringify(contextInfo)}`)
          const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🔄正在使用 Puppeteer 渲染群管理员列表图片，请稍候⏳...`);
          const unifiedContextInfo = convertToUnifiedContextInfo(contextInfo, config.onebotImplName);
          const selectedImageStyle = IMAGE_STYLES[selectedStyleDetailObj.styleKey];
          const selectedDarkMode = selectedStyleDetailObj.darkMode;
          const startTime = Date.now();
          const adminListImageBase64 = await renderAdminList(ctx, adminListArg, unifiedContextInfo, selectedImageStyle, selectedDarkMode, config.imageType, config.screenshotQuality);
          let imageMsg = `${config.enableQuoteWithImage ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${adminListImageBase64}`)}`;
          if (config.imageShowRenderInfo) {
            const elapsed = Date.now() - startTime;
            imageMsg += `\n🖼️ Puppeteer 渲染耗时: ${elapsed}ms | 样式: ${selectedStyleDetailObj.styleKey} | 黑暗模式：${selectedDarkMode ? '开启' : '关闭'} | 类型: ${config.imageType} | 质量: ${config.screenshotQuality}`;
          }
          const imgMsgId = await session.send(imageMsg);
          scheduleAutoRecall(session, config, String(imgMsgId));
          await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
        }

        if (config.sendImageSvg) {
          const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🚀正在用 resvg 渲染群管理员列表图片，请稍候⏳...`);
          const unifiedContextInfo = convertToUnifiedContextInfo(contextInfo, config.onebotImplName);
          const groupAvatarBase64 = await getGroupAvatarBase64(ctx, session.guildId);
          const startTime = Date.now();
          let svgDarkMode = config.svgEnableDarkMode;
          if (options.mode === 'dark') svgDarkMode = true;
          if (options.mode === 'light') svgDarkMode = false;

          // 获取每个管理员的头像 base64
          const avatarsBase64: Record<string, string> = {};
          for (const admin of adminListArg) {
            const userIdStr = String(admin.user_id);
            avatarsBase64[userIdStr] = await getUserAvatarBase64(ctx, admin.user_id);
          }

          const svgImageBase64 = await svgAdminList(ctx, {
            admins: adminListArg,
            contextInfo: unifiedContextInfo,
            groupAvatarBase64,
            avatarsBase64,
            enableDarkMode: svgDarkMode,
            scale: config.svgScale,
            enableEmoji: config.svgEnableEmoji,
            enableEmojiCache: config.svgEnableEmojiCache,
            svgThemeColor: config.svgThemeColor,
            enableCustomFont: config.svgEnableCustomFont,
            fontFiles: config.svgFontFiles,
            fontFamilies: config.svgFontFamilies,
          });
          if (config.sendImageSvg) ctx.logger.info(`svgAdminList: scale=${config.svgScale}`);
          const elapsed = Date.now() - startTime;
          const { fontFiles, fontFamily } = loadResvgFont(config.svgEnableCustomFont, config.svgFontFiles, config.svgFontFamilies)
          const fontFileName = fontFiles.length > 0 ? basename(fontFiles[0]) : '默认'
          const fontFamilyDisplay = config.svgEnableCustomFont ? fontFamily : '默认'
          let imageMsg = `${config.enableQuoteWithImageSvg ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${svgImageBase64}`)}`;
          if (config.svgShowRenderInfo) {
            imageMsg += `\n🚀 resvg 渲染耗时: ${elapsed}ms | 缩放: ${config.svgScale}x | 字体: ${fontFileName} | font-family: ${fontFamilyDisplay}`;
          }
          const imgMsgId = await session.send(imageMsg);
          scheduleAutoRecall(session, config, String(imgMsgId));
          await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
        }

        if (config.sendForward) {
          const unifiedContextInfo = convertToUnifiedContextInfo(contextInfo, config.onebotImplName);
          const forwardMessageContent = formatAdminListForwardText(adminListArg, unifiedContextInfo);
          const fwdMsgId = await session.send(h.unescape(forwardMessageContent));
          scheduleAutoRecall(session, config, String(fwdMsgId));
        }

      } catch (error) {
        ctx.logger.error(`获取群管理员列表失败: ${error}`);
        await session.send(`❌ 获取群管理员列表失败: ${error.message}`);
      }
    })
}

function formatAdminListDirectText(adminListArg: UnifiedAdminInfo[], contextInfo: UnifiedContextInfo): string {
  let output = '';

  output += `当前时间 (Current Time): ${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`;
  output += `===== 群管理员列表 (Group Admin List) =====\n`;
  output += `群名称 (Group Name): ${contextInfo.groupName || '未知群聊'}\n`;
  output += `群号 (Group ID): ${contextInfo.groupId}\n`;
  output += `成员数 (Member Count): ${contextInfo.memberCount}/${contextInfo.maxMemberCount}\n`;
  output += `管理员数量 (Admin Count): ${adminListArg.length}\n\n`;

  adminListArg.forEach((admin, index) => {
    output += `-----No. ${index + 1}. ${admin.role === 'owner' ? '群主' : '管理员'} (${admin.role === 'owner' ? 'Owner' : 'Admin'})-----\n`;
    output += `   QQ号 (User ID): ${admin.user_id}\n`;
    output += `   昵称 (Nickname): ${admin.nickname || '未知'}\n`;
    if (admin.card) output += `   群名片 (Group Card): ${admin.card}\n`;
    if (admin.level) output += `   等级 (Level): ${admin.level}\n`;
    if (admin.join_time) output += `   入群时间 (Join Time): ${new Date(admin.join_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`;
    if (admin.title) output += `   头衔 (Title): ${admin.title}\n`;
    output += '\n';
  });

  return output;
}

function formatAdminListForwardText(adminListArg: UnifiedAdminInfo[], contextInfo: UnifiedContextInfo): string {
  let messages = '';

  // Helper to add a message block with author
  const addMessageBlock = (authorId: string, authorName: string, adminUsrInfoStr: string) => {
    messages += `
              <message>
                <author ${authorId ? `id="${authorId}"` : ``} name="${authorName}"/>
                ${adminUsrInfoStr}
              </message>`;
  };

  // First message: Group basic information
  addMessageBlock(
    undefined,
    '群聊基本信息',
    [
      `当前时间: \t ${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`,
      `=========群聊信息=========`,
      `群名称: \t ${contextInfo.groupName || '未知群聊'}`,
      `群号: \t ${contextInfo.groupId}`,
      `成员数: \t ${contextInfo.memberCount}/${contextInfo.maxMemberCount}`,
      `管理员数量: \t ${adminListArg.length}`
    ].join('\n')
  );

  // Subsequent messages: Each admin's full information
  // for (const admin of adminListArg) {
  for (let i = 0; i < adminListArg.length; i++) {
    const admin = adminListArg[i];
    const authorName = admin.card || admin.nickname || `QQ: ${admin.user_id}`;
    const adminDetails = [
      `---------No. ${i + 1}---------`,
      `QQ号: \t ${admin.user_id}`,
      `昵称: \t ${admin.nickname}`,
      `角色: \t ${admin.role === 'owner' ? '群主' : '管理员'}`,
      admin.card ? `群昵称: \t ${admin.card}` : '',
      admin.level ? `等级: \t ${admin.level}` : '',
      admin.title ? `群头衔: \t ${admin.title}` : '',
      admin.join_time ? `加入本群时间: \t ${new Date(admin.join_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '',
      admin.last_sent_time ? `最后发言时间: \t ${new Date(admin.last_sent_time * 1000).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}` : '',

    ].filter(Boolean).join('\n'); // Filter out empty strings and join with newline

    addMessageBlock(
      admin.user_id.toString(),
      authorName,
      adminDetails
    );
  }

  // Wrap all messages in the forward tag
  return `<message forward>\n${messages}\n</message>`;
}
