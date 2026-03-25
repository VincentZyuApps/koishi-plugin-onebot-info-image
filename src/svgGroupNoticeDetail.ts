import { Resvg } from '@resvg/resvg-js'
import { Context } from 'koishi'
import { escapeXml, truncate, formatTs, decodeHtmlEntities, loadResvgFont } from './utils'

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

export async function svgGroupNoticeDetail(
  ctx: Context,
  options: SvgGroupNoticeDetailOptions,
): Promise<string> {
  const { record, contextInfo, groupAvatarBase64, senderAvatarBase64, imagesBase64 = {}, enableDarkMode = false, scale = 3.3, svgThemeColor = '#7e57c2', enableCustomFont = false, fontFiles: configFontFiles, fontFamilies: configFontFamilies } = options

  const { fontFiles, fontFamily } = loadResvgFont(enableCustomFont, configFontFiles, configFontFamilies)

  const W = 900
  const PADDING = 40         // 外边距
  const CARD_RX = 20         // 卡片圆角

  // 颜色方案（与群精华详情保持一致）
  const bgColor = enableDarkMode ? '#0d1117' : '#e0eafc'
  const cardBg = enableDarkMode ? '#161b22' : '#ffffff'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#666666'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const accentColor = svgThemeColor  // 使用配置的主题颜色
  const shadowColor = enableDarkMode ? '#00000044' : '#00000018'
  const watermarkColor = enableDarkMode ? '#484f58' : '#999999'
  const avatarBgColor = enableDarkMode ? '#30363d' : '#e8e8e8'
  const itemBgColor = enableDarkMode ? '#21262d' : '#f8f9fa'
  const highlightBg = enableDarkMode ? '#1f2937' : '#f3e5f5'  // 与 Koishi 紫色搭配的高亮背景

  const groupName = truncate(contextInfo.groupName || '未知群名', 25)
  const groupId = String(contextInfo.groupId || '')
  const memberText = contextInfo.memberCount
    ? `${contextInfo.memberCount}${contextInfo.maxMemberCount ? '/' + contextInfo.maxMemberCount : ''} 人`
    : ''
  const rawContent = decodeHtmlEntities(record.message.text) || '[空公告]'
  const time = formatTs(record.publish_time)
  const images = record.message.images || []
  const senderId = String(record.sender_id)

  // ── 布局计算 ──────────────────────────────────────────────

  // 群头像
  const groupAvatarSize = 56
  const groupAvatarX = PADDING + 20
  const groupAvatarY = PADDING + 20

  // 发送者头像
  const senderAvatarSize = 48
  const senderAvatarX = PADDING + 35
  const senderAvatarY = 201  // 发送者卡片内的Y坐标

  // 内容区域
  const contentLines = wrapText(rawContent, 50)
  const LINE_HEIGHT = 26
  const contentTextH = Math.max(40, contentLines.length * LINE_HEIGHT + 10)
  const hasImages = images.length > 0
  const imgThumbSize = 120
  const imgThumbGap = 15
  const maxDisplayImages = 3
  const displayImgCount = Math.min(images.length, maxDisplayImages)
  const imagesHeight = hasImages ? imgThumbSize + 40 : 0

  // 内容卡片位置
  const contentCardY = 290
  const contentHeight = Math.max(80, contentTextH + imagesHeight + 20)
  const contentCardHeight = contentHeight

  // 底部信息区域
  const footerY = contentCardY + contentCardHeight + 40
  const contentCardTopPadding = 12
  const contentTitleBottomGap = 8

  // 总高度
  const timestamp = new Date().toLocaleString('zh-CN')
  const H = Math.max(550, footerY + 100)

  // ── 绘制群头像 ─────────────────────────────────────────────
  let groupAvatarSvg = ''
  if (groupAvatarBase64) {
    groupAvatarSvg = `<image x="${groupAvatarX}" y="${groupAvatarY}" width="${groupAvatarSize}" height="${groupAvatarSize}" href="data:image/jpeg;base64,${groupAvatarBase64}" clip-path="url(#group-avatar-clip)"/>`
  } else {
    groupAvatarSvg = `<rect x="${groupAvatarX}" y="${groupAvatarY}" width="${groupAvatarSize}" height="${groupAvatarSize}" rx="12" fill="${avatarBgColor}"/>`
  }

  // ── 绘制发送者头像 ──────────────────────────────────────────
  let senderAvatarSvg = ''
  let senderClipPath = ''
  const senderAvatarCenterX = senderAvatarX + senderAvatarSize / 2
  const senderAvatarCenterY = senderAvatarY + senderAvatarSize / 2
  const senderAvatarRadius = senderAvatarSize / 2

  if (senderAvatarBase64) {
    senderClipPath = `<clipPath id="sender-avatar-clip"><circle cx="${senderAvatarCenterX}" cy="${senderAvatarCenterY}" r="${senderAvatarRadius}"/></clipPath>`
    senderAvatarSvg = `<image x="${senderAvatarX}" y="${senderAvatarY}" width="${senderAvatarSize}" height="${senderAvatarSize}" href="data:image/jpeg;base64,${senderAvatarBase64}" clip-path="url(#sender-avatar-clip)"/>`
  } else {
    senderClipPath = `<clipPath id="sender-avatar-clip"><circle cx="${senderAvatarCenterX}" cy="${senderAvatarCenterY}" r="${senderAvatarRadius}"/></clipPath>`
    senderAvatarSvg = `<rect x="${senderAvatarX}" y="${senderAvatarY}" width="${senderAvatarSize}" height="${senderAvatarSize}" rx="24" fill="${avatarBgColor}"/>`
  }

  // ── 公告内容文字 ────────────────────────────────────────────
  const contentX = PADDING + 30
  let contentSvg = ''
  let currentY = 0
  contentLines.forEach((line, index) => {
    const y = currentY + 25
    contentSvg += `<text x="${contentX}" y="${y}" font-size="16" fill="${textColor}" font-family="${fontFamily}">${escapeXml(line)}</text>`
    currentY += 28
  })

  // ── 公告图片 ─────────────────────────────────────────────
  let imagesSvg = ''
  if (hasImages) {
    const imgStartY = currentY + 15
    const imgStartX = contentX

    for (let i = 0; i < displayImgCount; i++) {
      const imgId = images[i].id
      const imgBase64 = imagesBase64[imgId]
      const imgX = imgStartX + i * (imgThumbSize + imgThumbGap)

      if (imgBase64) {
        imagesSvg += `<rect x="${imgX}" y="${imgStartY}" width="${imgThumbSize}" height="${imgThumbSize}" rx="8" fill="${avatarBgColor}"/>`
        imagesSvg += `<image x="${imgX + 2}" y="${imgStartY + 2}" width="${imgThumbSize - 4}" height="${imgThumbSize - 4}" href="data:image/jpeg;base64,${imgBase64}" preserveAspectRatio="xMidYMid meet"/>`
      } else {
        imagesSvg += `<rect x="${imgX}" y="${imgStartY}" width="${imgThumbSize}" height="${imgThumbSize}" rx="8" fill="${avatarBgColor}"/>`
        imagesSvg += `<text x="${imgX + imgThumbSize / 2}" y="${imgStartY + imgThumbSize / 2 + 4}" font-size="10" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle">?</text>`
      }
    }

    if (images.length > maxDisplayImages) {
      const moreX = imgStartX + maxDisplayImages * (imgThumbSize + imgThumbGap)
      imagesSvg += `<rect x="${moreX}" y="${imgStartY}" width="${imgThumbSize}" height="${imgThumbSize}" rx="8" fill="${avatarBgColor}"/>`
      imagesSvg += `<text x="${moreX + imgThumbSize / 2}" y="${imgStartY + imgThumbSize / 2}" font-size="12" fill="${accentColor}" font-family="${fontFamily}" text-anchor="middle" dominant-baseline="middle">+${images.length - maxDisplayImages}</text>`
    }

    // 图片数量标签
    imagesSvg += `<text x="${imgStartX}" y="${imgStartY + imgThumbSize + 20}" font-size="12" fill="${accentColor}" font-family="${fontFamily}">${images.length}张图</text>`
  }

  // ── 构建 SVG ───────────────────────────────────────────────
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
    senderClipPath +
    `</defs>` +
    `<rect width="${W}" height="${H}" fill="url(#bg-grad)"/>` +
    `<rect x="${PADDING}" y="${PADDING}" width="${W - PADDING * 2}" height="${H - PADDING * 2}" rx="${CARD_RX}" fill="${cardBg}" fill-opacity="0.98" filter="url(#card-shadow)"/>` +

    // 群头像
    groupAvatarSvg +

    // 群名称和群号
    `<text x="${PADDING + 20 + groupAvatarSize + 15}" y="${PADDING + 45}" font-size="22" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)}</text>` +
    `<text x="${PADDING + 20 + groupAvatarSize + 15}" y="${PADDING + 70}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)}${memberText ? ' · 成员: ' + memberText : ''}</text>` +

    // 分隔线
    `<line x1="${PADDING + 15}" y1="${PADDING + 95}" x2="${W - PADDING - 15}" y2="${PADDING + 95}" stroke="${dividerColor}" stroke-width="1"/>` +

    // 标题区域
    `<text x="${W / 2}" y="${PADDING + 130}" font-size="20" fill="${textColor}" font-family="${fontFamily}" font-weight="bold" text-anchor="middle">群公告详情</text>` +

    // 发送者信息卡片
    `<rect x="${PADDING + 15}" y="185" width="${W - PADDING * 2 - 30}" height="80" rx="12" fill="${itemBgColor}" stroke="${dividerColor}" stroke-width="1"/>` +
    senderAvatarSvg +
    `<text x="${senderAvatarX + senderAvatarSize + 15}" y="216" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">发布者</text>` +
    `<text x="${senderAvatarX + senderAvatarSize + 15}" y="241" font-size="16" fill="${textColor}" font-family="${fontFamily}" font-weight="600">QQ: ${senderId}</text>` +

    // 公告内容卡片
    `<rect x="${PADDING + 15}" y="${contentCardY}" width="${W - PADDING * 2 - 30}" height="${contentCardHeight}" rx="12" fill="${highlightBg}"/>` +
    `<g transform="translate(0, ${contentCardY})"><text x="${contentX}" y="${contentCardTopPadding + 12}" font-size="16" fill="${textColor}" font-family="${fontFamily}" font-weight="600">公告内容:</text></g>` +
    `<g transform="translate(0, ${contentCardY + contentCardTopPadding + contentTitleBottomGap + 15})">${contentSvg}</g>` +
    `<g transform="translate(0, ${contentCardY + contentCardTopPadding + contentTitleBottomGap + 15})">${imagesSvg}</g>` +

    // 底部信息
    `<text x="${PADDING + 20}" y="${footerY}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">发布时间: ${escapeXml(time)}</text>` +

    // 底部水印
    `<text x="${PADDING + 15}" y="${H - PADDING - 10}" font-size="11" fill="${watermarkColor}" font-family="monospace">generated by koishi-plugin-onebot-info-image, resvg mode</text>` +
    `<text x="${W - PADDING - 15}" y="${H - PADDING - 10}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="end">${escapeXml(timestamp)}</text>` +
    `<text x="${W / 2}" y="${H - PADDING + 10}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="middle">2026年3月21日18:21:17</text>` +
    `<text x="${W / 2}" y="${H - PADDING + 23}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="middle">https://github.com/VincentZyuApps/koishi-plugin-onebot-info-image</text>` +
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
  ctx.logger.info(`[svgGroupNoticeDetail] PNG output=${pngData.width}x${pngData.height}, scale=${scale}, base64_len=${pngBuffer.length}`)

  return Buffer.from(pngBuffer).toString('base64')
}
