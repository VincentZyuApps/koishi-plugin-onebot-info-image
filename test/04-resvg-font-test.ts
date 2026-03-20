import { Resvg } from '@resvg/resvg-js'
import { readFileSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'

const FONT_PATH = join(__dirname, '..', 'assets', 'LXGWWenKaiMono-Regular.ttf')

function readFontFamilyName(fontBuffer: Buffer): string | null {
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

console.log('==========================================')
console.log('resvg 字体加载测试')
console.log('==========================================')
console.log(`字体文件: ${FONT_PATH}`)
console.log(`文件存在: ${existsSync(FONT_PATH)}`)

if (!existsSync(FONT_PATH)) {
  console.log('错误: 字体文件不存在!')
  process.exit(1)
}

const fontBuffer = readFileSync(FONT_PATH)
const detectedFamily = readFontFamilyName(fontBuffer)
console.log(`检测到的字体名称: "${detectedFamily}"`)
console.log('')

const testText = '测试文字 Test 你好世界'
const svgTemplate = (fontFamily: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="60">
  <rect width="400" height="60" fill="#f0f0f0"/>
  <text x="10" y="40" font-size="24" font-family="${fontFamily}">${testText}</text>
</svg>`

const results: { name: string; fontFamily: string; fontFiles: string[]; pngPath: string }[] = []

console.log('--- 测试 1: 硬编码 LXGWWenKaiMono (无空格, resvg-test 方式) ---')
{
  const fontFamily = 'LXGWWenKaiMono, sans-serif'
  const svg = svgTemplate(fontFamily)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 400 },
    font: {
      fontFiles: [FONT_PATH],
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  })
  const png = resvg.render()
  const pngPath = join(__dirname, 'test-1-hardcoded.png')
  writeFileSync(pngPath, png.asPng())
  console.log(`  font-family in SVG: "${fontFamily}"`)
  console.log(`  fontFiles: [${FONT_PATH}]`)
  console.log(`  PNG: ${pngPath}`)
  results.push({ name: '测试1', fontFamily, fontFiles: [FONT_PATH], pngPath })
}

console.log('')
console.log('--- 测试 2: 动态读取字体名称 LXGW WenKai Mono (有空格) ---')
{
  const fontFamily = `${detectedFamily}, sans-serif`
  const svg = svgTemplate(fontFamily)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 400 },
    font: {
      fontFiles: [FONT_PATH],
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  })
  const png = resvg.render()
  const pngPath = join(__dirname, 'test-2-detected.png')
  writeFileSync(pngPath, png.asPng())
  console.log(`  font-family in SVG: "${fontFamily}"`)
  console.log(`  fontFiles: [${FONT_PATH}]`)
  console.log(`  PNG: ${pngPath}`)
  results.push({ name: '测试2', fontFamily, fontFiles: [FONT_PATH], pngPath })
}

console.log('')
console.log('--- 测试 3: 配置默认值 LXGWWenKaiMono (无空格, 当前插件方式) ---')
{
  const configFamily = 'LXGWWenKaiMono'
  const fontFamily = `${configFamily}, sans-serif`
  const svg = svgTemplate(fontFamily)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 400 },
    font: {
      fontFiles: [FONT_PATH],
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  })
  const png = resvg.render()
  const pngPath = join(__dirname, 'test-3-config.png')
  writeFileSync(pngPath, png.asPng())
  console.log(`  font-family in SVG: "${fontFamily}"`)
  console.log(`  fontFiles: [${FONT_PATH}]`)
  console.log(`  PNG: ${pngPath}`)
  results.push({ name: '测试3', fontFamily, fontFiles: [FONT_PATH], pngPath })
}

console.log('')
console.log('--- 测试 4: 不指定 fontFiles, 只用 loadSystemFonts ---')
{
  const fontFamily = 'LXGW WenKai Mono, sans-serif'
  const svg = svgTemplate(fontFamily)
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: 400 },
    font: {
      fontFiles: [],
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  })
  const png = resvg.render()
  const pngPath = join(__dirname, 'test-4-system.png')
  writeFileSync(pngPath, png.asPng())
  console.log(`  font-family in SVG: "${fontFamily}"`)
  console.log(`  fontFiles: []`)
  console.log(`  loadSystemFonts: true`)
  console.log(`  PNG: ${pngPath}`)
  results.push({ name: '测试4', fontFamily, fontFiles: [], pngPath })
}

console.log('')
console.log('==========================================')
console.log('测试完成! 请查看生成的 PNG 图片对比效果')
console.log('==========================================')
console.log('')
console.log('生成的图片:')
for (const r of results) {
  console.log(`  ${r.name}: ${r.pngPath}`)
  console.log(`    font-family: "${r.fontFamily}"`)
}
console.log('')
console.log('说明:')
console.log('  - 如果测试1和测试2的字体看起来一样且正确，说明 resvg 能正确匹配字体')
console.log('  - 如果测试3的字体看起来不同（可能是默认字体），说明 font-family 名称不匹配')
console.log('  - 测试4依赖系统字体，如果系统没有安装该字体，会使用默认字体')
console.log('')
console.log('关键结论:')
console.log(`  字体文件内部名称: "${detectedFamily}"`)
console.log(`  配置默认值: "LXGWWenKaiMono"`)
console.log(`  是否匹配: ${detectedFamily === 'LXGWWenKaiMono' ? '✓ 匹配' : '✗ 不匹配! 需要修改配置或代码'}`)
