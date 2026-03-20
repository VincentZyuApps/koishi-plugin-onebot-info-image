// 01-check-fonts.ts
// 用途：检查字体文件是否存在
// 创建时间：开发过程中用于调试字体路径问题

import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const possibleFontPaths = [
  join(__dirname, '..', 'assets', 'LXGWWenKaiMono-Regular.ttf'),
  join(__dirname, '..', '..', 'assets', 'LXGWWenKaiMono-Regular.ttf'),
  '/usr/share/fonts/truetype/lxgw/LXGWWenKaiMono-Regular.ttf',
]

console.log('检查字体文件是否存在：')
for (const fp of possibleFontPaths) {
  const exists = existsSync(fp)
  console.log(`${exists ? '✓' : '✗'} ${fp}`)
}
