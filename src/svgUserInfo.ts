import { Resvg } from '@resvg/resvg-js'
import { Context } from 'koishi'
import { join } from 'path'
import { existsSync } from 'fs'
import { UnifiedUserInfo, UnifiedContextInfo } from './type'

function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function truncate(text: string, maxLen: number): string {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

function formatTs(ts: number): string {
  if (!ts) return '未知'
  return new Date(ts).toLocaleString('zh-CN')
}

function getSex(sex: string): string {
  return sex === 'male' ? '男' : sex === 'female' ? '女' : '未知'
}

function getRole(role: string): string {
  if (role === 'owner') return '群主'
  if (role === 'admin') return '管理员'
  if (role === 'member') return '成员'
  return '-'
}

export interface SvgUserInfoOptions {
  userInfo: UnifiedUserInfo
  contextInfo: UnifiedContextInfo
  avatarBase64: string
  groupAvatarBase64?: string
  enableDarkMode?: boolean
  hidePhoneNumber?: boolean
  fontPath?: string
}

async function getFontPath(customFontPath?: string): Promise<string | null> {
  if (customFontPath && existsSync(customFontPath)) {
    return customFontPath
  }
  const possibleFontPaths = [
    join(__dirname, '..', 'assets', 'LXGWWenKaiMono-Regular.ttf'),
    join(__dirname, '..', '..', 'assets', 'LXGWWenKaiMono-Regular.ttf'),
    '/usr/share/fonts/truetype/lxgw/LXGWWenKaiMono-Regular.ttf',
  ]
  for (const fp of possibleFontPaths) {
    if (existsSync(fp)) return fp
  }
  return null
}

export async function svgUserInfo(
  ctx: Context,
  userInfo: UnifiedUserInfo,
  contextInfo: UnifiedContextInfo,
  options: SvgUserInfoOptions,
): Promise<string> {
  const { avatarBase64, groupAvatarBase64, enableDarkMode = false, hidePhoneNumber = true, fontPath } = options

  const W = 900
  const H = 720
  const PADDING = 30
  const CARD_RX = 22
  const fontFamily = 'LXGWWenKaiMono'

  const bgColor = enableDarkMode ? '#0d1117' : '#e0eafc'
  const cardBg = enableDarkMode ? '#161b22' : 'white'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#888888'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const accentColor = '#64b5f6'
  const shadowColor = enableDarkMode ? '#00000066' : '#00000022'
  const watermarkColor = enableDarkMode ? '#484f58' : '#bbbbbb'

  const avatarCx = PADDING + 110
  const avatarCy = PADDING + 120
  const avatarR = 80

  let avatarSvg = ''
  if (avatarBase64) {
    avatarSvg = `<image x="${avatarCx - avatarR}" y="${avatarCy - avatarR}" width="${avatarR * 2}" height="${avatarR * 2}" href="data:image/jpeg;base64,${avatarBase64}" clip-path="url(#avatar-clip)"/>`
  } else {
    avatarSvg = `<circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}" fill="#d0d0d0"/>`
  }

  const nickname = truncate(userInfo.nickname || '未知昵称', 12)
  const userId = String(userInfo.user_id || '')
  const nicknameY = avatarCy + avatarR + 35
  const uidY = nicknameY + 28

  let groupSection = ''
  if (contextInfo.isGroup) {
    const gStartY = uidY + 45
    const groupName = truncate(contextInfo.groupName || '未知群名', 14)
    const memberText = contextInfo.memberCount
      ? `${contextInfo.memberCount}${contextInfo.maxMemberCount ? '/' + contextInfo.maxMemberCount : ''} 人`
      : ''
    const card = truncate(userInfo.card || '未设置', 14)
    const role = getRole(userInfo.role || 'member')

    const gAvatarSize = 50
    const gAvatarX = PADDING + 20
    const gAvatarY = gStartY

    let groupAvatarSvg = ''
    if (groupAvatarBase64) {
      groupAvatarSvg = `<image x="${gAvatarX}" y="${gAvatarY}" width="${gAvatarSize}" height="${gAvatarSize}" href="data:image/jpeg;base64,${groupAvatarBase64}" clip-path="url(#group-avatar-clip)"/>`
    } else {
      groupAvatarSvg = `<rect x="${gAvatarX}" y="${gAvatarY}" width="${gAvatarSize}" height="${gAvatarSize}" rx="8" fill="#c0c0c0"/>`
    }

    groupSection = `<line x1="${PADDING + 15}" y1="${gStartY - 15}" x2="${PADDING + 205}" y2="${gStartY - 15}" stroke="${dividerColor}" stroke-width="1"/>` +
      `<clipPath id="group-avatar-clip"><rect x="${gAvatarX}" y="${gAvatarY}" width="${gAvatarSize}" height="${gAvatarSize}" rx="8"/></clipPath>` +
      groupAvatarSvg +
      `<text x="${gAvatarX + gAvatarSize + 10}" y="${gAvatarY + 20}" font-size="14" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(groupName)}</text>` +
      `<text x="${gAvatarX + gAvatarSize + 10}" y="${gAvatarY + 40}" font-size="12" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(String(contextInfo.groupId || ''))}</text>` +
      (memberText ? `<text x="${gAvatarX + gAvatarSize + 10}" y="${gAvatarY + 56}" font-size="11" fill="${accentColor}" font-family="${fontFamily}">${escapeXml(memberText)}</text>` : '') +
      `<text x="${PADDING + 20}" y="${gAvatarY + gAvatarSize + 25}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">群名片</text>` +
      `<text x="${PADDING + 80}" y="${gAvatarY + gAvatarSize + 25}" font-size="14" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(card)}</text>` +
      `<text x="${PADDING + 20}" y="${gAvatarY + gAvatarSize + 48}" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">群角色</text>` +
      `<text x="${PADDING + 80}" y="${gAvatarY + gAvatarSize + 48}" font-size="14" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(role)}</text>`
  }

  const infoX = PADDING + 240
  const labelX = infoX + 15
  const valueX = infoX + 110
  const infoTitleY = PADDING + 50

  const fields: Array<{ label: string; value: string }> = [
    { label: 'QQ号', value: userId },
    { label: 'QQ昵称', value: truncate(userInfo.nickname || '未知', 20) },
    { label: '性别', value: getSex(userInfo.sex || '') },
    { label: '年龄', value: String(userInfo.age || '未知') },
    { label: 'QQ等级', value: String(userInfo.qq_level || userInfo.level || '未知') },
    { label: 'QID', value: truncate(userInfo.qid || userInfo.q_id || '未知', 20) },
    { label: '注册时间', value: formatTs(userInfo.RegisterTime || userInfo.regTime || 0) },
    { label: '个性签名', value: truncate(userInfo.sign || userInfo.longNick || userInfo.long_nick || '无', 28) },
    { label: '邮箱', value: truncate(userInfo.eMail || '未知', 28) },
  ]

  if (contextInfo.isGroup) {
    fields.push(
      { label: '加群时间', value: formatTs(userInfo.join_time || 0) },
      { label: '最后发言', value: formatTs(userInfo.last_sent_time || 0) },
    )
  }

  const rowH = 44
  const rows = fields.map((f, i) =>
    `<text x="${labelX}" y="${infoTitleY + 55 + i * rowH}" font-size="16" fill="${subTextColor}" font-family="${fontFamily}">${escapeXml(f.label)}</text>` +
    `<text x="${valueX}" y="${infoTitleY + 55 + i * rowH}" font-size="17" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(f.value)}</text>`
  ).join('')

  const timestamp = new Date().toLocaleString('zh-CN')
  const titleText = contextInfo.isGroup ? '群员详细信息' : '用户信息'
  const gradientEnd = enableDarkMode ? '#161b22' : '#cfdef3'
  const avatarStroke = enableDarkMode ? '#30363d' : '#c8d6e5'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs>` +
    `<clipPath id="avatar-clip"><circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR}"/></clipPath>` +
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
    `<circle cx="${avatarCx}" cy="${avatarCy}" r="${avatarR + 3}" fill="none" stroke="${avatarStroke}" stroke-width="3"/>` +
    avatarSvg +
    `<text x="${avatarCx}" y="${nicknameY}" font-size="20" fill="${textColor}" font-family="${fontFamily}" font-weight="bold" text-anchor="middle">${escapeXml(nickname)}</text>` +
    `<text x="${avatarCx}" y="${uidY}" font-size="14" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle">QQ: ${escapeXml(userId)}</text>` +
    groupSection +
    `<line x1="${infoX}" y1="${PADDING + 20}" x2="${infoX}" y2="${H - PADDING - 20}" stroke="${dividerColor}" stroke-width="1.5"/>` +
    `<text x="${labelX + (W - PADDING * 2 - 240) / 2 - 15}" y="${infoTitleY}" font-size="22" fill="${textColor}" font-family="${fontFamily}" font-weight="bold" text-anchor="middle">${titleText}</text>` +
    `<line x1="${labelX}" y1="${infoTitleY + 12}" x2="${W - PADDING - 15}" y2="${infoTitleY + 12}" stroke="${dividerColor}" stroke-width="1"/>` +
    rows +
    `<text x="${W - PADDING - 10}" y="${H - PADDING - 8}" font-size="11" fill="${watermarkColor}" font-family="monospace" text-anchor="end">${escapeXml(timestamp)}</text>` +
    `<text x="${PADDING + 10}" y="${H - PADDING - 8}" font-size="11" fill="${watermarkColor}" font-family="monospace">rendered by resvg</text>` +
    `</svg>`

  const fontFiles: string[] = []
  const resolvedFontPath = await getFontPath(fontPath)
  if (resolvedFontPath) fontFiles.push(resolvedFontPath)

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: W },
    font: {
      fontFiles,
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  })

  const pngData = resvg.render()
  const pngBuffer = pngData.asPng()

  return Buffer.from(pngBuffer).toString('base64')
}
