import { Resvg } from '@resvg/resvg-js'
import { Context } from 'koishi'
import { escapeXml, truncate, formatTs, decodeHtmlEntities } from './utils'

export interface GroupNoticeMessageRaw {
  notice_id: string
  sender_id: number
  publish_time: number
  message: {
    text: string
    image: Array<{ id: string; height: string; width: string }>
    images: Array<{ id: string; height: string; width: string }>
  }
}

export interface NoticeDetailContextInfo {
  groupId: number
  groupName: string
  memberCount: number
  maxMemberCount: number
  groupAvatarUrl: string
}

export interface SvgGroupNoticeDetailOptions {
  record: GroupNoticeMessageRaw
  contextInfo: NoticeDetailContextInfo
  groupAvatarBase64?: string
  senderAvatarBase64?: string
  imagesBase64?: Record<string, string>
  enableDarkMode?: boolean
  scale?: number
  enableEmoji?: boolean
  enableEmojiCache?: boolean
}

/**
 * 将文本按行分割，支持自动换行
 */
function wrapText(text: string, maxCharsPerLine: number): string[] {
  if (!text) return []
  const lines: string[] = []
  let currentLine = ''

  for (const char of text) {
    if (char === '\n') {
      lines.push(currentLine)
      currentLine = ''
    } else {
      currentLine += char
      if (currentLine.length >= maxCharsPerLine) {
        lines.push(currentLine)
        currentLine = ''
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine)
  }
  return lines.length === 0 ? [''] : lines
}

export async function svgGroupNoticeDetail(
  ctx: Context,
  options: SvgGroupNoticeDetailOptions,
): Promise<string> {
  const { record, contextInfo, groupAvatarBase64, senderAvatarBase64, imagesBase64 = {}, enableDarkMode = false, scale = 3.3 } = options

  const W = 900
  const PADDING = 35
  const CARD_RX = 22
  const CONTENT_MAX_WIDTH = W - PADDING * 2 - 60  // 内容区域最大宽度
  const LINE_HEIGHT = 28  // 行高

  // 使用系统默认字体
  const fontFamily = 'sans-serif'

  const bgColor = enableDarkMode ? '#0d1117' : '#e0eafc'
  const cardBg = enableDarkMode ? '#161b22' : 'white'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#888888'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const accentColor = '#64b5f6'
  const highlightBg = enableDarkMode ? '#1f2937' : '#f8f9fa'
  const shadowColor = enableDarkMode ? '#00000066' : '#00000022'
  const gradientEnd = enableDarkMode ? '#161b22' : '#cfdef3'
  const watermarkColor = enableDarkMode ? '#484f58' : '#bbbbbb'
  const avatarBgColor = enableDarkMode ? '#30363d' : '#e8e8e8'

  const groupName = truncate(contextInfo.groupName || '未知群名', 20)
  const groupId = String(contextInfo.groupId || '')
  const rawContent = decodeHtmlEntities(record.message.text) || '[空公告]'
  const time = formatTs(record.publish_time)
  const images = record.message.images || []
  const senderId = String(record.sender_id)

  // 处理公告内容换行
  const contentLines = wrapText(rawContent, 46)
  const contentHeight = Math.max(80, contentLines.length * LINE_HEIGHT + 40)

  // 计算图片区域高度
  const hasImages = images.length > 0
  const imagesSectionHeight = hasImages ? 180 : 0

  // 动态计算总高度
  const headerHeight = 110
  const contentSectionHeight = contentHeight + 50  // 标题 + 内容
  const senderSectionHeight = 120
  const footerHeight = 50
  const H = Math.max(500, headerHeight + contentSectionHeight + senderSectionHeight + imagesSectionHeight + footerHeight)

  // 群头像（左上角）
  const groupAvatarSize = 50
  const groupAvatarX = PADDING + 25
  const groupAvatarY = PADDING + 25

  let groupAvatarSvg = ''
  if (groupAvatarBase64) {
    groupAvatarSvg = `<image x="${groupAvatarX}" y="${groupAvatarY}" width="${groupAvatarSize}" height="${groupAvatarSize}" href="data:image/jpeg;base64,${groupAvatarBase64}" clip-path="url(#group-avatar-clip)"/>`
  } else {
    groupAvatarSvg = `<rect x="${groupAvatarX}" y="${groupAvatarY}" width="${groupAvatarSize}" height="${groupAvatarSize}" rx="10" fill="${avatarBgColor}"/>`
  }

  // 发布者头像（圆形裁剪）
  const avatarSize = 56
  const avatarX = PADDING + 25

  let senderAvatarSvg = ''
  if (senderAvatarBase64) {
    senderAvatarSvg = `<image x="${avatarX}" y="${headerHeight + contentSectionHeight + 25}" width="${avatarSize}" height="${avatarSize}" href="data:image/jpeg;base64,${senderAvatarBase64}" clip-path="url(#sender-avatar-clip)"/>`
  } else {
    senderAvatarSvg = `<rect x="${avatarX}" y="${headerHeight + contentSectionHeight + 25}" width="${avatarSize}" height="${avatarSize}" rx="28" fill="${avatarBgColor}"/>`
  }

  // 公告内容（支持多行）
  let contentSvg = ''
  const contentStartY = headerHeight + 45
  contentLines.forEach((line, index) => {
    const y = contentStartY + index * LINE_HEIGHT
    contentSvg += `<text x="${PADDING + 30}" y="${y}" font-size="16" fill="${textColor}" font-family="${fontFamily}">${escapeXml(line)}</text>`
  })

  // 图片区域
  let imagesSection = ''
  if (hasImages) {
    const imgSize = 140
    const imgGap = 15
    const imgStartY = headerHeight + contentSectionHeight + senderSectionHeight + 10

    let imageTags = ''
    const maxDisplayImages = 4

    for (let i = 0; i < Math.min(images.length, maxDisplayImages); i++) {
      const imgId = images[i].id
      const imgBase64 = imagesBase64[imgId]
      const imgX = PADDING + 25 + i * (imgSize + imgGap)

      if (imgBase64) {
        imageTags += `<image x="${imgX}" y="${imgStartY}" width="${imgSize}" height="${imgSize}" href="data:image/jpeg;base64,${imgBase64}" rx="8"/>`
      } else {
        imageTags += `<rect x="${imgX}" y="${imgStartY}" width="${imgSize}" height="${imgSize}" rx="8" fill="${highlightBg}"/>`
        imageTags += `<text x="${imgX + imgSize / 2}" y="${imgStartY + imgSize / 2 + 5}" font-size="20" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle">?</text>`
      }
    }

    if (images.length > maxDisplayImages) {
      const moreX = PADDING + 25 + maxDisplayImages * (imgSize + imgGap)
      imageTags += `<rect x="${moreX}" y="${imgStartY}" width="${imgSize}" height="${imgSize}" rx="8" fill="${highlightBg}"/>`
      imageTags += `<text x="${moreX + imgSize / 2}" y="${imgStartY + imgSize / 2}" font-size="18" fill="${accentColor}" font-family="${fontFamily}" text-anchor="middle" dominant-baseline="middle">+${images.length - maxDisplayImages}</text>`
    }

    imagesSection = `<text x="${PADDING + 25}" y="${imgStartY - 15}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">📎 附件图片 (${images.length}张)</text>` +
      imageTags
  }

  const timestamp = new Date().toLocaleString('zh-CN')

  // 构建 SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>` +
    `<linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${bgColor}"/>` +
    `<stop offset="100%" stop-color="${gradientEnd}"/>` +
    `</linearGradient>` +
    `<filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">` +
    `<feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="${shadowColor}"/>` +
    `</filter>` +
    `<clipPath id="group-avatar-clip"><rect x="${groupAvatarX}" y="${groupAvatarY}" width="${groupAvatarSize}" height="${groupAvatarSize}" rx="10"/></clipPath>` +
    `<clipPath id="sender-avatar-clip"><circle cx="${avatarX + avatarSize/2}" cy="${headerHeight + contentSectionHeight + 25 + avatarSize/2}" r="${avatarSize/2}"/></clipPath>` +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bg-grad)"/>` +
    `<rect x="${PADDING}" y="${PADDING}" width="${W - PADDING * 2}" height="${H - PADDING * 2}" rx="${CARD_RX}" fill="${cardBg}" fill-opacity="0.95" filter="url(#card-shadow)"/>` +

    // 群头像
    groupAvatarSvg +

    // 标题区域（调整位置，给头像留出空间）
    `<text x="${PADDING + 25 + groupAvatarSize + 15}" y="${PADDING + 45}" font-size="24" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)}</text>` +
    `<text x="${PADDING + 25 + groupAvatarSize + 15}" y="${PADDING + 72}" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)} · 群公告详情</text>` +
    `<line x1="${PADDING + 15}" y1="${headerHeight - 10}" x2="${W - PADDING - 15}" y2="${headerHeight - 10}" stroke="${dividerColor}" stroke-width="1"/>` +

    // 公告内容区域
    `<text x="${PADDING + 25}" y="${headerHeight + 25}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">💬 公告内容</text>` +
    `<rect x="${PADDING + 15}" y="${headerHeight + 35}" width="${CONTENT_MAX_WIDTH}" height="${contentHeight}" rx="10" fill="${highlightBg}"/>` +
    contentSvg +

    // 分隔线
    `<line x1="${PADDING + 15}" y1="${headerHeight + contentSectionHeight}" x2="${W - PADDING - 15}" y2="${headerHeight + contentSectionHeight}" stroke="${dividerColor}" stroke-width="1" stroke-dasharray="4,4"/>` +

    // 发布者信息
    `<text x="${PADDING + 25}" y="${headerHeight + contentSectionHeight + 20}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">👤 发布信息</text>` +
    senderAvatarSvg +
    `<text x="${avatarX + avatarSize + 15}" y="${headerHeight + contentSectionHeight + 50}" font-size="16" fill="${textColor}" font-family="${fontFamily}" font-weight="600">发布者: ${escapeXml(senderId)}</text>` +
    `<text x="${avatarX + avatarSize + 15}" y="${headerHeight + contentSectionHeight + 75}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">🕐 ${escapeXml(time)}</text>` +

    // 图片区域
    imagesSection +

    // 底部水印
    `<text x="${W - PADDING - 15}" y="${H - PADDING - 10}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="end">${escapeXml(timestamp)}</text>` +
    `<text x="${PADDING + 15}" y="${H - PADDING - 10}" font-size="11" fill="${watermarkColor}" font-family="monospace">rendered by resvg</text>` +
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
  ctx.logger.info(`[svgGroupNoticeDetail] PNG output=${pngData.width}x${pngData.height}, scale=${scale}, base64_len=${pngBuffer.length}`)

  return Buffer.from(pngBuffer).toString('base64')
}
