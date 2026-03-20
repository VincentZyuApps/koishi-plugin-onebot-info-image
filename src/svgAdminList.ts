import { Resvg } from '@resvg/resvg-js'
import { Context } from 'koishi'
import { UnifiedAdminInfo, UnifiedContextInfo } from './type'
import { escapeXml, truncate, fetchTwemojiSvg } from './utils'

// Emoji 正则表达式
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu

// Emoji 缓存
const emojiCache = new Map<string, string>()

// 收集文本中的所有 emoji
function collectEmojis(text: string): string[] {
  const emojis: string[] = []
  let match
  const regex = new RegExp(EMOJI_REGEX.source, EMOJI_REGEX.flags)
  while ((match = regex.exec(text)) !== null) {
    if (!emojis.includes(match[0])) {
      emojis.push(match[0])
    }
  }
  return emojis
}

// 批量获取 emoji 图片并缓存
function prefetchEmojis(texts: string[], enableEmojiCache: boolean): void {
  if (!enableEmojiCache) return
  
  const allEmojis = new Set<string>()
  for (const text of texts) {
    const emojis = collectEmojis(text)
    emojis.forEach(e => allEmojis.add(e))
  }
  
  // 同步获取所有 emoji
  for (const emoji of allEmojis) {
    fetchTwemojiSvg(emoji, true)
  }
}

// 将文本转换为 SVG，emoji 替换为图片
function textToSvgParts(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  fontFamily: string,
  fontWeight?: string,
  enableEmoji?: boolean,
  enableEmojiCache?: boolean,
): string {
  if (!text) return ''
  
  // 如果未启用 emoji 转换，直接返回文本
  if (!enableEmoji) {
    return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}"${fontWeight ? ` font-weight="${fontWeight}"` : ''}>${escapeXml(text)}</text>`
  }
  
  const emojis = collectEmojis(text)
  if (emojis.length === 0) {
    return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}"${fontWeight ? ` font-weight="${fontWeight}"` : ''}>${escapeXml(text)}</text>`
  }
  
  // 分段处理
  const parts: Array<{ type: 'text' | 'emoji'; content: string }> = []
  let lastIndex = 0
  const regex = new RegExp(EMOJI_REGEX.source, EMOJI_REGEX.flags)
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    parts.push({ type: 'emoji', content: match[0] })
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }
  
  const svgParts: string[] = []
  let currentX = x
  const emojiSize = fontSize * 1.1
  
  for (const part of parts) {
    if (part.type === 'text') {
      const textWidth = estimateTextWidth(part.content, fontSize)
      svgParts.push(`<text x="${currentX}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}"${fontWeight ? ` font-weight="${fontWeight}"` : ''}>${escapeXml(part.content)}</text>`)
      currentX += textWidth
    } else {
      const emojiBase64 = fetchTwemojiSvg(part.content, enableEmojiCache)
      if (emojiBase64) {
        svgParts.push(`<image x="${currentX}" y="${y - fontSize * 0.85}" width="${emojiSize}" height="${emojiSize}" href="${emojiBase64}" />`)
        currentX += emojiSize + 2
      } else {
        svgParts.push(`<text x="${currentX}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}">${escapeXml(part.content)}</text>`)
        currentX += estimateTextWidth(part.content, fontSize)
      }
    }
  }
  
  return svgParts.join('\n')
}

// 估算文本宽度
function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0
  for (const char of text) {
    const cp = char.codePointAt(0) || 0
    if ((cp >= 0x4e00 && cp <= 0x9fff) || 
        (cp >= 0x3000 && cp <= 0x303f) ||
        (cp >= 0xff00 && cp <= 0xffef)) {
      width += fontSize
    } else {
      width += fontSize * 0.5
    }
  }
  return width
}

function getRole(role: string): string {
  if (role === 'owner') return '群主'
  if (role === 'admin') return '管理员'
  return '成员'
}

export interface SvgAdminListOptions {
  admins: UnifiedAdminInfo[]
  contextInfo: UnifiedContextInfo
  groupAvatarBase64?: string
  avatarsBase64?: Record<string, string>
  enableDarkMode?: boolean
  scale?: number
  enableEmoji?: boolean
  enableEmojiCache?: boolean
}

export async function svgAdminList(
  ctx: Context,
  options: SvgAdminListOptions,
): Promise<string> {
  const { admins, contextInfo, groupAvatarBase64, avatarsBase64 = {}, enableDarkMode = false, scale = 3.3, enableEmoji = false, enableEmojiCache = false } = options

  const W = 900
  const PADDING = 40
  const CARD_RX = 20
  // 使用系统默认字体
  const fontFamily = 'sans-serif'

  const sortedAdmins = [...admins].sort((a, b) => {
    if (a.role === 'owner') return -1
    if (b.role === 'owner') return 1
    const nameA = a.card || a.nickname
    const nameB = b.card || b.nickname
    return nameA.localeCompare(nameB, 'zh-Hans-CN', { sensitivity: 'base' })
  })

  // 收集所有需要处理的文本，预获取 emoji 图片
  const allTexts: string[] = []
  for (const admin of sortedAdmins) {
    allTexts.push(admin.nickname || '')
    allTexts.push(admin.card || '')
  }
  prefetchEmojis(allTexts, enableEmojiCache)

  const bgColor = enableDarkMode ? '#0d1117' : '#f5f7fa'
  const cardBg = enableDarkMode ? '#161b22' : '#ffffff'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#666666'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const roleOwnerColor = '#ff9500'
  const roleOwnerBg = enableDarkMode ? '#3d2817' : '#fff3e0'
  const roleAdminColor = '#2196f3'
  const roleAdminBg = enableDarkMode ? '#1e3a5f' : '#e3f2fd'
  const shadowColor = enableDarkMode ? '#00000044' : '#00000018'
  const watermarkColor = enableDarkMode ? '#484f58' : '#999999'
  const avatarBgColor = enableDarkMode ? '#30363d' : '#e8e8e8'
  const indexTextColor = enableDarkMode ? '#58a6ff' : '#4a90d9'
  const cardBgColor = enableDarkMode ? '#21262d' : '#fafbfc'

  const groupName = truncate(contextInfo.groupName || '未知群名', 20)
  const groupId = String(contextInfo.groupId || '')
  const memberText = contextInfo.memberCount
    ? `成员数: ${contextInfo.memberCount}${contextInfo.maxMemberCount ? '/' + contextInfo.maxMemberCount : ''}`
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

  const itemHeight = 90
  const startY = 200
  let adminItems = ''
  let clipPaths = ''

  for (let i = 0; i < sortedAdmins.length; i++) {
    const admin = sortedAdmins[i]
    const y = startY + i * itemHeight
    const index = i + 1
    const indexStr = index.toString().padStart(2, '0')
    const role = getRole(admin.role || 'admin')
    const isOwner = admin.role === 'owner'
    const roleColor = isOwner ? roleOwnerColor : roleAdminColor
    const roleBgColor = isOwner ? roleOwnerBg : roleAdminBg
    const nickname = admin.nickname || '未知'
    const userId = String(admin.user_id)
    const avatarBase64 = avatarsBase64[userId]
    const groupCard = admin.card || '无群昵称'

    // 背景卡片
    adminItems += `<rect x="${PADDING + 15}" y="${y}" width="${W - PADDING * 2 - 30}" height="${itemHeight - 10}" rx="12" fill="${cardBgColor}" stroke="${dividerColor}" stroke-width="1"/>`

    // 序号
    const indexX = PADDING + 45
    adminItems += `<text x="${indexX}" y="${y + 55}" font-size="24" fill="${indexTextColor}" font-family="${fontFamily}" font-weight="bold">${indexStr}</text>`

    // 头像
    const avatarSize = 52
    const avatarX = PADDING + 85
    const avatarY = y + 14
    const clipId = `avatar-clip-${i}`

    clipPaths += `<clipPath id="${clipId}"><circle cx="${avatarX + avatarSize/2}" cy="${avatarY + avatarSize/2}" r="${avatarSize/2}"/></clipPath>`

    let avatarSvg = ''
    if (avatarBase64) {
      avatarSvg = `<image x="${avatarX}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" href="data:image/jpeg;base64,${avatarBase64}" clip-path="url(#${clipId})"/>`
    } else {
      avatarSvg = `<rect x="${avatarX}" y="${avatarY}" width="${avatarSize}" height="${avatarSize}" rx="26" fill="${avatarBgColor}"/>`
    }
    adminItems += avatarSvg

    // 角色标签（圆角标签样式）- 先声明变量
    const tagWidth = isOwner ? 56 : 70
    const tagX = W - PADDING - 30 - tagWidth
    const tagY = y + 25

    // 昵称和QQ - 左边显示用户名
    const infoX = avatarX + avatarSize + 18
    const infoY = y + 32
    const nameMaxWidth = 140
    const nameMaxChars = Math.floor(nameMaxWidth / 9)
    const displayName = truncate(nickname, nameMaxChars)
    adminItems += textToSvgParts(displayName, infoX, infoY, 16, textColor, fontFamily, '600', enableEmoji, enableEmojiCache)
    adminItems += `<text x="${infoX}" y="${infoY + 24}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">QQ: ${escapeXml(userId)}</text>`

    // 群昵称（右边显示，限制宽度，避免与角色标签重叠）
    const cardX = infoX + 160
    const maxCardWidth = tagX - cardX - 15
    const maxCardChars = Math.floor(maxCardWidth / 7)
    const displayCard = truncate(groupCard, maxCardChars)
    adminItems += textToSvgParts(displayCard, cardX, infoY + 12, 14, subTextColor, fontFamily, undefined, enableEmoji, enableEmojiCache)

    // 角色标签绘制
    adminItems += `<rect x="${tagX}" y="${tagY}" width="${tagWidth}" height="28" rx="14" fill="${roleBgColor}" stroke="${roleColor}" stroke-width="1"/>`
    adminItems += `<text x="${tagX + tagWidth/2}" y="${tagY + 19}" font-size="13" fill="${roleColor}" font-family="${fontFamily}" font-weight="600" text-anchor="middle">${escapeXml(role)}</text>`
  }

  const timestamp = new Date().toLocaleString('zh-CN')
  const totalHeight = startY + sortedAdmins.length * itemHeight + 60
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

    // 标题区域
    `<text x="${PADDING + 20 + groupAvatarSize + 15}" y="${PADDING + 45}" font-size="22" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)}</text>` +
    `<text x="${PADDING + 20 + groupAvatarSize + 15}" y="${PADDING + 70}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)}${memberText ? ' · ' + memberText : ''}</text>` +

    // 分隔线
    `<line x1="${PADDING + 15}" y1="${PADDING + 95}" x2="${W - PADDING - 15}" y2="${PADDING + 95}" stroke="${dividerColor}" stroke-width="1"/>` +

    // 列表标题
    `<text x="${W / 2}" y="${PADDING + 130}" font-size="20" fill="${textColor}" font-family="${fontFamily}" font-weight="bold" text-anchor="middle">群管理员列表 (${sortedAdmins.length}人)</text>` +

    // 管理员列表
    adminItems +

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

  return Buffer.from(pngBuffer).toString('base64')
}
