import { Resvg } from '@resvg/resvg-js'
import { Context } from 'koishi'
import { escapeXml, truncate, formatTs, decodeHtmlEntities } from './utils'

function parseEssenceContent(content: Array<{ type: string; data: Record<string, any> }>): string {
  let text = ''
  for (const item of content) {
    if (item.type === 'text') {
      text += decodeHtmlEntities(item.data.text) || ''
    } else if (item.type === 'at') {
      text += `@${decodeHtmlEntities(item.data.name) || item.data.qq || ''} `
    } else if (item.type === 'image') {
      text += '[图片] '
    } else if (item.type === 'face') {
      text += `[表情${item.data.id}] `
    } else if (item.type === 'record') {
      text += '[语音] '
    } else if (item.type === 'video') {
      text += '[视频] '
    } else if (item.type === 'reply') {
      text += '[回复] '
    }
  }
    return text || '[无法解析的消息]'
}

export interface GroupEssenceMessageRaw {
  msg_seq: number
  msg_random: number
  sender_id: number
  sender_nick: string
  operator_id: number
  operator_nick: string
  message_id: number
  operator_time: number
  content: Array<{
    type: string
    data: Record<string, any>
  }>
}

export interface EssenceDetailContextInfo {
  groupId: number
  groupName: string
  memberCount: number
  maxMemberCount: number
  groupAvatarUrl: string
}

export interface SvgGroupEssenceDetailOptions {
  record: GroupEssenceMessageRaw
  contextInfo: EssenceDetailContextInfo
  groupAvatarBase64?: string
  senderAvatarBase64?: string
  operatorAvatarBase64?: string
  enableDarkMode?: boolean
  scale?: number
  enableEmoji?: boolean
  enableEmojiCache?: boolean
}

export async function svgGroupEssenceDetail(
  ctx: Context,
  options: SvgGroupEssenceDetailOptions,
): Promise<string> {
  const { record, contextInfo, groupAvatarBase64, senderAvatarBase64, operatorAvatarBase64, enableDarkMode = false, scale = 3.3 } = options

  const W = 900
  const H = 550
  const PADDING = 30
  const CARD_RX = 22
  // 使用系统默认字体
  const fontFamily = 'sans-serif'

  const bgColor = enableDarkMode ? '#0d1117' : '#e0eafc'
  const cardBg = enableDarkMode ? '#161b22' : 'white'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#888888'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const accentColor = '#9b59b6'
  const highlightBg = enableDarkMode ? '#1f2937' : '#f0e6ff'
  const shadowColor = enableDarkMode ? '#00000066' : '#00000022'
  const gradientEnd = enableDarkMode ? '#161b22' : '#cfdef3'
  const watermarkColor = enableDarkMode ? '#484f58' : '#bbbbbb'

  const groupName = truncate(contextInfo.groupName || '未知群名', 16)
  const groupId = String(contextInfo.groupId || '')
  const content = parseEssenceContent(record.content)
  const sender = truncate(record.sender_nick || String(record.sender_id), 12)
  const operator = truncate(record.operator_nick || String(record.operator_id), 12)
  const addTime = formatTs(record.operator_time)
  const senderId = String(record.sender_id)
  const operatorId = String(record.operator_id)

  const avatarSize = 45
  const avatarY = 340

  let senderAvatarSvg = ''
  if (senderAvatarBase64) {
    senderAvatarSvg = `<image x="${PADDING + 20}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" href="data:image/jpeg;base64,${senderAvatarBase64}" clip-path="url(#sender-avatar-clip)"/>`
  } else {
    senderAvatarSvg = `<rect x="${PADDING + 20}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" rx="22" fill="${highlightBg}"/>`
  }

  let operatorAvatarSvg = ''
  if (operatorAvatarBase64) {
    operatorAvatarSvg = `<image x="${PADDING + 85}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" href="data:image/jpeg;base64,${operatorAvatarBase64}" clip-path="url(#operator-avatar-clip)"/>`
  } else {
    operatorAvatarSvg = `<rect x="${PADDING + 85}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" rx="22" fill="${highlightBg}"/>`
  }

  const timestamp = new Date().toLocaleString('zh-CN')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>` +
    `<linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${bgColor}"/>` +
    `<stop offset="100%" stop-color="${gradientEnd}"/>` +
    `</linearGradient>` +
    `<filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">` +
    `<feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="${shadowColor}"/>` +
    `</filter>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bg-grad)"/>` +
    `<rect x="${PADDING}" y="${PADDING}" width="${W - PADDING * 2}" height="${H - PADDING * 2}" rx="${CARD_RX}" fill="${cardBg}" fill-opacity="0.92" filter="url(#card-shadow)"/>` +
    `<text x="${PADDING + 20}" y="55" font-size="24" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)} 精华详情</text>` +
    `<text x="${PADDING + 20}" y="85" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)} | 消息ID: ${record.message_id}</text>` +
    `<line x1="${PADDING + 15}" y1="105" x2="${W - PADDING - 15}" y2="105" stroke="${dividerColor}" stroke-width="1"/>` +
    `<text x="${PADDING + 20}" y="140" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">消息内容</text>` +
    `<rect x="${PADDING + 15}" y="155" width="${W - PADDING * 2 - 30}" height="150" rx="12" fill="${highlightBg}"/>` +
    `<text x="${PADDING + 30}" y="195" font-size="16" fill="${textColor}" font-family="${fontFamily}">${escapeXml(content)}</text>` +
    `<text x="${PADDING + 20}" y="320" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">详细信息</text>` +
    `<clipPath id="sender-avatar-clip"><circle cx="${PADDING + 42}" cy="${avatarY + 22}" r="22"/></clipPath>` +
    `<clipPath id="operator-avatar-clip"><circle cx="${PADDING + 107}" cy="${avatarY + 22}" r="22"/></clipPath>` +
    senderAvatarSvg +
    operatorAvatarSvg +
    `<text x="${PADDING + 145}" y="${avatarY + 18}" font-size="13" fill="${textColor}" font-family="${fontFamily}" font-weight="600">发送者: ${escapeXml(sender)} (${senderId})</text>` +
    `<text x="${PADDING + 145}" y="${avatarY + 38}" font-size="13" fill="${textColor}" font-family="${fontFamily}" font-weight="600">收录者: ${escapeXml(operator)} (${operatorId})</text>` +
    `<text x="${PADDING + 20}" y="${avatarY + 70}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">收录时间: ${escapeXml(addTime)}</text>` +
    `<text x="${W - PADDING - 10}" y="${H - PADDING - 8}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="end">${escapeXml(timestamp)}</text>` +
    `<text x="${PADDING + 10}" y="${H - PADDING - 8}" font-size="11" fill="${watermarkColor}" font-family="monospace">rendered by resvg</text>` +
    `</svg>`

  // 使用系统默认字体
  const resvgOpts: any = {
    fitTo: { mode: 'width', value: W * scale },
    font: {
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  }

  const resvg = new Resvg(svg, resvgOpts)

  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()
  ctx.logger.info(`[svgGroupEssenceDetail] PNG output=${pngData.width}x${pngData.height}, scale=${scale}, base64_len=${pngBuffer.length}`)

  return Buffer.from(pngBuffer).toString('base64')
}
