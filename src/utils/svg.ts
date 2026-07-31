import twemoji from 'twemoji'

const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu
const emojiCache = new Map<string, string>()

export function fetchTwemojiSvg(emoji: string, enableCache: boolean = true): string | null {
  if (enableCache && emojiCache.has(emoji)) {
    return emojiCache.get(emoji) || null
  }

  try {
    const svgPath = twemoji.parse(emoji, {
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
    })
    const match = svgPath.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)
    if (!match) return null

    const base64 = Buffer.from(match[0]).toString('base64')
    const result = `data:image/svg+xml;base64,${base64}`
    if (enableCache) emojiCache.set(emoji, result)
    return result
  } catch {
    return null
  }
}

export function textToSvgWithEmoji(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  fill: string,
  fontFamily: string,
  fontWeight?: string,
): string {
  if (!text) return ''

  const emojis = text.match(EMOJI_REGEX)
  if (!emojis || emojis.length === 0) {
    return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}"${fontWeight ? ` font-weight="${fontWeight}"` : ''}>${escapeXml(text)}</text>`
  }

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
      continue
    }

    const emojiBase64 = fetchTwemojiSvg(part.content)
    if (emojiBase64) {
      svgParts.push(`<image x="${currentX}" y="${y - fontSize * 0.85}" width="${emojiSize}" height="${emojiSize}" href="${emojiBase64}" />`)
      currentX += emojiSize + 2
    } else {
      svgParts.push(`<text x="${currentX}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}">${escapeXml(part.content)}</text>`)
      currentX += estimateTextWidth(part.content, fontSize)
    }
  }

  return svgParts.join('\n')
}

function estimateTextWidth(text: string, fontSize: number): number {
  let width = 0
  for (const char of text) {
    const cp = char.codePointAt(0) || 0
    if ((cp >= 0x4e00 && cp <= 0x9fff)
      || (cp >= 0x3000 && cp <= 0x303f)
      || (cp >= 0xff00 && cp <= 0xffef)) {
      width += fontSize
    } else {
      width += fontSize * 0.5
    }
  }
  return width
}

export function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export function truncate(text: string, maxLen: number): string {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

export function containsEmoji(text: string): boolean {
  if (!text) return false
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}]|[\u{2B06}]|[\u{2B07}]|[\u{2B05}]|[\u{27A1}]|[\u{2194}-\u{2199}]|[\u{21AA}]|[\u{21A9}]|[\u{2934}]|[\u{2935}]|[\u{25AA}]|[\u{25AB}]|[\u{25FE}]|[\u{25FD}]|[\u{25FB}]|[\u{25FC}]|[\u{25B6}]|[\u{25C0}]|[\u{1F200}-\u{1F251}]|[\u{1F004}]|[\u{1F0CF}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{23F0}]|[\u{23F3}]|[\u{24C2}]|[\u{200D}]|[\u{FE0F}]|[\u{20E3}]/u
  return emojiRegex.test(text)
}

export function decodeHtmlEntities(text: string): string {
  if (!text) return ''
  return text
    .replace(/&#10;/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
