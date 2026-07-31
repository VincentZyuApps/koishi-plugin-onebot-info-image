import { createHash } from 'crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { Context } from 'koishi'

import { FONT_FILES, type ImageStyle } from '../types'

export const SHARED_FONT_DIR_NAME = 'fonts'

export const FONT_DOWNLOAD_URLS: Record<string, string> = {
  'LXGWWenKaiMono-Regular.ttf': 'https://gitee.com/vincent-zyu/koishi-plugin-onebot-image/releases/download/font/LXGWWenKaiMono-Regular.ttf',
  'SourceHanSerifSC-Medium.otf': 'https://gitee.com/vincent-zyu/koishi-plugin-onebot-image/releases/download/font/SourceHanSerifSC-Medium.otf',
  'NotoColorEmoji-Regular.ttf': 'https://gitee.com/vincent-zyu/koishi-plugin-onebot-image/releases/download/font/NotoColorEmoji-Regular.ttf',
}

interface FontIntegrity {
  size: number
  md5: string
  sha1: string
  sha256: string
  sha512: string
}

const FONT_INTEGRITY: Record<string, FontIntegrity> = {
  'LXGWWenKaiMono-Regular.ttf': {
    size: 24755236,
    md5: '90e75a25cca0e8868977b880352c6a53',
    sha1: '7f018ad4a181e4d2df4f972f357e612885d6c24a',
    sha256: 'ee9faa6479c5b2434f9bceca8e2e7b643f699f4f3d067aac9609261e07c6be61',
    sha512: '793dc4357d311dba539c50b0ae38ff247af066f141ffea54ff0cc51e274453671e736989cee4998fd89211035ecfe52ad38aa828ba7f1739bcf107b94a023be5',
  },
  'SourceHanSerifSC-Medium.otf': {
    size: 24805580,
    md5: '3a2423029182ed071aec9516b952b70e',
    sha1: '8588679f9508a8d44845e71012ac99f36b098872',
    sha256: '1d4dc4b757c07034e2412d6edf48f54f94ec7172d4deb3b90a3e4fc9dcb94f5d',
    sha512: '594119e898c292b4c492618f5852adc99b3259ee861ed6f552f31e0cb71db6d2de3c29a46eb180796b9cbe14cfe7a930fea91da3755e9906ebdf5d143788d0b4',
  },
  'NotoColorEmoji-Regular.ttf': {
    size: 25111640,
    md5: 'a666a1a5090c4d8c4acae3121ad40d1a',
    sha1: '384d8393848837001a30c85c2e53fa74902aaa15',
    sha256: '7fb39738ab18f10612d6f4595e2e8e47a0afdf34738460442d99cd0c344a4d90',
    sha512: '54a8e8ebf6c8feaa0dac72946ed5fe23cfc6779fb7c5372d54515232c8cfdf1b0bb418ff84a2bee958fbeed578f2abf6f602addc50a4381ecec4e19fc6daf3ee',
  },
}

let runtimeBaseDir = process.cwd()

export function getFontDirByBaseDir(baseDir: string) {
  return join(baseDir, 'data', SHARED_FONT_DIR_NAME)
}

export function getFontPathByBaseDir(baseDir: string, fontFileName: string) {
  return join(getFontDirByBaseDir(baseDir), fontFileName)
}

function getFallbackFontPath(fontFileName: string) {
  return getFontPathByBaseDir(runtimeBaseDir, fontFileName)
}

function normalizeRuntimeFontPath(fontPath: string) {
  const fileName = fontPath.split(/[\\/]/).pop() || ''
  if (FONT_DOWNLOAD_URLS[fileName] && fontPath.includes(`${join('assets', fileName)}`)) {
    return getFallbackFontPath(fileName)
  }
  return fontPath
}

function calculateFontHashes(buffer: Buffer) {
  return {
    md5: createHash('md5').update(buffer).digest('hex'),
    sha1: createHash('sha1').update(buffer).digest('hex'),
    sha256: createHash('sha256').update(buffer).digest('hex'),
    sha512: createHash('sha512').update(buffer).digest('hex'),
  }
}

function verifyFontIntegrity(filePath: string, expected: FontIntegrity): boolean {
  if (!existsSync(filePath)) return false
  const buffer = readFileSync(filePath)
  if (buffer.length !== expected.size) return false
  const hashes = calculateFontHashes(buffer)
  return hashes.md5 === expected.md5
    && hashes.sha1 === expected.sha1
    && hashes.sha256 === expected.sha256
    && hashes.sha512 === expected.sha512
}

export function readFontFamilyName(fontBuffer: Buffer): string | null {
  try {
    const numTables = fontBuffer.readUInt16BE(4)
    let nameTableOffset = 0
    let nameTableLength = 0

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
    let familyName: string | null = null

    for (let i = 0; i < count; i++) {
      const recordOffset = 6 + i * 12
      const platformID = nameTable.readUInt16BE(recordOffset)
      const encodingID = nameTable.readUInt16BE(recordOffset + 2)
      const nameID = nameTable.readUInt16BE(recordOffset + 6)
      const length = nameTable.readUInt16BE(recordOffset + 8)
      const offset = nameTable.readUInt16BE(recordOffset + 10)

      if (nameID !== 1) continue

      const strBuf = nameTable.subarray(stringOffset + offset, stringOffset + offset + length)
      if (platformID === 3 && encodingID === 1) {
        const chars: string[] = []
        for (let j = 0; j < strBuf.length; j += 2) {
          chars.push(String.fromCharCode(strBuf.readUInt16BE(j)))
        }
        return chars.join('')
      }

      if (platformID === 1 && !familyName) {
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

export function loadResvgFont(
  enableCustomFont: boolean = false,
  configFontFiles: string[] = [],
  configFontFamilies: string[] = [],
): { fontFiles: string[]; fontFamily: string } {
  if (!enableCustomFont) {
    return { fontFiles: [], fontFamily: 'sans-serif' }
  }

  if (configFontFiles.length > 0 && configFontFamilies.length > 0) {
    const validFontFiles = configFontFiles
      .map(fp => normalizeRuntimeFontPath(fp))
      .filter(fp => existsSync(fp))
    if (validFontFiles.length > 0) {
      return {
        fontFiles: validFontFiles,
        fontFamily: configFontFamilies[0] || 'sans-serif',
      }
    }
  }

  const fontFiles: string[] = []
  const candidates = [
    getFallbackFontPath('LXGWWenKaiMono-Regular.ttf'),
    '/usr/share/fonts/truetype/lxgw/LXGWWenKaiMono-Regular.ttf',
  ]

  for (const fp of candidates) {
    if (existsSync(fp)) {
      fontFiles.push(fp)
      break
    }
  }

  const fontFamily = fontFiles.length > 0 ? 'LXGWWenKaiMono, sans-serif' : 'sans-serif'
  return { fontFiles, fontFamily }
}

export function loadSvgFont(customFontPath?: string, customFontFamily?: string): SvgFontInfo {
  const defaultFamily = customFontFamily || 'LXGWWenKaiMono'
  const fallback = { fontData: null, fontFamily: defaultFamily, fontDir: null, fontPath: null }

  const candidates: string[] = []
  if (customFontPath) candidates.push(normalizeRuntimeFontPath(customFontPath))
  candidates.push(
    getFallbackFontPath('LXGWWenKaiMono-Regular.ttf'),
    '/usr/share/fonts/truetype/lxgw/LXGWWenKaiMono-Regular.ttf',
  )

  for (const fp of candidates) {
    if (!existsSync(fp)) continue
    try {
      const buf = readFileSync(fp)
      const detectedFamily = readFontFamilyName(buf)
      const fontFamily = customFontFamily !== undefined && customFontFamily !== ''
        ? customFontFamily
        : detectedFamily || defaultFamily
      return {
        fontData: buf,
        fontFamily,
        fontDir: dirname(fp),
        fontPath: fp,
      }
    } catch {
      continue
    }
  }

  return fallback
}

export async function getSvgFontPath(customFontPath?: string): Promise<string | null> {
  if (customFontPath) {
    const runtimeFontPath = normalizeRuntimeFontPath(customFontPath)
    if (existsSync(runtimeFontPath)) return runtimeFontPath
  }
  const possibleFontPaths = [
    getFallbackFontPath('LXGWWenKaiMono-Regular.ttf'),
    '/usr/share/fonts/truetype/lxgw/LXGWWenKaiMono-Regular.ttf',
  ]
  for (const fp of possibleFontPaths) {
    if (existsSync(fp)) return fp
  }
  return null
}

export async function getFontBase64(ctx: Context, imageStyle: ImageStyle): Promise<string> {
  try {
    const fontFileName = FONT_FILES[imageStyle]
    const fontPath = getFontPathByBaseDir(ctx.baseDir, fontFileName)
    const expected = FONT_INTEGRITY[fontFileName]
    if (expected && !verifyFontIntegrity(fontPath, expected)) {
      ctx.logger.warn(`⚠️ 字体文件 ${fontFileName} hash 校验失败，拒绝读取: ${fontPath}`)
      return ''
    }
    const fontBuffer = readFileSync(fontPath)
    return fontBuffer.toString('base64')
  } catch (error) {
    ctx.logger.warn(`获取字体文件失败: ${error.message}`)
    return ''
  }
}

export async function validateFonts(ctx: Context): Promise<void> {
  runtimeBaseDir = ctx.baseDir
  const fontDir = getFontDirByBaseDir(ctx.baseDir)

  if (!existsSync(fontDir)) {
    mkdirSync(fontDir, { recursive: true })
  }

  const fontConfigs = Object.entries(FONT_DOWNLOAD_URLS)
    .map(([filename, downloadUrl]) => ({ filename, downloadUrl }))

  for (const fontConfig of fontConfigs) {
    const fontPath = getFontPathByBaseDir(ctx.baseDir, fontConfig.filename)
    const expected = FONT_INTEGRITY[fontConfig.filename]

    if (expected && verifyFontIntegrity(fontPath, expected)) {
      ctx.logger.debug(`🔤 字体文件 ${fontConfig.filename} 已存在且 hash 校验通过: ${fontPath}`)
      continue
    }

    if (existsSync(fontPath)) {
      ctx.logger.warn(`⚠️ 字体文件 ${fontConfig.filename} 存在但 hash 校验失败，将重新下载: ${fontPath}`)
    } else {
      ctx.logger.info(`🔤 字体文件 ${fontConfig.filename} 不存在，开始下载到 Koishi 数据目录: ${fontPath}`)
    }

    try {
      const response = await ctx.http.get(fontConfig.downloadUrl, { responseType: 'arraybuffer' })
      const fontBuffer = Buffer.from(response)
      writeFileSync(fontPath, fontBuffer)
      if (expected && !verifyFontIntegrity(fontPath, expected)) {
        throw new Error(`❌ 字体 hash 校验失败: ${fontConfig.filename}`)
      }
      ctx.logger.info(`✅ 字体文件 ${fontConfig.filename} 下载完成，hash 校验通过`)
    } catch (error) {
      ctx.logger.error(`❌ 下载字体文件 ${fontConfig.filename} 失败: ${error.message}`)
    }
  }
}
