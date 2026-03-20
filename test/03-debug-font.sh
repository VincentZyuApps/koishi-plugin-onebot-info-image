#!/bin/bash

FONT_DIR="/home/bawuyinguo/SSoftwareFiles/koishi/koishi-dev-4/external/onebot-info-image/assets"

echo "=========================================="
echo "字体文件信息检查"
echo "=========================================="

for font in "$FONT_DIR"/*.ttf "$FONT_DIR"/*.otf; do
  if [ -f "$font" ]; then
    echo ""
    echo "字体文件: $font"
    echo "----------------------------------------"
    
    if command -v fc-scan &> /dev/null; then
      echo "使用 fc-scan 读取字体信息:"
      fc-scan --format "  Family: %{family}\n  Style: %{style}\n  Full Name: %{fullname}\n  PostScript Name: %{postscriptname}\n" "$font" 2>/dev/null || echo "  fc-scan 读取失败"
    else
      echo "  fc-scan 未安装，跳过"
    fi
    
    if command -v otfinfo &> /dev/null; then
      echo "使用 otfinfo 读取字体信息:"
      otfinfo --info "$font" 2>/dev/null | grep -E "(Family|Full|PostScript)" || echo "  otfinfo 读取失败"
    else
      echo "  otfinfo 未安装，跳过"
    fi
    
    echo ""
  fi
done

echo ""
echo "=========================================="
echo "检查 resvg 字体加载测试"
echo "=========================================="

cat > /tmp/test-resvg-font.mjs << 'EOF'
import { Resvg } from '@resvg/resvg-js'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'

const FONT_PATHS = [
  '/home/bawuyinguo/SSoftwareFiles/koishi/koishi-dev-4/external/onebot-info-image/assets/LXGWWenKaiMono-Regular.ttf',
]

function readFontFamilyName(fontBuffer) {
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

    let familyName = null

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
        const chars = []
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

console.log('\n--- 测试 1: onebot-info-image-resvg-test 方式 (硬编码 LXGWWenKaiMono) ---')
const fontPath1 = FONT_PATHS[0]
if (existsSync(fontPath1)) {
  const fontFamily1 = 'LXGWWenKaiMono, sans-serif'
  const svg1 = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
    <text x="10" y="30" font-size="20" font-family="${fontFamily1}">测试文字 Test</text>
  </svg>`
  
  const resvg1 = new Resvg(svg1, {
    fitTo: { mode: 'width', value: 200 },
    font: {
      fontFiles: [fontPath1],
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  })
  
  const png1 = resvg1.render()
  console.log(`  font-family in SVG: "${fontFamily1}"`)
  console.log(`  fontFiles: [${fontPath1}]`)
  console.log(`  PNG size: ${png1.width}x${png1.height}`)
  console.log(`  ✓ 渲染成功`)
} else {
  console.log(`  ✗ 字体文件不存在: ${fontPath1}`)
}

console.log('\n--- 测试 2: onebot-info-image 方式 (动态读取字体名称) ---')
const fontPath2 = FONT_PATHS[0]
if (existsSync(fontPath2)) {
  const buf = readFileSync(fontPath2)
  const detectedFamily = readFontFamilyName(buf)
  const fontFamily2 = `${detectedFamily}, sans-serif`
  
  const svg2 = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
    <text x="10" y="30" font-size="20" font-family="${fontFamily2}">测试文字 Test</text>
  </svg>`
  
  const resvg2 = new Resvg(svg2, {
    fitTo: { mode: 'width', value: 200 },
    font: {
      fontFiles: [fontPath2],
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  })
  
  const png2 = resvg2.render()
  console.log(`  检测到的字体名称: "${detectedFamily}"`)
  console.log(`  font-family in SVG: "${fontFamily2}"`)
  console.log(`  fontFiles: [${fontPath2}]`)
  console.log(`  PNG size: ${png2.width}x${png2.height}`)
  console.log(`  ✓ 渲染成功`)
} else {
  console.log(`  ✗ 字体文件不存在: ${fontPath2}`)
}

console.log('\n--- 测试 3: 使用配置值 LXGWWenKaiMono (无空格) ---')
const fontPath3 = FONT_PATHS[0]
if (existsSync(fontPath3)) {
  const buf = readFileSync(fontPath3)
  const detectedFamily = readFontFamilyName(buf)
  const configFamily = 'LXGWWenKaiMono'
  const fontFamily3 = `${configFamily}, sans-serif`
  
  const svg3 = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
    <text x="10" y="30" font-size="20" font-family="${fontFamily3}">测试文字 Test</text>
  </svg>`
  
  const resvg3 = new Resvg(svg3, {
    fitTo: { mode: 'width', value: 200 },
    font: {
      fontFiles: [fontPath3],
      loadSystemFonts: true,
      defaultFontFamily: 'sans-serif',
    },
  })
  
  const png3 = resvg3.render()
  console.log(`  检测到的字体名称: "${detectedFamily}"`)
  console.log(`  配置值: "${configFamily}"`)
  console.log(`  font-family in SVG: "${fontFamily3}"`)
  console.log(`  fontFiles: [${fontPath3}]`)
  console.log(`  PNG size: ${png3.width}x${png3.height}`)
  console.log(`  ✓ 渲染成功 (但字体可能不匹配!)`)
} else {
  console.log(`  ✗ 字体文件不存在: ${fontPath3}`)
}

console.log('\n--- 测试 4: 不指定 fontFiles, 只用 loadSystemFonts ---')
const svg4 = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="50">
  <text x="10" y="30" font-size="20" font-family="LXGW WenKai Mono, sans-serif">测试文字 Test</text>
</svg>`

const resvg4 = new Resvg(svg4, {
  fitTo: { mode: 'width', value: 200 },
  font: {
    fontFiles: [],
    loadSystemFonts: true,
    defaultFontFamily: 'sans-serif',
  },
})
const png4 = resvg4.render()
console.log(`  font-family in SVG: "LXGW WenKai Mono, sans-serif"`)
console.log(`  fontFiles: []`)
console.log(`  loadSystemFonts: true`)
console.log(`  PNG size: ${png4.width}x${png4.height}`)
console.log(`  ✓ 渲染成功 (依赖系统字体)`)

console.log('\n--- 总结 ---')
console.log('如果测试 1 和测试 2 都能正确显示字体，说明 resvg 本身没问题。')
console.log('如果测试 3 显示的字体不对，说明 font-family 名称不匹配。')
console.log('关键: SVG 中的 font-family 必须与字体文件内部注册的名称一致!')
EOF

cd /home/bawuyinguo/SSoftwareFiles/koishi/koishi-dev-4/external/onebot-info-image
node /tmp/test-resvg-font.mjs

echo ""
echo "=========================================="
echo "调试完成"
echo "=========================================="
