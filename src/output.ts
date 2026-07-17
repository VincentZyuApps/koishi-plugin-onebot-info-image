import type { Context } from 'koishi'

import type { Config } from './config'

export type OutputConfig = Pick<Config, 'sendText' | 'sendImage' | 'sendImageSvg' | 'sendForward'>

const OUTPUT_FORMATS = [
  { key: 'sendText', label: '文本消息', notifierLabel: '💬 文本消息' },
  { key: 'sendImage', label: 'Puppeteer图片', notifierLabel: '🖼️ Puppeteer图片' },
  { key: 'sendImageSvg', label: 'resvg图片', notifierLabel: '🚀 resvg图片' },
  { key: 'sendForward', label: '合并转发', notifierLabel: '✉️ 合并转发' },
] as const

export function getConfiguredOutputFormats(config: OutputConfig) {
  return OUTPUT_FORMATS.filter(({ key }) => config[key])
}

interface SendableSession {
  send(message: string): Promise<unknown>
}

export async function guardPuppeteerOutput(
  ctx: Context,
  config: OutputConfig,
  session: SendableSession,
): Promise<boolean> {
  if (!config.sendImage || ctx.puppeteer) return true

  const warning = 'Puppeteer 服务当前不可用，已跳过 Puppeteer 图片输出。'
  ctx.logger.warn(warning)

  if (config.sendText || config.sendImageSvg || config.sendForward) return true

  await session.send(`❌ ${warning}请检查浏览器服务是否已成功启动。`)
  return false
}
