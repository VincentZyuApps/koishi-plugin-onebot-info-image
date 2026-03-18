import { Resvg } from '@resvg/resvg-js'
import { Context } from 'koishi'
import { join } from 'path'
import { existsSync } from 'fs'

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
  return new Date(ts * 1000).toLocaleString('zh-CN')
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
  enableDarkMode?: boolean
  fontPath?: string
}

export async function svgGroupNotice(
  ctx: Context,
  options: SvgGroupNoticeOptions,
): Promise<string> {
  const { result, contextInfo, groupAvatarBase64, enableDarkMode = false, fontPath } = options

  const W = 900
  const PADDING = 30
  const CARD_RX = 22
  const fontFamily = 'LXGWWenKaiMono'

  const bgColor = enableDarkMode ? '#0d1117' : '#e0eafc'
  const cardBg = enableDarkMode ? '#161b22' : 'white'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#888888'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const accentColor = '#64b5f6'
  const highlightBg = enableDarkMode ? '#1f2937' : '#e8f0fe'
  const shadowColor = enableDarkMode ? '#00000066' : '#00000022'
  const gradientEnd = enableDarkMode ? '#161b22' : '#cfdef3'
  const watermarkColor = enableDarkMode ? '#484f58' : '#bbbbbb'

  const groupName = truncate(contextInfo.groupName || '未知群名', 16)
  const groupId = String(contextInfo.groupId || '')

  let noticeItems = ''
  const itemHeight = 100
  const startY = 160

  for (let i = 0; i < result.records.length; i++) {
    const record = result.records[i]
    const y = startY + i * itemHeight
    const idx = (result.currentPage - 1) * result.pageSize + i + 1
    const content = truncate(record.message.text || '[空公告]', 40)
    const time = formatTs(record.publish_time)
    const imageCount = record.message.images?.length || 0

    noticeItems += `<g transform="translate(0,${y})">` +
      `<rect x="0" y="0" width="40" height="40" rx="8" fill="${highlightBg}"/>` +
      `<text x="20" y="28" font-size="16" fill="${accentColor}" font-family="${fontFamily}" font-weight="bold" text-anchor="middle">${idx}</text>` +
      `<text x="55" y="25" font-size="15" fill="${textColor}" font-family="${fontFamily}" font-weight="600">${escapeXml(content)}</text>` +
      `<text x="55" y="48" font-size="12" fill="${subTextColor}" font-family="${fontFamily}">发布者: ${record.sender_id} | ${escapeXml(time)}</text>` +
      (imageCount > 0 ? `<text x="55" y="70" font-size="11" fill="${accentColor}" font-family="${fontFamily}">${imageCount} 张图片</text>` : '') +
      `</g>`
    if (i < result.records.length - 1) {
      noticeItems += `<line x1="${PADDING}" y1="${y + itemHeight - 5}" x2="${W - PADDING}" y2="${y + itemHeight - 5}" stroke="${dividerColor}" stroke-width="1" stroke-dasharray="4,4"/>`
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
    `<text x="${PADDING + 20}" y="50" font-size="24" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)}</text>` +
    `<text x="${PADDING + 20}" y="80" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)} | 共 ${result.totalCount} 条公告</text>` +
    `<text x="${W - PADDING - 20}" y="65" font-size="13" fill="${accentColor}" font-family="${fontFamily}" text-anchor="end">第 ${result.currentPage}/${result.totalPages} 页</text>` +
    `<line x1="${PADDING + 15}" y1="100" x2="${W - PADDING - 15}" y2="100" stroke="${dividerColor}" stroke-width="1"/>` +
    noticeItems +
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
