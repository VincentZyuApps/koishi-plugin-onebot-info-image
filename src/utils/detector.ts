import { ONEBOT_IMPL_NAME, OneBotImplName, OneBotRealImplName } from '../types';

/** 缓存各 bot 实例 (以 selfId 标识) 识别到的 OneBot 实现名 */
const implCache = new Map<string, OneBotRealImplName>();

/**
 * 清除 OneBot 实现检测缓存
 * @param selfId 可选，传入特定 selfId 则只清除该 bot 缓存，不传则清空全部
 */
export function clearOneBotImplCache(selfId?: string): void {
  if (selfId) {
    implCache.delete(selfId);
  } else {
    implCache.clear();
  }
}

/**
 * 解析并确定当前 OneBot 实例的具体实现
 * @param bot 当前会话或上下文中的 OneBot 机器人实例
 * @param configImpl 用户配置中选择的实现名称（Auto / Lagrange / NapCat / LLBot）
 * @param logger 可选的 Logger 实例，用于记录识别日志
 * @returns 确切的 OneBot 实现（Lagrange / NapCat / LLBot）
 */
export async function resolveOneBotImpl(
  bot: any,
  configImpl: OneBotImplName,
  logger?: any
): Promise<OneBotRealImplName> {
  // 如果用户手动指定了具体平台，直接返回指定平台，完全遵从用户配置
  if (configImpl !== ONEBOT_IMPL_NAME.AUTO) {
    return configImpl as OneBotRealImplName;
  }

  const selfId = bot?.selfId ? String(bot.selfId) : 'default';

  // 命中内存缓存直接返回
  if (implCache.has(selfId)) {
    return implCache.get(selfId)!;
  }

  let detected: OneBotRealImplName = ONEBOT_IMPL_NAME.NAPCAT; // 默认降级为 NapCat

  try {
    // 优先调用 OneBot 标准接口 get_version_info
    const versionInfo = await (
      bot?.internal?.getVersionInfo?.() ||
      bot?.internal?._request?.('get_version_info') ||
      bot?._request?.('get_version_info')
    );

    const appName = String(versionInfo?.app_name || '').toLowerCase();
    const hasNtProtocol = Boolean(versionInfo?.nt_protocol);

    if (appName.includes('napcat')) {
      detected = ONEBOT_IMPL_NAME.NAPCAT;
    } else if (appName.includes('lagrange') || hasNtProtocol) {
      detected = ONEBOT_IMPL_NAME.LAGRNAGE;
    } else if (appName.includes('llonebot') || appName.includes('llbot') || appName.includes('luckylillia')) {
      detected = ONEBOT_IMPL_NAME.LLBOT;
    } else {
      // 若未能通过 app_name 识别，默认采用兼容性最广的 NapCat 格式
      detected = ONEBOT_IMPL_NAME.NAPCAT;
    }

    logger?.info?.(
      `[onebot-info-image] ✨ 自动识别 Bot(${selfId}) 的 OneBot 实现为: ${detected} (app_name: "${versionInfo?.app_name || 'unknown'}", app_version: "${versionInfo?.app_version || 'unknown'}")`
    );
  } catch (err: any) {
    logger?.warn?.(
      `[onebot-info-image] ⚠️ 自动探测 Bot(${selfId}) OneBot 实现失败，降级使用 NapCat: ${err?.message || err}`
    );
    detected = ONEBOT_IMPL_NAME.NAPCAT;
  }

  implCache.set(selfId, detected);
  return detected;
}
