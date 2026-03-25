import { Resvg } from '@resvg/resvg-js'
import { Context } from 'koishi'
import { escapeXml, truncate, formatTs, decodeHtmlEntities, loadResvgFont } from './utils'

interface ParsedContentItem {
  type: 'text' | 'image'
  text?: string
  imageUrl?: string
}

function parseEssenceContentToItems(content: Array<{ type: string; data: Record<string, any> }>): ParsedContentItem[] {
  const items: ParsedContentItem[] = []
  for (const item of content) {
    if (item.type === 'text') {
      const text = decodeHtmlEntities(item.data.text) || ''
      if (text) {
        items.push({ type: 'text', text })
      }
    } else if (item.type === 'at') {
      const text = `@${decodeHtmlEntities(item.data.name) || item.data.qq || ''} `
      items.push({ type: 'text', text })
    } else if (item.type === 'image') {
      if (item.data.url) {
        let url = item.data.url
        // 清理 URL 中的反引号和逗号
        url = url.replace(/[`]/g, '').replace(/[,]$/, '').trim()
        items.push({ type: 'image', imageUrl: url })
      } else {
        items.push({ type: 'text', text: '[图片] ' })
      }
    } else if (item.type === 'face') {
      items.push({ type: 'text', text: `[表情${item.data.id}] ` })
    } else if (item.type === 'record') {
      items.push({ type: 'text', text: '[语音] ' })
    } else if (item.type === 'video') {
      items.push({ type: 'text', text: '[视频] ' })
    } else if (item.type === 'reply') {
      items.push({ type: 'text', text: '[回复] ' })
    }
  }
  return items.length > 0 ? items : [{ type: 'text', text: '[无法解析的消息]' }]
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

export async function svgGroupEssenceDetail(
  ctx: Context,
  options: SvgGroupEssenceDetailOptions,
): Promise<string> {
  const { record, contextInfo, groupAvatarBase64, senderAvatarBase64, operatorAvatarBase64, imagesBase64 = {}, enableDarkMode = false, scale = 3.3, svgThemeColor = '#7e57c2', enableCustomFont = false, fontFiles: configFontFiles, fontFamilies: configFontFamilies } = options

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
  const itemBgColor = enableDarkMode ? '#21262d' : '#f8f9fa'
  const highlightBg = enableDarkMode ? '#1f2937' : '#f3e5f5'  // 与 Koishi 紫色搭配的高亮背景

  const groupName = truncate(contextInfo.groupName || '未知群名', 25)
  const groupId = String(contextInfo.groupId || '')
  const memberText = contextInfo.memberCount
    ? `${contextInfo.memberCount}${contextInfo.maxMemberCount ? '/' + contextInfo.maxMemberCount : ''}`
    : ''
  const sender = truncate(record.sender_nick || String(record.sender_id), 15)
  const operator = truncate(record.operator_nick || String(record.operator_id), 15)
  const addTime = formatTs(record.operator_time)
  const senderId = String(record.sender_id)
  const operatorId = String(record.operator_id)

  // 解析内容
  const contentItems = parseEssenceContentToItems(record.content)

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

  // 发送者头像
  const senderAvatarSize = 48
  const senderAvatarX = PADDING + 35
  const senderAvatarY = 210  // 发送者卡片内的Y坐标
  const senderAvatarCenterX = senderAvatarX + senderAvatarSize / 2
  const senderAvatarCenterY = senderAvatarY + senderAvatarSize / 2
  const senderAvatarRadius = senderAvatarSize / 2

  let senderAvatarSvg = ''
  let senderClipPath = ''
  if (senderAvatarBase64) {
    senderClipPath = `<clipPath id="sender-avatar-clip"><circle cx="${senderAvatarCenterX}" cy="${senderAvatarCenterY}" r="${senderAvatarRadius}"/></clipPath>`
    senderAvatarSvg = `<image x="${senderAvatarX}" y="${senderAvatarY}" width="${senderAvatarSize}" height="${senderAvatarSize}" href="data:image/jpeg;base64,${senderAvatarBase64}" clip-path="url(#sender-avatar-clip)"/>`
  } else {
    senderClipPath = `<clipPath id="sender-avatar-clip"><circle cx="${senderAvatarCenterX}" cy="${senderAvatarCenterY}" r="${senderAvatarRadius}"/></clipPath>`
    senderAvatarSvg = `<rect x="${senderAvatarX}" y="${senderAvatarY}" width="${senderAvatarSize}" height="${senderAvatarSize}" rx="24" fill="${avatarBgColor}"/>`
  }

  // 内容卡片位置
  const contentCardY = 290
  
  // 构建内容 SVG
  let contentSvg = ''
  let currentY = 0
  const contentX = PADDING + 30
  const maxContentWidth = W - PADDING * 2 - 60

  for (const item of contentItems) {
    if (item.type === 'text' && item.text) {
      // 处理长文本换行
      const lines = []
      let currentLine = ''
      for (const char of item.text) {
        if ((currentLine + char).length > 50) {
          lines.push(currentLine)
          currentLine = char
        } else {
          currentLine += char
        }
      }
      if (currentLine) lines.push(currentLine)

      for (const line of lines) {
        contentSvg += `<text x="${contentX}" y="${currentY + 25}" font-size="16" fill="${textColor}" font-family="${fontFamily}">${escapeXml(line)}</text>`
        currentY += 28
      }
    } else if (item.type === 'image' && item.imageUrl) {
      if (imagesBase64[item.imageUrl]) {
        // 显示图片
        const imgWidth = 200
        const imgHeight = 150
        contentSvg += `<rect x="${contentX}" y="${currentY + 5}" width="${imgWidth}" height="${imgHeight}" rx="8" fill="${avatarBgColor}"/>`
        // 根据 URL 扩展名判断图片类型
        const url = item.imageUrl
        const isPng = url.toLowerCase().endsWith('.png')
        const isJpg = url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')
        const isGif = url.toLowerCase().endsWith('.gif')
        let mimeType = 'image/jpeg'
        if (isPng) mimeType = 'image/png'
        if (isGif) mimeType = 'image/gif'
        contentSvg += `<image x="${contentX + 2}" y="${currentY + 7}" width="${imgWidth - 4}" height="${imgHeight - 4}" href="data:${mimeType};base64,${imagesBase64[item.imageUrl]}" preserveAspectRatio="xMidYMid slice"/>`
        currentY += imgHeight + 15
        ctx.logger.info(`[svgGroupEssenceDetail] 渲染图片成功: URL=${item.imageUrl.substring(0, 50)}..., type=${mimeType}`)
      } else {
        ctx.logger.warn(`[svgGroupEssenceDetail] 图片未找到: URL=${item.imageUrl.substring(0, 50)}...`)
        // 显示占位符
        const imgWidth = 200
        const imgHeight = 150
        contentSvg += `<rect x="${contentX}" y="${currentY + 5}" width="${imgWidth}" height="${imgHeight}" rx="8" fill="${avatarBgColor}"/>`
        contentSvg += `<text x="${contentX + imgWidth/2}" y="${currentY + 5 + imgHeight/2}" font-size="14" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle" dominant-baseline="middle">[图片加载失败]</text>`
        currentY += imgHeight + 15
      }
    }
  }

  const contentHeight = Math.max(80, currentY + 20)
  const contentCardHeight = contentHeight

  // 底部信息区域
  const footerY = contentCardY + contentCardHeight + 40
  const contentCardTopPadding = 12
  const contentTitleBottomGap = 8

  const timestamp = new Date().toLocaleString('zh-CN')
  const H = Math.max(550, footerY + 100)

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
    `<text x="${PADDING + 20 + groupAvatarSize + 15}" y="${PADDING + 70}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">${escapeXml(groupId)}${memberText ? ' | 成员: ' + truncate(memberText, 12) : ''}</text>` +

    // 分隔线
    `<line x1="${PADDING + 15}" y1="${PADDING + 95}" x2="${W - PADDING - 15}" y2="${PADDING + 95}" stroke="${dividerColor}" stroke-width="1"/>` +

    // 标题区域
    `<text x="${W / 2}" y="${PADDING + 130}" font-size="20" fill="${textColor}" font-family="${fontFamily}" font-weight="bold" text-anchor="middle">群精华详情</text>` +

    // 发送者信息卡片
    `<rect x="${PADDING + 15}" y="185" width="${W - PADDING * 2 - 30}" height="80" rx="12" fill="${cardBg}" stroke="${dividerColor}" stroke-width="1"/>` +
    senderAvatarSvg +
    `<text x="${senderAvatarX + senderAvatarSize + 15}" y="225" font-size="16" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(sender)}</text>` +
    `<text x="${senderAvatarX + senderAvatarSize + 15}" y="250" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">QQ: ${senderId}</text>` +

  // 消息内容卡片
  `<rect x="${PADDING + 15}" y="${contentCardY}" width="${W - PADDING * 2 - 30}" height="${contentCardHeight}" rx="12" fill="${highlightBg}"/>` +
  `<g transform="translate(0, ${contentCardY})"><text x="${contentX}" y="${contentCardTopPadding + 12}" font-size="16" fill="${textColor}" font-family="${fontFamily}" font-weight="600">消息内容:</text></g>` +
  `<g transform="translate(0, ${contentCardY + contentCardTopPadding + contentTitleBottomGap + 15})">${contentSvg}</g>` +

    // 底部信息
    `<text x="${PADDING + 20}" y="${footerY}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">收录时间: ${escapeXml(addTime)}</text>` +
    `<text x="${PADDING + 20}" y="${footerY + 25}" font-size="13" fill="${accentColor}" font-family="${fontFamily}">收录者: ${escapeXml(operator)} (${operatorId})</text>` +

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
  ctx.logger.info(`[svgGroupEssenceDetail] PNG output=${pngData.width}x${pngData.height}, scale=${scale}, base64_len=${pngBuffer.length}`)

  return Buffer.from(pngBuffer).toString('base64')
}
