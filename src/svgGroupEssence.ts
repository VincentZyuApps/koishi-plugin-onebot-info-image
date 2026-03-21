import { Resvg } from '@resvg/resvg-js'
import { Context } from 'koishi'
import { escapeXml, truncate, formatTs, decodeHtmlEntities } from './utils'

function parseEssenceContent(content: Array<{ type: string; data: Record<string, any> }>): { text: string; hasImage: boolean; imageUrl?: string } {
  let text = ''
  let hasImage = false
  let imageUrl: string | undefined

  for (const item of content) {
    if (item.type === 'text') {
      text += decodeHtmlEntities(item.data.text) || ''
    } else if (item.type === 'at') {
      text += `@${decodeHtmlEntities(item.data.name) || item.data.qq || ''} `
    } else if (item.type === 'image') {
      if (!hasImage && item.data.url) {
        hasImage = true
        let url = item.data.url
        // 清理 URL 中的反引号和逗号
        url = url.replace(/[`]/g, '').replace(/[,]$/, '').trim()
        imageUrl = url
      }
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

  return { text: text || '[无法解析的消息]', hasImage, imageUrl }
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
  imagesBase64?: Record<string, string>
  enableDarkMode?: boolean
  scale?: number
  enableEmoji?: boolean
  enableEmojiCache?: boolean
  svgThemeColor?: string
}

export async function svgGroupEssence(
  ctx: Context,
  options: SvgGroupEssenceOptions,
): Promise<string> {
  const { result, contextInfo, groupAvatarBase64, avatarsBase64 = {}, imagesBase64 = {}, enableDarkMode = false, scale = 3.3, svgThemeColor = '#7e57c2' } = options

  const W = 900
  const PADDING = 40
  const CARD_RX = 20
  // 使用系统默认字体
  const fontFamily = 'sans-serif'

  const bgColor = enableDarkMode ? '#0d1117' : '#f0f4f8'
  const cardBg = enableDarkMode ? '#161b22' : '#ffffff'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#666666'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const accentColor = svgThemeColor  // 使用配置的主题颜色
  const shadowColor = enableDarkMode ? '#00000044' : '#00000018'
  const watermarkColor = enableDarkMode ? '#484f58' : '#999999'
  const avatarBgColor = enableDarkMode ? '#30363d' : '#e8e8e8'
  const itemBgColor = enableDarkMode ? '#1f2937' : '#f3e5f5'  // 使用主题色的高亮背景
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

  const itemHeight = 120
  const startY = 200
  let essenceItems = ''
  let clipPaths = ''

  for (let i = 0; i < result.records.length; i++) {
    const record = result.records[i]
    const y = startY + i * itemHeight
    const index = (result.currentPage - 1) * result.pageSize + i + 1
    const indexStr = index.toString().padStart(2, '0')
    const parsedContent = parseEssenceContent(record.content)
    const displayContent = truncate(parsedContent.text, 40)
    const sender = truncate(record.sender_nick || String(record.sender_id), 12)
    const time = formatTs(record.operator_time)
    const senderId = String(record.sender_id)
    const avatarBase64 = avatarsBase64[senderId]

    // 背景卡片
    essenceItems += `<rect x="${PADDING + 15}" y="${y}" width="${W - PADDING * 2 - 30}" height="${itemHeight - 10}" rx="12" fill="${itemBgColor}" stroke="${dividerColor}" stroke-width="1"/>`

    // 序号（左侧）
    const indexX = PADDING + 45
    essenceItems += `<text x="${indexX}" y="${y + 55}" font-size="24" fill="${indexTextColor}" font-family="${fontFamily}" font-weight="bold">${indexStr}</text>`

    // 发送者头像（序号右侧）
    const avatarSize = 52
    const avatarX = PADDING + 85
    const avatarY = y + 24
    const clipId = `avatar-clip-${i}`

    clipPaths += `<clipPath id="${clipId}"><circle cx="${avatarX + avatarSize/2}" cy="${avatarY + avatarSize/2}" r="${avatarSize/2}"/></clipPath>`

    let avatarSvg = ''
    if (avatarBase64) {
      avatarSvg = `<image x="${avatarX}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" href="data:image/jpeg;base64,${avatarBase64}" clip-path="url(#${clipId})"/>`
    } else {
      avatarSvg = `<rect x="${avatarX}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" rx="26" fill="${avatarBgColor}"/>`
    }
    essenceItems += avatarSvg

    // 消息内容（头像右侧）
    const contentX = avatarX + avatarSize + 18
    const contentY = y + 35
    essenceItems += `<text x="${contentX}" y="${contentY}" font-size="15" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(displayContent)}</text>`
    essenceItems += `<text x="${contentX}" y="${contentY + 28}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">${escapeXml(sender)} · ${escapeXml(time)}</text>`

    // 如果有图片，显示图片预览
    if (parsedContent.hasImage && parsedContent.imageUrl) {
      if (imagesBase64[parsedContent.imageUrl]) {
        const imgSize = 60
        const imgX = W - PADDING - 30 - imgSize - 15
        const imgY = y + 25
        essenceItems += `<rect x="${imgX}" y="${imgY}" width="${imgSize}" height="${imgSize}" rx="8" fill="${avatarBgColor}"/>`
        // 根据 URL 扩展名判断图片类型
        const url = parsedContent.imageUrl
        const isPng = url.toLowerCase().endsWith('.png')
        const isJpg = url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')
        const isGif = url.toLowerCase().endsWith('.gif')
        let mimeType = 'image/jpeg'
        if (isPng) mimeType = 'image/png'
        if (isGif) mimeType = 'image/gif'
        essenceItems += `<image x="${imgX + 2}" y="${imgY + 2}" width="${imgSize - 4}" height="${imgSize - 4}" href="data:${mimeType};base64,${imagesBase64[parsedContent.imageUrl]}" preserveAspectRatio="xMidYMid slice"/>`
        ctx.logger.info(`[svgGroupEssence] 渲染图片成功: index=${index}, URL=${parsedContent.imageUrl.substring(0, 50)}..., type=${mimeType}`)
      } else {
        ctx.logger.warn(`[svgGroupEssence] 图片未找到: index=${index}, URL=${parsedContent.imageUrl.substring(0, 50)}...`)
        // 显示占位符
        const imgSize = 60
        const imgX = W - PADDING - 30 - imgSize - 15
        const imgY = y + 25
        essenceItems += `<rect x="${imgX}" y="${imgY}" width="${imgSize}" height="${imgSize}" rx="8" fill="${avatarBgColor}"/>`
        essenceItems += `<text x="${imgX + imgSize/2}" y="${imgY + imgSize/2}" font-size="10" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle" dominant-baseline="middle">[图片]</text>`
      }
    }
  }

  const timestamp = new Date().toLocaleString('zh-CN')
  const totalHeight = startY + result.records.length * itemHeight + 60
  const H = Math.max(400, totalHeight)

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

    // 群名称和群号
    `<text x="${PADDING + 20 + groupAvatarSize + 15}" y="${PADDING + 45}" font-size="22" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)}</text>` +
    `<text x="${PADDING + 20 + groupAvatarSize + 15}" y="${PADDING + 70}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)}${memberText ? ' | 成员: ' + memberText : ''}</text>` +

    // 页面信息（右上角）
    `<text x="${W - PADDING - 25}" y="${PADDING + 55}" font-size="14" fill="${accentColor}" font-family="${fontFamily}" text-anchor="end">第 ${result.currentPage}/${result.totalPages} 页</text>` +

    // 分隔线
    `<line x1="${PADDING + 15}" y1="${PADDING + 95}" x2="${W - PADDING - 15}" y2="${PADDING + 95}" stroke="${dividerColor}" stroke-width="1"/>` +

    // 列表标题
    `<text x="${W / 2}" y="${PADDING + 130}" font-size="20" fill="${textColor}" font-family="${fontFamily}" font-weight="bold" text-anchor="middle">群精华消息列表</text>` +
    `<text x="${W / 2}" y="${PADDING + 155}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle">第${result.currentPage}/${result.totalPages}页 (共${result.totalCount}条精华)</text>` +

    // 精华消息列表
    essenceItems +

    // 底部水印
    `<text x="${PADDING + 15}" y="${H - PADDING - 10}" font-size="11" fill="${watermarkColor}" font-family="monospace">generated by koishi-plugin-onebot-info-image, resvg mode</text>` +
    `<text x="${W - PADDING - 15}" y="${H - PADDING - 10}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="end">${escapeXml(timestamp)}</text>` +
    `<text x="${W / 2}" y="${H - PADDING + 10}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="middle">2026年3月21日18:21:17</text>` +
    `<text x="${W / 2}" y="${H - PADDING + 23}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="middle">https://github.com/yourusername/koishi-plugin-onebot-info-image</text>` +
    `</svg>`

  // 使用系统默认字体
  const resvgOpts: any = {
    fitTo: { mode: 'zoom', value: scale },
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
