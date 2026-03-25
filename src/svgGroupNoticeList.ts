import { Resvg } from '@resvg/resvg-js'
import { Context } from 'koishi'
import { escapeXml, truncate, formatTs, decodeHtmlEntities, loadResvgFont } from './utils'

export interface GroupNoticeMessageRaw {
  notice_id: string
  sender_id: number
  sender_nick?: string
  publish_time: number
  message: {
    text: string
    image: Array<{ id: string; height: string; width: string }>
    images: Array<{ id: string; height: string; width: string }>
  }
}

export interface PaginatedNoticeResult {
  records: GroupNoticeMessageRaw[]
  totalCount: number
  currentPage: number
  pageSize: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface NoticeContextInfo {
  groupId: number
  groupName: string
  memberCount: number
  maxMemberCount: number
  groupAvatarUrl: string
}

export interface SvgGroupNoticeOptions {
  result: PaginatedNoticeResult
  contextInfo: NoticeContextInfo
  groupAvatarBase64?: string
  avatarsBase64?: Record<string, string>
  imagesBase64?: Record<string, string>
  enableDarkMode?: boolean
  scale?: number
  enableEmoji?: boolean
  enableEmojiCache?: boolean
  svgThemeColor?: string
  enableCustomFont?: boolean
  fontFiles?: string[]
  fontFamilies?: string[]
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

/**
 * 格式化时间（简化版）
 */
function formatTimeSimple(ts: number): string {
  if (!ts || ts <= 0) return '未知时间'
  const date = new Date(ts * 1000)
  if (isNaN(date.getTime())) return '未知时间'
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export async function svgGroupNotice(
  ctx: Context,
  options: SvgGroupNoticeOptions,
): Promise<string> {
  const { result, contextInfo, groupAvatarBase64, avatarsBase64 = {}, imagesBase64 = {}, enableDarkMode = false, scale = 3.3, svgThemeColor = '#7e57c2', enableCustomFont = false, fontFiles: configFontFiles, fontFamilies: configFontFamilies } = options

  const { fontFiles, fontFamily } = loadResvgFont(enableCustomFont, configFontFiles, configFontFamilies)

  const W = 900
  const PADDING = 40
  const CARD_RX = 20

  const bgColor = enableDarkMode ? '#0d1117' : '#e0eafc'
  const cardBg = enableDarkMode ? '#161b22' : '#ffffff'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#666666'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const accentColor = svgThemeColor  // 使用配置的主题颜色
  const shadowColor = enableDarkMode ? '#00000044' : '#00000018'
  const watermarkColor = enableDarkMode ? '#484f58' : '#999999'
  const avatarBgColor = enableDarkMode ? '#30363d' : '#e8e8e8'
  const itemBgColor = enableDarkMode ? '#1f2937' : '#f3e5f5'  // 使用主题色的高亮背景
  const indexBgColor = enableDarkMode ? '#30363d' : '#f3e5f5'  // 与 Koishi 紫色搭配的背景
  const indexTextColor = enableDarkMode ? '#c084fc' : svgThemeColor  // 使用配置的主题颜色

  const groupName = truncate(contextInfo.groupName || '未知群名', 25)
  const groupId = String(contextInfo.groupId || '')
  const memberText = contextInfo.memberCount
    ? `${contextInfo.memberCount}${contextInfo.maxMemberCount ? '/' + contextInfo.maxMemberCount : ''} 人`
    : ''

  // 群头像
  const groupAvatarSize = 56
  const groupAvatarX = PADDING + 20
  const groupAvatarY = PADDING + 20

  let groupAvatarSvg = ''
  if (groupAvatarBase64) {
    groupAvatarSvg = `<image x="${groupAvatarX}" y="${groupAvatarY}" width="${groupAvatarSize}" height="${groupAvatarSize}" href="data:image/jpeg;base64,${groupAvatarBase64}" clip-path="url(#group-avatar-clip)"/>`
  } else {
    groupAvatarSvg = `<rect x="${groupAvatarX}" y="${groupAvatarY}" width="${groupAvatarSize}" height="${groupAvatarSize}" rx="12" fill="${avatarBgColor}"/>`
  }

  // 动态计算每项高度
  function calculateItemHeight(record: GroupNoticeMessageRaw): number {
    const content = decodeHtmlEntities(record.message.text) || '[空公告]'
    const lines = wrapText(content, 50)
    const lineHeight = 26
    const contentHeight = Math.max(40, lines.length * lineHeight + 8)
    const hasImages = (record.message.images?.length || 0) > 0
    const imagesHeight = hasImages ? 90 : 0
    return Math.max(150, contentHeight + imagesHeight + 50)
  }

  let noticeItems = ''
  let clipPaths = ''
  let currentY = 200  // 起始Y坐标（在标题下方，留出足够空间）

  for (let i = 0; i < result.records.length; i++) {
    const record = result.records[i]
    const itemHeight = calculateItemHeight(record)
    const y = currentY
    const index = (result.currentPage - 1) * result.pageSize + i + 1
    const indexStr = index.toString().padStart(2, '0')

    const rawContent = decodeHtmlEntities(record.message.text) || '[空公告]'
    const contentLines = wrapText(rawContent, 50)
    const time = formatTimeSimple(record.publish_time)
    const imageCount = record.message.images?.length || 0
    const senderId = String(record.sender_id)
    const senderNick = record.sender_nick || senderId
    const avatarBase64 = avatarsBase64[senderId]

    // 背景卡片
    noticeItems += `<rect x="${PADDING + 15}" y="${y}" width="${W - PADDING * 2 - 30}" height="${itemHeight}" rx="12" fill="${itemBgColor}" stroke="${dividerColor}" stroke-width="1"/>`

    // 序号（左侧大数字）
    const indexX = PADDING + 45
    const indexY = y + 35
    noticeItems += `<text x="${indexX}" y="${indexY}" font-size="28" fill="${indexTextColor}" font-family="${fontFamily}" font-weight="bold">${indexStr}</text>`

    // 发布者头像（序号右侧）
    const avatarSize = 48
    const avatarX = PADDING + 80
    const avatarY = y + 20

    let avatarSvg = ''
    if (avatarBase64) {
      avatarSvg = `<image x="${avatarX}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" href="data:image/jpeg;base64,${avatarBase64}" clip-path="url(#avatar-clip-${i})"/>`
    } else {
      avatarSvg = `<rect x="${avatarX}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" rx="24" fill="${avatarBgColor}"/>`
    }
    clipPaths += `<clipPath id="avatar-clip-${i}"><circle cx="${avatarX + avatarSize/2}" cy="${avatarY + avatarSize/2}" r="${avatarSize/2}"/></clipPath>`
    noticeItems += avatarSvg

    // 发布者信息（头像右侧）
    const infoX = avatarX + avatarSize + 15
    const infoY = y + 30
    noticeItems += `<text x="${infoX}" y="${infoY}" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">发布者</text>`
    noticeItems += `<text x="${infoX}" y="${infoY + 22}" font-size="15" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(truncate(senderNick, 15))}</text>`
    noticeItems += `<text x="${infoX}" y="${infoY + 42}" font-size="12" fill="${subTextColor}" font-family="${fontFamily}">QQ: ${senderId}</text>`

    // 公告内容（发布者信息右侧）
    const contentX = infoX + 160
    const contentStartY = y + 28
    let contentSvg = ''
    contentLines.forEach((line, idx) => {
      const lineY = contentStartY + idx * 26
      contentSvg += `<text x="${contentX}" y="${lineY}" font-size="15" fill="${textColor}" font-family="${fontFamily}">${escapeXml(line)}</text>`
    })
    noticeItems += contentSvg

    // 图片预览（内容下方）
    if (imageCount > 0) {
      const imgSize = 60
      const imgGap = 10
      const imgStartX = contentX
      const imgY = contentStartY + contentLines.length * 26 + 15

      let imagesSvg = ''
      const maxDisplayImages = 3

      for (let j = 0; j < Math.min(imageCount, maxDisplayImages); j++) {
        const imgId = record.message.images[j].id
        const imgBase64 = imagesBase64[imgId]
        const imgX = imgStartX + j * (imgSize + imgGap)

        if (imgBase64) {
          imagesSvg += `<rect x="${imgX}" y="${imgY}" width="${imgSize}" height="${imgSize}" rx="8" fill="${avatarBgColor}"/>`
          imagesSvg += `<image x="${imgX + 2}" y="${imgY + 2}" width="${imgSize - 4}" height="${imgSize - 4}" href="data:image/jpeg;base64,${imgBase64}" preserveAspectRatio="xMidYMid slice"/>`
        } else {
          imagesSvg += `<rect x="${imgX}" y="${imgY}" width="${imgSize}" height="${imgSize}" rx="8" fill="${avatarBgColor}"/>`
          imagesSvg += `<text x="${imgX + imgSize / 2}" y="${imgY + imgSize / 2 + 4}" font-size="10" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle">?</text>`
        }
      }

      if (imageCount > maxDisplayImages) {
        const moreX = imgStartX + maxDisplayImages * (imgSize + imgGap)
        imagesSvg += `<rect x="${moreX}" y="${imgY}" width="${imgSize}" height="${imgSize}" rx="8" fill="${avatarBgColor}"/>`
        imagesSvg += `<text x="${moreX + imgSize / 2}" y="${imgY + imgSize / 2}" font-size="12" fill="${accentColor}" font-family="${fontFamily}" text-anchor="middle" dominant-baseline="middle">+${imageCount - maxDisplayImages}</text>`
      }

      noticeItems += imagesSvg

      // 图片数量标签
      noticeItems += `<text x="${imgStartX}" y="${imgY + imgSize + 20}" font-size="12" fill="${accentColor}" font-family="${fontFamily}">${imageCount}张图</text>`
    }

    // 时间（右下角）
    noticeItems += `<text x="${W - PADDING - 30}" y="${y + itemHeight - 15}" font-size="12" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="end">${escapeXml(time)}</text>`

    currentY += itemHeight + 15
  }

  const timestamp = new Date().toLocaleString('zh-CN')
  const totalHeight = currentY + 40  // 内容高度 + 底部边距
  const H = Math.max(0, totalHeight)

  // 构建 SVG
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>` +
    `<linearGradient id="bg-grad" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${bgColor}"/>` +
    `<stop offset="100%" stop-color="${cardBg}"/>` +
    `</linearGradient>` +
    `<filter id="card-shadow" x="-5%" y="-5%" width="110%" height="115%">` +
    `<feDropShadow dx="0" dy="4" stdDeviation="12" flood-color="${shadowColor}"/>` +
    `</filter>` +
    `<clipPath id="group-avatar-clip"><rect x="${groupAvatarX}" y="${groupAvatarY}" width="${groupAvatarSize}" height="${groupAvatarSize}" rx="12"/></clipPath>` +
    clipPaths +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bg-grad)"/>` +
    `<rect x="${PADDING}" y="${PADDING}" width="${W - PADDING * 2}" height="${H - PADDING * 2}" rx="${CARD_RX}" fill="${cardBg}" fill-opacity="0.98" filter="url(#card-shadow)"/>` +

    // 群头像
    groupAvatarSvg +

    // 标题区域
    `<text x="${PADDING + 20 + groupAvatarSize + 15}" y="${PADDING + 45}" font-size="22" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)}</text>` +
    `<text x="${PADDING + 20 + groupAvatarSize + 15}" y="${PADDING + 70}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)}${memberText ? ' · 成员: ' + memberText : ''}</text>` +

    // 页面信息（右上角）
    `<text x="${W - PADDING - 25}" y="${PADDING + 55}" font-size="14" fill="${accentColor}" font-family="${fontFamily}" text-anchor="end">第 ${result.currentPage}/${result.totalPages} 页</text>` +

    // 分隔线
    `<line x1="${PADDING + 15}" y1="${PADDING + 95}" x2="${W - PADDING - 15}" y2="${PADDING + 95}" stroke="${dividerColor}" stroke-width="1"/>` +

    // 公告列表标题
    `<text x="${W / 2}" y="${PADDING + 130}" font-size="20" fill="${textColor}" font-family="${fontFamily}" font-weight="bold" text-anchor="middle">群公告列表</text>` +
    `<text x="${W / 2}" y="${PADDING + 155}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle">第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条公告)</text>` +

    // 公告项
    noticeItems +

    // 底部水印
    `<text x="${PADDING + 15}" y="${H - PADDING - 5}" font-size="11" fill="${watermarkColor}" font-family="monospace">generated by koishi-plugin-onebot-info-image, resvg mode</text>` +
    `<text x="${W - PADDING - 15}" y="${H - PADDING - 5}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="end">${escapeXml(timestamp)}</text>` +
    `<text x="${W / 2}" y="${H - PADDING + 8}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="middle">2026 年 3 月 21 日 18:21:17</text>` +
    `<text x="${W / 2}" y="${H - PADDING + 18}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="middle">https://github.com/VincentZyuApps/koishi-plugin-onebot-info-image</text>` +
    `</svg>`

  const resvgOpts: any = {
    fitTo: { mode: 'zoom', value: scale },
    font: {
      fontFiles,
      loadSystemFonts: true,
      defaultFontFamily: fontFamily,
    },
  }

  const resvg = new Resvg(svg, resvgOpts)

  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()
  ctx.logger.info(`[svgGroupNotice] PNG output=${pngData.width}x${pngData.height}, scale=${scale}, base64_len=${pngBuffer.length}`)

  return Buffer.from(pngBuffer).toString('base64')
}
