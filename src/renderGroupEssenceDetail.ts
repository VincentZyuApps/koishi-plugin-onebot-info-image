// renderGroupEssenceDetail.ts
import { Context } from 'koishi';
import { } from 'koishi-plugin-puppeteer';

import { IMAGE_STYLES, FONT_FILES, type ImageStyle, ImageType } from './type';
import { generateTimestamp, getGroupAvatarBase64, getFontBase64 } from './utils';
import { GroupEssenceMessageRaw, formatTimestamp } from './commandGroupEssenceList';
import { EssenceDetailContextInfo } from './commandGroupEssenceDetail';

/**
 * 解析群精华消息内容为 HTML（详情页完整版本，不做截断）
 */
function parseEssenceContentToHtmlFull(content: Array<{ type: string; data: Record<string, any> }>): string {
  if (!content || content.length === 0) {
    return '<span class="empty-msg">[空消息]</span>';
  }

  return content.map(item => {
    switch (item.type) {
      case 'text':
        // 转义 HTML 特殊字符，保留换行
        const text = (item.data.text || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br/>');
        return `<span class="msg-text">${text}</span>`;
      case 'image':
        // 图片预览，详情页显示更大的图片
        const imageUrl = item.data.url || '';
        if (imageUrl) {
          return `<div class="msg-image-wrapper-large"><img class="msg-image-preview-large" src="${imageUrl}" alt="图片" onerror="this.style.display='none';this.nextSibling.style.display='inline';" /><span class="msg-image-fallback" style="display:none;">[图片]</span></div>`;
        }
        return '<span class="msg-image-placeholder">[图片]</span>';
      case 'face':
        return `<span class="msg-face">[表情:${item.data.id || ''}]</span>`;
      case 'at':
        return `<span class="msg-at">@${item.data.qq || item.data.name || '某人'}</span>`;
      case 'reply':
        const replyUserId = item.data.id || item.data.qq || '';
        return `<span class="msg-reply"><span class="reply-icon">↩</span><span class="reply-text">回复${replyUserId ? ` [${replyUserId}]` : '消息'}</span></span>`;
      case 'forward':
        return '<span class="msg-forward">[转发消息]</span>';
      case 'video':
        return '<span class="msg-video">[视频]</span>';
      case 'record':
        return '<span class="msg-record">[语音]</span>';
      case 'file':
        return '<span class="msg-file">[文件]</span>';
      default:
        return `<span class="msg-unknown">[${item.type}]</span>`;
    }
  }).join('');
}

/**
 * 思源宋体样式的群精华详情 HTML 模板
 */
const getSourceHanSerifSCStyleDetailHtmlStr = async (
  record: GroupEssenceMessageRaw,
  contextInfo: EssenceDetailContextInfo,
  groupAvatarBase64: string,
  fontBase64: string,
  enableDarkMode: boolean
) => {
  const backgroundStyle = groupAvatarBase64
    ? `background-image: radial-gradient(circle at center, rgba(255,255,255,0.15), rgba(0,0,0,0.1)), url(data:image/jpeg;base64,${groupAvatarBase64}); background-size: cover; background-position: center center; background-repeat: no-repeat;`
    : 'background: linear-gradient(135deg, #f8f9fa, #e9ecef);';

  const timestamp = generateTimestamp();
  const contentHtml = parseEssenceContentToHtmlFull(record.content);
  const timeStr = formatTimestamp(record.operator_time);
  const senderAvatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${record.sender_id}&s=640`;
  const operatorAvatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${record.operator_id}&s=640`;

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    ${fontBase64 ? `@font-face { font-family: 'SourceHanSerifSC-Medium'; src: url('data:font/opentype;charset=utf-8;base64,${fontBase64}') format('opentype'); font-weight: normal; font-style: normal; font-display: swap; }` : ''}

    html, body { margin: 0; padding: 0; width: 100%; height: auto; min-height: 100vh; }
    body {
      font-family: ${fontBase64 ? "'SourceHanSerifSC-Medium'," : ''} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 850px;
      height: auto;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      ${backgroundStyle}
      background-repeat: no-repeat;
      position: relative;
      box-sizing: border-box;
      overflow: visible;
      color: #333;
      padding: 35px;
    }

    .card {
      width: 720px;
      height: auto;
      min-height: 400px;
      background: rgba(255, 255, 255, 0.25);
      backdrop-filter: blur(20px) saturate(180%);
      -webkit-backdrop-filter: blur(20px) saturate(180%);
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.6);
      position: relative;
      overflow: visible;
      display: flex;
      flex-direction: column;
      padding: 32px;
      box-sizing: border-box;
    }

    .group-header { display: flex; align-items: center; margin-bottom: 20px; padding: 18px; background: rgba(255,255,255,0.3); border: 1px solid rgba(255,255,255,0.4); border-radius: 18px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
    .group-avatar { width: 65px; height: 65px; border-radius: 50%; margin-right: 14px; border: 3px solid rgba(255,255,255,0.6); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .group-info { flex: 1; }
    .group-name { font-size: 24px; font-weight: 700; color: #1a1a1a; margin-bottom: 4px; text-shadow: 0 1px 2px rgba(0,0,0,0.1); }
    .group-details { font-size: 16px; color: #4a4a4a; line-height: 1.3; font-weight: 500; }

    .title { font-size: 36px; font-weight: 700; margin-bottom: 10px; color: #1a1a1a; text-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: center; }
    .subtitle { font-size: 16px; color: #666; text-align: center; margin-bottom: 20px; }

    .sender-section { display: flex; align-items: center; padding: 16px; background: rgba(255,255,255,0.5); border-radius: 14px; margin-bottom: 16px; }
    .sender-avatar { width: 70px; height: 70px; border-radius: 50%; margin-right: 16px; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .sender-info { flex: 1; }
    .sender-name { font-size: 22px; font-weight: 600; color: #1a1a1a; margin-bottom: 4px; }
    .sender-id { font-size: 14px; color: #666; }
    .qq-label { color: #888; }
    .qq-number { color: #1a1a1a; font-family: 'Courier New', monospace; font-weight: 600; }

    .content-section { background: rgba(255,255,255,0.6); border-radius: 14px; padding: 20px; margin-bottom: 16px; }
    .content-title { font-size: 14px; color: #888; margin-bottom: 10px; font-weight: 500; }
    .content-body { font-size: 17px; color: #333; line-height: 1.7; word-break: break-all; white-space: pre-wrap; }

    .meta-section { display: flex; align-items: center; padding: 14px 16px; background: rgba(255,255,255,0.5); border-radius: 12px; border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .operator-avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 12px; border: 2px solid rgba(255,255,255,0.8); box-shadow: 0 2px 6px rgba(0,0,0,0.1); }
    .meta-info { flex: 1; }
    .meta-time { font-size: 15px; color: #444; margin-bottom: 4px; font-weight: 600; }
    .meta-operator { font-size: 15px; color: #e67e22; font-weight: 700; }

    /* 消息内容元素样式 */
    .msg-text { }
    .msg-reply { display: inline-flex; align-items: center; background: rgba(100,100,100,0.15); border-left: 3px solid #888; padding: 3px 10px; margin: 4px 6px 4px 0; border-radius: 0 8px 8px 0; font-size: 14px; color: #666; }
    .msg-reply .reply-icon { margin-right: 5px; font-size: 13px; }
    .msg-reply .reply-text { font-style: italic; }
    .msg-image-wrapper-large { display: block; margin: 12px 0; }
    .msg-image-preview-large { max-width: 100%; max-height: 400px; border-radius: 10px; border: 1px solid rgba(0,0,0,0.1); object-fit: contain; }
    .msg-image-placeholder, .msg-image-fallback { color: #888; font-style: italic; }
    .msg-at { color: #1e90ff; font-weight: 500; }
    .msg-face { color: #ff9800; }
    .msg-forward, .msg-video, .msg-record, .msg-file { color: #888; font-style: italic; background: rgba(0,0,0,0.05); padding: 2px 8px; border-radius: 4px; }
    .msg-unknown { color: #999; }
    .empty-msg { color: #999; font-style: italic; }

    .timestamp-watermark { position: fixed; top: 1.3px; left: 1.3px; font-size: 13px; color: rgba(128, 128, 128, 0.6); font-family: 'Courier New', monospace; z-index: 9999; pointer-events: none; text-shadow: 0 0 2px rgba(255, 255, 255, 0.8); }

    body.dark { color: #e0e0e0; }
    body.dark .card { background: rgba(20,20,20,0.4); box-shadow: 0 20px 60px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.1), inset 0 1px 0 rgba(255,255,255,0.15); }
    body.dark .group-header { background: rgba(0,0,0,0.3); border-color: rgba(255,255,255,0.15); }
    body.dark .group-name { color: #ffffff; }
    body.dark .group-details { color: #b0b0b0; }
    body.dark .title { color: #ffffff; text-shadow: 0 2px 4px rgba(0,0,0,0.4); }
    body.dark .subtitle { color: #aaa; }
    body.dark .sender-section { background: rgba(40,40,40,0.6); }
    body.dark .sender-name { color: #fff; }
    body.dark .sender-id { color: #aaa; }
    body.dark .qq-label { color: #888; }
    body.dark .qq-number { color: #fff; }
    body.dark .content-section { background: rgba(40,40,40,0.6); }
    body.dark .content-title { color: #888; }
    body.dark .content-body { color: #e0e0e0; }
    body.dark .meta-section { background: rgba(40,40,40,0.6); border-color: rgba(255,255,255,0.1); }
    body.dark .meta-time { color: #ccc; font-weight: 600; }
    body.dark .meta-operator { color: #ffb366; font-weight: 700; }
    body.dark .msg-reply { background: rgba(150,150,150,0.2); border-left-color: #aaa; color: #bbb; }
    body.dark .msg-at { color: #4da6ff; }
    body.dark .msg-face { color: #ffb74d; }
    body.dark .msg-forward, body.dark .msg-video, body.dark .msg-record, body.dark .msg-file { background: rgba(255,255,255,0.1); color: #aaa; }
    body.dark .msg-image-preview-large { border-color: rgba(255,255,255,0.2); }
    body.dark .timestamp-watermark { color: rgba(160, 160, 160, 0.5); text-shadow: 0 0 2px rgba(0, 0, 0, 0.8); }
  </style>
</head>
<body class="${enableDarkMode ? 'dark' : ''}">
  <div class="timestamp-watermark">${timestamp}</div>
  <div class="card">
    <div class="group-header">
      <img class="group-avatar" src="data:image/jpeg;base64,${groupAvatarBase64}" alt="群头像" />
      <div class="group-info">
        <div class="group-name">${contextInfo.groupName}</div>
        <div class="group-details">群号: ${contextInfo.groupId} | 成员: ${contextInfo.memberCount}/${contextInfo.maxMemberCount}</div>
      </div>
    </div>
    <div class="title">📌 群精华详情</div>
    <div class="subtitle">第 ${contextInfo.essenceIndex}/${contextInfo.totalEssenceCount} 条</div>
    <div class="sender-section">
      <img class="sender-avatar" src="${senderAvatarUrl}" alt="发送者头像" />
      <div class="sender-info">
        <div class="sender-name">${record.sender_nick || '未知'}</div>
        <div class="sender-id"><span class="qq-label">QQ:</span> <span class="qq-number">${record.sender_id}</span></div>
      </div>
    </div>
    <div class="content-section">
      <div class="content-title">💬 消息内容</div>
      <div class="content-body">${contentHtml}</div>
    </div>
    <div class="meta-section">
      <img class="operator-avatar" src="${operatorAvatarUrl}" alt="操作者头像" />
      <div class="meta-info">
        <div class="meta-time">⏰ 设精时间: ${timeStr}</div>
        <div class="meta-operator">📌 操作者: ${record.operator_nick} (${record.operator_id})</div>
      </div>
    </div>
  </div>
</body>
</html>`;
};

/**
 * 落霞孤鹜文楷样式的群精华详情 HTML 模板（金色传统中式风格）
 */
const getLXGWWenKaiStyleDetailHtmlStr = async (
  record: GroupEssenceMessageRaw,
  contextInfo: EssenceDetailContextInfo,
  groupAvatarBase64: string,
  fontBase64: string,
  enableDarkMode: boolean
) => {
  const timestamp = generateTimestamp();
  const contentHtml = parseEssenceContentToHtmlFull(record.content);
  const timeStr = formatTimestamp(record.operator_time);
  const senderAvatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${record.sender_id}&s=640`;
  const operatorAvatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${record.operator_id}&s=640`;

  // 背景样式：群头像 + 白色半透明滤镜
  const backgroundStyle = groupAvatarBase64
    ? `background-image: linear-gradient(45deg, rgba(245,240,230,0.85), rgba(250,245,235,0.85)), url(data:image/jpeg;base64,${groupAvatarBase64}); background-size: cover; background-position: center center; background-repeat: no-repeat;`
    : `background: linear-gradient(45deg, #f5f0e6, #faf5eb);`;

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    ${fontBase64 ? `@font-face { font-family: 'LXGWWenKai'; src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype'); font-weight: normal; font-style: normal; font-display: swap; }` : ''}

    html, body { margin: 0; padding: 0; width: 100%; height: auto; min-height: 100vh; }
    body {
      font-family: ${fontBase64 ? "'LXGWWenKai'," : ''} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 850px;
      height: auto;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      ${backgroundStyle}
      position: relative;
      box-sizing: border-box;
      overflow: visible;
      color: #3a2f2a;
      padding: 35px;
    }

    body::before { content: ''; position: absolute; top: 16px; left: 16px; right: 16px; bottom: 16px; border: 3px solid #d4af37; border-radius: 20px; background: linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(184,134,11,0.06) 50%, rgba(212,175,55,0.12) 100%); box-shadow: inset 0 0 25px rgba(212,175,55,0.35), 0 0 35px rgba(212,175,55,0.25); z-index: 1; }
    body::after { content: '◆'; position: absolute; top: 30px; left: 30px; font-size: 26px; color: #d4af37; z-index: 2; text-shadow: 0 0 12px rgba(212,175,55,0.6); }

    .corner-decoration { position: absolute; font-size: 26px; color: #d4af37; z-index: 2; text-shadow: 0 0 12px rgba(212,175,55,0.6); }
    .corner-decoration.top-right { top: 30px; right: 30px; }
    .corner-decoration.bottom-left { bottom: 30px; left: 30px; }
    .corner-decoration.bottom-right { bottom: 30px; right: 30px; }

    .main-container {
      width: 720px;
      min-height: 400px;
      position: relative;
      z-index: 3;
      display: flex;
      flex-direction: column;
      padding: 32px 28px;
      box-sizing: border-box;
    }

    .group-header { display: flex; align-items: center; margin-bottom: 18px; padding: 16px; background: rgba(255,255,255,0.2); border: 1px solid rgba(212,175,55,0.4); border-radius: 16px; box-shadow: 0 4px 16px rgba(212,175,55,0.15); }
    .group-avatar { width: 60px; height: 60px; border-radius: 9%; margin-right: 14px; border: 3px solid #d4af37; box-shadow: 0 4px 12px rgba(212,175,55,0.3); }
    .group-info { flex: 1; }
    .group-name { font-size: 22px; font-weight: bold; color: #8b4513; margin-bottom: 4px; text-shadow: 1px 1px 2px rgba(139,69,19,0.2); }
    .group-details { font-size: 16px; color: #a0522d; line-height: 1.3; font-weight: 500; }

    .title-section { text-align: center; margin-bottom: 8px; }
    .main-title { font-size: 40px; font-weight: bold; color: #8b4513; margin-bottom: 6px; text-shadow: 2px 2px 4px rgba(139,69,19,0.3); letter-spacing: 2px; }
    .subtitle { font-size: 16px; color: #a0522d; text-align: center; margin-bottom: 18px; font-weight: 500; }

    .sender-section { display: flex; align-items: center; padding: 14px; background: rgba(255,255,255,0.25); border: 1px solid rgba(212,175,55,0.4); border-radius: 14px; margin-bottom: 14px; box-shadow: 0 3px 10px rgba(0,0,0,0.08); backdrop-filter: blur(5px); }
    .sender-avatar { width: 65px; height: 65px; border-radius: 50%; margin-right: 14px; border: 2px solid #d4af37; box-shadow: 0 2px 6px rgba(212,175,55,0.2); }
    .sender-info { flex: 1; }
    .sender-name { font-size: 20px; font-weight: bold; color: #3a2f2a; margin-bottom: 4px; }
    .sender-id { font-size: 13px; }
    .qq-label { color: #a0522d; font-weight: 500; }
    .qq-number { color: #3a2f2a; font-family: 'Courier New', monospace; font-weight: bold; }

    .content-section { background: rgba(255,255,255,0.25); border: 1px solid rgba(212,175,55,0.4); border-radius: 14px; padding: 18px; margin-bottom: 14px; box-shadow: 0 3px 10px rgba(0,0,0,0.08); backdrop-filter: blur(5px); }
    .content-title { font-size: 14px; color: #a0522d; margin-bottom: 10px; font-weight: 600; }
    .content-body { font-size: 16px; color: #3a2f2a; line-height: 1.7; word-break: break-all; white-space: pre-wrap; }

    .meta-section { display: flex; align-items: center; padding: 14px 16px; background: rgba(255,255,255,0.3); border: 1px solid rgba(212,175,55,0.45); border-radius: 12px; box-shadow: 0 3px 10px rgba(0,0,0,0.08); }
    .operator-avatar { width: 40px; height: 40px; border-radius: 50%; margin-right: 12px; border: 2px solid #d4af37; box-shadow: 0 3px 8px rgba(212,175,55,0.3); }
    .meta-info { flex: 1; }
    .meta-time { font-size: 14px; color: #8b4513; margin-bottom: 4px; font-weight: 700; }
    .meta-operator { font-size: 14px; color: #b8860b; font-weight: 800; }

    /* 消息内容元素样式 */
    .msg-text { }
    .msg-reply { display: inline-flex; align-items: center; background: rgba(212,175,55,0.15); border-left: 3px solid #d4af37; padding: 3px 10px; margin: 4px 6px 4px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #a0522d; }
    .msg-reply .reply-icon { margin-right: 5px; font-size: 12px; }
    .msg-reply .reply-text { font-style: italic; }
    .msg-image-wrapper-large { display: block; margin: 12px 0; }
    .msg-image-preview-large { max-width: 100%; max-height: 400px; border-radius: 10px; border: 1px solid rgba(212,175,55,0.3); object-fit: contain; }
    .msg-image-placeholder, .msg-image-fallback { color: #a0522d; font-style: italic; }
    .msg-at { color: #8b4513; font-weight: bold; }
    .msg-face { color: #d4af37; }
    .msg-forward, .msg-video, .msg-record, .msg-file { color: #a0522d; font-style: italic; background: rgba(212,175,55,0.1); padding: 2px 8px; border-radius: 4px; }
    .msg-unknown { color: #8b7355; }
    .empty-msg { color: #8b7355; font-style: italic; }

    .timestamp-watermark { position: fixed; top: 1.3px; left: 1.3px; font-size: 13px; color: rgba(139, 69, 19, 0.4); font-family: 'Courier New', monospace; z-index: 9999; pointer-events: none; text-shadow: 0 0 2px rgba(255, 255, 255, 0.8); }

    body.dark { background: linear-gradient(45deg, #2c2416, #3a2f1f); color: #e6d7c3; }
    body.dark::before { border-color: #b8860b; background: linear-gradient(135deg, rgba(184,134,11,0.18) 0%, rgba(139,69,19,0.12) 50%, rgba(184,134,11,0.18) 100%); box-shadow: inset 0 0 25px rgba(184,134,11,0.45), 0 0 35px rgba(184,134,11,0.35); }
    body.dark::after { color: #b8860b; text-shadow: 0 0 12px rgba(184,134,11,0.6); }
    body.dark .corner-decoration { color: #b8860b; text-shadow: 0 0 12px rgba(184,134,11,0.6); }
    body.dark .group-header { background: rgba(0,0,0,0.3); border-color: rgba(184,134,11,0.5); }
    body.dark .group-name { color: #daa520; text-shadow: 1px 1px 2px rgba(218,165,32,0.3); }
    body.dark .group-details { color: #cd853f; }
    body.dark .main-title { color: #daa520; text-shadow: 2px 2px 4px rgba(218,165,32,0.4); }
    body.dark .subtitle { color: #cd853f; }
    body.dark .sender-section { background: rgba(0,0,0,0.35); border-color: rgba(184,134,11,0.5); }
    body.dark .sender-name { color: #e6d7c3; }
    body.dark .sender-id { color: #cd853f; }
    body.dark .qq-label { color: #cd853f; }
    body.dark .qq-number { color: #e6d7c3; }
    body.dark .content-section { background: rgba(0,0,0,0.35); border-color: rgba(184,134,11,0.5); }
    body.dark .content-title { color: #cd853f; }
    body.dark .content-body { color: #e6d7c3; }
    body.dark .meta-section { background: rgba(0,0,0,0.4); border-color: rgba(184,134,11,0.5); }
    body.dark .meta-time { color: #daa520; font-weight: 700; }
    body.dark .meta-operator { color: #ffd700; font-weight: 800; }
    body.dark .msg-reply { background: rgba(184,134,11,0.2); border-left-color: #b8860b; color: #cd853f; }
    body.dark .msg-at { color: #daa520; }
    body.dark .msg-face { color: #b8860b; }
    body.dark .msg-forward, body.dark .msg-video, body.dark .msg-record, body.dark .msg-file { background: rgba(184,134,11,0.15); color: #cd853f; }
    body.dark .msg-image-preview-large { border-color: rgba(184,134,11,0.4); }
    body.dark .timestamp-watermark { color: rgba(218, 165, 32, 0.4); text-shadow: 0 0 2px rgba(0, 0, 0, 0.8); }
  </style>
</head>
<body class="${enableDarkMode ? 'dark' : ''}">
  <div class="corner-decoration top-right">◆</div>
  <div class="corner-decoration bottom-left">◆</div>
  <div class="corner-decoration bottom-right">◆</div>
  <div class="main-container">
    <div class="group-header">
      <img class="group-avatar" src="data:image/jpeg;base64,${groupAvatarBase64}" alt="群头像" />
      <div class="group-info">
        <div class="group-name">${contextInfo.groupName}</div>
        <div class="group-details">群号: ${contextInfo.groupId} | 成员: ${contextInfo.memberCount}/${contextInfo.maxMemberCount}</div>
      </div>
    </div>
    <div class="title-section">
      <div class="main-title">「 群精华详情 」</div>
    <div class="subtitle">第 ${contextInfo.essenceIndex}/${contextInfo.totalEssenceCount} 条</div>
    <div class="sender-section">
      <img class="sender-avatar" src="${senderAvatarUrl}" alt="发送者头像" />
      <div class="sender-info">
        <div class="sender-name">${record.sender_nick || '未知'}</div>
        <div class="sender-id"><span class="qq-label">QQ:</span> <span class="qq-number">${record.sender_id}</span></div>
      </div>
    </div>
    <div class="content-section">
      <div class="content-title">💬 消息内容</div>
      <div class="content-body">${contentHtml}</div>
    </div>
    <div class="meta-section">
      <img class="operator-avatar" src="${operatorAvatarUrl}" alt="操作者头像" />
      <div class="meta-info">
        <div class="meta-time">⏰ 设精时间: ${timeStr}</div>
        <div class="meta-operator">📌 操作者: ${record.operator_nick} (${record.operator_id})</div>
      </div>
    </div>
  </div>
  <div class="timestamp-watermark">${timestamp}</div>
</body>
</html>`;
};

/**
 * 扁平简约样式的群精华详情 HTML 模板
 */
const getFlatMinimalStyleDetailHtmlStr = async (
  record: GroupEssenceMessageRaw,
  contextInfo: EssenceDetailContextInfo,
  groupAvatarBase64: string,
  fontBase64: string,
  enableDarkMode: boolean
) => {
  const timestamp = generateTimestamp();
  const contentHtml = parseEssenceContentToHtmlFull(record.content);
  const timeStr = formatTimestamp(record.operator_time);
  const senderAvatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${record.sender_id}&s=640`;
  const operatorAvatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${record.operator_id}&s=640`;

  return `<!DOCTYPE html>
<html>
<head>
  <style>
    ${fontBase64 ? `@font-face { font-family: 'LXGWWenKai'; src: url('data:font/truetype;charset=utf-8;base64,${fontBase64}') format('truetype'); font-weight: normal; font-style: normal; font-display: swap; }` : ''}

    html, body { margin: 0; padding: 0; width: 100%; height: auto; min-height: 100vh; }
    body {
      font-family: ${fontBase64 ? "'LXGWWenKai'," : ''} -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      width: 850px;
      height: auto;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(180deg, #f5f7fa 0%, #c3cfe2 100%);
      position: relative;
      box-sizing: border-box;
      overflow: visible;
      color: #333;
      padding: 35px;
    }

    .card {
      width: 720px;
      height: auto;
      min-height: 400px;
      background: #ffffff;
      border-radius: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      position: relative;
      overflow: visible;
      display: flex;
      flex-direction: column;
      padding: 26px;
      box-sizing: border-box;
    }

    .group-header { display: flex; align-items: center; margin-bottom: 16px; padding: 14px; background: #f8f9fa; border-radius: 12px; }
    .group-avatar { width: 55px; height: 55px; border-radius: 50%; margin-right: 12px; border: 2px solid #e9ecef; }
    .group-info { flex: 1; }
    .group-name { font-size: 20px; font-weight: 600; color: #212529; margin-bottom: 2px; }
    .group-details { font-size: 13px; color: #6c757d; }

    .title { font-size: 28px; font-weight: 600; margin-bottom: 6px; color: #212529; text-align: center; }
    .subtitle { font-size: 14px; color: #6c757d; text-align: center; margin-bottom: 16px; }

    .sender-section { display: flex; align-items: center; padding: 12px; background: #f8f9fa; border-radius: 12px; margin-bottom: 12px; }
    .sender-avatar { width: 60px; height: 60px; border-radius: 50%; margin-right: 14px; border: 2px solid #e9ecef; }
    .sender-info { flex: 1; }
    .sender-name { font-size: 18px; font-weight: 600; color: #212529; margin-bottom: 3px; }
    .sender-id { font-size: 12px; color: #6c757d; }
    .qq-label { color: #6c757d; }
    .qq-number { color: #495057; font-family: 'Courier New', monospace; font-weight: 600; }

    .content-section { background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 12px; }
    .content-title { font-size: 12px; color: #6c757d; margin-bottom: 8px; font-weight: 500; }
    .content-body { font-size: 15px; color: #495057; line-height: 1.6; word-break: break-all; white-space: pre-wrap; }

    .meta-section { display: flex; align-items: center; padding: 12px 14px; background: #f8f9fa; border-radius: 10px; border: 1px solid #e9ecef; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
    .operator-avatar { width: 38px; height: 38px; border-radius: 50%; margin-right: 12px; border: 2px solid #e9ecef; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
    .meta-info { flex: 1; }
    .meta-time { font-size: 13px; color: #495057; margin-bottom: 4px; font-weight: 600; }
    .meta-operator { font-size: 13px; color: #e8590c; font-weight: 700; }

    /* 消息内容元素样式 */
    .msg-text { }
    .msg-reply { display: inline-flex; align-items: center; background: #e9ecef; border-left: 3px solid #adb5bd; padding: 3px 9px; margin: 4px 6px 4px 0; border-radius: 0 7px 7px 0; font-size: 12px; color: #6c757d; }
    .msg-reply .reply-icon { margin-right: 4px; font-size: 11px; }
    .msg-reply .reply-text { font-style: italic; }
    .msg-image-wrapper-large { display: block; margin: 10px 0; }
    .msg-image-preview-large { max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #dee2e6; object-fit: contain; }
    .msg-image-placeholder, .msg-image-fallback { color: #adb5bd; font-style: italic; }
    .msg-at { color: #0d6efd; font-weight: 500; }
    .msg-face { color: #fd7e14; }
    .msg-forward, .msg-video, .msg-record, .msg-file { color: #6c757d; font-style: italic; background: #e9ecef; padding: 2px 7px; border-radius: 4px; }
    .msg-unknown { color: #adb5bd; }
    .empty-msg { color: #adb5bd; font-style: italic; }

    .timestamp-watermark { position: fixed; top: 1px; left: 1px; font-size: 11px; color: rgba(128, 128, 128, 0.4); font-family: 'Courier New', monospace; z-index: 9999; }

    body.dark { background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%); color: #e9ecef; }
    body.dark .card { background: #212529; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3); }
    body.dark .group-header { background: #343a40; }
    body.dark .group-avatar { border-color: #495057; }
    body.dark .group-name { color: #f8f9fa; }
    body.dark .group-details { color: #adb5bd; }
    body.dark .title { color: #f8f9fa; }
    body.dark .subtitle { color: #adb5bd; }
    body.dark .sender-section { background: #343a40; }
    body.dark .sender-avatar { border-color: #495057; }
    body.dark .sender-name { color: #f8f9fa; }
    body.dark .sender-id { color: #adb5bd; }
    body.dark .qq-label { color: #adb5bd; }
    body.dark .qq-number { color: #e9ecef; }
    body.dark .content-section { background: #343a40; }
    body.dark .content-title { color: #adb5bd; }
    body.dark .content-body { color: #ced4da; }
    body.dark .meta-section { background: #343a40; border-color: #495057; }
    body.dark .meta-time { color: #ced4da; font-weight: 600; }
    body.dark .meta-operator { color: #ff922b; font-weight: 700; }
    body.dark .msg-reply { background: #495057; border-left-color: #6c757d; color: #adb5bd; }
    body.dark .msg-at { color: #6ea8fe; }
    body.dark .msg-face { color: #ffc107; }
    body.dark .msg-forward, body.dark .msg-video, body.dark .msg-record, body.dark .msg-file { background: #495057; color: #adb5bd; }
    body.dark .msg-image-preview-large { border-color: #495057; }
    body.dark .timestamp-watermark { color: rgba(200, 200, 200, 0.3); }
  </style>
</head>
<body class="${enableDarkMode ? 'dark' : ''}">
  <div class="timestamp-watermark">${timestamp}</div>
  <div class="card">
    <div class="group-header">
      <img class="group-avatar" src="data:image/jpeg;base64,${groupAvatarBase64}" alt="群头像" />
      <div class="group-info">
        <div class="group-name">${contextInfo.groupName}</div>
        <div class="group-details">群号: ${contextInfo.groupId} | 成员: ${contextInfo.memberCount}/${contextInfo.maxMemberCount}</div>
      </div>
    </div>
    <div class="title">📌 群精华详情</div>
    <div class="subtitle">第 ${contextInfo.essenceIndex}/${contextInfo.totalEssenceCount} 条</div>
    <div class="sender-section">
      <img class="sender-avatar" src="${senderAvatarUrl}" alt="发送者头像" />
      <div class="sender-info">
        <div class="sender-name">${record.sender_nick || '未知'}</div>
        <div class="sender-id"><span class="qq-label">QQ:</span> <span class="qq-number">${record.sender_id}</span></div>
      </div>
    </div>
    <div class="content-section">
      <div class="content-title">💬 消息内容</div>
      <div class="content-body">${contentHtml}</div>
    </div>
    <div class="meta-section">
      <img class="operator-avatar" src="${operatorAvatarUrl}" alt="操作者头像" />
      <div class="meta-info">
        <div class="meta-time">⏰ 设精时间: ${timeStr}</div>
        <div class="meta-operator">📌 操作者: ${record.operator_nick} (${record.operator_id})</div>
      </div>
    </div>
  </div>
</body>
</html>`;
};

/**
 * 渲染群精华消息详情为图片
 */
export async function renderGroupEssenceDetail(
  ctx: Context,
  record: GroupEssenceMessageRaw,
  contextInfo: EssenceDetailContextInfo,
  imageStyle: ImageStyle,
  enableDarkMode: boolean,
  imageType: ImageType,
  screenshotQuality: number
): Promise<string> {
  // 获取群头像的 Base64 编码
  const groupAvatarBase64 = await getGroupAvatarBase64(ctx, contextInfo.groupId.toString());

  // 获取字体的 Base64 编码
  const fontBase64 = await getFontBase64(ctx, imageStyle);

  // 根据样式选择 HTML 生成函数
  let htmlContent: string;
  switch (imageStyle) {
    case IMAGE_STYLES.SOURCE_HAN_SERIF_SC:
      htmlContent = await getSourceHanSerifSCStyleDetailHtmlStr(record, contextInfo, groupAvatarBase64, fontBase64, enableDarkMode);
      break;
    case IMAGE_STYLES.LXGW_WENKAI:
      htmlContent = await getLXGWWenKaiStyleDetailHtmlStr(record, contextInfo, groupAvatarBase64, fontBase64, enableDarkMode);
      break;
    case IMAGE_STYLES.FLAT_MINIMAL:
      htmlContent = await getFlatMinimalStyleDetailHtmlStr(record, contextInfo, groupAvatarBase64, fontBase64, enableDarkMode);
      break;
    default:
      htmlContent = await getSourceHanSerifSCStyleDetailHtmlStr(record, contextInfo, groupAvatarBase64, fontBase64, enableDarkMode);
  }

  // 使用 Puppeteer 渲染图片
  const page = await ctx.puppeteer.page();
  try {
    await page.setViewport({ width: 900, height: 1 });
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

    // 获取 body 元素的实际高度，截取整个页面以保留边距
    const bodyElement = await page.$('body');
    const boundingBox = await bodyElement?.boundingBox();

    if (!boundingBox) {
      throw new Error('无法获取页面元素的边界框');
    }

    const screenshot = await page.screenshot({
      type: imageType as 'png' | 'jpeg' | 'webp',
      encoding: 'base64',
      clip: boundingBox,
      quality: imageType === 'png' ? undefined : screenshotQuality
    });

    return screenshot as string;
  } finally {
    await page.close();
  }
}
