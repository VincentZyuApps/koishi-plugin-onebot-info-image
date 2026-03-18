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

function parseEssenceContent(content: Array<{ type: string; data: Record<string, any> }>): string {
  let text = ''
  for (const item of content) {
    if (item.type === 'text') {
      text += item.data.text || ''
    } else if (item.type === 'at') {
      text += `@${item.data.name || item.data.qq || ''} `
    } else if (item.type === 'image') {
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
  return text || '[无法解析的消息]'
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
  enableDarkMode?: boolean
  fontPath?: string
}

export async function svgGroupEssenceDetail(
  ctx: Context,
  options: SvgGroupEssenceDetailOptions,
): Promise<string> {
  const { record, contextInfo, groupAvatarBase64, enableDarkMode = false, fontPath } = options

  const W = 900
  const H = 550
  const PADDING = 30
  const CARD_RX = 22
  const fontFamily = 'LXGWWenKaiMono'

  const bgColor = enableDarkMode ? '#0d1117' : '#e0eafc'
  const cardBg = enableDarkMode ? '#161b22' : 'white'
  const textColor = enableDarkMode ? '#e6edf3' : '#1a1a1a'
  const subTextColor = enableDarkMode ? '#8b949e' : '#888888'
  const dividerColor = enableDarkMode ? '#30363d' : '#e0e0e0'
  const accentColor = '#9b59b6'
  const highlightBg = enableDarkMode ? '#1f2937' : '#f0e6ff'
  const shadowColor = enableDarkMode ? '#00000066' : '#00000022'
  const gradientEnd = enableDarkMode ? '#161b22' : '#cfdef3'
  const watermarkColor = enableDarkMode ? '#484f58' : '#bbbbbb'

  const groupName = truncate(contextInfo.groupName || '未知群名', 16)
  const groupId = String(contextInfo.groupId || '')
  const content = parseEssenceContent(record.content)
  const sender = truncate(record.sender_nick || String(record.sender_id), 12)
  const operator = truncate(record.operator_nick || String(record.operator_id), 12)
  const addTime = formatTs(record.operator_time)

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
    `<text x="${PADDING + 20}" y="55" font-size="24" fill="${textColor}" font-family="${fontFamily}" font-weight="bold">${escapeXml(groupName)} 精华详情</text>` +
    `<text x="${PADDING + 20}" y="85" font-size="13" fill="${subTextColor}" font-family="${fontFamily}">群号: ${escapeXml(groupId)} | 消息ID: ${record.message_id}</text>` +
    `<line x1="${PADDING + 15}" y1="105" x2="${W - PADDING - 15}" y2="105" stroke="${dividerColor}" stroke-width="1"/>` +
    `<text x="${PADDING + 20}" y="140" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">消息内容</text>` +
    `<rect x="${PADDING + 15}" y="155" width="${W - PADDING * 2 - 30}" height="150" rx="12" fill="${highlightBg}"/>` +
    `<text x="${PADDING + 30}" y="195" font-size="16" fill="${textColor}" font-family="${fontFamily}">${escapeXml(content)}</text>` +
    `<text x="${PADDING + 20}" y="340" font-size="14" fill="${subTextColor}" font-family="${fontFamily}">详细信息</text>` +
    `<text x="${PADDING + 20}" y="375" font-size="15" fill="${textColor}" font-family="${fontFamily}">发送者: ${escapeXml(sender)} (${record.sender_id})</text>` +
    `<text x="${PADDING + 20}" y="405" font-size="15" fill="${textColor}" font-family="${fontFamily}">收录者: ${escapeXml(operator)} (${record.operator_id})</text>` +
    `<text x="${PADDING + 20}" y="435" font-size="15" fill="${textColor}" font-family="${fontFamily}">收录时间: ${escapeXml(addTime)}</text>` +
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
