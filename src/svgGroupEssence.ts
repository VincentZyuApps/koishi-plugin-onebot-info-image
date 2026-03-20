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

export interface PaginatedEssenceResult {
  records: GroupEssenceMessageRaw[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface EssenceContextInfo {
  groupId: number
  groupName: string
  memberCount: number
  maxMemberCount: number
  groupAvatarUrl: string
}

export interface SvgGroupEssenceOptions {
  result: PaginatedEssenceResult
  contextInfo: EssenceContextInfo
  groupAvatarBase64?: string
  avatarsBase64?: Record<string, string>
  enableDarkMode?: boolean
  scale?: number
  enableEmoji?: boolean
  enableEmojiCache?: boolean
}

export async function svgGroupEssence(
  ctx: Context,
  options: SvgGroupEssenceOptions,
): Promise<string> {
  const { result, contextInfo, groupAvatarBase64, avatarsBase64 = {}, enableDarkMode = false, scale = 3.3 } = options

  const W = 900
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

  let essenceItems = ''
  const itemHeight = 80
  const startY = 165
  const avatarSize = 36
  const avatarX = PADDING + 15
  const avatarY_offset = 8

  for (let i = 0; i < result.records.length; i++) {
    const record = result.records[i]
    const y = startY + i * itemHeight
    const idx = (result.currentPage - 1) * result.pageSize + i + 1
    const content = parseEssenceContent(record.content)
    const displayContent = truncate(content, 30)
    const sender = truncate(record.sender_nick || String(record.sender_id), 10)
    const time = formatTs(record.operator_time)
    const senderId = String(record.sender_id)
    const avatarBase64 = avatarsBase64[senderId]

    let avatarSvg = ''
    if (avatarBase64) {
      avatarSvg = `<image x="${avatarX}" y="${y + avatarY_offset}" width="${avatarSize}" height="${avatarSize}" href="data:image/jpeg;base64,${avatarBase64}" clip-path="url(#avatar-clip-${i})"/>`
    } else {
      avatarSvg = `<rect x="${avatarX}" y="${y + avatarY_offset}" width="${avatarSize}" height="${avatarSize}" rx="8" fill="${highlightBg}"/>`
    }

    essenceItems += `<clipPath id="avatar-clip-${i}"><rect x="${avatarX}" y="${y + avatarY_offset}" width="${avatarSize}" height="${avatarSize}" rx="8"/></clipPath>` +
      avatarSvg +
      `<g transform="translate(${avatarX + avatarSize + 12}, ${y})">` +
      `<text x="0" y="16" font-size="13" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(displayContent)}</text>` +
      `<text x="0" y="34" font-size="11" fill="${subTextColor}" font-family="${fontFamily}">${escapeXml(sender)} | ${escapeXml(time)}</text>` +
      `</g>`
    if (i < result.records.length - 1) {
      essenceItems += `<line x1="${PADDING}" y1="${y + itemHeight - 5}" x2="${W - PADDING}" y2="${y + itemHeight - 5}" stroke="${dividerColor}" stroke-width="1" stroke-dasharray="4,4"/>`
    }
  }

  const timestamp = new Date().toLocaleString('zh-CN')
  const H = Math.max(300, startY + result.records.length * itemHeight + 80)

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
    `<text x="${PADDING + 20}" y="50" font-size="24" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)} 精华消息</text>` +
    `<text x="${PADDING + 20}" y="80" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)} | 共 ${result.totalCount} 条精华</text>` +
    `<text x="${W - PADDING - 20}" y="65" font-size="13" fill="${accentColor}" font-family="${fontFamily}" text-anchor="end">第 ${result.currentPage}/${result.totalPages} 页</text>` +
    `<line x1="${PADDING + 15}" y1="100" x2="${W - PADDING - 15}" y2="100" stroke="${dividerColor}" stroke-width="1"/>` +
    essenceItems +
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
  ctx.logger.info(`[svgGroupEssence] PNG output=${pngData.width}x${pngData.height}, scale=${scale}, base64_len=${pngBuffer.length}`)

  return Buffer.from(pngBuffer).toString('base64')
}
