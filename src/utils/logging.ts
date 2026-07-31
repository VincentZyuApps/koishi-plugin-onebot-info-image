import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import type { Context } from 'koishi'

import type { Config } from '../config'
import { generateTimestamp } from './time'

export function resolvePluginPath(fromDir: string, ...paths: string[]): string {
  let currentDir = fromDir
  while (true) {
    if (existsSync(join(currentDir, 'package.json'))) {
      return join(currentDir, ...paths)
    }

    const parentDir = dirname(currentDir)
    if (parentDir === currentDir) {
      return join(fromDir, ...paths)
    }
    currentDir = parentDir
  }
}

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

export function logSvgRenderDebug(
  ctx: Context,
  config: Config,
  info: SvgRenderDebugInfo,
  pngBuffer?: Buffer,
): void {
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

export function logCommandToFile(
  ctx: Context,
  config: Config,
  protocol: string,
  commandName: string,
  logs: string[],
): void {
  if (!config.verboseFileOutput) return

  try {
    const logDir = resolvePluginPath(__dirname, 'log')
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }

    const safeCommandName = commandName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')
    const filename = `${protocol}_${safeCommandName}_latest.log`
    const filepath = join(logDir, filename)
    const logContent = [
      `=== ${generateTimestamp()} ===`,
      ...logs,
      '',
      '',
    ].join('\n')

    writeFileSync(filepath, logContent)
    ctx.logger.info(`[${commandName}] 日志已保存到: ${filepath}`)
  } catch (error) {
    ctx.logger.error(`[${commandName}] 保存日志文件失败: ${error.message}`)
  }
}
