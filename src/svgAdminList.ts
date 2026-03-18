import { Resvg } from '@resvg/resvg-js'
import { Context } from 'koishi'
import { join } from 'path'
import { existsSync } from 'fs'
import { UnifiedAdminInfo, UnifiedContextInfo } from './type'

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

function getRole(role: string): string {
  if (role === 'owner') return '群主'
  if (role === 'admin') return '管理员'
  return '成员'
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

export interface SvgAdminListOptions {
  admins: UnifiedAdminInfo[]
  contextInfo: UnifiedContextInfo
  groupAvatarBase64?: string
  enableDarkMode?: boolean
  fontPath?: string
}

export async function svgAdminList(
  ctx: Context,
  options: SvgAdminListOptions,
): Promise<string> {
  const { admins, contextInfo, groupAvatarBase64, enableDarkMode = false, fontPath } = options

  const W = 900
  const PADDING = 30
  const CARD_RX = 22
  const fontFamily = 'LXGWWenKaiMono'

  const sortedAdmins = [...admins].sort((a, b) => {
    if (a.role === 'owner') return -1
    if (b.role === 'owner') return 1
    const nameA = a.card || a.nickname
    const nameB = b.card || b.nickname
    return nameA.localeCompare(nameB, 'zh-Hans-CN', { sensitivity: 'base' })
  })

  const bgColor = enableDarkMode ? '#0d1117' : '#e0eafc'
  const cardBg = enableDarkMode ? '#161b22' : 'white'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#888888'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const roleOwnerColor = '#f39c12'
  const roleAdminColor = '#64b5f6'
  const shadowColor = enableDarkMode ? '#00000066' : '#00000022'
  const gradientEnd = enableDarkMode ? '#161b22' : '#cfdef3'
  const watermarkColor = enableDarkMode ? '#484f58' : '#bbbbbb'

  const groupName = truncate(contextInfo.groupName || '未知群名', 16)
  const groupId = String(contextInfo.groupId || '')

  let adminItems = ''
  const itemHeight = 80
  const startY = 180

  for (let i = 0; i < sortedAdmins.length; i++) {
    const admin = sortedAdmins[i]
    const y = startY + i * itemHeight
    const role = getRole(admin.role || 'admin')
    const roleColor = admin.role === 'owner' ? roleOwnerColor : roleAdminColor
    const card = truncate(admin.card || admin.nickname || '未知', 12)

    adminItems += `<g transform="translate(0,${y})">` +
      `<circle cx="60" cy="30" r="25" fill="#d0d0d0"/>` +
      `<text x="100" y="25" font-size="16" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(card)}</text>` +
      `<text x="100" y="45" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">QQ: ${escapeXml(String(admin.user_id))}</text>` +
      `<rect x="720" y="10" width="80" height="30" rx="6" fill="${roleColor}" fill-opacity="0.15"/>` +
      `<text x="760" y="30" font-size="14" fill="${roleColor}" font-family="${fontFamily}" font-weight="600" text-anchor="middle">${escapeXml(role)}</text>` +
      `</g>`
    if (i < sortedAdmins.length - 1) {
      adminItems += `<line x1="${PADDING}" y1="${y + itemHeight - 1}" x2="${W - PADDING}" y2="${y + itemHeight - 1}" stroke="${dividerColor}" stroke-width="1"/>`
    }
  }

  const timestamp = new Date().toLocaleString('zh-CN')
  const H = Math.max(300, startY + sortedAdmins.length * itemHeight + 60)

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
    `<text x="${PADDING + 20}" y="55" font-size="22" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)}</text>` +
    `<text x="${PADDING + 20}" y="80" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)} | 管理员 ${sortedAdmins.length} 人</text>` +
    `<line x1="${PADDING + 15}" y1="100" x2="${W - PADDING - 15}" y2="100" stroke="${dividerColor}" stroke-width="1"/>` +
    adminItems +
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
