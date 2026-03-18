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
  enableDarkMode?: boolean
  fontPath?: string
}

export async function svgGroupNoticeDetail(
  ctx: Context,
  options: SvgGroupNoticeDetailOptions,
): Promise<string> {
  const { record, contextInfo, groupAvatarBase64, enableDarkMode = false, fontPath } = options

  const W = 900
  const H = 600
  const PADDING = 30
  const CARD_RX = 22
  const fontFamily = 'LXGWWenKaiMono'

  const bgColor = enableDarkMode ? '#0d1117' : '#e0eafc'
  const cardBg = enableDarkMode ? '#161b22' : 'white'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#888888'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const accentColor = '#64b5f6'
  const highlightBg = enableDarkMode ? '#1f2937' : '#f5f7fa'
  const shadowColor = enableDarkMode ? '#00000066' : '#00000022'
  const gradientEnd = enableDarkMode ? '#161b22' : '#cfdef3'
  const watermarkColor = enableDarkMode ? '#484f58' : '#bbbbbb'

  const groupName = truncate(contextInfo.groupName || '未知群名', 16)
  const groupId = String(contextInfo.groupId || '')
  const content = record.message.text || '[空公告]'
  const time = formatTs(record.publish_time)
  const images = record.message.images || []

  let imagesSection = ''
  if (images.length > 0) {
    let imageTags = ''
    for (let i = 0; i < Math.min(images.length, 3); i++) {
      const imgX = PADDING + 15 + i * 140
      imageTags += `<g transform="translate(${imgX},400)">` +
        `<rect width="120" height="90" rx="8" fill="${highlightBg}"/>` +
        `<text x="60" y="50" font-size="30" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle">?</text>` +
        `<text x="60" y="80" font-size="11" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle">图片 ${i + 1}</text>` +
        `</g>`
    }
    if (images.length > 3) {
      const imgX = PADDING + 15 + 3 * 140
      imageTags += `<g transform="translate(${imgX},400)">` +
        `<rect width="120" height="90" rx="8" fill="${highlightBg}"/>` +
        `<text x="60" y="50" font-size="24" fill="${subTextColor}" font-family="${fontFamily}" text-anchor="middle">+${images.length - 3}</text>` +
        `</g>`
    }
    imagesSection = `<text x="${PADDING + 15}" y="380" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">附件图片 (${images.length}张)</text>` + imageTags
  }

  const timestamp = new Date().toLocaleString('zh-CN')

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
    `<text x="${PADDING + 20}" y="55" font-size="24" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)} 公告详情</text>` +
    `<text x="${PADDING + 20}" y="85" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)}</text>` +
    `<line x1="${PADDING + 15}" y1="105" x2="${W - PADDING - 15}" y2="105" stroke="${dividerColor}" stroke-width="1"/>` +
    `<text x="${PADDING + 20}" y="140" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">公告内容</text>` +
    `<rect x="${PADDING + 15}" y="155" width="${W - PADDING * 2 - 30}" height="180" rx="12" fill="${highlightBg}"/>` +
    `<text x="${PADDING + 30}" y="195" font-size="16" fill="${textColor}" font-family="${fontFamily}">${escapeXml(content)}</text>` +
    `<text x="${PADDING + 20}" y="365" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">发布信息</text>` +
    `<text x="${PADDING + 20}" y="395" font-size="15" fill="${textColor}" font-family="${fontFamily}">发布者: ${record.sender_id}</text>` +
    `<text x="${PADDING + 20}" y="420" font-size="15" fill="${textColor}" font-family="${fontFamily}">发布时间: ${escapeXml(time)}</text>` +
    imagesSection +
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
