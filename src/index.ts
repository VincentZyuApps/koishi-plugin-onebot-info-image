// index.ts
import {} from '@koishijs/plugin-console';
import {} from "@koishijs/plugin-notifier";
import { Context, h } from 'koishi'
import {} from 'koishi-plugin-adapter-onebot';
import { writeFileSync, mkdirSync } from 'fs'
// ----
import { validateFonts } from './utils'
import { OnebotInfoImageDataServer } from './data_server'
// ---
import { renderUserInfo } from './renderUserInfo'
import { renderAdminList } from './renderAdminList'
import { registerUserInfoCommand } from './commandUserInfo'
import { registerAdminListCommand } from './commandAdminList'
import { registerGroupNoticeCommand } from './commandGroupNoticeList'
import { registerInspectStyleCommand } from './commandInspectStyle'
import { registerGroupEssenceCommand } from './commandGroupEssenceList'
import { registerGroupNoticeDetailCommand } from './commandGroupNoticeDetail'
import { registerGroupEssenceDetailCommand } from './commandGroupEssenceDetail'
import { convertToUnifiedUserInfo, convertToUnifiedAdminInfo, convertToUnifiedContextInfo, UnifiedUserInfo, UnifiedAdminInfo, UnifiedContextInfo } from './type'
import { IMAGE_STYLES, ONEBOT_IMPL_NAME } from './type';
import { Config } from './config'

export const name = 'onebot-info-image'

export const inject = {
  required: ["http"],
  optional: ["puppeteer", "notifier", "console"],
}

export { usage } from './usage'

export { Config, ImageStyleDetail } from './config'


export function apply(ctx: Context, config: Config) {
  // 验证并下载字体文件 - 直接调用，不等待 ready 事件
  validateFonts(ctx).catch(error => {
    ctx.logger.error(`字体文件验证失败: ${error.message}`)
  })

  // 注册 DataService (如果 console 服务可用 且 用户开启了 WebUI 预览)
  if (config.enableWebUIPreview) {
    ctx.plugin(OnebotInfoImageDataServer);
  }

  // 使用 notifier 在 WebUI 显示当前信息格式
  if (ctx.notifier) {
    const infoItems: string[] = [];

    // OneBot 实现平台
    const implNameText = config.onebotImplName === ONEBOT_IMPL_NAME.LAGRNAGE ? 'Lagrange' : 'NapCat';
    infoItems.push(`🤖 OneBot 实现：${implNameText}`);

    // 自动撤回配置
    if (config.enableAutoRecall) {
      infoItems.push(`🗑️ 自动撤回：已启用 (${config.autoRecallDelay}秒)`);
    } else {
      infoItems.push(`🗑️ 自动撤回：未启用`);
    }

    // 信息格式
    const formatItems: string[] = [];
    if (config.sendText) formatItems.push('💬 文本消息');
    if (config.sendImage && ctx.puppeteer) formatItems.push('🖼️ Puppeteer图片');
    if (config.sendImageSvg) formatItems.push('🚀 resvg图片');
    if (config.sendForward) formatItems.push('✉️ 合并转发');

    if (formatItems.length === 0) {
      ctx.notifier.create(h('p', '请至少勾选一种信息格式！'));
      return;
    }

    infoItems.push(`📋 信息格式：${formatItems.join('、')}`);

    // Puppeteer 渲染配置
    if (config.sendImage && ctx.puppeteer) {
      const puppeteerItems: string[] = [];
      puppeteerItems.push(`图片类型：${config.imageType}`);
      puppeteerItems.push(`截图质量：${config.screenshotQuality}`);
      puppeteerItems.push(`显示渲染信息：${config.imageShowRenderInfo ? '是' : '否'}`);
      
      const defaultStyle = config.imageStyleDetails[0];
      const styleName = IMAGE_STYLES[defaultStyle.styleKey];
      puppeteerItems.push(`默认样式：${styleName} (${defaultStyle.darkMode ? '深色' : '浅色'}模式)`);
      
      infoItems.push(`🎨 Puppeteer 配置：${puppeteerItems.join(' | ')}`);
    }

    // resvg 渲染配置
    if (config.sendImageSvg) {
      const svgItems: string[] = [];
      svgItems.push(`深色模式：${config.svgEnableDarkMode ? '是' : '否'}`);
      svgItems.push(`缩放倍数：${config.svgScale}x`);
      svgItems.push(`主题色：${config.svgThemeColor}`);
      svgItems.push(`显示渲染信息：${config.svgShowRenderInfo ? '是' : '否'}`);
      svgItems.push(`自定义字体：${config.svgEnableCustomFont ? '是' : '否'}`);
      
      infoItems.push(`🚀 resvg 配置：${svgItems.join(' | ')}`);
    }

    // 调试配置
    const debugItems: string[] = [];
    if (config.verboseSessionOutput) debugItems.push('会话输出');
    if (config.verboseConsoleOutput) debugItems.push('控制台输出');
    if (config.verboseFileOutput) debugItems.push('文件输出');
    
    if (debugItems.length > 0) {
      infoItems.push(`🐞 调试输出：${debugItems.join('、')}`);
    }

    ctx.notifier.create(
      h(h.Fragment, [
        h('p', '📊 onebot-info-image 配置汇总：'),
        h('ul', infoItems.map(item => h('li', item)))
      ])
    );
  }

  //帮助文本中的 结果信息格式
  const responseHint = [
    config.sendText && '文本消息',
    config.sendImage && ctx.puppeteer && 'Puppeteer图片',
    config.sendImageSvg && 'resvg图片',
    config.sendForward && '合并转发'
  ].filter(Boolean).join('、');

  // 注册指令
  registerInspectStyleCommand(ctx, config);
  registerUserInfoCommand(ctx, config, responseHint);
  registerAdminListCommand(ctx, config, responseHint);
  registerGroupEssenceCommand(ctx, config, responseHint);
  registerGroupEssenceDetailCommand(ctx, config, responseHint);
  registerGroupNoticeCommand(ctx, config, responseHint);
  registerGroupNoticeDetailCommand(ctx, config, responseHint);

}
