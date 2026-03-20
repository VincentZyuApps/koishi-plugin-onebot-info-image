import { Context } from 'koishi';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { FONT_FILES, type ImageStyle } from './type';
import type { Config } from './index';
import twemoji from 'twemoji';

// Emoji 正则表达式 - 匹配所有 emoji 字符
const EMOJI_REGEX = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/gu;

// Emoji 缓存
const emojiCache = new Map<string, string>();

/**
 * 将 emoji 字符转换为 Unicode codepoint（小写，带前导零）
 * 例如：😀 -> "1f600"
 */
function emojiToCodepoint(emoji: string): string {
  const codepoints: string[] = []
  for (const char of emoji) {
    const cp = char.codePointAt(0)
    if (cp !== undefined) {
      codepoints.push(cp.toString(16).toLowerCase())
    }
  }
  return codepoints.join('-')
}

/**
 * 从本地 twemoji 获取 emoji SVG 图片并转换为 base64
 * 使用缓存避免重复处理
 */
export function fetchTwemojiSvg(emoji: string, enableCache: boolean = true): string | null {
  // 检查缓存
  if (enableCache && emojiCache.has(emoji)) {
    return emojiCache.get(emoji) || null
  }
  
  try {
    // 使用 twemoji.parse 获取 SVG 路径
    const svgPath = twemoji.parse(emoji, {
      folder: 'svg',
      ext: '.svg',
      base: 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/',
    })
    
    // 提取 SVG 内容
    const match = svgPath.match(/<svg[^>]*>([\s\S]*?)<\/svg>/)
    if (!match) return null
    
    const svgContent = match[0]
    const base64 = Buffer.from(svgContent).toString('base64')
    const result = `data:image/svg+xml;base64,${base64}`
    
    // 缓存结果
    if (enableCache) {
      emojiCache.set(emoji, result)
    }
    return result
  } catch {
    return null
  }
}

/**
 * 将文本中的 emoji 替换为 SVG image 标签
 * 返回处理后的 SVG 片段
 */
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
  
  // 检查是否包含 emoji
  const emojis = text.match(EMOJI_REGEX)
  if (!emojis || emojis.length === 0) {
    // 没有 emoji，直接返回文本
    return `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}"${fontWeight ? ` font-weight="${fontWeight}"` : ''}>${escapeXml(text)}</text>`
  }
  
  // 有 emoji，需要分段处理
  const parts: Array<{ type: 'text' | 'emoji'; content: string }> = []
  let lastIndex = 0
  
  // 重新匹配所有 emoji 的位置
  const regex = new RegExp(EMOJI_REGEX.source, EMOJI_REGEX.flags)
  let match
  while ((match = regex.exec(text)) !== null) {
    // 添加 emoji 前面的文本
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    // 添加 emoji
    parts.push({ type: 'emoji', content: match[0] })
    lastIndex = match.index + match[0].length
  }
  // 添加最后的文本
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) })
  }
  
  // 构建 SVG 片段
  const svgParts: string[] = []
  let currentX = x
  const emojiSize = fontSize * 1.1 // emoji 稍微大一点
  
  for (const part of parts) {
    if (part.type === 'text') {
      // 文本部分
      const textWidth = estimateTextWidth(part.content, fontSize)
      svgParts.push(`<text x="${currentX}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}"${fontWeight ? ` font-weight="${fontWeight}"` : ''}>${escapeXml(part.content)}</text>`)
      currentX += textWidth
    } else {
      // emoji 部分 - 同步获取
      const emojiBase64 = fetchTwemojiSvg(part.content)
      if (emojiBase64) {
        svgParts.push(`<image x="${currentX}" y="${y - fontSize * 0.85}" width="${emojiSize}" height="${emojiSize}" href="${emojiBase64}" />`)
        currentX += emojiSize + 2 // emoji 宽度加一点间距
      } else {
        // 如果获取失败，保留原始 emoji 文本
        svgParts.push(`<text x="${currentX}" y="${y}" font-size="${fontSize}" fill="${fill}" font-family="${fontFamily}">${escapeXml(part.content)}</text>`)
        currentX += estimateTextWidth(part.content, fontSize)
      }
    }
  }
  
  return svgParts.join('\n')
}

/**
 * 估算文本宽度（粗略估算）
 */
function estimateTextWidth(text: string, fontSize: number): number {
  // 中文和全角字符宽度约为字体大小
  // 英文和数字宽度约为字体大小的一半
  let width = 0
  for (const char of text) {
    const cp = char.codePointAt(0) || 0
    // CJK 字符范围
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

/**
 * 从 TTF/OTF 字体文件的 name table 中提取 font family name (nameID=1)
 * 只做最基本的解析，不依赖第三方库
 */
export function readFontFamilyName(fontBuffer: Buffer): string | null {
  try {
    // TrueType / OpenType 文件头
    const numTables = fontBuffer.readUInt16BE(4)
    let nameTableOffset = 0
    let nameTableLength = 0

    // 查找 'name' table
    for (let i = 0; i < numTables; i++) {
      const offset = 12 + i * 16
      const tag = fontBuffer.toString('ascii', offset, offset + 4)
      if (tag === 'name') {
        nameTableOffset = fontBuffer.readUInt32BE(offset + 8)
        nameTableLength = fontBuffer.readUInt32BE(offset + 12)
        break
      }
    }
    if (!nameTableOffset) return null

    const nameTable = fontBuffer.subarray(nameTableOffset, nameTableOffset + nameTableLength)
    const count = nameTable.readUInt16BE(2)
    const stringOffset = nameTable.readUInt16BE(4)

    // 遍历 name records，找 nameID=1 (Font Family)
    // 优先找 platformID=3 (Windows), encodingID=1 (Unicode BMP), languageID=0x0409 (English US)
    // 其次找 platformID=1 (Macintosh)
    let familyName: string | null = null

    for (let i = 0; i < count; i++) {
      const recordOffset = 6 + i * 12
      const platformID = nameTable.readUInt16BE(recordOffset)
      const encodingID = nameTable.readUInt16BE(recordOffset + 2)
      const nameID = nameTable.readUInt16BE(recordOffset + 6)
      const length = nameTable.readUInt16BE(recordOffset + 8)
      const offset = nameTable.readUInt16BE(recordOffset + 10)

      if (nameID !== 1) continue // 只要 Font Family

      const strBuf = nameTable.subarray(stringOffset + offset, stringOffset + offset + length)

      if (platformID === 3 && encodingID === 1) {
        // Windows Unicode BMP — UTF-16BE
        const chars: string[] = []
        for (let j = 0; j < strBuf.length; j += 2) {
          chars.push(String.fromCharCode(strBuf.readUInt16BE(j)))
        }
        return chars.join('') // 最优先，直接返回
      }

      if (platformID === 1 && !familyName) {
        // Macintosh Roman
        familyName = strBuf.toString('latin1')
      }
    }

    return familyName
  } catch {
    return null
  }
}

export interface SvgFontInfo {
  fontData: Buffer | null
  fontFamily: string
  fontDir: string | null
  fontPath: string | null
}

/**
 * 加载 SVG 渲染用的字体：返回字体二进制数据、font-family 名称、字体所在目录
 * 优先使用 customFontPath，否则从 assets 目录加载默认字体
 */
export function loadSvgFont(customFontPath?: string, customFontFamily?: string): SvgFontInfo {
  const DEFAULT_FAMILY = customFontFamily || 'LXGWWenKaiMono'
  const FALLBACK = { fontData: null, fontFamily: DEFAULT_FAMILY, fontDir: null, fontPath: null }

  const candidates: string[] = []
  if (customFontPath) candidates.push(customFontPath)
  candidates.push(
    join(__dirname, '..', 'assets', 'LXGWWenKaiMono-Regular.ttf'),
    join(__dirname, '..', '..', 'assets', 'LXGWWenKaiMono-Regular.ttf'),
    '/usr/share/fonts/truetype/lxgw/LXGWWenKaiMono-Regular.ttf',
  )

  for (const fp of candidates) {
    if (!existsSync(fp)) continue
    try {
      const buf = readFileSync(fp)
      const detectedFamily = readFontFamilyName(buf)
      const fontFamily = (customFontFamily !== undefined && customFontFamily !== '')
        ? customFontFamily
        : (detectedFamily || DEFAULT_FAMILY)
      const fontDir = dirname(fp)
      return {
        fontData: buf,
        fontFamily,
        fontDir,
        fontPath: fp,
      }
    } catch {
      continue
    }
  }

  return FALLBACK
}

/**
 * XML 特殊字符转义
 */
export function escapeXml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLen: number): string {
  if (!text) return ''
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text
}

/**
 * 检测文本是否包含 emoji
 */
export function containsEmoji(text: string): boolean {
  if (!text) return false
  // Emoji Unicode 范围
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}]|[\u{2B06}]|[\u{2B07}]|[\u{2B05}]|[\u{27A1}]|[\u{2194}-\u{2199}]|[\u{21AA}]|[\u{21A9}]|[\u{2934}]|[\u{2935}]|[\u{25AA}]|[\u{25AB}]|[\u{25FE}]|[\u{25FD}]|[\u{25FB}]|[\u{25FC}]|[\u{25B6}]|[\u{25C0}]|[\u{1F200}-\u{1F251}]|[\u{1F004}]|[\u{1F0CF}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]|[\u{23F0}]|[\u{23F3}]|[\u{24C2}]|[\u{200D}]|[\u{FE0F}]|[\u{20E3}]/u
  return emojiRegex.test(text)
}

/**
 * 格式化时间戳
 */
export function formatTs(ts: number): string {
  if (!ts) return '未知'
  return new Date(ts).toLocaleString('zh-CN')
}

/**
 * 解码 HTML 实体
 */
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

/**
 * 获取字体文件路径
 */
export async function getSvgFontPath(customFontPath?: string): Promise<string | null> {
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


/**
 * 调度自动撤回消息
 * 在消息发送后（await session.send 之后）调用此函数，
 * 会在 config.autoRecallDelay 秒后自动撤回该消息。
 * 
 * @param session 会话对象
 * @param config 插件配置
 * @param msgIds 要撤回的消息ID（可以是单个或数组）
 */
export function scheduleAutoRecall(
  session: any,
  config: Config,
  msgIds: string | string[]
): void {
  if (!config.enableAutoRecall) return;
  const ids = Array.isArray(msgIds) ? msgIds : [msgIds];
  const delayMs = (config.autoRecallDelay ?? 45) * 1000;
  for (const msgId of ids) {
    if (!msgId) continue;
    setTimeout(async () => {
      try {
        await session.bot.deleteMessage(session.channelId, String(msgId));
      } catch (e) {
        // 撤回失败静默忽略（消息可能已被手动删除）
      }
    }, delayMs);
  }
}


/**
 * 生成当前时间戳字符串
 * @returns 格式为 YYYY/MM/DD HH:MM:SS 的时间戳字符串
 */
export function generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}



/**
 * 获取群头像的 Base64 编码
 * @param ctx Koishi Context 实例
 * @param groupId 群号
 * @returns Promise<string> 群头像的 base64 编码
 */
export async function getGroupAvatarBase64(ctx: Context, groupId: string): Promise<string> {
    try {
        const groupAvatarUrl = `https://p.qlogo.cn/gh/${groupId}/${groupId}/640/`;
        const response = await ctx.http.get(groupAvatarUrl, { responseType: 'arraybuffer' });
        return Buffer.from(response).toString('base64');
    } catch (error) {
        ctx.logger.warn(`获取群头像失败: ${error.message}`);
        return '';
    }
}

/**
 * 获取用户头像的 Base64 编码
 * @param ctx Koishi Context 实例
 * @param userId 用户ID
 * @returns Promise<string> 用户头像的 base64 编码
 */
export async function getUserAvatarBase64(ctx: Context, userId: number | string): Promise<string> {
    try {
        const avatarUrl = `https://q.qlogo.cn/headimg_dl?dst_uin=${userId}&spec=640`;
        const response = await ctx.http.get(avatarUrl, { responseType: 'arraybuffer' });
        return Buffer.from(response).toString('base64');
    } catch (error) {
        ctx.logger.warn(`获取用户 ${userId} 头像失败: ${error.message}`);
        return '';
    }
}

/**
 * 获取群公告图片的 Base64 编码
 * @param ctx Koishi Context 实例
 * @param imageId 图片ID
 * @returns Promise<string> 图片的 base64 编码
 */
export async function getNoticeImageBase64(ctx: Context, imageId: string): Promise<string> {
    try {
        const imageUrl = `https://gdynamic.qpic.cn/gdynamic/${imageId}/0`;
        const response = await ctx.http.get(imageUrl, { responseType: 'arraybuffer' });
        return Buffer.from(response).toString('base64');
    } catch (error) {
        ctx.logger.warn(`获取公告图片 ${imageId} 失败: ${error.message}`);
        return '';
    }
}


/**
 * 获取字体文件的 Base64 编码
 * @param ctx Koishi Context 实例
 * @param imageStyle 图片样式
 * @returns Promise<string> 字体文件的 base64 编码
 */
export async function getFontBase64(ctx: Context, imageStyle: ImageStyle): Promise<string> {
    try {
        const fontFileName = FONT_FILES[imageStyle];
        const fontPath = join(__dirname, '..', 'assets', fontFileName);
        const fontBuffer = readFileSync(fontPath);
        return fontBuffer.toString('base64');
    } catch (error) {
        ctx.logger.warn(`获取字体文件失败: ${error.message}`);
        return '';
    }
}


/**
 * 验证并下载字体文件
 * @param ctx Koishi Context 实例
 * @returns Promise<void>
 */
export async function validateFonts(ctx: Context): Promise<void> {
    const assetsDir = join(__dirname, '..', 'assets');
    
    // 确保assets目录存在
    if (!existsSync(assetsDir)) {
        mkdirSync(assetsDir, { recursive: true });
    }
    
    const fontConfigs = [
        {
            filename: 'LXGWWenKaiMono-Regular.ttf',
            downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-onebot-image/releases/download/font/LXGWWenKaiMono-Regular.ttf'
        },
        {
            filename: 'SourceHanSerifSC-Medium.otf',
            downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-onebot-image/releases/download/font/SourceHanSerifSC-Medium.otf'
        },
        {
            filename: 'NotoColorEmoji-Regular.ttf',
            downloadUrl: 'https://gitee.com/vincent-zyu/koishi-plugin-onebot-image/releases/download/font/NotoColorEmoji-Regular.ttf'
        }
    ];
    
    for (const fontConfig of fontConfigs) {
        const fontPath = join(assetsDir, fontConfig.filename);
        
        // 检查字体文件是否存在
        if (!existsSync(fontPath)) {
            ctx.logger.info(`字体文件 ${fontConfig.filename} 不存在，开始下载...`);
            
            try {
                // 下载字体文件
                const response = await ctx.http.get(fontConfig.downloadUrl, { responseType: 'arraybuffer' });
                const fontBuffer = Buffer.from(response);
                
                // 保存字体文件
                writeFileSync(fontPath, fontBuffer);
                ctx.logger.info(`字体文件 ${fontConfig.filename} 下载完成`);
            } catch (error) {
                ctx.logger.error(`下载字体文件 ${fontConfig.filename} 失败: ${error.message}`);
            }
        } else {
            ctx.logger.debug(`字体文件 ${fontConfig.filename} 已存在`);
        }
    }
}

/**
 * SVG 渲染调试信息接口
 */
export interface SvgRenderDebugInfo {
  commandName: string
  userId: string
  fontPath?: string
  configFontFamily?: string
  svgFont: {
    fontPath: string | null
    fontFamily: string
    fontData: Buffer | null
  }
  fontFamily: string
  fontFiles: string[]
  svgPreview: string
  __dirname: string
}

/**
 * 输出 SVG 渲染调试信息
 * 根据配置决定是否输出到控制台和文件
 * 
 * @param ctx Koishi Context 实例
 * @param config 插件配置
 * @param info 调试信息
 * @param pngBuffer PNG 图片数据（可选，用于文件输出）
 */
export function logSvgRenderDebug(
  ctx: Context,
  config: Config,
  info: SvgRenderDebugInfo,
  pngBuffer?: Buffer
): void {
  // 控制台输出
  if (config.verboseConsoleOutput) {
    ctx.logger.info(`[${info.commandName}] 调试信息:`)
    ctx.logger.info(`  fontPath 参数: ${info.fontPath}`)
    ctx.logger.info(`  configFontFamily 参数: ${info.configFontFamily}`)
    ctx.logger.info(`  svgFont.fontPath: ${info.svgFont.fontPath}`)
    ctx.logger.info(`  svgFont.fontFamily: ${info.svgFont.fontFamily}`)
    ctx.logger.info(`  svgFont.fontData: ${info.svgFont.fontData ? `${info.svgFont.fontData.length} bytes` : 'null'}`)
    ctx.logger.info(`  最终 fontFamily: ${info.fontFamily}`)
    ctx.logger.info(`[${info.commandName}] __dirname = ${info.__dirname}`)
    ctx.logger.info(`[${info.commandName}] fontFiles = ${JSON.stringify(info.fontFiles)}`)
    ctx.logger.info(`[${info.commandName}] SVG 预览 (前500字符): ${info.svgPreview.substring(0, 500)}...`)
  }

  // 文件输出
  if (config.verboseFileOutput && pngBuffer) {
    try {
      const tmpDir = join(process.cwd(), 'tmp')
      if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir, { recursive: true })
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15)
      const filename = `${info.commandName}_${info.userId}_${timestamp}.png`
      const filepath = join(tmpDir, filename)

      writeFileSync(filepath, pngBuffer)
      ctx.logger.info(`[${info.commandName}] PNG 已保存到: ${filepath}`)
    } catch (error) {
      ctx.logger.error(`[${info.commandName}] 保存 PNG 文件失败: ${error.message}`)
    }
  }
}
