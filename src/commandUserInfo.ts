import { Context, h } from 'koishi'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import { Config } from './index'
import { IMAGE_STYLES, IMAGE_STYLE_KEY_ARR, ONEBOT_IMPL_NAME, getNapcatQQStatusText } from './type'
import { renderUserInfo } from './renderUserInfo'
import { svgUserInfo } from './svgUserInfo'
import { convertToUnifiedUserInfo, convertToUnifiedContextInfo, UnifiedUserInfo, UnifiedContextInfo } from './type'
import { getGroupAvatarBase64 } from './utils'
import { scheduleAutoRecall } from './utils'

export function registerUserInfoCommand(ctx: Context, config: Config, responseHint: string) {
  if (!config.enableUserInfoCommand) return;

  ctx.command(`${config.userinfoCommandName} [qqId:string]`, `获取用户信息, 发送${responseHint}`)
    .alias('aui')
    .alias("awa_user_info")
    .option("imageStyleIdx", "-i, --idx, --index <idx:number> 图片样式索引")
    .option("mode", "--mode <mode:string> 指定 svg 渲染模式 (light/dark)，优先级高于配置项")
    .action(async ({ session, options }, qqId) => {
      if (!session.onebot)
        return session.send("[error]当前会话不支持onebot协议。");

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

      let targetUserId = session.userId;
      // 是否通过参数直接指定了目标用户（QQ号 或 @元素）
      let isDirectQuery = false;
      if (qqId) {
        // 尝试从 @ 元素中提取用户 ID
        const userIdRegex = /<at id="([^"]+)"(?: name="[^"]*")?\/>/;
        const match = qqId.match(userIdRegex);
        if (match) {
          // 是 @ 元素，提取 id
          targetUserId = match[1];
          isDirectQuery = true;
        } else {
          // 不是 @ 元素，当作纯 QQ 号字符串处理
          targetUserId = qqId;
          isDirectQuery = true;
        }
      }
      // 如果没有传参，检查消息中是否有 @ 用户（不算直接查询，走群聊逻辑）
      if (!isDirectQuery) {
        for (const e of session.event.message.elements) {
          if (e.type === 'at') {
            targetUserId = e.attrs.id;
            break;
          }
        }
      }
      const isDirectQueryMsg = `是否直接传入了qq号或者艾特元素作为参数。isDirectQuery = ${isDirectQuery}`
      if (config.verboseSessionOutput) await session.send(isDirectQueryMsg);
      if (config.verboseConsoleOutput) ctx.logger.info(isDirectQueryMsg);


      const userObj = await session.bot.getUser(targetUserId);
      let userObjMsg = `userObj = \n\t ${JSON.stringify(userObj)}`;
      // await session.send(userObjMsg);
      const userAvatarUrl = userObj.avatar;

      let userInfoArg = {
        status: null
      };
      let contextInfo = {
        isGroup: false,
        groupId: null,
        groupName: null,
        groupAvatarUrl: null,
        memberCount: null,
        maxMemberCount: null
      };


      try {
        // 获取陌生人信息（包含头像等基本信息）
        const strangerInfoObj = await session.onebot.getStrangerInfo(targetUserId);
        let strangerInfoObjMsg = `strangerInfoObj = \n\t ${JSON.stringify(strangerInfoObj)}`;
        if (config.verboseSessionOutput) await session.send(strangerInfoObjMsg);
        if (config.verboseConsoleOutput) ctx.logger.info(strangerInfoObjMsg);

        let groupMemberInfoObj = undefined;
        let groupInfoObj = undefined;

        if (session.guildId) { // 在群聊中
          try{
            groupMemberInfoObj = await session.onebot.getGroupMemberInfo(session.guildId, targetUserId);
            let groupMemberInfoObjMsg = `groupMemberInfoObj = \n\t ${JSON.stringify(groupMemberInfoObj)}`;
            if (config.verboseSessionOutput) await session.send(groupMemberInfoObjMsg);
            if (config.verboseConsoleOutput) ctx.logger.info(groupMemberInfoObjMsg);
          } catch ( e ) {
            ctx.logger.warn('获取用户信息失败捏，把groupMemberInfoObj设置成*undefined*好了');
          }
          

          groupInfoObj = await session.onebot.getGroupInfo(session.guildId);
          let groupInfoObjMsg = `groupInfoObj = \n\t ${JSON.stringify(groupInfoObj)}`;
          if (config.verboseSessionOutput) await session.send(groupInfoObjMsg);
          if (config.verboseConsoleOutput) ctx.logger.info(groupInfoObjMsg);

          // 合并群成员信息和陌生人信息，优先保留陌生人信息中的关键字段
          userInfoArg = {
            ...groupMemberInfoObj,
            ...strangerInfoObj,
            // @ts-ignore - strangerInfoObj 实际包含 age 字段，但类型定义中缺失
            age: strangerInfoObj.age,
            // @ts-ignore - strangerInfoObj 实际包含 level 字段，但类型定义中缺失 (here ↓)
            // node_modules/koishi-plugin-adapter-onebot/lib/types.d.ts:  export interface StrangerInfo ...
            level: strangerInfoObj.level,
            sex: strangerInfoObj.sex,
            card: groupMemberInfoObj ? groupMemberInfoObj.card : '-',
            role: groupMemberInfoObj ? groupMemberInfoObj.role : '-',
            join_time: groupMemberInfoObj ? groupMemberInfoObj.join_time : '-',
            last_sent_time: groupMemberInfoObj ? groupMemberInfoObj.last_sent_time : '-',
            group_level: groupMemberInfoObj ? groupMemberInfoObj.level : '-',
            title: groupMemberInfoObj ? groupMemberInfoObj.title : '这人可能不在群里(',
            avatar: userObj.avatar
          };

          // 设置群聊上下文信息
          contextInfo = {
            isGroup: true,
            groupId: session.guildId,
            //@ts-ignore - groupInfoObj 在lagrange中 实际包含 GroupName 字段，但类型定义中缺失
            groupName: groupInfoObj.GroupName || groupInfoObj.group_name,
            groupAvatarUrl: `https://p.qlogo.cn/gh/${session.guildId}/${session.guildId}/640/`,
            memberCount: groupInfoObj.member_count || 0,
            maxMemberCount: groupInfoObj.max_member_count || 0,
          };
        } else {  // 不在群聊中
          // 私聊情况，只使用陌生人信息
          userInfoArg = {
            ...strangerInfoObj,
            // @ts-ignore - userObj 确实有avatar字段
            avatar: userObj.avatar
          };
          contextInfo = {
            isGroup: false,
            groupId: null,
            groupName: null,
            groupAvatarUrl: null,
            memberCount: null,
            maxMemberCount: null
          };
        }

        if (config.onebotImplName === ONEBOT_IMPL_NAME.LAGRNAGE) {
          // userInfoArg.status = {

          // }
        } else if (config.onebotImplName === ONEBOT_IMPL_NAME.NAPCAT) {
          const ncUserStatusObj = await session.onebot._request('nc_get_user_status', { user_id: targetUserId });
          const napcatStatusData = ncUserStatusObj?.data ?? null;
          // ctx.logger.info(`[napcat独有]: ncUserStatusObj = \n\t ${JSON.stringify(ncUserStatusObj)}`);
          userInfoArg.status = {
            napcat_origin: ncUserStatusObj,
            message: getNapcatQQStatusText(napcatStatusData?.status, napcatStatusData?.ext_status)
          }
          // ctx.logger.info(`[napcat独有]: userInfoArg.status = \n\t ${JSON.stringify(userInfoArg.status)}`);
        }

        let userInfoArgMsg = `userInfoArg = \n\t ${JSON.stringify(userInfoArg)}`;
        let contextInfoMsg = `contextInfo = \n\t ${JSON.stringify(contextInfo)}`;
        if (config.verboseSessionOutput) {
          await session.send(userInfoArgMsg);
          await session.send(contextInfoMsg);
        }
        if (config.verboseConsoleOutput) {
          await ctx.logger.info(userInfoArgMsg);
          await ctx.logger.info(contextInfoMsg);
        }

        const unifiedUserInfo = convertToUnifiedUserInfo(userInfoArg, config.onebotImplName);
        const unifiedContextInfo = convertToUnifiedContextInfo(contextInfo, config.onebotImplName);

        let unifiedUserInfoMsg = `unifiedUserInfo = \n\t ${JSON.stringify(unifiedUserInfo)}`;
        let unifiedContextInfoMsg = `unifiedContextInfo = \n\t ${JSON.stringify(unifiedContextInfo)}`;
        if (config.verboseSessionOutput) {
          await session.send(unifiedUserInfoMsg);
          await session.send(unifiedContextInfoMsg);
        }
        if (config.verboseConsoleOutput) {
          await ctx.logger.info(unifiedUserInfoMsg);
          await ctx.logger.info(unifiedContextInfoMsg);
        }

        if (config.sendText) {
          ctx.logger.info("text");
          const formattedText = formatUserInfoDirectText(unifiedUserInfo, unifiedContextInfo);
          const textMsgId = await session.send(`${config.enableQuoteWithText ? h.quote(session.messageId) : ''}${formattedText}`);
          scheduleAutoRecall(session, config, String(textMsgId));
        }

        if (config.sendImage) {
          const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🔄正在渲染用户信息图片，请稍候⏳...`);
          const selectedImageStyle = IMAGE_STYLES[selectedStyleDetailObj.styleKey];
          const selectedDarkMode = selectedStyleDetailObj.darkMode;
          const userInfoimageBase64 = await renderUserInfo(ctx, unifiedUserInfo, unifiedContextInfo, selectedImageStyle, selectedDarkMode, config.imageType, config.screenshotQuality, config.hidePhoneNumber);
          if (config.verboseFileOutput) {
            try {
              const tmpDir = resolve(__dirname, '../tmp');
              mkdirSync(tmpDir, { recursive: true });
              const outputPath = resolve(tmpDir, 'image_base64.txt');
              writeFileSync(outputPath, userInfoimageBase64, 'utf-8');
              ctx.logger.info(`图片 base64 已输出到: ${outputPath}`);
            } catch (error) {
              ctx.logger.error(`写入 base64 文件失败: ${error.message}`);
            }
          }
          await session.send(`${config.enableQuoteWithImage ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${userInfoimageBase64}`)}`).then(msgId => {
            scheduleAutoRecall(session, config, String(msgId));
          });
          await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
        }

        if (config.sendImageSvg) {
          const waitTipMsgId = await session.send(`${h.quote(session.messageId)}🚀正在用 resvg 渲染用户信息图片，请稍候⏳...`);
          let avatarBase64 = '';
          try {
            if (userObj.avatar) {
              const avatarBuffer = await ctx.http.file(userObj.avatar);
              avatarBase64 = Buffer.from(avatarBuffer.data).toString('base64');
            }
          } catch (e) {
            ctx.logger.warn(`获取用户头像失败: ${e.message}`);
          }
          let groupAvatarBase64 = '';
          if (unifiedContextInfo.isGroup && unifiedContextInfo.groupId) {
            groupAvatarBase64 = await getGroupAvatarBase64(ctx, String(unifiedContextInfo.groupId));
          }
          const startTime = Date.now();
          let svgDarkMode = config.svgEnableDarkMode;
          if (options.mode === 'dark') svgDarkMode = true;
          if (options.mode === 'light') svgDarkMode = false;
          const svgImageBase64 = await svgUserInfo(ctx, unifiedUserInfo, unifiedContextInfo, {
            userInfo: unifiedUserInfo,
            contextInfo: unifiedContextInfo,
            avatarBase64,
            groupAvatarBase64,
            enableDarkMode: svgDarkMode,
            hidePhoneNumber: config.hidePhoneNumber,
            scale: config.svgScale,
            enableEmoji: config.svgEnableEmoji,
            enableEmojiCache: config.svgEnableEmojiCache,
          });
          if (config.sendImageSvg) ctx.logger.info(`svgUserInfo: scale=${config.svgScale}`);
          const elapsed = Date.now() - startTime;
          await session.send(`${config.enableQuoteWithImageSvg ? h.quote(session.messageId) : ''}${h.image(`data:image/png;base64,${svgImageBase64}`)}\n🚀 resvg 渲染耗时: ${elapsed}ms`).then(msgId => {
            scheduleAutoRecall(session, config, String(msgId));
          });
          await session.bot.deleteMessage(session.guildId, String(waitTipMsgId));
        }

        if (config.sendForward) {
          const forwardMessageContent = formatUserInfoForwardText(session.bot, unifiedUserInfo, unifiedContextInfo);
          const fwdMsgId = await session.send(h.unescape(forwardMessageContent));
          scheduleAutoRecall(session, config, String(fwdMsgId));
        }


      } catch (error) {
        ctx.logger.error(`获取用户信息或渲染图片失败: \n\terror=${error}\n\terror.stack=${error.stack}`);
        await session.send(`[error]获取用户信息或渲染图片失败: \n\terror.message=${error.message}`);
      }

    })
}

function formatUserInfoDirectText(userInfo: UnifiedUserInfo, contextInfo: UnifiedContextInfo): string {
  let output = '';

  // User Information
  output += `----- 用户信息 (UserInfo) -----\n`;
  output += `QQ号\t(UserID): \t\t ${userInfo.user_id}\n`;
  if (userInfo.nickname) output += `昵称\t\t(Nickname): \t ${userInfo.nickname}\n`;
  if (userInfo.card) output += `群昵称\t(GroupCard): \t ${userInfo.card}\n`;
  if (userInfo.sex) output += `性别\t\t(Gender): \t ${userInfo.sex === 'male' ? '男 (Male)' : userInfo.sex === 'female' ? '女 (Female)' : '未知 (Unknown)'}\n`;
  if (userInfo.age) output += `年龄\t\t(Age): \t\t ${userInfo.age}\n`;
  if (userInfo.level) output += `等级\t\t(Level): \t\t ${userInfo.level}\n`;
  if (userInfo.sign) output += `个性签名\t(Signature): \t ${userInfo.sign}\n`;
  if (userInfo.role) output += `群角色\t(GroupRole): \t ${userInfo.role === 'owner' ? '群主 (Owner)' : userInfo.role === 'admin' ? '管理员 (Admin)' : '成员 (Member)'}\n`;
  if (userInfo.join_time) output += `入群时间\t(JoinTime): \t ${new Date(userInfo.join_time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`;
  if (userInfo.RegisterTime) output += `注册时间\t(RegTime): \t ${new Date(userInfo.RegisterTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}\n`;


  // Context Information (Group/Private Chat Specifics)
  output += `\n--- 会话信息 (ContextInfo) ---\n`;
  output += `是否群聊 \t (IsGroupChat): ${contextInfo.isGroup ? '是 (Yes)' : '否 (No)'}\n`;
  if (contextInfo.isGroup && contextInfo.groupId) output += `群号 \t (GroupID): \t ${contextInfo.groupId}\n`;

  return output;
}

function formatUserInfoForwardText(botSelf: any, userInfo: UnifiedUserInfo, contextInfo: UnifiedContextInfo): string {
  let messages = '';

  // Helper to add a message block
  const addMessageBlock = (authorId: string, authorName: string, value: string) => {
    messages += `
          <message>
            <author ${authorId ? `id="${authorId}"` : ``} ${authorName ? `name="${authorName}"` : ``}/>
            ${value}
          </message>`;
  };

  // User Information
  addMessageBlock(undefined, '当前时间 (CurrentTime):', `${new Date().toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
  addMessageBlock(undefined, '信息类型 (InfoType):', '用户信息 (User Info)');
  addMessageBlock(userInfo.user_id, undefined, `QQ号 (UserID):\t${userInfo.user_id}`);
  if (userInfo.nickname) addMessageBlock(userInfo.user_id, undefined, `昵称 (Nickname):\t${userInfo.nickname}`);
  if (userInfo.card) addMessageBlock(userInfo.user_id, undefined, `群昵称 (GroupCard):\t${userInfo.card}`);
  if (userInfo.sex) addMessageBlock(userInfo.user_id, undefined, `性别 (Gender):\t\t${userInfo.sex === 'male' ? '男 (Male)' : userInfo.sex === 'female' ? '女 (Female)' : '未知 (Unknown)'}`);
  if (userInfo.age !== undefined && userInfo.age !== null) addMessageBlock(userInfo.user_id, undefined, `年龄 (Age):\t${userInfo.age}`);
  if (userInfo.level) addMessageBlock(userInfo.user_id, undefined, `等级 (Level):\t${userInfo.level}`);
  if (userInfo.sign) addMessageBlock(userInfo.user_id, undefined, `个性签名 (Signature):\t${userInfo.sign}`);
  if (userInfo.role) addMessageBlock(userInfo.user_id, undefined, `群角色 (GroupRole):\t\t${userInfo.role === 'owner' ? '群主 (Owner)' : userInfo.role === 'admin' ? '管理员 (Admin)' : '成员 (Member)'}`);
  if (userInfo.join_time) addMessageBlock(userInfo.user_id, undefined, `入群时间 (JoinTime):\t${new Date(userInfo.join_time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
  if (userInfo.RegisterTime) addMessageBlock(userInfo.user_id, undefined, `注册时间 (RegTime):\t${new Date(userInfo.RegisterTime).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`);


  // Context Information (Group/Private Chat Specifics)
  addMessageBlock(botSelf.userId, '信息类型 (Info Type):', '会话信息 (Context Info)');
  addMessageBlock(botSelf.userId, '是否群聊 (Is Group Chat):', `${contextInfo.isGroup ? '是 (Yes)' : '否 (No)'}`);
  if (contextInfo.isGroup && contextInfo.groupId) addMessageBlock(botSelf.userId, '群号 (Group ID):', `${contextInfo.groupId}`);

  // Wrap all messages in the forward tag
  return `<message forward>\n${messages}\n</message>`;
}
