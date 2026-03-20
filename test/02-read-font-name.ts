// 02-read-font-name.ts
// 用途：读取字体文件内部的 family name
// 创建时间：开发过程中用于调试字体名称问题

import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * 从 TTF/OTF 字体文件的 name table 中提取 font family name (nameID=1)
 */
function readFontFamilyName(fontBuffer: Buffer): string | null {
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

const fontPaths = [
  '/home/bawuyinguo/SSoftwareFiles/koishi/koishi-dev-4/external/onebot-info-image/assets/LXGWWenKaiMono-Regular.ttf',
  '/usr/share/fonts/truetype/lxgw/LXGWWenKaiMono-Regular.ttf',
]

for (const fontPath of fontPaths) {
  try {
    const buffer = readFileSync(fontPath)
    const familyName = readFontFamilyName(buffer)
    console.log(`字体文件: ${fontPath}`)
    console.log(`字体名称: ${familyName}`)
    console.log('---')
  } catch (error) {
    console.log(`字体文件: ${fontPath}`)
    console.log(`错误: ${error.message}`)
    console.log('---')
  }
}
