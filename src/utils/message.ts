import type { Config } from '../config'

export function scheduleAutoRecall(
  session: any,
  config: Config,
  msgIds: string | string[],
): void {
  if (!config.enableAutoRecall) return
  const ids = Array.isArray(msgIds) ? msgIds : [msgIds]
  const delayMs = (config.autoRecallDelay ?? 45) * 1000
  for (const msgId of ids) {
    if (!msgId) continue
    setTimeout(async () => {
      try {
        await session.bot.deleteMessage(session.channelId, String(msgId))
      } catch {
        // 消息可能已被手动删除，自动撤回失败时无需打断当前指令。
      }
    }, delayMs)
  }
}
